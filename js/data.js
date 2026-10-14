'use strict';
/* =========================================================
   DATOS: tropas, enemigos, jefes, campaña y cofres
   ========================================================= */

/* Paleta del juego (la misma que las variables de :root en style.css):
   tinta de los contornos, maná, vida, daño, oro, y el color de cada elemento
   y rareza. color: bordes y fondos de carta y tienda · glow: brillos y textos. */
var GAME_PALETTE = {
  ink: '#1a1430',
  manaBlue: '#3fb8ff',
  healthGreen: '#2fae3a',
  damageRed: '#ff4f7b',
  goldYellow: '#f2b632',
  elements: { naturaleza: '#3fbf6a', fuego: '#ff5a2c', hielo: '#58c9ff', metal: '#f2b632', arcano: '#8c6bff' },
  rarities: { comun: '#7a8399', rara: '#1f74e0', epica: '#8c6bff', mitica: '#ff4f7b', legendaria: '#ffd700' },
  rarityGlow: { comun: '#b8bfd0', rara: '#6fc3ff', epica: '#ab83ff', mitica: '#ff7af6', legendaria: '#ffd34d' }
};
// el orden de las claves es el que se ve en la colección (filtros y orden de las cartas):
// la mítica va antes que la legendaria
var RARITY = {
  comun:      { name: 'Común' },
  rara:       { name: 'Rara' },
  epica:      { name: 'Épica' },
  mitica:     { name: 'Mítica' },
  legendaria: { name: 'Legendaria' }
};
Object.keys(RARITY).forEach(function (k) { RARITY[k].color = GAME_PALETTE.rarities[k]; RARITY[k].glow = GAME_PALETTE.rarityGlow[k]; });

/*
  Cada tropa:
   dmg: daño por disparo a rango 1 · rate: disparos por segundo
   proj: tipo de proyectil (para el dibujo)
   efectos opcionales: slow, poison, splash, chain, crit, stun, bossMult,
   manaGen (no dispara: genera maná), buff (no dispara: acelera vecinos),
   pierce (ignora la armadura), bounty (maná extra por cada baja suya),
   wild (comodín de fusión), interest (intereses del maná), wolves (lobos por el camino),
   stunPic / critPic (dibujo que salta sobre el enemigo al aturdirlo o con un crítico),
   target: 'first' | 'strong'
*/
var UNITS = {
  lyra: {
    element: 'naturaleza', name: 'Lyra', title: 'Arquera del Bosque', role: 'Daño', rarity: 'comun',
    color: '#3fbf6a', color2: '#b8f27a', skin: '#ffd9b8',
    dmg: 24, rate: 1.6, proj: 'arrow', target: 'first',
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
    dmg: 22, rate: 1.0, proj: 'ice', slow: { pct: 0.12, max: 0.5, dur: 2.5 }, twin: 0.6, target: 'first',
    desc: 'Cada golpe congela un poco al enemigo: hasta un 50% más lento. Pega mucho más con otra Nívea al lado.'
  },
  doblon: {
    element: 'metal', name: 'Doblón', title: 'Mercader', role: 'Maná', rarity: 'comun',
    color: '#f2b632', color2: '#fff1a8', skin: '#f6c89c',
    manaGen: { every: 6, amount: 10 },
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
    dmg: 6, rate: 1.0, proj: 'poison', poison: { dps: 22, dur: 4, area: 0.55 }, mixed: 0.25, target: 'first',
    desc: 'Su frasco estalla en una nube tóxica que envenena también a los de alrededor. Cuantas más tropas distintas tenga al lado, más fuerte es la mezcla.'
  },
  melodia: {
    element: 'arcano', name: 'Melodía', title: 'Bardo', role: 'Apoyo', rarity: 'rara',
    color: '#ff6fb5', color2: '#ffd1ea', skin: '#ffdcc6',
    buff: { speed: 0.2 },
    desc: 'No ataca. Sus canciones aceleran a las tropas de alrededor.'
  },
  kaia: {
    element: 'naturaleza', name: 'Kaia', title: 'Exploradora', role: 'Solitaria', rarity: 'rara',
    color: '#7a9a3a', color2: '#e8f28a', skin: '#f0c9a0',
    dmg: 40, rate: 1.2, proj: 'arrow', lone: 0.8, target: 'first',
    desc: 'Caza mejor sola: si no tiene ninguna tropa al lado, pega muchísimo más.'
  },
  sombra: {
    element: 'arcano', name: 'Sombra', title: 'Asesina', role: 'Crítico', rarity: 'epica',
    color: '#5b3a9e', color2: '#ff4f7b', skin: '#d9c3e8',
    dmg: 26, rate: 1.2, proj: 'shadow', crit: { chance: 0.3, mult: 3 }, target: 'first',
    desc: 'Puñales rápidos con un 30% de golpe crítico triple.'
  },
  cronos: {
    element: 'metal', name: 'Cronos', title: 'Relojero', role: 'Aturde', rarity: 'epica',
    color: '#2bb5a8', color2: '#ffe6a3', skin: '#f2d2b0',
    dmg: 34, rate: 0.9, proj: 'gear', stun: { chance: 0.26, dur: 1.2 }, mixed: 0.25, target: 'first',
    desc: 'Sus engranajes pueden detener el tiempo de un enemigo. Cada vecina distinta le da cuerda y pega más.'
  },
  halcon: {
    element: 'metal', name: 'Halcón', title: 'Francotirador', role: 'Daño único', rarity: 'epica',
    color: '#2f4c8f', color2: '#ffd166', skin: '#f1c9a5',
    dmg: 130, rate: 0.32, proj: 'bullet', edge: 0.6, target: 'strong',
    desc: 'Lento pero demoledor. Siempre apunta al enemigo con más vida y en las casillas de fuera tiene mejor tiro.'
  },
  // wild: comodín de fusión (echo: probabilidad de subir dos rangos al fusionarse)
  eco: {
    element: 'arcano', name: 'Eco', title: 'Imitadora', role: 'Comodín', rarity: 'epica',
    color: '#b48bff', color2: '#f0e6ff', skin: '#efe2ff',
    wild: { echo: 0.1 },
    desc: 'No ataca. Se fusiona con cualquier tropa de su mismo rango y se convierte en ella. A veces resuena y la tropa sube dos rangos.'
  },
  // interest: cada every segundos da pct del maná guardado (tope: cap por rango)
  oria: {
    element: 'metal', name: 'Oria', title: 'Banquera', role: 'Intereses', rarity: 'epica',
    color: '#e0b040', color2: '#fff3c4', skin: '#f3cfae',
    interest: { every: 5, pct: 0.03, cap: 12 },
    desc: 'No ataca. Cada 5 segundos te da un 3% del maná que tengas guardado, con un tope. Cuanto más ahorras, más gana.'
  },
  ulric: {
    element: 'hielo', name: 'Ulric', title: 'Paladín', role: 'Mata jefes', rarity: 'legendaria',
    color: '#c9d4e6', color2: '#ffd34d', skin: '#f3cfae',
    dmg: 66, rate: 0.95, proj: 'holy', bossMult: 4, target: 'strong',
    desc: 'Golpes sagrados que hacen el cuádruple de daño a los jefes.'
  },
  // legendarias que solo salen en el cofre de oro (chestOnly); noArt: true para una tropa aún sin ilustración
  fenix: {
    element: 'fuego', name: 'Ígnea', title: 'Ave Fénix', role: 'Área ardiente', rarity: 'legendaria', chestOnly: true,
    color: '#ff7a1a', color2: '#ffe066', skin: '#ffd2a6',
    dmg: 48, rate: 0.75, proj: 'fire', splash: 0.7, poison: { dps: 20, dur: 4 }, target: 'first',
    desc: 'Llamaradas que arrasan una zona y dejan a los enemigos ardiendo.'
  },
  aurora: {
    element: 'arcano', name: 'Aurora', title: 'Archimaga', role: 'Tormenta', rarity: 'legendaria', chestOnly: true,
    color: '#6a4bd8', color2: '#9ff3ff', skin: '#f3dcc8',
    dmg: 22, rate: 0.9, proj: 'bolt', chain: 4, stun: { chance: 0.15, dur: 1 }, target: 'first',
    desc: 'Rayos que saltan entre muchos enemigos y a veces los dejan aturdidos.'
  },
  titan: {
    element: 'naturaleza', name: 'Titán', title: 'Gólem del Bosque', role: 'Rompe armaduras', rarity: 'legendaria', chestOnly: true,
    color: '#5a7a3a', color2: '#c8e66a', skin: '#a8a090',
    dmg: 88, rate: 0.45, proj: 'bomb', splash: 0.5, pierce: true, target: 'strong',
    desc: 'Martillazos que ignoran la armadura y sacuden la zona. Va a por el más fuerte.'
  },
  // míticas: solo en el cofre de oro; entre la épica y la legendaria
  boreas: {
    element: 'hielo', name: 'Bóreas', title: 'Dragón del Invierno', role: 'Ventisca', rarity: 'mitica', chestOnly: true,
    color: '#3fb8ff', color2: '#e6f8ff', skin: '#dff4ff',
    dmg: 34, rate: 0.85, proj: 'ice', splash: 0.65, slow: { pct: 0.2, max: 0.6, dur: 3 }, stun: { chance: 0.12, dur: 1.4 }, stunPic: 'fx/boreas-ventisca', target: 'first',
    desc: 'Aliento helado que golpea una zona, frena muchísimo y a veces congela del todo.'
  },
  midas: {
    element: 'metal', name: 'Midas', title: 'Rey Dorado', role: 'Oro y daño', rarity: 'mitica', chestOnly: true,
    color: '#f2b632', color2: '#fff6c2', skin: '#f6c89c',
    dmg: 64, rate: 0.7, proj: 'coin', crit: { chance: 0.25, mult: 3 }, critPic: 'fx/midas-critico', pierce: true, bounty: 4, target: 'strong',
    desc: 'Monedas de oro que atraviesan la armadura y pueden ser críticas. Cada baja suya te da maná extra.'
  },
  seren: {
    element: 'arcano', name: 'Seren', title: 'Guardiana Astral', role: 'Ejecuta', rarity: 'mitica', chestOnly: true,
    color: '#7b6bff', color2: '#e6e1ff', skin: '#efe2ff',
    dmg: 58, rate: 0.9, proj: 'holy', execute: 0.25, target: 'first',
    desc: 'Estrellas que rematan: cualquier monstruo que no sea jefe y baje del 25% de vida cae al instante.'
  },
  // wolves: no dispara; suelta lobos que recorren el camino al revés (bites: mordiscos por lobo, speed: rapidez)
  garra: {
    element: 'naturaleza', name: 'Garra', title: 'Domadora de Lobos', role: 'Manada', rarity: 'mitica', chestOnly: true,
    color: '#8a6a4a', color2: '#e8d9b0', skin: '#f0c9a0',
    dmg: 80, rate: 0.28, wolves: { bites: 3, speed: 2.2 }, target: 'first',
    desc: 'No dispara: suelta lobos que recorren el camino al revés y muerden a los monstruos que se cruzan. Con más rango, más mordiscos.'
  }
};
var UNIT_ORDER = ['lyra', 'brasa', 'nivea', 'doblon', 'rocco', 'volta', 'mirra', 'melodia', 'kaia', 'sombra', 'cronos', 'halcon', 'eco', 'oria', 'ulric', 'fenix', 'aurora', 'titan', 'boreas', 'midas', 'seren', 'garra'];
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
/* Torneo: tus cartas y las del rival, todas al nivel de torneo de su rareza
   (con la misma fuerza más o menos: común 8 = rara 6 = épica 4 = mítica 2 =
   legendaria 1) y los dos comandantes al mismo nivel. */
