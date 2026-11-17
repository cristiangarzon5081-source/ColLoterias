/**
 * api.js — Capa de datos con resultados REALES e HISTORIAL
 *
 * Fuentes:
 *  1) api-resultadosloterias.com  — resultado más reciente por slug
 *  2) loteriaya.com.co            — resultado por fecha exacta + historial
 *  3) resultadodelaloteria.com    — fallback resultado actual
 *  4) Horario programado          — si todo falla
 */

const API1_BASE  = 'https://api-resultadosloterias.com/api';
const PROXY      = 'https://corsproxy.io/?url=';
const LY_BASE    = 'https://www.loteriaya.com.co';   // /loteria/{slug}/resultado/YYYY-MM-DD
const RDL_BASE   = 'https://resultadodelaloteria.com/colombia';

// ── Slugs de loteriaya.com.co (coinciden con resultadodelaloteria en su mayoría)
const LY_SLUGS = {
  bogota:        'loteria-de-bogota',
  medellin:      'loteria-de-medellin',
  cundinamarca:  'loteria-de-cundinamarca',
  boyaca:        'loteria-de-boyaca',
  huila:         'loteria-del-huila',
  tolima:        'loteria-del-tolima',
  manizales:     'loteria-de-manizales',
  quindio:       'loteria-del-quindio',
  risaralda:     'loteria-de-risaralda',
  santander:     'loteria-de-santander',
  cauca:         'loteria-del-cauca',
  narino:        'loteria-de-narino',
  putumayo:      'loteria-del-putumayo',
  oriental:      'loteria-oriental',
  pacifico:      'loteria-del-pacifico',
  cordobesa:     'loteria-cordobesa',
  sucre:         'loteria-de-sucre',
  magdalena:     'loteria-del-magdalena',
  cruzroja:      'loteria-de-la-cruz-roja',
  extracolombia: 'extra-de-colombia',
  meta:          'loteria-del-meta',
  baloto:        'baloto',
  revancha:      'revancha',
  miloto:        'miloto',
  // chances
  'antioquenita-m':  'antioquenita-manana',
  'antioquenita-t':  'antioquenita-tarde',
  'antioquenita-n':  'antioquenita-noche',
  'cafetero-m':      'cafetero-manana',
  'cafetero-t':      'cafetero-tarde',
  'cafetero-n':      'cafetero-noche',
  'pijao-m':         'pijao-de-oro-manana',
  'pijao-t':         'pijao-de-oro-tarde',
  'pijao-n':         'pijao-de-oro-noche',
  'pata-m':          'la-pata-manana',
  'pata-t':          'la-pata-tarde',
  'pata-n':          'la-pata-noche',
  'costeño-m':       'el-costeno-manana',
  'costeño-t':       'el-costeno-tarde',
  'costeño-n':       'el-costeno-noche',
  'mano-m':          'la-mano-manana',
  'mano-t':          'la-mano-tarde',
  'mano-n':          'la-mano-noche',
  'caribe-m':        'caribe-manana',
  'caribe-t':        'caribe-tarde',
  'caribe-n':        'caribe-noche',
  'cash3-m':         'cash-three-manana',
  'cash3-t':         'cash-three-tarde',
  'cash3-n':         'cash-three-noche',
  'suertudo-m':      'el-suertudo-manana',
  'suertudo-t':      'el-suertudo-tarde',
  'suertudo-n':      'el-suertudo-noche',
  'paisita-m':       'paisita-manana',
  'paisita-t':       'paisita-tarde',
  'paisita-n':       'paisita-noche',
  'motilón-m':       'el-motilon-manana',
  'motilón-t':       'el-motilon-tarde',
  'motilón-n':       'el-motilon-noche',
  'superastro-sol':  'super-astro-sol',
  'superastro-luna': 'super-astro-luna',
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchJSON(url, timeout = 10000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) { clearTimeout(tid); throw e; }
}

async function fetchHTML(url, timeout = 14000) {
  const proxyUrl = PROXY + encodeURIComponent(url);
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(proxyUrl, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) { clearTimeout(tid); throw e; }
}

// ── SOURCE 1: api-resultadosloterias.com ─────────────────────────────────────

