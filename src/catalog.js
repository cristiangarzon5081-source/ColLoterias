/**
 * catalog.js — Catálogo completo de loterías y chances colombianos
 *
 * Incluye los slugs exactos para:
 *  - api-resultadosloterias.com  → campo `apiSlug`
 *  - resultadodelaloteria.com    → campo `rdlSlug`  (URL: /colombia/{rdlSlug})
 *
 * day: 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
 */

const CATALOG = [
  // ══════════════════════════════════════════════════════
  //  BALOTO
  // ══════════════════════════════════════════════════════
  {
    id: 'baloto', name: 'Baloto', shortName: 'Baloto',
    type: 'baloto', emoji: '🎱',
    day: [1,3,6], hour: '23:00',
    apiSlug: 'baloto',
    rdlSlug: 'baloto',
    entity: 'Operador Nacional de Juegos S.A.S.',
    official: 'https://www.baloto.com/resultados',
  },
  {
    id: 'revancha', name: 'Revancha', shortName: 'Revancha',
    type: 'baloto', emoji: '🔄',
    day: [1,3,6], hour: '23:00',
    apiSlug: 'revancha',
    rdlSlug: 'revancha',
    entity: 'Operador Nacional de Juegos S.A.S.',
    official: 'https://www.baloto.com/resultados',
  },
  {
    id: 'miloto', name: 'MiLoto', shortName: 'MiLoto',
    type: 'baloto', emoji: '🍀',
    day: [0,1,2,3,4,5,6], hour: '23:00',
    apiSlug: 'miloto',
    rdlSlug: 'mi-loto',
    entity: 'Operador Nacional de Juegos S.A.S.',
    official: 'https://www.baloto.com/resultados',
  },

  // ══════════════════════════════════════════════════════
  //  LOTERÍAS TRADICIONALES
  // ══════════════════════════════════════════════════════
  {
    id: 'bogota', name: 'Lotería de Bogotá', shortName: 'Bogotá',
    type: 'loteria', emoji: '🏙️',
    day: [4], hour: '22:30',
    apiSlug: 'loteria-de-bogota',
    rdlSlug: 'loteria-de-bogota',
    entity: 'Empresa Industrial y Comercial del Distrito Capital',
    official: 'https://www.loteriadebogota.com',
  },
  {
    id: 'medellin', name: 'Lotería de Medellín', shortName: 'Medellín',
    type: 'loteria', emoji: '🌸',
    day: [5], hour: '22:00',
    apiSlug: 'loteria-de-medellin',
    rdlSlug: 'loteria-de-medellin',
    entity: 'Lotería de Medellín',
    official: 'https://www.loterademedellin.com.co',
  },
  {
    id: 'cundinamarca', name: 'Lotería de Cundinamarca', shortName: 'Cundinamarca',
    type: 'loteria', emoji: '🎡',
    day: [1], hour: '22:00',
    apiSlug: 'loteria-de-cundinamarca',
    rdlSlug: 'loteria-de-cundinamarca',
    entity: 'Lotería de Cundinamarca',
    official: 'https://www.loteriadecundinamarca.com.co',
  },
  {
    id: 'boyaca', name: 'Lotería de Boyacá', shortName: 'Boyacá',
    type: 'loteria', emoji: '🏔️',
    day: [6], hour: '22:00',
    apiSlug: 'loteria-de-boyaca',
    rdlSlug: 'loteria-de-boyaca',
    entity: 'Lotería de Boyacá',
    official: 'https://www.loteriadeboyaca.gov.co',
  },
  {
    id: 'huila', name: 'Lotería del Huila', shortName: 'Huila',
    type: 'loteria', emoji: '🌊',
    day: [3], hour: '22:00',
    apiSlug: 'loteria-del-huila',
    rdlSlug: 'loteria-del-huila',
    entity: 'Lotería del Huila',
    official: 'https://www.loteriahuila.com',
  },
  {
    id: 'tolima', name: 'Lotería del Tolima', shortName: 'Tolima',
    type: 'loteria', emoji: '🌋',
    day: [1], hour: '22:00',
    apiSlug: 'loteria-del-tolima',
    rdlSlug: 'loteria-del-tolima',
    entity: 'Lotería del Tolima',
    official: 'https://www.loteriadeltolima.com',
  },
  {
    id: 'manizales', name: 'Lotería de Manizales', shortName: 'Manizales',
    type: 'loteria', emoji: '☕',
    day: [3], hour: '22:30',
    apiSlug: 'loteria-de-manizales',
    rdlSlug: 'loteria-de-manizales',
    entity: 'Lotería de Manizales',
    official: 'https://www.loteriamanizales.com',
  },
  {
    id: 'quindio', name: 'Lotería del Quindío', shortName: 'Quindío',
    type: 'loteria', emoji: '🎍',
    day: [4], hour: '22:00',
    apiSlug: 'loteria-del-quindio',
    rdlSlug: 'loteria-del-quindio',
    entity: 'Lotería del Quindío',
    official: 'https://www.loteriadequindio.com',
  },
  {
    id: 'risaralda', name: 'Lotería de Risaralda', shortName: 'Risaralda',
    type: 'loteria', emoji: '🌿',
    day: [5], hour: '22:00',
    apiSlug: 'loteria-de-risaralda',
    rdlSlug: 'loteria-de-risaralda',
    entity: 'Lotería de Risaralda',
    official: 'https://www.loteriarisaralda.com',
  },
  {
    id: 'santander', name: 'Lotería de Santander', shortName: 'Santander',
    type: 'loteria', emoji: '⛰️',
    day: [5], hour: '22:00',
    apiSlug: 'loteria-de-santander',
    rdlSlug: 'loteria-de-santander',
    entity: 'Lotería de Santander',
    official: 'https://www.loteriadesantander.com',
  },
  {
    id: 'cauca', name: 'Lotería del Cauca', shortName: 'Cauca',
    type: 'loteria', emoji: '🏞️',
    day: [6], hour: '22:00',
    apiSlug: 'loteria-del-cauca',
    rdlSlug: 'loteria-del-cauca',
    entity: 'Lotería del Cauca',
    official: 'https://www.loteriacauca.com',
  },
  {
    id: 'narino', name: 'Lotería de Nariño', shortName: 'Nariño',
    type: 'loteria', emoji: '🌺',
    day: [3], hour: '22:00',
    apiSlug: 'loteria-de-narino',
    rdlSlug: 'loteria-de-narino',
    entity: 'Lotería de Nariño',
    official: 'https://www.lotenarino.com',
  },
  {
    id: 'putumayo', name: 'Lotería del Putumayo', shortName: 'Putumayo',
    type: 'loteria', emoji: '🌴',
    day: [2], hour: '22:00',
    apiSlug: 'loteria-del-putumayo',
    rdlSlug: 'loteria-del-putumayo',
    entity: 'Lotería del Putumayo',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'oriental', name: 'Lotería Oriental', shortName: 'Oriental',
    type: 'loteria', emoji: '🌅',
    day: [0], hour: '22:00',
    apiSlug: 'loteria-oriental',
    rdlSlug: 'loteria-oriental',
    entity: 'Lotería Oriental',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'pacifico', name: 'Lotería del Pacífico', shortName: 'Pacífico',
    type: 'loteria', emoji: '🌊',
    day: [4], hour: '22:00',
    apiSlug: 'loteria-del-pacifico',
    rdlSlug: 'loteria-del-pacifico',
    entity: 'Lotería del Pacífico',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'cordobesa', name: 'Lotería Cordobesa', shortName: 'Cordobesa',
    type: 'loteria', emoji: '🌾',
    day: [0], hour: '20:00',
    apiSlug: 'loteria-cordobesa',
    rdlSlug: 'loteria-cordobesa',
    entity: 'Lotería Cordobesa',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'sucre', name: 'Lotería de Sucre', shortName: 'Sucre',
    type: 'loteria', emoji: '🌻',
    day: [1], hour: '22:00',
    apiSlug: 'loteria-de-sucre',
    rdlSlug: 'loteria-de-sucre',
    entity: 'Lotería de Sucre',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'magdalena', name: 'Lotería del Magdalena', shortName: 'Magdalena',
    type: 'loteria', emoji: '🏝️',
    day: [6], hour: '22:00',
    apiSlug: 'loteria-del-magdalena',
    rdlSlug: 'loteria-del-magdalena',
    entity: 'Lotería del Magdalena',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'cruzroja', name: 'Lotería de la Cruz Roja', shortName: 'Cruz Roja',
    type: 'loteria', emoji: '🏥',
    day: [2], hour: '22:55',
    apiSlug: 'loteria-de-la-cruz-roja',
    rdlSlug: 'loteria-de-la-cruz-roja',
    entity: 'Cruz Roja Colombiana',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'extracolombia', name: 'Extra de Colombia', shortName: 'Extra',
    type: 'loteria', emoji: '⭐',
    day: [6], hour: '22:00',
    apiSlug: 'extra-de-colombia',
    rdlSlug: 'extra-de-colombia',
    entity: 'Extra de Colombia',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'meta', name: 'Lotería del Meta', shortName: 'Meta',
    type: 'loteria', emoji: '🦜',
    day: [4], hour: '22:00',
    apiSlug: 'loteria-del-meta',
    rdlSlug: 'loteria-del-meta',
    entity: 'Lotería del Meta',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'arauca', name: 'Lotería de Arauca', shortName: 'Arauca',
    type: 'loteria', emoji: '🦅',
    day: [0], hour: '22:00',
    apiSlug: 'loteria-de-arauca',
    rdlSlug: 'loteria-de-arauca',
    entity: 'Lotería de Arauca',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'casanare', name: 'Lotería de Casanare', shortName: 'Casanare',
    type: 'loteria', emoji: '🌵',
    day: [3], hour: '22:00',
    apiSlug: 'loteria-de-casanare',
    rdlSlug: 'loteria-de-casanare',
    entity: 'Lotería de Casanare',
    official: 'https://www.coljuegos.gov.co',
  },
  {
    id: 'vichada', name: 'Lotería de Vichada', shortName: 'Vichada',
    type: 'loteria', emoji: '🌿',
    day: [2], hour: '22:00',
    apiSlug: 'loteria-de-vichada',
    rdlSlug: 'loteria-de-vichada',
    entity: 'Lotería de Vichada',
    official: 'https://www.coljuegos.gov.co',
  },

  // ══════════════════════════════════════════════════════
  //  CHANCES — Mañana (AM)
  // ══════════════════════════════════════════════════════
  {
    id: 'antioquenita-m', name: 'Antioqueñita Mañana', shortName: 'Antioqueñita M.',
    type: 'chance', emoji: '🌄',
    day: [0,1,2,3,4,5,6], hour: '11:30',
    apiSlug: 'antioquenita-manana',
    rdlSlug: 'antioquenita-manana',
    entity: 'Chance',
  },
  {
    id: 'cafetero-m', name: 'Cafetero Mañana', shortName: 'Cafetero M.',
    type: 'chance', emoji: '☕',
    day: [0,1,2,3,4,5,6], hour: '11:00',
    apiSlug: 'cafetero-manana',
    rdlSlug: 'cafetero-manana',
    entity: 'Chance',
  },
  {
    id: 'caribe-m', name: 'Caribe Mañana', shortName: 'Caribe M.',
    type: 'chance', emoji: '🌴',
    day: [0,1,2,3,4,5,6], hour: '11:30',
    apiSlug: 'caribe-manana',
    rdlSlug: 'caribe-manana',
    entity: 'Chance',
  },
  {
    id: 'cash3-m', name: 'Cash Three Mañana', shortName: 'Cash3 M.',
    type: 'chance', emoji: '💵',
    day: [0,1,2,3,4,5,6], hour: '10:30',
    apiSlug: 'cash-three-manana',
    rdlSlug: 'cash-three-manana',
    entity: 'Chance',
  },
  {
    id: 'costeño-m', name: 'El Costeño Mañana', shortName: 'Costeño M.',
    type: 'chance', emoji: '🏖️',
    day: [0,1,2,3,4,5,6], hour: '10:00',
    apiSlug: 'el-costeno-manana',
    rdlSlug: 'el-costeno-manana',
    entity: 'Chance',
  },
  {
    id: 'mano-m', name: 'La Mano Mañana', shortName: 'La Mano M.',
    type: 'chance', emoji: '✋',
    day: [0,1,2,3,4,5,6], hour: '10:30',
    apiSlug: 'la-mano-manana',
    rdlSlug: 'la-mano-manana',
    entity: 'Chance',
  },
  {
    id: 'pata-m', name: 'La Pata Mañana', shortName: 'La Pata M.',
    type: 'chance', emoji: '🐾',
    day: [0,1,2,3,4,5,6], hour: '10:00',
    apiSlug: 'la-pata-manana',
    rdlSlug: 'la-pata-manana',
    entity: 'Chance',
  },
  {
    id: 'pijao-m', name: 'Pijao de Oro Mañana', shortName: 'Pijao M.',
    type: 'chance', emoji: '🥇',
    day: [0,1,2,3,4,5,6], hour: '10:00',
    apiSlug: 'pijao-de-oro-manana',
    rdlSlug: 'pijao-de-oro-manana',
    entity: 'Chance',
  },
  {
    id: 'suertudo-m', name: 'El Suertudo Mañana', shortName: 'Suertudo M.',
    type: 'chance', emoji: '🍀',
    day: [0,1,2,3,4,5,6], hour: '10:30',
    apiSlug: 'el-suertudo-manana',
    rdlSlug: 'el-suertudo-manana',
    entity: 'Chance',
  },
  {
    id: 'paisita-m', name: 'Paisita Mañana', shortName: 'Paisita M.',
    type: 'chance', emoji: '🏔️',
    day: [0,1,2,3,4,5,6], hour: '10:00',
    apiSlug: 'paisita-manana',
    rdlSlug: 'paisita-manana',
    entity: 'Chance',
  },
  {
    id: 'motilón-m', name: 'El Motilón Mañana', shortName: 'Motilón M.',
    type: 'chance', emoji: '🌾',
    day: [0,1,2,3,4,5,6], hour: '10:00',
    apiSlug: 'el-motilon-manana',
    rdlSlug: 'el-motilon-manana',
    entity: 'Chance',
  },

  // ══════════════════════════════════════════════════════
  //  CHANCES — Tarde (PM)
  // ══════════════════════════════════════════════════════
  {
    id: 'antioquenita-t', name: 'Antioqueñita Tarde', shortName: 'Antioqueñita T.',
    type: 'chance', emoji: '🌆',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'antioquenita-tarde',
    rdlSlug: 'antioquenita-tarde',
    entity: 'Chance',
  },
  {
    id: 'cafetero-t', name: 'Cafetero Tarde', shortName: 'Cafetero T.',
    type: 'chance', emoji: '☕',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'cafetero-tarde',
    rdlSlug: 'cafetero-tarde',
    entity: 'Chance',
  },
  {
    id: 'caribe-t', name: 'Caribe Tarde', shortName: 'Caribe T.',
    type: 'chance', emoji: '🌴',
    day: [0,1,2,3,4,5,6], hour: '15:30',
    apiSlug: 'caribe-tarde',
    rdlSlug: 'caribe-tarde',
    entity: 'Chance',
  },
  {
    id: 'cash3-t', name: 'Cash Three Tarde', shortName: 'Cash3 T.',
    type: 'chance', emoji: '💵',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'cash-three-tarde',
    rdlSlug: 'cash-three-tarde',
    entity: 'Chance',
  },
  {
    id: 'costeño-t', name: 'El Costeño Tarde', shortName: 'Costeño T.',
    type: 'chance', emoji: '🏖️',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'el-costeno-tarde',
    rdlSlug: 'el-costeno-tarde',
    entity: 'Chance',
  },
  {
    id: 'mano-t', name: 'La Mano Tarde', shortName: 'La Mano T.',
    type: 'chance', emoji: '✋',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'la-mano-tarde',
    rdlSlug: 'la-mano-tarde',
    entity: 'Chance',
  },
  {
    id: 'pata-t', name: 'La Pata Tarde', shortName: 'La Pata T.',
    type: 'chance', emoji: '🐾',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'la-pata-tarde',
    rdlSlug: 'la-pata-tarde',
    entity: 'Chance',
  },
  {
    id: 'pijao-t', name: 'Pijao de Oro Tarde', shortName: 'Pijao T.',
    type: 'chance', emoji: '🥇',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'pijao-de-oro-tarde',
    rdlSlug: 'pijao-de-oro-tarde',
    entity: 'Chance',
  },
  {
    id: 'suertudo-t', name: 'El Suertudo Tarde', shortName: 'Suertudo T.',
    type: 'chance', emoji: '🍀',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'el-suertudo-tarde',
    rdlSlug: 'el-suertudo-tarde',
    entity: 'Chance',
  },
  {
    id: 'paisita-t', name: 'Paisita Tarde', shortName: 'Paisita T.',
    type: 'chance', emoji: '🏔️',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'paisita-tarde',
    rdlSlug: 'paisita-tarde',
    entity: 'Chance',
  },
  {
    id: 'motilón-t', name: 'El Motilón Tarde', shortName: 'Motilón T.',
    type: 'chance', emoji: '🌾',
    day: [0,1,2,3,4,5,6], hour: '15:00',
    apiSlug: 'el-motilon-tarde',
    rdlSlug: 'el-motilon-tarde',
    entity: 'Chance',
  },

  // ══════════════════════════════════════════════════════
  //  CHANCES — Noche (PM)
  // ══════════════════════════════════════════════════════
  {
    id: 'antioquenita-n', name: 'Antioqueñita Noche', shortName: 'Antioqueñita N.',
    type: 'chance', emoji: '🌙',
    day: [0,1,2,3,4,5,6], hour: '22:30',
    apiSlug: 'antioquenita-noche',
    rdlSlug: 'antioquenita-noche',
    entity: 'Chance',
  },
  {
    id: 'cafetero-n', name: 'Cafetero Noche', shortName: 'Cafetero N.',
    type: 'chance', emoji: '☕',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'cafetero-noche',
    rdlSlug: 'cafetero-noche',
    entity: 'Chance',
  },
  {
    id: 'caribe-n', name: 'Caribe Noche', shortName: 'Caribe N.',
    type: 'chance', emoji: '🌴',
    day: [0,1,2,3,4,5,6], hour: '22:30',
    apiSlug: 'caribe-noche',
    rdlSlug: 'caribe-noche',
    entity: 'Chance',
  },
  {
    id: 'cash3-n', name: 'Cash Three Noche', shortName: 'Cash3 N.',
    type: 'chance', emoji: '💵',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'cash-three-noche',
    rdlSlug: 'cash-three-noche',
    entity: 'Chance',
  },
  {
    id: 'costeño-n', name: 'El Costeño Noche', shortName: 'Costeño N.',
    type: 'chance', emoji: '🏖️',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'el-costeno-noche',
    rdlSlug: 'el-costeno-noche',
    entity: 'Chance',
  },
  {
    id: 'mano-n', name: 'La Mano Noche', shortName: 'La Mano N.',
    type: 'chance', emoji: '✋',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'la-mano-noche',
    rdlSlug: 'la-mano-noche',
    entity: 'Chance',
  },
  {
    id: 'pata-n', name: 'La Pata Noche', shortName: 'La Pata N.',
    type: 'chance', emoji: '🐾',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'la-pata-noche',
    rdlSlug: 'la-pata-noche',
    entity: 'Chance',
  },
  {
    id: 'pijao-n', name: 'Pijao de Oro Noche', shortName: 'Pijao N.',
    type: 'chance', emoji: '🥇',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'pijao-de-oro-noche',
    rdlSlug: 'pijao-de-oro-noche',
    entity: 'Chance',
  },
  {
    id: 'suertudo-n', name: 'El Suertudo Noche', shortName: 'Suertudo N.',
    type: 'chance', emoji: '🍀',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'el-suertudo-noche',
    rdlSlug: 'el-suertudo-noche',
    entity: 'Chance',
  },
  {
    id: 'paisita-n', name: 'Paisita Noche', shortName: 'Paisita N.',
    type: 'chance', emoji: '🏔️',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'paisita-noche',
    rdlSlug: 'paisita-noche',
    entity: 'Chance',
  },
  {
    id: 'motilón-n', name: 'El Motilón Noche', shortName: 'Motilón N.',
    type: 'chance', emoji: '🌾',
    day: [0,1,2,3,4,5,6], hour: '22:00',
    apiSlug: 'el-motilon-noche',
    rdlSlug: 'el-motilon-noche',
    entity: 'Chance',
  },

  // Super Astro
  {
    id: 'superastro-sol', name: 'Super Astro Sol', shortName: 'Astro Sol',
    type: 'chance', emoji: '☀️',
    day: [0,1,2,3,4,5,6], hour: '12:00',
    apiSlug: 'super-astro-sol',
    rdlSlug: 'super-astro-sol',
    entity: 'Chance',
  },
  {
    id: 'superastro-luna', name: 'Super Astro Luna', shortName: 'Astro Luna',
    type: 'chance', emoji: '🌙',
    day: [0,1,2,3,4,5,6], hour: '21:00',
    apiSlug: 'super-astro-luna',
    rdlSlug: 'super-astro-luna',
    entity: 'Chance',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function findInCatalog(nameOrSlug) {
  if (!nameOrSlug) return null;
  const q = nameOrSlug.toLowerCase().trim();
  return CATALOG.find(c =>
    c.id === q ||
    c.apiSlug === q ||
    c.rdlSlug === q ||
    c.name.toLowerCase().includes(q) ||
    c.shortName.toLowerCase().includes(q) ||
    q.includes(c.id) ||
    c.id.includes(q.replace(/\s+/g,'-'))
  ) || null;
}

function searchCatalog(query, typeFilter) {
  let list = CATALOG;
  if (typeFilter && typeFilter !== 'all') {
    list = CATALOG.filter(c => c.type === typeFilter);
  }
  if (!query || !query.trim()) return list;
  const q = removeDiacritics(query.toLowerCase().trim());
  return list.filter(c =>
    removeDiacritics(c.name.toLowerCase()).includes(q) ||
    removeDiacritics(c.shortName.toLowerCase()).includes(q) ||
    c.id.includes(q) ||
    c.apiSlug.includes(q) ||
    (c.entity && removeDiacritics(c.entity.toLowerCase()).includes(q))
  );
}

function getTodayCatalog() {
  const dow = new Date().getDay();
  return CATALOG.filter(c => c.day.includes(dow));
}

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Voice aliases
const VOICE_ALIASES = {
  'bogota':        ['bogotá','bogota','la capitalina'],
  'medellin':      ['medellín','medellin','paisa','antioqueña'],
  'baloto':        ['baloto','balota'],
  'boyaca':        ['boyacá','boyaca'],
  'huila':         ['huila'],
  'tolima':        ['tolima'],
  'manizales':     ['manizales','caldas'],
  'chance':        ['chance','chances','chanse'],
  'miloto':        ['miloto','mi loto'],
  'revancha':      ['revancha'],
  'cundinamarca':  ['cundinamarca','cundi'],
  'santander':     ['santander'],
  'narino':        ['nariño','narino'],
  'pacifico':      ['pacífico','pacifico'],
  'cruzroja':      ['cruz roja','cruzroja'],
  'extracolombia': ['extra','extra colombia'],
  'risaralda':     ['risaralda'],
  'cauca':         ['cauca'],
  'quindio':       ['quindío','quindio','armenia'],
  'putumayo':      ['putumayo'],
  'magdalena':     ['magdalena'],
};

function normalizeVoiceQuery(transcript) {
  const t = removeDiacritics(transcript.toLowerCase().trim());
  for (const [canonical, aliases] of Object.entries(VOICE_ALIASES)) {
    for (const alias of aliases) {
      if (t.includes(removeDiacritics(alias))) return canonical;
    }
  }
  return t;
}
