"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, className, id }, ref) => (
    <button
      ref={ref}
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
        checked ? "bg-indigo-500" : "bg-slate-200",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/*
        Absolute positioning with physical `left` avoids RTL ambiguity.
        RTL semantics: OFF = thumb on the right (start), ON = thumb on the left (end).
        left-0.5 = 2px anchor; translate-x-6 (24px) pushes thumb to ~26px = right side.
      */}
      <span
        className={cn(
          "pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          checked ? "translate-x-0" : "translate-x-6"
        )}
      />
    </button>
  )
);
Switch.displayName = "Switch";

export { Switch };
