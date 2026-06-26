import { connectToDatabase } from "@/lib/mongodb";
import PendingBookingModel from "@/models/PendingBooking";

export const runtime = "nodejs";

// Polled by the payment-success page to know when the webhook has created the booking
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const pendingId = url.searchParams.get("pending_id");

  if (!sessionId && !pendingId) {
    return Response.json({ message: "Missing session_id or pending_id" }, { status: 400 });
  }

  await connectToDatabase();

  const query = sessionId
    ? { gatewaySessionId: sessionId }
    : { _id: pendingId };

  const pending = await PendingBookingModel.findOne(query).lean() as any;

  if (!pending) {
    return Response.json({ status: "not_found" }, { status: 404 });
  }

  return Response.json({
    status: pending.status,
    bookingId: pending.createdBookingId ?? null,
  });
}
