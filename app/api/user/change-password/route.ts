import { hash, compare } from "bcryptjs";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return Response.json({ message: "Both current and new password are required." }, { status: 400 });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return Response.json({ message: "New password must be at least 8 characters." }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return Response.json({ message: "New password must be different from your current password." }, { status: 400 });
  }

  await connectToDatabase();

  const user = await UserModel.findById(session.user.id);
  if (!user?.password) {
    return Response.json({ message: "User not found." }, { status: 404 });
  }

  const isValid = await compare(currentPassword, user.password);
  if (!isValid) {
    return Response.json({ message: "Current password is incorrect." }, { status: 400 });
  }

  user.password = await hash(newPassword, 12);
  await user.save();

  return Response.json({ message: "Password changed successfully." });
}
