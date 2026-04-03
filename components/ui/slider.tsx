"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_SLIDER_VALUE: [number, number] = [0, 100];

const Slider = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div"> & {
    value?: [number, number];
    onValueChange?: (value: [number, number]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }
>(
  (
    { className, value = DEFAULT_SLIDER_VALUE, onValueChange, min = 0, max = 100, step = 1, disabled = false, ...props },
    ref
  ) => {
    const percentage = (value[0] - min) / (max - min) * 100;
    const percentageEnd = (value[1] - min) / (max - min) * 100;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const newValue = Number(e.target.value);

      if (e.target.id === "min") {
        // Prevent min from crossing max
        const clampedValue = Math.min(newValue, value[1] - step);
        onValueChange?.([clampedValue, value[1]]);
      } else {
        // Prevent max from crossing min
        const clampedValue = Math.max(newValue, value[0] + step);
        onValueChange?.([value[0], clampedValue]);
      }
    }

    return (
      <div
        ref={ref}
        className={cn("relative w-full h-5 flex items-center", className)}
        {...props}
      >
        {/* Track */}
        <div className="relative w-full h-2 bg-slate-200 rounded-full">
          {/* Active Track */}
          <div
            className="absolute h-full bg-indigo-500 rounded-full"
            style={{
              left: `${percentage}%`,
              right: `${100 - percentageEnd}%`,
            }}
          />
        </div>

        {/* Min Input */}
        <input
          id="min"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          disabled={disabled}
          onChange={handleChange}
          className="absolute w-full h-5 opacity-0 cursor-pointer z-10"
          style={{
            left: 0,
            right: 0,
          }}
        />

        {/* Max Input */}
        <input
          id="max"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          disabled={disabled}
          onChange={handleChange}
          className="absolute w-full h-5 opacity-0 cursor-pointer z-10"
          style={{
            left: 0,
            right: 0,
          }}
        />

        {/* Thumbs */}
        <div
          className="absolute h-5 w-5 bg-white border-2 border-indigo-500 rounded-full shadow-md cursor-grab active:scale-110 transition-transform pointer-events-none z-20"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
        <div
          className="absolute h-5 w-5 bg-white border-2 border-indigo-500 rounded-full shadow-md cursor-grab active:scale-110 transition-transform pointer-events-none z-20"
          style={{ left: `calc(${percentageEnd}% - 10px)` }}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
