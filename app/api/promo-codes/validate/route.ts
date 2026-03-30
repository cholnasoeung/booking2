import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PromoCodeModel from "@/models/PromoCode";
import BusModel from "@/models/Bus";

export const runtime = "nodejs";

// POST /api/promo-codes/validate - Validate promo code before booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, busId, bookingAmount } = body;

    if (!code || !busId || bookingAmount === undefined) {
      return NextResponse.json(
        { message: "Code, busId, and bookingAmount are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find promo code
    const promoCode = await PromoCodeModel.findOne({ code: code.toUpperCase() });

    if (!promoCode) {
      return NextResponse.json(
        { valid: false, message: "Invalid promo code" },
        { status: 404 }
      );
    }

    // Check if promo code is valid
    if (!promoCode.isValid()) {
      return NextResponse.json(
        {
          valid: false,
          message: promoCode.usedCount >= (promoCode.maxUses || Infinity)
            ? "Promo code has reached maximum uses"
            : "Promo code is expired or inactive",
        },
        { status: 400 }
      );
    }

    // Get bus details
    const bus = await BusModel.findById(busId).populate("routeId");
    if (!bus) {
      return NextResponse.json({ message: "Bus not found" }, { status: 404 });
    }

    // Check if promo code applies to this route/bus type
    if (
      promoCode.applicableRoutes &&
      promoCode.applicableRoutes.length > 0 &&
      !promoCode.applicableRoutes.includes((bus as any).routeId._id)
    ) {
      return NextResponse.json(
        { valid: false, message: "Promo code not applicable for this route" },
        { status: 400 }
      );
    }

    if (
      promoCode.applicableBusTypes &&
      promoCode.applicableBusTypes.length > 0 &&
      !promoCode.applicableBusTypes.includes(bus.busType)
    ) {
      return NextResponse.json(
        { valid: false, message: "Promo code not applicable for this bus type" },
        { status: 400 }
      );
    }

    // Calculate discount
    const result = promoCode.calculateDiscount(bookingAmount);

    return NextResponse.json({
      ...result,
      code: promoCode.code,
      type: promoCode.type,
      originalAmount: bookingAmount,
      discountedAmount: bookingAmount - result.discount,
    });
  } catch (error) {
    console.error("Error validating promo code:", error);
    return NextResponse.json(
      { message: "Unable to validate promo code" },
      { status: 500 }
    );
  }
}
