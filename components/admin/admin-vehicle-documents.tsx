"use client";

import { useEffect, useState } from "react";
import {
  FileText, Plus, Pencil, Trash2, X, AlertTriangle,
  CheckCircle2, Clock, ShieldCheck, Car, Wrench, FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { confirmDelete, toastSuccess, toastError } from "@/lib/utils/swal";
import { cn } from "@/lib/utils";

export type VehicleDocType = "insurance" | "road_tax" | "inspection" | "permit" | "other";

export type VehicleDocument = {
  _id: string;
  docType: VehicleDocType;
  docNumber: string;
  issueDate?: string;
  expiryDate: string;
  notes?: string;
  createdAt: string;
};

const DOC_TYPE_CONFIG: Record<VehicleDocType, { label: string; icon: React.ElementType; color: string }> = {
  insurance:   { label: "Insurance",         icon: ShieldCheck, color: "text-blue-600 bg-blue-50 border-blue-200"   },
  road_tax:    { label: "Road Tax",           icon: Car,         color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  inspection:  { label: "Vehicle Inspection", icon: FileCheck,   color: "text-violet-600 bg-violet-50 border-violet-200" },
  permit:      { label: "Operating Permit",   icon: FileText,    color: "text-amber-600 bg-amber-50 border-amber-200" },
  other:       { label: "Other Document",     icon: Wrench,      color: "text-slate-600 bg-slate-50 border-slate-200" },
};

function expiryStatus(expiryDate: string) {
  const now  = Date.now();
  const exp  = new Date(expiryDate).getTime();
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (days < 0)   return { label: "Expired",         color: "text-red-700 bg-red-50 border-red-200",    icon: AlertTriangle };
  if (days <= 30) return { label: `${days}d left`,    color: "text-amber-700 bg-amber-50 border-amber-200", icon: Clock };
  return              { label: "Valid",               color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 };
}

type DocForm = {
  docType: VehicleDocType;
  docNumber: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
};

const EMPTY_FORM: DocForm = {
  docType: "insurance",
  docNumber: "",
  issueDate: "",
  expiryDate: "",
  notes: "",
};

type Props = {
  busDetailId: string;
  busName: string;
};

export default function AdminVehicleDocuments({ busDetailId, busName }: Props) {
  const [docs, setDocs]           = useState<VehicleDocument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [editDoc, setEditDoc]     = useState<VehicleDocument | null>(null);
  const [form, setForm]           = useState<DocForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/bus-details/${busDetailId}/documents`)
      .then((r) => r.json())
      .then((d) => { setDocs(d.documents ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [busDetailId]);

  function openAdd() { setForm(EMPTY_FORM); setShowAdd(true); }

  function openEdit(doc: VehicleDocument) {
    setEditDoc(doc);
    setForm({
      docType:    doc.docType,
      docNumber:  doc.docNumber,
      issueDate:  doc.issueDate ? doc.issueDate.slice(0, 10) : "",
      expiryDate: doc.expiryDate.slice(0, 10),
      notes:      doc.notes ?? "",
    });
  }

  async function handleSave() {
    if (!form.docNumber.trim() || !form.expiryDate) {
      toastError("Document number and expiry date are required"); return;
    }
    setSaving(true);
    try {
      const url = editDoc
        ? `/api/admin/bus-details/${busDetailId}/documents/${editDoc._id}`
        : `/api/admin/bus-details/${busDetailId}/documents`;
      const method = editDoc ? "PATCH" : "POST";
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed to save"); return; }

      if (editDoc) {
        setDocs((prev) => prev.map((d) => d._id === editDoc._id ? json.document : d));
        setEditDoc(null);
        toastSuccess("Document updated");
      } else {
        setDocs((prev) => [...prev, json.document]);
        setShowAdd(false);
        toastSuccess("Document added");
      }
    } catch {
      toastError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doc: VehicleDocument) {
    const cfg = DOC_TYPE_CONFIG[doc.docType];
    if (!(await confirmDelete(`${cfg.label} — ${doc.docNumber}`))) return;
    try {
      const res = await fetch(`/api/admin/bus-details/${busDetailId}/documents/${doc._id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); toastError(j.message ?? "Delete failed"); return; }
      setDocs((prev) => prev.filter((d) => d._id !== doc._id));
      toastSuccess("Document removed");
    } catch {
      toastError("Request failed");
    }
  }

  const expiredCount = docs.filter((d) => new Date(d.expiryDate) < new Date()).length;
  const warnCount    = docs.filter((d) => {
    const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;

  const isOpen = showAdd || editDoc !== null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Compliance Documents</h3>
            <p className="text-xs text-slate-500">{busName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expiredCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
              <AlertTriangle className="h-3 w-3" /> {expiredCount} expired
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
              <Clock className="h-3 w-3" /> {warnCount} expiring soon
            </span>
          )}
          <Button size="sm" onClick={openAdd}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs h-8 px-3">
            <Plus className="h-3.5 w-3.5" /> Add Document
          </Button>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-500">No documents yet</p>
          <p className="text-xs text-slate-400 mt-1">Add insurance, road tax, or inspection certificates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const cfg    = DOC_TYPE_CONFIG[doc.docType];
            const status = expiryStatus(doc.expiryDate);
            const Icon   = cfg.icon;
            const StatusIcon = status.icon;
            return (
              <div key={doc._id}
                className={cn(
                  "flex items-center gap-4 rounded-xl border px-4 py-3",
                  expiryStatus(doc.expiryDate).label === "Expired"
                    ? "border-red-200 bg-red-50/40"
                    : expiryStatus(doc.expiryDate).label.endsWith("left")
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", cfg.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-900">{cfg.label}</p>
                    <span className={cn("flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5", status.color)}>
                      <StatusIcon className="h-2.5 w-2.5" />{status.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{doc.docNumber}</p>
                  {doc.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{doc.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">Expires</p>
                  <p className="text-xs font-semibold text-slate-900">
                    {new Date(doc.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => openEdit(doc)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(doc)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditDoc(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editDoc ? "Edit Document" : "Add Compliance Document"}</DialogTitle>
            <DialogDescription>
              {editDoc ? "Update document details." : "Track insurance, road tax, inspections and more."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Document Type <span className="text-red-500">*</span></Label>
              <Select value={form.docType} onValueChange={(v) => setForm((f) => ({ ...f, docType: v as VehicleDocType }))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOC_TYPE_CONFIG) as VehicleDocType[]).map((t) => (
                    <SelectItem key={t} value={t}>{DOC_TYPE_CONFIG[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Document / Certificate Number <span className="text-red-500">*</span></Label>
              <Input
                className="h-11 rounded-xl font-mono"
                placeholder="e.g. INS-2024-00123"
                value={form.docNumber}
                onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Issue Date</Label>
                <Input type="date" className="h-11 rounded-xl"
                  value={form.issueDate}
                  onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Expiry Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="h-11 rounded-xl"
                  value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input className="h-11 rounded-xl"
                placeholder="e.g. Third-party liability only"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl"
              onClick={() => { setShowAdd(false); setEditDoc(null); }} disabled={saving}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Saving…" : editDoc ? "Save Changes" : "Add Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
