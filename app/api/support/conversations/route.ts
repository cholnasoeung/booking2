import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Support conversations listing API is not implemented." },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: "Support conversation creation API is not implemented." },
    { status: 501 }
  );
}
