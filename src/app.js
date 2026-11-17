/**
 * app.js — Controlador principal
 * Incluye: búsqueda por texto+fecha, historial en modal con pestañas
 */

// ── Estado global ─────────────────────────────────────────────────────────────
const STATE = {
  all: [],
  filtered: [],
  activeFilter: 'all',
  query: '',
  loading: false,
  loadStats: null,
};

// ── DOM ───────────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const E = {
  searchInput:    $('searchInput'),
  searchBox:      $('searchBox'),
  voiceBtn:       $('voiceBtn'),
  micIcon:        $('micIcon'),
  clearBtn:       $('clearBtn'),
  voiceStatus:    $('voiceStatus'),
  suggestions:    $('searchSuggestions'),
  filters:        $('quickFilters'),
  loadingState:   $('loadingState'),
  loadingMsg:     $('loadingMsg'),
  loadingSub:     $('loadingSub'),
  errorState:     $('errorState'),
  errorMsg:       $('errorMsg'),
  retryBtn:       $('retryBtn'),
  emptyState:     $('emptyState'),
  emptyQuery:     $('emptyQuery'),
  resultsSection: $('resultsSection'),
  resultsTitle:   $('resultsTitle'),
  resultsCount:   $('resultsCount'),
  lastUpdate:     $('lastUpdate'),
  apiNotice:      $('apiNotice'),
  cardsGrid:      $('cardsGrid'),
  sourceBadge:    $('sourceBadge'),
  refreshBtn:     $('refreshBtn'),
  modalOverlay:   $('modalOverlay'),
  modalClose:     $('modalClose'),
  modalContent:   $('modalContent'),
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupVoice();
  setupSearch();
  setupFilters();
  setupModal();
  E.refreshBtn.addEventListener('click', () => loadAllResults());
  loadAllResults();
});

