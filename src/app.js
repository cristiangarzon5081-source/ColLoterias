/**
 * app.js — Controlador principal
 */

// ── Estado global ─────────────────────────────────────────────────────────────
const STATE = {
  all: [],          // todos los resultados cargados
  filtered: [],     // resultados actuales visibles
  activeFilter: 'all',
  query: '',
  loading: false,
  loadStats: null,  // { withResults, total, errors, source }
};

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const E = {
  searchInput:   $('searchInput'),
  searchBox:     $('searchBox'),
  voiceBtn:      $('voiceBtn'),
  micIcon:       $('micIcon'),
  clearBtn:      $('clearBtn'),
  voiceStatus:   $('voiceStatus'),
  suggestions:   $('searchSuggestions'),
  filters:       $('quickFilters'),
  loadingState:  $('loadingState'),
  loadingMsg:    $('loadingMsg'),
  loadingSub:    $('loadingSub'),
  errorState:    $('errorState'),
  errorMsg:      $('errorMsg'),
  retryBtn:      $('retryBtn'),
  emptyState:    $('emptyState'),
  emptyQuery:    $('emptyQuery'),
  resultsSection:$('resultsSection'),
  resultsTitle:  $('resultsTitle'),
  resultsCount:  $('resultsCount'),
  lastUpdate:    $('lastUpdate'),
  apiNotice:     $('apiNotice'),
  cardsGrid:     $('cardsGrid'),
  sourceBadge:   $('sourceBadge'),
  refreshBtn:    $('refreshBtn'),
  modalOverlay:  $('modalOverlay'),
  modalClose:    $('modalClose'),
  modalContent:  $('modalContent'),
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

// ── Carga de datos ────────────────────────────────────────────────────────────
async function loadAllResults() {
  if (STATE.loading) return;
  STATE.loading = true;
  showLoading();

  try {
    const { results, withResults, total, errors, apiAvailable, source } =
      await fetchAllResults((msg, sub) => {
        E.loadingMsg.textContent = msg;
        E.loadingSub.textContent = sub || '';
      });

    STATE.all = results;
    STATE.loadStats = { withResults, total, errors, apiAvailable, source };
    applyFilters();
    renderAll();
    updateHeaderBadge(source, withResults, total);

  } catch (err) {
    showError('No se pudieron cargar los resultados. ' + (err.message || ''));
    console.error(err);
  } finally {
    STATE.loading = false;
  }
}

function updateHeaderBadge(source, withResults, total) {
  E.sourceBadge.innerHTML = `<span class="live-dot"></span> ${withResults}/${total} resultados`;
  const now = new Date();
  const t = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  E.lastUpdate.textContent = `Actualizado ${t} · ${source}`;
}

// ── Filtrado ──────────────────────────────────────────────────────────────────
function applyFilters() {
  let list = [...STATE.all];

  if (STATE.activeFilter !== 'all') {
    list = list.filter(r => r.type === STATE.activeFilter);
  }

  if (STATE.query.trim()) {
    const q = removeDiacritics(STATE.query.toLowerCase().trim());
    list = list.filter(r =>
      removeDiacritics(r.name.toLowerCase()).includes(q) ||
      removeDiacritics((r.shortName||'').toLowerCase()).includes(q) ||
      r.id.includes(q.replace(/\s+/g,'-')) ||
      r.type.includes(q)
    );
  }

  // Ordenar: baloto primero, con resultados antes de pendientes, luego alfab.
  list.sort((a, b) => {
    const typeOrder = { baloto: 0, loteria: 1, chance: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
    if (a.hasResult !== b.hasResult) return a.hasResult ? -1 : 1;
    return a.name.localeCompare(b.name, 'es');
  });

  STATE.filtered = list;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderAll() {
  if (STATE.filtered.length === 0 && STATE.query.trim()) {
    showEmpty();
    return;
  }

  hideAll();
  E.resultsSection.classList.remove('hidden');

  // Título
  if (STATE.query) {
    E.resultsTitle.textContent = `Resultados para "${STATE.query}"`;
  } else if (STATE.activeFilter !== 'all') {
    const labels = { loteria: '🎟️ Loterías', chance: '🎲 Chances', baloto: '🎱 Baloto' };
    E.resultsTitle.textContent = labels[STATE.activeFilter] || 'Resultados';
  } else {
    const day = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    E.resultsTitle.textContent = `${cap(day)}`;
  }

  const withRes = STATE.filtered.filter(r => r.hasResult).length;
  const pending = STATE.filtered.length - withRes;
  E.resultsCount.textContent = `${withRes} con resultado${pending > 0 ? ` · ${pending} pendientes` : ''}`;

  // Aviso si hay loterías pendientes
  if (STATE.loadStats && !STATE.loadStats.apiAvailable) {
    E.apiNotice.classList.remove('hidden');
    E.apiNotice.innerHTML = `⚠️ La API principal no respondió. Se usó fuente alternativa.
      <a href="https://api-resultadosloterias.com" target="_blank" rel="noopener">Más info</a>`;
  } else {
    E.apiNotice.classList.add('hidden');
  }

  E.cardsGrid.innerHTML = '';
  STATE.filtered.forEach(r => E.cardsGrid.appendChild(createCard(r)));
}

function createCard(r) {
  const div = document.createElement('div');
  const isSpecial = r.type === 'baloto' && r.id === 'baloto';
  div.className = 'lottery-card' + (isSpecial ? ' card-baloto' : '');
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.setAttribute('aria-label', r.name);

  const badgeCls = { loteria: 'badge-loteria', chance: 'badge-chance', baloto: 'badge-baloto' }[r.type];
  const typeLabel = { loteria: 'Lotería', chance: 'Chance', baloto: 'Baloto' }[r.type] || r.type;

  // Números
  let numsHtml = '';
  if (r.hasResult && r.numbers.length > 0) {
    numsHtml = `<div class="card-numbers">`;
    r.numbers.forEach((n, i) => {
      const isSuperball = r.type === 'baloto' && i === r.numbers.length - 1 && r.superball != null;
      const cls = isSuperball ? 'num-ball superball' : `num-ball nb-${r.type}`;
      numsHtml += `<span class="${cls}">${n}</span>`;
    });
    if (r.sign) numsHtml += `<span class="sign-badge">${r.sign}</span>`;
    numsHtml += `</div>`;
  } else if (r.pending || !r.hasResult) {
    const now = new Date();
    const [hh, mm] = (r.hour || '').split(':').map(Number);
    const sorteoTime = new Date(); sorteoTime.setHours(hh||22, mm||0, 0, 0);
    const upcoming = sorteoTime > now;
    numsHtml = `<div class="card-numbers pending">
      <span class="pending-label">${upcoming ? `⏰ Sorteo a las ${r.hour}` : '⌛ Resultado no disponible aún'}</span>
    </div>`;
  }

  // Info chips
  let infoHtml = '';
  const chips = [];
  if (r.sorteo)   chips.push({ label: 'Sorteo', value: `#${r.sorteo}` });
  if (r.serie)    chips.push({ label: 'Serie', value: r.serie });
  if (r.fraccion) chips.push({ label: 'Fracción', value: r.fraccion });
  if (r.prize)    chips.push({ label: 'Premio', value: fmtPrize(r.prize), prize: true });
  if (r.jackpot && r.type === 'baloto') chips.push({ label: 'Acumulado', value: fmtPrize(r.jackpot), prize: true });
  if (chips.length) {
    infoHtml = `<div class="card-info">` +
      chips.map(c => `<div class="info-chip"><span class="chip-lbl">${c.label}</span><span class="chip-val${c.prize?' prize':''}">${c.value}</span></div>`).join('') +
      `</div>`;
  }

  // Baloto acumulado banner
  let banner = '';
  if (r.type === 'baloto' && r.jackpot) {
    banner = `<div class="baloto-banner"><span class="bb-label">Acumulado</span><span class="bb-amount">${fmtPrize(r.jackpot)}</span></div>`;
  }

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
    ${banner}
    ${numsHtml}
    ${infoHtml}
  `;

  div.addEventListener('click',   () => openModal(r));
  div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(r); });
  return div;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(r) {
  const typeLabel = { loteria: 'Lotería', chance: 'Chance', baloto: 'Baloto' }[r.type] || r.type;

  let numsHtml = '';
  if (r.hasResult && r.numbers.length > 0) {
    numsHtml = `<div class="modal-numbers">`;
    r.numbers.forEach((n, i) => {
      const isSuperball = r.type === 'baloto' && i === r.numbers.length - 1 && r.superball != null;
      const cls = isSuperball ? 'modal-ball superball' : `modal-ball nb-${r.type}`;
      numsHtml += `<span class="${cls}">${n}</span>`;
    });
    if (r.sign) numsHtml += `<span class="modal-sign">${r.sign}</span>`;
    numsHtml += `</div>`;
  } else {
    numsHtml = `<div class="modal-no-result">⏰ El resultado aún no está disponible.<br>Sorteo: ${r.hour || 'Ver fuente oficial'}</div>`;
  }

  const details = [
    r.sorteo   && { label: 'Sorteo', value: `#${r.sorteo}` },
    r.serie    && { label: 'Serie', value: r.serie },
    r.fraccion && { label: 'Fracción', value: r.fraccion },
    r.prize    && { label: 'Premio Mayor', value: fmtPrize(r.prize), prize: true },
    r.jackpot  && { label: 'Acumulado Baloto', value: fmtPrize(r.jackpot), prize: true },
    r.entity   && { label: 'Entidad', value: r.entity },
    r.source   && { label: 'Fuente de datos', value: r.source },
  ].filter(Boolean);

  E.modalContent.innerHTML = `
    <div class="modal-emoji">${r.emoji}</div>
    <h2 class="modal-title">${r.name}</h2>
    <p class="modal-subtitle">${typeLabel} · ${fmtDate(r.date)}</p>
    ${numsHtml}
    ${details.length ? `<div class="modal-grid">${details.map(d=>`
      <div class="modal-box">
        <div class="modal-box-label">${d.label}</div>
        <div class="modal-box-value${d.prize?' prize':''}">${d.value}</div>
      </div>`).join('')}</div>` : ''}
    <a class="modal-official-link" href="${r.official}" target="_blank" rel="noopener">
      🔗 Ver en fuente oficial
    </a>
  `;

  E.modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  E.modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function setupModal() {
  E.modalClose.addEventListener('click', closeModal);
  E.modalOverlay.addEventListener('click', e => { if (e.target === E.modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ── Búsqueda por texto ────────────────────────────────────────────────────────
function setupSearch() {
  let debounce;
  E.searchInput.addEventListener('input', () => {
    STATE.query = E.searchInput.value;
    updateClearBtn();
    showSuggestions(STATE.query);
    clearTimeout(debounce);
    debounce = setTimeout(() => { applyFilters(); renderAll(); }, 220);
  });

  E.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); hideSuggestions(); applyFilters(); renderAll(); }
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
  const matches = searchCatalog(query, STATE.activeFilter !== 'all' ? STATE.activeFilter : null).slice(0, 7);
  if (!matches.length) { hideSuggestions(); return; }
  suggIdx = -1;
  E.suggestions.innerHTML = matches.map((m, i) => `
    <div class="sugg-item" data-idx="${i}" data-name="${m.name}" role="option">
      <span class="sugg-emoji">${m.emoji}</span>
      <span class="sugg-name">${hlMatch(m.name, query)}</span>
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

function hideSuggestions() {
  E.suggestions.classList.remove('visible');
  suggIdx = -1;
}

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
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${q})`, 'gi'), '<strong>$1</strong>');
}

function updateClearBtn() {
  E.clearBtn.classList.toggle('visible', !!STATE.query.trim());
}

// ── Filtros rápidos ───────────────────────────────────────────────────────────
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
      applyFilters();
      renderAll();
    },
    onStateChange(state, msg) {
      E.voiceStatus.textContent = msg;
      const active = ['listening','speech','interim','sound'].includes(state);
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

// ── UI helpers ────────────────────────────────────────────────────────────────
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
    const [y,m,d] = iso.split('-').map(Number);
    const date = new Date(y, m-1, d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    return date.toLocaleDateString('es-CO', { weekday:'short', day:'numeric', month:'short' });
  } catch(_) { return iso; }
}

function fmtPrize(v) {
  if (!v) return '';
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^\d.]/g,'')) : Number(v);
  if (isNaN(n)) return String(v);
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)} mil millones`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(0)} millones`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)} mil`;
  return `$${n.toLocaleString('es-CO')}`;
}

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
