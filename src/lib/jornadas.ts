// ============================================================
// JORNADAS DE CONVERSÃO — CADASTRO ÚNICO, TRÊS JORNADAS INDEPENDENTES
// Sistema Operacional do Consultor — Playbook Motors
//
// Cada contato pode seguir por três caminhos simultâneos:
//   1. Cliente (12 etapas do Playbook MOTORS)
//   2. Indicador (7 etapas + recusas/desistências)
//   3. Recrutamento (10 etapas + não aprovado/desistiu/suspenso)
//
// As jornadas são independentes: alterar uma não afeta as outras.
// Persistência demo via localStorage.
// ============================================================

// ============================================================
// TIPOS
// ============================================================

export type JornadaTipo = "cliente" | "indicador" | "recrutamento";

// --- Jornada Cliente (Playbook MOTORS — 12 etapas, preservadas) ---
export type JornadaClienteEtapa =
  | "novo_lead"
  | "conexao_realizada"
  | "em_qualificacao"
  | "diagnostico"
  | "educacao"
  | "simulacao"
  | "proposta_apresentada"
  | "negociacao"
  | "fechamento"
  | "pos_venda"
  | "perdido"
  | "sem_interesse";

// --- Jornada Indicador (7 etapas + encerramentos) ---
export type JornadaIndicadorEtapa =
  | "potencial_identificado"
  | "convite_realizado"
  | "aceitou_participar"
  | "cadastro_conferencia"
  | "pronto_enviar_central"
  | "enviado_central"
  | "ativo_indicador"
  | "recusou"
  | "desistiu";

// --- Jornada Recrutamento (10 etapas + encerramentos) ---
export type JornadaRecrutamentoEtapa =
  | "candidato_identificado"
  | "convite_processo"
  | "entrevista_agendada"
  | "entrevista_realizada"
  | "em_avaliacao"
  | "aprovado"
  | "contratacao_andamento"
  | "contratado"
  | "integracao_inicial"
  | "ativo_equipe"
  | "nao_aprovado"
  | "desistiu"
  | "processo_suspenso";

// --- Resultado de reunião ---
export type ResultadoReuniao =
  | "interesse_credito"
  | "interesse_indicador"
  | "interesse_equipe"
  | "multiplas_oportunidades"
  | "sem_interesse";

// ============================================================
// INTERFACES
// ============================================================

export interface JornadaEstado {
  ativa: boolean;
  etapa: string | null;
  iniciada_em: string | null;
  encerrada_em: string | null;
  responsavel: string | null;
}

export interface JornadaHistoricoEntry {
  id: string;
  jornada_tipo: JornadaTipo;
  etapa_anterior: string | null;
  etapa_nova: string;
  observacao: string | null;
  responsavel: string | null;
  data: string;
}

export interface Reuniao {
  id: string;
  data: string;
  resultado: ResultadoReuniao;
  oportunidades: JornadaTipo[];
  observacoes: string | null;
  responsavel: string | null;
}

export interface ContatoJornadas {
  contato_id: string;
  contato_tipo: "cliente" | "lead";
  jornadas: {
    cliente: JornadaEstado;
    indicador: JornadaEstado;
    recrutamento: JornadaEstado;
  };
  reunioes: Reuniao[];
  historico: JornadaHistoricoEntry[];
  observacoes?: string | null;
}

// ============================================================
// DEFINIÇÕES DE ETAPAS — LABELS, CORES, ENCERRAMENTOS
// ============================================================

export interface EtapaDef {
  id: string;
  label: string;
  cor: string;
  corTexto: string;
  encerramento?: boolean;
}

// --- Cliente (Playbook MOTORS) ---
export const JORNADA_CLIENTE_ETAPAS: EtapaDef[] = [
  { id: "novo_lead", label: "Novo lead", cor: "bg-slate-100 text-slate-700 border-slate-300", corTexto: "text-slate-700" },
  { id: "conexao_realizada", label: "Conexão realizada", cor: "bg-blue-50 text-blue-700 border-blue-300", corTexto: "text-blue-700" },
  { id: "em_qualificacao", label: "Em qualificação", cor: "bg-cyan-50 text-cyan-700 border-cyan-300", corTexto: "text-cyan-700" },
  { id: "diagnostico", label: "Diagnóstico", cor: "bg-green-50 text-green-700 border-green-300", corTexto: "text-green-700" },
  { id: "educacao", label: "Educação", cor: "bg-yellow-50 text-yellow-700 border-yellow-300", corTexto: "text-yellow-700" },
  { id: "simulacao", label: "Simulação", cor: "bg-orange-50 text-orange-700 border-orange-300", corTexto: "text-orange-700" },
  { id: "proposta_apresentada", label: "Proposta apresentada", cor: "bg-purple-50 text-purple-700 border-purple-300", corTexto: "text-purple-700" },
  { id: "negociacao", label: "Negociação", cor: "bg-pink-50 text-pink-700 border-pink-300", corTexto: "text-pink-700" },
  { id: "fechamento", label: "Fechamento", cor: "bg-emerald-50 text-emerald-700 border-emerald-300", corTexto: "text-emerald-700" },
  { id: "pos_venda", label: "Pós-venda", cor: "bg-teal-50 text-teal-700 border-teal-300", corTexto: "text-teal-700" },
  { id: "perdido", label: "Perdido", cor: "bg-red-50 text-red-700 border-red-300", corTexto: "text-red-700", encerramento: true },
  { id: "sem_interesse", label: "Sem interesse", cor: "bg-gray-50 text-gray-600 border-gray-300", corTexto: "text-gray-600", encerramento: true },
];

