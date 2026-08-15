"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-dashboard";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, Users, UserPlus, Handshake, Calendar, MessageCircle, Phone } from "lucide-react";

const statsConfig = [
  { key: "totalLeads", label: "Leads", icon: UserPlus },
  { key: "totalIndicadores", label: "Indicadores", icon: Users },
  { key: "totalClientes", label: "Clientes", icon: Users },
  { key: "totalReunioes", label: "Reuniões", icon: Calendar },
  { key: "totalNegociacoes", label: "Negociações", icon: Handshake },
  { key: "totalVendas", label: "Vendas", icon: TrendingUp },
  { key: "totalComissoes", label: "Comissões", icon: BarChart3 },
  { key: "totalCobrancas", label: "Cobranças", icon: Phone },
  { key: "totalPendencias", label: "Pendências", icon: MessageCircle },
  { key: "totalPosVenda", label: "Pós-venda", icon: Phone },
] as const;

export default function RelatoriosPage() {
  const { error: _error } = useToast();
  const { stats, atividades, pipeline, isLoading, errorMessage, reload } = useDashboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Análises, métricas e exportação de dados</p>
        </div>
        <Button variant="outline" onClick={reload}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsConfig.map((item) => {
          const Icon = item.icon;
          const value = stats?.[item.key] ?? 0;
          return (
            <Card key={item.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">Total registrado</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline de negociações</CardTitle>
            <CardDescription>Distribuição por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando pipeline...</p>
            ) : pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma negociação registrada.</p>
            ) : (
              <div className="space-y-4">
                {pipeline.map((stage) => (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">{stage.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${stage.color}`}
                        style={{ width: stage.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
            <CardDescription>Últimas atualizações</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando atividades...</p>
            ) : atividades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
            ) : (
              <div className="space-y-4">
                {atividades.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.data).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
