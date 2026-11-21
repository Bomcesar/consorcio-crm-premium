"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ETIQUETAS,
  type EtiquetaId,
  type EtiquetaGrupo,
  validarCombinacaoEtiquetas,
} from "@/lib/etiquetas";
import { EtiquetaBadge } from "./etiqueta-badge";

interface EtiquetaSelectorProps {
  /** IDs das etiquetas selecionadas */
  value: EtiquetaId[];
  /** Callback quando as etiquetas mudam */
  onChange: (etiquetas: EtiquetaId[]) => void;
  /** Mensagem de erro (se houver) */
  error?: string | null;
  /** Desabilitar o seletor */
  disabled?: boolean;
}

const GRUPO_LABEL: Record<EtiquetaGrupo, string> = {
  relacionamento: "Situação do relacionamento",
  interesse: "Perfil de interesse",
  papel: "Papel comercial",
};

const GRUPO_REGRA: Record<EtiquetaGrupo, string> = {
  relacionamento: "Selecione apenas uma",
  interesse: "Múltiplas permitidas",
  papel: "Selecione apenas uma",
};

/**
 * Seletor de etiquetas com validação de combinação.
 *
 * - Grupo A (relacionamento): máximo 1
 * - Grupo B (interesse): múltiplas
 * - Grupo C (papel): máximo 1
 */
export function EtiquetaSelector({
  value,
  onChange,
  error,
  disabled,
}: EtiquetaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const etiquetasPorGrupo = useMemo(() => {
    const grupos: EtiquetaGrupo[] = ["relacionamento", "interesse", "papel"];
    return grupos.map((grupo) => ({
      grupo,
      etiquetas: ETIQUETAS.filter((e) => e.grupo === grupo),
    }));
  }, []);

  const handleToggle = (id: EtiquetaId) => {
    const current = value.includes(id)
      ? value.filter((e) => e !== id)
      : [...value, id];

    const result = validarCombinacaoEtiquetas(current);
    if (!result.valid) {
      setLocalError(result.error);
      return;
    }

    setLocalError(null);
    onChange(current);
  };

  const handleRemove = (id: EtiquetaId) => {
    onChange(value.filter((e) => e !== id));
    setLocalError(null);
  };

  const displayError = error ?? localError;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="gap-1.5"
            >
              <Tag className="h-3.5 w-3.5" />
              Etiquetas
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Etiquetas comerciais</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {etiquetasPorGrupo.map(({ grupo, etiquetas }) => (
              <div key={grupo}>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {GRUPO_LABEL[grupo]}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    {GRUPO_REGRA[grupo]}
                  </p>
                </div>
                {etiquetas.map((etiqueta) => {
                  const checked = value.includes(etiqueta.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={etiqueta.id}
                      checked={checked}
                      onCheckedChange={() => handleToggle(etiqueta.id)}
                      onSelect={(e) => e.preventDefault()}
                      className="gap-2"
                    >
                      <span
                        className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full border",
                          etiqueta.cor,
                        )}
                      />
                      <span className="flex-1 text-xs">{etiqueta.label}</span>
                      {checked && <Check className="h-3 w-3" />}
                    </DropdownMenuCheckboxItem>
                  );
                })}
                {grupo !== "papel" && <DropdownMenuSeparator />}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Badges das etiquetas selecionadas */}
        {value.map((id) => (
          <span key={id} className="inline-flex items-center gap-1">
            <EtiquetaBadge etiqueta={id} />
            <button
              type="button"
              onClick={() => handleRemove(id)}
              className="rounded-full p-0.5 hover:bg-muted"
              title="Remover etiqueta"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </span>
        ))}
      </div>

      {displayError && (
        <p className="text-xs text-destructive">{displayError}</p>
      )}
    </div>
  );
}