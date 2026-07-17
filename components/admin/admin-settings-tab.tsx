"use client";

import { useEffect, useRef, useState } from "react";
import {
  Globe, BookOpen, Bell, Shield, Save, Check,
  Building2, Mail, Phone, Clock, Users, AlertTriangle,
  Lock, Eye, EyeOff, RefreshCw, Palette, Upload,
  Trash2, ImageIcon, X, CreditCard, KeyRound, CircleDot, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SettingsData = {
  general: {
    businessName: string;
    contactEmail: string;
    supportPhone: string;
    currency: string;
    timezone: string;
  };
  booking: {
    maxSeatsPerBooking: number;
    bookingCutoffMinutes: number;
    cancellationWindowHours: number;
    autoConfirm: boolean;
    requirePaymentUpfront: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    adminAlertEmail: string;
    notifyOnNewBooking: boolean;
    notifyOnCancellation: boolean;
  };
  payment: {
    stripe: {
      enabled: boolean;
      publishableKey: string;
      secretKey: string;
      webhookSecret: string;
    };
    abaPayway: {
      enabled: boolean;
      merchantId: string;
      apiKey: string;
      publicKey: string;
    };
    activeGateway: "stripe" | "abaPayway" | "none";
  };
  sms: {
    twilio: {
      enabled: boolean;
      accountSid: string;
      authToken: string;
      fromNumber: string;
    };
  };
  auth: {
    google: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
    };
  };
};

const DEFAULT: SettingsData = {
  general: { businessName: "TKbus", contactEmail: "", supportPhone: "", currency: "USD", timezone: "UTC" },
  booking: { maxSeatsPerBooking: 6, bookingCutoffMinutes: 30, cancellationWindowHours: 24, autoConfirm: true, requirePaymentUpfront: false },
  notifications: { emailEnabled: true, smsEnabled: false, adminAlertEmail: "", notifyOnNewBooking: true, notifyOnCancellation: true },
  payment: {
    stripe: { enabled: false, publishableKey: "", secretKey: "", webhookSecret: "" },
    abaPayway: { enabled: false, merchantId: "", apiKey: "", publicKey: "" },
    activeGateway: "none",
  },
  sms: {
    twilio: { enabled: false, accountSid: "", authToken: "", fromNumber: "" },
  },
  auth: {
    google: { enabled: false, clientId: "", clientSecret: "" },
  },
};

type Tab = "general" | "booking" | "notifications" | "security" | "branding" | "payment" | "sms" | "auth";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-indigo-600" : "bg-slate-200"
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200",
        checked ? "translate-x-6" : "translate-x-1"
      )} />
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-indigo-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SaveBar({ saving, saved, error, onSave }: {
  saving: boolean; saved: boolean; error: string | null; onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-5 mt-2 border-t border-indigo-50">
      <div className="text-sm">
        {error && <p className="text-red-600">{error}</p>}
        {saved && (
          <p className="text-emerald-600 flex items-center gap-1.5 font-medium">
            <Check className="h-4 w-4" /> Saved successfully!
          </p>
        )}
      </div>
      <Button
        onClick={onSave}
        disabled={saving}
        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl h-10 px-6 shadow-md shadow-indigo-200"
      >
        {saving
          ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Saving…</>
          : <><Save className="h-4 w-4 mr-2" />Save Changes</>
        }
      </Button>
    </div>
  );
}

