import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { index } = await params;
  const passengerIndex = parseInt(index, 10);

  if (isNaN(passengerIndex) || passengerIndex < 0) {
    return NextResponse.json({ message: "Invalid passenger index" }, { status: 400 });
  }

  try {
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
