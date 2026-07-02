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
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  try {
    const body = await request.json();
    await connectToDatabase();

    const promoCode = await PromoCodeModel.findById(id);
    if (!promoCode) return NextResponse.json({ message: "Promo code not found" }, { status: 404 });

    // Toggle-only (activate / deactivate button)
    if (Object.keys(body).length === 1 && body.isActive !== undefined) {
      promoCode.isActive = body.isActive;
      await promoCode.save();
      return NextResponse.json({ message: "Promo code updated", promoCode });
    }

    // Full edit
    if (body.code !== undefined) {
      const upper = String(body.code).toUpperCase();
      if (upper !== promoCode.code) {
        const dup = await PromoCodeModel.findOne({ code: upper });
        if (dup) return NextResponse.json({ message: "Promo code already exists" }, { status: 409 });
      }
      promoCode.code = upper;
    }
    if (body.type              !== undefined) promoCode.type              = body.type;
    if (body.value             !== undefined) promoCode.value             = body.value;
    if (body.maxUses           !== undefined) promoCode.maxUses           = body.maxUses ?? undefined;
    if (body.minBookingAmount  !== undefined) promoCode.minBookingAmount  = body.minBookingAmount  ?? 0;
    if (body.maxDiscountAmount !== undefined) promoCode.maxDiscountAmount = body.maxDiscountAmount ?? undefined;
    if (body.validFrom         !== undefined) promoCode.validFrom         = new Date(body.validFrom);
    if (body.validUntil        !== undefined) promoCode.validUntil        = new Date(body.validUntil);
    if (body.isActive          !== undefined) promoCode.isActive          = body.isActive;
    if (body.title             !== undefined) (promoCode as any).title    = body.title    ?? null;
    if (body.imageUrl          !== undefined) (promoCode as any).imageUrl = body.imageUrl ?? null;

    await promoCode.save();
    return NextResponse.json({ message: "Promo code updated", promoCode });
  } catch (error) {
    console.error("Error updating promo code:", error);
    return NextResponse.json({ message: "Unable to update promo code" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const promoCode = await PromoCodeModel.findByIdAndDelete(id);
    if (!promoCode) return NextResponse.json({ message: "Promo code not found" }, { status: 404 });
    return NextResponse.json({ message: "Promo code deleted" });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    return NextResponse.json({ message: "Unable to delete promo code" }, { status: 500 });
  }
}
