import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  type SeatLayout,
  getBookableSeatItems,
  isBusType,
  validateSeatLayout,
} from "@/lib/seat-layout";
import { isValidObjectId } from "@/lib/validation";
import BusDetailModel from "@/models/BusDetail";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid vehicle id." }, { status: 400 });
  }

  try {
    const body = await request.json();

    // ── Seat layout template update (existing path) ──
    if (body?.seatLayoutTemplate !== undefined) {
      const busType = isBusType(body?.busType) ? body.busType : null;
      if (!busType) {
        return NextResponse.json({ message: "Please choose a valid bus type." }, { status: 400 });
      }
      const seatLayoutTemplate = (body.seatLayoutTemplate ?? null) as SeatLayout | null;
      if (!seatLayoutTemplate) {
        return NextResponse.json({ message: "Seat layout template is required." }, { status: 400 });
      }
      validateSeatLayout(seatLayoutTemplate);
      const totalSeats = getBookableSeatItems(seatLayoutTemplate).length;
      if (totalSeats < 1) {
        return NextResponse.json({ message: "Layout must include at least one bookable seat." }, { status: 400 });
      }
      await connectToDatabase();
      const busDetail = await BusDetailModel.findByIdAndUpdate(
        id,
        { $set: { busType, seatLayoutTemplate, totalSeats } },
        { new: true }
      ).lean();
      if (!busDetail) return NextResponse.json({ message: "Vehicle not found." }, { status: 404 });
      return NextResponse.json({
        message: "Seat template saved.",
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
      });
    }

    // ── General field update ──
    const update: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
    if (typeof body.registrationNumber === "string" && body.registrationNumber.trim()) {
      update.registrationNumber = body.registrationNumber.trim().toUpperCase();
    }
    if (isBusType(body.busType)) update.busType = body.busType;
    if (typeof body.totalSeats === "number" && body.totalSeats >= 1) update.totalSeats = body.totalSeats;
    if (Array.isArray(body.amenities)) {
      update.amenities = (body.amenities as string[]).map((a) => String(a).trim()).filter(Boolean);
    }
    if (Array.isArray(body.images)) {
      update.images = (body.images as string[]).map((u) => String(u).trim()).filter(Boolean);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    await connectToDatabase();
    const busDetail = await BusDetailModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!busDetail) return NextResponse.json({ message: "Vehicle not found." }, { status: 404 });

    return NextResponse.json({
      message: "Vehicle updated successfully.",
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update vehicle.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid vehicle id." }, { status: 400 });
  }

  await connectToDatabase();
  const busDetail = await BusDetailModel.findByIdAndDelete(id);
  if (!busDetail) {
    return NextResponse.json({ message: "Vehicle not found." }, { status: 404 });
  }

  return NextResponse.json({ message: "Vehicle removed from fleet." });
}
