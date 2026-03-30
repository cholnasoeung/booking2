"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Calendar, Edit3, Check, X } from "lucide-react";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          My Profile
        </p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          Account Details
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-xl">
        <CardHeader className="border-b-2 border-dashed border-slate-200/60 bg-gradient-to-r from-slate-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold shadow-lg">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-3.5 w-3.5" />
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

        <CardContent className="p-6 space-y-6">
          {/* Account Information */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Account Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
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
                    className="h-11 rounded-xl border-slate-300 bg-white"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
                    {user.name || "Not provided"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
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
                    className="h-11 rounded-xl border-slate-300 bg-white"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
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
                    className="h-11 rounded-xl border-slate-300 bg-white"
                    placeholder="Enter your address"
                  />
                ) : (
                  <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    {user.address || "Not provided"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="border-t-2 border-slate-200 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Account Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-600 uppercase tracking-wide">Role</p>
                <div className="mt-2">
                  {user.role === "admin" ? (
                    <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
                      Administrator
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                      User
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-600 uppercase tracking-wide">
                  Member Since
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
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
      <Card className="border-2 border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>
            Manage your account security and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-auto rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 hover:border-slate-300"
            onClick={() => router.push("/dashboard")}
          >
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">My Bookings</p>
                <p className="text-xs text-slate-600">View your trip history</p>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 hover:border-slate-300"
            onClick={() => router.push("/")}
          >
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Book a Trip</p>
                <p className="text-xs text-slate-600">Search for buses</p>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
