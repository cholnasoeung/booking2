import {
  Wifi, Snowflake, Zap, Tv2,
  Droplets, UtensilsCrossed, Bed,
  LampDesk, Bath, Armchair,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

type IconComponent = React.FC<LucideProps>;

export const AMENITY_ICON_MAP: Record<string, IconComponent> = {
  wifi:           Wifi,
  ac:             Snowflake,
  usb:            Zap,
  tv:             Tv2,
  water:          Droplets,
  snacks:         UtensilsCrossed,
  blanket:        Bed,
  reading_light:  LampDesk,
  restroom:       Bath,
  reclining_seats: Armchair,
};

export function AmenityIcon({
  value,
  className = "size-4",
}: {
  value: string;
  className?: string;
}) {
  const Icon = AMENITY_ICON_MAP[value];
  if (!Icon) return null;
  return <Icon className={className} />;
}
