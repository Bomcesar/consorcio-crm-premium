"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Props = {
  url: string;
  titulo: string;
  numeroPagina: number;
  totalPaginas: number;
  podeControlar: boolean;
  aoMudarPagina: (pagina: number) => void;
  aoRegistrarTotal: (total: number) => void;
};

type EstadoPdf = "carregando" | "pronto" | "erro";

/**
 * Visualizador de PDF/slides.
 *
 * Renderiza somente a página atual em canvas via pdf.js. A página
 * é sincronizada por Realtime (live_apresentacoes.pagina_atual),
 * portanto todos os espectadores veem exatamente a mesma.
 */
export function LivePdfViewer({
  url,
  titulo,
  numeroPagina,
  totalPaginas,
  podeControlar,
  aoMudarPagina,
  aoRegistrarTotal,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const documentoRef = useRef<PDFDocumentProxy | null>(null);
  const renderizandoRef = useRef(false);

  const [estado, setEstado] = React.useState<EstadoPdf>("carregando");
  const [erro, setErro] = React.useState<string | null>(null);

  // Carrega o documento uma única vez por URL
  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      setEstado("carregando");
      setErro(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        // O worker precisa vir do mesmo bundle; em produção o
        // caminho é resolvido pelo próprio pdf.js.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const tarefa = pdfjs.getDocument({ url, withCredentials: false });
        const doc = await tarefa.promise;
        if (cancelado) return;

        documentoRef.current = doc;
        setEstado("pronto");
        aoRegistrarTotal(doc.numPages);
      } catch (e) {
        console.error("[LivePdfViewer] falha ao carregar:", e);
        if (cancelado) return;
        setEstado("erro");
        setErro(
          "Não foi possível abrir este PDF. O arquivo pode estar protegido por senha ou corrompido.",
        );
      }
    };

    if (url) void carregar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Renderiza a página atual
  useEffect(() => {
    const renderizar = async () => {
      const doc = documentoRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas || renderizandoRef.current) return;

      renderizandoRef.current = true;
      try {
        const pagina = await doc.getPage(Math.min(Math.max(1, numeroPagina), doc.numPages));
        const contexto = canvas.getContext("2d");
        if (!contexto) return;

        const escalaBase = 1.4;
        const viewport = pagina.getViewport({ scale: escalaBase });
        const larguraDisponivel = canvas.parentElement?.clientWidth ?? 800;
        const escala = Math.min(escalaBase, larguraDisponivel / viewport.width);

        const viewportAjustado = pagina.getViewport({ scale: escala });
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

        canvas.width = Math.floor(viewportAjustado.width * dpr);
        canvas.height = Math.floor(viewportAjustado.height * dpr);
        canvas.style.width = `${Math.floor(viewportAjustado.width)}px`;
        canvas.style.height = `${Math.floor(viewportAjustado.height)}px`;

        await pagina.render({
          canvas,
          canvasContext: contexto,
          viewport: viewportAjustado,
        }).promise;
      } catch (e) {
        console.error("[LivePdfViewer] falha ao renderizar:", e);
        setErro("Não foi possível renderizar esta página.");
      } finally {
        renderizandoRef.current = false;
      }
    };

    if (estado === "pronto") void renderizar();
  }, [estado, numeroPagina]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="truncate text-sm font-medium">📄 {titulo}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {numeroPagina}
          {totalPaginas > 0 ? ` / ${totalPaginas}` : ""}
        </span>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-3">
        {estado === "carregando" && (
          <div className="flex h-64 w-full items-center justify-center">
            <span className="text-sm text-muted-foreground">Carregando apresentação...</span>
          </div>
        )}
        {estado === "erro" && (
          <p className="p-4 text-center text-sm text-destructive">{erro}</p>
        )}
        <canvas ref={canvasRef} className={estado === "pronto" ? "max-w-full shadow" : "hidden"} />
      </div>

      {podeControlar && totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 border-t p-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
            disabled={numeroPagina <= 1}
            onClick={() => aoMudarPagina(numeroPagina - 1)}
          >
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            {numeroPagina} de {totalPaginas}
          </span>
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
            disabled={numeroPagina >= totalPaginas}
            onClick={() => aoMudarPagina(numeroPagina + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
