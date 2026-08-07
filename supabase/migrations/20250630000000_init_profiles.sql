-- Profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  perfil TEXT NOT NULL DEFAULT 'Consultor' CHECK (perfil IN ('Administrador', 'Gestor', 'Consultor', 'Trainee', 'Secretaria', 'Indicador')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_perfil TEXT;
  v_avatar_url TEXT;
BEGIN
  v_nome := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), split_part(NEW.email, '@', 1));
  v_perfil := COALESCE(NULLIF(NEW.raw_user_meta_data->>'perfil', ''), 'Consultor');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  IF v_perfil NOT IN ('Administrador', 'Gestor', 'Consultor', 'Trainee', 'Secretaria', 'Indicador') THEN
    v_perfil := 'Consultor';
  END IF;

  INSERT INTO public.profiles (id, nome, email, perfil, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, v_perfil, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        perfil = EXCLUDED.perfil,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();

CREATE INDEX IF NOT EXISTS profiles_perfil_idx
  ON public.profiles (perfil);

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (email);
