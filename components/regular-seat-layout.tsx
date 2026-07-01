"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type SeatState = "available" | "selected" | "booked";

type Seat = {
  id: string;
  number: string;
  state: SeatState;
  position: "window" | "aisle";
  price?: number;
};

interface RegularSeatLayoutProps {
  busType: string;
  totalSeats: number;
  bookedSeats: string[];
  blockedSeats: string[];
  pricePerSeat: number;
  selectedSeats: Set<string>;
  onSeatToggle: (seatId: string, seatState: SeatState) => void;
  selectionLimit?: number;
}

// Generate seats for a 2+1 configuration bus
function generateBusSeats(totalSeats: number, bookedSeats: string[] = [], blockedSeats: string[] = []): Seat[] {
  const seats: Seat[] = [];
  const rows = Math.ceil(totalSeats / 3);

  for (let row = 1; row <= rows; row++) {
    // Left side - 2 seats (window and aisle)
    seats.push({
      id: `${row}A`,
      number: `${row}A`,
      position: "window",
      state: (bookedSeats.includes(`${row}A`) || blockedSeats.includes(`${row}A`)) ? "booked" : "available",
    });

    if (seats.length < totalSeats) {
      seats.push({
        id: `${row}B`,
        number: `${row}B`,
        position: "aisle",
        state: (bookedSeats.includes(`${row}B`) || blockedSeats.includes(`${row}B`)) ? "booked" : "available",
      });
    }

    // Right side - 1 seat (window)
    if (seats.length < totalSeats) {
      seats.push({
        id: `${row}C`,
        number: `${row}C`,
        position: "window",
        state: (bookedSeats.includes(`${row}C`) || blockedSeats.includes(`${row}C`)) ? "booked" : "available",
      });
    }
  }

  return seats;
}

// Create rows with aisle
function createSeatRows(seats: Seat[]) {
  const rows: Seat[][] = [];
  const totalSeats = seats.length;
  const seatsPerRow = 3; // 2 left + 1 right

  for (let i = 0; i < totalSeats; i += seatsPerRow) {
    const rowSeats = seats.slice(i, i + seatsPerRow);
    rows.push(rowSeats);
  }

  return rows;
}

