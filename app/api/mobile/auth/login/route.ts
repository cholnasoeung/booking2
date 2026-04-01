import { compare } from "bcryptjs";

import { connectToDatabase } from "@/lib/mongodb";
import { createMobileAuthToken } from "@/lib/mobile-auth";
import { normalizeEmail } from "@/lib/validation";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return Response.json({ message: "Email and password are required." }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email });

    if (!user?.password) {
      return Response.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return Response.json({ message: "Invalid email or password." }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const mobileUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    } as const;

    return Response.json({
      token: createMobileAuthToken(mobileUser),
      user: mobileUser,
    });
  } catch {
    return Response.json({ message: "Unable to sign you in right now." }, { status: 500 });
  }
}
