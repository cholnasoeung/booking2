import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import UserModel from "@/models/user/User";
import EmployeeModel from "@/models/hr/Employee";
import DriverModel from "@/models/hr/Driver";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ message: "Invalid form data" }, { status: 400 });

  const file = form.get("file") as File | null;
  const entityType = form.get("type") as string | null; // "user" | "employee" | "driver"
  const entityId   = form.get("id")   as string | null;

  if (!file)           return Response.json({ message: "No file provided" }, { status: 400 });
  if (!entityType)     return Response.json({ message: "Entity type required" }, { status: 400 });
  if (!entityId || !isValidObjectId(entityId)) {
    return Response.json({ message: "Invalid entity ID" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ message: "Only JPEG, PNG, WebP or GIF allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ message: "File must be under 2 MB" }, { status: 400 });
  }

  const ext      = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${entityType}-${entityId}-${Date.now()}.${ext}`;
  const dir      = join(process.cwd(), "public", "uploads", "avatars");
  const filePath = join(dir, filename);

  try {
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);
  } catch (error) {
    console.error("[upload/avatar] failed to write file:", dir, error);
    const message = error instanceof Error ? error.message : "Unable to save the file.";
    return Response.json({ message: `Upload failed: ${message}` }, { status: 500 });
  }

  const url = `/uploads/avatars/${filename}`;

  // Persist avatar URL on the entity
  await connectToDatabase();
  if (entityType === "user") {
    await UserModel.findByIdAndUpdate(entityId, { $set: { avatar: url } });
  } else if (entityType === "employee") {
    await EmployeeModel.findByIdAndUpdate(entityId, { $set: { avatar: url } });
  } else if (entityType === "driver") {
    await DriverModel.findByIdAndUpdate(entityId, { $set: { avatar: url } });
  }

  return Response.json({ url });
}
