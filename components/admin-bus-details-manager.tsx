"use client";

import { useRef, useState, useTransition } from "react";
import {
  Bus, Plus, MoreVertical, Eye, Pencil, Trash2, RefreshCw,
  X, AlertTriangle, Hash, Users, Calendar, Layers, Image,
  Upload, ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BUS_TYPES, AMENITY_OPTIONS } from "@/lib/constants";
import { type BusType } from "@/lib/seat-layout";
import { type BusDetailSummary } from "@/lib/queries";

type BusDetail = BusDetailSummary;

type BusForm = {
  name: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: string;
  amenities: string;
  images: string[];
};

const EMPTY_FORM: BusForm = {
  name: "",
  registrationNumber: "",
  busType: "mini_bus",
  totalSeats: "30",
  amenities: "",
  images: [],
};

const BUS_TYPE_LABELS: Record<string, string> = {
  bus_45: "45-Seat Bus",
  mini_bus: "Mini Bus",
  car: "Car",
};

const BUS_TYPE_COLORS: Record<string, string> = {
  bus_45:   "from-indigo-500 to-violet-600",
  mini_bus: "from-emerald-500 to-teal-600",
  car:      "from-orange-500 to-amber-600",
};

function BusAvatar({ busType }: { busType: string }) {
  return (
    <div className={cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm bg-gradient-to-br",
      BUS_TYPE_COLORS[busType] ?? "from-slate-400 to-slate-600"
    )}>
      <Bus className="h-5 w-5" />
    </div>
  );
}

function formFromDetail(d: BusDetail): BusForm {
  return {
    name: d.name,
    registrationNumber: d.registrationNumber,
    busType: d.busType,
    totalSeats: String(d.totalSeats),
    amenities: d.amenities.join(", "),
    images: d.images ?? [],
  };
}

