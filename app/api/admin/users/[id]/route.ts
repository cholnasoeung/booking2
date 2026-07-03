import bcrypt from "bcryptjs";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import UserModel from "@/models/user/User";

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
    return Response.json({ message: "Cannot modify your own account here" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, any> = {};

  if (body.role === "admin" || body.role === "user") {
    update.role = body.role;
  }

  if (typeof body.isSuspended === "boolean") {
    update.isSuspended = body.isSuspended;
    update.suspendedAt = body.isSuspended ? new Date() : null;
    if (body.isSuspended && typeof body.suspendedReason === "string") {
      update.suspendedReason = body.suspendedReason.trim();
    } else if (!body.isSuspended) {
      update.suspendedReason = null;
    }
  }

  if (typeof body.newPassword === "string") {
    if (body.newPassword.length < 6) {
      return Response.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }
    update.password = await bcrypt.hash(body.newPassword, 10);
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ message: "Nothing to update" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select("name email role isEmailVerified isSuspended suspendedAt lastLoginAt createdAt")
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
      isSuspended: user.isSuspended ?? false,
      suspendedAt: user.suspendedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
    },
  });
}

export async function DELETE(
  _request: Request,
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
    return Response.json({ message: "Cannot delete your own account" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await UserModel.findByIdAndDelete(id);
  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  return Response.json({ message: "Account deleted successfully" });
}