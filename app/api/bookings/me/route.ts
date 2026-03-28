import { getCurrentSession } from "@/lib/auth";
import { getUserBookings } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  try {
    const bookings = await getUserBookings(session.user.id);
    return Response.json({ bookings });
  } catch {
    return Response.json(
      { message: "Unable to fetch your bookings right now." },
      { status: 500 }
    );
  }
}
