import { connectToDatabase } from "@/lib/db/mongodb";
import SettingsModel from "@/models/system/Settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await SettingsModel.findOne().lean();
    const g = (settings as any)?.auth?.google;
    const fromDb = !!(g?.enabled && g?.clientId && g?.clientSecret);
    const fromEnv = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    return Response.json({ enabled: fromDb || fromEnv });
  } catch {
    return Response.json({ enabled: false });
  }
}
