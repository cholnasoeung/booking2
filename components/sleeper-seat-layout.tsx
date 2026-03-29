"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type SeatState = "available" | "selected" | "booked";

type Seat = {
  id: string;
  number: string;
  state: SeatState;
};

// Generate seats
function generateDeckSeats(startNum: number, endNum: number, bookedSeats: number[] = []): Seat[] {
  const seats: Seat[] = [];
  const totalSeats = endNum - startNum + 1;

  for (let i = 0; i < totalSeats; i++) {
    const seatNum = startNum + i;
    seats.push({
      id: `seat-${seatNum}`,
      number: String(seatNum),
      state: bookedSeats.includes(seatNum) ? "booked" : "available",
    });
  }

  return seats;
}

// Layout configuration: 2 seats left, aisle, 1 seat right
function createDeckRows(seats: Seat[], seatsPerRow: number = 3) {
  const rows: Seat[][] = [];
  const totalSeats = seats.length;

  for (let i = 0; i < totalSeats; i += seatsPerRow) {
    const rowSeats = seats.slice(i, i + seatsPerRow);
    // Pad row if needed
    while (rowSeats.length < seatsPerRow) {
      rowSeats.push({ id: `empty-${i}-${rowSeats.length}`, number: "", state: "available" });
    }
    rows.push(rowSeats);
  }

  return rows;
}

