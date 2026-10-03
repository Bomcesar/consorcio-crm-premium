"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, SendHorizonal, Smile } from "lucide-react";
import { useLiveChat } from "@/hooks/live/use-live-chat";
import { formatHora, iniciais } from "@/lib/live/format";
import { LIVE_MENSAGEM_MAX } from "@/lib/live/types";

const EMOJIS = ["👍", "👏", "❤️", "🔥", "🎉", "🙏", "😀", "😍", "🤝", "💯", "⭐", "🚀"] as const;

type Props = {
  token: string;
  nome: string;
  liveId: string;
};

/**
 * Chat do convidado externo.
 *
 * Não há sessão Supabase: as mensagens chegam por Broadcast e a
 * escrita passa pelo Route Handler do convite, que revalida o
 * token a cada envio.
 */
export function LiveGuestChat({ token, nome, liveId }: Props) {
  const chat = useLiveChat({ liveId, modo: "convidado", tokenConvite: token, meuNome: nome });
  const [texto, setTexto] = React.useState("");
  const [emojiAberto, setEmojiAberto] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [noFim, setNoFim] = React.useState(true);

  const aoRolar = () => {
    const el = viewportRef.current;
    if (!el) return;
    setNoFim(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  React.useEffect(() => {
    if (!noFim) return;
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.mensagens.length, noFim]);

  const enviar = async () => {
    const mensagem = texto.trim();
    if (!mensagem) return;
    setErro(null);
    try {
      await chat.enviar(mensagem);
      setTexto("");
      const el = viewportRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a mensagem.");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">💬 Chat</span>
        <span className="text-xs text-muted-foreground">convidado</span>
      </div>

      <div
        ref={viewportRef}
        onScroll={aoRolar}
        className="scrollbar-thin max-h-72 overflow-y-auto px-3 py-2"
      >
        {chat.mensagens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {chat.mensagens.map((m) => (
              <li key={m.id} className="flex gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                  {iniciais(m.nome_exibicao)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-xs font-medium">{m.nome_exibicao}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatHora(m.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{m.mensagem}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative border-t p-2">
        {emojiAberto && (
          <div className="absolute bottom-full left-2 z-10 mb-1 grid w-48 grid-cols-6 gap-1 rounded-lg border bg-popover p-2 shadow-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setTexto((t) => `${t}${e}`);
                  setEmojiAberto(false);
                }}
                className="rounded p-1 text-lg hover:bg-muted"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
          className="flex items-center gap-1"
        >
          <Button type="button" variant="ghost" size="icon" onClick={() => setEmojiAberto((v) => !v)}>
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LIVE_MENSAGEM_MAX))}
            placeholder="Enviar mensagem..."
            className="h-9"
          />
          <Button type="submit" size="icon" disabled={!texto.trim()}>
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>

        {erro && (
          <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <Gift className="h-3 w-3" />
            {erro.includes("live_encerrada")
              ? "Esta Live foi encerrada."
              : erro.includes("revogado")
                ? "Seu convite foi revogado."
                : erro.includes("expirado")
                  ? "Seu convite expirou."
                  : "Não foi possível enviar a mensagem."}
          </p>
        )}
      </div>
    </div>
  );
}