var TOURNEY_LV = { comun: 8, rara: 6, epica: 4, mitica: 2, legendaria: 1 };
var TOURNEY_CMD_LV = 5;
function tourneyLevels() {
  var o = {};
  UNIT_ORDER.forEach(function (id) { o[id] = TOURNEY_LV[UNITS[id].rarity]; });
  return o;
}

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

/* Campaña: 30 fases. hp: dureza de los monstruos (se alcanza del todo en la
   última oleada; la primera llega más suave, ver hpScale) · waves: oleadas
   (la última con jefe; 9 como mucho) · mana: maná con el que empiezas.
   No da tropas: las tropas nuevas solo salen en los cofres (y la tienda). */
var CAMPAIGN = [];
(function () {
  var names = ['Prado Verde', 'Colinas Suaves', 'Bosque Susurrante', 'Río Helado', 'Paso del Ogro',
    'Pantano Tóxico', 'Ruinas Antiguas', 'Desierto Rojo', 'Cañón del Eco', 'Picos Nevados',
    'Volcán Dormido', 'Torre Maldita', 'Cripta Profunda', 'Ciudadela Oscura', 'Trono del Caos',
    'Lagos Cristalinos', 'Bosque Sombrío', 'Minas Olvidadas', 'Dunas Ardientes', 'Glaciar Eterno',
    'Ciénaga Maldita', 'Templo Hundido', 'Fortaleza de Hierro', 'Cumbres de Ceniza', 'Abismo Helado',
    'Jardín de Espinas', 'Catacumbas Reales', 'Puerto Fantasma', 'Cráter del Dragón', 'Corona del Caos',
    'Puertas del Eclipse', 'Bosque de Ceniza', 'Lago Negro', 'Santuario Roto', 'Glaciar Sombrío',
    'Ciudad Hundida', 'Forja del Titán', 'Pantano de las Almas', 'Torre del Eclipse', 'Trono del Rey Dragón'];
  var biomes = ['prado', 'prado', 'bosque', 'hielo', 'prado', 'pantano', 'ruinas', 'desierto', 'desierto', 'hielo', 'volcan', 'ruinas', 'cripta', 'cripta', 'volcan',
    'hielo', 'bosque', 'ruinas', 'desierto', 'hielo', 'pantano', 'ruinas', 'ruinas', 'volcan', 'hielo', 'bosque', 'cripta', 'cripta', 'volcan', 'volcan',
    'cripta', 'volcan', 'pantano', 'ruinas', 'hielo', 'ruinas', 'volcan', 'pantano', 'cripta', 'volcan'];
  for (var i = 0; i < names.length; i++) {
    CAMPAIGN.push({
      id: i + 1,
      name: names[i],
      waves: Math.min(9, 3 + Math.floor(i / 3)),
      // a partir de la fase 16 la dureza sube más despacio
      hp: 1.2 + Math.min(i, 14) * 0.38 - Math.max(0, Math.min(i, 14) - 7) * 0.06 + Math.max(0, i - 14) * 0.18,
      mana: 100 + i * 10,
      boss: BOSS_ORDER[i % BOSS_ORDER.length],
      gold: 60 + i * 25,
      biome: biomes[i]
    });
  }
})();

/* Zonas de la campaña, de 10 fases cada una. chest: el cofre que da ganar
   una fase de la zona; si consigues estrellas nuevas, el siguiente (CHEST_UP).
   Así repetir la fase 1 ya no da el mismo cofre que la 30. */
var CAMPAIGN_ZONES = [
  { name: 'Valle del Reino',    from: 1,  to: 10, chest: 'madera', color: '#7fd84a' },
  { name: 'Fronteras Salvajes', from: 11, to: 20, chest: 'plata',  color: '#7fd6ff' },
  { name: 'Dominios del Caos',  from: 21, to: 30, chest: 'oro',    color: '#ff6a2a' },
  { name: 'Tierras del Eclipse', from: 31, to: 40, chest: 'oro',   color: '#c04bff' }
];
var CHEST_UP = { madera: 'plata', plata: 'oro', oro: 'oro' };
function stageZone(id) { return CAMPAIGN_ZONES.filter(function (z) { return id >= z.from && id <= z.to; })[0] || CAMPAIGN_ZONES[CAMPAIGN_ZONES.length - 1]; }
function stageChest(id, newStars) { var c = stageZone(id).chest; return newStars ? CHEST_UP[c] : c; }

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
// las míticas (myth) y las legendarias, la más rara, solo en el cofre de oro)
// gems: gemas que trae el cofre · price: lo que cuesta en la tienda (en gemas)
// time: segundos que tarda en desbloquearse en los huecos de la pantalla principal
var CHESTS = {
  madera: { name: 'Cofre de madera', gold: [40, 80],   gems: [0, 2],  cards: 6,  rare: 0.15, epic: 0.03, legend: 0,    myth: 0,     color: '#a0663a', price: 15, time: 300 },
  plata:  { name: 'Cofre de plata',  gold: [90, 160],  gems: [1, 4],  cards: 12, rare: 0.3,  epic: 0.08, legend: 0,    myth: 0,     color: '#c9d4e6', price: 40, time: 3600 },
  // oro: las cartas se reparten entre pocas tropas (types: cuántas de cada rareza
  // pueden tocar) y, con cmdChance, trae también cmdCards cartas de un comandante
  oro:    { name: 'Cofre de oro',    gold: [200, 320], gems: [4, 10], cards: 24, rare: 0.4,  epic: 0.15, legend: 0.012, myth: 0.04, color: '#ffd166', price: 90, time: 10800,
    types: { comun: 2, rara: 2, epica: 1, mitica: 1, legendaria: 1 }, cmdChance: 0.5, cmdCards: 4 },
  // de comandante: muchas cartas, todas de un mismo comandante al azar (cmd: true)
  // legendario: solo en la tienda; una carta legendaria al azar y nada más.
  legendario: { name: 'Cofre legendario', gold: [0, 0], gems: [0, 0], cards: 1, legendOnly: true, rare: 0, epic: 0, legend: 1, myth: 0, color: '#3fd0ff', price: 500, time: 10800 },
  comandante: { name: 'Cofre de comandante', gold: [30, 60], gems: [0, 1], cards: 10, cmd: true, rare: 0, epic: 0, legend: 0, myth: 0, color: '#a35bff', price: 60, time: 7200 }
};
var CHEST_ORDER = ['madera', 'plata', 'oro', 'comandante', 'legendario'];
// todos los cofres tienen su imagen abriéndose (assets/chests/<tipo>-abriendo)
CHEST_ORDER.forEach(function (k) { CHESTS[k].mid = 'assets/chests/' + k + '-abriendo.webp?v=2'; });
/* Garantía del cofre de oro: si llevas PITY_GOLD cofres de oro seguidos sin
   ninguna mítica ni legendaria, el siguiente trae una mítica segura
   (meta.pity cuenta los que van sin ninguna). */
