import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import UserModel from "@/models/User";
import BookingModel from "@/models/Booking";
import LoyaltyModel from "@/models/Loyalty";

export const runtime = "nodejs";

// GET — full user profile for admin
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid user ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findById(id)
      .select("-password -emailVerificationToken -passwordResetToken")
      .lean();

    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    const [bookings, loyalty] = await Promise.all([
      BookingModel.find({ user: id })
        .select("status totalPrice createdAt seats")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      LoyaltyModel.findOne({ user: id }).lean(),
    ]);

    return Response.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        role: user.role,
        status: (user as any).status ?? "active",
        banReason: (user as any).banReason ?? null,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt ?? null,
        referralCode: (user as any).referralCode ?? null,
      },
      bookings: bookings.map((b) => ({
        id: String(b._id),
        status: b.status,
        totalPrice: b.totalPrice,
        seats: b.seats,
        createdAt: b.createdAt,
      })),
      loyalty: loyalty
        ? {
            tier: (loyalty as any).tier,
            points: (loyalty as any).points,
            lifetimePoints: (loyalty as any).lifetimePoints,
          }
        : null,
    });
  } catch (error) {
    console.error("Admin user detail error:", error);
    return Response.json({ message: "Unable to fetch user" }, { status: 500 });
  }
}

// PATCH — update role or status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid user ID" }, { status: 400 });
  }

  // Prevent admin from modifying their own role/status
  if (id === session.user.id) {
    return Response.json({ message: "You cannot modify your own account here." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const update: Record<string, any> = {};

    if (body.role !== undefined) {
      if (!["user", "support", "driver", "admin"].includes(body.role)) {
        return Response.json({ message: "Invalid role" }, { status: 400 });
      }
      update.role = body.role;
    }

    if (body.status !== undefined) {
      if (!["active", "banned", "suspended"].includes(body.status)) {
        return Response.json({ message: "Invalid status" }, { status: 400 });
      }
      update.status = body.status;
      update.banReason = body.status !== "active" ? (body.reason ?? "Admin action") : undefined;
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ message: "Nothing to update" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findByIdAndUpdate(id, update, { new: true })
      .select("name email role status banReason")
      .lean();

    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    return Response.json({
      message: "User updated",
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: (user as any).status,
        banReason: (user as any).banReason ?? null,
      },
    });
  } catch (error) {
    console.error("Admin user update error:", error);
    return Response.json({ message: "Unable to update user" }, { status: 500 });
  }
}
