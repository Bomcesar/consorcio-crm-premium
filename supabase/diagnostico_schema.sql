-- Diagnóstico completo do schema e RLS

-- 1. Verifica colunas das tabelas principais
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('leads', 'clientes', 'negociacoes', 'cobrancas', 'agenda_eventos', 'comunicacoes', 'pos_venda', 'profiles')
ORDER BY table_name, ordinal_position;

-- 2. Verifica políticas RLS de profiles
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 3. Verifica políticas RLS de leads
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'leads';

-- 4. Verifica políticas RLS de clientes
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'clientes';
