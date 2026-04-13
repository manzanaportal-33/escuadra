-- Registro de accesos (login): solo la API con service_role escribe/lee; no exponer a PostgREST público.

CREATE TABLE IF NOT EXISTS public.access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email varchar(255),
  event_type varchar(32) NOT NULL DEFAULT 'login',
  ip varchar(64),
  user_agent text,
  path varchar(512)
);

CREATE INDEX IF NOT EXISTS idx_access_log_created_at ON public.access_log (created_at DESC);

ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.access_log IS 'Auditoría de accesos (login); consulta vía API admin únicamente.';
