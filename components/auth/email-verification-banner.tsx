"use client";

import { useEffect, useState } from "react";
import { Mail, X, RefreshCw, CheckCircle } from "lucide-react";

export default function EmailVerificationBanner() {
  const [status, setStatus] = useState<"loading" | "unverified" | "verified" | "hidden">("loading");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/auth/verify-email")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.isEmailVerified ? "verified" : "unverified");
      })
      .catch(() => setStatus("hidden"));
  }, []);

  async function resend() {
    setSending(true);
    try {
      await fetch("/api/auth/verify-email", { method: "POST" });
      setSent(true);
    } catch {
      // silently ignore
    } finally {
      setSending(false);
    }
  }

  if (status !== "unverified") return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Mail className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Please verify your email address</p>
          {sent ? (
            <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              Verification email sent — check your inbox and spam folder.
            </p>
          ) : (
            <p className="text-xs text-amber-700 mt-0.5">
              You cannot book trips until your email is verified.{" "}
              <button
                onClick={resend}
                disabled={sending}
                className="font-semibold underline hover:text-amber-900 disabled:opacity-60 inline-flex items-center gap-1"
              >
                {sending && <RefreshCw className="h-3 w-3 animate-spin" />}
                {sending ? "Sending..." : "Resend verification email"}
              </button>
            </p>
          )}
        </div>
        <button
          onClick={() => setStatus("hidden")}
          className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}