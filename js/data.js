'use strict';
/* =========================================================
   DATOS: tropas, enemigos, jefes, campaña y cofres
   ========================================================= */

var RARITY = {
  comun:      { name: 'Común',      color: '#9fb3c8' },
  rara:       { name: 'Rara',       color: '#4da3ff' },
  epica:      { name: 'Épica',      color: '#b26bff' },
  legendaria: { name: 'Legendaria', color: '#ffb020' }
};

/*
  Cada tropa:
   dmg: daño por disparo a rango 1 · rate: disparos por segundo
   proj: tipo de proyectil (para el dibujo)
   efectos opcionales: slow, poison, splash, chain, crit, stun, bossMult,
   manaGen (no dispara: genera maná), buff (no dispara: acelera vecinos),
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
  }
};
var UNIT_ORDER = ['lyra', 'brasa', 'nivea', 'doblon', 'rocco', 'volta', 'mirra', 'melodia', 'sombra', 'cronos', 'halcon', 'ulric'];
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

/* Campaña: 15 fases. hp: dureza de los monstruos · waves: oleadas (la última con jefe). */
var CAMPAIGN = [];
(function () {
  var names = ['Prado Verde', 'Colinas Suaves', 'Bosque Susurrante', 'Río Helado', 'Paso del Ogro',
    'Pantano Tóxico', 'Ruinas Antiguas', 'Desierto Rojo', 'Cañón del Eco', 'Picos Nevados',
    'Volcán Dormido', 'Torre Maldita', 'Cripta Profunda', 'Ciudadela Oscura', 'Trono del Caos'];
  var unlocks = { 2: 'volta', 3: 'mirra', 5: 'melodia', 7: 'sombra', 9: 'cronos', 11: 'halcon', 14: 'ulric' };
  for (var i = 0; i < 15; i++) {
    CAMPAIGN.push({
      id: i + 1,
      name: names[i],
      waves: 3 + Math.floor(i / 3),
      hp: 1 + i * 0.3 + Math.max(0, i - 7) * 0.12,
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

var CHESTS = {
  madera: { name: 'Cofre de madera', gold: [40, 80],   cards: 6,  rare: 0.15, epic: 0.03, legend: 0,     color: '#a0663a' },
  plata:  { name: 'Cofre de plata',  gold: [90, 160],  cards: 12, rare: 0.3,  epic: 0.08, legend: 0.01,  color: '#c9d4e6' },
  oro:    { name: 'Cofre de oro',    gold: [200, 320], cards: 24, rare: 0.4,  epic: 0.15, legend: 0.04,  color: '#ffd166' }
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
  aria:  { name: 'Aria',  title: 'Capitana de Escarcha', color: '#7fd6ff', icon: '🌨️', pic: 'assets/commanders/aria.webp', ability: 'Ventisca',  desc: 'Congela a todos los enemigos 3 segundos.', cd: 30 },
  merlo: { name: 'Merlo', title: 'Archimago',            color: '#b26bff', icon: '✨', pic: 'assets/commanders/merlo.webp', ability: 'Marea de maná', desc: 'Te da 120 de maná al instante.', cd: 35 },
  brann: { name: 'Brann', title: 'General Enano',        color: '#ff8f3c', icon: '☄️', pic: 'assets/commanders/brann.webp', ability: 'Meteoro',   desc: 'Un meteorito golpea a los enemigos más adelantados.', cd: 28 }
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
