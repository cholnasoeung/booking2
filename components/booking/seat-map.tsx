"use client";

import {
  type CSSProperties,
  type ReactNode,
  memo,
} from "react";
import { ArrowUp } from "lucide-react";

import {
  type SeatLayout,
  type SeatLayoutItem,
  type SeatTier,
  getSeatLayoutItems,
  isBookableItemKind,
  normalizeSeatCode,
} from "@/lib/seat/seat-layout";

const TIER_BADGE: Record<SeatTier, { label: string; className: string }> = {
  standard: { label: "STD", className: "bg-slate-200/80 text-slate-600"  },
  business: { label: "BIZ", className: "bg-blue-100 text-blue-700"       },
  vip:      { label: "VIP", className: "bg-amber-100 text-amber-700"     },
};
import { cn } from "@/lib/utils";

type SeatMapProps = {
  layout: SeatLayout;
  bookedSeats?: string[];
  selectedSeats?: string[];
  blockedSeats?: string[];
  disabled?: boolean;
  onSeatToggle?: (seatCode: string) => void;
  allowBlockedToggle?: boolean;
  className?: string;
  showLegend?: boolean;
  compact?: boolean;
};

type SeatState = "available" | "selected" | "booked" | "blocked";

type LegendItem = {
  label: string;
  note: string;
  dotClassName: string;
  pillClassName: string;
};

type SeatColors = {
  bg: string;
  border: string;
  shadow: string;
  headrest: string;
  armrest: string;
  cushion: string;
  inner: string;
  label: string;
  sublabel: string;
  pillow: string;
  stitchLine: string;
};

