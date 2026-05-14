import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-indigo-100 text-indigo-700 border-indigo-200",
  secondary: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  danger: "bg-red-100 text-red-600 border-red-200",
  outline: "bg-transparent text-slate-600 border-slate-300",
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 border rounded-lg px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
