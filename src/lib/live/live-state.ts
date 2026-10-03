import type { LiveModo, LiveStatus } from "./types";

/**
 * Estados da Live. A transição é sempre controlada pelo anfitrião,
 * exceto "aguardando" → "ao_vivo", que também só o anfitrião dispara.
 *
 * APRESENTAÇÃO nunca substitui a sala: o modo muda, a conexão
 * de áudio permanece ativa e participantes/chat continuam.
 */
export function podeIniciar(status: LiveStatus): boolean {
  return status === "aguardando" || status === "ao_vivo";
}

export function podeEncerrar(status: LiveStatus): boolean {
  return status !== "encerrada";
}

export function podeIniciarApresentacao(status: LiveStatus): boolean {
  return status === "ao_vivo" || status === "apresentacao";
}

export function podeEncerrarApresentacao(modo: LiveModo): boolean {
  return modo === "apresentacao";
}

export function proximoModo(modo: LiveModo): LiveModo {
  return modo === "apresentacao" ? "audio" : "apresentacao";
}

export function statusParaModo(status: LiveStatus, modo: LiveModo): LiveStatus {
  if (status === "encerrada") return status;
  return modo === "apresentacao" ? "apresentacao" : "ao_vivo";
}

export function liveEmAndamento(status: LiveStatus): boolean {
  return status === "ao_vivo" || status === "apresentacao";
}

/** Rótulo curto para o indicador de estado exibido no topo da sala. */
export function rotuloEstado(status: LiveStatus, modo: LiveModo): string {
  switch (status) {
    case "aguardando":
      return "Aguardando início";
    case "ao_vivo":
      return "Ao vivo — áudio";
    case "apresentacao":
      return "Apresentação em vídeo";
    case "encerrada":
      return "Live encerrada";
    default:
      return modo === "apresentacao" ? "Apresentação" : "Áudio";
  }
}
