/**
 * api.js — Datos reales, carga rápida con renderizado incremental
 *
 * Estrategia de velocidad:
 *  1. Se llama onCard(card) cada vez que llega UN resultado → la UI lo pinta de inmediato
 *  2. Todas las requests van en paralelo (Promise.allSettled de golpe, sin batches)
 *  3. Timeout por lotería: 5s — si no responde, se muestra como pendiente y se sigue
 *  4. Deduplicación al insertar por id
 *
 * Historial:
 *  - API /results/{slug} sin /last (si devuelve array)
 *  - resultadodelaloteria.com + links a sorteos anteriores (proxies rotados)
 *  - Fechas generadas por día de sorteo como último recurso
 */

const API1 = 'https://api-resultadosloterias.com/api';
const RDL  = 'https://resultadodelaloteria.com/colombia';
const LY   = 'https://www.loteriaya.com.co';

// Proxies CORS para scraping (solo historial / fechas, NO para carga inicial)
const PROXIES = [
  u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

const LY_SLUG = {
  bogota:'loteria-de-bogota',medellin:'loteria-de-medellin',
  cundinamarca:'loteria-de-cundinamarca',boyaca:'loteria-de-boyaca',
  huila:'loteria-del-huila',tolima:'loteria-del-tolima',
  manizales:'loteria-de-manizales',quindio:'loteria-del-quindio',
  risaralda:'loteria-de-risaralda',santander:'loteria-de-santander',
  cauca:'loteria-del-cauca',narino:'loteria-de-narino',
  putumayo:'loteria-del-putumayo',oriental:'loteria-oriental',
  pacifico:'loteria-del-pacifico',cordobesa:'loteria-cordobesa',
  sucre:'loteria-de-sucre',magdalena:'loteria-del-magdalena',
  cruzroja:'loteria-de-la-cruz-roja',extracolombia:'extra-de-colombia',
  meta:'loteria-del-meta',baloto:'baloto',revancha:'revancha',miloto:'miloto',
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

// ── Fetch rápido (API tiene CORS abierto, sin proxy) ─────────────────────────
async function fetchJSON(url, ms = 5000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) { clearTimeout(t); throw e; }
}

// ── Fetch HTML via proxies (para historial) ───────────────────────────────────
async function fetchHTML(url, ms = 12000) {
  for (const mk of PROXIES) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(mk(url), { signal: c.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const text = await r.text();
      if (mk(url).includes('allorigins')) {
        try { const j = JSON.parse(text); if (j.contents) return j.contents; } catch (_) {}
      }
      if (text && text.length > 200) return text;
    } catch (_) { clearTimeout(t); }
  }
  throw new Error('All proxies failed: ' + url);
}

// ── API principal ─────────────────────────────────────────────────────────────

async function apiListLotteries() {
  const d = await fetchJSON(`${API1}/lotteries`, 8000);
  if (d.status !== 'success' || !Array.isArray(d.data)) throw new Error('Bad /lotteries');
  return d.data;
}

async function apiLastResult(slug) {
  const d = await fetchJSON(`${API1}/results/${slug}/last`, 5000);
  if (!d || d.status === 'error') throw new Error('No data');
  return normAPI(d.data || d, slug);
}

async function apiHistoryList(slug) {
  const d = await fetchJSON(`${API1}/results/${slug}`, 6000);
  if (Array.isArray(d)) return d.map(r => normAPI(r, slug)).filter(r => r.hasResult);
  if (d?.data && Array.isArray(d.data)) return d.data.map(r => normAPI(r, slug)).filter(r => r.hasResult);
  return [];
}

function normAPI(r, slug) {
  const cat  = findInCatalog(slug) || findInCatalog(r.lottery_name || r.name || '');
  const type = cat ? cat.type : guessType(r.lottery_name || r.name || slug);
  let nums   = parseNums(r.numbers || r.number || r.resultado || r.numeros || '');
  if (type === 'loteria' && nums.length === 1) nums[0] = nums[0].padStart(4, '0');
  return mk({
    id: cat?.id || s2id(slug), slug,
    name: cat?.name || r.lottery_name || r.name || slug,
    short: cat?.shortName || r.name || slug,
    type, emoji: cat?.emoji || tEmoji(type),
    date: parseISO(r.date || r.fecha || r.draw_date || ''),
    nums, serie: r.serie || r.series || null, fraccion: r.fraccion || null,
    prize: r.prize || r.premio || null, jackpot: r.jackpot || r.acumulado || null,
    superball: r.superball || null, sorteo: r.draw_number || r.sorteo || r.concurso || null,
    sign: r.sign || r.signo || null, source: 'api-resultadosloterias.com',
    official: cat?.official || 'https://www.coljuegos.gov.co', entity: cat?.entity || null,
  });
}

// ── resultadodelaloteria.com ──────────────────────────────────────────────────

async function rdlLast(cat) {
  const html = await fetchHTML(`${RDL}/${cat.rdlSlug}`);
  return parseRDL(html, cat);
}

async function rdlHistoryFull(cat, limit = 15) {
  const html = await fetchHTML(`${RDL}/${cat.rdlSlug}`);
  if (!html || html.length < 200) return [];
  const results = [];
  const main = parseRDL(html, cat);
  if (main) results.push(main);

  // Extraer links /colombia/loteria-...-sorteo-NNNN
  const re = /href="\/colombia\/([\w-]+-del-\d{1,2}-de-\w+-de-\d{4}-sorteo-\d+)"/gi;
  const links = []; let m;
  while ((m = re.exec(html)) !== null && links.length < limit + 2) links.push(m[1]);

  const seen = new Set(results.map(r => r.sorteo));
  const settled = await Promise.allSettled(
    links.slice(0, limit - 1).map(async slug => {
      const h = await fetchHTML(`${RDL}/${slug}`, 10000);
      return parseRDL(h, cat);
    })
  );
  for (const s of settled) {
    if (s.status === 'fulfilled' && s.value && !seen.has(s.value.sorteo)) {
      seen.add(s.value.sorteo); results.push(s.value);
    }
  }
  return results.sort((a,b)=>b.date.localeCompare(a.date)).slice(0, limit);
}

function parseRDL(html, cat) {
  if (!html || html.length < 100) return null;
  const pats = [
    /(?:fue el|fue)\s+(\d{4})\b/i,
    /(?:ganador)[^0-9]{0,60}(\d{4})\b/i,
    /<strong[^>]*>(\d{4})<\/strong>/i,
    />\s*(\d{4})\s*</,
  ];
  let number = null;
  for (const p of pats) {
    const m = html.match(p);
    if (m) { const n=parseInt(m[1]); if(n>=0&&n<=9999){number=String(n).padStart(4,'0');break;} }
  }
  if (!number) return null;
  return mk({
    id:cat.id,slug:cat.apiSlug,name:cat.name,short:cat.shortName,
    type:cat.type,emoji:cat.emoji,date:xDate(html),nums:[number],
    serie:html.match(/serie[^0-9]{0,15}(\d{1,5})/i)?.[1]??null,
    fraccion:null,prize:xPrize(html),jackpot:null,superball:null,
    sorteo:html.match(/sorteo[^0-9]{0,10}(\d+)/i)?.[1]??null,
    sign:null,source:'resultadodelaloteria.com',
    official:cat.official||'https://www.coljuegos.gov.co',entity:cat.entity,
  });
}

// ── loteriaya.com.co — por fecha ──────────────────────────────────────────────

async function lyByDate(cat, dateISO) {
  const slug = LY_SLUG[cat.id]; if (!slug) return null;
  const html = await fetchHTML(`${LY}/loteria/${slug}/resultado/${dateISO}`, 10000);
  return parseLY(html, cat, dateISO);
}

function parseLY(html, cat, dateISO) {
  if (!html || html.length < 100) return null;
  const pats = [
    /(?:fue el|fue)\s+(\d{4})\b/i,
    /(?:ganador|winning)[^0-9]{0,40}(\d{4})\b/i,
    /class="[^"]*(?:number|numero|winning)[^"]*"[^>]*>\s*(\d{4})\s*</i,
    /data-number="(\d{4})"/i,/>"?(\d{4})"?</,
  ];
  let number=null;
  for(const p of pats){const m=html.match(p);if(m){const n=parseInt(m[1]);if(n>=0&&n<=9999){number=String(n).padStart(4,'0');break;}}}
  if(!number)return null;
  return mk({id:cat.id,slug:cat.apiSlug,name:cat.name,short:cat.shortName,
    type:cat.type,emoji:cat.emoji,date:dateISO,nums:[number],
    serie:html.match(/serie[^0-9]{0,15}(\d{1,5})/i)?.[1]??null,
    fraccion:null,prize:xPrize(html),jackpot:null,superball:null,
    sorteo:html.match(/sorteo[^0-9]{0,10}(\d+)/i)?.[1]??null,
    sign:null,source:'loteriaya.com.co',
    official:cat.official||'https://www.coljuegos.gov.co',entity:cat.entity,
  });
}

// ── CARGA PRINCIPAL — incremental ─────────────────────────────────────────────

/**
 * @param {function} onCard   — se llama con cada resultado en cuanto llega
 * @param {function} onStatus — actualiza el label de progreso
 */
async function fetchAllResults(onCard, onStatus) {
  // Paso 1: obtener lista de slugs de la API
  let apiSlugs = [];
  let apiOk    = true;
  try {
    onStatus('Conectando...');
    const list = await apiListLotteries();
    const seen = new Set();
    apiSlugs = list.filter(l=>{ if(seen.has(l.slug))return false; seen.add(l.slug); return true; });
    onStatus(`${apiSlugs.length} loterías`);
  } catch (e) {
    apiOk    = false;
    apiSlugs = CATALOG.map(c=>({slug:c.apiSlug, name:c.name}));
    onStatus('Fuente alternativa');
  }

  // Paso 2: mostrar inmediatamente cards del catálogo de hoy como "pendiente"
  // mientras llegan los resultados reales
  const todayDOW = new Date().getDay();
  const seenIds  = new Set();

  for (const cat of CATALOG) {
    if (cat.day.includes(todayDOW)) {
      onCard(scheduleCard(cat), false /* no es definitivo */);
      seenIds.add(cat.id);
    }
  }

  // Paso 3: todas las requests en paralelo — sin batches, con timeout por item
  let done = 0;
  const total = apiSlugs.length;

  await Promise.allSettled(apiSlugs.map(async ({ slug, name }) => {
    let result = null;
    try {
      if (apiOk) result = await apiLastResult(slug);
    } catch (_) {
      const cat = findInCatalog(slug) || findInCatalog(name);
      if (cat) {
        try { result = await rdlLast(cat); } catch (_) {}
        if (!result) result = scheduleCard(cat);
      }
    }
    done++;
    onStatus(`${done}/${total}`);
    if (result) onCard(result, true /* es definitivo */);
  }));

  // Paso 4: agregar loterías del catálogo que no vinieron de la API y no están ya
  for (const cat of CATALOG) {
    if (cat.day.includes(todayDOW) && !seenIds.has(cat.id)) {
      onCard(scheduleCard(cat), true);
    }
  }

  return { apiOk, source: apiOk ? 'api-resultadosloterias.com' : 'resultadodelaloteria.com' };
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────

async function fetchHistory(cat) {
  // 1. API historial
  try {
    const list = await apiHistoryList(cat.apiSlug);
    if (list.length >= 2) return list.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
  } catch (_) {}

  // 2. RDL scraping
  if (cat.rdlSlug) {
    try {
      const list = await rdlHistoryFull(cat, 15);
      if (list.length >= 2) return list;
    } catch (_) {}
  }

  // 3. Por fechas
  return fetchHistByDates(cat);
}

async function fetchHistByDates(cat) {
  const isDaily = cat.day.length >= 6;
  const dates = isDaily
    ? Array.from({length:15},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10);})
    : drawDatesBack(cat.day, 5);

  const settled = await Promise.allSettled(dates.map(d => fetchOneDate(cat, d)));
  return settled
    .filter(s=>s.status==='fulfilled'&&s.value?.hasResult)
    .map(s=>s.value)
    .sort((a,b)=>b.date.localeCompare(a.date))
    .slice(0,15);
}

