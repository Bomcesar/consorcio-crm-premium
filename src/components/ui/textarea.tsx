import * as React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-red-500 focus-visible:ring-red-500",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
