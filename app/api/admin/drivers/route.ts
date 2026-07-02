import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import DriverModel, { type IDriver } from "@/models/hr/Driver";

export const runtime = "nodejs";

type DriverPayload = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber?: string;
  avatar?: string | null;
  status: "active" | "inactive";
  createdAt: string;
};

function mapDriver(driver: IDriver): DriverPayload {
  return {
    id: String(driver._id),
    name: driver.name,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    vehicleNumber: driver.vehicleNumber,
    avatar: driver.avatar ?? null,
    status: driver.status,
    createdAt: driver.createdAt.toISOString(),
  };
}

export async function GET() {
  await connectToDatabase();

  const drivers = await DriverModel.find().sort({ name: 1 }).lean();

  const payload = drivers.map((driver) => ({
    id: String(driver._id),
    name: driver.name,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    vehicleNumber: driver.vehicleNumber,
    avatar: (driver as any).avatar ?? null,
    status: driver.status,
    createdAt: driver.createdAt.toISOString(),
  }));

  return NextResponse.json({ drivers: payload }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Please sign in to continue." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Only admins can manage drivers." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const licenseNumber =
      typeof body?.licenseNumber === "string" ? body.licenseNumber.trim() : "";
    const vehicleNumber =
      typeof body?.vehicleNumber === "string" && body.vehicleNumber.trim().length > 0
        ? body.vehicleNumber.trim()
        : undefined;

    if (!name || !phone || !licenseNumber) {
      return NextResponse.json(
        { message: "Name, phone, and license number are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await DriverModel.findOne({
      licenseNumber: { $regex: new RegExp(`^${licenseNumber}$`, "i") },
    }).lean();

    if (existing) {
      return NextResponse.json(
        { message: "A driver with that license number already exists." },
        { status: 409 }
      );
    }

    const driver = await DriverModel.create({
      name,
      phone,
      licenseNumber,
      vehicleNumber,
    });

    return NextResponse.json(
      {
        message: "Driver added successfully.",
        driver: mapDriver(driver),
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to save the driver at the moment." },
      { status: 500 }
    );
  }
}
