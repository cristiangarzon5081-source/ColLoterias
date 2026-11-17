/**
 * app.js
 * Main application controller.
 * Handles: data loading, search, filtering, rendering, modal, voice integration.
 */

// ─── State ──────────────────────────────────────────────────────────────────

const STATE = {
  allResults: [],       // full set loaded from API
  filtered: [],         // currently displayed
  activeFilter: 'all',  // quick filter
  query: '',            // text search
  loading: false,
  fromSource: '',
  voiceActive: false,
  suggestionIndex: -1,
};

// ─── DOM Refs ────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const els = {
  searchInput:      $('searchInput'),
  searchBox:        $('searchBox'),
  voiceBtn:         $('voiceBtn'),
  micIcon:          $('micIcon'),
  clearBtn:         $('clearBtn'),
  voiceStatus:      $('voiceStatus'),
  searchSuggestions:$('searchSuggestions'),
  quickFilters:     $('quickFilters'),
  loadingState:     $('loadingState'),
  errorState:       $('errorState'),
  errorMsg:         $('errorMsg'),
  retryBtn:         $('retryBtn'),
  emptyState:       $('emptyState'),
  emptyQuery:       $('emptyQuery'),
  resultsSection:   $('resultsSection'),
  resultsTitle:     $('resultsTitle'),
  resultsCount:     $('resultsCount'),
  lastUpdate:       $('lastUpdate'),
  cardsGrid:        $('cardsGrid'),
  modalOverlay:     $('modalOverlay'),
  modal:            $('modal'),
  modalClose:       $('modalClose'),
  modalContent:     $('modalContent'),
};

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupVoice();
  setupSearch();
  setupFilters();
  setupModal();
  loadResults();
});

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadResults() {
  showLoading();
  try {
    const { results, fromSource, error } = await fetchTodayResults();
    STATE.allResults = results;
    STATE.fromSource = fromSource;
    applyFiltersAndSearch();
    showResults();
    updateLastUpdate(fromSource, error);
  } catch (err) {
    showError('No se pudieron cargar los resultados. Verifica tu conexión.');
    console.error(err);
  }
}

function updateLastUpdate(source, warning) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const sourceLabel = {
    'api':      '• Fuente: API Oficial',
    'quecayo':  '• Fuente: QuéCayó',
    'schedule': '• Horario programado',
  }[source] || '';
  els.lastUpdate.textContent = `Actualizado ${timeStr} ${sourceLabel}`;
  if (warning) {
    els.voiceStatus.textContent = `ℹ️ ${warning}`;
    setTimeout(() => { if (!STATE.voiceActive) els.voiceStatus.textContent = ''; }, 6000);
  }
}

// ─── Filtering & Search ──────────────────────────────────────────────────────

function applyFiltersAndSearch() {
  let results = [...STATE.allResults];

  // Quick filter
  if (STATE.activeFilter !== 'all') {
    if (STATE.activeFilter === 'hoy') {
      const todayISO = new Date().toISOString().slice(0, 10);
      results = results.filter(r => r.date === todayISO || !r.date);
    } else {
      results = results.filter(r => r.type === STATE.activeFilter);
    }
  }

  // Text / voice search
  if (STATE.query.trim()) {
    const q = STATE.query.toLowerCase().trim();
    results = results.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.id.includes(q) ||
      r.type.includes(q) ||
      (r.entity && r.entity.toLowerCase().includes(q))
    );
  }

  // Sort: baloto first, then alphabetical
  results.sort((a, b) => {
    const order = { baloto: 0, loteria: 1, chance: 2 };
    const ao = order[a.type] ?? 3;
    const bo = order[b.type] ?? 3;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, 'es');
  });

  STATE.filtered = results;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function showResults() {
  if (STATE.filtered.length === 0 && STATE.query) {
    showEmpty();
    return;
  }
  hideAll();
  els.resultsSection.classList.remove('hidden');

  // Title
  if (STATE.query) {
    els.resultsTitle.textContent = `Resultados para "${STATE.query}"`;
  } else if (STATE.activeFilter !== 'all') {
    const labels = { loteria: 'Loterías', chance: 'Chances', baloto: 'Baloto', hoy: 'Hoy' };
    els.resultsTitle.textContent = labels[STATE.activeFilter] || 'Resultados';
  } else {
    const day = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    els.resultsTitle.textContent = `Resultados — ${capitalize(day)}`;
  }

  els.resultsCount.textContent = `${STATE.filtered.length} resultado${STATE.filtered.length !== 1 ? 's' : ''}`;
  els.cardsGrid.innerHTML = '';

  // Render Baloto special card first if present
  const balotoCards = STATE.filtered.filter(r => r.type === 'baloto');
  const otherCards  = STATE.filtered.filter(r => r.type !== 'baloto');

  if (balotoCards.length > 0 && STATE.activeFilter !== 'loteria' && STATE.activeFilter !== 'chance') {
    const balotoContainer = document.createElement('div');
    balotoContainer.className = 'baloto-section';
    balotoContainer.style.cssText = 'grid-column:1/-1; display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px;';
    balotoCards.forEach(r => balotoContainer.appendChild(renderCard(r, true)));
    els.cardsGrid.appendChild(balotoContainer);
  }

  otherCards.forEach(r => els.cardsGrid.appendChild(renderCard(r, false)));
}

function renderCard(r, isBaloto) {
  const card = document.createElement('div');
  card.className = 'lottery-card' + (isBaloto && r.id === 'baloto' ? ' card-baloto-special' : '');
  card.setAttribute('data-id', r.id);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Ver detalle de ${r.name}`);

  const badgeClass = `badge-${r.type}`;
  const typeLabel = { loteria: 'Lotería', chance: 'Chance', baloto: 'Baloto' }[r.type] || r.type;
  const dateFormatted = formatDate(r.date);

  let numbersHTML = '';
  if (r.numbers && r.numbers.length > 0) {
    numbersHTML = `<div class="card-numbers">`;
    r.numbers.forEach((n, i) => {
      const isSuperball = r.type === 'baloto' && i === r.numbers.length - 1 && r.superball !== undefined;
      const cls = isSuperball ? 'num-ball superbalota' : `num-ball type-${r.type}`;
      const display = r.type === 'baloto' ? String(n).padStart(2, '0') : String(n).padStart(r.type === 'loteria' ? 4 : 2, '0');
      numbersHTML += `<div class="${cls}">${display}</div>`;
      if (isSuperball && i > 0) {
        // Add separator before superball
      }
    });
    numbersHTML += `</div>`;
  } else if (r.pending) {
    numbersHTML = `<div class="card-numbers"><span style="color:var(--text3);font-size:13px">⏰ Sorteo a las ${r.hour}</span></div>`;
  } else {
    numbersHTML = `<div class="card-numbers"><span style="color:var(--text3);font-size:13px">Sin resultado aún</span></div>`;
  }

  let infoHTML = '';
  const chips = [];
  if (r.sorteo)   chips.push({ label: 'Sorteo', value: `#${r.sorteo}` });
  if (r.serie)    chips.push({ label: 'Serie', value: r.serie });
  if (r.fraccion) chips.push({ label: 'Fracción', value: r.fraccion });
  if (r.prize)    chips.push({ label: 'Premio', value: formatPrize(r.prize), cls: 'prize' });
  if (r.jackpot && r.type === 'baloto') chips.push({ label: 'Acumulado', value: formatPrize(r.jackpot), cls: 'prize' });
  if (chips.length > 0) {
    infoHTML = `<div class="card-info-row">` +
      chips.map(c => `<div class="info-chip"><span class="chip-label">${c.label}</span><span class="chip-value ${c.cls||''}">${c.value}</span></div>`).join('') +
      `</div>`;
  }

  // Baloto jackpot banner
  let jackpotBanner = '';
  if (r.type === 'baloto' && r.jackpot) {
    jackpotBanner = `<div class="baloto-jackpot">Acumulado actual</div><div class="baloto-amount">${formatPrize(r.jackpot)}</div>`;
  }

  card.innerHTML = `
    ${r.pending ? '<div class="card-status pending"></div>' : '<div class="card-status"></div>'}
    <div class="card-header">
      <div class="card-emoji">${r.emoji}</div>
      <div class="card-meta">
        <div class="card-name">${r.name}</div>
        <div class="card-date">${dateFormatted}</div>
      </div>
      <span class="card-type-badge ${badgeClass}">${typeLabel}</span>
    </div>
    ${jackpotBanner}
    ${numbersHTML}
    ${infoHTML}
  `;

  card.addEventListener('click', () => openModal(r));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(r); });
  return card;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function openModal(r) {
  const typeLabel = { loteria: 'Lotería', chance: 'Chance', baloto: 'Baloto' }[r.type] || r.type;
  const dateFormatted = formatDate(r.date);

  let numbersHTML = '';
  if (r.numbers && r.numbers.length > 0) {
    numbersHTML = `<div class="modal-numbers">`;
    r.numbers.forEach((n, i) => {
      const isSuperball = r.type === 'baloto' && i === r.numbers.length - 1 && r.superball !== undefined;
      const cls = isSuperball ? 'modal-num-ball superbalota' : `modal-num-ball type-${r.type}`;
      const display = r.type === 'baloto' ? String(n).padStart(2, '0') : String(n).padStart(r.type === 'loteria' ? 4 : 2, '0');
      numbersHTML += `<div class="${cls}">${display}</div>`;
    });
    numbersHTML += `</div>`;
  } else if (r.pending) {
    numbersHTML = `<div style="color:var(--text2);margin-bottom:20px">⏰ El sorteo es a las <strong>${r.hour}</strong>. Vuelve más tarde.</div>`;
  }

  const details = [];
  if (r.sorteo)   details.push({ label: 'Número de Sorteo', value: `#${r.sorteo}` });
  if (r.serie)    details.push({ label: 'Serie', value: r.serie });
  if (r.fraccion) details.push({ label: 'Fracción', value: r.fraccion });
  if (r.prize)    details.push({ label: 'Premio Mayor', value: formatPrize(r.prize), prize: true });
  if (r.jackpot)  details.push({ label: 'Acumulado', value: formatPrize(r.jackpot), prize: true });
  if (r.entity)   details.push({ label: 'Entidad', value: r.entity });

  let detailsHTML = '';
  if (details.length > 0) {
    detailsHTML = `<div class="modal-details-grid">` +
      details.map(d => `
        <div class="modal-detail-box">
          <div class="modal-detail-label">${d.label}</div>
          <div class="modal-detail-value ${d.prize ? 'prize' : ''}">${d.value}</div>
        </div>
      `).join('') +
      `</div>`;
  }

  els.modalContent.innerHTML = `
    <div class="modal-title">${r.emoji} ${r.name}</div>
    <div class="modal-date">${typeLabel} · ${dateFormatted}</div>
    ${numbersHTML}
    ${detailsHTML}
    <div class="modal-source">
      Datos vía <a href="${r.official}" target="_blank" rel="noopener">${r.source}</a> ·
      Fuente oficial: <a href="https://www.coljuegos.gov.co" target="_blank" rel="noopener">Coljuegos</a>
    </div>
  `;

  els.modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  els.modalClose.focus();
}

