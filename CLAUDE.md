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
  - `core.js` — Capa de datos (`window.Planner`): localStorage, eventos, **categorías**,
    utilidades de fecha y **festivos colombianos** (`colHolidays(year)` / `holidayName(ds)`).
    `saveEvents()` emite `planner:events-changed` y `saveCats()`
    emite `planner:cats-changed` (ambos los escucha `sync.js`).
  - `vida-app.js` — Toda la UI: render de Año/Mes, modal de evento, **modal de categorías**,
    drag & drop, eventos de click. Redibuja al recibir `planner:remote-applied`.
  - `sync.js` — Capa de sincronización: baja/sube **eventos + categorías** a `/api/events`,
    clave compartida, indicador de estado (pastilla abajo-izquierda). Ver sección Sync.
  - `manifest.webmanifest` — Metadatos PWA para instalar a pantalla completa.
  - `icon-180/192/512.png` — Íconos de app (apple-touch-icon + manifest).
- `netlify/functions/events.mjs` — Función serverless `/api/events` (GET/PUT) sobre Netlify Blobs.
  Guarda `events` y `cats` en claves separadas del store `vida`. GET → `{events, cats}`.
- `netlify.toml` — Config de Netlify (publish=`src`, functions=`netlify/functions`).
- `package.json` — Solo dependencia de la función: `@netlify/blobs`.
- `active/memory/` — Memoria de trabajo y contexto entre sesiones
- `active/outputs/` — Exportaciones: backups, archivos `.ics`, reportes
- `active/Temp/` — Scratch. Contiene el `.zip` original del handoff de Claude Design.

## Sincronización (Netlify Functions + Blobs)
Decisión tomada (2026-06-05): los eventos se sincronizan entre dispositivos para
que Susana pueda VER y ambos puedan ANOTAR al vuelo.
- **Backend**: `netlify/functions/events.mjs` expone `/api/events`.
  - `GET` → `{events, cats}`. `PUT` → reemplaza `events` (y `cats` si vienen).
    Compat: acepta también un array suelto = solo eventos.
  - Protegido por **clave compartida** en la env var `CAL_KEY` (Netlify), que el
    cliente envía en el header `x-cal-key`. Misma clave para Juan y Susana; ambos
    pueden leer y escribir.
  - Datos en Netlify Blobs (store `vida`, claves `events` y `cats`). No hay base de datos.
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
- `planner:vida:cats` — array de categorías editables `[{key,name,color}]`.
  Semilla = `DEFAULT_CATS` en `core.js` (viaje, familia, salud, social, personal,
  importante). **Los eventos guardan la `key`, no el nombre ni el índice** → renombrar
  o recolorar no toca ningún evento. Se sincroniza igual que los eventos. Ver sección
  "Categorías editables".
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

## Despliegue (en producción)
- **URL en vivo**: https://juanysusypcalendar.netlify.app/
- Repo: https://github.com/jmsoul2/personal-calendar (privado) → Netlify auto-deploy en cada push a `main`.
- `CAL_KEY` configurada en Netlify. Cambiarla requiere **redeploy** + re-ingresar la clave
  nueva en cada dispositivo (tocar la pastilla de estado).

## Categorías editables (nombre + color, añadir/quitar)
Botón **"Editar"** (✎) en la leyenda de categorías (ambas vistas) → abre `#cats-modal`.
En `vida-app.js`: estado en `CAT_LIST` (fuente de verdad), índices derivados `CATS`/`CAT_KEYS`
(reconstruidos por `indexCats()`); `persistCats()` = `P.saveCats(CAT_LIST)` + reindexar.
- **Renombrar**: en vivo en cada tecla (persiste, sin re-render para no perder el foco).
- **Color**: paleta curada `PALETTE` (~12 tonos), no picker nativo. Una paleta inline abierta a la vez.
- **Añadir**: key nueva `'c'+uid()`, nombre "Nueva", primer color libre; auto-focus.
- **Eliminar**: bloquea si queda una sola; si está en uso, confirma (esos eventos quedan en gris).
- **Borrado seguro (lazy)**: al borrar, los eventos conservan su `cat` huérfana; `catColor()`
  cae a `FALLBACK_CAT` (gris `#9AA6B1`). No se reasignan eventos → retrocompatible.
- **Se sincroniza** entre dispositivos junto con los eventos (ver Sync). Susana ve los mismos
  nombres/colores. Por eso **nunca se usa el nombre o el índice como id, siempre la `key`**.
- Modal **fuera de `#app`** con sus propios listeners (no cuelga del handler global).

## Copia de seguridad (export / import JSON)
Botones ⤓/⤒ en el header (ambas vistas), en `vida-app.js` → `exportJSON()` / `importJSON()`.
- **Exportar**: descarga `calendario-vida-YYYY-MM-DD.json` con `{app,version:2,exportedAt,events,cats}`.
- **Importar**: lee un `.json` (acepta el wrapper o un array suelto de eventos), pide confirmación y
  **reemplaza** eventos (y categorías si el archivo las trae; aplica `cats` antes de validar las
  keys de los eventos). Luego sincroniza al servidor. El PC es la fuente principal.

## Festivos colombianos (automáticos, solo lectura)
Capa de solo lectura, **calculada en el cliente** — NO son eventos: no se guardan en
localStorage, no se exportan/importan y no se sincronizan (cada dispositivo los calcula
igual). En `core.js`: `colHolidays(year)` → mapa `{ 'YYYY-MM-DD': 'Nombre' }` (cacheado
por año) y `holidayName(ds)` → nombre o `null`. Reglas: 6 fijos + 7 de **Ley Emiliani**
(se trasladan al lunes siguiente, vía `toMonday()`) + 5 **móviles** según la Pascua
(`easterSunday()` = Computus gregoriano; Jueves/Viernes Santo no se trasladan, los otros
tres ya llevan el corrimiento a lunes en su offset: +43/+64/+71). Son los 18 festivos
oficiales. En `vida-app.js` se pintan **sutiles** (constante `HOLIDAY_COLOR = '#C1121F'`,
rojo sangre). **Festivo sin evento**: lavado rojo muy tenue en la celda (`hexA()`, alpha
0.09 en Año / 0.05 en Mes) + número del día en rojo; en el Mes además la etiqueta con el
nombre arriba-derecha (y `title` en Año). **Festivo con evento encima**: manda el color de
la categoría (se ve el plan) y la señal de festivo queda solo en el **número en rojo+negrita**
(Año) / nombre rojo arriba (Mes). Solo días del mes en curso. Siempre visibles (sin toggle).
Entrada "Festivo" en la leyenda. Para validar otro año:
comparar `colHolidays(y)` contra el calendario oficial (todos los de Emiliani deben caer lunes).

## Objetivos Actuales
- [x] Sincronización entre dispositivos (Netlify Functions + Blobs, clave compartida).
- [x] Desplegar a Netlify (GitHub + auto-deploy) con `CAL_KEY`. Ver `DEPLOY.md`.
- [x] Copia de seguridad local (export/import JSON).
- [x] Categorías editables (renombrar, recolorar, añadir, quitar) sincronizadas.
- [x] Compartir el link + clave con Susana (Safari › Añadir a inicio). ✅ ya lo usa.
- [x] Festivos nacionales de Colombia (automáticos, marca sutil, ambas vistas).
- [ ] (Opcional) Offline real con service worker — pospuesto a propósito.
- [ ] (Opcional) Susana solo-lectura (clave aparte) si alguna vez se quiere separar roles.
