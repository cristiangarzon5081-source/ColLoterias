/**
 * api.js — Datos reales de loterías colombianas
 *
 * Para los resultados del día:
 *   api-resultadosloterias.com/api/lotteries  → slugs
 *   api-resultadosloterias.com/api/results/{slug}/last → último resultado
 *   resultadodelaloteria.com (via proxy) → fallback
 *
 * Para el historial:
 *   api-resultadosloterias.com/api/results/{slug}  → si devuelve lista
 *   resultadodelaloteria.com/{rdlSlug} (via proxies rotados) → scraping
 *   Genera fechas esperadas + pide una a una como último recurso
 */

const API1 = 'https://api-resultadosloterias.com/api';
const RDL  = 'https://resultadodelaloteria.com/colombia';
const LY   = 'https://www.loteriaya.com.co';

// Proxies CORS públicos — se rotan si uno falla
const PROXIES = [
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

// Slugs de loteriaya para historial/fecha exacta
const LY_SLUG = {
  bogota:'loteria-de-bogota', medellin:'loteria-de-medellin',
  cundinamarca:'loteria-de-cundinamarca', boyaca:'loteria-de-boyaca',
  huila:'loteria-del-huila', tolima:'loteria-del-tolima',
  manizales:'loteria-de-manizales', quindio:'loteria-del-quindio',
  risaralda:'loteria-de-risaralda', santander:'loteria-de-santander',
  cauca:'loteria-del-cauca', narino:'loteria-de-narino',
  putumayo:'loteria-del-putumayo', oriental:'loteria-oriental',
  pacifico:'loteria-del-pacifico', cordobesa:'loteria-cordobesa',
  sucre:'loteria-de-sucre', magdalena:'loteria-del-magdalena',
  cruzroja:'loteria-de-la-cruz-roja', extracolombia:'extra-de-colombia',
  meta:'loteria-del-meta', baloto:'baloto', revancha:'revancha', miloto:'miloto',
  'antioquenita-m':'antioquenita-manana','antioquenita-t':'antioquenita-tarde','antioquenita-n':'antioquenita-noche',
  'cafetero-m':'cafetero-manana','cafetero-t':'cafetero-tarde','cafetero-n':'cafetero-noche',
  'pijao-m':'pijao-de-oro-manana','pijao-t':'pijao-de-oro-tarde','pijao-n':'pijao-de-oro-noche',
  'pata-m':'la-pata-manana','pata-t':'la-pata-tarde','pata-n':'la-pata-noche',
  'costeño-m':'el-costeno-manana','costeño-t':'el-costeno-tarde','costeño-n':'el-costeno-noche',
  'mano-m':'la-mano-manana','mano-t':'la-mano-tarde','mano-n':'la-mano-noche',
  'caribe-m':'caribe-manana','caribe-t':'caribe-tarde','caribe-n':'caribe-noche',
  'cash3-m':'cash-three-manana','cash3-t':'cash-three-tarde','cash3-n':'cash-three-noche',
  'suertudo-m':'el-suertudo-manana','suertudo-t':'el-suertudo-tarde','suertudo-n':'el-suertudo-noche',
  'paisita-m':'paisita-manana','paisita-t':'paisita-tarde','paisita-n':'paisita-noche',
  'motilón-m':'el-motilon-manana','motilón-t':'el-motilon-tarde','motilón-n':'el-motilon-noche',
  'superastro-sol':'super-astro-sol','superastro-luna':'super-astro-luna',
};

// ── Fetch directo (para api-resultadosloterias.com que tiene CORS abierto) ────
async function fetchJSON(url, ms = 10000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) { clearTimeout(t); throw e; }
}

