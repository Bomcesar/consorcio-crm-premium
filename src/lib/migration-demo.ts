import { createClient } from "@/lib/supabase/client";
import { carregarJornadasDemo } from "@/lib/jornadas";
import { carregarEtiquetasDemo } from "@/lib/etiquetas";

const MIGRATION_KEY = "crm-demo-migration-status";

export interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: string[];
}

export function getMigrationStatus(): { done: boolean; timestamp: string | null } {
  if (typeof window === "undefined") return { done: false, timestamp: null };
  try {
    const stored = localStorage.getItem(MIGRATION_KEY);
    if (!stored) return { done: false, timestamp: null };
    return JSON.parse(stored);
  } catch {
    return { done: false, timestamp: null };
  }
}

export async function migrarDemoParaSupabase(
  contatoId: string,
  contatoTipo: "cliente" | "lead",
): Promise<MigrationResult> {
  const supabase = createClient();
  const result: MigrationResult = { success: true, migrated: 0, skipped: 0, errors: [] };

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.success = false;
    result.errors.push("Usuário não autenticado.");
    return result;
  }

  try {
    // Migrar jornadas
    const jornadas = carregarJornadasDemo(contatoId, contatoTipo);
    if (jornadas.jornadas.cliente.ativa || jornadas.jornadas.indicador.ativa || jornadas.jornadas.recrutamento.ativa) {
      // Verificar se já existe no Supabase
      const { data: existing } = await supabase
        .from("jornadas")
        .select("id")
        .eq("contato_id", contatoId)
        .eq("contato_tipo", contatoTipo)
        .eq("usuario_id", user.id);

      if (!existing || existing.length === 0) {
        // Inserir cada jornada ativa
        for (const tipo of ["cliente", "indicador", "recrutamento"] as const) {
          const j = jornadas.jornadas[tipo];
          if (j.ativa) {
            const { error } = await supabase.from("jornadas").insert({
              contato_id: contatoId,
              contato_tipo: contatoTipo,
              jornada_tipo: tipo,
              ativa: true,
              etapa: j.etapa,
              iniciada_em: j.iniciada_em,
              encerrada_em: j.encerrada_em,
              responsavel: j.responsavel,
              usuario_id: user.id,
            });
            if (error) {
              result.errors.push(`Erro ao migrar jornada ${tipo}: ${error.message}`);
              result.success = false;
            } else {
              result.migrated++;
            }
          }
        }
      } else {
        result.skipped++;
      }
    }

    // Registrar status
    if (result.success) {
      localStorage.setItem(MIGRATION_KEY, JSON.stringify({ done: true, timestamp: new Date().toISOString() }));
    }
  } catch (err) {
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : "Erro desconhecido");
  }

  return result;
}