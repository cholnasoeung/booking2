import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";

// GET /api/user/profile - Get user profile with preferences and saved passengers
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userDoc = await User.findById(user.id).select("-password").lean();

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone,
        address: userDoc.address,
        isEmailVerified: userDoc.isEmailVerified,
        role: userDoc.role,
        preferences: userDoc.preferences,
        savedPassengers: userDoc.savedPassengers || [],
        createdAt: userDoc.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ message: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/user/profile - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address, preferences } = body;

    await connectToDatabase();

    // Build update object
    const updateData: any = {};

    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (preferences) {
      updateData.preferences = preferences;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).select("-password").lean();

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        isEmailVerified: updatedUser.isEmailVerified,
        preferences: updatedUser.preferences,
        savedPassengers: updatedUser.savedPassengers || [],
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}

// POST /api/user/profile/saved-passengers - Add saved passenger
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, age, gender, contactNumber, email, idProof } = body;

    if (!name || !age || !gender || !contactNumber) {
      return NextResponse.json(
        { message: "Name, age, gender, and contact number are required" },
        { status: 400 }
      );
    }

    if (!["male", "female", "other"].includes(gender)) {
      return NextResponse.json(
        { message: "Invalid gender value" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const userDoc = await User.findById(user.id);

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check max saved passengers
    const maxSavedPassengers = 10;
    if ((userDoc.savedPassengers?.length || 0) >= maxSavedPassengers) {
      return NextResponse.json(
        { message: `Maximum ${maxSavedPassengers} saved passengers allowed` },
        { status: 400 }
      );
    }

    // Check for duplicate
    const isDuplicate = (userDoc.savedPassengers || []).some(
      p => p.name === name && p.contactNumber === contactNumber
    );

    if (isDuplicate) {
      return NextResponse.json(
        { message: "Passenger already saved" },
        { status: 400 }
      );
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

// DELETE /api/user/profile/saved-passengers/:index - Remove saved passenger
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { index } = await params;
    const passengerIndex = parseInt(index, 10);

    if (isNaN(passengerIndex) || passengerIndex < 0) {
      return NextResponse.json({ message: "Invalid passenger index" }, { status: 400 });
    }

    await connectToDatabase();

    const userDoc = await User.findById(user.id);

    if (!userDoc) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (!userDoc.savedPassengers || passengerIndex >= userDoc.savedPassengers.length) {
      return NextResponse.json({ message: "Passenger not found" }, { status: 404 });
    }

    userDoc.savedPassengers.splice(passengerIndex, 1);
    await userDoc.save();

    return NextResponse.json({
      success: true,
      message: "Passenger removed successfully",
      savedPassengers: userDoc.savedPassengers,
    });
  } catch (error) {
    console.error("Error removing saved passenger:", error);
    return NextResponse.json(
      { message: "Failed to remove passenger" },
      { status: 500 }
    );
  }
}

