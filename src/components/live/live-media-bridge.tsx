"use client";

import * as React from "react";
import { useLocalParticipant } from "@livekit/components-react";
import type { LocalTrack } from "livekit-client";
import type { MidiaPublicada } from "@/hooks/live/use-live-media";

type Props = MidiaPublicada;

/**
 * Ponte entre a permissão do usuário e a publicação real no SFU.
 *
 * Publica e despublica os tracks conforme o anfitrião ou o
 * participante liga/desliga microfone, câmera e tela — sem
 * derrubar a conexão da sala (que permanece ativa ao alternar
 * entre LIVE DE ÁUDIO e APRESENTAÇÃO EM VÍDEO).
 */
export function LiveMediaBridge({ mic, cam, tela }: Props) {
  const { localParticipant } = useLocalParticipant();

  React.useEffect(() => {
    if (!localParticipant) return;
    if (!mic) return;
    void localParticipant.publishTrack(mic, { source: mic.source }).catch((e) => {
      console.error("[LiveMediaBridge] publicar microfone:", e);
    });
    return () => {
      void localParticipant.unpublishTrack(mic).catch(() => {});
    };
  }, [localParticipant, mic]);

  React.useEffect(() => {
    if (!localParticipant) return;
    if (!cam) return;
    void localParticipant.publishTrack(cam, { source: cam.source }).catch((e) => {
      console.error("[LiveMediaBridge] publicar câmera:", e);
    });
    return () => {
      void localParticipant.unpublishTrack(cam).catch(() => {});
    };
  }, [localParticipant, cam]);

  React.useEffect(() => {
    if (!localParticipant) return;
    if (tela.length === 0) return;

    const publicados: LocalTrack[] = [];
    for (const track of tela) {
      void localParticipant
        .publishTrack(track, { source: track.source })
        .then(() => publicados.push(track))
        .catch((e) => console.error("[LiveMediaBridge] publicar tela:", e));
    }

    return () => {
      for (const track of publicados) {
        void localParticipant.unpublishTrack(track).catch(() => {});
      }
    };
  }, [localParticipant, tela]);

  return null;
}
