/* ============================================================
   Netlify Function: /api/events
   Fuente compartida del Calendario Vida.
   - Datos en Netlify Blobs (store "vida", claves "events" y "cats").
   - Protegido por clave compartida (env var CAL_KEY) que el
     cliente envía en el header  x-cal-key.
   GET  -> { events:[...], cats:[...]|null }
   PUT  -> reemplaza events (y cats si vienen). last-write-wins.
   Compat: acepta también un array suelto = solo eventos.
   ============================================================ */
import { getStore } from '@netlify/blobs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default async (req) => {
  const expected = process.env.CAL_KEY;
  if (!expected) return json({ error: 'CAL_KEY no configurada en el servidor' }, 500);

  const provided = req.headers.get('x-cal-key') || '';
  if (provided !== expected) return json({ error: 'unauthorized' }, 401);

  const store = getStore('vida');

  if (req.method === 'GET') {
    const events = await store.get('events', { type: 'json' });
    const cats = await store.get('cats', { type: 'json' });
    return json({
      events: Array.isArray(events) ? events : [],
      cats: Array.isArray(cats) ? cats : null,
    });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    // Acepta { events, cats } (nuevo) o un array suelto = solo eventos (compat).
    let events, cats;
    if (Array.isArray(body)) { events = body; cats = undefined; }
    else if (body && typeof body === 'object') {
      events = Array.isArray(body.events) ? body.events : null;
      cats = Array.isArray(body.cats) ? body.cats : undefined;
    }
    if (!Array.isArray(events)) return json({ error: 'se esperaba events[]' }, 400);
    await store.setJSON('events', events);
    if (cats !== undefined) await store.setJSON('cats', cats);
    return json({ ok: true, count: events.length, cats: cats ? cats.length : undefined });
  }

  return json({ error: 'method not allowed' }, 405);
};

// Functions v2: ruta declarada aquí (no hace falta redirect en netlify.toml)
export const config = { path: '/api/events' };
