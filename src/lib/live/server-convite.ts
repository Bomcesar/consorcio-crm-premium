import { createAdminClient } from "@/lib/supabase/server";
import { hashTokenConvite } from "./livekit-server";

/**
 * Validação de convite no servidor, usando a função SECURITY DEFINER
 * `live_convite_validar` (service_role only).
 *
 * O convidado nunca recebe sessão Supabase: toda a verificação
 * acontece aqui, no servidor, com o segredo fora do client.
 */

export const CODIGOS_CONVITE = [
  "convite_inexistente",
  "convite_revogado",
  "convite_expirado",
  "limite_acessos",
  "live_encerrada",
] as const;

export type LiveConviteErro = (typeof CODIGOS_CONVITE)[number];

function extrairCodigoConvite(mensagem: string): LiveConviteErro {
  const encontrado = CODIGOS_CONVITE.find((c) => mensagem.includes(c));
  return encontrado ?? "convite_inexistente";
}

export type ConviteValidado = {
  live_id: string;
  convite_id: string;
  nome_exibicao: string;
  status: string;
  modo: string;
  titulo: string;
  descricao: string;
  anfitriao_nome: string;
};

export type ResultadoValidacao =
  | { ok: true; dados: ConviteValidado }
  | { ok: false; erro: LiveConviteErro };

export async function validarConvite(token: string): Promise<ResultadoValidacao> {
  if (!token || token.length < 20) return { ok: false, erro: "convite_inexistente" };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("live_convite_validar", {
    p_token_hash: hashTokenConvite(token),
  });

  if (error) {
    const codigo = extrairCodigoConvite(error.message ?? "");
    return { ok: false, erro: codigo };
  }

  if (!data || data.length === 0) return { ok: false, erro: "convite_inexistente" };

  return { ok: true, dados: data[0] as ConviteValidado };
}

/**
 * Registra o acesso do convidado e devolve o id do acesso.
 * A função é atômica: respeita revogação, expiração e limite
 * de acessos no próprio banco.
 */
export async function registrarAcessoConvite(
  token: string,
  nomeExibicao: string,
  userAgent: string,
  ipHash: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("live_convite_registrar_acesso", {
    p_token_hash: hashTokenConvite(token),
    p_nome_exibicao: nomeExibicao.slice(0, 80),
    p_user_agent: userAgent.slice(0, 300),
    p_ip_hash: ipHash,
  });

  if (error) {
    console.error("[API live/convite] registrarAcesso:", error);
    return null;
  }
  return (data as string | null) ?? null;
}

export function clampNumber(
  valor: unknown,
  min: number,
  max: number,
  padrao: number,
): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