async function apiGetLotteryList() {
  const data = await fetchJSON(`${API1_BASE}/lotteries`);
  if (data.status !== 'success' || !Array.isArray(data.data)) throw new Error('Bad response');
  return data.data;
}

async function apiGetLastResult(slug) {
  const data = await fetchJSON(`${API1_BASE}/results/${slug}/last`);
  if (!data || data.status === 'error') throw new Error(`No result: ${slug}`);
  return normalizeApiResult(data.data || data, slug);
}

function normalizeApiResult(r, slug) {
  const cat = findInCatalog(slug) || findInCatalog(r.lottery_name || r.name || '');
  const type = cat ? cat.type : guessType(r.lottery_name || r.name || slug || '');
  let numbers = parseNumbers(r.numbers || r.number || r.resultado || r.numeros || '');
  if (type === 'loteria' && numbers.length === 1) numbers[0] = numbers[0].padStart(4, '0');
  return {
    id: cat?.id || slugToId(slug), apiSlug: slug,
    name: cat?.name || r.lottery_name || r.name || slug,
    shortName: cat?.shortName || r.lottery_name || slug,
    type, emoji: cat?.emoji || typeEmoji(type),
    date: parseDate(r.date || r.fecha || r.draw_date || ''),
    numbers, serie: r.serie || r.series || null,
    fraccion: r.fraccion || r.fraction || null,
    prize: r.prize || r.premio || null,
    jackpot: r.jackpot || r.acumulado || null,
    superball: r.superball || r.superbalota || null,
    sorteo: r.draw_number || r.sorteo || r.concurso || null,
    sign: r.sign || r.signo || null,
    source: 'api-resultadosloterias.com',
    official: cat?.official || 'https://www.coljuegos.gov.co',
    hasResult: numbers.length > 0,
  };
}

// ── SOURCE 2: loteriaya.com.co — resultado por fecha exacta ──────────────────

async function lyGetResultByDate(cat, dateISO) {
  const slug = LY_SLUGS[cat.id];
  if (!slug) throw new Error('No LY slug for ' + cat.id);
  const url = `${LY_BASE}/loteria/${slug}/resultado/${dateISO}`;
  const html = await fetchHTML(url);
  return parseLyResultHtml(html, cat, dateISO);
}

function parseLyResultHtml(html, cat, dateISO) {
  if (!html || html.length < 200) return null;
  // loteriaya result page pattern:
  // "El número ganador ... fue XXXX, serie YYY"
  // <span class="number">XXXX</span>
  const numPats = [
    /(?:fue|ganador)[^0-9]*(\d{4})/i,
    /<span[^>]*class="[^"]*number[^"]*"[^>]*>\s*(\d{1,5})\s*<\/span>/i,
    /n[uú]mero\s+ganador[^0-9]*(\d{4})/i,
    /"winning_number"\s*:\s*"?(\d{4})"?/i,
    /resultado[^0-9]*(\d{4})/i,
  ];
  let number = null;
  for (const pat of numPats) {
    const m = html.match(pat);
    if (m) { number = m[1].padStart(4, '0'); break; }
  }
  if (!number) return null;

  const serie = (html.match(/serie[^0-9]*(\d{1,5})/i) || html.match(/series?\s+(\d{1,5})/i))?.[1] || null;
  const sorteo = (html.match(/sorteo[^0-9]*(\d+)/i) || html.match(/nro\.\s*(\d+)/i))?.[1] || null;
  const prize = extractPrize(html);

  return buildResultObj(cat, [number], serie, sorteo, dateISO, prize, 'loteriaya.com.co');
}

// ── SOURCE 2b: loteriaya.com.co — historial (últimos sorteos) ────────────────

/**
 * Obtiene los últimos N sorteos de una lotería desde loteriaya.com.co/historial
 * Returns: [ { date, numbers, serie, sorteo, prize } ]
 */
async function lyGetHistory(cat, limit = 15) {
  const slug = LY_SLUGS[cat.id];
  if (!slug) throw new Error('No LY slug for ' + cat.id);
  const url = `${LY_BASE}/loteria/${slug}/historial`;
  const html = await fetchHTML(url, 16000);
  return parseLyHistoryHtml(html, cat, limit);
}