var PITY_GOLD = 8;
var CHEST_SLOTS = 4;          // huecos de cofre de la pantalla principal
var SKIP_SECONDS = 360;       // abrir ya: 1 gema por cada 6 minutos que falten

/* Tienda: ofertas de cartas que cambian cada día (cada una se compra una vez)
   y oro a cambio de gemas. n: cartas por oferta · gold / gems: precio. */
var SHOP_CARDS = {
  comun:      { n: 10, gold: 120 },
  rara:       { n: 5,  gold: 260 },
  epica:      { n: 2,  gold: 520,  gems: 30 },
  mitica:     { n: 1,  gold: 1400, gems: 90 },
  legendaria: { n: 1,  gold: 3000, gems: 160 }
};
/* Ruleta de la tienda: una tirada gratis al día y, después, otras por
   WHEEL_EXTRA_GEMS gemas. w: peso de cada premio (más alto, más fácil) ·
   cards: cartas de una tropa al azar de esa rareza · cmd: cartas de un
   comandante al azar · col: color de su casilla. */
var WHEEL_PRIZES = [
  { gold: 60,  w: 20, col: '#f2b632' },
  { gems: 5,   w: 14, col: '#3fb8ff' },
  { chest: 'madera', w: 12, col: '#a0663a' },
  { gold: 180, w: 13, col: '#ffcf4a' },
  { cards: 'rara', n: 3, w: 9, col: '#1f74e0' },
  { gems: 15,  w: 6,  col: '#58c9ff' },
  { chest: 'plata', w: 7, col: '#9aa7b8' },
  { gold: 450, w: 5,  col: '#ffe066' },
  { cards: 'epica', n: 1, w: 4, col: '#8c6bff' },
  { cmd: 2,    w: 4,  col: '#c04bff' },
  { chest: 'oro', w: 2, col: '#ffd700' },
  { gems: 50,  w: 1.5, col: '#7fe3ff' }
];
var WHEEL_EXTRA_GEMS = 10;
var SHOP_GOLD = [
  { gold: 300,  gems: 25 },
  { gold: 1000, gems: 70 },
  { gold: 3000, gems: 180 }
];

/* Códigos de regalo: se canjean una vez cada uno. Se guardan como huella
   SHA-256 del código en mayúsculas y sin espacios (así no se leen en el
   código del juego). Para añadir uno: la huella del texto y su premio.
   gold / gems: cantidad · chest: tipo de cofre que se abre al canjearlo. */
var CODES = {
  '0a53889993db4a2a580275582d42ce3294e95b605e42af39d2ec2c78d88abac9': { gold: 500, gems: 50 },
  '941681e1010f15496320554974d321f276759bb95545d33accede6a0b0def20a': { chest: 'oro' },
  '2e58ab21fd2998963cb4668692dadbd7a657013552b31674da6be370919d3d78': { gems: 30 },
  '10dc77720c8fef1d706ddd79cfc6d6515990c58d338a2881dcdd8b0ff931cb4d': { gems: 100 },
  'e739bbf58ca177dc7e362fee47a12accc554bea13347fdb0b271429111fddc97': { gems: 15000 },
  '8c4557908504f60bf10af97ea6d82eced9de6ea638a2c86abc43b713adef1a20': { gems: 250 },
  '0c7141e6a68286482ff42b50a2b5e371bf44534c2b05971b91e7e3d9e53e5027': { gems: 500 },
  'e675b0857b3a616cfaea9d3617a21ecaf1a7b3c5b67bb637797f4b3afe1577ee': { gems: 150 },
  'd814714034eb9e32a223ac0000ffcfffed2fb7d85e0b2a623bb0218c59e33d41': { gold: 400 }
};

/* Arenas del 1 contra 1: se llega con los trofeos que tienes (at). Cada una
   juega en su tablero (field, de FIELDS en js/board.js) y suma ARENA_GOLD de
   oro a cada victoria por cada arena por encima de la primera. */
var ARENAS = [
  { name: 'Prado del Reino',  at: 0,    field: 'prado' },
  { name: 'Pantano Tóxico',   at: 300,  field: 'veneno' },
  { name: 'Ruinas de Piedra', at: 700,  field: 'roca' },
  { name: 'Glaciar Eterno',   at: 1200, field: 'hielo' },
  { name: 'Río de Lava',      at: 1800, field: 'lava2' }
];
var ARENA_GOLD = 20;
/* Trofeos del 1 contra 1 según la arena: contra el rival fácil se gana cada
   vez menos al subir de arena (si no, se subía sin límite ganando al fácil),
   el normal baja algo y el difícil siempre da lo mismo. Perder quita más
   cuanto más alta es la arena. */
function duelTrophies(level, arena) { return [Math.max(5, 25 - 5 * arena), Math.max(15, 30 - 3 * arena), 35][level]; }
function duelLoss(arena) { return 15 + 2 * arena; }

/* Camino de trofeos: un premio en cada parada (at: trofeos). Se cobran una
   vez, al llegar a ese récord de trofeos (aunque luego bajes).
   gold / gems · chest: cofre que se abre al cobrarlo · cards: { rarity, n },
   cartas de una tropa al azar de esa rareza (la desbloquea si no la tienes) ·
   arena: índice de ARENAS que se abre en esa parada. */
var TROPHY_ROAD = [
  { at: 100,  gold: 300 },
  { at: 200,  chest: 'plata' },
  { at: 300,  gems: 20, arena: 1 },
  { at: 400,  cards: { rarity: 'rara', n: 6 } },
  { at: 500,  chest: 'oro' },
  { at: 600,  gold: 800 },
  { at: 700,  gems: 40, arena: 2 },
  { at: 800,  cards: { rarity: 'epica', n: 3 } },
  { at: 900,  chest: 'comandante' },
  { at: 1000, chest: 'oro' },
  { at: 1100, gold: 1500 },
  { at: 1200, gems: 60, arena: 3 },
  { at: 1300, cards: { rarity: 'epica', n: 5 } },
  { at: 1400, chest: 'comandante' },
  { at: 1500, cards: { rarity: 'mitica', n: 1 } },
  { at: 1600, gold: 2500 },
  { at: 1800, gems: 100, arena: 4 },
  { at: 2000, chest: 'oro' },
  { at: 2200, chest: 'comandante' },
  { at: 2500, cards: { rarity: 'legendaria', n: 1 } }
];

/* Misiones diarias: cada día tocan 3 distintas (semilla = fecha).
   text: {n} es la meta (o [singular, plural]) · goals: metas posibles (la segunda paga x1,5) ·
   max: cuenta el mejor resultado de una partida, no la suma · gold / gems:
   premio con la primera meta · icon: imagen de assets. Con las tres
   cobradas, DAILY_BONUS (cofre que se abre al momento). */
