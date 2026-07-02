"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, CheckCircle, XCircle, Tag, X, Upload, ImageIcon, Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDelete } from "@/lib/utils/swal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PromoCode {
  _id: string;
  code: string;
  type: "percentage" | "fixed" | "free_ticket";
  value: number;
  maxUses: number | null;
  usedCount: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number | null;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  title?: string | null;
  imageUrl?: string | null;
}

// Named PromoFormValues to avoid shadowing the browser's built-in FormData class
interface PromoFormValues {
  code: string;
  type: "percentage" | "fixed" | "free_ticket";
  value: string;
  maxUses: string;
  minBookingAmount: string;
  maxDiscountAmount: string;
  validFrom: string;
  validUntil: string;
  title: string;
  imageUrl: string;
}

const emptyForm = (): PromoFormValues => ({
  code: "",
  type: "percentage",
  value: "",
  maxUses: "",
  minBookingAmount: "",
  maxDiscountAmount: "",
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  title: "",
  imageUrl: "",
});

/* ── Shared form UI ─────────────────────────────────────────────────────── */
function PromoForm({
  values,
  setValues,
  imagePreview,
  onRemoveImage,
  onFileChange,
  uploading,
  error,
  success,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  values: PromoFormValues;
  setValues: React.Dispatch<React.SetStateAction<PromoFormValues>>;
  imagePreview: string;
  onRemoveImage: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  error: string;
  success: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* ── Banner section ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
        <p className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" />
          Landing Page Banner (optional)
        </p>

        <div>
          <Label>Banner Title</Label>
          <Input
            type="text"
            value={values.title}
            onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Summer Sale 2026"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Shown above the discount in the banner</p>
        </div>

        <div>
          <Label>Banner Image</Label>
          {imagePreview ? (
            <div className="mt-1 relative rounded-lg overflow-hidden border border-gray-200">
              <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover" />
              <button
                type="button"
                onClick={onRemoveImage}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-1 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
              ) : (
                <>
                  <Upload className="w-7 h-7 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload banner image</span>
                  <span className="text-xs text-gray-400">PNG, JPG, WebP · max 5 MB</span>
                </>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>

      {/* ── Promo fields ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Promo Code *</Label>
          <Input
            type="text"
            value={values.code}
            onChange={(e) => setValues((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            placeholder="SAVE20"
            required
            className="mt-1 font-mono"
          />
        </div>

        <div>
          <Label>Discount Type *</Label>
          <select
            value={values.type}
            onChange={(e) => setValues((p) => ({ ...p, type: e.target.value as PromoFormValues["type"] }))}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
            <option value="free_ticket">Free Ticket</option>
          </select>
        </div>

        <div>
          <Label>
            Discount Value *{" "}
            {values.type === "percentage" ? "(%)" : values.type === "fixed" ? "($)" : ""}
          </Label>
          <Input
            type="number"
            min="0"
            max={values.type === "percentage" ? 100 : undefined}
            step="0.01"
            value={values.value}
            onChange={(e) => setValues((p) => ({ ...p, value: e.target.value }))}
            placeholder={values.type === "percentage" ? "20" : "10"}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label>Maximum Uses (Optional)</Label>
          <Input
            type="number"
            min="1"
            value={values.maxUses}
            onChange={(e) => setValues((p) => ({ ...p, maxUses: e.target.value }))}
            placeholder="Unlimited"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Min. Booking Amount (Optional)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.minBookingAmount}
            onChange={(e) => setValues((p) => ({ ...p, minBookingAmount: e.target.value }))}
            placeholder="0"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Max Discount Cap (Optional)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.maxDiscountAmount}
            onChange={(e) => setValues((p) => ({ ...p, maxDiscountAmount: e.target.value }))}
            placeholder="No cap"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Valid From *</Label>
          <Input
            type="date"
            value={values.validFrom}
            onChange={(e) => setValues((p) => ({ ...p, validFrom: e.target.value }))}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label>Valid Until *</Label>
          <Input
            type="date"
            value={values.validUntil}
            onChange={(e) => setValues((p) => ({ ...p, validUntil: e.target.value }))}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || uploading} className="bg-indigo-600 hover:bg-indigo-700">
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/* ── upload helper ───────────────────────────────────────────────────────── */
async function uploadPromoImage(
  file: File,
  setUploading: (v: boolean) => void,
  setValues: React.Dispatch<React.SetStateAction<PromoFormValues>>,
  setPreview: (v: string) => void,
  setErr: (v: string) => void,
) {
  setUploading(true);
  setErr("");
  try {
    // Use window.FormData explicitly to avoid any naming conflict
    const payload = new window.FormData();
    payload.append("image", file);
    const res  = await fetch("/api/admin/upload-promo-image", { method: "POST", body: payload });
    const data = await res.json();
    if (!res.ok) { setErr(data.message || "Upload failed"); return; }
    // Functional update avoids stale-closure overwriting other fields
    setValues((prev) => ({ ...prev, imageUrl: data.url }));
    setPreview(data.url);
  } catch {
    setErr("Image upload failed");
  } finally {
    setUploading(false);
  }
}

/* ── Main tab ────────────────────────────────────────────────────────────── */
export default function AdminPromoCodesTab() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading]       = useState(true);

  // create
  const [showCreate, setShowCreate]             = useState(false);
  const [createValues, setCreateValues]         = useState<PromoFormValues>(emptyForm());
  const [createPreview, setCreatePreview]       = useState("");
  const [createUploading, setCreateUploading]   = useState(false);
  const [createErr, setCreateErr]               = useState("");
  const [createOk, setCreateOk]                 = useState("");
  const [createBusy, setCreateBusy]             = useState(false);

  // edit
  const [editTarget, setEditTarget]             = useState<PromoCode | null>(null);
  const [editValues, setEditValues]             = useState<PromoFormValues>(emptyForm());
  const [editPreview, setEditPreview]           = useState("");
  const [editUploading, setEditUploading]       = useState(false);
  const [editErr, setEditErr]                   = useState("");
  const [editOk, setEditOk]                     = useState("");
  const [editBusy, setEditBusy]                 = useState(false);

  useEffect(() => { fetchPromoCodes(); }, []);

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/promo-codes");
      const data = await res.json();
      setPromoCodes(data.promoCodes || []);
    } catch { /* silent */ }
    finally  { setLoading(false); }
  };

  const openEdit = (p: PromoCode) => {
    setEditTarget(p);
    setEditPreview(p.imageUrl ?? "");
    setEditErr(""); setEditOk("");
    setEditValues({
      code:              p.code,
      type:              p.type,
      value:             String(p.value),
      maxUses:           p.maxUses != null ? String(p.maxUses) : "",
      minBookingAmount:  p.minBookingAmount ? String(p.minBookingAmount) : "",
      maxDiscountAmount: p.maxDiscountAmount != null ? String(p.maxDiscountAmount) : "",
      validFrom:         new Date(p.validFrom).toISOString().split("T")[0],
      validUntil:        new Date(p.validUntil).toISOString().split("T")[0],
      title:             p.title ?? "",
      imageUrl:          p.imageUrl ?? "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateBusy(true); setCreateErr(""); setCreateOk("");
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code:              createValues.code,
          type:              createValues.type,
          value:             parseFloat(createValues.value),
          maxUses:           createValues.maxUses ? parseInt(createValues.maxUses) : null,
          minBookingAmount:  createValues.minBookingAmount ? parseFloat(createValues.minBookingAmount) : 0,
          maxDiscountAmount: createValues.maxDiscountAmount ? parseFloat(createValues.maxDiscountAmount) : null,
          validFrom:         createValues.validFrom,
          validUntil:        createValues.validUntil,
          title:             createValues.title || null,
          imageUrl:          createValues.imageUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateErr(data.message || "Failed to create"); return; }
      setCreateOk("Promo code created!");
      setCreateValues(emptyForm()); setCreatePreview("");
      fetchPromoCodes();
      setTimeout(() => { setCreateOk(""); setShowCreate(false); }, 1800);
    } catch { setCreateErr("Failed to create promo code"); }
    finally  { setCreateBusy(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditBusy(true); setEditErr(""); setEditOk("");
    try {
      const res = await fetch(`/api/admin/promo-codes/${editTarget._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code:              editValues.code,
          type:              editValues.type,
          value:             parseFloat(editValues.value),
          maxUses:           editValues.maxUses ? parseInt(editValues.maxUses) : null,
          minBookingAmount:  editValues.minBookingAmount ? parseFloat(editValues.minBookingAmount) : 0,
          maxDiscountAmount: editValues.maxDiscountAmount ? parseFloat(editValues.maxDiscountAmount) : null,
          validFrom:         editValues.validFrom,
          validUntil:        editValues.validUntil,
          title:             editValues.title || null,
          imageUrl:          editValues.imageUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEditErr(data.message || "Failed to update"); return; }
      setEditOk("Promo code updated!");
      fetchPromoCodes();
      setTimeout(() => { setEditOk(""); setEditTarget(null); }, 1800);
    } catch { setEditErr("Failed to update promo code"); }
    finally  { setEditBusy(false); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchPromoCodes();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("this promo code"))) return;
    try {
      await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
      fetchPromoCodes();
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Codes</h2>
          <p className="text-sm text-gray-600">Active codes appear as banners on the landing page</p>
        </div>
        <Button
          onClick={() => { setShowCreate(!showCreate); setCreateErr(""); setCreateOk(""); }}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow-md shadow-indigo-100 gap-2"
        >
          <Plus className="w-4 h-4" /> Create Promo Code
        </Button>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-lg">Create New Promo Code</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <PromoForm
            values={createValues}
            setValues={setCreateValues}
            imagePreview={createPreview}
            onRemoveImage={() => { setCreateValues((p) => ({ ...p, imageUrl: "" })); setCreatePreview(""); }}
            onFileChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPromoImage(f, setCreateUploading, setCreateValues, setCreatePreview, setCreateErr);
            }}
            uploading={createUploading}
            error={createErr}
            success={createOk}
            submitting={createBusy}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitLabel="Create Promo Code"
          />
        </div>
      )}

      {/* Edit dialog */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" />
                Edit Promo Code
                <span className="font-mono text-sm bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {editTarget.code}
                </span>
              </h3>
              <button onClick={() => setEditTarget(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 pb-6 pt-5">
              <PromoForm
                values={editValues}
                setValues={setEditValues}
                imagePreview={editPreview}
                onRemoveImage={() => { setEditValues((p) => ({ ...p, imageUrl: "" })); setEditPreview(""); }}
                onFileChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPromoImage(f, setEditUploading, setEditValues, setEditPreview, setEditErr);
                }}
                uploading={editUploading}
                error={editErr}
                success={editOk}
                submitting={editBusy}
                onSubmit={handleEdit}
                onCancel={() => setEditTarget(null)}
                submitLabel="Save Changes"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code / Banner</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valid Period</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoCodes.map((promo) => (
                <tr key={promo._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {promo.imageUrl ? (
                        <img src={promo.imageUrl} alt="banner"
                          className="w-12 h-8 rounded object-cover border border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-12 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-mono font-semibold text-gray-900 text-sm">{promo.code}</span>
                        </div>
                        {promo.title && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[140px]">{promo.title}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      {promo.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">
                    {promo.type === "percentage" ? `${promo.value}%`
                      : promo.type === "fixed" ? `$${promo.value}` : "Free"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{promo.usedCount}</span>
                      <span className="text-gray-500"> / {promo.maxUses ?? "∞"}</span>
                    </div>
                    {promo.maxUses && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min((promo.usedCount / promo.maxUses) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>From: {new Date(promo.validFrom).toLocaleDateString()}</div>
                    <div>To: {new Date(promo.validUntil).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    {promo.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(promo)} className="p-2 hover:bg-indigo-50 rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4 text-indigo-500" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(promo._id, promo.isActive)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={promo.isActive ? "Deactivate" : "Activate"}
                      >
                        {promo.isActive
                          ? <XCircle className="w-4 h-4 text-red-500" />
                          : <CheckCircle className="w-4 h-4 text-green-500" />}
                      </button>
                      <button onClick={() => handleDelete(promo._id)} className="p-2 hover:bg-gray-100 rounded-lg" title="Delete">
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {promoCodes.length === 0 && (
          <div className="text-center py-12">
            <Tag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No promo codes found</p>
            <p className="text-sm text-gray-400">Create your first promo code to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
