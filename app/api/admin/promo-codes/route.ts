import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PromoCodeModel from "@/models/PromoCode";

export const runtime = "nodejs";

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

    const promoCodes = await PromoCodeModel.find().sort({ createdAt: -1 });

    return NextResponse.json({ promoCodes });
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    return NextResponse.json(
      { message: "Unable to fetch promo codes" },
      { status: 500 }
    );
  }
}

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
    const { code, type, value } = body;

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

    await connectToDatabase();

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
