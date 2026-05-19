import { compare, hash } from "bcryptjs";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return Response.json({ message: "Both current and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ message: "New password must be at least 6 characters" }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return Response.json({ message: "New password must differ from current password" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findById(session.user.id).select("password").lean();
    if (!user?.password) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      return Response.json({ message: "Current password is incorrect" }, { status: 400 });
    }

    const hashed = await hash(newPassword, 10);
    await UserModel.findByIdAndUpdate(session.user.id, { password: hashed });

    return Response.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return Response.json({ message: "Unable to update password" }, { status: 500 });
  }
}
