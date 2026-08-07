import { getBrowserSupabase } from "@/repositories/supabase-browser";
import type { RecrutamentoCandidato } from "@/types/crm";

const LOCAL_STORAGE_KEY = "crm-recrutamento-local";

export type RecrutamentoInsertInput = {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  vaga_interesse: string;
  etapa: string;
  fonte: string;
  score_aderencia: number;
  disponibilidade_inicio: string | null;
  status: string;
  observacoes: string;
};

export type RecrutamentoUpdateInput = Partial<RecrutamentoInsertInput>;

function isSchemaCacheError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? String((error as { message?: unknown }).message ?? "")
        : "";
  return /schema cache|could not find the table|relation .* does not exist/i.test(message);
}

function readLocalRecrutamento(): RecrutamentoCandidato[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as RecrutamentoCandidato[];
  } catch {
    return [];
  }
}

function writeLocalRecrutamento(candidatos: RecrutamentoCandidato[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(candidatos));
}

function sortRecrutamento(candidatos: RecrutamentoCandidato[]): RecrutamentoCandidato[] {
  return [...candidatos].sort((left, right) => {
    const leftDate = new Date(left.created_at ?? 0).getTime();
    const rightDate = new Date(right.created_at ?? 0).getTime();
    return rightDate - leftDate;
  });
}

function createLocalCandidato(input: RecrutamentoInsertInput): RecrutamentoCandidato {
  const now = new Date().toISOString();
  return {
    id: `local-${crypto.randomUUID()}`,
    nome: input.nome,
    telefone: input.telefone,
    email: input.email,
    cidade: input.cidade,
    vaga_interesse: input.vaga_interesse,
    etapa: input.etapa,
    fonte: input.fonte,
    score_aderencia: input.score_aderencia,
    disponibilidade_inicio: input.disponibilidade_inicio,
    status: input.status,
    observacoes: input.observacoes,
    created_at: now,
    updated_at: now,
  };
}

export async function listRecrutamentoRepository(): Promise<RecrutamentoCandidato[]> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("recrutamento").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as RecrutamentoCandidato[]) ?? [];
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    return sortRecrutamento(readLocalRecrutamento());
  }
}

export async function createRecrutamentoRepository(input: RecrutamentoInsertInput): Promise<RecrutamentoCandidato> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("recrutamento").insert(input).select().single();
    if (error) throw error;
    return data as RecrutamentoCandidato;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    const next = [createLocalCandidato(input), ...readLocalRecrutamento()];
    writeLocalRecrutamento(next);
    return next[0];
  }
}

export async function updateRecrutamentoRepository(
  id: string,
  input: RecrutamentoUpdateInput,
): Promise<RecrutamentoCandidato> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("recrutamento").update(input).eq("id", id).select().single();
    if (error) throw error;
    return data as RecrutamentoCandidato;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    const next = readLocalRecrutamento().map((candidato) =>
      candidato.id === id ? { ...candidato, ...input, updated_at: new Date().toISOString() } : candidato,
    );
    writeLocalRecrutamento(next);
    const updated = next.find((candidato) => candidato.id === id);
    if (!updated) throw error;
    return updated;
  }
}

export async function deleteRecrutamentoRepository(id: string): Promise<void> {
  const supabase = getBrowserSupabase();
  try {
    const { error } = await supabase.from("recrutamento").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    writeLocalRecrutamento(readLocalRecrutamento().filter((candidato) => candidato.id !== id));
  }
}