export default function RegularSeatLayout({
  busType,
  totalSeats,
  bookedSeats,
  blockedSeats,
  pricePerSeat,
  selectedSeats,
  onSeatToggle,
  selectionLimit = 6,
}: RegularSeatLayoutProps) {
  const allSeats = generateBusSeats(totalSeats, bookedSeats, blockedSeats);
  const seatRows = createSeatRows(allSeats);

  const totalSelected = selectedSeats.size;
  const totalPrice = totalSelected * pricePerSeat;
  const isMaxReached = selectionLimit > 0 && totalSelected >= selectionLimit;

  return (
    <div className="w-full bg-slate-100">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0h2.1a2.5 2.5 0 014.9 0H17a1 1 0 001-1V5a1 1 0 00-1-1H3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Select Your Seats</h1>
                <p className="text-xs text-slate-500">
                  {totalSeats} Seater | ${pricePerSeat}/seat | Max {selectionLimit} seats
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Amount</p>
              <p className="text-lg font-bold text-red-600">${totalPrice}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 bg-white rounded-xl p-3 shadow-sm border border-slate-200">
          {[
            { dot: "bg-emerald-500", label: "Available" },
            { dot: "bg-amber-400",   label: "Selected"  },
            { dot: "bg-slate-400",   label: "Booked"    },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={cn("size-3 rounded-full ring-4 ring-white shadow-sm", dot)} />
              <span className="text-xs font-medium text-slate-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Bus Layout */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Bus Header */}
          <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 bg-slate-600 rounded text-[8px] flex items-center justify-center font-bold">
                2+1
              </div>
              <span className="text-sm font-semibold">{busType}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-300">
                {allSeats.filter(s => s.state === "available").length} available
              </span>
            </div>
          </div>

          {/* Bus Body */}
          <div className="p-6">
            {/* Driver Area */}
            <div className="flex items-center justify-end mb-4 pb-4 border-b-2 border-dashed border-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                <span className="text-xs font-medium">Driver</span>
              </div>
            </div>

            {/* Seat Grid */}
            <div className="space-y-2">
              {seatRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-2">
                  {/* Left seats (2 seats) */}
                  {row.slice(0, 2).map((seat) => (
                    <RegularSeat
                      key={seat.id}
                      seat={seat}
                      isSelected={selectedSeats.has(seat.id)}
                      isMaxReached={isMaxReached}
                      onToggle={() => onSeatToggle(seat.id, seat.state)}
                    />
                  ))}

                  {/* Aisle */}
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    <div className="w-px h-10 bg-slate-300" />
                  </div>

                  {/* Right seat (1 seat) */}
                  {row[2] && (
                    <RegularSeat
                      key={row[2].id}
                      seat={row[2]}
                      isSelected={selectedSeats.has(row[2].id)}
                      isMaxReached={isMaxReached}
                      onToggle={() => onSeatToggle(row[2].id, row[2].state)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        {totalSelected > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden sticky bottom-4">
            <div className="bg-red-600 text-white px-4 py-2">
              <h3 className="font-semibold">Selected Seats ({totalSelected})</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {Array.from(selectedSeats).map((seatId) => (
                  <div key={seatId} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-sm font-bold text-red-700">{seatId}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isMaxReached && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-sm text-amber-800">
              ⚠️ Maximum selection limit ({selectionLimit} seats) reached
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type RegularSeatProps = {
  seat: Seat;
  isSelected: boolean;
  isMaxReached: boolean;
  onToggle: () => void;
};

function RegularSeat({ seat, isSelected, isMaxReached, onToggle }: RegularSeatProps) {
  const isBooked = seat.state === "booked";

  const headrest = isSelected
    ? "bg-gradient-to-b from-amber-500 to-amber-400"
    : isBooked
      ? "bg-gradient-to-b from-slate-400 to-slate-300"
      : "bg-gradient-to-b from-emerald-500 to-emerald-400";

  const armrest  = isSelected ? "bg-amber-300"  : isBooked ? "bg-slate-300"  : "bg-emerald-300";
  const cushion  = isSelected ? "bg-amber-200"  : isBooked ? "bg-slate-200"  : "bg-emerald-100";
  const bodyBg   = isSelected ? "bg-amber-50 border-amber-400"  : isBooked ? "bg-slate-100 border-slate-200" : "bg-white border-emerald-300";
  const shadow   = isSelected ? "shadow-md -translate-y-0.5" : "";
  const backFill = isSelected ? "bg-amber-50"  : isBooked ? "bg-slate-50"  : "bg-white";
  const label    = isSelected ? "text-amber-900" : isBooked ? "text-slate-400" : "text-slate-700";

  return (
    <button
      type="button"
      disabled={isBooked || (isMaxReached && !isSelected)}
      onClick={onToggle}
      className={cn(
        "relative w-14 h-[52px] flex-shrink-0 flex flex-col items-center gap-px transition-all duration-200",
        !isBooked && "hover:-translate-y-0.5 active:scale-95",
        isBooked && "cursor-not-allowed opacity-55"
      )}
      title={`${seat.number} - ${seat.position} seat`}
    >
      {/* Floating headrest — narrower, separate */}
      <div className={cn("h-[20%] w-[52%] flex-shrink-0 rounded-lg", headrest)} />

      {/* Main body */}
      <div className={cn(
        "relative w-full flex-1 overflow-hidden rounded-lg border-2",
        bodyBg, shadow
      )}>
        {/* Left armrest */}
        <div className={cn("absolute left-0 top-0 h-[68%] w-[18%] rounded-tl-lg", armrest)} />
        {/* Right armrest */}
        <div className={cn("absolute right-0 top-0 h-[68%] w-[18%] rounded-tr-lg", armrest)} />

        {/* Backrest label */}
        <div className={cn("absolute left-[20%] right-[20%] top-0 flex h-[68%] items-center justify-center", backFill)}>
          <span className={cn("text-[9px] font-bold", label)}>{seat.number}</span>
        </div>

        {/* Seat cushion */}
        <div className={cn("absolute bottom-0 left-0 right-0 h-[32%] rounded-b-md", cushion)} />
      </div>
    </button>
  );
}
