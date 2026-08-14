"use client";

import { Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardAtividadeRecente } from "@/repositories/client/dashboard.repository";
import type { EventoAgenda } from "@/repositories/agenda.repository";

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  if (hours < 24) return `Há ${hours}h`;
  return `Há ${days} dia(s)`;
}

function getTipoBadge(tipo: string) {
  const map: Record<string, "default" | "secondary" | "success" | "outline"> = {
    lead: "default",
    cliente: "success",
    negociacao: "outline",
    agenda: "secondary",
  };
  return map[tipo] ?? "secondary";
}

export function RecentActivity({ atividades }: { atividades: DashboardAtividadeRecente[] }) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base">Atividades Recentes</CardTitle>
        <CardDescription>Últimas movimentações do CRM</CardDescription>
      </CardHeader>
      <CardContent>
        {atividades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
        ) : (
          <div className="space-y-4">
            {atividades.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent/30"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.descricao}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant={getTipoBadge(activity.tipo)} className="text-[10px]">
                      {activity.tipo}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timeAgo(activity.data)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UpcomingSchedule({ eventos }: { eventos: EventoAgenda[] }) {
  const hoje = new Date();
  const eventosHoje = eventos
    .filter((e) => {
      const data = new Date(e.data_inicio);
      return data.toDateString() === hoje.toDateString();
    })
    .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
    .slice(0, 4);

  const formatarHora = (data: string) => {
    return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const schedule = eventosHoje.map((evento) => ({
    time: formatarHora(evento.data_inicio),
    title: evento.titulo,
    type: evento.tipo,
  }));

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-primary" />
          Agenda de Hoje
        </CardTitle>
        <CardDescription>Compromissos programados</CardDescription>
      </CardHeader>
      <CardContent>
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum compromisso para hoje.</p>
        ) : (
          <div className="space-y-3">
            {schedule.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-lg border border-border/50 p-3"
              >
                <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                  {item.time}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PipelineOverview({
  pipeline,
}: {
  pipeline: { name: string; count: number; color: string; width: string }[];
}) {
  const stages = pipeline.length > 0 ? pipeline : [
    { name: "Novos Leads", count: 0, color: "bg-blue-500", width: "0%" },
    { name: "Qualificados", count: 0, color: "bg-violet-500", width: "0%" },
    { name: "Proposta", count: 0, color: "bg-amber-500", width: "0%" },
    { name: "Fechamento", count: 0, color: "bg-emerald-500", width: "0%" },
  ];

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base">Pipeline de Vendas</CardTitle>
        <CardDescription>Distribuição por estágio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stage.name}</span>
                <span className="text-muted-foreground">{stage.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${stage.color} transition-all`}
                  style={{ width: stage.width }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
