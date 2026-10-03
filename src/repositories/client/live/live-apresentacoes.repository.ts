import { createClient } from "@/lib/supabase/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import type { LiveApresentacao, LiveTipoApresentacao } from "@/lib/live/types";

type SupabaseError = { message?: string; details?: string; hint?: string; code?: string };

function logSupabaseError(context: string, error: SupabaseError | null) {
  console.error(`[Live Apresentação] ${context} error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
}

export async function getApresentacaoAtiva(liveId: string): Promise<LiveApresentacao | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("live_apresentacoes")
    .select("*")
    .eq("live_id", liveId)
    .is("encerrada_em", null)
    .order("iniciado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseError("getApresentacaoAtiva", error);
    return null;
  }
  return (data as LiveApresentacao) ?? null;
}

/**
 * Envia o arquivo de apresentação reaproveitando a infraestrutura
 * de anexos existente (bucket privado "anexos" + tabela public.anexos
 * com entity_type = 'live_apresentacao'). Não há armazenamento duplicado.
 */
export async function enviarArquivoApresentacao(params: {
  liveId: string;
  livePresentationId: string;
  arquivo: File;
  tipo: Exclude<LiveTipoApresentacao, "screen">;
}): Promise<{ caminho: string; anexoId: string }> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  const caminho = `${user.id}/live_apresentacao/${params.liveId}/${Date.now()}-${params.arquivo.name}`;

  const { error: erroUpload } = await supabase.storage
    .from("anexos")
    .upload(caminho, params.arquivo, { cacheControl: "3600", upsert: false });

  if (erroUpload) {
    logSupabaseError("enviarArquivoApresentacao.upload", erroUpload);
    throw new Error("falha_apresentacao");
  }

  const { data: anexo, error: erroAnexo } = await supabase
    .from("anexos")
    .insert({
      entity_type: "live_apresentacao",
      entity_id: params.livePresentationId,
      nome: params.arquivo.name,
      caminho,
      tipo: params.arquivo.type || "application/pdf",
      tamanho: params.arquivo.size,
      usuario_id: user.id,
    })
    .select()
    .single();

  if (erroAnexo || !anexo) {
    // rollback do objeto órfão
    await supabase.storage.from("anexos").remove([caminho]);
    logSupabaseError("enviarArquivoApresentacao.anexo", erroAnexo);
    throw new Error("falha_apresentacao");
  }

  const anexoId = (anexo as { id: string }).id;

  const { error } = await supabase
    .from("live_apresentacoes")
    .update({ anexo_id: anexoId, caminho, mime_type: params.arquivo.type || "application/pdf" })
    .eq("id", params.livePresentationId);

  if (error) {
    logSupabaseError("enviarArquivoApresentacao.update", error);
    throw new Error("falha_apresentacao");
  }

  return { caminho, anexoId };
}

export async function iniciarApresentacao(params: {
  liveId: string;
  tipo: LiveTipoApresentacao;
  titulo: string;
  caminho?: string;
  mime_type?: string;
}): Promise<LiveApresentacao> {
  const user = await getAuthenticatedUser();
  const supabase = createClient();

  // A sala só admite uma apresentação aberta (índice único parcial
  // `live_apresentacoes_ativa_unica`). Fechar a anterior antes de
  // abrir a nova mantém essa regra e evita erro de constraint.
  const agora = new Date().toISOString();
  const { error: erroAoEncerrar } = await supabase
    .from("live_apresentacoes")
    .update({ encerrada_em: agora })
    .eq("live_id", params.liveId)
    .is("encerrada_em", null);
  if (erroAoEncerrar) logSupabaseError("iniciarApresentacao/encerrar anterior", erroAoEncerrar);

  const { data, error } = await supabase
    .from("live_apresentacoes")
    .insert({
      live_id: params.liveId,
      tipo: params.tipo,
      titulo: params.titulo.trim() || "Apresentação",
      caminho: params.caminho ?? "",
      mime_type: params.mime_type ?? "application/pdf",
      iniciado_por: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    logSupabaseError("iniciarApresentacao", error);
    throw new Error("falha_apresentacao");
  }
  return data as LiveApresentacao;
}

export async function atualizarApresentacao(
  id: string,
  payload: Partial<
    Pick<
      LiveApresentacao,
      "titulo" | "pagina_atual" | "total_paginas" | "reproduzindo" | "tempo_atual_segundos" | "encerrada_em"
    >
  >,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("live_apresentacoes").update(payload).eq("id", id);
  if (error) {
    logSupabaseError("atualizarApresentacao", error);
    throw new Error("Não foi possível sincronizar a apresentação.");
  }
}

export async function encerrarApresentacao(id: string): Promise<void> {
  await atualizarApresentacao(id, { encerrada_em: new Date().toISOString() });
}

/** Signed URL do arquivo, para o navegador renderizar sem expor o bucket. */
export async function getUrlApresentacao(caminho: string): Promise<string | null> {
  if (!caminho) return null;
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("anexos").createSignedUrl(caminho, 3600);
  if (error || !data) {
    logSupabaseError("getUrlApresentacao", error);
    return null;
  }
  return data.signedUrl;
}
