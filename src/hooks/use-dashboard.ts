import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { DashboardStats, DashboardAtividadeRecente } from "@/repositories/client/dashboard.repository";
import type { EventoAgenda } from "@/repositories/agenda.repository";
import {
  getDashboardStats,
  getAtividadesRecentes,
  getEventosAgenda,
  getPipelineStats,
} from "@/repositories/client/dashboard.repository";

export function useDashboard() {
  const { success, error } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [atividades, setAtividades] = useState<DashboardAtividadeRecente[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [pipeline, setPipeline] = useState<
    { name: string; count: number; color: string; width: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<string | undefined>(undefined);

  const successRef = useRef(success);
  const errorRef = useRef(error);
  successRef.current = success;
  errorRef.current = error;

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado.");
      }

      const supabase = createClient();

      const { data: profile } = await supabase
        .from("profiles")
        .select("perfil")
        .eq("id", user.id)
        .single();

      const perfilValue = profile?.perfil ?? undefined;
      setPerfil(perfilValue);

      const [statsData, atividadesData, eventosData, pipelineData] = await Promise.all([
        getDashboardStats(),
        getAtividadesRecentes(),
        getEventosAgenda(),
        getPipelineStats(),
      ]);

      setStats(statsData);
      setAtividades(atividadesData);
      setEventos(eventosData);
      setPipeline(pipelineData);

      successRef.current("Dashboard atualizado.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar o dashboard.";
      setErrorMessage(message);
      errorRef.current(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
  }, [authLoading, load]);

  return {
    stats,
    atividades,
    eventos,
    pipeline,
    isLoading,
    errorMessage,
    reload: load,
    perfil,
  };
}
