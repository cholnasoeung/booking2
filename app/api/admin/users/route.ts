import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  await connectToDatabase();

  const filter: Record<string, any> = {};
  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ];
  }
  if (role === "admin" || role === "user") {
    filter.role = role;
  }
  if (status === "suspended") {
    filter.isSuspended = true;
  }

  const [total, users] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .select("name email role phone avatar isEmailVerified isSuspended suspendedAt lastLoginAt createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return Response.json({
    users: (users as any[]).map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone ?? null,
      avatar: u.avatar ?? null,
      isEmailVerified: u.isEmailVerified,
      isSuspended: u.isSuspended ?? false,
      suspendedAt: u.suspendedAt ?? null,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