const legendItems: LegendItem[] = [
  {
    label: "Available",
    note: "Open to book",
    dotClassName: "bg-emerald-500 ring-emerald-100",
    pillClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    label: "Selected",
    note: "Added to trip",
    dotClassName: "bg-amber-500 ring-amber-100",
    pillClassName: "border-amber-200 bg-amber-50 text-amber-900",
  },
  {
    label: "Booked",
    note: "Already taken",
    dotClassName: "bg-slate-400 ring-slate-200",
    pillClassName: "border-slate-200 bg-slate-100 text-slate-700",
  },
  {
    label: "Blocked",
    note: "Temporarily unavailable",
    dotClassName: "bg-rose-400 ring-rose-100",
    pillClassName: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

function SeatMap({
  layout,
  bookedSeats = [],
  selectedSeats = [],
  blockedSeats = [],
  disabled = false,
  onSeatToggle,
  allowBlockedToggle = false,
  className,
  showLegend = false,
  compact = false,
}: SeatMapProps) {
  const bookedSeatSet = new Set(bookedSeats.map(normalizeSeatCode));
  const selectedSeatSet = new Set(selectedSeats.map(normalizeSeatCode));
  const blockedSeatSet = new Set(blockedSeats.map(normalizeSeatCode));
  const items = getSeatLayoutItems(layout);
  const bookableSeatCodes = items
    .filter((item) => isBookableItemKind(item.kind) && item.seatCode)
    .map((item) => normalizeSeatCode(item.seatCode as string));
  const openSeatCount = bookableSeatCodes.filter(
    (seatCode) => !bookedSeatSet.has(seatCode) && !blockedSeatSet.has(seatCode)
  ).length;

  return (
    <div className={cn("space-y-4", className)}>
      {showLegend ? (
        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/60 p-4 shadow-sm shadow-slate-200/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Seat guide
              </p>
              <p className="text-sm text-slate-600">
                Tap an open seat to add it to your trip, or tap again to remove it.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <SeatStatePill
                label={`${selectedSeats.length} selected`}
                className="border-amber-200 bg-amber-50 text-amber-900"
              />
              <SeatStatePill
                label={`${openSeatCount} open`}
                className="border-emerald-200 bg-emerald-50 text-emerald-800"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {legendItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "inline-flex items-center gap-3 rounded-full border px-3 py-2 shadow-sm",
                  item.pillClassName
                )}
              >
                <span
                  className={cn(
                    "size-3 rounded-full ring-4 shadow-sm",
                    item.dotClassName
                  )}
                />
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs opacity-75">{item.note}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="relative mx-auto min-w-fit overflow-hidden rounded-[40px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50/30 p-5 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.55)] ring-1 ring-white/70 sm:p-7">
          <div className="pointer-events-none absolute left-10 top-5 h-20 w-40 rounded-full bg-amber-100/60 blur-3xl" />
          <div className="pointer-events-none absolute bottom-6 right-8 h-24 w-48 rounded-full bg-sky-100/50 blur-3xl" />
          <div className="pointer-events-none absolute inset-y-20 left-4 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          <div className="pointer-events-none absolute inset-y-20 right-4 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

          <div className="relative mb-6 flex items-center justify-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-6 py-3 shadow-sm backdrop-blur">
              <span className="flex size-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <ArrowUp className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Front of bus
                </p>
                <p className="text-xs text-slate-600">
                  Driver cabin and entry point
                </p>
              </div>
            </div>
          </div>

          <div
            className="relative grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${layout.grid.cols}, minmax(${compact ? "56px" : "72px"}, 1fr))`,
              gridTemplateRows: (() => {
                const deckLabelRows = new Set(
                  items.filter((i) => i.kind === "deck_label").map((i) => i.row)
                );
                const rowHeight = compact ? "86px" : "98px";
                return Array.from({ length: layout.grid.rows }, (_, i) =>
                  deckLabelRows.has(i + 1) ? "38px" : rowHeight
                ).join(" ");
              })(),
            }}
          >
            {items.map((item) => (
              <SeatMapCell
                key={item.id}
                item={item}
                bookedSeatSet={bookedSeatSet}
                selectedSeatSet={selectedSeatSet}
                blockedSeatSet={blockedSeatSet}
                disabled={disabled}
                compact={compact}
                onSeatToggle={onSeatToggle}
                allowBlockedToggle={allowBlockedToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type SeatMapCellProps = {
  item: SeatLayoutItem;
  bookedSeatSet: Set<string>;
  selectedSeatSet: Set<string>;
  blockedSeatSet: Set<string>;
  disabled: boolean;
  compact: boolean;
  onSeatToggle?: (seatCode: string) => void;
  allowBlockedToggle: boolean;
};

const SeatMapCell = memo(function SeatMapCell({
  item,
  bookedSeatSet,
  selectedSeatSet,
  blockedSeatSet,
  disabled,
  compact,
  onSeatToggle,
  allowBlockedToggle,
}: SeatMapCellProps) {
  const style: CSSProperties = {
    gridColumn: `${item.col} / span ${item.colSpan ?? 1}`,
    gridRow: `${item.row} / span ${item.rowSpan ?? 1}`,
  };

  if (!isBookableItemKind(item.kind) || !item.seatCode) {
    return (
      <div style={style}>
        <StaticLayoutItem item={item} compact={compact} />
      </div>
    );
  }

  const seatCode = normalizeSeatCode(item.seatCode);
  const seatLabel = item.label ?? seatCode;
  const seatState: SeatState = blockedSeatSet.has(seatCode)
    ? "blocked"
    : bookedSeatSet.has(seatCode)
      ? "booked"
      : selectedSeatSet.has(seatCode)
        ? "selected"
        : "available";
  const isBlocked = seatState === "blocked";
  const isInteractive =
    Boolean(onSeatToggle) &&
    seatState !== "booked" &&
    (!isBlocked || allowBlockedToggle) &&
    !disabled;

  return (
    <div style={style}>
      <button
        type="button"
        aria-label={getSeatAriaLabel(seatLabel, seatState, isInteractive)}
        aria-pressed={seatState === "selected"}
        disabled={!isInteractive}
        className={cn(
          "group h-full w-full rounded-[28px] text-left outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2",
          isInteractive ? "cursor-pointer hover:-translate-y-1" : "",
          disabled ? "cursor-not-allowed" : ""
        )}
        onClick={() => {
          if (isInteractive) {
            onSeatToggle?.(seatCode);
          }
        }}
      >
        {item.kind === "sleeper" ? (
          <SleeperSeat label={seatLabel} state={seatState} compact={compact} tier={item.tier} />
        ) : (
          <UprightSeat label={seatLabel} state={seatState} compact={compact} tier={item.tier} />
        )}
      </button>
    </div>
  );
});

function UprightSeat({
  label,
  state,
  compact,
  tier,
}: {
  label: string;
  state: SeatState;
  compact: boolean;
  tier?: SeatTier;
}) {
  const c = seatColors(state);
  const tierBadge = tier && tier !== "standard" ? TIER_BADGE[tier] : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center gap-0.5 transition-all duration-200">

      {/* ── HEADREST  (separate floating pill — narrower than body) ── */}
      <div
        className={cn(
          "flex-shrink-0 rounded-xl",
          compact ? "h-[12%] w-[52%]" : "h-[12%] w-[54%]",
          c.headrest
        )}
      >
        {/* padding seam */}
        <div className="mx-auto mt-1 h-px w-[40%] rounded-full bg-white/45" />
      </div>

      {/* ── MAIN BODY  (backrest + cushion share one rounded card) ── */}
      <div
        className={cn(
          "relative w-full flex-1 overflow-hidden rounded-xl border-2",
          c.bg, c.border, c.shadow
        )}
      >
        {/* Left armrest */}
        <div
          className={cn(
            "absolute left-0 top-0 w-[19%] rounded-bl-xl rounded-tl-xl",
            compact ? "h-[68%]" : "h-[70%]",
            c.armrest
          )}
        >
          {/* rest-pad nub */}
          <div className="absolute bottom-1.5 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-white/25" />
        </div>

        {/* Right armrest */}
        <div
          className={cn(
            "absolute right-0 top-0 w-[19%] rounded-br-xl rounded-tr-xl",
            compact ? "h-[68%]" : "h-[70%]",
            c.armrest
          )}
        >
          <div className="absolute bottom-1.5 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-white/25" />
        </div>

        {/* Backrest (between armrests, top section) */}
        <div
          className={cn(
            "absolute left-[21%] right-[21%] top-0 flex flex-col items-center justify-center",
            compact ? "h-[68%]" : "h-[70%]",
            c.inner
          )}
        >
          <div className={cn("mb-1 h-px w-[75%] rounded-full opacity-25", c.stitchLine)} />

          <span className={cn("font-bold tracking-tight", compact ? "text-[9px]" : "text-xs", c.label)}>
            {label}
          </span>

          {!compact && (
            <span className={cn("mt-px text-[9px] font-semibold uppercase tracking-[0.2em] opacity-65", c.sublabel)}>
              {state === "selected" ? "Chosen" : state === "booked" ? "Taken" : state === "blocked" ? "N/A" : "Open"}
            </span>
          )}

          {tierBadge && !compact && (
            <span className={cn("mt-1 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider", tierBadge.className)}>
              {tierBadge.label}
            </span>
          )}

          <div className={cn("mt-1 h-px w-[75%] rounded-full opacity-25", c.stitchLine)} />
        </div>

        {/* Seat cushion (bottom strip, full width) */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 rounded-b-xl",
            compact ? "h-[32%]" : "h-[30%]",
            c.cushion
          )}
        >
          <div className="mx-auto mt-1.5 h-px w-[45%] rounded-full bg-white/45" />
        </div>

        {/* Diagonal stripe overlay for unavailable */}
        {(state === "booked" || state === "blocked") && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.14]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 1.5px, transparent 1.5px, transparent 9px)",
            }}
          />
        )}

        {/* X mark for blocked */}
        {state === "blocked" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-[20%]">
            <svg
              viewBox="0 0 16 16"
              className={cn("text-rose-500/65", compact ? "size-4" : "size-5")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function SleeperSeat({
  label,
  state,
  compact,
  tier,
}: {
  label: string;
  state: SeatState;
  compact: boolean;
  tier?: SeatTier;
}) {
  const c = seatColors(state);
  const tierBadge = tier && tier !== "standard" ? TIER_BADGE[tier] : null;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border transition-all duration-200",
        c.bg, c.border, c.shadow
      )}
    >
      {/* Headboard */}
      <div className={cn("flex-shrink-0 rounded-t-[22px]", compact ? "h-3" : "h-3.5", c.headrest)}>
        <div className="mx-auto mt-1 h-0.5 w-[35%] rounded-full bg-white/30" />
      </div>

      {/* Pillow */}
      <div className="flex-shrink-0 px-2.5 pt-2">
        <div
          className={cn(
            "rounded-2xl border",
            compact ? "h-4" : "h-5",
            c.pillow
          )}
        >
          {/* Pillow centre seams */}
          <div className="flex h-full items-center justify-center gap-4">
            <div className={cn("h-[50%] w-px rounded-full opacity-25", c.stitchLine)} />
            <div className={cn("h-[50%] w-px rounded-full opacity-25", c.stitchLine)} />
          </div>
        </div>
      </div>

      {/* Mattress / sheet with quilting lines */}
      <div className={cn("mx-2 flex flex-1 flex-col justify-evenly rounded-xl py-1.5", c.inner)}>
        {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
          <div
            key={i}
            className={cn("h-px w-full rounded-full opacity-40", c.stitchLine)}
          />
        ))}
      </div>

      {/* Seat label + tier badge */}
      <div className="flex flex-shrink-0 flex-col items-center justify-center py-1">
        <span
          className={cn(
            "font-bold tracking-tight",
            compact ? "text-[9px]" : "text-xs",
            c.label
          )}
        >
          {label}
        </span>
        {tierBadge && (
          <span
            className={cn(
              "rounded-full px-1.5 text-[7px] font-bold uppercase tracking-wider",
              tierBadge.className
            )}
          >
            {tierBadge.label}
          </span>
        )}
      </div>

      {/* Footboard */}
      <div className={cn("flex-shrink-0 rounded-b-[22px]", compact ? "h-2.5" : "h-3", c.headrest)}>
        <div className="mx-auto mb-0.5 h-0.5 w-[35%] rounded-full bg-white/30" />
      </div>

      {/* Diagonal stripe overlay for unavailable */}
      {(state === "booked" || state === "blocked") && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[22px] opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 10px)",
          }}
        />
      )}

      {/* X mark for blocked */}
      {state === "blocked" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 16 16"
            className={cn("text-rose-500/70", compact ? "size-4" : "size-5")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </div>
      )}
    </div>
  );
}

