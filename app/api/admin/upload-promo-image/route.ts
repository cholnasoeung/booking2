import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";

const VALID: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp",
};

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const data = await request.formData();
  const file = data.get("image") as File | null;
  if (!file) return Response.json({ message: "No file provided" }, { status: 400 });
  if (!VALID[file.type]) return Response.json({ message: "Use PNG, JPG, or WebP." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ message: "Max 5 MB." }, { status: 400 });

  const ext      = VALID[file.type];
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const fileName = `${Date.now()}-${safeName}.${ext}`;
  const dir      = path.join(process.cwd(), "public", "uploads", "promos");

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  return Response.json({ url: `/uploads/promos/${fileName}` });
}
