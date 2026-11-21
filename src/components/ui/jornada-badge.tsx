import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type JornadaTipo,
  type EtapaDef,
  getEtapaDef,
  getJornadaLabel,
} from "@/lib/jornadas";

interface JornadaBadgeProps {
  jornadaTipo: JornadaTipo;
  etapaId: string | null;
  className?: string;
  showLabel?: boolean;
}

/**
 * Badge visual de uma etapa de jornada.
 * Mostra o label da etapa com a cor correspondente.
 */
export function JornadaBadge({
  jornadaTipo,
  etapaId,
  className,
  showLabel = true,
}: JornadaBadgeProps) {
  if (!etapaId) {
    return (
      <Badge variant="outline" className={cn("text-xs text-muted-foreground", className)}>
        Não iniciada
      </Badge>
    );
  }

  const def = getEtapaDef(jornadaTipo, etapaId);
  if (!def) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        {etapaId}
      </Badge>
    );
  }

  if (!showLabel) {
    return (
      <span
        className={cn("inline-block h-2.5 w-2.5 rounded-full border", def.cor, className)}
        title={def.label}
      />
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-xs font-medium", def.cor, className)}
    >
      {def.label}
    </Badge>
  );
}

interface JornadaIndicadorProps {
  jornadaTipo: JornadaTipo;
  ativa: boolean;
  etapaId: string | null;
  className?: string;
}

/**
 * Indicador compacto de uma jornada: ícone + label da jornada + etapa atual.
 */
export function JornadaIndicador({
  jornadaTipo,
  ativa,
  etapaId,
  className,
}: JornadaIndicadorProps) {
  const label = getJornadaLabel(jornadaTipo);

  if (!ativa || !etapaId) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
        <span className="text-xs text-muted-foreground">{label}: não iniciada</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <JornadaBadge jornadaTipo={jornadaTipo} etapaId={etapaId} />
    </div>
  );
}