import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PromoCodeModel from "@/models/PromoCode";
import { isValidObjectId } from "@/lib/validation";

export const runtime = "nodejs";

// GET /api/promo-codes - List all promo codes (admin only)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("active");

    const query: any = {};
    if (isActive === "true") {
      query.isActive = true;
    }

    const promoCodes = await PromoCodeModel.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ promoCodes });
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    return NextResponse.json(
      { message: "Unable to fetch promo codes" },
      { status: 500 }
    );
  }
}

// POST /api/promo-codes - Create promo code (admin only)
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      code,
      type,
      value,
      maxUses,
      minBookingAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      applicableRoutes,
      applicableBusTypes,
    } = body;

    // Validation
    if (!code || !type || value === undefined) {
      return NextResponse.json(
        { message: "Code, type, and value are required" },
        { status: 400 }
      );
    }

    if (!["percentage", "fixed", "free_ticket"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid promo code type" },
        { status: 400 }
      );
    }

    if (type === "percentage" && (value < 0 || value > 100)) {
      return NextResponse.json(
        { message: "Percentage value must be between 0 and 100" },
        { status: 400 }
      );
    }

    if (value < 0) {
      return NextResponse.json(
        { message: "Value must be positive" },
        { status: 400 }
      );
    }

    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);

    if (isNaN(validFromDate.getTime()) || isNaN(validUntilDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid dates" },
        { status: 400 }
      );
    }

    if (validFromDate >= validUntilDate) {
      return NextResponse.json(
        { message: "validFrom must be before validUntil" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if code already exists
    const existing = await PromoCodeModel.findOne({ code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { message: "Promo code already exists" },
        { status: 409 }
      );
    }

    const promoCode = await PromoCodeModel.create({
      code: code.toUpperCase(),
      type,
      value,
      maxUses,
      minBookingAmount,
      maxDiscountAmount,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      applicableRoutes: applicableRoutes || [],
      applicableBusTypes: applicableBusTypes || [],
      isActive: true,
    });

    return NextResponse.json(
      { message: "Promo code created", promoCode },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating promo code:", error);
    return NextResponse.json(
      { message: "Unable to create promo code" },
      { status: 500 }
    );
  }
}

// PUT /api/promo-codes/:id - Update promo code (admin only)
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

    // Update fields
    if (body.isActive !== undefined) promoCode.isActive = body.isActive;
    if (body.maxUses !== undefined) promoCode.maxUses = body.maxUses;

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

// DELETE /api/promo-codes/:id - Delete promo code (admin only)
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
