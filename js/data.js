'use strict';
/* =========================================================
   DATOS: tropas, enemigos, jefes, campaña y cofres
   ========================================================= */

var RARITY = {
  comun:      { name: 'Común',      color: '#9fb3c8' },
  rara:       { name: 'Rara',       color: '#4da3ff' },
  epica:      { name: 'Épica',      color: '#b26bff' },
  legendaria: { name: 'Legendaria', color: '#ffb020' },
  mitica:     { name: 'Mítica',     color: '#ff3b6b' }
};

/*
  Cada tropa:
   dmg: daño por disparo a rango 1 · rate: disparos por segundo
   proj: tipo de proyectil (para el dibujo)
   efectos opcionales: slow, poison, splash, chain, crit, stun, bossMult,
   manaGen (no dispara: genera maná), buff (no dispara: acelera vecinos),
   pierce (ignora la armadura), bounty (maná extra por cada baja suya),
   target: 'first' | 'strong'
*/
var UNITS = {
  lyra: {
    element: 'naturaleza', name: 'Lyra', title: 'Arquera del Bosque', role: 'Daño', rarity: 'comun',
    color: '#3fbf6a', color2: '#b8f27a', skin: '#ffd9b8',
    dmg: 18, rate: 1.6, proj: 'arrow', target: 'first',
    desc: 'Dispara flechas muy rápido al primer enemigo de la fila.'
  },
  brasa: {
    element: 'fuego', name: 'Brasa', title: 'Piromante', role: 'Área', rarity: 'comun',
    color: '#ff5a2c', color2: '#ffc04a', skin: '#ffd2a6',
    dmg: 26, rate: 0.8, proj: 'fire', splash: 0.55, target: 'first',
    desc: 'Lanza bolas de fuego que queman a los enemigos cercanos.'
  },
  nivea: {
    element: 'hielo', name: 'Nívea', title: 'Hechicera de Escarcha', role: 'Ralentiza', rarity: 'comun',
    color: '#58c9ff', color2: '#e6f8ff', skin: '#e9f1ff',
    dmg: 9, rate: 1.0, proj: 'ice', slow: { pct: 0.12, max: 0.5, dur: 2.5 }, target: 'first',
    desc: 'Cada golpe congela un poco al enemigo: hasta un 50% más lento.'
  },
  doblon: {
    element: 'metal', name: 'Doblón', title: 'Mercader', role: 'Maná', rarity: 'comun',
    color: '#f2b632', color2: '#fff1a8', skin: '#f6c89c',
    manaGen: { every: 6, amount: 8 },
    desc: 'No ataca. Cada pocos segundos te da maná (más cuanto más rango).'
  },
  rocco: {
    element: 'fuego', name: 'Rocco', title: 'Cañonero Enano', role: 'Área', rarity: 'rara',
    color: '#a0663a', color2: '#ffb46a', skin: '#f0b98c',
    dmg: 44, rate: 0.5, proj: 'bomb', splash: 0.8, target: 'first',
    desc: 'Bombas lentas que revientan en una zona grande.'
  },
  volta: {
    element: 'arcano', name: 'Volta', title: 'Ingeniera Tesla', role: 'Cadena', rarity: 'rara',
    color: '#8c6bff', color2: '#fff07a', skin: '#ffe0c4',
    dmg: 16, rate: 1.0, proj: 'bolt', chain: 3, target: 'first',
    desc: 'Rayos que saltan entre varios enemigos.'
  },
  mirra: {
    element: 'naturaleza', name: 'Mirra', title: 'Alquimista', role: 'Veneno', rarity: 'rara',
    color: '#5fdc4a', color2: '#d4ff7a', skin: '#e8d7c0',
    dmg: 6, rate: 1.0, proj: 'poison', poison: { dps: 14, dur: 4 }, target: 'first',
    desc: 'Envenena: el daño se acumula y sigue haciendo efecto.'
  },
  melodia: {
    element: 'arcano', name: 'Melodía', title: 'Bardo', role: 'Apoyo', rarity: 'rara',
    color: '#ff6fb5', color2: '#ffd1ea', skin: '#ffdcc6',
    buff: { speed: 0.12 },
    desc: 'No ataca. Sus canciones aceleran a las tropas de alrededor.'
  },
  sombra: {
    element: 'arcano', name: 'Sombra', title: 'Asesina', role: 'Crítico', rarity: 'epica',
    color: '#5b3a9e', color2: '#ff4f7b', skin: '#d9c3e8',
    dmg: 22, rate: 1.2, proj: 'shadow', crit: { chance: 0.25, mult: 3 }, target: 'first',
    desc: 'Puñales rápidos con un 25% de golpe crítico triple.'
  },
  cronos: {
    element: 'metal', name: 'Cronos', title: 'Relojero', role: 'Aturde', rarity: 'epica',
    color: '#2bb5a8', color2: '#ffe6a3', skin: '#f2d2b0',
    dmg: 14, rate: 0.9, proj: 'gear', stun: { chance: 0.18, dur: 1.2 }, target: 'first',
    desc: 'Sus engranajes pueden detener el tiempo de un enemigo.'
  },
  halcon: {
    element: 'metal', name: 'Halcón', title: 'Francotirador', role: 'Daño único', rarity: 'epica',
    color: '#2f4c8f', color2: '#ffd166', skin: '#f1c9a5',
    dmg: 120, rate: 0.32, proj: 'bullet', target: 'strong',
    desc: 'Lento pero demoledor. Siempre apunta al enemigo con más vida.'
  },
  ulric: {
    element: 'hielo', name: 'Ulric', title: 'Paladín', role: 'Mata jefes', rarity: 'legendaria',
    color: '#c9d4e6', color2: '#ffd34d', skin: '#f3cfae',
    dmg: 30, rate: 0.9, proj: 'holy', bossMult: 3, target: 'strong',
    desc: 'Golpes sagrados que hacen el triple de daño a los jefes.'
  },
  // legendarias que solo salen en el cofre de oro (chestOnly); noArt: true para una tropa aún sin ilustración
  fenix: {
    element: 'fuego', name: 'Ígnea', title: 'Ave Fénix', role: 'Área ardiente', rarity: 'legendaria', chestOnly: true,
    color: '#ff7a1a', color2: '#ffe066', skin: '#ffd2a6',
    dmg: 36, rate: 0.75, proj: 'fire', splash: 0.7, poison: { dps: 18, dur: 4 }, target: 'first',
    desc: 'Llamaradas que arrasan una zona y dejan a los enemigos ardiendo.'
  },
  aurora: {
    element: 'arcano', name: 'Aurora', title: 'Archimaga', role: 'Tormenta', rarity: 'legendaria', chestOnly: true,
    color: '#6a4bd8', color2: '#9ff3ff', skin: '#f3dcc8',
    dmg: 22, rate: 0.9, proj: 'bolt', chain: 5, stun: { chance: 0.15, dur: 1 }, target: 'first',
    desc: 'Rayos que saltan entre muchos enemigos y a veces los dejan aturdidos.'
  },
  titan: {
    element: 'naturaleza', name: 'Titán', title: 'Gólem del Bosque', role: 'Rompe armaduras', rarity: 'legendaria', chestOnly: true,
    color: '#5a7a3a', color2: '#c8e66a', skin: '#a8a090',
    dmg: 88, rate: 0.45, proj: 'bomb', splash: 0.5, pierce: true, target: 'strong',
    desc: 'Martillazos que ignoran la armadura y sacuden la zona. Va a por el más fuerte.'
  },
  // míticas: solo en el cofre de oro, más raras que las legendarias
  boreas: {
    element: 'hielo', name: 'Bóreas', title: 'Dragón del Invierno', role: 'Ventisca', rarity: 'mitica', chestOnly: true, noArt: true,
    color: '#3fb8ff', color2: '#e6f8ff', skin: '#dff4ff',
    dmg: 34, rate: 0.85, proj: 'ice', splash: 0.65, slow: { pct: 0.2, max: 0.6, dur: 3 }, stun: { chance: 0.12, dur: 1.4 }, target: 'first',
    desc: 'Aliento helado que golpea una zona, frena muchísimo y a veces congela del todo.'
  },
  midas: {
    element: 'metal', name: 'Midas', title: 'Rey Dorado', role: 'Oro y daño', rarity: 'mitica', chestOnly: true, noArt: true,
    color: '#f2b632', color2: '#fff6c2', skin: '#f6c89c',
    dmg: 64, rate: 0.7, proj: 'holy', crit: { chance: 0.25, mult: 3 }, pierce: true, bounty: 4, target: 'strong',
    desc: 'Monedas de oro que atraviesan la armadura y pueden ser críticas. Cada baja suya te da maná extra.'
  }
};
var UNIT_ORDER = ['lyra', 'brasa', 'nivea', 'doblon', 'rocco', 'volta', 'mirra', 'melodia', 'sombra', 'cronos', 'halcon', 'ulric', 'fenix', 'aurora', 'titan', 'boreas', 'midas'];
UNIT_ORDER.forEach(function (id) { UNITS[id].id = id; });
// tropas que pueden usar los rivales y aliados de la máquina
var AI_UNITS = UNIT_ORDER.filter(function (id) { return !UNITS[id].chestOnly; });
var STARTER_UNITS = ['lyra', 'brasa', 'nivea', 'doblon', 'rocco'];

