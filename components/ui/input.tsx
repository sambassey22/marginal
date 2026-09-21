import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn(
        "w-full resize-none bg-transparent text-paper-100 placeholder:text-paper-400 focus:outline-none",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
