import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import type { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { connectToDatabase } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/validation";
import UserModel from "@/models/User";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
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
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
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

        if (!user?.password) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        if ((user as any).isSuspended) {
          return null;
        }

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
  ],
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
