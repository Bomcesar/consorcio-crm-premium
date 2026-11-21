import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EtiquetaDef, EtiquetaId } from "@/lib/etiquetas";
import { getEtiquetaById } from "@/lib/etiquetas";

interface EtiquetaBadgeProps {
  etiqueta: EtiquetaDef | EtiquetaId;
  className?: string;
  /** Se true, mostra apenas um ponto colorido sem texto */
  compact?: boolean;
}

/**
 * Badge visual de etiqueta comercial.
 * Usa as cores definidas centralmente em src/lib/etiquetas.ts.
 */
export function EtiquetaBadge({
  etiqueta,
  className,
  compact,
}: EtiquetaBadgeProps) {
  const def = typeof etiqueta === "string" ? getEtiquetaById(etiqueta) : etiqueta;
  if (!def) return null;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full border",
          def.cor,
          className,
        )}
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

interface EtiquetaListProps {
  etiquetas: (EtiquetaDef | EtiquetaId)[];
  className?: string;
  maxVisible?: number;
}

/**
 * Lista de etiquetas com wrap.
 * Se maxVisible for definido, mostra apenas os primeiros N e um contador.
 */
export function EtiquetaList({
  etiquetas,
  className,
  maxVisible,
}: EtiquetaListProps) {
  const visible = maxVisible ? etiquetas.slice(0, maxVisible) : etiquetas;
  const remaining = maxVisible ? etiquetas.length - maxVisible : 0;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((e, i) => (
        <EtiquetaBadge key={i} etiqueta={e} />
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}