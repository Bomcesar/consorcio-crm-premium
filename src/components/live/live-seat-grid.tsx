"use client";

import * as React from "react";
import { Crown } from "lucide-react";
import { LiveSeat } from "./live-seat";
import type { LiveParticipante, LivePresenteEnvio } from "@/lib/live/types";

type Props = {
  participantes: LiveParticipante[];
  maxCadeiras: number;
  meuUsuarioId: string | null;
  idsQuemFala?: Record<string, boolean>;
  presentesPorParticipante?: Map<string, LivePresenteEnvio[]>;
  totalPorParticipante?: (id: string) => number;
  podeEnviarPresente?: boolean;
  aoEnviarPresente?: (destinatario: LiveParticipante) => void;
  acoesAnfitriao?: (participante: LiveParticipante) => {
    silenciar?: () => void;
    remover?: () => void;
    bloquear?: () => void;
    alternarAudio?: () => void;
  };
  /** O anfitrião (ou admin) pode suspender o áudio da apresentação. */
  podeSilenciarAudio?: boolean;
  /** Consulta o estado de mute de áudio de uma cadeira. */
  audioSilenciado?: (participanteId: string) => boolean;
};

/**
 * Cadeiras da sala. O número é configurável por sala
 * (`live_rooms.max_cadeiras`); o padrão inicial é 8.
 * A cadeira 0 é o palco do anfitrião.
 */
export function LiveSeatGrid({
  participantes,
  maxCadeiras,
  meuUsuarioId,
  idsQuemFala = {},
  presentesPorParticipante = new Map(),
  totalPorParticipante = () => 0,
  podeEnviarPresente = false,
  aoEnviarPresente,
  acoesAnfitriao,
  podeSilenciarAudio = false,
  audioSilenciado = () => false,
}: Props) {
  const anfitriao = participantes.find((p) => p.tipo === "anfitriao" && p.saiu_em == null) ?? null;

  const porCadeira = React.useMemo(() => {
    const mapa = new Map<number, LiveParticipante>();
    for (const p of participantes) {
      if (p.saiu_em != null) continue;
      if (p.cadeira != null) mapa.set(p.cadeira, p);
    }
    return mapa;
  }, [participantes]);

  const indiceMax = Math.max(1, maxCadeiras);

  return (
    <div className="space-y-4">
      {/* Anfitrião */}
      <div className="flex justify-center">
        <div className="w-full max-w-[220px]">
          <LiveSeat
            participante={anfitriao}
            indice={null}
            estado="anfitriao"
            falando={!!anfitriao && !!idsQuemFala[anfitriao.id]}
            ehEu={anfitriao?.usuario_id === meuUsuarioId}
            presentes={anfitriao ? (presentesPorParticipante.get(anfitriao.id) ?? []) : []}
            totalCredito={anfitriao ? totalPorParticipante(anfitriao.id) : 0}
            podeEnviarPresente={podeEnviarPresente && !!anfitriao}
            aoEnviarPresente={aoEnviarPresente}
          />
        </div>
      </div>

      {/* Cadeiras numeradas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: indiceMax }, (_, i) => i + 1).map((indice) => {
          const ocupante = porCadeira.get(indice) ?? null;
          return (
            <LiveSeat
              key={indice}
              participante={ocupante}
              indice={indice}
              estado={ocupante ? "ocupada" : "vaga"}
              falando={!!ocupante && !!idsQuemFala[ocupante.id]}
              ehEu={ocupante?.usuario_id === meuUsuarioId}
              presentes={ocupante ? (presentesPorParticipante.get(ocupante.id) ?? []) : []}
              totalCredito={ocupante ? totalPorParticipante(ocupante.id) : 0}
              podeEnviarPresente={podeEnviarPresente && !!ocupante}
              aoEnviarPresente={aoEnviarPresente}
              acoesAnfitriao={
                ocupante && acoesAnfitriao ? acoesAnfitriao(ocupante) : undefined
              }
              podeSilenciarAudio={podeSilenciarAudio && !!ocupante}
              audioSilenciado={ocupante ? audioSilenciado(ocupante.id) : false}
              compacto
            />
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Crown className="h-3.5 w-3.5 text-amber-500" />
        O anfitrião controla quem sobe para cada cadeira.
      </p>
    </div>
  );
}

export function LiveSeatSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex h-40 animate-pulse flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
        >
          <div className="h-14 w-14 rounded-full bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export const LiveSeatGridMemo = React.memo(LiveSeatGrid);
