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
var PATH_LEN = (function () {
  var l = 0;
  for (var i = 1; i < WAYPOINTS.length; i++) l += Math.hypot(WAYPOINTS[i].x - WAYPOINTS[i - 1].x, WAYPOINTS[i].y - WAYPOINTS[i - 1].y);
  return l;
})();
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
  prado: { image: 'board/tablero', iw: 1672, ih: 941, cx: 250, cy: 110, cw: 1180, ch: 831, fade: true,
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
    gx0: 333, gy0: 178, gx1: 690, gy1: 393,
    way: [[322, 505], [300, 445], [255, 385], [245, 300], [250, 215], [290, 150], [380, 118], [640, 118], [730, 150], [772, 215], [778, 300], [770, 385], [725, 445], [700, 505]] },
  roca: { image: 'boards/roca', iw: 1024, ih: 572, cx: 188, cy: 70, cw: 650, ch: 420, portal: true, over: true, frame: [168, 29, 852, 534],
    gx0: 323, gy0: 175, gx1: 700, gy1: 397,
    way: [[395, 452], [300, 440], [250, 390], [238, 290], [255, 185], [320, 130], [420, 113], [605, 113], [705, 130], [770, 185], [788, 290], [775, 390], [725, 440], [628, 452]] },
  veneno: { image: 'boards/veneno', iw: 1024, ih: 572, cx: 262, cy: 105, cw: 502, ch: 412, portal: true, over: true, frame: [176, 58, 848, 518],
    gx0: 362, gy0: 193, gx1: 660, gy1: 378,
    way: [[400, 500], [400, 440], [320, 390], [305, 300], [320, 190], [380, 148], [640, 148], [700, 190], [718, 300], [705, 390], [625, 440], [625, 500]] }
};
// con varios tableros para un bioma se elige uno al azar en cada partida
var BIOME_FIELD = { prado: 'prado', bosque: 'prado', pantano: ['prado', 'veneno'], hielo: 'hielo', ruinas: 'roca', desierto: 'roca', volcan: 'lava2', cripta: 'lava2' };
function fieldGeo(id) {
  var f = FIELDS[id], cell = (f.gx1 - f.gx0) / COLS;
  var P = function (q) { return { x: (q[0] - f.cx) / cell, y: (q[1] - f.cy) / cell }; };
  return makeGeo({
    image: f.image, px: f,
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
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

var ENEMY_SEQ = 0;

function Board(opts) {
  this.name = opts.name;
  this.isAI = !!opts.ai;
  this.aiLevel = opts.aiLevel || 1;      // 0 fácil · 1 normal · 2 difícil
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
  var spots = shuffleArr(Array.from({ length: COLS * ROWS }, function (_, i) { return i; }));
  ['altar', 'fuente', 'atalaya'].forEach(function (t, k) { this.tiles[spots[k]] = t; }, this);
  this.enemies = [];
  this.shots = [];
  this.fx = [];
  this.meteors = []; // meteoros de Brann en el aire (el daño llega al caer)
  this.texts = [];
  this.charge = 0;
  this.aiTimer = 1;
  this.kills = 0;
  this.damage = 0;
  this.dmgBy = {};                       // daño por tropa ('cmd': meteoro del comandante)
  this.summons = 0; this.merges = 0; this.powers = 0; this.cmds = 0;
  this.bossKills = 0; this.maxRank = 1;  // para las misiones diarias
  this.leaked = 0;
  this.event = null;
  this.shake = 0;
  this.orbs = [];                        // gotas de maná camino del contador
}
function shuffleArr(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ---------- estadísticas ---------- */
Board.prototype.cc = function (i) { return geoCell(this.geo, i); };
Board.prototype.pos = function (d) { return geoPos(this.geo, d); };
Board.prototype.cardMult = function (id) { return 1 + CARD_BONUS * ((this.cardLv[id] || 1) - 1); };
Board.prototype.unitPower = function (id) {
  return (1 + POWER_BONUS * ((this.power[id] || 1) - 1)) * this.cardMult(id);
};
// maná que reparte una tropa de maná y velocidad que da una de apoyo (suben con el rango, la mejora de la partida y el nivel de carta)
Board.prototype.manaAmount = function (u) {
  return Math.round(UNITS[u.id].manaGen.amount * u.rank * (1 + 0.25 * ((this.power[u.id] || 1) - 1)) * this.cardMult(u.id));
};
Board.prototype.buffSpeed = function (u) {
  return UNITS[u.id].buff.speed * u.rank * (1 + 0.1 * ((this.power[u.id] || 1) - 1)) * this.cardMult(u.id);
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
  var d = UNITS[u.id], b = 0;
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
Board.prototype.unitDamage = function (i) {
  var u = this.cells[i], d = UNITS[u.id];
  var m = RANK_MULT[u.rank] * this.unitPower(u.id) * (1 + AFFINITY_BONUS * this.affinity(i)) * (1 + this.posBonus(i));
  if (this.tiles[i] === 'altar') m *= 1 + TILES.altar.dmg;
  return (d.dmg || 0) * m;
};
Board.prototype.unitSpeed = function (i) {
  var s = 1;
  neighbors(i).forEach(function (j) {
    var v = this.cells[j];
    if (v && UNITS[v.id].buff && !(v.frozen > 0)) s += this.buffSpeed(v);
  }, this);
  if (this.tiles[i] === 'atalaya') s += TILES.atalaya.speed;
  return s;
};

/* ---------- acciones ---------- */
Board.prototype.freeCells = function () {
  var out = [];
  for (var i = 0; i < this.cells.length; i++) if (!this.cells[i]) out.push(i);
  return out;
};
Board.prototype.summon = function () {
  if (this.mana < this.summonCost) return 'mana';
  var free = this.freeCells();
  if (!free.length) return 'full';
  var i = pick(free), id = pick(this.deck), d = UNITS[id];
  this.mana -= this.summonCost;
  this.summonCost += 10;
  this.summons++;
  // cae desde arriba; el anillo y el polvo salen al tocar suelo (landFx)
  this.cells[i] = { id: id, rank: 1, cd: Math.random(), frozen: 0, anim: 0, gen: 0, drop: 1 };
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
  return a !== b && u && v && u.id === v.id && u.rank === v.rank && u.rank < MAX_RANK;
};
// Fusión dirigida: la tropa de destino conserva su tipo y sube un rango.
// start: desde dónde sale volando la tropa que se funde (donde la soltaste
// al arrastrar); si no, desde su casilla
Board.prototype.merge = function (from, to, start) {
  if (!this.canMerge(from, to)) return false;
  var v = this.cells[to], src = this.cells[from], a = start || this.cc(from), p = this.cc(to);
  this.cells[from] = null;
  this.fx.push({ type: 'fly', id: src.id, rank: src.rank, x1: a.x, y1: a.y, x2: p.x, y2: p.y, life: MERGE_FLY, max: MERGE_FLY });
  v.rank++;
  this.merges++;
  this.maxRank = Math.max(this.maxRank, v.rank);
  v.anim = 0; v.drop = 0;
  v.pop = 1 + MERGE_FLY / MERGE_POP_TIME; // espera a que llegue y entonces rebota
  v.frozen = 0;
  return true;
};
// la tropa invocada toca suelo: anillo de su color y polvo a los pies
Board.prototype.landFx = function (i, u) {
  var p = this.cc(i);
  // círculo mágico con humo y destello (assets/fx/invocar)
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
  var fk = u.id === 'doblon' && art('fx/fusion-doblon') ? 'fx/fusion-doblon' : 'fx/fusion';
  if (art(fk)) this.fx.push({ type: 'pic', key: fk, x: p.x, y: p.y - (fk === 'fx/fusion' ? 0.12 : 0), size: fk === 'fx/fusion' ? 1.15 : 1.05, rot: 0, grow: 0.45, life: 0.55, max: 0.55 });
  else this.addFx('burst', p, '#ffd166');
  this.addText(p.x, p.y - 0.45, 'Rango ' + u.rank, '#ffd166', true);
};
Board.prototype.powerUp = function (id) {
  var lv = this.power[id] || 1;
  if (lv >= POWER_MAX) return 'max';
  var cost = POWER_COSTS[lv];
  if (this.mana < cost) return 'mana';
  this.mana -= cost;
  this.power[id] = lv + 1;
  this.powers++;
  for (var i = 0; i < this.cells.length; i++) if (this.cells[i] && this.cells[i].id === id) { this.cells[i].anim = 0.8; this.addFx('ring', this.cc(i), '#7dffb0'); }
  return 'ok';
};
Board.prototype.useCommander = function () {
  if (this.charge < 1) return false;
  this.charge = 0;
  this.cmds++;
  var cmd = this.commander, pw = cmdPower(cmd, this.cmdLv);
  if (cmd === 'aria') {
    this.enemies.forEach(function (e) { e.stun = Math.max(e.stun, pw); e.stunIce = true; });
    this.addFx('flash', { x: this.geo.W / 2, y: this.geo.H / 2 }, '#bfefff');
    this.addSweep('fx/ventisca');
  } else if (cmd === 'merlo') {
    var gain = Math.round(pw);
    this.mana += gain;
    this.addText(this.geo.W / 2, this.geo.H / 2, '+' + gain + ' 💧', GAME_PALETTE.manaBlue, true);
    this.addFx('flash', { x: this.geo.W / 2, y: this.geo.H / 2 }, '#b26bff');
    this.addSweep('fx/marea');
  } else if (cmd === 'brann') {
    // caen uno tras otro sobre los más adelantados; el daño llega al tocar suelo
    var targets = this.enemies.slice().sort(function (a, b) { return b.d - a.d; }).slice(0, 6);
    var dmg = pw * hpScale();
    targets.forEach(function (e, k) {
      var t = METEOR_FALL + k * 0.09;
      this.meteors.push({ e: e, x: e.x, y: e.y, t: t, dmg: dmg });
      this.fx.push({ type: 'fall', key: 'fx/meteoro', x: e.x, y: e.y, size: 0.95, life: t, max: t });
    }, this);
  }
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
    armor: d.armor || 0, dodge: d.dodge || 0
  };
  var p = this.pos(e.d); e.x = p.x; e.y = p.y;
  this.enemies.push(e);
  return e;
};
Board.prototype.hit = function (e, dmg, unitDef, kind) {
  if (e.dead) return;
  if (e.shield > 0) { this.addText(e.x, e.y - 0.4, 'Bloqueo', '#c9d4e6'); return; }
  var dodge = e.dodge * (this.event === 'niebla' ? 2 : 1);
  if (dodge && kind !== 'meteor' && Math.random() < dodge) { this.addText(e.x, e.y - 0.4, 'Fallo', '#b6a6ff'); return; }
  var crit = false;
  if (unitDef && unitDef.crit && Math.random() < unitDef.crit.chance) { dmg *= unitDef.crit.mult; crit = true; }
  if (unitDef && unitDef.bossMult && e.boss) dmg *= unitDef.bossMult;
  if (!(unitDef && unitDef.pierce)) dmg *= 1 - e.armor;
  var src = unitDef ? unitDef.id : 'cmd';
  this.dmgBy[src] = (this.dmgBy[src] || 0) + Math.min(dmg, Math.max(0, e.hp));
  e.hp -= dmg;
  this.damage += dmg;
  // golpe: destello blanco, aplastón y un empujoncito hacia fuera del tablero
  e.hitT = HIT_TIME;
  var hcx = this.geo.W / 2, hcy = this.geo.H / 2, hd = Math.hypot(e.x - hcx, e.y - hcy) || 1;
  e.kbx = (e.x - hcx) / hd * 0.05; e.kby = (e.y - hcy) / hd * 0.05;
  if (crit) this.addText(e.x, e.y - 0.5, '¡' + fmtNum(dmg) + '!', GAME_PALETTE.damageRed, true);
  if (crit && !unitDef.critPic) e.critT = 0.55;
  if (unitDef && unitDef.pierce && e.armor > 0) e.breakT = 0.55;
  if (crit && unitDef.critPic) this.fx.push({ type: 'pic', key: unitDef.critPic, x: e.x, y: e.y - 0.3, size: 0.75, rot: 0, grow: 0.4, life: 0.55, max: 0.55 });
  // remate (Seren): un monstruo que no sea jefe y quede por debajo del umbral cae al instante
  if (unitDef && unitDef.execute && !e.boss && e.hp > 0 && e.hp <= e.maxHp * unitDef.execute) {
    this.dmgBy[src] += e.hp;
    e.hp = 0;
    this.addText(e.x, e.y - 0.5, '¡Remate!', '#c9b8ff', true);
  }
  if (e.hp <= 0) {
    if (unitDef && unitDef.bounty) { this.mana += unitDef.bounty; this.addText(e.x, e.y - 0.25, '+' + unitDef.bounty + ' 💧', GAME_PALETTE.goldYellow); }
    this.kill(e);
  }
};
Board.prototype.kill = function (e) {
  if (e.dead) return;
  e.dead = true;
  this.kills++;
  if (e.boss) this.bossKills++;
  var reward = (e.boss ? 100 : ENEMIES[e.kind].reward) * (this.event === 'lluvia' ? 2 : 1);
  this.mana += reward;
  this.deathFx(e);
  if (e.boss) {
    this.addText(e.x, e.y - 0.5, '+' + reward + ' 💧', GAME_PALETTE.manaBlue, true);
    this.shake = 0.4;
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
  var d = UNITS[u.id];
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
  // destello ilustrado en la boca del arma
  if (FX_OF[d.proj]) {
    var mk = 'fx/' + FX_OF[d.proj] + '-destello';
    this.fx.push({ type: 'pic', key: mk, x: from.x + Math.cos(u.aim) * 0.32, y: from.y - 0.12 + Math.sin(u.aim) * 0.32,
      size: FLASH_SIZE[d.proj] || 0.46, rot: FX_TURNS[mk] ? u.aim : 0, grow: 0.5, life: 0.16, max: 0.16 });
  }
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
  if (d.splash) {
    var r = d.splash + 0.06 * u.rank;
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
Board.prototype.deathFx = function (e) {
  var col = e.boss ? BOSSES[e.kind].color : ENEMIES[e.kind].color, big = e.boss ? 1.8 : 1;
  if (!art('fx/muerte-puf')) this.addFx('pop', { x: e.x, y: e.y }, col);
  else this.fx.push({ type: 'pic', key: 'fx/muerte-puf', x: e.x, y: e.y - 0.08, size: 0.85 * big, rot: 0, grow: 0.45, life: 0.5, max: 0.5 });
  var parts = 0;
  for (var k = 0; k < this.fx.length; k++) if (this.fx[k].type === 'part') parts++;
  for (var n = 0; n < 10 * big && parts < MAX_PARTS; n++, parts++) {
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
Board.prototype.addText = function (x, y, text, color, big) {
  if (this.texts.length > 40) this.texts.shift();
  this.texts.push({ x: x, y: y, text: text, color: color, big: !!big, life: 0.9, max: 0.9 });
};

/* ---------- bucle ---------- */
Board.prototype.update = function (dt) {
  var i, k;
  this.charge = Math.min(1, this.charge + dt / COMMANDERS[this.commander].cd);
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
    if (this.tiles[i] === 'fuente') this.mana += TILES.fuente.mana * dt * u.rank;
    var d = UNITS[u.id];
    if (d.manaGen) {
      u.gen += dt;
      if (u.gen >= d.manaGen.every) {
        u.gen = 0;
        var amt = this.manaAmount(u);
        this.mana += amt;
        u.atk = 0.5; u.recoil = 1; // pose de ataque y rebote al repartir el maná
        var p = this.cc(i);
        this.addText(p.x, p.y - 0.5, '+' + amt + ' 💧', GAME_PALETTE.manaBlue);
      }
      continue;
    }
    if (d.buff) {
      // la bardo toca: pose de ataque a ratos
      u.gen += dt;
      if (u.gen >= 2.4) { u.gen = 0; u.atk = 0.5; u.recoil = 1; }
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

  // monstruos
  var evSpeed = this.event === 'eclipse' ? 1.25 : this.event === 'calma' ? 0.8 : 1;
  for (k = 0; k < this.enemies.length; k++) {
    var e = this.enemies[k];
    if (e.dead) continue;
    if (e.hitT > 0) e.hitT = Math.max(0, e.hitT - dt);
    if (e.kbx || e.kby) { var kf = Math.pow(0.0001, dt); e.kbx *= kf; e.kby *= kf; }
    if (e.poison > 0) {
      var pd = e.poison * dt * (1 - e.armor * 0.5);
      if (e.poisonBy) this.dmgBy[e.poisonBy] = (this.dmgBy[e.poisonBy] || 0) + Math.min(pd, Math.max(0, e.hp));
      e.hp -= pd; this.damage += pd;
      e.poisonT -= dt;
      if (e.poisonT <= 0) e.poison = 0;
      if (e.hp <= 0) { this.kill(e); continue; }
    }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowPct = 0; }
    if (e.shield > 0) e.shield -= dt;
    if (e.critT > 0) e.critT -= dt;
    if (e.breakT > 0) e.breakT -= dt;
    if (e.stun > 0) { e.stun -= dt; }
    else e.d += e.speed * evSpeed * (1 - e.slowPct) * dt;
    var p2 = this.pos(e.d); e.x = p2.x; e.y = p2.y;
    if (e.boss) this.bossAbility(e, dt);
    if (e.d >= this.geo.len) {
      e.dead = true;
      var loss = e.boss ? 2 : 1;
      this.lives.v = Math.max(0, this.lives.v - loss);
      this.leaked += loss;
      this.shake = 0.35;
      if (this.onLeak) this.onLeak(e, loss);
    }
  }
  this.enemies = this.enemies.filter(function (e) { return !e.dead; });

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
Board.prototype.think = function (dt) {
  this.aiTimer -= dt;
  if (this.aiTimer > 0) return;
  var lvl = this.aiLevel;
  this.aiTimer = [1.5, 0.9, 0.5][lvl] * rnd(0.7, 1.3);
  if (this.charge >= 1 && this.enemies.length > 4 && Math.random() < [0.3, 0.6, 0.9][lvl]) { this.useCommander(); return; }

  // 1) fusionar parejas (de rango bajo primero; los apoyos se guardan si hay sitio)
  var free = this.freeCells();
  var pairs = [];
  for (var a = 0; a < this.cells.length; a++) for (var b = a + 1; b < this.cells.length; b++) {
    if (this.canMerge(a, b)) pairs.push([a, b]);
  }
  var wantMerge = pairs.length && (free.length === 0 || Math.random() < [0.25, 0.45, 0.6][lvl]);
  if (wantMerge) {
    pairs.sort(function (p, q) { return this.cells[p[0]].rank - this.cells[q[0]].rank; }.bind(this));
    var pr = pairs[0];
    // el resultado se queda en la casilla mejor (altar/atalaya o más afinidad)
    var keep = this.tiles[pr[0]] ? pr[0] : pr[1];
    this.merge(keep === pr[0] ? pr[1] : pr[0], keep);
    return;
  }
  // 2) invocar
  if (free.length && this.mana >= this.summonCost) { this.summon(); return; }
  // 3) mejorar el tipo más numeroso
  var counts = {};
  this.cells.forEach(function (u) { if (u && UNITS[u.id].dmg) counts[u.id] = (counts[u.id] || 0) + u.rank; });
  var best = Object.keys(counts).sort(function (x, y) { return counts[y] - counts[x]; })[0];
  if (best && lvl > 0) {
    var lv = this.power[best] || 1;
    if (lv < POWER_MAX && this.mana >= POWER_COSTS[lv] + 20) this.powerUp(best);
  }
};

function fmtNum(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}
