# RELATÓRIO FINAL — AUDITORIA E CORREÇÃO DE SEGURANÇA RLS (SUPABASE)
**Projeto:** consorcio-crm-premium  
**Fase 3:** Auditoria final e preparação para aplicação das migrations  
**Data:** 2026-11-10  
**Status:** Pacote revisado, corrigido e pronto para aplicação manual.  
**Branch:** `main` (sincronizada com `origin/main`)

---

## DECLARAÇÃO OBRIGATÓRIA

**NENHUMA MIGRATION FOI APLICADA NO SUPABASE REMOTO. NENHUM SQL FOI EXECUTADO NO BANCO REMOTO NESTA FASE.**  
Todas as alterações estão restritas ao repositório local.

---

## RESUMO EXECUTIVO

Foram auditadas integralmente as quatro migrations de segurança RLS. Foram encontrados e corrigidos **5 problemas críticos** nas migrations. Após as correções, todas as validações locais passaram:
- `npx tsc --noEmit`: 0 erros no código-fonte
- `npx vitest run`: 38/38 aprovados
- `npm run lint`: apenas warnings preexistentes
- `npm run build`: sucesso

O pacote está classificado como **APROVADO PARA APLICAÇÃO MANUAL** com ressalvas documentadas.

---

## PROBLEMAS ENCONTRADOS E CORRIGIDOS

| # | Migration | Problema | Severidade | Correção |
|---|-----------|----------|------------|----------|
| 1 | `20261108000012` | 4 funções `SECURITY DEFINER` sem `SET search_path = ''` — vulnerável a injeção SQL via manipulação de `search_path` | Alta | Adicionado `SET search_path = ''` em `can_assign_profile`, `can_promote_to`, `get_team_members`, `is_gestor_of_direct` |
| 2 | `20261108000012` | `can_assign_profile` inconsistente com a matriz oficial: Gestor Pleno não podia atribuir Gestor/Consultor Pleno; permitia Trainee/Secretaria indevidamente | Alta | Reescrito com listas explícitas de perfis, idêntico a `canCreateUser`/`canAssignProfile` em `src/lib/auth-user.ts` |
| 3 | `20261110000000` | `validate_admin_insert` permitia inserção de terceiros apenas via `service_role`, bloqueando Administrador autenticado (contradiz as policies e o comentário da função) | Alta | Adicionado branch `IF public.is_admin_safe()` antes do `RAISE EXCEPTION` final |
| 4 | `20261111000000` | Policy `PropostaEventos: admin pode inserir eventos` referenciava `p.ativo = TRUE` na tabela `propostas`, que **não possui coluna `ativo`** — causaria erro em tempo de execução | Alta | Removido `AND p.ativo = TRUE`; mantido apenas `EXISTS (SELECT 1 FROM public.propostas WHERE p.id = proposta_eventos.proposta_id)` |
| 5 | `20261111000000` | Policies de `permission_presets` e `permission_preset_items` (Migration 1) usavam `profiles.perfil = 'Administrador'` sem checar `ativo` | Média | Nova seção na Migration 4 substituindo por `public.is_admin_safe()` (que checa `ativo = TRUE`) |

---

## RESSALVAS RESOLVIDAS E NÃO RESOLVIDAS

### Ressalvas resolvidas

| Recurso | Problema | Status | Resolução |
|---------|----------|--------|-----------|
| `pastas`, `pasta_itens`, `prospeccao_historico` | Não existiam nas migrations históricas (CREATE TABLE não encontrado), mas existem em `database.types.ts` e são usadas nos repositories com isolamento por `usuario_id` | ✅ Resolvida | Seção 9 da Migration 4 adiciona policies RLS individuais para `pastas`, `pasta_itens`, `prospeccao_historico` com isolamento por `usuario_id` |
| `ticker_messages` | GRANTS massivos para `anon` em migration antiga `20260913000004` | ✅ Resolvida | Seção 8 da Migration 4 aplica `REVOKE ALL ON public.ticker_messages FROM anon` |

