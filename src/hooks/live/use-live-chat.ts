"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { criarCanalLive } from "@/lib/live/realtime";
import type { LiveMensagem } from "@/lib/live/types";

/**
 * Chat da sala.
 *
 * Usuários internos: histórico pela RLS + `postgres_changes`.
 *
 * Convidados externos: NÃO têm sessão Supabase, então nunca
 * tocam nas tabelas do CRM diretamente. O histórico vem do Route
 * Handler do convite (que revalida o token no servidor) e as
 * mensagens em tempo real chegam por Broadcast no canal público
 * `live:chat-bc:<liveId>`.
 */
export function useLiveChat(params: {
  liveId: string;
  modo: "interno" | "convidado";
  tokenConvite?: string;
  meuNome?: string;
}) {
  const { liveId, modo, tokenConvite, meuNome } = params;

  const [mensagens, setMensagens] = React.useState<LiveMensagem[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);

  const recarregar = React.useCallback(async () => {
    try {
      if (modo === "convidado") {
        if (!tokenConvite) {
          setMensagens([]);
          return;
        }
        const resposta = await fetch(`/api/live/convite/${tokenConvite}/chat`, {
          cache: "no-store",
        });
        if (!resposta.ok) {
          const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
          throw new Error(corpo?.erro ?? "falha_carregamento");
        }
        const corpo = (await resposta.json()) as { mensagens?: LiveMensagem[] };
        setMensagens(
          (corpo.mensagens ?? []).map((m) => ({
            ...m,
            live_id: liveId,
            autor_convidado_hash: m.autor_usuario_id ? null : "convidado",
          })),
        );
        return;
      }

      const { getMensagens } = await import("@/repositories/client/live/live-chat.repository");
      setMensagens(await getMensagens(liveId));
    } catch (e) {
      console.error("[useLiveChat] mensagens:", e);
      setErro(e instanceof Error ? e.message : "falha_carregamento");
    } finally {
      setCarregando(false);
    }
  }, [liveId, modo, tokenConvite]);

  React.useEffect(() => {
    let cancelado = false;
    void (async () => {
      await recarregar();
      if (!cancelado) setCarregando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [recarregar]);

  /**
   * Adiciona uma mensagem ao estado local ignorando duplicatas pelo `id`.
   *
   * A mesma mensagem pode chegar por três caminhos independentes: o
   * registro otimista do próprio remetente, o `postgres_changes` e o
   * Broadcast. Comparar por `id` torna a inserção idempotente — a
   * primeira passagem vence e as seguintes viram no-op. Comparar por
   * conteúdo seria incorreto: duas mensagens legítimas podem ter
   * exatamente o mesmo texto.
   */
  const adicionarMensagem = React.useCallback((mensagem: LiveMensagem) => {
    if (!mensagem?.id) return;
    setMensagens((atuais) =>
      atuais.some((m) => m.id === mensagem.id) ? atuais : [...atuais, mensagem],
    );
  }, []);

  // Canal público de Broadcast da sala. Convidados não têm sessão
  // Supabase e não podem assinar `postgres_changes`; por isso toda
  // mensagem — inclusive as internas — é propagada aqui.
  const canalRef = React.useRef<RealtimeChannel | null>(null);

  React.useEffect(() => {
    const supabase = createClient();

    for (const canal of supabase.getChannels()) {
      if (canal.topic === `live:chat-bc:${liveId}`) supabase.removeChannel(canal);
    }

    const canal = supabase
      .channel(`live:chat-bc:${liveId}`)
      .on("broadcast", { event: "mensagem" }, ({ payload }) => {
        adicionarMensagem(payload as LiveMensagem);
      })
      .subscribe((status, erro) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(
            `[live] live:chat-bc:${liveId} perdeu a inscrição (${status}${erro ? `: ${erro.message}` : ""}).`,
          );
        }
      });

    canalRef.current = canal;

    return () => {
      canalRef.current = null;
      void supabase.removeChannel(canal);
    };
  }, [liveId, adicionarMensagem]);

  // Usuários internos: postgres_changes (RLS já restringe à sala).
  //
  // Usa o canal com auto-recuperação: quando a inscrição cai, o
  // histórico é recarregado na reconexão, porque as mensagens
  // publicadas enquanto o canal estava morto não chegaram.
  React.useEffect(() => {
    if (modo !== "interno") return;
    return criarCanalLive({
      topic: `live:chat-db:${liveId}`,
      assinaturas: [
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_mensagens",
          filter: `live_id=eq.${liveId}`,
        },
      ],
      aoEvento: (_tabela, payload) => {
        adicionarMensagem((payload as { new: LiveMensagem }).new);
      },
      aoReconectar: () => {
        void recarregar();
      },
    });
  }, [liveId, modo, adicionarMensagem, recarregar]);

  const enviar = React.useCallback(
    async (mensagem: string) => {
      if (modo === "interno") {
        const { enviarMensagem } = await import(
          "@/repositories/client/live/live-chat.repository"
        );
        const gravada = await enviarMensagem(liveId, mensagem);
        // Registro otimista: o remetente vê a própria mensagem na hora.
        // O Broadcast não faz eco a quem enviou, e o postgres_changes só
        // voltaria por propagação do canal Realtime — sem isso a mensagem
        // só aparecia depois de um recarregamento.
        adicionarMensagem(gravada);
        // Espelha no canal público para que os convidados externos
        // recebam a mensagem: eles não escutam postgres_changes.
        await canalRef.current
          ?.send({ type: "broadcast", event: "mensagem", payload: gravada })
          .catch((e) => console.error("[useLiveChat] broadcast:", e));
        return;
      }

      if (!tokenConvite) return;
      const resposta = await fetch(`/api/live/convite/${tokenConvite}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem, nome: meuNome ?? "" }),
      });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(corpo?.erro ?? "falha_carregamento");
      }
    },
    [liveId, modo, meuNome, tokenConvite, adicionarMensagem],
  );

  return { mensagens, carregando, erro, enviar, recarregar };
}
