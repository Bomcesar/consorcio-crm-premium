"use client";

import * as React from "react";
import { criarCanalLive } from "@/lib/live/realtime";
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
  /** A URL assinada não pôde ser gerada: a tela mostra
   *  erro com retry em vez de "carregando" para sempre. */
  const [falhaUrl, setFalhaUrl] = React.useState(false);
  const [enviandoLink, setEnviandoLink] = React.useState(false);

  /**
   * Caminho cuja URL já foi assinada.
   *
   * `createSignedUrl` gera um token NOVO a cada chamada. Se a
   * assinatura fosse refeita a cada evento, dois custos apareceriam:
   * uma requisição de storage por participante por evento, e — pior —
   * o `src` do `<video>` mudaria de valor, recarregando o elemento e
   * zerando a reprodução de todos a cada sincronização de play/pause.
   * Assinar uma vez por caminho elimina os dois.
   */
  const caminhoAssinado = React.useRef<string | null>(null);

  const resolverCaminho = React.useCallback(async (caminho: string | null) => {
    if (!caminho) {
      caminhoAssinado.current = null;
      setUrl(null);
      setFalhaUrl(false);
      return;
    }
    if (caminhoAssinado.current === caminho) return;
    caminhoAssinado.current = caminho;
    const assinada = await getUrlApresentacao(caminho);
    setUrl(assinada);
    setFalhaUrl(!assinada);
  }, []);

  const carregar = React.useCallback(async () => {
    // Reseta a URL assinada: o token expira e a tentativa
    // de novo precisa de uma assinatura fresca.
    caminhoAssinado.current = null;
    try {
      const atual = await getApresentacaoAtiva(liveId);
      setApresentacao(atual);
      await resolverCaminho(atual?.caminho ?? null);
    } catch (e) {
      console.error("[useLiveApresentacao]:", e);
      setErro("falha_apresentacao");
    } finally {
      setCarregando(false);
    }
  }, [liveId, resolverCaminho]);

  React.useEffect(() => {
    void carregar();
  }, [carregar]);

  React.useEffect(
    () =>
      criarCanalLive({
        topic: `live:apresentacao:${liveId}`,
        assinaturas: [
          {
            event: "*",
            schema: "public",
            table: "live_apresentacoes",
            filter: `live_id=eq.${liveId}`,
          },
        ],
        aoEvento: async (_tabela, payload) => {
          const evento = payload as { new: LiveApresentacao; eventType: string };
          if (evento.eventType === "DELETE") {
            setApresentacao(null);
            await resolverCaminho(null);
            return;
          }
          const linha = evento.new;
          setApresentacao(linha);
          await resolverCaminho(linha.caminho);
        },
        aoReconectar: () => {
          void carregar();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveId],
  );

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
      // O picker de arquivos do celular (especialmente ao
      // baixar do Google Drive) costuma devolver
      // `application/octet-stream`. Classificar só por
      // MIME fazia um PDF virar "video" e a tela travava
      // em carregamento infinito. A extensão é a fonte
      // de verdade quando o MIME não ajuda.
      const nome = arquivo.name.toLowerCase();
      const tipo: Exclude<LiveTipoApresentacao, "screen"> =
        arquivo.type.toLowerCase().includes("pdf") || nome.endsWith(".pdf")
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

  /**
   * Abre um link externo (Google Drive ou URL direta).
   * O download acontece no servidor (`/api/live/apresentacao/link`):
   * o navegador não consegue buscar o Drive (CORS) e o
   * pdf.js exige mesma origem. O arquivo baixado vira uma
   * apresentação normal, com URL assinada para todos.
   */
  const abrirLink = React.useCallback(
    async (link: string) => {
      if (!souAnfitriao) return null;
      setErro(null);
      setEnviandoLink(true);
      try {
        const resposta = await fetch("/api/live/apresentacao/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liveId, url: link.trim() }),
        });
        const corpo = (await resposta.json().catch(() => null)) as
          | { erro?: string }
          | null;

        if (!resposta.ok) {
          throw new Error(corpo?.erro ?? "falha_apresentacao");
        }
        await carregar();
        return true;
      } catch (e) {
        const codigo = e instanceof Error ? e.message : "falha_apresentacao";
        setErro(codigo);
        return null;
      } finally {
        setEnviandoLink(false);
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
      await resolverCaminho(null);
    } catch (e) {
      console.error("[useLiveApresentacao] encerrar:", e);
    }
  }, [apresentacao, resolverCaminho]);

  return {
    apresentacao,
    url,
    carregando,
    erro,
    setErro,
    falhaUrl,
    enviandoLink,
    irParaPagina,
    definirTotalPaginas,
    sincronizarReproducao,
    abrirArquivo,
    abrirLink,
    iniciarTela,
    encerrar,
    recarregar: carregar,
  };
}
