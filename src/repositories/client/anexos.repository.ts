import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { getAuthenticatedUser } from "@/lib/auth-user";

export type Anexo = Database["public"]["Tables"]["anexos"]["Row"];
export type AnexoInsert = Database["public"]["Tables"]["anexos"]["Insert"];
export type AnexoUpdate = Database["public"]["Tables"]["anexos"]["Update"];

export async function getAnexos(entityType: string, entityId: string): Promise<Anexo[]> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("anexos")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Não foi possível carregar os anexos.");
  return (data as Anexo[]) ?? [];
}

export async function getAnexo(id: string): Promise<Anexo | null> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("anexos")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (error || !data) return null;
  return data as Anexo;
}

export async function uploadAnexo(
  entityType: string,
  entityId: string,
  file: File,
  options?: { nome?: string }
): Promise<Anexo> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${user.id}/${entityType}/${entityId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("anexos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Não foi possível enviar o arquivo: ${uploadError.message}`);
  }

  const { data, error } = await supabase.from("anexos")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      nome: options?.nome || file.name,
      caminho: filePath,
      tipo: file.type || "application/octet-stream",
      tamanho: file.size,
      usuario_id: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    await supabase.storage.from("anexos").remove([filePath]);
    throw new Error("Não foi possível registrar o anexo.");
  }

  return data as Anexo;
}

export async function getDownloadUrl(caminho: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from("anexos")
    .createSignedUrl(caminho, 3600);

  if (error || !data) {
    throw new Error("Não foi possível gerar o link de download.");
  }

  return data.signedUrl;
}

export async function deleteAnexo(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const { data: anexo, error: fetchError } = await supabase.from("anexos")
    .select("caminho")
    .eq("id", id)
    .eq("usuario_id", user.id)
    .single();

  if (fetchError || !anexo) {
    throw new Error("Anexo não encontrado.");
  }

  const { error: deleteDbError } = await supabase.from("anexos")
    .delete()
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (deleteDbError) {
    throw new Error("Não foi possível excluir o registro do anexo.");
  }

  const { error: deleteStorageError } = await supabase.storage
    .from("anexos")
    .remove([anexo.caminho]);

  if (deleteStorageError) {
    console.error("Não foi possível excluir o arquivo do storage:", deleteStorageError);
  }
}

export async function updateAnexo(id: string, payload: AnexoUpdate): Promise<Anexo> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();
  const { data, error } = await supabase.from("anexos")
    .update(payload)
    .eq("id", id)
    .eq("usuario_id", user.id)
    .select()
    .single();

  if (error || !data) throw new Error("Não foi possível atualizar o anexo.");
  return data as Anexo;
}
