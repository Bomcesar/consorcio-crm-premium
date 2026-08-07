import { getBrowserSupabase } from "@/repositories/supabase-browser";
import type { Parceiro } from "@/types/crm";

const LOCAL_STORAGE_KEY = "crm-parceiros-local";

export type ParceiroInsertInput = {
  nome: string;
  empresa: string;
  segmento: string;
  telefone: string;
  email: string;
  cidade: string;
  status: string;
  nivel_parceria: string;
  comissao_percentual: number;
  ultimo_contato: string | null;
  observacoes: string;
};

export type ParceiroUpdateInput = Partial<ParceiroInsertInput>;

function isSchemaCacheError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? String((error as { message?: unknown }).message ?? "")
        : "";
  return /schema cache|could not find the table|relation .* does not exist/i.test(message);
}

function readLocalParceiros(): Parceiro[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Parceiro[];
  } catch {
    return [];
  }
}

function writeLocalParceiros(parceiros: Parceiro[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parceiros));
}

function sortParceiros(parceiros: Parceiro[]): Parceiro[] {
  return [...parceiros].sort((left, right) => {
    const leftDate = new Date(left.created_at ?? 0).getTime();
    const rightDate = new Date(right.created_at ?? 0).getTime();
    return rightDate - leftDate;
  });
}

function createLocalParceiro(input: ParceiroInsertInput): Parceiro {
  const now = new Date().toISOString();
  return {
    id: `local-${crypto.randomUUID()}`,
    nome: input.nome,
    empresa: input.empresa,
    segmento: input.segmento,
    telefone: input.telefone,
    email: input.email,
    cidade: input.cidade,
    status: input.status,
    nivel_parceria: input.nivel_parceria,
    comissao_percentual: input.comissao_percentual,
    ultimo_contato: input.ultimo_contato,
    observacoes: input.observacoes,
    created_at: now,
    updated_at: now,
  };
}

export async function listParceirosRepository(): Promise<Parceiro[]> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("parceiros").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Parceiro[]) ?? [];
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    return sortParceiros(readLocalParceiros());
  }
}

export async function createParceiroRepository(input: ParceiroInsertInput): Promise<Parceiro> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("parceiros").insert(input).select().single();
    if (error) throw error;
    return data as Parceiro;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    const next = [createLocalParceiro(input), ...readLocalParceiros()];
    writeLocalParceiros(next);
    return next[0];
  }
}

export async function updateParceiroRepository(id: string, input: ParceiroUpdateInput): Promise<Parceiro> {
  const supabase = getBrowserSupabase();
  try {
    const { data, error } = await supabase.from("parceiros").update(input).eq("id", id).select().single();
    if (error) throw error;
    return data as Parceiro;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    const next = readLocalParceiros().map((parceiro) =>
      parceiro.id === id ? { ...parceiro, ...input, updated_at: new Date().toISOString() } : parceiro,
    );
    writeLocalParceiros(next);
    const updated = next.find((parceiro) => parceiro.id === id);
    if (!updated) throw error;
    return updated;
  }
}

export async function deleteParceiroRepository(id: string): Promise<void> {
  const supabase = getBrowserSupabase();
  try {
    const { error } = await supabase.from("parceiros").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (!isSchemaCacheError(error)) throw error;
    writeLocalParceiros(readLocalParceiros().filter((parceiro) => parceiro.id !== id));
  }
}