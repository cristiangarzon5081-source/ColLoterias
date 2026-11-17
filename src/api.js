/**
 * api.js — Capa de datos con resultados REALES
 *
 * Estrategia de 3 niveles:
 *
 * 1) api-resultadosloterias.com  — API colombiana pública con CORS abierto
 *    GET /api/lotteries          → lista todas las loterías y sus slugs
 *    GET /api/results/{slug}/last → último resultado de una lotería
 *
 * 2) resultadodelaloteria.com    — Sitio con resultados actualizados
 *    Se accede vía corsproxy.io (proxy gratuito) cuando la API falla
 *
 * 3) Horario programado          — Muestra las loterías del día con hora
 *    si ninguna fuente responde
 */

const API1_BASE   = 'https://api-resultadosloterias.com/api';
const CORS_PROXY  = 'https://corsproxy.io/?url=';
const RDL_BASE    = 'https://resultadodelaloteria.com/colombia';

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJSON(url, timeout = 10000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
    return await r.json();
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

async function fetchText(url, timeout = 12000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
    return await r.text();
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// ── SOURCE 1: api-resultadosloterias.com ─────────────────────────────────────

/**
 * Obtiene todas las loterías disponibles en la API (con sus slugs reales).
 * Respuesta: { status: "success", data: [{name, slug}] }
 */
async function apiGetLotteryList() {
  const data = await fetchJSON(`${API1_BASE}/lotteries`);
  if (data.status !== 'success' || !Array.isArray(data.data)) {
    throw new Error('Respuesta inesperada de /api/lotteries');
  }
  return data.data; // [{name, slug}]
}

/**
 * Obtiene el último resultado de una lotería por slug.
 * Respuesta: { status, data: { lottery_name, number, serie, ...} }
 */
async function apiGetLastResult(slug) {
  const data = await fetchJSON(`${API1_BASE}/results/${slug}/last`);
  if (!data || data.status === 'error') throw new Error(`No result for slug: ${slug}`);
  const r = data.data || data;
  return normalizeApiResult(r, slug);
}

function normalizeApiResult(r, slug) {
  // Encontrar entrada en catálogo por slug o por nombre
  const cat = findInCatalog(slug) || findInCatalog(r.lottery_name || r.name || '');
  const type = cat ? cat.type : guessType(r.lottery_name || r.name || slug || '');

  // Parsear números
  let numbers = [];
  const rawNums = r.numbers || r.number || r.resultado || r.numeros || '';
  if (typeof rawNums === 'string' && rawNums.trim()) {
    numbers = rawNums.split(/[\s,\-\.]+/).map(n => n.trim()).filter(n => /^\d+$/.test(n));
  } else if (Array.isArray(rawNums)) {
    numbers = rawNums.map(String);
  } else if (typeof rawNums === 'number') {
    numbers = [String(rawNums)];
  }

  // Para loterías tradicionales, el número suele venir como número de 4 cifras + serie
  if (type === 'loteria' && numbers.length === 1 && numbers[0].length <= 4) {
    numbers[0] = numbers[0].padStart(4, '0');
  }

  return {
    id:        cat ? cat.id : slugToId(slug),
    apiSlug:   slug,
    name:      cat ? cat.name : (r.lottery_name || r.name || slug),
    shortName: cat ? cat.shortName : (r.lottery_name || r.name || slug),
    type,
    emoji:     cat ? cat.emoji : typeEmoji(type),
    date:      parseApiDate(r.date || r.fecha || r.draw_date || ''),
    numbers,
    serie:     r.serie || r.series || null,
    fraccion:  r.fraccion || r.fraction || null,
    prize:     r.prize || r.premio || null,
    jackpot:   r.jackpot || r.acumulado || null,
    superball: r.superball || r.superbalota || null,
    sorteo:    r.draw_number || r.sorteo || r.concurso || null,
    sign:      r.sign || r.signo || null,  // para chances con signo
    source:    'api-resultadosloterias.com',
    official:  cat ? (cat.official || 'https://www.coljuegos.gov.co') : 'https://www.coljuegos.gov.co',
    hasResult: numbers.length > 0,
  };
}

// ── SOURCE 2: resultadodelaloteria.com via proxy ─────────────────────────────

async function rdlGetResult(cat) {
  const url = `${RDL_BASE}/${cat.rdlSlug}`;
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
  const html = await fetchText(proxyUrl, 14000);
  return parseRdlHtml(html, cat);
}

function parseRdlHtml(html, cat) {
  if (!html || html.length < 100) return null;

  // resultadodelaloteria.com structure:
  // <h1> or <h2> with lottery name
  // Result in structured data or visible text

  // Try JSON-LD structured data first
  const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      const nums = extractFromJsonLd(ld);
      if (nums.length > 0) {
        return buildResult(cat, nums, extractSerie(html), extractSorteo(html), extractDate(html));
      }
    } catch (_) {}
  }

  // Pattern: "número ganador" or "número: XXXX"
  const numPatterns = [
    /n[úu]mero\s+ganador[^:]*[:]\s*([\d\s]+)/i,
    /resultado[^:]*[:]\s*([\d\s\-]+)/i,
    /n[úu]meros?[^:]*[:]\s*([\d\s\-,]+)/i,
    /<strong[^>]*>\s*(\d{4})\s*<\/strong>/,
    /class="[^"]*result[^"]*"[^>]*>\s*(\d{4})/i,
    /class="[^"]*number[^"]*"[^>]*>\s*([\d\s]+)/i,
    /sorteo\s+(?:nro\.|número|n°)?\s*\d+[^<]*fue[^<]*([\d\s]+)/i,
  ];

  for (const pat of numPatterns) {
    const m = html.match(pat);
    if (m) {
      const nums = m[1].trim().split(/[\s,\-]+/).filter(n => /^\d+$/.test(n) && n.length <= 4);
      if (nums.length > 0) {
        return buildResult(cat, nums, extractSerie(html), extractSorteo(html), extractDate(html));
      }
    }
  }

  // Last resort: find all 4-digit numbers prominently placed
  const prominent = html.match(/>\s*(\d{4})\s*</g);
  if (prominent && prominent.length > 0) {
    const nums = [...new Set(prominent.map(s => s.replace(/[><\s]/g, '')))].slice(0, 1);
    if (nums[0]) {
      return buildResult(cat, nums, extractSerie(html), extractSorteo(html), extractDate(html));
    }
  }

  return null;
}

