/**
 * api.js
 * Fetches real lottery results from api-resultadosloterias.com
 * and quecayo.com as fallback.
 *
 * Strategy:
 *  1. Try api-resultadosloterias.com (public, no key needed for basic endpoints)
 *  2. If that fails, try scraping quecayo.com via allorigins proxy
 *  3. If that fails too, return a "no data yet today" state with the schedule
 */

const API_BASE = 'https://api-resultadosloterias.com/api';
const CORS_PROXY = 'https://api.allorigins.win/get?url=';
const QUECAYO_BASE = 'https://quecayo.com';
const CHANCESCOL_BASE = 'https://chancescolombia.com';

// Map internal IDs → api-resultadosloterias slugs (best guess from docs)
const API_SLUG_MAP = {
  bogota:       'loteria-bogota',
  medellin:     'loteria-medellin',
  antioquia:    'loteria-antioquia',
  cundinamarca: 'loteria-cundinamarca',
  boyaca:       'loteria-boyaca',
  huila:        'loteria-huila',
  tolima:       'loteria-tolima',
  manizales:    'loteria-manizales',
  quindio:      'loteria-quindio',
  risaralda:    'loteria-risaralda',
  santander:    'loteria-santander',
  cauca:        'loteria-cauca',
  nariño:       'loteria-narino',
  putumayo:     'loteria-putumayo',
  oriental:     'loteria-oriental',
  pacifico:     'loteria-pacifico',
  cordobesa:    'loteria-cordobesa',
  sucre:        'loteria-sucre',
  magdalena:    'loteria-magdalena',
  baloto:       'baloto',
  revancha:     'baloto-revancha',
  miloto:       'miloto',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchJSON(url, timeout = 8000) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

async function fetchHTML(url, timeout = 8000) {
  const proxyUrl = CORS_PROXY + encodeURIComponent(url);
  const data = await fetchJSON(proxyUrl, timeout);
  return data.contents || '';
}

// ─── Source 1: api-resultadosloterias.com ──────────────────────────────────

async function fetchFromApiResultados() {
  // Public endpoint – list all today's results
  const url = `${API_BASE}/results/today`;
  const data = await fetchJSON(url, 7000);
  if (!Array.isArray(data) && !data.results) throw new Error('Unexpected format');
  const list = Array.isArray(data) ? data : (data.results || []);
  return list.map(r => normalizeApiResult(r));
}

function normalizeApiResult(r) {
  const cat = getCatalogEntry(r.lottery_name || r.name || r.loteria || '');
  return {
    id:       r.id || r.lottery_id || (cat ? cat.id : 'unknown'),
    name:     r.lottery_name || r.name || r.loteria || (cat ? cat.name : 'Lotería'),
    type:     cat ? cat.type : guessType(r.lottery_name || ''),
    emoji:    cat ? cat.emoji : '🎱',
    date:     r.date || r.fecha || todayISO(),
    numbers:  parseNumbers(r.numbers || r.numeros || r.resultado || ''),
    serie:    r.serie || r.series || null,
    fraccion: r.fraction || r.fraccion || null,
    prize:    r.prize || r.premio || null,
    jackpot:  r.jackpot || r.acumulado || null,
    superball:r.superball || r.superbalota || null,
    sorteo:   r.draw_number || r.sorteo || null,
    source:   'api-resultadosloterias.com',
    official: 'https://api-resultadosloterias.com',
  };
}

// ─── Source 2: quecayo.com (via CORS proxy) ─────────────────────────────────

async function fetchFromQueCayo(loteriaName = '') {
  const url = loteriaName
    ? `${QUECAYO_BASE}/loteria/${encodeURIComponent(loteriaName)}`
    : QUECAYO_BASE;
  const html = await fetchHTML(url, 9000);
  return parseQueCayoHTML(html);
}

function parseQueCayoHTML(html) {
  const results = [];
  if (!html) return results;

  // Pattern: data-lottery="..." or class="lottery-result" blocks
  // The site renders result cards with lottery name + numbers
  const cardPattern = /<div[^>]+class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  const namePattern = /<h\d[^>]*>(.*?)<\/h\d>/i;
  const numPattern = /data-number="(\d+)"|<span[^>]*class="[^"]*number[^"]*"[^>]*>(\d+)<\/span>/gi;
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;

  // Simpler: scan all visible lottery name + number blocks
  const blocks = html.split(/<article|<section|<div class="card/i).slice(1);
  for (const block of blocks.slice(0, 60)) {
    try {
      const nameMatch = block.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
      if (!nameMatch) continue;
      const lname = nameMatch[1].replace(/<[^>]+>/g, '').trim();
      if (!lname || lname.length < 4) continue;
      const nums = [];
      const numPatLocal = />\s*(\d{1,4})\s*</g;
      let m;
      while ((m = numPatLocal.exec(block)) !== null && nums.length < 7) {
        const n = parseInt(m[1]);
        if (n >= 0 && n <= 9999 && !nums.includes(n)) nums.push(n);
      }
      if (nums.length === 0) continue;
      const dateMatch = block.match(datePattern);
      const cat = getCatalogEntry(lname);
      results.push({
        id:       cat ? cat.id : slugify(lname),
        name:     lname,
        type:     cat ? cat.type : guessType(lname),
        emoji:    cat ? cat.emoji : '🎲',
        date:     dateMatch ? parseDate(dateMatch[1]) : todayISO(),
        numbers:  nums,
        serie:    extractField(block, 'serie') || extractField(block, 'series'),
        fraccion: extractField(block, 'fraccion') || extractField(block, 'fracción'),
        prize:    extractField(block, 'premio') || extractField(block, 'award'),
        jackpot:  null,
        superball:null,
        sorteo:   extractField(block, 'sorteo') || extractField(block, 'concurso'),
        source:   'quecayo.com',
        official: QUECAYO_BASE,
      });
    } catch (_) { /* skip bad block */ }
  }
  return results;
}

// ─── Source 3: chancescolombia.com ──────────────────────────────────────────

async function fetchFromChancesColombia(id) {
  const url = `${CHANCESCOL_BASE}/${id}`;
  const html = await fetchHTML(url, 9000);
  return parseChancesHTML(html, id);
}

function parseChancesHTML(html, id) {
  const results = [];
  if (!html) return results;
  const blocks = html.split(/class="result-item"|class="sorteo-item"|class="card-result"/i).slice(1);
  for (const block of blocks.slice(0, 30)) {
    try {
      const nums = [];
      const numPat = />\s*(\d{1,4})\s*</g;
      let m;
      while ((m = numPat.exec(block)) !== null && nums.length < 7) {
        const n = parseInt(m[1]);
        if (!isNaN(n) && n >= 0 && n <= 9999) nums.push(n);
      }
      if (nums.length === 0) continue;
      const cat = getCatalogEntry(id);
      results.push({
        id:       cat ? cat.id : id,
        name:     cat ? cat.name : id,
        type:     cat ? cat.type : 'chance',
        emoji:    cat ? cat.emoji : '🎲',
        date:     todayISO(),
        numbers:  nums,
        serie:    extractField(block, 'serie'),
        fraccion: extractField(block, 'fraccion'),
        prize:    extractField(block, 'premio'),
        jackpot:  null,
        superball:null,
        sorteo:   extractField(block, 'sorteo'),
        source:   'chancescolombia.com',
        official: CHANCESCOL_BASE,
      });
    } catch (_) { /* skip */ }
  }
  return results;
}

// ─── Fallback: build schedule cards from catalog ────────────────────────────

function buildScheduleCards(catalogEntries) {
  return catalogEntries.map(cat => ({
    id:       cat.id,
    name:     cat.name,
    type:     cat.type,
    emoji:    cat.emoji,
    date:     todayISO(),
    numbers:  [],
    serie:    null,
    fraccion: null,
    prize:    null,
    jackpot:  null,
    superball:null,
    sorteo:   null,
    source:   'schedule',
    official: 'https://www.coljuegos.gov.co',
    pending:  true,
    hour:     cat.hour,
    entity:   cat.entity,
  }));
}

// ─── Main public API ────────────────────────────────────────────────────────

/**
 * Fetch all results for today.
 * Returns: { results: [], fromSource: 'api'|'quecayo'|'schedule', error: null|string }
 */
async function fetchTodayResults() {
  // Try primary API
  try {
    const results = await fetchFromApiResultados();
    if (results.length > 0) {
      return { results, fromSource: 'api', error: null };
    }
  } catch (e) {
    console.warn('[API] Primary failed:', e.message);
  }

  // Try quecayo.com
  try {
    const results = await fetchFromQueCayo();
    if (results.length > 0) {
      return { results, fromSource: 'quecayo', error: null };
    }
  } catch (e) {
    console.warn('[API] QueCayo failed:', e.message);
  }

  // Fallback: build from schedule
  const today = getTodayCatalog();
  const cards = buildScheduleCards(today);
  return { results: cards, fromSource: 'schedule', error: 'Usando horario programado — resultados no disponibles aún' };
}

/**
 * Fetch results for a specific lottery by id.
 */
async function fetchResultsFor(lotteryId) {
  const cat = LOTERIAS_CATALOG.find(l => l.id === lotteryId);
  if (!cat) return [];

  // Try primary API with specific slug
  const slug = API_SLUG_MAP[lotteryId];
  if (slug) {
    try {
      const url = `${API_BASE}/results/${slug}/today`;
      const data = await fetchJSON(url, 7000);
      const list = Array.isArray(data) ? data : (data.results || [data]);
      if (list.length > 0) return list.map(r => normalizeApiResult(r));
    } catch (e) {
      console.warn(`[API] ${lotteryId} primary failed:`, e.message);
    }
  }

  // Try chancescolombia.com
  try {
    const results = await fetchFromChancesColombia(lotteryId);
    if (results.length > 0) return results;
  } catch (e) {
    console.warn(`[API] ${lotteryId} chancescolombia failed:`, e.message);
  }

  // Fallback
  return buildScheduleCards([cat]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseNumbers(input) {
  if (Array.isArray(input)) return input.map(Number).filter(n => !isNaN(n));
  if (typeof input === 'string') {
    return input.split(/[\s\-,\.]+/).map(Number).filter(n => !isNaN(n) && n >= 0);
  }
  if (typeof input === 'number') return [input];
  return [];
}

function guessType(name) {
  const n = name.toLowerCase();
  if (n.includes('baloto') || n.includes('miloto')) return 'baloto';
  if (n.includes('chance') || n.includes('astro') || n.includes('pata') || n.includes('pijao')) return 'chance';
  return 'loteria';
}

function slugify(str) {
  return str.toLowerCase().replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function parseDate(str) {
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? '20' + y : y;
    return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return todayISO();
}

function extractField(html, field) {
  const pat = new RegExp(`${field}[^<>]*>[^<>]*([\\d\\.\\,]+)`, 'i');
  const m = html.match(pat);
  return m ? m[1].trim() : null;
}