// ── Carga principal ───────────────────────────────────────────────────────────
async function loadAllResults() {
  if (STATE.loading) return;
  STATE.loading = true;
  showLoading();
  try {
    const stats = await fetchAllResults((msg, sub) => {
      E.loadingMsg.textContent = msg;
      E.loadingSub.textContent = sub || '';
    });
    STATE.all = stats.results;
    STATE.loadStats = stats;
    applyFilters();
    renderAll();
    E.sourceBadge.innerHTML = `<span class="live-dot"></span> ${stats.withResults}/${stats.total} resultados`;
    const t = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    E.lastUpdate.textContent = `${t} · ${stats.source}`;
  } catch (err) {
    showError('No se pudieron cargar los resultados. ' + (err.message || ''));
  } finally {
    STATE.loading = false;
  }
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function applyFilters() {
  let list = [...STATE.all];
  if (STATE.activeFilter !== 'all') list = list.filter(r => r.type === STATE.activeFilter);
  if (STATE.query.trim()) {
    // Detectar si la query tiene fecha
    const parsed = parseQueryWithDate(STATE.query);
    const q = removeDiacritics(parsed.name.toLowerCase().trim());
    if (q) list = list.filter(r =>
      removeDiacritics(r.name.toLowerCase()).includes(q) ||
      removeDiacritics((r.shortName || '').toLowerCase()).includes(q) ||
      r.id.includes(q.replace(/\s+/g, '-')) ||
      r.type.includes(q)
    );
  }
  list.sort((a, b) => {
    const to = { baloto: 0, loteria: 1, chance: 2 };
    if (to[a.type] !== to[b.type]) return to[a.type] - to[b.type];
    if (a.hasResult !== b.hasResult) return a.hasResult ? -1 : 1;
    return a.name.localeCompare(b.name, 'es');
  });
  STATE.filtered = list;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll() {
  if (STATE.filtered.length === 0 && STATE.query.trim()) { showEmpty(); return; }
  hideAll();
  E.resultsSection.classList.remove('hidden');

  if (STATE.query) {
    E.resultsTitle.textContent = `Resultados para "${STATE.query}"`;
  } else if (STATE.activeFilter !== 'all') {
    const labels = { loteria: '🎟️ Loterías', chance: '🎲 Chances', baloto: '🎱 Baloto' };
    E.resultsTitle.textContent = labels[STATE.activeFilter] || 'Resultados';
  } else {
    const day = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    E.resultsTitle.textContent = cap(day);
  }

  const withRes = STATE.filtered.filter(r => r.hasResult).length;
  const pending = STATE.filtered.length - withRes;
  E.resultsCount.textContent = `${withRes} con resultado${pending > 0 ? ` · ${pending} pendientes` : ''}`;
  E.apiNotice.classList.toggle('hidden', !STATE.loadStats || STATE.loadStats.apiAvailable);
  if (!STATE.loadStats?.apiAvailable) E.apiNotice.innerHTML = `⚠️ Fuente alternativa activa. <a href="https://api-resultadosloterias.com" target="_blank">api-resultadosloterias.com</a>`;

  E.cardsGrid.innerHTML = '';
  STATE.filtered.forEach(r => E.cardsGrid.appendChild(createCard(r)));
}

function createCard(r) {
  const div = document.createElement('div');
  div.className = 'lottery-card' + (r.type === 'baloto' && r.id === 'baloto' ? ' card-baloto' : '');
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.setAttribute('aria-label', r.name);

  const badgeCls = { loteria: 'badge-loteria', chance: 'badge-chance', baloto: 'badge-baloto' }[r.type] || 'badge-loteria';
  const typeLabel = { loteria: 'Lotería', chance: 'Chance', baloto: 'Baloto' }[r.type] || r.type;

  let numsHtml = '';
  if (r.hasResult && r.numbers.length > 0) {
    numsHtml = `<div class="card-numbers">` +
      r.numbers.map((n, i) => {
        const isSB = r.type === 'baloto' && i === r.numbers.length - 1 && r.superball != null;
        return `<span class="num-ball ${isSB ? 'superball' : 'nb-' + r.type}">${n}</span>`;
      }).join('') +
      (r.sign ? `<span class="sign-badge">${r.sign}</span>` : '') +
      `</div>`;
  } else {
    const [hh = 22, mm = 0] = (r.hour || '22:00').split(':').map(Number);
    const st = new Date(); st.setHours(hh, mm, 0, 0);
    const upcoming = st > new Date();
    numsHtml = `<div class="card-numbers pending"><span class="pending-label">${upcoming ? `⏰ Sorteo a las ${r.hour}` : '⌛ Resultado pendiente'}</span></div>`;
  }

  const chips = [
    r.sorteo   && { label: 'Sorteo', value: `#${r.sorteo}` },
    r.serie    && { label: 'Serie', value: r.serie },
    r.fraccion && { label: 'Fracción', value: r.fraccion },
    r.prize    && { label: 'Premio', value: fmtPrize(r.prize), prize: true },
    (r.jackpot && r.type === 'baloto') && { label: 'Acumulado', value: fmtPrize(r.jackpot), prize: true },
  ].filter(Boolean);

  const infoHtml = chips.length ? `<div class="card-info">${chips.map(c =>
    `<div class="info-chip"><span class="chip-lbl">${c.label}</span><span class="chip-val${c.prize ? ' prize' : ''}">${c.value}</span></div>`
  ).join('')}</div>` : '';

  const banner = (r.type === 'baloto' && r.jackpot)
    ? `<div class="baloto-banner"><span class="bb-label">Acumulado</span><span class="bb-amount">${fmtPrize(r.jackpot)}</span></div>` : '';

  div.innerHTML = `
    <div class="card-status-dot ${r.hasResult ? 'has-result' : 'pending'}"></div>
    <div class="card-top">
      <span class="card-emoji">${r.emoji}</span>
      <div class="card-meta">
        <div class="card-name">${r.name}</div>
        <div class="card-date">${fmtDate(r.date)}</div>
      </div>
      <span class="card-badge ${badgeCls}">${typeLabel}</span>
    </div>
    ${banner}${numsHtml}${infoHtml}
    <div class="card-history-hint">📅 Ver historial →</div>`;

  div.addEventListener('click',   () => openDetailPanel(r));
  div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openDetailPanel(r); });
  return div;
}

// ── PANEL DE DETALLE CON HISTORIAL ────────────────────────────────────────────

