import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type IndicatorCardProps = {
  indicator: {
    id: string;
    nome: string;
    telefone?: string | null;
    cidade?: string | null;
    status?: string | null;
  };
  stats: {
    contatosRecebidos: number;
    reunioesRealizadas: number;
    vendasFechadas: number;
    comissoesPagas: number;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenContacts?: () => void;
};

const statusClasses: Record<string, string> = {
  Novo: "bg-sky-500/15 text-sky-500 border-sky-500/20",
  "Em contato": "bg-amber-500/15 text-amber-500 border-amber-500/20",
  Ativo: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  Inativo: "bg-muted text-muted-foreground border-border",
  "Parceiro Premium": "bg-violet-500/15 text-violet-500 border-violet-500/20",
};

export function IndicatorCard({ indicator, stats, onEdit, onDelete, onOpenContacts }: IndicatorCardProps) {
  const initials = indicator.nome
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <Card className="border-border/50 bg-card/70 transition hover:border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div>
              <p className="font-semibold">{indicator.nome}</p>
              <p className="text-sm text-muted-foreground">{indicator.telefone || "Telefone não informado"}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusClasses[indicator.status ?? "Novo"] || statusClasses.Novo}>
            {indicator.status || "Novo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Cidade</span>
          <span className="font-medium text-foreground">{indicator.cidade || "-"}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/50 bg-background/40 p-2 text-center">
            <p className="text-xs text-muted-foreground">Contatos</p>
            <p className="text-lg font-semibold">{stats.contatosRecebidos}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/40 p-2 text-center">
            <p className="text-xs text-muted-foreground">Reuniões</p>
            <p className="text-lg font-semibold">{stats.reunioesRealizadas}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/40 p-2 text-center">
            <p className="text-xs text-muted-foreground">Vendas</p>
            <p className="text-lg font-semibold">{stats.vendasFechadas}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/40 p-2 text-center">
            <p className="text-xs text-muted-foreground">Comissões</p>
            <p className="text-lg font-semibold">{stats.comissoesPagas}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/central-de-indicadores/${indicator.id}`}>Visualizar</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenContacts}>
            Contatos
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