// ── Fetch con proxy rotado ────────────────────────────────────────────────────
async function fetchWithProxy(url, ms = 14000) {
  let lastErr = null;
  for (const makeProxy of PROXIES) {
    const proxyUrl = makeProxy(url);
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(proxyUrl, { signal: c.signal });
      clearTimeout(t);
      if (!r.ok) { lastErr = new Error(`HTTP ${r.status} via ${proxyUrl}`); continue; }
      const text = await r.text();
      // allorigins devuelve JSON wrapper
      if (proxyUrl.includes('allorigins')) {
        try { return JSON.parse(text).contents ?? text; } catch (_) {}
      }
      if (text && text.length > 100) return text;
      lastErr = new Error('Empty response from proxy');
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('All proxies failed for: ' + url);
}

// ── SOURCE 1: api-resultadosloterias.com ─────────────────────────────────────

async function apiListLotteries() {
  const d = await fetchJSON(`${API1}/lotteries`);
  if (d.status !== 'success' || !Array.isArray(d.data)) throw new Error('Bad /lotteries');
  return d.data;
}

async function apiLastResult(slug) {
  const d = await fetchJSON(`${API1}/results/${slug}/last`);
  if (!d || d.status === 'error') throw new Error(`No data: ${slug}`);
  return normAPI(d.data || d, slug);
}

/** Intenta obtener múltiples resultados del mismo slug (historial de la API) */
async function apiHistory(slug) {
  // Intentar endpoint /results/{slug} sin /last — puede devolver array
  try {
    const d = await fetchJSON(`${API1}/results/${slug}`, 8000);
    if (Array.isArray(d)) return d.map(r => normAPI(r, slug)).filter(r => r.hasResult);
    if (d.data && Array.isArray(d.data)) return d.data.map(r => normAPI(r, slug)).filter(r => r.hasResult);
  } catch (_) {}
  return [];
}

function normAPI(r, slug) {
  const cat  = findInCatalog(slug) || findInCatalog(r.lottery_name || r.name || '');
  const type = cat ? cat.type : guessType(r.lottery_name || r.name || slug);
  let nums   = parseNums(r.numbers || r.number || r.resultado || r.numeros || '');
  if (type === 'loteria' && nums.length === 1) nums[0] = nums[0].padStart(4, '0');
  return mkResult({
    id: cat?.id || slug2id(slug), slug,
    name: cat?.name || r.lottery_name || r.name || slug,
    short: cat?.shortName || r.name || slug,
    type, emoji: cat?.emoji || typeEmoji(type),
    date: parseISO(r.date || r.fecha || r.draw_date || ''),
    nums, serie: r.serie || r.series || null,
    fraccion: r.fraccion || null,
    prize: r.prize || r.premio || null,
    jackpot: r.jackpot || r.acumulado || null,
    superball: r.superball || null,
    sorteo: r.draw_number || r.sorteo || r.concurso || null,
    sign: r.sign || r.signo || null,
    source: 'api-resultadosloterias.com',
    official: cat?.official || 'https://www.coljuegos.gov.co',
    entity: cat?.entity || null,
  });
}

// ── SOURCE 2: resultadodelaloteria.com ───────────────────────────────────────

/** Página principal de la lotería — extrae el último resultado */
async function rdlLastResult(cat) {
  const html = await fetchWithProxy(`${RDL}/${cat.rdlSlug}`);
  return parseRDL(html, cat);
}

/** Página de historial de resultadodelaloteria — extrae lista */
async function rdlHistory(cat, limit = 15) {
  // resultadodelaloteria.com tiene la misma página principal con el último sorteo
  // y links a sorteos anteriores como:
  // /colombia/loteria-de-medellin-del-30-de-octubre-de-2026-sorteo-4859
  const html = await fetchWithProxy(`${RDL}/${cat.rdlSlug}`);
  if (!html || html.length < 200) return [];

  const results = [];

  // Extraer el resultado principal de esta página
  const main = parseRDL(html, cat);
  if (main) results.push(main);

  // Extraer links a sorteos anteriores del HTML
  // Patrón de URL: /colombia/loteria-de-medellin-del-DD-de-MONTH-de-YYYY-sorteo-NNNN
  const linkRe = /href="\/colombia\/([\w-]+-del-\d{1,2}-de-\w+-de-\d{4}-sorteo-\d+)"/gi;
  const seen = new Set(results.map(r => r.sorteo));
  const links = [];
  let m;
  while ((m = linkRe.exec(html)) !== null && links.length < 20) {
    links.push(m[1]);
  }

  // Pedir los primeros N sorteos anteriores en paralelo
  const toFetch = links.slice(0, limit - 1);
  const settled = await Promise.allSettled(
    toFetch.map(async slug => {
      const html2 = await fetchWithProxy(`${RDL}/${slug}`, 12000);
      return parseRDL(html2, cat);
    })
  );
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value && !seen.has(s.value.sorteo)) {
      seen.add(s.value.sorteo);
      results.push(s.value);
    }
  }

  return results.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

