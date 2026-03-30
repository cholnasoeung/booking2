"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
} from "lucide-react";

interface KPIData {
  totalRevenue: number;
  revenueChange: number;
  totalBookings: number;
  bookingsChange: number;
  averageOccupancy: number;
  totalPassengers: number;
  activeRoutes: number;
  activeBuses: number;
}

interface AnalyticsData {
  kpis: KPIData;
  revenueByRoute: Array<{
    routeId: string;
    routeName: string;
    revenue: number;
    bookings: number;
    occupancyRate: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    bookings: number;
  }>;
}

export default function AdminAnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState("30"); // days

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000
      ).toISOString();
      const previousStartDate = new Date(
        new Date(startDate).getTime() -
          parseInt(dateRange) * 24 * 60 * 60 * 1000
      ).toISOString();

      const params = new URLSearchParams({
        type: "dashboard",
        startDate,
        endDate,
        previousStartDate,
        previousEndDate: startDate,
      });

      const response = await fetch(`/api/admin/analytics?${params}`);
      const result = await response.json();

      // Transform API response to match component expectations
      const transformedData: AnalyticsData = {
        kpis: result.kpis || result,
        revenueByRoute: result.metrics?.revenueByRoute || result.performance || [],
        dailyRevenue: result.trends || [],
      };

      setData(transformedData);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-600">Revenue metrics and performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span
              className={`text-sm font-medium ${
                (kpis.revenueChange || 0) >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {(kpis.revenueChange || 0) >= 0 ? "+" : ""}
              {kpis.revenueChange || 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${(kpis.totalRevenue || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Total Revenue</p>
        </div>

        {/* Bookings */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span
              className={`text-sm font-medium ${
                (kpis.bookingsChange || 0) >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {(kpis.bookingsChange || 0) >= 0 ? "+" : ""}
              {kpis.bookingsChange || 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.totalBookings || 0}</p>
          <p className="text-sm text-gray-600">Total Bookings</p>
        </div>

        {/* Passengers */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.totalPassengers || 0}</p>
          <p className="text-sm text-gray-600">Total Passengers</p>
        </div>

        {/* Occupancy */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-500 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-orange-600">
              {kpis.averageOccupancy || 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {kpis.activeRoutes || 0} Routes
          </p>
          <p className="text-sm text-gray-600">{kpis.activeBuses || 0} Active Buses</p>
        </div>
      </div>

      {/* Revenue by Route */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Revenue by Route</h3>
        </div>
        <div className="p-6">
          {data?.revenueByRoute && data.revenueByRoute.length > 0 ? (
            <div className="space-y-4">
              {data.revenueByRoute.map((route) => (
                <div
                  key={route.routeId}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{route.routeName}</p>
                    <p className="text-sm text-gray-600">
                      {route.bookings} bookings • {route.occupancyRate?.toFixed(1) || 0}% occupancy
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    ${route.revenue?.toLocaleString() || 0}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p>No revenue data available for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