function parseLyHistoryHtml(html, cat, limit) {
  if (!html || html.length < 200) return [];
  const results = [];

  // loteriaya historial renders a table or list of past draws
  // Each row: date | number | serie | sorteo#
  // Pattern 1: table rows  <tr>...<td>date</td><td>number</td><td>serie</td>...
  // Pattern 2: list items with data
  
  // Try extracting all ISO dates + numbers together
  // The page has entries like "2026-11-06" and nearby "5609" and "serie 266"
  const rowPattern = /(\d{4}-\d{2}-\d{2})[^]*?(\d{4})[^]*?(?:serie[^0-9]*(\d{1,5}))?/gi;
  
  // Better: split by table rows or list items
  const sections = html.split(/<tr[^>]*>|<li[^>]*class="[^"]*(?:draw|result|sorteo|item)[^"]*"[^>]*>/i);
  
  for (const sec of sections.slice(1, limit * 3)) {
    const dateM = sec.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateM) continue;
    const date = dateM[1];
    
    // number: 4-digit in that section
    const numM = sec.match(/>(\d{4})</) || sec.match(/(?:ganador|número)[^0-9]*(\d{4})/i) || sec.match(/>\s*(\d{4})\s*</);
    if (!numM) continue;
    const number = numM[1].padStart(4, '0');
    
    const serie = (sec.match(/serie[^0-9]*(\d{1,5})/i))?.[1] || null;
    const sorteo = (sec.match(/(?:sorteo|nro\.)[^0-9]*(\d+)/i))?.[1] || null;
    const prize = extractPrize(sec);
    
    results.push(buildResultObj(cat, [number], serie, sorteo, date, prize, 'loteriaya.com.co'));
    if (results.length >= limit) break;
  }

  // Fallback: regex scan of full page for date+number pairs
  if (results.length === 0) {
    const allDates = [...html.matchAll(/(\d{4}-\d{2}-\d{2})/g)].map(m => m[1]);
    const unique = [...new Set(allDates)].sort().reverse().slice(0, limit);
    for (const date of unique) {
      // find number near this date
      const idx = html.indexOf(date);
      if (idx < 0) continue;
      const slice = html.slice(Math.max(0, idx - 50), idx + 300);
      const nm = slice.match(/>(\d{4})</) || slice.match(/(\d{4})/);
      if (!nm) continue;
      results.push(buildResultObj(cat, [nm[1].padStart(4,'0')], null, null, date, null, 'loteriaya.com.co'));
    }
  }

  return results.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ── SOURCE 3: resultadodelaloteria.com — fallback ────────────────────────────

async function rdlGetResult(cat) {
  const url = `${RDL_BASE}/${cat.rdlSlug}`;
  const html = await fetchHTML(url, 14000);
  return parseRdlHtml(html, cat);
}

function parseRdlHtml(html, cat) {
  if (!html || html.length < 100) return null;
  const pats = [
    /n[úu]mero\s+ganador[^:]*[:]\s*([\d\s]+)/i,
    /resultado[^:]*[:]\s*([\d\s\-]+)/i,
    /<strong[^>]*>\s*(\d{4})\s*<\/strong>/,
    /(?:fue|sorteo\s+\d+[^<]*)(\d{4})\s+con/i,
    />\s*(\d{4})\s*</,
  ];
  for (const pat of pats) {
    const m = html.match(pat);
    if (m) {
      const nums = m[1].trim().split(/[\s,\-]+/).filter(n => /^\d+$/.test(n) && n.length <= 4);
      if (nums.length > 0) {
        return buildResultObj(cat, nums.map(n => n.padStart(4,'0')),
          extractField(html, 'serie'),
          extractField(html, 'sorteo'),
          extractDate(html), null, 'resultadodelaloteria.com');
      }
    }
  }
  return null;
}

// ── HISTORIAL: función principal pública ─────────────────────────────────────

/**
 * Obtiene el historial de sorteos de una lotería (últimas ~3 semanas).
 * Retorna array ordenado de más reciente a más antiguo.
 */
async function fetchHistory(cat) {
  // Para loterías con slug en LY
  const lySlug = LY_SLUGS[cat.id];
  if (lySlug) {
    try {
      const history = await lyGetHistory(cat, 21);
      if (history.length > 0) return history;
    } catch (e) {
      console.warn('[LY] history failed:', e.message);
    }
  }

  // Fallback: construir fechas esperadas según día de sorteo y pedir una por una
  return await fetchHistoryByDates(cat);
}

