import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import PendingBookingModel from "@/models/booking/PendingBooking";
import BookingModel from "@/models/booking/Booking";
import BusModel from "@/models/transport/Bus";
import SettingsModel from "@/models/system/Settings";
import { normalizeBusSeatLayout } from "@/lib/seat/seat-layout";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ABA PayWay POSTs to this URL after payment
export async function POST(request: Request) {
  const formData = await request.formData();
  const tranId = formData.get("tran_id") as string;
  const status = formData.get("status") as string; // "0" = success
  const hash = formData.get("apv") as string; // ABA verification hash
  const returnParams = formData.get("return_params") as string; // our pendingBookingId

  await connectToDatabase();

  const settings = await SettingsModel.findOne().lean() as any;
  const apiKey = settings?.payment?.abaPayway?.apiKey || process.env.ABA_API_KEY;
  const merchantId = settings?.payment?.abaPayway?.merchantId || process.env.ABA_MERCHANT_ID;

  if (!apiKey || !merchantId) {
    return Response.redirect(`${APP_URL}/booking/payment-failed?reason=config`);
  }

  // Verify ABA hash: HMAC-SHA512 of tran_id + status + hash fields
  const expectedHash = crypto
    .createHmac("sha512", apiKey)
    .update(`${merchantId}${tranId}${status}`)
    .digest("base64");

  if (hash !== expectedHash) {
    console.error("[aba-callback] Hash mismatch — possible tampered request");
    return Response.redirect(`${APP_URL}/booking/payment-failed?reason=invalid`);
  }

  if (status !== "0") {
    // Payment failed or cancelled
    await PendingBookingModel.findByIdAndUpdate(returnParams, { status: "failed" });
    return Response.redirect(`${APP_URL}/booking/payment-failed?reason=declined`);
  }

  const pending = await PendingBookingModel.findById(returnParams);
  if (!pending) {
    return Response.redirect(`${APP_URL}/booking/payment-failed?reason=session_expired`);
  }

  if (pending.status === "paid") {
    // Already processed — go straight to confirmation
    return Response.redirect(`${APP_URL}/booking/confirmation/${pending.createdBookingId}`);
  }

  try {
    const bus = await BusModel.findById(pending.busId);
    if (!bus) throw new Error("Bus not found");

    const layout = normalizeBusSeatLayout(bus);
    const alreadyBooked = pending.seats.filter((s) => layout.bookedSeats.includes(s));
    if (alreadyBooked.length > 0) {
      throw new Error(`Seats taken during payment: ${alreadyBooked.join(", ")}`);
    }

    let discountAmount = 0;
    let finalPrice = pending.totalPrice;
    let appliedPromoCode: string | undefined;

    if (pending.promoCode) {
      const PromoCodeModel = (await import("@/models/commerce/PromoCode")).default;
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
      metadata: { paymentMethod: "abaPayway", note: tranId },
    });

    const bookingId = String((booking as any)._id);

    await BusModel.findByIdAndUpdate(pending.busId, {
      $addToSet: { bookedSeats: { $each: pending.seats } },
    });

    await PendingBookingModel.findByIdAndUpdate(returnParams, {
      status: "paid",
      createdBookingId: bookingId,
    });

    return Response.redirect(`${APP_URL}/booking/confirmation/${bookingId}`);
  } catch (err) {
    console.error("[aba-callback] Booking creation failed:", err);
    await PendingBookingModel.findByIdAndUpdate(returnParams, { status: "failed" });
    return Response.redirect(`${APP_URL}/booking/payment-failed?reason=booking_error`);
  }
}

// ABA may also GET this URL in some flow versions
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnParams = url.searchParams.get("return_params");
  if (!returnParams) return Response.redirect(`${APP_URL}/`);

  await connectToDatabase();
  const pending = await PendingBookingModel.findById(returnParams).lean() as any;
  if (pending?.status === "paid" && pending?.createdBookingId) {
    return Response.redirect(`${APP_URL}/booking/confirmation/${pending.createdBookingId}`);
  }
  return Response.redirect(`${APP_URL}/booking/payment-failed?reason=pending`);
}