function StaticLayoutItem({
  item,
  compact,
}: {
  item: SeatLayoutItem;
  compact: boolean;
}) {
  switch (item.kind) {
    case "deck_label":
      return (
        <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-violet-50 to-indigo-50 px-4">
          <div className="flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-indigo-200" />
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.26em] text-indigo-600">
              {item.label === "Upper Deck" ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-indigo-500" aria-hidden><path d="M8 3L14 10H2L8 3Z"/></svg>
              ) : (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-indigo-400" aria-hidden><path d="M8 13L14 6H2L8 13Z"/></svg>
              )}
              {item.label ?? "Deck"}
            </span>
            <div className="h-px flex-1 bg-indigo-200" />
          </div>
        </div>
      );
    case "aisle":
      return (
        <div className="relative h-full min-h-0 rounded-[22px] bg-gradient-to-b from-transparent via-white/60 to-transparent">
          <span className="absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-slate-200" />
          <span className="absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 border-l-2 border-dashed border-slate-300/70" />
        </div>
      );
    case "driver":
      return (
        <DecorativeBlock
          compact={compact}
          className="border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/70 text-sky-800 shadow-[0_16px_32px_-22px_rgba(14,165,233,0.75)]"
          eyebrow="Cabin"
          label={item.label ?? "Driver"}
        />
      );
    case "toilet":
      return (
        <DecorativeBlock
          compact={compact}
          className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-100/70 text-amber-900 shadow-[0_16px_32px_-22px_rgba(251,191,36,0.65)]"
          eyebrow="Utility"
          label={item.label ?? "WC"}
        />
      );
    case "empty":
      return (
        <div className="h-full min-h-0 rounded-[22px] border border-dashed border-slate-200 bg-white/50" />
      );
    default:
      return (
        <DecorativeBlock
          compact={compact}
          className="border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200/70 text-slate-700 shadow-[0_16px_32px_-24px_rgba(100,116,139,0.55)]"
          eyebrow="Zone"
          label={item.label ?? item.kind}
        />
      );
  }
}

