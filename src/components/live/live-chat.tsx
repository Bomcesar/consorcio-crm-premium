"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, SendHorizonal, Smile } from "lucide-react";
import { formatHora, iniciais } from "@/lib/live/format";
import { LIVE_MENSAGEM_MAX } from "@/lib/live/types";
import type { LiveMensagem } from "@/lib/live/types";

const EMOJIS = [
  "👍", "👏", "❤️", "🔥", "🎉", "🙏", "💪", "🤝",
  "😀", "😅", "😍", "🤔", "😮", "😢", "🤯", "🥳",
  "🎯", "💯", "✅", "❌", "⭐", "💡", "⚡", "🚀",
] as const;

type Props = {
  mensagens: LiveMensagem[];
  aoEnviar: (texto: string) => Promise<void>;
  bloqueado?: boolean;
  alturaMaxima?: string;
  className?: string;
};

/**
 * Chat com rolagem independente.
 *
 * Novas mensagens só forçam rolagem quando o usuário já está no
 * fim da conversa: lendo mensagens antigas, a posição é preservada.
 */
export function LiveChat({
  mensagens,
  aoEnviar,
  bloqueado = false,
  alturaMaxima = "h-72",
  className,
}: Props) {
  const [texto, setTexto] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [emojiAberto, setEmojiAberto] = React.useState(false);

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [noFim, setNoFim] = React.useState(true);

  const total = mensagens.length;

  const aoRolar = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distancia = el.scrollHeight - el.scrollTop - el.clientHeight;
    setNoFim(distancia < 60);
  }, []);

  // Rolagem automática apenas se o usuário já estava no fim
  React.useEffect(() => {
    if (!noFim) return;
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [total, noFim]);

  const enviar = React.useCallback(async () => {
    const mensagem = texto.trim();
    if (!mensagem || enviando) return;
    setEnviando(true);
    try {
      await aoEnviar(mensagem);
      setTexto("");
      const el = viewportRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      /* a mensagem de erro é exibida pelo chamador */
    } finally {
      setEnviando(false);
    }
  }, [texto, aoEnviar, enviando]);

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border bg-card", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">💬 Chat</span>
        <span className="text-xs text-muted-foreground">{mensagens.length}</span>
      </div>

      <div
        ref={viewportRef}
        onScroll={aoRolar}
        className={cn("scrollbar-thin overflow-y-auto px-3 py-2", alturaMaxima)}
      >
        {mensagens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda. Comece a conversa.
          </p>
        ) : (
          <ul className="space-y-2">
            {mensagens.map((m) => (
              <li key={m.id} className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">
                    {m.autor_usuario_id ? iniciais(m.nome_exibicao) : <Gift className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-xs font-medium">{m.nome_exibicao}</span>
                    {m.perfil && (
                      <span className="text-[10px] text-muted-foreground">{m.perfil}</span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatHora(m.created_at)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "whitespace-pre-wrap break-words text-sm",
                      m.tipo === "presente" && "font-medium text-amber-600 dark:text-amber-400",
                      m.tipo === "sistema" && "text-xs italic text-muted-foreground",
                    )}
                  >
                    {m.mensagem}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative border-t p-2">
        {emojiAberto && (
          <div className="absolute bottom-full left-2 z-10 mb-1 grid w-56 grid-cols-8 gap-1 rounded-lg border bg-popover p-2 shadow-lg">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEmojiAberto((v) => !v)}
            disabled={bloqueado}
            aria-label="Emojis"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, LIVE_MENSAGEM_MAX))}
            placeholder={bloqueado ? "Chat indisponível" : "Enviar mensagem..."}
            disabled={bloqueado}
            className="h-9"
          />
          <Button type="submit" size="icon" disabled={bloqueado || !texto.trim() || enviando}>
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