var MISSIONS = {
  win:    { text: 'Gana {n} partidas', goals: [2, 3], gold: 120, gems: 3, icon: 'icons/corona' },
  duel:   { text: ['Gana {n} duelo 1 contra 1', 'Gana {n} duelos 1 contra 1'], goals: [1, 2], gold: 150, gems: 4, icon: 'icons/espadas' },
  stars:  { text: ['Consigue 3 estrellas en {n} fase', 'Consigue 3 estrellas en {n} fases'], goals: [1, 2], gold: 130, gems: 3, icon: 'icons/estrella' },
  merge:  { text: 'Fusiona tropas {n} veces', goals: [15, 25], gold: 100, gems: 2, icon: 'icons/chispas' },
  summon: { text: 'Invoca {n} tropas', goals: [30, 50], gold: 100, gems: 2, icon: 'icons/dado' },
  kills:  { text: 'Derrota a {n} monstruos', goals: [150, 300], gold: 110, gems: 2, icon: 'icons/calavera' },
  boss:   { text: 'Derrota a {n} jefes', goals: [2, 3], gold: 120, gems: 3, icon: 'icons/explosion' },
  cmd:    { text: 'Usa la habilidad del comandante {n} veces', goals: [4, 6], gold: 100, gems: 2, icon: 'icons/rayo' },
  power:  { text: 'Mejora tropas en partida {n} veces', goals: [5, 8], gold: 100, gems: 2, icon: 'icons/mejorar' },
  rank:   { text: 'Sube una tropa a rango {n}', goals: [4, 5], max: true, gold: 120, gems: 3, icon: 'icons/grafico' },
  coop:   { text: 'Llega a la oleada {n} en Co-op', goals: [10, 15], max: true, gold: 130, gems: 3, icon: 'icons/ola' },
  chest:  { text: 'Abre {n} cofres', goals: [2, 3], gold: 100, gems: 2, icon: 'chests/madera' }
};
var DAILY_COUNT = 3;
function missionText(k, n) { var t = MISSIONS[k].text; return (Array.isArray(t) ? t[n === 1 ? 0 : 1] : t).replace('{n}', n); }
var DAILY_BONUS = 'plata';

/* Afinidad: cada tropa vecina (arriba/abajo/izquierda/derecha) del mismo
   elemento da +AFFINITY_BONUS de daño. */
var ELEMENTS = {
  fuego:      { name: 'Fuego',      icon: '🔥' },
  hielo:      { name: 'Hielo',      icon: '❄️' },
  naturaleza: { name: 'Naturaleza', icon: '🌿' },
  arcano:     { name: 'Arcano',     icon: '🔮' },
  metal:      { name: 'Metal',      icon: '⚙️' }
};
Object.keys(ELEMENTS).forEach(function (k) { ELEMENTS[k].color = GAME_PALETTE.elements[k]; });
var AFFINITY_BONUS = 0.12;

// losetas de cada tablero (assets/tiles/<juego>-<n>, de assets/losetas-nuevas.jpg:
// de las enmarcadas, solo las enteras, con sus dos postes)
var FIELD_TILES = { prado: { set: 'bosque', n: 6 }, lava2: { set: 'lava', n: 6 }, hielo: { set: 'hielo', n: 2 }, veneno: { set: 'veneno', n: 6 }, roca: { set: 'roca', n: 12 } };
var STONE_TILE = 'piedra-1';

/* Casillas especiales del tablero: cambian en cada partida. */
var TILES = {
  altar:   { name: 'Altar',   icon: '⚔️', color: '#ff5a6a', desc: '+35% de daño a la tropa que esté encima.', dmg: 0.35 },
  fuente:  { name: 'Fuente',  icon: '💧', color: '#4ecdc4', desc: 'La tropa que esté encima genera 1 de maná por segundo.', mana: 1 },
  atalaya: { name: 'Atalaya', icon: '🏹', color: '#ffd166', desc: '+30% de velocidad de ataque.', speed: 0.3 }
};

/* Comandantes: habilidad que se carga con el tiempo. power: fuerza a nivel 1
   (aria: segundos de congelación · merlo: maná · brann: daño del meteoro). */
var COMMANDERS = {
  aria:  { name: 'Aria',  title: 'Capitana de Escarcha', color: '#7fd6ff', icon: '🌨️', pic: 'assets/commanders/aria.webp?v=2', ability: 'Ventisca',  desc: 'Congela a todos los enemigos 3 segundos.', power: 3, cd: 30, grow: 0.75 },
  merlo: { name: 'Merlo', title: 'Archimago',            color: '#b26bff', icon: '✨', pic: 'assets/commanders/merlo.webp?v=2', ability: 'Marea de maná', desc: 'Te da 150 de maná al instante, y más en las oleadas avanzadas.', power: 150, cd: 28 },
  brann: { name: 'Brann', title: 'General Enano',        color: '#ff8f3c', icon: '☄️', pic: 'assets/commanders/brann.webp?v=2', ability: 'Meteoro',   desc: 'Caen 6 meteoritos sobre los monstruos más adelantados.', power: 6, cd: 28 },
  // los cuatro nuevos (de assets/pack-nyx-sol-morgana-tormal.jpg) empiezan
  // bloqueados (locked) y se consiguen en los cofres
  nyx:   { name: 'Nyx',   title: 'Hechicera del Eclipse', color: '#c04bff', icon: '🌑', locked: true, pic: 'assets/commanders/nyx.webp', ability: 'Maldición', desc: 'Los monstruos reciben un 60% más de daño durante 8 segundos.', power: 8, cd: 28 },
  sol:   { name: 'Sol',   title: 'Paladín del Alba',      color: '#ffc83a', icon: '☀️', locked: true, pic: 'assets/commanders/sol.webp', ability: 'Escudo divino', desc: 'Durante 6 segundos no pierdes vidas y los monstruos van un 35% más lentos.', power: 6, cd: 30, grow: 0.5 },
  // héroes: su habilidad se usa sobre el tablero eligiendo tropas (hero: cuántas);
  // con nivel se cargan antes en vez de tener más fuerza
  morgana: { name: 'Morgana', title: 'Inventora', color: '#2fd6a0', icon: '⚙️', locked: true, pic: 'assets/commanders/morgana.webp', hero: 2, ability: 'Ensamblaje', desc: 'Eliges dos tropas del mismo rango, aunque sean distintas, y se fusionan.', power: 1, cd: 30 },
  torvald: { name: 'Torvald', title: 'Viejo Maestro', color: '#ff7a3c', icon: '🧮', locked: true, pic: 'assets/commanders/torvald.webp', hero: 1, ability: 'Forja', desc: 'Eliges una tropa y sube un rango, hasta el 5.', power: 1, cd: 90, grow: 0.6 }
};
var COMMANDER_ORDER = ['aria', 'merlo', 'brann', 'nyx', 'sol', 'morgana', 'torvald'];
COMMANDER_ORDER.forEach(function (k) { var c = COMMANDERS[k]; c.body = c.gen ? '' : 'assets/commanders/' + k + '-cuerpo.webp'; });
// niveles de comandante: cada nivel, +CMD_BONUS de fuerza en su habilidad.
// Sus cartas salen solo en el cofre de comandante (pocas), por eso piden menos.
// Del 11 al 25 cada nivel da menos (CMD_BONUS_HIGH) y pide bastante más.
var CMD_MAX = 25;
var CMD_BONUS = 0.08, CMD_BONUS_HIGH = 0.03;
function cmdMult(lv) { lv = lv || 1; return 1 + CMD_BONUS * (Math.min(lv, 10) - 1) + CMD_BONUS_HIGH * Math.max(0, lv - 10); }
function cmdCardsNeeded(lv) { return [0, 1, 2, 3, 4, 5, 7, 9, 12, 15, 18, 21, 24, 27, 30, 34, 38, 42, 46, 50, 55, 60, 65, 70, 80][lv] || 999; }
function cmdUpgradeGold(lv) { return [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000, 7000, 8000, 9000, 10000, 11500, 13000, 14500, 16000, 18000, 20000, 22500, 25000, 28000, 32000, 36000][lv] || 99999; }
// lo que gana cada comandante con su nivel: grow < 1 lo frena (Aria, Torvald)
function cmdGrow(k, lv) { return 1 + (cmdMult(lv) - 1) * (COMMANDERS[k].grow || 1); }
// fuerza de la habilidad a un nivel, y su texto
function cmdPower(k, lv) { return COMMANDERS[k].power * cmdGrow(k, lv); }
// segundos de carga: los héroes se cargan antes con cada nivel
function cmdCd(k, lv) { var c = COMMANDERS[k]; return c.hero ? Math.round(c.cd / cmdGrow(k, lv)) : c.cd; }
// meteoritos de Brann: 6, y con nivel caen más (9 al 10, 11 al 25)
function brannMeteors(lv) { return 6 + Math.floor((cmdMult(lv) - 1) * 5); }
function cmdDesc(k, lv) {
  var p = cmdPower(k, lv), sec = String(Math.round(p * 10) / 10).replace('.', ',');
  if (COMMANDERS[k].hero) return COMMANDERS[k].desc;
  if (k === 'nyx') return 'Los monstruos reciben un 60% más de daño durante ' + sec + ' segundos.';
  if (k === 'sol') return 'Durante ' + sec + ' segundos no pierdes vidas y los monstruos van un 35% más lentos.';
  if (k === 'aria') return 'Congela a todos los enemigos ' + String(Math.round(p * 10) / 10).replace('.', ',') + ' segundos.';
  if (k === 'merlo') return 'Te da ' + Math.round(p) + ' de maná al instante, y más en las oleadas avanzadas.';
  return 'Caen ' + brannMeteors(lv) + ' meteoritos sobre los monstruos más adelantados.';
}

