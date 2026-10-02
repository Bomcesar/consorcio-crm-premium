"use client";

import { useToastContext } from "@/components/ui/toast";

export type ToastOpcoes = {
  title: string;
  description?: string | null;
  variant?: "default" | "destructive";
};

/**
 * Adaptador de compatibilidade.
 *
 * Historicamente este módulo guardava os toasts em `useState` próprio.
 * Nada renderizava esse estado: o componente visível (`ToasterProvider`)
 * usa outro contexto. Resultado — todo `success()`/`error()` feito por
 * aqui era silenciosamente descartado e o usuário não recebia nenhuma
 * confirmação, parecendo que a operação simplesmente não acontecia.
 *
 * Agora o hook delega ao contexto do `ToasterProvider`, de modo que os
 * avisos realmente aparecem. Fora do dashboard (login, convite de live,
 * reset de senha) não há provider: nesse caso cai para `console`, e a
 * operação segue sem quebrar a tela.
 */
export function useToast() {
  const contexto = useToastContext();

  const add = (message: string, type: "success" | "error" | "warning" | "info") => {
    if (!contexto) {
      if (type === "error") console.error("[toast]", message);
      return;
    }
    contexto.addToast({ title: message, type });
  };

  return {
    toasts: contexto?.toasts ?? [],
    success: (message: string) => add(message, "success"),
    error: (message: string) => add(message, "error"),
    warning: (message: string) => add(message, "warning"),
    info: (message: string) => add(message, "info"),
  };
}