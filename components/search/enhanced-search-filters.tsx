"use client";

import { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, X, Filter } from "lucide-react";
import { BUS_TYPES, AMENITY_OPTIONS } from "@/lib/utils/constants";
import { AmenityIcon } from "@/lib/utils/amenity-icons";

export type SearchFilters = {
  busTypes: string[];
  priceRange: [number, number];
  departureSlots: string[];
  amenities: string[];
  sortBy: string;
};

const DEPARTURE_SLOTS = [
  { id: "morning", label: "Morning", time: "06:00 - 12:00", icon: "🌅" },
  { id: "afternoon", label: "Afternoon", time: "12:00 - 18:00", icon: "☀️" },
  { id: "evening", label: "Evening", time: "18:00 - 21:00", icon: "🌆" },
  { id: "night", label: "Night", time: "21:00 - 06:00", icon: "🌙" },
];

const SORT_OPTIONS = [
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "duration", label: "Duration (Shortest First)" },
  { id: "departure", label: "Departure Time (Earliest First)" },
];

type EnhancedSearchFiltersProps = {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  minPrice: number;
  maxPrice: number;
  resultCount: number;
};

export default function EnhancedSearchFilters({
  filters,
  onFiltersChange,
  minPrice,
  maxPrice,
  resultCount,
}: EnhancedSearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const toggleBusType = (busType: string) => {
    const newBusTypes = filters.busTypes.includes(busType)
      ? filters.busTypes.filter(t => t !== busType)
      : [...filters.busTypes, busType];
    updateFilters({ busTypes: newBusTypes });
  };

  const toggleDepartureSlot = (slot: string) => {
    const newSlots = filters.departureSlots.includes(slot)
      ? filters.departureSlots.filter(s => s !== slot)
      : [...filters.departureSlots, slot];
    updateFilters({ departureSlots: newSlots });
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    updateFilters({ amenities: newAmenities });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      busTypes: [],
      priceRange: [minPrice, maxPrice],
      departureSlots: [],
      amenities: [],
      sortBy: "price-asc",
    });
  };

  const activeFilterCount =
    filters.busTypes.length +
    filters.departureSlots.length +
    filters.amenities.length +
    (filters.priceRange[0] !== minPrice || filters.priceRange[1] !== maxPrice ? 1 : 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-800">Filters & Sorting</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{resultCount} results</span>
            <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t border-slate-200">
          <div className="p-4 space-y-6">
            {/* Bus Type Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Bus Type</Label>
                {filters.busTypes.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-red-600 hover:text-red-700"
                    onClick={() => updateFilters({ busTypes: [] })}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BUS_TYPES.map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      filters.busTypes.includes(type)
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Checkbox
                      checked={filters.busTypes.includes(type)}
                      onChange={() => toggleBusType(type)}
                      className="border-slate-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <span className="text-sm capitalize">{type.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Price Range</Label>
                <span className="text-sm text-slate-600">
                  ${filters.priceRange[0]} - ${filters.priceRange[1]}
                </span>
              </div>
              <Slider
                min={minPrice}
                max={maxPrice}
                step={1}
                value={filters.priceRange}
                onValueChange={(value) =>
                  updateFilters({ priceRange: [value[0], value[1]] as [number, number] })
                }
                className="my-4"
              />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>${minPrice}</span>
                <div className="flex-1 h-1 bg-slate-200 rounded-full" />
                <span>${maxPrice}</span>
              </div>
            </div>

            {/* Departure Time Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Departure Time</Label>
                {filters.departureSlots.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-red-600 hover:text-red-700"
                    onClick={() => updateFilters({ departureSlots: [] })}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEPARTURE_SLOTS.map((slot) => (
                  <label
                    key={slot.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      filters.departureSlots.includes(slot.id)
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Checkbox
                      checked={filters.departureSlots.includes(slot.id)}
                      onChange={() => toggleDepartureSlot(slot.id)}
                      className="border-slate-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <span className="text-lg">{slot.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{slot.label}</p>
                      <p className="text-[10px] text-slate-500">{slot.time}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Amenities Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Amenities</Label>
                {filters.amenities.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-red-600 hover:text-red-700"
                    onClick={() => updateFilters({ amenities: [] })}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label
                    key={amenity.value}
                    className={`flex items-center gap-2 px-2 py-2 rounded-lg border cursor-pointer transition-colors ${
                      filters.amenities.includes(amenity.value)
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Checkbox
                      checked={filters.amenities.includes(amenity.value)}
                      onChange={() => toggleAmenity(amenity.value)}
                      className="border-slate-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <AmenityIcon value={amenity.value} className="size-4 shrink-0" />
                    <span className="text-xs">{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Sort By</Label>
              <div className="grid grid-cols-1 gap-2">
                {SORT_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      filters.sortBy === option.id
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sortBy"
                      checked={filters.sortBy === option.id}
                      onChange={() => updateFilters({ sortBy: option.id })}
                      className="border-slate-300 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Check if a time falls within a departure slot
 */
export function matchesDepartureSlot(time: string, slots: string[]): boolean {
  if (slots.length === 0) return true;

  const [hours, minutes] = time.split(":").map(Number);
  const timeInMinutes = hours * 60 + minutes;

  return slots.some(slot => {
    switch (slot) {
      case "morning": // 06:00 - 12:00
        return timeInMinutes >= 360 && timeInMinutes < 720;
      case "afternoon": // 12:00 - 18:00
        return timeInMinutes >= 720 && timeInMinutes < 1080;
      case "evening": // 18:00 - 21:00
        return timeInMinutes >= 1080 && timeInMinutes < 1260;
      case "night": // 21:00 - 06:00
        return timeInMinutes >= 1260 || timeInMinutes < 360;
      default:
        return true;
    }
  });
}

/**
 * Sort buses based on the selected sort option
 */
export function sortBuses(buses: any[], sortBy: string): any[] {
  const sorted = [...buses];

  switch (sortBy) {
    case "price-asc":
      return sorted.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    case "price-desc":
      return sorted.sort((a, b) => b.pricePerSeat - a.pricePerSeat);
    case "duration":
      return sorted.sort((a, b) => {
        const aDuration = parseDuration(a.duration);
        const bDuration = parseDuration(b.duration);
        return aDuration - bDuration;
      });
    case "departure":
      return sorted.sort((a, b) => {
        const aTime = parseTime(a.departureTime);
        const bTime = parseTime(b.departureTime);
        return aTime - bTime;
      });
    default:
      return sorted;
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)h\s*(\d+)?m?/);
  if (!match) return 0;
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  return hours * 60 + minutes;
}

function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
