"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, Bus, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/60">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
          <div className="px-8 py-8">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-200">
                <Bus className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Forgot password?</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Enter your email and we will send you a reset link.
                </p>
              </div>
            </div>

            {sent ? (
              <div className="text-center py-2">
                <CheckCircle className="mx-auto h-14 w-14 text-emerald-500 mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Check your inbox</h3>
                <p className="text-sm text-slate-500 mb-6">
                  If an account exists for{" "}
                  <span className="font-semibold text-slate-700">{email}</span>, a password reset
                  link has been sent. It expires in 1 hour.
                </p>
                <p className="text-xs text-slate-400 mb-6">
                  Did not receive it? Check your spam folder.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-sm font-medium text-slate-700">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-amber-400"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-400 text-white text-[10px] font-bold leading-none">!</span>
                    <p className="text-sm text-rose-700">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={pending}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-sm font-semibold text-white shadow-md shadow-amber-300/50 transition hover:from-amber-500 hover:to-orange-500 disabled:opacity-60"
                >
                  {pending ? "Sending..." : "Send reset link"}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  Remember it?{" "}
                  <Link href="/login" className="font-semibold text-amber-600 hover:text-amber-700 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}