"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceStatus {
  status: "operational" | "degraded" | "down";
  message?: string;
  [key: string]: any;
}

interface SystemStatus {
  status: "operational" | "degraded" | "down";
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    emailService: ServiceStatus;
    auth: ServiceStatus;
  };
  metrics: {
    totalUsers: number;
    totalBookings: number;
    totalBuses: number;
    totalRoutes: number;
    activeBookings: number;
  };
}

export default function AdminSystemStatusTab() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/admin/system-status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch system status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (serviceStatus: string) => {
    switch (serviceStatus) {
      case "operational":
        return "text-green-600 bg-green-100";
      case "degraded":
        return "text-yellow-600 bg-yellow-100";
      case "down":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-indigo-50";
    }
  };

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case "operational":
        return CheckCircle;
      case "degraded":
        return AlertTriangle;
      case "down":
        return XCircle;
      default:
        return Activity;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
          <p className="text-sm text-gray-600">Real-time health monitoring</p>
        </div>
        <Button onClick={fetchStatus} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {status && (
        <>
          {/* Overall Status Banner */}
          <div
            className={`rounded-xl p-6 ${
              status.status === "operational"
                ? "bg-green-50 border border-green-200"
                : status.status === "degraded"
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status.status === "operational" ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : status.status === "degraded" ? (
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {status.status === "operational"
                      ? "All Systems Operational"
                      : status.status === "degraded"
                      ? "System Degraded"
                      : "System Down"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Environment: {status.environment} • Version: {status.version}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatUptime(status.uptime)}
                </p>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Database */}
            <div className="bg-white rounded-xl border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Database</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    status.services.database.status
                  )}`}
                >
                  {status.services.database.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {status.services.database.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Connections: {status.services.database.connections}
              </p>
            </div>

            {/* Email Service */}
            <div className="bg-white rounded-xl border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Email Service</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    status.services.emailService.status
                  )}`}
                >
                  {status.services.emailService.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {status.services.emailService.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Provider: {status.services.emailService.provider}
              </p>
            </div>

            {/* Auth */}
            <div className="bg-white rounded-xl border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Authentication</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    status.services.auth.status
                  )}`}
                >
                  {status.services.auth.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {status.services.auth.message}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="bg-white rounded-xl border border-indigo-100 p-6">
            <h3 className="font-semibold mb-4">System Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {status.metrics.totalUsers}
                </p>
                <p className="text-sm text-gray-600">Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {status.metrics.totalBookings}
                </p>
                <p className="text-sm text-gray-600">Total Bookings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {status.metrics.totalBuses}
                </p>
                <p className="text-sm text-gray-600">Buses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {status.metrics.totalRoutes}
                </p>
                <p className="text-sm text-gray-600">Routes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {status.metrics.activeBookings}
                </p>
                <p className="text-sm text-gray-600">Active Bookings</p>
              </div>
            </div>
          </div>

          {/* Health Check Endpoint */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Health Check Endpoints</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <code className="text-blue-800">GET /api/health</code>
                <span className="text-blue-600">Overall health</span>
              </div>
              <div className="flex items-center justify-between">
                <code className="text-blue-800">GET /api/health?type=ready</code>
                <span className="text-blue-600">Readiness probe</span>
              </div>
              <div className="flex items-center justify-between">
                <code className="text-blue-800">GET /api/health?type=alive</code>
                <span className="text-blue-600">Liveness probe</span>
              </div>
            </div>
            <p className="text-xs text-blue-700 mt-3">
              These endpoints can be used by Kubernetes, load balancers, or monitoring
              services for automated health checks.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
