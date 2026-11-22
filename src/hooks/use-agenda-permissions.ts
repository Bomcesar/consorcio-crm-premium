"use client";

import { useEffect, useState } from "react";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";

export type AgendaPermissions = {
  agenda: {
    visualizar: boolean;
    editar: boolean;
  };
  reunioes: {
    visualizar: boolean;
    criar: boolean;
    editar: boolean;
  };
  tarefas: {
    visualizar: boolean;
    criar: boolean;
    editar: boolean;
  };
};

const EMPTY_PERMISSIONS: AgendaPermissions = {
  agenda: { visualizar: false, editar: false },
  reunioes: { visualizar: false, criar: false, editar: false },
  tarefas: { visualizar: false, criar: false, editar: false },
};

export function useAgendaPermissions(): AgendaPermissions | null {
  const [permissions, setPermissions] = useState<AgendaPermissions | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await getAuthenticatedUser();
        if (cancelled) return;

        setPermissions({
          agenda: {
            visualizar: hasPermission(user, "agenda.visualizar"),
            editar: hasPermission(user, "agenda.editar"),
          },
          reunioes: {
            visualizar: hasPermission(user, "reunioes.visualizar"),
            criar: hasPermission(user, "reunioes.criar"),
            editar: hasPermission(user, "reunioes.editar"),
          },
          tarefas: {
            visualizar: hasPermission(user, "tarefas.visualizar"),
            criar: hasPermission(user, "tarefas.criar"),
            editar: hasPermission(user, "tarefas.editar"),
          },
        });
      } catch {
        if (!cancelled) setPermissions(EMPTY_PERMISSIONS);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return permissions;
}