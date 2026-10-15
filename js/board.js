'use strict';
/* =========================================================
   TABLERO: 5×3 casillas rodeadas por un camino en U.
   Cada jugador (persona o IA) tiene su propio tablero con
   tropas, monstruos, maná, mejoras y comandante.
   Coordenadas lógicas: 1 casilla = 1 unidad.
   ========================================================= */

var COLS = 5, ROWS = 3, PATH_W = 0.9;
var BOARD_W = COLS + PATH_W * 2;
var BOARD_H = ROWS + PATH_W + 0.55;
var ENTRY_Y = BOARD_H - 0.42; // portal y puerta, dentro del tablero
// recorrido: sube por la izquierda, cruza arriba, baja por la derecha
var WAYPOINTS = [
  { x: PATH_W / 2, y: ENTRY_Y },
  { x: PATH_W / 2, y: PATH_W / 2 },
  { x: BOARD_W - PATH_W / 2, y: PATH_W / 2 },
  { x: BOARD_W - PATH_W / 2, y: ENTRY_Y }
];
var BASE_CROSS_TIME = 17; // segundos que tarda un monstruo normal en dar la vuelta

/* Geometría de un tablero: casillas (x0, y0, cw, ch), tamaño (W, H) y
   recorrido de los monstruos (way). Hay dos: el tablero dibujado y el
   tablero ilustrado de la campaña (assets/tablero.*). */
function makeGeo(g) {
  g.len = 0;
  for (var i = 1; i < g.way.length; i++) g.len += Math.hypot(g.way[i].x - g.way[i - 1].x, g.way[i].y - g.way[i - 1].y);
  return g;
}
var VECTOR_GEO = makeGeo({ W: BOARD_W, H: BOARD_H, x0: PATH_W, y0: PATH_W, cw: 1, ch: 1, way: WAYPOINTS });
/* Tableros ilustrados de la campaña. Medidas en píxeles de cada imagen:
   recorte visible (cx, cy, cw, ch), casillas (gx0..gx1, gy0..gy1) y
   recorrido de los monstruos (way). 1 unidad = ancho de una casilla. */
var FIELDS = {
  // prado (assets/tablero.*): entran por el camino de abajo y salen por el mismo
  prado: { image: 'board/tablero', iw: 1672, ih: 941, cx: 250, cy: 110, cw: 1180, ch: 831, fade: true, signOff: 1.45,
    gx0: 477, gy0: 315, gx1: 1196, gy1: 690,
    way: [[805, 990], [805, 767], [322, 767], [322, 185], [1352, 185], [1352, 767], [866, 767], [866, 990]] },
  // lava, el único de volcán y cripta: anillo (volteado de assets/tablero-lava-invertido.jpg): salen por
  // la boca de abajo, dan la vuelta entera al río y vuelven a la misma boca
  lava2: { image: 'boards/lava2', iw: 1248, ih: 832, cx: 175, cy: 140, cw: 905, ch: 660, portal: true, over: true, frame: [40, 0, 1208, 832],
    gx0: 322, gy0: 282, gx1: 928, gy1: 596,
    way: [[603, 770], [603, 660], [247, 660], [247, 214], [1006, 214], [1006, 660], [652, 660], [652, 770]] },
  // hielo, roca y veneno (sin fondo, de assets/tablero-*.jpg): camino en U
  // abierto por abajo.
  // over: el recorte (cx..ch) es solo la zona de juego, ajustada al camino,
  // y el resto de la ilustración se pinta alrededor. frame: el marco entero
  // en la imagen; si cabe sin achicar mucho las casillas se ve entero, y si
  // no, se encaja la zona de juego y el marco se sale por los bordes
  // (ver resizeCanvas y drawBoard)
  hielo: { image: 'boards/hielo', iw: 1024, ih: 572, cx: 195, cy: 62, cw: 635, ch: 470, portal: true, over: true, frame: [107, 20, 917, 552],
    gx0: 318, gy0: 170, gx1: 706, gy1: 402,
    way: [[322, 505], [300, 445], [255, 385], [245, 300], [250, 215], [290, 150], [380, 118], [640, 118], [730, 150], [772, 215], [778, 300], [770, 385], [725, 445], [700, 505]] },
  roca: { image: 'boards/roca', iw: 1024, ih: 572, cx: 188, cy: 70, cw: 650, ch: 420, portal: true, over: true, signOff: 1.7, frame: [168, 29, 852, 534],
    gx0: 312, gy0: 173, gx1: 712, gy1: 403,
    way: [[395, 452], [300, 440], [250, 390], [238, 290], [255, 185], [320, 130], [420, 113], [605, 113], [705, 130], [770, 185], [788, 290], [775, 390], [725, 440], [628, 452]] },
  veneno: { image: 'boards/veneno', iw: 1024, ih: 572, cx: 262, cy: 105, cw: 502, ch: 412, portal: true, over: true, frame: [176, 58, 848, 518],
    gx0: 352, gy0: 188, gx1: 670, gy1: 376,
    way: [[400, 500], [400, 440], [320, 390], [305, 300], [320, 190], [380, 148], [640, 148], [700, 190], [718, 300], [705, 390], [625, 440], [625, 500]] },
  // tableros nuevos (assets/tablero-*-nuevo.jpg): anillo de tierra alrededor
  // de la cuadrícula, entrada abajo a la izquierda y salida abajo a la derecha.
  // prado3 viene sin fondo: alrededor, la textura de caminos (ground); en sus
  // dos puertas de la valla, los portales (gates) y el camino sigue hacia
  // abajo por fuera del dibujo (road: x de cada puerta y dónde acaba la valla)
  prado3: { image: 'boards/prado3', iw: 1248, ih: 832, cx: 60, cy: 40, cw: 1130, ch: 760, portal: true, over: true, frame: [40, 20, 1210, 812],
    ground: 'boards/suelo-prado', gates: true, road: { xs: [315, 875], y: 790, w: 108 },
    gx0: 280, gy0: 208, gx1: 970, gy1: 548,
    way: [[315, 745], [315, 655], [230, 655], [192, 615], [192, 200], [230, 162], [1020, 162], [1058, 200], [1058, 615], [1020, 655], [875, 655], [875, 745]] },
  // hielo2 y lava3 traen sus propios arcos y portales (ownGates: sin carteles)
  hielo2: { image: 'boards/hielo2', iw: 1248, ih: 832, cx: 120, cy: 90, cw: 1010, ch: 700, portal: true, over: true, ownGates: true, frame: [0, 0, 1248, 832],
    gx0: 310, gy0: 258, gx1: 940, gy1: 588,
    way: [[262, 712], [230, 650], [200, 560], [198, 300], [225, 200], [300, 170], [950, 170], [1030, 200], [1048, 300], [1046, 560], [1015, 650], [985, 712]] },
  lava3: { image: 'boards/lava3', iw: 1248, ih: 832, cx: 90, cy: 60, cw: 1070, ch: 700, portal: true, over: true, ownGates: true, frame: [0, 0, 1248, 832],
    gx0: 340, gy0: 218, gx1: 908, gy1: 515,
    way: [[175, 668], [195, 600], [205, 300], [235, 170], [320, 140], [930, 140], [1020, 170], [1045, 260], [1050, 560], [1052, 668]] },
  // lava4 (assets/tablero-lava-nuevo-2.jpg, sin el fondo azul): sus dos arcos
  // abajo, sus casillas y el camino de adoquines que da la vuelta por fuera
  lava4: { image: 'boards/lava4', iw: 1248, ih: 832, cx: 150, cy: 100, cw: 950, ch: 610, portal: true, over: true, ownGates: true, ownTiles: true, mobScale: 0.8, frame: [133, 40, 1113, 761],
    gx0: 327, gy0: 244, gx1: 918, gy1: 502,
    slabs: { xs: [[330, 440], [450, 558], [568, 676], [686, 795], [804, 915]], ys: [[247, 327], [335, 412], [420, 499]] },
    way: [[362, 622], [362, 660], [208, 660], [208, 160], [1022, 160], [1022, 660], [878, 660], [878, 622]] },
  // tableros con sus casillas ya dibujadas (assets/tablero-estelar*, roca-2 y
  // veneno-2): ownTiles, sin losetas encima; sin portales (taparían la fila de abajo).
  // veneno2 sí los lleva, pequeños (portalW) en las esquinas de abajo del anillo;
  // slabs: dónde está cada losa dibujada (x y y en px), para que la especial
  // la tape justa; mobScale: monstruos algo más pequeños, que el camino es estrecho
  estelar: { image: 'boards/estelar', iw: 1024, ih: 559, cx: 35, cy: 52, cw: 940, ch: 450, portal: true, over: true, ownGates: true, ownTiles: true, frame: [0, 0, 1024, 559],
    gx0: 268, gy0: 165, gx1: 757, gy1: 380,
    way: [[105, 445], [195, 420], [195, 122], [850, 122], [850, 420], [905, 462]] },
  estelar2: { image: 'boards/estelar2', iw: 1248, ih: 832, cx: 65, cy: 65, cw: 1115, ch: 675, portal: true, over: true, ownGates: true, ownTiles: true, frame: [0, 0, 1248, 832],
    gx0: 272, gy0: 188, gx1: 988, gy1: 582,
    way: [[135, 700], [175, 620], [175, 135], [1105, 135], [1105, 620], [1110, 700]] },
  roca2: { image: 'boards/roca2', iw: 1248, ih: 832, cx: 148, cy: 114, cw: 972, ch: 718, portal: true, over: true, ownGates: true, ownTiles: true, frame: [0, 0, 1248, 832],
    gx0: 315, gy0: 222, gx1: 935, gy1: 535,
    way: [[232, 830], [222, 650], [218, 184], [1045, 184], [1050, 650], [965, 830]] },
  veneno2: { image: 'boards/veneno2', iw: 1248, ih: 832, cx: 128, cy: 105, cw: 1002, ch: 563, portal: true, over: true, gates: true, portalW: 1.15, ownTiles: true, mobScale: 0.8, frame: [0, 0, 1248, 832],
    gx0: 245, gy0: 210, gx1: 1000, gy1: 578,
    slabs: { xs: [[252, 393], [404, 543], [554, 691], [701, 842], [849, 993]], ys: [[213, 318], [328, 436], [447, 562]] },
    way: [[192, 660], [200, 615], [198, 175], [1058, 175], [1060, 615], [1066, 660]] }
};
// con varios tableros para un bioma se elige uno al azar en cada partida
var BIOME_FIELD = { prado: ['prado', 'prado3'], bosque: ['prado', 'prado3'], pantano: ['veneno', 'veneno2'], hielo: ['hielo', 'hielo2'], ruinas: ['roca', 'roca2'], desierto: ['roca', 'roca2'], volcan: ['lava2', 'lava4'], cripta: ['estelar', 'estelar2'] };
// de momento solo se juega en los tableros nuevos: cada uno viejo se cambia
// por el nuevo que más se le parece
var NEW_FIELDS = ['prado3', 'hielo2', 'lava4', 'roca2', 'veneno2', 'estelar', 'estelar2'];
var NEW_FIELD_OF = { prado: 'prado3', veneno: 'veneno2', hielo: 'hielo2', roca: 'roca2', lava2: 'lava4', lava3: 'lava4' };
function onlyNewFields(list) {
  var out = [];
  list.forEach(function (f) { f = NEW_FIELD_OF[f] || f; if (NEW_FIELDS.indexOf(f) !== -1 && out.indexOf(f) === -1) out.push(f); });
  return out.length ? out : NEW_FIELDS.slice();
}
function fieldGeo(id) {
  var f = FIELDS[id], cell = (f.gx1 - f.gx0) / COLS;
  var P = function (q) { return { x: (q[0] - f.cx) / cell, y: (q[1] - f.cy) / cell }; };
  return makeGeo({
    image: f.image, px: f, field: id,
    W: f.cw / cell, H: f.ch / cell,
    x0: (f.gx0 - f.cx) / cell, y0: (f.gy0 - f.cy) / cell, cw: 1, ch: (f.gy1 - f.gy0) / ROWS / cell,
    way: f.way.map(P)
  });
}
var FIELD_GEOS = {};
Object.keys(FIELDS).forEach(function (id) { FIELD_GEOS[id] = fieldGeo(id); });
var FIELD_GEO = FIELD_GEOS.prado;

