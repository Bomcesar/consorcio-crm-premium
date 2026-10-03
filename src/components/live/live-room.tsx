"use client";

import * as React from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import type { RoomOptions } from "livekit-client";
import { cn } from "@/lib/utils";

export type PropsSalaMidia = {
  token: string;
  serverUrl: string;
  /**
   * Captura automática do navegador. Desligada por padrão de
   * propósito: quem controla microfone/câmera é o
   * `useLivePublicacao`, para que o convite entre silenciado e a
   * publicação só ocorra para quem está em cadeira.
   */
  audio?: boolean;
  video?: boolean;
  screen?: boolean;
  onConnected?: () => void;
  onDisconnected?: (motivo?: string) => void;
  onError?: (codigo: string) => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * Envoltório do LiveKit.
 *
 * A conexão da sala permanece ativa durante toda a sessão:
 * alternar entre LIVE DE ÁUDIO e APRESENTAÇÃO EM VÍDEO
 * nunca derruba a sala — o áudio continua durante a apresentação.
 *
 * A publicação dos tracks é feita por `LiveMediaBridge`, dentro
 * desta árvore, a partir dos tracks já capturados.
 */
export function SalaMidia({
  token,
  serverUrl,
  audio = false,
  video = false,
  screen = false,
  onConnected,
  onDisconnected,
  onError,
  children,
  className,
}: PropsSalaMidia) {
  const opcoes: RoomOptions = React.useMemo(
    () => ({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 24 },
      },
    }),
    [],
  );

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={Boolean(token && serverUrl)}
      audio={audio}
      video={video}
      screen={screen}
      options={opcoes}
      onConnected={() => onConnected?.()}
      onDisconnected={(motivo) => onDisconnected?.(String(motivo))}
      onError={(erro) => {
        console.error("[SalaMidia]", erro);
        onError?.("falha_conexao_media");
      }}
      data-lk-theme="default"
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
    >
      <RoomAudioRenderer />
      {children}
    </LiveKitRoom>
  );
}
