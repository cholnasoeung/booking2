import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import UserModel from "@/models/user/User";
import crypto from "crypto";
import { sendEmailVerificationEmail } from "@/lib/services/email-service";

export const runtime = "nodejs";

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

// POST /api/auth/send-verification - Send verification email
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await UserModel.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiry = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    user.emailVerificationToken = verificationToken;
    await user.save();

    // Generate verification link
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

    // Send email
    await sendEmailVerificationEmail(user.email, {
      customerName: user.name,
      verificationLink,
      expiryHours: VERIFICATION_TOKEN_EXPIRY_HOURS,
    }).catch(err => console.error("Failed to send verification email:", err));

    return NextResponse.json({
      message: "Verification email sent successfully",
      expiresIn: VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60, // seconds
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to send verification email" },
      { status: 500 }
    );
  }
}

// POST /api/auth/verify-email - Verify email with token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { message: "Verification token is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await UserModel.findOne({
      emailVerificationToken: token,
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired verification link" },
        { status: 400 }
      );
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return NextResponse.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to verify email" },
      { status: 500 }
    );
  }
}

// GET /api/auth/verify-status - Check verification status
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await UserModel.findById(session.user.id).select("isEmailVerified");

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      isEmailVerified: user.isEmailVerified || false,
      email: session.user.email,
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    return NextResponse.json(
      { message: "Unable to check verification status" },
      { status: 500 }
    );
  }
}
