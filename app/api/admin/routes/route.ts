import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { escapeRegExp, normalizeCity } from "@/lib/utils/validation";
import RouteModel from "@/models/transport/Route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { message: "Only admins can create routes." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const from = typeof body?.from === "string" ? normalizeCity(body.from) : "";
    const to = typeof body?.to === "string" ? normalizeCity(body.to) : "";
    const duration =
      typeof body?.duration === "string" ? body.duration.trim() : "";
    const distance = Number(body?.distance);

    if (!from || !to || !duration || !Number.isFinite(distance) || distance <= 0) {
      return Response.json(
        { message: "From, to, duration, and distance are required." },
        { status: 400 }
      );
    }

    if (from.toLowerCase() === to.toLowerCase()) {
      return Response.json(
        { message: "From and to cities must be different." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingRoute = await RouteModel.findOne({
      from: new RegExp(`^${escapeRegExp(from)}$`, "i"),
      to: new RegExp(`^${escapeRegExp(to)}$`, "i"),
    }).lean();

    if (existingRoute) {
      return Response.json(
        { message: "That route already exists." },
        { status: 409 }
      );
    }

    const route = await RouteModel.create({
      from,
      to,
      duration,
      distance,
    });

    return Response.json(
      {
        message: "Route created successfully.",
        route: {
          id: String(route._id),
          from: route.from,
          to: route.to,
          duration: route.duration,
          distance: route.distance,
        },
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { message: "Unable to create the route right now." },
      { status: 500 }
    );
  }
}
