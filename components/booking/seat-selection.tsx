"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import SeatMap from "@/components/booking/seat-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSeatCodesFromLayout, compareSeatCodes } from "@/lib/seat/seat-layout";
import { formatBusType, formatCurrency, formatSeatList } from "@/lib/utils/formatters";
import type { BusSummary } from "@/lib/db/queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SeatSelectionProps = {
  bus: BusSummary;
  selectionLimit: number;
};

type SavedSeatTemplate = {
  busType: BusSummary["busType"];
  seats: string[];
};

type UserPreferences = {
  preferredSeatType?: string[];
  preferredBusType?: string[];
  savedSeatTemplates?: SavedSeatTemplate[];
  notifications?: {
    bookingConfirmation?: boolean;
    cancellationAlerts?: boolean;
    promotionalEmails?: boolean;
  };
};

type UserProfileResponse = {
  user?: {
    preferences?: UserPreferences;
  };
};

type TemplateMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function SeatSelection({
  bus,
  selectionLimit,
}: SeatSelectionProps) {
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [liveBookedSeats, setLiveBookedSeats] = useState<string[]>(bus.bookedSeats);
  const [liveBlockedSeats, setLiveBlockedSeats] = useState<string[]>(bus.blockedSeats);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [savedTemplate, setSavedTemplate] = useState<SavedSeatTemplate | null>(null);
  const [templateMessage, setTemplateMessage] = useState<TemplateMessage | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);
  const heldSeatsRef = useRef<string[]>([]);
  const holdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardingOptions = bus.stops.filter((stop) => stop.boarding);
  const droppingOptions = bus.stops.filter((stop) => stop.dropping);
  const [boardingStop, setBoardingStop] = useState(
    boardingOptions[0]?.location ?? bus.from
  );
  const [droppingStop, setDroppingStop] = useState(
    droppingOptions[0]?.location ?? bus.to
  );

  function getSeatPrice(seatCode: string): number {
    const item = bus.seatLayout.items.find(
      (i) => i.seatCode?.toUpperCase() === seatCode.toUpperCase()
    );
    const tier = item?.tier ?? "standard";
    const multiplier =
      tier === "vip"
        ? (bus.seatTierMultipliers?.vip ?? 1.6)
        : tier === "business"
        ? (bus.seatTierMultipliers?.business ?? 1.3)
        : 1.0;
    return Math.round(bus.pricePerSeat * multiplier * 100) / 100;
  }

  const totalPrice = selectedSeats.reduce((sum, code) => sum + getSeatPrice(code), 0);
  const validSeatCodes = useMemo(
    () => new Set(getSeatCodesFromLayout(bus.seatLayout)),
    [bus.seatLayout]
  );
  // liveBlockedSeats includes seats *this* session holds (our own hold call
  // blocks them server-side too). Strip our own selections out so they render
  // and behave as "selected", not as "blocked/unavailable" to their own owner.
  const otherBlockedSeats = useMemo(
    () => liveBlockedSeats.filter((s) => !selectedSeats.includes(s)),
    [liveBlockedSeats, selectedSeats]
  );

  // Real-time seat updates via Server-Sent Events
  useEffect(() => {
    const es = new EventSource(`/api/buses/${bus.id}/seat-events`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.bookedSeats) setLiveBookedSeats(data.bookedSeats);
        if (data.blockedSeats) setLiveBlockedSeats(data.blockedSeats);
        // Deselect any seat that was just taken by someone else — but not
        // seats this session itself is holding (blockedSeats includes our
        // own hold, so without this check we'd immediately un-select and
        // release our own pick as soon as the next SSE update arrives).
        setSelectedSeats((prev) =>
          prev.filter(
            (s) =>
              !data.bookedSeats?.includes(s) &&
              (!data.blockedSeats?.includes(s) || heldSeatsRef.current.includes(s))
          )
        );
      } catch {}
    };
    return () => es.close();
  }, [bus.id]);

  // Hold selected seats via API (debounced 600ms to avoid rapid calls)
  useEffect(() => {
    if (holdDebounceRef.current) clearTimeout(holdDebounceRef.current);

    if (selectedSeats.length === 0) {
      // Release any previously held seats
      if (heldSeatsRef.current.length > 0) {
        fetch(`/api/buses/${bus.id}/hold`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seats: heldSeatsRef.current }),
        }).catch(() => {});
        heldSeatsRef.current = [];
      }
      setHoldExpiresAt(null);
      return;
    }

    holdDebounceRef.current = setTimeout(async () => {
      // Release old hold if different seats
      if (heldSeatsRef.current.length > 0) {
        await fetch(`/api/buses/${bus.id}/hold`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seats: heldSeatsRef.current }),
        }).catch(() => {});
      }

      const res = await fetch(`/api/buses/${bus.id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats: selectedSeats }),
      }).catch(() => null);

      if (res?.ok) {
        const data = await res.json().catch(() => ({}));
        heldSeatsRef.current = selectedSeats;
        if (data.expiresAt) setHoldExpiresAt(new Date(data.expiresAt));
      } else if (res?.status === 409) {
        // One or more seats already taken — deselect them
        const data = await res.json().catch(() => ({}));
        if (data.message) setError(data.message + " Please choose different seats.");
        setSelectedSeats([]);
        heldSeatsRef.current = [];
        setHoldExpiresAt(null);
      }
    }, 600);

    return () => { if (holdDebounceRef.current) clearTimeout(holdDebounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeats.join(","), bus.id]);

  // Release hold on unmount
  useEffect(() => {
    return () => {
      if (heldSeatsRef.current.length > 0) {
        fetch(`/api/buses/${bus.id}/hold`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seats: heldSeatsRef.current }),
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus.id]);

  // Countdown ticker
  useEffect(() => {
    if (!holdExpiresAt) { setHoldSecondsLeft(0); return; }
    const tick = () => {
      const s = Math.max(0, Math.round((holdExpiresAt.getTime() - Date.now()) / 1000));
      setHoldSecondsLeft(s);
      if (s === 0) {
        setSelectedSeats([]);
        heldSeatsRef.current = [];
        setHoldExpiresAt(null);
        setError("Your seat hold expired. Please select seats again.");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  useEffect(() => {
    let mounted = true;

    async function loadSeatTemplate() {
      setIsLoadingTemplate(true);

      try {
        const response = await fetch("/api/user/profile");
        const payload = (await response.json().catch(() => ({}))) as UserProfileResponse;

        if (!response.ok || !mounted) {
          return;
        }

        const nextPreferences = payload.user?.preferences ?? {};
        const nextTemplate = getTemplateForBusType(nextPreferences, bus.busType);

        setPreferences(nextPreferences);
        setSavedTemplate(nextTemplate);
      } finally {
        if (mounted) {
          setIsLoadingTemplate(false);
        }
      }
    }

    loadSeatTemplate();

    return () => {
      mounted = false;
    };
  }, [bus.busType]);

  function toggleSeat(seatCode: string) {
    if (liveBookedSeats.includes(seatCode) || otherBlockedSeats.includes(seatCode)) {
      return;
    }

    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats((current) =>
        current.filter((currentSeat) => currentSeat !== seatCode)
      );
      setError("");
      setTemplateMessage(null);
      return;
    }

    if (selectedSeats.length >= selectionLimit) {
      setError(`You can select up to ${selectionLimit} seat(s) for this booking.`);
      return;
    }

    setSelectedSeats((current) => [...current, seatCode].sort(compareSeatCodes));
    setError("");
    setTemplateMessage(null);
  }

  async function saveSeatTemplate() {
    if (selectedSeats.length === 0) {
      setTemplateMessage({
        type: "error",
        text: "Select at least one seat before saving a seat template.",
      });
      return;
    }

    setIsSavingTemplate(true);
    setTemplateMessage(null);

    const nextTemplate: SavedSeatTemplate = {
      busType: bus.busType,
      seats: [...selectedSeats].sort(compareSeatCodes),
    };

    const nextPreferences = mergeSeatTemplate(preferences, nextTemplate);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferences: nextPreferences,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as UserProfileResponse & {
        message?: string;
      };

      if (!response.ok) {
        setTemplateMessage({
          type: "error",
          text: payload.message ?? "Unable to save your seat template right now.",
        });
        return;
      }

      const updatedPreferences = payload.user?.preferences ?? nextPreferences;
      const updatedTemplate = getTemplateForBusType(updatedPreferences, bus.busType);

      setPreferences(updatedPreferences);
      setSavedTemplate(updatedTemplate);
      setTemplateMessage({
        type: "success",
        text: `Saved ${formatSeatList(nextTemplate.seats)} as your ${formatBusType(bus.busType).toLowerCase()} seat template.`,
      });
    } catch {
      setTemplateMessage({
        type: "error",
        text: "Unable to save your seat template right now.",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function applySavedTemplate() {
    if (!savedTemplate || savedTemplate.seats.length === 0) {
      setTemplateMessage({
        type: "error",
        text: "There is no saved seat template for this bus type yet.",
      });
      return;
    }

    const availableTemplateSeats = savedTemplate.seats
      .map((seat) => seat.trim())
      .filter((seat) => validSeatCodes.has(seat))
      .filter((seat) => !liveBookedSeats.includes(seat) && !otherBlockedSeats.includes(seat));
    const nextSeats = [...new Set(availableTemplateSeats)]
      .sort(compareSeatCodes)
      .slice(0, selectionLimit);

    if (nextSeats.length === 0) {
      setTemplateMessage({
        type: "error",
        text: "Your saved seat template is not available on this trip.",
      });
      return;
    }

    setSelectedSeats(nextSeats);
    setError("");

    if (nextSeats.length < savedTemplate.seats.length) {
      setTemplateMessage({
        type: "info",
        text: `Applied ${formatSeatList(nextSeats)}. Some saved seats were unavailable or over the limit for this booking.`,
      });
      return;
    }

    setTemplateMessage({
      type: "success",
      text: `Applied your saved template: ${formatSeatList(nextSeats)}.`,
    });
  }

  function proceedToPassengerDetails() {
    if (selectedSeats.length === 0) {
      setError("Please select at least one seat.");
      return;
    }

    setError("");

    const seatsParam = selectedSeats.join(",");
    const params = new URLSearchParams({
      seats: seatsParam,
      boardingStop,
      droppingStop,
    });

    router.push(`/book/${bus.id}/passengers?${params.toString()}`);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
      <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatBusType(bus.busType)}</Badge>
            <Badge variant="outline">
              {bus.seatsLeft} seat{bus.seatsLeft === 1 ? "" : "s"} left
            </Badge>
          </div>
          <CardTitle>Choose your seats</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick up to {selectionLimit} seat(s). Seat colors update instantly to show
            what&apos;s available, selected, and already taken.
          </p>
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
            >
              {selectedSeats.length} selected
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-800"
            >
              Up to {selectionLimit} seats
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700"
            >
              {bus.seatLayout.items.some((i) => (i as any).tier && (i as any).tier !== "standard")
                ? `from ${formatCurrency(bus.pricePerSeat)}`
                : `${formatCurrency(bus.pricePerSeat)} per seat`}
            </Badge>
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Saved seat template
                </p>
                <p className="text-sm text-slate-600">
                  {savedTemplate?.seats.length
                    ? `Template for ${formatBusType(bus.busType)}: ${formatSeatList(savedTemplate.seats)}`
                    : isLoadingTemplate
                    ? "Loading your saved seat template..."
                    : `No saved ${formatBusType(bus.busType).toLowerCase()} seat template yet.`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={!savedTemplate?.seats.length}
                  onClick={applySavedTemplate}
                >
                  Apply saved template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={isSavingTemplate || selectedSeats.length === 0}
                  onClick={saveSeatTemplate}
                >
                  {isSavingTemplate
                    ? "Saving template..."
                    : savedTemplate?.seats.length
                    ? "Update saved template"
                    : "Save current seats"}
                </Button>
              </div>
            </div>

            {templateMessage ? (
              <p
                className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                  templateMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : templateMessage.type === "info"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {templateMessage.text}
              </p>
            ) : null}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Boarding stop</p>
              <Select
                value={boardingStop}
                onValueChange={(value) => value && setBoardingStop(value)}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Boarding stop" />
                </SelectTrigger>
                <SelectContent>
                  {boardingOptions.map((stop) => (
                    <SelectItem key={stop.location} value={stop.location}>
                      {stop.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Drop-off stop</p>
              <Select
                value={droppingStop}
                onValueChange={(value) => value && setDroppingStop(value)}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Drop-off stop" />
                </SelectTrigger>
                <SelectContent>
                  {droppingOptions.map((stop) => (
                    <SelectItem key={stop.location} value={stop.location}>
                      {stop.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SeatMap
            layout={bus.seatLayout}
            bookedSeats={liveBookedSeats}
            blockedSeats={otherBlockedSeats}
            selectedSeats={selectedSeats}
            onSeatToggle={toggleSeat}
            showLegend
          />
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
        <CardHeader className="space-y-1">
          <CardTitle>Booking summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review your seats and trip details before moving to the passenger form.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-700/80">
                  Selected seats
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedSeats.length > 0
                    ? "Tap the map to add, remove, or swap seats anytime before continuing."
                    : "Choose one or more open seats from the map to start your booking."}
                </p>
              </div>
              <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
                {selectedSeats.length}/{selectionLimit}
              </span>
            </div>

            {selectedSeats.length > 0 ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedSeats.map((seatCode) => (
                    <span
                      key={seatCode}
                      className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm"
                    >
                      {seatCode}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  {formatSeatList(selectedSeats)}
                </p>
              </>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Boarding:</span> {boardingStop}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-900">Drop-off:</span> {droppingStop}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bus type</span>
              <span className="font-medium">{formatBusType(bus.busType)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Seat count</span>
              <span className="font-medium">{selectedSeats.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Base price</span>
              <span className="font-medium">{formatCurrency(bus.pricePerSeat)}</span>
            </div>

            {selectedSeats.length > 0 ? (
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 space-y-1">
                {selectedSeats.map((code) => {
                  const p = getSeatPrice(code);
                  const item = bus.seatLayout.items.find((i) => i.seatCode?.toUpperCase() === code.toUpperCase());
                  const tier = (item as any)?.tier;
                  return (
                    <div key={code} className="flex justify-between">
                      <span>{code}{tier && tier !== "standard" ? <span className="ml-1 font-semibold capitalize text-indigo-600">({tier})</span> : null}</span>
                      <span>{formatCurrency(p)}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium text-muted-foreground">Total</span>
              <span className="font-heading text-2xl font-semibold text-foreground">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {/* Hold timer */}
          {holdExpiresAt && holdSecondsLeft > 0 && (
            <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
              holdSecondsLeft <= 60
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              <span>
                Seats held for{" "}
                <span className="font-mono">
                  {String(Math.floor(holdSecondsLeft / 60)).padStart(2, "0")}:
                  {String(holdSecondsLeft % 60).padStart(2, "0")}
                </span>
                {holdSecondsLeft <= 60 ? " — almost expired!" : ""}
              </span>
            </div>
          )}

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            disabled={selectedSeats.length === 0 || bus.seatsLeft === 0}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-600 hover:to-violet-700"
            onClick={proceedToPassengerDetails}
          >
            Continue to Passenger Details
          </Button>

          <p className="text-xs leading-5 text-muted-foreground">
            Selected seats are held for 10 minutes while you complete checkout. Your hold starts when you select seats.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getTemplateForBusType(
  preferences: UserPreferences | null | undefined,
  busType: BusSummary["busType"]
) {
  return (
    preferences?.savedSeatTemplates?.find((template) => template.busType === busType) ??
    null
  );
}

function mergeSeatTemplate(
  preferences: UserPreferences | null,
  nextTemplate: SavedSeatTemplate
): UserPreferences {
  const savedSeatTemplates = [
    ...(preferences?.savedSeatTemplates ?? []).filter(
      (template) => template.busType !== nextTemplate.busType
    ),
    nextTemplate,
  ].sort((first, second) => first.busType.localeCompare(second.busType));

  return {
    ...(preferences ?? {}),
    savedSeatTemplates,
  };
}
