/**
 * Utilitários de mídia compartilhados entre cliente e servidor.
 * Este módulo NÃO usa APIs do Node: pode ser importado por
 * componentes client-side.
 *
 * A emissão de token e o hash de convite ficam em `livekit-server.ts`,
 * que é SERVER-ONLY.
 */

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_API_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

/**
 * O segredo precisa ter entropia real.
 *
 * Um placeholder de exemplo (por exemplo 32 bullets, ou qualquer string
 * sem variety de caracteres) passa na checagem de existência, gera um
 * JWT bem formado e chega ao LiveKit — que responde `401 invalid token`.
 * Como a falha só aparece na conexão de mídia, o sintoma parece ser de
 * rede ou de versão, e não de configuração.
 */
function segredoTemEntropia(valor: string): boolean {
  if (valor.length < 24) return false;
  const distintos = new Set(valor).size;
  return distintos >= 12 && /[a-zA-Z]/.test(valor) && /[0-9+\/=_-]/.test(valor);
}

export function livekitConfigurado(): boolean {
  return Boolean(
    LIVEKIT_API_KEY &&
      LIVEKIT_API_SECRET &&
      LIVEKIT_URL &&
      segredoTemEntropia(LIVEKIT_API_SECRET),
  );
}

/**
 * Motivo pelo qual a integração está inoperante, para o log do servidor.
 * Nunca inclui o valor do segredo.
 */
export function motivoLivekitInoperante(): string | null {
  if (!LIVEKIT_URL) return "LIVEKIT_API_URL ausente";
  if (!LIVEKIT_API_KEY) return "LIVEKIT_API_KEY ausente";
  if (!LIVEKIT_API_SECRET) return "LIVEKIT_API_SECRET ausente";
  if (!segredoTemEntropia(LIVEKIT_API_SECRET)) {
    return "LIVEKIT_API_SECRET parece um placeholder (entropia insuficiente) — troque pela API Secret real do projeto LiveKit";
  }
  return null;
}

export function livekitUrl(): string {
  return LIVEKIT_URL ?? "";
}

/** Nome da sala LiveKit: determinístico e derivado do id da live. */
export function nomeSalaLiveKit(liveId: string): string {
  return `live-voz-${liveId}`;
}

export type TipoAcesso = "anfitriao" | "participante" | "ouvinte" | "convidado";
