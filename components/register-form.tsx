"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterFormProps = {
  callbackUrl?: string;
};

export default function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "Unable to create your account.");
        return;
      }

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        router.push(
          callbackUrl
            ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : "/login"
        );
        return;
      }

      router.push(callbackUrl || "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to create your account right now.");
    } finally {
      setIsPending(false);
    }
  }

  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  return (
    <div className="relative isolate w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white/95 px-6 py-8 shadow-2xl text-slate-900">
      <div className="pointer-events-none absolute -top-10 right-8 h-32 w-32 rounded-full bg-amber-400/30 blur-[70px]" />
      <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-slate-900/10 blur-[60px]" />

      <div className="relative space-y-3">
        <div className="flex flex-wrap gap-3 text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
          <span className="rounded-full border border-slate-200 px-3 py-1">Creative</span>
          <span className="rounded-full border border-slate-200 px-3 py-1">Locked</span>
        </div>
        <h2 className="font-heading text-3xl font-semibold text-slate-900">
          Create your account
        </h2>
        <p className="text-sm text-slate-600">
          Save passengers, manage upcoming trips, and jump straight into seat maps.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative mt-6 space-y-4">
        <div className="space-y-1">
          <Label
            htmlFor="register-name"
            className="text-sm uppercase tracking-[0.3em] text-slate-500"
          >
            Full name
          </Label>
          <Input
            id="register-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            required
            className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 placeholder:text-slate-400 shadow-inner"
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="register-email"
            className="text-sm uppercase tracking-[0.3em] text-slate-500"
          >
            Email
          </Label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 placeholder:text-slate-400 shadow-inner"
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="register-password"
            className="text-sm uppercase tracking-[0.3em] text-slate-500"
          >
            Password
          </Label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            required
            className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 placeholder:text-slate-400 shadow-inner"
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="register-confirm-password"
            className="text-sm uppercase tracking-[0.3em] text-slate-500"
          >
            Confirm password
          </Label>
          <Input
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            required
            className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 placeholder:text-slate-400 shadow-inner"
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
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/40"
        >
          {isPending ? "Creating account..." : "Register"}
        </Button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 text-[0.65rem] text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950/5 to-slate-900/10 px-3 py-2">
          <p className="text-lg font-semibold text-slate-900">3 min</p>
          <p className="uppercase tracking-[0.3em] text-[0.65rem] text-slate-500">
            average signup
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/80 to-amber-200/60 px-3 py-2">
          <p className="text-lg font-semibold text-amber-700">2x</p>
          <p className="uppercase tracking-[0.3em] text-[0.65rem] text-amber-600">
            faster bookings
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-indigo-600 underline decoration-indigo-300">
          Login
        </Link>
      </p>
    </div>
  );
}
