"use client";

import { Loader2, PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  label?: string;
  iconOnly?: boolean;
}

/** Filled indigo gradient — "Add / New" primary action */
export function BtnAdd({ label = "Add", className, ...props }: BtnProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600",
        "px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200",
        "hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60 transition-all",
        className,
      )}
    >
      <Plus className="size-4 shrink-0" />
      {label}
    </button>
  );
}

/** Outlined indigo — Edit row / open form */
export function BtnEdit({ label = "Edit", iconOnly, className, ...props }: BtnProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        iconOnly
          ? "flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          : "flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100",
        "transition-colors disabled:opacity-50",
        className,
      )}
    >
      <PencilLine className="size-3.5 shrink-0" />
      {!iconOnly && label}
    </button>
  );
}

/** Outlined red — Delete row */
export function BtnDelete({ label = "Delete", iconOnly, loading, className, ...props }: BtnProps) {
  return (
    <button
      type="button"
      disabled={loading || props.disabled}
      {...props}
      className={cn(
        iconOnly
          ? "flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          : "flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100",
        "transition-colors disabled:opacity-50",
        className,
      )}
    >
      {loading
        ? <Loader2 className="size-3.5 shrink-0 animate-spin" />
        : <Trash2 className="size-3.5 shrink-0" />}
      {!iconOnly && label}
    </button>
  );
}

/** Filled indigo — primary Save / Submit */
export function BtnSave({ label = "Save", loading, className, ...props }: BtnProps) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      {...props}
      className={cn(
        "flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white",
        "hover:bg-indigo-700 disabled:opacity-60 transition-colors",
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {loading ? "Saving…" : label}
    </button>
  );
}

/** Outlined slate — Cancel / dismiss */
export function BtnCancel({ label = "Cancel", className, ...props }: BtnProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2",
        "text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors",
        className,
      )}
    >
      <X className="size-4" />
      {label}
    </button>
  );
}
