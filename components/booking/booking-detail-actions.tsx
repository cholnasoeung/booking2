"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Download, Star, CheckCircle2, X, XCircle, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  bookingId: string;
  busId: string;
  isConfirmed: boolean;
  canRate: boolean;
  isCancellable: boolean;
  finalPrice: number;
  departureAt: string; // ISO datetime of departure
};

const ASPECTS = [
  { key: "punctuality",    label: "Punctuality" },
  { key: "cleanliness",    label: "Cleanliness" },
  { key: "staffBehavior",  label: "Staff Behaviour" },
  { key: "comfort",        label: "Comfort" },
] as const;

type AspectKey = typeof ASPECTS[number]["key"];

function refundPercent(departureAt: string): number {
  const hours = (new Date(departureAt).getTime() - Date.now()) / 3_600_000;
  if (hours > 48) return 100;
  if (hours > 24) return 75;
  if (hours > 4)  return 50;
  return 0;
}

function fmt(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export default function BookingDetailActions({
  bookingId, busId, isConfirmed, canRate, isCancellable, finalPrice, departureAt,
}: Props) {
  const router = useRouter();

  /* ── review state ── */
  const [reviewOpen,  setReviewOpen]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [rating,      setRating]      = useState(0);
  const [hovered,     setHovered]     = useState(0);
  const [review,      setReview]      = useState("");
  const [recommend,   setRecommend]   = useState(true);
  const [aspects,     setAspects]     = useState<Record<AspectKey, number>>({
    punctuality: 5, cleanliness: 5, staffBehavior: 5, comfort: 5,
  });
  const [reviewErr,   setReviewErr]   = useState("");
  const [isPending,   startTransition] = useTransition();

  /* ── cancel state ── */
  const [cancelOpen,    setCancelOpen]    = useState(false);
  const [cancelReason,  setCancelReason]  = useState("");
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelErr,     setCancelErr]     = useState("");
  const [cancelDone,    setCancelDone]    = useState<{ refundAmount: number; refundStatus: string } | null>(null);

  const pct    = refundPercent(departureAt);
  const refund = (finalPrice * pct) / 100;

  const handleReviewSubmit = () => {
    if (rating < 1) { setReviewErr("Please select a star rating."); return; }
    setReviewErr("");
    startTransition(async () => {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId,
          bookingId,
          rating,
          review: review.trim() || undefined,
          aspects,
          wouldRecommend: recommend,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const d = await res.json();
        setReviewErr(d.message ?? "Failed to submit review.");
      }
    });
  };

  async function handleCancel() {
    setCancelling(true);
    setCancelErr("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setCancelErr(data.message ?? "Cancellation failed."); return; }
      setCancelDone({ refundAmount: data.refundAmount ?? 0, refundStatus: data.refundStatus ?? "none" });
    } catch {
      setCancelErr("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {isConfirmed && (
          <a
            href={`/api/bookings/${bookingId}/ticket`}
            download
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 transition"
          >
            <Download className="h-4 w-4" />
            Download Ticket (PDF)
          </a>
        )}
        {canRate && (
          <Button
            onClick={() => { setSubmitted(false); setRating(0); setReview(""); setReviewErr(""); setReviewOpen(true); }}
            className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200 hover:opacity-90 px-5 py-2.5 h-auto text-sm font-semibold"
          >
            <Star className="h-4 w-4 mr-2" />
            Rate this Trip
          </Button>
        )}
        {isCancellable && (
          <Button
            variant="outline"
            onClick={() => { setCancelDone(null); setCancelErr(""); setCancelReason(""); setCancelOpen(true); }}
            className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-5 py-2.5 h-auto text-sm font-semibold"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Booking
          </Button>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* ── Review Dialog ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" /> Rate Your Trip
            </DialogTitle>
            <DialogDescription>
              Share your experience to help other travellers.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-base font-semibold text-slate-900">Review Submitted!</p>
              <p className="text-sm text-slate-500">Thanks for your feedback. It will appear after review.</p>
              <Button onClick={() => setReviewOpen(false)} className="mt-2 rounded-full px-6">Done</Button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Overall star rating */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Overall Rating <span className="text-red-500">*</span></Label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          s <= (hovered || rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"
                        )}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-2 self-center text-sm font-semibold text-amber-600">
                      {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Aspect ratings */}
              <div className="grid grid-cols-2 gap-3">
                {ASPECTS.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">{label}</Label>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAspects(p => ({ ...p, [key]: s }))}
                          className="p-0.5"
                        >
                          <Star className={cn("h-4 w-4 transition-colors", s <= aspects[key] ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Written review */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Your Review <span className="text-slate-400 font-normal">(optional)</span></Label>
                <textarea
                  value={review}
                  onChange={e => setReview(e.target.value)}
                  placeholder="Tell us about your experience…"
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                />
                <p className="text-right text-xs text-slate-400">{review.length}/1000</p>
              </div>

              {/* Would recommend */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRecommend(p => !p)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    recommend
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  )}
                >
                  {recommend ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4" />}
                  {recommend ? "Would recommend" : "Would not recommend"}
                </button>
              </div>

              {reviewErr && (
                <p className="text-sm text-red-500">{reviewErr}</p>
              )}
            </div>
          )}

          {!submitted && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewOpen(false)} className="rounded-full">Cancel</Button>
              <Button
                onClick={handleReviewSubmit}
                disabled={isPending || rating < 1}
                className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90"
              >
                {isPending ? "Submitting…" : "Submit Review"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={(o) => { if (!o && cancelDone) { router.push("/dashboard"); } setCancelOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Cancel Booking
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your booking will be cancelled immediately.
            </DialogDescription>
          </DialogHeader>

          {cancelDone ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="text-base font-semibold text-slate-900">Booking Cancelled</p>
              {cancelDone.refundAmount > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-center">
                  <p className="text-sm text-slate-600">Refund amount</p>
                  <p className="text-2xl font-bold text-emerald-600">{fmt(cancelDone.refundAmount)}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">Status: {cancelDone.refundStatus}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No refund applicable based on the cancellation policy.</p>
              )}
              <Button onClick={() => router.push("/dashboard")} className="mt-2 rounded-full px-6">
                Return to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Refund policy */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-semibold text-amber-800">Refund Policy</p>
                </div>
                {[
                  { label: "More than 48 hours before", pct: 100 },
                  { label: "24 – 48 hours before",      pct: 75  },
                  { label: "4 – 24 hours before",       pct: 50  },
                  { label: "Less than 4 hours before",  pct: 0   },
                ].map(({ label, pct: p }) => (
                  <div key={p} className={cn(
                    "flex items-center justify-between text-xs rounded-lg px-3 py-1.5",
                    p === pct ? "bg-amber-200/60 font-semibold text-amber-900" : "text-slate-600"
                  )}>
                    <span>{label}</span>
                    <span className={cn("font-bold", p > 0 ? "text-emerald-700" : "text-red-500")}>
                      {p}% refund
                    </span>
                  </div>
                ))}
                <div className="border-t border-amber-200 mt-2 pt-2 flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span>Estimated refund</span>
                  <span className={cn(refund > 0 ? "text-emerald-700" : "text-red-500")}>
                    {fmt(refund)}
                  </span>
                </div>
              </div>

              {/* Optional reason */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">
                  Reason <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us why you're cancelling…"
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-300/50"
                />
              </div>

              {cancelErr && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" /> {cancelErr}
                </p>
              )}
            </div>
          )}

          {!cancelDone && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)} className="rounded-full" disabled={cancelling}>
                Keep Booking
              </Button>
              <Button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-full bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelling ? "Cancelling…" : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
