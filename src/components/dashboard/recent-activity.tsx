import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Headphones, Users } from "lucide-react";
import type { DashboardActivity, DashboardScheduleItem, PipelineStage } from "@/types/crm";

type RecentActivityProps = {
  activities: DashboardActivity[];
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base">Atividades Recentes</CardTitle>
        <CardDescription>Últimas movimentações do CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent/30"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{activity.client}</p>
                <p className="text-xs text-muted-foreground">{activity.action}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {activity.type}
                  </Badge>
                  <span className="text-xs font-medium text-primary">{activity.value}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {activity.time}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type UpcomingScheduleProps = {
  schedule: DashboardScheduleItem[];
};

export function UpcomingSchedule({ schedule }: UpcomingScheduleProps) {

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-primary" />
          Agenda de Hoje
        </CardTitle>
        <CardDescription>Compromissos programados</CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Users className="h-3 w-3" />
            Indicador
          </Badge>
          <Badge variant="success" className="gap-1 text-[10px]">
            <Headphones className="h-3 w-3" />
            Pós-venda
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum compromisso para hoje.</p>
          ) : null}
          {schedule.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 rounded-lg border p-3 ${
                item.origin === "Pós-venda"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-border/50"
              }`}
            >
              <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                {item.time}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                  <Badge variant={item.origin === "Pós-venda" ? "success" : "outline"} className="gap-1 text-[10px]">
                    {item.origin === "Pós-venda" ? <Headphones className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                    {item.origin}
                  </Badge>
                </div>
                <p className="pt-1 text-[11px] text-muted-foreground">{item.originLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type PipelineOverviewProps = {
  stages: PipelineStage[];
};

export function PipelineOverview({ stages }: PipelineOverviewProps) {

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
