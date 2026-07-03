import NextAuth from "next-auth";
import { buildAuthOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: { nextauth: string[] } }) {
  const options = await buildAuthOptions();
  return (NextAuth(options) as Function)(req, ctx);
}

export async function POST(req: Request, ctx: { params: { nextauth: string[] } }) {
  const options = await buildAuthOptions();
  return (NextAuth(options) as Function)(req, ctx);
}