// multiplicador de daño por rango (fusión): cada rango ~doble
var RANK_MULT = [0, 1, 2.1, 4.4, 9, 18.5, 38, 78];
var MAX_RANK = 7;
// mejoras dentro de la partida (barra de mazo)
var POWER_COSTS = [0, 100, 200, 400, 700];
var POWER_MAX = 5;
var POWER_BONUS = 0.22;
// niveles permanentes de carta
var CARD_MAX = 10;
var CARD_BONUS = 0.08;
function cardsNeeded(lv) { return [0, 2, 4, 8, 12, 18, 26, 36, 50, 70][lv] || 999; }
function cardUpgradeGold(lv) { return [0, 40, 100, 200, 400, 700, 1100, 1700, 2600, 4000][lv] || 99999; }

var ENEMIES = {
  blob:  { name: 'Gelatina', color: '#6fd86a', hp: 1,   speed: 1,    size: 0.34, reward: 8 },
  imp:   { name: 'Diablillo', color: '#ff8a3c', hp: 0.6, speed: 1.75, size: 0.28, reward: 7 },
  brute: { name: 'Ogro',     color: '#8f8fb0', hp: 3.2, speed: 0.62, size: 0.44, reward: 18, armor: 0.25 },
  ghost: { name: 'Espectro', color: '#b6a6ff', hp: 0.9, speed: 1.2,  size: 0.3,  reward: 9, dodge: 0.2 },
  orco:  { name: 'Orco',     color: '#7fae3a', hp: 2,   speed: 0.95, size: 0.38, reward: 12 },
  rocoso:   { name: 'Rocoso',            color: '#6b6670', hp: 4.6, speed: 0.48, size: 0.42, reward: 22, armor: 0.4 },
  escarcha: { name: 'Gólem de escarcha', color: '#7fd6ff', hp: 2.6, speed: 0.8,  size: 0.4,  reward: 16, slowRes: 0.6 }
};
var BOSSES = {
  rey:      { name: 'Rey Gelatina',     color: '#3ea6ff', hp: 26, speed: 0.55, ability: 'split',  desc: 'Al morir se divide en gelatinas.' },
  gelido:   { name: 'Señor Gélido',     color: '#8fe3ff', hp: 24, speed: 0.6,  ability: 'freeze', desc: 'Congela tus tropas y llama a gólems de escarcha.' },
  coloso:   { name: 'Coloso',           color: '#9a9aa8', hp: 34, speed: 0.45, ability: 'shield', desc: 'Se blinda con un escudo y llama a rocosos.' },
  nigro:    { name: 'Nigromante',       color: '#9b5cff', hp: 24, speed: 0.55, ability: 'summon', desc: 'Invoca espectros sin parar.' },
  dragon:   { name: 'Dragón Carmesí',   color: '#ff4b2b', hp: 30, speed: 0.65, ability: 'burn',   desc: 'Quema una tropa, que pierde un rango.' }
};
var BOSS_ORDER = ['rey', 'gelido', 'coloso', 'nigro', 'dragon'];

