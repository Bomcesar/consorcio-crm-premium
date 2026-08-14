"use client";

import {
  ArrowUpRight,
  TrendingUp,
  Users,
  Handshake,
  DollarSign,
  Calendar,
  Receipt,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats, DashboardAtividadeRecente } from "@/repositories/client/dashboard.repository";

const iconMap: Record<string, typeof Users> = {
  totalLeads: Users,
  totalIndicadores: Users,
  totalClientes: Users,
  totalReunioes: Calendar,
  totalNegociacoes: Handshake,
  totalVendas: TrendingUp,
  totalComissoes: DollarSign,
  totalCobrancas: Receipt,
  totalPendencias: Clock,
  totalPosVenda: RefreshCw,
};

const statsConfig = [
  { key: "totalLeads", title: "Leads", isCurrency: false },
  { key: "totalIndicadores", title: "Indicadores", isCurrency: false },
  { key: "totalClientes", title: "Clientes", isCurrency: false },
  { key: "totalReunioes", title: "Reuniões", isCurrency: false },
  { key: "totalNegociacoes", title: "Negociações", isCurrency: false },
  { key: "totalVendas", title: "Vendas", isCurrency: false },
  { key: "totalComissoes", title: "Comissões", isCurrency: false },
  { key: "totalCobrancas", title: "Cobranças", isCurrency: false },
  { key: "totalPendencias", title: "Pendências", isCurrency: false },
  { key: "totalPosVenda", title: "Pós-venda", isCurrency: false },
] as const;

export function StatsCards({
  stats,
  atividades,
}: {
  stats: DashboardStats;
  atividades: DashboardAtividadeRecente[];
}) {
  const isEmpty = stats && Object.values(stats).every((v) => v === 0);

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhum dado cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statsConfig.map((stat) => {
        const Icon = iconMap[stat.key] ?? TrendingUp;
        const value = stats[stat.key as keyof DashboardStats] as number;
        const displayValue = stat.isCurrency ? formatCurrency(value) : formatNumber(value);

        return (
          <Card
            key={stat.key}
            className="border-border/50 bg-card/50 backdrop-blur transition-colors hover:border-primary/30"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="rounded-md bg-primary/10 p-2">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{displayValue}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                <span className="font-medium text-emerald-400">
                  {atividades.length} atividades recentes
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
