import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type PessoaRow = Database["public"]["Tables"]["pessoas"]["Row"];
type PessoaInsert = Database["public"]["Tables"]["pessoas"]["Insert"];
type VinculoRow = Database["public"]["Tables"]["pessoa_vinculos"]["Row"];

export type PessoaRecord = PessoaRow;
export type VinculoRecord = VinculoRow;

export async function criarPessoa(
  payload: Omit<PessoaInsert, "id" | "created_at" | "updated_at">,
): Promise<PessoaRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pessoas")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PessoaRecord;
}

export async function buscarPessoaPorId(id: string): Promise<PessoaRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pessoas")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data as PessoaRecord) ?? null;
}

export async function buscarPessoaPorContato(
  contatoId: string,
  contatoTipo: "cliente" | "lead",
): Promise<PessoaRecord | null> {
  const supabase = createClient();
  const { data: vinculo, error: vErr } = await supabase
    .from("pessoa_vinculos")
    .select("pessoa_id")
    .eq("tipo_entidade", contatoTipo)
    .eq("entidade_id", contatoId)
    .maybeSingle();

  if (vErr && vErr.code !== "PGRST116") throw new Error(vErr.message);
  if (!vinculo) return null;

  return buscarPessoaPorId(vinculo.pessoa_id);
}

export async function criarOuBuscarPessoa(
  contatoId: string,
  contatoTipo: "cliente" | "lead",
  dados: { nome: string; email?: string | null; telefone?: string | null },
): Promise<PessoaRecord> {
  // Tentar encontrar vínculo existente
  const existente = await buscarPessoaPorContato(contatoId, contatoTipo);
  if (existente) return existente;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Criar pessoa
  const nova = await criarPessoa({
    nome: dados.nome,
    email: dados.email ?? null,
    telefone: dados.telefone ?? null,
    usuario_id: user?.id ?? null,
  });

  // Criar vínculo
  const { error: vErr } = await supabase.from("pessoa_vinculos").insert({
    pessoa_id: nova.id,
    tipo_entidade: contatoTipo,
    entidade_id: contatoId,
  });

  if (vErr) throw new Error(vErr.message);

  return nova;
}

export async function listarVinculos(pessoaId: string): Promise<VinculoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pessoa_vinculos")
    .select("*")
    .eq("pessoa_id", pessoaId);

  if (error) throw new Error(error.message);
  return (data ?? []) as VinculoRecord[];
}

export async function buscarPessoaPorNomeOuEmail(
  termo: string,
): Promise<PessoaRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pessoas")
    .select("*")
    .or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,telefone.ilike.%${termo}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as PessoaRecord[];
}