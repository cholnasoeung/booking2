"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import {
  RotateCcw, Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, DollarSign, TrendingDown,
  AlertTriangle, BadgeCheck, Eye, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmAction } from "@/lib/swal";

type RefundStatus = "pending" | "processed" | "failed";

type RefundRecord = {
  id: string; shortId: string;
  userId: string | null; userName: string; userEmail: string; userPhone: string | null;
  routeFrom: string; routeTo: string;
  busDate: string | null; departureTime: string | null;
  seats: string[]; seatCount: number;
  finalPrice: number; discountAmount: number; refundAmount: number;
  refundStatus: RefundStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  status: string; paymentStatus: string;
  createdAt: string; updatedAt: string;
};

type Summary = {
  total: number;
  pending: number;       pendingAmount: number;
  processed: number;     processedAmount: number;
  failed: number;        failedAmount: number;
};

const REFUND_STATUS: Record<RefundStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:   { label: "Pending",   color: "text-amber-700",  bg: "bg-amber-100  border border-amber-300",  icon: Clock        },
  processed: { label: "Processed", color: "text-emerald-700",bg: "bg-emerald-100 border border-emerald-300",icon: BadgeCheck   },
  failed:    { label: "Failed",    color: "text-red-700",    bg: "bg-red-100    border border-red-300",     icon: XCircle      },
};

const fmt   = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";

