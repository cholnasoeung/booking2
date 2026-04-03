import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Support messages listing API is not implemented." },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: "Support messages creation API is not implemented." },
    { status: 501 }
  );
}
