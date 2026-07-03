"use client";

import { useState, useTransition } from "react";
import {
  BarChart3, Download, FileSpreadsheet, TrendingUp, TrendingDown,
  Wallet, XCircle, CheckCircle2, Users, MapPin, RefreshCw,
  CalendarRange, FileText, ArrowUpRight, Minus, Loader2,
  Fuel, Wrench, UserCog, Receipt, TrendingDown as Loss,
} from "lucide-react";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

/* ── helpers ── */
function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(n: number) { return `${n.toFixed(1)}%`; }
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/* ── types ── */
type DayRevenue = {
  date: string; gross: number; refunds: number; net: number;
  discounts: number; confirmed: number; cancelled: number; total: number;
};
type RouteRow = {
  route: string; confirmed: number; cancelled: number; total: number; revenue: number;
};
type RoutePerf = {
  routeId: string; from: string; to: string;
  totalBookings: number; confirmedBookings: number; cancelledBookings: number;
  revenue: number; refunds: number; totalSeats: number; occupancyNote: string;
};
type FuelDay    = { date: string; cost: number; liters: number; count: number };
type MaintType  = { type: string; total: number; count: number };
type ReportData = {
  dateRange: { start: string; end: string };
  revenue: {
    gross: number; refunds: number; discounts: number; net: number;
    byDay: DayRevenue[];
  };
  bookings: {
    total: number; confirmed: number; cancelled: number; pending: number;
    confirmedRate: number; cancellationRate: number;
    avgTicketValue: number; totalPassengers: number;
    byRoute: RouteRow[];
  };
  routes: RoutePerf[];
  expenses: {
    fuel:       { total: number; liters: number; count: number; byDay: FuelDay[] };
    maintenance:{ total: number; count: number; byType: MaintType[] };
    driverPay:  { total: number; regularEarnings: number; otEarnings: number; count: number };
    payroll:    { grossPay: number; netPay: number; totalDeductions: number; count: number };
    totalExpenses: number;
    profitLoss:    number;
  };
};

const MAINT_LABEL: Record<string, string> = {
  oil_change:  "Oil Change",
  tire:        "Tires",
  brake:       "Brakes",
  engine:      "Engine",
  inspection:  "Inspection",
  electrical:  "Electrical",
  bodywork:    "Bodywork",
  other:       "Other",
};
type CompanyInfo = {
  name: string; logoUrl: string | null;
  email: string; phone: string;
};

