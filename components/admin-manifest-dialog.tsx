"use client";

import { useEffect, useState } from "react";
import {
  Users, Printer, X, CheckCircle2, Clock, Bus, Calendar,
  ArrowRight, Download,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Passenger = {
  seat: string; name: string; age: number | null; gender: string;
  contactNumber: string; email: string; bookingId: string; checkedIn: boolean;
};

type ManifestBus = {
  id: string; from: string; to: string;
  date: string; departureTime: string; arrivalTime: string;
  busType: string; totalSeats: number; bookedCount: number;
};

type ManifestData = {
  bus: ManifestBus;
  passengers: Passenger[];
  totalPassengers: number;
  checkedIn: number;
};

type Props = {
  busId: string | null;
  busLabel: string;
  open: boolean;
  onClose: () => void;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default function AdminManifestDialog({ busId, busLabel, open, onClose }: Props) {
  const [data,    setData]    = useState<ManifestData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!busId || !open) return;
    setLoading(true);
    fetch(`/api/admin/buses/${busId}/manifest`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [busId, open]);

  const handlePrint = () => {
    if (!data) return;
    const rows = data.passengers.map(p => `
      <tr>
        <td>${p.seat}</td>
        <td>${p.name}</td>
        <td>${p.age ?? "—"}</td>
        <td>${p.gender}</td>
        <td>${p.contactNumber}</td>
        <td>${p.email}</td>
        <td>#${p.bookingId}</td>
        <td>${p.checkedIn ? "✓" : ""}</td>
      </tr>`).join("");

    const html = `
      <!DOCTYPE html><html><head>
      <title>Passenger Manifest — ${data.bus.from} → ${data.bus.to} ${fmtDate(data.bus.date)}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 24px; font-size: 13px; color: #1e293b; }
        h1   { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
        .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
        .stats { display: flex; gap: 24px; margin-bottom: 20px; }
        .stat  { background: #f1f5f9; border-radius: 8px; padding: 10px 16px; }
        .stat p { margin: 0; }
        .stat .v { font-size: 22px; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
        td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) td { background: #f8fafc; }
        @media print { body { margin: 0; } }
      </style>
      </head><body>
      <h1>Passenger Manifest</h1>
      <div class="meta">${data.bus.from} → ${data.bus.to} · ${fmtDate(data.bus.date)} · Dep: ${data.bus.departureTime} · ${data.bus.busType}</div>
      <div class="stats">
        <div class="stat"><p class="v">${data.totalPassengers}</p><p>Total Passengers</p></div>
        <div class="stat"><p class="v">${data.checkedIn}</p><p>Checked In</p></div>
        <div class="stat"><p class="v">${data.totalPassengers - data.checkedIn}</p><p>Not Yet Checked In</p></div>
        <div class="stat"><p class="v">${data.bus.totalSeats}</p><p>Total Seats</p></div>
      </div>
      <table>
        <thead><tr><th>Seat</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Email</th><th>Booking</th><th>Checked In</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;font-size:11px;color:#94a3b8;">Printed ${new Date().toLocaleString()} · ${busLabel}</p>
      </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-3xl bg-white border-slate-200 text-slate-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
              <Users className="size-4 text-indigo-600" />
            </div>
            Passenger Manifest
            <span className="text-slate-400 text-sm font-normal">{busLabel}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
          </div>
        ) : !data ? (
          <p className="py-8 text-center text-slate-400 text-sm">Failed to load manifest.</p>
        ) : (
          <div className="space-y-4">
            {/* Bus info banner */}
            <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bus className="h-5 w-5 opacity-80" />
                  <div>
                    <p className="font-bold text-base">{data.bus.from} <ArrowRight className="inline h-4 w-4 mx-1" /> {data.bus.to}</p>
                    <p className="text-xs text-white/75">{data.bus.busType} · {fmtDate(data.bus.date)} · Dep {data.bus.departureTime}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-2xl font-black">{data.totalPassengers}</p>
                    <p className="text-[10px] text-white/70 uppercase tracking-wider">Passengers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{data.checkedIn}</p>
                    <p className="text-[10px] text-white/70 uppercase tracking-wider">Checked In</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{data.bus.totalSeats}</p>
                    <p className="text-[10px] text-white/70 uppercase tracking-wider">Total Seats</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            {data.passengers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No confirmed passengers yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Seat", "Name", "Age/Gender", "Contact", "Email", "Booking", "Status"].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.passengers.map((p, i) => (
                      <tr key={i} className={cn("hover:bg-slate-50/80 transition-colors", p.checkedIn && "bg-emerald-50/40")}>
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 rounded-lg px-2 py-0.5 text-xs">{p.seat}</span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{p.name}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">
                          {p.age ?? "—"} · {p.gender !== "—" ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">{p.contactNumber}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs max-w-[140px] truncate">{p.email}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs text-slate-400">#{p.bookingId}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {p.checkedIn ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="text-slate-600 border-slate-200 rounded-xl">
                <X className="size-4 mr-1.5" /> Close
              </Button>
              <Button
                onClick={handlePrint}
                disabled={data.passengers.length === 0}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl hover:from-indigo-600 hover:to-violet-700 gap-2"
              >
                <Printer className="size-4" /> Print Manifest
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
