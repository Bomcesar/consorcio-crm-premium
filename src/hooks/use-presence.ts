"use client";

import { useEffect, useRef, useState } from "react";

type StatusUsuarioOnline = "online" | "offline";

export function usePresence(userId: string | undefined) {
  const [status, setStatus] = useState<StatusUsuarioOnline>("offline");
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateStatus = async (newStatus: StatusUsuarioOnline) => {
    if (!userId) return;
    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setStatus(newStatus);
        if (newStatus === "offline") {
          setLastSeen(new Date());
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  useEffect(() => {
    if (!userId) return;

    const handleOnline = () => updateStatus("online");
    const handleOffline = () => updateStatus("offline");
    const handleBeforeUnload = () => updateStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handleBeforeUnload);

    updateStatus("online");

    intervalRef.current = setInterval(() => {
      updateStatus("online");
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateStatus("offline");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId]);

  return { status, lastSeen, updateStatus };
}