async function openDetailPanel(r) {
  const cat = findInCatalog(r.id) || findInCatalog(r.apiSlug);
  const typeLabel = { loteria: 'Lotería', chance: 'Chance', baloto: 'Baloto' }[r.type] || r.type;

  // Renderizar panel inicial con el último resultado
  E.modalContent.innerHTML = renderDetailHeader(r, typeLabel) +
    `<div class="modal-tabs">
      <button class="tab-btn active" data-tab="last">Último sorteo</button>
      <button class="tab-btn" data-tab="history">📅 Historial</button>
    </div>
    <div id="tabLast">${renderResultDetail(r)}</div>
    <div id="tabHistory" class="hidden">
      <div class="history-loading"><div class="spinner-sm"></div> Cargando historial...</div>
    </div>`;

  E.modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Tabs
  E.modalContent.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      E.modalContent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $('tabLast').classList.toggle('hidden', tab !== 'last');
      $('tabHistory').classList.toggle('hidden', tab !== 'history');

      // Cargar historial la primera vez que se abre esa pestaña
      if (tab === 'history' && $('tabHistory').querySelector('.history-loading') && cat) {
        try {
          const history = await fetchHistory(cat);
          $('tabHistory').innerHTML = renderHistoryTab(history, cat);
        } catch (e) {
          $('tabHistory').innerHTML = `<div class="history-error">No se pudo cargar el historial.<br><a href="${cat.official || '#'}" target="_blank">Ver en fuente oficial →</a></div>`;
        }
      }
    });
  });
}

function renderDetailHeader(r, typeLabel) {
  return `
    <div class="modal-header-row">
      <span class="modal-emoji">${r.emoji}</span>
      <div>
        <h2 class="modal-title">${r.name}</h2>
        <p class="modal-subtitle">${typeLabel} · ${r.entity || ''}</p>
      </div>
    </div>`;
}

function renderResultDetail(r) {
  let numsHtml = '';
  if (r.hasResult && r.numbers.length > 0) {
    numsHtml = `<div class="modal-numbers">` +
      r.numbers.map((n, i) => {
        const isSB = r.type === 'baloto' && i === r.numbers.length - 1 && r.superball != null;
        return `<span class="modal-ball ${isSB ? 'superball' : 'nb-' + r.type}">${n}</span>`;
      }).join('') +
      (r.sign ? `<span class="modal-sign">${r.sign}</span>` : '') +
      `</div>`;
  } else {
    numsHtml = `<div class="modal-no-result">⏰ Resultado no disponible. Sorteo: ${r.hour || '—'}</div>`;
  }

  const details = [
    r.sorteo   && { label: 'Sorteo', value: `#${r.sorteo}` },
    r.date     && { label: 'Fecha', value: fmtDateLong(r.date) },
    r.serie    && { label: 'Serie', value: r.serie },
    r.fraccion && { label: 'Fracción', value: r.fraccion },
    r.prize    && { label: 'Premio Mayor', value: fmtPrize(r.prize), prize: true },
    r.jackpot  && { label: 'Acumulado', value: fmtPrize(r.jackpot), prize: true },
    r.source   && { label: 'Fuente', value: r.source },
  ].filter(Boolean);

  const grid = details.length ? `<div class="modal-grid">${details.map(d =>
    `<div class="modal-box"><div class="modal-box-label">${d.label}</div>
     <div class="modal-box-value${d.prize ? ' prize' : ''}">${d.value}</div></div>`
  ).join('')}</div>` : '';

  return `${numsHtml}${grid}
    <a class="modal-official-link" href="${r.official}" target="_blank" rel="noopener">🔗 Ver en fuente oficial</a>`;
}

function renderHistoryTab(history, cat) {
  if (!history || history.length === 0) {
    return `<div class="history-empty">
      No se encontraron resultados anteriores.<br>
      <a href="${cat.official || '#'}" target="_blank" rel="noopener">Ver historial oficial →</a>
    </div>`;
  }

  const rows = history.map(r => {
    const nums = r.numbers.map(n =>
      `<span class="hist-ball nb-${r.type}">${n}</span>`
    ).join('');
    const serie = r.serie ? `<span class="hist-serie">Serie ${r.serie}</span>` : '';
    const sorteo = r.sorteo ? `<span class="hist-sorteo">#${r.sorteo}</span>` : '';
    const prize = r.prize ? `<span class="hist-prize">${fmtPrize(r.prize)}</span>` : '';
    return `
      <div class="hist-row">
        <div class="hist-date-col">
          <span class="hist-date">${fmtDateLong(r.date)}</span>
          ${sorteo}
        </div>
        <div class="hist-nums-col">${nums}${serie}</div>
        ${prize ? `<div class="hist-prize-col">${prize}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="history-info">Últimos ${history.length} sorteos · <a href="${cat.official || '#'}" target="_blank">Ver más →</a></div>
    <div class="hist-list">${rows}</div>`;
}

// ── Búsqueda avanzada: nombre + fecha ─────────────────────────────────────────

/**
 * Parsea una query como "medellín 13 de noviembre" o "bogotá 2026-11-05"
 * Retorna { name: string, date: string|null }
 */
function parseQueryWithDate(query) {
  if (!query) return { name: '', date: null };

  const months = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
                   julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

  // "13 de noviembre" or "13 noviembre"
  const spMatch = query.match(/(\d{1,2})\s+de\s+(\w+)(?:\s+(?:de\s+)?(\d{4}))?/i) ||
                  query.match(/(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/i);
  if (spMatch) {
    const day = parseInt(spMatch[1]);
    const mon = months[removeDiacritics(spMatch[2].toLowerCase())];
    if (mon) {
      const year = spMatch[3] ? parseInt(spMatch[3]) : new Date().getFullYear();
      const date = `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const name = query.replace(spMatch[0], '').trim();
      return { name, date };
    }
  }

  // ISO date: "2026-11-13"
  const isoMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    const name = query.replace(isoMatch[1], '').trim();
    return { name, date: isoMatch[1] };
  }

  return { name: query, date: null };
}

