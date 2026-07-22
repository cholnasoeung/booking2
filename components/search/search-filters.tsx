"use client";

import { useState } from "react";
import {
  BusFront,
  Calendar,
  DollarSign,
  Filter,
  Power,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type BusTypeFilter = "all" | "bus_45" | "mini_bus" | "car";

export type TimeSlot = {
  id: string;
  label: string;
  hours: [number, number]; // Start and end hour
  icon: React.ReactNode;
};

export type FilterState = {
  busType: BusTypeFilter;
  priceRange: [number, number];
  timeSlots: string[];
  amenities: string[];
};

export const TIME_SLOTS: TimeSlot[] = [
  {
    id: "morning",
    label: "Morning",
    hours: [6, 12],
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-01M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: "afternoon",
    label: "Afternoon",
    hours: [12, 18],
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "evening",
    label: "Evening",
    hours: [18, 24],
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 0018 0a9 9 0 00-9-9 9 9 0 00-9 9 9 9 0 009-9 9 9 0 009 9z" />
      </svg>
    ),
  },
  {
    id: "night",
    label: "Night",
    hours: [0, 6],
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 0018 0a9 9 0 00-9-9 9 9 0 00-9 9 9 9 0 009-9 9 9 0 009 9z" />
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ),
  },
];

export const AMENITIES_OPTIONS = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "ac", label: "AC", icon: Power },
  { id: "charging", label: "Charging Points", icon: Sparkles },
];

const BUS_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "bus_45", label: "45 Seater" },
  { value: "mini_bus", label: "Mini Bus" },
  { value: "car", label: "Car" },
];

type SearchFiltersProps = {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClear: () => void;
  resultCount: number;
  minPrice?: number;
  maxPrice?: number;
};

export default function SearchFilters({
  filters,
  onFiltersChange,
  onClear,
  resultCount,
  minPrice = 0,
  maxPrice = 100,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeFilterCount =
    (filters.busType !== "all" ? 1 : 0) +
    (filters.priceRange[0] !== minPrice || filters.priceRange[1] !== maxPrice ? 1 : 0) +
    filters.timeSlots.length +
    filters.amenities.length;

  function updateFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  }

  return (
    <Card className="border-white/60 bg-white/90 shadow-xl sticky top-6 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-gradient-to-r from-red-50 to-rose-50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900"
                onClick={onClear}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
            <button
              type="button"
              className="lg:hidden p-1 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <X className="h-5 w-5 text-slate-600" />
              ) : (
                <Filter className="h-5 w-5 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Filters - Collapsible on mobile */}
        <div className={cn(
          "space-y-4 px-4 py-3",
          !isExpanded && "hidden lg:block"
        )}>
          {/* Bus Type Filter */}
          <BusTypeFilter
            value={filters.busType}
            onChange={(value) => updateFilter("busType", value)}
          />

          {/* Price Range Slider */}
          <PriceRangeFilter
            value={filters.priceRange}
            onChange={(value) => updateFilter("priceRange", value)}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />

          {/* Departure Time Slots */}
          <TimeSlotFilter
            selectedSlots={filters.timeSlots}
            onChange={(value) => updateFilter("timeSlots", value)}
          />

          {/* Amenities Filter */}
          <AmenitiesFilter
            selected={filters.amenities}
            onChange={(value) => updateFilter("amenities", value)}
          />

          {/* Results Count */}
          <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{resultCount}</span> bus
              {resultCount === 1 ? "" : "es"} found
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type BusTypeFilterProps = {
  value: BusTypeFilter;
  onChange: (value: BusTypeFilter) => void;
};

function BusTypeFilter({ value, onChange }: BusTypeFilterProps) {
  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <BusFront className="h-4 w-4 text-red-600" />
        Bus Type
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {BUS_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value as BusTypeFilter)}
            className={cn(
              "rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all",
              value === option.value
                ? "border-red-500 bg-red-50 text-red-700 shadow-md"
                : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-slate-50"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type PriceRangeFilterProps = {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  minPrice: number;
  maxPrice: number;
};

function PriceRangeFilter({
  value,
  onChange,
  minPrice,
  maxPrice,
}: PriceRangeFilterProps) {
  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <DollarSign className="h-4 w-4 text-red-600" />
        Price Range
      </Label>
      <div className="space-y-2.5">
        <Slider
          value={value}
          onValueChange={onChange}
          min={minPrice}
          max={maxPrice}
          step={1}
          className="py-2"
        />
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
            ${value[0]}
          </span>
          <span className="text-slate-500">to</span>
          <span className="font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
            ${value[1]}
          </span>
        </div>
      </div>
    </div>
  );
}

type TimeSlotFilterProps = {
  selectedSlots: string[];
  onChange: (value: string[]) => void;
};

function TimeSlotFilter({ selectedSlots, onChange }: TimeSlotFilterProps) {
  function toggleSlot(slotId: string) {
    if (selectedSlots.includes(slotId)) {
      onChange(selectedSlots.filter((id) => id !== slotId));
    } else {
      onChange([...selectedSlots, slotId]);
    }
  }

  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Calendar className="h-4 w-4 text-red-600" />
        Departure Time
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlots.includes(slot.id);
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => toggleSlot(slot.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-medium transition-all",
                isSelected
                  ? "border-red-500 bg-red-50 text-red-700 shadow-md"
                  : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-slate-50"
              )}
            >
              {slot.icon}
              <span>{slot.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type AmenitiesFilterProps = {
  selected: string[];
  onChange: (value: string[]) => void;
};

function AmenitiesFilter({ selected, onChange }: AmenitiesFilterProps) {
  function toggleAmenity(amenityId: string) {
    if (selected.includes(amenityId)) {
      onChange(selected.filter((id) => id !== amenityId));
    } else {
      onChange([...selected, amenityId]);
    }
  }

  return (
    <div className="space-y-2.5">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-red-600" />
        Amenities
      </Label>
      <div className="space-y-2">
        {AMENITIES_OPTIONS.map((amenity) => {
          const isSelected = selected.includes(amenity.id);
          const Icon = amenity.icon;
          return (
            <button
              key={amenity.id}
              type="button"
              onClick={() => toggleAmenity(amenity.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-xs font-medium transition-all",
                isSelected
                  ? "border-red-500 bg-red-50 text-red-700 shadow-md"
                  : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md",
                isSelected
                  ? "bg-red-500 text-white"
                  : "bg-slate-200 text-slate-600"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span>{amenity.label}</span>
              {isSelected && (
                <svg className="ml-auto h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
