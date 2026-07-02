"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Ticket, XCircle, Clock } from "lucide-react";
import KPICard from "@/components/common/kpi-card";

interface KPIMetrics {
  revenueToday: { value: number; change: number };
  bookingsToday: { value: number; change: number };
  cancellations: { value: number; change: number };
  pendingRefunds: { value: number };
}

interface AdminKPICardsProps {
  onFilterChange?: (filter: string) => void;
}

export default function AdminKPICards({ onFilterChange }: AdminKPICardsProps) {
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/analytics/kpi");
        const result = await response.json();
        if (result.success) {
          setMetrics(result.data);
        }
      } catch (error) {
        console.error("Error fetching KPI metrics:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl border-2 border-slate-200 bg-slate-50 animate-pulse" />
        ))}
      </div>
    );
  }

  function getTrend(change: number): 'up' | 'down' | 'neutral' {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label="Revenue Today"
        value={`$${metrics.revenueToday.value.toLocaleString()}`}
        change={metrics.revenueToday.change}
        trend={getTrend(metrics.revenueToday.change)}
        icon={DollarSign}
        onClick={() => onFilterChange?.('revenue-today')}
      />
      <KPICard
        label="Bookings Today"
        value={metrics.bookingsToday.value}
        change={metrics.bookingsToday.change}
        trend={getTrend(metrics.bookingsToday.change)}
        icon={Ticket}
        onClick={() => onFilterChange?.('bookings-today')}
      />
      <KPICard
        label="Cancellations"
        value={metrics.cancellations.value}
        change={metrics.cancellations.change}
        trend={getTrend(metrics.cancellations.change)}
        icon={XCircle}
        onClick={() => onFilterChange?.('cancellations')}
      />
      <KPICard
        label="Pending Refunds"
        value={metrics.pendingRefunds.value}
        icon={Clock}
        onClick={() => onFilterChange?.('pending-refunds')}
      />
    </div>
  );
}
