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
import { normalizeStops } from "@/lib/stops";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import DriverModel from "@/models/Driver";
import BusDetailModel from "@/models/BusDetail";
import RouteModel from "@/models/Route";

export const runtime = "nodejs";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { message: "Only admins can update buses." },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus id." }, { status: 400 });
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

    const [route, existingBusDocument] = await Promise.all([
      RouteModel.findById(routeId).lean(),
      BusModel.findById(id),
    ]);

    if (!route) {
      return Response.json({ message: "Route not found." }, { status: 404 });
    }

    const stops = normalizeStops(body?.stops, route.from, route.to);

    if (driverId) {
      const driverExists = await DriverModel.findById(driverId).lean();
      if (!driverExists) {
        return Response.json({ message: "Driver not found." }, { status: 404 });
      }
    }

    let busDetailTemplate: SeatLayout | null = null;

    if (busDetailId) {
      const detail = await BusDetailModel.findById(busDetailId).lean();
      if (!detail) {
        return Response.json({ message: "Vehicle not found." }, { status: 404 });
      }

      busDetailTemplate = detail.seatLayoutTemplate ?? null;
    }

    if (!existingBusDocument) {
      return Response.json({ message: "Bus not found." }, { status: 404 });
    }

    const normalizedBus = normalizeBusSeatLayout({
      busType,
      seatLayout: seatLayout ?? busDetailTemplate ?? getSeatLayoutTemplate(busType),
      totalSeats: existingBusDocument.totalSeats,
      bookedSeats: existingBusDocument.bookedSeats,
      blockedSeats,
      amenities,
    });
    const busDate = toTravelDate(date);

    const conflictingBus = await BusModel.findOne({
      _id: { $ne: id },
      routeId,
      date: busDate,
      departureTime,
    }).lean();

    if (conflictingBus) {
      return Response.json(
        { message: "A different bus already uses that route and departure time." },
        { status: 409 }
      );
    }

    existingBusDocument.set({
      routeId,
      date: busDate,
      departureTime,
      arrivalTime,
      busType: normalizedBus.busType,
      seatLayout: normalizedBus.seatLayout,
      totalSeats: normalizedBus.totalSeats,
      bookedSeats: normalizedBus.bookedSeats,
      blockedSeats: normalizedBus.blockedSeats,
      stops,
      pricePerSeat,
      amenities,
      driverId: driverId || null,
      busDetailId: busDetailId || null,
    });
    await existingBusDocument.save();

    const busSummary = await getBusSummary(id);

    return Response.json({
      message: "Bus updated successfully.",
      bus: busSummary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the bus right now.";

    return Response.json({ message }, { status: error instanceof Error ? 400 : 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { message: "Only admins can delete buses." },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus id." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const [bus, bookingCount] = await Promise.all([
      BusModel.findById(id).lean(),
      BookingModel.countDocuments({ bus: id }),
    ]);

    if (!bus) {
      return Response.json({ message: "Bus not found." }, { status: 404 });
    }

    if (bookingCount > 0) {
      return Response.json(
        {
          message:
            "This bus already has bookings. Cancel or resolve those bookings before deleting the departure.",
        },
        { status: 409 }
      );
    }

    await BusModel.findByIdAndDelete(id);

    return Response.json({ message: "Bus deleted successfully." });
  } catch {
    return Response.json(
      { message: "Unable to delete the bus right now." },
      { status: 500 }
    );
  }
}
