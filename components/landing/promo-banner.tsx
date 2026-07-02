"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Tag, Clock, Ticket } from "lucide-react";

interface ActivePromo {
  _id: string;
  code: string;
  type: "percentage" | "fixed" | "free_ticket";
  value: number;
  title: string | null;
  imageUrl: string | null;
  validUntil: string;
  minBookingAmount?: number;
}

function discountLabel(promo: ActivePromo) {
  if (promo.type === "percentage") return `${promo.value}% OFF`;
  if (promo.type === "fixed")      return `$${promo.value} OFF`;
  return "FREE TICKET";
}

function daysLeft(until: string) {
  const diff = Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000);
  if (diff <= 0)  return "Expires today";
  if (diff === 1) return "Expires tomorrow";
  return `Expires in ${diff} days`;
}

export default function PromoBanner() {
  const [promo, setPromo]           = useState<ActivePromo | null>(null);
  const [dismissed, setDismissed]   = useState(true); // hidden until we confirm a live promo
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    fetch("/api/promotions")
      .then((r) => r.json())
      .then((d) => {
        const list: ActivePromo[] = d.promotions ?? [];
        if (!list.length) return;
        const best = list[0];
        // Per-code dismissal key so new promos always appear
        if (localStorage.getItem(`promo_dismissed_${best.code}`)) return;
        setPromo(best);
        setDismissed(false);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    if (promo) localStorage.setItem(`promo_dismissed_${promo.code}`, "1");
    setDismissed(true);
  };

  const copy = () => {
    if (!promo) return;
    navigator.clipboard.writeText(promo.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (dismissed || !promo) return null;

  /* ── WITH IMAGE: side-by-side card ────────────────────────────────────── */
  if (promo.imageUrl) {
    return (
      <div className="relative w-full bg-white border-b border-gray-200 shadow-md overflow-hidden">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row">

          {/* Left — image (full, no overlay) */}
          <div className="sm:w-[45%] shrink-0">
            <img
              src={promo.imageUrl}
              alt={promo.title ?? "Promotion"}
              className="w-full h-52 sm:h-full object-cover"
              style={{ minHeight: 200 }}
            />
          </div>

          {/* Right — info on gradient */}
          <div className="flex flex-1 flex-col justify-center gap-3 bg-gradient-to-br from-red-600 to-orange-500 px-6 py-6 sm:py-8 text-white">

            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Ticket className="w-3.5 h-3.5" /> Limited Time Offer
            </span>

            {promo.title && (
              <p className="text-lg sm:text-xl font-bold leading-tight">{promo.title}</p>
            )}

            <p className="text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-sm">
              {discountLabel(promo)}
            </p>

            {!!promo.minBookingAmount && promo.minBookingAmount > 0 && (
              <p className="text-white/75 text-sm -mt-1">Min. booking ${promo.minBookingAmount}</p>
            )}

            {/* Code + copy */}
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <div className="flex items-center gap-2 rounded-lg bg-white/15 border border-white/30 px-4 py-2">
                <Tag className="w-4 h-4 text-white/80 shrink-0" />
                <span className="font-mono font-bold text-white tracking-widest text-base sm:text-lg">
                  {promo.code}
                </span>
              </div>
              <button
                onClick={copy}
                className="flex items-center gap-2 rounded-lg bg-white text-slate-800 font-semibold text-sm px-4 py-2 hover:bg-gray-100 active:scale-95 transition"
              >
                {copied ? <><Check className="w-4 h-4 text-green-600" /> Copied!</>
                        : <><Copy className="w-4 h-4" /> Copy code</>}
              </button>
            </div>

            <p className="flex items-center gap-1.5 text-white/70 text-sm">
              <Clock className="w-3.5 h-3.5" /> {daysLeft(promo.validUntil)}
            </p>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/30 hover:bg-black/50 text-white p-1.5 transition"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  /* ── WITHOUT IMAGE: slim strip ─────────────────────────────────────────── */
  return (
    <div className="relative w-full bg-gradient-to-r from-red-600 to-orange-500 py-2.5 px-4">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <Ticket className="w-4 h-4 text-white/80 shrink-0" />
        {promo.title && <span className="text-white font-semibold text-sm">{promo.title} —</span>}
        <span className="text-white font-bold text-sm">{discountLabel(promo)}</span>
        <span className="text-white/80 text-sm">with code</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded px-2.5 py-0.5 font-mono font-bold text-white text-sm tracking-wider transition"
        >
          {promo.code}
          {copied ? <Check className="w-3 h-3 text-green-300" /> : <Copy className="w-3 h-3 opacity-70" />}
        </button>
        <span className="flex items-center gap-1 text-white/70 text-xs">
          <Clock className="w-3 h-3" /> {daysLeft(promo.validUntil)}
        </span>
      </div>
      <button onClick={dismiss} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
