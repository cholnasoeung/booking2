"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISCOUNT_POPUP_STORAGE_KEY = "discountPopupLastClosedAt";
const DISPLAY_COOLDOWN_MS = 1000 * 60 * 60 * 24; // once per 24 hours

const OFFER = {
  code: "FLASH15",
  headline: "Exclusive 15% off",
  body: "Book within the next hour and unlock 15% off selected departures. Limited seats, unlimited joy.",
};

export default function DiscountPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const lastClosed = Number(localStorage.getItem(DISCOUNT_POPUP_STORAGE_KEY) ?? 0);
    const shouldShow =
      Number.isNaN(lastClosed) || Date.now() - lastClosed > DISPLAY_COOLDOWN_MS;

    if (!shouldShow) {
      return;
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISCOUNT_POPUP_STORAGE_KEY, Date.now().toString());
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed bottom-6 right-6 z-50 max-w-sm rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-[0_20px_60px_rgba(16,185,129,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
          <Sparkles className="size-4 text-emerald-600" />
          Limited time
        </div>
        <button
          type="button"
          aria-label="Dismiss discount"
          className="rounded-full p-1 text-slate-500 transition hover:text-slate-900"
          onClick={handleClose}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-2xl font-semibold text-slate-900">{OFFER.headline}</p>
        <p className="text-sm text-slate-600">{OFFER.body}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        <p className="rounded-full border border-slate-200 px-3 py-1 bg-white/80 text-emerald-600">
          {OFFER.code}
        </p>
        <Link href="/search?promo=FLASH15" onClick={handleClose}>
          <Button
            size="sm"
            className="h-9 rounded-full bg-gradient-to-r from-emerald-500 to-slate-900 px-4 text-xs font-semibold uppercase tracking-[0.2em]"
          >
            Use code
          </Button>
        </Link>
      </div>
    </div>
  );
}
