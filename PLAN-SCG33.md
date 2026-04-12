# Plan: Sistema SCG 33° – Área reservada (nuevo stack)

## Contexto institucional (Supremo Consejo Grado 33 – República Argentina)

- **Institución:** Supremo Consejo Grado 33°, institución madre. Las logias dependen de ella; cada hermano tiene un **grado** entre 4 y 33.
- **Estructura por rango de grados:**
  - **Logias de perfección:** grados 4–14  
  - **Capítulos:** 15, 16, 17, 18  
  - **Areópagos:** 19–30  
  - **Consistorios:** 31 y 32  
  - **Soberanos Inspectores Generales:** 33  

- **Regla de visibilidad:** Un hermano con grado N puede ver contenido de grado N y **todo lo de abajo** (hasta 4). No puede ver contenido reservado a grados superiores.  
  Ejemplo: grado 14 → ve contenido etiquetado para 4, 9, 14 (y no 18, 19, …, 33).  
  En la app/API: mostrar ítem si `grado_mínimo_del_contenido <= grado_del_hermano`.

### Roles y acceso

- **Usuario Admin** (`user_level = 1`): acceso total. Puede crear y editar Hermanos, Cuerpos, Otros Orientes; gestionar la institución; ver listados completos y tesorería de cualquier cuerpo.
- **Hermano** (miembro con `user_level` ≥ 4 y `grado` 4–33):  
  - Está asociado a **un cuerpo** (o dos, si se implementa) — p. ej. “La Paz 73”.  
  - **Tesorería:** solo ve el **estado de cuenta de su/sus cuerpo(s)**. No puede ver la tesorería de otros cuerpos.  
  - Biblioteca, trámites, etc. según su grado (regla de visibilidad anterior).

---

## Resumen del sistema viejo (PHP)

- **Stack:** PHP, MySQL, sesiones, archivos en carpetas del servidor.
- **Roles:** `user_level` 1 = Admin, 2 = Special, 3 = User, ≥4 = Miembros por grado (4, 9, 14, 18, 19, 24, 30, 31, 32, 33).
- **Admin (nivel 1):** Inicio, Hermanos (grupos + usuarios), Cuerpos, Otros Orientes. Trabajos = listar archivos en `trabajos/`.
- **Miembros (nivel ≥4):** Inicio, Biblioteca (Libros), Secretaría (Descargas, Boletines, Decretos, Comunicados), Tesorería (estado de cuenta por cuerpo), Trámites (Ingreso, Re-Ingreso, Ascenso, Dimisión, Pase).

### Entidades

| Entidad        | Uso |
|----------------|-----|
| **users**      | Hermanos: nombre, apellido, username, password, grado, cuerpo_id, user_level, etc. |
| **user_groups**| Roles: Admin, Grado 4, Grado 9, … Grado 33. |
| **cuerpo**     | Cuerpos escocistas: sigla, cuerpo, localidad, trabajos, observaciones, folder (ruta), presidente, secretario, tesorero. |
| **otros_orientes** | Orientes: país, web, direccion, mail_institucional, telefono, soberano. |
| **file**       | Biblioteca/archivos: carpetas y archivos con permisos por rol. |
| **carpetas_roles** | Rol mínimo por carpeta (grado mínimo: 4, 9, 14, …). Un hermano ve la carpeta si `grado_hermano >= rol_minimo`. |

### Contenido por carpetas (sistema viejo)

- `descargas/`, `boletines/`, `decretos/`, `comunicados/`, `libros/`: listado de archivos del filesystem.
- `trabajos/`: por grado (`trabajos/4/`, `trabajos/9/`, …); admin ve todo.
- Tesorería: archivos por cuerpo en la carpeta del cuerpo (`cuerpo.folder`).

### Trámites

Formularios por tipo: ingreso, reingreso, ascenso, dimisión, pase. Campos: nombre, apellido, mail, cuerpo, plomo, fecha propuesta, adjuntos (formularios/PDF). Envío por mail (PHPMailer).

---

## Arquitectura del sistema nuevo

1. **API REST** (Node.js + Express + MySQL)
   - Auth: login (username + password), JWT, rol/grado en el token.
   - CRUD: usuarios (hermanos), grupos, cuerpos, otros orientes.
   - Archivos: listar/descargar por sección (descargas, boletines, decretos, comunicados, libros) y por grado (trabajos); tesorería por cuerpo. Subida solo admin.
   - Trámites: crear solicitud (tipo + datos + adjuntos), guardar en DB y/o almacenamiento; opcional envío por mail.

2. **Cliente único: Expo (React Native)**
   - App móvil (iOS/Android) y **web** (`expo start --web`).
   - Pantallas según rol: Admin vs Miembro (menú por grado).
   - Misma API para móvil y web.

3. **Base de datos**
   - Migrar/adaptar `scg.sql` a MySQL del nuevo servidor.
   - Añadir tabla `otros_orientes` y columnas `folder`, `presidente`, `secretario`, `tesorero` en `cuerpo` si no existen.
   - Tabla `tramites` para solicitudes (tipo, usuario, cuerpo, datos JSON, adjuntos, estado, fecha).

4. **Almacenamiento de archivos**
   - Opción A: mismo esquema de carpetas en el servidor (descargas, boletines, etc.) y API que devuelve URLs o streams.
   - Opción B: almacenamiento en la nube (S3, etc.) y URLs en la API.

---

## Fases de implementación

| Fase | Descripción |
|------|-------------|
| 1 | API: proyecto Node/Express, conexión MySQL, esquema actualizado, auth (login + JWT). |
| 2 | API: CRUD Cuerpos, Grupos, Hermanos (usuarios), Orientes. |
| 3 | API: listado/descarga de archivos por sección y por grado; subida (admin); tesorería por cuerpo. |
| 4 | API: trámites (crear, listar, adjuntos). |
| 5 | App Expo: login contra API, menú por rol (admin vs miembros). |
| 6 | App Expo: pantallas admin (cuerpos, hermanos, grupos, orientes, trabajos). |
| 7 | App Expo: pantallas miembros (inicio, biblioteca, secretaría, tesorería, trámites). |
| 8 | Web: compilar y desplegar Expo Web; mismo código que la app. |

---

## Ubicación en el repo

- `api/` – Backend Node/Express.
- `app/` (Expo) – Ya existe; se extiende para admin + miembros y web.
- Migraciones SQL en `api/db/` o equivalente.
