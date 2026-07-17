import { compareSeatCodes, getBusTypeLabel, isBusType } from "@/lib/seat/seat-layout";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTravelDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatSeatList(seats: Array<string | number>) {
  return seats
    .map((seat) => String(seat).trim())
    .filter(Boolean)
    .sort(compareSeatCodes)
    .join(", ");
}

export function formatBusType(value: string) {
  return isBusType(value) ? getBusTypeLabel(value) : "Bus";
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: "Card (Stripe)",
  abaPayway: "ABA PayWay",
  aba: "ABA Pay",
  wing: "Wing",
  cash: "Cash",
  pay_on_boarding: "Pay on Boarding",
};

export function formatPaymentMethod(value?: string | null) {
  if (!value) return "Online Payment";
  return PAYMENT_METHOD_LABELS[value] ?? value;
}
