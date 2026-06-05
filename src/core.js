/* ============================================================
   Planner core — shared data layer + date utilities
   Used by all three designs. One dataset, three lenses.
   ============================================================ */
window.Planner = (function () {
  const KEY_DAYS = 'planner:v1:days';   // { 'YYYY-MM-DD': [{id,text,done}] }
  const KEY_PREP = 'planner:v1:prep';   // { 'YYYY-MM-DD'(week sunday): {focus, priorities:[], checklist:[], notes} }

  function load(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---- day events ---- */
  function getDays() { return load(KEY_DAYS); }
  function getDay(dateStr) { return load(KEY_DAYS)[dateStr] || []; }
  function setDay(dateStr, items) {
    const d = load(KEY_DAYS);
    if (items && items.length) d[dateStr] = items; else delete d[dateStr];
    save(KEY_DAYS, d);
  }
  function addDayItem(dateStr, text) {
    text = (text || '').trim(); if (!text) return getDay(dateStr);
    const items = getDay(dateStr); items.push({ id: uid(), text, done: false }); setDay(dateStr, items); return items;
  }
  function dayToggle(dateStr, id) {
    const items = getDay(dateStr); const it = items.find(x => x.id === id); if (it) it.done = !it.done; setDay(dateStr, items);
  }
  function dayEdit(dateStr, id, text) {
    const items = getDay(dateStr); const it = items.find(x => x.id === id);
    if (it) { it.text = text; if (!text.trim()) { setDay(dateStr, items.filter(x => x.id !== id)); return; } } setDay(dateStr, items);
  }
  function dayRemove(dateStr, id) { setDay(dateStr, getDay(dateStr).filter(x => x.id !== id)); }
  function dayCount(dateStr) { return getDay(dateStr).length; }

  /* ---- week prep ---- */
  function blankPrep() { return { focus: '', priorities: [], checklist: [], notes: '' }; }
  function getPrep(weekKey) {
    const p = load(KEY_PREP)[weekKey];
    return p ? Object.assign(blankPrep(), p) : blankPrep();
  }
  function setPrep(weekKey, val) {
    const all = load(KEY_PREP);
    const empty = !val.focus && !val.notes && !val.priorities.length && !val.checklist.length;
    if (empty) delete all[weekKey]; else all[weekKey] = val;
    save(KEY_PREP, all);
  }
  function setPrepField(weekKey, field, text) { const p = getPrep(weekKey); p[field] = text; setPrep(weekKey, p); }
  function prepAdd(weekKey, field, text) {
    text = (text || '').trim(); if (!text) return getPrep(weekKey);
    const p = getPrep(weekKey); p[field].push({ id: uid(), text, done: false }); setPrep(weekKey, p); return p;
  }
  function prepToggle(weekKey, field, id) { const p = getPrep(weekKey); const it = p[field].find(x => x.id === id); if (it) it.done = !it.done; setPrep(weekKey, p); }
  function prepEdit(weekKey, field, id, text) {
    const p = getPrep(weekKey); const it = p[field].find(x => x.id === id);
    if (it) { it.text = text; if (!text.trim()) { p[field] = p[field].filter(x => x.id !== id); } } setPrep(weekKey, p);
  }
  function prepRemove(weekKey, field, id) { const p = getPrep(weekKey); p[field] = p[field].filter(x => x.id !== id); setPrep(weekKey, p); }

  /* ---- date utilities (week starts Sunday, to match the reference) ---- */
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const MONTHS_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DOW_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DOW_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const pad = n => String(n).padStart(2, '0');
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { const [y, m, da] = s.split('-').map(Number); return new Date(y, m - 1, da); }
  function addDays(d, n) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function weekStart(d) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; } // Sunday
  function weekDays(ws) { return Array.from({ length: 7 }, (_, i) => addDays(ws, i)); }
  function sameDay(a, b) { return fmt(a) === fmt(b); }
  function today() { return startOfDay(new Date()); }
  function isToday(d) { return sameDay(d, today()); }

  // 6x7 matrix of Date objects for a given year/month (0-based), Sunday start.
  function monthMatrix(year, month) {
    const start = weekStart(new Date(year, month, 1));
    const weeks = [];
    let cur = start;
    for (let w = 0; w < 6; w++) { weeks.push(weekDays(cur)); cur = addDays(cur, 7); }
    // drop a fully-overflow trailing week
    const last = weeks[5];
    if (last.every(d => d.getMonth() !== month)) weeks.pop();
    return weeks;
  }

  function weekRangeLabel(ws) {
    const we = addDays(ws, 6);
    const a = ws.getDate() + ' ' + MONTHS_ABBR[ws.getMonth()];
    const b = we.getDate() + ' ' + MONTHS_ABBR[we.getMonth()];
    return a + ' – ' + b;
  }

  /* ---- multi-day events (Vida calendar) ---- */
  const KEY_EVENTS = 'planner:vida:events';   // [{id,title,start,end,cat,note}]
  function getEvents() { try { return JSON.parse(localStorage.getItem(KEY_EVENTS)) || []; } catch (e) { return []; } }
  // silent=true al aplicar datos que vienen del servidor (evita re-empujar en bucle).
  function saveEvents(a, silent) {
    localStorage.setItem(KEY_EVENTS, JSON.stringify(a));
    if (!silent) { try { window.dispatchEvent(new CustomEvent('planner:events-changed')); } catch (e) {} }
  }
  function normEvent(e) { if (e.end < e.start) { const t = e.end; e.end = e.start; e.start = t; } return e; }
  function addEvent(ev) { const a = getEvents(); ev.id = ev.id || uid(); normEvent(ev); a.push(ev); saveEvents(a); return ev; }
  function updateEvent(id, patch) { const a = getEvents(); const e = a.find(x => x.id === id); if (e) { Object.assign(e, patch); normEvent(e); saveEvents(a); } }
  function removeEvent(id) { saveEvents(getEvents().filter(x => x.id !== id)); }
  function getEvent(id) { return getEvents().find(x => x.id === id); }
  function eventsCovering(dateStr) { return getEvents().filter(e => dateStr >= e.start && dateStr <= e.end); }
  function spanDays(ev) { return Math.round((parse(ev.end) - parse(ev.start)) / 86400000) + 1; }
  function eventRangeLabel(ev) {
    const s = parse(ev.start), e = parse(ev.end), n = spanDays(ev);
    if (n === 1) return s.getDate() + ' ' + MONTHS_ABBR[s.getMonth()];
    const same = s.getMonth() === e.getMonth();
    return s.getDate() + (same ? '' : ' ' + MONTHS_ABBR[s.getMonth()]) + '–' + e.getDate() + ' ' + MONTHS_ABBR[e.getMonth()] + ' · ' + n + ' días';
  }
  // Assign overlapping events to lanes within a 7-day week. Returns [{ev,c0,c1,lane,contL,contR}].
  function layoutWeek(weekDates) {
    const ws = fmt(weekDates[0]), we = fmt(weekDates[6]);
    const inWk = getEvents().filter(e => e.start <= we && e.end >= ws)
      .sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : (spanDays(b) - spanDays(a)));
    const lanes = []; const out = [];
    inWk.forEach(e => {
      const c0 = e.start < ws ? 0 : weekDates.findIndex(d => fmt(d) === e.start);
      const c1 = e.end > we ? 6 : weekDates.findIndex(d => fmt(d) === e.end);
      let lane = 0;
      while (true) {
        if (!lanes[lane]) lanes[lane] = [];
        const clash = lanes[lane].some(s => !(c1 < s.c0 || c0 > s.c1));
        if (!clash) { lanes[lane].push({ c0, c1 }); out.push({ ev: e, c0, c1, lane, contL: e.start < ws, contR: e.end > we }); break; }
        lane++;
      }
    });
    return out;
  }

  return {
    getDays, getDay, setDay, addDayItem, dayToggle, dayEdit, dayRemove, dayCount,
    getPrep, setPrep, setPrepField, prepAdd, prepToggle, prepEdit, prepRemove,
    getEvents, saveEvents, addEvent, updateEvent, removeEvent, getEvent,
    eventsCovering, spanDays, eventRangeLabel, layoutWeek,
    MONTHS, MONTHS_ABBR, DOW, DOW_ABBR, DOW_LETTER,
    fmt, parse, addDays, startOfDay, weekStart, weekDays, sameDay, today, isToday,
    monthMatrix, weekRangeLabel, uid,
  };
})();
