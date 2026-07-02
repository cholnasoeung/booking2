"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import {
  PackageSearch, Plus, Search, RefreshCw, ChevronLeft, ChevronRight,
  Eye, Trash2, Smartphone, FileText, Key, Gem, Banknote, HelpCircle,
  ShoppingBag, Package, CheckCircle, Clock, AlertCircle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { confirmDelete } from "@/lib/utils/swal";

type LFStatus   = "reported" | "under_review" | "found" | "returned" | "not_found" | "closed";
type LFCategory = "bag" | "electronics" | "clothing" | "documents" | "jewelry" | "money" | "keys" | "other";

type LFRecord = {
  id: string; refNumber: string;
  reportedBy: string | null;
  reporterName: string; reporterEmail: string; reporterPhone: string | null;
  bookingId: string | null; busLabel: string | null; routeLabel: string | null;
  travelDate: string | null; seatNumber: string | null;
  itemName: string; itemCategory: LFCategory; itemDescription: string;
  color: string | null; brand: string | null; lastSeenLocation: string | null;
  status: LFStatus; adminNotes: string | null;
  foundLocation: string | null; handledBy: string | null; returnedAt: string | null;
  createdAt: string; updatedAt: string;
};

type Summary = {
  total: number; reported: number; under_review: number;
  found: number; returned: number; not_found: number; closed: number;
};

const STATUS_MAP: Record<LFStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  reported:     { label: "Reported",     color: "text-indigo-700", bg: "bg-indigo-100  border border-indigo-300",  icon: AlertCircle },
  under_review: { label: "Under Review", color: "text-amber-700",  bg: "bg-amber-100   border border-amber-300",   icon: Clock       },
  found:        { label: "Found",        color: "text-teal-700",   bg: "bg-teal-100    border border-teal-300",    icon: CheckCircle },
  returned:     { label: "Returned",     color: "text-emerald-700",bg: "bg-emerald-100 border border-emerald-300", icon: CheckCircle },
  not_found:    { label: "Not Found",    color: "text-red-700",    bg: "bg-red-100     border border-red-300",     icon: XCircle     },
  closed:       { label: "Closed",       color: "text-slate-600",  bg: "bg-slate-100   border border-slate-300",   icon: XCircle     },
};

const CATEGORY_MAP: Record<LFCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  bag:         { label: "Bag / Luggage",  icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-100" },
  electronics: { label: "Electronics",   icon: Smartphone,  color: "text-blue-600",   bg: "bg-blue-100"   },
  clothing:    { label: "Clothing",       icon: Package,     color: "text-purple-600", bg: "bg-purple-100" },
  documents:   { label: "Documents",     icon: FileText,    color: "text-yellow-700", bg: "bg-yellow-100" },
  jewelry:     { label: "Jewelry",        icon: Gem,         color: "text-pink-600",   bg: "bg-pink-100"   },
  money:       { label: "Money / Cards", icon: Banknote,    color: "text-green-600",  bg: "bg-green-100"  },
  keys:        { label: "Keys",           icon: Key,         color: "text-amber-700",  bg: "bg-amber-100"  },
  other:       { label: "Other",          icon: HelpCircle,  color: "text-slate-500",  bg: "bg-slate-100"  },
};

const ALL_STATUSES: LFStatus[] = ["reported", "under_review", "found", "returned", "not_found", "closed"];
const ALL_CATS = Object.keys(CATEGORY_MAP) as LFCategory[];

const emptyForm = {
  reporterName: "", reporterEmail: "", reporterPhone: "",
  bookingId: "", travelDate: "", seatNumber: "",
  itemName: "", itemCategory: "bag" as LFCategory,
  itemDescription: "", color: "", brand: "", lastSeenLocation: "",
};

const emptyEdit = {
  status: "reported" as LFStatus,
  adminNotes: "", foundLocation: "", handledBy: "", bookingId: "",
};