/**
 * Fallback: genera las fechas de sorteo de las últimas 3 semanas
 * y pide el resultado de cada una.
 */
async function fetchHistoryByDates(cat) {
  const drawDays = cat.day; // e.g. [5] para viernes
  const dates = getDrawDatesLastNWeeks(drawDays, 3);
  const results = [];

  const fetches = dates.map(async (d) => {
    // Intentar API primero
    try {
      const r = await lyGetResultByDate(cat, d);
      if (r) return r;
    } catch (_) {}
    // Intentar api-resultadosloterias por fecha si existe ese endpoint
    try {
      const data = await fetchJSON(`${API1_BASE}/results/${cat.apiSlug}/${d}`);
      if (data && (data.data || data.number || data.numbers)) {
        return normalizeApiResult(data.data || data, cat.apiSlug);
      }
    } catch (_) {}
    return null;
  });

  const resolved = await Promise.allSettled(fetches);
  for (const r of resolved) {
    if (r.status === 'fulfilled' && r.value) results.push(r.value);
  }
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Genera las fechas (ISO) de los N días de sorteo más recientes.
 * drawDays: array de días de la semana (0=dom...6=sáb)
 * weeks: cuántas semanas hacia atrás mirar
 */
function getDrawDatesLastNWeeks(drawDays, weeks) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (drawDays.includes(d.getDay())) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}

// ── Resultado por fecha específica (búsqueda avanzada) ───────────────────────

/**
 * Busca el resultado de una lotería en una fecha concreta.
 * Usado cuando el usuario escribe "medellín 13 de noviembre".
 */
async function fetchResultByDate(cat, dateISO) {
  // 1) loteriaya por fecha
  try {
    const r = await lyGetResultByDate(cat, dateISO);
    if (r) return r;
  } catch (_) {}

  // 2) api por fecha
  try {
    const data = await fetchJSON(`${API1_BASE}/results/${cat.apiSlug}/${dateISO}`);
    if (data && (data.data || data.number)) return normalizeApiResult(data.data || data, cat.apiSlug);
  } catch (_) {}

  // 3) resultadodelaloteria.com por URL con fecha en español
  try {
    const [y,m,d] = dateISO.split('-').map(Number);
    const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dayNames = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const date = new Date(y, m-1, d);
    const dayName = dayNames[date.getDay()];
    const monthName = monthNames[m-1];
    // URL pattern: /colombia/loteria-de-medellin-del-30-de-octubre-de-2026-sorteo-4859
    // We can't guess the sorteo number, so try the main page and check if it matches
    const r = await rdlGetResult(cat);
    if (r && r.date === dateISO) return r;
  } catch (_) {}

  return null;
}

// ── Main: cargar todos los resultados del día ─────────────────────────────────

