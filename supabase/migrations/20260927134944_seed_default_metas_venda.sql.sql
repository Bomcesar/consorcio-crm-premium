BEGIN;

-- Meta padrão de venda fechada para Consultor (R$ 20.000,00)
INSERT INTO public.metas (
  titulo,
  descricao,
  tipo,
  valor_alvo,
  valor_realizado,
  periodo_inicio,
  periodo_fim,
  usuario_id,
  perfil_aplicavel,
  ativo
) SELECT
  'Meta de Venda Fechada - Consultor',
  'Meta mensal de venda fechada para consultores: R$ 20.000,00',
  'venda',
  20000,
  0,
  DATE_TRUNC('month', NOW())::date,
  (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  NULL,
  'Consultor',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.metas
  WHERE titulo = 'Meta de Venda Fechada - Consultor'
    AND perfil_aplicavel = 'Consultor'
    AND ativo = TRUE
);

-- Meta padrão de equipe (R$ 20.000,00)
INSERT INTO public.metas (
  titulo,
  descricao,
  tipo,
  valor_alvo,
  valor_realizado,
  periodo_inicio,
  periodo_fim,
  usuario_id,
  perfil_aplicavel,
  ativo
) SELECT
  'Meta de Venda Fechada - Equipe',
  'Meta de venda fechada para a equipe: R$ 20.000,00',
  'venda',
  20000,
  0,
  DATE_TRUNC('month', NOW())::date,
  (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::date,
  NULL,
  'Equipe',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.metas
  WHERE titulo = 'Meta de Venda Fechada - Equipe'
    AND perfil_aplicavel = 'Equipe'
    AND ativo = TRUE
);

COMMIT;