export default function AdminLostFoundTab() {
  const [records,    setRecords]    = useState<LFRecord[]>([]);
  const [summary,    setSummary]    = useState<Summary>({ total: 0, reported: 0, under_review: 0, found: 0, returned: 0, not_found: 0, closed: 0 });
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search,     setSearch]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [addOpen,    setAddOpen]    = useState(false);
  const [viewOpen,   setViewOpen]   = useState(false);
  const [viewTarget, setViewTarget] = useState<LFRecord | null>(null);
  const [form,       setForm]       = useState(emptyForm);
  const [editForm,   setEditForm]   = useState(emptyEdit);
  const [formErr,    setFormErr]    = useState("");
  const [isPending,  startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page) });
      if (search)         q.set("search",   search);
      if (statusFilter)   q.set("status",   statusFilter);
      if (categoryFilter) q.set("category", categoryFilter);
      const res  = await fetch(`/api/admin/lost-found?${q}`);
      const data = await res.json();
      setRecords(data.records    ?? []);
      setSummary(data.summary    ?? {});
      setTotal(data.total        ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch { /* swallow */ } finally { setLoading(false); }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setF = (key: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const handleAddSubmit = () => {
    setFormErr("");
    if (!form.reporterName.trim() || !form.reporterEmail.trim() || !form.itemName.trim() || !form.itemDescription.trim()) {
      setFormErr("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/lost-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bookingId:  form.bookingId.trim() || undefined,
          travelDate: form.travelDate       || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.message ?? "Error"); return; }
      setAddOpen(false);
      setForm(emptyForm);
      fetchData();
    });
  };

  const openView = (rec: LFRecord) => {
    setViewTarget(rec);
    setEditForm({
      status:        rec.status,
      adminNotes:    rec.adminNotes    ?? "",
      foundLocation: rec.foundLocation ?? "",
      handledBy:     rec.handledBy     ?? "",
      bookingId:     rec.bookingId     ?? "",
    });
    setFormErr("");
    setViewOpen(true);
  };

  const handleEditSave = () => {
    if (!viewTarget) return;
    setFormErr("");
    startTransition(async () => {
      const res = await fetch(`/api/admin/lost-found/${viewTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:        editForm.status,
          adminNotes:    editForm.adminNotes    || undefined,
          foundLocation: editForm.foundLocation || undefined,
          handledBy:     editForm.handledBy     || undefined,
          bookingId:     editForm.bookingId     || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.message ?? "Error"); return; }
      setViewOpen(false);
      fetchData();
    });
  };

  const handleDelete = async (rec: LFRecord) => {
    if (!(await confirmDelete(`report ${rec.refNumber}`))) return;
    startTransition(async () => {
      await fetch(`/api/admin/lost-found/${rec.id}`, { method: "DELETE" });
      fetchData();
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-200">
            <PackageSearch className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Lost &amp; Found</h2>
            <p className="text-xs text-slate-500">{total} report{total !== 1 ? "s" : ""} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="text-slate-500 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            onClick={() => { setForm(emptyForm); setFormErr(""); setAddOpen(true); }}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow-md shadow-indigo-100 gap-2"
          >
            <Plus className="size-4" /> New Report
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 shadow-md shadow-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <PackageSearch className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Total</span>
          </div>
          <div className="text-4xl font-black text-white">{summary.total}</div>
          <p className="text-xs text-white/70 mt-1">all reports</p>
        </div>

        {/* Pending */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 shadow-md shadow-amber-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Clock className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Pending</span>
          </div>
          <div className="text-4xl font-black text-white">{summary.reported + summary.under_review}</div>
          <div className="flex gap-2 mt-1.5 text-[10px] font-semibold">
            <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-white">{summary.reported} new</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-white">{summary.under_review} reviewing</span>
          </div>
        </div>

        {/* Found */}
        <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-5 shadow-md shadow-teal-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <CheckCircle className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Found</span>
          </div>
          <div className="text-4xl font-black text-white">{summary.found}</div>
          <p className="text-xs text-white/70 mt-1">items recovered</p>
        </div>

        {/* Returned */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 shadow-md shadow-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <CheckCircle className="size-5 text-white" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Returned</span>
          </div>
          <div className="text-4xl font-black text-white">{summary.returned}</div>
          <p className="text-xs text-white/70 mt-1">back to owners</p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search ref#, item name, reporter…"
            className="pl-9 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-teal-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_MAP[s].label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
        >
          <option value="">All Categories</option>
          {ALL_CATS.map(c => (
            <option key={c} value={c}>{CATEGORY_MAP[c].label}</option>
          ))}
        </select>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 animate-pulse">Loading reports…</div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/60 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 mx-auto mb-4">
            <PackageSearch className="size-8 text-teal-500" />
          </div>
          <p className="text-base font-semibold text-slate-700">No lost &amp; found reports yet.</p>
          <p className="text-sm mt-1 text-slate-500">Click "New Report" to log a lost item.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Ref #", "Item", "Reporter", "Trip Info", "Last Seen", "Status", "Reported On", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3.5 text-left text-[10px] uppercase tracking-wider text-slate-500 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => {
                  const status   = STATUS_MAP[rec.status];
                  const category = CATEGORY_MAP[rec.itemCategory];
                  const CatIcon  = category.icon;
                  const SIcon    = status.icon;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-teal-600 font-bold">{rec.refNumber}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", category.bg)}>
                            <CatIcon className={cn("size-4", category.color)} />
                          </div>
                          <div>
                            <p className="text-slate-800 font-semibold">{rec.itemName}</p>
                            <p className="text-[11px] text-slate-400">{category.label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700 font-medium">{rec.reporterName}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{rec.reporterEmail}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {rec.routeLabel
                          ? <p className="text-slate-700 text-xs font-medium">{rec.routeLabel}</p>
                          : <p className="text-slate-300 text-xs">—</p>}
                        {rec.travelDate && (
                          <p className="text-[11px] text-slate-400">{new Date(rec.travelDate).toLocaleDateString()}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-600 text-xs">{rec.lastSeenLocation ?? "—"}</p>
                        {rec.seatNumber && (
                          <p className="text-[11px] text-slate-400">Seat: {rec.seatNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", status.bg, status.color)}>
                          <SIcon className="size-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openView(rec)}
                            className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
                            title="View / Edit"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec)}
                            className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
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
              <p className="text-xs text-slate-500">{total} reports — page {page} of {totalPages}</p>
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

      {/* ── Add Report Dialog ───────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl bg-white border-slate-200 text-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100">
                <PackageSearch className="size-4 text-teal-600" />
              </div>
              New Lost Item Report
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Log a passenger's lost item and link it to their trip
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Reporter */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reporter Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Full Name <span className="text-red-500">*</span></Label>
                  <Input value={form.reporterName} onChange={setF("reporterName")} placeholder="Passenger name" className="bg-white border-slate-200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Email <span className="text-red-500">*</span></Label>
                  <Input type="email" value={form.reporterEmail} onChange={setF("reporterEmail")} placeholder="email@example.com" className="bg-white border-slate-200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Phone</Label>
                  <Input value={form.reporterPhone} onChange={setF("reporterPhone")} placeholder="+855 xx xxx xxx" className="bg-white border-slate-200" />
                </div>
              </div>
            </div>

            {/* Trip */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Trip Info <span className="text-slate-400 normal-case font-normal">(optional)</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Booking ID</Label>
                  <Input value={form.bookingId} onChange={setF("bookingId")} placeholder="MongoDB ObjectId" className="bg-white border-slate-200 font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Travel Date</Label>
                  <Input type="date" value={form.travelDate} onChange={setF("travelDate")} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Seat Number</Label>
                  <Input value={form.seatNumber} onChange={setF("seatNumber")} placeholder="e.g. A12" className="bg-white border-slate-200" />
                </div>
              </div>
            </div>

            {/* Item */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Item Name <span className="text-red-500">*</span></Label>
                  <Input value={form.itemName} onChange={setF("itemName")} placeholder="e.g. Blue backpack" className="bg-white border-slate-200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Category <span className="text-red-500">*</span></Label>
                  <select
                    value={form.itemCategory}
                    onChange={setF("itemCategory")}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                  >
                    {ALL_CATS.map(c => (
                      <option key={c} value={c}>{CATEGORY_MAP[c].label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Color</Label>
                  <Input value={form.color} onChange={setF("color")} placeholder="e.g. Blue" className="bg-white border-slate-200" />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Brand / Model</Label>
                  <Input value={form.brand} onChange={setF("brand")} placeholder="e.g. Samsonite" className="bg-white border-slate-200" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Description <span className="text-red-500">*</span></Label>
                  <textarea
                    value={form.itemDescription}
                    onChange={setF("itemDescription")}
                    rows={2}
                    placeholder="Detailed description of the item…"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-slate-600 text-xs font-semibold">Last Seen Location</Label>
                  <Input value={form.lastSeenLocation} onChange={setF("lastSeenLocation")} placeholder="e.g. Overhead rack row 5, under seat" className="bg-white border-slate-200" />
                </div>
              </div>
            </div>
          </div>

          {formErr && <p className="text-sm text-red-600 mt-1">{formErr}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="text-slate-600 border-slate-200">Cancel</Button>
            <Button
              onClick={handleAddSubmit}
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
            >
              {isPending ? "Saving…" : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View / Edit Dialog ──────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        {viewTarget && (() => {
          const category = CATEGORY_MAP[viewTarget.itemCategory];
          const CatIcon  = category.icon;
          return (
            <DialogContent className="sm:max-w-2xl bg-white border-slate-200 text-slate-800 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5 text-slate-800">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", category.bg)}>
                    <CatIcon className={cn("size-4", category.color)} />
                  </div>
                  <span className="font-mono text-teal-600 font-bold">{viewTarget.refNumber}</span>
                  <span className="text-slate-400 text-sm font-normal truncate">— {viewTarget.itemName}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  {category.label} · Reported {new Date(viewTarget.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Reporter */}
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Reporter</p>
                    <p className="text-slate-800 font-semibold">{viewTarget.reporterName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-slate-600 break-all text-xs">{viewTarget.reporterEmail}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-slate-600">{viewTarget.reporterPhone ?? "—"}</p>
                  </div>
                </div>

                {/* Item */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Item Details</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div><span className="text-slate-400">Color:</span><span className="text-slate-700 ml-1 font-medium">{viewTarget.color ?? "—"}</span></div>
                    <div><span className="text-slate-400">Brand:</span><span className="text-slate-700 ml-1 font-medium">{viewTarget.brand ?? "—"}</span></div>
                    <div><span className="text-slate-400">Seat:</span><span className="text-slate-700 ml-1 font-medium">{viewTarget.seatNumber ?? "—"}</span></div>
                    <div><span className="text-slate-400">Last seen:</span><span className="text-slate-700 ml-1 font-medium">{viewTarget.lastSeenLocation ?? "—"}</span></div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Description:</span>
                      <p className="text-slate-700 mt-0.5">{viewTarget.itemDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Trip */}
                {(viewTarget.routeLabel || viewTarget.travelDate || viewTarget.bookingId) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trip Info</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      {viewTarget.routeLabel && <div><span className="text-slate-400">Route:</span><span className="text-slate-700 ml-1 font-medium">{viewTarget.routeLabel}</span></div>}
                      {viewTarget.travelDate && <div><span className="text-slate-400">Date:</span><span className="text-slate-700 ml-1 font-medium">{new Date(viewTarget.travelDate).toLocaleDateString()}</span></div>}
                      {viewTarget.bookingId  && (
                        <div className="col-span-2">
                          <span className="text-slate-400">Booking:</span>
                          <span className="text-teal-600 font-mono text-xs ml-1">{viewTarget.bookingId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Admin Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-slate-600 text-xs font-semibold">Status</Label>
                      <select
                        value={editForm.status}
                        onChange={e => setEditForm(p => ({ ...p, status: e.target.value as LFStatus }))}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_MAP[s].label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-600 text-xs font-semibold">Handled By</Label>
                      <Input
                        value={editForm.handledBy}
                        onChange={e => setEditForm(p => ({ ...p, handledBy: e.target.value }))}
                        placeholder="Staff name"
                        className="bg-white border-slate-200"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-slate-600 text-xs font-semibold">Found Location</Label>
                      <Input
                        value={editForm.foundLocation}
                        onChange={e => setEditForm(p => ({ ...p, foundLocation: e.target.value }))}
                        placeholder="Where was the item recovered?"
                        className="bg-white border-slate-200"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-slate-600 text-xs font-semibold">Link to Booking ID</Label>
                      <Input
                        value={editForm.bookingId}
                        onChange={e => setEditForm(p => ({ ...p, bookingId: e.target.value }))}
                        placeholder="Paste booking ObjectId to link"
                        className="bg-white border-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-slate-600 text-xs font-semibold">Admin Notes</Label>
                      <textarea
                        value={editForm.adminNotes}
                        onChange={e => setEditForm(p => ({ ...p, adminNotes: e.target.value }))}
                        rows={3}
                        placeholder="Internal notes about this report…"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                      />
                    </div>
                  </div>

                  {viewTarget.returnedAt && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Returned on {new Date(viewTarget.returnedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {formErr && <p className="text-sm text-red-600">{formErr}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewOpen(false)} className="text-slate-600 border-slate-200">Close</Button>
                <Button
                  onClick={handleEditSave}
                  disabled={isPending}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
                >
                  {isPending ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
