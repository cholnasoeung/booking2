import { requireMobileAuthUser } from "@/lib/auth/mobile-auth";
import { getUserBookings } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireMobileAuthUser(request);

    if (!user) {
      return Response.json({ message: "Unauthorized." }, { status: 401 });
    }

    const bookings = await getUserBookings(user.id);
    return Response.json({ bookings });
  } catch {
    return Response.json(
      { message: "Unable to fetch your bookings right now." },
      { status: 500 }
    );
  }
}
