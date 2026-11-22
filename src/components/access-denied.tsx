import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AccessDenied({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Acesso não autorizado</p>
        <p className="text-xs text-muted-foreground">
          {message ?? "Você não possui permissão para acessar este módulo."}
        </p>
      </CardContent>
    </Card>
  );
}