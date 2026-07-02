"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  onClick?: () => void;
}

export default function KPICard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  onClick,
}: KPICardProps) {
  return (
    <Card
      className={cn(
        "border-2 bg-gradient-to-br shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer",
        trend === 'up' && "border-emerald-200/60 from-white to-emerald-50/50",
        trend === 'down' && "border-red-200/60 from-white to-red-50/50",
        trend === 'neutral' && "border-slate-200/60 from-white to-slate-50/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">
              {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend === 'up' && "text-emerald-600",
                    trend === 'down' && "text-red-600",
                    trend === 'neutral' && "text-slate-600"
                  )}
                >
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
                <span className="text-xs text-slate-500">vs yesterday</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg",
              trend === 'up' && "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
              trend === 'down' && "bg-gradient-to-br from-orange-500 to-red-600 text-white",
              trend === 'neutral' && "bg-gradient-to-br from-slate-500 to-slate-600 text-white"
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
