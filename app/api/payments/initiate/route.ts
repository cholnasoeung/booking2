import { getCurrentSession } from "@/lib/auth";
import { initiatePayment } from "@/lib/initiate-payment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { busId, seats, passengers, totalPrice, promoCode, boardingStop, droppingStop } = body;

  if (!busId || !seats?.length || !passengers?.length) {
    return Response.json({ message: "Missing required fields" }, { status: 400 });
  }

  const result = await initiatePayment({
    userId: session.user.id,
    busId,
    seats,
    passengers,
    totalPrice,
    promoCode,
    boardingStop,
    droppingStop,
  });

  if ("error" in result) {
    return Response.json({ message: result.error }, { status: 400 });
  }

  return Response.json(result);
}
