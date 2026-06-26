import Stripe from "stripe";
import { connectToDatabase } from "@/lib/mongodb";
import PendingBookingModel from "@/models/PendingBooking";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import SettingsModel from "@/models/Settings";
import { normalizeBusSeatLayout } from "@/lib/seat-layout";

export const runtime = "nodejs";

// Stripe requires the raw body to verify the signature
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ message: "Missing stripe-signature header" }, { status: 400 });
  }

  await connectToDatabase();

  const settings = await SettingsModel.findOne().lean() as any;
  const secretKey = settings?.payment?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
  const webhookSecret = settings?.payment?.stripe?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("[stripe-webhook] Missing Stripe credentials in settings");
    return Response.json({ message: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return Response.json({ message: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const pendingBookingId = session.metadata?.pendingBookingId;

    if (!pendingBookingId) {
      console.error("[stripe-webhook] No pendingBookingId in session metadata");
      return Response.json({ ok: true });
    }

    const pending = await PendingBookingModel.findById(pendingBookingId);
    if (!pending) {
      console.error("[stripe-webhook] PendingBooking not found:", pendingBookingId);
      return Response.json({ ok: true });
    }

    // Idempotency — already processed
    if (pending.status === "paid") {
      return Response.json({ ok: true });
    }

    try {
      const bus = await BusModel.findById(pending.busId);
      if (!bus) throw new Error("Bus not found");

      const layout = normalizeBusSeatLayout(bus);
      const alreadyBooked = pending.seats.filter((s) => layout.bookedSeats.includes(s));
      if (alreadyBooked.length > 0) {
        throw new Error(`Seats ${alreadyBooked.join(", ")} were taken while awaiting payment`);
      }

      // Apply promo code if present
      let discountAmount = 0;
      let finalPrice = pending.totalPrice;
      let appliedPromoCode: string | undefined;

      if (pending.promoCode) {
        const PromoCodeModel = (await import("@/models/PromoCode")).default;
        const promo = await PromoCodeModel.findOne({ code: pending.promoCode.toUpperCase(), isActive: true });
        if (promo && promo.isValid()) {
          const result = promo.calculateDiscount(pending.totalPrice);
          if (result.valid) {
            discountAmount = result.discount || 0;
            finalPrice = pending.totalPrice - discountAmount;
            appliedPromoCode = promo.code;
            await promo.incrementUsage();
          }
        }
      }

      // Create the real booking
      const booking = await BookingModel.create({
        bus: pending.busId,
        user: pending.userId,
        seats: pending.seats,
        passengers: pending.passengers,
        totalPrice: pending.totalPrice,
        discountAmount,
        finalPrice,
        promoCode: appliedPromoCode,
        boardingStop: pending.boardingStop,
        droppingStop: pending.droppingStop,
        status: "confirmed",
        paymentStatus: "paid",
        metadata: { paymentMethod: "stripe", note: session.id },
      });

      // Lock seats on the bus
      await BusModel.findByIdAndUpdate(pending.busId, {
        $addToSet: { bookedSeats: { $each: pending.seats } },
      });

      // Mark pending booking as paid with the created booking ID
      await PendingBookingModel.findByIdAndUpdate(pendingBookingId, {
        status: "paid",
        createdBookingId: String((booking as any)._id),
      });

      console.log("[stripe-webhook] Booking created:", (booking as any)._id);
    } catch (err) {
      console.error("[stripe-webhook] Failed to create booking:", err);
      await PendingBookingModel.findByIdAndUpdate(pendingBookingId, { status: "failed" });
    }
  }

  return Response.json({ ok: true });
}