### Ressalvas não resolvidas (restam para execução manual)

| Recurso | Problema | Status | Observação |
|---------|----------|--------|------------|
| Validação real de RLS | Não é possível validar RLS no banco remoto (sem acesso/credenciais) | ⏳ Pendente | Testes reais de PostgreSQL/RLS dependem do banco remoto |
| Tabelas não mapeadas | `pastas`, `pasta_itens`, `prospeccao_historico` não têm CREATE TABLE nas migrations | ⏳ Pendente | Políticas RLS criadas na Migration 4, mas a existência das tabelas no banco remoto deve ser confirmada pelo usuário |
| Registro de migrations | Nenhuma tabela pública de schema_migrations no Supabase | ⏳ Pendente | Usuário deve registrar manualmente após aplicação |

---

## HASHES SHA-256 DAS MIGRATIONS (verificação de integridade)

| Ordem | Arquivo | SHA-256 |
|-------|---------|---------|
| 1 | `20261108000011_expand_cargos_e_permissoes.sql` | `4A83D9478288AECD03A6DEEFF03B323C7B5C6610E33192BDB33F7872948FD350` |
| 2 | `20261108000012_funcoes_auxiliares_hierarquia.sql` | `8084A5CF3B19B2A128360190C0CC0BFB6A69A561B072F8D18EEF6F70A3B73B1A` |
| 3 | `20261110000000_correcao_seguranca_rls.sql` | `34B67B52C17E8AB9C4D24244319EB79E5FAA5DB5734EA7A6B42138D5349C918F` |
| 4 | `20261111000000_correcao_rls_tabelas_restantes.sql` | `1399C13299A9E6AEDACBE2E3A09C3A43E12FA7C2EF14E4F668D914234AD82BDC` |

---

## MAPA DE DEPENDÊNCIAS E ORDEM DE EXECUÇÃO

As migrations têm dependências entre si. A ordem numérica (timestamp) já está correta, mas deve-se respeitar estritamente:

```
1. 20261108000011_expand_cargos_e_permissoes.sql
   └─ Depende de: public.profiles (tabela existente)
   ├─ Cria: user_permissions, permission_presets, permission_preset_items
   ├─ Habilita RLS em permission_presets e permission_preset_items
   └─ Sem dependência das outras 3 migrations

2. 20261108000012_funcoes_auxiliares_hierarquia.sql
   └─ Depende de: public.profiles (tabela existente)
   ├─ Cria: can_assign_profile, can_promote_to, get_team_members, is_gestor_of_direct
   └─ Sem dependência das outras 3 migrations

3. 20261110000000_correcao_seguranca_rls.sql
   └─ Depende de: public.profiles (tabela existente)
   ├─ Cria: is_admin_safe(), is_gestor_da_equipe(), audit_log
   ├─ Corrige: handle_new_user()
   ├─ Cria triggers: profiles_protect_role_change, prohibit_usuario_id_change, validate_admin_insert
   └─ Cria policies para 13 tabelas comerciais + profiles

4. 20261111000000_correcao_rls_tabelas_restantes.sql
   └─ Depende de: is_admin_safe(), is_gestor_da_equipe() (criados na Migration 3)
   ├─ Depende de: prohibit_usuario_id_change(), validate_admin_insert() (criados na Migration 3)
   ├─ Remove 4 políticas públicas perigosas de migrations antigas
   ├─ Corrige policies de ~45 tabelas restantes
   ├─ Adiciona policies individuais para pastas, pasta_itens, prospeccao_historico
   ├─ Aplica REVOKE ALL em ticker_messages FROM anon
   └─ Loop dinâmico de triggers com verificação de coluna usuario_id
```

**Ordem recomendada:** 1 → 2 → 3 → 4 (respeitando a ordem numérica/timestamp).  
Cada migration deve ser executada individualmente, com verificação após cada uma.  
Não executar as quatro em um único bloco.