/**
 * Si el query tiene fecha, busca ese resultado específico y lo muestra primero.
 */
async function handleDateQuery(query) {
  const { name, date } = parseQueryWithDate(query);
  if (!date || !name) return; // sin fecha o sin nombre de lotería → búsqueda normal

  // Encontrar la lotería en el catálogo
  const catMatches = searchCatalog(name);
  if (!catMatches.length) return;
  const cat = catMatches[0];

  // Mostrar loading en el grid
  E.cardsGrid.innerHTML = `<div class="date-search-loading"><div class="spinner-sm"></div> Buscando resultado del ${fmtDateLong(date)} para ${cat.name}...</div>`;
  hideAll();
  E.resultsSection.classList.remove('hidden');
  E.resultsTitle.textContent = `${cat.name} · ${fmtDateLong(date)}`;
  E.resultsCount.textContent = '';

  try {
    const result = await fetchResultByDate(cat, date);
    if (result) {
      E.cardsGrid.innerHTML = '';
      E.cardsGrid.appendChild(createCard(result));
      E.resultsCount.textContent = '1 resultado encontrado';
    } else {
      E.cardsGrid.innerHTML = `<div class="date-no-result">
        No se encontró resultado de <strong>${cat.name}</strong> para el <strong>${fmtDateLong(date)}</strong>.<br>
        <small>Puede que ese día no haya habido sorteo o el resultado no esté disponible.</small>
      </div>`;
      E.resultsCount.textContent = '';
    }
  } catch (e) {
    E.cardsGrid.innerHTML = `<div class="date-no-result">Error al buscar: ${e.message}</div>`;
  }
}

// ── Modal / panel ─────────────────────────────────────────────────────────────
function closeModal() {
  E.modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function setupModal() {
  E.modalClose.addEventListener('click', closeModal);
  E.modalOverlay.addEventListener('click', e => { if (e.target === E.modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ── Búsqueda ──────────────────────────────────────────────────────────────────
function setupSearch() {
  let debounce;
  E.searchInput.addEventListener('input', () => {
    STATE.query = E.searchInput.value;
    updateClearBtn();
    showSuggestions(STATE.query);
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const { date } = parseQueryWithDate(STATE.query);
      if (date && STATE.query.trim().length > 3) {
        handleDateQuery(STATE.query);
      } else {
        applyFilters();
        renderAll();
      }
    }, 350);
  });

  E.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hideSuggestions();
      const { date } = parseQueryWithDate(STATE.query);
      if (date && STATE.query.trim().length > 3) handleDateQuery(STATE.query);
      else { applyFilters(); renderAll(); }
    }
    if (e.key === 'ArrowDown') navigateSugg(1);
    if (e.key === 'ArrowUp')   navigateSugg(-1);
    if (e.key === 'Escape')    hideSuggestions();
  });

  E.clearBtn.addEventListener('click', () => {
    E.searchInput.value = '';
    STATE.query = '';
    updateClearBtn();
    hideSuggestions();
    applyFilters();
    renderAll();
    E.searchInput.focus();
  });

  document.addEventListener('click', e => {
    if (!E.searchBox.contains(e.target)) hideSuggestions();
  });
}

let suggIdx = -1;

