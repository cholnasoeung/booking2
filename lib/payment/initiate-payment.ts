import Stripe from "stripe";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import PendingBookingModel from "@/models/booking/PendingBooking";
import SettingsModel from "@/models/system/Settings";
import BusModel from "@/models/transport/Bus";
import type { Passenger } from "@/types/passenger";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type InitiatePaymentInput = {
  userId: string;
  busId: string;
  seats: string[];
  passengers: Passenger[];
  totalPrice: number;
  promoCode?: string;
  boardingStop?: string;
  droppingStop?: string;
  payOnBoarding?: boolean;
};

type InitiatePaymentResult =
  | { gateway: "none" }
  | { gateway: "stripe"; redirectUrl: string }
  | { gateway: "abaPayway"; redirectUrl: string; abaFormData: Record<string, string> }
  | { error: string };

export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
  const { userId, busId, seats, passengers, totalPrice, promoCode, boardingStop, droppingStop, payOnBoarding } = input;

  await connectToDatabase();

  const bus = await BusModel.findById(busId).populate("routeId");
  if (!bus) return { error: "Bus not found" };

  const unavailable = seats.filter((s) => bus.bookedSeats.includes(s));
  if (unavailable.length > 0) {
    return { error: `Seats ${unavailable.join(", ")} are no longer available` };
  }

  // Customer explicitly chose to pay the driver at boarding — skip any
  // configured online gateway and fall through to the direct-booking path.
  if (payOnBoarding) return { gateway: "none" };

  const settings = await SettingsModel.findOne().lean() as any;
  const gateway: string = settings?.payment?.activeGateway ?? "none";

  if (gateway === "none") return { gateway: "none" };

  // Create pending booking (expires in 30 min)
  const pending = await PendingBookingModel.create({
    userId,
    busId,
    seats,
    passengers,
    totalPrice,
    promoCode,
    boardingStop,
    droppingStop,
    gateway,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  const pendingId = String(pending._id);
  const route = (bus as any).routeId;
  const routeLabel = route ? `${route.from} → ${route.to}` : "Bus Ticket";

  // ── Stripe ───────────────────────────────────────────────────────────────
  if (gateway === "stripe") {
    const stripeSecretKey = settings?.payment?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { error: "Stripe is not configured. Please add your Secret Key in Settings → Payment Keys." };
    }

    const stripe = new Stripe(stripeSecretKey);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: (settings?.general?.currency || "USD").toLowerCase(),
            product_data: {
              name: `Bus Ticket: ${routeLabel}`,
              description: `${seats.length} seat(s) · ${new Date(bus.date).toLocaleDateString()}`,
            },
            unit_amount: Math.round((totalPrice / seats.length) * 100),
          },
          quantity: seats.length,
        },
      ],
      metadata: { pendingBookingId: pendingId },
      success_url: `${APP_URL}/booking/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/book/${busId}/passengers?seats=${seats.join(",")}&cancelled=1`,
    });

    await PendingBookingModel.findByIdAndUpdate(pendingId, { gatewaySessionId: checkoutSession.id });

    return { gateway: "stripe", redirectUrl: checkoutSession.url! };
  }

  // ── ABA PayWay ───────────────────────────────────────────────────────────
  if (gateway === "abaPayway") {
    const merchantId = settings?.payment?.abaPayway?.merchantId || process.env.ABA_MERCHANT_ID;
    const apiKey = settings?.payment?.abaPayway?.apiKey || process.env.ABA_API_KEY;

    if (!merchantId || !apiKey) {
      return { error: "ABA PayWay is not configured. Please add your keys in Settings → Payment Keys." };
    }

    const tranId = pendingId.slice(-20);
    const reqTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const amount = totalPrice.toFixed(2);
    const items = JSON.stringify([{ name: routeLabel, quantity: seats.length, price: (totalPrice / seats.length).toFixed(2) }]);
    const firstName = passengers[0]?.name?.split(" ")[0] || "Customer";
    const lastName = passengers[0]?.name?.split(" ").slice(1).join(" ") || "-";
    const email = (passengers[0] as any)?.email || "";
    const phone = (passengers[0] as any)?.phone || "";

    const hashInput = `${merchantId}${reqTime}${tranId}${amount}${items}${firstName}${lastName}${email}${phone}${pendingId}`;
    const hash = crypto.createHmac("sha512", apiKey).update(hashInput).digest("base64");

    await PendingBookingModel.findByIdAndUpdate(pendingId, { gatewaySessionId: tranId });

    return {
      gateway: "abaPayway",
      redirectUrl: `/book/${busId}/aba-pay?pending=${pendingId}`,
      abaFormData: {
        merchant_id: merchantId,
        req_time: reqTime,
        tran_id: tranId,
        amount,
        items,
        firstname: firstName,
        lastname: lastName,
        email,
        phone,
        return_params: pendingId,
        hash,
        continue_success_url: `${APP_URL}/api/payments/callback/aba`,
        return_url: `${APP_URL}/api/payments/callback/aba`,
      },
    };
  }

  return { error: "Unknown payment gateway" };
}
