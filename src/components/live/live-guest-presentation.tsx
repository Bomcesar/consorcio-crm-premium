"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LivePdfViewer } from "./live-pdf-viewer";

type ApresentacaoConvidado = {
  id: string;
  tipo: "pdf" | "video";
  mime_type: string;
  titulo: string;
  pagina_atual: number;
  total_paginas: number;
};

type Props = {
  token: string;
  ativo: boolean;
};

const INTERVALO_MS = 8000;

/**
 * Apresentação vista pelo convidado externo.
 *
 * O convidado não tem sessão Supabase, então não pode assinar
 * `postgres_changes` nem ler o bucket `anexos` diretamente. A
 * página atual é consultada pelo endpoint do convite (que
 * revalida o token e entrega uma URL assinada curta), e o
 * arquivo é renderizado localmente pelo mesmo `LivePdfViewer`
 * usado no CRM — a página exibida é a mesma que o anfitrião está
 * mostrando.
 */
export function LiveGuestPresentation({ token, ativo }: Props) {
  const [apresentacao, setApresentacao] = React.useState<ApresentacaoConvidado | null>(null);
  const [url, setUrl] = React.useState<string | null>(null);
  const [totalPaginas, setTotalPaginas] = React.useState(0);

  const carregar = React.useCallback(async () => {
    try {
      const resposta = await fetch(`/api/live/convite/${token}/apresentacao`, {
        cache: "no-store",
      });
      if (!resposta.ok) return;
      const corpo = (await resposta.json()) as {
        apresentacao?: ApresentacaoConvidado | null;
        url?: string;
      };
      setApresentacao(corpo.apresentacao ?? null);
      setUrl(corpo.url ?? null);
      setTotalPaginas(corpo.apresentacao?.total_paginas ?? 0);
    } catch (e) {
      console.error("[LiveGuestPresentation]:", e);
    }
  }, [token]);

  React.useEffect(() => {
    if (!ativo) {
      setApresentacao(null);
      setUrl(null);
      return;
    }

    void carregar();
    const intervalo = setInterval(() => void carregar(), INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [ativo, carregar]);

  if (!ativo || !apresentacao || !url) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate font-medium">{apresentacao.titulo}</span>
          <span>
            {apresentacao.pagina_atual} / {Math.max(1, totalPaginas)}
          </span>
        </div>

        {apresentacao.tipo === "pdf" ? (
          <LivePdfViewer
            url={url}
            titulo={apresentacao.titulo}
            numeroPagina={apresentacao.pagina_atual}
            totalPaginas={totalPaginas}
            podeControlar={false}
            aoMudarPagina={() => {
              /* o convidado acompanha a página do anfitrião */
            }}
            aoRegistrarTotal={setTotalPaginas}
          />
        ) : (
          <video
            key={url}
            src={url}
            controls
            playsInline
            className="w-full rounded-lg bg-black"
            style={{ aspectRatio: "16 / 9" }}
          />
        )}
      </CardContent>
    </Card>
  );
}