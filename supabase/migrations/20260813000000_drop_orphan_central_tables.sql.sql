BEGIN;

DROP TABLE IF EXISTS public.central_indicador_historico;
DROP TABLE IF EXISTS public.central_indicador_contatos;
DROP TABLE IF EXISTS public.central_indicadores;

DROP FUNCTION IF EXISTS public.update_central_indicadores_updated_at();
DROP FUNCTION IF EXISTS public.update_central_indicador_contatos_updated_at();

COMMIT;
