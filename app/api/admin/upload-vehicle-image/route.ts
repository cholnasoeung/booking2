import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

const VALID_TYPES: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const data = await request.formData();
  const file = data.get("image") as File | null;

  if (!file) return Response.json({ message: "No file provided" }, { status: 400 });

  if (!VALID_TYPES[file.type]) {
    return Response.json(
      { message: "Invalid file type. Use PNG, JPG, or WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { message: "File too large. Maximum size is 5 MB." },
      { status: 400 }
    );
  }

  const ext      = VALID_TYPES[file.type];
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const fileName = `${Date.now()}-${safeName}.${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads", "vehicles");

  try {
    await mkdir(dir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(path.join(dir, fileName), Buffer.from(bytes));
  } catch (error) {
    console.error("[upload-vehicle-image] failed to write file:", dir, error);
    const message = error instanceof Error ? error.message : "Unable to save the image.";
    return Response.json({ message: `Upload failed: ${message}` }, { status: 500 });
  }

  return Response.json({ url: `/uploads/vehicles/${fileName}` });
}
