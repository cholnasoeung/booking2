import type { NextRequest } from "next/server";

import { isValidDateInput } from "@/lib/utils/date";
import { searchBuses } from "@/lib/db/queries";
import { getFirstSearchParam, parsePassengerCount } from "@/lib/utils/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const from = getFirstSearchParam(request.nextUrl.searchParams.getAll("from"));
  const to = getFirstSearchParam(request.nextUrl.searchParams.getAll("to"));
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const passengers = parsePassengerCount(
    request.nextUrl.searchParams.get("passengers")
  );

  if (date && !isValidDateInput(date)) {
    return Response.json(
      { message: "Travel date must be in YYYY-MM-DD format." },
      { status: 400 }
    );
  }

  try {
    const buses = await searchBuses({ from, to, date, passengers });
    return Response.json({ buses });
  } catch {
    return Response.json(
      { message: "Unable to search buses right now." },
      { status: 500 }
    );
  }
}