/* Árbol de habilidades de cada comandante: con el nivel CMD_TREE_LV[piso]
   se abre un piso y en él se eligen CMD_TREE_PICK[piso] ramas (meta.cmdTree).
   Cada rama cambia datos del tablero al empezar la partida (applyCmdNode):
   mul multiplica, add suma, elem suma daño a un elemento, set fija, lives da vidas. */
var CMD_TREE_LV = [5, 25];
var CMD_TREE_PICK = [1, 2];
var CMD_TREE = {
  aria: [
    [{ id: 'cortante', name: 'Escarcha cortante', desc: 'La Ventisca también hace daño a todos los monstruos.', add: { cmdDmg: 1.2 } },
     { id: 'largo', name: 'Invierno largo', desc: 'La Ventisca congela un 50% más de tiempo.', mul: { cmdPowerMult: 1.5 } }],
    [{ id: 'recarga', name: 'Recarga', desc: 'Se carga un 30% más rápido.', mul: { chargeMult: 1.3 } },
     { id: 'eterno', name: 'Hielo eterno', desc: 'Tras la Ventisca, los monstruos van un 30% más lentos 4 segundos.', set: { cmdSlow: 0.3 } },
     { id: 'corazon', name: 'Corazón de hielo', desc: 'Las tropas de hielo hacen un 20% más de daño.', elem: { hielo: 0.2 } }]
  ],
  merlo: [
    [{ id: 'doble', name: 'Marea crecida', desc: 'La Marea de maná da un 50% más.', mul: { cmdPowerMult: 1.5 } },
     { id: 'torrente', name: 'Torrente', desc: 'Con la Marea invocas además una tropa gratis.', set: { refuerzo: true } }],
    [{ id: 'recarga', name: 'Recarga', desc: 'Se carga un 30% más rápido.', mul: { chargeMult: 1.3 } },
     { id: 'arcano', name: 'Saber arcano', desc: 'Las tropas arcanas hacen un 20% más de daño.', elem: { arcano: 0.2 } },
     { id: 'erudito', name: 'Erudito', desc: 'Mejorar tropas en la partida cuesta un 20% menos.', mul: { powerCostMult: 0.8 } }]
  ],
  brann: [
    [{ id: 'lluvia', name: 'Lluvia de fuego', desc: 'Caen 3 meteoros más.', add: { extraMeteors: 3 } },
     { id: 'gran', name: 'Gran meteoro', desc: 'Los meteoros hacen un 50% más de daño.', mul: { cmdPowerMult: 1.5 } }],
    [{ id: 'recarga', name: 'Recarga', desc: 'Se carga un 30% más rápido.', mul: { chargeMult: 1.3 } },
     { id: 'fragua', name: 'Fragua', desc: 'Las tropas de fuego hacen un 20% más de daño.', elem: { fuego: 0.2 } },
     { id: 'botin', name: 'Botín enano', desc: 'Cada baja te da 2 de maná más.', add: { killBonus: 2 } }]
  ],
  nyx: [
    [{ id: 'larga', name: 'Maldición larga', desc: 'La Maldición dura un 50% más.', mul: { cmdPowerMult: 1.5 } },
     { id: 'profunda', name: 'Maldición profunda', desc: 'Con la Maldición reciben el doble de daño en vez de un 60% más.', set: { curseMult: 2 } }],
    [{ id: 'recarga', name: 'Recarga', desc: 'Se carga un 30% más rápido.', mul: { chargeMult: 1.3 } },
     { id: 'sombras', name: 'Sombras', desc: 'Las tropas arcanas hacen un 20% más de daño.', elem: { arcano: 0.2 } },
     { id: 'pacto', name: 'Pacto', desc: 'Cada baja durante la Maldición te da 4 de maná.', add: { curseMana: 4 } }]
  ],
  sol: [
    [{ id: 'largo', name: 'Escudo largo', desc: 'El Escudo divino dura un 50% más.', mul: { cmdPowerMult: 1.5 } },
     { id: 'sanadora', name: 'Luz sanadora', desc: 'Al usar el Escudo divino recuperas una vida.', set: { solHeal: true } }],
    [{ id: 'recarga', name: 'Recarga', desc: 'Se carga un 30% más rápido.', mul: { chargeMult: 1.3 } },
     { id: 'bendicion', name: 'Bendición', desc: 'Todas tus tropas hacen un 10% más de daño.', mul: { dmgMult: 1.1 } },
     { id: 'muralla', name: 'Muralla', desc: 'Empiezas con una vida más.', lives: 1 }]
  ],
  morgana: [
    [{ id: 'fino', name: 'Ensamblaje fino', desc: 'Un 25% de las veces la tropa sube dos rangos.', add: { heroBoost: 0.25 } },
     { id: 'chatarra', name: 'Chatarra útil', desc: 'Cada Ensamblaje te da 40 de maná.', add: { heroMana: 40 } }],
    [{ id: 'recarga', name: 'Recarga', desc: 'Se carga un 30% más rápido.', mul: { chargeMult: 1.3 } },
     { id: 'engranajes', name: 'Engranajes', desc: 'Las tropas de metal hacen un 20% más de daño.', elem: { metal: 0.2 } },
     { id: 'taller', name: 'Taller', desc: 'Invocar sube de precio la mitad de rápido.', mul: { summonStep: 0.5 } }]
  ],
  torvald: [
    [{ id: 'maestra', name: 'Forja maestra', desc: 'La Forja puede subir tropas hasta el rango 6.', set: { forgeMax: 6 } },
     { id: 'yunque', name: 'Yunque', desc: 'Se carga un 25% más rápido.', mul: { chargeMult: 1.25 } }],
    [{ id: 'veterania', name: 'Veteranía', desc: 'Tus tropas invocadas tienen un 15% de salir con rango 2.', add: { rank2: 0.15 } },
     { id: 'arsenal', name: 'Arsenal', desc: 'Todas tus tropas hacen un 10% más de daño.', mul: { dmgMult: 1.1 } },
     { id: 'metal', name: 'Temple', desc: 'Las tropas de metal hacen un 20% más de daño.', elem: { metal: 0.2 } }]
  ]
};
// icono de cada rama en su casilla del árbol (assets/<ruta>.webp), por «tropa o comandante:rama»
var TREE_ICO = {
  'lyra:arco': 'icons/espadas', 'lyra:rafaga': 'icons/rapido', 'lyra:acero': 'icons/perfora', 'lyra:certero': 'icons/critico', 'lyra:caza': 'icons/corona', 'lyra:explosiva': 'icons/explosion',
  'brasa:llama': 'icons/espadas', 'brasa:granbola': 'icons/explosion', 'brasa:ascuas': 'icons/fuego', 'brasa:chispa': 'icons/rapido', 'brasa:lava': 'icons/ola', 'brasa:fatuo': 'icons/rayo',
  'nivea:afilado': 'icons/espadas', 'nivea:gemelas': 'icons/vecinas', 'nivea:intenso': 'icons/hielo', 'nivea:carambano': 'icons/explosion', 'nivea:congela': 'icons/rayo', 'nivea:corazon': 'icons/corona',
  'aria:cortante': 'icons/espadas', 'aria:largo': 'icons/hielo', 'aria:recarga': 'icons/reloj', 'aria:eterno': 'icons/ola', 'aria:corazon': 'icons/diana',
  'merlo:doble': 'icons/gota', 'merlo:torrente': 'icons/mano', 'merlo:recarga': 'icons/reloj', 'merlo:arcano': 'icons/arcano', 'merlo:erudito': 'icons/mejorar',
  'brann:lluvia': 'icons/fuego', 'brann:gran': 'icons/explosion', 'brann:recarga': 'icons/reloj', 'brann:fragua': 'icons/espadas', 'brann:botin': 'icons/moneda',
  'nyx:larga': 'icons/arcano', 'nyx:profunda': 'icons/calavera', 'nyx:recarga': 'icons/reloj', 'nyx:sombras': 'icons/chispas', 'nyx:pacto': 'icons/gota',
  'sol:largo': 'icons/escudo', 'sol:sanadora': 'ui/vida', 'sol:recarga': 'icons/reloj', 'sol:bendicion': 'icons/estrella', 'sol:muralla': 'icons/casa',
  'morgana:fino': 'icons/chispas', 'morgana:chatarra': 'icons/gota', 'morgana:recarga': 'icons/reloj', 'morgana:engranajes': 'icons/engranaje', 'morgana:taller': 'icons/moneda',
  'torvald:maestra': 'icons/mejorar', 'torvald:yunque': 'icons/rapido', 'torvald:veterania': 'icons/estrella', 'torvald:arsenal': 'icons/espadas', 'torvald:metal': 'icons/engranaje'
};
// ramas elegidas que valen a este nivel de comandante
function cmdTreeActive(k, lv, picks) {
  var out = [];
  (CMD_TREE[k] || []).forEach(function (tier, t) {
    if ((lv || 1) < CMD_TREE_LV[t]) return;
    tier.forEach(function (n) { if (picks && picks[t] && picks[t].indexOf(n.id) !== -1) out.push(n); });
  });
  return out;
}

