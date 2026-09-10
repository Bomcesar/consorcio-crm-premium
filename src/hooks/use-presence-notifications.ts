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

type OnlineUser = {
  id: string;
  nome: string;
  email?: string;
  status: "online" | "offline";
  last_seen: string;
};

export function usePresenceNotifications(user: User | null | undefined) {
  const { info } = useToast();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const previousRef = useRef<Map<string, UsuarioStatusRow>>(new Map());
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();
    let isMounted = true;

    async function loadProfiles(ids: string[]): Promise<Map<string, { nome: string; email?: string }>> {
      const map = new Map<string, { nome: string; email?: string }>();
      if (!ids.length) return map;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", ids);

      if (!error && data) {
        for (const row of data as { id: string; nome: string; email?: string }[]) {
          map.set(row.id, { nome: row.nome || row.email || "Usuário", email: row.email });
        }
      }
      return map;
    }

    async function loadAndNotify() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("usuario_status")
          .select("id, usuario_id, status, last_seen")
          .order("last_seen", { ascending: false });

        if (error) return;
        if (!isMounted) return;

        const rows = (data || []) as UsuarioStatusRow[];
        const others = rows.filter((row) => row.usuario_id !== user.id);
        const onlineRows = others.filter((row) => row.status === "online");

        const profileMap = await loadProfiles(onlineRows.map((row) => row.usuario_id));

        const mapped: OnlineUser[] = onlineRows.map((row) => ({
          id: row.usuario_id,
          nome: profileMap.get(row.usuario_id)?.nome || "Usuário",
          email: profileMap.get(row.usuario_id)?.email,
          status: row.status,
          last_seen: row.last_seen,
        }));

        setOnlineUsers(mapped);

        if (skipFirstRef.current) {
          const current = new Map<string, UsuarioStatusRow>();
          rows.forEach((row) => current.set(row.usuario_id, row));
          previousRef.current = current;
          skipFirstRef.current = false;
          return;
        }

        const previous = previousRef.current;

        for (const row of rows) {
          const prev = previous.get(row.usuario_id);
          if (!prev) {
            if (row.usuario_id !== user.id && row.status === "online") {
              const nome = profileMap.get(row.usuario_id)?.nome || "Um usuário";
              info(`${nome} acabou de entrar no sistema.`);
            }
            continue;
          }

          if (prev.status !== row.status) {
            if (row.usuario_id !== user.id) {
              const nome = profileMap.get(row.usuario_id)?.nome || "Um usuário";
              if (row.status === "online") {
                info(`${nome} acabou de entrar no sistema.`);
              } else {
                info(`${nome} saiu do sistema.`);
              }
            }
          }
        }

        const current = new Map<string, UsuarioStatusRow>();
        rows.forEach((row) => current.set(row.usuario_id, row));
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

  return { onlineUsers };
}
