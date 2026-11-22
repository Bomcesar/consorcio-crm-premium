# Implantação em produção — Sistema Operacional do Consultor

## Estado atual

- Produção (Supabase `ejmhqmdogdmhiczpbize`) está no schema da migration
  `20260929000002`.
- Branch de homologação `homologacao/entrega-operacional` com **9 commits**
  à frente de `origin/main` (`7bc0f59`). `main` **não** foi alterado.
- Aplicação publicada (`https://crm-consorcio.vercel.app`) responde 200 e não
  foi modificada nesta etapa.
- 24 migrations pendentes em produção, separadas em dois pacotes:
  - `01-pacote-aditivo.sql` → `20260930000000`, `20261121000001` (2 migrations).
  - `02-pacote-permissoes.sql` → demais **22** migrations.

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
(etiquetas) e Jornadas em produção. Por isso a promoção para `main` só ocorre
depois da aplicação do banco.

## Arquivos

| Arquivo | Uso |
|---|---|
| `00-pre-voo.sql` | conferências somente leitura (não altera dados) |
| `01-pacote-aditivo.sql` | `20260930000000` + `20261121000001` (aditivo, idempotente) |
| `02-pacote-permissoes.sql` | as 22 migrations restantes, em ordem |
| `B1-estagio.sql` | 15 migrations: fundação estrutural e funções auxiliares |
| `B2-estagio.sql` | 6 migrations: políticas RLS, `pessoas` e `jornadas` |
| `B3-estagio.sql` | 1 migration: CHECK final de `jornada_reunioes.resultado` |

`B1/B2/B3` são fatias de `02-pacote-permissoes.sql` (conteúdo idêntico,
apenas agrupado por dependência). Cada migration continua em `BEGIN/COMMIT`
próprio. A soma B1+B2+B3 = as 22 migrations de `02`.

## Backup (obrigatório antes de qualquer migration)

Sem credenciais de banco/psql no ambiente atual, gere o backup por um destes
caminhos:

1. **Painel do Supabase** → *Database → Backups* → *Create backup* (PITR ou
   dump sob demanda). Confirme `schema`, `data` e metadados de Storage.
2. **pg_dump** (se tiver connection string):
   `pg_dump "postgresql://<user>:<senha>@<host>:5432/postgres" -Fc -f backup_prod.dump`
3. **Storage**: inventário de arquivos via painel (não há backup automático de
   objetos; exporte os críticos separadamente se necessário).

Validação mínima pós-backup: restaurar o dump em um banco temporário e conferir
contagens de `clientes`, `leads`, `profiles`, `negociacoes`,
`comissoes_indicadores`. **Não** iniciar alterações estruturais sem backup
validado.

## Ordem obrigatória de entrada em produção

1. Backup de produção (acima).
2. Pré-voo do banco: `00-pre-voo.sql`.
3. Aplicar migrations autorizadas (Opção A, B ou C).
4. Validar schema remoto (as colunas `leads.tags`, `pessoas`, `jornadas`,
   `jornada_historico`, `jornada_reunioes` passam a existir).
5. Configurar variáveis de ambiente (produção já aponta para o projeto correto;
   não alterar `.env.local`).
6. Publicar **Preview** e testar autenticação, rotas e persistência.
7. Testes autenticados e de permissões (10 cargos) no Preview.
8. Aprovação da publicação.
9. Merge `homologacao/entrega-operacional` → `main`.
10. Deployment Production e testes finais no domínio real.

O código novo **não** é publicado antes de o banco ter o schema de que depende.

## Três opções de execução

### Opção A — Implantação completa (recomendada)

Aplicar `01-pacote-aditivo.sql` e, em seguida, `02-pacote-permissoes.sql` (22
migrations na ordem original). Cada migration é uma transação própria.

- **Onde afeta:** somente o banco de produção.
- **O que muda:** cria colunas/tabelas/funções/políticas ausentes; revalida
  `profiles_perfil_check`; amplia CHECK de `jornada_reunioes.resultado`.
- **Risco de perda de dados:** nenhum por construção (sem `DROP`/`DELETE`/
  `TRUNCATE`; `ADD COLUMN IF NOT EXISTS`; policies recriadas na mesma
  transação). Se uma migration falhar, ela aborta em sua própria transação.
- **Ponto de atenção:** `20261110000000` revalida `profiles_perfil_check`
  contra exatamente dez cargos. Se houver `perfil` legado fora da lista, o
  `VALIDATE CONSTRAINT` falha e a migration aborta **sem** alterar dados.
  Corrija os perfis antes de prosseguir (ver pré-voo item 1).

### Opção B — Implantação por etapas

Aplicar os pacotes independentes respeitando a ordem de dependência:

1. `01-pacote-aditivo.sql`
2. `B1-estagio.sql` (15 migrations: `module_visibility`/metas, núcleo Live,
   `expand_cargos_e_permissoes`, `funcoes_auxiliares_hierarquia`,
   `fix_profiles_role_security`)
3. `B2-estagio.sql` (6 migrations: `correcao_seguranca_rls`,
   `correcao_rls_tabelas_restantes`, `create_pessoas_identidade`,
   `create_jornadas`, `fix_rls_recursao_policies`,
   `fix_policies_inline_profiles_funcoes`)
4. `B3-estagio.sql` (1 migration: `altera_jornada_reunioes_resultado`)

- **Onde afeta:** somente o banco de produção.
- **Vantagem:** permite validar o schema após B1 e B2 antes do CHECK final.
- **B3 é atômico e seguro:** o `DROP CONSTRAINT` + `ADD CONSTRAINT` ocorrem no
  mesmo bloco `DO`/transação; se `ADD` falhar (linha legada fora do conjunto),
  a transação inteira faz rollback e o CHECK antigo permanece. Consulta
  informativa antes do B3:
  `SELECT DISTINCT resultado FROM public.jornada_reunioes;`
  (deve estar contido em `positivo, neutro, negativo, interesse_credito,
  interesse_indicador, interesse_equipe, multiplas_oportunidades,
  sem_interesse` ou ser NULL).

### Opção C — Preparação assistida (SQL Editor)

Se a CLI não permitir aplicação segura, use os arquivos `.sql` no **SQL Editor**
do Supabase, na ordem: `00` → `01` → (`B1` → `B2` → `B3` **ou** `02`).
Cada migration já vem encapsulada em `BEGIN/COMMIT`; cole um arquivo por vez e
confira a saída antes do próximo.

> Não executar `supabase db push` enquanto houver migrations pendentes cujo
> impacto ainda não foi autorizado.

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
- Cada migration em `02` (e em `B1/B2/B3`) está em `BEGIN/COMMIT` próprio
  (validado: 15/15, 6/6, 1/1).

## Fora do escopo desta etapa

- `supabase/RECONSTRUCAO_HISTORICO_MIGRATIONS.sql` reconcilia a tabela
  `schema_migrations` do banco **local**. Não executar em produção.
- O usuário de teste `teste@local.com` não deve ser migrado para produção.
- `service_role` nunca deve ser usado no cliente; RLS não deve ser desabilitada
  para resolver erros.