export default function AdminRefundTab() {
  const [records,    setRecords]    = useState<RefundRecord[]>([]);
  const [summary,    setSummary]    = useState<Summary>({ total: 0, pending: 0, pendingAmount: 0, processed: 0, processedAmount: 0, failed: 0, failedAmount: 0 });
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [viewOpen,   setViewOpen]   = useState(false);
  const [viewTarget, setViewTarget] = useState<RefundRecord | null>(null);
  const [adminNote,  setAdminNote]  = useState("");
  const [isPending,  startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page) });
      if (search)       q.set("search",       search);
      if (statusFilter) q.set("refundStatus", statusFilter);
      const res  = await fetch(`/api/admin/refunds?${q}`);
      const data = await res.json();
      setRecords(data.bookings   ?? []);
      setSummary(data.summary    ?? {});
      setTotal(data.total        ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch { /* swallow */ } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openView = (rec: RefundRecord) => {
    setViewTarget(rec);
    setAdminNote("");
    setViewOpen(true);
  };

  const processRefund = async (rec: RefundRecord, newStatus: RefundStatus) => {
    const isProcess = newStatus === "processed";
    const confirmed = await confirmAction(
      isProcess ? "Process Refund" : "Mark as Failed",
      isProcess
        ? `Confirm refund of ${fmt(rec.refundAmount)} to ${rec.userName}? This cannot be undone.`
        : `Mark the refund for ${rec.userName} as failed?`,
      isProcess ? "Yes, Process" : "Mark Failed"
    );
    if (!confirmed) return;

    startTransition(async () => {
      await fetch(`/api/admin/refunds/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundStatus: newStatus, adminNote: adminNote || undefined }),
      });
      setViewOpen(false);
      fetchData();
    });
  };

  const quickProcess = async (rec: RefundRecord, newStatus: RefundStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const isProcess = newStatus === "processed";
    const confirmed = await confirmAction(
      isProcess ? "Process Refund" : "Mark as Failed",
      isProcess
        ? `Confirm refund of ${fmt(rec.refundAmount)} to ${rec.userName}?`
        : `Mark refund for ${rec.userName} as failed?`,
      isProcess ? "Yes, Process" : "Mark Failed"
    );
    if (!confirmed) return;
    startTransition(async () => {
      await fetch(`/api/admin/refunds/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundStatus: newStatus }),
      });
      fetchData();
    });
  };

  const totalPending = summary.pendingAmount + summary.failedAmount;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200">
            <RotateCcw className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Refund Management</h2>
            <p className="text-xs text-slate-500">{summary.pending} pending · {fmt(summary.pendingAmount)} awaiting</p>
          </div>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="text-slate-500 border-slate-200 hover:bg-slate-50"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending count */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 shadow-md shadow-amber-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Clock className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Pending</span>
          </div>
          <div className="text-4xl font-black text-white">{summary.pending}</div>
          <p className="text-sm font-semibold text-white/80 mt-1">{fmt(summary.pendingAmount)}</p>
        </div>

        {/* Total awaiting payout */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-5 shadow-md shadow-rose-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <TrendingDown className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Unresolved</span>
          </div>
          <div className="text-3xl font-black text-white">{fmt(totalPending)}</div>
          <p className="text-xs text-white/70 mt-1">total to resolve</p>
        </div>

        {/* Processed */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 shadow-md shadow-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <BadgeCheck className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Processed</span>
          </div>
          <div className="text-4xl font-black text-white">{summary.processed}</div>
          <p className="text-sm font-semibold text-white/80 mt-1">{fmt(summary.processedAmount)}</p>
        </div>

        {/* Failed */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 p-5 shadow-md shadow-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <AlertTriangle className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Failed</span>
          </div>
          <div className="text-4xl font-black text-white">{summary.failed}</div>
          <p className="text-sm font-semibold text-white/80 mt-1">{fmt(summary.failedAmount)}</p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by customer name, email, route…"
            className="pl-9 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
          />
        </div>
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {[
            { key: "",          label: "All" },
            { key: "pending",   label: `Pending (${summary.pending})` },
            { key: "processed", label: `Processed (${summary.processed})` },
            { key: "failed",    label: `Failed (${summary.failed})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                statusFilter === tab.key
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 animate-pulse">Loading refunds…</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mx-auto mb-4">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <p className="text-base font-semibold text-slate-700">No refunds found.</p>
          <p className="text-sm mt-1 text-slate-500">
            {statusFilter === "pending" ? "All pending refunds have been resolved." : "No refunds match this filter."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[920px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Booking", "Customer", "Route / Date", "Seats", "Paid", "Refund", "Reason", "Status", "Cancelled", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3.5 text-left text-[10px] uppercase tracking-wider text-slate-500 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => {
                  const st = REFUND_STATUS[rec.refundStatus] ?? REFUND_STATUS.pending;
                  const SIcon = st.icon;
                  const isPending = rec.refundStatus === "pending";
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Booking ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          #{rec.shortId}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <p className="text-slate-800 font-semibold">{rec.userName}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{rec.userEmail}</p>
                      </td>

                      {/* Route / Date */}
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700 font-medium text-xs">
                          {rec.routeFrom} → {rec.routeTo}
                        </p>
                        {rec.busDate && (
                          <p className="text-[11px] text-slate-400">
                            {fmtDt(rec.busDate)}{rec.departureTime ? ` · ${rec.departureTime}` : ""}
                          </p>
                        )}
                      </td>

                      {/* Seats */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[80px]">
                          {rec.seats.slice(0, 3).map(s => (
                            <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{s}</span>
                          ))}
                          {rec.seats.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{rec.seats.length - 3}</span>
                          )}
                        </div>
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700 font-mono font-medium">{fmt(rec.finalPrice)}</p>
                        {rec.discountAmount > 0 && (
                          <p className="text-[11px] text-slate-400">-{fmt(rec.discountAmount)} disc.</p>
                        )}
                      </td>

                      {/* Refund */}
                      <td className="px-4 py-3.5">
                        <p className={cn(
                          "font-mono font-bold text-sm",
                          rec.refundStatus === "processed" ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {fmt(rec.refundAmount)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {Math.round((rec.refundAmount / rec.finalPrice) * 100)}% back
                        </p>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-slate-500 max-w-[140px] truncate">
                          {rec.cancellationReason ?? "—"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", st.bg, st.color)}>
                          <SIcon className="size-3" />
                          {st.label}
                        </span>
                      </td>

                      {/* Cancelled On */}
                      <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {fmtDt(rec.cancelledAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openView(rec)}
                            className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            title="View details"
                          >
                            <Eye className="size-4" />
                          </button>
                          {isPending && (
                            <>
                              <button
                                onClick={e => quickProcess(rec, "processed", e)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-semibold transition-colors"
                                title="Mark as processed"
                              >
                                <CheckCircle2 className="size-3.5" /> Process
                              </button>
                              <button
                                onClick={e => quickProcess(rec, "failed", e)}
                                className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Mark as failed"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{total} refunds — page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center justify-center size-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center justify-center size-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Detail / Action Dialog ──────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        {viewTarget && (() => {
          const st     = REFUND_STATUS[viewTarget.refundStatus] ?? REFUND_STATUS.pending;
          const SIcon  = st.icon;
          const isPend = viewTarget.refundStatus === "pending";
          return (
            <DialogContent className="sm:max-w-lg bg-white border-slate-200 text-slate-800">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-slate-800">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
                    <RotateCcw className="size-4 text-rose-600" />
                  </div>
                  Refund Details
                  <span className="font-mono text-slate-400 text-sm font-normal">#{viewTarget.shortId}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  Cancelled on {fmtDt(viewTarget.cancelledAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-1">
                {/* Customer */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-sm font-bold">
                      {viewTarget.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-slate-800 font-semibold">{viewTarget.userName}</p>
                      <p className="text-xs text-slate-500">{viewTarget.userEmail}</p>
                      {viewTarget.userPhone && <p className="text-xs text-slate-500">{viewTarget.userPhone}</p>}
                    </div>
                  </div>
                </div>

                {/* Trip */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip</p>
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                    <div><span className="text-slate-400">Route:</span><span className="text-slate-700 ml-1 font-medium">{viewTarget.routeFrom} → {viewTarget.routeTo}</span></div>
                    <div><span className="text-slate-400">Date:</span><span className="text-slate-700 ml-1 font-medium">{fmtDt(viewTarget.busDate)}</span></div>
                    <div><span className="text-slate-400">Seats:</span><span className="text-slate-700 ml-1 font-medium font-mono">{viewTarget.seats.join(", ")}</span></div>
                  </div>
                </div>

                {/* Financials */}
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-3">Refund Summary</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Paid</p>
                      <p className="text-base font-bold text-slate-700 font-mono">{fmt(viewTarget.finalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Refund</p>
                      <p className="text-base font-bold text-rose-600 font-mono">{fmt(viewTarget.refundAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">% Back</p>
                      <p className="text-base font-bold text-slate-700">
                        {Math.round((viewTarget.refundAmount / viewTarget.finalPrice) * 100)}%
                      </p>
                    </div>
                  </div>
                  {viewTarget.cancellationReason && (
                    <p className="mt-3 text-xs text-slate-500 border-t border-rose-200 pt-2">
                      <span className="font-semibold text-slate-600">Reason:</span> {viewTarget.cancellationReason}
                    </p>
                  )}
                </div>

                {/* Current status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Current status:</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", st.bg, st.color)}>
                    <SIcon className="size-3" />
                    {st.label}
                  </span>
                </div>

                {/* Admin note */}
                {isPend && (
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 text-xs font-semibold">Admin Note (optional)</Label>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Transaction ID, notes for records…"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setViewOpen(false)} className="text-slate-600 border-slate-200">
                  Close
                </Button>
                {isPend && (
                  <>
                    <Button
                      onClick={() => processRefund(viewTarget, "failed")}
                      disabled={isPending}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                    >
                      <XCircle className="size-4" /> Mark Failed
                    </Button>
                    <Button
                      onClick={() => processRefund(viewTarget, "processed")}
                      disabled={isPending}
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white gap-1.5"
                    >
                      <BadgeCheck className="size-4" />
                      {isPending ? "Processing…" : `Process ${fmt(viewTarget.refundAmount)}`}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
