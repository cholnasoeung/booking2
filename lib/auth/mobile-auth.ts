import { createHmac, timingSafeEqual } from "node:crypto";

import { connectToDatabase } from "@/lib/db/mongodb";
import UserModel, { type UserRole } from "@/models/user/User";

const MOBILE_AUTH_TOKEN_VERSION = 1;
const MOBILE_AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type MobileTokenPayload = {
  v: number;
  sub: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  exp: number;
};

export type MobileAuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
};

function getMobileAuthSecret() {
  const secret = process.env.MOBILE_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Missing mobile auth secret.");
  }

  return secret;
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64");
}

function signTokenPayload(encodedPayload: string) {
  return toBase64Url(createHmac("sha256", getMobileAuthSecret()).update(encodedPayload).digest());
}

function normalizeMobileAuthUser(user: MobileAuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? undefined,
  } satisfies MobileAuthUser;
}

export function createMobileAuthToken(user: MobileAuthUser) {
  const payload: MobileTokenPayload = {
    v: MOBILE_AUTH_TOKEN_VERSION,
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    exp: Math.floor(Date.now() / 1000) + MOBILE_AUTH_MAX_AGE_SECONDS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signTokenPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyMobileAuthToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signTokenPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as Partial<MobileTokenPayload>;

    if (
      payload.v !== MOBILE_AUTH_TOKEN_VERSION ||
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "user" && payload.role !== "admin") ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return normalizeMobileAuthUser({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      phone: typeof payload.phone === "string" ? payload.phone : undefined,
    });
  } catch {
    return null;
  }
}

export function getMobileAuthTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function requireMobileAuthUser(request: Request) {
  const token = getMobileAuthTokenFromRequest(request);

  if (!token) {
    return null;
  }

  const tokenUser = verifyMobileAuthToken(token);

  if (!tokenUser) {
    return null;
  }

  await connectToDatabase();

  const user = await UserModel.findById(tokenUser.id).lean();

  if (!user) {
    return null;
  }

  return normalizeMobileAuthUser({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
  });
}
