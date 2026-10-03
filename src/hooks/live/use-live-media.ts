"use client";

import * as React from "react";
import {
  createLocalAudioTrack,
  createLocalScreenTracks,
  createLocalVideoTrack,
  type LocalAudioTrack,
  type LocalTrack,
  type LocalVideoTrack,
} from "livekit-client";
import { mapearErroDeMidia, suportaCompartilhamentoDeTela } from "@/lib/live/erros";

export type ConexaoMedia =
  | "desconectado"
  | "conectando"
  | "conectado"
  | "reconectando"
  | "erro";

export type CredencialLive = {
  token: string;
  url: string;
  tipo: "anfitriao" | "participante" | "ouvinte";
  podePublicar: boolean;
};

export type FalhaMedia = { codigo: string; mensagem?: string } | null;

export type MidiaPublicada = {
  mic: LocalAudioTrack | null;
  cam: LocalVideoTrack | null;
  tela: LocalTrack[];
};

/**
 * Emissão do token de mídia.
 *
 * O token é obtido exclusivamente do servidor (`/api/live/token`):
 * a chave secreta do LiveKit nunca chega ao navegador. O servidor
 * decide se o usuário pode publicar (só quem está em cadeira).
 */
export function useLiveCredencial(liveId: string) {
  const [credencial, setCredencial] = React.useState<CredencialLive | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [falha, setFalha] = React.useState<FalhaMedia>(null);

  const conectar = React.useCallback(async () => {
    setCarregando(true);
    setFalha(null);
    try {
      const resposta = await fetch("/api/live/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveId }),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        | (Partial<CredencialLive> & { erro?: string; mensagem?: string })
        | null;

      if (!resposta.ok || !corpo?.token || !corpo.url) {
        setFalha({ codigo: corpo?.erro ?? "falha_emissao_token", mensagem: corpo?.mensagem });
        return false;
      }

      setCredencial({
        token: corpo.token,
        url: corpo.url,
        tipo: (corpo.tipo as CredencialLive["tipo"]) ?? "ouvinte",
        podePublicar: corpo.podePublicar === true,
      });
      return true;
    } catch (e) {
      console.error("[useLiveCredencial] conectar:", e);
      setFalha({ codigo: "falha_emissao_token" });
      return false;
    } finally {
      setCarregando(false);
    }
  }, [liveId]);

  return { credencial, carregando, falha, setFalha, conectar, setCredencial };
}

/**
 * Publicação de mídia local com tratamento de permissões.
 *
 * Os tracks são reais do LiveKit (WebRTC): o áudio gravado é
 * publicado no SFU e chega aos demais participantes. Convidados
 * externos recebem `canPublish: false`, então a publicação é
 * recusada pelo servidor mesmo que o frontend seja adulterado.
 *
 * Cada falha vira um código do catálogo `LIVE_ERROS`, exibido
 * com mensagem clara e ação de recuperação.
 */
export function useLivePublicacao(params: { podePublicar: boolean }) {
  const { podePublicar } = params;

  const [mic, setMic] = React.useState<LocalAudioTrack | null>(null);
  const [cam, setCam] = React.useState<LocalVideoTrack | null>(null);
  const [tela, setTela] = React.useState<LocalTrack[]>([]);

  const [microfoneAtivo, setMicrofoneAtivo] = React.useState(false);
  const [cameraAtiva, setCameraAtiva] = React.useState(false);
  const [compartilhandoTela, setCompartilhandoTela] = React.useState(false);
  const [falha, setFalha] = React.useState<FalhaMedia>(null);
  const [erroApresentacao, setErroApresentacao] = React.useState<string | null>(null);

  const desligarMicrofone = React.useCallback(() => {
    setMic((atual) => {
      atual?.stop();
      return null;
    });
    setMicrofoneAtivo(false);
  }, []);

  const desligarCamera = React.useCallback(() => {
    setCam((atual) => {
      atual?.stop();
      return null;
    });
    setCameraAtiva(false);
  }, []);

  const pararCompartilhamento = React.useCallback(() => {
    setTela((atuais) => {
      for (const t of atuais) t.stop();
      return [];
    });
    setCompartilhandoTela(false);
  }, []);

  // Perdeu o direito de publicar (saiu da cadeira, bloqueio, live encerrada)
  React.useEffect(() => {
    if (podePublicar) return;
    desligarMicrofone();
    desligarCamera();
    pararCompartilhamento();
  }, [podePublicar, desligarMicrofone, desligarCamera, pararCompartilhamento]);

  const ligarMicrofone = React.useCallback(async () => {
    if (!podePublicar) {
      setFalha({ codigo: "sem_permissao" });
      return null;
    }
    try {
      setFalha(null);
      const track = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      setMic((anterior) => {
        anterior?.stop();
        return track;
      });
      setMicrofoneAtivo(true);
      return track;
    } catch (e) {
      setFalha({ codigo: mapearErroDeMidia(e) });
      return null;
    }
  }, [podePublicar]);

  const ligarCamera = React.useCallback(async () => {
    if (!podePublicar) {
      setFalha({ codigo: "sem_permissao" });
      return null;
    }
    try {
      setFalha(null);
      const track = await createLocalVideoTrack({
        resolution: { width: 1280, height: 720, frameRate: 24 },
      });
      setCam((anterior) => {
        anterior?.stop();
        return track;
      });
      setCameraAtiva(true);
      return track;
    } catch (e) {
      const codigo = mapearErroDeMidia(e);
      setFalha({ codigo: codigo === "microfone_negado" ? "camera_negada" : codigo });
      return null;
    }
  }, [podePublicar]);

  const iniciarCompartilhamento = React.useCallback(async () => {
    if (!suportaCompartilhamentoDeTela()) {
      setErroApresentacao("tela_nao_suportada");
      return null;
    }
    try {
      setErroApresentacao(null);
      const tracks = await createLocalScreenTracks({ audio: true, video: true });
      setTela(atuais => {
        for (const t of atuais) t.stop();
        return tracks;
      });
      setCompartilhandoTela(true);
      return tracks;
    } catch (e) {
      const nome = (e as { name?: string })?.name ?? "";
      setErroApresentacao(
        nome === "NotAllowedError" || nome === "AbortError"
          ? "tela_compartilhamento_negado"
          : "falha_apresentacao",
      );
      return null;
    }
  }, []);

  // O usuário encerra o compartilhamento pela barra do navegador
  React.useEffect(() => {
    const primeiro = tela.find((t) => t.kind === "video");
    if (!primeiro) return;
    const aoParar = () => {
      setCompartilhandoTela(false);
      setTela((atuais) => {
        for (const t of atuais) t.stop();
        return [];
      });
    };
    primeiro.mediaStreamTrack?.addEventListener("ended", aoParar);
    return () => primeiro.mediaStreamTrack?.removeEventListener("ended", aoParar);
  }, [tela]);

  const fluxoLocal = React.useMemo<MediaStream | null>(() => {
    const m = mic?.mediaStreamTrack;
    return m && "mediaStream" in m ? (m.mediaStream as MediaStream) : null;
  }, [mic]);

  return {
    mic,
    cam,
    tela,
    microfoneAtivo,
    cameraAtiva,
    compartilhandoTela,
    falha,
    setFalha,
    erroApresentacao,
    setErroApresentacao,
    fluxoLocal,
    ligarMicrofone,
    desligarMicrofone,
    ligarCamera,
    desligarCamera,
    iniciarCompartilhamento,
    pararCompartilhamento,
    suportaTela: suportaCompartilhamentoDeTela(),
  };
}

/**
 * Indicador de fala de UM fluxo, via Web Audio API.
 * Não é estimativa visual: mede o volume real do track.
 */
export function useIndicadorDeFala(fluxo: MediaStream | null, ativo: boolean) {
  const [falando, setFalando] = React.useState(false);

  React.useEffect(() => {
    if (!fluxo || !ativo) {
      setFalando(false);
      return;
    }

    let ctx: AudioContext | null = null;
    let fonte: MediaStreamAudioSourceNode | null = null;
    let analisador: AnalyserNode | null = null;
    let raf = 0;
    let ativoLoop = true;

    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      ctx = new Ctor();
      fonte = ctx.createMediaStreamSource(fluxo);
      analisador = ctx.createAnalyser();
      analisador.fftSize = 512;
      analisador.smoothingTimeConstant = 0.6;
      fonte.connect(analisador);

      const dados = new Uint8Array(analisador.frequencyBinCount);

      const medir = () => {
        if (!ativoLoop || !analisador) return;
        analisador.getByteFrequencyData(dados);
        let soma = 0;
        for (let i = 0; i < dados.length; i += 1) soma += dados[i] ?? 0;
        setFalando(soma / dados.length > 12);
        raf = requestAnimationFrame(medir);
      };

      raf = requestAnimationFrame(medir);
    } catch (e) {
      console.error("[useIndicadorDeFala]:", e);
    }

    return () => {
      ativoLoop = false;
      cancelAnimationFrame(raf);
      try {
        fonte?.disconnect();
        analisador?.disconnect();
        void ctx?.close();
      } catch {
        /* já encerrado */
      }
    };
  }, [fluxo, ativo]);

  return falando;
}
