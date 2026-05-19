import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import BookingModel from "@/models/Booking";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const userDoc = await User.findById(user.id).select("-password").lean();

  if (!userDoc) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: userDoc });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, address, preferences } = body;

    await connectToDatabase();

    const updateData: any = {};

    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (preferences) updateData.preferences = preferences;

    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: updateData },
      { new: true, runValidators: false }
    )
      .select("-password")
      .lean();

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}

// DELETE — anonymize and remove account (GDPR-style)
export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "Please log in" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json({ message: "Password confirmation required" }, { status: 400 });
    }

    await connectToDatabase();

    const userDoc = await User.findById(currentUser.id).select("password").lean();
    if (!userDoc?.password) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const isValid = await compare(password, userDoc.password);
    if (!isValid) {
      return NextResponse.json({ message: "Incorrect password" }, { status: 400 });
    }

    // Anonymize instead of hard delete to preserve booking records
    const anon = `deleted_${currentUser.id}`;
    await User.findByIdAndUpdate(currentUser.id, {
      name: "Deleted User",
      email: `${anon}@deleted.invalid`,
      password: "",
      phone: undefined,
      address: undefined,
      status: "banned",
      banReason: "Account deleted by user",
      savedPassengers: [],
      emailVerificationToken: undefined,
      passwordResetToken: undefined,
    });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ message: "Unable to delete account" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, age, gender, contactNumber, email, idProof } = body;

    if (!name || !age || !gender || !contactNumber) {
      return NextResponse.json(
        { message: "Name, age, gender, and contact number are required" },
        { status: 400 }
      );
    }

    if (!["male", "female", "other"].includes(gender)) {
      return NextResponse.json({ message: "Invalid gender value" }, { status: 400 });
    }

    await connectToDatabase();

    const userDoc = await User.findById(user.id);

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const maxSavedPassengers = 10;
    if ((userDoc.savedPassengers?.length || 0) >= maxSavedPassengers) {
      return NextResponse.json(
        { message: `Maximum ${maxSavedPassengers} saved passengers allowed` },
        { status: 400 }
      );
    }

    const isDuplicate = (userDoc.savedPassengers || []).some(
      (p) => p.name === name && p.contactNumber === contactNumber
    );

    if (isDuplicate) {
      return NextResponse.json({ message: "Passenger already saved" }, { status: 400 });
    }

    const passenger = {
      name,
      age,
      gender,
      contactNumber,
      email: email || undefined,
      idProof: idProof || undefined,
    };

    userDoc.savedPassengers = userDoc.savedPassengers || [];
    userDoc.savedPassengers.push(passenger);
    await userDoc.save();

    return NextResponse.json({
      success: true,
      message: "Passenger saved successfully",
      passenger,
      savedPassengers: userDoc.savedPassengers,
    });
  } catch (error) {
    console.error("Error adding saved passenger:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save passenger" },
      { status: 500 }
    );
  }
}
