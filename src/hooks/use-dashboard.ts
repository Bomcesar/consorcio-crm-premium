import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type {
  DashboardStats,
  DashboardAtividadeRecente,
} from "@/repositories/client/dashboard.repository";
import type { EventoAgenda } from "@/repositories/agenda.repository";

export function useDashboard() {
  const { success, error } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [atividades, setAtividades] = useState<DashboardAtividadeRecente[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [pipeline, setPipeline] = useState<
    { name: string; count: number; color: string; width: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const successRef = useRef(success);
  const errorRef = useRef(error);
  successRef.current = success;
  errorRef.current = error;

  const load = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const {
        getDashboardStats,
        getAtividadesRecentes,
        getEventosAgenda,
        getPipelineStats,
      } = await import("@/repositories/client/dashboard.repository");
      const [statsData, atividadesData, eventosData, pipelineData] =
        await Promise.all([
          getDashboardStats(),
          getAtividadesRecentes(10),
          getEventosAgenda(),
          getPipelineStats(),
        ]);
      setStats(statsData);
      setAtividades(atividadesData);
      setEventos(eventosData);
      setPipeline(pipelineData);
      successRef.current("Dashboard atualizado.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível carregar o dashboard.";
      setErrorMessage(message);
      errorRef.current(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return {
    stats,
    atividades,
    eventos,
    pipeline,
    isLoading,
    errorMessage,
    reload: load,
  };
}
