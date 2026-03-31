import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PromoCodeModel from "@/models/PromoCode";
import BusModel from "@/models/Bus";

export const runtime = "nodejs";

// GET /api/promo-codes/validate - Validate promo code (for form input)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const busId = searchParams.get("busId");
  const bookingAmount = searchParams.get("bookingAmount");

  if (!code || !busId) {
    return NextResponse.json(
      { valid: false, message: "Code and busId are required" },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    // Find promo code
    const promoCode = await PromoCodeModel.findOne({ code: code.toUpperCase() });

    if (!promoCode) {
      return NextResponse.json({
        valid: false,
        message: "Invalid promo code",
        discount: 0,
      });
    }

    // Check if promo code is valid
    if (!promoCode.isValid()) {
      return NextResponse.json(
        {
          valid: false,
          message: promoCode.usedCount >= (promoCode.maxUses || Infinity)
            ? "Promo code has reached maximum uses"
            : "Promo code is expired or inactive",
          discount: 0,
        },
        { status: 400 }
      );
    }

    // Get bus details
    const bus = await BusModel.findById(busId).populate("routeId");
    if (!bus) {
      return NextResponse.json({
        valid: false,
        message: "Bus not found",
        discount: 0,
      }, { status: 404 });
    }

    // Check if promo code applies to this route/bus type
    if (
      promoCode.applicableRoutes &&
      promoCode.applicableRoutes.length > 0 &&
      !promoCode.applicableRoutes.includes((bus as any).routeId._id)
    ) {
      return NextResponse.json(
        { valid: false, message: "Promo code not applicable for this route", discount: 0 },
        { status: 400 }
      );
    }

    if (
      promoCode.applicableBusTypes &&
      promoCode.applicableBusTypes.length > 0 &&
      !promoCode.applicableBusTypes.includes(bus.busType)
    ) {
      return NextResponse.json(
        { valid: false, message: "Promo code not applicable for this bus type", discount: 0 },
        { status: 400 }
      );
    }

    // Calculate discount if booking amount is provided
    let discount = 0;
    let message = `Promo code ${code.toUpperCase()} applied!`;

    if (bookingAmount) {
      const amount = parseFloat(bookingAmount);
      if (!isNaN(amount)) {
        const result = promoCode.calculateDiscount(amount);
        if (result.valid) {
          discount = result.discount || 0;
          message = `${discount > 0 ? `$${discount.toFixed(2)} discount applied!` : 'Promo code applied!'}`;
        }
      }
    }

    return NextResponse.json({
      valid: true,
      code: promoCode.code,
      type: promoCode.type,
      value: promoCode.value,
      discount,
      message,
    });
  } catch (error) {
    console.error("Error validating promo code:", error);
    return NextResponse.json(
      { valid: false, message: "Unable to validate promo code", discount: 0 },
      { status: 500 }
    );
  }
}

// POST /api/promo-codes/validate - Validate promo code with booking amount
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
        { valid: false, message: "Invalid promo code", discount: 0 },
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
          discount: 0,
        },
        { status: 400 }
      );
    }

    // Get bus details
    const bus = await BusModel.findById(busId).populate("routeId");
    if (!bus) {
      return NextResponse.json({ message: "Bus not found", discount: 0 }, { status: 404 });
    }

    // Check if promo code applies to this route/bus type
    if (
      promoCode.applicableRoutes &&
      promoCode.applicableRoutes.length > 0 &&
      !promoCode.applicableRoutes.includes((bus as any).routeId._id)
    ) {
      return NextResponse.json(
        { valid: false, message: "Promo code not applicable for this route", discount: 0 },
        { status: 400 }
      );
    }

    if (
      promoCode.applicableBusTypes &&
      promoCode.applicableBusTypes.length > 0 &&
      !promoCode.applicableBusTypes.includes(bus.busType)
    ) {
      return NextResponse.json(
        { valid: false, message: "Promo code not applicable for this bus type", discount: 0 },
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
      { message: "Unable to validate promo code", discount: 0 },
      { status: 500 }
    );
  }
}
