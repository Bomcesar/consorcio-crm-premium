import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type AssinaturaLive = {
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema: string;
  table: string;
  filter?: string;
};

type PayloadPostgres = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: unknown;
  old: unknown;
};

/**
 * Subconjunto da API do canal usada aqui, declarada localmente para
 * não depender das sobrecargas condicionais de `RealtimeChannel["on"]`.
 */
type CanalPostgres = {
  on(
    tipo: "postgres_changes",
    filtro: AssinaturaLive,
    cb: (payload: PayloadPostgres) => void,
  ): CanalPostgres;
  subscribe(cb?: (status: string, erro?: Error) => void): CanalPostgres;
  unsubscribe(): void;
};

/**
 * Canal Realtime com recuperação automática.
 *
 * Sem isto a falha é silenciosa: `channel().subscribe()` não recebe
 * callback em lugar nenhum do módulo, então quando o WebSocket cai
 * (celular em segundo plano, troca de rede, proxy) o canal fica morto
 * e nenhum `postgres_changes` chega. A tela só volta a reagir depois de
 * um F5, que recria o socket do zero — era o sintoma de "o anfitrião
 * não vê nada até atualizar a página".
 *
 * Aqui o `subscribe` recebe o status, e canal fechado, expirado ou com
 * erro é removido e recriado com espera exponencial. `aoReconectar` roda
 * a cada inscrição confirmada, permitindo reidratar o estado: as
 * mudanças que o servidor aplicou enquanto o canal estava morto não
 * chegam como evento, e sem essa reidratação elas só apareceriam no
 * próximo F5.
 */
export function criarCanalLive(params: {
  topic: string;
  assinaturas: AssinaturaLive[];
  aoEvento: (tabela: string, payload: PayloadPostgres) => void;
  aoReconectar?: () => void;
}): () => void {
  const { topic, assinaturas, aoEvento, aoReconectar } = params;
  const supabase: SupabaseClient = createClient();

  let canal: RealtimeChannel | null = null;
  let encerrado = false;
  let geracao = 0;
  let tentativas = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancelarTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const recriar = () => {
    if (encerrado) return;
    cancelarTimer();

    // Cada canal só responde à própria geração. Sem isso, o
    // `unsubscribe()` do canal que estou aposentando dispara o callback de
    // `subscribe()` dele com CLOSED (é o que o realtime-js faz — ver
    // `RealtimeChannel.unsubscribe()`), e esse callback, vendo
    // `encerrado === false`, agendava OUTRA recriação. O resultado
    // era um ciclo autoalimentado de 2s → 4s → 8s → 15s que nunca
    // voltava a ser inscribed.
    const minhaGeracao = ++geracao;

    const anterior = canal;
    canal = null;
    if (anterior) {
      anterior.unsubscribe();
      void supabase.removeChannel(anterior);
    }

    const novo = supabase.channel(topic) as unknown as CanalPostgres;

    for (const assinatura of assinaturas) {
      novo.on(
        "postgres_changes",
        assinatura,
        (payload) => {
          tentativas = 0;
          aoEvento(assinatura.table, payload);
        },
      );
    }

    canal = novo as unknown as RealtimeChannel;

    novo.subscribe((status, erro) => {
      // `encerrado`: desmontagem real. `minhaGeracao !== geracao`:
      // canal que nós mesmos aposentamos — a falha dele não conta.
      if (encerrado || minhaGeracao !== geracao) return;

      if (status === "SUBSCRIBED") {
        if (tentativas > 0) {
          console.info(`[live] ${topic} reinscrita após ${tentativas} falha(s).`);
        }
        tentativas = 0;
        aoReconectar?.();
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        tentativas += 1;
        const espera = Math.min(1000 * 2 ** Math.min(tentativas, 4), 15000);
        if (tentativas <= 3) {
          console.warn(
            `[live] ${topic} perdeu a inscrição (${status}${erro ? `: ${erro.message}` : ""}). ` +
              `Recriando em ${espera}ms — tentativa ${tentativas}.`,
          );
        }
        timer = setTimeout(recriar, espera);
      }
    });
  };

  recriar();

  return () => {
    encerrado = true;
    cancelarTimer();
    const atual = canal;
    canal = null;
    if (atual) {
      atual.unsubscribe();
      void supabase.removeChannel(atual);
    }
  };
}