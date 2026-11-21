# Implantação em produção — Sistema Operacional do Consultor

## Estado atual

- Produção (Supabase `ejmhqmdogdmhiczpbize`) está no schema da migration
  `20260929000002`.
- Repositório local tem 24 migrations pendentes de aplicação em produção.
- Código da entrega está na branch `homologacao/entrega-operacional`
  (7 commits). `main` permanece em `7bc0f59`, sem alteração.
- Aplicação publicada (`https://crm-consorcio.vercel.app`) responde 200 e não
  foi modificada nesta etapa.

## Por que o banco precisa vir antes do deploy

O código entregue depende de objetos que ainda não existem em produção:

| Objeto | Produção | Necessário para |
|---|---|---|
| `leads.tags` | ausente | etiquetas em Leads |
| `pessoas` | ausente | identidade única das jornadas |
| `jornadas` | ausente | jornada comercial/indicador/recrutamento |
| `jornada_historico` | ausente | histórico de etapas |
| `jornada_reunioes` | ausente | reuniões e resultados |
| `clientes.tags` | presente | etiquetas em Clientes |
| `usuario_status`, `profiles`, `user_permission_grants`, `module_visibility` | presentes | já em uso |

Publicar o código antes das migrations quebra as telas de Leads, Clientes
(etiquetas) e Jornadas em produção. Por isso a promoção para `main` só deve
ocorrer depois da aplicação do banco.

## Arquivos

| Arquivo | Uso |
|---|---|
| `00-pre-voo.sql` | conferências somente leitura |
| `01-pacote-aditivo.sql` | migrations `20260930000000` e `20261121000001` |
| `02-pacote-permissoes.sql` | demais 22 migrations |

## Roteiro

1. `00-pre-voo.sql` no SQL Editor. Atenção ao item 1: a migration
   `20261110000000` revalida `profiles_perfil_check` contra exatamente dez
   cargos. Se existir `perfil` fora dessa lista, o `VALIDATE CONSTRAINT`
   falha e a migration aborta sem alterar dados. Nesse caso, corrigir os
   perfis legados antes de prosseguir.
2. Backup de produção (painel do Supabase ou `pg_dump`).
3. Pacote 1 — seguro e idempotente. Pode ser aplicado isoladamente.
4. Pacote 2 — **altera permissões críticas**. Recomendado aplicar com
   `npx supabase db push`, que executa uma transação por arquivo e registra
   em `schema_migrations`. O arquivo `02-pacote-permissoes.sql` serve para
   revisão do conteúdo exato e para aplicação manual (cada migration já vem
   encapsulada em `BEGIN/COMMIT`).
5. Conferir contagens de linha contra o item 6 do pré-voo.
6. Só então promover a branch para `main`, o que dispara o deploy de produção.

## Garantias verificadas por leitura das migrations

- Nenhum `DROP TABLE`, `DELETE`, `TRUNCATE` ou `ALTER COLUMN ... TYPE`.
- Nenhum `DROP ... CASCADE` (as ocorrências de `CASCADE` são `ON DELETE
  CASCADE` em chaves estrangeiras).
- Todos os `CREATE TABLE`, `CREATE INDEX` e `ADD COLUMN` com guarda
  `IF NOT EXISTS` ou protegidos por verificação em `information_schema`.
- Os `DROP POLICY` / `DROP TRIGGER` usam `IF EXISTS` e são recriados na mesma
  transação.
- Nenhuma tabela teve RLS desabilitado e nenhuma policy nova é mais permissiva
  que a anterior.

## Fora do escopo desta etapa

- `supabase/RECONSTRUCAO_HISTORICO_MIGRATIONS.sql` reconcilia a tabela
  `schema_migrations` do banco **local**. Não executar em produção.
- O usuário de teste `teste@local.com` não deve ser migrado para produção.