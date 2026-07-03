import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { normalizeBusSeatLayout } from "@/lib/seat/seat-layout";
import { parseSeatSelection, isValidObjectId } from "@/lib/utils/validation";
import BookingModel, { type IPassenger } from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import PromoCodeModel from "@/models/commerce/PromoCode";
import { sendBookingConfirmationEmail } from "@/lib/services/email-service";
import { sendBookingConfirmationSMS } from "@/lib/services/sms-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  try {
    // Verify email before allowing booking
    await connectToDatabase();
    const UserModelCheck = require("@/models/user/User").default;
    const bookingUser = await UserModelCheck.findById(session.user.id).select("isEmailVerified").lean();
    if (bookingUser && (bookingUser as any).isEmailVerified === false) {
      return Response.json(
        { message: "Please verify your email address before making a booking." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const busId = typeof body?.busId === "string" ? body.busId : "";
    const seats = parseSeatSelection(body?.seats);
    const promoCode = typeof body?.promoCode === "string" ? body.promoCode : undefined;
    const boardingStop =
      typeof body?.boardingStop === "string" ? body.boardingStop : undefined;
    const droppingStop =
      typeof body?.droppingStop === "string" ? body.droppingStop : undefined;
    const passengers = body?.passengers || [];

    if (!isValidObjectId(busId) || !seats) {
      return Response.json(
        { message: "Please choose a bus and at least one seat." },
        { status: 400 }
      );
    }

    if (!seats || seats.length === 0) {
      return Response.json(
        { message: "Please select at least one seat." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Fetch bus with route information
    const busDocument = await BusModel.findById(busId).populate("routeId");

    if (!busDocument) {
      return Response.json({ message: "Bus not found." }, { status: 404 });
    }

    // Normalize bus seat layout
    const normalizedBus = normalizeBusSeatLayout(busDocument.toObject());

    // Validate seats exist
    const invalidSeat = seats.find((seat) => !normalizedBus.seatCodes.includes(seat));

    if (invalidSeat) {
      return Response.json(
        { message: `Seat ${invalidSeat} does not exist on this bus.` },
        { status: 400 }
      );
    }

    // Check real-time seat availability
    const availability = await BookingModel.checkSeatAvailability(busId, seats);

    if (!availability.available) {
      return Response.json(
        {
          message: "Some seats are no longer available.",
          unavailableSeats: availability.unavailableSeats,
        },
        { status: 409 }
      );
    }

    // Calculate pricing (with per-seat tier multipliers)
    const tierMultipliers = (busDocument as any).seatTierMultipliers ?? null;
    const totalPrice = seats.reduce((sum: number, seatCode: string) => {
      const item = normalizedBus.seatLayout.items.find(
        (i: { seatCode?: string }) => i.seatCode?.toUpperCase() === seatCode.toUpperCase()
      );
      const tier = (item as any)?.tier ?? "standard";
      const multiplier =
        tier === "vip"
          ? (tierMultipliers?.vip ?? 1.6)
          : tier === "business"
          ? (tierMultipliers?.business ?? 1.3)
          : 1.0;
      return sum + Math.round(busDocument.pricePerSeat * multiplier * 100) / 100;
    }, 0);
    let discountAmount = 0;
    let appliedPromoCode = null;

    // Apply promo code if provided
    if (promoCode) {
      const promo = await PromoCodeModel.findOne({ code: promoCode.toUpperCase() });

      if (promo) {
        const discountResult = promo.calculateDiscount(totalPrice);

        if (discountResult.valid) {
          discountAmount = discountResult.discount;
          appliedPromoCode = promo.code;

          // Increment promo code usage
          await promo.incrementUsage();
        }
      }
    }

    const finalPrice = totalPrice - discountAmount;

    // Atomically book seats and create booking
    const updatedBus = await BusModel.findOneAndUpdate(
      {
        _id: busId,
        bookedSeats: { $nin: seats },
      },
      {
        $addToSet: { bookedSeats: { $each: seats } },
      },
      { new: true }
    );

    if (!updatedBus) {
      return Response.json(
        { message: "Seats were just booked by another user. Please try again." },
        { status: 409 }
      );
    }

    // Create booking
    const booking = await BookingModel.create({
      user: session.user.id,
      bus: busId,
        seats,
        passengers,
        totalPrice,
        discountAmount,
        finalPrice,
        ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
        boardingStop,
        droppingStop,
        status: "confirmed",
      paymentStatus: "paid",
      metadata: {
        bookingSource: "web",
      },
    });

    // Send confirmation email
    const UserModel = require("@/models/user/User").default;
    const user = await UserModel.findById(session.user.id);

    if (user) {
      // Get route information
      const route = (busDocument as any).routeId;
      const routeStr = route ? `${route.from} to ${route.to}` : "Unknown Route";

      await sendBookingConfirmationEmail(user.email, {
        customerName: user.name,
        bookingId: String(booking._id),
        route: routeStr,
        busType: busDocument.busType,
        date: busDocument.date.toISOString().split('T')[0],
        departureTime: busDocument.departureTime,
        arrivalTime: busDocument.arrivalTime,
        seats,
        passengers: passengers.map((p: IPassenger) => ({
          name: p.name,
          age: p.age,
          gender: p.gender,
        })),
        totalPrice,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        finalPrice,
      }).catch(err => console.error('Failed to send confirmation email:', err));

      // SMS confirmation (fires-and-forgets; non-blocking)
      if (user.phone) {
        sendBookingConfirmationSMS(user.phone, {
          customerName: user.name,
          bookingId: String(booking._id),
          route: routeStr,
          departureTime: busDocument.departureTime,
          seats,
        }).catch(() => {});
      }
    }

    return Response.json(
      {
        message: "Booking confirmed successfully.",
        bookingId: String(booking._id),
        finalPrice,
        discountAmount,
        seats,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Booking error:', error);
    return Response.json(
      { message: error instanceof Error ? error.message : "Unable to complete your booking right now." },
      { status: 500 }
    );
  }
}
