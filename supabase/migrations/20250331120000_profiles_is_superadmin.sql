-- Superadmin: solo este usuario puede ver el registro de accesos (y rutas API asociadas).
-- Activar en SQL: UPDATE public.profiles SET is_superadmin = true WHERE id = '<uuid>';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_superadmin IS 'Si true, puede ver /api/users/access-log y la pantalla Registro de accesos.';
