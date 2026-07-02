import bcrypt from "bcryptjs";

import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import UserModel from "@/models/user/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return Response.json({ message: "Both fields are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json({ message: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ email: session.user.email });
  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return Response.json({ message: "Current password is incorrect" }, { status: 400 });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  return Response.json({ message: "Password updated successfully" });
}
