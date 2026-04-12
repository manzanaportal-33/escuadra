-- Biblioteca: columna para ruta en Storage y carpetas raíz
ALTER TABLE public.file ADD COLUMN IF NOT EXISTS storage_path text;

-- Bucket para archivos de biblioteca (PDF, Word, Excel)
-- Si falla (ej. en algunos proyectos): creá el bucket "biblioteca" desde el dashboard de Supabase (Storage).
INSERT INTO storage.buckets (id, name, public)
VALUES ('biblioteca', 'biblioteca', false)
ON CONFLICT (id) DO NOTHING;

-- Política: solo servicio (API con service role) puede escribir; lecturas vía signed URL
-- Si usás RLS en storage, asegurate de que la API use service role para upload/download

-- Carpetas raíz de biblioteca (categorías)
INSERT INTO public.file (code, filename, is_folder, folder_id)
VALUES
  ('libros', 'Libros', true, null),
  ('descargas', 'Descargas', true, null),
  ('boletines', 'Boletines', true, null),
  ('decretos', 'Decretos', true, null),
  ('comunicados', 'Comunicados', true, null),
  ('planchas', 'Planchas', true, null)
ON CONFLICT (code) DO NOTHING;
