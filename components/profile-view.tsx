"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Calendar, Edit3, Check, X, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { User as UserType } from "@/lib/auth";

type ProfileViewProps = {
  user: UserType;
};

export default function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    phone: user.phone || "",
    address: user.address || "",
  });

  async function handleSave() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    setFormData({
      name: user.name || "",
      phone: user.phone || "",
      address: user.address || "",
    });
    setIsEditing(false);
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back
      </button>

      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-indigo-500 font-semibold">
          My Profile
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          Account Details
        </h1>
        <p className="text-base text-slate-500">
          Manage your personal information and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-2xl">
        <CardHeader className="border-b-2 border-dashed border-slate-200/60 bg-gradient-to-r from-slate-50 to-indigo-50 px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-4xl font-bold shadow-xl shadow-indigo-200">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-slate-900">{user.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2 text-base">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </CardDescription>
              </div>
            </div>
            {!isEditing ? (
              <Button
                size="lg"
                className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg hover:shadow-xl transition-all"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-2 border-slate-300 hover:bg-slate-100"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:shadow-xl transition-all"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-8 py-8 space-y-8">
          {/* Account Information */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-5 flex items-center gap-2">
              <User className="h-4 w-4" />
              Account Information
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-12 rounded-xl border-slate-300 bg-white text-base"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 text-base">
                    {user.name || "Not provided"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                  {user.email}
                </div>
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                  Phone Number
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="h-12 rounded-xl border-slate-300 bg-white text-base"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 flex items-center gap-2 text-base">
                    <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                    {user.phone || "Not provided"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-slate-700">
                  Address
                </Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="h-12 rounded-xl border-slate-300 bg-white text-base"
                    placeholder="Enter your address"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                    {user.address || "Not provided"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="border-t-2 border-slate-200 pt-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-5 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Account Details
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Role</p>
                <div className="mt-3">
                  {user.role === "admin" ? (
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 text-sm px-3 py-1">
                      Administrator
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-sm px-3 py-1">
                      User
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  Member Since
                </p>
                <p className="mt-3 text-base font-semibold text-slate-900">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Recently"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-2xl">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle className="text-2xl font-bold text-slate-900">Quick Actions</CardTitle>
          <CardDescription className="text-base">
            Manage your account security and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8 grid gap-4 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-auto rounded-2xl border-2 border-slate-200 bg-white p-5 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
            onClick={() => router.push("/dashboard")}
          >
            <div className="flex items-center gap-4 text-left w-full">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">My Bookings</p>
                <p className="text-sm text-slate-500">View your trip history</p>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto rounded-2xl border-2 border-slate-200 bg-white p-5 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
            onClick={() => router.push("/")}
          >
            <div className="flex items-center gap-4 text-left w-full">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">Book a Trip</p>
                <p className="text-sm text-slate-500">Search for buses</p>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