---

## AUDITORIA DE SEGURANÇA

### A. Isolamento de dados

| Perfil | Acesso a dados próprios | Acesso a dados da equipe | Acesso a todos os dados | Usuários inativos |
|--------|------------------------|--------------------------|------------------------|-------------------|
| Administrador | ✅ | ✅ | ✅ (`is_admin_safe()`) | Bloqueado |
| Gestor Pleno | ✅ | ✅ (`is_gestor_da_equipe`) | ❌ | Bloqueado |
| Gestor | ✅ | ✅ (`is_gestor_da_equipe`) | ❌ | Bloqueado |
| Consultor Pleno | ✅ | ❌ | ❌ | Bloqueado |
| Consultor | ✅ | ❌ | ❌ | Bloqueado |
| Consultor em prévia | ✅ | ❌ | ❌ | Bloqueado |
| Líder em treinamento | ✅ | ❌ | ❌ | Bloqueado |
| Indicador | ✅ | ❌ | ❌ | Bloqueado |
| Trainee | ✅ | ❌ | ❌ | Bloqueado |
| Secretaria | ✅ | ❌ | ❌ | Bloqueado |

- `usuario_id` é o campo de isolamento em todas as tabelas comerciais.
- `gestor_id` em `profiles` define a hierarquia de equipe.
- `is_admin_safe()` exige `perfil = 'Administrador'` E `ativo = TRUE`.
- `is_gestor_da_equipe()` verifica que o chamador é Gestor/Gestor Pleno ATIVO e que o proprietário do registro tem `gestor_id = auth.uid()` E está ativo.

### B. Perfis

- **`handle_new_user()`**: Cadastro público recebe sempre `Indicador`. `ON CONFLICT DO NOTHING` — nunca sobrescreve perfil existente.
- **`profiles_protect_role_change()`**: Trigger `BEFORE UPDATE` em `profiles`. Bloqueia alteração de `perfil`, `gestor_id`, `ativo`, `ultimo_login`, `email`, `created_at`, `updated_at` por não-administradores. `service_role` é permitido.
- Não há duplicidade na criação de perfis (ON CONFLICT DO NOTHING).

### C. Funções SECURITY DEFINER

| Função | search_path | SECURITY DEFINER | EXECUTE granted to | Observações |
|--------|-------------|------------------|-------------------|-------------|
| `is_admin_safe()` | ✅ `''` | ✅ | `authenticated` | Verifica perfil + ativo |
| `is_gestor_da_equipe()` | ✅ `''` | ✅ | `authenticated` | Usa `auth.uid()`, não parâmetro do cliente |
| `can_assign_profile()` | ✅ `''` (corrigido) | ✅ | Não concedido explicitamente | Alinhado com matriz oficial |
| `can_promote_to()` | ✅ `''` (corrigido) | ✅ | Não concedido explicitamente | Bloqueia auto-promoção |
| `get_team_members()` | ✅ `''` (corrigido) | ✅ | Não concedido explícito | Retorna equipe via gestor_id |
| `is_gestor_of_direct()` | ✅ `''` (corrigido) | ✅ | Não concedido explícito | Verifica gestor direto |
| `profiles_protect_role_change()` | ✅ `''` | ✅ | N/A (trigger) | Protege campos administrativos |
| `prohibit_usuario_id_change()` | ✅ `''` | ✅ | N/A (trigger) | Bloqueia mudança de usuario_id |
| `validate_admin_insert()` | ✅ `''` | ✅ | N/A (trigger) | Permite self-insert, service_role, admin para terceiro |
| `handle_new_user()` | ✅ `''` | ✅ | N/A (trigger) | Cadastro público = Indicador |

Todas as funções corrigidas agora usam `SET search_path = ''` para prevenir injeção SQL.

### D. Privilégios SQL

