"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Sparkles, X } from "lucide-react";

const STORAGE_KEY   = "discountPopupLastClosedAt";
const COOLDOWN_MS   = 1000 * 60 * 60 * 24; // 24 h
const SHOW_DELAY_MS = 1500;
const OFFER = {
  code:     "FLASH15",
  headline: "15% off your next ride",
  body:     "Flash deal — book any departure today and save 15%. Limited seats.",
  ctaHref:  "/search?promo=FLASH15",
};

function useCountdown(totalSeconds: number, running: boolean) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    setRemaining(totalSeconds);
    ref.current = setInterval(() => {
      setRemaining((s) => (s <= 1 ? (clearInterval(ref.current!), 0) : s - 1));
    }, 1000);
    return () => clearInterval(ref.current!);
  }, [running, totalSeconds]);

  const h  = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const m  = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const s  = String(remaining % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function DiscountPopup() {
  const [mounted,  setMounted]  = useState(false);
  const [isOpen,   setIsOpen]   = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const countdown = useCountdown(3600, isOpen);

  /* gate: only show once per 24 h */
  useEffect(() => {
    setMounted(true);
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (isNaN(last) || Date.now() - last > COOLDOWN_MS) {
      const t = setTimeout(() => {
        setIsOpen(true);
        setTimeout(() => setVisible(true), 20); // trigger CSS transition
      }, SHOW_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setIsOpen(false), 300);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(OFFER.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  if (!mounted || !isOpen) return null;

  return (
    <div
      className={[
        "pointer-events-auto fixed bottom-6 right-6 z-50 w-80 select-none",
        "transition-all duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      ].join(" ")}
    >
      {/* Outer glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-purple-600/30 blur-xl" />

      {/* Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 shadow-2xl shadow-indigo-900/60">

        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-400/15" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-indigo-400/15" />

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-100">
            <Sparkles className="h-3 w-3 text-yellow-300" />
            Flash deal
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-indigo-200 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-3 pb-2">
          <p className="text-2xl font-extrabold leading-tight text-white">{OFFER.headline}</p>
          <p className="mt-1.5 text-sm text-indigo-200">{OFFER.body}</p>
        </div>

        {/* Countdown */}
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
            Expires in
          </span>
          <span className="ml-auto font-mono text-base font-bold tabular-nums text-white">
            {countdown}
          </span>
        </div>

        {/* Code row */}
        <div className="mx-5 mb-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
            <span className="flex-1 font-mono text-sm font-bold tracking-[0.25em] text-white">
              {OFFER.code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[10px] font-semibold text-indigo-100 hover:bg-white/25 transition-colors"
            >
              {copied
                ? <><Check className="h-3 w-3 text-emerald-300" /> Copied</>
                : <><Copy className="h-3 w-3" /> Copy</>
              }
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-5">
          <Link
            href={OFFER.ctaHref}
            onClick={handleClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-indigo-700 shadow-lg shadow-black/20 hover:bg-indigo-50 transition-colors"
          >
            Book now →
          </Link>
        </div>
      </div>
    </div>
  );
}
