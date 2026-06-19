import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SettingsModel from "@/models/Settings";

export const runtime = "nodejs";

const DEFAULT_SETTINGS = {
  general: {
    businessName: "BusBooking",
    contactEmail: "",
    supportPhone: "",
    currency: "USD",
    timezone: "UTC",
  },
  booking: {
    maxSeatsPerBooking: 6,
    bookingCutoffMinutes: 30,
    cancellationWindowHours: 24,
    autoConfirm: true,
    requirePaymentUpfront: false,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    adminAlertEmail: "",
    notifyOnNewBooking: true,
    notifyOnCancellation: true,
  },
};

export async function GET() {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  await connectToDatabase();
  const settings = await SettingsModel.findOne().lean();
  return Response.json(settings ?? DEFAULT_SETTINGS);
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  await connectToDatabase();
  const body = await request.json();
  const settings = await SettingsModel.findOneAndUpdate(
    {},
    { $set: body },
    { upsert: true, new: true }
  ).lean();
  return Response.json(settings);
}
