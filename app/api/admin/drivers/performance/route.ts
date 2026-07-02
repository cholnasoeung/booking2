import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import DriverModel from "@/models/hr/Driver";
import IncidentModel from "@/models/operations/Incident";
import mongoose from "mongoose";

export const runtime = "nodejs";

function parseDate(s: string | null, fallback: Date) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 89);

  const from = parseDate(searchParams.get("from"), defaultFrom);
  from.setUTCHours(0, 0, 0, 0);
  const to = parseDate(searchParams.get("to"), now);
  to.setUTCHours(23, 59, 59, 999);

  await connectToDatabase();

  const drivers = await DriverModel.find({}).lean();

  // ── Trips per driver in date range ───────────────────────────────
  const tripAgg = await BusModel.aggregate([
    {
      $match: {
        date: { $gte: from, $lte: to },
        driverId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$driverId",
        totalTrips:     { $sum: 1 },
        cancelledTrips: { $sum: { $cond: [{ $eq: ["$departureStatus", "cancelled"] }, 1, 0] } },
        delayedTrips:   { $sum: { $cond: [{ $eq: ["$departureStatus", "delayed"] }, 1, 0] } },
        totalDelayMins: { $sum: { $ifNull: ["$delayMinutes", 0] } },
      },
    },
  ]);

  // ── Passengers carried per driver ────────────────────────────────
  const passengerAgg = await BusModel.aggregate([
    {
      $match: {
        date: { $gte: from, $lte: to },
        driverId: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "bus",
        as: "bookings",
        pipeline: [{ $match: { status: "confirmed" } }],
      },
    },
    {
      $group: {
        _id: "$driverId",
        totalPassengers: { $sum: { $sum: { $map: { input: "$bookings", as: "b", in: { $size: "$$b.seats" } } } } },
        totalRevenue:    { $sum: { $sum: "$bookings.finalPrice" } },
      },
    },
  ]);

  // ── Incidents per driver ─────────────────────────────────────────
  // Incidents reference busDetailId (vehicle), not driverId directly.
  // We join via buses to get the driver for each incident date.
  const incidentAgg = await BusModel.aggregate([
    {
      $match: {
        date: { $gte: from, $lte: to },
        driverId: { $exists: true, $ne: null },
        busDetailId: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "incidents",
        let: { vid: "$busDetailId", busDate: "$date" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$busDetailId", "$$vid"] },
                  { $gte: ["$date", from] },
                  { $lte: ["$date", to] },
                ],
              },
            },
          },
        ],
        as: "incidents",
      },
    },
    {
      $group: {
        _id: "$driverId",
        totalIncidents: { $sum: { $size: "$incidents" } },
        highIncidents:  { $sum: { $size: { $filter: { input: "$incidents", as: "i", cond: { $eq: ["$$i.severity", "high"] } } } } },
      },
    },
  ]);

  // ── Ratings per driver ───────────────────────────────────────────
  const ratingAgg = await BusModel.aggregate([
    {
      $match: {
        date: { $gte: from, $lte: to },
        driverId: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "ratings",
        localField: "_id",
        foreignField: "busId",
        as: "ratings",
      },
    },
    { $unwind: { path: "$ratings", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: "$driverId",
        avgRating:   { $avg: "$ratings.rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  // ── Merge all aggregations ────────────────────────────────────────
  const tripMap      = new Map(tripAgg.map((r) => [String(r._id), r]));
  const passMap      = new Map(passengerAgg.map((r) => [String(r._id), r]));
  const incidentMap  = new Map(incidentAgg.map((r) => [String(r._id), r]));
  const ratingMap    = new Map(ratingAgg.map((r) => [String(r._id), r]));

  const performance = drivers.map((driver) => {
    const did = String(driver._id);
    const trips    = tripMap.get(did);
    const pass     = passMap.get(did);
    const inc      = incidentMap.get(did);
    const rat      = ratingMap.get(did);

    const totalTrips     = trips?.totalTrips     ?? 0;
    const cancelledTrips = trips?.cancelledTrips ?? 0;
    const delayedTrips   = trips?.delayedTrips   ?? 0;
    const totalDelayMins = trips?.totalDelayMins ?? 0;
    const completedTrips = totalTrips - cancelledTrips;
    const onTimeTrips    = completedTrips - delayedTrips;
    const onTimePct      = completedTrips > 0
      ? Math.round((onTimeTrips / completedTrips) * 1000) / 10
      : null;
    const avgDelayMins   = delayedTrips > 0
      ? Math.round(totalDelayMins / delayedTrips)
      : 0;

    return {
      id:              did,
      name:            driver.name,
      phone:           driver.phone,
      licenseNumber:   driver.licenseNumber,
      vehicleNumber:   driver.vehicleNumber ?? null,
      status:          driver.status,
      totalTrips,
      completedTrips,
      cancelledTrips,
      delayedTrips,
      onTimePct,
      avgDelayMins,
      totalPassengers: pass?.totalPassengers ?? 0,
      totalRevenue:    Math.round((pass?.totalRevenue ?? 0) * 100) / 100,
      totalIncidents:  inc?.totalIncidents  ?? 0,
      highIncidents:   inc?.highIncidents   ?? 0,
      avgRating:       rat?.avgRating != null ? Math.round(rat.avgRating * 10) / 10 : null,
      ratingCount:     rat?.ratingCount ?? 0,
    };
  });

  // Sort by completed trips desc
  performance.sort((a, b) => b.completedTrips - a.completedTrips);

  return Response.json({ performance, period: { from: from.toISOString(), to: to.toISOString() } });
}