function parseRDL(html, cat) {
  if (!html || html.length < 100) return null;
  // "El número ganador de Lotería de Medellín ... fue 5609 con la serie 266"
  const pats = [
    /(?:fue el|fue)\s+(\d{4})\b/i,
    /(?:ganador)[^0-9]{0,60}(\d{4})\b/i,
    /<strong[^>]*>(\d{4})<\/strong>/i,
    />\s*(\d{4})\s*</,
  ];
  let number = null;
  for (const p of pats) {
    const m = html.match(p);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= 0 && n <= 9999) { number = String(n).padStart(4,'0'); break; }
    }
  }
  if (!number) return null;
  return mkResult({
    id: cat.id, slug: cat.apiSlug, name: cat.name, short: cat.shortName,
    type: cat.type, emoji: cat.emoji,
    date: extractDate(html),
    nums: [number],
    serie:   html.match(/serie[^0-9]{0,15}(\d{1,5})/i)?.[1] ?? null,
    fraccion: null,
    prize:   extractPrize(html),
    jackpot: null, superball: null,
    sorteo:  html.match(/sorteo[^0-9]{0,10}(\d+)/i)?.[1] ?? null,
    sign: null,
    source: 'resultadodelaloteria.com',
    official: cat.official || 'https://www.coljuegos.gov.co',
    entity: cat.entity,
  });
}

// ── SOURCE 3: loteriaya.com.co — resultado por fecha exacta ──────────────────

async function lyByDate(cat, dateISO) {
  const slug = LY_SLUG[cat.id];
  if (!slug) return null;
  const html = await fetchWithProxy(`${LY}/loteria/${slug}/resultado/${dateISO}`, 12000);
  return parseLY(html, cat, dateISO);
}

function parseLY(html, cat, dateISO) {
  if (!html || html.length < 100) return null;
  const pats = [
    /(?:fue el|fue)\s+(\d{4})\b/i,
    /(?:ganador|winning)[^0-9]{0,40}(\d{4})\b/i,
    /class="[^"]*(?:number|numero|winning)[^"]*"[^>]*>\s*(\d{4})\s*</i,
    /data-number="(\d{4})"/i,
    /"winning_number"\s*:\s*"(\d{4})"/i,
    />\s*(\d{4})\s*</,
  ];
  let number = null;
  for (const p of pats) {
    const m = html.match(p);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= 0 && n <= 9999) { number = String(n).padStart(4,'0'); break; }
    }
  }
  if (!number) return null;
  return mkResult({
    id: cat.id, slug: cat.apiSlug, name: cat.name, short: cat.shortName,
    type: cat.type, emoji: cat.emoji, date: dateISO,
    nums: [number],
    serie:   html.match(/serie[^0-9]{0,15}(\d{1,5})/i)?.[1] ?? null,
    fraccion: null, prize: extractPrize(html), jackpot: null, superball: null,
    sorteo:  html.match(/sorteo[^0-9]{0,10}(\d+)/i)?.[1] ?? null,
    sign: null, source: 'loteriaya.com.co',
    official: cat.official || 'https://www.coljuegos.gov.co',
    entity: cat.entity,
  });
}

// ── HISTORIAL — función principal pública ─────────────────────────────────────

