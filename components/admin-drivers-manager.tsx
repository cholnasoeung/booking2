"use client";

import { useState, useTransition } from "react";
import {
  Users, Plus, MoreVertical, Eye, Pencil, Ban, CircleCheck,
  Trash2, Phone, FileText, Car, RefreshCw,
  Calendar, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDelete, confirmWarning, toastSuccess, toastError } from "@/lib/swal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import AvatarUpload, { AvatarPicker, uploadAvatarFile } from "@/components/avatar-upload";
import type { DriverSummary } from "@/lib/queries";

type Driver = DriverSummary & { vehicleNumber?: string | null; avatar?: string | null };

type DriverForm = {
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber: string;
};

const EMPTY_FORM: DriverForm = { name: "", phone: "", licenseNumber: "", vehicleNumber: "" };

function formFromDriver(d: Driver): DriverForm {
  return {
    name: d.name,
    phone: d.phone,
    licenseNumber: d.licenseNumber,
    vehicleNumber: d.vehicleNumber ?? "",
  };
}


function DriverFormFields({
  form,
  onChange,
  disabled,
}: {
  form: DriverForm;
  onChange: (f: DriverForm) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 h-11 rounded-xl" placeholder="e.g. Sofia Santos"
              value={form.name} disabled={disabled}
              onChange={(e) => onChange({ ...form, name: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Phone <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 h-11 rounded-xl" placeholder="+855 12 345 678"
              value={form.phone} disabled={disabled}
              onChange={(e) => onChange({ ...form, phone: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">License Number <span className="text-red-500">*</span></Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 h-11 rounded-xl" placeholder="DL-1234-5678"
              value={form.licenseNumber} disabled={disabled}
              onChange={(e) => onChange({ ...form, licenseNumber: e.target.value })} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Vehicle Number <span className="text-slate-400 font-normal">(optional)</span></Label>
          <div className="relative">
            <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 h-11 rounded-xl" placeholder="AB 1234 C"
              value={form.vehicleNumber} disabled={disabled}
              onChange={(e) => onChange({ ...form, vehicleNumber: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDriversManager({ drivers: initialDrivers }: { drivers: DriverSummary[] }) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers as Driver[]);
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Driver | null>(null);
  const [detailTarget, setDetailTarget] = useState<Driver | null>(null);

  // Form state
  const [addForm, setAddForm] = useState<DriverForm>(EMPTY_FORM);
  const [addAvatarFile, setAddAvatarFile] = useState<File | null>(null);
  const [editForm, setEditForm] = useState<DriverForm>(EMPTY_FORM);

  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // ── Add driver ──
  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/drivers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: addForm.name.trim(),
            phone: addForm.phone.trim(),
            licenseNumber: addForm.licenseNumber.trim(),
            vehicleNumber: addForm.vehicleNumber.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) { toastError(json.message ?? "Failed to add driver"); return; }
        let driver = json.driver;
        if (addAvatarFile) {
          const url = await uploadAvatarFile(addAvatarFile, "driver", driver.id);
          if (url) driver = { ...driver, avatar: url };
        }
        setDrivers((prev) => [driver, ...prev]);
        setAddForm(EMPTY_FORM);
        setAddAvatarFile(null);
        setShowAdd(false);
        toastSuccess("Driver added successfully!");
      } catch {
        toastError("Something went wrong");
      }
    });
  }

  // ── Edit driver ──
  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTarget) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/drivers/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editForm.name.trim(),
            phone: editForm.phone.trim(),
            licenseNumber: editForm.licenseNumber.trim(),
            vehicleNumber: editForm.vehicleNumber.trim() || "",
          }),
        });
        const json = await res.json();
        if (!res.ok) { toastError(json.message ?? "Failed to save"); return; }
        setDrivers((prev) => prev.map((d) => d.id === editTarget.id ? json.driver : d));
        setEditTarget(null);
        toastSuccess("Driver updated successfully!");
      } catch {
        toastError("Something went wrong");
      }
    });
  }

  // ── Toggle status ──
  async function toggleStatus(driver: Driver) {
    const suspending = driver.status === "active";
    const ok = await confirmWarning(
      suspending ? "Suspend Driver?" : "Reinstate Driver?",
      suspending
        ? `${driver.name} will be marked inactive and won't be assignable to trips.`
        : `${driver.name} will be reinstated as an active driver.`,
      suspending ? "Yes, Suspend" : "Yes, Reinstate"
    );
    if (!ok) return;

    setActionPendingId(driver.id);
    const newStatus = suspending ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed"); return; }
      setDrivers((prev) => prev.map((d) => d.id === driver.id ? json.driver : d));
      toastSuccess(suspending ? `${driver.name} has been suspended` : `${driver.name} has been reinstated`);
    } catch {
      toastError("Request failed");
    } finally {
      setActionPendingId(null);
    }
  }

  // ── Delete driver ──
  async function handleDelete(driver: Driver) {
    if (!(await confirmDelete(driver.name ?? "this driver"))) return;
    setActionPendingId(driver.id);
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed to delete"); return; }
      setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
      toastSuccess("Driver removed from roster");
    } catch {
      toastError("Request failed");
    } finally {
      setActionPendingId(null);
    }
  }

  const activeCount = drivers.filter((d) => d.status === "active").length;
  const inactiveCount = drivers.filter((d) => d.status === "inactive").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Driver Management</h2>
          <p className="text-sm text-slate-500 mt-1">Register drivers and keep the dispatch roster up to date</p>
        </div>
        <Button
          onClick={() => { setAddForm(EMPTY_FORM); setShowAdd(true); }}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow-md shadow-indigo-100 gap-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">Total</p>
          <p className="text-3xl font-bold text-indigo-700 mt-1">{drivers.length}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-emerald-500 font-semibold">Active</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{activeCount}</p>
        </div>
        <div className="rounded-2xl bg-orange-50 border border-orange-100 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-orange-500 font-semibold">Inactive</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{inactiveCount}</p>
        </div>
      </div>

      {/* Driver list */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No drivers yet</p>
            <p className="text-sm mt-1">Click "Add Driver" to register the first driver</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Contact</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">License</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Vehicle</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className={cn(
                    "transition-colors",
                    driver.status === "inactive" ? "bg-orange-50/30 hover:bg-orange-50/60" : "hover:bg-slate-50"
                  )}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <AvatarUpload
                        entityType="driver"
                        entityId={driver.id}
                        currentAvatar={driver.avatar}
                        name={driver.name}
                        size="sm"
                        onUploaded={(url) => setDrivers((prev) => prev.map((d) => d.id === driver.id ? { ...d, avatar: url } : d))}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{driver.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Joined {new Date(driver.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <p className="text-slate-700">{driver.phone}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
                      {driver.licenseNumber}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-slate-500 text-xs">
                    {driver.vehicleNumber ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    {driver.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 border border-orange-200 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        <Ban className="h-3 w-3" />Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={actionPendingId === driver.id}
                        className={cn(
                          "inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors",
                          actionPendingId === driver.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {actionPendingId === driver.id
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
                          : <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                        }
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          className="gap-2 text-slate-700"
                          onClick={() => setDetailTarget(driver)}
                        >
                          <Eye className="h-4 w-4" />View Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
                          onClick={() => { setEditForm(formFromDriver(driver)); setEditTarget(driver); }}
                        >
                          <Pencil className="h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {driver.status === "active" ? (
                          <DropdownMenuItem
                            className="gap-2 text-orange-700 focus:text-orange-700 focus:bg-orange-50"
                            onClick={() => toggleStatus(driver)}
                          >
                            <Ban className="h-4 w-4" />Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="gap-2 text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50"
                            onClick={() => toggleStatus(driver)}
                          >
                            <CircleCheck className="h-4 w-4" />Reinstate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
                          onClick={() => handleDelete(driver)}
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

      {/* ── ADD DRIVER MODAL ── */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) setAddAvatarFile(null); setShowAdd(o); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Add New Driver</DialogTitle>
            <DialogDescription>Fill in the driver's details to register them on the roster.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-5 mt-2">
            <div className="flex justify-center">
              <AvatarPicker
                name={addForm.name || "?"}
                file={addAvatarFile}
                onChange={setAddAvatarFile}
                size="lg"
              />
            </div>
            <DriverFormFields form={addForm} onChange={setAddForm} disabled={isPending} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowAdd(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl px-6"
              >
                {isPending ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Saving…</> : <><Plus className="h-4 w-4 mr-2" />Add Driver</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DRIVER MODAL ── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Edit Driver</DialogTitle>
            <DialogDescription>Update the information for {editTarget?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-5 mt-2">
            <DriverFormFields form={editForm} onChange={setEditForm} disabled={isPending} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditTarget(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl px-6"
              >
                {isPending ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Saving…</> : <><Pencil className="h-4 w-4 mr-2" />Save Changes</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL MODAL ── */}
      <Dialog open={!!detailTarget} onOpenChange={(o) => { if (!o) setDetailTarget(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Driver Details</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-5 mt-2">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <AvatarUpload
                  entityType="driver"
                  entityId={detailTarget.id}
                  currentAvatar={detailTarget.avatar}
                  name={detailTarget.name}
                  size="md"
                  onUploaded={(url) => {
                    setDrivers((prev) => prev.map((d) => d.id === detailTarget.id ? { ...d, avatar: url } : d));
                    setDetailTarget((prev) => prev ? { ...prev, avatar: url } : prev);
                  }}
                />
                <div>
                  <p className="font-bold text-slate-900 text-lg">{detailTarget.name}</p>
                  {detailTarget.status === "active" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 mt-1">
                      <CheckCircle2 className="h-3 w-3" />Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 mt-1">
                      <Ban className="h-3 w-3" />Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Phone,    label: "Phone",          value: detailTarget.phone },
                  { icon: FileText, label: "License No.",    value: detailTarget.licenseNumber },
                  { icon: Car,      label: "Vehicle No.",    value: detailTarget.vehicleNumber ?? "Not assigned" },
                  { icon: Calendar, label: "Joined",         value: new Date(detailTarget.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
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

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" className="rounded-xl" onClick={() => setDetailTarget(null)}>Close</Button>
                <Button
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                  onClick={() => { setDetailTarget(null); setEditForm(formFromDriver(detailTarget)); setEditTarget(detailTarget); }}
                >
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
