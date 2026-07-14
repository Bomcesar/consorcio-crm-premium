import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recentActivities } from "@/config/navigation";
import { Calendar, Clock } from "lucide-react";

export function RecentActivity() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base">Atividades Recentes</CardTitle>
        <CardDescription>Últimas movimentações do CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
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

export function UpcomingSchedule() {
  const schedule = [
    { time: "09:00", title: "Reunião com Maria Silva", type: "Proposta" },
    { time: "11:30", title: "Follow-up João Santos", type: "WhatsApp" },
    { time: "14:00", title: "Apresentação consórcio imóvel", type: "Presencial" },
    { time: "16:30", title: "Assembleia virtual", type: "Online" },
  ];

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
      </CardContent>
    </Card>
  );
}

export function PipelineOverview() {
  const stages = [
    { name: "Novos Leads", count: 45, color: "bg-blue-500", width: "75%" },
    { name: "Qualificados", count: 32, color: "bg-violet-500", width: "55%" },
    { name: "Proposta", count: 18, color: "bg-amber-500", width: "35%" },
    { name: "Fechamento", count: 8, color: "bg-emerald-500", width: "20%" },
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