function geoPos(g, d) {
  var acc = 0, w = g.way;
  for (var i = 1; i < w.length; i++) {
    var a = w[i - 1], b = w[i];
    var seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= acc + seg) { var t = (d - acc) / seg; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
    acc += seg;
  }
  return { x: w[w.length - 1].x, y: w[w.length - 1].y };
}
function geoCell(g, i) { return { x: g.x0 + ((i % COLS) + 0.5) * g.cw, y: g.y0 + (Math.floor(i / COLS) + 0.5) * g.ch }; }
function cellCenter(i) { return geoCell(VECTOR_GEO, i); }
function neighbors(i) {
  var c = i % COLS, r = Math.floor(i / COLS), out = [];
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r > 0) out.push(i - COLS);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
}
// una losa al azar del juego del tablero (o la lisa si no tiene)
function floorTileFor(field) { if (FIELDS[field] && FIELDS[field].ownTiles) return 'none'; var ft = FIELD_TILES[field]; return ft ? ft.set + '-' + (1 + Math.floor(Math.random() * ft.n)) : STONE_TILE; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

var ENEMY_SEQ = 0;

function Board(opts) {
  this.name = opts.name;
  this.isAI = !!opts.ai;
  this.aiLevel = opts.aiLevel || 1;      // 0 fácil · 1 normal · 2 difícil
  this.aiStyle = opts.style || null;     // forma de jugar de la máquina (RIVAL_STYLES)
  this.aiMoveT = 5;                      // la táctica recoloca una tropa cada pocos segundos
  this.deck = opts.deck.slice();
  this.cardLv = opts.cardLv || {};
  this.commander = opts.commander || 'aria';
  this.cmdLv = opts.cmdLv || 1;          // nivel del comandante: más fuerza en su habilidad
  this.lives = opts.lives;               // objeto compartido { v, max }
  this.biome = opts.biome || 'prado';
  this.geo = opts.geo || VECTOR_GEO;
  this.mana = opts.mana || 100;
  this.summonCost = 10;
  this.power = {};
  this.deck.forEach(function (id) { this.power[id] = 1; }, this);
  this.cells = new Array(COLS * ROWS).fill(null);
  this.tiles = {};
  // losa de las casillas: la misma en las 15, una del juego de su tablero
  // (FIELD_TILES); la partida la elige una vez para los dos tableros
  var ft = opts.floorTile || floorTileFor(this.geo.field);
  this.floor = this.cells.map(function () { return ft; });
  var spots = shuffleArr(Array.from({ length: COLS * ROWS }, function (_, i) { return i; }));
  pickTileTypes(TILE_COUNT).forEach(function (t, k) { this.tiles[spots[k]] = t; }, this);
  this.enemies = [];
  this.shots = [];
  this.fx = [];
  this.meteors = []; // meteoros de Brann en el aire (el daño llega al caer)
  this.wolves = [];  // lobos de Garra corriendo por el camino
  this.texts = [];
  this.charge = 0;
  this.aiTimer = 1;
  this.kills = 0;
  this.damage = 0;
  this.dmgBy = {};                       // daño por tropa ('cmd': meteoro del comandante)
  this.summons = 0; this.merges = 0; this.powers = 0; this.cmds = 0;
  this.bossKills = 0; this.maxRank = 1;  // para las misiones diarias
  this.bestCombo = 0; this.summonedBy = {}; // para el perfil (meta.stats)
  this.leaked = 0;
  this.event = null;
  this.shake = 0;
  this.orbs = [];                        // gotas de maná camino del contador
  // modificador del 1 contra 1 y habilidades de comandante (ver applySkill)
  this.manaMult = 1;                     // cada gota que ganas vale por esto
  this.chargeMult = 1; this.cmdPowerMult = 1; this.refuerzo = false;
  this.dmgMult = 1; this.bossDmgMult = 1; this.killBonus = 0;
  this.summonStep = 10; this.rank2 = 0; this.powerCostMult = 1; this.slowMult = 1;
  this.rewardMult = 1; this.mergeBoost = 0; this.affMult = 1;
  this.skills = [];
  // reliquias: +daño por elemento, crítico para todas, vida por jefe; invocación dirigida
  this.elemBonus = {}; this.luck = 0; this.caliz = false; this.directed = false;
  // Maldición de Nyx y Escudo divino de Sol (segundos que les quedan)
  this.curseT = 0; this.guardT = 0;
  // combos de fusión: fusiones seguidas en menos de COMBO_TIME
  this.combo = 0; this.comboT = 0;
  // árbol del comandante (CMD_TREE): daño y frenado de la Ventisca, meteoros de
  // más, fuerza y maná de la Maldición, vida del Escudo, Ensamblaje y Forja
  this.cmdDmg = 0; this.cmdSlow = 0; this.extraMeteors = 0; this.curseMult = 1.6; this.curseMana = 0;
  this.solHeal = false; this.heroBoost = 0; this.heroMana = 0; this.forgeMax = FORGE_MAX;
  (opts.cmdNodes || []).forEach(function (n) { this.applyCmdNode(n); }, this);
  // tropas con talentos (opts.talents: { id: [rama de cada piso] })
  this.defs = {};
  Object.keys(opts.talents || {}).forEach(function (id) { if (TALENTS[id]) this.defs[id] = talentDef(id, opts.talents[id]); }, this);
}
var COMBO_TIME = 2;
Board.prototype.applyCmdNode = function (n) {
  Object.keys(n.mul || {}).forEach(function (k) { this[k] *= n.mul[k]; }, this);
  Object.keys(n.add || {}).forEach(function (k) { this[k] += n.add[k]; }, this);
  Object.keys(n.set || {}).forEach(function (k) { this[k] = n.set[k]; }, this);
  Object.keys(n.elem || {}).forEach(function (k) { this.elemBonus[k] = (this.elemBonus[k] || 0) + n.elem[k]; }, this);
  if (n.lives) { this.lives.max += n.lives; this.lives.v += n.lives; }
};
// datos de una tropa en este tablero (con sus talentos, si tiene)
Board.prototype.def = function (id) { return this.defs[id] || UNITS[id]; };
function shuffleArr(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ---------- estadísticas ---------- */
Board.prototype.cc = function (i) { return geoCell(this.geo, i); };
Board.prototype.pos = function (d) { return geoPos(this.geo, d); };
Board.prototype.cardMult = function (id) { return 1 + CARD_BONUS * ((this.cardLv[id] || 1) - 1); };
Board.prototype.unitPower = function (id) {
  return (1 + POWER_BONUS * ((this.power[id] || 1) - 1)) * this.cardMult(id) * this.dmgMult * (1 + (this.elemBonus[UNITS[id].element] || 0));
};
// todo el maná que se gana pasa por aquí (con «Doble de maná» vale el doble); devuelve lo ganado
// Escudo divino de Sol: además de guardar las vidas, frena a los monstruos
var SOL_SLOW = 0.65;
Board.prototype.addMana = function (n) {
  n *= this.manaMult;
  this.mana += n;
  return n;
};
Board.prototype.powerCost = function (id) {
  return Math.round(POWER_COSTS[this.power[id] || 1] * this.powerCostMult);
};
// habilidad de comandante elegida como ventaja en el roguelike (CMD_SKILLS)
Board.prototype.applySkill = function (k) {
  this.skills.push(k);
  if (k === 'recarga') this.chargeMult *= 1.4;
  else if (k === 'maestria') this.cmdPowerMult *= 1.5;
  else if (k === 'refuerzo') this.refuerzo = true;
  else if (k === 'botin') this.killBonus += 3;
  else if (k === 'arsenal') this.dmgMult *= 1.15;
  else if (k === 'cazajefes') this.bossDmgMult *= 1.4;
  else if (k === 'reclutas') this.summonStep = Math.floor(this.summonStep / 2);
  else if (k === 'veterania') this.rank2 += 0.2;
  else if (k === 'escarcha') this.slowMult *= 0.88;
  else if (k === 'muralla') { this.lives.max++; this.lives.v++; }
};
// maná que reparte una tropa de maná y velocidad que da una de apoyo (suben con el rango, la mejora de la partida y el nivel de carta)
Board.prototype.manaAmount = function (u) {
  return Math.round(UNITS[u.id].manaGen.amount * u.rank * (1 + 0.25 * ((this.power[u.id] || 1) - 1)) * this.cardMult(u.id));
};
// intereses de Oria: un tanto por ciento del maná guardado, con tope (los dos suben con el rango)
Board.prototype.interestAmount = function (u) {
  var it = UNITS[u.id].interest, f = (1 + 0.25 * ((this.power[u.id] || 1) - 1)) * this.cardMult(u.id);
  return Math.floor(Math.min(this.mana * it.pct * (1 + 0.5 * (u.rank - 1)), it.cap * u.rank) * f);
};
// probabilidad de que Eco resuene al fusionarse (sube con la mejora de la partida y el nivel de carta)
Board.prototype.echoChance = function () {
  return UNITS.eco.wild.echo * (1 + 0.5 * ((this.power.eco || 1) - 1)) * this.cardMult('eco');
};
// lo que da una tropa de apoyo de cada cosa (speed, dmg, crit, acid; 0 si no la da)
Board.prototype.buffAmount = function (u, key) {
  return (UNITS[u.id].buff[key] || 0) * u.rank * (1 + 0.1 * ((this.power[u.id] || 1) - 1)) * this.cardMult(u.id);
};
Board.prototype.buffSpeed = function (u) { return this.buffAmount(u, 'speed'); };
// suma de lo que dan las de apoyo vecinas de la casilla i (las congeladas no)
Board.prototype.nearBuff = function (i, key) {
  var s = 0;
  neighbors(i).forEach(function (j) {
    var v = this.cells[j];
    if (v && UNITS[v.id].buff && !(v.frozen > 0)) s += this.buffAmount(v, key);
  }, this);
  return s;
};
Board.prototype.affinity = function (i) {
  var u = this.cells[i];
  if (!u) return 0;
  var el = UNITS[u.id].element, n = 0;
  neighbors(i).forEach(function (j) { var v = this.cells[j]; if (v && UNITS[v.id].element === el) n++; }, this);
  return n;
};
/* Bonos por dónde está la tropa (cartas con rasgo de posición):
   twin: por cada vecina igual · mixed: por cada vecina de otra tropa ·
   edge: si está en el anillo de fuera del tablero. Se suman. */
function isEdgeCell(i) { var c = i % COLS, r = Math.floor(i / COLS); return c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1; }
Board.prototype.posBonus = function (i) {
  var u = this.cells[i];
  if (!u) return 0;
  var d = this.def(u.id), b = 0;
  if (d.twin || d.mixed) neighbors(i).forEach(function (j) {
    var v = this.cells[j];
    if (v) b += v.id === u.id ? (d.twin || 0) : (d.mixed || 0);
  }, this);
  if (d.edge && isEdgeCell(i)) b += d.edge;
  // lone: sin ninguna tropa al lado
  if (d.lone && !neighbors(i).some(function (j) { return this.cells[j]; }, this)) b += d.lone;
  return b;
};
// lo bien que queda una tropa en la casilla i (para que la máquina la coloque)
Board.prototype.placeScore = function (i) {
  var u = this.cells[i];
  if (UNITS[u.id].buff) return neighbors(i).filter(function (j) { var v = this.cells[j]; return v && UNITS[v.id].dmg; }, this).length;
  return this.posBonus(i);
};
// tropas en el tablero sin contar la de la casilla i (Legión de Valka)
Board.prototype.allies = function (i) { var n = 0; for (var k = 0; k < this.cells.length; k++) if (k !== i && this.cells[k]) n++; return n; };
Board.prototype.unitDamage = function (i) {
  var u = this.cells[i], d = this.def(u.id);
  var m = RANK_MULT[u.rank] * this.unitPower(u.id) * (1 + AFFINITY_BONUS * this.affMult * this.affinity(i)) * (1 + this.posBonus(i));
  if (d.legion) m *= 1 + d.legion.per * this.allies(i);
  if (this.tiles[i] === 'altar') m *= 1 + TILES.altar.dmg;
  m *= 1 + this.nearBuff(i, 'dmg');
  return (d.dmg || 0) * m;
};
Board.prototype.unitSpeed = function (i) {
  var s = 1 + this.nearBuff(i, 'speed');
  if (this.tiles[i] === 'atalaya') s += TILES.atalaya.speed;
  return s;
};

/* ---------- acciones ---------- */
Board.prototype.freeCells = function () {
  var out = [];
  for (var i = 0; i < this.cells.length; i++) if (!this.cells[i]) out.push(i);
  return out;
};
Board.prototype.summon = function (gratis, forceId) {
  var cost = this.summonCost * (forceId ? 2 : 1);
  if (!gratis && this.mana < cost) return 'mana';
  var free = this.freeCells();
  if (!free.length) return 'full';
  var i = pick(free), id = forceId || pick(this.deck), d = UNITS[id];
  if (!gratis) {
    this.mana -= cost;
    this.summonCost += this.summonStep;
  }
  this.summons++;
  this.summonedBy[id] = (this.summonedBy[id] || 0) + 1;
  var rank = Math.random() < this.rank2 ? 2 : 1;
  this.maxRank = Math.max(this.maxRank, rank);
  // cae desde arriba; el anillo y el polvo salen al tocar suelo (landFx)
  this.cells[i] = { id: id, rank: rank, cd: Math.random(), frozen: 0, anim: 0, gen: 0, drop: 1 };
  if (this.isAI && (d.twin || d.mixed || d.edge || d.lone || d.buff)) {
    // la máquina coloca las cartas de posición donde más rinden (y las de
    // apoyo, donde tengan más tropas que ataquen alrededor)
    var best = i, bv = this.placeScore(i);
    free.forEach(function (j) {
      if (j === i) return;
      this.cells[j] = this.cells[i]; this.cells[i] = null;
      var v = this.placeScore(j);
      this.cells[i] = this.cells[j]; this.cells[j] = null;
      if (v > bv) { bv = v; best = j; }
    }, this);
    if (best !== i) { this.cells[best] = this.cells[i]; this.cells[i] = null; }
  }
  return 'ok';
};
Board.prototype.canMerge = function (a, b) {
  var u = this.cells[a], v = this.cells[b];
  // Eco (wild) se fusiona con cualquier tropa de su mismo rango
  return a !== b && u && v && u.rank === v.rank && u.rank < MAX_RANK && (u.id === v.id || !!UNITS[u.id].wild || !!UNITS[v.id].wild);
};
// Fusión dirigida: la tropa de destino conserva su tipo y sube un rango.
// start: desde dónde sale volando la tropa que se funde (donde la soltaste
// al arrastrar); si no, desde su casilla
Board.prototype.merge = function (from, to, start) {
  if (!this.canMerge(from, to)) return false;
  var v = this.cells[to], src = this.cells[from], a = start || this.cc(from), p = this.cc(to);
  this.cells[from] = null;
  this.fx.push({ type: 'fly', id: src.id, rank: src.rank, x1: a.x, y1: a.y, x2: p.x, y2: p.y, life: MERGE_FLY, max: MERGE_FLY });
  // Eco: el resultado es la otra tropa, y a veces resuena y sube dos rangos
  var echo = !!(UNITS[src.id].wild || UNITS[v.id].wild);
  if (UNITS[v.id].wild && !UNITS[src.id].wild) v.id = src.id;
  v.ecoFx = echo;
  v.rank++;
  // Vórtice: la fusión encima sube un rango más
  if (this.tiles[to] === 'vortice' && v.rank < MAX_RANK) { v.rank = Math.min(MAX_RANK, v.rank + TILES.vortice.merge); this.addText(p.x, p.y - 1.05, '¡Vórtice!', '#c9b8ff', true); }
  if (echo && v.rank < MAX_RANK && Math.random() < this.echoChance()) { v.rank++; v.echoed = true; }
  else if (v.rank < MAX_RANK && Math.random() < this.mergeBoost) { v.rank++; v.echoed = true; }
  this.merges++;
  this.maxRank = Math.max(this.maxRank, v.rank);
  // combo: otra fusión antes de COMBO_TIME segundos da maná, más cuanto más larga la racha
  this.combo = this.comboT > 0 ? this.combo + 1 : 1;
  this.comboT = COMBO_TIME;
  this.bestCombo = Math.max(this.bestCombo, this.combo);
  if (this.combo >= 2) {
    var cg = this.addMana(10 * (this.combo - 1));
    this.addText(p.x, p.y - 0.75, '¡Combo x' + this.combo + '! +' + cg + ' 💧', GAME_PALETTE.goldYellow, true);
    if (this.onCombo) this.onCombo(this.combo);
  }
  v.anim = 0; v.drop = 0;
  v.pop = 1 + MERGE_FLY / MERGE_POP_TIME; // espera a que llegue y entonces rebota
  v.frozen = 0;
  return true;
};
// la tropa invocada toca suelo: anillo de su color y polvo a los pies
Board.prototype.landFx = function (i, u) {
  var p = this.cc(i);
  // círculo mágico con humo y destello (assets/fx/invocar)
  if (art('fx/invocar-aro')) this.fx.push({ type: 'pic', key: 'fx/invocar-aro', x: p.x, y: p.y + 0.12, size: 0.95, rot: 0, grow: 0.4, life: 0.45, max: 0.45 });
  if (art('fx/invocar')) this.fx.push({ type: 'pic', key: 'fx/invocar', x: p.x, y: p.y - 0.06, size: 1.05, rot: 0, grow: 0.5, life: 0.5, max: 0.5 });
  else this.addFx('ring', p, UNITS[u.id].color);
  for (var n = 0; n < 6; n++) {
    var sd = n % 2 ? 1 : -1;
    this.fx.push({ type: 'part', x: p.x + sd * 0.15, y: p.y + 0.36, vx: sd * (0.6 + Math.random() * 0.8), vy: -0.4 - Math.random() * 0.6, r: 0.04 + Math.random() * 0.03, color: '#e9dcc0', life: 0.35, max: 0.35 });
  }
};
// llega la tropa que se funde: estallido dorado y el rango nuevo
Board.prototype.mergeArriveFx = function (i, u) {
  var p = this.cc(i);
  // burbuja dorada con flechas hacia arriba (assets/fx/fusion); Doblón, con
  // su propio remolino de monedas (assets/fx/fusion-doblon)
  // con Eco de por medio, su vórtice (assets/fx/fusion-eco)
  var fk = u.ecoFx && art('fx/fusion-eco') ? 'fx/fusion-eco' : u.id === 'doblon' && art('fx/fusion-doblon') ? 'fx/fusion-doblon' : 'fx/fusion';
  u.ecoFx = false;
  if (art(fk)) this.fx.push({ type: 'pic', key: fk, x: p.x, y: p.y - (fk === 'fx/fusion' ? 0.12 : 0), size: fk === 'fx/fusion' ? 1.15 : 1.05, rot: 0, grow: 0.45, life: 0.55, max: 0.55 });
  else this.addFx('burst', p, '#ffd166');
  this.addText(p.x, p.y - 0.45, 'Rango ' + u.rank, '#ffd166', true);
  if (u.echoed) {
    u.echoed = false;
    this.addText(p.x, p.y - 0.85, '¡Resuena!', '#d8c4ff', true);
    if (art('fx/eco-resuena')) this.fx.push({ type: 'pic', key: 'fx/eco-resuena', x: p.x, y: p.y - 0.2, size: 1.1, rot: 0, grow: 0.4, life: 0.8, max: 0.8 });
    else this.addFx('burst', p, '#b48bff');
  }
};
Board.prototype.powerUp = function (id) {
  var lv = this.power[id] || 1;
  if (lv >= POWER_MAX) return 'max';
  var cost = this.powerCost(id);
  if (this.mana < cost) return 'mana';
  this.mana -= cost;
  this.power[id] = lv + 1;
  this.powers++;
  for (var i = 0; i < this.cells.length; i++) if (this.cells[i] && this.cells[i].id === id) { this.cells[i].anim = 0.8; this.addFx('ring', this.cc(i), '#7dffb0'); }
  return 'ok';
};
var FORGE_MAX = 5; // Forja de Torvald: hasta este rango
// héroes: ¿valen estas casillas para su habilidad? (Morgana: dos del mismo
// rango; Torvald: una que pueda subir)
Board.prototype.heroValid = function (picks) {
  var c = COMMANDERS[this.commander], a = this.cells[picks[0]], b = this.cells[picks[1]];
  if (!a || a.rank >= MAX_RANK) return false;
  if (c.hero === 1) return picks.length === 1 && a.rank < this.forgeMax;
  if (picks.length === 1) return true;
  return picks[0] !== picks[1] && b && b.rank === a.rank;
};
// la máquina elige por su cuenta las tropas de su héroe
Board.prototype.heroPicks = function () {
  var c = COMMANDERS[this.commander], list = [];
  this.cells.forEach(function (u, i) { if (u && u.rank < (c.hero === 1 ? this.forgeMax : MAX_RANK) && UNITS[u.id].dmg) list.push(i); }, this);
  if (c.hero === 1) {
    list.sort(function (x, y) { return this.cells[y].rank - this.cells[x].rank; }.bind(this));
    return list.length ? [list[0]] : null;
  }
  for (var x = 0; x < list.length; x++) for (var y = x + 1; y < list.length; y++) {
    var p = [list[x], list[y]];
    if (this.heroValid(p) && !this.canMerge(p[0], p[1])) return p;
  }
  return null;
};
Board.prototype.useCommander = function (picks) {
  if (this.charge < 1) return false;
  var cmd = this.commander, pw = cmdPower(cmd, this.cmdLv) * this.cmdPowerMult;
  if (COMMANDERS[cmd].hero) {
    if (!picks || !this.heroValid(picks)) return false;
    this.charge = 0; this.cmds++;
    var u = this.cells[picks[picks.length - 1]];
    if (picks.length === 2) {
      // Ensamblaje: la primera vuela a la segunda y se funden en esta
      var src = this.cells[picks[0]], a0 = this.cc(picks[0]), p1 = this.cc(picks[1]);
      this.cells[picks[0]] = null;
      this.fx.push({ type: 'fly', id: src.id, rank: src.rank, x1: a0.x, y1: a0.y, x2: p1.x, y2: p1.y, life: MERGE_FLY, max: MERGE_FLY });
      u.pop = 1 + MERGE_FLY / MERGE_POP_TIME;
      this.merges++;
    } else u.pop = 1;
    u.rank++; u.frozen = 0; u.anim = 0;
    if (picks.length === 2 && this.heroBoost && u.rank < MAX_RANK && Math.random() < this.heroBoost) { u.rank++; u.echoed = true; }
    if (picks.length === 2 && this.heroMana) this.addMana(this.heroMana);
    this.maxRank = Math.max(this.maxRank, u.rank);
    var pu = this.cc(picks[picks.length - 1]);
    this.addFx('flash', pu, COMMANDERS[cmd].color);
    if (picks.length === 2) {
      var pa = this.cc(picks[0]), dl = Math.hypot(pu.x - pa.x, pu.y - pa.y);
      this.fx.push({ type: 'pic', key: 'fx/morgana-ensamblaje', x: (pa.x + pu.x) / 2, y: (pa.y + pu.y) / 2, size: Math.max(1.3, dl * 1.35), rot: Math.atan2(pu.y - pa.y, pu.x - pa.x), grow: 0.5, life: 0.9, max: 0.9 });
    } else this.fx.push({ type: 'rise', key: 'fx/torvald-forja', x: pu.x, y: pu.y, size: 0.95, life: 1, max: 1 });
    this.addText(pu.x, pu.y - 0.6, picks.length === 2 ? '¡Ensamblaje!' : '¡Forja! +1 rango', COMMANDERS[cmd].color, true);
    if (this.refuerzo) this.summon(true);
    return true;
  }
  this.charge = 0;
  this.cmds++;
  if (cmd === 'aria') {
    this.enemies.forEach(function (e) { e.stun = Math.max(e.stun, pw); e.stunIce = true; });
    if (this.cmdSlow) this.enemies.forEach(function (e) { e.slowPct = Math.max(e.slowPct, this.cmdSlow); e.slowT = pw + 4; }, this);
    if (this.cmdDmg) { var vd = this.cmdDmg * cmdMult(this.cmdLv) * hpScale(); this.enemies.slice().forEach(function (e) { this.hit(e, vd, null, 'meteor'); }, this); }
    this.addFx('flash', { x: this.geo.W / 2, y: this.geo.H / 2 }, '#bfefff');
    this.addSweep('fx/ventisca');
  } else if (cmd === 'merlo') {
    // la marea crece con la partida: +6% por oleada
    var gain = this.addMana(Math.round(pw * (1 + 0.06 * Math.max(0, (this.battle ? this.battle.wave : 1) - 1))));
    this.addText(this.geo.W / 2, this.geo.H / 2, '+' + gain + ' 💧', GAME_PALETTE.manaBlue, true);
    this.addFx('flash', { x: this.geo.W / 2, y: this.geo.H / 2 }, '#b26bff');
    this.addSweep('fx/marea');
  } else if (cmd === 'brann') {
    // caen uno tras otro sobre los más adelantados; el daño llega al tocar suelo
    var targets = this.enemies.slice().sort(function (a, b) { return b.d - a.d; }).slice(0, brannMeteors(this.cmdLv) + this.extraMeteors);
    var dmg = pw * hpScale();
    targets.forEach(function (e, k) {
      var t = METEOR_FALL + k * 0.09;
      this.meteors.push({ e: e, x: e.x, y: e.y, t: t, dmg: dmg });
      this.fx.push({ type: 'fall', key: 'fx/meteoro', x: e.x, y: e.y, size: 0.95, life: t, max: t });
    }, this);
  }
  else if (cmd === 'nyx') {
    this.curseT = pw;
    this.addFx('flash', { x: this.geo.W / 2, y: this.geo.H / 2 }, '#c04bff');
    this.enemies.forEach(function (e) { this.fx.push({ type: 'pic', key: 'fx/nyx-chispas', x: e.x, y: e.y - 0.15, size: 0.8, rot: 0, grow: 0.4, life: 0.7, max: 0.7 }); }, this);
    this.addText(this.geo.W / 2, this.geo.H / 2, '¡Maldición!', '#e0a8ff', true);
  } else if (cmd === 'sol') {
    this.guardT = pw;
    var ex = this.pos(this.geo.len - 0.35);
    this.fx.push({ type: 'pic', key: 'fx/sol-escudo', x: ex.x, y: ex.y, size: 1.6, rot: 0, grow: 0.3, life: 0.6, max: 0.6 });
    if (this.solHeal && this.lives.v < this.lives.max) { this.lives.v++; this.addText(this.geo.W / 2, this.geo.H / 2 + 0.5, '+1 vida', GAME_PALETTE.healthGreen, true); }
    this.addFx('flash', { x: this.geo.W / 2, y: this.geo.H / 2 }, '#ffe08a');
    this.addText(this.geo.W / 2, this.geo.H / 2, '¡Escudo divino!', '#ffe08a', true);
  }
  if (this.refuerzo) this.summon(true);
  return true;
};

/* ---------- monstruos ---------- */
Board.prototype.spawn = function (kind, hp, opt) {
  opt = opt || {};
  var boss = !!opt.boss;
  var d = boss ? BOSSES[kind] : ENEMIES[kind];
  var e = {
    id: ++ENEMY_SEQ, kind: kind, boss: boss, seed: Math.random() * 10,
    hp: hp, maxHp: hp, d: opt.d || 0, x: 0, y: 0,
    speed: (this.geo.len / BASE_CROSS_TIME) * d.speed * (opt.speedMult || 1),
    slowPct: 0, slowT: 0, poison: 0, poisonT: 0, stun: 0, shield: 0, abilityT: 3, dead: false, critT: 0, breakT: 0,
    hitT: 0, kbx: 0, kby: 0,
    armor: d.armor || 0, dodge: d.dodge || 0,
    barrier: d.barrier ? hp * d.barrier : 0
  };
  var p = this.pos(e.d); e.x = p.x; e.y = p.y;
  this.enemies.push(e);
  return e;
};
// Escudo divino de Sol activo (en co-op vale también el del aliado)
Board.prototype.guarded = function () { return this.guardT > 0 || !!(this.partner && this.partner.guardT > 0); };
Board.prototype.hit = function (e, dmg, unitDef, kind) {
  if (e.dead) return;
  if (e.shield > 0) { this.addText(e.x, e.y - 0.4, 'Bloqueo', '#c9d4e6'); return; }
  var dodge = e.dodge * (this.event === 'niebla' ? 2 : 1);
  if (dodge && kind !== 'meteor' && kind !== 'ember' && Math.random() < dodge) { this.addText(e.x, e.y - 0.4, 'Fallo', '#b6a6ff'); return; }
  var crit = false;
  if (unitDef && unitDef.crit && Math.random() < unitDef.crit.chance) { dmg *= unitDef.crit.mult; crit = true; }
  else if (unitDef && this.luck && Math.random() < this.luck) { dmg *= 2; crit = true; }
  // Maldición de Nyx (en co-op, la de cualquiera de los dos)
  var cb = this.curseT > 0 ? this : this.partner && this.partner.curseT > 0 ? this.partner : null;
  if (cb) dmg *= cb.curseMult;
  if (unitDef && unitDef.bossMult && e.boss) dmg *= unitDef.bossMult;
  if (unitDef && e.boss) dmg *= this.bossDmgMult;
  if (e.tangleT > 0) dmg *= 1 + e.tanglePct;
  if (e.acidT > 0) dmg *= 1 + e.acidPct;
  if (!(unitDef && unitDef.pierce)) dmg *= 1 - e.armor;
  else if (e.armor > 0) {
    // las que perforan (Titán, Midas) le rompen la armadura para siempre
    e.armor = 0; e.breakT = 0.55;
    this.addText(e.x, e.y - 0.55, '¡Armadura rota!', '#c9d4e6');
  }
  if (e.barrier > 0) {
    // escudo de vida: se gasta antes que la vida; al romperse, estalla en luz
    var soak = Math.min(e.barrier, dmg);
    e.barrier -= soak; dmg -= soak;
    if (e.barrier <= 0) {
      e.barrier = 0;
      this.fx.push({ type: 'pic', key: 'fx/luz-impacto', x: e.x, y: e.y - 0.15, size: 0.95, rot: 0, grow: 0.4, life: 0.45, max: 0.45 });
      this.addText(e.x, e.y - 0.6, '¡Escudo roto!', '#ffe08a', true);
    }
    if (dmg <= 0) { e.hitT = HIT_TIME; return; }
  }
  e.lastHit = deathKind(unitDef, kind);
  var src = unitDef ? unitDef.id : 'cmd';
  this.dmgBy[src] = (this.dmgBy[src] || 0) + Math.min(dmg, Math.max(0, e.hp));
  e.hp -= dmg;
  this.damage += dmg;
  // golpe: destello blanco, aplastón y un empujoncito hacia fuera del tablero
  e.hitT = HIT_TIME;
  var hcx = this.geo.W / 2, hcy = this.geo.H / 2, hd = Math.hypot(e.x - hcx, e.y - hcy) || 1;
  e.kbx = (e.x - hcx) / hd * 0.05; e.kby = (e.y - hcy) / hd * 0.05;
  if (crit) this.addText(e.x, e.y - 0.5, '¡' + fmtNum(dmg) + '!', GAME_PALETTE.damageRed, true, true);
  if (crit && !(unitDef && unitDef.critPic)) e.critT = 0.55;
  if (crit && unitDef && unitDef.critPic) this.fx.push({ type: 'pic', key: unitDef.critPic, x: e.x, y: e.y - 0.3, size: 0.75, rot: 0, grow: 0.4, life: 0.55, max: 0.55 });
  // remate (Seren): un monstruo que no sea jefe y quede por debajo del umbral cae al instante
  if (unitDef && unitDef.execute && !e.boss && e.hp > 0 && e.hp <= e.maxHp * unitDef.execute) {
    this.dmgBy[src] += e.hp;
    e.hp = 0;
    this.addText(e.x, e.y - 0.5, '¡Remate!', '#c9b8ff', true);
  }
  if (e.hp <= 0) {
    if (unitDef && unitDef.bounty) { var bn = this.addMana(unitDef.bounty); this.addText(e.x, e.y - 0.25, '+' + bn + ' 💧', GAME_PALETTE.goldYellow); }
    this.kill(e);
  }
};
Board.prototype.kill = function (e) {
  if (e.dead) return;
  e.dead = true;
  this.kills++;
  if (e.boss) this.bossKills++;
  var raw = Math.round((e.boss ? 100 : ENEMIES[e.kind].reward) * KILL_MANA_MULT * (this.event === 'lluvia' ? 2 : 1) * this.rewardMult);
  var reward = this.addMana(raw + this.killBonus);
  // cooperativo: el maná de cada baja es para los dos
  if (this.shareWith) this.shareWith.addMana(raw);
  if (this.curseT > 0 && this.curseMana) this.addMana(this.curseMana);
  this.deathFx(e);
  if (e.boss) {
    this.addText(e.x, e.y - 0.5, '+' + reward + ' 💧', GAME_PALETTE.manaBlue, true);
    this.shake = 0.4;
    if (this.caliz && this.lives.v < this.lives.max) { this.lives.v++; this.addText(e.x, e.y - 0.9, '+1 vida', GAME_PALETTE.healthGreen, true); }
    if (BOSSES[e.kind].ability === 'split') {
      for (var k = 0; k < 4; k++) this.spawn('blob', e.maxHp * 0.08, { d: Math.max(0, e.d - k * 0.35) });
    }
  }
  if (this.onKill) this.onKill(e);
};

Board.prototype.findTarget = function (mode, exclude) {
  var best = null, bestV = -Infinity;
  for (var k = 0; k < this.enemies.length; k++) {
    var e = this.enemies[k];
    if (e.dead || (exclude && exclude[e.id])) continue;
    var v = mode === 'strong' ? e.hp : e.d;
    if (v > bestV) { bestV = v; best = e; }
  }
  return best;
};

/* ---------- disparos ---------- */
// los destellos que tapan mucho a la tropa van más pequeños
var FLASH_SIZE = { holy: 0.3, shadow: 0.36, bullet: 0.5 };
Board.prototype.fire = function (i, u) {
  var d = this.def(u.id);
  if (d.wolves) return this.releaseWolf(i, u);
  var target = this.findTarget(d.target);
  if (!target) return false;
  var from = this.cc(i);
  u.aim = Math.atan2(target.y - from.y, target.x - from.x);
  u.recoil = 1;
  u.atk = ATK_POSE_TIME; // pose de ataque mientras sale el proyectil
  if (d.chain) {
    // rayo instantáneo que salta entre enemigos
    var hitSet = {}, cur = target, prev = from, dmg = this.unitDamage(i);
    var jumps = d.chain + Math.floor((u.rank - 1) / 2);
    this.fx.push({ type: 'pic', key: 'fx/rayo-destello', x: from.x, y: from.y - 0.12, size: 0.5, rot: 0, grow: 0.5, life: 0.2, max: 0.2 });
    for (var j = 0; j < jumps && cur; j++) {
      this.fx.push({ type: 'bolt', x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, life: 0.18, max: 0.18, color: d.color2 });
      this.fx.push({ type: 'pic', key: 'fx/rayo-impacto', x: cur.x, y: cur.y, size: 0.55, rot: 0, grow: 0.5, life: 0.3, max: 0.3 });
      hitSet[cur.id] = true;
      this.applyHit(cur, dmg, d, u);
      prev = { x: cur.x, y: cur.y };
      dmg *= 0.75;
      cur = this.nearestTo(prev, hitSet, 2.2);
    }
    return true;
  }
  this.shots.push({ x: from.x, y: from.y, sx: from.x, sy: from.y, target: target, t: 0, dur: d.proj === 'bullet' ? 0.12 : 0.32, kind: d.proj, color: d.color, color2: d.color2, dmg: this.unitDamage(i), def: d, unit: u });
  if (d.legion) {
    // Legión: con muchas tropas en el campo, lanzas también a otros enemigos
    var nAl = this.allies(i) + 1, taken = {};
    taken[target.id] = true;
    d.legion.extra.forEach(function (need) {
      if (nAl < need) return;
      var t2 = this.findTarget(d.target, taken);
      if (!t2) return;
      taken[t2.id] = true;
      this.shots.push({ x: from.x, y: from.y, sx: from.x, sy: from.y, target: t2, t: 0, dur: 0.32, kind: d.proj, color: d.color, color2: d.color2, dmg: this.unitDamage(i), def: d, unit: u });
    }, this);
  }
  // destello ilustrado en la boca del arma
  if (FX_OF[d.proj]) {
    var mk = 'fx/' + FX_OF[d.proj] + '-destello';
    this.fx.push({ type: 'pic', key: mk, x: from.x + Math.cos(u.aim) * 0.32, y: from.y - 0.12 + Math.sin(u.aim) * 0.32,
      size: FLASH_SIZE[d.proj] || 0.46, rot: FX_TURNS[mk] ? u.aim : 0, grow: 0.5, life: 0.16, max: 0.16 });
  }
  return true;
};
// Garra suelta un lobo al final del camino, que corre hacia la entrada
Board.prototype.releaseWolf = function (i, u) {
  if (!this.enemies.length) return false;
  var d = this.def(u.id), p = this.cc(i), start = this.geo.len - 0.15, at = this.pos(start);
  u.aim = Math.atan2(at.y - p.y, at.x - p.x);
  u.recoil = 1;
  u.atk = 0.5;
  this.wolves.push({ d: start, x: at.x, y: at.y, dir: -1, t: 0, biteT: 0, bitten: {}, v: Math.random() < 0.5 ? '' : '-2',
    bites: d.wolves.bites + Math.floor((u.rank - 1) / 2), dmg: this.unitDamage(i), def: d, unit: u });
  this.fx.push({ type: 'pic', key: 'fx/muerte-puf', x: at.x, y: at.y - 0.05, size: 0.55, rot: 0, grow: 0.4, life: 0.4, max: 0.4 });
  // el espíritu de lobo sale aullando de Garra
  this.fx.push({ type: 'pic', key: 'fx/garra-espiritu', x: p.x + 0.15, y: p.y - 0.45, size: 0.8, rot: 0, grow: 0.4, life: 0.6, max: 0.6 });
  return true;
};
Board.prototype.nearestTo = function (p, exclude, maxD) {
  var best = null, bd = maxD;
  this.enemies.forEach(function (e) {
    if (e.dead || exclude[e.id]) return;
    var dd = Math.hypot(e.x - p.x, e.y - p.y);
    if (dd < bd) { bd = dd; best = e; }
  });
  return best;
};
Board.prototype.applyHit = function (e, dmg, d, u) {
  // el bono de posición también cuenta para el veneno y la quemadura
  var at = this.cells.indexOf(u);
  var mult = RANK_MULT[u.rank] * this.unitPower(u.id) * (1 + (at >= 0 ? this.posBonus(at) : 0));
  if (d.slow) {
    e.slowPct = Math.min(d.slow.max + 0.03 * (u.rank - 1), e.slowPct + d.slow.pct * (1 - (e.boss ? 0 : ENEMIES[e.kind].slowRes || 0)));
    e.slowT = d.slow.dur;
  }
  if (d.poison) {
    e.poison += d.poison.dps * mult * 0.35; e.poisonT = d.poison.dur; e.poisonBy = d.id;
    // nube tóxica: salpica a los de alrededor con algo menos de veneno
    if (d.poison.area) this.enemies.forEach(function (o) {
      if (o === e || o.dead || Math.hypot(o.x - e.x, o.y - e.y) > d.poison.area) return;
      o.poison += d.poison.dps * mult * 0.35 * 0.6; o.poisonT = d.poison.dur; o.poisonBy = d.id;
    });
  }
  if (d.stun && Math.random() < d.stun.chance) {
    e.stun = Math.max(e.stun, d.stun.dur);
    e.stunIce = d.element === 'hielo'; // congelado (cubo de hielo) o aturdido (remolino)
    if (d.stunPic) this.fx.push({ type: 'pic', key: d.stunPic, x: e.x, y: e.y, size: 0.8, rot: 0, grow: 0.4, life: 0.6, max: 0.6 });
  }
  if (d.tangle) {
    // Frida: zarzas; el monstruo recibe más daño de todos mientras dure
    var tp = d.tangle.pct + d.tangle.perRank * (u.rank - 1);
    e.tanglePct = e.tangleT > 0 ? Math.max(e.tanglePct, tp) : tp;
    e.tangleT = d.tangle.dur;
  }
  if (d.knock && !e.boss && !(e.knockCd > 0)) {
    // Marea: la ola lo devuelve hacia atrás por el camino
    e.d = Math.max(0, e.d - (d.knock.dist + d.knock.perRank * (u.rank - 1)));
    e.knockCd = d.knock.cd;
    var kp = this.pos(e.d); e.x = kp.x; e.y = kp.y;
    if (art('fx/marea-tiro')) this.fx.push({ type: 'pic', key: 'fx/marea-tiro', x: e.x, y: e.y, size: 0.7, rot: 0, grow: 0.4, life: 0.4, max: 0.4 });
  }
  if (d.embers) {
    // Pyra: con max ascuas, estalla por un trozo de su vida máxima
    e.embers = (e.embers || 0) + 1;
    if (e.embers >= d.embers.max) {
      e.embers = 0;
      var burst = e.maxHp * (e.boss ? d.embers.boss : d.embers.pct) * (1 + 0.1 * (u.rank - 1));
      this.fx.push({ type: 'pic', key: 'fx/pyra-estallido', x: e.x, y: e.y - 0.1, size: 1.0, rot: 0, grow: 0.4, life: 0.5, max: 0.5 });
      this.addText(e.x, e.y - 0.7, '¡Estallido!', '#ffb347', true);
      this.enemies.forEach(function (o) {
        if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) <= 0.9) this.hit(o, burst * d.embers.splash, d, 'ember');
      }, this);
      this.hit(e, burst, d, 'ember');
    }
  }
  var acid = at >= 0 ? this.nearBuff(at, 'acid') : 0;
  if (acid > 0) {
    // Tilo: ácido; quita armadura y el monstruo recibe más daño un rato
    e.acidPct = e.acidT > 0 ? Math.max(e.acidPct, acid) : acid;
    e.acidT = 3;
    if (e.armor > 0) e.armor = Math.max(0, e.armor - acid * 0.5);
  }
  // Diana y la luz de Elian: golpe crítico doble
  var crit = (at >= 0 && this.tiles[at] === 'diana' ? TILES.diana.crit : 0) + (at >= 0 ? Math.min(0.75, this.nearBuff(at, 'crit')) : 0);
  if (crit > 0 && Math.random() < crit) {
    // Diana: golpe crítico doble
    dmg *= 2; e.critT = 0.55;
    this.addText(e.x, e.y - 0.5, '¡' + fmtNum(dmg) + '!', GAME_PALETTE.damageRed, true, true);
  }
  var spl = (d.splash || 0) + (at >= 0 && this.tiles[at] === 'semillero' ? TILES.semillero.splash : 0);
  if (spl > 0) {
    var r = spl + 0.06 * u.rank;
    this.enemies.forEach(function (o) {
      if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) <= r) this.hit(o, dmg * 0.6, d, d.proj);
    }, this);
    // con impacto ilustrado no hace falta el aro (el dibujo ya marca el área)
    if (!FX_OF[d.proj]) this.addFx('boom', { x: e.x, y: e.y }, d.color2, r);
  }
  this.hit(e, dmg, d, d.proj);
};

