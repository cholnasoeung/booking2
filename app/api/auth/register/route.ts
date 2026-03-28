import { hash } from "bcryptjs";

import { connectToDatabase } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/validation";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";

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

    const hashedPassword = await hash(password, 10);
    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    return Response.json(
      {
        message: "Account created successfully.",
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { message: "Unable to create your account right now." },
      { status: 500 }
    );
  }
}