// --- Indicador ---
export const JORNADA_INDICADOR_ETAPAS: EtapaDef[] = [
  { id: "potencial_identificado", label: "Potencial indicador identificado", cor: "bg-slate-100 text-slate-700 border-slate-300", corTexto: "text-slate-700" },
  { id: "convite_realizado", label: "Convite realizado", cor: "bg-blue-50 text-blue-700 border-blue-300", corTexto: "text-blue-700" },
  { id: "aceitou_participar", label: "Aceitou participar", cor: "bg-cyan-50 text-cyan-700 border-cyan-300", corTexto: "text-cyan-700" },
  { id: "cadastro_conferencia", label: "Cadastro em conferência", cor: "bg-yellow-50 text-yellow-700 border-yellow-300", corTexto: "text-yellow-700" },
  { id: "pronto_enviar_central", label: "Pronto para enviar à Central", cor: "bg-orange-50 text-orange-700 border-orange-300", corTexto: "text-orange-700" },
  { id: "enviado_central", label: "Enviado à Central do Indicador", cor: "bg-purple-50 text-purple-700 border-purple-300", corTexto: "text-purple-700" },
  { id: "ativo_indicador", label: "Ativo como indicador", cor: "bg-emerald-50 text-emerald-700 border-emerald-300", corTexto: "text-emerald-700" },
  { id: "recusou", label: "Recusou", cor: "bg-red-50 text-red-700 border-red-300", corTexto: "text-red-700", encerramento: true },
  { id: "desistiu", label: "Desistiu", cor: "bg-gray-50 text-gray-600 border-gray-300", corTexto: "text-gray-600", encerramento: true },
];

// --- Recrutamento ---
export const JORNADA_RECRUTAMENTO_ETAPAS: EtapaDef[] = [
  { id: "candidato_identificado", label: "Candidato identificado", cor: "bg-slate-100 text-slate-700 border-slate-300", corTexto: "text-slate-700" },
  { id: "convite_processo", label: "Convite para processo seletivo", cor: "bg-blue-50 text-blue-700 border-blue-300", corTexto: "text-blue-700" },
  { id: "entrevista_agendada", label: "Entrevista agendada", cor: "bg-cyan-50 text-cyan-700 border-cyan-300", corTexto: "text-cyan-700" },
  { id: "entrevista_realizada", label: "Entrevista realizada", cor: "bg-green-50 text-green-700 border-green-300", corTexto: "text-green-700" },
  { id: "em_avaliacao", label: "Em avaliação", cor: "bg-yellow-50 text-yellow-700 border-yellow-300", corTexto: "text-yellow-700" },
  { id: "aprovado", label: "Aprovado", cor: "bg-emerald-50 text-emerald-700 border-emerald-300", corTexto: "text-emerald-700" },
  { id: "contratacao_andamento", label: "Contratação em andamento", cor: "bg-teal-50 text-teal-700 border-teal-300", corTexto: "text-teal-700" },
  { id: "contratado", label: "Contratado", cor: "bg-green-50 text-green-700 border-green-300", corTexto: "text-green-700" },
  { id: "integracao_inicial", label: "Integração inicial", cor: "bg-cyan-50 text-cyan-700 border-cyan-300", corTexto: "text-cyan-700" },
  { id: "ativo_equipe", label: "Ativo na equipe", cor: "bg-emerald-50 text-emerald-700 border-emerald-300", corTexto: "text-emerald-700" },
  { id: "nao_aprovado", label: "Não aprovado", cor: "bg-red-50 text-red-700 border-red-300", corTexto: "text-red-700", encerramento: true },
  { id: "desistiu", label: "Desistiu", cor: "bg-gray-50 text-gray-600 border-gray-300", corTexto: "text-gray-600", encerramento: true },
  { id: "processo_suspenso", label: "Processo suspenso", cor: "bg-orange-50 text-orange-700 border-orange-300", corTexto: "text-orange-700", encerramento: true },
];

