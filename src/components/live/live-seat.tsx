"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Gift, Mic, MicOff, ShieldAlert, UserMinus, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCreditoBRL, iniciais } from "@/lib/live/format";
import type { LiveParticipante, LivePresenteEnvio } from "@/lib/live/types";

type Props = {
  participante: LiveParticipante | null;
  indice: number | null;
  estado: "vaga" | "ocupada" | "anfitriao";
  falando?: boolean;
  presentes?: LivePresenteEnvio[];
  totalCredito?: number;
  ehEu?: boolean;
  podeEnviarPresente?: boolean;
  aoEnviarPresente?: (destinatario: LiveParticipante) => void;
  acoesAnfitriao?: {
    silenciar?: () => void;
    remover?: () => void;
    bloquear?: () => void;
    /** Mute individual do áudio da apresentação para esta cadeira. */
    alternarAudio?: () => void;
  };
  /** O anfitrião (ou admin) pode suspender o áudio desta cadeira. */
  podeSilenciarAudio?: boolean;
  audioSilenciado?: boolean;
  compacto?: boolean;
};

export function LiveSeat({
  participante,
  indice,
  estado,
  falando = false,
  presentes = [],
  totalCredito = 0,
  ehEu = false,
  podeEnviarPresente = false,
  aoEnviarPresente,
  acoesAnfitriao,
  podeSilenciarAudio = false,
  audioSilenciado = false,
  compacto = false,
}: Props) {
  const [historicoAberto, setHistoricoAberto] = React.useState(false);

  const ehAnfitriao = estado === "anfitriao";
  const nome =
    participante?.nome_exibicao ?? (ehAnfitriao ? "Anfitrião" : `Cadeira ${indice ?? ""}`);
  const rotulo = ehAnfitriao ? "Anfitrião" : indice != null ? `Cadeira ${indice}` : "Vaga";
  const mostrarAcoes = !!participante && !participante.bloqueado && !ehAnfitriao;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
        falando ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-card",
        estado === "vaga" && "border-dashed opacity-70",
        participante?.bloqueado && "border-destructive/60 bg-destructive/5",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {ehAnfitriao && <Crown className="h-3.5 w-3.5 text-amber-500" />}
        <span>{rotulo}</span>
      </div>

      <div className="relative">
        <Avatar className={cn("h-14 w-14", compacto && "h-10 w-10")}>
          <AvatarFallback
            className={cn("text-base", ehAnfitriao && "bg-amber-500/20 text-amber-600")}
          >
            {participante ? iniciais(participante.nome_exibicao) : "＋"}
          </AvatarFallback>
        </Avatar>

        {participante && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card",
              participante.microfone_ativo
                ? "bg-emerald-500 text-white"
                : participante.silenciado_pelo_anfitriao
                  ? "bg-destructive text-white"
                  : "bg-muted text-muted-foreground",
            )}
            title={
              participante.microfone_ativo
                ? "Microfone ligado"
                : participante.silenciado_pelo_anfitriao
                  ? "Silenciado pelo anfitrião"
                  : "Microfone desligado"
            }
          >
            {participante.microfone_ativo ? (
              <Mic className="h-3 w-3" />
            ) : (
              <MicOff className="h-3 w-3" />
            )}
          </span>
        )}

        {falando && (
          <span className="pointer-events-none absolute -inset-1 animate-pulse rounded-full border-2 border-emerald-400" />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{nome}</p>
        {participante?.perfil && (
          <p className="truncate text-[11px] text-muted-foreground">{participante.perfil}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{rotulo}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
        {ehEu && <Badge variant="outline" className="text-[10px]">você</Badge>}
        {participante?.bloqueado && (
          <Badge variant="destructive" className="text-[10px]">
            bloqueado
          </Badge>
        )}
        {participante?.silenciado_pelo_anfitriao && (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <MicOff className="h-3 w-3" /> silenciado
          </Badge>
        )}
        {participante && estado === "ocupada" && !participante.microfone_ativo && (
          <Badge variant="secondary" className="text-[10px]">
            ouvindo
          </Badge>
        )}
        {podeSilenciarAudio && (
          <Badge
            variant={audioSilenciado ? "destructive" : "outline"}
            className="gap-1 text-[10px]"
            title={
              audioSilenciado
                ? "Restaurar o áudio da apresentação para esta cadeira"
                : "Silenciar o áudio da apresentação para esta cadeira"
            }
          >
            {audioSilenciado ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
            {audioSilenciado ? "sem áudio" : "ouvindo"}
          </Badge>
        )}
      </div>

      {totalCredito > 0 && (
        <button
          type="button"
          onClick={() => setHistoricoAberto((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-500/25 dark:text-amber-400"
          title="Ver histórico de presentes"
        >
          <Gift className="h-3 w-3" />
          {presentes.length}
          <span className="font-semibold">{formatCreditoBRL(totalCredito)}</span>
        </button>
      )}

      {historicoAberto && presentes.length > 0 && (
        <div className="mt-1 max-h-40 w-full overflow-y-auto rounded-lg border bg-background/90 p-2 text-left text-[11px]">
          {presentes.map((p) => (
            <p key={p.id} className="py-0.5">
              🎁 <span className="font-semibold">{p.presente_nome}</span>
              {p.categoria_nome ? ` · ${p.categoria_nome}` : ""}
              <span className="block text-muted-foreground">
                {formatCreditoBRL(p.valor_credito_representado)} ·{" "}
                {new Date(p.created_at).toLocaleString("pt-BR")}
              </span>
            </p>
          ))}
        </div>
      )}

      {mostrarAcoes && (podeEnviarPresente || acoesAnfitriao) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
          {podeEnviarPresente && (
            <button
              type="button"
              onClick={() => aoEnviarPresente?.(participante)}
              className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-amber-600 hover:bg-amber-500/10"
              title="Enviar presente"
            >
              <Gift className="h-3.5 w-3.5" />
            </button>
          )}
          {acoesAnfitriao && (
            <>
              <button
                type="button"
                onClick={acoesAnfitriao.silenciar}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border bg-background hover:bg-muted",
                  participante?.silenciado_pelo_anfitriao &&
                    "border-destructive/50 text-destructive hover:bg-destructive/10",
                )}
                title={
                  participante?.silenciado_pelo_anfitriao
                    ? "Devolver a palavra a esta pessoa"
                    : "Silenciar o microfone desta pessoa"
                }
                aria-pressed={participante?.silenciado_pelo_anfitriao === true}
              >
                {participante?.silenciado_pelo_anfitriao ? (
                  <Mic className="h-3.5 w-3.5" />
                ) : (
                  <MicOff className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={acoesAnfitriao.alternarAudio}
                disabled={!acoesAnfitriao.alternarAudio}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
                  audioSilenciado && "border-destructive/50 text-destructive hover:bg-destructive/10",
                )}
                title={
                  acoesAnfitriao.alternarAudio
                    ? audioSilenciado
                      ? "Restaurar o áudio da apresentação para esta cadeira"
                      : "Silenciar o áudio da apresentação para esta cadeira"
                    : "Silenciar o áudio da apresentação (disponível para usuários conectados)"
                }
                aria-pressed={audioSilenciado}
              >
                {audioSilenciado ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={acoesAnfitriao.remover}
                className="flex h-7 w-7 items-center justify-center rounded-full border bg-background hover:bg-muted"
                title="Remover da cadeira"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={acoesAnfitriao.bloquear}
                className="flex h-7 w-7 items-center justify-center rounded-full border bg-background text-destructive hover:bg-destructive/10"
                title="Bloquear participante"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