/* Campaña: 15 fases. hp: dureza de los monstruos (se alcanza del todo en la
   última oleada; la primera llega más suave, ver hpScale) · waves: oleadas
   (la última con jefe) · mana: maná con el que empiezas. */
var CAMPAIGN = [];
(function () {
  var names = ['Prado Verde', 'Colinas Suaves', 'Bosque Susurrante', 'Río Helado', 'Paso del Ogro',
    'Pantano Tóxico', 'Ruinas Antiguas', 'Desierto Rojo', 'Cañón del Eco', 'Picos Nevados',
    'Volcán Dormido', 'Torre Maldita', 'Cripta Profunda', 'Ciudadela Oscura', 'Trono del Caos'];
  var unlocks = { 2: 'volta', 3: 'mirra', 4: 'melodia', 6: 'sombra', 8: 'cronos', 10: 'halcon', 12: 'ulric' };
  for (var i = 0; i < 15; i++) {
    CAMPAIGN.push({
      id: i + 1,
      name: names[i],
      waves: 3 + Math.floor(i / 3),
      hp: 1.2 + i * 0.38 - Math.max(0, i - 7) * 0.06,
      mana: 100 + i * 10,
      boss: BOSS_ORDER[i % BOSS_ORDER.length],
      unlock: unlocks[i + 1] || null,
      gold: 60 + i * 25,
      biome: ['prado', 'prado', 'bosque', 'hielo', 'prado', 'pantano', 'ruinas', 'desierto', 'desierto', 'hielo', 'volcan', 'ruinas', 'cripta', 'cripta', 'volcan'][i]
    });
  }
})();

