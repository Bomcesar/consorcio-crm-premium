BEGIN;

-- ============================================================
-- PASTAS, PASTA_ITENS E PROSPECCAO_HISTORICO:
-- RLS + policies seguindo o padrão do resto do CRM.
-- ============================================================

-- PASTAS
ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all pastas"
  ON public.pastas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team pastas"
  ON public.pastas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can view own pastas"
  ON public.pastas FOR SELECT
  USING (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can insert pastas"
  ON public.pastas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can insert pastas"
  ON public.pastas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can insert own pastas"
  ON public.pastas FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can update any pasta"
  ON public.pastas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team pastas"
  ON public.pastas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can update own pastas"
  ON public.pastas FOR UPDATE
  USING (
    usuario_id = auth.uid()
  )
  WITH CHECK (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can delete any pasta"
  ON public.pastas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team pastas"
  ON public.pastas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can delete own pastas"
  ON public.pastas FOR DELETE
  USING (
    usuario_id = auth.uid()
  );

-- PASTA_ITENS
ALTER TABLE public.pasta_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all pasta_itens"
  ON public.pasta_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team pasta_itens"
  ON public.pasta_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can view own pasta_itens"
  ON public.pasta_itens FOR SELECT
  USING (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can insert pasta_itens"
  ON public.pasta_itens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can insert pasta_itens"
  ON public.pasta_itens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can insert own pasta_itens"
  ON public.pasta_itens FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can update any pasta_item"
  ON public.pasta_itens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team pasta_itens"
  ON public.pasta_itens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can update own pasta_itens"
  ON public.pasta_itens FOR UPDATE
  USING (
    usuario_id = auth.uid()
  )
  WITH CHECK (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can delete any pasta_item"
  ON public.pasta_itens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team pasta_itens"
  ON public.pasta_itens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can delete own pasta_itens"
  ON public.pasta_itens FOR DELETE
  USING (
    usuario_id = auth.uid()
  );

-- PROSPECCAO_HISTORICO
ALTER TABLE public.prospeccao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all prospeccao_historico"
  ON public.prospeccao_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team prospeccao_historico"
  ON public.prospeccao_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can view own prospeccao_historico"
  ON public.prospeccao_historico FOR SELECT
  USING (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can insert prospeccao_historico"
  ON public.prospeccao_historico FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can insert prospeccao_historico"
  ON public.prospeccao_historico FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can insert own prospeccao_historico"
  ON public.prospeccao_historico FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can update any prospeccao_historico"
  ON public.prospeccao_historico FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team prospeccao_historico"
  ON public.prospeccao_historico FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can update own prospeccao_historico"
  ON public.prospeccao_historico FOR UPDATE
  USING (
    usuario_id = auth.uid()
  )
  WITH CHECK (
    usuario_id = auth.uid()
  );

CREATE POLICY "Admins can delete any prospeccao_historico"
  ON public.prospeccao_historico FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team prospeccao_historico"
  ON public.prospeccao_historico FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Users can delete own prospeccao_historico"
  ON public.prospeccao_historico FOR DELETE
  USING (
    usuario_id = auth.uid()
  );

COMMIT;
