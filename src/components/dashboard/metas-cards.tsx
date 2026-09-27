"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp } from "lucide-react";
import type { MetaSimplificada } from "@/repositories/client/dashboard.repository";
import { formatCurrency } from "@/lib/utils";

export function MetasCards({
  metas,
  valorVendasRealizado,
}: {
  metas: MetaSimplificada[];
  valorVendasRealizado: number;
}) {
  if (!metas || metas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" />
          Metas de Venda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metas.map((meta) => {
          const metaAgrupada = meta.perfil_aplicavel !== "Equipe";
          let realizado = metaAgrupada ? meta.valor_realizado : valorVendasRealizado;
          if (meta.tipo === "venda" || meta.titulo.toLowerCase().includes("venda")) {
            realizado = valorVendasRealizado;
          }
          const porcentagem = meta.valor_alvo > 0
            ? Math.min((realizado / meta.valor_alvo) * 100, 100)
            : 0;

          return (
            <div key={meta.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{meta.titulo || "Meta"}</span>
                  {meta.perfil_aplicavel && (
                    <span className="text-xs text-muted-foreground">({meta.perfil_aplicavel})</span>
                  )}
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(realizado)} / {formatCurrency(meta.valor_alvo)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${porcentagem}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(porcentagem)}% concluído</span>
                <span>Meta: {formatCurrency(meta.valor_alvo)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