/* ---------- efectos visuales ---------- */
// muerte: nube con gotas de maná y una ráfaga de trocitos del color del monstruo
var MAX_PARTS = 160;
// con el ahorro de batería, muchos menos trocitos
function maxParts() { return typeof meta !== 'undefined' && meta.settings.saver ? 40 : MAX_PARTS; }
/* Cómo muere el monstruo (assets/fx/muerte-*): según el último golpe.
   Fuego y quemaduras, fuego; veneno, veneno; golpes pesados (bombas,
   engranajes, balas, monedas, mordiscos), humo y piedras; el resto, estallido. */
var DEATH_HEAVY = { bomb: true, gear: true, bullet: true, coin: true };
function deathKind(d, kind) {
  if (kind === 'fire' || kind === 'ember' || kind === 'meteor') return 'fuego';
  if (kind === 'poison') return 'veneno';
  if (DEATH_HEAVY[kind] || (d && d.wolves)) return 'humo';
  return 'estallido';
}
Board.prototype.deathFx = function (e) {
  var col = e.boss ? BOSSES[e.kind].color : ENEMIES[e.kind].color, big = e.boss ? 1.8 : 1;
  var dk = 'fx/muerte-' + (e.lastHit || 'estallido');
  if (!art(dk)) this.addFx('pop', { x: e.x, y: e.y }, col);
  else this.fx.push({ type: 'pic', key: dk, x: e.x, y: e.y - 0.15, size: 0.95 * big, rot: 0, grow: 0.35, life: 0.5, max: 0.5 });
  var parts = 0;
  for (var k = 0; k < this.fx.length; k++) if (this.fx[k].type === 'part') parts++;
  var many = maxParts() < MAX_PARTS ? 2 : 5;
  for (var n = 0; n < many * big && parts < maxParts(); n++, parts++) {
    var a = Math.random() * Math.PI * 2, v = 1.2 + Math.random() * 1.8;
    this.fx.push({ type: 'part', x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, r: 0.035 + Math.random() * 0.04, color: col, life: 0.45, max: 0.45 });
  }
  // gotas de maná que vuelan en curva hasta el contador (las dibuja y
  // cuenta battle.js; aquí solo nacen y caducan)
  var orbs = e.boss ? 5 : 1 + Math.min(2, Math.floor((ENEMIES[e.kind].reward || 0) / 8));
  for (var o = 0; o < orbs && this.orbs.length < 40; o++) {
    this.orbs.push({ x: e.x, y: e.y, t: 0, delay: o * 0.07, dur: 0.55 + Math.random() * 0.1, side: Math.random() < 0.5 ? -1 : 1 });
  }
};
var METEOR_FALL = 0.32; // segundos que tarda un meteoro en caer
// ola ilustrada que cruza el tablero de izquierda a derecha (dos filas desfasadas)
Board.prototype.addSweep = function (key) {
  var H = this.geo.H;
  this.fx.push({ type: 'sweep', key: key, y: H * 0.36, life: 0.9, max: 0.9 });
  this.fx.push({ type: 'sweep', key: key, y: H * 0.74, life: 1.05, max: 1.05 });
};
Board.prototype.addFx = function (type, p, color, r) {
  this.fx.push({ type: type, x: p.x, y: p.y, color: color, r: r || 0.6, life: type === 'flash' ? 0.5 : 0.45, max: type === 'flash' ? 0.5 : 0.45 });
};
// dmg: es un número de golpe (se puede quitar en Opciones)
Board.prototype.addText = function (x, y, text, color, big, dmg) {
  if (this.texts.length > 40) this.texts.shift();
  this.texts.push({ x: x, y: y, text: text, color: color, big: !!big, dmg: !!dmg, life: 0.9, max: 0.9 });
};

