# Supabase – SCG 33

Migraciones y configuración de la base de datos en Supabase (PostgreSQL).

## Cómo aplicar la migración

1. Creá un proyecto en [Supabase](https://app.supabase.com).
2. En el dashboard: **SQL Editor** → **New query**.
3. Copiá y pegá todo el contenido de `migrations/20250306000001_initial.sql`.
4. Ejecutá (Run).

Eso crea:

- `user_groups` – roles (Admin, Grado 4, …, Grado 33)
- `cuerpo` – cuerpos escocistas
- `otros_orientes` – otros orientes
- `profiles` – perfil de cada usuario (vinculado a `auth.users`)
- `tramites` y `tramites_adjuntos` – solicitudes en línea
- `carpetas_roles` – permisos por carpeta
- `file` – metadata de archivos de la biblioteca
- Trigger que crea un perfil automáticamente al registrarse un usuario

## Primer usuario admin

Después de crear un usuario en **Authentication → Users**, promovélo a admin con:

```sql
UPDATE public.profiles SET user_level = 1 WHERE id = 'uuid-del-usuario';
```

(O reemplazá el UUID por el `id` del usuario que ves en Authentication.)
