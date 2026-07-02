import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import PromoCodeModel from "@/models/commerce/PromoCode";
import { isValidObjectId } from "@/lib/utils/validation";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid promo code ID" }, { status: 400 });
  }

  try {
    const body = await request.json();

    await connectToDatabase();

    const promoCode = await PromoCodeModel.findById(id);
    if (!promoCode) {
      return NextResponse.json({ message: "Promo code not found" }, { status: 404 });
    }

    if (body.isActive !== undefined) {
      promoCode.isActive = body.isActive;
    }

    if (body.maxUses !== undefined) {
      promoCode.maxUses = body.maxUses;
    }

    await promoCode.save();

    return NextResponse.json({
      message: "Promo code updated",
      promoCode,
    });
  } catch (error) {
    console.error("Error updating promo code:", error);
    return NextResponse.json(
      { message: "Unable to update promo code" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid promo code ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const promoCode = await PromoCodeModel.findByIdAndDelete(id);

    if (!promoCode) {
      return NextResponse.json({ message: "Promo code not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Promo code deleted" });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    return NextResponse.json(
      { message: "Unable to delete promo code" },
      { status: 500 }
    );
  }
}
