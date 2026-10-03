"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
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
        const mensagem = payload as LiveMensagem;
        if (!mensagem?.id) return;
        setMensagens((atuais) =>
          atuais.some((m) => m.id === mensagem.id) ? atuais : [...atuais, mensagem],
        );
      })
      .subscribe();

    canalRef.current = canal;

    return () => {
      canalRef.current = null;
      void supabase.removeChannel(canal);
    };
  }, [liveId]);

  // Usuários internos: postgres_changes (RLS já restringe à sala)
  React.useEffect(() => {
    if (modo !== "interno") return;
    const supabase = createClient();

    for (const canal of supabase.getChannels()) {
      if (canal.topic === `live:chat-db:${liveId}`) supabase.removeChannel(canal);
    }

    const canal = supabase
      .channel(`live:chat-db:${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_mensagens",
          filter: `live_id=eq.${liveId}`,
        },
        (payload) => {
          const mensagem = payload.new as LiveMensagem;
          setMensagens((atuais) =>
            atuais.some((m) => m.id === mensagem.id) ? atuais : [...atuais, mensagem],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [liveId, modo]);

  const enviar = React.useCallback(
    async (mensagem: string) => {
      if (modo === "interno") {
        const { enviarMensagem } = await import(
          "@/repositories/client/live/live-chat.repository"
        );
        const gravada = await enviarMensagem(liveId, mensagem);
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
    [liveId, modo, meuNome, tokenConvite],
  );

  return { mensagens, carregando, erro, enviar, recarregar };
}