async function fetchAllResults(onProgress) {
  let apiSlugs = [];
  let apiAvailable = true;

  try {
    onProgress('Conectando con la fuente oficial...', '');
    const lotteries = await apiGetLotteryList();
    apiSlugs = lotteries.map(l => ({ slug: l.slug, name: l.name }));
    onProgress(`${apiSlugs.length} loterías disponibles`, 'Obteniendo resultados...');
  } catch (e) {
    console.warn('[API1] lotteries list failed:', e.message);
    apiAvailable = false;
    apiSlugs = CATALOG.map(c => ({ slug: c.apiSlug, name: c.name }));
    onProgress('Usando fuente alternativa...', '');
  }

  const results = [];
  const BATCH = 6;

  for (let i = 0; i < apiSlugs.length; i += BATCH) {
    const batch = apiSlugs.slice(i, i + BATCH);
    onProgress(
      `Cargando resultados... (${Math.min(i + BATCH, apiSlugs.length)}/${apiSlugs.length})`,
      batch.map(b => b.name).join(', ')
    );

    const settled = await Promise.allSettled(batch.map(async ({ slug, name }) => {
      if (apiAvailable) {
        try { return await apiGetLastResult(slug); } catch (_) {}
      }
      const cat = findInCatalog(slug) || findInCatalog(name);
      if (cat) {
        try { const r = await rdlGetResult(cat); if (r) return r; } catch (_) {}
        return buildScheduleCard(cat);
      }
      return null;
    }));

    settled.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        results.push(res.value);
      } else {
        const { slug, name } = batch[idx];
        const cat = findInCatalog(slug) || findInCatalog(name);
        if (cat) results.push(buildScheduleCard(cat));
      }
    });

    if (i + BATCH < apiSlugs.length) await sleep(250);
  }

  // Agregar loterías del catálogo que hoy juegan pero no vinieron de la API
  const idsInResults = new Set(results.map(r => r.id));
  for (const cat of getTodayCatalog()) {
    if (!idsInResults.has(cat.id)) results.push(buildScheduleCard(cat));
  }

  const withResults = results.filter(r => r.hasResult).length;
  return { results, withResults, total: results.length, apiAvailable, source: apiAvailable ? 'api-resultadosloterias.com' : 'fuente alternativa' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildResultObj(cat, numbers, serie, sorteo, date, prize, source) {
  return {
    id: cat.id, apiSlug: cat.apiSlug,
    name: cat.name, shortName: cat.shortName,
    type: cat.type, emoji: cat.emoji,
    date: date || todayISO(),
    numbers: cat.type === 'loteria' ? numbers.map(n => n.padStart(4,'0')) : numbers,
    serie, fraccion: null, prize: prize || null, jackpot: null,
    superball: null, sorteo, sign: null, source,
    official: cat.official || 'https://www.coljuegos.gov.co',
    hasResult: numbers.length > 0,
  };
}

function buildScheduleCard(cat) {
  return {
    id: cat.id, apiSlug: cat.apiSlug,
    name: cat.name, shortName: cat.shortName,
    type: cat.type, emoji: cat.emoji,
    date: todayISO(), numbers: [],
    serie: null, fraccion: null, prize: null, jackpot: null,
    superball: null, sorteo: null, sign: null,
    source: 'schedule', official: cat.official || 'https://www.coljuegos.gov.co',
    hasResult: false, pending: true, hour: cat.hour, entity: cat.entity,
  };
}

function extractPrize(html) {
  const m = html.match(/(?:premio|award)[^$]*\$[\s]*([\d\.,]+)/i) ||
            html.match(/\$([\d\.]+)\s*(?:mil millones|millones)/i);
  return m ? m[0].replace(/<[^>]+>/g,'').trim() : null;
}

function extractField(html, field) {
  const m = html.match(new RegExp(`${field}[^0-9]*([0-9]+)`, 'i'));
  return m ? m[1] : null;
}

function extractDate(html) {
  const iso = html.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const months = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const sp = html.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (sp) {
    const mon = months[sp[2].toLowerCase()];
    if (mon) return `${sp[3]}-${String(mon).padStart(2,'0')}-${sp[1].padStart(2,'0')}`;
  }
  return todayISO();
}

function parseNumbers(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'number') return [String(raw)];
  if (typeof raw === 'string' && raw.trim())
    return raw.split(/[\s,\-\.]+/).map(n => n.trim()).filter(n => /^\d+$/.test(n));
  return [];
}

function guessType(name) {
  const n = name.toLowerCase();
  if (n.includes('baloto') || n.includes('miloto') || n.includes('revancha')) return 'baloto';
  if (n.includes('chance') || n.includes('astro') || n.includes('pata') ||
      n.includes('pijao') || n.includes('cafetero') || n.includes('costeño') ||
      n.includes('costeno') || n.includes('mano') || n.includes('caribe') ||
      n.includes('cash') || n.includes('paisita') || n.includes('suertudo') ||
      n.includes('motilon') || n.includes('antioquenita')) return 'chance';
  return 'loteria';
}

function typeEmoji(type) {
  return { loteria: '🎟️', chance: '🎲', baloto: '🎱' }[type] || '🎲';
}

function slugToId(slug) { return slug.replace(/-+/g, '_'); }
function sleep(ms)      { return new Promise(r => setTimeout(r, ms)); }
function todayISO()     { return new Date().toISOString().slice(0, 10); }

function parseDate(d) {
  if (!d) return todayISO();
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const m = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }
  return todayISO();
}
