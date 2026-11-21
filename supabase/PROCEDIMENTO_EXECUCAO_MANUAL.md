# Procedimento de Execução Manual — Supabase Studio

**Projeto:** consorcio-crm-premium  
**Projeto Supabase:** ejmhqmdogdmhiczpbize  
**Dashboard:** https://supabase.com/dashboard/project/ejmhqmdogdmhiczpbize  
**Data:** 2026-11-10  
**Status:** Pronto para aplicação manual (arquivos revisados localmente)

---

## ATENÇÃO

**NENHUMA migration deve ser executada no Supabase remoto nesta etapa de revisão.**  
Este documento orienta a execução manual futura, a ser realizada pelo usuário (Paulo Cesar) via Supabase Studio SQL Editor.

**Não execute as quatro migrations em um único bloco SQL.** Execute cada arquivo individualmente, verifique o resultado e só então prossiga para o próximo.

---

## 1. Acesso ao SQL Editor

1. Acesse https://supabase.com/dashboard/project/ejmhqmdogdmhiczpbize
2. No menu lateral esquerdo, clique em **SQL Editor**
3. Clique em **+ Nova consulta** (New query)
4. Cole o SQL da migration desejada no editor
5. Clique em **Executar** (Run)
6. Aguarde a conclusão e verifique se não há mensagens de erro

---

## 2. Antes da execução — Backup e diagnóstico

### 2.1. Backup recomendado

Antes de executar qualquer migration, faça um backup do banco de dados via Supabase Dashboard (Project Settings → Database → Backups) ou exporte o esquema relevante.

### 2.2. Consultas de diagnóstico

Execute estas consultas para verificar o estado atual do banco:

```sql
-- 2.2.1. Verificar se as tabelas base existem
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'user_permissions', 'permission_presets', 'permission_preset_items')
ORDER BY table_name;

-- 2.2.2. Verificar colunas de profiles (incluindo gestor_id e ativo)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2.2.3. Verificar funções de hierarquia já existentes
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('can_assign_profile', 'can_promote_to', 'get_team_members', 'is_gestor_of_direct', 'is_admin_safe', 'is_gestor_da_equipe')
ORDER BY routine_name;

-- 2.2.4. Verificar se RLS está habilitado em tabelas-chave
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('profiles', 'clientes', 'leads', 'indicadores')
  AND relnamespace = 'public'::regnamespace;

-- 2.2.5. Listar policies existentes em profiles
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
```

---

## 3. Ordem correta de execução das quatro migrations

Execute os quatro arquivos **na ordem abaixo, um por vez**. Após cada arquivo, execute as consultas de confirmação da seção 4 correspondente.

| Ordem | Arquivo | Objetivo | Dependências |
|-------|---------|----------|--------------|
| 1 | `supabase/migrations/20261108000011_expand_cargos_e_permissoes.sql` | Cria tabelas de permissões (user_permissions, permission_presets, permission_preset_items), 10 presets de cargo, 24 códigos de permissão, vínculos preset→permissão, RLS e policies nas tabelas de presets | `public.profiles` (tabela existente) |
| 2 | `supabase/migrations/20261108000012_funcoes_auxiliares_hierarquia.sql` | Cria 4 funções SECURITY DEFINER: `can_assign_profile`, `can_promote_to`, `get_team_members`, `is_gestor_of_direct`. Alinhado à matriz oficial de cargos. | `public.profiles` (tabela existente) |
| 3 | `supabase/migrations/20261110000000_correcao_seguranca_rls.sql` | Cria `is_admin_safe()`, `is_gestor_da_equipe()`, `audit_log`, corrige `handle_new_user()`, cria 3 triggers de proteção, aplica políticas restritivas em 13 tabelas comerciais + profiles | `public.profiles`, `auth.users`, funções da migration 2 (opcional para alguns objetos) |
| 4 | `supabase/migrations/20261111000000_correcao_rls_tabelas_restantes.sql` | Remove 4 políticas públicas perigosas, corrige políticas de ~45 tabelas restantes (incluindo pastas, pasta_itens, prospeccao_historico, proposta_eventos, ticker_messages revogando grants de anon), aplica triggers em tabelas com usuario_id, atualiza permission_presets para usar is_admin_safe() | Funções `is_admin_safe()` e `is_gestor_da_equipe()` (criadas na migration 3) |

### Ordem recomendada: 1 → 2 → 3 → 4

A migration 4 depende das funções criadas na migration 3 (`is_admin_safe()`, `is_gestor_da_equipe()`, `prohibit_usuario_id_change()`, `validate_admin_insert()`). Não pule a migration 3.

---

## 4. Execução individual — confirmação após cada migration

### Migration 1 — `20261108000011_expand_cargos_e_permissoes.sql`

