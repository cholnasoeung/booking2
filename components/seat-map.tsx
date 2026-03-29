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
  disabled?: boolean;
  onSeatToggle?: (seatCode: string) => void;
  className?: string;
  showLegend?: boolean;
  compact?: boolean;
};

type SeatState = "available" | "selected" | "booked";

const legendItems: Array<{ label: string; className: string }> = [
  {
    label: "Available",
    className: "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-md shadow-emerald-300/50",
  },
  {
    label: "Selected",
    className: "bg-gradient-to-br from-amber-300 to-amber-400 shadow-md shadow-amber-300/50",
  },
  {
    label: "Booked",
    className: "bg-gradient-to-br from-slate-300 to-slate-400 shadow-md shadow-slate-300/50",
  },
];

function SeatMap({
  layout,
  bookedSeats = [],
  selectedSeats = [],
  disabled = false,
  onSeatToggle,
  className,
  showLegend = false,
  compact = false,
}: SeatMapProps) {
  const bookedSeatSet = new Set(bookedSeats.map(normalizeSeatCode));
  const selectedSeatSet = new Set(selectedSeats.map(normalizeSeatCode));
  const items = getSeatLayoutItems(layout);

  return (
    <div className={cn("space-y-4", className)}>
      {showLegend ? (
        <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-4 shadow-sm border border-slate-200/50">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className={cn("size-4 rounded-lg shadow-sm", item.className)} />
              <span className="font-medium text-slate-700">{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="mx-auto min-w-fit rounded-[40px] border-2 border-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 bg-gradient-to-br from-white via-slate-50/95 to-white p-5 shadow-2xl shadow-indigo-100/50 ring-4 ring-white/50 sm:p-7">
          <div className="mb-6 flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-3 text-xs font-bold uppercase tracking-[0.32em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 shadow-inner">
            <ArrowUp className="size-4 text-indigo-500" />
            Front of Bus
          </div>

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${layout.grid.cols}, minmax(${compact ? "54px" : "70px"}, 1fr))`,
              gridAutoRows: compact ? "58px" : "76px",
            }}
          >
            {items.map((item) => (
              <SeatMapCell
                key={item.id}
                item={item}
                bookedSeatSet={bookedSeatSet}
                selectedSeatSet={selectedSeatSet}
                disabled={disabled}
                compact={compact}
                onSeatToggle={onSeatToggle}
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
  disabled: boolean;
  compact: boolean;
  onSeatToggle?: (seatCode: string) => void;
};

const SeatMapCell = memo(function SeatMapCell({
  item,
  bookedSeatSet,
  selectedSeatSet,
  disabled,
  compact,
  onSeatToggle,
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
  const seatState: SeatState = bookedSeatSet.has(seatCode)
    ? "booked"
    : selectedSeatSet.has(seatCode)
      ? "selected"
      : "available";
  const isInteractive = Boolean(onSeatToggle) && seatState !== "booked" && !disabled;

  return (
    <div style={style}>
      <button
        type="button"
        aria-pressed={seatState === "selected"}
        disabled={!isInteractive}
        className={cn(
          "group h-full w-full text-left outline-none transition-transform duration-150",
          isInteractive ? "hover:-translate-y-0.5" : "",
          disabled ? "cursor-not-allowed" : ""
        )}
        onClick={() => {
          if (isInteractive) {
            onSeatToggle?.(seatCode);
          }
        }}
      >
        {item.kind === "sleeper" ? (
          <SleeperSeat label={item.label ?? seatCode} state={seatState} compact={compact} />
        ) : (
          <UprightSeat label={item.label ?? seatCode} state={seatState} compact={compact} />
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
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-end overflow-hidden transition-all duration-200",
        getSeatTone(state)
      )}
    >
      {/* Seat back/top section */}
      <div className="relative w-full flex-1 flex items-center justify-center rounded-t-xl border-2 border-b-0 px-2 pt-2 pb-1 transition-all duration-200" style={{
        background: state === 'booked'
          ? 'linear-gradient(180deg, rgba(203, 213, 225, 0.8), rgba(148, 163, 184, 0.5))'
          : state === 'selected'
          ? 'linear-gradient(180deg, rgba(253, 230, 138, 0.9), rgba(251, 191, 36, 0.6))'
          : 'linear-gradient(180deg, rgba(110, 231, 183, 0.9), rgba(16, 185, 129, 0.6))',
        borderColor: state === 'booked'
          ? 'rgba(148, 163, 184, 0.6)'
          : state === 'selected'
          ? 'rgba(251, 191, 36, 0.6)'
          : 'rgba(16, 185, 129, 0.6)',
      }}>
        {/* Seat label */}
        <span className={cn(
          "relative z-10 font-bold tracking-tight",
          compact ? "text-xs" : "text-sm",
          state === 'booked' ? "text-slate-700" : state === 'selected' ? "text-amber-800" : "text-emerald-800"
        )}>
          {label}
        </span>

        {/* Headrest curve highlight */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-3 rounded-t-full opacity-30 bg-white" />
      </div>

      {/* Seat cushion/bottom section */}
      <div className="relative w-full h-[40%] rounded-b-xl border-2 border-t-0 transition-all duration-200" style={{
        background: state === 'booked'
          ? 'linear-gradient(180deg, rgba(148, 163, 184, 0.6), rgba(203, 213, 225, 0.4))'
          : state === 'selected'
          ? 'linear-gradient(180deg, rgba(251, 191, 36, 0.7), rgba(253, 230, 138, 0.5))'
          : 'linear-gradient(180deg, rgba(16, 185, 129, 0.7), rgba(110, 231, 183, 0.5))',
        borderColor: state === 'booked'
          ? 'rgba(148, 163, 184, 0.5)'
          : state === 'selected'
          ? 'rgba(251, 191, 36, 0.5)'
          : 'rgba(16, 185, 129, 0.5)',
      }}>
        {/* Cushion highlight */}
        <div className="absolute inset-x-1 top-0.5 h-1 rounded-full opacity-40 bg-white" />
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
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 items-center justify-between overflow-hidden rounded-2xl shadow-lg transition-all duration-300",
        compact ? "gap-2 py-2" : "gap-3 px-4 py-3",
        getSeatTone(state)
      )}
    >
      {/* Top gradient shine effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent opacity-60" />

      {/* Pillow */}
      <div className="absolute left-3 top-3 h-4 w-7 rounded-lg border border-current/20 shadow-inner transition-all duration-200" style={{
        background: state === 'booked'
          ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.5), rgba(148, 163, 184, 0.2))'
          : state === 'selected'
          ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.5), rgba(251, 191, 36, 0.2))'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.5), rgba(16, 185, 129, 0.2))'
      }} />

      <div className="relative min-w-0 flex-1">
        <p className={cn(
          "text-[9px] uppercase tracking-[0.28em] font-medium mb-0.5",
          state === 'booked' ? "text-slate-500" : state === 'selected' ? "text-amber-600" : "text-emerald-600"
        )}>
          Sleeper
        </p>
        <p className={cn(
          "truncate font-bold tracking-tight",
          compact ? "text-xs" : "text-sm",
          state === 'booked' ? "text-slate-700" : state === 'selected' ? "text-amber-800" : "text-emerald-800"
        )}>
          {label}
        </p>
      </div>

      {/* Blanket/fold indicator */}
      <div className="relative h-6 w-9 rounded-lg border border-current/15 shadow-md transition-all duration-200" style={{
        background: state === 'booked'
          ? 'linear-gradient(135deg, rgba(203, 213, 225, 0.8), rgba(148, 163, 184, 0.4))'
          : state === 'selected'
          ? 'linear-gradient(135deg, rgba(253, 230, 138, 0.9), rgba(251, 191, 36, 0.5))'
          : 'linear-gradient(135deg, rgba(110, 231, 183, 0.9), rgba(16, 185, 129, 0.5))'
      }} />

      {/* Decorative lines */}
      <div className="absolute inset-x-2 bottom-2 h-px bg-current/10" />
      <div className="absolute inset-x-2 bottom-2.5 h-px bg-current/5" />
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
    case "aisle":
      return (
        <div className="relative h-full min-h-0">
          <span className="absolute left-1/2 top-2 bottom-2 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          <span className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 border-l-2 border-dashed border-slate-300/60" />
        </div>
      );
    case "driver":
      return (
        <DecorativeBlock
          compact={compact}
          className="border-sky-300 bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-700 shadow-sky-200/50 shadow-md"
          eyebrow="Cabin"
          label={item.label ?? "Driver"}
        />
      );
    case "toilet":
      return (
        <DecorativeBlock
          compact={compact}
          className="border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-800 shadow-amber-200/50 shadow-md"
          eyebrow="Utility"
          label={item.label ?? "WC"}
        />
      );
    case "empty":
      return <div className="h-full min-h-0 rounded-2xl border-2 border-transparent bg-slate-50/30" />;
    default:
      return (
        <DecorativeBlock
          compact={compact}
          className="border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200/50 text-slate-600 shadow-slate-200/50 shadow-md"
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
        "relative flex h-full min-h-0 items-center justify-center rounded-2xl border-2 text-center shadow-md overflow-hidden transition-all duration-200",
        compact ? "px-2 py-2" : "px-3 py-3",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/20 opacity-60" />

      <div className="relative z-10">
        <p className={cn(
          "text-[9px] uppercase tracking-[0.28em] font-medium opacity-80",
          compact ? "text-[8px]" : "text-[9px]"
        )}>
          {eyebrow}
        </p>
        <p className={cn("font-bold tracking-tight", compact ? "text-xs" : "text-sm")}>{label}</p>
      </div>

      {/* Decorative border effect */}
      <div className="absolute inset-x-1.5 bottom-1.5 h-px bg-current/10" />
    </div>
  );
}

function getSeatTone(state: SeatState) {
  switch (state) {
    case "selected":
      return "shadow-md shadow-amber-200/40 hover:shadow-lg hover:shadow-amber-300/50";
    case "booked":
      return "shadow-sm shadow-slate-200/40";
    case "available":
    default:
      return "shadow-md shadow-emerald-200/40 hover:shadow-lg hover:shadow-emerald-300/50 hover:-translate-y-0.5";
  }
}

export function SeatMapLegend({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-5 text-sm rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-4 shadow-sm border border-slate-200/50", className)}>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span className={cn("size-4 rounded-lg shadow-sm", item.className)} />
          <span className="font-medium text-slate-700">{item.label}</span>
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
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export default SeatMap;
