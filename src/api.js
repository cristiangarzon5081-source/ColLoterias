/**
 * api.js — Datos reales de loterías colombianas
 *
 * Fuentes por prioridad:
 *  1) api-resultadosloterias.com  → último resultado + historial por fechas
 *  2) loteriaya.com.co            → historial + resultado por fecha (via proxy)
 *  3) resultadodelaloteria.com    → fallback resultado actual
 *  4) Horario programado          → si todo falla
 *
 * Bug fixes vs versión anterior:
 *  - Deduplicación por apiSlug antes de procesar → sin repetidos
 *  - fetchAllResults usa SOLO slugs de la API, sin mezclar catálogo al final
 *  - Historial usa fecha a fecha con múltiples fuentes en paralelo
 *  - parseLyResultHtml más tolerante al HTML real
 */

const API1   = 'https://api-resultadosloterias.com/api';
const PROXY  = 'https://corsproxy.io/?url=';
const LY     = 'https://www.loteriaya.com.co';
const RDL    = 'https://resultadodelaloteria.com/colombia';

// Slugs de loteriaya.com.co para historial/fecha
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

// ── Fetch ─────────────────────────────────────────────────────────────────────

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

async function fetchHTML(url, ms = 14000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(PROXY + encodeURIComponent(url), { signal: c.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) { clearTimeout(t); throw e; }
}

// ── SOURCE 1: api-resultadosloterias.com ─────────────────────────────────────

async function apiListLotteries() {
  const d = await fetchJSON(`${API1}/lotteries`);
  if (d.status !== 'success' || !Array.isArray(d.data)) throw new Error('Bad /lotteries');
  return d.data; // [{name, slug}]
}

async function apiLastResult(slug) {
  const d = await fetchJSON(`${API1}/results/${slug}/last`);
  if (!d || d.status === 'error') throw new Error(`No data: ${slug}`);
  return normalizeAPI(d.data || d, slug);
}

async function apiResultByDate(slug, dateISO) {
  const d = await fetchJSON(`${API1}/results/${slug}/${dateISO}`);
  if (!d || d.status === 'error') throw new Error(`No data: ${slug} ${dateISO}`);
  return normalizeAPI(d.data || d, slug);
}

function normalizeAPI(r, slug) {
  const cat = findInCatalog(slug) || findInCatalog(r.lottery_name || r.name || '');
  const type = cat ? cat.type : guessType(r.lottery_name || r.name || slug);
  let nums = parseNums(r.numbers || r.number || r.resultado || r.numeros || '');
  if (type === 'loteria' && nums.length === 1) nums[0] = nums[0].padStart(4, '0');
  return mkResult({
    id: cat?.id || slug2id(slug), slug,
    name: cat?.name || r.lottery_name || r.name || slug,
    short: cat?.shortName || r.name || slug,
    type, emoji: cat?.emoji || typeEmoji(type),
    date: parseISO(r.date || r.fecha || r.draw_date || ''),
    nums, serie: r.serie || r.series || null,
    fraccion: r.fraccion || null, prize: r.prize || r.premio || null,
    jackpot: r.jackpot || r.acumulado || null,
    superball: r.superball || null,
    sorteo: r.draw_number || r.sorteo || r.concurso || null,
    sign: r.sign || r.signo || null,
    source: 'api-resultadosloterias.com',
    official: cat?.official || 'https://www.coljuegos.gov.co',
    entity: cat?.entity || null,
  });
}

// ── SOURCE 2: loteriaya.com.co ────────────────────────────────────────────────

async function lyResultByDate(cat, dateISO) {
  const slug = LY_SLUG[cat.id];
  if (!slug) throw new Error('No LY slug: ' + cat.id);
  const html = await fetchHTML(`${LY}/loteria/${slug}/resultado/${dateISO}`);
  return parseLY(html, cat, dateISO);
}

function parseLY(html, cat, dateISO) {
  if (!html || html.length < 100) return null;

  // loteriaya.com.co renders "ganador de la Lotería de Bogotá ... fue XXXX, serie YYY"
  // Also: <span class="winning-number">XXXX</span>  or  data-number="XXXX"
  const pats = [
    /(?:fue el|fue)\s+(\d{4})\b/i,
    /(?:ganador|winning)[^0-9]{0,40}(\d{4})\b/i,
    /class="[^"]*(?:number|numero|winning)[^"]*"[^>]*>\s*(\d{4})\s*</i,
    /data-number="(\d{4})"/i,
    /"winning_number"\s*:\s*"(\d{4})"/i,
    // número + serie en el mismo texto
    /(\d{4}),?\s+serie\s+\d/i,
    // cualquier número 4 dígitos destacado entre etiquetas
    />\s*(\d{4})\s*</,
  ];

  let number = null;
  for (const p of pats) {
    const m = html.match(p);
    if (m) {
      // Verificar que sea un número plausible de lotería (0001–9999)
      const n = parseInt(m[1]);
      if (n >= 0 && n <= 9999) { number = String(n).padStart(4, '0'); break; }
    }
  }
  if (!number) return null;

  const serie   = html.match(/serie[^0-9]{0,10}(\d{1,5})/i)?.[1] ?? null;
  const sorteo  = html.match(/sorteo[^0-9]{0,10}(\d+)/i)?.[1]   ?? null;
  const prize   = extractPrize(html);

  return mkResult({ id: cat.id, slug: cat.apiSlug, name: cat.name, short: cat.shortName,
    type: cat.type, emoji: cat.emoji, date: dateISO,
    nums: [number], serie, fraccion: null, prize, jackpot: null, superball: null, sorteo,
    sign: null, source: 'loteriaya.com.co', official: cat.official || 'https://www.coljuegos.gov.co',
    entity: cat.entity });
}

// ── SOURCE 3: resultadodelaloteria.com ───────────────────────────────────────

async function rdlLastResult(cat) {
  const html = await fetchHTML(`${RDL}/${cat.rdlSlug}`);
  return parseRDL(html, cat);
}

function parseRDL(html, cat) {
  if (!html || html.length < 100) return null;
  // "El número ganador de Lotería de Medellín ... fue 2168 con la serie 056"
  const pats = [
    /(?:fue|ganador)[^0-9]{0,40}(\d{4})\b/i,
    /<strong[^>]*>(\d{4})<\/strong>/i,
    />\s*(\d{4})\s*</,
  ];
  for (const p of pats) {
    const m = html.match(p);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= 0 && n <= 9999) {
        return mkResult({ id: cat.id, slug: cat.apiSlug, name: cat.name, short: cat.shortName,
          type: cat.type, emoji: cat.emoji, date: extractDate(html),
          nums: [String(n).padStart(4,'0')],
          serie: html.match(/serie[^0-9]{0,10}(\d{1,5})/i)?.[1] ?? null,
          fraccion: null, prize: null, jackpot: null, superball: null,
          sorteo: html.match(/sorteo[^0-9]{0,10}(\d+)/i)?.[1] ?? null,
          sign: null, source: 'resultadodelaloteria.com',
          official: cat.official || 'https://www.coljuegos.gov.co', entity: cat.entity });
      }
    }
  }
  return null;
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────

