/* ============================================================
   Netlify Function: /api/events
   Fuente compartida de eventos del Calendario Vida.
   - Datos en Netlify Blobs (store "vida", clave "events").
   - Protegido por clave compartida (env var CAL_KEY) que el
     cliente envía en el header  x-cal-key.
   GET  -> devuelve el array de eventos
   PUT  -> reemplaza el array completo (last-write-wins)
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
    const data = await store.get('events', { type: 'json' });
    return json(Array.isArray(data) ? data : []);
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
    if (!Array.isArray(body)) return json({ error: 'se esperaba un array' }, 400);
    await store.setJSON('events', body);
    return json({ ok: true, count: body.length });
  }

  return json({ error: 'method not allowed' }, 405);
};

// Functions v2: ruta declarada aquí (no hace falta redirect en netlify.toml)
export const config = { path: '/api/events' };
