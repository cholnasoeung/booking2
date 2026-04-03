import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Support conversation detail API is not implemented." },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: "Support conversation reply API is not implemented." },
    { status: 501 }
  );
}
