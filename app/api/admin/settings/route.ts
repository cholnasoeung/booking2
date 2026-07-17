import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import SettingsModel from "@/models/system/Settings";

export const runtime = "nodejs";

const DEFAULT_SETTINGS = {
  general: {
    businessName: "TKBus",
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
  payment: {
    stripe: { enabled: false, publishableKey: "", secretKey: "", webhookSecret: "" },
    abaPayway: { enabled: false, merchantId: "", apiKey: "", publicKey: "" },
    activeGateway: "none",
  },
  sms: {
    twilio: { enabled: false, accountSid: "", authToken: "", fromNumber: "" },
  },
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return key;
  return key.slice(0, 7) + "****" + key.slice(-4);
}

function maskPaymentSettings(payment: typeof DEFAULT_SETTINGS.payment) {
  return {
    ...payment,
    stripe: {
      ...payment.stripe,
      secretKey: maskKey(payment.stripe.secretKey),
      webhookSecret: maskKey(payment.stripe.webhookSecret),
    },
    abaPayway: {
      ...payment.abaPayway,
      apiKey: maskKey(payment.abaPayway.apiKey),
    },
  };
}

function maskSmsSettings(sms: typeof DEFAULT_SETTINGS.sms) {
  return {
    ...sms,
    twilio: {
      ...sms.twilio,
      authToken: maskKey(sms.twilio.authToken),
    },
  };
}

function maskAuthSettings(auth: any) {
  if (!auth?.google) return auth;
  return {
    ...auth,
    google: {
      ...auth.google,
      clientSecret: maskKey(auth.google.clientSecret ?? ""),
    },
  };
}

function isMasked(value: string): boolean {
  return value.includes("****");
}

export async function GET() {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  await connectToDatabase();
  const settings = await SettingsModel.findOne().lean() as any;
  if (!settings) return Response.json(DEFAULT_SETTINGS);

  // Mask secret keys before sending to client
  if (settings.payment) {
    settings.payment = maskPaymentSettings(settings.payment);
  }
  if (settings.sms) {
    settings.sms = maskSmsSettings(settings.sms);
  }
  if (settings.auth) {
    settings.auth = maskAuthSettings(settings.auth);
  }
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  await connectToDatabase();
  const body = await request.json();

  // If payment keys are masked placeholders, remove them from the update
  // so the real stored values are not overwritten
  if (body.payment?.stripe) {
    if (isMasked(body.payment.stripe.secretKey ?? "")) delete body.payment.stripe.secretKey;
    if (isMasked(body.payment.stripe.webhookSecret ?? "")) delete body.payment.stripe.webhookSecret;
  }
  if (body.payment?.abaPayway) {
    if (isMasked(body.payment.abaPayway.apiKey ?? "")) delete body.payment.abaPayway.apiKey;
  }
  if (body.sms?.twilio) {
    if (isMasked(body.sms.twilio.authToken ?? "")) delete body.sms.twilio.authToken;
  }
  if (body.auth?.google) {
    if (isMasked(body.auth.google.clientSecret ?? "")) delete body.auth.google.clientSecret;
  }

  // Flatten nested payment fields for $set to avoid overwriting sibling keys
  const $set: Record<string, unknown> = {};
  for (const [section, value] of Object.entries(body)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [field, fieldValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof fieldValue === "object" && fieldValue !== null && !Array.isArray(fieldValue)) {
          for (const [subField, subValue] of Object.entries(fieldValue as Record<string, unknown>)) {
            $set[`${section}.${field}.${subField}`] = subValue;
          }
        } else {
          $set[`${section}.${field}`] = fieldValue;
        }
      }
    } else {
      $set[section] = value;
    }
  }

  await SettingsModel.findOneAndUpdate({}, { $set }, { upsert: true, new: true });

  // Return masked version
  const updated = await SettingsModel.findOne().lean() as any;
  if (updated?.payment) updated.payment = maskPaymentSettings(updated.payment);
  if (updated?.sms) updated.sms = maskSmsSettings(updated.sms);
  if (updated?.auth) updated.auth = maskAuthSettings(updated.auth);
  return Response.json(updated);
}