// --- Resultado de reunião ---
export const RESULTADO_REUNIAO_LABEL: Record<ResultadoReuniao, string> = {
  interesse_credito: "Interesse em adquirir crédito",
  interesse_indicador: "Interesse em participar como indicador",
  interesse_equipe: "Interesse em trabalhar na equipe",
  multiplas_oportunidades: "Múltiplas oportunidades identificadas",
  sem_interesse: "Sem interesse no momento",
};

// ============================================================
// HELPERS
// ============================================================

export function getEtapaDef(
  jornadaTipo: JornadaTipo,
  etapaId: string,
): EtapaDef | undefined {
  const etapas =
    jornadaTipo === "cliente"
      ? JORNADA_CLIENTE_ETAPAS
      : jornadaTipo === "indicador"
        ? JORNADA_INDICADOR_ETAPAS
        : JORNADA_RECRUTAMENTO_ETAPAS;
  return etapas.find((e) => e.id === etapaId);
}

export function getEtapasByJornada(jornadaTipo: JornadaTipo): EtapaDef[] {
  return jornadaTipo === "cliente"
    ? JORNADA_CLIENTE_ETAPAS
    : jornadaTipo === "indicador"
      ? JORNADA_INDICADOR_ETAPAS
      : JORNADA_RECRUTAMENTO_ETAPAS;
}

export function isEtapaEncerramento(
  jornadaTipo: JornadaTipo,
  etapaId: string,
): boolean {
  const def = getEtapaDef(jornadaTipo, etapaId);
  return def?.encerramento ?? false;
}

export function getJornadaLabel(tipo: JornadaTipo): string {
  return tipo === "cliente"
    ? "Cliente"
    : tipo === "indicador"
      ? "Indicador"
      : "Recrutamento";
}

export function getProximaEtapa(
  jornadaTipo: JornadaTipo,
  etapaAtual: string | null,
): EtapaDef | undefined {
  const etapas = getEtapasByJornada(jornadaTipo);
  const currentIndex = etapas.findIndex((e) => e.id === etapaAtual);
  if (currentIndex < 0 || currentIndex >= etapas.length - 1) return undefined;
  // Não avançar para etapas de encerramento automaticamente
  const proxima = etapas[currentIndex + 1];
  if (proxima.encerramento) return undefined;
  return proxima;
}

// ============================================================
// ESTADO INICIAL
// ============================================================

export function createEmptyJornadas(): ContatoJornadas {
  return {
    contato_id: "",
    contato_tipo: "cliente",
    jornadas: {
      cliente: { ativa: false, etapa: null, iniciada_em: null, encerrada_em: null, responsavel: null },
      indicador: { ativa: false, etapa: null, iniciada_em: null, encerrada_em: null, responsavel: null },
      recrutamento: { ativa: false, etapa: null, iniciada_em: null, encerrada_em: null, responsavel: null },
    },
    reunioes: [],
    historico: [],
  };
}

// ============================================================
// DEMO — Persistência localStorage
// ============================================================

const DEMO_STORAGE_KEY = "crm-demo-jornadas";

export function salvarJornadasDemo(contato: ContatoJornadas): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    const records: ContatoJornadas[] = stored ? JSON.parse(stored) : [];
    const key = `${contato.contato_tipo}:${contato.contato_id}`;
    const idx = records.findIndex((r) => `${r.contato_tipo}:${r.contato_id}` === key);
    if (idx >= 0) {
      records[idx] = contato;
    } else {
      records.push(contato);
    }
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // falha silenciosa em modo demo
  }
}

export function carregarJornadasDemo(contatoId: string, contatoTipo: "cliente" | "lead" = "cliente"): ContatoJornadas {
  if (typeof window === "undefined") return { ...createEmptyJornadas(), contato_id: contatoId, contato_tipo: contatoTipo };
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return { ...createEmptyJornadas(), contato_id: contatoId, contato_tipo: contatoTipo };
    const records: ContatoJornadas[] = JSON.parse(stored);
    const key = `${contatoTipo}:${contatoId}`;
    let record = records.find((r) => `${r.contato_tipo}:${r.contato_id}` === key);
    // Compatibilidade com registros antigos sem contato_tipo
    if (!record) {
      record = records.find((r) => !r.contato_tipo && r.contato_id === contatoId);
      if (record) {
        // Migrar registro antigo adicionando contato_tipo
        record.contato_tipo = contatoTipo;
      }
    }
    return record ?? { ...createEmptyJornadas(), contato_id: contatoId, contato_tipo: contatoTipo };
  } catch {
    return { ...createEmptyJornadas(), contato_id: contatoId, contato_tipo: contatoTipo };
  }
}

export function removerJornadasDemo(contatoId: string, contatoTipo: "cliente" | "lead" = "cliente"): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return;
    const records: ContatoJornadas[] = JSON.parse(stored);
    const key = `${contatoTipo}:${contatoId}`;
    const filtered = records.filter((r) => `${r.contato_tipo}:${r.contato_id}` !== key);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // falha silenciosa
  }
}

export function listarTodasJornadasDemo(): ContatoJornadas[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}