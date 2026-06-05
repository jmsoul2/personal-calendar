/* ============================================================
   Calendario Vida — Año + Mes, eventos multi-día con color
   · Año: días rellenos de color (franjas continuas)
   · Mes: barras arrastrables (mover + estirar) y hora opcional
   ============================================================ */
(function () {
  const P = window.Planner;
  const app = document.getElementById('app');
  const LSV = 'planner:vida:view';

  const CATS = {
    viaje:      { name: 'Viaje',      color: '#4E82A8' },
    familia:    { name: 'Familia',    color: '#C2724E' },
    salud:      { name: 'Salud',      color: '#4F9E76' },
    social:     { name: 'Social',     color: '#C39A52' },
    personal:   { name: 'Personal',   color: '#9C6597' },
    importante: { name: 'Importante', color: '#C75E55' },
  };
  const CAT_KEYS = Object.keys(CATS);
  const catColor = k => (CATS[k] || CATS.viaje).color;
  const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ap = h < 12 ? 'a' : 'p'; const h12 = h % 12 || 12; return h12 + (m ? ':' + String(m).padStart(2, '0') : '') + ap; };

  // Íconos (descarga / carga) para los botones de copia de seguridad
  const ICON_EXPORT = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  const ICON_IMPORT = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

  let state = { view: localStorage.getItem(LSV) || 'year', cursor: P.today(), year: P.today().getFullYear() };
  function setView(v) { state.view = v; localStorage.setItem(LSV, v); render(); }

  /* ---------------- chrome ---------------- */
  function header() {
    const tab = (id, label) => `<button data-tab="${id}" class="px-5 h-9 rounded-md text-[14px] font-semibold tracking-wide transition ${state.view === id ? 'bg-ink text-white shadow-sm' : 'text-gray2 hover:text-ink'}">${label}</button>`;
    return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <div class="text-[12px] font-bold tracking-[0.2em] uppercase text-slate leading-none whitespace-nowrap">Calendario · Vida</div>
        <h1 class="font-serif text-[34px] leading-none mt-1.5">${state.view === 'month' ? P.MONTHS[state.cursor.getMonth()] + ' ' + state.cursor.getFullYear() : state.year}</h1>
      </div>
      <div class="flex items-center gap-2">
        <button data-export aria-label="Exportar copia" title="Exportar copia de seguridad (.json)" class="w-9 h-9 grid place-items-center rounded-md bg-white border border-line text-gray2 hover:text-ink shadow-sm">${ICON_EXPORT}</button>
        <button data-import aria-label="Importar copia" title="Importar copia de seguridad (.json)" class="w-9 h-9 grid place-items-center rounded-md bg-white border border-line text-gray2 hover:text-ink shadow-sm">${ICON_IMPORT}</button>
        <div class="flex items-center gap-1 bg-white rounded-lg p-1 border border-line shadow-sm">${tab('year', 'Año')}${tab('month', 'Mes')}</div>
      </div>
    </div>`;
  }

  function legend() {
    return `<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">${CAT_KEYS.map(k =>
      `<span class="inline-flex items-center gap-1.5 text-[12px] text-gray2"><span class="w-2.5 h-2.5 rounded-full" style="background:${catColor(k)}"></span>${CATS[k].name}</span>`).join('')}</div>`;
  }

  /* ---------------- YEAR: sidebar + mini-months (días rellenos) ---------------- */
  function renderYear() {
    const y = state.year, t = P.today();

    const months = P.MONTHS.map((name, m) => {
      const weeks = P.monthMatrix(y, m), cur = (t.getFullYear() === y && t.getMonth() === m);
      let head = P.DOW_LETTER.map(l => `<div class="text-[9px] text-gray2/60 text-center">${l}</div>`).join('');
      let cells = '';
      weeks.forEach(row => row.forEach((d, ci) => {
        const inM = d.getMonth() === m, ds = P.fmt(d), today = P.isToday(d);
        if (!inM) { cells += `<div class="h-[22px]"></div>`; return; }
        const covs = P.eventsCovering(ds).sort((a, b) => P.spanDays(b) - P.spanDays(a));
        let cellStyle = '', numCls = 'text-ink/75', numStyle = '';
        if (covs.length) {
          const ev = covs[0], c = catColor(ev.cat);
          const lr = ds === ev.start || ci === 0, rr = ds === ev.end || ci === 6;
          cellStyle = `background:${c};border-radius:${lr ? 5 : 0}px ${rr ? 5 : 0}px ${rr ? 5 : 0}px ${lr ? 5 : 0}px`;
          numCls = 'text-white font-semibold';
        }
        let numHtml;
        if (today && covs.length) numHtml = `<span class="text-[10px] leading-none text-white font-bold w-[16px] h-[16px] grid place-items-center rounded-full" style="box-shadow:0 0 0 1.5px #fff inset">${d.getDate()}</span>`;
        else if (today) numHtml = `<span class="text-[10px] leading-none text-white font-bold w-[16px] h-[16px] grid place-items-center rounded-full" style="background:#0E2841">${d.getDate()}</span>`;
        else numHtml = `<span class="text-[10px] leading-none ${numCls}">${d.getDate()}</span>`;
        cells += `<button data-day="${ds}" class="h-[22px] grid place-items-center hover:ring-1 hover:ring-slate/50 transition" style="${cellStyle}">${numHtml}</button>`;
      }));
      return `
      <div class="rounded-xl p-3.5 border ${cur ? 'border-slate/40 bg-white shadow-sm' : 'border-transparent bg-white/50 hover:bg-white/80'} transition">
        <div class="flex items-baseline justify-between mb-2">
          <button data-month="${m}" class="font-serif text-[18px] ${cur ? 'text-slate' : 'text-ink'} hover:text-slate">${name}</button>
          ${cur ? '<span class="font-serif italic text-[11px] text-slate">este mes</span>' : ''}
        </div>
        <div class="grid grid-cols-7 gap-x-0 gap-y-[3px] mb-1">${head}</div>
        <div class="grid grid-cols-7 gap-x-0 gap-y-[2px]">${cells}</div>
      </div>`;
    }).join('');

    const evs = P.getEvents().filter(e => e.start.slice(0, 4) <= String(y) && e.end.slice(0, 4) >= String(y))
      .sort((a, b) => a.start < b.start ? -1 : 1);
    let listHTML;
    if (!evs.length) {
      listHTML = `<div class="text-[13.5px] text-gray2 leading-relaxed mt-2">Aún no hay eventos.<br/>Crea el primero con el botón de arriba, o haz clic en cualquier día.</div>`;
    } else {
      let curM = -1; listHTML = '';
      evs.forEach(ev => {
        const sm = P.parse(ev.start).getMonth();
        if (sm !== curM) { curM = sm; listHTML += `<div class="text-[11px] font-bold uppercase tracking-wider text-gray2 mt-4 mb-1.5 first:mt-0">${P.MONTHS[sm]}</div>`; }
        const c = catColor(ev.cat);
        listHTML += `
        <button data-edit="${ev.id}" class="w-full text-left flex gap-3 py-2 px-2.5 -mx-1 rounded-lg hover:bg-mist2/70 transition group">
          <span class="w-1 rounded-full flex-none mt-0.5" style="background:${c}"></span>
          <span class="min-w-0 flex-1">
            <span class="block text-[14px] font-semibold text-ink truncate group-hover:text-slate">${esc(ev.title)}</span>
            <span class="block text-[12px] text-gray2 mt-0.5">${ev.time ? fmtTime(ev.time) + ' · ' : ''}${P.eventRangeLabel(ev)}</span>
          </span>
          <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full self-start flex-none" style="color:${c};background:${hexA(c, .12)}">${CATS[ev.cat] ? CATS[ev.cat].name : ''}</span>
        </button>`;
      });
    }

    const sidebar = `
    <aside class="yr-aside bg-white rounded-2xl border border-line shadow-sm p-5 flex flex-col">
      <div class="flex items-center justify-between mb-1">
        <h2 class="font-serif text-[20px]">Eventos</h2>
        <div class="flex items-center gap-1">
          <button data-y="-1" class="w-7 h-7 grid place-items-center rounded-md text-gray2 hover:bg-mist2">‹</button>
          <span class="text-[13px] font-bold tabular-nums">${y}</span>
          <button data-y="1" class="w-7 h-7 grid place-items-center rounded-md text-gray2 hover:bg-mist2">›</button>
        </div>
      </div>
      <button data-new class="mb-3 w-full h-10 rounded-lg bg-ink text-white text-[14px] font-bold hover:bg-ink/90 flex items-center justify-center gap-2">
        <span class="text-[17px] leading-none">+</span> Nuevo evento
      </button>
      <div class="overflow-y-auto -mr-2 pr-2 flex-1">${listHTML}</div>
      <div class="pt-3 mt-3 border-t border-line">${legend()}</div>
    </aside>`;

    return `<div class="yr-grid grid gap-5 items-start">
      ${sidebar}
      <div class="yr-months grid gap-3">${months}</div>
    </div>`;
  }

  /* ---------------- MONTH: barras multi-día arrastrables ---------------- */
  function renderMonth() {
    const y = state.cursor.getFullYear(), m = state.cursor.getMonth(), weeks = P.monthMatrix(y, m);

    const dows = P.DOW_ABBR.map((d, i) => `<div class="text-[11px] font-bold uppercase tracking-wider py-2 text-center ${[0, 6].includes(i) ? 'text-slate' : 'text-gray2'}">${d}</div>`).join('');

    const weeksHTML = weeks.map(weekDates => {
      const cells = weekDates.map((d, ci) => {
        const ds = P.fmt(d), inM = d.getMonth() === m, today = P.isToday(d), we = [0, 6].includes(d.getDay());
        const covs = P.eventsCovering(ds).sort((a, b) => P.spanDays(b) - P.spanDays(a));
        const primary = covs[0];

        let cellStyle = inM ? '' : 'background:#F8FAFB;';
        let attr = `data-add="${ds}"`, cur = 'cursor-pointer hover:bg-mist2/30', content = '';
        if (primary) {
          const c = catColor(primary.cat);
          const isStart = ds === primary.start, isEnd = ds === primary.end, showTitle = isStart || ci === 0;
          cellStyle = `background:${hexA(c, 0.16)};` + (isStart ? `box-shadow:inset 3px 0 0 ${c};` : '');
          attr = `data-edit="${primary.id}"`;
          cur = 'cursor-grab';
          const time = (primary.time && isStart) ? `<span class="font-bold mr-0.5">${fmtTime(primary.time)}</span>` : '';
          const title = showTitle
            ? `<div class="px-2 mt-1 text-[11.5px] font-semibold leading-tight overflow-hidden" style="color:${c};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${primary.contL ? '‹ ' : ''}${time}${esc(primary.title)}</div>`
            : '';
          const chips = covs.slice(1).map(ev => `<button data-ev2="${ev.id}" class="block w-[calc(100%-8px)] mx-1 mt-0.5 text-left truncate text-[10.5px] font-medium px-1.5 py-px rounded text-white" style="background:${catColor(ev.cat)}">${ev.time ? fmtTime(ev.time) + ' ' : ''}${esc(ev.title)}</button>`).join('');
          const lh = isStart ? `<span data-resize="l" class="absolute left-0 top-0 bottom-0 w-[8px] z-10"></span>` : '';
          const rh = isEnd ? `<span data-resize="r" class="absolute right-0 top-0 bottom-0 w-[8px] z-10"></span>` : '';
          content = `${title}${chips}${lh}${rh}`;
        }
        const numCls = today ? 'bg-ink text-white w-6 h-6 inline-grid place-items-center rounded-full'
          : (inM ? (we ? 'text-slate' : 'text-ink') : 'text-gray2/40');
        return `<div data-date="${ds}" ${attr} class="relative border-r border-b border-line ${cur} transition overflow-hidden select-none" style="${cellStyle}">
          <div class="px-2 pt-1.5"><span class="text-[13px] font-semibold ${numCls}">${d.getDate()}</span></div>
          ${content}
        </div>`;
      }).join('');
      return `<div class="mo-week">${cells}</div>`;
    }).join('');

    return `
    <div class="flex items-center justify-between mb-4 gap-4 flex-wrap">
      ${legend()}
      <div class="flex items-center gap-2 ml-auto">
        <button data-mn="-1" class="w-9 h-9 grid place-items-center rounded-md bg-white border border-line text-gray2 hover:text-ink">‹</button>
        <button data-today class="text-[13px] font-semibold px-3.5 h-9 rounded-md bg-white border border-line text-gray2 hover:text-slate">Hoy</button>
        <button data-mn="1" class="w-9 h-9 grid place-items-center rounded-md bg-white border border-line text-gray2 hover:text-ink">›</button>
        <button data-new class="text-[13px] font-bold px-4 h-9 rounded-md bg-ink text-white hover:bg-ink/90 flex items-center gap-1.5"><span class="text-[16px] leading-none">+</span> Evento</button>
      </div>
    </div>
    <div class="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
      <div class="grid grid-cols-7 border-b border-line">${dows}</div>
      <div class="border-l border-line">${weeksHTML}</div>
    </div>
    <p class="text-center text-[12px] text-gray2 mt-3">Arrastra una barra para moverla · tira de los bordes para cambiar su duración · clic para editar.</p>`;
  }

  /* ---------------- modal ---------------- */
  const modal = document.getElementById('modal');
  let editingId = null, selCat = 'viaje';
  function renderCatPicker() {
    document.getElementById('f-cats').innerHTML = CAT_KEYS.map(k => {
      const sel = k === selCat, c = catColor(k);
      return `<button type="button" data-cat="${k}" class="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-[13px] font-medium transition ${sel ? 'text-white' : 'text-gray2 bg-white border-line hover:border-slate'}" style="${sel ? `background:${c};border-color:${c}` : ''}">
        <span class="w-2.5 h-2.5 rounded-full" style="background:${sel ? '#fff' : c}"></span>${CATS[k].name}</button>`;
    }).join('');
  }
  function openModal() { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  function closeModal() { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  function openNew(dateStr) {
    editingId = null; selCat = 'viaje';
    document.getElementById('m-title').textContent = 'Nuevo evento';
    document.getElementById('f-title').value = '';
    document.getElementById('f-note').value = '';
    document.getElementById('f-time').value = '';
    const d = dateStr || P.fmt(P.today());
    document.getElementById('f-start').value = d;
    document.getElementById('f-end').value = d;
    document.getElementById('f-delete').classList.add('hidden');
    renderCatPicker(); openModal();
    setTimeout(() => document.getElementById('f-title').focus(), 50);
  }
  function openEdit(id) {
    const ev = P.getEvent(id); if (!ev) return;
    editingId = id; selCat = ev.cat || 'viaje';
    document.getElementById('m-title').textContent = 'Editar evento';
    document.getElementById('f-title').value = ev.title;
    document.getElementById('f-note').value = ev.note || '';
    document.getElementById('f-time').value = ev.time || '';
    document.getElementById('f-start').value = ev.start;
    document.getElementById('f-end').value = ev.end;
    document.getElementById('f-delete').classList.remove('hidden');
    renderCatPicker(); openModal();
  }
  function saveModal() {
    const tEl = document.getElementById('f-title'), title = tEl.value.trim();
    if (!title) { tEl.focus(); tEl.classList.add('!border-[#C0524A]'); return; }
    const start = document.getElementById('f-start').value || P.fmt(P.today());
    const end = document.getElementById('f-end').value || start;
    const note = document.getElementById('f-note').value.trim();
    const time = document.getElementById('f-time').value;
    if (editingId) P.updateEvent(editingId, { title, start, end, cat: selCat, note, time });
    else P.addEvent({ title, start, end, cat: selCat, note, time });
    closeModal(); render();
  }
  document.getElementById('f-save').addEventListener('click', saveModal);
  document.getElementById('f-delete').addEventListener('click', () => { if (editingId) { P.removeEvent(editingId); closeModal(); render(); } });
  modal.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closeModal();
    const cat = e.target.closest('[data-cat]'); if (cat) { selCat = cat.dataset.cat; renderCatPicker(); }
  });
  document.getElementById('f-title').addEventListener('keydown', e => { if (e.key === 'Enter') saveModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

  /* ---------------- drag (mover + estirar) en la vista Mes ---------------- */
  let drag = null, suppressClick = false;
  function dayUnder(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) { const c = el.closest && el.closest('[data-date]'); if (c) return c.dataset.date; }
    return null;
  }
  const diffDays = (a, b) => Math.round((P.parse(a) - P.parse(b)) / 86400000);
  const shift = (ds, n) => P.fmt(P.addDays(P.parse(ds), n));

  app.addEventListener('pointerdown', e => {
    if (state.view !== 'month' || e.button !== 0) return;
    if (e.target.closest('[data-ev2]')) return;          // chips de eventos secundarios: solo clic
    const bar = e.target.closest('[data-edit]'); if (!bar) return;
    const ev = P.getEvent(bar.dataset.edit); if (!ev) return;
    const handle = e.target.closest('[data-resize]');
    drag = { id: ev.id, mode: handle ? handle.dataset.resize : 'move', origStart: ev.start, origEnd: ev.end, anchor: dayUnder(e.clientX, e.clientY) || ev.start, started: false };
  });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const day = dayUnder(e.clientX, e.clientY); if (!day) return;
    let ns, ne;
    if (drag.mode === 'move') { const delta = diffDays(day, drag.anchor); ns = shift(drag.origStart, delta); ne = shift(drag.origEnd, delta); }
    else if (drag.mode === 'l') { ns = day <= drag.origEnd ? day : drag.origEnd; ne = drag.origEnd; }
    else { ne = day >= drag.origStart ? day : drag.origStart; ns = drag.origStart; }
    const cur = P.getEvent(drag.id); if (!cur) return;
    if (cur.start !== ns || cur.end !== ne) {
      if (!drag.started) { drag.started = true; app.classList.add('dragging'); document.body.style.userSelect = 'none'; }
      P.updateEvent(drag.id, { start: ns, end: ne }); render();
    }
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    if (drag.started) { suppressClick = true; app.classList.remove('dragging'); document.body.style.userSelect = ''; }
    drag = null;
  });
  // En táctil, el navegador cancela el puntero al hacer scroll: limpia el arrastre.
  window.addEventListener('pointercancel', () => {
    if (!drag) return;
    if (drag.started) { app.classList.remove('dragging'); document.body.style.userSelect = ''; }
    drag = null;
  });

  /* ---------------- copia de seguridad (export / import JSON) ---------------- */
  function exportJSON() {
    const payload = {
      app: 'calendario-vida',
      version: 1,
      exportedAt: new Date().toISOString(),
      events: P.getEvents(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendario-vida-${P.fmt(P.today())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onerror = () => alert('No pude leer el archivo.');
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch (e) { alert('Ese archivo no es un JSON válido.'); return; }
      // Acepta tanto {events:[...]} (formato de export) como un array directo.
      const raw = Array.isArray(parsed) ? parsed
        : (parsed && Array.isArray(parsed.events) ? parsed.events : null);
      if (!raw) { alert('El archivo no tiene eventos en el formato esperado.'); return; }
      const events = raw
        .filter(e => e && e.title && e.start && e.end)
        .map(e => ({
          id: e.id || P.uid(),
          title: String(e.title),
          start: e.start, end: e.end,
          cat: CATS[e.cat] ? e.cat : 'viaje',
          note: e.note || '', time: e.time || '',
        }));
      const current = P.getEvents().length;
      const ok = confirm(
        'Importar copia de seguridad\n\n' +
        '• Eventos en el archivo: ' + events.length + '\n' +
        '• Eventos actuales: ' + current + '\n\n' +
        'Esto REEMPLAZA todos los eventos actuales (y se sincroniza a los demás dispositivos).\n\n¿Continuar?'
      );
      if (!ok) return;
      P.saveEvents(events);   // dispara la sincronización (push al servidor)
      render();
      alert('Listo: ' + events.length + ' evento(s) importado(s).');
    };
    reader.readAsText(file);
  }

  // Input de archivo oculto (fuera de #app para que no lo borre el re-render).
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.style.display = 'none';
  importInput.addEventListener('change', () => {
    const f = importInput.files && importInput.files[0];
    if (f) importJSON(f);
    importInput.value = '';   // permite reimportar el mismo archivo
  });
  document.body.appendChild(importInput);

  /* ---------------- render + click events ---------------- */
  function render() {
    app.innerHTML = header() + (state.view === 'year' ? renderYear() : renderMonth());
  }
  function openEditOrNew(ds) {
    const covs = P.eventsCovering(ds);
    if (covs.length) openEdit(covs.sort((a, b) => P.spanDays(b) - P.spanDays(a))[0].id);
    else openNew(ds);
  }
  app.addEventListener('click', e => {
    if (suppressClick) { suppressClick = false; return; }
    const chip = e.target.closest('[data-ev2]'); if (chip) return openEdit(chip.dataset.ev2);
    if (state.view === 'month') {
      const evEl = e.target.closest('[data-edit]'); if (evEl) return openEdit(evEl.dataset.edit);
      const addEl = e.target.closest('[data-add]'); if (addEl) return openNew(addEl.dataset.add);
    }
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if (d.export != null) return exportJSON();
    if (d.import != null) return importInput.click();
    if (d.tab) return setView(d.tab);
    if (d.y) { state.year += +d.y; return render(); }
    if (d.month != null) { state.cursor = new Date(state.year, +d.month, 1); return setView('month'); }
    if (d.day) return openEditOrNew(d.day);
    if (d.add) return openNew(d.add);
    if (d.edit) return openEdit(d.edit);
    if (d.new != null) return openNew(state.view === 'month' ? P.fmt(new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1)) : '');
    if (d.mn) { state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + (+d.mn), 1); return render(); }
    if (d.today != null) { state.cursor = P.today(); state.year = state.cursor.getFullYear(); return render(); }
  });

  // Cuando la capa de sync trae eventos nuevos del servidor, redibuja.
  window.addEventListener('planner:remote-applied', render);

  render();
})();
