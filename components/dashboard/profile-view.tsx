"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, MapPin, Calendar, Edit3, Check, X,
  ArrowLeft, Lock, Bell, Eye, EyeOff, CheckCircle2, AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/lib/auth";

type ProfileViewProps = { user: UserType };

type NotifPrefs = {
  bookingConfirmation: boolean;
  cancellationAlerts: boolean;
  promotionalEmails: boolean;
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
        checked ? "bg-indigo-600" : "bg-slate-200"
      )}
    >
      <span className={cn(
        "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200",
        checked ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

export default function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();

  // ── Profile edit ──
  const [isEditing,   setIsEditing]   = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [profileMsg,  setProfileMsg]  = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [formData,    setFormData]    = useState({ name: user.name || "", phone: user.phone || "", address: user.address || "" });

  // ── Change password ──
  const [pwForm,      setPwForm]      = useState({ current: "", next: "", confirm: "" });
  const [showPw,      setShowPw]      = useState({ current: false, next: false, confirm: false });
  const [pwPending,   setPwPending]   = useState(false);
  const [pwMsg,       setPwMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Notification prefs ──
  const [notifs,      setNotifs]      = useState<NotifPrefs>({
    bookingConfirmation: true,
    cancellationAlerts: true,
    promotionalEmails: false,
  });
  const [notifPending, setNotifPending] = useState(false);
  const [notifMsg,     setNotifMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Load current prefs from the API
  useEffect(() => {
    fetch("/api/user/profile")
      .then(r => r.json())
      .then(d => {
        const p = d.user?.preferences?.notifications;
        if (p) setNotifs({
          bookingConfirmation: p.bookingConfirmation ?? true,
          cancellationAlerts:  p.cancellationAlerts  ?? true,
          promotionalEmails:   p.promotionalEmails   ?? false,
        });
      })
      .catch(() => {});
  }, []);

  // ── Handlers ──
  async function handleSaveProfile() {
    setIsSaving(true); setProfileMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const d = await res.json();
        setProfileMsg({ type: "err", text: d.message ?? "Failed to update." });
        return;
      }
      setIsEditing(false);
      setProfileMsg({ type: "ok", text: "Profile updated successfully." });
      router.refresh();
    } catch {
      setProfileMsg({ type: "err", text: "Failed to update profile." });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setFormData({ name: user.name || "", phone: user.phone || "", address: user.address || "" });
    setIsEditing(false);
    setProfileMsg(null);
  }

  async function handleChangePassword() {
    setPwMsg(null);
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwMsg({ type: "err", text: "All password fields are required." }); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: "err", text: "New passwords do not match." }); return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: "err", text: "New password must be at least 8 characters." }); return;
    }
    setPwPending(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const d = await res.json();
      if (!res.ok) { setPwMsg({ type: "err", text: d.message ?? "Failed." }); return; }
      setPwMsg({ type: "ok", text: "Password changed successfully." });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch {
      setPwMsg({ type: "err", text: "Something went wrong. Please try again." });
    } finally {
      setPwPending(false);
    }
  }

  async function handleSaveNotifs() {
    setNotifPending(true); setNotifMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { notifications: notifs } }),
      });
      if (!res.ok) { setNotifMsg({ type: "err", text: "Failed to save preferences." }); return; }
      setNotifMsg({ type: "ok", text: "Notification preferences saved." });
    } catch {
      setNotifMsg({ type: "err", text: "Something went wrong." });
    } finally {
      setNotifPending(false);
    }
  }

  const toggleNotif = (key: keyof NotifPrefs) =>
    setNotifs(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-indigo-500 font-semibold">My Profile</p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Account Details</h1>
        <p className="text-base text-slate-500">Manage your personal information, security, and notification preferences.</p>
      </div>

      {/* ── Profile Card ── */}
      <Card className="border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-2xl">
        <CardHeader className="border-b-2 border-dashed border-slate-200/60 bg-gradient-to-r from-slate-50 to-indigo-50 px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-4xl font-bold shadow-xl shadow-indigo-200">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-slate-900">{user.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2 text-base">
                  <Mail className="h-4 w-4" />{user.email}
                </CardDescription>
              </div>
            </div>
            {!isEditing ? (
              <Button size="lg" className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg" onClick={() => { setIsEditing(true); setProfileMsg(null); }}>
                <Edit3 className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="lg" variant="outline" className="rounded-full border-2 border-slate-300" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
                <Button size="lg" className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg" onClick={handleSaveProfile} disabled={isSaving}>
                  <Check className="h-4 w-4 mr-2" />{isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-8 py-8 space-y-8">
          {profileMsg && (
            <div className={cn("flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium", profileMsg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
              {profileMsg.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {profileMsg.text}
            </div>
          )}

          {/* Account info fields */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-5 flex items-center gap-2">
              <User className="h-4 w-4" /> Account Information
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Full Name</Label>
                {isEditing
                  ? <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl" placeholder="Enter your full name" />
                  : <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900">{user.name || "Not provided"}</div>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Email Address</Label>
                <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500 shrink-0" />{user.email}
                </div>
                <p className="text-xs text-slate-400">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Phone Number</Label>
                {isEditing
                  ? <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-12 rounded-xl" placeholder="+855 12 345 678" />
                  : <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500 shrink-0" />{user.phone || "Not provided"}</div>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Address</Label>
                {isEditing
                  ? <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="h-12 rounded-xl" placeholder="Enter your address" />
                  : <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500 shrink-0" />{user.address || "Not provided"}</div>}
              </div>
            </div>
          </div>

          {/* Account details */}
          <div className="border-t-2 border-slate-200 pt-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-5 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Account Details
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Role</p>
                <div className="mt-3">
                  {user.role === "admin"
                    ? <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 text-sm px-3 py-1">Administrator</Badge>
                    : <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-sm px-3 py-1">User</Badge>}
                </div>
              </div>
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Member Since</p>
                <p className="mt-3 text-base font-semibold text-slate-900">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                    : "Recently"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Change Password ── */}
      <Card className="border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-2xl">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Lock className="h-5 w-5 text-indigo-500" /> Change Password
          </CardTitle>
          <CardDescription className="text-base">Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-5">
          {pwMsg && (
            <div className={cn("flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium", pwMsg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
              {pwMsg.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {pwMsg.text}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-3">
            {(["current", "next", "confirm"] as const).map((field) => {
              const labels = { current: "Current Password", next: "New Password", confirm: "Confirm New Password" };
              return (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">{labels[field]}</Label>
                  <div className="relative">
                    <Input
                      type={showPw[field] ? "text" : "password"}
                      value={pwForm[field]}
                      onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder="••••••••"
                      className="h-12 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={pwPending}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-all px-7"
          >
            <Lock className="h-4 w-4 mr-2" />
            {pwPending ? "Updating…" : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Notification Preferences ── */}
      <Card className="border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-2xl">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Bell className="h-5 w-5 text-indigo-500" /> Notification Preferences
          </CardTitle>
          <CardDescription className="text-base">Choose which emails and alerts you receive.</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-5">
          {notifMsg && (
            <div className={cn("flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium", notifMsg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
              {notifMsg.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {notifMsg.text}
            </div>
          )}
          <div className="divide-y divide-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden">
            {([
              { key: "bookingConfirmation", label: "Booking Confirmations", desc: "Receive an email when your booking is confirmed." },
              { key: "cancellationAlerts",  label: "Cancellation Alerts",   desc: "Get notified when a booking is cancelled or refunded." },
              { key: "promotionalEmails",   label: "Promotional Emails",    desc: "Offers, discounts, and travel deals from RedMiles." },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 bg-white px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
                <Toggle checked={notifs[key]} onChange={() => toggleNotif(key)} />
              </div>
            ))}
          </div>
          <Button
            onClick={handleSaveNotifs}
            disabled={notifPending}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-all px-7"
          >
            <Check className="h-4 w-4 mr-2" />
            {notifPending ? "Saving…" : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-2 border-slate-200/60 shadow-2xl">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle className="text-2xl font-bold text-slate-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8 grid gap-4 sm:grid-cols-2">
          <Button variant="outline" className="h-auto rounded-2xl border-2 border-slate-200 bg-white p-5 hover:bg-indigo-50 hover:border-indigo-300 transition-all" onClick={() => router.push("/dashboard")}>
            <div className="flex items-center gap-4 text-left w-full">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">My Bookings</p>
                <p className="text-sm text-slate-500">View your trip history</p>
              </div>
            </div>
          </Button>
          <Button variant="outline" className="h-auto rounded-2xl border-2 border-slate-200 bg-white p-5 hover:bg-emerald-50 hover:border-emerald-300 transition-all" onClick={() => router.push("/")}>
            <div className="flex items-center gap-4 text-left w-full">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">Book a Trip</p>
                <p className="text-sm text-slate-500">Search for buses</p>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
