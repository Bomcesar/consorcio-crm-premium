"use client";

import * as React from "react";
import { MonitorUp, FileText, X, Loader2, AlertTriangle } from "lucide-react";
import { useMaybeRoomContext, useTracks, VideoTrack } from "@livekit/components-react";
import { Track, LocalTrack } from "livekit-client";
import { Button } from "@/components/ui/button";
import { LivePdfViewer } from "./live-pdf-viewer";
import type { LiveApresentacao } from "@/lib/live/types";

type Props = {
  apresentacao: LiveApresentacao | null;
  url: string | null;
  souAnfitriao: boolean;
  modo: "audio" | "apresentacao";
  onMudarPagina: (pagina: number) => void;
  tela: LocalTrack[];
  onRegistrarTotal: (total: number) => void;
  onSincronizarVideo?: (reproduzindo: boolean, tempo: number) => void;
  onEncerrar: () => void;
  onSelecionarArquivo?: (arquivo: File) => Promise<void> | void;
  onIniciarTela?: () => void;
  erro?: string | null;
};

/**
 * Faixa de tela compartilhada que chega pela sala de mídia.
 *
 * O conteúdo da tela NÃO passa pelo banco: o anfitrião publica um
 * track `ScreenShare` pelo LiveKit e cada participante o recebe como
 * `RemoteTrackPublication`. Este é o mesmo padrão já usado pela sala
 * de convidados (`live-guest-room.tsx`), replicado aqui para que a
 * sala interna também o exiba.
 *
 * `useTracks` exige `RoomContext`, então este componente só é montado
 * quando há sala conectada — daí o `room` checado no pai, que mantém
 * as regras de hooks válidas e evita quebrar a apresentação quando o
 * usuário ainda não entrou na sala de áudio.
 */
