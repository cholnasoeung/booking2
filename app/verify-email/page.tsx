"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, Bus } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please use the link from your email.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message === "Email verified successfully") {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. The link may have expired.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/60">
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
      <div className="px-8 py-10 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-200">
            <Bus className="h-6 w-6 text-amber-500" />
          </div>
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Verifying your email...</h2>
            <p className="text-sm text-slate-500 mt-2">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-14 w-14 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Email verified!</h2>
            <p className="text-sm text-slate-500 mb-6">
              Your email address has been confirmed. You can now book trips.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-8 text-sm font-semibold text-white shadow-md shadow-amber-300/50 transition hover:from-amber-500 hover:to-orange-500"
            >
              Go to Dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-rose-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification failed</h2>
            <p className="text-sm text-slate-500 mb-6">{message}</p>
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-8 text-sm font-semibold text-white shadow-md shadow-amber-300/50 transition hover:from-amber-500 hover:to-orange-500"
              >
                Go to Dashboard
              </Link>
              <p className="text-xs text-slate-500">
                From your dashboard you can request a new verification email.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/60 px-8 py-10 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-400" />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}