import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address } = body;

    await dbConnect();

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      {
        $set: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
        },
      },
      { new: true, runValidators: false }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
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
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
