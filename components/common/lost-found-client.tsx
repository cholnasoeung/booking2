"use client";

import { useState, useTransition } from "react";
import {
  PackageSearch, Plus, X, CheckCircle2, Clock, Search,
  RefreshCw, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LFStatus = "reported" | "under_review" | "found" | "returned" | "not_found" | "closed";
type LFCategory =
  | "bag" | "electronics" | "clothing" | "documents"
  | "jewelry" | "money" | "keys" | "other";

type LFRecord = {
  id: string; refNumber: string;
  itemName: string; itemCategory: LFCategory;
  status: LFStatus; adminNotes: string | null;
  returnedAt: string | null; createdAt: string;
};

const CATEGORIES: { value: LFCategory; label: string; emoji: string }[] = [
  { value: "bag",         label: "Bag / Luggage",  emoji: "👜" },
  { value: "electronics", label: "Electronics",    emoji: "📱" },
  { value: "clothing",    label: "Clothing",       emoji: "👕" },
  { value: "documents",   label: "Documents / ID", emoji: "📄" },
  { value: "jewelry",     label: "Jewelry",        emoji: "💍" },
  { value: "money",       label: "Money / Wallet", emoji: "💵" },
  { value: "keys",        label: "Keys",           emoji: "🔑" },
  { value: "other",       label: "Other",          emoji: "📦" },
];

const STATUS_MAP: Record<LFStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  reported:     { label: "Reported",     color: "text-indigo-700",  bg: "bg-indigo-100  border border-indigo-300",  icon: PackageSearch },
  under_review: { label: "Under Review", color: "text-amber-700",   bg: "bg-amber-100   border border-amber-300",   icon: Clock         },
  found:        { label: "Found",        color: "text-blue-700",    bg: "bg-blue-100    border border-blue-300",    icon: Search        },
  returned:     { label: "Returned",     color: "text-emerald-700", bg: "bg-emerald-100 border border-emerald-300", icon: CheckCircle2  },
  not_found:    { label: "Not Found",    color: "text-red-700",     bg: "bg-red-100     border border-red-300",     icon: X             },
  closed:       { label: "Closed",       color: "text-slate-500",   bg: "bg-slate-100   border border-slate-200",   icon: X             },
};

type FormState = {
  reporterName: string; reporterEmail: string; reporterPhone: string;
  travelDate: string; seatNumber: string;
  itemName: string; itemCategory: LFCategory | ""; itemDescription: string;
  color: string; brand: string; lastSeenLocation: string;
};

const EMPTY_FORM: FormState = {
  reporterName: "", reporterEmail: "", reporterPhone: "",
  travelDate: "", seatNumber: "",
  itemName: "", itemCategory: "", itemDescription: "",
  color: "", brand: "", lastSeenLocation: "",
};

type Props = { initialRecords: LFRecord[]; userEmail?: string; userName?: string };