**O que será criado/alterado:**
- Tabelas: `user_permissions`, `permission_presets`, `permission_preset_items` (IF NOT EXISTS)
- 10 presets de cargo (ON CONFLICT DO NOTHING)
- 24 códigos de permissão (ON CONFLICT DO NOTHING)
- Vínculos preset→permissão (matriz oficial)
- Índices de suporte
- RLS habilitado em `permission_presets` e `permission_preset_items`
- Policies: SELECT para authenticated; INSERT/UPDATE/DELETE apenas para admin

**Consulta de confirmação:**
```sql
-- Confirmar presets criados
SELECT nome FROM public.permission_presets ORDER BY nome;

-- Confirmar permissões criadas
SELECT count(*) AS total_permissoes FROM public.user_permissions;

-- Confirmar RLS ativo
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('permission_presets', 'permission_preset_items')
  AND relnamespace = 'public'::regnamespace;
```

**Critério de interrupção:** Se houver erro de sintaxe ou erro ao criar tabelas, não prossiga para a migration 2.

---

### Migration 2 — `20261108000012_funcoes_auxiliares_hierarquia.sql`

**O que será criado/alterado:**
- 4 funções SECURITY DEFINER com `SET search_path = ''`:
  - `can_assign_profile(p_current_user_id, p_new_profile)` — alinhado à matriz oficial
  - `can_promote_to(p_current_user_id, p_target_user_id, p_new_profile)` — bloqueia auto-promoção
  - `get_team_members(p_manager_id)` — retorna equipe via gestor_id
  - `is_gestor_of_direct(p_target_user_id)` — verifica gestor direto

**Consulta de confirmação:**
```sql
SELECT routine_name, routine_type, security_definer
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('can_assign_profile', 'can_promote_to', 'get_team_members', 'is_gestor_of_direct')
ORDER BY routine_name;
```

**Critério de interrupção:** Se houver erro na criação de qualquer função, não prossiga para a migration 3.

---

### Migration 3 — `20261110000000_correcao_seguranca_rls.sql`

**O que será criado/alterado:**
- Garante colunas `gestor_id` e `ativo` em `public.profiles` (se ausentes)
- Corrige CHECK constraint `profiles_perfil_check` com 10 cargos oficiais
- Cria `public.is_admin_safe()` (SECURITY DEFINER, search_path vazio)
- Cria `public.is_gestor_da_equipe(p_proprietario_id UUID)`
- Cria tabela `public.audit_log` (imutável)
- Corrige `public.handle_new_user()` (cadastro público = Indicador, ON CONFLICT DO NOTHING)
- Cria triggers: `profiles_protect_role_change`, `prohibit_usuario_id_change`, `validate_admin_insert`
- Aplica triggers em 13 tabelas comerciais
- Cria políticas restritivas em 13 tabelas + profiles

**Consulta de confirmação:**
```sql
-- Confirmar funções de segurança
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin_safe', 'is_gestor_da_equipe', 'handle_new_user', 'profiles_protect_role_change', 'prohibit_usuario_id_change', 'validate_admin_insert')
ORDER BY routine_name;

-- Confirmar tabela audit_log
SELECT to_regclass('public.audit_log') AS audit_log_exists;

-- Confirmar CHECK constraint de profiles
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_perfil_check';
```

**Critério de interrupção:** Se houver erro na criação de `is_admin_safe()` ou `is_gestor_da_equipe()`, não prossiga para a migration 4 (ela depende dessas funções).

---

### Migration 4 — `20261111000000_correcao_rls_tabelas_restantes.sql`

**O que será criado/alterado:**
- Remove 4 políticas públicas perigosas (profiles, usuario_status, propostas, proposta_eventos)
- Corrige políticas de ~45 tabelas com coluna `usuario_id` (padrão: proprietário / gestor da equipe / admin)
- Adiciona políticas individuais para `pastas`, `pasta_itens`, `prospeccao_historico`
- Corrige `proposta_eventos` INSERT policy (remove referência a coluna inexistente `p.ativo`)
- Revoga privilégios de `anon` em `public.ticker_messages`
- Atualiza `permission_presets` e `permission_preset_items` para usar `is_admin_safe()`
- Aplica triggers `prohibit_usuario_id_change` e `validate_admin_insert` em tabelas com `usuario_id` (verifica existência de tabela e coluna antes de criar)

**Consulta de confirmação:**
```sql
-- Confirmar que políticas perigosas foram removidas
SELECT policyname FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'usuario_status', 'propostas', 'proposta_eventos')
  AND policyname LIKE '%Authenticated users can view basic profiles%'
  OR policyname LIKE '%Authenticated users can view status%'
  OR policyname LIKE '%Public can view proposals by token%'
  OR policyname LIKE '%Public can insert proposal events%';
-- Esperado: 0 linhas (todas removidas)

-- Confirmar RLS em tabelas tratadas
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('pastas', 'pasta_itens', 'prospeccao_historico', 'ticker_messages')
  AND relnamespace = 'public'::regnamespace;
```