/* Eventos que pueden tocar al empezar una oleada (a partir de la 3). */
var WAVE_EVENTS = [
  { id: 'eclipse', name: 'Eclipse', pic: 'assets/events/eclipse.webp',        icon: '🌑', desc: 'Los monstruos van un 25% más rápido.' },
  { id: 'lluvia',  name: 'Lluvia de maná', pic: 'assets/events/lluvia.webp', icon: '🌧️', desc: 'Cada baja da el doble de maná.' },
  { id: 'niebla',  name: 'Niebla', pic: 'assets/events/niebla.webp',         icon: '🌫️', desc: 'Los espectros esquivan más.' },
  { id: 'horda',   name: 'Horda', pic: 'assets/events/horda.webp',          icon: '👹', desc: 'Llegan un 40% más de monstruos, más débiles.' },
  { id: 'calma',   name: 'Calma', pic: 'assets/events/calma.webp',          icon: '🍃', desc: 'Monstruos más lentos esta oleada.' }
];

/* 1 contra 1 con su toque de roguelike: antes de empezar, una ruleta elige un
   modificador para los dos (DUEL_MODS) y el jefe final de la partida, que sale
   en todas sus oleadas de jefe. El torneo no lleva ruleta. */
var DUEL_MODS = [
  { id: 'mana2',     name: 'Doble de maná',  pic: 'assets/icons/gota.webp?v=2',     desc: 'Empezáis con el doble y todo el maná que ganáis vale el doble.' },
  { id: 'rebajas',   name: 'Mejoras a mitad', pic: 'assets/icons/mejorar.webp', desc: 'Mejorar tropas en la partida cuesta la mitad.' },
  { id: 'veteranos', name: 'Veteranos',      pic: 'assets/icons/estrella.webp', desc: 'Cada tropa invocada tiene un 25% de salir con rango 2.' },
  { id: 'carga',     name: 'Carga rápida',   pic: 'assets/icons/rapido.webp',   desc: 'Los comandantes se cargan el doble de rápido.' },
  { id: 'subita',    name: 'Muerte súbita',  pic: 'assets/icons/calavera.webp', desc: 'Una sola vida para cada uno.' },
  { id: 'gigantes',  name: 'Gigantes',       pic: 'assets/icons/escudo.webp',   desc: 'Los monstruos tienen un 50% más de vida, pero dan el doble de maná.' },
  { id: 'enjambre',  name: 'Enjambre',       pic: 'assets/events/horda.webp',   desc: 'Llegan el doble de monstruos, con la mitad de vida.' },
  { id: 'estampida', name: 'Estampida',      pic: 'assets/events/eclipse.webp', desc: 'Los monstruos corren un 30% más, pero tienen un 25% menos de vida.' },
  { id: 'fusion',    name: 'Fusión potente', pic: 'assets/icons/chispas.webp',  desc: 'Al fusionar, un 20% de las veces la tropa sube dos rangos.' },
  { id: 'casillas',  name: 'Tierra sagrada', pic: 'assets/icons/hoja.webp',     desc: 'El doble de casillas especiales: dos altares, dos fuentes y dos atalayas.' },
  { id: 'fijo',      name: 'Precio fijo',    pic: 'assets/icons/moneda.webp',   desc: 'Invocar cuesta siempre 20 de maná.' },
  { id: 'jefes',     name: 'Noche de jefes', pic: 'assets/icons/corona.webp',   desc: 'Llega un jefe cada 3 oleadas en vez de cada 5.' },
  { id: 'caos',      name: 'Caos',           pic: 'assets/icons/dado.webp',     desc: 'Desde la oleada 2, todas traen un evento.' },
  { id: 'lazos',     name: 'Lazos elementales', pic: 'assets/icons/vecinas.webp', desc: 'La afinidad entre tropas del mismo elemento vale el triple.' },
  { id: 'oro',       name: 'Botín de guerra', pic: 'assets/icons/trofeo.webp',  desc: 'Si ganas, te llevas el doble de oro.' },
  { id: 'directa',   name: 'Invocación dirigida', pic: 'assets/icons/mano.webp', desc: 'Mantén pulsada una carta de abajo para invocar esa tropa por el doble de maná.' },
  // reliquias: ventajas para un tipo de tropa o para toda la partida
  { id: 'r_fuego',      relic: 'fuego',      name: 'Corona de fuego',    pic: 'assets/icons/fuego.webp',     desc: 'Las tropas de fuego hacen un 35% más de daño.' },
  { id: 'r_hielo',      relic: 'hielo',      name: 'Cristal de escarcha', pic: 'assets/icons/hielo.webp',    desc: 'Las tropas de hielo hacen un 35% más de daño.' },
  { id: 'r_naturaleza', relic: 'naturaleza', name: 'Raíz ancestral',     pic: 'assets/icons/hoja.webp',      desc: 'Las tropas de naturaleza hacen un 35% más de daño.' },
  { id: 'r_arcano',     relic: 'arcano',     name: 'Orbe arcano',        pic: 'assets/icons/arcano.webp',    desc: 'Las tropas arcanas hacen un 35% más de daño.' },
  { id: 'r_metal',      relic: 'metal',      name: 'Engranaje dorado',   pic: 'assets/icons/engranaje.webp', desc: 'Las tropas de metal hacen un 35% más de daño.' },
  { id: 'r_suerte',     relic: true,         name: 'Trébol de la suerte', pic: 'assets/icons/critico.webp',  desc: 'Todas las tropas tienen un 10% de golpe crítico doble.' },
  { id: 'r_caliz',      relic: true,         name: 'Cáliz de vida',      pic: 'assets/ui/vida.webp?v=2',         desc: 'Cada jefe derrotado devuelve una vida.' }
];
/* Habilidades de comandante que se pueden elegir como ventaja en el roguelike. */
var CMD_SKILLS = {
  recarga:   { name: 'Recarga',   pic: 'icons/reloj',    desc: 'Tu comandante se carga un 40% más rápido.' },
  maestria:  { name: 'Maestría',  pic: 'icons/chispas',  desc: '{a} con un 50% más de fuerza.' },
  refuerzo:  { name: 'Refuerzo',  pic: 'icons/mano',     desc: 'Al usar {a}, invocas una tropa gratis.' },
  botin:     { name: 'Botín',     pic: 'icons/gota',     desc: 'Cada baja te da 3 de maná más.' },
  arsenal:   { name: 'Arsenal',   pic: 'icons/espadas',  desc: 'Todas tus tropas hacen un 15% más de daño.' },
  cazajefes: { name: 'Cazajefes', pic: 'icons/diana',    desc: 'Tus tropas hacen un 40% más de daño a los jefes.' },
  reclutas:  { name: 'Reclutas',  pic: 'icons/moneda',   desc: 'Invocar sube de precio la mitad de rápido.' },
  veterania: { name: 'Veteranía', pic: 'icons/estrella', desc: 'Tus tropas invocadas tienen un 20% de salir con rango 2.' },
  escarcha:  { name: 'Escarcha',  pic: 'icons/hielo',    desc: 'Los monstruos de tu tablero van un 12% más lentos.' },
  muralla:   { name: 'Muralla',   pic: 'ui/vida',        desc: 'Ganas una vida más.' }
};
var CMD_SKILL_ORDER = Object.keys(CMD_SKILLS);

/* Talentos: árbol de tres pisos para las tres primeras comunes. Cada piso se
   abre con el nivel de carta de TALENT_LV y en él eliges una de dos ramas
   (meta.talents[id][piso]). mul: multiplica el dato de la tropa · set: lo
   cambia · add: lo suma. Se aplican al empezar la partida (Board.defs). */