- **Nenhuma concessão excessiva** a `anon`, `authenticated` ou `PUBLIC` nas migrations corrigidas.
- `is_admin_safe()`: `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated`.
- `is_gestor_da_equipe()`: `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO authenticated`.
- `ticker_messages`: `REVOKE ALL ON public.ticker_messages FROM anon` aplicado na Migration 4 (seção 8).
- **Não há** concessão de `BYPASSRLS` ou superuser.

### E. Auditoria (audit_log)

- Tabela `public.audit_log` criada com RLS habilitada.
- SELECT: apenas `is_admin_safe()`.
- INSERT: apenas `auth.role() = 'service_role'`.
- UPDATE: `USING (FALSE)` — bloqueado.
- DELETE: `USING (FALSE)` — bloqueado.
- Imutável: nenhuma política permite atualização ou exclusão.
- Índices em `created_at`, `usuario_responsavel`, `(tabela, registro_id)`.

---

## POLÍCIAS REMOVIDAS (perigosas)

A Migration 4 remove 4 políticas públicas perigosas de migrations antigas:

| Tabela | Policy removida | Risco |
|--------|----------------|-------|
| `public.profiles` | `Authenticated users can view basic profiles for identification` | Qualquer autenticado vê TODOS os perfis |
| `public.usuario_status` | `Authenticated users can view status` | Qualquer autenticado vê TODOS os status |
| `public.propostas` | `Public can view proposals by token` | Acesso público irrestrito (mesmo não autenticado) |
| `public.proposta_eventos` | `Public can insert proposal events` | Insert público irrestrito (`WITH CHECK (true)`) |

---

## POLÍCIAS CRIADAS / CORRIGIDAS

- **Migration 3**: Policies restritivas (proprietário / gestor da equipe / admin) para 13 tabelas comerciais + `profiles`. Todas usam `is_admin_safe()` e `is_gestor_da_equipe()`.
- **Migration 4**: Policies restritivas para ~45 tabelas adicionais (contatos_indicados, cliente_contatos, cliente_historico, negociacao_historico, anexos, whatsapp_mensagens, assembleias, assembleia_avisos, assembleia_historico, loteria_federal, lances, contemplacoes, contemplacao_historico, materiais_consultores, treinamentos, links_uteis, comunicacoes, comunicacao_templates, indicador_historico, cobranca_historico, lead_historico, lead_anexos, agenda_tarefas, agenda_followups, pos_venda_historico, pos_venda_tarefas, pos_venda_comunicacoes, propostas, proposta_eventos, proposta_followups, creditos_investimento, credito_historico, credito_tarefas, credito_reunioes, credito_mensagens_registradas, creditos_simulacoes).
- **Migration 4**: Policies individuais para `pastas`, `pasta_itens`, `prospeccao_historico` (isolamento por `usuario_id`).
- **Migration 4**: `playbooks_atendimento` (leitura autenticada), `playbook_mensagens` (leitura ativas), `live_presentes_*` (corrigido `is_admin()` → `is_admin_safe()`).
- **Migration 4**: `permission_presets` e `permission_preset_items` atualizados para usar `is_admin_safe()`.

---

## INVENTÁRIO REVISADO

**Limitação:** Não é possível verificar a quantidade exata de tabelas existentes no banco remoto sem acesso ao Supabase. O inventário abaixo é baseado no conteúdo das migrations e arquivos do repositório.

### Tabelas com RLS habilitada (via migrations)

