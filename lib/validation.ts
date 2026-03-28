import { Types } from "mongoose";

import { DEFAULT_PASSENGERS, MAX_SEATS_PER_BOOKING } from "@/lib/constants";

export function getFirstSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function normalizeCity(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePassengerCount(
  value: unknown,
  fallback = DEFAULT_PASSENGERS
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, MAX_SEATS_PER_BOOKING);
}

export function parseSeatSelection(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const seats = value
    .map((seat) => Number(seat))
    .filter((seat) => Number.isInteger(seat) && seat > 0);

  const uniqueSeats = [...new Set(seats)].sort((first, second) => first - second);

  if (uniqueSeats.length === 0 || uniqueSeats.length > MAX_SEATS_PER_BOOKING) {
    return null;
  }

  return uniqueSeats;
}

export function isValidObjectId(value: string) {
  return Types.ObjectId.isValid(value);
}
