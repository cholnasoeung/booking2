import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { normalizeBusSeatLayout } from "@/lib/seat/seat-layout";
import { parseSeatSelection, isValidObjectId } from "@/lib/utils/validation";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import RouteModel from "@/models/transport/Route";
import PromoCodeModel from "@/models/commerce/PromoCode";
import UserModel from "@/models/user/User";

export const runtime = "nodejs";

// GET /api/admin/counter-booking                → { routes, recentBookings }
// GET /api/admin/counter-booking?routeId=&date= → { buses }
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId");
  const date    = searchParams.get("date");

  await connectToDatabase();

  // Search buses for a given route + date
  if (routeId && date) {
    if (!isValidObjectId(routeId)) {
      return Response.json({ message: "Invalid route id" }, { status: 400 });
    }

    const travelDate = new Date(date + "T00:00:00.000Z");
    const busDocs = await BusModel.find({ routeId, date: travelDate })
      .populate("routeId", "from to duration")
      .lean();

    const buses = busDocs.map((bus) => {
      const normalized = normalizeBusSeatLayout(bus as any);
      const takenSet = new Set([...normalized.bookedSeats, ...normalized.blockedSeats]);
      const availableSeats = normalized.seatCodes.filter((s) => !takenSet.has(s));
      const route = (bus as any).routeId as any;
      return {
        id: String(bus._id),
        route: route ? { from: route.from, to: route.to, duration: route.duration } : null,
        departureTime: bus.departureTime,
        arrivalTime: bus.arrivalTime,
        busType: bus.busType,
        totalSeats: normalized.totalSeats,
        bookedSeats: normalized.bookedSeats,
        blockedSeats: normalized.blockedSeats,
        availableSeats,
        seatLayout: normalized.seatLayout,
        pricePerSeat: bus.pricePerSeat,
      };
    });

    return Response.json({ buses });
  }

  // Default: return route list + recent counter bookings
  const [routes, recentBookings] = await Promise.all([
    RouteModel.find().sort({ from: 1 }).lean(),
    BookingModel.find({ "metadata.bookingSource": "counter" })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("bus", "departureTime arrivalTime busType date routeId")
      .lean(),
  ]);

  // Populate route info on bus
  const routeMap = new Map<string, { from: string; to: string }>();
  for (const r of routes) {
    routeMap.set(String(r._id), { from: r.from, to: r.to });
  }

  const bookingList = recentBookings.map((b) => {
    const bus = (b as any).bus as any;
    const route = bus?.routeId ? routeMap.get(String(bus.routeId)) : null;
    return {
      id: String(b._id),
      guestName: b.metadata?.guestName ?? "—",
      guestPhone: b.metadata?.guestPhone ?? "",
      route: route ? `${route.from} → ${route.to}` : "Unknown",
      seats: b.seats,
      totalPrice: b.totalPrice,
      finalPrice: b.finalPrice,
      discountAmount: b.discountAmount ?? 0,
      paymentMethod: b.metadata?.paymentMethod ?? "cash",
      departureTime: bus?.departureTime ?? "",
      travelDate: bus?.date ? new Date(bus.date).toISOString().slice(0, 10) : "",
      status: b.status,
      createdAt: (b as any).createdAt?.toISOString() ?? "",
    };
  });

  return Response.json({
    routes: routes.map((r) => ({
      id: String(r._id),
      from: r.from,
      to: r.to,
      duration: r.duration,
    })),
    recentBookings: bookingList,
  });
}

// POST /api/admin/counter-booking → create counter booking
export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const busId        = typeof body?.busId === "string" ? body.busId : "";
    const seats        = parseSeatSelection(body?.seats);
    const guestName    = typeof body?.guestName === "string" ? body.guestName.trim() : "";
    const guestPhone   = typeof body?.guestPhone === "string" ? body.guestPhone.trim() : "";
    const guestEmail   = typeof body?.guestEmail === "string" ? body.guestEmail.trim() : "";
    const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod : "cash";
    const promoCode    = typeof body?.promoCode === "string" ? body.promoCode.toUpperCase() : "";
    const note         = typeof body?.note === "string" ? body.note.trim() : "";

    if (!isValidObjectId(busId)) {
      return Response.json({ message: "Invalid bus id" }, { status: 400 });
    }
    if (!seats || seats.length === 0) {
      return Response.json({ message: "Select at least one seat" }, { status: 400 });
    }
    if (!guestName) {
      return Response.json({ message: "Guest name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const [bus, adminUser] = await Promise.all([
      BusModel.findById(busId).populate("routeId", "from to").lean(),
      UserModel.findById(session.user.id).lean(),
    ]);

    if (!bus) return Response.json({ message: "Bus not found" }, { status: 404 });
    if (!adminUser) return Response.json({ message: "Admin user not found" }, { status: 404 });

    const normalized = normalizeBusSeatLayout(bus as any);
    const badSeat = seats.find((s) => !normalized.seatCodes.includes(s));
    if (badSeat) {
      return Response.json({ message: `Seat ${badSeat} does not exist on this bus` }, { status: 400 });
    }

    const availability = await BookingModel.checkSeatAvailability(busId, seats);
    if (!availability.available) {
      return Response.json({
        message: "Some seats are already taken",
        unavailableSeats: availability.unavailableSeats,
      }, { status: 409 });
    }

    const totalPrice = seats.length * bus.pricePerSeat;
    let discountAmount = 0;
    let appliedPromo: string | null = null;

    if (promoCode) {
      const promo = await PromoCodeModel.findOne({ code: promoCode });
      if (promo) {
        const result = promo.calculateDiscount(totalPrice);
        if (result.valid) {
          discountAmount = result.discount;
          appliedPromo = promo.code;
          await promo.incrementUsage();
        }
      }
    }

    const finalPrice = totalPrice - discountAmount;

    const updatedBus = await BusModel.findOneAndUpdate(
      { _id: busId, bookedSeats: { $nin: seats } },
      { $addToSet: { bookedSeats: { $each: seats } } },
      { new: true }
    );
    if (!updatedBus) {
      return Response.json({ message: "Seats just taken. Please reselect." }, { status: 409 });
    }

    const booking = await BookingModel.create({
      user: session.user.id,
      bus: busId,
      seats,
      passengers: [{
        name: guestName,
        age: "0",
        gender: "other",
        contactNumber: guestPhone || "N/A",
        email: guestEmail || undefined,
      }],
      totalPrice,
      discountAmount,
      finalPrice,
      ...(appliedPromo ? { promoCode: appliedPromo } : {}),
      status: "confirmed",
      paymentStatus: "paid",
      metadata: {
        bookingSource: "counter",
        paymentMethod,
        agentId: session.user.id,
        agentName: session.user.name ?? "Admin",
        guestName,
        guestPhone,
        guestEmail,
        note,
      },
    });

    const route = (bus as any).routeId as any;

    return Response.json({
      bookingId: String(booking._id),
      guestName,
      route: route ? `${route.from} → ${route.to}` : "Unknown",
      seats,
      totalPrice,
      discountAmount,
      finalPrice,
      paymentMethod,
      departureTime: bus.departureTime,
    }, { status: 201 });

  } catch (e: any) {
    return Response.json({ message: e?.message ?? "Booking failed" }, { status: 500 });
  }
}
