/**
 * Testes de integração com Supabase LOCAL.
 * Valida persistência e isolamento no PostgreSQL local.
 *
 * As suítes só executam quando o Supabase local está de pé; caso contrário
 * são ignoradas (skip) para não invalidar o gate de qualidade em CI/offline.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../.env.local");
  let content = "";
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    return {};
  }
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnvLocal();
const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Probe de disponibilidade: só roda a suíte quando o serviço responde.
let SUPABASE_DISPONIVEL = false;
if (LOCAL_ANON) {
  try {
    const res = await fetch(`${LOCAL_URL}/auth/v1/health`, {
      signal: AbortSignal.timeout(2500),
    });
    // 401/404 também indicam que o serviço respondeu.
    SUPABASE_DISPONIVEL = res.ok || res.status === 401 || res.status === 404;
  } catch {
    SUPABASE_DISPONIVEL = false;
  }
}

const TEST_EMAIL = "teste@local.com";
const TEST_PASSWORD = "123456";

let supabase: SupabaseClient;
let userId: string;

beforeAll(async () => {
  try {
    supabase = createClient(LOCAL_URL, LOCAL_ANON);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error) throw new Error(`Falha no login: ${error.message}`);
    userId = data.user!.id;
  } catch {
    // Ambiente indisponível: as suítes são ignoradas via skipIf (probe acima).
  }
}, 15000);

describe.skipIf(!SUPABASE_DISPONIVEL)(
  "Integração Supabase Local — Autenticação",
  () => {
    it("deve autenticar o usuário de teste", () => {
      expect(userId).toBeDefined();
    });
  },
);

describe.skipIf(!SUPABASE_DISPONIVEL)(
  "Integração Supabase Local — Persistência de Etiquetas",
  () => {
    it("deve criar cliente com etiquetas e recuperar após reload", async () => {
      const tags = "prospectado,cliente_imovel,indicador";

      const { data: created, error: createError } = await supabase
        .from("clientes")
        .insert({ nome: "Cliente Teste Etiquetas", tags, usuario_id: userId })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(created).toBeDefined();
      const clienteId = created.id;

      // Simular reload: buscar do banco
      const { data: fetched, error: fetchError } = await supabase
        .from("clientes")
        .select("id, nome, tags")
        .eq("id", clienteId)
        .single();

      expect(fetchError).toBeNull();
      expect(fetched!.tags).toBe(tags);
      expect(fetched!.tags!.split(",")).toContain("prospectado");
      expect(fetched!.tags!.split(",")).toContain("cliente_imovel");
      expect(fetched!.tags!.split(",")).toContain("indicador");

      // Cleanup
      await supabase.from("clientes").delete().eq("id", clienteId);
    }, 15000);

    it("deve criar lead com etiquetas e persistir", async () => {
      const tags = "andamento,cliente_automovel";

      const { data: created, error: createError } = await supabase
        .from("leads")
        .insert({ nome: "Lead Teste Etiquetas", tags, usuario_id: userId })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(created).toBeDefined();
      const leadId = created.id;

      const { data: fetched, error: fetchError } = await supabase
        .from("leads")
        .select("id, nome, tags")
        .eq("id", leadId)
        .single();

      expect(fetchError).toBeNull();
      expect(fetched!.tags).toBe(tags);

      await supabase.from("leads").delete().eq("id", leadId);
    }, 15000);

    it("deve atualizar etiquetas de cliente existente", async () => {
      const { data: created, error: createError } = await supabase
        .from("clientes")
        .insert({ nome: "Cliente Update Tags", tags: "prospectado", usuario_id: userId })
        .select()
        .single();

      expect(createError).toBeNull();
      const clienteId = created.id;

      const { error: updateError } = await supabase
        .from("clientes")
        .update({ tags: "andamento,cliente_automovel,cliente_alavancagem" })
        .eq("id", clienteId);

      expect(updateError).toBeNull();

      const { data: fetched } = await supabase
        .from("clientes")
        .select("tags")
        .eq("id", clienteId)
        .single();

      expect(fetched!.tags).toBe("andamento,cliente_automovel,cliente_alavancagem");

      await supabase.from("clientes").delete().eq("id", clienteId);
    }, 15000);
  },
);

describe.skipIf(!SUPABASE_DISPONIVEL)(
  "Integração Supabase Local — Isolamento RLS",
  () => {
    it("não deve permitir leitura sem autenticação", async () => {
      const anon = createClient(LOCAL_URL, LOCAL_ANON);
      const { data, error } = await anon.from("clientes").select("id").limit(1);

      // Sem autenticação, RLS deve bloquear: retorna vazio ou erro PGRST301
      expect(error?.code === "PGRST301" || (data?.length ?? 0) === 0).toBe(true);
      // Nunca deve retornar dados de outros usuários sem auth
      if (data && data.length > 0) {
        expect(data.length).toBe(0);
      }
    }, 15000);
  },
);