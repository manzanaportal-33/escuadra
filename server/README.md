# API SCG 33° – Área reservada (Supabase)

API REST para el sistema del Supremo Consejo Grado 33° (Argentina). Usa **Supabase** como base de datos y autenticación.

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)

## 1. Crear proyecto en Supabase

1. Entrá a [app.supabase.com](https://app.supabase.com) y creá un proyecto.
2. En **Settings → API** copiá:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; no exponer al front)
   - **anon** `public` → `SUPABASE_ANON_KEY` (recomendada: el login y el refresh usan un cliente aparte; evita que listados admin vean solo un usuario por RLS)

## 2. Ejecutar la migración

En el dashboard de Supabase: **SQL Editor** → New query → pegá el contenido de:

```
supabase/migrations/20250306000001_initial.sql
```

Ejecutá la query. Eso crea las tablas `user_groups`, `cuerpo`, `otros_orientes`, `profiles`, `tramites`, etc., y el trigger que crea un perfil cuando se registra un usuario.

## 3. Crear el primer usuario (admin)

1. En Supabase: **Authentication → Users** → **Add user** → **Create new user**.
2. Ingresá email y contraseña (ej. `admin@scg33.org.ar`).
3. En **SQL Editor** ejecutá (reemplazá el UUID por el `id` del usuario que creaste):

```sql
UPDATE public.profiles SET user_level = 1 WHERE id = 'uuid-del-usuario';
```

Con eso ese usuario queda como Admin (nivel 1).

## 4. Configuración local de la API

```bash
cp .env.example .env
```

Editá `.env` con `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.

### Correo: notificaciones de trámites (solicitud de ingreso, etc.)

Cuando un hermano envía un trámite desde la app, la API puede **avisar por email** a secretaría (o a quien definan).

Variables opcionales:

| Variable | Descripción |
|----------|-------------|
| `NOTIFY_EMAIL_TRAMITES` | Uno o más correos destino, separados por coma (ej. `secretaria@institucion.org`). |
| `SMTP_FROM` | Remitente visible (debe ser un remitente válido en vuestro proveedor). |
| `SMTP_HOST` | Servidor SMTP (ej. `smtp.gmail.com`, `smtp.office365.com`, o el de vuestro hosting). |
| `SMTP_PORT` | Por defecto `587` (STARTTLS). Para SSL directo suele ser `465`. |
| `SMTP_USER` / `SMTP_PASS` | Usuario y contraseña del buzón o credencial de aplicación. |
| `SMTP_SECURE` | `true` solo si usan puerto 465 con SSL directo. |

**Gmail:** activar “contraseña de aplicación” en la cuenta y usar `smtp.gmail.com`, puerto `587`, usuario = email completo.

Si no configuran SMTP, el trámite **se guarda igual** en la base; solo aparece un aviso en consola al arrancar la API.

## 5. Instalación y ejecución

```bash
npm install
npm run dev
```

La API escucha en `http://localhost:4000`.

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login; body: `{ "email", "password" }`. Devuelve `{ token, refreshToken, user }`. |
| GET | `/api/health` | No | Estado del servicio. |
| GET | `/api/users/me` | Sí | Perfil del usuario logueado. |
| GET | `/api/users` | Admin | Lista paginada: query `page` (default 1), `limit` (10–100, default 50), `q` (nombre/apellido), `user_level`, `cuerpo_id` o `none`, `grado`, `solo_activos` (`1`/`0`). Respuesta: `{ items, total, page, limit, totalPages }`. |
| GET | `/api/users/meta` | Admin | `{ groups: [{ level, name }], cuerpos }` para filtros. |
| GET/POST/PUT/DELETE | `/api/cuerpos` | Admin | CRUD cuerpos. |
| GET | `/api/groups` | Admin | Lista de grupos (roles). |
| GET/POST/PUT/DELETE | `/api/orientes` | Admin | CRUD otros orientes. |
| GET | `/api/tesoreria` | Sí | Estado de cuenta: archivos Excel de la logia del hermano (`profiles.cuerpo_id`). |
| GET | `/api/tesoreria/archivo/:id` | Sí | URL firmada para descargar un Excel (solo si pertenece a la tesorería de su cuerpo, o admin). |
| GET | `/api/tesoreria/admin/cuerpos` | Admin | Listado de logias con cantidad de archivos y `folder_id` si existe carpeta. |
| GET | `/api/tesoreria/admin/cuerpo/:cuerpoId` | Admin | Detalle: lista de archivos Excel de esa logia (crea carpeta `ec-{id}` si no existe). |
| POST | `/api/tesoreria/admin/upload` | Admin | `multipart/form-data`: `file` (.xls/.xlsx), `cuerpo_id`, opcional `description` (ej. mes/año). |
| DELETE | `/api/tesoreria/admin/item/:id` | Admin | Elimina un archivo de estado de cuenta y su objeto en Storage. |
| GET | `/api/tramites` | Sí | Hermano: sus trámites. Admin: todos (sin `datos_json` en el listado). |
| POST | `/api/tramites` | Sí | Crear solicitud (ingreso, reingreso, ascenso, dimisión, pase). |
| GET | `/api/tramites/admin` | Admin | Todas las solicitudes con todos los campos (`datos_json`, etc.). |
| GET | `/api/tramites/admin/:id` | Admin | Detalle de una solicitud. |
| PATCH | `/api/tramites/admin/:id` | Admin | Body `{ "estado" }` (ej. `pendiente`, `en_curso`, `finalizado`, `rechazado`). |

En las rutas que requieren auth, enviar header: `Authorization: Bearer <token>` (el `token` que devuelve el login).

## Roles

- **user_level === 1** → Admin (CRUD cuerpos, usuarios, grupos, orientes).
- **user_level >= 4** → Miembro (acceso a inicio, biblioteca, secretaría, tesorería, trámites según grado).

## Tesorería / estado de cuenta por logia

Cada **cuerpo** (logia) tiene una carpeta lógica en `file` con código **`ec-{cuerpo_id}`** (compatibilidad con `tesoreria-{id}` si cabe en 12 caracteres). Los archivos se guardan en el bucket **biblioteca** bajo `tesoreria/{cuerpo_id}/...`. Los hermanos solo ven archivos de **su** `cuerpo_id`.

## Biblioteca / Planchas y grado del hermano

Las carpetas cuyo nombre coincide con **`Grado N`** (ej. `Grado 19`) solo las ve un hermano si su **`profiles.grado` ≥ N** en el sentido de permiso: puede ver carpetas **Grado 4 … Grado N** (no las superiores a su grado). Los **administradores** (`user_level === 1`) ven todo. La misma regla aplica al **descargar archivos** (se valida la cadena de carpetas padre).

## Nota sobre login

El login usa **email** y contraseña (Supabase Auth). Si en el sistema viejo usaban “usuario” en lugar de email, hay que crear usuarios en Supabase con email (ej. `usuario@scg33.org.ar`) o migrar los existentes.
