"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type UsuarioStatusRow = {
  id: string;
  usuario_id: string;
  status: "online" | "offline";
  last_seen: string;
};

export function usePresenceNotifications(user: User | null | undefined) {
  const { info } = useToast();
  const [onlineCount, setOnlineCount] = useState(0);
  const previousRef = useRef<Map<string, UsuarioStatusRow>>(new Map());
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();
    let isMounted = true;

    async function loadAndNotify() {
      try {
        const { data, error } = await supabase
          .from("usuario_status")
          .select("id, usuario_id, status, last_seen")
          .order("last_seen", { ascending: false });

        if (error) return;
        if (!isMounted) return;

        const current = new Map<string, UsuarioStatusRow>();
        const rows = (data || []) as UsuarioStatusRow[];
        const others = user?.id ? rows.filter((row) => row.usuario_id !== user.id) : rows;

        setOnlineCount(others.filter((row) => row.status === "online").length);

        if (skipFirstRef.current) {
          rows.forEach((row) => current.set(row.usuario_id, row));
          previousRef.current = current;
          skipFirstRef.current = false;
          return;
        }

        const previous = previousRef.current;

        for (const row of rows) {
          const prev = previous.get(row.usuario_id);
          if (!prev) {
            if (user?.id && row.usuario_id !== user.id && row.status === "online") {
              info("Usuário online: um usuário acabou de entrar no sistema.");
            }
            current.set(row.usuario_id, row);
            continue;
          }

          if (prev.status !== row.status) {
            if (user?.id && row.usuario_id !== user.id) {
              if (row.status === "online") {
                info("Usuário online: um usuário acabou de entrar no sistema.");
              } else {
                info("Usuário offline: um usuário saiu do sistema.");
              }
            }
          }

          current.set(row.usuario_id, row);
        }

        previousRef.current = current;
      } catch {
        // silent
      }
    }

    void loadAndNotify();
    const interval = setInterval(loadAndNotify, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id, info]);

  return { onlineCount };
}
