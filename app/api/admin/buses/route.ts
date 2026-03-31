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
    const endDate = typeof body?.endDate === "string" ? body.endDate : "";

    if (!isValidObjectId(routeId)) {
      return Response.json({ message: "A valid route is required." }, { status: 400 });
    }

    if (!isValidDateInput(date)) {
      return Response.json(
        { message: "Date must be in YYYY-MM-DD format." },
        { status: 400 }
      );
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
      seatLayout: seatLayout ?? getSeatLayoutTemplate(busType),
      totalSeats: 0,
      bookedSeats: [],
      blockedSeats,
      amenities,
    });
    const conflictingBuses = await BusModel.find({
      routeId,
      departureTime,
      date: { $in: travelDates },
    }).lean();

    if (conflictingBuses.length > 0) {
      const conflictDates = conflictingBuses
        .map((conflict) => formatDateInput(conflict.date))
        .join(", ");

      return Response.json(
        {
          message: `A bus already exists for ${conflictDates} at that departure time.`,
        },
        { status: 409 }
      );
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
