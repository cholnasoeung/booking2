import { Types } from "mongoose";

import { DEFAULT_PASSENGERS, MAX_SEATS_PER_BOOKING } from "@/lib/constants";
import { compareSeatCodes, normalizeSeatCode } from "@/lib/seat-layout";

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
    .map((seat) => {
      if (typeof seat !== "string") {
        return null;
      }

      const normalizedSeat = normalizeSeatCode(seat);
      return normalizedSeat || null;
    })
    .filter((seat): seat is string => Boolean(seat));

  const uniqueSeats = [...new Set(seats)].sort(compareSeatCodes);

  if (uniqueSeats.length === 0 || uniqueSeats.length > MAX_SEATS_PER_BOOKING) {
    return null;
  }

  return uniqueSeats;
}

export function isValidObjectId(value: string) {
  return Types.ObjectId.isValid(value);
}
