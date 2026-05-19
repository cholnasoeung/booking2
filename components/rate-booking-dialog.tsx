"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ASPECT_LABELS: Record<string, string> = {
  punctuality: "Punctuality",
  cleanliness: "Cleanliness",
  staffBehavior: "Staff",
  comfort: "Comfort",
};

type RateBookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  busId: string;
  route: string;
  onRated: () => void;
};

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-transform hover:scale-110"
          aria-label={`${star} star`}
        >
          <span
            className={
              star <= (hovered || value)
                ? "text-amber-400"
                : "text-slate-300"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

function AspectStars({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-base transition-transform hover:scale-110"
          >
            <span className={star <= value ? "text-amber-400" : "text-slate-200"}>★</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RateBookingDialog({
  open,
  onOpenChange,
  bookingId,
  busId,
  route,
  onRated,
}: RateBookingDialogProps) {
  const [rating, setRating] = useState(0);
  const [aspects, setAspects] = useState({
    punctuality: 5,
    cleanliness: 5,
    staffBehavior: 5,
    comfort: 5,
  });
  const [review, setReview] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (rating < 1) {
      setError("Please select an overall rating.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId,
          bookingId,
          rating,
          aspects,
          review: review.trim(),
          wouldRecommend,
        }),
      });

      const payload = (await res.json()) as { message?: string };

      if (!res.ok) {
        setError(payload.message || "Unable to submit review.");
        return;
      }

      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleClose() {
    if (done) onRated();
    onOpenChange(false);
    setRating(0);
    setAspects({ punctuality: 5, cleanliness: 5, staffBehavior: 5, comfort: 5 });
    setReview("");
    setError("");
    setDone(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>Review submitted</DialogTitle>
              <DialogDescription>
                Thank you! Your review for <strong>{route}</strong> will be
                visible once approved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton={false}>
              <Button onClick={handleClose} className="rounded-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rate your trip</DialogTitle>
              <DialogDescription>
                How was your journey on <strong>{route}</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Overall rating */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Overall rating
                </p>
                <StarRow value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
                  </p>
                )}
              </div>

              {/* Aspect ratings */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Rate by aspect
                </p>
                {Object.entries(ASPECT_LABELS).map(([key, label]) => (
                  <AspectStars
                    key={key}
                    label={label}
                    value={aspects[key as keyof typeof aspects]}
                    onChange={(v) =>
                      setAspects((prev) => ({ ...prev, [key]: v }))
                    }
                  />
                ))}
              </div>

              {/* Review text */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Write a review (optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience…"
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {review.length}/1000
                </p>
              </div>

              {/* Would recommend */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <input
                  type="checkbox"
                  checked={wouldRecommend}
                  onChange={(e) => setWouldRecommend(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  I would recommend this bus to others
                </span>
              </label>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter showCloseButton={false}>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleClose}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                className="rounded-full"
                onClick={handleSubmit}
                disabled={pending || rating < 1}
              >
                {pending ? "Submitting…" : "Submit review"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
