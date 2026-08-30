import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser, isAdminOrGestor } from "@/lib/auth-user";

export type Pasta = Database["public"]["Tables"]["pastas"]["Row"];
export type PastaInsert = Database["public"]["Tables"]["pastas"]["Insert"];
export type PastaUpdate = Database["public"]["Tables"]["pastas"]["Update"];
export type PastaItem = Database["public"]["Tables"]["pasta_itens"]["Row"];
export type PastaItemInsert = Database["public"]["Tables"]["pasta_itens"]["Insert"];
export type PastaItemUpdate = Database["public"]["Tables"]["pasta_itens"]["Update"];
export type ProspeccaoHistorico = Database["public"]["Tables"]["prospeccao_historico"]["Row"];
export type ProspeccaoHistoricoInsert = Database["public"]["Tables"]["prospeccao_historico"]["Insert"];
export type ProspeccaoHistoricoUpdate = Database["public"]["Tables"]["prospeccao_historico"]["Update"];

function pastaBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("pastas").select("*");
}

function pastaItemBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("pasta_itens").select("*");
}

function prospeccaoHistoricoBaseQuery(supabase: ReturnType<typeof createClient>) {
  return supabase.from("prospeccao_historico").select("*");
}

export async function getPastas(): Promise<Pasta[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = pastaBaseQuery(supabase).order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as pastas.");
  return (data as Pasta[]) ?? [];
}

export async function getOrCreatePastaMestre(): Promise<Pasta> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("pastas")
    .select("*")
    .eq("usuario_id", user.id)
    .eq("nome", "Mestre")
    .maybeSingle();

  if (fetchError) {
    console.error("[pastas.repository] Erro ao buscar pasta mestre:", fetchError);
  }

  if (existing) {
    return existing as Pasta;
  }

  const { data, error } = await supabase
    .from("pastas")
    .insert({
      nome: "Mestre",
      descricao: "Pasta temporária para novos contatos. Mova os contatos para pastas específicas.",
      cor: "#3b82f6",
      origem: "sistema",
      usuario_id: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Não foi possível criar a pasta mestre.");
  }

  return data as Pasta;
}

export async function getPasta(id: string): Promise<Pasta | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = pastaBaseQuery(supabase).eq("id", id);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query.single();
  if (error) return null;
  return data as Pasta;
}

export async function createPasta(payload: PastaInsert): Promise<Pasta> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pastas")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error) throw new Error("Não foi possível criar a pasta.");
  return data as Pasta;
}

export async function updatePasta(id: string, payload: PastaUpdate): Promise<Pasta> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("pastas").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error) throw new Error("Não foi possível atualizar a pasta.");
  return data as Pasta;
}

export async function deletePasta(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("pastas").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível excluir a pasta.");
}

export async function getPastaItens(pastaId: string): Promise<PastaItem[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = supabase
    .from("pasta_itens")
    .select("*,cliente:clientes(*)")
    .eq("pasta_id", pastaId)
    .order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar os itens da pasta.");
  return (data as PastaItem[]) ?? [];
}

export async function addClienteToPasta(payload: PastaItemInsert): Promise<PastaItem> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pasta_itens")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error) throw new Error("Não foi possível adicionar o contato à pasta.");
  return data as PastaItem;
}

export async function updatePastaItem(id: string, payload: PastaItemUpdate): Promise<PastaItem> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("pasta_itens").update(payload).eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { data, error } = await query.select().single();
  if (error) throw new Error("Não foi possível atualizar o item da pasta.");
  return data as PastaItem;
}

export async function removeClienteFromPasta(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const base = supabase.from("pasta_itens").delete().eq("id", id);
  const query = isAdminOrGestor(user) ? base : base.eq("usuario_id", user.id);
  const { error } = await query;
  if (error) throw new Error("Não foi possível remover o contato da pasta.");
}

export async function getProspeccaoHistorico(pastaItemId: string): Promise<ProspeccaoHistorico[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = prospeccaoHistoricoBaseQuery(supabase)
    .eq("pasta_item_id", pastaItemId)
    .order("created_at", { ascending: false });
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar o histórico de prospecção.");
  return (data as ProspeccaoHistorico[]) ?? [];
}

export async function addProspeccaoHistorico(payload: ProspeccaoHistoricoInsert): Promise<ProspeccaoHistorico> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prospeccao_historico")
    .insert({ ...payload, usuario_id: user.id })
    .select()
    .single();
  if (error) throw new Error("Não foi possível registrar a interação.");
  return data as ProspeccaoHistorico;
}

export async function getProspeccaoStats(pastaId: string) {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  let query = supabase
    .from("pasta_itens")
    .select("prospeccao_status")
    .eq("pasta_id", pastaId);
  if (!isAdminOrGestor(user)) {
    query = query.eq("usuario_id", user.id);
  }
  const { data: itens, error } = await query;
  if (error) throw new Error("Não foi possível carregar as estatísticas.");
  
  const stats = {
    total: 0,
    nao_contatado: 0,
    contatado: 0,
    retorno_pendente: 0,
    interessado: 0,
    convertido: 0,
    sem_resposta: 0,
    numero_invalido: 0,
  };

  (itens ?? []).forEach((item) => {
    stats.total++;
    switch (item.prospeccao_status) {
      case "Não contatado":
        stats.nao_contatado++;
        break;
      case "Ligação realizada":
      case "WhatsApp enviado":
      case "SMS enviado":
      case "Conversa iniciada":
        stats.contatado++;
        break;
      case "Retorno pendente":
        stats.retorno_pendente++;
        break;
      case "Interessado":
      case "Em negociação":
        stats.interessado++;
        break;
      case "Convertido":
        stats.convertido++;
        break;
      case "Sem resposta":
        stats.sem_resposta++;
        break;
      case "Número inválido":
        stats.numero_invalido++;
        break;
    }
  });

  return stats;
}
