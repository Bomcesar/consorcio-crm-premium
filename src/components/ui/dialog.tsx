import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const dialogVariants = cva(
  "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 sm:items-center",
  {
    variants: {
      open: {
        true: "flex",
        false: "hidden",
      },
    },
    defaultVariants: {
      open: false,
    },
  }
);

interface DialogProps extends VariantProps<typeof dialogVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className={dialogVariants({ open })}>
      <div
        className="fixed inset-0 bg-black/80"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <div
      className={cn(
        "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props}>
      {children}
    </div>
  );
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

function DialogDescription({ className, children, ...props }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