/**
 * Devuelve array con los últimos 15 sorteos de una lotería.
 * Estrategia: genera las fechas esperadas según día(s) de sorteo y pide cada una.
 * Para chances (todos los días) limita a los últimos 15 días.
 */
async function fetchHistory(cat) {
  const isDaily = cat.day.length >= 6; // chance diario
  const weeks   = isDaily ? 0 : 3;     // loterías: 3 semanas atrás; chances: 15 días
  const limit   = 15;

  let dates;
  if (isDaily) {
    // Últimos 15 días
    dates = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 15; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      dates.push(d.toISOString().slice(0,10));
    }
  } else {
    dates = drawDatesBack(cat.day, 5); // 5 semanas para tener ~5 sorteos
  }

  // Pedir todas las fechas en paralelo (máximo 8 simultáneas)
  const BATCH = 8;
  const results = [];
  for (let i = 0; i < dates.length && results.length < limit; i += BATCH) {
    const batch = dates.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(d => fetchOneDateResult(cat, d)));
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) results.push(s.value);
    }
  }

  return results.sort((a,b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** Busca resultado de una lotería en una fecha concreta — intenta todas las fuentes */
async function fetchOneDateResult(cat, dateISO) {
  // 1. API primaria con endpoint /date
  try {
    const r = await apiResultByDate(cat.apiSlug, dateISO);
    if (r?.hasResult) return r;
  } catch (_) {}

  // 2. loteriaya por fecha (solo loterías tradicionales y baloto, no chances)
  if (cat.type !== 'chance' && LY_SLUG[cat.id]) {
    try {
      const r = await lyResultByDate(cat, dateISO);
      if (r?.hasResult) return r;
    } catch (_) {}
  }

  return null; // sin resultado para esa fecha → se omite del historial
}

// ── CARGA PRINCIPAL del día ───────────────────────────────────────────────────

async function fetchAllResults(onProgress) {
  // ── Paso 1: obtener lista de slugs de la API ──────────────────────────────
  let apiSlugs = [];
  let apiOk    = true;

  try {
    onProgress('Conectando con la fuente oficial...', '');
    const list = await apiListLotteries();

    // DEDUPLICAR por slug (la API a veces repite entradas)
    const seen = new Set();
    apiSlugs = list.filter(l => {
      if (seen.has(l.slug)) return false;
      seen.add(l.slug);
      return true;
    });

    onProgress(`${apiSlugs.length} loterías en la API`, 'Obteniendo resultados...');
  } catch (e) {
    console.warn('[API] list failed:', e.message);
    apiOk = false;
    // Usar catálogo propio como fallback
    apiSlugs = CATALOG.map(c => ({ slug: c.apiSlug, name: c.name }));
    onProgress('⚠️ API no disponible — usando fuente alternativa', '');
  }

  // ── Paso 2: pedir resultados en lotes ────────────────────────────────────
  const raw     = [];   // resultados tal como llegan
  const BATCH   = 5;

  for (let i = 0; i < apiSlugs.length; i += BATCH) {
    const batch = apiSlugs.slice(i, i + BATCH);
    onProgress(
      `Cargando resultados... ${Math.min(i + BATCH, apiSlugs.length)}/${apiSlugs.length}`,
      batch.map(b => b.name).join(', ')
    );

    const settled = await Promise.allSettled(batch.map(async ({ slug, name }) => {
      // Intento 1: API
      if (apiOk) {
        try { return await apiLastResult(slug); } catch (_) {}
      }
      // Intento 2: fuente alternativa RDL
      const cat = findInCatalog(slug) || findInCatalog(name);
      if (cat) {
        try { const r = await rdlLastResult(cat); if (r) return r; } catch (_) {}
        return scheduleCard(cat);
      }
      return null;
    }));

    settled.forEach((s, idx) => {
      if (s.status === 'fulfilled' && s.value) raw.push(s.value);
      else {
        const cat = findInCatalog(batch[idx].slug) || findInCatalog(batch[idx].name);
        if (cat) raw.push(scheduleCard(cat));
      }
    });

    if (i + BATCH < apiSlugs.length) await sleep(200);
  }

  // ── Paso 3: deduplicar por id (mantener el que tiene resultado) ───────────
  const byId = new Map();
  for (const r of raw) {
    if (!r?.id) continue;
    const existing = byId.get(r.id);
    if (!existing || (!existing.hasResult && r.hasResult)) {
      byId.set(r.id, r);
    }
  }
  const results = [...byId.values()];

  // ── Paso 4: añadir loterías del catálogo que HOY juegan y no aparecieron ──
  const today   = new Date();
  const todayDOW = today.getDay();
  const idsGot  = new Set(results.map(r => r.id));

  for (const cat of CATALOG) {
    if (!cat.day.includes(todayDOW)) continue; // no juega hoy
    if (!idsGot.has(cat.id)) results.push(scheduleCard(cat));
  }

  const withResults = results.filter(r => r.hasResult).length;
  return {
    results,
    withResults,
    total: results.length,
    apiOk,
    source: apiOk ? 'api-resultadosloterias.com' : 'resultadodelaloteria.com',
  };
}

// ── Resultado por fecha específica (búsqueda "Medellín 13 de noviembre") ─────

async function fetchResultByDate(cat, dateISO) {
  const r = await fetchOneDateResult(cat, dateISO);
  if (r) return r;

  // Último intento: RDL y verificar si la fecha coincide
  try {
    const rr = await rdlLastResult(cat);
    if (rr?.date === dateISO) return rr;
  } catch (_) {}

  return null;
}

// ── Helpers de construcción ───────────────────────────────────────────────────

function mkResult({ id, slug, name, short, type, emoji, date, nums,
                    serie, fraccion, prize, jackpot, superball, sorteo,
                    sign, source, official, entity }) {
  return {
    id, apiSlug: slug, name, shortName: short, type, emoji,
    date: date || todayISO(),
    numbers: nums || [],
    serie, fraccion, prize, jackpot, superball, sorteo, sign,
    source, official,
    entity: entity || null,
    hasResult: (nums || []).length > 0,
  };
}

function scheduleCard(cat) {
  return mkResult({
    id: cat.id, slug: cat.apiSlug, name: cat.name, short: cat.shortName,
    type: cat.type, emoji: cat.emoji, date: todayISO(),
    nums: [], serie: null, fraccion: null, prize: null, jackpot: null,
    superball: null, sorteo: null, sign: null,
    source: 'schedule', official: cat.official || 'https://www.coljuegos.gov.co',
    entity: cat.entity,
  });
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function drawDatesBack(days, weeks) {
  const list = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i <= weeks * 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (days.includes(d.getDay())) list.push(d.toISOString().slice(0,10));
  }
  return list;
}

function extractPrize(html) {
  const m = html.match(/\$\s*([\d\.,]+)\s*(?:mil\s*millones|millones)/i);
  if (m) return `$${m[1]} ${html.match(/mil\s*millones/i) ? 'mil millones' : 'millones'}`;
  return null;
}

function extractDate(html) {
  const iso = html.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const MO = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const sp = html.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (sp) { const m = MO[sp[2].toLowerCase()]; if (m) return `${sp[3]}-${String(m).padStart(2,'0')}-${sp[1].padStart(2,'0')}`; }
  return todayISO();
}

function parseNums(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'number') return [String(raw)];
  if (typeof raw === 'string' && raw.trim())
    return raw.split(/[\s,\-\.]+/).map(n => n.trim()).filter(n => /^\d+$/.test(n));
  return [];
}

function guessType(s) {
  const n = s.toLowerCase();
  if (/baloto|miloto|revancha/.test(n)) return 'baloto';
  if (/chance|astro|pata|pijao|cafetero|coste[ñn]o|mano|caribe|cash|paisita|suertudo|motilon|antioquenita/.test(n)) return 'chance';
  return 'loteria';
}

function typeEmoji(t) { return { loteria:'🎟️', chance:'🎲', baloto:'🎱' }[t] || '🎲'; }
function slug2id(s)   { return s.replace(/-+/g,'_'); }
function sleep(ms)    { return new Promise(r => setTimeout(r, ms)); }
function todayISO()   { return new Date().toISOString().slice(0,10); }

function parseISO(d) {
  if (!d) return todayISO();
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0,10);
  const m = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) { const y = m[3].length===2 ? '20'+m[3] : m[3]; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
  return todayISO();
}
