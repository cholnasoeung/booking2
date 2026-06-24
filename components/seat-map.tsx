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
  getSeatLayoutItems,
  isBookableItemKind,
  normalizeSeatCode,
} from "@/lib/seat-layout";
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

type SeatTheme = {
  shellClassName: string;
  innerClassName: string;
  baseClassName: string;
  labelClassName: string;
  chipClassName: string;
  captionClassName: string;
  accentClassName: string;
  glowClassName: string;
  statusLabel: string;
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
          <SleeperSeat label={seatLabel} state={seatState} compact={compact} />
        ) : (
          <UprightSeat label={seatLabel} state={seatState} compact={compact} />
        )}
      </button>
    </div>
  );
});

function UprightSeat({
  label,
  state,
  compact,
}: {
  label: string;
  state: SeatState;
  compact: boolean;
}) {
  const theme = getSeatTheme(state);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border p-1.5 transition-all duration-200",
        theme.shellClassName,
        theme.glowClassName
      )}
    >
      <SeatPatternOverlay state={state} />
      <div className="pointer-events-none absolute inset-x-4 top-2 h-10 rounded-full bg-white/60 blur-xl" />

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col items-center justify-center rounded-[20px] border px-2 pb-2 pt-3 text-center",
          theme.innerClassName
        )}
      >
        <div
          className={cn(
            "absolute left-1/2 top-2 h-2.5 w-10 -translate-x-1/2 rounded-full bg-white/80 shadow-sm",
            compact ? "w-8" : "w-10"
          )}
        />
        <span
          className={cn(
            "absolute right-2.5 top-2.5 size-2.5 rounded-full ring-4 ring-white/60",
            theme.chipClassName
          )}
        />
        <span
          className={cn(
            "relative z-10 font-semibold tracking-tight",
            compact ? "text-xs" : "text-sm",
            theme.labelClassName
          )}
        >
          {label}
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-2 text-[10px] font-semibold uppercase tracking-[0.24em]",
              theme.captionClassName
            )}
          >
            {theme.statusLabel}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "relative mt-1.5 min-h-[18px] rounded-[14px] border",
          compact ? "h-[22%]" : "h-[24%]",
          theme.baseClassName
        )}
      >
        <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/60" />
        <div
          className={cn(
            "absolute bottom-1 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full",
            theme.accentClassName
          )}
        />
      </div>
    </div>
  );
}

function SleeperSeat({
  label,
  state,
  compact,
}: {
  label: string;
  state: SeatState;
  compact: boolean;
}) {
  const theme = getSeatTheme(state);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border p-2 transition-all duration-200",
        theme.shellClassName,
        theme.glowClassName
      )}
    >
      <SeatPatternOverlay state={state} />
      <div className="pointer-events-none absolute inset-x-4 top-3 h-10 rounded-full bg-white/55 blur-xl" />

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col items-center justify-center rounded-[18px] border px-2 py-3 text-center",
          theme.innerClassName
        )}
      >
        <span
          className={cn(
            "absolute right-2.5 top-2.5 size-2.5 rounded-full ring-4 ring-white/60",
            theme.chipClassName
          )}
        />
        <span
          className={cn(
            "relative z-10 font-semibold tracking-tight",
            compact ? "text-sm" : "text-base",
            theme.labelClassName
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "mt-2 text-[10px] font-semibold uppercase tracking-[0.24em]",
            theme.captionClassName
          )}
        >
          {theme.statusLabel}
        </span>
      </div>

      <div
        className={cn(
          "relative mt-2 flex h-4 items-center justify-center rounded-full border",
          theme.baseClassName
        )}
      >
        <div className="h-1.5 w-10 rounded-full bg-white/65" />
      </div>
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

function SeatPatternOverlay({ state }: { state: SeatState }) {
  const patternStyle = getSeatPatternStyle(state);

  if (!patternStyle) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-60"
      style={patternStyle}
    />
  );
}

function getSeatTheme(state: SeatState): SeatTheme {
  switch (state) {
    case "selected":
      return {
        shellClassName:
          "border-amber-300 bg-gradient-to-b from-amber-50 via-white to-orange-100/80 ring-2 ring-amber-200/80",
        innerClassName:
          "border-white/90 bg-gradient-to-b from-white/80 to-amber-50/80",
        baseClassName:
          "border-amber-300/80 bg-gradient-to-r from-amber-200 to-orange-200",
        labelClassName: "text-amber-950",
        chipClassName: "bg-amber-500",
        captionClassName: "text-amber-700",
        accentClassName: "bg-amber-500/70",
        glowClassName:
          "shadow-[0_18px_40px_-24px_rgba(245,158,11,0.85)]",
        statusLabel: "Chosen",
      };
    case "booked":
      return {
        shellClassName:
          "border-slate-200 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/75",
        innerClassName:
          "border-white/70 bg-gradient-to-b from-slate-50 to-slate-100/80",
        baseClassName:
          "border-slate-300/80 bg-gradient-to-r from-slate-300 to-slate-200",
        labelClassName: "text-slate-600",
        chipClassName: "bg-slate-400",
        captionClassName: "text-slate-500",
        accentClassName: "bg-slate-400/70",
        glowClassName:
          "shadow-[0_16px_32px_-26px_rgba(148,163,184,0.9)]",
        statusLabel: "Taken",
      };
    case "blocked":
      return {
        shellClassName:
          "border-rose-200 bg-gradient-to-b from-rose-50 via-white to-rose-100/80",
        innerClassName:
          "border-white/80 bg-gradient-to-b from-white/85 to-rose-50/80",
        baseClassName:
          "border-rose-200/80 bg-gradient-to-r from-rose-200 to-rose-100",
        labelClassName: "text-rose-800",
        chipClassName: "bg-rose-400",
        captionClassName: "text-rose-700",
        accentClassName: "bg-rose-400/65",
        glowClassName:
          "shadow-[0_16px_32px_-26px_rgba(244,63,94,0.6)]",
        statusLabel: "Blocked",
      };
    case "available":
    default:
      return {
        shellClassName:
          "border-emerald-200 bg-gradient-to-b from-white via-emerald-50/90 to-emerald-100/85",
        innerClassName:
          "border-white/90 bg-gradient-to-b from-white/90 to-emerald-50/75",
        baseClassName:
          "border-emerald-200/80 bg-gradient-to-r from-emerald-200 to-emerald-100",
        labelClassName: "text-emerald-950",
        chipClassName: "bg-emerald-500",
        captionClassName: "text-emerald-700",
        accentClassName: "bg-emerald-500/70",
        glowClassName:
          "shadow-[0_18px_40px_-24px_rgba(16,185,129,0.7)]",
        statusLabel: "Tap",
      };
  }
}

function getSeatPatternStyle(state: SeatState): CSSProperties | undefined {
  switch (state) {
    case "booked":
      return {
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(148,163,184,0.12) 0px, rgba(148,163,184,0.12) 8px, rgba(255,255,255,0) 8px, rgba(255,255,255,0) 16px)",
      };
    case "blocked":
      return {
        backgroundImage:
          "repeating-linear-gradient(135deg, rgba(244,63,94,0.12) 0px, rgba(244,63,94,0.12) 8px, rgba(255,255,255,0) 8px, rgba(255,255,255,0) 16px)",
      };
    default:
      return undefined;
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