var TALENT_LV = [3, 6, 9];
var TALENTS = {
  lyra: [
    [{ id: 'arco', name: 'Arco largo', desc: '+20% de daño.', mul: { dmg: 1.2 } },
     { id: 'rafaga', name: 'Ráfaga', desc: '+20% de velocidad de ataque.', mul: { rate: 1.2 } }],
    [{ id: 'acero', name: 'Punta de acero', desc: 'Sus flechas atraviesan la armadura.', set: { pierce: true } },
     { id: 'certero', name: 'Ojo certero', desc: '15% de golpe crítico que hace ×2,5.', set: { crit: { chance: 0.15, mult: 2.5 } } }],
    [{ id: 'caza', name: 'Flecha de caza', desc: '×2,5 de daño a los jefes.', set: { bossMult: 2.5 } },
     { id: 'explosiva', name: 'Flecha explosiva', desc: 'Sus flechas salpican a los monstruos de alrededor.', set: { splash: 0.35 } }]
  ],
  brasa: [
    [{ id: 'llama', name: 'Llama viva', desc: '+20% de daño.', mul: { dmg: 1.2 } },
     { id: 'granbola', name: 'Gran bola', desc: 'Su explosión es un 35% más grande.', mul: { splash: 1.35 } }],
    [{ id: 'ascuas', name: 'Ascuas', desc: 'Deja a los monstruos ardiendo.', set: { poison: { dps: 12, dur: 3 } } },
     { id: 'chispa', name: 'Chispa rápida', desc: '+20% de velocidad de ataque.', mul: { rate: 1.2 } }],
    [{ id: 'lava', name: 'Lava', desc: 'Frena un 10% por golpe, hasta un 30%.', set: { slow: { pct: 0.1, max: 0.3, dur: 2 } } },
     { id: 'fatuo', name: 'Fuego fatuo', desc: '12% de aturdir 0,8 segundos.', set: { stun: { chance: 0.12, dur: 0.8 } } }]
  ],
  nivea: [
    [{ id: 'afilado', name: 'Hielo afilado', desc: '+20% de daño.', mul: { dmg: 1.2 } },
     { id: 'gemelas', name: 'Gemelas', desc: 'Con otra Nívea al lado pega un 90% más en vez de un 60%.', set: { twin: 0.9 } }],
    [{ id: 'intenso', name: 'Frío intenso', desc: 'Frena el doble por golpe y hasta un 65%.', set: { slow: { pct: 0.24, max: 0.65, dur: 2.5 } } },
     { id: 'carambano', name: 'Carámbano', desc: 'Sus golpes salpican a los de alrededor.', set: { splash: 0.35 } }],
    [{ id: 'congela', name: 'Congelación', desc: '10% de congelar 1,2 segundos.', set: { stun: { chance: 0.1, dur: 1.2 } } },
     { id: 'corazon', name: 'Corazón helado', desc: '×2 de daño a los jefes.', set: { bossMult: 2 } }]
  ]
};
// copia de la tropa con los talentos elegidos (picks: id de rama por piso)
function talentDef(id, picks) {
  var d = Object.assign({}, UNITS[id]);
  (TALENTS[id] || []).forEach(function (tier, t) {
    var tl = tier.filter(function (o) { return picks && o.id === picks[t]; })[0];
    if (!tl) return;
    Object.keys(tl.mul || {}).forEach(function (k) { d[k] = (d[k] || 0) * tl.mul[k]; });
    Object.keys(tl.set || {}).forEach(function (k) { d[k] = tl.set[k]; });
    Object.keys(tl.add || {}).forEach(function (k) { d[k] = (d[k] || 0) + tl.add[k]; });
  });
  return d;
}

/* Torneo: tres formas de jugarlo (meta.tourneyMode). */
var TOURNEY_MODES = [
  { id: 'clasico',  name: 'Clásico',        desc: 'Tu mazo, con las cartas a nivel de torneo.' },
  { id: 'prestado', name: 'Mazo prestado',  desc: 'Juegas con uno de los mazos del torneo y el rival con otro.' },
  { id: 'azar',     name: 'Cartas al azar', desc: 'Cinco tropas al azar para cada uno, de entre todas.' }
];
var TOURNEY_DECKS = [
  { name: 'Tormenta',    deck: ['volta', 'aurora', 'melodia', 'doblon', 'sombra'] },
  { name: 'Hielo eterno', deck: ['nivea', 'boreas', 'ulric', 'melodia', 'doblon'] },
  { name: 'Cazadores',   deck: ['kaia', 'halcon', 'lyra', 'midas', 'oria'] },
  { name: 'Fuego',       deck: ['brasa', 'rocco', 'fenix', 'mirra', 'doblon'] },
  { name: 'Manada',      deck: ['garra', 'titan', 'seren', 'cronos', 'eco'] }
];

/* Modo roguelike: tú solo contra ROGUE_WAVES oleadas, con un jefe final
   elegido por la ruleta (ROGUE_FINAL_HP veces más vida). Cada ROGUE_PICK_EVERY
   segundos de partida eliges 1 de 3 ventajas que se acumulan: habilidades de
   comandante, reliquias y modificadores que te favorecen (ROGUE_MODS). */
var ROGUE_WAVES = 30;
var ROGUE_PICK_EVERY = 30;
var ROGUE_FINAL_HP = 2.5;
var ROGUE_MODS = ['mana2', 'rebajas', 'veteranos', 'carga', 'fusion', 'casillas', 'lazos', 'directa', 'r_fuego', 'r_hielo', 'r_naturaleza', 'r_arcano', 'r_metal', 'r_suerte', 'r_caliz'];

/* Emojis rápidos del duelo (el rival a veces contesta). */
var EMOTES = ['👍', '😂', '😮', '😡', '🔥', '👑'];
function cmdSkillDesc(k, cmd) { return CMD_SKILLS[k].desc.replace('{a}', COMMANDERS[cmd].ability); }

/* Rivales del 1 contra 1 y del torneo: cada uno con su forma de jugar
   (style, ver Board.think) y su elemento favorito, del que lleva hasta tres
   tropas en el mazo. */
var RIVAL_STYLES = {
  ataque:   { name: 'Al ataque', desc: 'Invoca sin parar y usa el comandante en cuanto puede.' },
  ahorro:   { name: 'Ahorro',    desc: 'Guarda maná, lleva tropas de maná y mejora sus cartas pronto.' },
  fusiones: { name: 'Fusiones',  desc: 'Fusiona todo lo que puede para subir rangos rápido.' },
  tactica:  { name: 'Táctica',   desc: 'Recoloca sus tropas en el altar y la atalaya.' }
};
var RIVALS = [
  { name: 'Barón Gruñón',    style: 'ahorro',   element: 'metal' },
  { name: 'Lady Cenizas',    style: 'ataque',   element: 'fuego' },
  { name: 'Capitán Bigotes', style: 'fusiones', element: 'naturaleza' },
  { name: 'La Duquesa',      style: 'tactica',  element: 'arcano' },
  { name: 'Fray Tormenta',   style: 'ataque',   element: 'arcano' },
  { name: 'Sir Tuercas',     style: 'tactica',  element: 'metal' },
  { name: 'Reina Escarcha',  style: 'ahorro',   element: 'hielo' },
  { name: 'Maese Trueno',    style: 'fusiones', element: 'fuego' }
];

/* Mazos guardados: cada uno con sus cinco tropas y su comandante (meta.decks). */
var DECK_SLOTS = 3;

/* Retos con amigos: supervivencia con una semilla (los mismos monstruos,
   eventos, casillas y modificador para quien juegue el reto), con el mazo y
   el comandante de quien lo crea, todo a nivel de torneo. Se pasan por enlace. */
var RETO_MODS = ['mana2', 'rebajas', 'veteranos', 'carga', 'gigantes', 'enjambre', 'estampida', 'fusion', 'casillas', 'fijo', 'jefes', 'caos', 'lazos'];
var RETO_LIVES = 5;

/* Racha de días seguidos: un premio por día; el séptimo, cofre de oro.
   Si un día no entras, vuelve al primero. */
var LOGIN_REWARDS = [{ gold: 100 }, { gems: 10 }, { chest: 'madera' }, { gold: 300 }, { gems: 20 }, { chest: 'plata' }, { chest: 'oro' }];

/* Modos que se abren con la campaña (fase ganada). Si ya los habías jugado,
   siguen abiertos. */
var MODE_UNLOCK = { duelPick: 3, coop: 5, tourney: 8, rogue: 10 };
var MODE_NAMES = { duelPick: '1 contra 1', coop: 'Co-op', tourney: 'Torneo', rogue: 'Roguelike' };

/* Cartas sobrantes: con la tropa al nivel máximo, cada carta de más se
   cambia por oro (y las de comandante, a nivel 25). */
var SURPLUS_GOLD = { comun: 20, rara: 50, epica: 150, mitica: 400, legendaria: 1000 };
var SURPLUS_CMD_GOLD = 150;

/* Ascensión del Roguelike: al superar las 30 oleadas se abre la siguiente.
   Cada nivel, monstruos más duros y algo más de premio; cada tres, una vida menos. */
var ROGUE_ASC_MAX = 10;
function rogueAscHp(a) { return 1 + 0.15 * a; }
function rogueAscLives(a) { return 5 - Math.floor(a / 3); }

/* Cosméticos: marcos del retrato y títulos del perfil. Salen en la
   temporada y en algunos logros; se eligen en el perfil. */
