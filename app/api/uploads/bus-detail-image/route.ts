import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const UPLOAD_FOLDER = path.join(process.cwd(), "public", "uploads", "bus-details");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ message: "Image file is required." }, { status: 400 });
    }

    if (typeof file === "string") {
      return NextResponse.json({ message: "Image file is required." }, { status: 400 });
    }

    const uploadedFile = file as File;
    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = uploadedFile.name?.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${Date.now()}-${randomUUID()}.${ext}`;

    await mkdir(UPLOAD_FOLDER, { recursive: true });
    const filePath = path.join(UPLOAD_FOLDER, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/uploads/bus-details/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("[upload/bus-detail-image] failed to write file:", UPLOAD_FOLDER, error);
    const message =
      error instanceof Error ? error.message : "Unable to upload the image right now.";
    return NextResponse.json({ message: `Upload failed: ${message}` }, { status: 500 });
  }
}
