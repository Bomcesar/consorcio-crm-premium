import { ArrowDownRight, ArrowUpRight, TrendingUp, Users, Handshake, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats } from "@/config/navigation";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const iconMap = [Users, Users, Handshake, DollarSign];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dashboardStats.map((stat, index) => {
        const Icon = iconMap[index] ?? TrendingUp;
        const displayValue = stat.isCurrency
          ? formatCurrency(stat.value)
          : formatNumber(stat.value);

        return (
          <Card
            key={stat.title}
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
              <div className="mt-1 flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    stat.trend === "up" ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </span>
                <span className="text-muted-foreground">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
