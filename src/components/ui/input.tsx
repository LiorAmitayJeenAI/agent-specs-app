import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex w-full rounded-lg border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A2E] shadow-sm",
        "placeholder:text-[#AAAACC] placeholder:italic",
        "focus:outline-none focus:border-[#5B4FE8] focus:shadow-[0_0_0_3px_rgba(91,79,232,0.1)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition duration-150",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
