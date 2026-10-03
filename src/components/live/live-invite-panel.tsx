"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Link2, Loader2, Users, Ban } from "lucide-react";
import {
  criarConvite,
  getConvites,
  revogarConvite,
} from "@/repositories/client/live/live-invites.repository";
import { formatDataHora } from "@/lib/live/format";
import type { LiveConvite } from "@/lib/live/types";

type Props = {
  liveId: string;
};

/**
 * 🔗 LINKS DE CONVIDADO
 *
 * O token puro (256 bits) é exibido uma única vez, logo após a
 * geração. O banco guarda apenas o SHA-256. O encerramento da
 * live revoga todos os links automaticamente (trigger no banco).
 */
export function LiveInvitePanel({ liveId }: Props) {
  const [convites, setConvites] = React.useState<LiveConvite[]>([]);
  const [linkGerado, setLinkGerado] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState(false);
  const [validadeHoras, setValidadeHoras] = React.useState("24");
  const [limiteAcessos, setLimiteAcessos] = React.useState("100");
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const carregar = React.useCallback(async () => {
    try {
      setConvites(await getConvites(liveId));
    } catch (e) {
      console.error("[LiveInvitePanel]:", e);
    }
  }, [liveId]);

  React.useEffect(() => {
    void carregar();
  }, [carregar]);

  const gerar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await criarConvite({
        liveId,
        validadeHoras: Number(validadeHoras) || 24,
        limiteAcessos: Number(limiteAcessos) || null,
        rotulo: "",
      });
      setLinkGerado(resultado.url);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o convite.");
    } finally {
      setCarregando(false);
    }
  };

  const copiar = async () => {
    if (!linkGerado) return;
    try {
      await navigator.clipboard.writeText(linkGerado);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  const revogar = async (id: string) => {
    try {
      await revogarConvite(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível revogar.");
    }
  };

  const agora = Date.now();

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        <h3 className="text-sm font-semibold">🔗 Link de convite</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Convidados externos apenas assistem e participam do chat. Não acessam o CRM nem ocupam
        cadeira. O link deixa de funcionar quando a Live é encerrada.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="validade" className="text-xs">
            Validade (horas)
          </Label>
          <Input
            id="validade"
            type="number"
            min={1}
            max={168}
            value={validadeHoras}
            onChange={(e) => setValidadeHoras(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="limite" className="text-xs">
            Limite de acessos (vazio = ilimitado)
          </Label>
          <Input
            id="limite"
            type="number"
            min={1}
            value={limiteAcessos}
            onChange={(e) => setLimiteAcessos(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={() => void gerar()} disabled={carregando} className="w-full">
        {carregando ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="mr-2 h-4 w-4" />
        )}
        Gerar link de convite
      </Button>

      {erro && <p className="text-xs text-destructive">{erro}</p>}

      {linkGerado && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Copie agora: este é o único momento em que o link é exibido.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={linkGerado} className="h-8 text-xs" />
            <Button size="sm" variant="outline" onClick={() => void copiar()}>
              {copiado ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {convites.length > 0 && (
        <div className="space-y-1.5">
          {convites.map((c) => {
            const expirado = new Date(c.expira_em).getTime() <= agora;
            const semAcesso = c.limite_acessos != null && c.acessos >= c.limite_acessos;
            const inativo = c.revogado || expirado || semAcesso;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {c.rotulo || `Convite ${c.id.slice(0, 6)}`}
                  </p>
                  <p className="text-muted-foreground">
                    expira {formatDataHora(c.expira_em)} · {c.acessos}
                    {c.limite_acessos != null ? `/${c.limite_acessos}` : ""} acessos
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={inativo ? "secondary" : "default"} className="text-[10px]">
                    {c.revogado ? "revogado" : expirado ? "expirado" : semAcesso ? "limite" : "ativo"}
                  </Badge>
                  {!c.revogado && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => void revogar(c.id)}
                      title="Revogar convite"
                    >
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {convites.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> Nenhum convite gerado ainda.
        </p>
      )}
    </div>
  );
}
