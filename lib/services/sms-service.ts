// SMS service using Twilio. Falls back to console logging when credentials are absent.
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in .env.local to enable.

const isDev = process.env.NODE_ENV === "development";

async function sendViaTwilio(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    if (isDev) {
      console.log(`[SMS dev] To: ${to}\n${body}`);
      return { success: true };
    }
    return { success: false, error: "Twilio credentials not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[SMS] Twilio error:", err);
    return { success: false, error: err };
  }

  return { success: true };
}

export async function sendBookingConfirmationSMS(
  phone: string,
  data: { customerName: string; bookingId: string; route: string; departureTime: string; seats: string[] }
): Promise<void> {
  const body =
    `Hi ${data.customerName}, your booking is confirmed!\n` +
    `Route: ${data.route}\n` +
    `Departure: ${data.departureTime}\n` +
    `Seats: ${data.seats.join(", ")}\n` +
    `Booking ID: ${data.bookingId}`;

  await sendViaTwilio(phone, body).catch((err) => console.error("[SMS] booking confirmation failed:", err));
}

export async function sendCancellationSMS(
  phone: string,
  data: { customerName: string; bookingId: string; route: string }
): Promise<void> {
  const body =
    `Hi ${data.customerName}, your booking ${data.bookingId} for ${data.route} has been cancelled. ` +
    `If you have any questions please contact support.`;

  await sendViaTwilio(phone, body).catch((err) => console.error("[SMS] cancellation failed:", err));
}

export async function sendWaitlistNotificationSMS(
  phone: string,
  data: { customerName: string; route: string; departureTime: string }
): Promise<void> {
  const body =
    `Hi ${data.customerName}, a seat is now available on ${data.route} at ${data.departureTime}. ` +
    `Log in to book before the offer expires in 24 hours.`;

  await sendViaTwilio(phone, body).catch((err) => console.error("[SMS] waitlist notification failed:", err));
}
