"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, BusFront, CheckCircle2, Clock,
  MapPin, Printer, RefreshCw, Search, Tag, User, Wallet,
  Ticket, Calendar, CreditCard, Phone,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import SeatMap from "@/components/booking/seat-map";
import type { SeatLayout } from "@/lib/seat/seat-layout";

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
  blockedSeats: string[];
  availableSeats: string[];
  seatLayout: SeatLayout;
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
interface RecentBooking {
  id: string;
  guestName: string;
  guestPhone: string;
  route: string;
  seats: string[];
  totalPrice: number;
  finalPrice: number;
  discountAmount: number;
  paymentMethod: string;
  departureTime: string;
  travelDate: string;
  status: string;
  createdAt: string;
}

// ─── step bar ─────────────────────────────────────────────────────────────────
const STEPS = ["Route & Date", "Select Bus", "Choose Seats", "Passenger & Pay", "Done"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all shadow-sm ${
              i < current  ? "bg-emerald-500 text-white shadow-emerald-200"
              : i === current ? "bg-indigo-600 text-white shadow-indigo-200 ring-4 ring-indigo-100"
              : "bg-slate-100 text-slate-400"
            }`}>
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1.5 font-semibold whitespace-nowrap ${
              i < current ? "text-emerald-600" : i === current ? "text-indigo-600" : "text-slate-400"
            }`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${i < current ? "bg-emerald-400" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── receipt ──────────────────────────────────────────────────────────────────
function Receipt({ result, onNew }: { result: ConfirmResult; onNew: () => void }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4 ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h3>
        <p className="text-sm text-slate-500 mt-1">Counter ticket issued successfully</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* ticket header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">Booking ID</p>
              <p className="font-mono text-lg font-bold mt-0.5">{result.bookingId.slice(-8).toUpperCase()}</p>
            </div>
            <Ticket className="w-8 h-8 opacity-70" />
          </div>
        </div>

        {/* ticket body */}
        <div className="px-6 py-5 space-y-3 text-sm divide-y divide-dashed divide-slate-200">
          <div className="grid grid-cols-2 gap-3 pb-3">
            {[
              { label: "Passenger", value: result.guestName, icon: <User className="w-3.5 h-3.5" /> },
              { label: "Route",     value: result.route,     icon: <MapPin className="w-3.5 h-3.5" /> },
              { label: "Departure", value: result.departureTime, icon: <Clock className="w-3.5 h-3.5" /> },
              { label: "Seats",     value: result.seats.join(", "), icon: <Ticket className="w-3.5 h-3.5" /> },
              { label: "Payment",   value: result.paymentMethod.toUpperCase(), icon: <CreditCard className="w-3.5 h-3.5" /> },
            ].map((row) => (
              <div key={row.label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">{row.icon}{row.label}</p>
                <p className="font-semibold text-slate-800 mt-0.5 capitalize">{row.value}</p>
              </div>
            ))}
          </div>

          {result.discountAmount > 0 && (
            <div className="flex justify-between py-3 text-emerald-600">
              <span className="font-medium">Discount Applied</span>
              <span className="font-bold">-{formatCurrency(result.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3">
            <span className="font-bold text-slate-900 text-base">Total Paid</span>
            <span className="font-bold text-indigo-600 text-xl">{formatCurrency(result.finalPrice)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
        <button onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> New Booking
        </button>
      </div>
    </div>
  );
}

// ─── payment method badge ──────────────────────────────────────────────────────
function PayBadge({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m === "aba") return <span className="inline-flex items-center rounded-lg bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">ABA Pay</span>;
  if (m === "wing") return <span className="inline-flex items-center rounded-lg bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">Wing</span>;
  return <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Cash</span>;
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
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);

  // Load routes + recent bookings
  useEffect(() => {
    fetch("/api/admin/counter-booking")
      .then((r) => r.json())
      .then((d) => {
        setRoutes(d.routes ?? []);
        setRecentBookings(d.recentBookings ?? []);
      })
      .catch(() => {});
  }, []);

  async function searchBuses() {
    if (!selectedRouteId || !selectedDate) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/admin/counter-booking?routeId=${selectedRouteId}&date=${selectedDate}`);
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
      const res  = await fetch("/api/admin/counter-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: selectedBus.id, seats: selectedSeats, guestName, guestPhone, guestEmail, paymentMethod, promoCode: promoCode || undefined, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Booking failed");
      setResult(data);
      setStep(4);
      // refresh recent
      fetch("/api/admin/counter-booking").then((r) => r.json()).then((d) => setRecentBookings(d.recentBookings ?? [])).catch(() => {});
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
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
            <Ticket className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Counter Booking</h2>
            <p className="text-sm text-slate-500">Book tickets for walk-in passengers — no account needed</p>
          </div>
        </div>
        {step < 4 && (
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Instant — no login required</span>
            <span className="flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" />Print receipt after confirmation</span>
          </div>
        )}
      </div>

      {/* ── Wizard card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-8 pt-8 pb-2">
          <StepBar current={step} />
        </div>

        {error && (
          <div className="mx-8 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="px-8 pb-8">

          {/* Step 0 – Route & Date */}
          {step === 0 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <h3 className="text-lg font-bold text-slate-800">Select Route & Travel Date</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Route</label>
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                  >
                    <option value="">— Select route —</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>{r.from} → {r.to} ({r.duration})</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Travel Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>
              <button
                onClick={searchBuses}
                disabled={!selectedRouteId || !selectedDate || loading}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search Buses
              </button>
            </div>
          )}

          {/* Step 1 – Select Bus */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">
                  Available Buses
                  <span className="ml-2 text-sm font-normal text-slate-400">{selectedDate}</span>
                </h3>
                <button onClick={() => setStep(0)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>
              {buses.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <BusFront className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No buses available for this route and date.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {buses.map((bus) => (
                    <button
                      key={bus.id}
                      onClick={() => { setSelectedBus(bus); setSelectedSeats([]); setStep(2); }}
                      className="flex flex-col gap-3 p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                          <BusFront className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-base">{bus.departureTime} – {bus.arrivalTime}</p>
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">{bus.busType.replace(/-/g, " ")}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">{bus.availableSeats.length} seats left</span>
                        <span className="font-bold text-indigo-600">{formatCurrency(bus.pricePerSeat)}<span className="text-[10px] font-normal text-slate-400">/seat</span></span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 – Choose Seats */}
          {step === 2 && selectedBus && (
            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              {/* Seat map */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Choose Seats</h3>
                    <p className="text-sm text-slate-400 mt-0.5">{selectedBus.route?.from} → {selectedBus.route?.to} · {selectedBus.departureTime}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                </div>
                <SeatMap
                  layout={selectedBus.seatLayout}
                  bookedSeats={selectedBus.bookedSeats}
                  blockedSeats={selectedBus.blockedSeats}
                  selectedSeats={selectedSeats}
                  onSeatToggle={toggleSeat}
                  showLegend
                />
              </div>

              {/* Selection summary sidebar */}
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden sticky top-4">
                  <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Seat Summary</p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bus type</p>
                      <p className="font-semibold text-slate-800 mt-0.5 capitalize">{selectedBus.busType.replace(/-/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Price per seat</p>
                      <p className="font-bold text-indigo-600 mt-0.5">{formatCurrency(selectedBus.pricePerSeat)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Selected ({selectedSeats.length}/{selectedBus.availableSeats.length + selectedSeats.length})
                      </p>
                      {selectedSeats.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSeats.map((s) => (
                            <span key={s} className="inline-flex items-center rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tap a seat on the map to select it</p>
                      )}
                    </div>
                    {selectedSeats.length > 0 && (
                      <div className="border-t border-slate-100 pt-3 flex justify-between font-bold">
                        <span className="text-slate-700">Total</span>
                        <span className="text-indigo-600 text-lg">{formatCurrency(totalPrice)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setStep(3)}
                  disabled={selectedSeats.length === 0}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 – Passenger & Pay */}
          {step === 3 && selectedBus && (
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Form */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-slate-800">Passenger Details & Payment</h3>
                  <button onClick={() => setStep(2)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                </div>

                {/* Passenger info */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">Passenger Information</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Sokha Chan"
                        className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                      <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="012 345 678"
                        className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email (optional)</label>
                      <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="sokha@email.com"
                        className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800" />
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">Payment Method</span>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-2">
                    {[
                      { value: "cash", label: "💵", name: "Cash" },
                      { value: "aba",  label: "🏦", name: "ABA Pay" },
                      { value: "wing", label: "🦋", name: "Wing" },
                    ].map((m) => (
                      <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                          paymentMethod === m.value
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}>
                        <span className="text-xl">{m.label}</span>
                        <span className="text-xs">{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Promo + Note */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                      <Tag className="w-3.5 h-3.5" />Promo Code
                    </label>
                    <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="DISCOUNT10"
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Agent Note</label>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. VIP passenger, wheelchair"
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800" />
                  </div>
                </div>
              </div>

              {/* Order summary sidebar */}
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden sticky top-4">
                  <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">Order Summary</p>
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedBus.route?.from} → {selectedBus.route?.to}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Departure</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedBus.departureTime} – {selectedBus.arrivalTime}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seats ({selectedSeats.length})</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedSeats.map((s) => (
                          <span key={s} className="inline-flex items-center rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-base text-slate-900">
                      <span>Total</span>
                      <span className="text-indigo-600">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={confirmBooking}
                  disabled={loading || !guestName || selectedSeats.length === 0}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all"
                >
                  {loading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                    : <><CheckCircle2 className="w-5 h-5" /> Confirm — {formatCurrency(totalPrice)}</>}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 – Done */}
          {step === 4 && result && <Receipt result={result} onNew={reset} />}
        </div>
      </div>

      {/* ── Recent counter bookings ── */}
      {recentBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* section header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Recent Counter Bookings</p>
                <p className="text-xs text-slate-500">Last {recentBookings.length} walk-in tickets issued</p>
              </div>
            </div>
          </div>

          {/* table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  {["Booking ID", "Passenger", "Route", "Travel Date", "Seats", "Payment", "Total", "Issued"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBookings.map((bk) => (
                  <tr key={bk.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{bk.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{bk.guestName}</p>
                      {bk.guestPhone && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />{bk.guestPhone}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 whitespace-nowrap">{bk.route}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{bk.departureTime}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 font-medium whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {bk.travelDate}
                        </span>
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {bk.seats.map((s) => (
                          <span key={s} className="inline-flex rounded-md bg-indigo-100 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3"><PayBadge method={bk.paymentMethod} /></td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{formatCurrency(bk.finalPrice)}</p>
                      {bk.discountAmount > 0 && (
                        <p className="text-[11px] text-emerald-600 font-medium">-{formatCurrency(bk.discountAmount)} off</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {bk.createdAt ? new Date(bk.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
