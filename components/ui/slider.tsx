"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div"> & {
    value?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }
>(
  (
    { className, value = [0], onValueChange, min = 0, max = 100, step = 1, disabled = false, ...props },
    ref
  ) => {
    const percentage = (value[0] - min) / (max - min) * 100;
    const percentageEnd = (value[1] - min) / (max - min) * 100;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const newValue = Number(e.target.value);
      const range = value[1] - value[0];

      if (e.target.id === "min") {
        if (newValue > value[1] - step) {
          onChange?.([value[1] - range, value[1]]);
        } else {
          onChange?.([newValue, value[1]]);
        }
      } else {
        if (newValue < value[0] + step) {
          onChange?.([value[0], value[0] + step]);
        } else {
          onChange?.([value[0], newValue]);
        }
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
          className="absolute w-full h-5 opacity-0 cursor-pointer"
          style={{
            left: 0,
            right: `${100 - percentageEnd}%`,
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
          className="absolute w-full h-5 opacity-0 cursor-pointer"
          style={{
            left: `${percentage}%`,
            right: 0,
          }}
        />

        {/* Thumbs */}
        <div
          className="absolute h-5 w-5 bg-white border-2 border-indigo-500 rounded-full shadow-md cursor-grab active:scale-110 transition-transform"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
        <div
          className="absolute h-5 w-5 bg-white border-2 border-indigo-500 rounded-full shadow-md cursor-grab active:scale-110 transition-transform"
          style={{ left: `calc(${percentageEnd}% - 10px)` }}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
