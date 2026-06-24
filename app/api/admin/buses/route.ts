import { getCurrentSession } from "@/lib/auth";
import { formatDateInput, isValidDateInput, toTravelDate } from "@/lib/date";
import { connectToDatabase } from "@/lib/mongodb";
import { getBusSummary, type BusSummary } from "@/lib/queries";
import {
  type SeatLayout,
  getSeatLayoutTemplate,
  isBusType,
  normalizeBusSeatLayout,
} from "@/lib/seat-layout";
import { normalizeStops } from "@/lib/stops";
import { isValidObjectId } from "@/lib/validation";
import BusModel from "@/models/Bus";
import DriverModel from "@/models/Driver";
import BusDetailModel from "@/models/BusDetail";
import RouteModel from "@/models/Route";

export const runtime = "nodejs";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_DATE_RANGE_DAYS = 90;

function getTravelDatesBetween(start: Date, end: Date) {
  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { message: "Only admins can create buses." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const routeId = typeof body?.routeId === "string" ? body.routeId : "";
    const date = typeof body?.date === "string" ? body.date : "";
    const departureTime =
      typeof body?.departureTime === "string" ? body.departureTime : "";
    const arrivalTime =
      typeof body?.arrivalTime === "string" ? body.arrivalTime : "";
    const requestedBusType = body?.busType;
    const busType = isBusType(requestedBusType) ? requestedBusType : null;
    const pricePerSeat = Number(body?.pricePerSeat);
    const seatLayout = (body?.seatLayout ?? null) as SeatLayout | null;
    const amenities = Array.isArray(body?.amenities) ? body.amenities : [];
    const blockedSeats = Array.isArray(body?.blockedSeats) ? body.blockedSeats : [];
    const driverId =
      typeof body?.driverId === "string" && body.driverId.trim() ? body.driverId.trim() : "";
    const busDetailId =
      typeof body?.busDetailId === "string" && body.busDetailId.trim()
        ? body.busDetailId.trim()
        : "";
    const endDate = typeof body?.endDate === "string" ? body.endDate : "";
    const rawTierMultipliers = body?.seatTierMultipliers;
    const seatTierMultipliers =
      rawTierMultipliers && typeof rawTierMultipliers === "object"
        ? {
            business: Number(rawTierMultipliers.business) >= 1 ? Number(rawTierMultipliers.business) : 1.3,
            vip:      Number(rawTierMultipliers.vip)      >= 1 ? Number(rawTierMultipliers.vip)      : 1.6,
          }
        : null;

    if (!isValidObjectId(routeId)) {
      return Response.json({ message: "A valid route is required." }, { status: 400 });
    }

    if (!isValidDateInput(date)) {
      return Response.json(
        { message: "Date must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    if (driverId && !isValidObjectId(driverId)) {
      return Response.json({ message: "Driver id is invalid." }, { status: 400 });
    }

    if (busDetailId && !isValidObjectId(busDetailId)) {
      return Response.json({ message: "Vehicle id is invalid." }, { status: 400 });
    }

    if (endDate && !isValidDateInput(endDate)) {
      return Response.json(
        { message: "End date must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    if (!TIME_REGEX.test(departureTime) || !TIME_REGEX.test(arrivalTime)) {
      return Response.json(
        { message: "Departure and arrival times must be in HH:MM format." },
        { status: 400 }
      );
    }

    if (!busType) {
      return Response.json(
        { message: "Please choose a valid bus type." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(pricePerSeat) || pricePerSeat <= 0) {
      return Response.json(
        { message: "Price per seat must be greater than 0." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const route = await RouteModel.findById(routeId).lean();

    if (!route) {
      return Response.json({ message: "Route not found." }, { status: 404 });
    }
    const stops = normalizeStops(body?.stops, route.from, route.to);
    let driverReference: string | null = null;

    if (driverId) {
      const driverExists = await DriverModel.findById(driverId).lean();
      if (!driverExists) {
        return Response.json({ message: "Driver not found." }, { status: 404 });
      }

      driverReference = driverId;
    }

    let busDetailTemplate: SeatLayout | null = null;
    let busDetailReference: string | null = null;

    if (busDetailId) {
      const detail = await BusDetailModel.findById(busDetailId).lean();
      if (!detail) {
        return Response.json({ message: "Vehicle not found." }, { status: 404 });
      }

      busDetailReference = busDetailId;
      busDetailTemplate = detail.seatLayoutTemplate ?? null;
    }

    const travelDateStart = toTravelDate(date);
    const travelDateEnd = endDate ? toTravelDate(endDate) : travelDateStart;

    if (travelDateEnd < travelDateStart) {
      return Response.json(
        { message: "End date cannot be before the start date." },
        { status: 400 }
      );
    }

    const travelDates = getTravelDatesBetween(travelDateStart, travelDateEnd);

    if (travelDates.length > MAX_DATE_RANGE_DAYS) {
      return Response.json(
        { message: `Date range must be ${MAX_DATE_RANGE_DAYS} days or fewer.` },
        { status: 400 }
      );
    }

    const normalizedBus = normalizeBusSeatLayout({
      busType,
      seatLayout: seatLayout ?? busDetailTemplate ?? getSeatLayoutTemplate(busType),
      totalSeats: 0,
      bookedSeats: [],
      blockedSeats,
      amenities,
    });
    // Only block if the same vehicle or driver is already assigned at an overlapping time.
    // Multiple buses on the same route at the same time are allowed as long as
    // each uses a different vehicle and a different driver.
    if (busDetailReference) {
      const vehicleConflict = await BusModel.findOne({
        busDetailId: busDetailReference,
        date: { $in: travelDates },
        departureTime: { $lt: arrivalTime },
        arrivalTime: { $gt: departureTime },
      }).lean();

      if (vehicleConflict) {
        return Response.json(
          {
            message: `This vehicle is already assigned to another departure on ${formatDateInput(vehicleConflict.date)} at ${vehicleConflict.departureTime}.`,
          },
          { status: 409 }
        );
      }
    }

    if (driverReference) {
      const driverConflict = await BusModel.findOne({
        driverId: driverReference,
        date: { $in: travelDates },
        departureTime: { $lt: arrivalTime },
        arrivalTime: { $gt: departureTime },
      }).lean();

      if (driverConflict) {
        return Response.json(
          {
            message: `This driver is already assigned to another departure on ${formatDateInput(driverConflict.date)} at ${driverConflict.departureTime}.`,
          },
          { status: 409 }
        );
      }
    }

    const createdBuses = await BusModel.insertMany(
      travelDates.map((travelDate) => ({
        routeId,
        date: travelDate,
        departureTime,
        arrivalTime,
        busType: normalizedBus.busType,
        seatLayout: structuredClone(normalizedBus.seatLayout),
        totalSeats: normalizedBus.totalSeats,
        bookedSeats: normalizedBus.bookedSeats,
        blockedSeats: normalizedBus.blockedSeats,
        stops: stops.map((stop) => ({ ...stop })),
        pricePerSeat,
        amenities,
        driverId: driverReference,
        busDetailId: busDetailReference,
        ...(seatTierMultipliers ? { seatTierMultipliers } : {}),
      }))
    );

    const busSummaries = (
      await Promise.all(
        createdBuses.map((created) => getBusSummary(String(created._id)))
      )
    ).filter((summary): summary is BusSummary => Boolean(summary));

    return Response.json(
      {
        message:
          travelDates.length === 1
            ? "Bus created successfully."
            : `${travelDates.length} departures created successfully.`,
        buses: busSummaries,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the bus right now.";

    return Response.json(
      { message },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