function DecorativeBlock({
  compact,
  className,
  eyebrow,
  label,
}: {
  compact: boolean;
  className: string;
  eyebrow: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border px-3 py-3 text-center shadow-sm",
        compact ? "px-2 py-2" : "px-3 py-3",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-transparent to-white/15" />
      <div className="relative z-10">
        <p
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.28em] opacity-75",
            compact ? "text-[8px]" : "text-[9px]"
          )}
        >
          {eyebrow}
        </p>
        <p className={cn("mt-1 font-semibold tracking-tight", compact ? "text-xs" : "text-sm")}>
          {label}
        </p>
      </div>
    </div>
  );
}

function seatColors(state: SeatState): SeatColors {
  switch (state) {
    case "selected":
      return {
        bg: "bg-amber-50",
        border: "border-amber-300",
        shadow: "ring-2 ring-amber-200 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)]",
        headrest: "bg-gradient-to-b from-amber-500 to-amber-400",
        armrest: "bg-amber-300",
        cushion: "bg-gradient-to-b from-amber-200 to-amber-300",
        inner: "bg-gradient-to-b from-amber-50 to-white",
        label: "text-amber-900",
        sublabel: "text-amber-600",
        pillow: "bg-gradient-to-b from-amber-100 to-amber-200 border-amber-200",
        stitchLine: "bg-amber-300",
      };
    case "booked":
      return {
        bg: "bg-slate-100",
        border: "border-slate-200",
        shadow: "shadow-[0_4px_12px_-6px_rgba(148,163,184,0.5)]",
        headrest: "bg-gradient-to-b from-slate-400 to-slate-300",
        armrest: "bg-slate-300",
        cushion: "bg-gradient-to-b from-slate-200 to-slate-300",
        inner: "bg-gradient-to-b from-slate-50 to-slate-100",
        label: "text-slate-400",
        sublabel: "text-slate-400",
        pillow: "bg-gradient-to-b from-slate-100 to-slate-200 border-slate-200",
        stitchLine: "bg-slate-300",
      };
    case "blocked":
      return {
        bg: "bg-rose-50",
        border: "border-rose-200",
        shadow: "shadow-[0_4px_12px_-6px_rgba(244,63,94,0.35)]",
        headrest: "bg-gradient-to-b from-rose-500 to-rose-400",
        armrest: "bg-rose-300",
        cushion: "bg-gradient-to-b from-rose-200 to-rose-300",
        inner: "bg-gradient-to-b from-rose-50 to-white",
        label: "text-rose-700",
        sublabel: "text-rose-500",
        pillow: "bg-gradient-to-b from-rose-100 to-rose-200 border-rose-200",
        stitchLine: "bg-rose-300",
      };
    case "available":
    default:
      return {
        bg: "bg-white",
        border: "border-emerald-200",
        shadow: "shadow-[0_6px_20px_-8px_rgba(16,185,129,0.40)]",
        headrest: "bg-gradient-to-b from-emerald-500 to-emerald-400",
        armrest: "bg-emerald-300",
        cushion: "bg-gradient-to-b from-emerald-100 to-emerald-200",
        inner: "bg-gradient-to-b from-white to-emerald-50",
        label: "text-emerald-900",
        sublabel: "text-emerald-600",
        pillow: "bg-gradient-to-b from-emerald-50 to-emerald-100 border-emerald-200",
        stitchLine: "bg-emerald-200",
      };
  }
}

function getSeatAriaLabel(
  label: string,
  state: SeatState,
  isInteractive: boolean
) {
  if (state === "selected") {
    return `Deselect seat ${label}`;
  }

  if (state === "booked") {
    return `Seat ${label} is already booked`;
  }

  if (state === "blocked" && !isInteractive) {
    return `Seat ${label} is blocked`;
  }

  return `Select seat ${label}`;
}

export function SeatMapLegend({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2.5 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm",
        className
      )}
    >
      {legendItems.map((item) => (
        <div
          key={item.label}
          className={cn(
            "inline-flex items-center gap-3 rounded-full border px-3 py-2 shadow-sm",
            item.pillClassName
          )}
        >
          <span
            className={cn(
              "size-3 rounded-full ring-4 shadow-sm",
              item.dotClassName
            )}
          />
          <span className="text-sm font-semibold">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function SeatStatePill({
  label,
  className,
  icon,
}: {
  label: string;
  className: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm",
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default SeatMap;
