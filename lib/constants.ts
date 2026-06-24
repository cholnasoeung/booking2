export const APP_NAME = "RedMiles Cambodia";

export const BUS_TYPES = ["bus_45", "mini_bus", "car", "sleeper_30", "sleeper_40"] as const;

export const CITY_OPTIONS = [
  "Phnom Penh",
  "Siem Reap",
  "Sihanoukville",
  "Kampot",
  "Battambang",
  "Poipet",
] as const;

export const POPULAR_ROUTES = [
  {
    from: "Phnom Penh",
    to: "Siem Reap",
    duration: "6h 15m",
    fare: 18,
  },
  {
    from: "Phnom Penh",
    to: "Sihanoukville",
    duration: "4h 45m",
    fare: 16,
  },
  {
    from: "Phnom Penh",
    to: "Kampot",
    duration: "3h 40m",
    fare: 14,
  },
] as const;

export const BUS_SEAT_COLUMNS = 4;
export const MAX_SEATS_PER_BOOKING = 10;
export const DEFAULT_PASSENGERS = 1;
export const DEFAULT_TOTAL_SEATS = 40;

export const AMENITY_OPTIONS = [
  { value: "wifi", label: "WiFi", icon: "📶" },
  { value: "ac", label: "Air Conditioning", icon: "❄️" },
  { value: "usb", label: "USB Charging", icon: "🔌" },
  { value: "tv", label: "TV/Entertainment", icon: "📺" },
  { value: "water", label: "Water Bottles", icon: "💧" },
  { value: "snacks", label: "Snacks", icon: "🍿" },
  { value: "blanket", label: "Blanket/Pillow", icon: "🛏️" },
  { value: "reading_light", label: "Reading Light", icon: "💡" },
  { value: "restroom", label: "Restroom", icon: "🚻" },
  { value: "reclining_seats", label: "Reclining Seats", icon: "💺" },
] as const;

export type AmenityValue = (typeof AMENITY_OPTIONS)[number]["value"];
