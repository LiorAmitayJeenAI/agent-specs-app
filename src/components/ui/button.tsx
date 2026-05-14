import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[#5B4FE8] text-white hover:bg-[#4C42D5] active:bg-[#4036BD] shadow-lg shadow-[#5B4FE8]/20",
  secondary:
    "bg-white text-[#5B4FE8] border border-[#C4B8FF] hover:bg-[#EEE9FF] active:bg-[#EEE9FF] shadow-sm",
  ghost:
    "text-[#4A4A6A] hover:bg-[#F4F5F7] active:bg-slate-200",
  danger:
    "bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 border border-red-200",
  outline:
    "border border-[#C4B8FF] text-[#5B4FE8] bg-white hover:bg-[#EEE9FF] active:bg-[#EEE9FF] shadow-sm",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5 rounded-[10px]",
  md: "px-4 py-2 text-sm gap-2 rounded-[10px]",
  lg: "px-6 py-2.5 text-base gap-2 rounded-[10px]",
  icon: "p-2 rounded-[10px]",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8] focus-visible:ring-offset-2 select-none hover:shadow-[0_4px_12px_rgba(91,79,232,0.2)]",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };
