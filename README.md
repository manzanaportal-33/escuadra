# Escuadra – Área reservada (web)

Aplicación **web** que funciona como área reservada para el **Supremo Consejo Grado 33° para la República Argentina**. Incluye:

- **App web** (Expo + React Native Web): área reservada para miembros y panel de administración.
- **API REST** (Node/Express + Supabase) en la carpeta `server/`: login, CRUD de cuerpos, hermanos, grupos, otros orientes (misma lógica que el sistema PHP viejo). En la raíz, `api/[[...path]].js` es el **punto de entrada serverless** (catch-all) para Vercel.

La funcionalidad se basó en el sistema PHP existente en `area-reservada` (cuerpos, miembros, trabajos, otros orientes, biblioteca, secretaría, tesorería, trámites). Ver `PLAN-SCG33.md` para el plan detallado.

## Requisitos

- **Node.js** 18+
- **npm** o **yarn**

## Instalación

```bash
npm install
```

## Cómo ejecutar

### Desarrollo web

```bash
npm start
```

Abre en el navegador la URL que muestra Expo (por defecto `http://localhost:8081`).

Para limpiar caché y arrancar:

```bash
npm run dev
```

### API (backend)

En otra terminal, desde la carpeta `server/`:

```bash
cd server && npm run dev
```

O desde la raíz: `npm run dev:api`. Para levantar API y web a la vez: `npm run dev:all`.

## Estructura del proyecto

- **`app/`** – Código de la app (pantallas, navegación, auth).
- **`server/`** – Backend Node/Express con **Supabase** (auth + base de datos). Ver `server/README.md`.
- **`api/`** – Solo `index.js` para desplegar la API en Vercel (no es el código principal).
- **`PLAN-SCG33.md`** – Análisis del sistema viejo y plan del nuevo (admin + miembros + web).

## Conectar la app con la API

1. **Levantá la API** (ver `server/README.md`): en la carpeta `server/` ejecutá `npm start` (o `npm run dev`).
2. **URL de la API:** en desarrollo la app usa el mismo hostname que la página (ej. `http://localhost:4000` si abrís la app en `localhost:8081`). Para otro servidor, creá o editá `.env` en la **raíz del proyecto** y agregá:  
   `EXPO_PUBLIC_API_URL=http://localhost:4000` (o la URL que corresponda).
3. El **login** llama a `POST /api/auth/login`; el token y la sesión se guardan en `localStorage` (AsyncStorage en web).

### Si ves "No se pudo conectar a la API"

Comprobá que la API esté corriendo: `cd server && npm run dev`. Deberías ver algo como `SCG33 API escuchando en http://localhost:4000`. Revisá `EXPO_PUBLIC_API_URL` en `.env` si usás otra URL.

## Build para producción (web)

```bash
npm run build
```

Genera la salida estática en `dist/`. Podés desplegarla en cualquier hosting estático (Vercel, Netlify, etc.) o servidor web.

## Tecnologías

- **Expo** (SDK 54) + **React Native Web**
- **Expo Router** – navegación por archivos
- **AsyncStorage** – guardado del token/sesión (localStorage en web)
- **TypeScript**
# escuadra
# escuadra
# escuadra
# escuadra
# escuadra