var BIOMES = {
  prado:    { grass: '#5fbf5a', grass2: '#55b350', path: '#e6c78c', path2: '#d8b879', frame: '#8a6a45', bg: '#3c8d4b' },
  bosque:   { grass: '#3f9e58', grass2: '#388f4f', path: '#cfae7a', path2: '#bf9e6b', frame: '#6b4a2b', bg: '#245c35' },
  hielo:    { grass: '#cfe8f5', grass2: '#bfdcec', path: '#8fb6d4', path2: '#7fa6c4', frame: '#5a7a96', bg: '#6d9ab8' },
  pantano:  { grass: '#5c8a4a', grass2: '#527d42', path: '#8a7a55', path2: '#7c6d4a', frame: '#4a3d24', bg: '#2f4a2a' },
  ruinas:   { grass: '#9aa0a8', grass2: '#8e949c', path: '#d9cfb8', path2: '#cbc0a8', frame: '#5e5a54', bg: '#4b4e56' },
  desierto: { grass: '#f0c878', grass2: '#e6bc6a', path: '#c99a5a', path2: '#bb8c4e', frame: '#8a5a2c', bg: '#c48a44' },
  volcan:   { grass: '#5a3a36', grass2: '#4e322f', path: '#2c1e1c', path2: '#241816', frame: '#ff6a2a', bg: '#2a1412' },
  cripta:   { grass: '#4a4470', grass2: '#423c66', path: '#6d628f', path2: '#615782', frame: '#c9a2ff', bg: '#1d1838' }
};

// rare / epic / legend: probabilidad por carta (puede salir cualquier tropa, aunque no la tengas;
// las legendarias y las míticas (myth) solo en el cofre de oro)
// gems: gemas que trae el cofre · price: lo que cuesta en la tienda (en gemas)
// time: segundos que tarda en desbloquearse en los huecos de la pantalla principal
var CHESTS = {
  madera: { name: 'Cofre de madera', gold: [40, 80],   gems: [0, 2],  cards: 6,  rare: 0.15, epic: 0.03, legend: 0,    myth: 0,     color: '#a0663a', price: 15, time: 300 },
  plata:  { name: 'Cofre de plata',  gold: [90, 160],  gems: [1, 4],  cards: 12, rare: 0.3,  epic: 0.08, legend: 0,    myth: 0,     color: '#c9d4e6', price: 40, time: 3600 },
  oro:    { name: 'Cofre de oro',    gold: [200, 320], gems: [4, 10], cards: 24, rare: 0.4,  epic: 0.15, legend: 0.04, myth: 0.008, color: '#ffd166', price: 90, time: 10800 }
};
var CHEST_ORDER = ['madera', 'plata', 'oro'];
var CHEST_SLOTS = 4;          // huecos de cofre de la pantalla principal
var SKIP_SECONDS = 360;       // abrir ya: 1 gema por cada 6 minutos que falten

/* Tienda: ofertas de cartas que cambian cada día (cada una se compra una vez)
   y oro a cambio de gemas. n: cartas por oferta · gold / gems: precio. */
