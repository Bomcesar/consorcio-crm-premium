"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToasterMessage = {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
};

const toastContext = React.createContext<{
  toasts: ToasterMessage[];
  addToast: (toast: Omit<ToasterMessage, "id">) => void;
} | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterMessage[]>([]);

  const addToast = React.useCallback((toast: Omit<ToasterMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <toastContext.Provider value={{ toasts, addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "rounded-md border p-4 shadow-lg transition-all",
              toast.type === "success" && "border-green-200 bg-green-50 text-green-800",
              toast.type === "error" && "border-red-200 bg-red-50 text-red-800",
              toast.type === "warning" && "border-yellow-200 bg-yellow-50 text-yellow-800",
              (!toast.type || toast.type === "info") && "border-blue-200 bg-blue-50 text-blue-800"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {toast.title && <p className="font-semibold text-sm">{toast.title}</p>}
                {toast.description && (
                  <p className="mt-1 text-xs opacity-90">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </toastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(toastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToasterProvider");
  }
  return context;
}

export const toast = {
  success: (title: string, description?: string) => {
    const id = Math.random().toString(36).slice(2);
    const event = new CustomEvent("toast", { detail: { id, title, description, type: "success" } });
    window.dispatchEvent(event);
  },
  error: (title: string, description?: string) => {
    const event = new CustomEvent("toast", { detail: { title, description, type: "error" } });
    window.dispatchEvent(event);
  },
  warning: (title: string, description?: string) => {
    const event = new CustomEvent("toast", { detail: { title, description, type: "warning" } });
    window.dispatchEvent(event);
  },
  info: (title: string, description?: string) => {
    const event = new CustomEvent("toast", { detail: { title, description, type: "info" } });
    window.dispatchEvent(event);
  },
};
