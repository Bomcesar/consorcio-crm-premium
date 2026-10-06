"use client";

import * as React from "react";
import { useRemoteParticipants } from "@livekit/components-react";
import type { RemoteParticipant, RemoteTrackPublication } from "livekit-client";

export type ControleAudioSala = {
  /** Participantes presentes na sala de mídia (inclui quem está sem microfone). */
  conectados: number;
  /** `participanteId` (id da linha em `live_participantes`) com áudio suspenso. */
  silenciados: Record<string, boolean>;
  idsSilenciados: string[];
  todosSilenciados: boolean;
  algumSilenciado: boolean;
  alternarTodos: () => void;
  alternarParticipante: (participanteId: string) => void;
  estaSilenciado: (participanteId: string) => boolean;
};

/**
 * `audioTrackPublications` mudou de array para `Map` entre versões do
 * livekit-client. Aceitar os dois evita que a funcionalidade suma num
 * upgrade de dependência.
 */
function publicacoesDeAudio(remoto: RemoteParticipant): RemoteTrackPublication[] {
  const alvo = remoto.audioTrackPublications as
    | Map<string, RemoteTrackPublication>
    | RemoteTrackPublication[];
  return Array.isArray(alvo) ? alvo : [...alvo.values()];
}

/**
 * Mute do áudio da apresentação, controlado pelo anfitrião.
 *
 * O que este hook silencia é a **recepção**: para cada
 * `RemoteParticipant`, `setSubscribed(false)` nas publicações de
 * áudio deixa de entregar aquele áudio a este cliente. É o único
 * mecanismo que cumpre "silenciar a apresentação para a cadeira X"
 * sem exigir que a pessoa finalmente aperte o botão, e é reversível
 * — basta `setSubscribed(true)` quando o anfitrião desliga o mute.
 *
 * Deliberadamente NÃO mexe no microfone de quem fala: silenciar o
 * participante é outra função (`silenciado_pelo_anfitriao` no
 * banco), aplicada pelo próprio cliente dele.
 */
export function useControleAudioSala(): ControleAudioSala {
  const remotos = useRemoteParticipants();
  const [silenciados, setSilenciados] = React.useState<Record<string, boolean>>({});

  // A chave estável de cada participante remoto é o
  // `participanteId` que o servidor gravou nos metadados do token.
  // Convidados externos não recebem esse metadado, então ficam de
  // fora do mute individual — sem isso eles apareceriam como
  // "não silenciados" sem que houvesse qualquer controle sobre eles.
  const chaveDe = React.useCallback((remoto: RemoteParticipant): string | null => {
    try {
      const bruto = remoto.metadata;
      if (!bruto) return null;
      const meta = JSON.parse(bruto) as { participanteId?: string };
      return meta.participanteId ?? null;
    } catch {
      return null;
    }
  }, []);

  const porChave = React.useMemo(() => {
    const mapa = new Map<string, RemoteParticipant>();
    for (const remoto of remotos) {
      const chave = chaveDe(remoto);
      if (chave) mapa.set(chave, remoto);
    }
    return mapa;
  }, [remotos, chaveDe]);

  const aplicar = React.useCallback(
    (alvo: RemoteParticipant[], silenciar: boolean) => {
      for (const remoto of alvo) {
        for (const publicacao of publicacoesDeAudio(remoto)) {
          try {
            // `setSubscribed` retorna void nesta versão do
            // livekit-client e Promise em outras; `Promise.resolve`
            // normaliza os dois casos e captura rejeição assíncrona.
            void Promise.resolve(publicacao.setSubscribed(!silenciar)).catch(
              (e: unknown) => {
                console.error("[LiveAudio] Falha ao alterar inscrição de áudio:", e);
              },
            );
          } catch (e) {
            console.error("[LiveAudio] Falha ao alterar inscrição de áudio:", e);
          }
        }
      }
    },
    [],
  );

  const alternarParticipante = React.useCallback(
    (participanteId: string) => {
      setSilenciados((atuais) => {
        const remoto = porChave.get(participanteId);
        if (!remoto) {
          console.warn(`[LiveAudio] participante ${participanteId} não está conectado à sala de mídia.`);
          return atuais;
        }
        const silenciar = !atuais[participanteId];
        aplicar([remoto], silenciar);
        if (silenciar) return { ...atuais, [participanteId]: true };
        const copia = { ...atuais };
        delete copia[participanteId];
        return copia;
      });
    },
    [porChave, aplicar],
  );

  /**
   * Todos os participantes da sala de mídia, inclusive convidados.
   *
   * O mute coletivo precisa alcançar os convidados, que não recebem
   * `participanteId` nos metadados e por isso não entram em
   * `porChave`. Sem esta distinção, "Silenciar para todos" calava
   * só os usuários cadastrados.
   */
  const todosRemotos = React.useMemo(() => [...remotos], [remotos]);

  const alternarTodos = React.useCallback(() => {
    setSilenciados((atuais) => {
      const jaSilenciados = Object.keys(atuais).filter((id) => atuais[id]);
      const silenciar = jaSilenciados.length !== todosRemotos.length;

      aplicar(todosRemotos, silenciar);

      if (silenciar) {
        return Object.fromEntries([...porChave.keys()].map((id) => [id, true]));
      }
      // Silenciar "todos" também limpa os mutes individuais: um botão
      // global que deixasse exceções pendentes não corresponderia ao
      // que o rótulo diz.
      return {};
    });
  }, [todosRemotos, porChave, aplicar]);

  const idsSilenciados = React.useMemo(
    () => Object.keys(silenciados).filter((id) => silenciados[id]),
    [silenciados],
  );

  // Quem entra depois de um mute coletivo precisa ser silenciado
  // também, senão a sala fica inconsistida: o botão diz "todos
  // silenciados" e a pessoa que acabou de chegar ouve tudo.
  React.useEffect(() => {
    if (idsSilenciados.length === 0) return;
    if (idsSilenciados.length === porChave.size && porChave.size > 0) {
      aplicar(todosRemotos, true);
      return;
    }
    const alvo = new Map<string, RemoteParticipant>();
    for (const id of idsSilenciados) {
      const remoto = porChave.get(id);
      if (remoto) alvo.set(id, remoto);
    }
    if (alvo.size > 0) aplicar([...alvo.values()], true);
  }, [idsSilenciados, porChave, todosRemotos, aplicar]);

  return {
    conectados: remotos.length,
    silenciados,
    idsSilenciados,
    todosSilenciados: todosRemotos.length > 0 && idsSilenciados.length >= porChave.size && porChave.size > 0,
    algumSilenciado: idsSilenciados.length > 0,
    alternarTodos,
    alternarParticipante,
    estaSilenciado: (id: string) => silenciados[id] === true,
  };
}