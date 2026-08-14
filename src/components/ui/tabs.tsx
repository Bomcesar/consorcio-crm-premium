"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

function Tabs({ defaultValue, value, onValueChange, children, className, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: onValueChange ?? setInternalValue }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function TabsTrigger({ value, children, className, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children, className, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      data-state={context.value === value ? "active" : "inactive"}
      className={cn("mt-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
