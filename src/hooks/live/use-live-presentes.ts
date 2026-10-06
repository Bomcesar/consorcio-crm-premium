"use client";

import * as React from "react";
import { criarCanalLive } from "@/lib/live/realtime";
import { getEnviosDaSala, enviarPresente } from "@/repositories/client/live/live-presentes.repository";
import type { LivePresente, LivePresenteEnvio, LiveParticipante } from "@/lib/live/types";

export type PresenteParaEnviar = {
  presente: LivePresente;
  destinatario: LiveParticipante;
};

/**
 * Presentes da sala.
 *
 * O presente é uma representação de crédito vinculada a quem está
 * na cadeira — não é transferência financeira. Não existe carteira,
 * saldo, pagamento ou integração com gateway neste módulo.
 *
 * O envio só é aceito pelo banco quando o destinatário ocupa uma
 * cadeira ativa (trigger `live_presentes_destinatario_em_cadeira`).
 */
export function useLivePresentes(params: { liveId: string }) {
  const { liveId } = params;

  const [envios, setEnvios] = React.useState<LivePresenteEnvio[]>([]);
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [celebracao, setCelebracao] = React.useState<PresenteParaEnviar | null>(null);

  const recarregar = React.useCallback(async () => {
    try {
      setEnvios(await getEnviosDaSala(liveId));
    } catch (e) {
      console.error("[useLivePresentes] envios:", e);
    }
  }, [liveId]);

  React.useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Tempo real: os presentes enviados aparecem nas cadeiras
  React.useEffect(
    () =>
      criarCanalLive({
        topic: `live:presentes:${liveId}`,
        assinaturas: [
          {
            event: "INSERT",
            schema: "public",
            table: "live_presentes_envios",
            filter: `live_id=eq.${liveId}`,
          },
        ],
        aoEvento: (_tabela, payload) => {
          const envio = (payload as { new: LivePresenteEnvio }).new;
          setEnvios((atuais) =>
            atuais.some((e) => e.id === envio.id) ? atuais : [envio, ...atuais],
          );
        },
        aoReconectar: () => {
          void recarregar();
        },
      }),
    [liveId, recarregar],
  );

  const enviar = React.useCallback(
    async (destinatario: LiveParticipante, presente: LivePresente) => {
      setEnviando(true);
      setErro(null);
      try {
        const registro = await enviarPresente({
          liveId,
          presenteId: presente.id,
          destinatarioParticipanteId: destinatario.id,
        });

        setEnvios((atuais) =>
          atuais.some((e) => e.id === registro.id) ? atuais : [registro, ...atuais],
        );
        // animação discreta: some sozinha após alguns segundos
        setCelebracao({ presente, destinatario });
        window.setTimeout(() => setCelebracao(null), 6000);
        return true;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "falha_envio_presente");
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [liveId],
  );

  const porParticipante = React.useMemo(() => {
    const mapa = new Map<string, LivePresenteEnvio[]>();
    for (const envio of envios) {
      const lista = mapa.get(envio.destinatario_participante_id) ?? [];
      lista.push(envio);
      mapa.set(envio.destinatario_participante_id, lista);
    }
    return mapa;
  }, [envios]);

  const totalDe = React.useCallback(
    (participanteId: string) => {
      const lista = porParticipante.get(participanteId) ?? [];
      return lista.reduce((soma, e) => soma + Number(e.valor_credito_representado ?? 0), 0);
    },
    [porParticipante],
  );

  const quantidadeDe = React.useCallback(
    (participanteId: string) => (porParticipante.get(participanteId) ?? []).length,
    [porParticipante],
  );

  return {
    envios,
    enviando,
    erro,
    setErro,
    celebracao,
    setCelebracao,
    enviar,
    recarregar,
    porParticipante,
    totalDe,
    quantidadeDe,
  };
}