export default function AdminSettingsTab() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<SettingsData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSection, setSavedSection] = useState<Tab | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pwData, setPwData] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  // Branding
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.general) {
          setSettings({
            ...DEFAULT,
            ...data,
            payment: {
              ...DEFAULT.payment,
              ...(data.payment ?? {}),
              stripe: { ...DEFAULT.payment.stripe, ...(data.payment?.stripe ?? {}) },
              abaPayway: { ...DEFAULT.payment.abaPayway, ...(data.payment?.abaPayway ?? {}) },
            },
            sms: {
              ...DEFAULT.sms,
              ...(data.sms ?? {}),
              twilio: { ...DEFAULT.sms.twilio, ...(data.sms?.twilio ?? {}) },
            },
            auth: {
              ...DEFAULT.auth,
              ...(data.auth ?? {}),
              google: { ...DEFAULT.auth.google, ...(data.auth?.google ?? {}) },
            },
          });
        }
        if (data.logoUrl) setCurrentLogoUrl(data.logoUrl);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setLogoMsg({ kind: "err", text: "Only image files are accepted." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoMsg({ kind: "err", text: "File exceeds 2 MB limit." });
      return;
    }
    setSelectedFile(file);
    setLogoMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadLogo() {
    if (!selectedFile) return;
    setLogoUploading(true);
    setLogoMsg(null);
    try {
      const form = new FormData();
      form.append("logo", selectedFile);
      const res = await fetch("/api/admin/upload-logo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");
      setCurrentLogoUrl(data.url + `?v=${Date.now()}`);
      setSelectedFile(null);
      setPreviewUrl(null);
      setLogoMsg({ kind: "ok", text: "Logo updated successfully!" });
    } catch (e) {
      setLogoMsg({ kind: "err", text: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setLogoUploading(false);
    }
  }

  async function removeLogo() {
    setLogoUploading(true);
    setLogoMsg(null);
    try {
      const res = await fetch("/api/admin/upload-logo", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setCurrentLogoUrl(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setLogoMsg({ kind: "ok", text: "Logo removed. Default initials badge will be shown." });
    } catch {
      setLogoMsg({ kind: "err", text: "Failed to remove logo." });
    } finally {
      setLogoUploading(false);
    }
  }

  async function saveSection(section: keyof SettingsData) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: settings[section] }),
      });
      if (!res.ok) throw new Error();
      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 3000);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwError(null);
    if (pwData.next !== pwData.confirm) { setPwError("New passwords do not match."); return; }
    if (pwData.next.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwData.current, newPassword: pwData.next }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed");
      }
      setPwSaved(true);
      setPwData({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSaved(false), 4000);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  }

  const tabs = [
    { id: "general" as Tab,       label: "General",       icon: Globe,       desc: "Business info & locale" },
    { id: "branding" as Tab,      label: "Branding",      icon: Palette,     desc: "Logo & visual identity" },
    { id: "booking" as Tab,       label: "Booking Rules", icon: BookOpen,    desc: "Seats, timing & policy" },
    { id: "notifications" as Tab, label: "Notifications", icon: Bell,        desc: "Alerts & emails" },
    { id: "payment" as Tab,       label: "Payment Keys",  icon: CreditCard,  desc: "Stripe & ABA PayWay" },
    { id: "sms" as Tab,           label: "SMS / Twilio",  icon: Phone,       desc: "Phone alerts via Twilio" },
    { id: "security" as Tab,      label: "Security",      icon: Shield,      desc: "Password & access" },
    { id: "auth" as Tab,           label: "Auth / OAuth",  icon: LogIn,       desc: "Google sign-in" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure your platform preferences and operational rules</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left tab nav */}
        <div className="w-52 shrink-0 rounded-2xl border-2 border-indigo-100 bg-white p-2 space-y-0.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150",
                  active
                    ? "bg-indigo-600 shadow-md shadow-indigo-200"
                    : "hover:bg-indigo-50/40"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-white/20" : "bg-slate-100"
                )}>
                  <tab.icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-500")} />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-semibold leading-tight", active ? "text-white" : "text-slate-700")}>{tab.label}</p>
                  <p className={cn("text-[10px] mt-0.5 truncate", active ? "text-indigo-200" : "text-slate-400")}>{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right panel */}
        <div className="flex-1 rounded-2xl border-2 border-indigo-100 bg-white p-7">

          {/* ── GENERAL ── */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">General Settings</h3>
                <p className="text-sm text-slate-500 mt-1">Update your business information and locale preferences</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-11 rounded-xl" value={settings.general.businessName}
                      onChange={(e) => setSettings({ ...settings, general: { ...settings.general, businessName: e.target.value } })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Contact Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-11 rounded-xl" type="email" value={settings.general.contactEmail}
                      onChange={(e) => setSettings({ ...settings, general: { ...settings.general, contactEmail: e.target.value } })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Support Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-11 rounded-xl" type="tel" value={settings.general.supportPhone}
                      onChange={(e) => setSettings({ ...settings, general: { ...settings.general, supportPhone: e.target.value } })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Currency</Label>
                  <select
                    className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={settings.general.currency}
                    onChange={(e) => setSettings({ ...settings, general: { ...settings.general, currency: e.target.value } })}
                  >
                    <option value="USD">USD – US Dollar</option>
                    <option value="KHR">KHR – Cambodian Riel</option>
                    <option value="THB">THB – Thai Baht</option>
                    <option value="VND">VND – Vietnamese Dong</option>
                    <option value="EUR">EUR – Euro</option>
                    <option value="GBP">GBP – British Pound</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700">Timezone</Label>
                  <select
                    className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={settings.general.timezone}
                    onChange={(e) => setSettings({ ...settings, general: { ...settings.general, timezone: e.target.value } })}
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (ICT +7)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (ICT +7)</option>
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (+7)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST +9)</option>
                  </select>
                </div>
              </div>
              <SaveBar saving={saving} saved={savedSection === "general"} error={saveError} onSave={() => saveSection("general")} />
            </div>
          )}

          {/* ── BOOKING RULES ── */}
          {activeTab === "booking" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Booking Rules</h3>
                <p className="text-sm text-slate-500 mt-1">Control seat limits, cutoff windows, and booking policies</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Max Seats per Booking</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-11 rounded-xl" type="number" min={1} max={20}
                      value={settings.booking.maxSeatsPerBooking}
                      onChange={(e) => setSettings({ ...settings, booking: { ...settings.booking, maxSeatsPerBooking: Number(e.target.value) } })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Booking Cutoff (minutes before departure)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-11 rounded-xl" type="number" min={0}
                      value={settings.booking.bookingCutoffMinutes}
                      onChange={(e) => setSettings({ ...settings, booking: { ...settings.booking, bookingCutoffMinutes: Number(e.target.value) } })} />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-semibold text-slate-700">Cancellation Window (hours before departure)</Label>
                  <div className="relative">
                    <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-10 h-11 rounded-xl" type="number" min={0}
                      value={settings.booking.cancellationWindowHours}
                      onChange={(e) => setSettings({ ...settings, booking: { ...settings.booking, cancellationWindowHours: Number(e.target.value) } })} />
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-indigo-100 px-5 py-1">
                <ToggleRow
                  label="Auto-confirm Bookings"
                  description="Automatically confirm bookings without manual review"
                  checked={settings.booking.autoConfirm}
                  onChange={(v) => setSettings({ ...settings, booking: { ...settings.booking, autoConfirm: v } })}
                />
                <ToggleRow
                  label="Require Payment Upfront"
                  description="Passengers must pay online before the booking is confirmed"
                  checked={settings.booking.requirePaymentUpfront}
                  onChange={(v) => setSettings({ ...settings, booking: { ...settings.booking, requirePaymentUpfront: v } })}
                />
              </div>
              <SaveBar saving={saving} saved={savedSection === "booking"} error={saveError} onSave={() => saveSection("booking")} />
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Notification Settings</h3>
                <p className="text-sm text-slate-500 mt-1">Manage how and when you receive alerts</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Admin Alert Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input className="pl-10 h-11 rounded-xl" type="email" placeholder="admin@example.com"
                    value={settings.notifications.adminAlertEmail}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, adminAlertEmail: e.target.value } })} />
                </div>
                <p className="text-xs text-slate-500">All system alerts will be sent to this address</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-indigo-100 px-5 py-1">
                <ToggleRow
                  label="Email Notifications"
                  description="Send booking confirmations and updates via email"
                  checked={settings.notifications.emailEnabled}
                  onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, emailEnabled: v } })}
                />
                <ToggleRow
                  label="SMS Notifications"
                  description="Send SMS alerts to passengers (requires Twilio setup)"
                  checked={settings.notifications.smsEnabled}
                  onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, smsEnabled: v } })}
                />
                <ToggleRow
                  label="New Booking Alerts"
                  description="Notify admin email whenever a new booking is made"
                  checked={settings.notifications.notifyOnNewBooking}
                  onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, notifyOnNewBooking: v } })}
                />
                <ToggleRow
                  label="Cancellation Alerts"
                  description="Notify admin email whenever a booking is cancelled"
                  checked={settings.notifications.notifyOnCancellation}
                  onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, notifyOnCancellation: v } })}
                />
              </div>
              <SaveBar saving={saving} saved={savedSection === "notifications"} error={saveError} onSave={() => saveSection("notifications")} />
            </div>
          )}

          {/* ── BRANDING ── */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Branding</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload your company logo. It will appear in the navigation bar and on tickets.
                </p>
              </div>

              {/* Current logo */}
              <div className="rounded-2xl border border-indigo-100 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-700 mb-3">Current Logo</p>
                <div className="flex items-center gap-4">
                  {currentLogoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentLogoUrl}
                        alt="Current logo"
                        className="h-16 w-16 rounded-2xl object-contain border border-indigo-100 bg-white p-1 shadow-sm"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">Logo is set</p>
                        <p className="text-xs text-slate-500 mt-0.5">Showing in the navbar and on tickets.</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeLogo}
                        disabled={logoUploading}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-black text-white shadow-md">
                        RM
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Using default initials badge</p>
                        <p className="text-xs text-slate-500 mt-0.5">Upload a logo below to replace it.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Upload zone */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Upload New Logo</p>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
                />

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) pickFile(f);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors",
                    isDragging
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-indigo-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
                    isDragging ? "bg-indigo-100" : "bg-white border border-indigo-100"
                  )}>
                    <ImageIcon className={cn("h-6 w-6", isDragging ? "text-indigo-600" : "text-slate-400")} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      {isDragging ? "Drop to upload" : "Drop your logo here or click to browse"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">PNG, JPG, WebP, SVG · Max 2 MB</p>
                  </div>
                </div>
              </div>

              {/* Preview of selected file */}
              {previewUrl && selectedFile && (
                <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-14 w-14 rounded-xl object-contain border border-white bg-white p-1 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Feedback message */}
              {logoMsg && (
                <div className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
                  logoMsg.kind === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                )}>
                  {logoMsg.kind === "ok"
                    ? <Check className="h-4 w-4 shrink-0" />
                    : <X className="h-4 w-4 shrink-0" />
                  }
                  {logoMsg.text}
                </div>
              )}

              {/* Upload button */}
              <div className="border-t border-indigo-50 pt-5">
                <Button
                  onClick={uploadLogo}
                  disabled={!selectedFile || logoUploading}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl h-11 px-7 shadow-md shadow-indigo-200 disabled:opacity-50"
                >
                  {logoUploading
                    ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Uploading…</>
                    : <><Upload className="h-4 w-4 mr-2" />Upload Logo</>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* ── PAYMENT GATEWAYS ── */}
          {activeTab === "payment" && (
            <PaymentTab
              payment={settings.payment}
              onChange={(payment) => setSettings({ ...settings, payment })}
              saving={saving}
              saved={savedSection === "payment"}
              error={saveError}
              onSave={() => saveSection("payment")}
            />
          )}

          {/* ── SMS / TWILIO ── */}
          {activeTab === "sms" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">SMS Notifications</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Send WhatsApp-style SMS alerts to passengers via Twilio when announcements are sent.
                  Passengers receive alerts on the phone number registered in their profile.
                </p>
              </div>

              {/* Info banner */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex gap-3">
                <Phone className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-semibold mb-0.5">How it works</p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    When you send an announcement from the bus management panel, passengers who have a registered phone number automatically receive an SMS. Enable this and enter your Twilio credentials to activate.
                  </p>
                </div>
              </div>

              {/* Enable toggle */}
              <div className="rounded-xl bg-slate-50 border border-indigo-100 px-5 py-1">
                <ToggleRow
                  label="Enable SMS Notifications"
                  description="Send SMS to passengers when announcements are broadcast"
                  checked={settings.sms.twilio.enabled}
                  onChange={(v) => setSettings({ ...settings, sms: { ...settings.sms, twilio: { ...settings.sms.twilio, enabled: v } } })}
                />
              </div>

              {/* Credentials */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">Account SID</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 h-11 rounded-xl font-mono text-sm"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={settings.sms.twilio.accountSid}
                      onChange={(e) => setSettings({ ...settings, sms: { ...settings.sms, twilio: { ...settings.sms.twilio, accountSid: e.target.value } } })}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Found on your Twilio Console dashboard</p>
                </div>

                <SecretInput
                  label="Auth Token"
                  hint="Found next to your Account SID on the Twilio Console"
                  placeholder="Paste your auth token"
                  value={settings.sms.twilio.authToken}
                  onChange={(v) => setSettings({ ...settings, sms: { ...settings.sms, twilio: { ...settings.sms.twilio, authToken: v } } })}
                />

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">From Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-10 h-11 rounded-xl"
                      placeholder="+1234567890"
                      value={settings.sms.twilio.fromNumber}
                      onChange={(e) => setSettings({ ...settings, sms: { ...settings.sms, twilio: { ...settings.sms.twilio, fromNumber: e.target.value } } })}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Your Twilio phone number in E.164 format (e.g. +12015551234)</p>
                </div>
              </div>

              {/* Setup hint */}
              <div className="rounded-xl border border-indigo-100 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Environment variables (optional)</p>
                <p>You can also set these in your <code className="bg-slate-200 rounded px-1">.env.local</code> file:</p>
                <pre className="mt-1 text-[11px] text-slate-600 bg-white border border-indigo-100 rounded-lg px-3 py-2 overflow-x-auto">
{`TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890`}
                </pre>
              </div>

              <SaveBar saving={saving} saved={savedSection === "sms"} error={saveError} onSave={() => saveSection("sms")} />
            </div>
          )}

          {/* ── AUTH / GOOGLE OAUTH ── */}
          {activeTab === "auth" && (
            <AuthTab
              auth={settings.auth}
              onChange={(auth) => setSettings({ ...settings, auth })}
              saving={saving}
              saved={savedSection === "auth"}
              error={saveError}
              onSave={() => saveSection("auth")}
            />
          )}

          {/* ── SECURITY ── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Security</h3>
                <p className="text-sm text-slate-500 mt-1">Change your admin password</p>
              </div>

              <div className="space-y-4">
                {(["current", "next", "confirm"] as const).map((field) => {
                  const labels = { current: "Current Password", next: "New Password", confirm: "Confirm New Password" };
                  const placeholders = { current: "Enter current password", next: "Min. 8 characters", confirm: "Repeat new password" };
                  return (
                    <div key={field} className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">{labels[field]}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          className="pl-10 pr-11 h-11 rounded-xl"
                          type={showPw[field] ? "text" : "password"}
                          placeholder={placeholders[field]}
                          value={pwData[field]}
                          onChange={(e) => setPwData({ ...pwData, [field]: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw({ ...showPw, [field]: !showPw[field] })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPw[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pwError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {pwError}
                </div>
              )}
              {pwSaved && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2 font-medium">
                  <Check className="h-4 w-4 shrink-0" /> Password changed successfully!
                </div>
              )}

              <div className="border-t border-indigo-50 pt-5">
                <Button
                  onClick={changePassword}
                  disabled={pwSaving || !pwData.current || !pwData.next || !pwData.confirm}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl h-11 px-7 shadow-md shadow-indigo-200"
                >
                  {pwSaving
                    ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Updating…</>
                    : <><Lock className="h-4 w-4 mr-2" />Update Password</>
                  }
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Secret key input with show/hide toggle ──────────────────────────────────
function SecretInput({
  label, hint, value, onChange, placeholder,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-slate-700">{label}</Label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-10 pr-11 h-11 rounded-xl font-mono text-sm"
          type={show ? "text" : "password"}
          placeholder={placeholder ?? "Paste your key here"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Payment Gateways tab ─────────────────────────────────────────────────────
type PaymentTabProps = {
  payment: SettingsData["payment"];
  onChange: (p: SettingsData["payment"]) => void;
  saving: boolean; saved: boolean; error: string | null;
  onSave: () => void;
};

function PaymentTab({ payment, onChange, saving, saved, error, onSave }: PaymentTabProps) {
  const setStripe = (patch: Partial<SettingsData["payment"]["stripe"]>) =>
    onChange({ ...payment, stripe: { ...payment.stripe, ...patch } });
  const setAba = (patch: Partial<SettingsData["payment"]["abaPayway"]>) =>
    onChange({ ...payment, abaPayway: { ...payment.abaPayway, ...patch } });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Payment Gateways</h3>
        <p className="text-sm text-slate-500 mt-1">
          Store your API keys here. Secret keys are masked in the UI — they are never exposed to end users.
        </p>
      </div>

      {/* Active gateway selector */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-700">Active Gateway</Label>
        <div className="flex flex-wrap gap-3">
          {(["none", "stripe", "abaPayway"] as const).map((gw) => {
            const labels = { none: "None (disabled)", stripe: "Stripe", abaPayway: "ABA PayWay" };
            const active = payment.activeGateway === gw;
            return (
              <button
                key={gw}
                type="button"
                onClick={() => onChange({ ...payment, activeGateway: gw })}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-indigo-100 bg-white text-slate-500 hover:border-indigo-200"
                )}
              >
                <CircleDot className={cn("h-4 w-4", active ? "text-indigo-500" : "text-slate-300")} />
                {labels[gw]}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400">
          Only the active gateway will be used when processing payments.
        </p>
      </div>

      {/* ── Stripe ── */}
      <div className={cn(
        "rounded-2xl border-2 p-5 space-y-4 transition-colors",
        payment.stripe.enabled ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow">
              S
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Stripe</p>
              <p className="text-xs text-slate-500">Global card payments</p>
            </div>
          </div>
          <Toggle checked={payment.stripe.enabled} onChange={(v) => setStripe({ enabled: v })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Publishable Key</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10 h-11 rounded-xl font-mono text-sm"
                placeholder="pk_test_..."
                value={payment.stripe.publishableKey}
                onChange={(e) => setStripe({ publishableKey: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-slate-400">Safe to expose — used in the browser</p>
          </div>

          <SecretInput
            label="Secret Key"
            placeholder="sk_test_..."
            value={payment.stripe.secretKey}
            onChange={(v) => setStripe({ secretKey: v })}
            hint="Never shared with users. Masked after saving."
          />

          <div className="sm:col-span-2">
            <SecretInput
              label="Webhook Secret"
              placeholder="whsec_..."
              value={payment.stripe.webhookSecret}
              onChange={(v) => setStripe({ webhookSecret: v })}
              hint="From Stripe Dashboard → Webhooks. Used to verify payment events."
            />
          </div>
        </div>
      </div>

      {/* ── ABA PayWay ── */}
      <div className={cn(
        "rounded-2xl border-2 p-5 space-y-4 transition-colors",
        payment.abaPayway.enabled ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-slate-50/50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow">
              ABA
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">ABA PayWay</p>
              <p className="text-xs text-slate-500">Cambodia — KHQR & cards</p>
            </div>
          </div>
          <Toggle checked={payment.abaPayway.enabled} onChange={(v) => setAba({ enabled: v })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Merchant ID</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10 h-11 rounded-xl font-mono text-sm"
                placeholder="Your ABA merchant ID"
                value={payment.abaPayway.merchantId}
                onChange={(e) => setAba({ merchantId: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Public Key</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10 h-11 rounded-xl font-mono text-sm"
                placeholder="ABA public key"
                value={payment.abaPayway.publicKey}
                onChange={(e) => setAba({ publicKey: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-slate-400">Used in the KHQR checkout widget</p>
          </div>

          <div className="sm:col-span-2">
            <SecretInput
              label="API Key (Secret)"
              placeholder="ABA PayWay API key"
              value={payment.abaPayway.apiKey}
              onChange={(v) => setAba({ apiKey: v })}
              hint="From ABA PayWay merchant portal. Masked after saving."
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <span>
          Keys are stored encrypted in the database. For production, also set{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> and{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">ABA_API_KEY</code> as environment
          variables — your payment code can prefer env vars over DB values.
        </span>
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={onSave} />
    </div>
  );
}

// ── Google OAuth tab ─────────────────────────────────────────────────────────
type AuthTabProps = {
  auth: SettingsData["auth"];
  onChange: (a: SettingsData["auth"]) => void;
  saving: boolean; saved: boolean; error: string | null;
  onSave: () => void;
};

function AuthTab({ auth, onChange, saving, saved, error, onSave }: AuthTabProps) {
  const setGoogle = (patch: Partial<SettingsData["auth"]["google"]>) =>
    onChange({ ...auth, google: { ...auth.google, ...patch } });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Google OAuth</h3>
        <p className="text-sm text-slate-500 mt-1">
          Allow users to sign in with their Google account. Enter your Client ID and Secret from
          the Google Cloud Console, then enable the toggle to activate.
        </p>
      </div>

      {/* How-to banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex gap-3">
        <LogIn className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold mb-0.5">Setup guide</p>
          <ol className="text-blue-700 text-xs leading-relaxed list-decimal ml-4 space-y-0.5">
            <li>Go to Google Cloud Console → APIs &amp; Services → Credentials</li>
            <li>Create an OAuth 2.0 Client ID (Web application)</li>
            <li>Add <code className="bg-blue-100 rounded px-1">[your-site-url]/api/auth/callback/google</code> as an authorised redirect URI (e.g. <code className="bg-blue-100 rounded px-1">http://localhost:3000/api/auth/callback/google</code> for local dev)</li>
            <li>Paste the Client ID and Secret below, then enable the toggle</li>
          </ol>
        </div>
      </div>

      {/* Missing credentials warning */}
      {auth.google.enabled && (!auth.google.clientId || !auth.google.clientSecret) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <p className="font-semibold">Google sign-in is enabled but credentials are missing</p>
            <p className="text-rose-700 text-xs mt-0.5">
              Enter your Client ID and Client Secret from Google Cloud Console below, then save.
              The "Continue with Google" button will only appear on the login page once both fields are filled.
            </p>
          </div>
        </div>
      )}

      {auth.google.enabled && auth.google.clientId && auth.google.clientSecret && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex gap-3">
          <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-semibold">Google sign-in is active</p>
            <p className="text-emerald-700 text-xs mt-0.5">
              The "Continue with Google" button is showing on the login page.
            </p>
          </div>
        </div>
      )}

      {/* Google card */}
      <div className={cn(
        "rounded-2xl border-2 p-5 space-y-4 transition-colors",
        auth.google.enabled ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-indigo-100 shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Google Sign-In</p>
              <p className="text-xs text-slate-500">OAuth 2.0 — accounts.google.com</p>
            </div>
          </div>
          <Toggle checked={auth.google.enabled} onChange={(v) => setGoogle({ enabled: v })} />
        </div>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Client ID</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10 h-11 rounded-xl font-mono text-sm"
                placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                value={auth.google.clientId}
                onChange={(e) => setGoogle({ clientId: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-slate-400">Safe to expose — used to initiate the OAuth flow</p>
          </div>

          <SecretInput
            label="Client Secret"
            placeholder="GOCSPX-..."
            value={auth.google.clientSecret}
            onChange={(v) => setGoogle({ clientSecret: v })}
            hint="From Google Cloud Console → Credentials. Masked after saving."
          />
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <span>
          You can also set <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> as environment
          variables — env vars take precedence over the DB values.
        </span>
      </div>

      <SaveBar saving={saving} saved={saved} error={error} onSave={onSave} />
    </div>
  );
}