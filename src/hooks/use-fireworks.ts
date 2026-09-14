"use client";

import { useEffect, useState, useCallback } from "react";

const CELEBRATION_EVENT = "crm:celebration";

type CelebrationPayload = {
  message: string;
  value?: number;
};

export function useFireworks() {
  const [isActive, setIsActive] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  const triggerCelebration = useCallback((payload: CelebrationPayload) => {
    const event = new CustomEvent(CELEBRATION_EVENT, { detail: payload });
    window.dispatchEvent(event);
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<CelebrationPayload>) => {
      setCelebration(e.detail);
      setIsActive(true);
    };

    window.addEventListener(CELEBRATION_EVENT, handler as EventListener);

    const storageHandler = (e: StorageEvent) => {
      if (e.key === "crm:celebration" && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue) as CelebrationPayload;
          setCelebration(payload);
          setIsActive(true);
        } catch { }
      }
    };

    window.addEventListener("storage", storageHandler);

    return () => {
      window.removeEventListener(CELEBRATION_EVENT, handler as EventListener);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const handleComplete = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    celebration,
    triggerCelebration,
    handleComplete,
  };
}

export function broadcastCelebration(payload: CelebrationPayload) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent(CELEBRATION_EVENT, { detail: payload });
    window.dispatchEvent(event);
    localStorage.setItem("crm:celebration", JSON.stringify(payload));
    setTimeout(() => localStorage.removeItem("crm:celebration"), 100);
  }
}
