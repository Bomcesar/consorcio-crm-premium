"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveSeatGrid } from "./live-seat-grid";
import { useIndicadoresDeFala } from "@/hooks/live/use-live-speaking";
import type { LiveParticipante, LivePresenteEnvio } from "@/lib/live/types";

type Props = {
  participantes: LiveParticipante[];
  maxCadeiras: number;
  meuUsuarioId: string | null;
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
  podeSilenciarAudio?: boolean;
  audioSilenciado?: (participanteId: string) => boolean;
  /** Publicação de mídia local, para medir o próprio microfone. */
  podePublicar: boolean;
  microfoneAtivo: boolean;
  fluxoLocal: MediaStream | null;
};

/**
 * Palco com as cadeiras da sala.
 *
 * Este componente é renderizado DENTRO de `SalaMidia`
 * (`LiveKitRoom`) de propósito: `useIndicadoresDeFala` usa
 * `useLocalParticipant` e `useTracks`, que dependem do
 * `RoomContext` e lançam
 *
 *   "No room provided, make sure you are inside a Room context
 *    or pass the room explicitly"
 *
 * se forem chamados fora do provider. Como o React só distribui
 * contexto para os descendentes, o hook precisa ser executado aqui
 * dentro — e não no componente pai que renderiza o provider.
 */
export function LiveSeatStage({
  participantes,
  maxCadeiras,
  meuUsuarioId,
  presentesPorParticipante,
  totalPorParticipante,
  podeEnviarPresente,
  aoEnviarPresente,
  acoesAnfitriao,
  podeSilenciarAudio,
  audioSilenciado,
  podePublicar,
  microfoneAtivo,
  fluxoLocal,
}: Props) {
  const idsQuemFala = useIndicadoresDeFala({
    participantes,
    podePublicar,
    microfoneAtivo,
    fluxoLocal,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" /> Cadeiras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LiveSeatGrid
          participantes={participantes}
          maxCadeiras={maxCadeiras}
          meuUsuarioId={meuUsuarioId}
          idsQuemFala={idsQuemFala}
          presentesPorParticipante={presentesPorParticipante}
          totalPorParticipante={totalPorParticipante}
          podeEnviarPresente={podeEnviarPresente}
          aoEnviarPresente={aoEnviarPresente}
          acoesAnfitriao={acoesAnfitriao}
          podeSilenciarAudio={podeSilenciarAudio}
          audioSilenciado={audioSilenciado}
        />
      </CardContent>
    </Card>
  );
}