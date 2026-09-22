"use client";

import { broadcastCelebration } from "@/hooks/use-fireworks";
import { createClient } from "@/lib/supabase/client";

export { broadcastCelebration };

export type MensagemCelebracao = {
  message: string;
  value?: number;
};

const PERFIL_LABELS: Record<string, string> = {
  Administrador: "Administrador",
  Gestor: "Gestor",
  Consultor: "Consultor",
  Trainee: "Trainee",
  Secretaria: "Secretaria",
  Indicador: "Indicador",
};

export async function getUsuarioAutenticado(): Promise<{
  id: string;
  nome: string;
  perfil: string;
}> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return { id: "", nome: "Usuário", perfil: "" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    nome: profile?.nome || user.email?.split("@")[0] || "Usuário",
    perfil: profile?.perfil || "",
  };
}

export function mensagemBemVindoEquipe(nome: string, tipoEquipe: string): MensagemCelebracao {
  const label = PERFIL_LABELS[tipoEquipe] || tipoEquipe;
  return {
    message: `Seja bem-vindo ${nome} a equipe de ${label.toLowerCase()}`,
  };
}

export function mensagemParceiroConquistado(usuarioNome: string): MensagemCelebracao {
  return {
    message: `Parabéns ${usuarioNome} por conquistar mais um parceiro na equipe`,
  };
}

export function mensagemIndicacaoQualificada(indicadorNome: string, contatoNome: string): MensagemCelebracao {
  return {
    message: `Parabéns ${indicadorNome} por indicar mais um cliente - ${contatoNome}`,
  };
}

export function broadcastConversaoContato(nome: string, target: "indicadores" | "clientes" | "parceiros" | "recrutamento" | "leads" | "negociacoes") {
  switch (target) {
    case "indicadores":
      return broadcastCelebration(mensagemBemVindoEquipe(nome, "Indicador"));
    case "clientes":
      return broadcastCelebration(mensagemBemVindoEquipe(nome, "Consultor"));
    case "parceiros":
    case "recrutamento":
      void getUsuarioAutenticado().then((u) =>
        broadcastCelebration(mensagemParceiroConquistado(u.nome)),
      );
      return;
    case "leads":
      void getUsuarioAutenticado().then((u) =>
        broadcastCelebration(mensagemIndicacaoQualificada(u.nome, nome)),
      );
      return;
    case "negociacoes":
      void getUsuarioAutenticado().then((u) =>
        broadcastCelebration(mensagemParceiroConquistado(u.nome)),
      );
      return;
    default:
      return;
  }
}

export function broadcastCadastroUsuario(nome: string, perfil: string) {
  const targetPerfil = perfil as keyof typeof PERFIL_LABELS;
  if (targetPerfil in PERFIL_LABELS) {
    broadcastCelebration(mensagemBemVindoEquipe(nome, targetPerfil));
  }
}