/**
 * Estrategia para obtener historial:
 * 1. API con endpoint /results/{slug} (si devuelve array)
 * 2. rdlHistory: página RDL + links a sorteos anteriores
 * 3. Por fechas: genera fechas esperadas y pide una a una
 */
async function fetchHistory(cat) {
  // 1. Intentar historial de la API
  try {
    const list = await apiHistory(cat.apiSlug);
    if (list.length >= 2) {
      return list.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 15);
    }
  } catch (_) {}

  // 2. Scraping de resultadodelaloteria.com
  if (cat.rdlSlug) {
    try {
      const list = await rdlHistory(cat, 15);
      if (list.length >= 2) return list;
    } catch (e) {
      console.warn('[RDL history]', e.message);
    }
  }

  // 3. Por fechas una a una
  return fetchHistoryByDates(cat);
}

async function fetchHistoryByDates(cat) {
  const isDaily = cat.day.length >= 6;
  const dates   = isDaily
    ? Array.from({length:15}, (_,i) => { const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10); })
    : drawDatesBack(cat.day, 5);

  const BATCH = 5;
  const results = [];
  for (let i = 0; i < dates.length && results.length < 15; i += BATCH) {
    const batch = dates.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(d => fetchOneDateResult(cat, d)));
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value?.hasResult) results.push(s.value);
    }
  }
  return results.sort((a,b) => b.date.localeCompare(a.date));
}

async function fetchOneDateResult(cat, dateISO) {
  // 1. API por fecha
  try {
    const d = await fetchJSON(`${API1}/results/${cat.apiSlug}/${dateISO}`, 7000);
    if (d && d.status !== 'error') {
      const r = normAPI(d.data || d, cat.apiSlug);
      if (r.hasResult) return r;
    }
  } catch (_) {}

  // 2. loteriaya por fecha (solo loterías y baloto)
  if (cat.type !== 'chance') {
    try {
      const r = await lyByDate(cat, dateISO);
      if (r?.hasResult) return r;
    } catch (_) {}
  }

  return null;
}

// ── Resultado por fecha específica (búsqueda "Medellín 13 de noviembre") ─────
async function fetchResultByDate(cat, dateISO) {
  const r = await fetchOneDateResult(cat, dateISO);
  if (r) return r;
  // Último recurso: último resultado de RDL y ver si coincide la fecha
  try {
    const rr = await rdlLastResult(cat);
    if (rr?.date === dateISO) return rr;
  } catch (_) {}
  return null;
}

// ── CARGA PRINCIPAL ───────────────────────────────────────────────────────────

async function fetchAllResults(onProgress) {
  let apiSlugs = [];
  let apiOk    = true;

  try {
    onProgress('Conectando con la fuente oficial...', '');
    const list = await apiListLotteries();
    const seen = new Set();
    apiSlugs = list.filter(l => { if (seen.has(l.slug)) return false; seen.add(l.slug); return true; });
    onProgress(`${apiSlugs.length} loterías disponibles`, 'Obteniendo resultados...');
  } catch (e) {
    console.warn('[API] list failed:', e.message);
    apiOk    = false;
    apiSlugs = CATALOG.map(c => ({ slug: c.apiSlug, name: c.name }));
    onProgress('⚠️ Usando fuente alternativa...', '');
  }

  const raw   = [];
  const BATCH = 5;

  for (let i = 0; i < apiSlugs.length; i += BATCH) {
    const batch = apiSlugs.slice(i, i + BATCH);
    onProgress(`Cargando... ${Math.min(i+BATCH, apiSlugs.length)}/${apiSlugs.length}`, batch.map(b=>b.name).join(', '));

    const settled = await Promise.allSettled(batch.map(async ({ slug, name }) => {
      if (apiOk) { try { return await apiLastResult(slug); } catch (_) {} }
      const cat = findInCatalog(slug) || findInCatalog(name);
      if (cat) { try { const r = await rdlLastResult(cat); if (r) return r; } catch (_) {} return scheduleCard(cat); }
      return null;
    }));

    settled.forEach((s, idx) => {
      if (s.status === 'fulfilled' && s.value) raw.push(s.value);
      else { const cat = findInCatalog(batch[idx].slug)||findInCatalog(batch[idx].name); if(cat) raw.push(scheduleCard(cat)); }
    });

    if (i + BATCH < apiSlugs.length) await sleep(200);
  }

  // Deduplicar por id
  const byId = new Map();
  for (const r of raw) {
    if (!r?.id) continue;
    const ex = byId.get(r.id);
    if (!ex || (!ex.hasResult && r.hasResult)) byId.set(r.id, r);
  }
  const results = [...byId.values()];

  // Añadir loterías de hoy que no aparecieron
  const todayDOW = new Date().getDay();
  const got = new Set(results.map(r => r.id));
  for (const cat of CATALOG) {
    if (cat.day.includes(todayDOW) && !got.has(cat.id)) results.push(scheduleCard(cat));
  }

  const withResults = results.filter(r => r.hasResult).length;
  return { results, withResults, total: results.length, apiOk, source: apiOk ? 'api-resultadosloterias.com' : 'resultadodelaloteria.com' };
}

