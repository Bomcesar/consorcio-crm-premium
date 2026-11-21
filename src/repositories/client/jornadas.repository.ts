import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type JornadaInsert = Database["public"]["Tables"]["jornadas"]["Insert"];

export interface JornadaRecord {
  id: string;
  pessoa_id: string | null;
  contato_id: string;
  contato_tipo: "cliente" | "lead";
  jornada_tipo: "cliente" | "indicador" | "recrutamento";
  ativa: boolean;
  etapa: string | null;
  iniciada_em: string | null;
  encerrada_em: string | null;
  responsavel: string | null;
  observacoes: string | null;
  usuario_id: string;
  created_at: string;
  updated_at: string;
}

export interface JornadaHistoricoRecord {
  id: string;
  jornada_id: string;
  etapa: string;
  data: string;
  responsavel: string | null;
  observacao: string | null;
}

export interface JornadaReuniaoRecord {
  id: string;
  jornada_id: string;
  data: string;
  /** Resultado da reunião: valores legados ('positivo'|'neutro'|'negativo') ou
   *  resultados ricos da Central de Jornadas (ResultadoReuniao). */
  resultado: string;
  oportunidades: string[] | null;
  observacoes: string | null;
  responsavel: string | null;
}

export async function listarJornadasPorContato(
  contatoId: string,
  contatoTipo: "cliente" | "lead",
): Promise<JornadaRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jornadas")
    .select("*")
    .eq("contato_id", contatoId)
    .eq("contato_tipo", contatoTipo);

  if (error) throw new Error(error.message);
  return (data ?? []) as JornadaRecord[];
}

export async function criarJornada(
  payload: Omit<JornadaInsert, "id" | "created_at" | "updated_at">,
): Promise<JornadaRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jornadas")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as JornadaRecord;
}

export async function atualizarJornada(
  id: string,
  updates: Partial<Omit<JornadaInsert, "id" | "created_at">>,
): Promise<JornadaRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jornadas")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as JornadaRecord;
}

export async function registrarHistoricoJornada(
  jornadaId: string,
  etapa: string,
  responsavel: string | null,
  observacao: string | null,
): Promise<JornadaHistoricoRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jornada_historico")
    .insert({ jornada_id: jornadaId, etapa, responsavel, observacao })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as JornadaHistoricoRecord;
}

export async function listarHistoricoJornada(
  jornadaId: string,
): Promise<JornadaHistoricoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jornada_historico")
    .select("*")
    .eq("jornada_id", jornadaId)
    .order("data", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as JornadaHistoricoRecord[];
}

export async function criarReuniaoJornada(
  jornadaId: string,
  data: string,
  resultado: string,
  oportunidades: string[] | null,
  observacoes: string | null,
  responsavel: string | null,
): Promise<JornadaReuniaoRecord> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("jornada_reunioes")
    .insert({ jornada_id: jornadaId, data, resultado, oportunidades, observacoes, responsavel })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return row as JornadaReuniaoRecord;
}

export async function listarReunioesJornada(
  jornadaId: string,
): Promise<JornadaReuniaoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jornada_reunioes")
    .select("*")
    .eq("jornada_id", jornadaId)
    .order("data", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as JornadaReuniaoRecord[];
}