/* ---------- bucle ---------- */
Board.prototype.update = function (dt) {
  var i, k;
  this.charge = Math.min(1, this.charge + dt * this.chargeMult / cmdCd(this.commander, this.cmdLv));
  if (this.curseT > 0) this.curseT -= dt;
  if (this.guardT > 0) this.guardT -= dt;
  if (this.comboT > 0) this.comboT -= dt;
  if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);

  // tropas
  for (i = 0; i < this.cells.length; i++) {
    var u = this.cells[i];
    if (!u) continue;
    if (u.anim > 0) u.anim = Math.max(0, u.anim - dt * 2.5);
    if (u.drop > 0) {
      var wd = u.drop;
      u.drop = Math.max(0, u.drop - dt / SUMMON_TIME);
      if (wd > SUMMON_LAND && u.drop <= SUMMON_LAND) this.landFx(i, u);
    }
    if (u.pop > 0) {
      var wp = u.pop;
      u.pop = Math.max(0, u.pop - dt / MERGE_POP_TIME);
      if (wp > 1 && u.pop <= 1) this.mergeArriveFx(i, u);
    }
    if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 4);
    if (u.atk > 0) u.atk = Math.max(0, u.atk - dt);
    if (u.frozen > 0) { u.frozen -= dt; continue; }
    if (this.tiles[i] === 'fuente') this.addMana(TILES.fuente.mana * dt * u.rank);
    var d = this.def(u.id);
    if (d.manaGen) {
      u.gen += dt;
      if (u.gen >= d.manaGen.every) {
        u.gen = 0;
        var amt = this.addMana(this.manaAmount(u));
        u.atk = 0.5; u.recoil = 1; // pose de ataque y rebote al repartir el maná
        var p = this.cc(i);
        if (art('fx/ganancia-mana')) this.fx.push({ type: 'pic', key: 'fx/ganancia-mana', x: p.x, y: p.y - 0.2, size: 0.8, rot: 0, grow: 0.45, life: 0.6, max: 0.6 });
        this.addText(p.x, p.y - 0.5, '+' + amt + ' 💧', GAME_PALETTE.manaBlue);
      }
      continue;
    }
    if (d.interest) {
      // Oria: intereses del maná guardado
      u.gen += dt;
      if (u.gen >= d.interest.every) {
        u.gen = 0;
        var gain = this.interestAmount(u);
        if (gain > 0) {
          gain = this.addMana(gain);
          u.atk = 0.5; u.recoil = 1;
          var pi = this.cc(i);
          this.addText(pi.x, pi.y - 0.5, '+' + gain + ' 💧', GAME_PALETTE.goldYellow);
          this.fx.push({ type: 'pic', key: 'fx/oria-interes', x: pi.x, y: pi.y - 0.15, size: 0.95, rot: 0, grow: 0.45, life: 0.6, max: 0.6 });
        }
      }
      continue;
    }
    if (d.buff) {
      // la bardo toca: pose de ataque a ratos
      u.gen += dt;
      if (u.gen >= 2.4) {
        u.gen = 0; u.atk = 0.5; u.recoil = 1;
        // su efecto (assets/fx/<tropa>-tiro) sale hacia cada vecina que potencia
        var bk = 'fx/' + u.id + '-tiro', bp = this.cc(i);
        if (art(bk)) neighbors(i).forEach(function (j) {
          var v = this.cells[j];
          if (!v || !UNITS[v.id].dmg) return;
          var q = this.cc(j);
          this.fx.push({ type: 'pic', key: bk, x: bp.x + (q.x - bp.x) * 0.55, y: bp.y - 0.15 + (q.y - bp.y) * 0.55, size: 0.62,
            rot: Math.atan2(q.y - bp.y, q.x - bp.x), grow: 0.5, life: 0.45, max: 0.45 });
        }, this);
      }
    }
    if (d.wild) {
      // Eco ensaya su hechizo de cristales de vez en cuando
      u.gen += dt;
      if (u.gen >= 5) { u.gen = 0; u.atk = 0.6; u.recoil = 1; }
    }
    if (!d.dmg) continue;
    u.cd -= dt * d.rate * this.unitSpeed(i) * (1 + 0.06 * (u.rank - 1));
    if (u.cd <= 0) {
      if (this.fire(i, u)) u.cd += 1; else u.cd = 0;
    }
  }

  // proyectiles
  for (k = this.shots.length - 1; k >= 0; k--) {
    var s = this.shots[k];
    s.t += dt;
    var tgt = s.target;
    var f = Math.min(1, s.t / s.dur);
    s.x = s.sx + (tgt.x - s.sx) * f;
    s.y = s.sy + (tgt.y - s.sy) * f - Math.sin(f * Math.PI) * (s.kind === 'bomb' ? 0.8 : 0.15);
    if (f >= 1) {
      if (FX_OF[s.kind]) {
        // impacto ilustrado del tamaño del área de daño
        var big = s.def.splash ? s.def.splash * 1.7 + 0.08 * s.unit.rank : 0.62;
        this.fx.push({ type: 'pic', key: 'fx/' + FX_OF[s.kind] + '-impacto', x: tgt.x, y: tgt.y + 0.08, size: big, rot: 0, grow: 0.55, life: 0.42, max: 0.42 });
      }
      if (!tgt.dead) this.applyHit(tgt, s.dmg, s.def, s.unit);
      this.shots.splice(k, 1);
    }
  }

  // monstruos (en co-op solo los mueve el tablero dueño del camino; el
  // aliado, con feed, solo les dispara)
  var evSpeed = (this.event === 'eclipse' ? 1.25 : this.event === 'calma' ? 0.8 : 1) * this.slowMult;
  for (k = 0; k < (this.feed ? 0 : this.enemies.length); k++) {
    var e = this.enemies[k];
    if (e.dead) continue;
    if (e.hitT > 0) e.hitT = Math.max(0, e.hitT - dt);
    if (e.kbx || e.kby) { var kf = Math.pow(0.0001, dt); e.kbx *= kf; e.kby *= kf; }
    if (e.poison > 0) {
      var pd = e.poison * dt * (1 - e.armor * 0.5);
      if (e.poisonBy) this.dmgBy[e.poisonBy] = (this.dmgBy[e.poisonBy] || 0) + Math.min(pd, Math.max(0, e.hp));
      e.hp -= pd; this.damage += pd;
      e.lastHit = e.poisonBy && UNITS[e.poisonBy] && UNITS[e.poisonBy].element === 'fuego' ? 'fuego' : 'veneno';
      e.poisonT -= dt;
      if (e.poisonT <= 0) e.poison = 0;
      if (e.hp <= 0) { this.kill(e); continue; }
    }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowPct = 0; }
    if (e.shield > 0) e.shield -= dt;
    if (e.critT > 0) e.critT -= dt;
    if (e.breakT > 0) e.breakT -= dt;
    if (e.tangleT > 0) e.tangleT -= dt;
    if (e.acidT > 0) e.acidT -= dt;
    if (e.knockCd > 0) e.knockCd -= dt;
    if (e.stun > 0) { e.stun -= dt; }
    else e.d += e.speed * evSpeed * (1 - e.slowPct) * (this.guarded() ? SOL_SLOW : 1) * dt;
    var p2 = this.pos(e.d); e.x = p2.x; e.y = p2.y;
    if (e.boss) this.bossAbility(e, dt);
    if (e.d >= this.geo.len) {
      e.dead = true;
      var loss = this.guarded() ? 0 : e.boss ? 2 : 1;
      if (!loss) this.addText(e.x, e.y - 0.4, '¡Protegido!', '#ffe08a', true);
      this.lives.v = Math.max(0, this.lives.v - loss);
      this.leaked += loss;
      this.shake = 0.35;
      if (this.onLeak) this.onLeak(e, loss);
    }
  }
  if (!this.feed) this.enemies = this.enemies.filter(function (e) { return !e.dead; });

  // lobos de Garra: corren por el camino al revés y muerden una vez a cada
  // monstruo que se cruzan (un jefe gasta dos mordiscos)
  var wsp = this.geo.len / BASE_CROSS_TIME;
  for (k = this.wolves.length - 1; k >= 0; k--) {
    var w = this.wolves[k];
    w.t += dt;
    if (w.biteT > 0) w.biteT -= dt;
    w.d -= wsp * w.def.wolves.speed * dt;
    var wp = this.pos(Math.max(0, w.d));
    if (Math.abs(wp.x - w.x) > 0.001) w.dir = wp.x < w.x ? -1 : 1;
    w.x = wp.x; w.y = wp.y;
    for (var q = 0; q < this.enemies.length && w.bites > 0; q++) {
      var en = this.enemies[q];
      if (en.dead || w.bitten[en.id] || Math.abs(en.d - w.d) > 0.3) continue;
      w.bitten[en.id] = true;
      w.bites -= en.boss ? 2 : 1;
      w.biteT = 0.18;
      this.addFx('boom', { x: en.x, y: en.y }, w.def.color2, 0.3);
      this.applyHit(en, w.dmg, w.def, w.unit);
    }
    if (w.bites <= 0 || w.d <= 0) {
      this.wolves.splice(k, 1);
      this.fx.push({ type: 'pic', key: 'fx/muerte-puf', x: w.x, y: w.y - 0.05, size: 0.5, rot: 0, grow: 0.4, life: 0.4, max: 0.4 });
    }
  }

  // efectos
  for (k = this.fx.length - 1; k >= 0; k--) {
    var fk = this.fx[k];
    fk.life -= dt;
    if (fk.type === 'part') { fk.x += fk.vx * dt; fk.y += fk.vy * dt; fk.vy += 5 * dt; }
    if (fk.life <= 0) this.fx.splice(k, 1);
  }
  for (k = this.orbs.length - 1; k >= 0; k--) {
    var ob = this.orbs[k];
    ob.t += dt;
    if (ob.t > ob.delay + ob.dur + 0.1) this.orbs.splice(k, 1);
  }
  for (k = this.meteors.length - 1; k >= 0; k--) {
    var mt = this.meteors[k];
    mt.t -= dt;
    if (mt.t > 0) continue;
    this.meteors.splice(k, 1);
    if (!mt.e.dead) this.hit(mt.e, mt.dmg, null, 'meteor');
    this.fx.push({ type: 'pic', key: 'fx/crater', x: mt.x, y: mt.y + 0.1, size: 1.15, rot: 0, grow: 0.5, life: 0.6, max: 0.6 });
    this.shake = 0.3;
  }
  for (k = this.texts.length - 1; k >= 0; k--) { var t = this.texts[k]; t.life -= dt; t.y -= dt * 0.7; if (t.life <= 0) this.texts.splice(k, 1); }

  if (this.isAI) this.think(dt);
};