**Critério de interrupção:** Se houver erro na criação de políticas em qualquer tabela, anote a tabela e continue com as restantes. Não interrompa toda a migration, mas revise as tabelas com erro após a conclusão.

---

## 5. Após execução de todas as quatro migrations

### 5.1. Verificação completa de RLS

```sql
-- Listar todas as tabelas com RLS ativo
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relrowsecurity = true
ORDER BY relname;

-- Listar todas as policies por tabela
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar privilégios de anon em ticker_messages
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'ticker_messages' AND grantee = 'anon';
-- Esperado: 0 linhas (privilegios revogados)
```

### 5.2. Testes de isolamento

Execute `supabase/TESTES_SEGURANCA_RLS.sql` com usuários de teste reais (não administradores) para validar o isolamento entre consultores, gestores e administradores.

### 5.3. Critérios de aprovação final

- [ ] RLS ativo em todas as tabelas comerciais tratadas
- [ ] Nenhuma política `USING (true)` ou `WITH CHECK (true)` restante em tabelas comerciais
- [ ] `is_admin_safe()` e `is_gestor_da_equipe()` existem e funcionam
- [ ] Triggers `prohibit_usuario_id_change` e `validate_admin_insert` aplicados
- [ ] Tabela `audit_log` criada e imutável
- [ ] Privilégios de `anon` revogados em `ticker_messages`
- [ ] Testes de isolamento aprovados com usuários reais

---

## 6. Procedimento de recuperação em caso de erro

Se alguma migration falhar durante a execução:

1. **Não execute DROP CASCADE** — isso apagaria dados irreversivelmente.
2. **Identifique o erro** na saída do SQL Editor (mensagem de erro do PostgreSQL).
3. **Verifique o estado do banco** usando as consultas de diagnóstico (seção 2.2).
4. **Corrija o SQL localmente** no repositório e re-execute apenas a consulta falhada.
5. **Todas as migrations são idempotentes:** usam `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `DROP TRIGGER IF EXISTS`. Podem ser re-executadas com segurança.
6. **Não re-execute uma migration parcialmente aplicada sem diagnóstico:** verifique quais objetos já foram criados antes de tentar novamente.

---

## 7. Observações de segurança

- Todas as migrations são **idempotentes** (podem ser re-executadas com segurança).
- Nenhuma migration usa `DROP TABLE`, `DROP COLUMN`, `DROP CASCADE` ou `DELETE` de dados existentes.
- Nenhuma migration altera migrations históricas.
- As funções `SECURITY DEFINER` usam `SET search_path = ''` para prevenir injeção SQL.
- `is_admin_safe()` exige `perfil = 'Administrador'` E `ativo = TRUE`.
- Auto-elevação está bloqueada: `can_promote_to` retorna `FALSE` quando `current_user_id = target_user_id`.
- Privilégios de `anon` em `ticker_messages` são revogados (risco residual eliminado).
- `audit_log` é imutável: UPDATE e DELETE são bloqueados por policy (`USING (FALSE)`).

---

## 8. Hashes SHA-256 das migrations (para verificação de integridade)

Confirme que os arquivos executados correspondem exatamente aos revisados:

| Ordem | Arquivo | SHA-256 |
|-------|---------|---------|
| 1 | `20261108000011_expand_cargos_e_permissoes.sql` | `4A83D9478288AECD03A6DEEFF03B323C7B5C6610E33192BDB33F7872948FD350` |
| 2 | `20261108000012_funcoes_auxiliares_hierarquia.sql` | `8084A5CF3B19B2A128360190C0CC0BFB6A69A561B072F8D18EEF6F70A3B73B1A` |
| 3 | `20261110000000_correcao_seguranca_rls.sql` | `34B67B52C17E8AB9C4D24244319EB79E5FAA5DB5734EA7A6B42138D5349C918F` |
| 4 | `20261111000000_correcao_rls_tabelas_restantes.sql` | `1399C13299A9E6AEDACBE2E3A09C3A43E12FA7C2EF14E4F668D914234AD82BDC` |

---

## 9. O que NÃO fazer

- Não execute as quatro migrations em um único bloco SQL.
- Não execute migrations do Crédito Investimento (00008, 00009, 00010) nesta etapa.
- Não use `DROP CASCADE`.
- Não exclua tabelas, colunas ou registros.
- Não conceda `BYPASSRLS` ou superuser a qualquer role.
- Não use `service_role` como autorização funcional genérica no frontend.
