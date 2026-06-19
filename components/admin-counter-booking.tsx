"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, BusFront, CheckCircle2, Clock,
  Printer, RefreshCw, Search, Tag, User, Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

// ─── types ────────────────────────────────────────────────────────────────────
interface RouteOption { id: string; from: string; to: string; duration: string; }
interface BusOption {
  id: string;
  route: { from: string; to: string; duration: string } | null;
  departureTime: string;
  arrivalTime: string;
  busType: string;
  totalSeats: number;
  bookedSeats: string[];
  availableSeats: string[];
  pricePerSeat: number;
}
interface ConfirmResult {
  bookingId: string;
  guestName: string;
  route: string;
  seats: string[];
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  paymentMethod: string;
  departureTime: string;
}

// ─── step bar ─────────────────────────────────────────────────────────────────
const STEPS = ["Route & Date", "Select Bus", "Choose Seats", "Passenger & Pay", "Done"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
              i < current ? "bg-emerald-500 text-white"
              : i === current ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-500"
            }`}>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${i === current ? "text-indigo-600" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < current ? "bg-emerald-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── seat grid ────────────────────────────────────────────────────────────────
function SeatGrid({
  available, booked, selected, onToggle,
}: {
  available: string[]; booked: string[]; selected: string[]; onToggle: (s: string) => void;
}) {
  const all = [...booked, ...available].sort();
  return (
    <div>
      <div className="flex gap-4 text-xs mb-3">
        {[
          { cls: "bg-gray-200", label: "Booked" },
          { cls: "bg-white border-2 border-gray-300", label: "Available" },
          { cls: "bg-indigo-600", label: "Selected" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded ${l.cls}`} />
            <span className="text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1.5 max-h-56 overflow-y-auto pr-1">
        {all.map((seat) => {
          const isBooked = booked.includes(seat);
          const isSel = selected.includes(seat);
          return (
            <button
              key={seat}
              type="button"
              disabled={isBooked}
              onClick={() => onToggle(seat)}
              className={`h-9 rounded-lg text-xs font-semibold transition-all ${
                isBooked ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : isSel ? "bg-indigo-600 text-white shadow-md scale-105"
                : "bg-white border-2 border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
              }`}
            >
              {seat}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {selected.length} selected · {available.length} available
      </p>
    </div>
  );
}

// ─── receipt ──────────────────────────────────────────────────────────────────
function Receipt({ result, onNew }: { result: ConfirmResult; onNew: () => void }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Booking Confirmed!</h3>
        <p className="text-sm text-gray-500 mt-1">Counter booking created successfully</p>
      </div>
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 space-y-3 text-sm">
        <div className="flex justify-between border-b pb-3">
          <span className="text-gray-500">Booking ID</span>
          <span className="font-mono font-bold text-indigo-600 text-xs">
            {result.bookingId.slice(-8).toUpperCase()}
          </span>
        </div>
        {[
          { label: "Passenger", value: result.guestName },
          { label: "Route", value: result.route },
          { label: "Departure", value: result.departureTime },
          { label: "Seats", value: result.seats.join(", ") },
          { label: "Payment", value: result.paymentMethod },
        ].map((row) => (
          <div key={row.label} className="flex justify-between">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-semibold capitalize">{row.value}</span>
          </div>
        ))}
        {result.discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(result.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t pt-3">
          <span>Total Paid</span>
          <span className="text-indigo-600">{formatCurrency(result.finalPrice)}</span>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
        <button
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> New Booking
        </button>
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function AdminCounterBooking() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const [buses, setBuses] = useState<BusOption[]>([]);
  const [selectedBus, setSelectedBus] = useState<BusOption | null>(null);

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [promoCode, setPromoCode] = useState("");
  const [note, setNote] = useState("");

  const [result, setResult] = useState<ConfirmResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/counter-booking")
      .then((r) => r.json())
      .then((d) => setRoutes(d.routes ?? []))
      .catch(() => {});
  }, []);

  async function searchBuses() {
    if (!selectedRouteId || !selectedDate) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/counter-booking?routeId=${selectedRouteId}&date=${selectedDate}`);
      const data = await res.json();
      setBuses(data.buses ?? []);
      setStep(1);
    } catch { setError("Failed to load buses."); }
    finally { setLoading(false); }
  }

  function toggleSeat(seat: string) {
    setSelectedSeats((prev) => prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]);
  }

  async function confirmBooking() {
    if (!selectedBus || !selectedSeats.length || !guestName) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/counter-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: selectedBus.id, seats: selectedSeats, guestName, guestPhone, guestEmail, paymentMethod, promoCode: promoCode || undefined, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Booking failed");
      setResult(data);
      setStep(4);
    } catch (e: any) { setError(e.message ?? "Booking failed"); }
    finally { setLoading(false); }
  }

  function reset() {
    setStep(0); setSelectedRouteId(""); setSelectedDate(new Date().toISOString().slice(0, 10));
    setBuses([]); setSelectedBus(null); setSelectedSeats([]); setGuestName("");
    setGuestPhone(""); setGuestEmail(""); setPaymentMethod("cash"); setPromoCode(""); setNote("");
    setResult(null); setError(null);
  }

  const totalPrice = selectedBus ? selectedSeats.length * selectedBus.pricePerSeat : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Counter Booking</h2>
        <p className="text-sm text-gray-500">Book tickets for walk-in passengers — no account needed</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:p-8">
        <StepBar current={step} />

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Step 0 */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Select Route & Travel Date</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">— Select route —</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.from} → {r.to} ({r.duration})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travel Date</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={searchBuses}
              disabled={!selectedRouteId || !selectedDate || loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search Buses
            </button>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Available Buses — {selectedDate}</h3>
              <button onClick={() => setStep(0)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
            {buses.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BusFront className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No buses available for this route and date.</p>
              </div>
            ) : buses.map((bus) => (
              <button
                key={bus.id}
                onClick={() => { setSelectedBus(bus); setSelectedSeats([]); setStep(2); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <BusFront className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{bus.departureTime} – {bus.arrivalTime}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{bus.busType} · {bus.availableSeats.length} seats left</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600">{formatCurrency(bus.pricePerSeat)}</p>
                  <p className="text-[10px] text-gray-400">per seat</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && selectedBus && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Choose Seats</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedBus.route?.from} → {selectedBus.route?.to} · {selectedBus.departureTime}</p>
              </div>
              <button onClick={() => setStep(1)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
            <SeatGrid
              available={selectedBus.availableSeats}
              booked={selectedBus.bookedSeats}
              selected={selectedSeats}
              onToggle={toggleSeat}
            />
            {selectedSeats.length > 0 && (
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-indigo-900">{selectedSeats.join(", ")}</span>
                <span className="font-bold text-indigo-700">{formatCurrency(totalPrice)}</span>
              </div>
            )}
            <button
              onClick={() => setStep(3)}
              disabled={selectedSeats.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && selectedBus && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Passenger Details & Payment</h3>
              <button onClick={() => setStep(2)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-700">Passenger Info</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Sokha Chan"
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="012 345 678"
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email (optional)</label>
                  <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="sokha@email.com"
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm text-gray-700">Payment Method</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ value: "cash", label: "💵 Cash" }, { value: "aba", label: "🏦 ABA Pay" }, { value: "wing", label: "🦋 Wing" }].map((m) => (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      paymentMethod === m.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Promo Code (optional)</label>
              </div>
              <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="DISCOUNT10"
                className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent Note (optional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. VIP passenger, wheelchair needed"
                className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 flex justify-between font-bold text-indigo-900 text-base">
              <span>Total</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <button
              onClick={confirmBooking}
              disabled={loading || !guestName || selectedSeats.length === 0}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base"
            >
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><CheckCircle2 className="w-4 h-4" /> Confirm — {formatCurrency(totalPrice)}</>}
            </button>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && result && <Receipt result={result} onNew={reset} />}
      </div>

      {step < 4 && (
        <div className="mt-4 flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Instant booking — no account required</span>
          <span>·</span>
          <span className="flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" />Print receipt after confirmation</span>
        </div>
      )}
    </div>
  );
}
