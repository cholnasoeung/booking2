import type { BookingStatus, BusType } from "@/types/booking";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTravelDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatBookingDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatBusType(busType: BusType) {
  switch (busType) {
    case "bus_45":
      return "45 Seater";
    case "mini_bus":
      return "Mini Bus";
    case "car":
      return "Car";
    default:
      return "Bus";
  }
}

export function formatStatus(status: BookingStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getTomorrowDateInput() {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  return tomorrow.toISOString().slice(0, 10);
}
