 "use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUS_TYPES } from "@/lib/constants";
import { type BusType } from "@/lib/seat-layout";
import { type BusDetailSummary } from "@/lib/queries";

type BusDetailsFormState = {
  name: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: string;
  amenities: string;
  imageUrls: string;
};

type AdminBusDetailsManagerProps = {
  busDetails: BusDetailSummary[];
};

const initialState: BusDetailsFormState = {
  name: "",
  registrationNumber: "",
  busType: "mini_bus",
  totalSeats: "30",
  amenities: "",
  imageUrls: "",
};

export default function AdminBusDetailsManager({ busDetails }: AdminBusDetailsManagerProps) {
  const [form, setForm] = useState(initialState);
  const [details, setDetails] = useState(busDetails);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
    const images = form.imageUrls
      .split(/\s+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    const response = await fetch("/api/admin/bus-details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            registrationNumber: form.registrationNumber.trim().toUpperCase(),
            busType: form.busType,
            totalSeats: Number(form.totalSeats),
            amenities: form.amenities
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            images,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setMessage({
            type: "error",
            text: payload?.message ?? "Unable to save the vehicle.",
          });
          return;
        }

        setDetails((current) => [payload.busDetail, ...current]);
        setForm(initialState);
        setMessage({
          type: "success",
          text: payload.message ?? "Vehicle added to fleet.",
        });
      } catch {
        setMessage({
          type: "error",
          text: "Something went wrong while saving the vehicle.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-slate-200 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle>Fleet management</CardTitle>
          <p className="text-sm text-slate-500">
            Capture each vehicle's registration, capacity, and type so departures can be linked to a
            verified bus.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bus-detail-name">Bus name</Label>
                <Input
                  id="bus-detail-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. Sunset Cruiser"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bus-detail-registration">Registration</Label>
                <Input
                  id="bus-detail-registration"
                  value={form.registrationNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, registrationNumber: event.target.value }))
                  }
                  placeholder="AB1234CD"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bus-detail-type">Bus type</Label>
                <Select
                  value={form.busType}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, busType: value as AmenityValue }))
                  }
                >
                  <SelectTrigger id="bus-detail-type" className="h-11 rounded-xl">
                    <SelectValue placeholder="Choose bus type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bus-detail-seats">Total seats</Label>
                <Input
                  id="bus-detail-seats"
                  type="number"
                  min={1}
                  value={form.totalSeats}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, totalSeats: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bus-detail-amenities">Amenities (comma separated)</Label>
                <Input
                  id="bus-detail-amenities"
                  value={form.amenities}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amenities: event.target.value }))
                  }
                  placeholder="Wi-Fi, Restroom, USB Charging"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bus-detail-images">Image URLs (one per line)</Label>
              <Textarea
                id="bus-detail-images"
                value={form.imageUrls}
                onChange={(event) =>
                  setForm((current) => ({ ...current, imageUrls: event.target.value }))
                }
                placeholder="https://example.com/bus1.jpg"
                className="h-24 rounded-xl border border-slate-200 bg-slate-50"
              />
              <p className="text-[11px] text-slate-500">
                Enter publicly accessible image URLs so passengers can preview the vehicle.
              </p>
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
              {isPending ? "Saving…" : "Add vehicle"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-200 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle>Current fleet</CardTitle>
          <p className="text-sm text-slate-500">
            {details.length} vehicle{details.length === 1 ? "" : "s"} ready to be assigned.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {details.length === 0 ? (
            <p className="text-sm text-slate-500">Add a vehicle to start assigning it to buses.</p>
          ) : (
            <div className="space-y-2">
              {details.map((detail) => (
                <div
                  key={detail.id}
                  className="flex flex-col gap-1 rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{detail.name}</p>
                    <span className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                      {detail.busType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {detail.registrationNumber} · {detail.totalSeats} seats
                  </p>
                  {detail.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {detail.amenities.map((amenity) => (
                        <span key={amenity} className="rounded-full border border-slate-200 px-2 py-0.5">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
