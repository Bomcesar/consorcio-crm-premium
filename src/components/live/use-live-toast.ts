"use client";

import { useToast } from "@/hooks/use-toast";

export type ToastOpcoes = {
  title: string;
  description?: string | null;
  variant?: "default" | "destructive";
};

/**
 * Adaptador entre a API do toast do projeto (`success`, `error`,
 * `warning`, `info`) e o formato `{ title, description, variant }`.
 * Mantém os componentes do módulo de Live consistentes com o resto
 * do CRM sem duplicar o provider de notificações.
 */
export function useLiveToast() {
  const { error, info } = useToast();

  return (opcoes: ToastOpcoes) => {
    const texto = opcoes.description
      ? `${opcoes.title}: ${opcoes.description}`
      : opcoes.title;

    if (opcoes.variant === "destructive") {
      error(texto);
      return;
    }
    info(texto);
  };
}

export function useLiveToastHelpers() {
  const { success, error, info } = useToast();
  return { success, error, info };
}
