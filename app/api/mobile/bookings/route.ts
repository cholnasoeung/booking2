import { connectToDatabase } from "@/lib/db/mongodb";
import { requireMobileAuthUser } from "@/lib/auth/mobile-auth";
import { normalizeBusSeatLayout } from "@/lib/seat/seat-layout";
import { isValidObjectId, parseSeatSelection } from "@/lib/utils/validation";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import PromoCodeModel from "@/models/commerce/PromoCode";
import UserModel from "@/models/user/User";
import { sendBookingConfirmationEmail } from "@/lib/services/email-service";

export const runtime = "nodejs";

type PassengerPayload = {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
};

type PromoCodeDocument = {
  code: string;
  calculateDiscount: (amount: number) => { valid: boolean; discount: number };
  incrementUsage: () => Promise<unknown>;
};

type BookingDocument = {
  _id: unknown;
};

type BookingModelWithAvailability = typeof BookingModel & {
  checkSeatAvailability: (
    busId: string,
    seats: string[]
  ) => Promise<{ available: boolean; unavailableSeats: string[] }>;
};

export async function POST(request: Request) {
  const user = await requireMobileAuthUser(request);

  if (!user) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const busId = typeof body?.busId === "string" ? body.busId : "";
    const seats = parseSeatSelection(body?.seats);
    const promoCode = typeof body?.promoCode === "string" ? body.promoCode : undefined;
    const boardingStop =
      typeof body?.boardingStop === "string" ? body.boardingStop : undefined;
    const droppingStop =
      typeof body?.droppingStop === "string" ? body.droppingStop : undefined;
    const passengers: PassengerPayload[] = Array.isArray(body?.passengers)
      ? body.passengers
          .map((passenger: unknown) => {
            const passengerRecord =
              passenger && typeof passenger === "object"
                ? (passenger as Record<string, unknown>)
                : {};

            return {
              name:
                typeof passengerRecord.name === "string" ? passengerRecord.name : "",
              age: typeof passengerRecord.age === "string" ? passengerRecord.age : "",
              gender:
                passengerRecord.gender === "male" ||
                passengerRecord.gender === "female" ||
                passengerRecord.gender === "other"
                  ? passengerRecord.gender
                  : "other",
              contactNumber:
                typeof passengerRecord.contactNumber === "string"
                  ? passengerRecord.contactNumber
                  : "",
              email:
                typeof passengerRecord.email === "string"
                  ? passengerRecord.email
                  : undefined,
            } satisfies PassengerPayload;
          })
          .filter(
            (passenger: PassengerPayload) =>
              Boolean(passenger.name && passenger.age && passenger.contactNumber)
          )
      : [];

    if (!isValidObjectId(busId) || !seats) {
      return Response.json(
        { message: "Please choose a bus and at least one seat." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const busDocument = await BusModel.findById(busId).populate("routeId");

    if (!busDocument) {
      return Response.json({ message: "Bus not found." }, { status: 404 });
    }

    const normalizedBus = normalizeBusSeatLayout(busDocument.toObject());
    const invalidSeat = seats.find((seat) => !normalizedBus.seatCodes.includes(seat));

    if (invalidSeat) {
      return Response.json(
        { message: `Seat ${invalidSeat} does not exist on this bus.` },
        { status: 400 }
      );
    }

    const availability = await (BookingModel as BookingModelWithAvailability).checkSeatAvailability(
      busId,
      seats
    );

    if (!availability.available) {
      return Response.json(
        {
          message: "Some seats are no longer available.",
          unavailableSeats: availability.unavailableSeats,
        },
        { status: 409 }
      );
    }

    const totalPrice = seats.length * busDocument.pricePerSeat;
    let discountAmount = 0;
    let appliedPromoCode: string | null = null;

    if (promoCode) {
      const promo = (await PromoCodeModel.findOne({
        code: promoCode.toUpperCase(),
      })) as PromoCodeDocument | null;

      if (promo) {
        const discountResult = promo.calculateDiscount(totalPrice);

        if (discountResult.valid) {
          discountAmount = discountResult.discount;
          appliedPromoCode = promo.code;
          await promo.incrementUsage();
        }
      }
    }

    const finalPrice = totalPrice - discountAmount;
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

    const booking = (await BookingModel.create({
      user: user.id,
      bus: busId,
      seats,
      passengers,
      totalPrice,
      discountAmount,
      finalPrice,
      promoCode: appliedPromoCode ?? undefined,
      boardingStop,
      droppingStop,
      status: "confirmed",
      paymentStatus: "paid",
      metadata: {
        bookingSource: "mobile",
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    })) as BookingDocument;

    const persistedUser = await UserModel.findById(user.id);

    if (persistedUser) {
      const route = (busDocument as { routeId?: { from?: string; to?: string } }).routeId;
      const routeLabel =
        route?.from && route?.to ? `${route.from} to ${route.to}` : "Unknown Route";

      await sendBookingConfirmationEmail(persistedUser.email, {
        customerName: persistedUser.name,
        bookingId: String(booking._id),
        route: routeLabel,
        busType: busDocument.busType,
        date: busDocument.date.toISOString().slice(0, 10),
        departureTime: busDocument.departureTime,
        arrivalTime: busDocument.arrivalTime,
        seats,
        passengers: passengers.map((passenger) => ({
          name: passenger.name,
          age: passenger.age,
          gender: passenger.gender,
        })),
        totalPrice,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        finalPrice,
      }).catch((error: unknown) => {
        console.error("Failed to send mobile booking confirmation email:", error);
      });
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
    console.error("Mobile booking error:", error);
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to complete your booking right now.",
      },
      { status: 500 }
    );
  }
}