/* ── Image upload sub-component ──────────────────────────────── */
function ImageUploadField({
  images,
  onChange,
  disabled,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const urls: string[] = [];
    try {
      for (const file of list) {
        const form = new FormData();
        form.append("image", file);
        const res = await fetch("/api/admin/upload-vehicle-image", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Upload failed");
        urls.push(data.url);
      }
      onChange([...images, ...urls]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    onChange(images.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-slate-700">
        Vehicle Photos
        <span className="ml-2 text-xs font-normal text-slate-400">({images.length} added)</span>
      </Label>

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/40 px-1 text-[9px] font-bold text-white">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {!disabled && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}
          />
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              uploadFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors",
              uploading && "cursor-not-allowed opacity-60",
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40"
            )}
          >
            {uploading ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                <p className="text-xs font-medium text-slate-500">Uploading…</p>
              </>
            ) : (
              <>
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  isDragging ? "bg-indigo-100" : "bg-white border border-slate-200"
                )}>
                  <ImagePlus className={cn("h-5 w-5", isDragging ? "text-indigo-600" : "text-slate-400")} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-700">
                    {isDragging ? "Drop to add photos" : "Click or drag photos here"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP · Max 5 MB · Multiple allowed</p>
                </div>
              </>
            )}
          </div>
          {uploadError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <X className="h-3 w-3" /> {uploadError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function BusFormFields({
  form, onChange, disabled,
}: {
  form: BusForm;
  onChange: (f: BusForm) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Bus Name <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Bus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 h-11 rounded-xl" placeholder="e.g. Sunset Cruiser"
              value={form.name} disabled={disabled} required
              onChange={(e) => onChange({ ...form, name: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Registration No. <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 h-11 rounded-xl uppercase" placeholder="AB 1234 C"
              value={form.registrationNumber} disabled={disabled} required
              onChange={(e) => onChange({ ...form, registrationNumber: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Bus Type <span className="text-red-500">*</span></Label>
          <Select value={form.busType} onValueChange={(v) => onChange({ ...form, busType: v as BusType })} disabled={disabled}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Choose bus type" />
            </SelectTrigger>
            <SelectContent>
              {BUS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{BUS_TYPE_LABELS[t] ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Total Seats <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 h-11 rounded-xl" type="number" min={1} max={100}
              value={form.totalSeats} disabled={disabled} required
              onChange={(e) => onChange({ ...form, totalSeats: e.target.value })} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-700">Amenities <span className="text-slate-400 font-normal">(comma separated)</span></Label>
        <Input className="h-11 rounded-xl" placeholder="Wi-Fi, AC, USB Charging, Restroom"
          value={form.amenities} disabled={disabled}
          onChange={(e) => onChange({ ...form, amenities: e.target.value })} />
        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {AMENITY_OPTIONS.slice(0, 6).map((a) => (
            <button
              key={a.value}
              type="button"
              disabled={disabled}
              onClick={() => {
                const existing = form.amenities.split(",").map((s) => s.trim()).filter(Boolean);
                if (!existing.includes(a.label)) {
                  onChange({ ...form, amenities: [...existing, a.label].join(", ") });
                }
              }}
              className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>
      <ImageUploadField
        images={form.images}
        onChange={(imgs) => onChange({ ...form, images: imgs })}
        disabled={disabled}
      />
    </div>
  );
}

export default function AdminBusDetailsManager({ busDetails: initial }: { busDetails: BusDetailSummary[] }) {
  const [details, setDetails] = useState<BusDetail[]>(initial);
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<BusDetail | null>(null);
  const [detailTarget, setDetailTarget] = useState<BusDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusDetail | null>(null);

  // Form state
  const [addForm, setAddForm] = useState<BusForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<BusForm>(EMPTY_FORM);

  // Feedback
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  function buildPayload(form: BusForm) {
    return {
      name: form.name.trim(),
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      busType: form.busType,
      totalSeats: Number(form.totalSeats),
      amenities: form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
      images: form.images,
    };
  }

  // ── Add ──
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/bus-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(addForm)),
        });
        const json = await res.json();
        if (!res.ok) { showFeedback(json.message ?? "Failed to add vehicle", false); return; }
        setDetails((prev) => [json.busDetail, ...prev]);
        setAddForm(EMPTY_FORM);
        setShowAdd(false);
        showFeedback("Vehicle added to fleet!", true);
      } catch {
        showFeedback("Something went wrong", false);
      }
    });
  }

  // ── Edit ──
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/bus-details/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(editForm)),
        });
        const json = await res.json();
        if (!res.ok) { showFeedback(json.message ?? "Failed to save", false); return; }
        setDetails((prev) => prev.map((d) => d.id === editTarget.id ? json.busDetail : d));
        setEditTarget(null);
        showFeedback("Vehicle updated successfully!", true);
      } catch {
        showFeedback("Something went wrong", false);
      }
    });
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/bus-details/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showFeedback(json.message ?? "Failed to delete", false); return; }
      setDetails((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
      showFeedback("Vehicle removed from fleet", true);
    } catch {
      showFeedback("Request failed", false);
    } finally {
      setDeleting(false);
    }
  }

  const counts = {
    total: details.length,
    bus45: details.filter((d) => d.busType === "bus_45").length,
    miniBus: details.filter((d) => d.busType === "mini_bus").length,
    car: details.filter((d) => d.busType === "car").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fleet Management</h2>
          <p className="text-sm text-slate-500 mt-1">Register vehicles and link them to departures</p>
        </div>
        <Button
          onClick={() => { setAddForm(EMPTY_FORM); setShowAdd(true); }}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl h-11 px-5 shadow-md shadow-indigo-200"
        >
          <Plus className="h-4 w-4 mr-2" />Add Vehicle
        </Button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={cn(
          "rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between",
          feedback.ok
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
            : "bg-red-50 border border-red-200 text-red-700"
        )}>
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)}><X className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total,   color: "indigo" },
          { label: "45-Seat Bus", value: counts.bus45,   color: "violet" },
          { label: "Mini Bus",    value: counts.miniBus, color: "emerald" },
          { label: "Car",         value: counts.car,     color: "orange" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl bg-${color}-50 border border-${color}-100 px-5 py-4`}>
            <p className={`text-xs uppercase tracking-wide text-${color}-500 font-semibold`}>{label}</p>
            <p className={`text-3xl font-bold text-${color}-700 mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Fleet table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {details.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bus className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No vehicles yet</p>
            <p className="text-sm mt-1">Click "Add Vehicle" to register the first one</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehicle</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Reg. No.</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Seats</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Amenities</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {details.map((detail) => (
                <tr key={detail.id} className="hover:bg-slate-50 transition-colors">
                  {/* Vehicle name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <BusAvatar busType={detail.busType} />
                      <div>
                        <p className="font-semibold text-slate-900">{detail.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Added {new Date(detail.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Reg No. */}
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
                      {detail.registrationNumber}
                    </span>
                  </td>
                  {/* Type */}
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={cn(
                      "inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r text-white",
                      BUS_TYPE_COLORS[detail.busType] ?? "from-slate-400 to-slate-500"
                    )}>
                      {BUS_TYPE_LABELS[detail.busType] ?? detail.busType}
                    </span>
                  </td>
                  {/* Seats */}
                  <td className="px-5 py-4 hidden md:table-cell text-slate-700 font-semibold">
                    {detail.totalSeats}
                  </td>
                  {/* Amenities */}
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {detail.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {detail.amenities.slice(0, 3).map((a) => (
                          <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                            {a}
                          </span>
                        ))}
                        {detail.amenities.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                            +{detail.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                        <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          className="gap-2 text-slate-700"
                          onClick={() => setDetailTarget(detail)}
                        >
                          <Eye className="h-4 w-4" />View Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
                          onClick={() => { setEditForm(formFromDetail(detail)); setEditTarget(detail); }}
                        >
                          <Pencil className="h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
                          onClick={() => setDeleteTarget(detail)}
                        >
                          <Trash2 className="h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Add New Vehicle</DialogTitle>
            <DialogDescription>Register a new bus or vehicle to the fleet.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-5 mt-2">
            <BusFormFields form={addForm} onChange={setAddForm} disabled={isPending} />
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowAdd(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl px-6">
                {isPending
                  ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Saving…</>
                  : <><Plus className="h-4 w-4 mr-2" />Add Vehicle</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT MODAL ── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Vehicle</DialogTitle>
            <DialogDescription>Update the details for {editTarget?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-5 mt-2">
            <BusFormFields form={editForm} onChange={setEditForm} disabled={isPending} />
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditTarget(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl px-6">
                {isPending
                  ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Saving…</>
                  : <><Pencil className="h-4 w-4 mr-2" />Save Changes</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={!!detailTarget} onOpenChange={(o) => { if (!o) setDetailTarget(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Vehicle Details</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-4 mt-2">
              {/* Hero */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <BusAvatar busType={detailTarget.busType} />
                <div>
                  <p className="font-bold text-slate-900 text-lg leading-tight">{detailTarget.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{detailTarget.registrationNumber}</p>
                </div>
                <span className={cn(
                  "ml-auto text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r",
                  BUS_TYPE_COLORS[detailTarget.busType] ?? "from-slate-400 to-slate-500"
                )}>
                  {BUS_TYPE_LABELS[detailTarget.busType] ?? detailTarget.busType}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Hash,     label: "Reg. No.",   value: detailTarget.registrationNumber },
                  { icon: Users,    label: "Total Seats", value: `${detailTarget.totalSeats} seats` },
                  { icon: Layers,   label: "Bus Type",   value: BUS_TYPE_LABELS[detailTarget.busType] ?? detailTarget.busType },
                  { icon: Calendar, label: "Added",       value: new Date(detailTarget.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">{label}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* Amenities */}
              {detailTarget.amenities.length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {detailTarget.amenities.map((a) => (
                      <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {detailTarget.images && detailTarget.images.length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Image className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                        Photos ({detailTarget.images.length})
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {detailTarget.images.map((url, i) => (
                      <a
                        key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 aspect-video block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute bottom-1 left-1 rounded bg-black/40 px-1 text-[9px] font-bold text-white">{i + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" className="rounded-xl" onClick={() => setDetailTarget(null)}>Close</Button>
                <Button className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                  onClick={() => { setDetailTarget(null); setEditForm(formFromDetail(detailTarget)); setEditTarget(detailTarget); }}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DELETE MODAL ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Delete Vehicle</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-800">{deleteTarget?.name}</span>{" "}
              ({deleteTarget?.registrationNumber}) from the fleet? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Deleting…</>
                : <><Trash2 className="h-4 w-4 mr-2" />Delete Vehicle</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
