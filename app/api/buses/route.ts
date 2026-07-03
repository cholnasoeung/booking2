import type { NextRequest } from "next/server";

import { isValidDateInput } from "@/lib/utils/date";
import { searchBuses } from "@/lib/db/queries";
import { getFirstSearchParam, parsePassengerCount } from "@/lib/utils/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const from       = getFirstSearchParam(sp.getAll("from"));
  const to         = getFirstSearchParam(sp.getAll("to"));
  const date       = sp.get("date") ?? undefined;
  const passengers = parsePassengerCount(sp.get("passengers"));
  const busType    = sp.get("busType") ?? undefined;
  const maxPrice   = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const amenities  = sp.getAll("amenities").filter(Boolean);

  if (date && !isValidDateInput(date)) {
    return Response.json(
      { message: "Travel date must be in YYYY-MM-DD format." },
      { status: 400 }
    );
  }

  try {
    const buses = await searchBuses({
      from,
      to,
      date,
      passengers,
      busType,
      maxPrice,
      amenities: amenities.length > 0 ? amenities : undefined,
    });
    return Response.json({ buses });
  } catch {
    return Response.json(
      { message: "Unable to search buses right now." },
      { status: 500 }
    );
  }
}