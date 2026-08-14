"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import {
  RecentActivity,
  UpcomingSchedule,
  PipelineOverview,
} from "@/components/dashboard/recent-activity";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardPage() {
  const { stats, atividades, eventos, pipeline, isLoading, errorMessage, reload } =
    useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Bem-vindo, Paulo!</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe o desempenho do seu CRM de consórcios
            </p>
          </div>
          <Badge variant="destructive" className="w-fit">
              Erro ao carregar
            </Badge>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{errorMessage}</p>
          <button
            onClick={reload}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = stats && Object.values(stats).every((v) => v === 0);

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

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum dado cadastrado ainda. Comece cadastrando leads e clientes.</p>
        </div>
      ) : (
        <>
          <StatsCards stats={stats!} atividades={atividades} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentActivity atividades={atividades} />
            </div>
            <div className="space-y-6">
              <UpcomingSchedule eventos={eventos} />
              <PipelineOverview pipeline={pipeline} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