function closeModal() {
  els.modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

function setupModal() {
  els.modalClose.addEventListener('click', closeModal);
  els.modalOverlay.addEventListener('click', e => {
    if (e.target === els.modalOverlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

function setupSearch() {
  let debounceTimer;

  els.searchInput.addEventListener('input', () => {
    STATE.query = els.searchInput.value;
    updateClearBtn();
    showSuggestions(STATE.query);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      applyFiltersAndSearch();
      showResults();
    }, 220);
  });

  els.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hideSuggestions();
      applyFiltersAndSearch();
      showResults();
    }
    if (e.key === 'ArrowDown') navigateSuggestions(1);
    if (e.key === 'ArrowUp')   navigateSuggestions(-1);
    if (e.key === 'Escape')    hideSuggestions();
  });

  els.clearBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    STATE.query = '';
    updateClearBtn();
    hideSuggestions();
    applyFiltersAndSearch();
    showResults();
    els.searchInput.focus();
  });

  // Hide suggestions on outside click
  document.addEventListener('click', e => {
    if (!els.searchBox.contains(e.target)) hideSuggestions();
  });
}

function updateClearBtn() {
  if (STATE.query.trim()) els.clearBtn.classList.add('visible');
  else els.clearBtn.classList.remove('visible');
}

function showSuggestions(query) {
  if (!query.trim()) { hideSuggestions(); return; }
  const matches = searchCatalog(query).slice(0, 8);
  if (matches.length === 0) { hideSuggestions(); return; }

  STATE.suggestionIndex = -1;
  els.searchSuggestions.innerHTML = matches.map((m, i) => `
    <div class="suggestion-item" data-index="${i}" data-id="${m.id}" data-name="${m.name}" role="option" tabindex="-1">
      <span class="sugg-emoji">${m.emoji}</span>
      <span class="sugg-name">${highlightMatch(m.name, query)}</span>
      <span class="sugg-type">${m.type}</span>
    </div>
  `).join('');
  els.searchSuggestions.classList.add('visible');

  els.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.getAttribute('data-name');
      els.searchInput.value = name;
      STATE.query = name;
      updateClearBtn();
      hideSuggestions();
      applyFiltersAndSearch();
      showResults();
    });
  });
}

