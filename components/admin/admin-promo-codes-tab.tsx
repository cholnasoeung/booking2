"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDelete } from "@/lib/utils/swal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface CreateFormData {
  code: string;
  type: "percentage" | "fixed" | "free_ticket";
  value: string;
  maxUses: string;
  minBookingAmount: string;
  maxDiscountAmount: string;
  validFrom: string;
  validUntil: string;
}

export default function AdminPromoCodesTab() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<CreateFormData>({
    code: "",
    type: "percentage",
    value: "",
    maxUses: "",
    minBookingAmount: "",
    maxDiscountAmount: "",
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          type: formData.type,
          value: parseFloat(formData.value),
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
          minBookingAmount: formData.minBookingAmount ? parseFloat(formData.minBookingAmount) : 0,
          maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to create promo code");
        return;
      }

      setSuccess("Promo code created successfully!");
      setFormData({
        code: "",
        type: "percentage",
        value: "",
        maxUses: "",
        minBookingAmount: "",
        maxDiscountAmount: "",
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      fetchPromoCodes();

      setTimeout(() => {
        setSuccess("");
        setShowCreateForm(false);
      }, 2000);
    } catch (error) {
      setError("Failed to create promo code");
    } finally {
      setSubmitting(false);
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
    if (!(await confirmDelete("this promo code"))) return;

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
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow-md shadow-indigo-100 gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Promo Code
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Create New Promo Code</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <Label htmlFor="code">Promo Code *</Label>
                <Input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Enter code (will be converted to uppercase)</p>
              </div>

              {/* Type */}
              <div>
                <Label htmlFor="type">Discount Type *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="free_ticket">Free Ticket</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <Label htmlFor="value">
                  Discount Value * {formData.type === "percentage" ? "(%)" : formData.type === "fixed" ? "($)" : ""}
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  max={formData.type === "percentage" ? 100 : undefined}
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === "percentage" ? "20" : "10"}
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === "percentage" ? "Enter percentage (0-100)" : "Enter fixed amount"}
                </p>
              </div>

              {/* Max Uses */}
              <div>
                <Label htmlFor="maxUses">Maximum Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="100"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited uses</p>
              </div>

              {/* Min Booking Amount */}
              <div>
                <Label htmlFor="minBookingAmount">Minimum Booking Amount (Optional)</Label>
                <Input
                  id="minBookingAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minBookingAmount}
                  onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum booking amount to use this code</p>
              </div>

              {/* Max Discount Amount */}
              <div>
                <Label htmlFor="maxDiscountAmount">Max Discount Amount (Optional)</Label>
                <Input
                  id="maxDiscountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                  placeholder="50"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Cap the maximum discount</p>
              </div>

              {/* Valid From */}
              <div>
                <Label htmlFor="validFrom">Valid From *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              {/* Valid Until */}
              <div>
                <Label htmlFor="validUntil">Valid Until *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {submitting ? "Creating..." : "Create Promo Code"}
              </Button>
            </div>
          </form>
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
                      <span className="text-gray-500"> / {promo.maxUses || "∞"}</span>
                    </div>
                    {promo.maxUses && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min((promo.usedCount / promo.maxUses) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    )}
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