Board.prototype.bossAbility = function (e, dt) {
  var ab = BOSSES[e.kind].ability;
  e.abilityT -= dt;
  if (e.abilityT > 0) return;
  var p = { x: e.x, y: e.y };
  if (ab === 'freeze') {
    e.abilityT = 7;
    var units = this.cells.map(function (u, i) { return u ? i : -1; }).filter(function (i) { return i >= 0; });
    shuffleArr(units).slice(0, 2).forEach(function (i) { this.cells[i].frozen = 3; this.addFx('ring', this.cc(i), '#bfefff'); }, this);
    this.addText(p.x, p.y - 0.6, '¡Congela!', '#bfefff', true);
    this.spawn('escarcha', e.maxHp * 0.05, { d: Math.max(0, e.d - 0.4) });
  } else if (ab === 'shield') {
    e.abilityT = 8; e.shield = 2.2;
    this.addText(p.x, p.y - 0.6, '¡Escudo!', '#c9d4e6', true);
    this.spawn('rocoso', e.maxHp * 0.05, { d: Math.max(0, e.d - 0.4) });
  } else if (ab === 'summon') {
    e.abilityT = 7;
    for (var k = 0; k < 2; k++) this.spawn('ghost', e.maxHp * 0.03, { d: Math.max(0, e.d - 0.3 - k * 0.3) });
    this.addText(p.x, p.y - 0.6, '¡Invoca!', GAME_PALETTE.elements.arcano, true);
  } else if (ab === 'burn') {
    e.abilityT = 9;
    var list = this.cells.map(function (u, i) { return u ? i : -1; }).filter(function (i) { return i >= 0; });
    if (list.length) {
      var i = pick(list), u = this.cells[i];
      if (u.rank > 1) { u.rank--; this.addText(this.cc(i).x, this.cc(i).y - 0.4, '-1 rango', '#ff6a2c', true); }
      else u.frozen = 4;
      this.addFx('boom', this.cc(i), '#ff6a2c');
    }
  } else {
    e.abilityT = 99;
  }
};

