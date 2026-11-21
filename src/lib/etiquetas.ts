// ============================================================
// DEFINIÇÃO CENTRAL DE ETIQUETAS COMERCIAIS
// Sistema Operacional do Consultor — Playbook Motors
// ============================================================

export type EtiquetaGrupo = "relacionamento" | "interesse" | "papel";

export type EtiquetaId =
  | "prospectado"
  | "andamento"
  | "atendido"
  | "plano_futuro"
  | "cliente_imovel"
  | "cliente_automovel"
  | "cliente_alavancagem"
  | "indicador";

export interface EtiquetaDef {
  id: EtiquetaId;
  label: string;
  grupo: EtiquetaGrupo;
  /** Tailwind classes for background + text + border */
  cor: string;
  /** Tailwind text color class for contrast */
  corTexto: string;
  /** Descrição curta para tooltips */
  descricao: string;
}

// ============================================================
// GRUPO A — Situação do relacionamento (1 por contato)
// ============================================================
// Regra: cada contato deve possuir SOMENTE UMA etiqueta deste grupo.

// ============================================================
// GRUPO B — Perfil de interesse (múltiplas por contato)
// ============================================================
// Regra: permitir múltiplas etiquetas deste grupo quando aplicável.

// ============================================================
// GRUPO C — Papel comercial (1 por contato)
// ============================================================
// Regra: identificar o contato que atua como parceiro indicador.

export const ETIQUETAS: EtiquetaDef[] = [
  // Grupo A — Relacionamento (cor roxa/amarela/verde/cinza)
  {
    id: "prospectado",
    label: "Prospectado",
    grupo: "relacionamento",
    cor: "bg-purple-100 text-purple-800 border-purple-300",
    corTexto: "text-purple-700",
    descricao: "Contato prospectado, ainda não abordado.",
  },
  {
    id: "andamento",
    label: "Andamento",
    grupo: "relacionamento",
    cor: "bg-yellow-100 text-yellow-800 border-yellow-300",
    corTexto: "text-yellow-700",
    descricao: "Contato em andamento, sendo trabalhado.",
  },
  {
    id: "atendido",
    label: "Atendido",
    grupo: "relacionamento",
    cor: "bg-green-100 text-green-800 border-green-300",
    corTexto: "text-green-700",
    descricao: "Contato já atendido, cliente ativo.",
  },
  {
    id: "plano_futuro",
    label: "Plano futuro",
    grupo: "relacionamento",
    cor: "bg-gray-100 text-gray-700 border-gray-300",
    corTexto: "text-gray-600",
    descricao: "Contato para trabalhar no futuro.",
  },

  // Grupo B — Interesse (azul escuro, azul, laranja)
  {
    id: "cliente_imovel",
    label: "Cliente imóvel",
    grupo: "interesse",
    cor: "bg-blue-800 text-blue-50 border-blue-900",
    corTexto: "text-blue-800",
    descricao: "Interesse em consórcio imobiliário.",
  },
  {
    id: "cliente_automovel",
    label: "Cliente automóvel",
    grupo: "interesse",
    cor: "bg-blue-100 text-blue-800 border-blue-300",
    corTexto: "text-blue-700",
    descricao: "Interesse em consórcio automotivo.",
  },
  {
    id: "cliente_alavancagem",
    label: "Cliente alavancagem",
    grupo: "interesse",
    cor: "bg-orange-100 text-orange-800 border-orange-300",
    corTexto: "text-orange-700",
    descricao: "Interesse em alavancagem financeira.",
  },

  // Grupo C — Papel (vermelho)
  {
    id: "indicador",
    label: "Indicador",
    grupo: "papel",
    cor: "bg-red-100 text-red-800 border-red-300",
    corTexto: "text-red-700",
    descricao: "Contato que atua como parceiro indicador.",
  },
];

// ============================================================
// HELPERS
// ============================================================

export function getEtiquetaById(id: string): EtiquetaDef | undefined {
  return ETIQUETAS.find((e) => e.id === id);
}

export function getEtiquetasByGrupo(grupo: EtiquetaGrupo): EtiquetaDef[] {
  return ETIQUETAS.filter((e) => e.grupo === grupo);
}

/** Etiquetas do grupo relacionamento */
export const ETIQUETAS_RELACIONAMENTO = getEtiquetasByGrupo("relacionamento");
/** Etiquetas do grupo interesse */
export const ETIQUETAS_INTERESSE = getEtiquetasByGrupo("interesse");
/** Etiquetas do grupo papel */
export const ETIQUETAS_PAPEL = getEtiquetasByGrupo("papel");

// ============================================================
// VALIDAÇÃO DE COMBINAÇÕES
// ============================================================

/**
 * Valida se uma lista de etiquetas respeita as regras:
 * - Grupo A (relacionamento): máximo 1 por contato
 * - Grupo B (interesse): múltiplas permitidas
 * - Grupo C (papel): máximo 1 por contato
 *
 * Retorna { valid: true } ou { valid: false, error: "mensagem" }
 */