var SHOP_CARDS = {
  comun:      { n: 10, gold: 120 },
  rara:       { n: 5,  gold: 260 },
  epica:      { n: 2,  gold: 520,  gems: 30 },
  legendaria: { n: 1,  gold: 1400, gems: 90 },
  mitica:     { n: 1,  gold: 4000, gems: 220 }
};
var SHOP_GOLD = [
  { gold: 300,  gems: 25 },
  { gold: 1000, gems: 70 },
  { gold: 3000, gems: 180 }
];

/* Códigos de regalo: se canjean una vez cada uno (en mayúsculas, sin espacios).
   gold / gems: cantidad · chest: tipo de cofre que se abre al canjearlo. */
var CODES = {
  BIENVENIDA:    { gold: 500, gems: 50 },
  REINODETORRES: { chest: 'oro' },
  GEMAS:         { gems: 30 },
  FUSION:        { gold: 400 }
};

/* Afinidad: cada tropa vecina (arriba/abajo/izquierda/derecha) del mismo
   elemento da +AFFINITY_BONUS de daño. */
var ELEMENTS = {
  fuego:      { name: 'Fuego',      icon: '🔥', color: '#ff6a2c' },
  hielo:      { name: 'Hielo',      icon: '❄️', color: '#7fd6ff' },
  naturaleza: { name: 'Naturaleza', icon: '🌿', color: '#5fdc4a' },
  arcano:     { name: 'Arcano',     icon: '🔮', color: '#b26bff' },
  metal:      { name: 'Metal',      icon: '⚙️', color: '#ffd166' }
};
var AFFINITY_BONUS = 0.12;

/* Casillas especiales del tablero: cambian en cada partida. */
var TILES = {
  altar:   { name: 'Altar',   icon: '⚔️', color: '#ff5a6a', desc: '+35% de daño a la tropa que esté encima.', dmg: 0.35 },
  fuente:  { name: 'Fuente',  icon: '💧', color: '#4ecdc4', desc: 'La tropa que esté encima genera 1 de maná por segundo.', mana: 1 },
  atalaya: { name: 'Atalaya', icon: '🏹', color: '#ffd166', desc: '+30% de velocidad de ataque.', speed: 0.3 }
};

/* Comandantes: habilidad que se carga con el tiempo. */
var COMMANDERS = {
  aria:  { name: 'Aria',  title: 'Capitana de Escarcha', color: '#7fd6ff', icon: '🌨️', pic: 'assets/commanders/aria.webp?v=2', ability: 'Ventisca',  desc: 'Congela a todos los enemigos 3 segundos.', cd: 30 },
  merlo: { name: 'Merlo', title: 'Archimago',            color: '#b26bff', icon: '✨', pic: 'assets/commanders/merlo.webp?v=2', ability: 'Marea de maná', desc: 'Te da 120 de maná al instante.', cd: 35 },
  brann: { name: 'Brann', title: 'General Enano',        color: '#ff8f3c', icon: '☄️', pic: 'assets/commanders/brann.webp?v=2', ability: 'Meteoro',   desc: 'Un meteorito golpea a los enemigos más adelantados.', cd: 28 }
};
var COMMANDER_ORDER = ['aria', 'merlo', 'brann'];

/* Eventos que pueden tocar al empezar una oleada (a partir de la 3). */
var WAVE_EVENTS = [
  { id: 'eclipse', name: 'Eclipse', pic: 'assets/events/eclipse.webp',        icon: '🌑', desc: 'Los monstruos van un 25% más rápido.' },
  { id: 'lluvia',  name: 'Lluvia de maná', pic: 'assets/events/lluvia.webp', icon: '🌧️', desc: 'Cada baja da el doble de maná.' },
  { id: 'niebla',  name: 'Niebla', pic: 'assets/events/niebla.webp',         icon: '🌫️', desc: 'Los espectros esquivan más.' },
  { id: 'horda',   name: 'Horda', pic: 'assets/events/horda.webp',          icon: '👹', desc: 'Llegan un 40% más de monstruos, más débiles.' },
  { id: 'calma',   name: 'Calma', pic: 'assets/events/calma.webp',          icon: '🍃', desc: 'Monstruos más lentos esta oleada.' }
];
