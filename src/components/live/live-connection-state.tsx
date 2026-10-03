"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from "lucide-react";
import { descreverErroLive } from "@/lib/live/erros";
import type { ConexaoMedia } from "@/hooks/live/use-live-media";

const ROTULO_CONEXAO: Record<ConexaoMedia, string> = {
  desconectado: "Desconectado",
  conectando: "Conectando…",
  conectado: "Conectado",
  reconectando: "Reconectando…",
  erro: "Falha de conexão",
};

type Props = {
  conexao: ConexaoMedia;
  falha?: { codigo: string; mensagem?: string } | null;
  aoFecharFalha?: () => void;
  className?: string;
};

/** Estado da conexão de mídia + mensagens de erro claras e acionáveis. */
export function LiveConnectionState({ conexao, falha, aoFecharFalha, className }: Props) {
  const descricao = falha ? descreverErroLive(falha.codigo, falha.mensagem) : null;

  if (!falha && conexao === "conectado") return null;

  return (
    <div className={cn("space-y-2", className)}>
      {conexao !== "conectado" && !falha && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          {conexao === "erro" ? (
            <WifiOff className="h-3.5 w-3.5" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          {ROTULO_CONEXAO[conexao]}
        </p>
      )}

      {descricao && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-xs",
            descricao.recuperavel
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-destructive/40 bg-destructive/10",
          )}
          role="alert"
        >
          {descricao.recuperavel ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{descricao.titulo}</p>
            <p className="text-muted-foreground">{descricao.mensagem}</p>
          </div>
          {aoFecharFalha && (
            <button
              type="button"
              onClick={aoFecharFalha}
              className="shrink-0 rounded p-1 hover:bg-muted"
              aria-label="Fechar aviso"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
