"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type CollapsibleContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined)

const Collapsible = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(({ className, open = false, onOpenChange, children, ...props }, ref) => {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: (value) => onOpenChange?.(value) }}>
      <div ref={ref} className={cn(className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
})
Collapsible.displayName = "Collapsible"

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext)

  if (!context) {
    throw new Error("CollapsibleTrigger must be used within a Collapsible")
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn("flex items-center justify-between w-full", className)}
      onClick={() => context.onOpenChange(!context.open)}
      {...props}
    >
      {children}
    </button>
  )
})
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(CollapsibleContext)

  if (!context) {
    throw new Error("CollapsibleContent must be used within a Collapsible")
  }

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden transition-all",
        context.open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
