import { createClient } from "@/lib/supabase/client";
import { ETIQUETAS_RELACIONAMENTO, ETIQUETAS_INTERESSE, ETIQUETAS_PAPEL } from "@/lib/etiquetas";

/**
 * Persistência de etiquetas usando o campo `tags` (text, separado por vírgula)
 * nas tabelas `clientes` e `leads`.
 */

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

function serializeTags(tags: string[]): string {
  return tags.join(",");
}

export async function carregarEtiquetasContato(
  contatoId: string,
  contatoTipo: "cliente" | "lead",
): Promise<string[]> {
  const supabase = createClient();
  const tabela = contatoTipo === "cliente" ? "clientes" : "leads";
  const { data, error } = await supabase
    .from(tabela)
    .select("tags")
    .eq("id", contatoId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return [];

  return parseTags((data as { tags: string | null }).tags);
}

export async function salvarEtiquetasContato(
  contatoId: string,
  contatoTipo: "cliente" | "lead",
  etiquetas: string[],
): Promise<void> {
  const supabase = createClient();
  const tabela = contatoTipo === "cliente" ? "clientes" : "leads";
  const { error } = await supabase
    .from(tabela)
    .update({ tags: serializeTags(etiquetas) })
    .eq("id", contatoId);

  if (error) throw new Error(error.message);
}

export function validarEtiquetasSelecionadas(selecionadas: string[]): {
  valido: boolean;
  erro?: string;
  grupos: { A: string[]; B: string[]; C: string[] };
} {
  const grupos = { A: [] as string[], B: [] as string[], C: [] as string[] };

  for (const id of selecionadas) {
    if (ETIQUETAS_RELACIONAMENTO.some((e: { id: string }) => e.id === id)) {
      grupos.A.push(id);
    } else if (ETIQUETAS_INTERESSE.some((e: { id: string }) => e.id === id)) {
      grupos.B.push(id);
    } else if (ETIQUETAS_PAPEL.some((e: { id: string }) => e.id === id)) {
      grupos.C.push(id);
    }
  }

  // Grupo A: máximo 1 etiqueta principal
  if (grupos.A.length > 1) {
    return {
      valido: false,
      erro: "Apenas uma etiqueta de relacionamento (Grupo A) pode ser selecionada por vez.",
      grupos,
    };
  }

  // Grupo C: máximo 1 etiqueta de papel
  if (grupos.C.length > 1) {
    return {
      valido: false,
      erro: "Apenas uma etiqueta de papel (Grupo C) pode ser selecionada por vez.",
      grupos,
    };
  }

  return { valido: true, grupos };
}