function hideSuggestions() {
  els.searchSuggestions.classList.remove('visible');
  STATE.suggestionIndex = -1;
}

function navigateSuggestions(dir) {
  const items = els.searchSuggestions.querySelectorAll('.suggestion-item');
  if (items.length === 0) return;
  STATE.suggestionIndex = Math.max(-1, Math.min(items.length - 1, STATE.suggestionIndex + dir));
  items.forEach((item, i) => item.classList.toggle('highlighted', i === STATE.suggestionIndex));
  if (STATE.suggestionIndex >= 0) {
    items[STATE.suggestionIndex].scrollIntoView({ block: 'nearest' });
    els.searchInput.value = items[STATE.suggestionIndex].getAttribute('data-name');
  }
}

function highlightMatch(text, query) {
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${q})`, 'gi'), '<strong>$1</strong>');
}

// ─── Quick Filters ────────────────────────────────────────────────────────────

function setupFilters() {
  els.quickFilters.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    els.quickFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.activeFilter = chip.getAttribute('data-filter');
    applyFiltersAndSearch();
    showResults();
  });
}

// ─── Voice ────────────────────────────────────────────────────────────────────

function setupVoice() {
  const voice = new VoiceSearch({
    onResult(normalized, raw) {
      STATE.voiceActive = false;
      els.voiceBtn.classList.remove('active');
      els.micIcon.textContent = '🎙️';
      els.searchBox.classList.remove('listening');

      els.searchInput.value = normalized;
      STATE.query = normalized;
      updateClearBtn();
      hideSuggestions();
      applyFiltersAndSearch();
      showResults();

      // Clear status after 3s
      setTimeout(() => { els.voiceStatus.textContent = ''; }, 3000);
    },
    onStateChange(state, message) {
      els.voiceStatus.textContent = message;
      if (state === 'listening' || state === 'sound' || state === 'speech' || state === 'interim') {
        els.searchBox.classList.add('listening');
        els.voiceBtn.classList.add('active');
        els.micIcon.textContent = '🔴';
        STATE.voiceActive = true;
      } else {
        els.searchBox.classList.remove('listening');
        els.voiceBtn.classList.remove('active');
        els.micIcon.textContent = '🎙️';
        STATE.voiceActive = false;
      }
      if (state === 'done' || state === 'error') {
        setTimeout(() => { if (!STATE.voiceActive) els.voiceStatus.textContent = ''; }, 3000);
      }
    },
    onError(msg) {
      els.voiceStatus.textContent = msg;
      els.voiceBtn.disabled = !voice.isSupported();
    },
  });

  els.voiceBtn.addEventListener('click', () => {
    voice.toggle();
  });

  // Hide mic button if not supported after small delay
  setTimeout(() => {
    if (!voice.isSupported()) {
      els.voiceBtn.style.opacity = '0.3';
      els.voiceBtn.title = 'Búsqueda por voz no disponible en este navegador';
    }
  }, 500);
}

// ─── UI State Helpers ─────────────────────────────────────────────────────────

function hideAll() {
  els.loadingState.classList.add('hidden');
  els.errorState.classList.add('hidden');
  els.emptyState.classList.add('hidden');
  els.resultsSection.classList.add('hidden');
}

function showLoading() {
  hideAll();
  els.loadingState.classList.remove('hidden');
}

function showError(msg) {
  hideAll();
  els.errorMsg.textContent = msg;
  els.errorState.classList.remove('hidden');
  els.retryBtn.addEventListener('click', loadResults, { once: true });
}

function showEmpty() {
  hideAll();
  els.emptyQuery.textContent = STATE.query;
  els.emptyState.classList.remove('hidden');
}

// ─── Format Utilities ─────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return 'Hoy';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return 'Hoy';
    return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (_) {
    return iso;
  }
}

function formatPrize(value) {
  if (!value) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value;
  if (isNaN(num)) return String(value);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)} mil millones`;
  if (num >= 1_000_000)     return `$${(num / 1_000_000).toFixed(0)} millones`;
  if (num >= 1_000)         return `$${(num / 1_000).toFixed(0)} mil`;
  return `$${num.toLocaleString('es-CO')}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