function FaixaTelaRemota({
  souAnfitriao,
  tela,
}: {
  souAnfitriao: boolean;
  tela: LocalTrack[];
}) {
  const visoes = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]).filter(
    (visao): visao is typeof visao & { publication: NonNullable<typeof visao.publication> } =>
      Boolean(visao.publication),
  );

  if (visoes.length === 0) {
    if (souAnfitriao && tela.length > 0) {
      const videoLocal = tela.find((t) => t.kind === "video");
      if (videoLocal) {
        const stream = new MediaStream([videoLocal.mediaStreamTrack]);
        return (
          <div className="flex flex-col gap-3">
            <video
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
              style={{ aspectRatio: "16 / 9" }}
              ref={(el) => {
                if (el) el.srcObject = stream;
              }}
            />
          </div>
        );
      }
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p>Aguardando a faixa de tela do anfitrião...</p>
        <p className="text-xs">
          O compartilhamento foi iniciado. A imagem aparece aqui assim que a sala
          de mídia entregar o vídeo.
        </p>
      </div>
    );
  }

  return (
    // `aspectRatio` em vez de `h-full`: nenhum ancestral desta cadeia
    // tem altura definida, então `h-full` resolvia para 0 e o
    // VideoTrack era montado com 0x0 — uma caixa preta sem dimensões. Com
    // `adaptiveStream: true` em `live-room.tsx`, LiveKit ainda deixa
    // de inscrever a faixa de vídeo de elemento sem dimensão visível,
    // então o 0x0 impedia a entrega do track, não só a pintura.
    // É o mesmo padrão que funciona em `live-guest-room.tsx`.
    <div className="flex flex-col gap-3">
      {visoes.map((visao) => (
        <div key={visao.publication.trackSid ?? visao.participant.identity}>
          <VideoTrack
            trackRef={visao}
            className="w-full rounded-lg bg-black"
            style={{ aspectRatio: "16 / 9" }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * 📄 APRESENTAÇÃO
 *
 * Exibe o que o anfitrião está apresentando: tela compartilhada,
 * PDF/slides ou vídeo. A conexão de áudio permanece ativa — a
 * sala volta para LIVE DE ÁUDIO sem derrubar nada.
 */
export function LivePresentation({
  apresentacao,
  url,
  souAnfitriao,
  modo,
  tela,
  onMudarPagina,
  onRegistrarTotal,
  onSincronizarVideo,
  onEncerrar,
  onSelecionarArquivo,
  onIniciarTela,
  erro,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  // `LivePresentation` é renderizado dentro de `SalaMidia`, mas a
  // checagem mantém a tela intacta se algum dia for usado fora da
  // sala: sem `room`, a faixa remota simplesmente não aparece.
  const room = useMaybeRoomContext();

  const escolherArquivo = async (arquivo: File) => {
    if (!onSelecionarArquivo) return;
    setEnviando(true);
    try {
      await onSelecionarArquivo(arquivo);
    } finally {
      setEnviando(false);
    }
  };

  // Vídeo: sincroniza reprodução e posição sem ecoar de volta.
  const sincronizandoRef = React.useRef(false);
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el || !apresentacao) return;

    const alvo = Number(apresentacao.tempo_atual_segundos);
    if (Math.abs(el.currentTime - alvo) > 1.5) {
      sincronizandoRef.current = true;
      el.currentTime = alvo;
      window.setTimeout(() => {
        sincronizandoRef.current = false;
      }, 400);
    }

    if (apresentacao.reproduzindo && el.paused) {
      void el.play().catch(() => {
        /* autoplay bloqueado: o usuário precisa tocar uma vez */
      });
    } else if (!apresentacao.reproduzindo && !el.paused) {
      el.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apresentacao?.reproduzindo, apresentacao?.tempo_atual_segundos]);

  // Quando o modo é áudio, o anfitrião escolhe o material.
  if (modo === "audio") {
    if (souAnfitriao && (onSelecionarArquivo || onIniciarTela)) {
      return (
        <div className="space-y-2 rounded-xl border bg-card p-3">
          <p className="text-sm font-medium">📄 Apresentação</p>
          <div className="flex flex-wrap gap-2">
            {onSelecionarArquivo && (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,video/mp4,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) void escolherArquivo(arquivo);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={enviando}
                  onClick={() => inputRef.current?.click()}
                >
                  {enviando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Enviar PDF ou vídeo
                </Button>
              </>
            )}
            {onIniciarTela && (
              <Button variant="outline" size="sm" onClick={onIniciarTela}>
                <MonitorUp className="mr-2 h-4 w-4" />
                Compartilhar tela
              </Button>
            )}
          </div>
          {erro && (
            <p className="flex items-start gap-1 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {erro}
            </p>
          )}
        </div>
      );
    }
    return null;
  }

  // Modo apresentação
  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="truncate text-sm font-medium">
          {apresentacao?.tipo === "video" ? "🎬" : "📄"} {apresentacao?.titulo ?? "Apresentação"}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {apresentacao?.tipo === "screen" && (
            <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
              <MonitorUp className="h-3 w-3" /> COMPARTILHANDO TELA
            </span>
          )}
          {souAnfitriao && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEncerrar}>
              <X className="h-3.5 w-3.5" /> Encerrar
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {apresentacao?.tipo === "screen" ? (
          room ? (
            <FaixaTelaRemota souAnfitriao={souAnfitriao} tela={tela} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
              <MonitorUp className="h-6 w-6 text-primary" />
              <p>Entre na sala de áudio para ver a tela compartilhada.</p>
              <p className="text-xs">
                O vídeo da tela chega pela conexão de mídia, não pelo banco — sem ela
                não há como exibir o conteúdo.
              </p>
            </div>
          )
        ) : apresentacao?.tipo === "video" && url ? (
          <div className="flex h-full items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={url}
              controls
              playsInline
              className="max-h-full max-w-full"
              onPlay={() => {
                if (souAnfitriao && !sincronizandoRef.current) {
                  onSincronizarVideo?.(true, videoRef.current?.currentTime ?? 0);
                }
              }}
              onPause={() => {
                if (souAnfitriao && !sincronizandoRef.current) {
                  onSincronizarVideo?.(false, videoRef.current?.currentTime ?? 0);
                }
              }}
            />
          </div>
        ) : url ? (
          <LivePdfViewer
            url={url}
            titulo={apresentacao?.titulo ?? "Apresentação"}
            numeroPagina={apresentacao?.pagina_atual ?? 1}
            totalPaginas={apresentacao?.total_paginas ?? 0}
            podeControlar={souAnfitriao}
            aoMudarPagina={onMudarPagina}
            aoRegistrarTotal={onRegistrarTotal}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            Carregando arquivo da apresentação...
          </div>
        )}
      </div>

      {erro && (
        <p className="flex items-start gap-1 border-t px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}
