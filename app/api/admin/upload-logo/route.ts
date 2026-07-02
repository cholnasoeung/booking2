import { mkdir, readdir, rm, writeFile } from "fs/promises";
import path from "path";

import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import SettingsModel from "@/models/system/Settings";

export const runtime = "nodejs";

const VALID_TYPES: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const data = await request.formData();
  const file = data.get("logo") as File | null;

  if (!file) return Response.json({ message: "No file provided" }, { status: 400 });
  if (!VALID_TYPES[file.type]) {
    return Response.json({ message: "Invalid file type. Use PNG, JPG, WebP, or SVG." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ message: "File too large. Maximum size is 2 MB." }, { status: 400 });
  }

  const ext = VALID_TYPES[file.type];
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });

  // Remove any existing logo files
  try {
    const existing = await readdir(uploadsDir);
    await Promise.all(
      existing
        .filter((f) => f.startsWith("logo."))
        .map((f) => rm(path.join(uploadsDir, f), { force: true }))
    );
  } catch { /* ignore if dir empty */ }

  const fileName = `logo.${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  const bytes    = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const logoUrl = `/uploads/${fileName}`;

  await connectToDatabase();
  await SettingsModel.findOneAndUpdate({}, { $set: { logoUrl } }, { upsert: true });

  return Response.json({ url: logoUrl });
}

export async function DELETE() {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  try {
    const existing = await readdir(uploadsDir);
    await Promise.all(
      existing
        .filter((f) => f.startsWith("logo."))
        .map((f) => rm(path.join(uploadsDir, f), { force: true }))
    );
  } catch { /* already gone */ }

  await connectToDatabase();
  await SettingsModel.findOneAndUpdate({}, { $unset: { logoUrl: "" } }, { upsert: true });

  return Response.json({ ok: true });
}
