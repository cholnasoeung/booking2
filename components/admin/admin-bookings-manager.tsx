"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, CheckSquare, ChevronLeft, ChevronRight,
  Download, Eye, Search, Square, Ticket, X, XCircle,
} from "lucide-react";

import {
  StatusBadge,
  passengerCountLabel,
  shortBookingId,
} from "@/components/admin/admin-management-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirmAction, toastSuccess, toastError } from "@/lib/utils/swal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatBusType,
  formatCurrency,
  formatDateTime,
  formatPaymentMethod,
  formatSeatList,
  formatTravelDate,
} from "@/lib/utils/formatters";
import type { AdminBookingSummary, RouteSummary } from "@/lib/db/queries";



type AdminBookingsManagerProps = {
  routes: RouteSummary[];
  bookings: AdminBookingSummary[];
};

export default function AdminBookingsManager({
  routes,
  bookings,
}: AdminBookingsManagerProps) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] =
    useState<AdminBookingSummary | null>(null);
  const [bookingToCancel, setBookingToCancel] =
    useState<AdminBookingSummary | null>(null);
  const [bookingCancelPending, setBookingCancelPending] = useState(false);
  const [bookingCancellationReason, setBookingCancellationReason] = useState("");
  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [bookingRouteFilter, setBookingRouteFilter] = useState("all");
  const [bookingTravelDateFilter, setBookingTravelDateFilter] = useState("");
  const [bookingSort, setBookingSort] = useState("newest");

  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled");
  const totalRevenue = confirmedBookings.reduce(
    (sum, booking) => sum + booking.totalPrice,
    0
  );

  const normalizedQuery = bookingQuery.trim().toLowerCase();
  const visibleBookings = [...bookings]
    .filter((booking) => {
      if (bookingStatusFilter !== "all" && booking.status !== bookingStatusFilter) {
        return false;
      }

      if (
        bookingRouteFilter !== "all" &&
        booking.bus?.routeId !== bookingRouteFilter
      ) {
        return false;
      }

      if (
        bookingTravelDateFilter &&
        booking.bus?.travelDate !== bookingTravelDateFilter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        booking.id,
        booking.user?.name,
        booking.user?.email,
        booking.bus?.from,
        booking.bus?.to,
        formatSeatList(booking.seats),
        ...booking.passengers.map((passenger) => passenger.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .sort((first, second) => {
      switch (bookingSort) {
        case "oldest":
          return (
            new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
          );
        case "amount-high":
          return second.totalPrice - first.totalPrice;
        case "amount-low":
          return first.totalPrice - second.totalPrice;
        case "status":
          return first.status.localeCompare(second.status);
        case "newest":
        default:
          return (
            new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
          );
      }
    });

  // Calendar state
  const today = new Date();
  const [calYear,    setCalYear]    = useState(today.getFullYear());
  const [calMonth,   setCalMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  }
  function goToday() { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); setSelectedDay(null); }

  // Group ALL filtered bookings by ISO date (createdAt)
  const bookingsByDate = visibleBookings.reduce<Record<string, AdminBookingSummary[]>>((acc, b) => {
    const key = b.createdAt.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const calendarDays = buildCalendarDays(calYear, calMonth, bookingsByDate);
  const selectedDayBookings = selectedDay ? (bookingsByDate[selectedDay] ?? []) : [];

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCancelPending, setBulkCancelPending] = useState(false);

  const visibleConfirmedIds = visibleBookings
    .filter((b) => b.status === "confirmed")
    .map((b) => b.id);
  const allVisibleSelected =
    visibleConfirmedIds.length > 0 &&
    visibleConfirmedIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleConfirmedIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleConfirmedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleRow(id: string, status: string) {
    if (status !== "confirmed") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkCancel() {
    if (selectedIds.size === 0) return;
    if (!(await confirmAction("Cancel Bookings", `Cancel ${selectedIds.size} selected booking(s)?`, "Yes, Cancel"))) return;
    setBulkCancelPending(true);
    try {
      const res = await fetch("/api/admin/bookings/bulk-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingIds: [...selectedIds], reason: "Bulk cancelled by admin" }),
      });
      const payload = await res.json();
      if (!res.ok) {
        toastError(payload.message ?? "Bulk cancel failed");
        return;
      }
      toastSuccess(`Cancelled ${payload.cancelled} booking(s).`);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      toastError("Bulk cancel failed.");
    } finally {
      setBulkCancelPending(false);
    }
  }

  function exportCsv() {
    const rows = visibleBookings.map((b) => [
      b.id,
      b.status,
      b.user?.name ?? "",
      b.user?.email ?? "",
      b.bus ? `${b.bus.from} to ${b.bus.to}` : "",
      b.bus?.travelDate ?? "",
      b.bus?.departureTime ?? "",
      formatSeatList(b.seats),
      b.seats.length,
      b.totalPrice,
      formatPaymentMethod(b.paymentMethod),
      b.createdAt,
      b.cancelledAt ?? "",
    ]);
    const headers = [
      "BookingID","Status","CustomerName","CustomerEmail","Route","TravelDate",
      "DepartureTime","Seats","SeatCount","TotalPrice","PaymentMethod","BookedAt","CancelledAt",
    ];
    const escape = (v: any) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmBookingCancellation() {
    if (!bookingToCancel) {
      return;
    }

    setBookingCancelPending(true);
    try {
      const response = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: bookingCancellationReason.trim() || undefined }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        toastError(payload.message || "Unable to cancel the booking.");
        return;
      }
      toastSuccess("Booking cancelled successfully.");
      setBookingToCancel(null);
      setBookingCancellationReason("");
      if (selectedBooking?.id === bookingToCancel.id) setSelectedBooking(null);
      router.refresh();
    } catch {
      toastError("Unable to cancel the booking right now.");
    } finally {
      setBookingCancelPending(false);
    }
  }

  const [markPaidPending, setMarkPaidPending] = useState(false);

  async function markBookingPaid(bookingId: string) {
    setMarkPaidPending(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "paid" }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        toastError(payload.message || "Unable to update payment status.");
        return;
      }
      toastSuccess("Payment marked as collected.");
      setSelectedBooking((cur) => cur && cur.id === bookingId ? { ...cur, paymentStatus: "paid" } : cur);
      router.refresh();
    } catch {
      toastError("Unable to update payment status right now.");
    } finally {
      setMarkPaidPending(false);
    }
  }


  const calMonthName = new Date(calYear, calMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <div className="space-y-5">
        <Card className="border border-indigo-100/80 bg-white shadow-sm shadow-indigo-50/40">

          {/* ── Header ── */}
          <CardHeader className="border-b border-indigo-50 bg-slate-50/50 pb-0">
            <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                  <Ticket className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">Customer Bookings</CardTitle>
                  <CardDescription className="text-sm text-slate-500">Bookings calendar — click any day to see details</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { label: "Total",     value: String(bookings.length),              cls: "bg-slate-100 text-slate-700" },
                  { label: "Confirmed", value: String(confirmedBookings.length),     cls: "bg-emerald-100 text-emerald-700" },
                  { label: "Cancelled", value: String(cancelledBookings.length),     cls: "bg-red-100 text-red-600" },
                  { label: "Revenue",   value: formatCurrency(totalRevenue),         cls: "bg-indigo-100 text-indigo-700" },
                ] as const).map((k) => (
                  <div key={k.label} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${k.cls}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{k.label}</span>
                    <span className="text-base font-bold">{k.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="border-t border-indigo-50 pt-3 pb-4 space-y-2.5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input value={bookingQuery} onChange={(e) => setBookingQuery(e.target.value)}
                    placeholder="Search booking, passenger, route…"
                    className="h-9 rounded-xl border-indigo-100 bg-white pl-9 text-sm" />
                </div>
                <Select value={bookingStatusFilter} onValueChange={(v) => { if (v) setBookingStatusFilter(v); }}>
                  <SelectTrigger className="h-9 rounded-xl border-indigo-100 bg-white text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bookingRouteFilter} onValueChange={(v) => { if (v) setBookingRouteFilter(v); }}>
                  <SelectTrigger className="h-9 rounded-xl border-indigo-100 bg-white text-sm"><SelectValue placeholder="All routes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All routes</SelectItem>
                    {routes.map((r) => <SelectItem key={r.id} value={r.id}>{r.from} → {r.to}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Button type="button" size="sm" variant="outline"
                      className="h-9 flex-1 rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs"
                      disabled={bulkCancelPending} onClick={bulkCancel}>
                      <XCircle className="size-3.5" />{bulkCancelPending ? "Cancelling…" : `Cancel ${selectedIds.size}`}
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="outline"
                    className="h-9 flex-1 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs"
                    onClick={exportCsv} disabled={visibleBookings.length === 0}>
                    <Download className="size-3.5" />Export
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ── Calendar navigation ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-50 bg-white">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={prevMonth}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-base font-bold text-slate-900 min-w-[160px] text-center">{calMonthName}</span>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={nextMonth}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />Confirmed</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />Cancelled</span>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold" onClick={goToday}>
                  Today
                </Button>
              </div>
            </div>

            {/* ── Day-of-week headers ── */}
            <div className="grid grid-cols-7 border-b border-indigo-50">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 border-r border-slate-100 last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* ── Calendar grid ── */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const isSelected = selectedDay === day.iso;
                const isToday    = day.iso === today.toISOString().slice(0, 10);
                const hasBkg     = day.bookings.length > 0;
                return (
                  <div
                    key={day.iso}
                    onClick={() => setSelectedDay(isSelected ? null : day.iso)}
                    className={[
                      "min-h-[88px] p-1.5 border-b border-r border-slate-100 cursor-pointer transition-colors select-none",
                      idx % 7 === 6 ? "border-r-0" : "",
                      !day.isCurrentMonth ? "bg-slate-50/60" : "bg-white",
                      isSelected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400" : "hover:bg-indigo-50/40",
                    ].join(" ")}
                  >
                    {/* Day number */}
                    <div className={[
                      "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors",
                      isToday    ? "bg-indigo-600 text-white shadow-sm" :
                      isSelected ? "bg-indigo-100 text-indigo-700" :
                      day.isCurrentMonth ? "text-slate-800 hover:bg-slate-100" : "text-slate-300",
                    ].join(" ")}>
                      {day.date}
                    </div>

                    {/* Booking dots / pills */}
                    {hasBkg && (
                      <div className="space-y-0.5">
                        {day.confirmedCount > 0 && (
                          <div className="flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 overflow-hidden">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                            <span className="text-[10px] font-bold text-emerald-700 truncate">{day.confirmedCount} confirmed</span>
                          </div>
                        )}
                        {day.cancelledCount > 0 && (
                          <div className="flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 overflow-hidden">
                            <XCircle className="h-2.5 w-2.5 shrink-0 text-red-500" />
                            <span className="text-[10px] font-bold text-red-600 truncate">{day.cancelledCount} cancelled</span>
                          </div>
                        )}
                        {day.dayRevenue > 0 && (
                          <p className="truncate px-1 text-[10px] font-semibold text-indigo-600">{formatCurrency(day.dayRevenue)}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Selected day panel ── */}
            {selectedDay && (
              <div className="border-t border-slate-200">
                {/* Panel header */}
                <div className="flex items-center justify-between gap-3 border-b border-indigo-50 bg-slate-50/60 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 rounded-full bg-indigo-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedDayBookings.length} booking{selectedDayBookings.length !== 1 ? "s" : ""}
                        {selectedDayBookings.filter(b => b.status === "confirmed").length > 0 && (
                          <span className="ml-2 text-emerald-600 font-semibold">
                            · {formatCurrency(selectedDayBookings.filter(b => b.status === "confirmed").reduce((s, b) => s + b.totalPrice, 0))} revenue
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                    onClick={() => setSelectedDay(null)}>
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Booking rows */}
                {selectedDayBookings.length === 0 ? (
                  <div className="py-10 text-center">
                    <Ticket className="size-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No bookings on this day</p>
                  </div>
                ) : (
                  <div className="divide-y divide-indigo-50">
                    {selectedDayBookings.map((booking) => (
                      <div key={booking.id}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-indigo-50/40/60 ${selectedIds.has(booking.id) ? "bg-indigo-50/40" : ""}`}>
                        {/* Checkbox */}
                        <button type="button"
                          disabled={booking.status !== "confirmed"}
                          onClick={() => toggleRow(booking.id, booking.status)}
                          className="shrink-0 disabled:opacity-30">
                          {selectedIds.has(booking.id)
                            ? <CheckSquare className="size-4 text-indigo-600" />
                            : <Square className="size-4 text-slate-300" />}
                        </button>

                        {/* Info grid */}
                        <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-0.5 min-w-0 md:grid-cols-4">
                          <div>
                            <p className="font-mono text-xs font-semibold text-slate-700">{shortBookingId(booking.id)}</p>
                            <p className="text-[11px] text-slate-400">{passengerCountLabel(booking)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 truncate">{booking.user?.name || "Unknown"}</p>
                            <p className="text-[11px] text-slate-400 truncate">{booking.user?.email || "No email"}</p>
                          </div>
                          <div>
                            {booking.bus ? (
                              <>
                                <p className="text-sm font-semibold text-slate-800 truncate">{booking.bus.from} → {booking.bus.to}</p>
                                <p className="text-[11px] text-slate-400">{formatTravelDate(booking.bus.travelDate)} · {booking.bus.departureTime}</p>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Unavailable</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <StatusBadge status={booking.status} />
                            <span className="text-sm font-bold text-slate-900">{formatCurrency(booking.totalPrice)}</span>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">Payment</p>
                            <p className="text-sm font-semibold text-slate-700 truncate">{formatPaymentMethod(booking.paymentMethod)}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button type="button" size="sm" variant="outline"
                            className="h-7 rounded-lg px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-indigo-50/40"
                            onClick={() => setSelectedBooking(booking)}>
                            <Eye className="size-3.5 mr-1" />Details
                          </Button>
                          <Link href={`/booking/confirmation/${booking.id}`}
                            className="inline-flex h-7 items-center rounded-lg border border-indigo-100 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-indigo-50/40 transition-colors">
                            <Ticket className="size-3.5 mr-1" />Ticket
                          </Link>
                          <Button type="button" size="sm" variant="outline"
                            className="h-7 rounded-lg px-2.5 text-xs border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-30"
                            disabled={booking.status !== "confirmed"}
                            onClick={() => { setBookingToCancel(booking); setBookingCancellationReason(""); }}>
                            <XCircle className="size-3.5 mr-1" />Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl p-0 gap-0 border border-indigo-100 bg-white shadow-2xl rounded-2xl">
          {selectedBooking ? (
            <>
              {/* ── Dialog Header ── */}
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-indigo-50 bg-slate-50/60 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                    <Ticket className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900">Booking Details</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      ID: <span className="font-mono font-semibold text-slate-700">{selectedBooking.id}</span>
                    </DialogDescription>
                  </div>
                </div>
                <StatusBadge status={selectedBooking.status} />
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* ── Summary row ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: selectedBooking.paymentStatus === "pending" ? "Amount Due" : "Total Paid", value: formatCurrency(selectedBooking.totalPrice), cls: "bg-indigo-50 text-indigo-700" },
                    { label: "Seats",       value: `${selectedBooking.seats.length} seat${selectedBooking.seats.length !== 1 ? "s" : ""}`, cls: "bg-slate-100 text-slate-700" },
                    { label: "Booked On",   value: formatDateTime(selectedBooking.createdAt),   cls: "bg-slate-100 text-slate-700" },
                    { label: "Payment",     value: formatPaymentMethod(selectedBooking.paymentMethod), cls: selectedBooking.paymentStatus === "pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700" },
                    { label: "Status",      value: selectedBooking.status === "confirmed" ? "Active" : "Cancelled", cls: selectedBooking.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600" },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl px-3 py-2.5 ${item.cls}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{item.label}</p>
                      <p className="text-sm font-bold mt-0.5 leading-tight">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Customer & Trip ── */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Customer */}
                  <div className="rounded-xl border border-indigo-100/80 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-indigo-50">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Customer</p>
                    </div>
                    <div className="px-4 py-3 space-y-1.5">
                      <p className="text-sm font-bold text-slate-900">{selectedBooking.user?.name || "Unknown customer"}</p>
                      <p className="text-xs text-slate-500">{selectedBooking.user?.email || "No email on file"}</p>
                      <p className="text-xs text-slate-500">{passengerCountLabel(selectedBooking)}</p>
                    </div>
                  </div>

                  {/* Trip */}
                  <div className="rounded-xl border border-indigo-100/80 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-indigo-50">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Trip</p>
                    </div>
                    <div className="px-4 py-3 space-y-1.5">
                      {selectedBooking.bus ? (
                        <>
                          <p className="text-sm font-bold text-slate-900">{selectedBooking.bus.from} → {selectedBooking.bus.to}</p>
                          <p className="text-xs text-slate-500">{formatTravelDate(selectedBooking.bus.travelDate)} · {selectedBooking.bus.departureTime} – {selectedBooking.bus.arrivalTime}</p>
                          <p className="text-xs text-slate-500">{formatBusType(selectedBooking.bus.busType)} · {selectedBooking.bus.duration}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Bus details unavailable</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Seats ── */}
                <div className="rounded-xl border border-indigo-100/80 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-indigo-50 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reserved Seats</p>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-0.5">{selectedBooking.seats.length}</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBooking.seats.map((seat) => (
                        <span key={seat} className="inline-flex items-center rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">{seat}</span>
                      ))}
                    </div>
                    {selectedBooking.cancellationReason && (
                      <p className="mt-2.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        <span className="font-semibold">Cancellation reason:</span> {selectedBooking.cancellationReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Passengers ── */}
                <div className="rounded-xl border border-indigo-100/80 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-indigo-50 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Passengers</p>
                    <Badge variant="outline" className="text-xs">
                      {selectedBooking.passengers.length || selectedBooking.seats.length} listed
                    </Badge>
                  </div>
                  {selectedBooking.passengers.length > 0 ? (
                    <div className="divide-y divide-indigo-50">
                      {selectedBooking.passengers.map((passenger, index) => (
                        <div key={`${selectedBooking.id}-${index}`} className="flex items-center justify-between px-4 py-3 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{passenger.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{passenger.gender} · Age {passenger.age}</p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>{passenger.contactNumber}</p>
                            <p>{passenger.email || "No email"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-5 text-sm text-slate-500 bg-slate-50/50 text-center">
                      No passenger details saved for this booking.
                    </div>
                  )}
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-indigo-50 bg-slate-50/40 rounded-b-2xl">
                <Link
                  href={`/booking/confirmation/${selectedBooking.id}`}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-indigo-100/80 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-indigo-50/40 transition-colors"
                >
                  <Ticket className="size-4" />View Ticket
                </Link>
                <div className="flex items-center gap-2">
                  {selectedBooking.status === "confirmed" && selectedBooking.paymentStatus === "pending" && (
                    <Button type="button"
                      className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-40"
                      disabled={markPaidPending}
                      onClick={() => markBookingPaid(selectedBooking.id)}>
                      <CheckCircle2 className="size-4" />{markPaidPending ? "Updating…" : "Mark as Paid"}
                    </Button>
                  )}
                  <Button type="button" variant="outline"
                    className="h-9 rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-sm disabled:opacity-40"
                    disabled={selectedBooking.status !== "confirmed"}
                    onClick={() => { setBookingToCancel(selectedBooking); setBookingCancellationReason(""); }}>
                    <XCircle className="size-4" />Cancel Booking
                  </Button>
                  <Button type="button" variant="outline" className="h-9 rounded-xl text-sm"
                    onClick={() => setSelectedBooking(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(bookingToCancel)}
        onOpenChange={(open) => {
          if (!open) {
            setBookingToCancel(null);
            setBookingCancellationReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg border-2 border-red-200/70 bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Cancel Booking</DialogTitle>
            <DialogDescription>
              {bookingToCancel
                ? `Cancel booking ${shortBookingId(bookingToCancel.id)} for ${bookingToCancel.user?.name || "this customer"}?`
                : "Cancel this booking?"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="booking-cancel-reason" className="text-sm font-semibold">
              Cancellation reason
            </Label>
            <Textarea
              id="booking-cancel-reason"
              value={bookingCancellationReason}
              onChange={(event) => setBookingCancellationReason(event.target.value)}
              placeholder="Optional note for why this booking is being cancelled"
              className="min-h-24 rounded-xl border-red-200/70 bg-white"
            />
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setBookingToCancel(null);
                setBookingCancellationReason("");
              }}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={bookingCancelPending}
              onClick={confirmBookingCancellation}
            >
              {bookingCancelPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p key={`${title}-${line}`} className="text-sm text-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

type CalendarDay = {
  iso: string;
  date: number;
  isCurrentMonth: boolean;
  bookings: AdminBookingSummary[];
  confirmedCount: number;
  cancelledCount: number;
  dayRevenue: number;
};

function buildCalendarDays(
  year: number,
  month: number,
  bookingsByDate: Record<string, AdminBookingSummary[]>,
): CalendarDay[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Padding from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear  = month === 0 ? year - 1 : year;
    const iso = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ iso, date: d, isCurrentMonth: false, bookings: [], confirmedCount: 0, cancelledCount: 0, dayRevenue: 0 });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const bkgs = bookingsByDate[iso] ?? [];
    const confirmed  = bkgs.filter((b) => b.status === "confirmed");
    const cancelled  = bkgs.filter((b) => b.status === "cancelled");
    const dayRevenue = confirmed.reduce((s, b) => s + b.totalPrice, 0);
    days.push({ iso, date: d, isCurrentMonth: true, bookings: bkgs, confirmedCount: confirmed.length, cancelledCount: cancelled.length, dayRevenue });
  }

  // Padding to fill last row (total must be multiple of 7)
  const remainder = days.length % 7;
  if (remainder !== 0) {
    const toAdd = 7 - remainder;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear  = month === 11 ? year + 1 : year;
    for (let d = 1; d <= toAdd; d++) {
      const iso = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ iso, date: d, isCurrentMonth: false, bookings: [], confirmedCount: 0, cancelledCount: 0, dayRevenue: 0 });
    }
  }

  return days;
}
