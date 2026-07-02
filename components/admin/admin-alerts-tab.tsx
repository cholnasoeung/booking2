"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Alert {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  busId?: string;
  routeId?: string;
  message: string;
  data: any;
  timestamp: string;
}

interface AlertSummary {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  alerts: Alert[];
}

export default function AdminAlertsTab() {
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/alerts?run=true");
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return AlertTriangle;
      case "medium":
        return Info;
      case "low":
        return CheckCircle;
      default:
        return Bell;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "low_inventory":
        return "📊";
      case "overbooking":
        return "⚠️";
      case "cancellation_spike":
        return "📉";
      case "revenue_drop":
        return "💸";
      case "high_demand":
        return "🔥";
      default:
        return "🔔";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Alerts</h2>
          <p className="text-sm text-gray-600">Monitor critical system events</p>
        </div>
        <Button onClick={fetchAlerts} disabled={loading}>
          <Bell className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Alerts</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalAlerts}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-sm text-red-600">Critical</p>
            <p className="text-2xl font-bold text-red-900">{summary.criticalAlerts}</p>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
            <p className="text-sm text-orange-600">High</p>
            <p className="text-2xl font-bold text-orange-900">{summary.highAlerts}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-sm text-yellow-600">Medium</p>
            <p className="text-2xl font-bold text-yellow-900">{summary.mediumAlerts}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-600">Low</p>
            <p className="text-2xl font-bold text-green-900">{summary.lowAlerts}</p>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {summary && summary.alerts.length > 0 ? (
        <div className="space-y-3">
          {summary.alerts.map((alert, index) => {
            const SeverityIcon = getSeverityIcon(alert.severity);
            return (
              <div
                key={index}
                className={`bg-white rounded-xl border p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityIcon className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{alert.message}</p>
                    {alert.data && Object.keys(alert.data).length > 0 && (
                      <div className="mt-2 text-sm bg-white/50 rounded p-2">
                        <p className="font-semibold mb-1">Details:</p>
                        {Object.entries(alert.data).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-2 text-xs">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-gray-900 font-medium">No alerts</p>
          <p className="text-sm text-gray-600">System is running smoothly</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Automatic Monitoring:</strong> Alerts are automatically generated for
          low inventory (&lt;20% seats), overbookings, high cancellation rates, and
          revenue drops. Critical alerts trigger email notifications to admins.
        </p>
      </div>
    </div>
  );
}
