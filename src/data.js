/**
 * data.js
 * Static lottery catalog + schedule for Colombia.
 * Used for suggestions, labeling, and fallback display.
 */

const LOTERIAS_CATALOG = [
  // ── LOTERÍAS ──────────────────────────────────────────
  { id: 'bogota',       name: 'Lotería de Bogotá',          type: 'loteria', emoji: '🏙️',  day: [4], hour: '22:30', entity: 'Empresa Industrial y Comercial del DC' },
  { id: 'medellin',     name: 'Lotería de Medellín',         type: 'loteria', emoji: '🌸',  day: [5], hour: '22:00', entity: 'Lotería de Medellín' },
  { id: 'antioquia',    name: 'Lotería de Antioquia',        type: 'loteria', emoji: '🌄',  day: [5], hour: '22:00', entity: 'Lotería de Medellín' },
  { id: 'cundinamarca', name: 'Lotería de Cundinamarca',     type: 'loteria', emoji: '🎡',  day: [1], hour: '22:00', entity: 'Lotería de Cundinamarca' },
  { id: 'boyaca',       name: 'Lotería de Boyacá',           type: 'loteria', emoji: '🏔️',  day: [6], hour: '22:00', entity: 'Lotería de Boyacá' },
  { id: 'huila',        name: 'Lotería del Huila',           type: 'loteria', emoji: '🌊',  day: [3], hour: '22:00', entity: 'Lotería del Huila' },
  { id: 'tolima',       name: 'Lotería del Tolima',          type: 'loteria', emoji: '🌋',  day: [1], hour: '22:00', entity: 'Lotería del Tolima' },
  { id: 'manizales',    name: 'Lotería de Manizales',        type: 'loteria', emoji: '☕',  day: [3], hour: '22:30', entity: 'Lotería de Manizales' },
  { id: 'quindio',      name: 'Lotería del Quindío',         type: 'loteria', emoji: '🎍',  day: [4], hour: '22:00', entity: 'Lotería del Quindío' },
  { id: 'risaralda',    name: 'Lotería de Risaralda',        type: 'loteria', emoji: '🌿',  day: [5], hour: '22:00', entity: 'Lotería de Risaralda' },
  { id: 'santander',    name: 'Lotería de Santander',        type: 'loteria', emoji: '⛰️',  day: [5], hour: '22:00', entity: 'Lotería de Santander' },
  { id: 'cauca',        name: 'Lotería del Cauca',           type: 'loteria', emoji: '🏞️',  day: [6], hour: '22:00', entity: 'Lotería del Cauca' },
  { id: 'nariño',       name: 'Lotería de Nariño',           type: 'loteria', emoji: '🌺',  day: [3], hour: '22:00', entity: 'Lotería de Nariño' },
  { id: 'putumayo',     name: 'Lotería del Putumayo',        type: 'loteria', emoji: '🌴',  day: [2], hour: '22:00', entity: 'Lotería del Putumayo' },
  { id: 'oriental',     name: 'Lotería Oriental',            type: 'loteria', emoji: '🌅',  day: [0], hour: '22:00', entity: 'Lotería Oriental' },
  { id: 'pacifico',     name: 'Lotería del Pacífico',        type: 'loteria', emoji: '🌊',  day: [4], hour: '22:00', entity: 'Lotería del Pacífico' },
  { id: 'cordobesa',    name: 'Lotería Cordobesa',           type: 'loteria', emoji: '🌾',  day: [0], hour: '20:00', entity: 'Lotería Cordobesa' },
  { id: 'sucre',        name: 'Lotería de Sucre',            type: 'loteria', emoji: '🌻',  day: [1], hour: '22:00', entity: 'Lotería de Sucre' },
  { id: 'magdalena',    name: 'Lotería del Magdalena',       type: 'loteria', emoji: '🏝️',  day: [6], hour: '22:00', entity: 'Lotería del Magdalena' },
  { id: 'lacruz',       name: 'La Cruz',                     type: 'loteria', emoji: '✝️',  day: [0], hour: '22:00', entity: 'La Cruz' },
  { id: 'extral',       name: 'Extra de Colombia',           type: 'loteria', emoji: '⭐',  day: [6], hour: '22:00', entity: 'Extra de Colombia' },

  // ── CHANCES / SUPER ASTRO ────────────────────────────
  { id: 'chance',       name: 'Chance',                      type: 'chance',  emoji: '🎲',  day: [0,1,2,3,4,5,6], hour: 'Múltiple', entity: 'Varias entidades' },
  { id: 'supertri',     name: 'Super Astro Tri',             type: 'chance',  emoji: '🌟',  day: [0,1,2,3,4,5,6], hour: '14:00',    entity: 'Suertia' },
  { id: 'superpick3',   name: 'Super Astro Pick 3',          type: 'chance',  emoji: '🔮',  day: [0,1,2,3,4,5,6], hour: '14:00',    entity: 'Suertia' },
  { id: 'pata',         name: 'La Pata',                     type: 'chance',  emoji: '🐾',  day: [0,1,2,3,4,5,6], hour: '10:00',    entity: 'Chance' },
  { id: 'pijao',        name: 'Pijao de Oro',                type: 'chance',  emoji: '🥇',  day: [0,1,2,3,4,5,6], hour: '10:00',    entity: 'Chance' },
  { id: 'cafetero',     name: 'Cafetero',                    type: 'chance',  emoji: '☕',  day: [0,1,2,3,4,5,6], hour: '14:00',    entity: 'Chance' },
  { id: 'cienaga',      name: 'Ciénaga',                     type: 'chance',  emoji: '🐊',  day: [0,1,2,3,4,5,6], hour: '14:00',    entity: 'Chance' },
  { id: 'antioqueño',   name: 'El Antioqueño',               type: 'chance',  emoji: '🏔️',  day: [0,1,2,3,4,5,6], hour: '14:00',    entity: 'Chance' },
  { id: 'costeño',      name: 'El Costeño',                  type: 'chance',  emoji: '🌴',  day: [0,1,2,3,4,5,6], hour: '10:00',    entity: 'Chance' },
  { id: 'mano',         name: 'La Mano',                     type: 'chance',  emoji: '✋',  day: [0,1,2,3,4,5,6], hour: '14:00',    entity: 'Chance' },
  { id: 'fantasia',     name: 'Fantasía',                    type: 'chance',  emoji: '🌈',  day: [0,1,2,3,4,5,6], hour: '14:00',    entity: 'Chance' },
  { id: 'triqui',       name: 'Triqui',                      type: 'chance',  emoji: '🎯',  day: [0,1,2,3,4,5,6], hour: '10:00',    entity: 'Chance' },

  // ── BALOTO / MILOTO ──────────────────────────────────
  { id: 'baloto',       name: 'Baloto',                      type: 'baloto',  emoji: '🎱',  day: [1,3,6], hour: '23:00',   entity: 'Operador Nacional de Juegos S.A.S.' },
  { id: 'revancha',     name: 'Revancha',                    type: 'baloto',  emoji: '🔄',  day: [1,3,6], hour: '23:00',   entity: 'Operador Nacional de Juegos S.A.S.' },
  { id: 'miloto',       name: 'MiLoto',                      type: 'baloto',  emoji: '🍀',  day: [0,1,2,3,4,5,6], hour: '23:00', entity: 'Operador Nacional de Juegos S.A.S.' },
];

