"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Search, RefreshCw } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminSecurityTab() {
  const [userQuery, setUserQuery] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [fraudCheck, setFraudCheck] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [rateLimitStats, setRateLimitStats] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userQuery.trim()) {
      setUserOptions([]);
      setDropdownOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(userQuery)}&page=1`);
        const json = await res.json();
        setUserOptions(json.users?.slice(0, 8) ?? []);
        setDropdownOpen(true);
      } catch {
        setUserOptions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [userQuery]);

  const checkFraud = async () => {
    if (!selectedUser) return;
    setChecking(true);
    setFraudCheck(null);
    try {
      const response = await fetch(
        `/api/admin/security?action=check-fraud&userId=${selectedUser.id}&ipAddress=unknown`
      );
      const data = await response.json();
      setFraudCheck(data.fraudCheck);
    } catch (error) {
      console.error("Fraud check failed:", error);
    } finally {
      setChecking(false);
    }
  };

  const fetchRateLimitStats = async () => {
    try {
      const response = await fetch("/api/admin/security?action=stats");
      const data = await response.json();
      setRateLimitStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch rate limit stats:", error);
    }
  };

  useState(() => {
    fetchRateLimitStats();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security Monitoring</h2>
        <p className="text-sm text-gray-600">Rate limiting & fraud detection</p>
      </div>

      {/* Fraud Detection */}
      <div className="bg-white rounded-xl border border-indigo-100 p-6">
        <h3 className="font-semibold mb-4">Fraud Detection</h3>
        <p className="text-sm text-gray-600 mb-4">
          Check user activity for suspicious patterns like excessive bookings, high
          cancellation rates, and multiple IP addresses.
        </p>

        <div className="space-y-3 mb-4">
          {/* User search */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : userQuery}
                  onChange={(e) => {
                    setSelectedUser(null);
                    setUserQuery(e.target.value);
                    setFraudCheck(null);
                  }}
                  onFocus={() => { if (userOptions.length > 0) setDropdownOpen(true); }}
                  placeholder="Search user by name or email…"
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searching && (
                  <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>
              <button
                onClick={checkFraud}
                disabled={checking || !selectedUser}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
              >
                {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Check Risk
              </button>
            </div>

            {/* Dropdown */}
            {dropdownOpen && userOptions.length > 0 && !selectedUser && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-indigo-100 rounded-xl shadow-lg overflow-hidden">
                {userOptions.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setUserQuery("");
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-left transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-indigo-50 text-gray-600"}`}>
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected user chip */}
          {selectedUser && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-indigo-900">{selectedUser.name}</span>
              <span className="text-indigo-500">{selectedUser.email}</span>
              <button
                onClick={() => { setSelectedUser(null); setFraudCheck(null); setUserQuery(""); }}
                className="ml-auto text-indigo-400 hover:text-indigo-700 font-bold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {fraudCheck && (
          <div
            className={`rounded-xl p-4 ${
              fraudCheck.isSuspicious
                ? "bg-red-50 border border-red-200"
                : "bg-green-50 border border-green-200"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {fraudCheck.isSuspicious ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <span className="font-semibold">
                  {fraudCheck.isSuspicious ? "Suspicious Activity Detected" : "No Suspicious Activity"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Risk Score</p>
                <p
                  className={`text-2xl font-bold ${
                    fraudCheck.riskScore > 50 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {fraudCheck.riskScore}/100
                </p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Recommended Action:</p>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  fraudCheck.action === "block"
                    ? "bg-red-100 text-red-800"
                    : fraudCheck.action === "review"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {fraudCheck.action.toUpperCase()}
              </span>
            </div>

            {fraudCheck.reasons.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Reasons:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {fraudCheck.reasons.map((reason: string, i: number) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rate Limiting Stats */}
      <div className="bg-white rounded-xl border border-indigo-100 p-6">
        <h3 className="font-semibold mb-4">Rate Limiting Status</h3>

        {rateLimitStats ? (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-indigo-50/40 rounded-lg p-4">
                <p className="text-sm text-gray-600">Active Rate Limits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rateLimitStats.totalEntries}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">By Endpoint:</p>
              <div className="space-y-2">
                {Object.entries(rateLimitStats.entriesByEndpoint).map(
                  ([endpoint, count]: [string, any]) => (
                    <div
                      key={endpoint}
                      className="flex items-center justify-between bg-indigo-50/40 rounded px-3 py-2"
                    >
                      <span className="text-sm font-mono">{endpoint}</span>
                      <span className="text-sm font-medium">{count} requests</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading rate limit stats...</p>
        )}
      </div>

      {/* Rate Limits Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Configured Rate Limits</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-800">Authentication (Sign-in/Sign-up)</span>
            <span className="font-medium text-blue-900">5 requests/minute</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">Booking Creation</span>
            <span className="font-medium text-blue-900">10 requests/minute</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">Bus Search</span>
            <span className="font-medium text-blue-900">30 requests/minute</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">Admin Operations</span>
            <span className="font-medium text-blue-900">100 requests/minute</span>
          </div>
        </div>
      </div>

      {/* Fraud Detection Config */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-semibold text-amber-900 mb-3">Fraud Detection Thresholds</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-amber-800">Max bookings per hour</span>
            <span className="font-medium text-amber-900">5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-800">Max bookings per day</span>
            <span className="font-medium text-amber-900">15</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-800">Max cancellations per day</span>
            <span className="font-medium text-amber-900">10</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-800">Max different IPs per day</span>
            <span className="font-medium text-amber-900">5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
