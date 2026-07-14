import { StatsCards } from "@/components/dashboard/stats-cards";
import {
  RecentActivity,
  UpcomingSchedule,
  PipelineOverview,
} from "@/components/dashboard/recent-activity";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
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

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div className="space-y-6">
          <UpcomingSchedule />
          <PipelineOverview />
        </div>
      </div>
    </div>
  );
}
