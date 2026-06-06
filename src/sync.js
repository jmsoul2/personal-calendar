/* ============================================================
   Calendario Vida — capa de sincronización
   localStorage = caché local (la app sigue instantánea)
   Netlify Blobs (/api/events) = fuente compartida entre dispositivos

   · Al abrir: baja del servidor -> localStorage -> redibuja.
   · Al guardar: escribe local + empuja al servidor (con debounce).
   · Clave compartida (la misma que Susana) guardada en este dispositivo.
   Nota: modelo "guardar todo el arreglo" => last-write-wins. Para dos
   personas en un calendario familiar el riesgo de pisarse es bajísimo.
   ============================================================ */
(function () {
  const P = window.Planner;
  const API = '/api/events';
  const KEY_LS = 'planner:vida:synckey'; // clave compartida en este dispositivo
  const PUSH_DELAY = 1200;               // ms de espera antes de subir cambios

  let pushTimer = null;
  let lastSyncedJSON = null;             // último JSON confirmado con el servidor

  /* ---------------- clave compartida ---------------- */
  const getKey = () => localStorage.getItem(KEY_LS) || '';
  const setKey = k => { k ? localStorage.setItem(KEY_LS, k) : localStorage.removeItem(KEY_LS); };
  function promptKey() {
    const k = window.prompt('Clave compartida del calendario\n(la misma que usa Susana):', getKey());
    if (k != null) setKey(k.trim());
    return getKey();
  }

  /* ---------------- indicador de estado ---------------- */
  let pill, dot, label;
  const STATES = {
    ok:      { color: '#4F9E76', text: 'Sincronizado' },
    sync:    { color: '#C39A52', text: 'Guardando…' },
    offline: { color: '#C75E55', text: 'Sin conexión' },
    error:   { color: '#C75E55', text: 'Clave incorrecta · tocar' },
    nokey:   { color: '#64707C', text: 'Ingresar clave' },
  };
  function injectStatusUI() {
    pill = document.createElement('button');
    pill.id = 'sync-pill';
    pill.setAttribute('aria-label', 'Estado de sincronización');
    pill.style.cssText = [
      'position:fixed', 'z-index:40',
      'left:max(12px, env(safe-area-inset-left))',
      'bottom:calc(12px + env(safe-area-inset-bottom))',
      'display:inline-flex', 'align-items:center', 'gap:7px',
      'padding:6px 11px', 'border-radius:999px',
      'background:rgba(255,255,255,.92)', 'backdrop-filter:blur(6px)',
      'border:1px solid #D7DEE4', 'box-shadow:0 2px 8px rgba(14,40,65,.10)',
      'font:600 12px/1 "Hanken Grotesk",system-ui,sans-serif', 'color:#64707C',
      'cursor:pointer', 'transition:opacity .2s',
    ].join(';');
    dot = document.createElement('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:999px;background:#64707C;flex:0 0 auto';
    label = document.createElement('span');
    label.textContent = '…';
    pill.append(dot, label);
    pill.addEventListener('click', onPillTap);
    document.body.appendChild(pill);
  }
  function setStatus(kind, textOverride) {
    if (!dot) return;
    const s = STATES[kind] || STATES.ok;
    dot.style.background = s.color;
    label.textContent = textOverride || s.text;
    // se atenúa cuando todo está bien, para no estorbar
    pill.style.opacity = kind === 'ok' ? '0.6' : '1';
  }
  function onPillTap() {
    if (!getKey() || lastError) { if (promptKey()) { lastError = false; reconcile(); } }
    else reconcile();
  }

  /* ---------------- red ---------------- */
  let lastError = false;
  const headers = () => ({ 'x-cal-key': getKey(), 'content-type': 'application/json' });
  // Lo que viaja al servidor: eventos + categorías editables.
  const snapshot = () => JSON.stringify({ events: P.getEvents(), cats: P.getCats() });

  async function pull() {
    if (!getKey()) { setStatus('nokey'); return; }
    setStatus('sync', 'Cargando…');
    try {
      const r = await fetch(API, { headers: headers() });
      if (r.status === 401) { lastError = true; setStatus('error'); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      let events, cats;
      if (Array.isArray(data)) { events = data; cats = null; }           // formato viejo (solo eventos)
      else if (data && typeof data === 'object') {
        events = Array.isArray(data.events) ? data.events : [];
        cats = Array.isArray(data.cats) ? data.cats : null;             // null = el servidor aún no tiene categorías
      } else throw new Error('respuesta inesperada');

      const localCount = P.getEvents().length;
      if (events.length === 0 && cats == null && localCount > 0) {
        // Servidor vacío pero hay datos locales (primer uso) -> sembrar el servidor.
        await push(true);
        return;
      }
      if (cats) P.saveCats(cats, true);         // solo si el servidor ya tiene; si no, quedan los defaults locales
      P.saveEvents(events, true);               // silencioso: no dispara push
      lastSyncedJSON = snapshot();
      lastError = false;
      window.dispatchEvent(new CustomEvent('planner:remote-applied'));
      setStatus('ok');
    } catch (e) {
      setStatus('offline');
    }
  }

  async function push(silentStatus) {
    if (!getKey()) { setStatus('nokey'); return; }
    const json = snapshot();
    if (json === lastSyncedJSON) { setStatus('ok'); return; }
    if (!silentStatus) setStatus('sync', 'Guardando…');
    try {
      const r = await fetch(API, { method: 'PUT', headers: headers(), body: json });
      if (r.status === 401) { lastError = true; setStatus('error'); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      lastSyncedJSON = json;
      lastError = false;
      setStatus('ok');
    } catch (e) {
      setStatus('offline', 'Sin guardar · sin conexión');
    }
  }

  // Reconciliar: si hay cambios locales sin subir, súbelos; si no, trae lo último.
  function reconcile() {
    const local = snapshot();
    if (lastSyncedJSON !== null && local !== lastSyncedJSON) return push();
    return pull();
  }

  function schedulePush() {
    clearTimeout(pushTimer);
    setStatus('sync', 'Guardando…');
    pushTimer = setTimeout(() => push(), PUSH_DELAY);
  }

  /* ---------------- enganches ---------------- */
  window.addEventListener('planner:events-changed', schedulePush);
  window.addEventListener('planner:cats-changed', schedulePush);
  window.addEventListener('online', reconcile);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reconcile(); });
  // Intenta subir cambios pendientes si se cierra/oculta la pestaña.
  window.addEventListener('pagehide', () => { if (pushTimer) { clearTimeout(pushTimer); push(); } });

  /* ---------------- arranque ---------------- */
  function boot() {
    injectStatusUI();
    if (!getKey()) promptKey();
    pull();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Utilidades expuestas (p. ej. para cambiar la clave desde la consola).
  window.VidaSync = {
    pull, reconcile,
    changeKey() { if (promptKey()) { lastError = false; reconcile(); } },
    clearKey() { setKey(''); setStatus('nokey'); },
  };
})();
