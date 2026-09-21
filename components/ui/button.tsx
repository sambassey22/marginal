import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-card px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-signal-brass text-ink-950 hover:bg-signal-brass/90",
          variant === "ghost" &&
            "bg-transparent text-paper-100 hover:bg-ink-800",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