| Categoria | Tabelas | RLS | Policies | Status |
|-----------|---------|-----|----------|--------|
| Comerciais (usuario_id) | clientes, leads, indicadores, agenda_eventos, negociacoes, cobrancas, pos_venda, recrutamento, parceiros, comissoes_indicadores, metas, user_permission_grants, user_evolution_history | Mig 3 | Mig 3 | Corrigidas |
| Comerciais (usuario_id) adicionais | contatos_indicados, cliente_contatos, cliente_historico, negociacao_historico, anexos, whatsapp_mensagens, assembleias, assembleia_avisos, assembleia_historico, loteria_federal, lances, contemplacoes, contemplacao_historico, materiais_consultores, treinamentos, links_uteis, comunicacoes, comunicacao_templates, indicador_historico, cobranca_historico, lead_historico, lead_anexos, agenda_tarefas, agenda_followups, pos_venda_historico, pos_venda_tarefas, pos_venda_comunicacoes | Mig 4 | Mig 4 | Corrigidas |
| Propostas | propostas, proposta_eventos, proposta_followups | Mig 1 (existente) + Mig 4 | Mig 4 (corrigidas) | Corrigidas |
| Crédito Investimento | creditos_investimento, credito_historico, credito_tarefas, credito_reunioes, credito_mensagens_registradas, creditos_simulacoes | Mig 1 (existente) + Mig 4 | Mig 4 (corrigidas) | Corrigidas |
| Referência | permission_presets, permission_preset_items | Mig 1 + Mig 4 | Mig 1 + Mig 4 (atualizadas) | Corrigidas |
| Referência (leitura) | playbooks_atendimento, playbook_mensagens | Mig 4 | Mig 4 | Corrigidas |
| Live | live_presentes_categorias, live_presentes_subcategorias, live_presentes | Mig 1 (existente) + Mig 4 | Mig 4 (is_admin → is_admin_safe) | Corrigidas |
| Auditoria | audit_log | Mig 3 | Mig 3 | Criada |
| Perfis | profiles | Mig 1 (existente) + Mig 3 | Mig 3 | Corrigidas |
| Pastas / Prospecção | pastas, pasta_itens, prospeccao_historico | Mig 4 | Mig 4 | Policies criadas (tabelas não confirmadas remota) |
| Mensageria | ticker_messages | Mig 4 (REVOKE anon) | Mig 4 | REVOKE aplicado |

### Tabelas com `usuario_id` verificada no repositório

Confirmadas via migrations históricas:
- `propostas` (usuario_id UUID NOT NULL REFERENCES auth.users(id))
- `leads` (usuario_id UUID NOT NULL, adicionado por migration 20260821000000)
- `credito_historico` (usuario_id uuid REFERENCES public.profiles(id), nullable)
- `credito_mensagens_registradas` (usuario_id uuid NOT NULL REFERENCES public.profiles(id))
- Todas as tabelas de agenda, cobrancas, anexos, negociacao_anexos, pos_venda, etc.

### Tabelas DROPEADAS (não existem mais)

- `central_indicadores`, `central_indicador_contatos`, `central_indicador_historico` — dropeadas por migration `20260929000002_drop_orphan_central_tables.sql.sql`.

---

## CLASSIFICAÇÃO DE CADA MIGRATION

| Migration | Classificação | Justificativa |
|-----------|--------------|---------------|
| `20261108000011_expand_cargos_e_permissoes.sql` | **APROVADA PARA APLICAÇÃO MANUAL** | Idempotente (IF NOT EXISTS, ON CONFLICT DO NOTHING), sem DROP CASCADE, sem exclusão de dados. Policies de permission_presets atualizadas na Migration 4. |
| `20261108000012_funcoes_auxiliares_hierarquia.sql` | **APROVADA PARA APLICAÇÃO MANUAL** | Idempotente (CREATE OR REPLACE), sem alteração de tabelas, search_path corrigido, can_assign_profile alinhado com matriz oficial. |
| `20261110000000_correcao_seguranca_rls.sql` | **APROVADA PARA APLICAÇÃO MANUAL** | Idempotente, validate_admin_insert corrigido para permitir admin para terceiro, is_admin_safe() com checagem de ativo. |
| `20261111000000_correcao_rls_tabelas_restantes.sql` | **APROVADA PARA APLICAÇÃO MANUAL COM RESSALVAS** | Todas as tabelas são verificadas com IF EXISTS antes de criar policies. `proposta_eventos` corrigida (remoção de `p.ativo` inexistente). permission_presets atualizadas. Ressalvas: tabelas `pastas`, `pasta_itens`, `prospeccao_historico` — políticas criadas mas existência remota não confirmada; `ticker_messages` REVOKE de anon aplicado. |