function extractFromJsonLd(ld) {
  const text = JSON.stringify(ld);
  const m = text.match(/(?:number|numero|result|numbers)["\s:]+(\d{4})/i);
  return m ? [m[1]] : [];
}

function extractSerie(html) {
  const m = html.match(/serie[^:]*[:]\s*(\d+)/i) || html.match(/series?\s+(\d+)/i);
  return m ? m[1].trim() : null;
}

function extractSorteo(html) {
  const m = html.match(/sorteo[^0-9]*(\d+)/i) || html.match(/nro\.\s*(\d+)/i) || html.match(/n[úu]mero\s+(\d+)/i);
  return m ? m[1] : null;
}

function extractDate(html) {
  // Try ISO date
  const iso = html.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // Try Spanish date: "7 de noviembre de 2026"
  const months = {enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const sp = html.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (sp) {
    const mon = months[sp[2].toLowerCase()];
    if (mon) return `${sp[3]}-${String(mon).padStart(2,'0')}-${sp[1].padStart(2,'0')}`;
  }
  return new Date().toISOString().slice(0,10);
}

function buildResult(cat, numbers, serie, sorteo, date) {
  return {
    id:        cat.id,
    apiSlug:   cat.apiSlug,
    name:      cat.name,
    shortName: cat.shortName,
    type:      cat.type,
    emoji:     cat.emoji,
    date:      date || todayISO(),
    numbers:   numbers.map(n => cat.type === 'loteria' ? n.padStart(4,'0') : n),
    serie,
    fraccion:  null,
    prize:     null,
    jackpot:   null,
    superball: null,
    sorteo,
    sign:      null,
    source:    'resultadodelaloteria.com',
    official:  cat.official || 'https://www.coljuegos.gov.co',
    hasResult: true,
  };
}

// ── SOURCE 3: schedule fallback ───────────────────────────────────────────────

function buildScheduleCard(cat) {
  return {
    id:        cat.id,
    apiSlug:   cat.apiSlug,
    name:      cat.name,
    shortName: cat.shortName,
    type:      cat.type,
    emoji:     cat.emoji,
    date:      todayISO(),
    numbers:   [],
    serie:     null,
    fraccion:  null,
    prize:     null,
    jackpot:   null,
    superball: null,
    sorteo:    null,
    sign:      null,
    source:    'schedule',
    official:  cat.official || 'https://www.coljuegos.gov.co',
    hasResult: false,
    pending:   true,
    hour:      cat.hour,
    entity:    cat.entity,
  };
}

// ── Main public functions ────────────────────────────────────────────────────

/**
 * Carga todos los resultados del día.
 * Primero obtiene la lista de slugs reales de la API,
 * luego pide el último resultado de cada uno en paralelo (con límite de concurrencia).
 */
async function fetchAllResults(onProgress) {
  let apiSlugs = [];
  let apiAvailable = true;

  // Paso 1: obtener lista de loterías de la API
  try {
    onProgress('Conectando con api-resultadosloterias.com...', '');
    const lotteries = await apiGetLotteryList();
    apiSlugs = lotteries.map(l => ({ slug: l.slug, name: l.name }));
    onProgress(`✅ ${apiSlugs.length} loterías disponibles en la API`, 'Obteniendo resultados...');
  } catch (e) {
    console.warn('[API1] /api/lotteries failed:', e.message);
    apiAvailable = false;
    // Usar slugs del catálogo como fallback
    apiSlugs = CATALOG.map(c => ({ slug: c.apiSlug, name: c.name }));
    onProgress('⚠️ API primaria no disponible, usando fuente alternativa...', '');
  }

  // Paso 2: obtener resultados en lotes de 6 (evitar rate-limit)
  const results = [];
  const errors  = [];
  const BATCH   = 6;

  for (let i = 0; i < apiSlugs.length; i += BATCH) {
    const batch = apiSlugs.slice(i, i + BATCH);
    onProgress(
      `Cargando resultados... (${Math.min(i + BATCH, apiSlugs.length)}/${apiSlugs.length})`,
      batch.map(b => b.name).join(', ')
    );

    const batchResults = await Promise.allSettled(
      batch.map(async ({ slug, name }) => {
        // Intento 1: api-resultadosloterias.com
        if (apiAvailable) {
          try {
            return await apiGetLastResult(slug);
          } catch (e) {
            // Intento 2: resultadodelaloteria.com
            const cat = findInCatalog(slug) || findInCatalog(name);
            if (cat && cat.rdlSlug) {
              try {
                const r = await rdlGetResult(cat);
                if (r) return r;
              } catch (_) {}
            }
            // Fallback: schedule card
            const c = findInCatalog(slug) || findInCatalog(name);
            return c ? buildScheduleCard(c) : null;
          }
        } else {
          // Sin API primaria: intentar directamente rdl
          const cat = findInCatalog(slug) || findInCatalog(name);
          if (cat && cat.rdlSlug) {
            try {
              const r = await rdlGetResult(cat);
              if (r) return r;
            } catch (_) {}
          }
          return cat ? buildScheduleCard(cat) : null;
        }
      })
    );

    batchResults.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        results.push(res.value);
      } else {
        const { slug, name } = batch[idx];
        errors.push(slug);
        const cat = findInCatalog(slug) || findInCatalog(name);
        if (cat) results.push(buildScheduleCard(cat));
      }
    });

    // Pequeña pausa entre lotes
    if (i + BATCH < apiSlugs.length) {
      await sleep(300);
    }
  }

  // Agregar loterías del catálogo que no vinieron de la API
  const idsInResults = new Set(results.map(r => r.id));
  const todayCat = getTodayCatalog();
  for (const cat of todayCat) {
    if (!idsInResults.has(cat.id)) {
      results.push(buildScheduleCard(cat));
    }
  }

  const withResults = results.filter(r => r.hasResult).length;
  return {
    results,
    withResults,
    total: results.length,
    errors: errors.length,
    apiAvailable,
    source: apiAvailable ? 'api-resultadosloterias.com' : 'resultadodelaloteria.com',
  };
}

/**
 * Refresca el resultado de una sola lotería (para el modal de detalle).
 */
async function fetchSingleResult(cat) {
  try {
    return await apiGetLastResult(cat.apiSlug);
  } catch (_) {
    try {
      const r = await rdlGetResult(cat);
      if (r) return r;
    } catch (_) {}
    return buildScheduleCard(cat);
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function todayISO() { return new Date().toISOString().slice(0, 10); }

function parseApiDate(d) {
  if (!d) return todayISO();
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0,10);
  // Try d/m/y
  const m = d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }
  return todayISO();
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

function slugToId(slug) {
  return slug.replace(/-+/g, '_');
}
