import { getCurrentSession } from "@/lib/auth";
import { isValidDateInput, toTravelDate } from "@/lib/date";
import { connectToDatabase } from "@/lib/mongodb";
import { getBusSummary } from "@/lib/queries";
import {
  type SeatLayout,
  getSeatLayoutTemplate,
  isBusType,
  normalizeBusSeatLayout,
} from "@/lib/seat-layout";
import { isValidObjectId } from "@/lib/validation";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";

export const runtime = "nodejs";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

    if (!isValidObjectId(routeId)) {
      return Response.json({ message: "A valid route is required." }, { status: 400 });
    }

    if (!isValidDateInput(date)) {
      return Response.json(
        { message: "Date must be in YYYY-MM-DD format." },
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

    const normalizedBus = normalizeBusSeatLayout({
      busType,
      seatLayout: seatLayout ?? getSeatLayoutTemplate(busType),
      totalSeats: 0,
      bookedSeats: [],
      blockedSeats,
      amenities,
    });
    const busDate = toTravelDate(date);

    const existingBus = await BusModel.findOne({
      routeId,
      date: busDate,
      departureTime,
    }).lean();

    if (existingBus) {
      return Response.json(
        { message: "A bus for that route and departure time already exists." },
        { status: 409 }
      );
    }

    const bus = await BusModel.create({
      routeId,
      date: busDate,
      departureTime,
      arrivalTime,
      busType: normalizedBus.busType,
      seatLayout: normalizedBus.seatLayout,
      totalSeats: normalizedBus.totalSeats,
      bookedSeats: normalizedBus.bookedSeats,
      blockedSeats: normalizedBus.blockedSeats,
      pricePerSeat,
      amenities,
    });

    const busSummary = await getBusSummary(String(bus._id));

    return Response.json(
      {
        message: "Bus created successfully.",
        bus: busSummary,
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
