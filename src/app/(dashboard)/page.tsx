"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import {
  RecentActivity,
  UpcomingSchedule,
  PipelineOverview,
} from "@/components/dashboard/recent-activity";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/use-dashboard";
import type { DashboardData } from "@/types/crm";

const fallbackDashboardData: DashboardData = {
  stats: [
    {
      title: "Leads Ativos",
      value: 0,
      change: "0%",
      trend: "up",
      description: "vs. mes anterior",
    },
    {
      title: "Clientes",
      value: 0,
      change: "0%",
      trend: "up",
      description: "base total",
    },
    {
      title: "Negociacoes",
      value: 0,
      change: "0%",
      trend: "up",
      description: "em andamento",
    },
    {
      title: "Volume (R$)",
      value: 0,
      change: "0%",
      trend: "up",
      description: "carteira ativa",
      isCurrency: true,
    },
  ],
  activities: [],
  pipeline: [
    { name: "Novos Leads", count: 0, color: "bg-blue-500", width: "6%" },
    { name: "Qualificados", count: 0, color: "bg-violet-500", width: "6%" },
    { name: "Proposta", count: 0, color: "bg-amber-500", width: "6%" },
    { name: "Fechamento", count: 0, color: "bg-emerald-500", width: "6%" },
  ],
  upcomingSchedule: [],
};

export default function DashboardPage() {
  const { getDashboardData } = useDashboard();
  const [data, setData] = useState<DashboardData>(fallbackDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const dashboard = await getDashboardData();
        setData(dashboard);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nao foi possivel carregar o dashboard.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [getDashboardData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bem-vindo, Paulo!</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o desempenho do seu CRM de consórcios
          </p>
        </div>
        <Badge variant="success" className="w-fit">
          Sistema operacional
        </Badge>
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando dashboard...</p> : null}

      <StatsCards stats={data.stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity activities={data.activities} />
        </div>
        <div className="space-y-6">
          <UpcomingSchedule schedule={data.upcomingSchedule} />
          <PipelineOverview stages={data.pipeline} />
        </div>
      </div>
    </div>
  );
}
