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
var ENTRY_Y = BOARD_H + 0.4;
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

function pathPos(d) {
  var acc = 0;
  for (var i = 1; i < WAYPOINTS.length; i++) {
    var a = WAYPOINTS[i - 1], b = WAYPOINTS[i];
    var seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= acc + seg) { var t = (d - acc) / seg; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
    acc += seg;
  }
  return { x: WAYPOINTS[3].x, y: WAYPOINTS[3].y };
}
function cellCenter(i) { return { x: PATH_W + (i % COLS) + 0.5, y: PATH_W + Math.floor(i / COLS) + 0.5 }; }
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
  this.lives = opts.lives;               // objeto compartido { v, max }
  this.biome = opts.biome || 'prado';
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
  this.texts = [];
  this.charge = 0;
  this.aiTimer = 1;
  this.kills = 0;
  this.damage = 0;
  this.leaked = 0;
  this.event = null;
  this.shake = 0;
}
function shuffleArr(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ---------- estadísticas ---------- */
Board.prototype.unitPower = function (id) {
  return (1 + POWER_BONUS * ((this.power[id] || 1) - 1)) * (1 + CARD_BONUS * ((this.cardLv[id] || 1) - 1));
};
Board.prototype.affinity = function (i) {
  var u = this.cells[i];
  if (!u) return 0;
  var el = UNITS[u.id].element, n = 0;
  neighbors(i).forEach(function (j) { var v = this.cells[j]; if (v && UNITS[v.id].element === el) n++; }, this);
  return n;
};
Board.prototype.unitDamage = function (i) {
  var u = this.cells[i], d = UNITS[u.id];
  var m = RANK_MULT[u.rank] * this.unitPower(u.id) * (1 + AFFINITY_BONUS * this.affinity(i));
  if (this.tiles[i] === 'altar') m *= 1 + TILES.altar.dmg;
  return (d.dmg || 0) * m;
};
Board.prototype.unitSpeed = function (i) {
  var s = 1;
  neighbors(i).forEach(function (j) {
    var v = this.cells[j];
    if (v && UNITS[v.id].buff && !(v.frozen > 0)) s += UNITS[v.id].buff.speed * v.rank * (1 + 0.1 * ((this.power[v.id] || 1) - 1));
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
  var i = pick(free);
  this.mana -= this.summonCost;
  this.summonCost += 10;
  this.cells[i] = { id: pick(this.deck), rank: 1, cd: Math.random(), frozen: 0, anim: 1, gen: 0 };
  this.addFx('ring', cellCenter(i), UNITS[this.cells[i].id].color);
  return 'ok';
};
Board.prototype.canMerge = function (a, b) {
  var u = this.cells[a], v = this.cells[b];
  return a !== b && u && v && u.id === v.id && u.rank === v.rank && u.rank < MAX_RANK;
};
// Fusión dirigida: la tropa de destino conserva su tipo y sube un rango.
Board.prototype.merge = function (from, to) {
  if (!this.canMerge(from, to)) return false;
  var v = this.cells[to];
  this.cells[from] = null;
  v.rank++;
  v.anim = 1;
  v.frozen = 0;
  var p = cellCenter(to);
  this.addFx('burst', p, '#ffd166');
  this.addText(p.x, p.y - 0.45, 'Rango ' + v.rank, '#ffd166', true);
  return true;
};
Board.prototype.powerUp = function (id) {
  var lv = this.power[id] || 1;
  if (lv >= POWER_MAX) return 'max';
  var cost = POWER_COSTS[lv];
  if (this.mana < cost) return 'mana';
  this.mana -= cost;
  this.power[id] = lv + 1;
  for (var i = 0; i < this.cells.length; i++) if (this.cells[i] && this.cells[i].id === id) { this.cells[i].anim = 0.8; this.addFx('ring', cellCenter(i), '#7dffb0'); }
  return 'ok';
};
Board.prototype.useCommander = function () {
  if (this.charge < 1) return false;
  this.charge = 0;
  var cmd = this.commander;
  if (cmd === 'aria') {
    this.enemies.forEach(function (e) { e.stun = Math.max(e.stun, 3); });
    this.addFx('flash', { x: BOARD_W / 2, y: BOARD_H / 2 }, '#bfefff');
  } else if (cmd === 'merlo') {
    this.mana += 120;
    this.addText(BOARD_W / 2, BOARD_H / 2, '+120 💧', '#7dfcff', true);
    this.addFx('flash', { x: BOARD_W / 2, y: BOARD_H / 2 }, '#b26bff');
  } else if (cmd === 'brann') {
    var targets = this.enemies.slice().sort(function (a, b) { return b.d - a.d; }).slice(0, 6);
    var dmg = 520 * hpScale();
    targets.forEach(function (e) {
      this.addFx('boom', { x: e.x, y: e.y }, '#ff8f3c', 0.9);
      this.hit(e, dmg, null, 'meteor');
    }, this);
    this.shake = 0.5;
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
    speed: (PATH_LEN / BASE_CROSS_TIME) * d.speed * (opt.speedMult || 1),
    slowPct: 0, slowT: 0, poison: 0, poisonT: 0, stun: 0, shield: 0, abilityT: 3, dead: false,
    armor: d.armor || 0, dodge: d.dodge || 0
  };
  var p = pathPos(e.d); e.x = p.x; e.y = p.y;
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
  dmg *= 1 - e.armor;
  e.hp -= dmg;
  this.damage += dmg;
  if (crit) this.addText(e.x, e.y - 0.5, '¡' + fmtNum(dmg) + '!', '#ff4f7b', true);
  if (e.hp <= 0) this.kill(e);
};
Board.prototype.kill = function (e) {
  if (e.dead) return;
  e.dead = true;
  this.kills++;
  var reward = (e.boss ? 100 : ENEMIES[e.kind].reward) * (this.event === 'lluvia' ? 2 : 1);
  this.mana += reward;
  this.addFx('pop', { x: e.x, y: e.y }, e.boss ? BOSSES[e.kind].color : ENEMIES[e.kind].color);
  if (e.boss) {
    this.addText(e.x, e.y - 0.5, '+' + reward + ' 💧', '#7dfcff', true);
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
Board.prototype.fire = function (i, u) {
  var d = UNITS[u.id];
  var target = this.findTarget(d.target);
  if (!target) return false;
  var from = cellCenter(i);
  u.aim = Math.atan2(target.y - from.y, target.x - from.x);
  u.recoil = 1;
  if (d.chain) {
    // rayo instantáneo que salta entre enemigos
    var hitSet = {}, cur = target, prev = from, dmg = this.unitDamage(i);
    var jumps = d.chain + Math.floor((u.rank - 1) / 2);
    for (var j = 0; j < jumps && cur; j++) {
      this.fx.push({ type: 'bolt', x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, life: 0.18, max: 0.18, color: d.color2 });
      hitSet[cur.id] = true;
      this.applyHit(cur, dmg, d, u);
      prev = { x: cur.x, y: cur.y };
      dmg *= 0.75;
      cur = this.nearestTo(prev, hitSet, 2.2);
    }
    return true;
  }
  this.shots.push({ x: from.x, y: from.y, sx: from.x, sy: from.y, target: target, t: 0, dur: d.proj === 'bullet' ? 0.12 : 0.32, kind: d.proj, color: d.color, color2: d.color2, dmg: this.unitDamage(i), def: d, unit: u });
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
  var mult = RANK_MULT[u.rank] * this.unitPower(u.id);
  if (d.slow) {
    e.slowPct = Math.min(d.slow.max + 0.03 * (u.rank - 1), e.slowPct + d.slow.pct);
    e.slowT = d.slow.dur;
  }
  if (d.poison) { e.poison += d.poison.dps * mult * 0.35; e.poisonT = d.poison.dur; }
  if (d.stun && Math.random() < d.stun.chance) { e.stun = Math.max(e.stun, d.stun.dur); }
  if (d.splash) {
    var r = d.splash + 0.06 * u.rank;
    this.enemies.forEach(function (o) {
      if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) <= r) this.hit(o, dmg * 0.6, d, d.proj);
    }, this);
    this.addFx('boom', { x: e.x, y: e.y }, d.color2, r);
  }
  this.hit(e, dmg, d, d.proj);
};

/* ---------- efectos visuales ---------- */
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
    if (u.recoil > 0) u.recoil = Math.max(0, u.recoil - dt * 6);
    if (u.frozen > 0) { u.frozen -= dt; continue; }
    if (this.tiles[i] === 'fuente') this.mana += TILES.fuente.mana * dt * u.rank;
    var d = UNITS[u.id];
    if (d.manaGen) {
      u.gen += dt;
      if (u.gen >= d.manaGen.every) {
        u.gen = 0;
        var amt = Math.round(d.manaGen.amount * u.rank * (1 + 0.25 * ((this.power[u.id] || 1) - 1)));
        this.mana += amt;
        var p = cellCenter(i);
        this.addText(p.x, p.y - 0.5, '+' + amt + ' 💧', '#7dfcff');
      }
      continue;
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
      if (!tgt.dead) this.applyHit(tgt, s.dmg, s.def, s.unit);
      this.shots.splice(k, 1);
    }
  }

  // monstruos
  var evSpeed = this.event === 'eclipse' ? 1.25 : this.event === 'calma' ? 0.8 : 1;
  for (k = 0; k < this.enemies.length; k++) {
    var e = this.enemies[k];
    if (e.dead) continue;
    if (e.poison > 0) {
      var pd = e.poison * dt;
      e.hp -= pd * (1 - e.armor * 0.5); this.damage += pd;
      e.poisonT -= dt;
      if (e.poisonT <= 0) e.poison = 0;
      if (e.hp <= 0) { this.kill(e); continue; }
    }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowPct = 0; }
    if (e.shield > 0) e.shield -= dt;
    if (e.stun > 0) { e.stun -= dt; }
    else e.d += e.speed * evSpeed * (1 - e.slowPct) * dt;
    var p2 = pathPos(e.d); e.x = p2.x; e.y = p2.y;
    if (e.boss) this.bossAbility(e, dt);
    if (e.d >= PATH_LEN) {
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
  for (k = this.fx.length - 1; k >= 0; k--) { this.fx[k].life -= dt; if (this.fx[k].life <= 0) this.fx.splice(k, 1); }
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
    shuffleArr(units).slice(0, 2).forEach(function (i) { this.cells[i].frozen = 3; this.addFx('ring', cellCenter(i), '#bfefff'); }, this);
    this.addText(p.x, p.y - 0.6, '¡Congela!', '#bfefff', true);
  } else if (ab === 'shield') {
    e.abilityT = 8; e.shield = 2.2;
    this.addText(p.x, p.y - 0.6, '¡Escudo!', '#c9d4e6', true);
  } else if (ab === 'summon') {
    e.abilityT = 4;
    for (var k = 0; k < 2; k++) this.spawn('imp', e.maxHp * 0.03, { d: Math.max(0, e.d - 0.3 - k * 0.3) });
    this.addText(p.x, p.y - 0.6, '¡Invoca!', '#b26bff', true);
  } else if (ab === 'burn') {
    e.abilityT = 9;
    var list = this.cells.map(function (u, i) { return u ? i : -1; }).filter(function (i) { return i >= 0; });
    if (list.length) {
      var i = pick(list), u = this.cells[i];
      if (u.rank > 1) { u.rank--; this.addText(cellCenter(i).x, cellCenter(i).y - 0.4, '-1 rango', '#ff6a2c', true); }
      else u.frozen = 4;
      this.addFx('boom', cellCenter(i), '#ff6a2c');
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
