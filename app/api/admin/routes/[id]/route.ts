import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import {
  escapeRegExp,
  isValidObjectId,
  normalizeCity,
} from "@/lib/utils/validation";
import BusModel from "@/models/transport/Bus";
import RouteModel from "@/models/transport/Route";

export const runtime = "nodejs";

function ensureAdmin() {
  return getCurrentSession();
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await ensureAdmin();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { message: "Only admins can update routes." },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid route id." }, { status: 400 });
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

    const [existingRoute, duplicateRoute] = await Promise.all([
      RouteModel.findById(id),
      RouteModel.findOne({
        _id: { $ne: id },
        from: new RegExp(`^${escapeRegExp(from)}$`, "i"),
        to: new RegExp(`^${escapeRegExp(to)}$`, "i"),
      }).lean(),
    ]);

    if (!existingRoute) {
      return Response.json({ message: "Route not found." }, { status: 404 });
    }

    if (duplicateRoute) {
      return Response.json(
        { message: "Another route already uses that city pair." },
        { status: 409 }
      );
    }

    existingRoute.set({
      from,
      to,
      duration,
      distance,
    });
    await existingRoute.save();

    return Response.json({
      message: "Route updated successfully.",
      route: {
        id: String(existingRoute._id),
        from: existingRoute.from,
        to: existingRoute.to,
        duration: existingRoute.duration,
        distance: existingRoute.distance,
      },
    });
  } catch {
    return Response.json(
      { message: "Unable to update the route right now." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await ensureAdmin();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { message: "Only admins can delete routes." },
      { status: 403 }
    );
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid route id." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const [route, busCount] = await Promise.all([
      RouteModel.findById(id).lean(),
      BusModel.countDocuments({ routeId: id }),
    ]);

    if (!route) {
      return Response.json({ message: "Route not found." }, { status: 404 });
    }

    if (busCount > 0) {
      return Response.json(
        {
          message:
            "This route still has scheduled buses. Remove those departures before deleting the route.",
        },
        { status: 409 }
      );
    }

    await RouteModel.findByIdAndDelete(id);

    return Response.json({ message: "Route deleted successfully." });
  } catch {
    return Response.json(
      { message: "Unable to delete the route right now." },
      { status: 500 }
    );
  }
}