var FRAMES = {
  basico:   { name: 'Madera' },
  oro:      { name: 'Oro' },
  hielo:    { name: 'Escarcha' },
  fuego:    { name: 'Brasas' },
  natura:   { name: 'Enredadera' },
  arcano:   { name: 'Arcano' },
  sombra:   { name: 'Sombra' },
  real:     { name: 'Real' },
  arcoiris: { name: 'Prisma' },
  eclipse:  { name: 'Eclipse' }
};
var TITLES = {
  novato:   'Recluta del reino',
  valle:    'Guardia del valle',
  fusion:   'Maestría en fusión',
  dragon:   'Azote de dragones',
  escarcha: 'Corazón de escarcha',
  fuego:    'Llama eterna',
  arcano:   'Saber arcano',
  hierro:   'Voluntad de hierro',
  bosque:   'Espíritu del bosque',
  leyenda:  'Leyenda del reino',
  eclipse:  'Del eclipse',
  racha:    'Constancia de acero'
};

/* Temporada: un pase gratis que cambia cada mes. Los puntos salen de jugar
   (ver seasonXp en js/battle.js), de las misiones y de la racha. 30 niveles
   de SEASON_XP puntos; en los niveles 10, 20 y 30, un cosmético del mes. */
var SEASON_LEVELS = 30, SEASON_XP = 100;
var SEASON_THEMES = [
  { name: 'Temporada de la Escarcha', color: '#7fd6ff', frames: ['hielo', 'real', 'arcoiris'], title: 'escarcha' },
  { name: 'Temporada del Dragón',     color: '#ff6a2a', frames: ['fuego', 'oro', 'eclipse'],   title: 'dragon' },
  { name: 'Temporada del Bosque',     color: '#3fbf6a', frames: ['natura', 'oro', 'arcoiris'], title: 'bosque' },
  { name: 'Temporada Arcana',         color: '#8c6bff', frames: ['arcano', 'sombra', 'eclipse'], title: 'arcano' },
  { name: 'Temporada de Hierro',      color: '#f2b632', frames: ['oro', 'real', 'arcoiris'],   title: 'hierro' },
  { name: 'Temporada de las Llamas',  color: '#ff5a2c', frames: ['fuego', 'sombra', 'eclipse'], title: 'fuego' }
];
// premio de cada nivel de la temporada del tema th
function seasonReward(lv, th) {
  if (lv === 10) return { frame: th.frames[0] };
  if (lv === 20) return { frame: th.frames[1] };
  if (lv === 30) return { frame: th.frames[2], title: th.title };
  if (lv === 15) return { title: th.title };
  if (lv % 5 === 0) return { chest: lv >= 25 ? 'oro' : 'plata' };
  if (lv % 3 === 0) return { gems: 10 + lv };
  if (lv % 7 === 0) return { chest: 'comandante' };
  return { gold: 100 + lv * 20 };
}

/* Evento de la semana: cambia cada lunes. Un elemento con más daño en todos
   los modos y una meta: ganar WEEK_GOAL partidas da un cofre de oro.
   Los sábados y domingos, el oro de las partidas vale el doble. */
var WEEK_EVENTS = [
  { el: 'fuego',      name: 'Semana del Fuego' },
  { el: 'hielo',      name: 'Semana del Hielo' },
  { el: 'naturaleza', name: 'Semana del Bosque' },
  { el: 'arcano',     name: 'Semana Arcana' },
  { el: 'metal',      name: 'Semana del Metal' }
];
var WEEK_BONUS = 0.25, WEEK_GOAL = 5;

/* Logros: se cobran una vez. get: valor actual (con meta) · goal: meta ·
   text: {n} es la meta · gold / gems: premio. */
function statOf(k) { return (meta.stats && meta.stats[k]) || 0; }
var ACHIEVEMENTS = [
  { id: 'partidas', name: 'Veteranía',          text: 'Juega {n} partidas',                       goal: 100,   icon: 'icons/espadas',  gold: 800, get: function () { return statOf('games'); } },
  { id: 'bajas1',   name: 'Primera sangre',     text: 'Derrota a {n} monstruos',                  goal: 100,   icon: 'icons/calavera', gold: 150, get: function () { return statOf('kills'); } },
  { id: 'bajas2',   name: 'Cazamonstruos',      text: 'Derrota a {n} monstruos',                  goal: 1000,  icon: 'icons/calavera', gems: 20,  get: function () { return statOf('kills'); } },
  { id: 'bajas3',   name: 'Azote de la horda',  text: 'Derrota a {n} monstruos',                  goal: 10000, icon: 'icons/calavera', gems: 80,  get: function () { return statOf('kills'); } },
  { id: 'jefes1',   name: 'Matajefes',          text: 'Derrota a {n} jefes',                      goal: 10,    icon: 'icons/corona',   gold: 300, get: function () { return statOf('bossKills'); } },
  { id: 'jefes2',   name: 'Leyenda del reino',  text: 'Derrota a {n} jefes',                      goal: 100,   icon: 'icons/corona',   gems: 50,  get: function () { return statOf('bossKills'); } },
  { id: 'fus1',     name: 'Primeras fusiones',  text: 'Fusiona tropas {n} veces',                 goal: 100,   icon: 'icons/chispas',  gold: 200, get: function () { return statOf('merges'); } },
  { id: 'fus2',     name: 'Maestría en fusión', text: 'Fusiona tropas {n} veces',                 goal: 1000,  icon: 'icons/chispas',  gems: 40,  title: 'fusion',  get: function () { return statOf('merges'); } },
  { id: 'combo',    name: 'Racha imparable',    text: 'Haz un combo de {n} fusiones',             goal: 5,     icon: 'icons/rayo',     gems: 15,  get: function () { return statOf('bestCombo'); } },
  { id: 'rango',    name: 'La cumbre',          text: 'Sube una tropa a rango {n}',               goal: 7,     icon: 'icons/grafico',  gems: 25,  get: function () { return statOf('maxRank'); } },
  { id: 'estr1',    name: 'Defensa del valle',  text: 'Consigue {n} estrellas en la campaña',     goal: 30,    icon: 'icons/estrella', gold: 400, title: 'valle', get: function () { return totalStars(); } },
  { id: 'estr2',    name: 'Gloria del reino',   text: 'Consigue {n} estrellas en la campaña',     goal: 120,   icon: 'icons/estrella', gems: 100, title: 'leyenda', get: function () { return totalStars(); } },
  { id: 'duel1',    name: 'Duelista',           text: 'Gana {n} duelos 1 contra 1',               goal: 10,    icon: 'icons/espadas',  gold: 400, get: function () { return meta.duelWins || 0; } },
  { id: 'duel2',    name: 'Reinado en la arena', text: 'Gana {n} duelos 1 contra 1',              goal: 50,    icon: 'icons/espadas',  gems: 60,  get: function () { return meta.duelWins || 0; } },
  { id: 'lava',     name: 'Río de Lava',        text: 'Llega a {n} trofeos',                      goal: 1800,  icon: 'icons/trofeo',   gems: 50,  get: function () { return meta.trophyBest || 0; } },
  { id: 'rogue',    name: 'Superviviente',      text: 'Supera las {n} oleadas del Roguelike',     goal: 30,    icon: 'icons/ola',      gems: 60,  get: function () { return meta.rogueBest || 0; } },
  { id: 'coop',     name: 'Juntos hasta el final', text: 'Llega a la oleada {n} en Co-op',        goal: 25,    icon: 'icons/escudo',   gems: 30,  get: function () { return meta.coopBest || 0; } },
  { id: 'torneo',   name: 'Gloria de torneo',   text: 'Gana {n} torneos',                         goal: 5,     icon: 'icons/estrella', gold: 600, get: function () { return meta.tourneyWins || 0; } },
  { id: 'reto',     name: 'Mejor que tus amigos', text: 'Gana {n} retos de amigos',               goal: 3,     icon: 'icons/diana',    gems: 25,  get: function () { return statOf('retosWon'); } },
  { id: 'tropas',   name: 'Coleccionista',      text: 'Consigue {n} tropas',                      goal: 15,    icon: 'icons/vecinas',  gems: 30,  get: function () { return Object.keys(meta.cards).length; } },
  { id: 'nivel10',  name: 'Al máximo',          text: 'Sube una carta a nivel {n}',               goal: 10,    icon: 'icons/mejorar',  gems: 40,  get: function () { return Object.keys(meta.cards).reduce(function (m, k) { return Math.max(m, meta.cards[k].lv); }, 0); } },
  { id: 'cmds',     name: 'Consejo de guerra',  text: 'Consigue los {n} comandantes',             goal: 7,     icon: 'icons/corona',   gems: 60,  get: function () { return meta.cmdOwned.length; } },
  { id: 'bestia',   name: 'Bestiario completo', text: 'Descubre los {n} monstruos y jefes',       goal: Object.keys(ENEMIES).length + BOSS_ORDER.length, icon: 'icons/pergamino', gems: 30, get: function () { return bestiarySeen(); } }
];
