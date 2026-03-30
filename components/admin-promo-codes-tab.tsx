"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromoCode {
  _id: string;
  code: string;
  type: "percentage" | "fixed" | "free_ticket";
  value: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  applicableRoutes?: string[];
  applicableBusTypes?: string[];
}

export default function AdminPromoCodesTab() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/promo-codes");
      const data = await response.json();
      setPromoCodes(data.promoCodes || []);
    } catch (error) {
      console.error("Failed to fetch promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchPromoCodes();
      }
    } catch (error) {
      console.error("Failed to update promo code:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPromoCodes();
      }
    } catch (error) {
      console.error("Failed to delete promo code:", error);
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Promo Codes</h2>
          <p className="text-sm text-gray-600">Manage promotional discounts</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Promo Code
        </Button>
      </div>

      {/* Create Form - Placeholder */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Create New Promo Code</h3>
          <p className="text-sm text-gray-600 mb-4">
            Promo code creation form will be implemented here. For now, use the API directly.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <strong>API Endpoint:</strong> POST /api/admin/promo-codes
          </div>
        </div>
      )}

      {/* Promo Codes List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoCodes.map((promo) => (
                <tr key={promo._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-500" />
                      <span className="font-mono font-semibold text-gray-900">
                        {promo.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      {promo.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {promo.type === "percentage"
                      ? `${promo.value}%`
                      : promo.type === "fixed"
                      ? `$${promo.value}`
                      : "Free"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">
                        {promo.usedCount}
                      </span>
                      <span className="text-gray-500"> / {promo.maxUses}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{
                          width: `${(promo.usedCount / promo.maxUses) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>
                      <div>From: {new Date(promo.validFrom).toLocaleDateString()}</div>
                      <div>To: {new Date(promo.validUntil).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {promo.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(promo._id, promo.isActive)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={promo.isActive ? "Deactivate" : "Activate"}
                      >
                        {promo.isActive ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(promo._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {promoCodes.length === 0 && (
          <div className="text-center py-12">
            <Tag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No promo codes found</p>
            <p className="text-sm text-gray-400">Create your first promo code to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
