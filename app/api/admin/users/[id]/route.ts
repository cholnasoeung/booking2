import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid user ID" }, { status: 400 });
  }

  if (id === session.user.id) {
    return Response.json({ message: "Cannot modify your own account" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, any> = {};

  if (body.role === "admin" || body.role === "user") {
    update.role = body.role;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ message: "Nothing to update" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select("name email role isEmailVerified lastLoginAt createdAt")
    .lean() as any;

  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  return Response.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
    },
  });
}
