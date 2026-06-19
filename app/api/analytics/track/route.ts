import { connectToDatabase } from "@/lib/mongodb";
import PageViewModel from "@/models/PageView";

export const runtime = "nodejs";

function parseDevice(ua: string, screenWidth: number): "mobile" | "tablet" | "desktop" {
  if (/Mobile|Android|iPhone/.test(ua) && !/iPad/.test(ua)) return "mobile";
  if (/iPad|Tablet/.test(ua) || (screenWidth > 0 && screenWidth < 1024 && /Android/.test(ua))) return "tablet";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera\//.test(ua)) return "Opera";
  if (/SamsungBrowser\//.test(ua)) return "Samsung";
  if (/YaBrowser\//.test(ua)) return "Yandex";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function parseOS(ua: string): string {
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone/.test(ua)) return "iOS";
  if (/iPad/.test(ua)) return "iPadOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { page, referrer, sessionId, screenWidth } = body;

    if (!page || typeof page !== "string" || !sessionId) {
      return Response.json({ ok: false }, { status: 400 });
    }

    const ua = request.headers.get("user-agent") ?? "";
    const country =
      request.headers.get("cf-ipcountry") ??
      request.headers.get("x-vercel-ip-country") ??
      "Unknown";

    await connectToDatabase();
    await PageViewModel.create({
      page: page.slice(0, 500),
      referrer: typeof referrer === "string" ? referrer.slice(0, 200) : "direct",
      device: parseDevice(ua, typeof screenWidth === "number" ? screenWidth : 0),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      sessionId: sessionId.slice(0, 100),
      country: country.slice(0, 10),
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
