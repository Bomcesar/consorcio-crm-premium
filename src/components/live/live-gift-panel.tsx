"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Loader2 } from "lucide-react";
import { formatCreditoBRL } from "@/lib/live/format";
import type { LiveParticipante, LivePresente } from "@/lib/live/types";

export type CatalogoPresentes = {
  categoria: { id: string; nome: string; emoji: string };
  presentes: LivePresente[];
}[];

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  catalogo: CatalogoPresentes;
  destinatario: LiveParticipante | null;
  aoConfirmar: (presente: LivePresente) => Promise<void> | void;
  enviando?: boolean;
};

/**
 * 🎁 PRESENTES
 *
 * O presente representa uma faixa de crédito vinculada a quem está
 * em cadeira. Não é transferência financeira: não há carteira,
 * saldo, pagamento nem integração com gateway neste módulo.
 */
export function LiveGiftPanel({
  aberto,
  aoFechar,
  catalogo,
  destinatario,
  aoConfirmar,
  enviando = false,
}: Props) {
  const [selecionado, setSelecionado] = React.useState<LivePresente | null>(null);
  const [confirmando, setConfirmando] = React.useState(false);

  React.useEffect(() => {
    if (!aberto) setSelecionado(null);
  }, [aberto]);

  const categoriasComPresentes = React.useMemo(
    () => catalogo.filter((c) => c.presentes.length > 0),
    [catalogo],
  );

  const confirmar = async () => {
    if (!selecionado) return;
    setConfirmando(true);
    try {
      await aoConfirmar(selecionado);
      setSelecionado(null);
      aoFechar();
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" /> Presentes
          </DialogTitle>
          <DialogDescription>
            {destinatario ? (
              <>
                Enviar um presente para <strong>{destinatario.nome_exibicao}</strong>, que está em
                cadeira.
              </>
            ) : (
              "Escolha uma pessoa em uma cadeira para enviar um presente."
            )}
            <span className="mt-1 block text-xs text-muted-foreground">
              O presente representa uma faixa de crédito dentro da Live. Não é pagamento nem
              transferência financeira.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {categoriasComPresentes.map(({ categoria, presentes }) => (
            <div key={categoria.id}>
              <p className="mb-1.5 text-sm font-semibold">
                {categoria.emoji} {categoria.nome}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {presentes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelecionado(p)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                      selecionado?.id === p.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Gift className="h-6 w-6 text-amber-500" />
                    <span className="text-xs font-medium">{p.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {categoriasComPresentes.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum presente ativo no catálogo.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <p className="text-left text-sm text-muted-foreground sm:flex-1">
            {selecionado && destinatario
              ? `Enviar ${selecionado.nome} (${formatCreditoBRL(selecionado.valor_credito)}) para ${destinatario.nome_exibicao}?`
              : ""}
          </p>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            onClick={() => void confirmar()}
            disabled={!selecionado || !destinatario || confirmando || enviando}
          >
            {confirmando || enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gift className="mr-2 h-4 w-4" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