// ── Helpers de construcción ───────────────────────────────────────────────────

function mkResult({ id, slug, name, short, type, emoji, date, nums,
                    serie, fraccion, prize, jackpot, superball, sorteo,
                    sign, source, official, entity }) {
  return { id, apiSlug: slug, name, shortName: short, type, emoji,
    date: date || todayISO(), numbers: nums||[], serie, fraccion, prize,
    jackpot, superball, sorteo, sign, source, official, entity: entity||null,
    hasResult: (nums||[]).length > 0 };
}

function scheduleCard(cat) {
  return mkResult({ id: cat.id, slug: cat.apiSlug, name: cat.name, short: cat.shortName,
    type: cat.type, emoji: cat.emoji, date: todayISO(), nums: [],
    serie:null, fraccion:null, prize:null, jackpot:null, superball:null, sorteo:null, sign:null,
    source:'schedule', official: cat.official||'https://www.coljuegos.gov.co', entity: cat.entity });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function drawDatesBack(days, weeks) {
  const list = []; const today = new Date(); today.setHours(0,0,0,0);
  for (let i=0; i<=weeks*7; i++) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    if (days.includes(d.getDay())) list.push(d.toISOString().slice(0,10));
  }
  return list;
}

function extractPrize(html) {
  const m = html.match(/\$\s*([\d\.,]+)\s*(mil\s*millones|millones)/i);
  return m ? `$${m[1]} ${m[2]}` : null;
}

function extractDate(html) {
  const iso = html.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const MO={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const sp = html.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (sp) { const mo=MO[sp[2].toLowerCase()]; if(mo) return `${sp[3]}-${String(mo).padStart(2,'0')}-${sp[1].padStart(2,'0')}`; }
  return todayISO();
}

function parseNums(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'number') return [String(raw)];
  if (typeof raw === 'string' && raw.trim())
    return raw.split(/[\s,\-\.]+/).map(n=>n.trim()).filter(n=>/^\d+$/.test(n));
  return [];
}

function guessType(s) {
  const n = s.toLowerCase();
  if (/baloto|miloto|revancha/.test(n)) return 'baloto';
  if (/chance|astro|pata|pijao|cafetero|coste[ñn]o|mano|caribe|cash|paisita|suertudo|motilon|antioquenita/.test(n)) return 'chance';
  return 'loteria';
}

function typeEmoji(t) { return {loteria:'🎟️',chance:'🎲',baloto:'🎱'}[t]||'🎲'; }
function slug2id(s)   { return s.replace(/-+/g,'_'); }
function sleep(ms)    { return new Promise(r=>setTimeout(r,ms)); }
function todayISO()   { return new Date().toISOString().slice(0,10); }
function parseISO(d) {
  if (!d) return todayISO();
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0,10);
  const m = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) { const y=m[3].length===2?'20'+m[3]:m[3]; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
  return todayISO();
}
