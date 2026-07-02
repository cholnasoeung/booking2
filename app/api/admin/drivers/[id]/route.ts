import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import DriverModel from "@/models/hr/Driver";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid driver ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.phone === "string" && body.phone.trim()) update.phone = body.phone.trim();
  if (typeof body.licenseNumber === "string" && body.licenseNumber.trim()) update.licenseNumber = body.licenseNumber.trim();
  if (typeof body.vehicleNumber === "string") {
    update.vehicleNumber = body.vehicleNumber.trim() || undefined;
  }
  if (body.status === "active" || body.status === "inactive") update.status = body.status;
  if (typeof body.avatar === "string") update.avatar = body.avatar.trim() || undefined;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  await connectToDatabase();

  const driver = await DriverModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean() as any;
  if (!driver) {
    return NextResponse.json({ message: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({
    driver: {
      id: String(driver._id),
      name: driver.name,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      vehicleNumber: driver.vehicleNumber ?? null,
      avatar: driver.avatar ?? null,
      status: driver.status,
      createdAt: driver.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ message: "Invalid driver ID" }, { status: 400 });
  }

  await connectToDatabase();
  const driver = await DriverModel.findByIdAndDelete(id);
  if (!driver) {
    return NextResponse.json({ message: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Driver deleted successfully" });
}
