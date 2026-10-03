"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import {
  atualizarApresentacao,
  encerrarApresentacao,
  getApresentacaoAtiva,
  getUrlApresentacao,
  iniciarApresentacao,
  enviarArquivoApresentacao,
} from "@/repositories/client/live/live-apresentacoes.repository";
import type { LiveApresentacao, LiveTipoApresentacao } from "@/lib/live/types";

/**
 * Estado da apresentação (PDF, slides, vídeo).
 *
 * A página atual é sincronizada por Realtime em
 * `live_apresentacoes.pagina_atual`: todos os espectadores veem
 * exatamente a mesma página. Não há polling.
 */
export function useLiveApresentacao(params: { liveId: string; souAnfitriao: boolean }) {
  const { liveId, souAnfitriao } = params;

  const [apresentacao, setApresentacao] = React.useState<LiveApresentacao | null>(null);
  const [url, setUrl] = React.useState<string | null>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);

  const carregar = React.useCallback(async () => {
    try {
      const atual = await getApresentacaoAtiva(liveId);
      setApresentacao(atual);
      if (atual?.caminho) {
        setUrl(await getUrlApresentacao(atual.caminho));
      } else {
        setUrl(null);
      }
    } catch (e) {
      console.error("[useLiveApresentacao]:", e);
      setErro("falha_apresentacao");
    } finally {
      setCarregando(false);
    }
  }, [liveId]);

  React.useEffect(() => {
    void carregar();
  }, [carregar]);

  React.useEffect(() => {
    const supabase = createClient();

    for (const canal of supabase.getChannels()) {
      if (canal.topic === `live:apresentacao:${liveId}`) supabase.removeChannel(canal);
    }

    const canal = supabase
      .channel(`live:apresentacao:${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_apresentacoes",
          filter: `live_id=eq.${liveId}`,
        },
        async (payload) => {
          const linha = payload.new as LiveApresentacao;
          if (payload.eventType === "DELETE") {
            setApresentacao(null);
            setUrl(null);
            return;
          }
          setApresentacao(linha);
          if (linha.caminho && linha.caminho !== url) {
            setUrl(await getUrlApresentacao(linha.caminho));
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  const irParaPagina = React.useCallback(
    async (pagina: number) => {
      if (!apresentacao) return;
      const alvo = Math.min(Math.max(1, pagina), Math.max(1, apresentacao.total_paginas || 1));
      setApresentacao({ ...apresentacao, pagina_atual: alvo });
      try {
        await atualizarApresentacao(apresentacao.id, { pagina_atual: alvo });
      } catch (e) {
        console.error("[useLiveApresentacao] irParaPagina:", e);
      }
    },
    [apresentacao],
  );

  const definirTotalPaginas = React.useCallback(
    async (total: number) => {
      if (!apresentacao || apresentacao.total_paginas === total) return;
      try {
        await atualizarApresentacao(apresentacao.id, { total_paginas: total });
      } catch (e) {
        console.error("[useLiveApresentacao] definirTotalPaginas:", e);
      }
    },
    [apresentacao],
  );

  const sincronizarReproducao = React.useCallback(
    async (reproduzindo: boolean, tempo: number) => {
      if (!apresentacao) return;
      setApresentacao({
        ...apresentacao,
        reproduzindo,
        tempo_atual_segundos: Math.round(tempo * 100) / 100,
      });
      try {
        await atualizarApresentacao(apresentacao.id, {
          reproduzindo,
          tempo_atual_segundos: Math.round(tempo * 100) / 100,
        });
      } catch (e) {
        console.error("[useLiveApresentacao] sincronizarReproducao:", e);
      }
    },
    [apresentacao],
  );

  const abrirArquivo = React.useCallback(
    async (arquivo: File) => {
      if (!souAnfitriao) return null;
      setErro(null);
      const tipo: Exclude<LiveTipoApresentacao, "screen"> = arquivo.type === "application/pdf"
        ? "pdf"
        : "video";
      try {
        const registro = await iniciarApresentacao({
          liveId,
          tipo,
          titulo: arquivo.name,
        });
        const { caminho } = await enviarArquivoApresentacao({
          liveId,
          livePresentationId: registro.id,
          arquivo,
          tipo,
        });
        await carregar();
        return caminho;
      } catch (e) {
        const codigo = e instanceof Error ? e.message : "falha_apresentacao";
        setErro(codigo);
        return null;
      }
    },
    [liveId, souAnfitriao, carregar],
  );

  const iniciarTela = React.useCallback(async () => {
    if (!souAnfitriao) return null;
    try {
      await iniciarApresentacao({ liveId, tipo: "screen", titulo: "Tela do anfitrião" });
      await carregar();
    } catch (e) {
      console.error("[useLiveApresentacao] iniciarTela:", e);
      setErro("falha_apresentacao");
    }
    return null;
  }, [liveId, souAnfitriao, carregar]);

  const encerrar = React.useCallback(async () => {
    if (!apresentacao) return;
    try {
      await encerrarApresentacao(apresentacao.id);
      setApresentacao(null);
      setUrl(null);
    } catch (e) {
      console.error("[useLiveApresentacao] encerrar:", e);
    }
  }, [apresentacao]);

  return {
    apresentacao,
    url,
    carregando,
    erro,
    setErro,
    irParaPagina,
    definirTotalPaginas,
    sincronizarReproducao,
    abrirArquivo,
    iniciarTela,
    encerrar,
    recarregar: carregar,
  };
}
