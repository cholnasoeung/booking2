"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  callbackUrl?: string;
};

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        if (result?.error === "BANNED") {
          setError("Your account has been banned. Contact support for help.");
        } else if (result?.error === "SUSPENDED") {
          setError("Your account is temporarily suspended. Please try again later.");
        } else {
          setError("Invalid email or password.");
        }
        return;
      }

      router.push(callbackUrl || "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign you in right now.");
    } finally {
      setIsPending(false);
    }
  }

  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register";

  return (
    <div className="w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white px-6 py-8 shadow-2xl shadow-slate-200/40">
      <div className="relative space-y-4">
        <div className="flex flex-wrap gap-3 text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
          <span className="rounded-full border border-slate-200 px-3 py-1">Secure</span>
          <span className="rounded-full border border-slate-200 px-3 py-1">Fast</span>
        </div>
        <h2 className="font-heading text-3xl font-semibold text-slate-900">
          Welcome back
        </h2>
        <p className="text-sm text-slate-500">
          Sign in to unlock saved routes, seat preferences, and alerts in one pass.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="login-email" className="text-sm uppercase text-slate-500">
            Email
          </Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="login-password" className="text-sm uppercase text-slate-500">
            Password
          </Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-amber-400 px-5 text-sm font-semibold text-slate-950 shadow-md shadow-amber-400/50"
        >
          {isPending ? "Signing in..." : "Login"}
        </Button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 text-[0.65rem] text-slate-500">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-lg font-semibold text-slate-900">98%</p>
          <p className="uppercase tracking-[0.3em] text-[0.6rem] text-slate-500">
            on-time checks
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-lg font-semibold text-slate-900">24/7</p>
          <p className="uppercase tracking-[0.3em] text-[0.65rem] text-slate-500">
            live crew support
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        New here?{" "}
        <Link href={registerHref} className="font-medium text-indigo-600 underline decoration-indigo-300">
          Create an account
        </Link>
      </p>
    </div>
  );
}
