-- Quitar talleres (si existían) y pasar cuerpo a relación N:N hermano ↔ cuerpo
DROP TABLE IF EXISTS public.profile_taller CASCADE;
DROP TABLE IF EXISTS public.taller CASCADE;

CREATE TABLE IF NOT EXISTS public.profile_cuerpo (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cuerpo_id smallint NOT NULL REFERENCES public.cuerpo(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, cuerpo_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_cuerpo_profile ON public.profile_cuerpo(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_cuerpo_cuerpo ON public.profile_cuerpo(cuerpo_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cuerpo_id'
  ) THEN
    INSERT INTO public.profile_cuerpo (profile_id, cuerpo_id)
    SELECT id, cuerpo_id FROM public.profiles WHERE cuerpo_id IS NOT NULL
    ON CONFLICT (profile_id, cuerpo_id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cuerpo_id_fkey;
DROP INDEX IF EXISTS idx_profiles_cuerpo_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS cuerpo_id;

-- PostgREST (API de Supabase) refresca la caché de tablas
NOTIFY pgrst, 'reload schema';
