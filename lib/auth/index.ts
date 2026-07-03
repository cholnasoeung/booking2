import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import type { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { connectToDatabase } from "@/lib/db/mongodb";
import { normalizeEmail } from "@/lib/utils/validation";
import UserModel from "@/models/user/User";
import SettingsModel from "@/models/system/Settings";

const credentialsProvider = CredentialsProvider({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (
      typeof credentials?.email !== "string" ||
      typeof credentials?.password !== "string"
    ) {
      return null;
    }

    await connectToDatabase();

    const email = normalizeEmail(credentials.email);
    const user = await UserModel.findOne({ email }).lean();

    if (!user?.password) return null;

    const isPasswordValid = await compare(credentials.password, user.password);
    if (!isPasswordValid) return null;
    if ((user as any).isSuspended) return null;

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  },
});

const sharedOptions: Omit<NextAuthOptions, "providers"> = {
  pages: { signIn: "/login" },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? "";
        session.user.role = token.role ?? "user";
        session.user.phone = token.phone;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Per-request options — reads DB to conditionally include GoogleProvider
export async function buildAuthOptions(): Promise<NextAuthOptions> {
  await connectToDatabase();
  const settings = await SettingsModel.findOne().lean();
  const g = (settings as any)?.auth?.google;

  const clientId = (g?.clientId as string) || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = (g?.clientSecret as string) || process.env.GOOGLE_CLIENT_SECRET || "";
  const enabled = !!(g?.enabled && clientId && clientSecret);

  const providers: NextAuthOptions["providers"] = [credentialsProvider];
  if (enabled) {
    providers.push(GoogleProvider({ clientId, clientSecret }));
  }

  return { ...sharedOptions, providers };
}

// Static export for getServerSession() throughout the codebase (env vars only, no DB call)
export const authOptions: NextAuthOptions = {
  ...sharedOptions,
  providers: [
    credentialsProvider,
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
  ],
};

export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export type User = Session["user"] & {
  address?: string;
  createdAt?: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser(redirectTo = "/login"): Promise<User> {
  const session = await getCurrentSession();
  const user = session?.user;

  if (!user?.id) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireAdmin(redirectTo = "/"): Promise<User> {
  const user = await requireUser("/login");

  if (user.role !== "admin") {
    redirect(redirectTo);
  }

  return user;
}
