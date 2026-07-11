"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, MapPin, Calendar, Edit3, Check, X,
  ArrowLeft, Lock, Bell, Eye, EyeOff, CheckCircle2, AlertCircle, Shield,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/lib/auth";

type ProfileViewProps = { user: UserType };
type NotifPrefs = { bookingConfirmation: boolean; cancellationAlerts: boolean; promotionalEmails: boolean };

const TABS = [
  { key: "profile",  label: "Profile",       icon: User   },
  { key: "security", label: "Security",       icon: Lock   },
  { key: "notifs",   label: "Notifications",  icon: Bell   },
] as const;
type Tab = typeof TABS[number]["key"];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-slate-700" : "bg-slate-200")}>
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

function Msg({ msg }: { msg: { type: "ok" | "err"; text: string } }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium",
      msg.type === "ok" ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-600 border border-red-100")}>
      {msg.type === "ok" ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-500" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

export default function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [formData, setFormData] = useState({ name: user.name || "", phone: user.phone || "", address: user.address || "" });

  // Password
  const [pwForm,    setPwForm]    = useState({ current: "", next: "", confirm: "" });
  const [showPw,    setShowPw]    = useState({ current: false, next: false, confirm: false });
  const [pwPending, setPwPending] = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Notifs
  const [notifs, setNotifs] = useState<NotifPrefs>({ bookingConfirmation: true, cancellationAlerts: true, promotionalEmails: false });
  const [notifPending, setNotifPending] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/profile").then(r => r.json()).then(d => {
      const p = d.user?.preferences?.notifications;
      if (p) setNotifs({ bookingConfirmation: p.bookingConfirmation ?? true, cancellationAlerts: p.cancellationAlerts ?? true, promotionalEmails: p.promotionalEmails ?? false });
    }).catch(() => {});
  }, []);

  async function handleSaveProfile() {
    setIsSaving(true); setProfileMsg(null);
    try {
      const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!res.ok) { const d = await res.json(); setProfileMsg({ type: "err", text: d.message ?? "Failed." }); return; }
      setIsEditing(false); setProfileMsg({ type: "ok", text: "Profile updated." }); router.refresh();
    } catch { setProfileMsg({ type: "err", text: "Failed to update." }); }
    finally { setIsSaving(false); }
  }

  async function handleChangePassword() {
    setPwMsg(null);
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwMsg({ type: "err", text: "All fields are required." }); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: "err", text: "Passwords do not match." }); return; }
    if (pwForm.next.length < 8) { setPwMsg({ type: "err", text: "Password must be at least 8 characters." }); return; }
    setPwPending(true);
    try {
      const res = await fetch("/api/user/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }) });
      const d = await res.json();
      if (!res.ok) { setPwMsg({ type: "err", text: d.message ?? "Failed." }); return; }
      setPwMsg({ type: "ok", text: "Password changed." }); setPwForm({ current: "", next: "", confirm: "" });
    } catch { setPwMsg({ type: "err", text: "Something went wrong." }); }
    finally { setPwPending(false); }
  }

  async function handleSaveNotifs() {
    setNotifPending(true); setNotifMsg(null);
    try {
      const res = await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: { notifications: notifs } }) });
      if (!res.ok) { setNotifMsg({ type: "err", text: "Failed." }); return; }
      setNotifMsg({ type: "ok", text: "Preferences saved." });
    } catch { setNotifMsg({ type: "err", text: "Something went wrong." }); }
    finally { setNotifPending(false); }
  }

  const initials = (user.name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back */}
      <button type="button" onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* ── Compact profile header ── */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl border border-slate-200 bg-white">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white text-lg font-bold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">{user.name}</p>
          <p className="text-xs text-slate-400 truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
              <Shield className="h-2.5 w-2.5" />{user.role || "user"}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" /> {memberSince}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 mb-5">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all",
                tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === "profile" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          {profileMsg && <Msg msg={profileMsg} />}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Full Name</Label>
              {isEditing
                ? <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="h-10 rounded-xl" placeholder="Your full name" />
                : <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />{user.name || <span className="text-slate-400">Not provided</span>}
                  </div>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Email Address</Label>
              <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm text-slate-500">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />{user.email}
              </div>
              <p className="text-[10px] text-slate-400">Cannot be changed</p>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Phone Number</Label>
              {isEditing
                ? <Input type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} className="h-10 rounded-xl" placeholder="+855 12 345 678" />
                : <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />{user.phone || <span className="text-slate-400">Not provided</span>}
                  </div>}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Address</Label>
              {isEditing
                ? <Input value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} className="h-10 rounded-xl" placeholder="Your address" />
                : <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />{user.address || <span className="text-slate-400">Not provided</span>}
                  </div>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {!isEditing ? (
              <button onClick={() => { setIsEditing(true); setProfileMsg(null); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                <Edit3 className="h-3.5 w-3.5" /> Edit Profile
              </button>
            ) : (
              <>
                <button onClick={() => { setFormData({ name: user.name || "", phone: user.phone || "", address: user.address || "" }); setIsEditing(false); setProfileMsg(null); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-60">
                  <Check className="h-3.5 w-3.5" />{isSaving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {tab === "security" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-800">Change Password</p>
            <p className="text-xs text-slate-400 mt-0.5">Update your password to keep your account secure.</p>
          </div>
          {pwMsg && <Msg msg={pwMsg} />}
          <div className="space-y-3">
            {(["current", "next", "confirm"] as const).map(field => {
              const labels = { current: "Current Password", next: "New Password", confirm: "Confirm New Password" };
              return (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs text-slate-500">{labels[field]}</Label>
                  <div className="relative">
                    <Input
                      type={showPw[field] ? "text" : "password"}
                      value={pwForm[field]}
                      onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                      placeholder="••••••••"
                      className="h-10 rounded-xl pr-9"
                    />
                    <button type="button"
                      onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={handleChangePassword} disabled={pwPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-60">
            <Lock className="h-3.5 w-3.5" />{pwPending ? "Updating…" : "Update Password"}
          </button>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === "notifs" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-800">Notification Preferences</p>
            <p className="text-xs text-slate-400 mt-0.5">Choose which emails and alerts you receive.</p>
          </div>
          {notifMsg && <Msg msg={notifMsg} />}
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
            {([
              { key: "bookingConfirmation", label: "Booking Confirmations", desc: "Email when your booking is confirmed." },
              { key: "cancellationAlerts",  label: "Cancellation Alerts",   desc: "Notified when a booking is cancelled." },
              { key: "promotionalEmails",   label: "Promotional Emails",    desc: "Offers, discounts, and travel deals." },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 bg-slate-50/40 px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <Toggle checked={notifs[key]} onChange={() => setNotifs(p => ({ ...p, [key]: !p[key] }))} />
              </div>
            ))}
          </div>
          <button onClick={handleSaveNotifs} disabled={notifPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-60">
            <Check className="h-3.5 w-3.5" />{notifPending ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      )}
    </div>
  );
}
