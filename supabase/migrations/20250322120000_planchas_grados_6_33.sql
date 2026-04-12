-- Subcarpetas "Grado 6" … "Grado 33" dentro de la categoría Planchas (code = 'planchas').
-- Códigos únicos: plg06 … plg33 (máx. 12 caracteres, sin colisión con carpetas creadas por la app).

DO $$
DECLARE
  planchas_id smallint;
BEGIN
  SELECT id INTO planchas_id
  FROM public.file
  WHERE code = 'planchas' AND is_folder = true
  LIMIT 1;

  IF planchas_id IS NULL THEN
    RAISE NOTICE 'No existe la carpeta raíz con code = planchas. Creala antes o aplicá la migración 20250306000002_biblioteca_storage.sql.';
    RETURN;
  END IF;

  INSERT INTO public.file (code, filename, is_folder, folder_id)
  SELECT
    'plg' || lpad(g::text, 2, '0'),
    'Grado ' || g::text,
    true,
    planchas_id
  FROM generate_series(6, 33) AS g
  ON CONFLICT (code) DO NOTHING;
END $$;
