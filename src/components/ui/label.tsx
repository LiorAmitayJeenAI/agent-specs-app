import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-[#4A4A6A] mb-1.5",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 mr-0.5 ml-1">*</span>}
    </label>
  )
);
Label.displayName = "Label";

export { Label };