async function fetchOneDate(cat, dateISO) {
  try {
    const d = await fetchJSON(`${API1}/results/${cat.apiSlug}/${dateISO}`, 5000);
    if (d && d.status !== 'error') { const r=normAPI(d.data||d,cat.apiSlug); if(r.hasResult)return r; }
  } catch (_) {}
  if (cat.type !== 'chance') {
    try { const r=await lyByDate(cat,dateISO); if(r?.hasResult)return r; } catch (_) {}
  }
  return null;
}

async function fetchResultByDate(cat, dateISO) {
  const r = await fetchOneDate(cat, dateISO);
  if (r) return r;
  try { const rr=await rdlLast(cat); if(rr?.date===dateISO)return rr; } catch (_) {}
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mk({id,slug,name,short,type,emoji,date,nums,serie,fraccion,prize,jackpot,superball,sorteo,sign,source,official,entity}) {
  return {id,apiSlug:slug,name,shortName:short,type,emoji,date:date||todayISO(),
    numbers:nums||[],serie,fraccion,prize,jackpot,superball,sorteo,sign,source,official,
    entity:entity||null,hasResult:(nums||[]).length>0};
}

function scheduleCard(cat) {
  return mk({id:cat.id,slug:cat.apiSlug,name:cat.name,short:cat.shortName,
    type:cat.type,emoji:cat.emoji,date:todayISO(),nums:[],
    serie:null,fraccion:null,prize:null,jackpot:null,superball:null,sorteo:null,sign:null,
    source:'schedule',official:cat.official||'https://www.coljuegos.gov.co',entity:cat.entity});
}

function drawDatesBack(days,weeks){
  const list=[],today=new Date();today.setHours(0,0,0,0);
  for(let i=0;i<=weeks*7;i++){const d=new Date(today);d.setDate(today.getDate()-i);if(days.includes(d.getDay()))list.push(d.toISOString().slice(0,10));}
  return list;
}

function xPrize(html){const m=html.match(/\$\s*([\d\.,]+)\s*(mil\s*millones|millones)/i);return m?`$${m[1]} ${m[2]}`:null;}
function xDate(html){
  const iso=html.match(/(\d{4}-\d{2}-\d{2})/);if(iso)return iso[1];
  const MO={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
  const sp=html.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if(sp){const mo=MO[sp[2].toLowerCase()];if(mo)return`${sp[3]}-${String(mo).padStart(2,'0')}-${sp[1].padStart(2,'0')}`;}
  return todayISO();
}
function parseNums(raw){if(Array.isArray(raw))return raw.map(String);if(typeof raw==='number')return[String(raw)];if(typeof raw==='string'&&raw.trim())return raw.split(/[\s,\-\.]+/).map(n=>n.trim()).filter(n=>/^\d+$/.test(n));return[];}
function guessType(s){const n=s.toLowerCase();if(/baloto|miloto|revancha/.test(n))return'baloto';if(/chance|astro|pata|pijao|cafetero|coste[ñn]o|mano|caribe|cash|paisita|suertudo|motilon|antioquenita/.test(n))return'chance';return'loteria';}
function tEmoji(t){return{loteria:'🎟️',chance:'🎲',baloto:'🎱'}[t]||'🎲';}
function s2id(s){return s.replace(/-+/g,'_');}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function todayISO(){return new Date().toISOString().slice(0,10);}
function parseISO(d){if(!d)return todayISO();if(/^\d{4}-\d{2}-\d{2}/.test(d))return d.slice(0,10);const m=d.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}return todayISO();}
