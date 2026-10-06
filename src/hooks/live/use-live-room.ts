"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { criarCanalLive } from "@/lib/live/realtime";
import { getParticipantes, getSolicitacoesPendentes } from "@/repositories/client/live/live-participants.repository";
import type { LiveParticipante, LiveRoom, LiveSolicitacao } from "@/lib/live/types";

/**
 * Estado da sala de live.
 *
 * Não há polling: cada tabela observada na migration de Realtime
 * alimenta o estado por `postgres_changes`. O único intervalo é o
 * heartbeat de presença, que também evita entradas fantasma.
 */
export function useLiveRoom(params: {
  liveId: string;
  souAnfitriao: boolean;
  meuUsuarioId: string | null;
}) {
  const { liveId, souAnfitriao, meuUsuarioId } = params;

  const [sala, setSala] = React.useState<LiveRoom | null>(null);
  const [participantes, setParticipantes] = React.useState<LiveParticipante[]>([]);
  const [solicitacoes, setSolicitacoes] = React.useState<LiveSolicitacao[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);

  const meu = React.useMemo(
    () => participantes.find((p) => p.usuario_id === meuUsuarioId && p.saiu_em == null) ?? null,
    [participantes, meuUsuarioId],
  );
  const meuId = meu?.id ?? null;

  const recarregarParticipantes = React.useCallback(async () => {
    try {
      setParticipantes(await getParticipantes(liveId));
    } catch (e) {
      console.error("[useLiveRoom] participantes:", e);
      setErro("falha_carregamento");
    }
  }, [liveId]);

  const recarregarSolicitacoes = React.useCallback(async () => {
    if (!souAnfitriao) return;
    try {
      setSolicitacoes(await getSolicitacoesPendentes(liveId));
    } catch (e) {
      console.error("[useLiveRoom] solicitações:", e);
    }
  }, [liveId, souAnfitriao]);

  // Carga inicial
  React.useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setCarregando(true);
      try {
        const supabase = createClient();
        const { data: salaData, error: erroSala } = await supabase
          .from("live_rooms")
          .select("*")
          .eq("id", liveId)
          .single();

        if (erroSala || !salaData) {
          if (!cancelado) setErro("falha_carregamento");
          return;
        }
        if (cancelado) return;

        setSala(salaData as LiveRoom);
        await recarregarParticipantes();
        await recarregarSolicitacoes();
      } catch (e) {
        console.error("[useLiveRoom] carga inicial:", e);
        if (!cancelado) setErro("falha_carregamento");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [liveId, recarregarParticipantes, recarregarSolicitacoes]);

  // Realtime: sala (status/modo), participantes e solicitações.
  //
  // O canal se recria sozinho quando a inscrição cai (celular em segundo
  // plano, troca de rede): antes disso a tela só voltava a reagir após
  // F5. Cada vez que a inscrição é (re)confirmada o estado é recarregado,
  // porque as mudanças que ocorreram enquanto o canal estava morto não
  // chegaram — é o que garante que "Aceitar" mude o participante para a
  // cadeira sem ele precisar sair e entrar da sala.
  React.useEffect(() => {
    let cancelar = () => {};
    cancelar = criarCanalLive({
      topic: `live:room:${liveId}`,
      assinaturas: [
        { event: "UPDATE", schema: "public", table: "live_rooms", filter: `id=eq.${liveId}` },
        {
          event: "*",
          schema: "public",
          table: "live_participantes",
          filter: `live_id=eq.${liveId}`,
        },
        {
          event: "*",
          schema: "public",
          table: "live_solicitacoes",
          filter: `live_id=eq.${liveId}`,
        },
      ],
      aoEvento: (tabela, payload) => {
        if (tabela === "live_rooms") {
          setSala((payload as { new: LiveRoom }).new as LiveRoom);
          return;
        }
        if (tabela === "live_participantes") {
          void recarregarParticipantes();
          if (souAnfitriao) void recarregarSolicitacoes();
          return;
        }
        if (souAnfitriao) void recarregarSolicitacoes();
      },
      aoReconectar: () => {
        void recarregarParticipantes();
        if (souAnfitriao) void recarregarSolicitacoes();
      },
    });
    return () => cancelar();
  }, [liveId, souAnfitriao, recarregarParticipantes, recarregarSolicitacoes]);

  // Heartbeat de presença: mantém `last_seen_at` fresco.
  React.useEffect(() => {
    if (!meuId) return;
    const bater = () => {
      const supabase = createClient();
      void supabase
        .from("live_participantes")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", meuId);
    };
    bater();
    const intervalo = setInterval(bater, 30000);
    return () => clearInterval(intervalo);
  }, [meuId]);

  return {
    sala,
    participantes,
    solicitacoes,
    carregando,
    erro,
    meu,
    meuId,
    souAnfitriao,
    emCadeira: !!meu && meu.cadeira != null,
    recarregarParticipantes,
    recarregarSolicitacoes,
    setSala,
    setParticipantes,
    setSolicitacoes,
  };
}
