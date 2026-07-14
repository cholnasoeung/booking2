import NextAuth from "next-auth";
import { buildAuthOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const options = await buildAuthOptions();
  const params = await ctx.params;
  return (NextAuth(options) as Function)(req, { params });
}

export async function POST(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const options = await buildAuthOptions();
  const params = await ctx.params;
  return (NextAuth(options) as Function)(req, { params });
}
