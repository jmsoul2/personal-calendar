# Personal Calendar

## Descripción del Proyecto
Web app de calendario personal ("Calendario Vida"). Vistas **Año** y **Mes**
con eventos multi-día en color por categoría, modal para crear/editar, y
barras arrastrables (mover + estirar) en la vista Mes. `localStorage` es la
caché local y, cuando está desplegada en Netlify, los eventos se **sincronizan**
entre dispositivos (Juan y Susana) vía una función serverless + Netlify Blobs.

## Tipo de Proyecto
Web app vanilla (HTML/CSS/JS, sin build) + una función serverless de Netlify
para sincronizar. Tailwind y Google Fonts vía CDN.

## Cómo correrla
Abrir `src/index.html` en el navegador. No hay paso de build ni servidor.
(Para evitar restricciones de algunos navegadores con `file://`, se puede
servir con `npx serve src` o la extensión Live Server, pero no es obligatorio.)

## iPhone / instalable (PWA ligera)
La app es responsive y se puede instalar a pantalla completa en iPhone.
- Responsive: la vista Año se apila en una columna en móvil; la vista Mes
  reduce el alto de celda. Soporte de safe areas (notch) vía `env(safe-area-inset-*)`.
- "Añadir a pantalla de inicio": meta tags `apple-mobile-web-app-*` +
  `manifest.webmanifest` + `apple-touch-icon`. Íconos generados: `icon-180/192/512.png`.
- IMPORTANTE: `file://` no llega al iPhone. Para usarla en el teléfono hay que
  **servir** la carpeta `src/`:
  - Pruebas en la misma Wi-Fi: `npx serve src` en el PC y abrir la IP LAN en Safari.
  - Permanente: hostear `src/` (GitHub Pages, Netlify, Vercel — gratis) y en
    Safari usar Compartir › Añadir a pantalla de inicio.
- No hay service worker, así que aún NO funciona offline (Tailwind va por CDN).

## Estructura de Carpetas
- `src/` — Código de la app (esto es lo que Netlify publica, ver `netlify.toml`)
  - `index.html` — Punto de entrada (era "Calendario Vida.html"). Markup + modal + CSS responsive.
  - `core.js` — Capa de datos (`window.Planner`): localStorage, eventos, utilidades de fecha.
    `saveEvents()` emite el evento `planner:events-changed` (lo escucha `sync.js`).
  - `vida-app.js` — Toda la UI: render de Año/Mes, modal, drag & drop, eventos de click.
    Redibuja al recibir `planner:remote-applied` (datos frescos del servidor).
  - `sync.js` — Capa de sincronización: baja/sube eventos a `/api/events`, clave
    compartida, indicador de estado (pastilla abajo-izquierda). Ver sección Sync.
  - `manifest.webmanifest` — Metadatos PWA para instalar a pantalla completa.
  - `icon-180/192/512.png` — Íconos de app (apple-touch-icon + manifest).
- `netlify/functions/events.mjs` — Función serverless `/api/events` (GET/PUT) sobre Netlify Blobs.
- `netlify.toml` — Config de Netlify (publish=`src`, functions=`netlify/functions`).
- `package.json` — Solo dependencia de la función: `@netlify/blobs`.
- `active/memory/` — Memoria de trabajo y contexto entre sesiones
- `active/outputs/` — Exportaciones: backups, archivos `.ics`, reportes
- `active/Temp/` — Scratch. Contiene el `.zip` original del handoff de Claude Design.

## Sincronización (Netlify Functions + Blobs)
Decisión tomada (2026-06-05): los eventos se sincronizan entre dispositivos para
que Susana pueda VER y ambos puedan ANOTAR al vuelo.
- **Backend**: `netlify/functions/events.mjs` expone `/api/events`.
  - `GET` → devuelve el array de eventos. `PUT` → reemplaza el array completo.
  - Protegido por **clave compartida** en la env var `CAL_KEY` (Netlify), que el
    cliente envía en el header `x-cal-key`. Misma clave para Juan y Susana; ambos
    pueden leer y escribir.
  - Datos en Netlify Blobs (store `vida`, clave `events`). No hay base de datos.
- **Frontend** (`sync.js`): localStorage = caché (la app sigue instantánea).
  Al abrir baja del servidor; al guardar sube con debounce (~1.2s). Reconcilia al
  volver online / volver a la pestaña. La clave se guarda en `localStorage`
  (`planner:vida:synckey`); se pide con un `prompt` la primera vez.
- **Límite conocido**: modelo last-write-wins (si ambos editan a la vez, gana el
  último en guardar). Riesgo bajo para dos personas; si molesta, pasar a merge por-evento.
- **CAL_KEY nunca va al repo** — se configura en Netlify › Site settings › Environment variables.

## Modelo de datos (localStorage)
- `planner:vida:events` — array de eventos `{id,title,start,end,cat,note,time}`
  (fechas en formato `YYYY-MM-DD`). Es la caché local; la fuente compartida vive
  en Netlify Blobs y `sync.js` la mantiene al día.
- `planner:vida:view` — última vista usada (`year` | `month`).
- `planner:vida:synckey` — clave compartida guardada en este dispositivo.
- Categorías (con color) definidas en `vida-app.js` → `CATS`:
  viaje, familia, salud, social, personal, importante.
- (`core.js` también incluye una capa `days`/`prep` de los bocetos semanales
  originales, no usada por el Calendario Vida.)

## Convenciones
- `.env` nunca va a git — nunca commitear API keys
- Mantener el código de la app dentro de `src/`
- La semana arranca en **domingo** (para coincidir con la referencia de diseño)
- Usar `active/memory/` para contexto que debe persistir entre sesiones
- Actualizar este CLAUDE.md a medida que el proyecto evoluciona

## Origen
Diseñado en Claude Design (claude.ai/design) y exportado como handoff bundle.
Se descartaron 3 bocetos alternativos (Slate, Editorial, Focus) a favor de
este "Calendario Vida". El stack se mantiene vanilla a propósito.

## Objetivos Actuales
- [x] Sincronización entre dispositivos (Netlify Functions + Blobs, clave compartida).
- [ ] Desplegar a Netlify (GitHub + auto-deploy) y configurar `CAL_KEY`. Ver `DEPLOY.md`.
- [ ] (Opcional) Offline real con service worker — pospuesto a propósito.
- [ ] (Opcional) Susana solo-lectura (clave aparte) si alguna vez se quiere separar roles.
