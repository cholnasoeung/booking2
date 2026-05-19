import { hash } from "bcryptjs";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/validation";
import UserModel from "@/models/User";
import BookingModel from "@/models/Booking";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = searchParams.get("search") ?? "";
  const roleFilter = searchParams.get("role") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";
  const limit = 20;

  try {
    await connectToDatabase();

    const query: Record<string, any> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (roleFilter !== "all") query.role = roleFilter;
    if (statusFilter !== "all") query.status = statusFilter;

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select("name email role status banReason createdAt lastLoginAt isEmailVerified referralCode")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);

    // Batch booking counts
    const userIds = users.map((u) => u._id);
    const bookingCounts = await BookingModel.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(bookingCounts.map((b) => [String(b._id), b.count]));

    const serialized = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      status: (u as any).status ?? "active",
      banReason: (u as any).banReason ?? null,
      isEmailVerified: u.isEmailVerified,
      referralCode: (u as any).referralCode ?? null,
      bookingCount: countMap.get(String(u._id)) ?? 0,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
    }));

    return Response.json({ users: serialized, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin users list error:", error);
    return Response.json({ message: "Unable to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = typeof body?.role === "string" ? body.role : "user";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;

    if (!name || !email || !password) {
      return Response.json({ message: "Name, email and password are required." }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ message: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (!["user", "support", "driver", "admin"].includes(role)) {
      return Response.json({ message: "Invalid role." }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await UserModel.findOne({ email }).lean();
    if (existing) {
      return Response.json({ message: "An account with this email already exists." }, { status: 409 });
    }

    const hashed = await hash(password, 10);
    const user = await UserModel.create({
      name,
      email,
      password: hashed,
      role,
      phone: phone || undefined,
      status: "active",
      isEmailVerified: true, // admin-created accounts are pre-verified
    });

    return Response.json({
      message: "User created successfully.",
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: "active",
        bookingCount: 0,
        isEmailVerified: true,
        createdAt: user.createdAt,
        lastLoginAt: null,
        banReason: null,
        referralCode: null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Admin create user error:", error);
    return Response.json({ message: "Unable to create user." }, { status: 500 });
  }
}
