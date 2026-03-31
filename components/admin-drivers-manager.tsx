"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DriverSummary } from "@/lib/queries";

type AdminDriversManagerProps = {
  drivers: DriverSummary[];
};

type DriverFormState = {
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber: string;
};

const initialFormState: DriverFormState = {
  name: "",
  phone: "",
  licenseNumber: "",
  vehicleNumber: "",
};

export default function AdminDriversManager({ drivers }: AdminDriversManagerProps) {
  const [driverList, setDriverList] = useState(drivers);
  const [form, setForm] = useState(initialFormState);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/drivers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            licenseNumber: form.licenseNumber.trim(),
            vehicleNumber: form.vehicleNumber.trim() || undefined,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setMessage({
            type: "error",
            text: payload?.message ?? "Unable to add driver right now.",
          });
          return;
        }

        setDriverList((prev) => [payload.driver, ...prev]);
        setForm(initialFormState);
        setMessage({
          type: "success",
          text: payload.message ?? "Driver added successfully.",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: "Something went wrong while saving the driver.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-slate-200 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle>Driver management</CardTitle>
          <p className="text-sm text-slate-500">
            Register drivers, track their status, and keep the dispatch roster up to date.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="driver-name">Full name</Label>
                <Input
                  id="driver-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. Sofia Santos"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-phone">Phone</Label>
                <Input
                  id="driver-phone"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="+62 812 3456 7890"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-license">License number</Label>
                <Input
                  id="driver-license"
                  value={form.licenseNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, licenseNumber: event.target.value }))
                  }
                  placeholder="DL-1234-5678"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-vehicle">Vehicle number (optional)</Label>
              <Input
                id="driver-vehicle"
                value={form.vehicleNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, vehicleNumber: event.target.value }))
                }
                placeholder="AB 1234 C"
              />
            </div>

            {message ? (
              <p
                className={`text-sm font-medium ${
                  message.type === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {message.text}
              </p>
            ) : null}

            <Button type="submit" className="w-full max-w-sm rounded-xl" disabled={isPending}>
              {isPending ? "Saving driver…" : "Add driver"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-200 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle>Current roster</CardTitle>
          <p className="text-sm text-slate-500">
            {driverList.length} driver{driverList.length === 1 ? "" : "s"} registered.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {driverList.length === 0 ? (
            <p className="text-sm text-slate-500">Add a driver to get started.</p>
          ) : (
            <div className="space-y-3">
              {driverList.map((driver) => (
                <div
                  key={driver.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{driver.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                      {driver.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-slate-600">
                    <span>{driver.phone}</span>
                    <span className="text-[13px] text-slate-500">{driver.licenseNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={driver.status === "active" ? "secondary" : "outline"}>
                      {driver.status}
                    </Badge>
                    {driver.vehicleNumber && (
                      <span className="text-xs font-medium text-slate-400">
                        {driver.vehicleNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
