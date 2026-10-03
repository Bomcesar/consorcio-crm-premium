import { createHash, randomBytes } from "node:crypto";
import {
  livekitConfigurado,
  livekitUrl,
  motivoLivekitInoperante,
  nomeSalaLiveKit,
  type TipoAcesso,
} from "./livekit-compartilhado";

/**
 * Emissão de token de mídia e geração de segredos de convite.
 * Este módulo é SERVER-ONLY: a chave secreta da API LiveKit
 * jamais deve chegar ao bundle do cliente.
 */

export { livekitConfigurado, livekitUrl, motivoLivekitInoperante, nomeSalaLiveKit };
export type { TipoAcesso };

/**
 * Token de convite: 32 bytes aleatórios (256 bits de entropia),
 * codificados em base64url. Não é previsível nem enumerável.
 */
export function gerarTokenConvite(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * O banco guarda apenas o SHA-256 do token. Se o banco vazar,
 * nenhum link externo pode ser aberto por quem tenha o dump.
 */
export function hashTokenConvite(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Hash de IP com salt do ambiente. Mantém o registro de acesso
 * para auditoria sem armazenar o endereço em texto puro (LGPD).
 */
export function hashIp(ip: string | null): string {
  const salt = process.env.LIVE_IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "live";
  if (!ip) return "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function extrairIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? null;
}

/**
 * Emite o token de mídia.
 *
 * O convidado externo recebe `canPublish: false` e
 * `canPublishData: false`: mesmo que o frontend seja adulterado,
 * ele não consegue publicar áudio nem vídeo — portanto não
 * consegue ocupar cadeira nem abrir microfone/câmera.
 */
export async function emitirTokenLiveKit(params: {
  roomName: string;
  identity: string;
  nome: string;
  tipo: TipoAcesso;
  metadata?: Record<string, string | number | undefined>;
}): Promise<string> {
  if (!livekitConfigurado()) {
    // O motivo vai para o log do servidor (nunca para o cliente), porque
    // "placeholder no lugar da secret" é a causa mais comum e silenciosa.
    console.error(
      `[live] token não emitido: ${motivoLivekitInoperante() ?? "configuração inválida"}`,
    );
    throw new Error("livekit_nao_configurado");
  }

  const { AccessToken } = await import("livekit-server-sdk");
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );

  const podePublicar = params.tipo === "anfitriao" || params.tipo === "participante";

  token.addGrant({
    room: params.roomName,
    roomJoin: true,
    canPublish: podePublicar,
    canPublishData: podePublicar,
    canSubscribe: true,
  });

  token.identity = params.identity;
  token.name = params.nome;

  const metadata: Record<string, string> = { tipo: params.tipo };
  if (params.metadata) {
    for (const [chave, valor] of Object.entries(params.metadata)) {
      if (valor !== undefined && valor !== null) metadata[chave] = String(valor);
    }
  }
  token.metadata = JSON.stringify(metadata);

  return token.toJwt();
}
