import { requireAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";
import NotificationModel from "@/models/Notification";
import SettingsModel from "@/models/Settings";

export const runtime = "nodejs";

const ANNOUNCEMENT_TYPES = ["delay", "platform_change", "general", "cancellation_warning"] as const;
type AnnouncementType = typeof ANNOUNCEMENT_TYPES[number];

const TYPE_SUBJECTS: Record<AnnouncementType, string> = {
  delay:                "⏳ Trip Delay Notice",
  platform_change:      "📍 Platform / Boarding Point Change",
  general:              "📢 Important Trip Update",
  cancellation_warning: "⚠️ Possible Trip Cancellation Notice",
};

const TYPE_NOTIF: Record<AnnouncementType, "announcement" | "trip_update"> = {
  delay:                "trip_update",
  platform_change:      "trip_update",
  general:              "announcement",
  cancellation_warning: "trip_update",
};

async function sendTwilioSms(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    }
  );
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

function buildAnnouncementHtml(opts: {
  type: AnnouncementType;
  message: string;
  delayMinutes?: number;
  route: string;
  date: string;
  departureTime: string;
  passengerName: string;
  bookingId: string;
}): string {
  const accentColor =
    opts.type === "delay" ? "#f59e0b" :
    opts.type === "platform_change" ? "#3b82f6" :
    opts.type === "cancellation_warning" ? "#ef4444" : "#6366f1";

  const delayNote = opts.type === "delay" && opts.delayMinutes
    ? `<p style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;margin:16px 0;">
        <strong>Estimated delay: ${opts.delayMinutes} minutes</strong>
       </p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Trip Update</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:${accentColor};padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">${TYPE_SUBJECTS[opts.type]}</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;">Dear <strong>${opts.passengerName}</strong>,</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 4px;color:#64748b;font-size:13px;">Your booking</p>
        <p style="margin:0;font-weight:700;color:#0f172a;">${opts.route}</p>
        <p style="margin:4px 0 0;color:#475569;font-size:14px;">${opts.date} · Departure ${opts.departureTime} · Ref #${opts.bookingId.slice(-6).toUpperCase()}</p>
      </div>
      ${delayNote}
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0;color:#0c4a6e;font-size:15px;line-height:1.6;">
        ${opts.message.replace(/\n/g, "<br>")}
      </div>
      <p style="color:#64748b;font-size:13px;margin-top:24px;">If you have questions, please contact our support team. We apologise for any inconvenience caused.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;">
      Bus Booking System · This is an automated message
    </div>
  </div>
</body>
</html>`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const type = ANNOUNCEMENT_TYPES.includes(body?.type) ? (body.type as AnnouncementType) : "general";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const delayMinutes = typeof body?.delayMinutes === "number" ? body.delayMinutes : undefined;

  if (!message) return Response.json({ message: "Message is required" }, { status: 400 });

  await connectToDatabase();

  const [bus, settings] = await Promise.all([
    BusModel.findById(id).lean(),
    SettingsModel.findOne().lean() as Promise<any>,
  ]);
  if (!bus) return Response.json({ message: "Bus not found" }, { status: 404 });

  const route = await RouteModel.findById(bus.routeId).lean();
  const routeStr = route ? `${route.from} → ${route.to}` : "Unknown Route";
  const dateStr = bus.date instanceof Date
    ? bus.date.toISOString().slice(0, 10)
    : String(bus.date).slice(0, 10);

  // If delay type, also update bus status
  if (type === "delay" && delayMinutes && delayMinutes > 0) {
    await BusModel.findByIdAndUpdate(id, {
      departureStatus: "delayed",
      delayMinutes,
      statusNote: message,
    });
  }

  const bookings = await BookingModel.find({
    bus: id,
    status: { $in: ["confirmed", "pending"] },
  })
    .populate("user", "name email phone")
    .lean() as any[];

  const sendEmail = async (to: string, subj: string, html: string) => {
    const { Resend } = await import("resend").catch(() => ({ Resend: null }));
    const resend = process.env.RESEND_API_KEY && Resend ? new Resend(process.env.RESEND_API_KEY) : null;
    if (resend && process.env.NODE_ENV !== "development") {
      await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL || "noreply@busbooking.com", to, subject: subj, html });
    } else {
      console.log(`[DEV] Announcement email to ${to}: ${subj}`);
    }
  };

  // SMS via Twilio (no SDK — plain REST)
  const twilioSid  = settings?.sms?.twilio?.enabled ? (settings.sms.twilio.accountSid || process.env.TWILIO_ACCOUNT_SID) : process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = settings?.sms?.twilio?.enabled ? (settings.sms.twilio.authToken  || process.env.TWILIO_AUTH_TOKEN)  : process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = settings?.sms?.twilio?.enabled ? (settings.sms.twilio.fromNumber  || process.env.TWILIO_FROM_NUMBER) : process.env.TWILIO_FROM_NUMBER;
  const smsReady   = !!(twilioSid && twilioAuth && twilioFrom);

  const subject = TYPE_SUBJECTS[type];
  const notifTitle = subject.replace(/^\S+\s/, ""); // strip emoji prefix
  const notifType  = TYPE_NOTIF[type];
  let sent = 0;
  let smsSent = 0;

  await Promise.allSettled(
    bookings.map(async (booking) => {
      const email = booking.user?.email ?? booking.metadata?.guestEmail;
      const name  = booking.user?.name  ?? booking.metadata?.guestName ?? "Passenger";
      const phone = booking.user?.phone ?? null;

      // 1. Email
      if (email) {
        const html = buildAnnouncementHtml({
          type, message, delayMinutes, route: routeStr,
          date: dateStr, departureTime: bus.departureTime,
          passengerName: name, bookingId: String(booking._id),
        });
        try { await sendEmail(email, subject, html); sent++; } catch { /* non-fatal */ }
      }

      // 2. In-app notification
      if (booking.user?._id) {
        try {
          await NotificationModel.create({
            userId: booking.user._id,
            type: notifType,
            title: notifTitle,
            message: `${routeStr} · ${dateStr} ${bus.departureTime}\n${message}`,
            busId: id,
            bookingId: String(booking._id),
          });
        } catch { /* non-fatal */ }
      }

      // 3. SMS
      if (smsReady && phone) {
        const delayNote = type === "delay" && delayMinutes ? ` (Delay: ${delayMinutes} min)` : "";
        const smsBody = `[Bus Alert] ${notifTitle}${delayNote}\n${routeStr} ${dateStr} ${bus.departureTime}\n${message}\nRef #${String(booking._id).slice(-6).toUpperCase()}`;
        try { await sendTwilioSms(twilioSid!, twilioAuth!, twilioFrom!, phone, smsBody); smsSent++; }
        catch (err) { console.warn("[SMS] Failed:", phone, err); }
      }
    })
  );

  return Response.json({ message: "Announcement sent", totalPassengers: bookings.length, sent, smsSent, smsEnabled: smsReady });
}

// Preview — return recipient list without sending
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid bus ID" }, { status: 400 });

  await connectToDatabase();
  const bus = await BusModel.findById(id).lean();
  if (!bus) return Response.json({ message: "Bus not found" }, { status: 404 });

  const route = await RouteModel.findById(bus.routeId).lean();
  const bookings = await BookingModel.find({ bus: id, status: { $in: ["confirmed", "pending"] } })
    .populate("user", "name email phone").lean() as any[];

  const recipients = bookings.map((b) => ({
    name:  b.user?.name  ?? b.metadata?.guestName  ?? "Guest",
    email: b.user?.email ?? b.metadata?.guestEmail ?? null,
    phone: b.user?.phone ?? null,
    seats: b.seats ?? [],
  })).filter((r) => r.email || r.phone);

  return Response.json({
    route: route ? `${route.from} → ${route.to}` : "Unknown",
    date: bus.date instanceof Date ? bus.date.toISOString().slice(0, 10) : String(bus.date).slice(0, 10),
    departureTime: bus.departureTime,
    totalPassengers: bookings.length,
    reachable: recipients.length,
    recipients,
  });
}
