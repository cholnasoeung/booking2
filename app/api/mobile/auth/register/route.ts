import { hash } from "bcryptjs";

import { connectToDatabase } from "@/lib/db/mongodb";
import { createMobileAuthToken } from "@/lib/auth/mobile-auth";
import { normalizeEmail } from "@/lib/utils/validation";
import UserModel from "@/models/user/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!name || !email || !password) {
      return Response.json(
        { message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await UserModel.findOne({ email }).lean();

    if (existingUser) {
      return Response.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const user = await UserModel.create({
      name,
      email,
      password: await hash(password, 10),
      phone: phone || undefined,
      role: "user",
    });

    const mobileUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    } as const;

    return Response.json(
      {
        token: createMobileAuthToken(mobileUser),
        user: mobileUser,
      },
      { status: 201 }
    );
  } catch {
    return Response.json({ message: "Unable to create your account right now." }, { status: 500 });
  }
}
