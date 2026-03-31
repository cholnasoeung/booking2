import { BusStop, StopInput } from "@/types/bus";

export function normalizeStops(
  rawStops: unknown,
  fallbackStart: string,
  fallbackEnd: string
): BusStop[] {
  const parsed: BusStop[] = Array.isArray(rawStops)
    ? rawStops
        .map((raw, index) => {
          const stop = raw as StopInput;
          const location =
            typeof stop.location === "string" ? stop.location.trim() : "";

          if (!location) {
            return null;
          }

          return {
            location,
            boarding: Boolean(stop.boarding),
            dropping: Boolean(stop.dropping),
            order: index,
          };
        })
        .filter((stop): stop is BusStop => Boolean(stop))
    : [];

  const hasBoarding = parsed.some((stop) => stop.boarding && stop.location);
  const hasDropping = parsed.some((stop) => stop.dropping && stop.location);

  if (!hasBoarding) {
    parsed.unshift({
      location: fallbackStart,
      boarding: true,
      dropping: false,
      order: 0,
    });
  }

  if (!hasDropping) {
    parsed.push({
      location: fallbackEnd,
      boarding: false,
      dropping: true,
      order: parsed.length,
    });
  }

  return parsed
    .map((stop, index) => ({
      ...stop,
      order: index,
    }))
    .filter((stop, index) => stop.location && index >= 0);
}
