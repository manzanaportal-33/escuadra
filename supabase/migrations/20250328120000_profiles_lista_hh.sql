-- Campos alineados con planilla LISTA_HH (Excel)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grado_troncal smallint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS obs_scg33 varchar(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS detalle text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exencion varchar(120);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fechas_cuotas jsonb;

NOTIFY pgrst, 'reload schema';
