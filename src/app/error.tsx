"use client";

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Fronteira de erro da aplicação.
 *
 * Antes este arquivo retornava `null`, o que deixava a tela totalmente
 * branca em qualquer falha de Server Action: o usuário não tinha como
 * saber que algo quebrou, e o `digest` — única forma de correlacionar o
 * erro mascarado de produção com o log do servidor — era descartado.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error, error.digest ? { digest: error.digest } : {});
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-center">
        <h1 className="text-lg font-bold">Ocorreu um erro inesperado</h1>
        <p className="text-sm text-muted-foreground">
          A operação não pôde ser concluída. Tente novamente; se o problema persistir, envie o
          código de diagnóstico abaixo ao suporte.
        </p>
        {error.digest && (
          <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">
            diagnóstico: {error.digest}
          </p>
        )}
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  );
}
