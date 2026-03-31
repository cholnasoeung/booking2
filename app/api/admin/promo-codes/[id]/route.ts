import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import PromoCodeModel from "@/models/PromoCode";

export const runtime = "nodejs";

// DELETE /api/admin/promo-codes/:id - Delete promo code (admin only)
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

    const promoCode = await PromoCodeModel.findById(id);

    if (!promoCode) {
      return NextResponse.json({ message: "Promo code not found" }, { status: 404 });
    }

    // Delete the promo code
    await PromoCodeModel.findByIdAndDelete(id);

    return NextResponse.json({ message: "Promo code deleted successfully" });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to delete promo code" },
      { status: 500 }
    );
  }
}
