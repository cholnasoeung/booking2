"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Star, CheckCircle2, X,
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
};

const ASPECTS = [
  { key: "punctuality",    label: "Punctuality" },
  { key: "cleanliness",    label: "Cleanliness" },
  { key: "staffBehavior",  label: "Staff Behaviour" },
  { key: "comfort",        label: "Comfort" },
] as const;

type AspectKey = typeof ASPECTS[number]["key"];

export default function BookingDetailActions({ bookingId, busId, isConfirmed, canRate }: Props) {
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
    </>
  );
}