function showSuggestions(query) {
  if (!query.trim()) { hideSuggestions(); return; }
  const { name } = parseQueryWithDate(query);
  const matches = searchCatalog(name || query, STATE.activeFilter !== 'all' ? STATE.activeFilter : null).slice(0, 7);
  if (!matches.length) { hideSuggestions(); return; }
  suggIdx = -1;
  E.suggestions.innerHTML = matches.map(m => `
    <div class="sugg-item" data-name="${m.name}" role="option">
      <span class="sugg-emoji">${m.emoji}</span>
      <span class="sugg-name">${hlMatch(m.name, name || query)}</span>
      <span class="sugg-type">${m.type}</span>
    </div>`).join('');
  E.suggestions.classList.add('visible');
  E.suggestions.querySelectorAll('.sugg-item').forEach(el => {
    el.addEventListener('click', () => {
      E.searchInput.value = el.dataset.name;
      STATE.query = el.dataset.name;
      updateClearBtn();
      hideSuggestions();
      applyFilters();
      renderAll();
    });
  });
}

function hideSuggestions() { E.suggestions.classList.remove('visible'); suggIdx = -1; }

function navigateSugg(dir) {
  const items = E.suggestions.querySelectorAll('.sugg-item');
  if (!items.length) return;
  suggIdx = Math.max(-1, Math.min(items.length - 1, suggIdx + dir));
  items.forEach((el, i) => el.classList.toggle('highlighted', i === suggIdx));
  if (suggIdx >= 0) {
    E.searchInput.value = items[suggIdx].dataset.name;
    items[suggIdx].scrollIntoView({ block: 'nearest' });
  }
}

function hlMatch(text, query) {
  if (!query) return text;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${q})`, 'gi'), '<strong>$1</strong>');
}

function updateClearBtn() {
  E.clearBtn.classList.toggle('visible', !!STATE.query.trim());
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function setupFilters() {
  E.filters.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    E.filters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.activeFilter = chip.dataset.filter;
    applyFilters();
    renderAll();
  });
}

// ── Voz ───────────────────────────────────────────────────────────────────────
function setupVoice() {
  const voice = new VoiceSearch({
    onResult(normalized) {
      E.searchBox.classList.remove('listening');
      E.voiceBtn.classList.remove('active');
      E.micIcon.textContent = '🎙️';
      E.searchInput.value = normalized;
      STATE.query = normalized;
      updateClearBtn();
      hideSuggestions();
      const { date } = parseQueryWithDate(normalized);
      if (date && normalized.trim().length > 3) handleDateQuery(normalized);
      else { applyFilters(); renderAll(); }
    },
    onStateChange(state, msg) {
      E.voiceStatus.textContent = msg;
      const active = ['listening', 'speech', 'interim', 'sound'].includes(state);
      E.searchBox.classList.toggle('listening', active);
      E.voiceBtn.classList.toggle('active', active);
      E.micIcon.textContent = active ? '🔴' : '🎙️';
    },
    onError(msg) {
      E.voiceStatus.textContent = msg;
      setTimeout(() => { E.voiceStatus.textContent = ''; }, 4000);
    },
  });

  E.voiceBtn.addEventListener('click', () => voice.toggle());
  if (!voice.isSupported()) {
    E.voiceBtn.style.opacity = '0.35';
    E.voiceBtn.title = 'Búsqueda por voz no disponible (usa Chrome o Edge)';
  }
}

// ── UI state ──────────────────────────────────────────────────────────────────
function hideAll() {
  [E.loadingState, E.errorState, E.emptyState, E.resultsSection].forEach(el => el.classList.add('hidden'));
}
function showLoading() { hideAll(); E.loadingState.classList.remove('hidden'); }
function showError(msg) {
  hideAll();
  E.errorMsg.textContent = msg;
  E.errorState.classList.remove('hidden');
  E.retryBtn.onclick = () => loadAllResults();
}
function showEmpty() {
  hideAll();
  E.emptyQuery.textContent = STATE.query;
  E.emptyState.classList.remove('hidden');
}

// ── Format ────────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return 'Hoy';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.toDateString() === new Date().toDateString()) return 'Hoy';
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch (_) { return iso; }
}

function fmtDateLong(iso) {
  if (!iso) return '—';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) { return iso; }
}

function fmtPrize(v) {
  if (!v) return '';
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^\d.]/g, '')) : Number(v);
  if (isNaN(n)) return String(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} mil millones`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} millones`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)} mil`;
  return `$${n.toLocaleString('es-CO')}`;
}

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
