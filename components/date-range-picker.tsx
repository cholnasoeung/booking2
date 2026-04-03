"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export type DateRangePreset = "today" | "yesterday" | "last7days" | "last30days" | "custom";

interface DateRangePickerProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
}

export function getDateRangeForPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { start: today, end: new Date(Date.now()) };
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    case "last7days":
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: new Date(Date.now()) };
    case "last30days":
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { start: monthAgo, end: new Date(Date.now()) };
    case "custom":
      return { start: today, end: new Date(Date.now()) };
    default:
      return { start: today, end: new Date(Date.now()) };
  }
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { value: "today" as const, label: "Today" },
    { value: "yesterday" as const, label: "Yesterday" },
    { value: "last7days" as const, label: "Last 7 Days" },
    { value: "last30days" as const, label: "Last 30 Days" },
  ];

  function handlePresetClick(newPreset: DateRangePreset) {
    setPreset(newPreset);
    const range = getDateRangeForPreset(newPreset);
    onChange(range);
    setIsOpen(false);
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal h-11 rounded-xl border-2",
            !value && "text-muted-foreground"
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value?.start ? (
            <>
              {formatDate(value.start)} - {formatDate(value.end)}
            </>
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </Popover.Trigger>
      <Popover.Popup className="w-auto p-2">
        <div className="space-y-1">
          {presets.map((presetOption) => (
            <button
              key={presetOption.value}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-100",
                preset === presetOption.value && "bg-slate-100 font-medium"
              )}
              onClick={() => handlePresetClick(presetOption.value)}
            >
              {presetOption.label}
            </button>
          ))}
        </div>
      </Popover.Popup>
    </Popover.Root>
  );
}
