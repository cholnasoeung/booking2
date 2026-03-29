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
    className: "bg-emerald-500",
  },
  {
    label: "Selected",
    className: "bg-amber-400",
  },
  {
    label: "Booked",
    className: "bg-slate-400",
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
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={cn("size-3 rounded-full", item.className)} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="mx-auto min-w-fit rounded-[36px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-4 shadow-inner shadow-slate-200/60 sm:p-6">
          <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            <ArrowUp className="size-3.5" />
            Front
          </div>

          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${layout.grid.cols}, minmax(${compact ? "52px" : "68px"}, 1fr))`,
              gridAutoRows: compact ? "56px" : "74px",
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
        "relative flex h-full min-h-0 items-end justify-center overflow-hidden rounded-[1.55rem] border-2 px-2 pb-3 text-center shadow-sm transition-colors",
        compact ? "pb-2" : "pb-3",
        getSeatTone(state)
      )}
    >
      <span className="absolute inset-x-3 top-2 h-5 rounded-full border border-current/20 bg-white/70" />
      <span className="absolute left-1.5 top-5 h-7 w-2 rounded-full border border-current/15 bg-white/65" />
      <span className="absolute right-1.5 top-5 h-7 w-2 rounded-full border border-current/15 bg-white/65" />
      <span
        className={cn(
          "relative font-semibold tracking-tight",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {label}
      </span>
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
        "relative flex h-full min-h-0 items-center justify-between overflow-hidden rounded-[1.55rem] border-2 px-3 shadow-sm transition-colors",
        compact ? "gap-2 py-2" : "gap-3 px-4 py-3",
        getSeatTone(state)
      )}
    >
      <span className="absolute left-3 top-3 h-3 w-6 rounded-full bg-white/70" />
      <div className="relative min-w-0">
        <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">Sleeper</p>
        <p className={cn("truncate font-semibold", compact ? "text-xs" : "text-sm")}>
          {label}
        </p>
      </div>
      <span className="relative h-5 w-8 rounded-full border border-current/15 bg-white/65" />
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
          <span className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 border-l border-dashed border-border/80" />
        </div>
      );
    case "driver":
      return (
        <DecorativeBlock
          compact={compact}
          className="border-sky-200 bg-sky-50 text-sky-700"
          eyebrow="Cabin"
          label={item.label ?? "Driver"}
        />
      );
    case "toilet":
      return (
        <DecorativeBlock
          compact={compact}
          className="border-amber-200 bg-amber-50 text-amber-800"
          eyebrow="Utility"
          label={item.label ?? "WC"}
        />
      );
    case "empty":
      return <div className="h-full min-h-0 rounded-[1.4rem] border border-transparent" />;
    default:
      return (
        <DecorativeBlock
          compact={compact}
          className="border-slate-200 bg-slate-50 text-slate-500"
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
        "flex h-full min-h-0 items-center justify-center rounded-[1.45rem] border text-center shadow-sm",
        compact ? "px-2 py-2" : "px-3 py-3",
        className
      )}
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">{eyebrow}</p>
        <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{label}</p>
      </div>
    </div>
  );
}

function getSeatTone(state: SeatState) {
  switch (state) {
    case "selected":
      return "border-amber-300 bg-amber-100 text-amber-900";
    case "booked":
      return "border-slate-300 bg-slate-200 text-slate-500";
    case "available":
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
}

export function SeatMapLegend({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4 text-sm text-muted-foreground", className)}>
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={cn("size-3 rounded-full", item.className)} />
          <span>{item.label}</span>
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