export default function SleeperSeatLayout() {
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());

  // All seats: 1-34 in a single layout
  const allSeats = generateDeckSeats(1, 34, [3, 7, 12, 15, 18, 22, 28, 31]); // Some booked seats
  const seatRows = createDeckRows(allSeats, 3);

  function toggleSeat(seatId: string, seatState: SeatState) {
    if (seatState === "booked") return;

    setSelectedSeats((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
      }
      return next;
    });
  }

  const totalSelected = selectedSeats.size;
  const totalPrice = totalSelected * 25; // $25 per seat

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Sleeper Bus Seat Selection
          </h1>
          <p className="text-slate-600 text-sm md:text-base">
            Select your preferred berths for overnight journey
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-emerald-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-12 bg-white border-2 border-emerald-400 rounded-xl flex items-center justify-center">
              <div className="w-full h-2 bg-emerald-100 rounded-b-xl" />
            </div>
            <span className="text-sm font-medium text-slate-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-12 bg-emerald-500 border-2 border-emerald-600 rounded-xl flex items-center justify-center">
              <div className="w-full h-2 bg-emerald-600 rounded-b-xl" />
            </div>
            <span className="text-sm font-medium text-slate-700">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-12 bg-slate-200 border-2 border-slate-300 rounded-xl flex items-center justify-center opacity-70">
              <div className="w-full h-2 bg-slate-300 rounded-b-xl" />
            </div>
            <span className="text-sm font-medium text-slate-700">Booked</span>
          </div>
        </div>

        {/* Single Deck Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
          {/* Deck Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-emerald-800">Sleeper Berths</h2>
              <div className="text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                34 Berths
              </div>
            </div>
          </div>

          {/* Seat Grid */}
          <div className="p-4 md:p-6 overflow-x-auto">
            <div className="min-w-fit mx-auto" style={{ maxWidth: '500px' }}>
              {/* Front indicator */}
              <div className="flex items-center justify-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Front
              </div>

              {/* Seat Rows */}
              <div className="space-y-3">
                {seatRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center justify-center gap-2 md:gap-3">
                    {/* Left seats (2 seats) */}
                    {row.slice(0, 2).map((seat) => (
                      <SeatCard
                        key={seat.id}
                        seat={seat}
                        isSelected={selectedSeats.has(seat.id)}
                        onToggle={() => toggleSeat(seat.id, seat.state)}
                      />
                    ))}

                    {/* Aisle */}
                    <div className="w-12 md:w-16 flex items-center justify-center">
                      <div className="w-px h-12 bg-slate-200" />
                    </div>

                    {/* Right seat (1 seat) */}
                    {row[2] && (
                      <SeatCard
                        key={row[2].id}
                        seat={row[2]}
                        isSelected={selectedSeats.has(row[2].id)}
                        onToggle={() => toggleSeat(row[2].id, row[2].state)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        {totalSelected > 0 && (
          <div className="sticky bottom-4 z-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-2xl p-6 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium opacity-90">Selected Berths</p>
                  <p className="text-2xl font-bold">{totalSelected}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium opacity-90">Total Price</p>
                  <p className="text-2xl font-bold">${totalPrice}</p>
                </div>
                <button className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-lg">
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type DeckSectionProps = {
  name: string;
  rows: Seat[][];
  selectedSeats: Set<string>;
  onToggleSeat: (seatId: string, seatState: SeatState) => void;
};

function DeckSection({ name, rows, selectedSeats, onToggleSeat }: DeckSectionProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
      {/* Deck Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-emerald-800">{name}</h2>
          <div className="text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
            {rows.flat().filter(s => s.number).length} Berths
          </div>
        </div>
      </div>

      {/* Seat Grid */}
      <div className="p-4 md:p-6 overflow-x-auto">
        <div className="min-w-fit mx-auto" style={{ maxWidth: '600px' }}>
          {/* Front indicator */}
          <div className="flex items-center justify-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Front
          </div>

          {/* Seat Rows */}
          <div className="space-y-3">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-center gap-2 md:gap-3">
                {/* Left seats (2 seats) */}
                {row.slice(0, 2).map((seat) => (
                  <SeatCard
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeats.has(seat.id)}
                    onToggle={() => onToggleSeat(seat.id, seat.state)}
                  />
                ))}

                {/* Aisle */}
                <div className="w-12 md:w-16 flex items-center justify-center">
                  <div className="w-px h-12 bg-slate-200" />
                </div>

                {/* Right seat (1 seat) */}
                {row[2] && (
                  <SeatCard
                    key={row[2].id}
                    seat={row[2]}
                    isSelected={selectedSeats.has(row[2].id)}
                    onToggle={() => onToggleSeat(row[2].id, row[2].state)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type SeatCardProps = {
  seat: Seat;
  isSelected: boolean;
  onToggle: () => void;
};

function SeatCard({ seat, isSelected, onToggle }: SeatCardProps) {
  if (!seat.number) {
    return <div className="w-16 h-20 md:w-20 md:h-24" />;
  }

  const isBooked = seat.state === "booked";

  return (
    <button
      type="button"
      disabled={isBooked}
      onClick={onToggle}
      className={cn(
        "relative w-16 h-20 md:w-20 md:h-24 rounded-2xl border-2 flex flex-col items-center justify-between py-2.5 transition-all duration-200",
        !isBooked && !isSelected && "bg-white border-emerald-400 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1",
        isSelected && "bg-emerald-500 border-emerald-600 shadow-lg",
        isBooked && "bg-slate-200 border-slate-300 cursor-not-allowed opacity-70",
        !isBooked && "active:scale-95"
      )}
    >
      {/* Seat number */}
      <span className={cn(
        "text-base md:text-lg font-bold tracking-tight",
        isSelected ? "text-white" : isBooked ? "text-slate-500" : "text-emerald-700"
      )}>
        {seat.number}
      </span>

      {/* Pillow indicator */}
      <div className={cn(
        "w-full h-2.5 rounded-b-xl flex items-center justify-center",
        isSelected && "bg-emerald-600",
        !isBooked && !isSelected && "bg-emerald-100",
        isBooked && "bg-slate-300"
      )}>
        <div className={cn(
          "w-8 h-1.5 rounded-full",
          isSelected && "bg-white/50",
          !isBooked && !isSelected && "bg-emerald-400",
          isBooked && "bg-slate-400"
        )} />
      </div>

      {/* Top highlight for available seats */}
      {!isBooked && !isSelected && (
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-emerald-50/60 to-transparent rounded-t-2xl pointer-events-none" />
      )}
    </button>
  );
}