/* ── CSV helpers ── */
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? "");
        return v.includes(",") ? `"${v}"` : v;
      }).join(",")
    ),
  ].join("\n");
}
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function loadLogoDataUrl(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload  = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth  || 80;
    canvas.height = img.naturalHeight || 80;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/* ── StatCard: clean white card ── */
function StatCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-slate-50 text-slate-500">
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
      <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${w}%` }} />
    </div>
  );
}

/* ── Section header: clean dark underline style ── */
function SectionHeading({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2">
      <span className="text-slate-600">{icon}</span>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/* ── Clean table wrappers ── */
const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="border border-indigo-200 bg-slate-100 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
    {children}
  </th>
);
const TD = ({ children, red, bold, mono }: { children: React.ReactNode; red?: boolean; bold?: boolean; mono?: boolean }) => (
  <td className={`border border-indigo-100 px-3 py-2 text-sm ${red ? "text-red-600 font-semibold" : bold ? "font-semibold text-slate-900" : "text-slate-700"} ${mono ? "font-mono text-xs" : ""}`}>
    {children}
  </td>
);
const TFoot = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold">
    {children}
  </tr>
);

/* ══════════════════════════════════════════════════════════════════ */
export default function AdminReportsTab() {
  const today       = new Date().toISOString().slice(0, 10);
  const oneMonthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate]   = useState(oneMonthAgo);
  const [endDate,   setEndDate]     = useState(today);
  const [data,      setData]        = useState<ReportData | null>(null);
  const [company,   setCompany]     = useState<CompanyInfo | null>(null);
  const [error,     setError]       = useState("");
  const [isPending, startT]         = useTransition();
  const [pdfLoading, setPdfLoading] = useState(false);

  async function safeJson(res: Response): Promise<unknown> {
    try { return await res.json(); } catch { return null; }
  }

  function fetchReport() {
    setError("");
    startT(async () => {
      try {
        const [reportRes, settingsRes] = await Promise.all([
          fetch(`/api/admin/reports?startDate=${startDate}&endDate=${endDate}`),
          fetch("/api/admin/settings"),
        ]);
        if (!reportRes.ok) {
          const d = await safeJson(reportRes) as Record<string, string> | null;
          setError(d?.message ?? `Server error ${reportRes.status} — please try again.`);
          return;
        }
        const reportJson  = await safeJson(reportRes);
        const settingsJson = settingsRes.ok ? await safeJson(settingsRes) : null;
        if (!reportJson) { setError("Invalid response from server — please try again."); return; }
        setData(reportJson as ReportData);
        const s = settingsJson as Record<string, unknown> | null;
        if (s) {
          const g = s.general as Record<string, string> | undefined;
          setCompany({
            name:    g?.businessName ?? "BusBooking",
            logoUrl: (s.logoUrl as string | null) ?? null,
            email:   g?.contactEmail ?? "",
            phone:   g?.supportPhone ?? "",
          });
        }
      } catch (err) {
        setError(`Network error — ${err instanceof Error ? err.message : "please try again."}`);
      }
    });
  }

  function exportRevenueCsv() {
    if (!data) return;
    downloadCsv(toCsv(data.revenue.byDay.map((d) => ({
      Date: d.date, "Gross Revenue ($)": d.gross.toFixed(2),
      "Refunds ($)": d.refunds.toFixed(2), "Discounts ($)": d.discounts.toFixed(2),
      "Net Revenue ($)": d.net.toFixed(2), "Confirmed Bookings": d.confirmed,
      "Cancelled Bookings": d.cancelled, "Total Bookings": d.total,
    }))), `revenue-report-${startDate}-to-${endDate}.csv`);
  }
  function exportRoutesCsv() {
    if (!data) return;
    downloadCsv(toCsv(data.routes.map((r) => ({
      From: r.from, To: r.to,
      "Total Bookings": r.totalBookings, "Confirmed Bookings": r.confirmedBookings,
      "Cancelled Bookings": r.cancelledBookings, "Revenue ($)": r.revenue.toFixed(2),
      "Refunds ($)": r.refunds.toFixed(2), "Seats Sold": r.totalSeats,
    }))), `route-performance-${startDate}-to-${endDate}.csv`);
  }
  function exportBookingsCsv() {
    if (!data) return;
    downloadCsv(toCsv(data.bookings.byRoute.map((r) => ({
      Route: r.route, Confirmed: r.confirmed, Cancelled: r.cancelled,
      Total: r.total, "Revenue ($)": r.revenue.toFixed(2),
    }))), `bookings-by-route-${startDate}-to-${endDate}.csv`);
  }
  function exportExpensesCsv() {
    if (!data) return;
    const { expenses } = data;
    const summary = [
      { Category: "Fuel",        Item: "Total Fuel Cost",       "Amount ($)": expenses.fuel.total.toFixed(2),        "Extra": `${expenses.fuel.liters.toFixed(1)} L · ${expenses.fuel.count} fills` },
      { Category: "Maintenance", Item: "Total Maintenance Cost", "Amount ($)": expenses.maintenance.total.toFixed(2), "Extra": `${expenses.maintenance.count} jobs` },
      { Category: "Driver Pay",  Item: "Total Driver Earnings", "Amount ($)": expenses.driverPay.total.toFixed(2),    "Extra": `${expenses.driverPay.count} records` },
      { Category: "Payroll",     Item: "Net Payroll Paid",      "Amount ($)": expenses.payroll.netPay.toFixed(2),     "Extra": `${expenses.payroll.count} payslips` },
      { Category: "TOTAL",       Item: "Total Expenses",        "Amount ($)": expenses.totalExpenses.toFixed(2),      "Extra": "" },
      { Category: "NET REVENUE", Item: "Revenue After Refunds", "Amount ($)": data.revenue.net.toFixed(2),            "Extra": "" },
      { Category: "PROFIT/LOSS", Item: expenses.profitLoss >= 0 ? "Net Profit" : "Net Loss", "Amount ($)": expenses.profitLoss.toFixed(2), "Extra": "" },
    ];
    const fuelRows = expenses.fuel.byDay.map((d) => ({
      Date: d.date, "Cost ($)": d.cost.toFixed(2), "Liters": d.liters.toFixed(1), Fills: d.count,
    }));
    const maintRows = expenses.maintenance.byType.map((t) => ({
      Type: MAINT_LABEL[t.type] ?? t.type, "Cost ($)": t.total.toFixed(2), Jobs: t.count,
    }));
    const content = [
      "=== Expense Summary ===",
      toCsv(summary),
      "",
      "=== Fuel Costs by Day ===",
      fuelRows.length ? toCsv(fuelRows) : "No data",
      "",
      "=== Maintenance by Type ===",
      maintRows.length ? toCsv(maintRows) : "No data",
    ].join("\n");
    downloadCsv(content, `expenses-${startDate}-to-${endDate}.csv`);
  }

  /* ════ PDF — clean navy/white/red palette ════ */
  async function handleGeneratePdf() {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      const PW = 210;
      const PH = 297;
      const M  = 14;
      const CW = PW - 2 * M;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const genAt = new Date().toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      /* ── clean palette ── */
      const NAVY   = "#1e3a5f";
      const WHITE  = "#ffffff";
      const DARK   = "#111827";
      const SLATE  = "#4b5563";
      const MUTED  = "#9ca3af";
      const BORDER = "#d1d5db";
      const ALTROW = "#f9fafb";
      const TOTAL  = "#f3f4f6";
      const TOTALBR= "#9ca3af";
      const RED    = "#dc2626";
      const LBLUE  = "#dbeafe"; // light blue for filter bar

      const sf = (c: string) => { doc.setFillColor(c); };
      const st = (c: string) => { doc.setTextColor(c); };
      const sd = (c: string) => { doc.setDrawColor(c); };
      const fl = (f: "normal" | "bold" | "italic") => { doc.setFont("helvetica", f); };
      const fs = (s: number) => { doc.setFontSize(s); };
      const ln = (lw: number) => { doc.setLineWidth(lw); };

      let y = 0;

      const drawPageHeader = (isFirst: boolean) => {
        if (isFirst) {
          sf(NAVY); doc.rect(0, 0, PW, 32, "F");

          /* logo */
          const logoSize = 18;
          const logoX = M;
          const logoY = 7;
          let logoDataUrl: string | null = null;
          if (company?.logoUrl) {
            loadLogoDataUrl(company.logoUrl).then((dataUrl) => {
              if (dataUrl) {
                try { doc.addImage(dataUrl, "PNG", logoX, logoY, logoSize, logoSize); } catch { /* skip */ }
              }
            });
          }
          if (!logoDataUrl) {
            sf("#2d5fa0");
            doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, "F");
            st(WHITE); fl("bold"); fs(10);
            const initials = (company?.name ?? "BB").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            doc.text(initials, logoX + logoSize / 2, logoY + logoSize / 2 + 1, { align: "center" });
          }

          st(WHITE); fl("bold"); fs(14);
          doc.text(company?.name ?? "BusBooking", M + logoSize + 4, 15);
          if (company?.email || company?.phone) {
            fl("normal"); fs(7.5); st("#93c5fd");
            doc.text(
              [company?.email, company?.phone].filter(Boolean).join("  ·  "),
              M + logoSize + 4, 21
            );
          }

          st(WHITE); fl("bold"); fs(13);
          doc.text("Business Report", PW - M, 14, { align: "right" });
          fl("normal"); fs(8.5); st("#93c5fd");
          doc.text(`${fmtDate(startDate)} — ${fmtDate(endDate)}`, PW - M, 21, { align: "right" });
          fs(7); st("#60a5fa");
          doc.text(`Generated ${genAt}`, PW - M, 27, { align: "right" });

          y = 38;
        } else {
          sf(NAVY); doc.rect(0, 0, PW, 9, "F");
          st(WHITE); fl("bold"); fs(7.5);
          doc.text(company?.name ?? "BusBooking", M, 6);
          fl("normal");
          doc.text(`${fmtDate(startDate)} – ${fmtDate(endDate)}`, PW - M, 6, { align: "right" });
          y = 15;
        }
      };

      const chk = (need: number) => {
        if (y + need > PH - 16) { doc.addPage(); drawPageHeader(false); }
      };

      const sectionTitle = (title: string) => {
        chk(12);
        sf(NAVY); doc.rect(M, y, CW, 7, "F");
        st(WHITE); fl("bold"); fs(9);
        doc.text(title, M + 4, y + 5);
        y += 11;
      };

      const kpiCard = (x: number, cardY: number, w: number, label: string, value: string, sub: string) => {
        sf(WHITE); doc.roundedRect(x, cardY, w, 20, 1, 1, "F");
        sd(BORDER); ln(0.3);
        doc.roundedRect(x, cardY, w, 20, 1, 1, "S");
        sf(NAVY); doc.rect(x, cardY, w, 2, "F"); // navy top stripe
        st(SLATE); fl("bold"); fs(6.5);
        doc.text(label.toUpperCase(), x + 3, cardY + 7);
        st(DARK); fl("bold"); fs(10);
        const val = doc.splitTextToSize(value, w - 6)[0] as string;
        doc.text(val, x + 3, cardY + 13.5);
        st(MUTED); fl("normal"); fs(6.5);
        doc.text(sub, x + 3, cardY + 18.5);
      };

      type Col = { label: string; w: number };

      const tableHeader = (cols: Col[], tableY: number) => {
        sf(LBLUE); doc.rect(M, tableY, CW, 7, "F");
        sd(BORDER); ln(0.3);
        doc.line(M, tableY, M + CW, tableY);
        doc.line(M, tableY + 7, M + CW, tableY + 7);
        let x = M;
        cols.forEach((c) => {
          st(NAVY); fl("bold"); fs(7);
          doc.text(c.label.toUpperCase(), x + 2, tableY + 4.8);
          x += c.w;
        });
        return tableY + 7;
      };

      type Cell = { t: string; c?: string; bold?: boolean };

      const tableRow = (cells: Cell[], cols: Col[], rowY: number, alt: boolean) => {
        if (alt) { sf(ALTROW); doc.rect(M, rowY, CW, 6.5, "F"); }
        sd(BORDER); ln(0.1);
        doc.line(M, rowY + 6.5, M + CW, rowY + 6.5);
        let x = M;
        cells.forEach((cell, i) => {
          st(cell.c ?? DARK);
          fl(cell.bold ? "bold" : "normal");
          fs(7.5);
          const txt = doc.splitTextToSize(cell.t, cols[i].w - 4)[0] as string;
          doc.text(txt, x + 2, rowY + 4.5);
          x += cols[i].w;
        });
        return rowY + 6.5;
      };

      const tableFooter = (cells: Cell[], cols: Col[], rowY: number) => {
        sf(TOTAL); doc.rect(M, rowY, CW, 7, "F");
        sd(TOTALBR); ln(0.4);
        doc.line(M, rowY, M + CW, rowY);
        ln(0.1);
        doc.line(M, rowY + 7, M + CW, rowY + 7);
        let x = M;
        cells.forEach((cell, i) => {
          st(cell.c ?? DARK); fl("bold"); fs(7.5);
          doc.text(cell.t, x + 2, rowY + 4.8);
          x += cols[i].w;
        });
        return rowY + 9;
      };

      const drawPageFooter = (pageNum: number, total: number) => {
        const fy = PH - 10;
        sd(BORDER); ln(0.3);
        doc.line(M, fy - 2, PW - M, fy - 2);
        st(MUTED); fl("normal"); fs(7);
        doc.text(`${company?.name ?? "BusBooking"} — Confidential`, M, fy + 2);
        doc.text(`Page ${pageNum} of ${total}`, PW / 2, fy + 2, { align: "center" });
        doc.text(`${fmtDate(startDate)} – ${fmtDate(endDate)}`, PW - M, fy + 2, { align: "right" });
      };

      let logoDataUrl: string | null = null;
      if (company?.logoUrl) {
        logoDataUrl = await loadLogoDataUrl(company.logoUrl);
      }

      drawPageHeader(true);

      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, "PNG", M, 7, 18, 18); } catch { /* skip */ }
      }

      /* ── KPI Cards: Revenue ── */
      const cardGap = 3;
      const cardW   = (CW - cardGap * 3) / 4;
      chk(24);
      kpiCard(M,                      y, cardW, "Gross Revenue",   fmt(data.revenue.gross),    "All bookings");
      kpiCard(M + (cardW + cardGap),  y, cardW, "Total Refunds",   fmt(data.revenue.refunds),  "Cancellations");
      kpiCard(M + (cardW + cardGap)*2,y, cardW, "Discounts Given", fmt(data.revenue.discounts),"Promo savings");
      kpiCard(M + (cardW + cardGap)*3,y, cardW, "Net Revenue",     fmt(data.revenue.net),       "After refunds");
      y += 24;

      chk(24);
      kpiCard(M,                      y, cardW, "Total Bookings",   String(data.bookings.total),                                      `${data.bookings.pending} pending`);
      kpiCard(M + (cardW + cardGap),  y, cardW, "Confirmed",        `${data.bookings.confirmed} (${pct(data.bookings.confirmedRate)})`,"Success rate");
      kpiCard(M + (cardW + cardGap)*2,y, cardW, "Cancelled",        `${data.bookings.cancelled} (${pct(data.bookings.cancellationRate)})`,"Cancellation rate");
      kpiCard(M + (cardW + cardGap)*3,y, cardW, "Passengers",       String(data.bookings.totalPassengers),                            `Avg ${fmt(data.bookings.avgTicketValue)}`);
      y += 28;

      /* ── Daily Revenue ── */
      if (data.revenue.byDay.length > 0) {
        sectionTitle("Daily Revenue Breakdown");
        const dCols: Col[] = [
          { label: "Date",       w: 25 },
          { label: "Gross",      w: 28 },
          { label: "Refunds",    w: 25 },
          { label: "Discounts",  w: 25 },
          { label: "Net",        w: 28 },
          { label: "Confirmed",  w: 22 },
          { label: "Cancelled",  w: 20 },
          { label: "Total",      w: 7  },
        ];
        chk(8);
        y = tableHeader(dCols, y);
        data.revenue.byDay.forEach((d, i) => {
          chk(7);
          y = tableRow([
            { t: d.date },
            { t: fmt(d.gross), bold: true },
            { t: fmt(d.refunds),   c: RED  },
            { t: fmt(d.discounts), c: RED  },
            { t: fmt(d.net),       bold: true },
            { t: String(d.confirmed) },
            { t: String(d.cancelled), c: RED },
            { t: String(d.total) },
          ], dCols, y, i % 2 === 1);
        });
        chk(9);
        y = tableFooter([
          { t: "TOTAL" },
          { t: fmt(data.revenue.gross) },
          { t: fmt(data.revenue.refunds),   c: RED },
          { t: fmt(data.revenue.discounts), c: RED },
          { t: fmt(data.revenue.net), bold: true },
          { t: String(data.bookings.confirmed) },
          { t: String(data.bookings.cancelled), c: RED },
          { t: String(data.bookings.total) },
        ], dCols, y);
        y += 4;
      }

      /* ── Bookings by Route ── */
      if (data.bookings.byRoute.length > 0) {
        sectionTitle("Top Routes by Bookings");
        const rCols: Col[] = [
          { label: "#",         w: 9  },
          { label: "Route",     w: 73 },
          { label: "Confirmed", w: 25 },
          { label: "Cancelled", w: 25 },
          { label: "Total",     w: 20 },
          { label: "Revenue",   w: 28 },
        ];
        chk(8);
        y = tableHeader(rCols, y);
        data.bookings.byRoute.forEach((r, i) => {
          chk(7);
          y = tableRow([
            { t: `#${i + 1}`, c: MUTED },
            { t: r.route, bold: true },
            { t: String(r.confirmed) },
            { t: String(r.cancelled), c: RED },
            { t: String(r.total) },
            { t: fmt(r.revenue), bold: true },
          ], rCols, y, i % 2 === 1);
        });
        y += 4;
      }

      /* ── Route Performance ── */
      if (data.routes.length > 0) {
        sectionTitle("Route Performance");
        const pCols: Col[] = [
          { label: "Route",     w: 52 },
          { label: "Total",     w: 17 },
          { label: "Confirmed", w: 22 },
          { label: "Cancelled", w: 22 },
          { label: "Seats",     w: 18 },
          { label: "Revenue",   w: 28 },
          { label: "Refunds",   w: 21 },
        ];
        chk(8);
        y = tableHeader(pCols, y);
        data.routes.forEach((r, i) => {
          chk(7);
          y = tableRow([
            { t: `${r.from} → ${r.to}`, bold: true },
            { t: String(r.totalBookings)      },
            { t: String(r.confirmedBookings)  },
            { t: String(r.cancelledBookings), c: RED },
            { t: String(r.totalSeats)         },
            { t: fmt(r.revenue), bold: true   },
            { t: fmt(r.refunds), c: RED       },
          ], pCols, y, i % 2 === 1);
        });
        chk(9);
        y = tableFooter([
          { t: "TOTAL" },
          { t: String(data.bookings.total) },
          { t: String(data.bookings.confirmed) },
          { t: String(data.bookings.cancelled), c: RED },
          { t: String(data.routes.reduce((s, r) => s + r.totalSeats, 0)) },
          { t: fmt(data.revenue.gross), bold: true },
          { t: fmt(data.revenue.refunds), c: RED },
        ], pCols, y);
      }

      /* ── Expenses ── */
      if (data.expenses) {
        const exp = data.expenses;

        sectionTitle("Expense Overview");

        chk(24);
        const eCardW = (CW - cardGap * 3) / 4;
        kpiCard(M,                         y, eCardW, "Fuel Costs",    fmt(exp.fuel.total),        `${exp.fuel.liters.toFixed(0)} L · ${exp.fuel.count} fills`);
        kpiCard(M + (eCardW + cardGap),    y, eCardW, "Maintenance",   fmt(exp.maintenance.total), `${exp.maintenance.count} jobs`);
        kpiCard(M + (eCardW + cardGap)*2,  y, eCardW, "Driver Pay",    fmt(exp.driverPay.total),   `${exp.driverPay.count} records`);
        kpiCard(M + (eCardW + cardGap)*3,  y, eCardW, "Payroll (Net)", fmt(exp.payroll.netPay),    `${exp.payroll.count} payslips`);
        y += 24;

        chk(24);
        const halfW = (CW - cardGap) / 2;
        kpiCard(M,               y, halfW, "Total Expenses", fmt(exp.totalExpenses), "Fuel + Maintenance + Driver Pay + Payroll");
        kpiCard(M + halfW + cardGap, y, halfW,
          exp.profitLoss >= 0 ? "Net Profit" : "Net Loss",
          fmt(Math.abs(exp.profitLoss)),
          `Revenue ${fmt(data.revenue.net)} − Expenses ${fmt(exp.totalExpenses)}`);
        y += 28;

        if (exp.fuel.byDay.length > 0) {
          sectionTitle("Fuel Costs by Day");
          const fCols: Col[] = [
            { label: "Date",   w: 35 },
            { label: "Cost",   w: 42 },
            { label: "Liters", w: 38 },
            { label: "Fills",  w: 67 },
          ];
          chk(8);
          y = tableHeader(fCols, y);
          exp.fuel.byDay.forEach((d, i) => {
            chk(7);
            y = tableRow([
              { t: d.date },
              { t: fmt(d.cost), c: RED },
              { t: `${d.liters.toFixed(1)} L` },
              { t: String(d.count) },
            ], fCols, y, i % 2 === 1);
          });
          chk(9);
          y = tableFooter([
            { t: "TOTAL" },
            { t: fmt(exp.fuel.total), c: RED },
            { t: `${exp.fuel.liters.toFixed(1)} L` },
            { t: String(exp.fuel.count) },
          ], fCols, y);
          y += 4;
        }

        if (exp.maintenance.byType.length > 0) {
          sectionTitle("Maintenance by Type");
          const mCols: Col[] = [
            { label: "Type",  w: 80 },
            { label: "Cost",  w: 52 },
            { label: "Jobs",  w: 50 },
          ];
          chk(8);
          y = tableHeader(mCols, y);
          exp.maintenance.byType.forEach((t, i) => {
            chk(7);
            y = tableRow([
              { t: MAINT_LABEL[t.type] ?? t.type, bold: true },
              { t: fmt(t.total), c: RED },
              { t: String(t.count) },
            ], mCols, y, i % 2 === 1);
          });
          chk(9);
          y = tableFooter([
            { t: "TOTAL" },
            { t: fmt(exp.maintenance.total), c: RED },
            { t: String(exp.maintenance.count) },
          ], mCols, y);
          y += 4;
        }
      }

      const totalPages = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawPageFooter(p, totalPages);
      }

      doc.save(`report-${startDate}-to-${endDate}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  const maxRouteRev  = data ? Math.max(...data.routes.map((r) => r.revenue), 1)       : 1;
  const maxRouteBook = data ? Math.max(...data.routes.map((r) => r.totalBookings), 1) : 1;
  const maxDayNet    = data ? Math.max(...data.revenue.byDay.map((d) => d.net), 1)    : 1;

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Generate revenue, booking, and route performance reports for any date range.
          </p>
        </div>
        {data && (
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60 transition-colors shadow-sm"
          >
            {pdfLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…</>
              : <><FileText className="h-4 w-4" /> Download PDF</>
            }
          </button>
        )}
      </div>

      {/* ── Date range picker ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-indigo-100 bg-blue-50 p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 shrink-0 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Date Range</span>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From</label>
            <input type="date" value={startDate} max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-indigo-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/40 [color-scheme:light]" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">To</label>
            <input type="date" value={endDate} min={startDate} max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-indigo-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/40 [color-scheme:light]" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[{ label: "7d", days: 7 }, { label: "30d", days: 30 }, { label: "90d", days: 90 }, { label: "1Y", days: 365 }, { label: "All", days: 3650 }].map(({ label, days }) => (
              <button key={label} type="button"
                onClick={() => { setStartDate(new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)); setEndDate(today); }}
                className="rounded border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-slate-500 hover:bg-indigo-50/40 transition-colors">
                {label === "7d" || label === "30d" || label === "90d" || label === "1Y" ? `Last ${label}` : label}
              </button>
            ))}
          </div>
          <button type="button" onClick={fetchReport} disabled={isPending}
            className="ml-auto flex items-center gap-2 rounded-lg border border-indigo-200 bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60 transition-all shadow-sm">
            {isPending
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</>
              : <><BarChart3 className="h-4 w-4" /> Generate Report</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!data && !isPending && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-100 bg-white py-20 text-center">
          <BarChart3 className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Select a date range and click Generate Report</p>
          <p className="mt-1 text-xs text-slate-400">Revenue, bookings, and route data will appear here.</p>
        </div>
      )}

      {/* ══ REPORT CONTENT ══ */}
      {data && (
        <div className="space-y-8">

          {/* ── Report header banner ── */}
          <div className="overflow-hidden rounded-lg shadow-sm border border-indigo-100">
            <div className="bg-[#1e3a5f] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-white/15 overflow-hidden border border-white/20">
                  {company?.logoUrl
                    ? <img src={company.logoUrl} alt="logo" className="h-12 w-12 object-contain" />
                    : <span className="text-xl font-black text-white">
                        {(company?.name ?? "BB").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                  }
                </div>
                <div>
                  <p className="text-base font-bold text-white">{company?.name ?? "BusBooking"}</p>
                  {(company?.email || company?.phone) && (
                    <p className="text-xs text-blue-200 mt-0.5">
                      {company?.email}{company?.email && company?.phone ? " · " : ""}{company?.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">Business Report</p>
                <p className="text-xs text-blue-200 mt-0.5">
                  {fmtDate(data.dateRange.start)} — {fmtDate(data.dateRange.end)}
                </p>
              </div>
            </div>
            {/* Summary bar */}
            <div className="bg-blue-50 border-t border-blue-100 px-6 py-3 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Profit (Loss)</p>
                <p className={`text-base font-bold ${data.expenses.profitLoss >= 0 ? "text-slate-900" : "text-red-600"}`}>
                  {data.expenses.profitLoss >= 0 ? fmt(data.expenses.profitLoss) : `(${fmt(Math.abs(data.expenses.profitLoss))})`}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Income / Sales</p>
                <p className="text-base font-bold text-slate-900">{fmt(data.revenue.net)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Expenses</p>
                <p className="text-base font-bold text-red-600">({fmt(data.expenses.totalExpenses)})</p>
              </div>
            </div>
          </div>

          {/* ── Section 1: Revenue ── */}
          <div className="space-y-4">
            <SectionHeading icon={<Wallet className="h-4 w-4" />} title="Revenue Report" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<TrendingUp className="h-4 w-4" />}   label="Gross Revenue"   value={fmt(data.revenue.gross)}    sub="All confirmed bookings" />
              <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Total Refunds"   value={fmt(data.revenue.refunds)}  sub="From cancellations" />
              <StatCard icon={<Minus className="h-4 w-4" />}        label="Discounts Given" value={fmt(data.revenue.discounts)}sub="Promo code savings" />
              <StatCard icon={<ArrowUpRight className="h-4 w-4" />} label="Net Revenue"     value={fmt(data.revenue.net)}      sub="After refunds" />
            </div>

            {data.revenue.byDay.length > 1 && (
              <div className="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm font-bold text-slate-900">Revenue Trend</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.revenue.byDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rptGradGross" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1e3a5f" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rptGradNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#374151" stopOpacity={0.10} />
                        <stop offset="95%" stopColor="#374151" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                      tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                    <Tooltip
                      formatter={(v) => [`$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]}
                      labelFormatter={(l) => `Date: ${l}`}
                      contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid #d1d5db" }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="gross" name="Gross Revenue" stroke="#1e3a5f" strokeWidth={2} fill="url(#rptGradGross)" dot={false} />
                    <Area type="monotone" dataKey="net"   name="Net Revenue"   stroke="#374151" strokeWidth={2} fill="url(#rptGradNet)"   dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.revenue.byDay.length > 0 && (
              <div className="rounded-lg border border-indigo-100/80 bg-white shadow-sm shadow-indigo-50/40 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-[#1e3a5f] px-5 py-3">
                  <p className="text-sm font-bold text-white">Daily Breakdown</p>
                  <button type="button" onClick={exportRevenueCsv}
                    className="flex items-center gap-1.5 rounded border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        {["Date","Gross","Refunds","Discounts","Net","Confirmed","Cancelled","Bar"].map((h) => (
                          <TH key={h}>{h}</TH>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {data.revenue.byDay.map((d, i) => (
                        <tr key={d.date} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <TD mono>{d.date}</TD>
                          <TD bold>{fmt(d.gross)}</TD>
                          <TD red>{fmt(d.refunds)}</TD>
                          <TD red>{fmt(d.discounts)}</TD>
                          <TD bold>{fmt(d.net)}</TD>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{d.confirmed}</td>
                          <TD red>{d.cancelled}</TD>
                          <td className="border border-indigo-100 px-3 py-2"><MiniBar value={d.net} max={maxDayNet} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <TFoot>
                        <td className="border border-indigo-200 px-3 py-2 text-xs font-bold text-slate-800">TOTAL</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{fmt(data.revenue.gross)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-red-600">{fmt(data.revenue.refunds)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-red-600">{fmt(data.revenue.discounts)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{fmt(data.revenue.net)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{data.bookings.confirmed}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-red-600">{data.bookings.cancelled}</td>
                        <td className="border border-indigo-200 px-3 py-2" />
                      </TFoot>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2: Bookings ── */}
          <div className="space-y-4">
            <SectionHeading icon={<BarChart3 className="h-4 w-4" />} title="Bookings Report" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<BarChart3 className="h-4 w-4" />}    label="Total Bookings"   value={data.bookings.total.toLocaleString()}                                                  sub={`${data.bookings.pending} pending`} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Confirmed"        value={`${data.bookings.confirmed.toLocaleString()} (${pct(data.bookings.confirmedRate)})`}    sub="Successfully booked" />
              <StatCard icon={<XCircle className="h-4 w-4" />}      label="Cancelled"        value={`${data.bookings.cancelled.toLocaleString()} (${pct(data.bookings.cancellationRate)})`} sub="With refund policy applied" />
              <StatCard icon={<Users className="h-4 w-4" />}        label="Total Passengers" value={data.bookings.totalPassengers.toLocaleString()}                                         sub={`Avg ticket ${fmt(data.bookings.avgTicketValue)}`} />
            </div>

            <div className="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-900">Booking Status Split</p>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Confirmed", value: data.bookings.confirmed, fill: "#1e3a5f" },
                          { name: "Cancelled", value: data.bookings.cancelled, fill: "#dc2626" },
                          { name: "Pending",   value: data.bookings.pending,   fill: "#9ca3af" },
                        ].filter((d) => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value"
                      />
                      <Tooltip
                        formatter={(v) => [String(v), ""]}
                        contentStyle={{ fontSize: 11, borderRadius: 4, border: "1px solid #d1d5db" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {([
                    { label: "Confirmed", value: data.bookings.confirmed, rate: data.bookings.confirmedRate,    bg: "bg-[#1e3a5f]", text: "text-slate-800" },
                    { label: "Cancelled", value: data.bookings.cancelled, rate: data.bookings.cancellationRate, bg: "bg-red-600",    text: "text-red-700"  },
                    { label: "Pending",   value: data.bookings.pending,
                      rate: data.bookings.total > 0 ? Math.round(data.bookings.pending / data.bookings.total * 1000) / 10 : 0,
                      bg: "bg-slate-400", text: "text-slate-600" },
                  ] as const).map(({ label, value, rate, bg, text }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium text-slate-600">
                          <span className={`h-2 w-2 rounded-full ${bg}`} />{label}
                        </span>
                        <span className={`font-bold ${text}`}>
                          {value} <span className="font-normal text-slate-400">({pct(rate)})</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${bg} transition-all`} style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {data.bookings.byRoute.length > 0 && (
              <div className="rounded-lg border border-indigo-100/80 bg-white shadow-sm shadow-indigo-50/40 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-[#1e3a5f] px-5 py-3">
                  <p className="text-sm font-bold text-white">Bookings by Route</p>
                  <button type="button" onClick={exportBookingsCsv}
                    className="flex items-center gap-1.5 rounded border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        {["#","Route","Confirmed","Cancelled","Total","Revenue","Bar"].map((h) => (
                          <TH key={h}>{h}</TH>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {data.bookings.byRoute.map((r, i) => (
                        <tr key={r.route} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <td className="border border-indigo-100 px-3 py-2 text-xs font-bold text-slate-400">#{i + 1}</td>
                          <TD bold>{r.route}</TD>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{r.confirmed}</td>
                          <TD red>{r.cancelled}</TD>
                          <td className="border border-indigo-100 px-3 py-2 text-sm font-semibold text-slate-700">{r.total}</td>
                          <TD bold>{fmt(r.revenue)}</TD>
                          <td className="border border-indigo-100 px-3 py-2"><MiniBar value={r.total} max={maxRouteBook} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 3: Route Performance ── */}
          <div className="space-y-4">
            <SectionHeading icon={<MapPin className="h-4 w-4" />} title="Route Performance" />
            {data.routes.length > 0 && (
              <div className="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm font-bold text-slate-900">Revenue by Route</p>
                <ResponsiveContainer width="100%" height={Math.min(data.routes.length * 46 + 40, 320)}>
                  <BarChart
                    layout="vertical"
                    data={data.routes.slice(0, 8).map((r) => ({
                      route: `${r.from}→${r.to}`,
                      Revenue: r.revenue,
                      Refunds: r.refunds,
                    }))}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                    <YAxis type="category" dataKey="route" tick={{ fontSize: 10, fill: "#4b5563" }}
                      tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      formatter={(v) => [`$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]}
                      contentStyle={{ fontSize: 11, borderRadius: 4, border: "1px solid #d1d5db" }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Revenue" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Refunds" fill="#dc2626" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {data.routes.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No route data for this period.</p>
            ) : (
              <div className="rounded-lg border border-indigo-100/80 bg-white shadow-sm shadow-indigo-50/40 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-[#1e3a5f] px-5 py-3">
                  <p className="text-sm font-bold text-white">
                    {data.routes.length} route{data.routes.length !== 1 ? "s" : ""} active in period
                  </p>
                  <button type="button" onClick={exportRoutesCsv}
                    className="flex items-center gap-1.5 rounded border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        {["Route","Total","Confirmed","Cancelled","Seats Sold","Revenue","Refunds","Rev Bar"].map((h) => (
                          <TH key={h}>{h}</TH>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {data.routes.map((r, i) => (
                        <tr key={r.routeId} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <td className="border border-indigo-100 px-3 py-2">
                            <span className="font-semibold text-slate-900">{r.from}</span>
                            <span className="mx-1.5 text-slate-400">→</span>
                            <span className="font-semibold text-slate-900">{r.to}</span>
                          </td>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{r.totalBookings}</td>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{r.confirmedBookings}</td>
                          <TD red>{r.cancelledBookings}</TD>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{r.totalSeats}</td>
                          <TD bold>{fmt(r.revenue)}</TD>
                          <TD red>{fmt(r.refunds)}</TD>
                          <td className="border border-indigo-100 px-3 py-2"><MiniBar value={r.revenue} max={maxRouteRev} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <TFoot>
                        <td className="border border-indigo-200 px-3 py-2 text-xs font-bold text-slate-800">TOTAL</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{data.bookings.total}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{data.bookings.confirmed}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-red-600">{data.bookings.cancelled}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{data.routes.reduce((s, r) => s + r.totalSeats, 0)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{fmt(data.revenue.gross)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-red-600">{fmt(data.revenue.refunds)}</td>
                        <td className="border border-indigo-200 px-3 py-2" />
                      </TFoot>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 4: Expenses ── */}
          <div className="space-y-4">
            <SectionHeading
              icon={<Receipt className="h-4 w-4" />}
              title="Expense Report"
              action={
                <button type="button" onClick={exportExpensesCsv}
                  className="flex items-center gap-1.5 rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50/40 transition-colors">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                </button>
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Fuel    className="h-4 w-4" />} label="Fuel Costs"    value={fmt(data.expenses.fuel.total)}         sub={`${data.expenses.fuel.liters.toFixed(0)} L · ${data.expenses.fuel.count} fills`} />
              <StatCard icon={<Wrench  className="h-4 w-4" />} label="Maintenance"   value={fmt(data.expenses.maintenance.total)}   sub={`${data.expenses.maintenance.count} completed jobs`} />
              <StatCard icon={<UserCog className="h-4 w-4" />} label="Driver Pay"    value={fmt(data.expenses.driverPay.total)}     sub={`${data.expenses.driverPay.count} earning records`} />
              <StatCard icon={<Receipt className="h-4 w-4" />} label="Payroll (Net)" value={fmt(data.expenses.payroll.netPay)}      sub={`${data.expenses.payroll.count} payslips`} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Total Expenses"
                value={fmt(data.expenses.totalExpenses)}
                sub="Fuel + Maintenance + Driver Pay + Payroll" />
              <StatCard
                icon={data.expenses.profitLoss >= 0
                  ? <TrendingUp className="h-4 w-4" />
                  : <Loss className="h-4 w-4" />}
                label={data.expenses.profitLoss >= 0 ? "Net Profit" : "Net Loss"}
                value={data.expenses.profitLoss >= 0 ? fmt(data.expenses.profitLoss) : `(${fmt(Math.abs(data.expenses.profitLoss))})`}
                sub={`Revenue ${fmt(data.revenue.net)} − Expenses ${fmt(data.expenses.totalExpenses)}`}
              />
            </div>

            {data.expenses.totalExpenses > 0 && (
              <div className="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold text-slate-900">Expense Breakdown</p>
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="w-44 h-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Fuel",        value: data.expenses.fuel.total,        fill: "#1e3a5f" },
                            { name: "Maintenance", value: data.expenses.maintenance.total, fill: "#dc2626" },
                            { name: "Driver Pay",  value: data.expenses.driverPay.total,   fill: "#4b5563" },
                            { name: "Payroll",     value: data.expenses.payroll.netPay,    fill: "#9ca3af" },
                          ].filter((d) => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={46} outerRadius={66} paddingAngle={3} dataKey="value"
                        />
                        <Tooltip
                          formatter={(v) => [fmt(Number(v ?? 0)), ""]}
                          contentStyle={{ fontSize: 11, borderRadius: 4, border: "1px solid #d1d5db" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    {([
                      { label: "Fuel",        value: data.expenses.fuel.total,        bg: "bg-[#1e3a5f]", text: "text-slate-800" },
                      { label: "Maintenance", value: data.expenses.maintenance.total, bg: "bg-red-600",   text: "text-red-700"  },
                      { label: "Driver Pay",  value: data.expenses.driverPay.total,   bg: "bg-slate-600", text: "text-slate-700"},
                      { label: "Payroll",     value: data.expenses.payroll.netPay,    bg: "bg-slate-400", text: "text-slate-600"},
                    ] as const).map(({ label, value, bg, text }) => {
                      const share = data.expenses.totalExpenses > 0
                        ? Math.round(value / data.expenses.totalExpenses * 1000) / 10 : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 font-medium text-slate-600">
                              <span className={`h-2 w-2 rounded-full ${bg}`} />{label}
                            </span>
                            <span className={`font-bold ${text}`}>
                              {fmt(value)} <span className="font-normal text-slate-400">({pct(share)})</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${bg} transition-all`} style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {data.expenses.fuel.byDay.length > 0 && (
              <div className="rounded-lg border border-indigo-100/80 bg-white shadow-sm shadow-indigo-50/40 overflow-hidden">
                <div className="border-b border-slate-200 bg-[#1e3a5f] px-5 py-3">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Fuel className="h-4 w-4" /> Fuel Costs by Day
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        {["Date","Cost","Liters","Fills"].map((h) => <TH key={h}>{h}</TH>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {data.expenses.fuel.byDay.map((d, i) => (
                        <tr key={d.date} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <TD mono>{d.date}</TD>
                          <TD red>{fmt(d.cost)}</TD>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{d.liters.toFixed(1)} L</td>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <TFoot>
                        <td className="border border-indigo-200 px-3 py-2 text-xs font-bold text-slate-800">TOTAL</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-red-600">{fmt(data.expenses.fuel.total)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{data.expenses.fuel.liters.toFixed(1)} L</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{data.expenses.fuel.count}</td>
                      </TFoot>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {data.expenses.maintenance.byType.length > 0 && (
              <div className="rounded-lg border border-indigo-100/80 bg-white shadow-sm shadow-indigo-50/40 overflow-hidden">
                <div className="border-b border-slate-200 bg-[#1e3a5f] px-5 py-3">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Maintenance Costs by Type
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-blue-50">
                        {["Type","Cost","Jobs","Share"].map((h) => <TH key={h}>{h}</TH>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {data.expenses.maintenance.byType.map((t, i) => (
                        <tr key={t.type} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <TD bold>{MAINT_LABEL[t.type] ?? t.type}</TD>
                          <TD red>{fmt(t.total)}</TD>
                          <td className="border border-indigo-100 px-3 py-2 text-sm text-slate-700">{t.count}</td>
                          <td className="border border-indigo-100 px-3 py-2">
                            <MiniBar value={t.total} max={Math.max(...data.expenses.maintenance.byType.map((x) => x.total), 1)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <TFoot>
                        <td className="border border-indigo-200 px-3 py-2 text-xs font-bold text-slate-800">TOTAL</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-red-600">{fmt(data.expenses.maintenance.total)}</td>
                        <td className="border border-indigo-200 px-3 py-2 text-sm font-bold text-slate-900">{data.expenses.maintenance.count}</td>
                        <td className="border border-indigo-200 px-3 py-2" />
                      </TFoot>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Export all ── */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-100 bg-slate-50 p-4">
            <Download className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-700">Export all data:</span>
            {[
              { label: "Revenue CSV",  fn: exportRevenueCsv  },
              { label: "Bookings CSV", fn: exportBookingsCsv },
              { label: "Routes CSV",   fn: exportRoutesCsv   },
              { label: "Expenses CSV", fn: exportExpensesCsv },
            ].map(({ label, fn }) => (
              <button key={label} type="button" onClick={fn}
                className="flex items-center gap-1.5 rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
                <FileSpreadsheet className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
            <button type="button" onClick={handleGeneratePdf} disabled={pdfLoading}
              className="ml-auto flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60 transition-colors shadow-sm">
              {pdfLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                : <><FileText className="h-3.5 w-3.5" /> Download PDF</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