/* ---------- inteligencia artificial ---------- */
/* Cada rival juega a su manera (aiStyle, de RIVAL_STYLES):
    ataque: invoca en cuanto puede y usa el comandante con pocos monstruos.
    ahorro: guarda maná, mejora cartas antes de invocar más.
    fusiones: fusiona casi siempre que tiene pareja.
    tactica: además recoloca tropas en el altar y la atalaya. */
Board.prototype.think = function (dt) {
  if (this.aiStyle === 'tactica' && this.aiLevel > 0) {
    this.aiMoveT -= dt;
    if (this.aiMoveT <= 0) { this.aiMoveT = [7, 6, 4][this.aiLevel]; this.aiReposition(); }
  }
  this.aiTimer -= dt;
  if (this.aiTimer > 0) return;
  var lvl = this.aiLevel, st = this.aiStyle;
  this.aiTimer = [1.5, 0.9, 0.5][lvl] * rnd(0.7, 1.3) * (st === 'ataque' ? 0.8 : 1);
  var crowd = st === 'ataque' ? 1 : 4;
  if (this.charge >= 1 && COMMANDERS[this.commander].hero) { var hp = this.heroPicks(); if (hp && Math.random() < [0.3, 0.6, 0.9][lvl]) { this.useCommander(hp); return; } }
  else if (this.charge >= 1 && this.enemies.length > crowd && Math.random() < [0.3, 0.6, 0.9][lvl]) { this.useCommander(); return; }

  // 1) fusionar parejas (de rango bajo primero; los apoyos se guardan si hay sitio)
  var free = this.freeCells();
  var pairs = [];
  for (var a = 0; a < this.cells.length; a++) for (var b = a + 1; b < this.cells.length; b++) {
    if (this.canMerge(a, b)) pairs.push([a, b]);
  }
  var mergeP = st === 'fusiones' ? [0.6, 0.8, 0.95][lvl] : [0.25, 0.45, 0.6][lvl];
  var wantMerge = pairs.length && (free.length === 0 || Math.random() < mergeP);
  if (wantMerge) {
    pairs.sort(function (p, q) { return this.cells[p[0]].rank - this.cells[q[0]].rank; }.bind(this));
    var pr = pairs[0];
    // el resultado se queda en la casilla mejor (altar/atalaya o más afinidad)
    var keep = this.tiles[pr[0]] ? pr[0] : pr[1];
    this.merge(keep === pr[0] ? pr[1] : pr[0], keep);
    return;
  }
  // el más numeroso, el que se mejora
  var counts = {};
  this.cells.forEach(function (u) { if (u && UNITS[u.id].dmg) counts[u.id] = (counts[u.id] || 0) + u.rank; });
  var best = Object.keys(counts).sort(function (x, y) { return counts[y] - counts[x]; })[0];
  var canPower = best && lvl > 0 && (this.power[best] || 1) < POWER_MAX;
  // ahorro: con el tablero a medias mejora antes de invocar más
  if (st === 'ahorro' && canPower && free.length < 9 && this.mana >= this.powerCost(best)) { this.powerUp(best); return; }
  // 2) invocar (el ahorro solo con colchón de maná, salvo al empezar)
  var cushion = st === 'ahorro' && free.length < 11 ? this.summonCost : 0;
  if (free.length && this.mana >= this.summonCost + cushion) { this.summon(); return; }
  // 3) mejorar el tipo más numeroso (al ataque, solo con el tablero lleno)
  if (st === 'ataque' && free.length) return;
  if (canPower && this.mana >= this.powerCost(best) + 20) this.powerUp(best);
};
// táctica: lleva su mejor tropa de ataque al altar o la atalaya si están libres
// o tienen una tropa peor encima (como tú, cambia una tropa de sitio)
Board.prototype.aiReposition = function () {
  var spots = Object.keys(this.tiles).filter(function (k) { return ['altar', 'atalaya', 'diana', 'semillero'].indexOf(this.tiles[k]) !== -1; }, this).map(Number);
  var score = function (u) { return u && UNITS[u.id].dmg && !UNITS[u.id].wolves ? u.rank : 0; };
  for (var s = 0; s < spots.length; s++) {
    var to = spots[s], here = score(this.cells[to]), from = -1, bv = here;
    for (var i = 0; i < this.cells.length; i++) {
      if (spots.indexOf(i) !== -1) continue;
      var v = score(this.cells[i]);
      if (v > bv) { bv = v; from = i; }
    }
    if (from < 0) continue;
    var t = this.cells[to]; this.cells[to] = this.cells[from]; this.cells[from] = t;
    this.cells[to].anim = 0.4; if (t) t.anim = 0.4;
    var a = this.cc(from), c = this.cc(to);
    if (art('fx/mover')) this.fx.push({ type: 'pic', key: 'fx/mover', x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, size: Math.max(1, Math.hypot(c.x - a.x, c.y - a.y) * 0.85), rot: Math.atan2(c.y - a.y, c.x - a.x), grow: 0.5, life: 0.45, max: 0.45 });
    return;
  }
};

function fmtNum(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}
