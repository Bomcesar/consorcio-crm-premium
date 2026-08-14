import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function RecentActivitySkeleton() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base">Atividades Recentes</CardTitle>
        <CardDescription>Últimas movimentações do CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted/50"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