// Day-name map (Colombia Sunday=0)
const DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// Utility: get catalog entry by id or name (fuzzy)
function getCatalogEntry(nameOrId) {
  const q = nameOrId.toLowerCase().trim();
  return LOTERIAS_CATALOG.find(l =>
    l.id === q ||
    l.name.toLowerCase().includes(q) ||
    q.includes(l.id)
  );
}

// Utility: search catalog
function searchCatalog(query) {
  const q = query.toLowerCase().trim();
  if (!q) return LOTERIAS_CATALOG;
  return LOTERIAS_CATALOG.filter(l =>
    l.name.toLowerCase().includes(q) ||
    l.id.includes(q) ||
    l.type.includes(q) ||
    l.entity.toLowerCase().includes(q)
  );
}

// Utility: today's lotteries
function getTodayCatalog() {
  const today = new Date().getDay(); // 0=Sun
  return LOTERIAS_CATALOG.filter(l => l.day.includes(today));
}

// Voice command aliases → canonical search terms
const VOICE_ALIASES = {
  'bogota': ['bogotá', 'lotería bogotá', 'loteria bogota'],
  'medellin': ['medellín', 'lotería medellín', 'loteria medellin', 'paisa'],
  'baloto': ['baloto', 'balota', 'balo to'],
  'boyaca': ['boyacá', 'boyaca'],
  'huila': ['huila'],
  'tolima': ['tolima'],
  'manizales': ['manizales', 'caldas'],
  'chance': ['chance', 'chances', 'chanse'],
  'miloto': ['miloto', 'mi loto'],
  'revancha': ['revancha'],
  'cundinamarca': ['cundinamarca', 'cundi'],
  'antioquia': ['antioquia', 'antioqueña'],
  'santander': ['santander'],
  'nariño': ['nariño', 'narino'],
  'pacifico': ['pacífico', 'pacifico'],
};

function normalizeVoiceQuery(transcript) {
  const t = transcript.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(VOICE_ALIASES)) {
    for (const alias of aliases) {
      if (t.includes(alias)) return canonical;
    }
  }
  return t;
}