export default function LostFoundClient({ initialRecords, userEmail = "", userName = "" }: Props) {
  const [records,   setRecords]   = useState<LFRecord[]>(initialRecords);
  const [loading,   setLoading]   = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState<FormState>({ ...EMPTY_FORM, reporterEmail: userEmail, reporterName: userName });
  const [formErr,   setFormErr]   = useState("");
  const [submitted, setSubmitted] = useState<{ refNumber: string; itemName: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchRecords = () => {
    setLoading(true);
    fetch("/api/lost-found")
      .then(r => r.json())
      .then(d => { setRecords(d.records ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.reporterName || !form.reporterEmail || !form.itemName || !form.itemCategory || !form.itemDescription) {
      setFormErr("Please fill in all required fields.");
      return;
    }
    setFormErr("");
    startTransition(async () => {
      const res  = await fetch("/api/lost-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitted({ refNumber: data.record.refNumber, itemName: data.record.itemName });
        setForm({ ...EMPTY_FORM, reporterEmail: userEmail, reporterName: userName });
        setShowForm(false);
        fetchRecords();
      } else {
        setFormErr(data.message ?? "Failed to submit report.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {submitted && (
        <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">Report submitted!</p>
            <p className="mt-0.5 text-sm text-emerald-700">
              <strong>{submitted.itemName}</strong> — Reference:{" "}
              <span className="font-mono font-bold">{submitted.refNumber}</span>
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              Keep this reference number. Our team will review within 24–48 hours.
            </p>
          </div>
          <button onClick={() => setSubmitted(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Report button */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3 h-auto text-base font-bold text-white shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Report a Lost Item
        </Button>
      )}

      {/* Report form */}
      {showForm && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-indigo-500" />
              New Lost Item Report
            </h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Reporter */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Full Name <span className="text-red-500">*</span></Label>
                <Input value={form.reporterName} onChange={set("reporterName")} placeholder="Your name" className="border-slate-200 bg-white text-slate-800" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Email <span className="text-red-500">*</span></Label>
                <Input type="email" value={form.reporterEmail} onChange={set("reporterEmail")} placeholder="you@example.com" className="border-slate-200 bg-white text-slate-800" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Phone (optional)</Label>
                <Input value={form.reporterPhone} onChange={set("reporterPhone")} placeholder="+1 234 567 8900" className="border-slate-200 bg-white text-slate-800" />
              </div>
            </div>
          </div>

          {/* Trip */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trip Details (optional)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Travel Date</Label>
                <Input type="date" value={form.travelDate} onChange={set("travelDate")} className="border-slate-200 bg-white text-slate-800" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Seat Number</Label>
                <Input value={form.seatNumber} onChange={set("seatNumber")} placeholder="e.g. 3A" className="border-slate-200 bg-white text-slate-800" />
              </div>
            </div>
          </div>

          {/* Item */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Item Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Item Name <span className="text-red-500">*</span></Label>
                <Input value={form.itemName} onChange={set("itemName")} placeholder="e.g. Black backpack" className="border-slate-200 bg-white text-slate-800" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Category <span className="text-red-500">*</span></Label>
                <select
                  value={form.itemCategory}
                  onChange={set("itemCategory")}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Color (optional)</Label>
                <Input value={form.color} onChange={set("color")} placeholder="e.g. Black" className="border-slate-200 bg-white text-slate-800" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Brand (optional)</Label>
                <Input value={form.brand} onChange={set("brand")} placeholder="e.g. Nike" className="border-slate-200 bg-white text-slate-800" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Last Seen Location (optional)</Label>
                <Input value={form.lastSeenLocation} onChange={set("lastSeenLocation")} placeholder="e.g. Under seat 3A, overhead rack" className="border-slate-200 bg-white text-slate-800" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Description <span className="text-red-500">*</span></Label>
                <textarea
                  value={form.itemDescription}
                  onChange={set("itemDescription")}
                  rows={3}
                  placeholder="Describe the item in detail — size, distinguishing marks, contents, etc."
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                />
              </div>
            </div>
          </div>

          {formErr && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formErr}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border-slate-200 text-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:from-indigo-600 hover:to-violet-700"
            >
              {isPending ? "Submitting…" : "Submit Report"}
            </Button>
          </div>
        </div>
      )}

      {/* My reports */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">My Reports</h2>
          <button onClick={fetchRecords} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">No reports yet</p>
            <p className="mt-1 text-xs text-slate-400">Submit a report above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(rec => {
              const st    = STATUS_MAP[rec.status] ?? STATUS_MAP.reported;
              const SIcon = st.icon;
              const cat   = CATEGORIES.find(c => c.value === rec.itemCategory);
              return (
                <div key={rec.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg">
                        {cat?.emoji ?? "📦"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{rec.itemName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {cat?.label} · Ref:{" "}
                          <span className="font-mono font-bold text-slate-600">{rec.refNumber}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Reported {new Date(rec.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                        </p>
                      </div>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", st.bg, st.color)}>
                      <SIcon className="h-3 w-3" />
                      {st.label}
                    </span>
                  </div>
                  {rec.adminNotes && (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-xs">
                      <span className="font-semibold text-indigo-700">Admin note:</span>{" "}
                      <span className="text-indigo-600">{rec.adminNotes}</span>
                    </div>
                  )}
                  {rec.returnedAt && (
                    <p className="mt-2 text-xs text-emerald-600 font-medium">
                      ✓ Returned on {new Date(rec.returnedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
