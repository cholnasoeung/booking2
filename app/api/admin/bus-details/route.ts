import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BUS_TYPES } from "@/lib/constants";
import { type BusType } from "@/lib/seat-layout";
import { escapeRegExp } from "@/lib/validation";
import BusDetailModel from "@/models/BusDetail";

export const runtime = "nodejs";

export async function GET() {
  await connectToDatabase();

  const busDetails = (await BusDetailModel.find().sort({ name: 1 }).lean()) as Awaited<
    ReturnType<typeof BusDetailModel["find"]>
  >;

  return NextResponse.json(
    {
      busDetails: busDetails.map((driver) => ({
        id: String(driver._id),
        name: driver.name,
        registrationNumber: driver.registrationNumber,
        busType: driver.busType,
        totalSeats: driver.totalSeats,
        amenities: driver.amenities,
        seatLayoutTemplate: driver.seatLayoutTemplate ?? null,
        images: driver.images ?? [],
        createdAt: driver.createdAt.toISOString(),
      })),
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Please sign in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Only admins can manage bus details." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const registrationNumber =
      typeof body?.registrationNumber === "string"
        ? body.registrationNumber.trim().toUpperCase()
        : "";
    const requestedType = body?.busType;
    const busType = BUS_TYPES.includes(requestedType) ? (requestedType as BusType) : null;
    const totalSeats = Number(body?.totalSeats);
    const amenities = Array.isArray(body?.amenities) ? body.amenities : [];
    const images =
      Array.isArray(body?.images) && body.images.every((item) => typeof item === "string")
        ? body.images.map((item) => item.trim()).filter(Boolean)
        : [];

    if (!name || !registrationNumber || !busType) {
      return NextResponse.json(
        { message: "Name, registration number, and bus type are required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(totalSeats) || totalSeats <= 0) {
      return NextResponse.json(
        { message: "Total seats must be a positive number." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await BusDetailModel.findOne({
      registrationNumber: new RegExp(`^${escapeRegExp(registrationNumber)}$`, "i"),
    }).lean();

    if (existing) {
      return NextResponse.json(
        { message: "A bus with that registration number already exists." },
        { status: 409 }
      );
    }

    const busDetail = await BusDetailModel.create({
      name,
      registrationNumber,
      busType,
      totalSeats,
      amenities,
      seatLayoutTemplate: body?.seatLayoutTemplate ?? null,
      images,
    });

    return NextResponse.json(
      {
        message: "Bus detail created successfully.",
        busDetail: {
          id: String(busDetail._id),
          name: busDetail.name,
          registrationNumber: busDetail.registrationNumber,
          busType: busDetail.busType,
          totalSeats: busDetail.totalSeats,
          amenities: busDetail.amenities,
          seatLayoutTemplate: busDetail.seatLayoutTemplate ?? null,
          images: busDetail.images ?? [],
          createdAt: busDetail.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the bus detail right now.";
    return NextResponse.json({ message }, { status: error instanceof Error ? 400 : 500 });
  }
}