export function validarCombinacaoEtiquetas(
  etiquetas: readonly string[],
): { valid: true } | { valid: false; error: string } {
  const relacionamento = etiquetas.filter((id) => {
    const e = getEtiquetaById(id);
    return e?.grupo === "relacionamento";
  });
  if (relacionamento.length > 1) {
    const labels = relacionamento
      .map((id) => getEtiquetaById(id)?.label ?? id)
      .join(", ");
    return {
      valid: false,
      error: `Apenas uma etiqueta de situação de relacionamento é permitida por contato. Selecionadas: ${labels}.`,
    };
  }

  const papel = etiquetas.filter((id) => {
    const e = getEtiquetaById(id);
    return e?.grupo === "papel";
  });
  if (papel.length > 1) {
    return {
      valid: false,
      error: "Apenas uma etiqueta de papel comercial é permitida por contato.",
    };
  }

  return { valid: true };
}

// ============================================================
// PERSISTÊNCIA (formato string separado por vírgula)
// ============================================================

/** Converte array de IDs para string separada por vírgula (formato do campo tags) */
export function etiquetasParaString(etiquetas: EtiquetaId[]): string {
  return etiquetas.join(",");
}

/** Converte string separada por vírgula para array de IDs válidos */
export function stringParaEtiquetas(str: string | null | undefined): EtiquetaId[] {
  if (!str) return [];
  const parts = str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.filter((id): id is EtiquetaId => {
    return ETIQUETAS.some((e) => e.id === id);
  });
}

/**
 * Separa uma string de tags (coluna `tags`) em etiquetas válidas e texto livre.
 * Usado para popular os campos do formulário sem perder texto livre.
 */
export function separarTags(
  str: string | null | undefined,
): { etiquetas: EtiquetaId[]; livres: string[] } {
  const tokens = (str ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const etiquetas: EtiquetaId[] = [];
  const livres: string[] = [];
  for (const t of tokens) {
    if (ETIQUETAS.some((e) => e.id === t)) {
      if (!etiquetas.includes(t as EtiquetaId)) etiquetas.push(t as EtiquetaId);
    } else if (!livres.includes(t)) {
      livres.push(t);
    }
  }
  return { etiquetas, livres };
}

/**
 * Combina etiquetas (IDs) + texto livre em uma única string para a coluna `tags`.
 * Preserva ambos, sem duplicatas, mantendo etiquetas primeiro.
 * Garante que editar outros campos não apague etiquetas nem texto livre.
 */
export function combinarTags(
  etiquetas: readonly string[],
  livres: string | readonly string[],
): string {
  const livreArr = (
    typeof livres === "string" ? livres.split(",") : livres
  )
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [...etiquetas, ...livreArr]) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.join(",");
}

// ============================================================
// DEMO — Persistência localStorage
// ============================================================

const DEMO_STORAGE_KEY = "crm-demo-etiquetas";

export interface DemoEtiquetaRecord {
  /** ID do registro (cliente ou lead) */
  recordId: string;
  /** Tipo de registro */
  tipo: "cliente" | "lead";
  /** Etiquetas aplicadas */
  etiquetas: EtiquetaId[];
  /** Data da última alteração */
  updatedAt: string;
}

/**
 * Salva etiquetas no localStorage (modo demo).
 * Persiste entre sessões e atualizações de página.
 */
export function salvarEtiquetasDemo(
  recordId: string,
  tipo: "cliente" | "lead",
  etiquetas: EtiquetaId[],
): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    const records: DemoEtiquetaRecord[] = stored ? JSON.parse(stored) : [];
    const idx = records.findIndex(
      (r) => r.recordId === recordId && r.tipo === tipo,
    );
    const record: DemoEtiquetaRecord = {
      recordId,
      tipo,
      etiquetas,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // falha silenciosa em modo demo
  }
}

/**
 * Carrega etiquetas do localStorage (modo demo).
 * Retorna array vazio se não houver registro.
 */
export function carregarEtiquetasDemo(
  recordId: string,
  tipo: "cliente" | "lead",
): EtiquetaId[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return [];
    const records: DemoEtiquetaRecord[] = JSON.parse(stored);
    const record = records.find(
      (r) => r.recordId === recordId && r.tipo === tipo,
    );
    return record?.etiquetas ?? [];
  } catch {
    return [];
  }
}

/**
 * Remove etiquetas de um registro do localStorage.
 */
export function removerEtiquetasDemo(
  recordId: string,
  tipo: "cliente" | "lead",
): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return;
    const records: DemoEtiquetaRecord[] = JSON.parse(stored);
    const filtered = records.filter(
      (r) => !(r.recordId === recordId && r.tipo === tipo),
    );
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // falha silenciosa
  }
}

/**
 * Lista todas as etiquetas demo (para debug/inspeção).
 */
export function listarTodasEtiquetasDemo(): DemoEtiquetaRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}