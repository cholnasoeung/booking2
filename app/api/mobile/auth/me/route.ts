import { requireMobileAuthUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireMobileAuthUser(request);

    if (!user) {
      return Response.json({ message: "Unauthorized." }, { status: 401 });
    }

    return Response.json({ user });
  } catch {
    return Response.json({ message: "Unable to load your profile right now." }, { status: 500 });
  }
}
