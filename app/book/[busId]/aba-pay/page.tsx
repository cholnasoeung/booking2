"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const ABA_CHECKOUT_URL = "https://checkout.payway.com.kh/api/payment-gateway/v1/payments/purchase";

export default function AbaPayPage() {
  const searchParams = useSearchParams();
  const pendingId = searchParams?.get("pending");
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingId) return;

    // Retrieve the ABA form data stored in sessionStorage by the passenger form
    const stored = sessionStorage.getItem(`aba_form_${pendingId}`);
    if (stored) {
      try {
        setFormData(JSON.parse(stored));
      } catch {
        setError("Payment session data corrupted. Please go back and try again.");
      }
    } else {
      setError("Payment session expired. Please go back and try again.");
    }
  }, [pendingId]);

  // Auto-submit the form once data is loaded
  useEffect(() => {
    if (formData && formRef.current) {
      formRef.current.submit();
    }
  }, [formData]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
          <p className="text-lg font-bold text-red-600 mb-2">Payment Error</p>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
        <p className="text-base font-semibold text-slate-800">Redirecting to ABA PayWay...</p>
        <p className="text-sm text-slate-500">Please wait while we redirect you to the secure payment page.</p>
      </div>

      {/* Hidden form that auto-submits to ABA PayWay */}
      {formData && (
        <form
          ref={formRef}
          method="POST"
          action={ABA_CHECKOUT_URL}
          className="hidden"
        >
          {Object.entries(formData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}
    </div>
  );
}
