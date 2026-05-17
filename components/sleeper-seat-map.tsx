"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";

import {
  type SeatLayout,
  getSeatLayoutItems,
  isBookableItemKind,
  normalizeSeatCode,
} from "@/lib/seat-layout";
import { cn } from "@/lib/utils";

type SleeperSeatMapProps = {
  layout: SeatLayout;
  bookedSeats?: string[];
  selectedSeats?: string[];
  blockedSeats?: string[];
  disabled?: boolean;
  onSeatToggle?: (seatCode: string) => void;
  showLegend?: boolean;
};

type DeckTab = "lower" | "upper";
type SeatState = "available" | "selected" | "booked" | "blocked";

const legendItems = [
  { label: "Available", note: "Open to book", dot: "bg-emerald-500 ring-emerald-100", pill: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { label: "Selected", note: "Added to trip", dot: "bg-amber-500 ring-amber-100", pill: "border-amber-200 bg-amber-50 text-amber-900" },
  { label: "Booked", note: "Already taken", dot: "bg-slate-400 ring-slate-200", pill: "border-slate-200 bg-slate-100 text-slate-700" },
  { label: "Blocked", note: "Unavailable", dot: "bg-rose-400 ring-rose-100", pill: "border-rose-200 bg-rose-50 text-rose-700" },
];

export default function SleeperSeatMap({
  layout,
  bookedSeats = [],
  selectedSeats = [],
  blockedSeats = [],
  disabled = false,
  onSeatToggle,
  showLegend = false,
}: SleeperSeatMapProps) {
  const [activeDeck, setActiveDeck] = useState<DeckTab>("lower");

  const bookedSet = new Set(bookedSeats.map(normalizeSeatCode));
  const selectedSet = new Set(selectedSeats.map(normalizeSeatCode));
  const blockedSet = new Set(blockedSeats.map(normalizeSeatCode));

  const allBerths = getSeatLayoutItems(layout).filter(
    (item) => isBookableItemKind(item.kind) && item.seatCode
  );

  const prefix = activeDeck === "lower" ? "L" : "U";
  const deckBerths = allBerths.filter((item) => item.seatCode?.startsWith(prefix));

  // Group by row for layout rendering
  const rowMap: Record<number, typeof deckBerths> = {};
  deckBerths.forEach((item) => {
    if (!rowMap[item.row]) rowMap[item.row] = [];
    rowMap[item.row].push(item);
  });
  const sortedRows = Object.keys(rowMap).map(Number).sort((a, b) => a - b);

  function deckStats(deckPrefix: string) {
    const berths = allBerths.filter((s) => s.seatCode?.startsWith(deckPrefix));
    const total = berths.length;
    const unavailable = berths.filter((s) => {
      const code = normalizeSeatCode(s.seatCode!);
      return bookedSet.has(code) || blockedSet.has(code);
    }).length;
    return { total, available: total - unavailable };
  }

  const lower = deckStats("L");
  const upper = deckStats("U");

  return (
    <div className="space-y-4">
      {showLegend && (
        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/60 p-4 shadow-sm shadow-slate-200/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Berth guide
              </p>
              <p className="text-sm text-slate-600">
                Tap a berth to add it to your trip, or tap again to remove it.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                {selectedSeats.length} selected
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {legendItems.map((item) => (
              <div key={item.label} className={cn("inline-flex items-center gap-3 rounded-full border px-3 py-2 shadow-sm", item.pill)}>
                <span className={cn("size-3 rounded-full ring-4 shadow-sm", item.dot)} />
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs opacity-75">{item.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deck toggle */}
      <div className="grid grid-cols-2 gap-3">
        {(["lower", "upper"] as DeckTab[]).map((deck) => {
          const stats = deck === "lower" ? lower : upper;
          const isActive = activeDeck === deck;
          return (
            <button
              key={deck}
              type="button"
              onClick={() => setActiveDeck(deck)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                isActive
                  ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md shadow-amber-100/70"
                  : "border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/30"
              )}
            >
              <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", isActive ? "text-amber-700" : "text-slate-500")}>
                {deck} deck
              </p>
              <p className={cn("mt-0.5 text-sm font-medium", isActive ? "text-amber-900" : "text-slate-700")}>
                🛏️ {stats.available} of {stats.total} berths open
              </p>
            </button>
          );
        })}
      </div>

      {/* Berth grid */}
      <div className="overflow-x-auto">
        <div className="relative mx-auto min-w-fit overflow-hidden rounded-[40px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/30 p-5 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.55)] ring-1 ring-white/70 sm:p-7">
          <div className="pointer-events-none absolute left-10 top-5 h-20 w-40 rounded-full bg-amber-100/60 blur-3xl" />
          <div className="pointer-events-none absolute bottom-6 right-8 h-24 w-48 rounded-full bg-sky-100/50 blur-3xl" />

          {/* Front label + deck name */}
          <div className="relative mb-6 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-6 py-3 shadow-sm backdrop-blur">
              <span className="flex size-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <ArrowUp className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Front of bus
                </p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-2 shadow-md ${
              activeDeck === "lower"
                ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800"
                : "border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-800"
            }`}>
              <span className="text-base">{activeDeck === "lower" ? "🛏️" : "🌙"}</span>
              <p className="text-sm font-bold uppercase tracking-[0.18em]">
                {activeDeck === "lower" ? "Lower Deck" : "Upper Deck"}
              </p>
            </div>
          </div>

          {/* Column headers */}
          <div className="mb-3 flex items-center justify-center gap-3 px-2">
            <div className="flex w-[120px] justify-between px-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Window</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Aisle</span>
            </div>
            <div className="w-6" />
            <div className="w-[56px] text-center">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Window</span>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {sortedRows.map((rowKey) => {
              const items = rowMap[rowKey].sort((a, b) => a.col - b.col);
              const leftBerths = items.filter((item) => item.col <= 2);
              const rightBerths = items.filter((item) => item.col >= 4);

              return (
                <div key={rowKey} className="flex items-stretch justify-center gap-3">
                  {/* Left side: 2 berths */}
                  <div className="flex gap-2">
                    {leftBerths.map((item) => {
                      const code = normalizeSeatCode(item.seatCode!);
                      const state: SeatState = blockedSet.has(code)
                        ? "blocked"
                        : bookedSet.has(code)
                        ? "booked"
                        : selectedSet.has(code)
                        ? "selected"
                        : "available";
                      const isInteractive = !!onSeatToggle && state !== "booked" && state !== "blocked" && !disabled;
                      return (
                        <BerthButton
                          key={item.id}
                          label={item.label ?? code}
                          state={state}
                          isInteractive={isInteractive}
                          onClick={() => isInteractive && onSeatToggle?.(code)}
                        />
                      );
                    })}
                  </div>

                  {/* Aisle */}
                  <div className="flex w-6 items-center justify-center">
                    <div className="h-full w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
                  </div>

                  {/* Right side: 1 berth */}
                  <div className="flex gap-2">
                    {rightBerths.map((item) => {
                      const code = normalizeSeatCode(item.seatCode!);
                      const state: SeatState = blockedSet.has(code)
                        ? "blocked"
                        : bookedSet.has(code)
                        ? "booked"
                        : selectedSet.has(code)
                        ? "selected"
                        : "available";
                      const isInteractive = !!onSeatToggle && state !== "booked" && state !== "blocked" && !disabled;
                      return (
                        <BerthButton
                          key={item.id}
                          label={item.label ?? code}
                          state={state}
                          isInteractive={isInteractive}
                          onClick={() => isInteractive && onSeatToggle?.(code)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Back bumper */}
          <div className="mt-6 flex justify-center">
            <div className="h-2 w-12 rounded-full bg-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

const berthThemes: Record<SeatState, {
  shell: string;
  inner: string;
  foot: string;
  label: string;
  chip: string;
  status: string;
  statusText: string;
}> = {
  available: {
    shell: "border-emerald-200 bg-gradient-to-b from-white via-emerald-50/90 to-emerald-100/85 shadow-[0_8px_20px_-10px_rgba(16,185,129,0.5)]",
    inner: "border-white/90 bg-gradient-to-b from-white/90 to-emerald-50/75",
    foot: "border-emerald-200/80 bg-gradient-to-r from-emerald-200 to-emerald-100",
    label: "text-emerald-950",
    chip: "bg-emerald-500",
    status: "text-emerald-700",
    statusText: "Open",
  },
  selected: {
    shell: "border-amber-300 bg-gradient-to-b from-amber-50 via-white to-orange-100/80 shadow-[0_8px_20px_-10px_rgba(245,158,11,0.6)] ring-2 ring-amber-200/80",
    inner: "border-white/90 bg-gradient-to-b from-white/80 to-amber-50/80",
    foot: "border-amber-300/80 bg-gradient-to-r from-amber-200 to-orange-200",
    label: "text-amber-950",
    chip: "bg-amber-500",
    status: "text-amber-700",
    statusText: "Chosen",
  },
  booked: {
    shell: "border-slate-200 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/75 opacity-60",
    inner: "border-white/70 bg-gradient-to-b from-slate-50 to-slate-100/80",
    foot: "border-slate-300/80 bg-gradient-to-r from-slate-300 to-slate-200",
    label: "text-slate-500",
    chip: "bg-slate-400",
    status: "text-slate-400",
    statusText: "Taken",
  },
  blocked: {
    shell: "border-rose-200 bg-gradient-to-b from-rose-50 via-white to-rose-100/80 opacity-70",
    inner: "border-white/80 bg-gradient-to-b from-white/85 to-rose-50/80",
    foot: "border-rose-200/80 bg-gradient-to-r from-rose-200 to-rose-100",
    label: "text-rose-800",
    chip: "bg-rose-400",
    status: "text-rose-600",
    statusText: "Blocked",
  },
};

function BerthButton({
  label,
  state,
  isInteractive,
  onClick,
}: {
  label: string;
  state: SeatState;
  isInteractive: boolean;
  onClick: () => void;
}) {
  const theme = berthThemes[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isInteractive}
      aria-label={`${state === "selected" ? "Deselect" : "Select"} berth ${label}`}
      aria-pressed={state === "selected"}
      className={cn(
        "relative flex h-20 w-14 flex-col overflow-hidden rounded-2xl border p-1.5 text-left transition-all duration-200",
        theme.shell,
        isInteractive ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg" : "cursor-not-allowed"
      )}
    >
      {/* Mattress / pillow area */}
      <div className={cn("relative flex flex-1 flex-col rounded-xl border p-1.5", theme.inner)}>
        <span className={cn("absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-white/70", theme.chip)} />
        <span className={cn("block text-xs font-semibold leading-tight tracking-tight", theme.label)}>
          {label}
        </span>
        <span className={cn("mt-auto block text-[9px] font-semibold uppercase tracking-[0.18em]", theme.status)}>
          {theme.statusText}
        </span>
      </div>
      {/* Foot bar */}
      <div className={cn("mt-1 h-3 rounded-lg border", theme.foot)}>
        <div className="mx-auto mt-0.5 h-1 w-6 rounded-full bg-white/60" />
      </div>
    </button>
  );
}
