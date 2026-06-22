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

/* ── load logo to data URL via canvas (avoids html2canvas CSS issues) ── */
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

/* ── small UI pieces ── */
function StatCard({
  icon, label, value, sub, color = "indigo",
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  color?: "indigo" | "violet" | "emerald" | "red" | "amber";
}) {
  const colors: Record<string, string> = {
    indigo:  "bg-indigo-50  border-indigo-100  text-indigo-600",
    violet:  "bg-violet-50  border-violet-100  text-violet-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    red:     "bg-red-50     border-red-100     text-red-600",
    amber:   "bg-amber-50   border-amber-100   text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

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

  /* ── fetch report + settings ── */
  function fetchReport() {
    setError("");
    startT(async () => {
      try {
        const [reportRes, settingsRes] = await Promise.all([
          fetch(`/api/admin/reports?startDate=${startDate}&endDate=${endDate}`),
          fetch("/api/admin/settings"),
        ]);
        if (!reportRes.ok) {
          const d = await reportRes.json();
          setError(d.message ?? "Failed to load report.");
          return;
        }
        const [reportJson, settingsJson] = await Promise.all([
          reportRes.json(),
          settingsRes.ok ? settingsRes.json() : Promise.resolve(null),
        ]);
        setData(reportJson);
        if (settingsJson) {
          setCompany({
            name:    settingsJson.general?.businessName ?? "BusBooking",
            logoUrl: settingsJson.logoUrl ?? null,
            email:   settingsJson.general?.contactEmail ?? "",
            phone:   settingsJson.general?.supportPhone ?? "",
          });
        }
      } catch {
        setError("Network error — please try again.");
      }
    });
  }

  /* ── CSV exports ── */
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

  /* ════════════════════════════════════════════════════════════════
     PDF — built entirely with jsPDF drawing API; NO html2canvas,
     so no "unsupported color function lab/oklch" errors from Tailwind.
  ════════════════════════════════════════════════════════════════ */
  async function handleGeneratePdf() {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      const PW = 210; // A4 width mm
      const PH = 297; // A4 height mm
      const M  = 14;  // margin
      const CW = PW - 2 * M; // content width

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const genAt = new Date().toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      /* ── colours ── */
      const INDIGO  = "#4f46e5";
      const VIOLET  = "#7c3aed";
      const WHITE   = "#ffffff";
      const DARK    = "#0f172a";
      const SLATE   = "#64748b";
      const MUTED   = "#94a3b8";
      const BORDER  = "#e2e8f0";
      const ALTROW  = "#f8fafc";
      const TOTAL   = "#eef2ff";
      const TOTALBR = "#c7d2fe";
      const EMERALD = "#10b981";
      const RED     = "#ef4444";
      const AMBER   = "#d97706";
      const INDIGO_TEXT = "#4338ca";

      /* ── small helpers ── */
      const sf = (c: string) => { doc.setFillColor(c); };
      const st = (c: string) => { doc.setTextColor(c); };
      const sd = (c: string) => { doc.setDrawColor(c); };
      const fl = (f: "normal" | "bold" | "italic") => { doc.setFont("helvetica", f); };
      const fs = (s: number) => { doc.setFontSize(s); };
      const ln = (lw: number) => { doc.setLineWidth(lw); };

      let y = 0; // current cursor

      /* ── PAGE HEADER (called on new pages too) ── */
      const drawPageHeader = (isFirst: boolean) => {
        if (isFirst) {
          /* gradient simulation: two overlapping rects */
          sf(INDIGO); doc.rect(0, 0, PW * 0.6, 34, "F");
          sf(VIOLET); doc.rect(PW * 0.4, 0, PW * 0.6, 34, "F");
          sf(INDIGO); doc.rect(0, 0, PW * 0.6, 34, "F"); // reapply for blend

          /* logo */
          const logoSize = 20;
          const logoX = M;
          const logoY = 7;
          if (company?.logoUrl) {
            loadLogoDataUrl(company.logoUrl).then((dataUrl) => {
              if (dataUrl) {
                try { doc.addImage(dataUrl, "PNG", logoX, logoY, logoSize, logoSize); } catch { /* skip */ }
              }
            });
          }
          /* initials badge (always drawn first; logo renders async on top) */
          sf("#6f67ea"); /* white 18% over indigo → blended solid */
          doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, "F");
          st(WHITE); fl("bold"); fs(11);
          const initials = (company?.name ?? "BB").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          doc.text(initials, logoX + logoSize / 2, logoY + logoSize / 2 + 1, { align: "center" });

          /* company name */
          st(WHITE); fl("bold"); fs(14);
          doc.text(company?.name ?? "BusBooking", M + logoSize + 4, 15);
          if (company?.email || company?.phone) {
            fl("normal"); fs(8); st("#c8beff");
            doc.text(
              [company?.email, company?.phone].filter(Boolean).join("  ·  "),
              M + logoSize + 4, 21
            );
          }

          /* right side */
          st(WHITE); fl("bold"); fs(12);
          doc.text("Business Report", PW - M, 14, { align: "right" });
          fl("normal"); fs(8.5); st("#c8beff");
          doc.text(`${fmtDate(startDate)} — ${fmtDate(endDate)}`, PW - M, 21, { align: "right" });
          fs(7.5); st("#b4aaf0");
          doc.text(`Generated ${genAt}`, PW - M, 27, { align: "right" });

          y = 40;
        } else {
          /* thin accent bar on continuation pages */
          sf(INDIGO); doc.rect(0, 0, PW, 10, "F");
          st(WHITE); fl("bold"); fs(8);
          doc.text(company?.name ?? "BusBooking", M, 6.5);
          fl("normal");
          doc.text(`${fmtDate(startDate)} – ${fmtDate(endDate)}`, PW - M, 6.5, { align: "right" });
          y = 16;
        }
      };

      /* ── page break check ── */
      const chk = (need: number) => {
        if (y + need > PH - 16) { doc.addPage(); drawPageHeader(false); }
      };

      /* ── section title ── */
      const sectionTitle = (title: string, accent: string = INDIGO) => {
        chk(14);
        sf(accent + "18"); // very light background strip
        doc.rect(M, y, CW, 8, "F");
        sf(accent); doc.rect(M, y, 3, 8, "F"); // left accent bar
        st(DARK); fl("bold"); fs(9.5);
        doc.text(title, M + 6, y + 5.5);
        y += 12;
      };

      /* ── KPI card ── */
      const kpiCard = (x: number, cardY: number, w: number, label: string, value: string, sub: string, accent: string) => {
        sf(ALTROW); doc.roundedRect(x, cardY, w, 22, 2, 2, "F");
        sf(accent);  doc.roundedRect(x, cardY, w, 2, 1, 1, "F"); // top stripe
        st(accent); fl("bold"); fs(7);
        doc.text(label.toUpperCase(), x + 4, cardY + 8);
        st(DARK); fl("bold"); fs(10);
        const val = doc.splitTextToSize(value, w - 8)[0] as string;
        doc.text(val, x + 4, cardY + 15);
        st(SLATE); fl("normal"); fs(7);
        doc.text(sub, x + 4, cardY + 20);
      };

      /* ── table helpers ── */
      type Col = { label: string; w: number };

      const tableHeader = (cols: Col[], tableY: number) => {
        sf(ALTROW); doc.rect(M, tableY, CW, 7, "F");
        sd(BORDER); ln(0.2);
        doc.line(M, tableY + 7, M + CW, tableY + 7);
        let x = M;
        cols.forEach((c) => {
          st(SLATE); fl("bold"); fs(7);
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
          fs(8);
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
          st(cell.c ?? DARK); fl("bold"); fs(8);
          doc.text(cell.t, x + 2, rowY + 4.8);
          x += cols[i].w;
        });
        return rowY + 9;
      };

      /* ── PAGE FOOTER ── */
      const drawPageFooter = (pageNum: number, total: number) => {
        const fy = PH - 10;
        sd(BORDER); ln(0.3);
        doc.line(M, fy - 2, PW - M, fy - 2);
        st(MUTED); fl("normal"); fs(7.5);
        doc.text(`${company?.name ?? "BusBooking"} — Confidential`, M, fy + 2);
        doc.text(`Page ${pageNum} of ${total}`, PW / 2, fy + 2, { align: "center" });
        doc.text(`${fmtDate(startDate)} – ${fmtDate(endDate)}`, PW - M, fy + 2, { align: "right" });
      };

      /* ════════════ BUILD PDF ════════════ */

      /* -- Load logo in parallel (async; adds on top later) -- */
      let logoDataUrl: string | null = null;
      if (company?.logoUrl) {
        logoDataUrl = await loadLogoDataUrl(company.logoUrl);
      }

      drawPageHeader(true);

      /* overlay real logo if loaded */
      if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, "PNG", M, 7, 20, 20); } catch { /* skip */ }
      }

      /* ── Revenue KPIs ── */
      const cardGap = 3;
      const cardW   = (CW - cardGap * 3) / 4;
      chk(26);
      kpiCard(M,                      y, cardW, "Gross Revenue",   fmt(data.revenue.gross),    "All bookings",     INDIGO);
      kpiCard(M + (cardW + cardGap),  y, cardW, "Total Refunds",   fmt(data.revenue.refunds),  "Cancellations",    RED);
      kpiCard(M + (cardW + cardGap)*2,y, cardW, "Discounts Given", fmt(data.revenue.discounts),"Promo savings",    AMBER);
      kpiCard(M + (cardW + cardGap)*3,y, cardW, "Net Revenue",     fmt(data.revenue.net),       "After refunds",    EMERALD);
      y += 26;

      chk(26);
      kpiCard(M,                      y, cardW, "Total Bookings",   String(data.bookings.total),                                     `${data.bookings.pending} pending`,         "#6366f1");
      kpiCard(M + (cardW + cardGap),  y, cardW, "Confirmed",        `${data.bookings.confirmed} (${pct(data.bookings.confirmedRate)})`,"Success rate",                              EMERALD);
      kpiCard(M + (cardW + cardGap)*2,y, cardW, "Cancelled",        `${data.bookings.cancelled} (${pct(data.bookings.cancellationRate)})`,"Cancellation rate",                     RED);
      kpiCard(M + (cardW + cardGap)*3,y, cardW, "Passengers",       String(data.bookings.totalPassengers),                           `Avg ${fmt(data.bookings.avgTicketValue)}`, VIOLET);
      y += 30;

      /* ── Daily Revenue ── */
      if (data.revenue.byDay.length > 0) {
        sectionTitle("Daily Revenue Breakdown", INDIGO);
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
            { t: fmt(d.refunds),   c: RED    },
            { t: fmt(d.discounts), c: AMBER  },
            { t: fmt(d.net),       c: INDIGO_TEXT, bold: true },
            { t: String(d.confirmed), c: EMERALD },
            { t: String(d.cancelled), c: RED     },
            { t: String(d.total) },
          ], dCols, y, i % 2 === 1);
        });
        chk(9);
        y = tableFooter([
          { t: "TOTAL" },
          { t: fmt(data.revenue.gross) },
          { t: fmt(data.revenue.refunds),   c: RED   },
          { t: fmt(data.revenue.discounts), c: AMBER },
          { t: fmt(data.revenue.net),       c: INDIGO_TEXT },
          { t: String(data.bookings.confirmed), c: EMERALD },
          { t: String(data.bookings.cancelled), c: RED     },
          { t: String(data.bookings.total) },
        ], dCols, y);
        y += 4;
      }

      /* ── Bookings by Route ── */
      if (data.bookings.byRoute.length > 0) {
        sectionTitle("Top Routes by Bookings", VIOLET);
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
            { t: String(r.confirmed), c: EMERALD },
            { t: String(r.cancelled), c: RED     },
            { t: String(r.total)  },
            { t: fmt(r.revenue), c: INDIGO_TEXT, bold: true },
          ], rCols, y, i % 2 === 1);
        });
        y += 4;
      }

      /* ── Route Performance ── */
      if (data.routes.length > 0) {
        sectionTitle("Route Performance", EMERALD);
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
            { t: String(r.confirmedBookings),  c: EMERALD },
            { t: String(r.cancelledBookings),  c: RED     },
            { t: String(r.totalSeats)         },
            { t: fmt(r.revenue), c: INDIGO_TEXT, bold: true },
            { t: fmt(r.refunds), c: RED          },
          ], pCols, y, i % 2 === 1);
        });
        chk(9);
        y = tableFooter([
          { t: "TOTAL" },
          { t: String(data.bookings.total) },
          { t: String(data.bookings.confirmed), c: EMERALD },
          { t: String(data.bookings.cancelled), c: RED     },
          { t: String(data.routes.reduce((s, r) => s + r.totalSeats, 0)) },
          { t: fmt(data.revenue.gross),    c: INDIGO_TEXT },
          { t: fmt(data.revenue.refunds),  c: RED         },
        ], pCols, y);
      }

      /* ── Expenses ── */
      if (data.expenses) {
        const exp = data.expenses;
        const ORANGE = "#f97316";
        const ROSE   = "#f43f5e";

        sectionTitle("Expense Overview", AMBER);

        /* 4 KPI cards: Fuel, Maintenance, Driver Pay, Payroll */
        chk(26);
        const eCardW = (CW - cardGap * 3) / 4;
        kpiCard(M,                         y, eCardW, "Fuel Costs",      fmt(exp.fuel.total),          `${exp.fuel.liters.toFixed(0)} L · ${exp.fuel.count} fills`,       ORANGE);
        kpiCard(M + (eCardW + cardGap),    y, eCardW, "Maintenance",     fmt(exp.maintenance.total),   `${exp.maintenance.count} completed jobs`,                          ROSE);
        kpiCard(M + (eCardW + cardGap)*2,  y, eCardW, "Driver Pay",      fmt(exp.driverPay.total),     `${exp.driverPay.count} earning records`,                           INDIGO);
        kpiCard(M + (eCardW + cardGap)*3,  y, eCardW, "Payroll (Net)",   fmt(exp.payroll.netPay),      `${exp.payroll.count} payslips`,                                    VIOLET);
        y += 26;

        /* Total expenses + Profit/Loss cards */
        chk(26);
        const halfW = (CW - cardGap) / 2;
        kpiCard(M,               y, halfW, "Total Expenses",   fmt(exp.totalExpenses), "Fuel + Maintenance + Driver Pay + Payroll", RED);
        const plColor = exp.profitLoss >= 0 ? EMERALD : RED;
        kpiCard(M + halfW + cardGap, y, halfW, exp.profitLoss >= 0 ? "Net Profit" : "Net Loss",
          fmt(Math.abs(exp.profitLoss)), `Revenue ${fmt(data.revenue.net)} − Expenses ${fmt(exp.totalExpenses)}`, plColor);
        y += 30;

        /* Fuel daily breakdown */
        if (exp.fuel.byDay.length > 0) {
          sectionTitle("Fuel Costs by Day", ORANGE);
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
              { t: fmt(d.cost),             c: AMBER, bold: true },
              { t: `${d.liters.toFixed(1)} L` },
              { t: String(d.count) },
            ], fCols, y, i % 2 === 1);
          });
          chk(9);
          y = tableFooter([
            { t: "TOTAL" },
            { t: fmt(exp.fuel.total), c: AMBER },
            { t: `${exp.fuel.liters.toFixed(1)} L` },
            { t: String(exp.fuel.count) },
          ], fCols, y);
          y += 4;
        }

        /* Maintenance by type */
        if (exp.maintenance.byType.length > 0) {
          sectionTitle("Maintenance by Type", ROSE);
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
              { t: fmt(t.total), c: ROSE },
              { t: String(t.count) },
            ], mCols, y, i % 2 === 1);
          });
          chk(9);
          y = tableFooter([
            { t: "TOTAL" },
            { t: fmt(exp.maintenance.total), c: ROSE },
            { t: String(exp.maintenance.count) },
          ], mCols, y);
          y += 4;
        }
      }

      /* ── Add footer to every page ── */
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

  /* ── max values for mini bars ── */
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
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {pdfLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…</>
              : <><FileText className="h-4 w-4" /> Download PDF</>
            }
          </button>
        )}
      </div>

      {/* ── Date range picker + generate ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700">Date Range</span>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From</label>
            <input type="date" value={startDate} max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 [color-scheme:light]" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">To</label>
            <input type="date" value={endDate} min={startDate} max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 [color-scheme:light]" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[{ label: "7d", days: 7 }, { label: "30d", days: 30 }, { label: "90d", days: 90 }, { label: "1Y", days: 365 }, { label: "All", days: 3650 }].map(({ label, days }) => (
              <button key={label} type="button"
                onClick={() => { setStartDate(new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)); setEndDate(today); }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                {label === "7d" || label === "30d" || label === "90d" || label === "1Y" ? `Last ${label}` : label}
              </button>
            ))}
          </div>
          <button type="button" onClick={fetchReport} disabled={isPending}
            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60 transition-all">
            {isPending
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</>
              : <><BarChart3 className="h-4 w-4" /> Generate Report</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!data && !isPending && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <BarChart3 className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600">Select a date range and click Generate Report</p>
          <p className="mt-1 text-xs text-slate-400">Revenue, bookings, and route data will appear here.</p>
        </div>
      )}

      {/* ══ REPORT CONTENT (screen view) ══ */}
      {data && (
        <div className="space-y-8">

          {/* Company header banner */}
          <div className="rounded-2xl overflow-hidden shadow-md">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 overflow-hidden">
                  {company?.logoUrl
                    ? <img src={company.logoUrl} alt="logo" className="h-14 w-14 object-contain" />
                    : <span className="text-2xl font-black text-white">
                        {(company?.name ?? "BB").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                  }
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{company?.name ?? "BusBooking"}</p>
                  {(company?.email || company?.phone) && (
                    <p className="text-xs text-indigo-200">
                      {company?.email}{company?.email && company?.phone ? " · " : ""}{company?.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">Business Report</p>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {fmtDate(data.dateRange.start)} — {fmtDate(data.dateRange.end)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 1: Revenue ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100">
                <Wallet className="h-4 w-4 text-indigo-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Revenue Report</h3>
              <span className="ml-auto text-xs text-slate-400">
                {data.dateRange.start} → {data.dateRange.end}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<TrendingUp className="h-5 w-5" />}   label="Gross Revenue"   value={fmt(data.revenue.gross)}    sub="All confirmed bookings" color="indigo" />
              <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Total Refunds"   value={fmt(data.revenue.refunds)}  sub="From cancellations"     color="red"    />
              <StatCard icon={<Minus className="h-5 w-5" />}        label="Discounts Given" value={fmt(data.revenue.discounts)}sub="Promo code savings"      color="amber"  />
              <StatCard icon={<ArrowUpRight className="h-5 w-5" />} label="Net Revenue"     value={fmt(data.revenue.net)}      sub="After refunds"          color="emerald"/>
            </div>

            {/* Revenue trend area chart */}
            {data.revenue.byDay.length > 1 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-4 text-sm font-bold text-slate-900">Revenue Trend</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.revenue.byDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rptGradGross" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rptGradNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                    <Tooltip
                      formatter={(v) => [`$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]}
                      labelFormatter={(l) => `Date: ${l}`}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="gross" name="Gross Revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#rptGradGross)" dot={false} />
                    <Area type="monotone" dataKey="net"   name="Net Revenue"   stroke="#10b981" strokeWidth={2} fill="url(#rptGradNet)"   dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.revenue.byDay.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900">Daily Breakdown</p>
                  <button type="button" onClick={exportRevenueCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Date","Gross","Refunds","Discounts","Net","Confirmed","Cancelled","Bar"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.revenue.byDay.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{fmt(d.gross)}</td>
                          <td className="px-4 py-3 text-red-600">{fmt(d.refunds)}</td>
                          <td className="px-4 py-3 text-amber-600">{fmt(d.discounts)}</td>
                          <td className="px-4 py-3 font-bold text-indigo-700">{fmt(d.net)}</td>
                          <td className="px-4 py-3 text-emerald-600">{d.confirmed}</td>
                          <td className="px-4 py-3 text-red-500">{d.cancelled}</td>
                          <td className="px-4 py-3"><MiniBar value={d.net} max={maxDayNet} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-indigo-50/60 font-bold">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">TOTAL</td>
                        <td className="px-4 py-3 text-slate-900">{fmt(data.revenue.gross)}</td>
                        <td className="px-4 py-3 text-red-600">{fmt(data.revenue.refunds)}</td>
                        <td className="px-4 py-3 text-amber-600">{fmt(data.revenue.discounts)}</td>
                        <td className="px-4 py-3 text-indigo-700">{fmt(data.revenue.net)}</td>
                        <td className="px-4 py-3 text-emerald-600">{data.bookings.confirmed}</td>
                        <td className="px-4 py-3 text-red-500">{data.bookings.cancelled}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2: Bookings ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                <BarChart3 className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Bookings Report</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<BarChart3 className="h-5 w-5" />}    label="Total Bookings"   value={data.bookings.total.toLocaleString()}                                                  sub={`${data.bookings.pending} pending`}           color="indigo" />
              <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Confirmed"        value={`${data.bookings.confirmed.toLocaleString()} (${pct(data.bookings.confirmedRate)})`}    sub="Successfully booked"                          color="emerald"/>
              <StatCard icon={<XCircle className="h-5 w-5" />}      label="Cancelled"        value={`${data.bookings.cancelled.toLocaleString()} (${pct(data.bookings.cancellationRate)})`} sub="With refund policy applied"                   color="red"    />
              <StatCard icon={<Users className="h-5 w-5" />}        label="Total Passengers" value={data.bookings.totalPassengers.toLocaleString()}                                         sub={`Avg ticket ${fmt(data.bookings.avgTicketValue)}`} color="violet"/>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-sm font-bold text-slate-900">Booking Status Split</p>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="w-40 h-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Confirmed", value: data.bookings.confirmed, fill: "#4f46e5" },
                          { name: "Cancelled", value: data.bookings.cancelled, fill: "#ef4444" },
                          { name: "Pending",   value: data.bookings.pending,   fill: "#f59e0b" },
                        ].filter((d) => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value"
                      />
                      <Tooltip
                        formatter={(v) => [String(v), ""]}
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-3">
                  {([
                    { label: "Confirmed", value: data.bookings.confirmed, rate: data.bookings.confirmedRate,    bg: "bg-indigo-500", text: "text-indigo-700" },
                    { label: "Cancelled", value: data.bookings.cancelled, rate: data.bookings.cancellationRate, bg: "bg-red-400",    text: "text-red-600"   },
                    { label: "Pending",   value: data.bookings.pending,
                      rate: data.bookings.total > 0 ? Math.round(data.bookings.pending / data.bookings.total * 1000) / 10 : 0,
                      bg: "bg-amber-400", text: "text-amber-600" },
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
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${bg} transition-all`} style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {data.bookings.byRoute.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900">Bookings by Route</p>
                  <button type="button" onClick={exportBookingsCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["#","Route","Confirmed","Cancelled","Total","Revenue","Bar"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.bookings.byRoute.map((r, i) => (
                        <tr key={r.route} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-slate-400">#{i + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{r.route}</td>
                          <td className="px-4 py-3 text-emerald-600">{r.confirmed}</td>
                          <td className="px-4 py-3 text-red-500">{r.cancelled}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{r.total}</td>
                          <td className="px-4 py-3 font-bold text-indigo-700">{fmt(r.revenue)}</td>
                          <td className="px-4 py-3"><MiniBar value={r.total} max={maxRouteBook} color="bg-violet-500" /></td>
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
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Route Performance</h3>
            </div>
            {/* Route revenue bar chart */}
            {data.routes.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                    <YAxis type="category" dataKey="route" tick={{ fontSize: 10, fill: "#64748b" }}
                      tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      formatter={(v) => [`$${Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, ""]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Refunds" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.routes.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No route data for this period.</p>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900">
                    {data.routes.length} route{data.routes.length !== 1 ? "s" : ""} active in period
                  </p>
                  <button type="button" onClick={exportRoutesCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Route","Total","Confirmed","Cancelled","Seats Sold","Revenue","Refunds","Rev Bar"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.routes.map((r) => (
                        <tr key={r.routeId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900">{r.from}</span>
                            <span className="mx-1.5 text-slate-300">→</span>
                            <span className="font-semibold text-slate-900">{r.to}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{r.totalBookings}</td>
                          <td className="px-4 py-3 text-emerald-600 font-medium">{r.confirmedBookings}</td>
                          <td className="px-4 py-3 text-red-500">{r.cancelledBookings}</td>
                          <td className="px-4 py-3 text-slate-700">{r.totalSeats}</td>
                          <td className="px-4 py-3 font-bold text-indigo-700">{fmt(r.revenue)}</td>
                          <td className="px-4 py-3 text-red-500">{fmt(r.refunds)}</td>
                          <td className="px-4 py-3"><MiniBar value={r.revenue} max={maxRouteRev} color="bg-emerald-500" /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-indigo-50/60 font-bold">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">TOTAL</td>
                        <td className="px-4 py-3">{data.bookings.total}</td>
                        <td className="px-4 py-3 text-emerald-600">{data.bookings.confirmed}</td>
                        <td className="px-4 py-3 text-red-500">{data.bookings.cancelled}</td>
                        <td className="px-4 py-3">{data.routes.reduce((s, r) => s + r.totalSeats, 0)}</td>
                        <td className="px-4 py-3 text-indigo-700">{fmt(data.revenue.gross)}</td>
                        <td className="px-4 py-3 text-red-500">{fmt(data.revenue.refunds)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 4: Expenses ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
                <Receipt className="h-4 w-4 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Expense Report</h3>
              <button type="button" onClick={exportExpensesCsv}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>

            {/* 4 expense KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Fuel    className="h-5 w-5" />} label="Fuel Costs"     value={fmt(data.expenses.fuel.total)}         sub={`${data.expenses.fuel.liters.toFixed(0)} L · ${data.expenses.fuel.count} fills`}    color="amber"  />
              <StatCard icon={<Wrench  className="h-5 w-5" />} label="Maintenance"    value={fmt(data.expenses.maintenance.total)}   sub={`${data.expenses.maintenance.count} completed jobs`}                                   color="red"    />
              <StatCard icon={<UserCog className="h-5 w-5" />} label="Driver Pay"     value={fmt(data.expenses.driverPay.total)}     sub={`${data.expenses.driverPay.count} earning records`}                                    color="indigo" />
              <StatCard icon={<Receipt className="h-5 w-5" />} label="Payroll (Net)"  value={fmt(data.expenses.payroll.netPay)}      sub={`${data.expenses.payroll.count} payslips`}                                             color="violet" />
            </div>

            {/* Total expenses + Profit/Loss */}
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Total Expenses"
                value={fmt(data.expenses.totalExpenses)}
                sub="Fuel + Maintenance + Driver Pay + Payroll"
                color="red" />
              <StatCard
                icon={data.expenses.profitLoss >= 0
                  ? <TrendingUp className="h-5 w-5" />
                  : <Loss className="h-5 w-5" />}
                label={data.expenses.profitLoss >= 0 ? "Net Profit" : "Net Loss"}
                value={fmt(Math.abs(data.expenses.profitLoss))}
                sub={`Revenue ${fmt(data.revenue.net)} − Expenses ${fmt(data.expenses.totalExpenses)}`}
                color={data.expenses.profitLoss >= 0 ? "emerald" : "red"}
              />
            </div>

            {/* Expense breakdown donut */}
            {data.expenses.totalExpenses > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-sm font-bold text-slate-900">Expense Breakdown</p>
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="w-44 h-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Fuel",        value: data.expenses.fuel.total,        fill: "#f97316" },
                            { name: "Maintenance", value: data.expenses.maintenance.total, fill: "#f43f5e" },
                            { name: "Driver Pay",  value: data.expenses.driverPay.total,   fill: "#4f46e5" },
                            { name: "Payroll",     value: data.expenses.payroll.netPay,    fill: "#7c3aed" },
                          ].filter((d) => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={46} outerRadius={66} paddingAngle={3} dataKey="value"
                        />
                        <Tooltip
                          formatter={(v) => [fmt(Number(v ?? 0)), ""]}
                          contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    {([
                      { label: "Fuel",        value: data.expenses.fuel.total,        bg: "bg-orange-500", text: "text-orange-700" },
                      { label: "Maintenance", value: data.expenses.maintenance.total, bg: "bg-rose-500",   text: "text-rose-700"   },
                      { label: "Driver Pay",  value: data.expenses.driverPay.total,   bg: "bg-indigo-500", text: "text-indigo-700" },
                      { label: "Payroll",     value: data.expenses.payroll.netPay,    bg: "bg-violet-500", text: "text-violet-700" },
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
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${bg} transition-all`} style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Fuel daily table */}
            {data.expenses.fuel.byDay.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-amber-500" /> Fuel Costs by Day
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Date","Cost","Liters","Fills"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.expenses.fuel.byDay.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.date}</td>
                          <td className="px-4 py-3 font-bold text-amber-700">{fmt(d.cost)}</td>
                          <td className="px-4 py-3 text-slate-700">{d.liters.toFixed(1)} L</td>
                          <td className="px-4 py-3 text-slate-600">{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-amber-50/60 font-bold">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">TOTAL</td>
                        <td className="px-4 py-3 text-amber-700">{fmt(data.expenses.fuel.total)}</td>
                        <td className="px-4 py-3 text-slate-700">{data.expenses.fuel.liters.toFixed(1)} L</td>
                        <td className="px-4 py-3 text-slate-600">{data.expenses.fuel.count}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Maintenance by type table */}
            {data.expenses.maintenance.byType.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3.5">
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-rose-500" /> Maintenance Costs by Type
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left">
                        {["Type","Cost","Jobs","Share"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.expenses.maintenance.byType.map((t) => (
                        <tr key={t.type} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{MAINT_LABEL[t.type] ?? t.type}</td>
                          <td className="px-4 py-3 font-bold text-rose-700">{fmt(t.total)}</td>
                          <td className="px-4 py-3 text-slate-600">{t.count}</td>
                          <td className="px-4 py-3">
                            <MiniBar value={t.total} max={Math.max(...data.expenses.maintenance.byType.map((x) => x.total), 1)} color="bg-rose-500" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-rose-50/60 font-bold">
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">TOTAL</td>
                        <td className="px-4 py-3 text-rose-700">{fmt(data.expenses.maintenance.total)}</td>
                        <td className="px-4 py-3 text-slate-600">{data.expenses.maintenance.count}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Export all ── */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <Download className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="text-sm font-semibold text-slate-700">Export all data:</span>
            <button type="button" onClick={exportRevenueCsv}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Revenue CSV
            </button>
            <button type="button" onClick={exportBookingsCsv}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Bookings CSV
            </button>
            <button type="button" onClick={exportRoutesCsv}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Routes CSV
            </button>
            <button type="button" onClick={exportExpensesCsv}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors shadow-sm">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Expenses CSV
            </button>
            <button type="button" onClick={handleGeneratePdf} disabled={pdfLoading}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm">
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
