"use client";

import { useEffect, useState } from "react";
import { Megaphone, Clock, MapPin, Info, AlertTriangle, Send, Loader2, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toastSuccess, toastError } from "@/lib/swal";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "general",              label: "General Update",         icon: Info,          color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { value: "delay",                label: "Trip Delay",             icon: Clock,         color: "text-amber-600 bg-amber-50 border-amber-200"   },
  { value: "platform_change",      label: "Platform / Stop Change", icon: MapPin,        color: "text-blue-600 bg-blue-50 border-blue-200"      },
  { value: "cancellation_warning", label: "Cancellation Warning",   icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200"         },
] as const;

type AnnounceType = typeof TYPES[number]["value"];

type Preview = {
  route: string;
  date: string;
  departureTime: string;
  totalPassengers: number;
  reachable: number;
  recipients: { name: string; email: string; seats: string[] }[];
};

type Props = {
  busId: string | null;
  busLabel?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export default function AdminAnnouncementDialog({ busId, busLabel, open, onOpenChange }: Props) {
  const [preview, setPreview]       = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending]       = useState(false);
  const [done, setDone]             = useState(false);
  const [sentCount, setSentCount]   = useState(0);

  const [type, setType]             = useState<AnnounceType>("general");
  const [message, setMessage]       = useState("");
  const [delayMinutes, setDelayMinutes] = useState("");

  useEffect(() => {
    if (!open || !busId) { setPreview(null); setDone(false); setMessage(""); setType("general"); setDelayMinutes(""); return; }
    setLoadingPreview(true);
    fetch(`/api/admin/buses/${busId}/announce`)
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => toastError("Failed to load trip details"))
      .finally(() => setLoadingPreview(false));
  }, [open, busId]);

  async function handleSend() {
    if (!busId) return;
    if (!message.trim()) { toastError("Please enter a message"); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/buses/${busId}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          ...(type === "delay" && delayMinutes ? { delayMinutes: Number(delayMinutes) } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toastError(json.message ?? "Failed to send"); return; }
      setSentCount(json.sent ?? 0);
      setDone(true);
      toastSuccess(`Announcement sent to ${json.sent} passenger${json.sent !== 1 ? "s" : ""}`);
    } catch {
      toastError("Request failed");
    } finally {
      setSending(false);
    }
  }

  const selectedType = TYPES.find((t) => t.value === type) ?? TYPES[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Megaphone className="h-5 w-5 text-indigo-500" />
            Send Announcement
          </DialogTitle>
          <DialogDescription>
            {busLabel && <span className="font-medium text-slate-700">{busLabel}</span>}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-emerald-800">Announcement Sent</p>
              <p className="text-sm text-emerald-700 mt-1">
                Delivered to {sentCount} passenger{sentCount !== 1 ? "s" : ""} via email
              </p>
            </div>
            <Button className="w-full rounded-xl" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Trip info */}
            {preview && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{preview.route}</p>
                  <p className="text-xs text-slate-500">{preview.date} · {preview.departureTime}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  <Users className="h-4 w-4 text-slate-400" />
                  {loadingPreview ? "…" : `${preview.reachable} / ${preview.totalPassengers}`}
                  <span className="text-xs font-normal text-slate-400">reachable</span>
                </div>
              </div>
            )}

            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Announcement Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all text-left",
                        active ? t.color : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delay minutes (only for delay type) */}
            {type === "delay" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Estimated Delay (minutes)</Label>
                <Input
                  type="number" min={1} max={600}
                  placeholder="e.g. 30"
                  className="h-10 rounded-xl"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(e.target.value)}
                />
              </div>
            )}

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder={
                  type === "delay" ? "e.g. Your bus is delayed due to heavy traffic on National Road 1. We expect departure by 09:30 AM."
                  : type === "platform_change" ? "e.g. The boarding point has changed to Gate B (near the central market). Look for the blue signage."
                  : type === "cancellation_warning" ? "e.g. Due to ongoing vehicle maintenance, there is a possibility of service cancellation. We will provide a final update by 07:00 AM."
                  : "Enter your message to passengers…"
                }
                className="rounded-xl resize-none h-28"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-slate-400">{message.length} characters</p>
            </div>

            {/* Recipient preview */}
            {preview && preview.recipients.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <p className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Recipients ({preview.reachable})
                </p>
                <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                  {preview.recipients.slice(0, 20).map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </div>
                  ))}
                  {preview.recipients.length > 20 && (
                    <p className="px-4 py-2 text-xs text-slate-400 italic">
                      +{preview.recipients.length - 20} more recipients
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!done && (
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold gap-2"
            >
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send to {preview?.reachable ?? "…"} Passengers</>}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
