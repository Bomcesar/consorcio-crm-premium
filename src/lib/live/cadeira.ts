import type { LiveParticipante } from "./types";

/**
 * Aloca a primeira cadeira livre da sala.
 * A unicidade é garantida também pelo índice parcial
 * `live_participantes_cadeira_unica`; esta função apenas evita
 * uma falha de escrita desnecessária.
 */
export function acharCadeiraLivre(
  participantes: LiveParticipante[],
  maxCadeiras: number,
): number | null {
  const ocupadas = new Set(
    participantes
      .filter((p) => p.cadeira != null && p.saiu_em == null)
      .map((p) => p.cadeira as number),
  );
  for (let i = 1; i <= maxCadeiras; i += 1) {
    if (!ocupadas.has(i)) return i;
  }
  return null;
}

export function temCadeiraLivre(
  participantes: LiveParticipante[],
  maxCadeiras: number,
): boolean {
  return acharCadeiraLivre(participantes, maxCadeiras) !== null;
}

/** Participantes que ocupam cadeira agora, na ordem das cadeiras. */
export function participantesEmCadeira(
  participantes: LiveParticipante[],
): LiveParticipante[] {
  return participantes
    .filter((p) => p.cadeira != null && p.saiu_em == null)
    .sort((a, b) => (a.cadeira ?? 0) - (b.cadeira ?? 0));
}

export function ouvintesAtivos(participantes: LiveParticipante[]): LiveParticipante[] {
  return participantes
    .filter((p) => p.saiu_em == null && p.cadeira == null && p.tipo === "ouvinte")
    .sort((a, b) => a.nome_exibicao.localeCompare(b.nome_exibicao, "pt-BR"));
}
export function anfitriaoDaSala(participantes: LiveParticipante[]): LiveParticipante | null {
  return participantes.find((p) => p.tipo === "anfitriao" && p.saiu_em == null) ?? null;
}

export function meuParticipante(
  participantes: LiveParticipante[],
  usuarioId: string | null,
  convidadoHash?: string | null,
): LiveParticipante | null {
  if (usuarioId) {
    return (
      participantes.find((p) => p.usuario_id === usuarioId && p.saiu_em == null) ?? null
    );
  }
  if (convidadoHash) {
    return (
      participantes.find(
        (p) => p.convidado_hash === convidadoHash && p.saiu_em == null,
      ) ?? null
    );
  }
  return null;
}

export function estouEmCadeira(participante: LiveParticipante | null): boolean {
  return !!participante && participante.cadeira != null && participante.saiu_em == null;
}
