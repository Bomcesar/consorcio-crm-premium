import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";
import type { Database } from "@/types/database.types";

export type Meta = Database["public"]["Tables"]["metas"]["Row"];
export type MetaInsert = Database["public"]["Tables"]["metas"]["Insert"];
export type MetaUpdate = Database["public"]["Tables"]["metas"]["Update"];

export async function getMetas(): Promise<Meta[]> {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user, "metas.ver")) {
    throw new Error("Sem permissão para visualizar metas.");
  }

  const supabase = createClient();

  const SELECT_COLUMNS = "id,titulo,descricao,tipo,valor_alvo,valor_realizado,periodo_inicio,periodo_fim,usuario_id,perfil_aplicavel,ativo,created_at,updated_at";

  if (user.perfil === "Administrador") {
    const { data, error } = await supabase
      .from("metas")
      .select(SELECT_COLUMNS)
      .order("periodo_inicio", { ascending: false });

    if (error) throw new Error("Não foi possível carregar as metas.");
    return (data as Meta[]) ?? [];
  }

  if (user.perfil === "Gestor") {
    const { data, error } = await supabase
      .from("metas")
      .select(SELECT_COLUMNS)
      .or(`perfil_aplicavel.eq.Equipe,usuario_id.eq.${user.id}`)
      .order("periodo_inicio", { ascending: false });

    if (error) throw new Error("Não foi possível carregar as metas.");
    return (data as Meta[]) ?? [];
  }

  const { data, error } = await supabase
    .from("metas")
    .select(SELECT_COLUMNS)
    .or(`usuario_id.eq.${user.id},perfil_aplicavel.eq.Equipe`)
    .order("periodo_inicio", { ascending: false });

  if (error) throw new Error("Não foi possível carregar as metas.");
  return (data as Meta[]) ?? [];
}

export async function getMeta(id: string): Promise<Meta | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  if (!hasPermission(user, "metas.ver")) {
    throw new Error("Sem permissão para visualizar metas.");
  }

  const { data, error } = await supabase
    .from("metas")
    .select("id,titulo,descricao,tipo,valor_alvo,valor_realizado,periodo_inicio,periodo_fim,usuario_id,perfil_aplicavel,ativo,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  if (user.perfil === "Consultor" || user.perfil === "Assistente") {
    if (data.usuario_id !== user.id && data.perfil_aplicavel !== "Equipe") {
      return null;
    }
  }

  return data as Meta;
}

export async function createMeta(payload: MetaInsert): Promise<Meta> {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user, "metas.editar")) {
    throw new Error("Sem permissão para criar metas.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("metas")
       .insert({ ...payload, usuario_id: user.id })
    .select("id,titulo,descricao,tipo,valor_alvo,valor_realizado,periodo_inicio,periodo_fim,usuario_id,perfil_aplicavel,ativo,created_at,updated_at")
    .single();

  if (error || !data) throw new Error("Não foi possível salvar a meta.");
  return data as Meta;
}

export async function updateMeta(id: string, payload: MetaUpdate): Promise<Meta> {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user, "metas.editar")) {
    throw new Error("Sem permissão para editar metas.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("metas")
    .update(payload)
    .eq("id", id)
    .select("id,titulo,descricao,tipo,valor_alvo,valor_realizado,periodo_inicio,periodo_fim,usuario_id,perfil_aplicavel,ativo,created_at,updated_at")
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar a meta.");
  return data as Meta;
}

export async function deleteMeta(id: string): Promise<void> {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user, "metas.editar")) {
    throw new Error("Sem permissão para excluir metas.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("metas").delete().eq("id", id);

  if (error) throw new Error("Não foi possível excluir a meta.");
}
