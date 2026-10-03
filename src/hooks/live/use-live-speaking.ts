"use client";

import * as React from "react";
import {
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  type TrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { LiveParticipante } from "@/lib/live/types";

/**
 * Indicador de fala por participante.
 *
 * A medição é feita sobre o áudio realmente publicado pelo
 * participante (Web Audio API sobre o MediaStream do track),
 * não por estimativa visual nem por temporizador.
 */
export function useIndicadoresDeFala(params: {
  participantes: LiveParticipante[];
  podePublicar: boolean;
  microfoneAtivo: boolean;
  fluxoLocal: MediaStream | null;
}) {
  const { participantes, podePublicar, microfoneAtivo, fluxoLocal } = params;

  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Microphone]);
  const tracksRemotos = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio]);

  const [quemFala, setQuemFala] = React.useState<Record<string, boolean>>({});

  // Relação entre a identidade da mídia e o participante do banco
  const participantePorIdentidade = React.useMemo(() => {
    const mapa = new Map<string, LiveParticipante>();
    for (const p of participantes) {
      if (p.usuario_id) mapa.set(p.usuario_id, p);
    }
    return mapa;
  }, [participantes]);

  const streamsPorIdentidade = React.useMemo(() => {
    const mapa = new Map<string, MediaStream>();
    const registrar = (track: TrackReference | undefined) => {
      if (!track) return;
      const media = (track as { mediaStreamTrack?: { mediaStream?: MediaStream } })
        .mediaStreamTrack?.mediaStream;
      if (media) mapa.set(track.participant.identity, media);
    };
    for (const t of tracks) registrar(t);
    for (const t of tracksRemotos) registrar(t);
    return mapa;
  }, [tracks, tracksRemotos]);

  // Fluxo local: só quando o microfone está ligado e há permissão
  const fluxoEfetivo = podePublicar && microfoneAtivo ? fluxoLocal : null;

  React.useEffect(() => {
    let cancelado = false;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const observar = (identidade: string, stream: MediaStream) => {
      const chave = `stream:${identidade}`;
      const existente = streamsPorIdentidade.get(chave);
      if (existente === stream) return;

      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      let ctx: AudioContext;
      try {
        ctx = new Ctor();
      } catch {
        return;
      }

      let fonte: MediaStreamAudioSourceNode;
      let analisador: AnalyserNode;
      try {
        fonte = ctx.createMediaStreamSource(stream);
        analisador = ctx.createAnalyser();
        analisador.fftSize = 512;
        analisador.smoothingTimeConstant = 0.6;
        fonte.connect(analisador);
      } catch {
        void ctx.close();
        return;
      }

      const dados = new Uint8Array(analisador.frequencyBinCount);
      const chaveTimer = `t:${identidade}`;
      const anterior = timers.get(chaveTimer);
      if (anterior) clearTimeout(anterior);

      const medir = () => {
        if (cancelado) return;
        analisador.getByteFrequencyData(dados);
        let soma = 0;
        for (let i = 0; i < dados.length; i += 1) soma += dados[i] ?? 0;
        const nivel = soma / dados.length;
        const ativo = nivel > 12;

        if (ativo) {
          setQuemFala((atuais) =>
            atuais[identidade] ? atuais : { ...atuais, [identidade]: true },
          );
          const t = timers.get(chaveTimer);
          if (t) clearTimeout(t);
          timers.set(
            chaveTimer,
            setTimeout(() => {
              setQuemFala((atuais) => {
                const copia = { ...atuais };
                delete copia[identidade];
                return copia;
              });
              timers.delete(chaveTimer);
            }, 600),
          );
        }
        requestAnimationFrame(medir);
      };
      requestAnimationFrame(medir);

      timers.set(
        chave,
        setTimeout(() => {
          try {
            fonte.disconnect();
            analisador.disconnect();
            void ctx.close();
          } catch {
            /* já encerrado */
          }
        }, 30000),
      );
    };

    for (const [identidade, stream] of streamsPorIdentidade) {
      observar(identidade, stream);
    }

    if (fluxoEfetivo && localParticipant) {
      observar(localParticipant.identity, fluxoEfetivo);
    }

    return () => {
      cancelado = true;
      for (const t of timers.values()) clearTimeout(t);
    };
  }, [streamsPorIdentidade, fluxoEfetivo, localParticipant]);

  // Converte identidade de mídia -> id do participante do banco
  return React.useMemo(() => {
    const saida: Record<string, boolean> = {};
    for (const [identidade, falando] of Object.entries(quemFala)) {
      if (!falando) continue;
      const p = participantePorIdentidade.get(identidade);
      if (p) saida[p.id] = true;
    }
    return saida;
  }, [quemFala, participantePorIdentidade]);
}

/** Identidades presentes na sala de mídia (para diagnóstico de conexão). */
export function useIdentidadesRemotas(): string[] {
  const remotos = useRemoteParticipants();
  return React.useMemo(() => remotos.map((p) => p.identity), [remotos]);
}