---

## PROCEDIMENTO DE EXECUÇÃO MANUAL

Consultar `supabase/PROCEDIMENTO_EXECUCAO_MANUAL.md` para o passo a passo completo no Supabase Studio.

**Ordem:** 1 → 2 → 3 → 4  
**Cada migration deve ser executada individualmente**, com verificação após cada uma.  
**Não executar as quatro em um único bloco.**  
**Não executar migrations do Crédito Investimento (00008, 00009, 00010) nesta etapa.**

---

## TESTES

### Testes unitários (vitest)
- `src/lib/auth-user.test.ts`: 38 testes aprovados (matriz de criação, atribuição de perfis, permissões, hierarquia, view/edit de perfis).

### Testes de banco (Supabase Studio)
- `supabase/TESTES_SEGURANCA_RLS.sql`: Roteiro completo de testes de isolamento e RLS. **Não executados** (requerem banco remoto com usuários de teste reais).

### Validações locais
| Comando | Resultado |
|---------|-----------|
| `npx tsc --noEmit` | 0 erros no código-fonte (erros TS6053 são de cache `.next/types` stale) |
| `npx vitest run` | 38/38 aprovados |
| `npm run lint` | Apenas warnings preexistentes |
| `npm run build` | Sucesso |

**Não foram executados testes reais de RLS no banco remoto.** Isso depende da aplicação das migrations e de usuários de teste no Supabase.

---

## ARQUIVOS MODIFICADO NESTA FASE

| Caminho | Alteração |
|---------|-----------|
| `supabase/migrations/20261108000012_funcoes_auxiliares_hierarquia.sql` | Adicionado `SET search_path = ''` nas 4 funções; reescrito `can_assign_profile` para alinhar com matriz oficial |
| `supabase/migrations/20261110000000_correcao_seguranca_rls.sql` | `validate_admin_insert` agora permite `is_admin_safe()` para inserção de terceiros |
| `supabase/migrations/20261111000000_correcao_rls_tabelas_restantes.sql` | Removido `p.ativo = TRUE` da policy `proposta_eventos`; adicionada seção 10 para atualizar `permission_presets`/`permission_preset_items` com `is_admin_safe()`; seção 9 com policies para pastas/pasta_itens/prospeccao_historico; seção 8 REVOKE anon em ticker_messages; loop de triggers com verificação de coluna |
| `supabase/PROCEDIMENTO_EXECUCAO_MANUAL.md` | Reescrito com procedimento completo de execução das 4 migrations (backup, diagnóstico, ordem 1→2→3→4, confirmações, recuperação, observações de segurança, hashes SHA-256) |
| `supabase/TESTES_SEGURANCA_RLS.sql` | Reescrito com consultas de catálogo (18 itens A1-A9) e testes de isolamento real (18 itens B1-B18) |

---

## PRÓXIMOS PASSOS (usuário)

1. Aplicar as 4 migrations via Supabase Studio SQL Editor, na ordem 1 → 2 → 3 → 4.
2. Executar `supabase/TESTES_SEGURANCA_RLS.sql` com usuários de teste reais.
3. Confirmar que as policies RLS estão ativas (`pg_class.relrowsecurity`).
4. Verificar existência das tabelas `pastas`, `pasta_itens`, `prospeccao_historico` no banco remoto (políticas RLS já criadas na Migration 4).
5. Revisar o privilégio de `anon` em `ticker_messages` (REVOKE aplicado na Migration 4).
6. Registrar as migrations no histórico do Supabase após execução bem-sucedida.

O projeto não está totalmente finalizado enquanto a execução manual e os testes reais de isolamento não forem concluídos pelo usuário.

---
