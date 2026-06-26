"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get("session_id");

  const [status, setStatus] = useState<"polling" | "success" | "failed">("polling");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus("failed");
      return;
    }

    // Poll until the Stripe webhook creates the booking (usually < 3 seconds)
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status?session_id=${sessionId}`);
        const data = await res.json();

        if (data.status === "paid" && data.bookingId) {
          setStatus("success");
          // Give a moment for the success animation, then redirect
          setTimeout(() => {
            router.replace(`/booking/confirmation/${data.bookingId}`);
          }, 1500);
          return;
        }

        if (data.status === "failed") {
          setStatus("failed");
          return;
        }

        // Still pending — retry up to 20 times (10 seconds)
        setAttempts((a) => {
          if (a >= 20) {
            setStatus("failed");
            return a;
          }
          setTimeout(poll, 500);
          return a + 1;
        });
      } catch {
        setAttempts((a) => {
          if (a >= 20) { setStatus("failed"); return a; }
          setTimeout(poll, 500);
          return a + 1;
        });
      }
    };

    poll();
  }, [sessionId, router]);

  if (status === "polling") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50">
        <div className="max-w-sm text-center space-y-5 p-8">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-indigo-100">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Confirming your payment…</h1>
          <p className="text-sm text-slate-500">
            Your payment was received. We are finalizing your booking — this takes just a moment.
          </p>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-sm text-center space-y-4 p-8">
          <CheckCircle2 className="h-20 w-20 mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h1>
          <p className="text-sm text-slate-500">Redirecting to your ticket…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="max-w-sm text-center space-y-5 p-8">
        <XCircle className="h-20 w-20 mx-auto text-red-400" />
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-500">
          Your payment was processed but we could not confirm your booking.
          Please contact support with your payment reference.
        </p>
        <a
          href="/support"
          className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
