'use strict';
/* =========================================================
   PARTIDA: modos, oleadas, dibujo de los tableros y controles
   Modos:
    - campaign: tu tablero contra oleadas, con jefe final.
    - duel: 1 contra 1 frente a un rival (IA). Gana quien aguante más.
    - coop: tú y un aliado (IA) contra oleadas infinitas, vidas compartidas.
   ========================================================= */

var battle = null;
var canvas, ctx, dpr = 1;
var RIVAL_NAMES = ['Barón Gruñón', 'Lady Cenizas', 'Capitán Bigotes', 'La Duquesa', 'Fray Tormenta', 'Sir Tuercas', 'Reina Escarcha', 'Maese Trueno'];
var ALLY_NAMES = ['Pip el Valiente', 'Tula', 'Bram', 'Nora'];

function startBattle(mode, opts) {
  opts = opts || {};
  var stage = mode === 'campaign' ? CAMPAIGN[opts.stage - 1] : null;
  var biome = stage ? stage.biome : pick(Object.keys(BIOMES));
  var deck = meta.deck.slice();
  var lv = cardLevels();
  var lives = mode === 'campaign' ? { v: 5, max: 5 } : mode === 'duel' ? { v: 3, max: 3 } : { v: 6, max: 6 };
  var player = new Board({ name: 'Tú', deck: deck, cardLv: lv, commander: meta.commander, lives: lives, biome: biome });
  battle = {
    mode: mode, stage: stage, opts: opts,
    boards: [player], player: player, other: null,
    wave: 0, maxWaves: stage ? stage.waves : Infinity,
    queue: [], spawnT: 0, spawnInterval: 1, gap: 3, waveTime: 0,
    event: null, ended: false, paused: false, speed: 1, time: 0,
    selected: null, drag: null, result: null
  };
  if (mode === 'duel') {
    var aiLv = opts.level == null ? 1 : opts.level;
    var aiDeck = shuffleArr(UNIT_ORDER.slice()).filter(function (id) { return id !== 'melodia' || aiLv > 0; }).slice(0, 5);
    if (aiDeck.indexOf('doblon') === -1 && aiLv > 0) aiDeck[4] = 'doblon';
    var aiCard = {};
    var avg = Math.round(Object.keys(lv).reduce(function (s, k) { return s + lv[k]; }, 0) / Math.max(1, Object.keys(lv).length));
    UNIT_ORDER.forEach(function (id) { aiCard[id] = Math.max(1, avg + aiLv - 1); });
    battle.other = new Board({ name: pick(RIVAL_NAMES), ai: true, aiLevel: aiLv, deck: aiDeck, cardLv: aiCard, commander: pick(COMMANDER_ORDER), lives: { v: 3, max: 3 }, biome: biome });
  } else if (mode === 'coop') {
    var allyDeck = shuffleArr(UNIT_ORDER.slice()).slice(0, 5);
    var allyCard = {};
    UNIT_ORDER.forEach(function (id) { allyCard[id] = Math.max(1, (lv[id] || 1)); });
    battle.other = new Board({ name: pick(ALLY_NAMES), ai: true, aiLevel: 2, deck: allyDeck, cardLv: allyCard, commander: pick(COMMANDER_ORDER), lives: lives, biome: biome });
  }
  if (battle.other) { battle.boards.push(battle.other); battle.other.battle = battle; }
  player.battle = battle;
  player.onLeak = function () { sfx('leak'); buzz(80); };
  player.onKill = function (e) { if (e.boss) sfx('boss'); };

  showScreen('battle');
  buildBattleHud();
  resizeCanvas();
  showBanner(mode === 'campaign' ? 'Fase ' + stage.id + ': ' + stage.name : mode === 'duel' ? '⚔️ Duelo contra ' + battle.other.name : '🤝 Con ' + battle.other.name + ' contra la horda', 'Prepárate…');
  sfx('start');
}

/* ---------- oleadas ---------- */
function hpScale() {
  var b = battle, w = Math.max(1, b.wave);
  var s = 42 * Math.pow(1.17, w - 1) * (b.stage ? b.stage.hp : 1);
  if (b.mode === 'duel' && w > 12) s *= Math.pow(1.22, w - 12);
  if (b.mode === 'coop' && w > 15) s *= Math.pow(1.12, w - 15);
  if (b.event && b.event.id === 'horda') s *= 0.7;
  return s;
}
function isBossWave(w) {
  if (battle.mode === 'campaign') return w === battle.maxWaves;
  return w % 5 === 0;
}
function startWave() {
  var b = battle;
  b.wave++;
  b.waveTime = 0;
  b.event = b.wave >= 3 && Math.random() < 0.4 ? pick(WAVE_EVENTS) : null;
  b.boards.forEach(function (bd) { bd.event = b.event ? b.event.id : null; });
  var count = Math.round((9 + b.wave * 2) * (b.event && b.event.id === 'horda' ? 1.4 : 1));
  var mix = ['blob', 'blob', 'blob'];
  if (b.wave >= 2) mix.push('imp');
  if (b.wave >= 3) mix.push('brute');
  if (b.wave >= 4) mix.push('ghost', 'imp');
  if (b.wave >= 8) mix.push('brute', 'ghost');
  b.queue = [];
  for (var i = 0; i < count; i++) b.queue.push({ kind: pick(mix) });
  if (isBossWave(b.wave)) {
    var boss = b.stage ? b.stage.boss : BOSS_ORDER[(b.wave / 5 - 1) % BOSS_ORDER.length];
    b.queue.push({ kind: boss, boss: true });
  }
  b.spawnInterval = Math.max(0.45, 14 / count);
  b.spawnT = 0;
  var sub = b.event ? b.event.icon + ' ' + b.event.name + ': ' + b.event.desc : isBossWave(b.wave) ? '👑 ¡Llega un jefe al final!' : '';
  showBanner('Oleada ' + b.wave + (b.maxWaves !== Infinity ? ' / ' + b.maxWaves : ''), sub);
  sfx('wave');
  updateHud(true);
}
function spawnNext() {
  var b = battle, spec = b.queue.shift();
  var sc = hpScale();
  b.boards.forEach(function (bd) {
    if (spec.boss) {
      var hp = sc * BOSSES[spec.kind].hp * (1 + b.wave * 0.04);
      bd.spawn(spec.kind, hp, { boss: true });
    } else {
      bd.spawn(spec.kind, sc * ENEMIES[spec.kind].hp);
    }
  });
  if (spec.boss) { showBanner('👑 ' + BOSSES[spec.kind].name, BOSSES[spec.kind].desc); sfx('boss'); }
}

function updateBattle(dt) {
  var b = battle;
  if (!b || b.ended || b.paused) return;
  b.time += dt;
  if (b.gap > 0) {
    b.gap -= dt;
    if (b.gap <= 0) {
      if (b.wave >= b.maxWaves) { endBattle(true); return; }
      startWave();
    }
  } else {
    b.waveTime += dt;
    if (b.queue.length) {
      b.spawnT -= dt;
      if (b.spawnT <= 0) { b.spawnT += b.spawnInterval; spawnNext(); }
    } else {
      var alive = b.boards.some(function (bd) { return bd.enemies.length > 0; });
      // la siguiente oleada llega al limpiar el tablero (o, en duelo y
      // cooperativo, si la oleada se alarga demasiado)
      if (!alive) b.gap = 2.5;
      else if (b.mode !== 'campaign' && b.waveTime > 34) b.gap = 0.01;
    }
  }
  b.boards.forEach(function (bd) { bd.update(dt); });

  // finales
  if (b.player.lives.v <= 0) { endBattle(false); return; }
  if (b.mode === 'duel' && b.other.lives.v <= 0) { endBattle(true); return; }
}

function endBattle(won) {
  var b = battle;
  if (b.ended) return;
  b.ended = true;
  var res = { won: won, mode: b.mode, lines: [], gold: 0, chest: null, stars: 0, trophies: 0 };
  if (b.mode === 'campaign') {
    var st = b.stage;
    if (won) {
      var lives = b.player.lives.v;
      res.stars = lives >= 5 ? 3 : lives >= 3 ? 2 : 1;
      var prev = meta.campaign[st.id] || 0;
      res.gold = st.gold + (res.stars > prev ? (res.stars - prev) * 30 : 0);
      if (res.stars > prev) meta.campaign[st.id] = res.stars;
      if (st.unlock && unlockUnit(st.unlock)) res.unlocked = st.unlock;
      res.chest = res.stars === 3 ? 'oro' : res.stars === 2 ? 'plata' : 'madera';
      res.lines.push('Has defendido ' + st.name + '.');
    } else {
      res.gold = 15 + b.wave * 5;
      res.lines.push('Caíste en la oleada ' + b.wave + ' de ' + b.maxWaves + '.');
    }
  } else if (b.mode === 'duel') {
    if (won) {
      res.trophies = 25 + (b.opts.level || 1) * 5;
      res.gold = 60 + b.opts.level * 40;
      res.chest = b.opts.level >= 2 ? 'oro' : 'plata';
      meta.duelWins++;
      res.lines.push(b.other.name + ' no pudo con tu defensa.');
    } else {
      res.trophies = -Math.min(meta.trophies, 15);
      res.gold = 20;
      meta.duelLosses++;
      res.lines.push(b.other.name + ' aguantó más que tú.');
    }
    meta.trophies = Math.max(0, meta.trophies + res.trophies);
  } else {
    res.gold = 20 + b.wave * 12;
    res.chest = b.wave >= 20 ? 'oro' : b.wave >= 10 ? 'plata' : 'madera';
    if (b.wave > meta.coopBest) { meta.coopBest = b.wave; res.lines.push('¡Nuevo récord!'); }
    res.lines.push('Aguantasteis hasta la oleada ' + b.wave + '.');
    won = true;
    res.won = b.wave >= 10;
  }
  meta.gold += res.gold;
  if (res.chest) res.chestResult = openChest(res.chest);
  saveMeta();
  res.kills = b.player.kills;
  res.damage = b.player.damage;
  b.result = res;
  sfx(res.won ? 'win' : 'lose');
  setTimeout(function () { showResult(res); }, 900);
}

/* ---------- disposición ---------- */
var layout = { main: null, other: null };
function resizeCanvas() {
  if (!canvas) return;
  var wrap = canvas.parentNode;
  var w = wrap.clientWidth, h = wrap.clientHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  var pad = 8;
  if (battle && battle.other) {
    var topH = h * 0.36;
    var s2 = Math.min((w - pad * 2) / BOARD_W, (topH - 22) / BOARD_H);
    layout.other = { sc: s2, ox: (w - BOARD_W * s2) / 2, oy: 18 };
    var s1 = Math.min((w - pad * 2) / BOARD_W, (h - topH - pad - 6) / BOARD_H);
    layout.main = { sc: s1, ox: (w - BOARD_W * s1) / 2, oy: topH + (h - topH - BOARD_H * s1) / 2 };
  } else {
    var s = Math.min((w - pad * 2) / BOARD_W, (h - pad * 2 - 20) / BOARD_H);
    layout.main = { sc: s, ox: (w - BOARD_W * s) / 2, oy: (h - BOARD_H * s) / 2 + 8 };
    layout.other = null;
  }
  layout.w = w; layout.h = h;
}

/* ---------- decorado alrededor de los tableros ---------- */
var scenery = { key: '', items: [] };
function buildScenery() {
  var key = layout.w + 'x' + layout.h + battle.player.biome + (battle.other ? 2 : 1);
  if (scenery.key === key) return;
  scenery.key = key;
  scenery.items = [];
  var rects = [layout.main, layout.other].filter(Boolean).map(function (L) {
    return { x0: L.ox - 14, y0: L.oy - 26, x1: L.ox + BOARD_W * L.sc + 14, y1: L.oy + BOARD_H * L.sc + 14 };
  });
  var seed = 7;
  var rand = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (var n = 0; n < 160 && scenery.items.length < 34; n++) {
    var x = rand() * layout.w, y = rand() * layout.h, sz = 14 + rand() * 22;
    var clash = rects.some(function (r) { return x > r.x0 - sz && x < r.x1 + sz && y > r.y0 - sz && y < r.y1 + sz * 0.3; });
    if (clash) continue;
    scenery.items.push({ x: x, y: y, s: sz, t: rand() });
  }
  scenery.items.sort(function (a, b) { return a.y - b.y; });
}
function drawScenery(now) {
  buildScenery();
  var bio = battle.player.biome;
  scenery.items.forEach(function (it) {
    var x = it.x, y = it.y, s = it.s;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.45, s * 0.6, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    if (it.t < 0.18) { // roca
      ctx.fillStyle = bio === 'volcan' ? '#3a2422' : '#8a8f9e';
      ctx.beginPath(); ctx.ellipse(x, y + s * 0.2, s * 0.5, s * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ink(ctx, 2);
      if (bio === 'volcan') { glow(ctx, x, y + s * 0.15, s * 0.4, '#ff6a2a', 0.5); }
      return;
    }
    if (bio === 'desierto') { // cactus
      ctx.fillStyle = '#4caf50'; rrect(ctx, x - s * 0.14, y - s * 0.7, s * 0.28, s * 1.1, s * 0.14); ctx.fill(); ink(ctx, 2);
      rrect(ctx, x - s * 0.45, y - s * 0.35, s * 0.2, s * 0.4, s * 0.1); ctx.fill(); ink(ctx, 2);
      return;
    }
    if (bio === 'hielo') { // pino nevado
      ctx.fillStyle = '#2f6b55';
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.9); ctx.lineTo(x + s * 0.5, y + s * 0.3); ctx.lineTo(x - s * 0.5, y + s * 0.3); ctx.closePath(); ctx.fill(); ink(ctx, 2);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.9); ctx.lineTo(x + s * 0.2, y - s * 0.4); ctx.lineTo(x - s * 0.2, y - s * 0.4); ctx.closePath(); ctx.fill();
      return;
    }
    // árbol o arbusto
    var leaf = bio === 'volcan' ? '#5a3a36' : bio === 'cripta' ? '#5a4a8a' : bio === 'pantano' ? '#4a7a3a' : bio === 'ruinas' ? '#6a8a5a' : '#3f9e58';
    if (it.t < 0.55) {
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - s * 0.08, y - s * 0.1, s * 0.16, s * 0.5);
      ctx.fillStyle = leaf; circle(ctx, x, y - s * 0.35, s * 0.5); ctx.fill(); ink(ctx, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; circle(ctx, x - s * 0.16, y - s * 0.52, s * 0.18); ctx.fill();
    } else {
      ctx.fillStyle = leaf; circle(ctx, x - s * 0.2, y + s * 0.1, s * 0.3); ctx.fill(); ink(ctx, 2);
      circle(ctx, x + s * 0.2, y + s * 0.1, s * 0.3); ctx.fill(); ink(ctx, 2);
      if (it.t > 0.85) { ctx.fillStyle = '#ff6b8a'; circle(ctx, x, y, s * 0.08); ctx.fill(); }
    }
  });
}

/* ---------- dibujo ---------- */
function drawBattle(now) {
  if (!battle || !ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var bio = BIOMES[battle.player.biome];
  var g = ctx.createLinearGradient(0, 0, 0, layout.h);
  g.addColorStop(0, shade(bio.bg, 20)); g.addColorStop(1, shade(bio.bg, -30));
  ctx.fillStyle = g; ctx.fillRect(0, 0, layout.w, layout.h);
  drawScenery(now);
  if (battle.other) {
    drawBoard(battle.other, layout.other, now, false);
    // separador
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    var sy = layout.other.oy + BOARD_H * layout.other.sc + 4;
    ctx.fillRect(0, sy, layout.w, 3);
  }
  drawBoard(battle.player, layout.main, now, true);
}

function drawBoard(b, L, now, isMain) {
  var sc = L.sc, bio = BIOMES[b.biome];
  ctx.save();
  var sh = b.shake > 0 ? b.shake * 10 : 0;
  ctx.translate(L.ox + (Math.random() - 0.5) * sh, L.oy + (Math.random() - 0.5) * sh);
  ctx.scale(sc, sc);

  // marco
  rrect(ctx, -0.12, -0.12, BOARD_W + 0.24, BOARD_H + 0.24, 0.35);
  ctx.fillStyle = shade(bio.frame, -30); ctx.fill();
  rrect(ctx, 0, 0, BOARD_W, BOARD_H, 0.28);
  ctx.fillStyle = bio.path; ctx.fill();
  // camino en U (tierra) y zona central (hierba)
  ctx.save();
  rrect(ctx, 0, 0, BOARD_W, BOARD_H, 0.28); ctx.clip();
  for (var py = 0; py < BOARD_H; py += 0.5) for (var px = 0; px < BOARD_W; px += 0.5) {
    if ((Math.floor(px * 2) + Math.floor(py * 2)) % 2) { ctx.fillStyle = bio.path2; ctx.fillRect(px, py, 0.5, 0.5); }
  }
  ctx.restore();
  rrect(ctx, PATH_W - 0.08, PATH_W - 0.08, COLS + 0.16, BOARD_H - PATH_W + 0.3, 0.2);
  ctx.fillStyle = shade(bio.frame, 10); ctx.fill();
  for (var i = 0; i < COLS * ROWS; i++) {
    var c = cellCenter(i);
    rrect(ctx, c.x - 0.47, c.y - 0.47, 0.94, 0.94, 0.14);
    ctx.fillStyle = (i + Math.floor(i / COLS)) % 2 ? bio.grass : bio.grass2; ctx.fill();
    var tile = b.tiles[i];
    if (tile) {
      ctx.strokeStyle = alpha(TILES[tile].color, 0.85); ctx.lineWidth = 0.05; ctx.stroke();
      ctx.fillStyle = alpha(TILES[tile].color, 0.18 + Math.sin(now / 500 + i) * 0.06); ctx.fill();
    }
  }
  // franja inferior bajo el tablero
  ctx.fillStyle = shade(bio.frame, -10);
  ctx.fillRect(PATH_W, PATH_W + ROWS + 0.12, COLS, BOARD_H - PATH_W - ROWS - 0.12);
  // portal de entrada y puerta de salida
  drawPortal(PATH_W / 2, BOARD_H - 0.2, now, '#b26bff');
  drawGate(BOARD_W - PATH_W / 2, BOARD_H - 0.2);

  // marcas de casillas especiales
  Object.keys(b.tiles).forEach(function (k) {
    var cc = cellCenter(+k);
    if (!b.cells[k]) {
      ctx.globalAlpha = 0.85;
      drawTileIcon(b.tiles[k], cc.x, cc.y, 0.32);
      ctx.globalAlpha = 1;
    }
  });

  // tropas
  var sel = isMain ? battle.selected : null;
  var drag = isMain ? battle.drag : null;
  for (i = 0; i < b.cells.length; i++) {
    var u = b.cells[i];
    if (!u) continue;
    var cc2 = cellCenter(i);
    if (drag && drag.moved && drag.from === i) { ctx.globalAlpha = 0.3; }
    var partner = (sel != null || (drag && drag.moved)) && b.canMerge(sel != null ? sel : drag.from, i);
    if (partner) {
      ctx.strokeStyle = alpha('#ffd166', 0.6 + Math.sin(now / 120) * 0.35); ctx.lineWidth = 0.07;
      rrect(ctx, cc2.x - 0.46, cc2.y - 0.46, 0.92, 0.92, 0.14); ctx.stroke();
    }
    if (sel === i) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.07;
      rrect(ctx, cc2.x - 0.47, cc2.y - 0.47, 0.94, 0.94, 0.14); ctx.stroke();
    }
    var r = 0.4 * (1 + u.anim * 0.25);
    drawUnit(ctx, u.id, cc2.x, cc2.y - 0.02, r, u.rank, now, { frozen: u.frozen > 0 });
    if (b.tiles[i]) drawTileIcon(b.tiles[i], cc2.x + 0.33, cc2.y - 0.33, 0.13);
    ctx.globalAlpha = 1;
  }

  // monstruos (los de más atrás primero)
  var ens = b.enemies.slice().sort(function (p, q) { return p.y - q.y; });
  ens.forEach(function (e) {
    var d = e.boss ? BOSSES[e.kind] : ENEMIES[e.kind];
    drawEnemy(ctx, e, e.boss ? 0.42 : d.size, now);
  });
  // proyectiles
  b.shots.forEach(function (s) { drawShot(s, now); });
  // efectos
  b.fx.forEach(function (f) {
    var t = 1 - f.life / f.max;
    if (f.type === 'bolt') {
      ctx.strokeStyle = f.color; ctx.lineWidth = 0.06; ctx.globalAlpha = f.life / f.max;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1);
      for (var s = 1; s < 5; s++) ctx.lineTo(f.x1 + (f.x2 - f.x1) * s / 5 + (Math.random() - 0.5) * 0.2, f.y1 + (f.y2 - f.y1) * s / 5 + (Math.random() - 0.5) * 0.2);
      ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.type === 'flash') {
      ctx.globalAlpha = (f.life / f.max) * 0.5; ctx.fillStyle = f.color; ctx.fillRect(0, 0, BOARD_W, BOARD_H); ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = f.life / f.max;
      ctx.strokeStyle = f.color; ctx.lineWidth = 0.06;
      circle(ctx, f.x, f.y, (f.type === 'boom' ? f.r : 0.5) * (0.4 + t)); ctx.stroke();
      if (f.type === 'boom' || f.type === 'pop') { glow(ctx, f.x, f.y, f.r * (0.6 + t), f.color, 0.5 * (1 - t)); }
      ctx.globalAlpha = 1;
    }
  });
  ctx.restore();

  // textos en coordenadas de pantalla (nítidos)
  var toS = function (x, y) { return { x: L.ox + x * sc, y: L.oy + y * sc }; };
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  b.enemies.forEach(function (e) {
    var p = toS(e.x, e.y - (e.boss ? 0.62 : ENEMIES[e.kind].size + 0.16));
    var fs = Math.max(9, sc * (e.boss ? 0.3 : 0.22));
    ctx.font = '900 ' + fs + 'px Nunito, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,20,0.9)';
    var txt = fmtNum(Math.max(0, e.hp));
    ctx.strokeText(txt, p.x, p.y); ctx.fillStyle = e.boss ? '#ffd166' : '#ffffff'; ctx.fillText(txt, p.x, p.y);
  });
  if (isMain || sc > 30) {
    b.texts.forEach(function (t) {
      var p = toS(t.x, t.y);
      ctx.globalAlpha = Math.min(1, t.life / t.max * 1.6);
      ctx.font = '900 ' + Math.max(10, sc * (t.big ? 0.3 : 0.22)) + 'px Nunito, sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,20,0.85)'; ctx.strokeText(t.text, p.x, p.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
  }
  // arrastre
  if (isMain && drag && drag.moved && b.cells[drag.from]) {
    var du = b.cells[drag.from];
    drawUnit(ctx, du.id, drag.x, drag.y, 0.46 * sc, du.rank, now, {});
  }
  // cabecera del tablero rival/aliado
  if (!isMain) {
    var label = (battle.mode === 'duel' ? '⚔️ ' : '🤝 ') + b.name;
    ctx.font = '900 13px Nunito, sans-serif'; ctx.textAlign = 'left';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    var hy = L.oy - 9;
    ctx.strokeText(label, L.ox + 4, hy); ctx.fillStyle = '#fff'; ctx.fillText(label, L.ox + 4, hy);
    ctx.textAlign = 'right';
    var info = (battle.mode === 'duel' ? hearts(b.lives) + '   ' : '') + '💧 ' + Math.floor(b.mana);
    ctx.strokeText(info, L.ox + BOARD_W * sc - 4, hy); ctx.fillText(info, L.ox + BOARD_W * sc - 4, hy);
  }
}
function hearts(l) { var s = ''; for (var i = 0; i < l.max; i++) s += i < l.v ? '❤️' : '🖤'; return s; }

function drawPortal(x, y, now, col) {
  glow(ctx, x, y, 0.5, col, 0.7);
  ctx.strokeStyle = '#efd9ff'; ctx.lineWidth = 0.05;
  for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, 0.12 + i * 0.09, now / (250 + i * 90) + i, now / (250 + i * 90) + i + Math.PI * 1.3); ctx.stroke(); }
}
function drawGate(x, y) {
  rrect(ctx, x - 0.32, y - 0.38, 0.64, 0.5, 0.12); ctx.fillStyle = '#5a3a20'; ctx.fill(); ink(ctx, 0.04);
  ctx.fillStyle = '#ffd166'; star(ctx, x, y - 0.12, 0.14); ctx.fill();
}
function drawTileIcon(type, x, y, r) {
  var t = TILES[type];
  circle(ctx, x, y, r); ctx.fillStyle = alpha(t.color, 0.95); ctx.fill(); ink(ctx, r * 0.15);
  ctx.fillStyle = '#ffffff';
  if (type === 'altar') {
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.6); ctx.lineTo(x + r * 0.18, y + r * 0.3); ctx.lineTo(x - r * 0.18, y + r * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - r * 0.4, y + r * 0.25, r * 0.8, r * 0.14);
  } else if (type === 'fuente') {
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.6); ctx.quadraticCurveTo(x + r * 0.5, y, x, y + r * 0.5); ctx.quadraticCurveTo(x - r * 0.5, y, x, y - r * 0.6); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.45); ctx.lineTo(x + r * 0.35, y - r * 0.35); ctx.lineWidth = r * 0.18; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.05, y - r * 0.4); ctx.lineTo(x + r * 0.4, y - r * 0.05); ctx.closePath(); ctx.fill();
  }
}
function drawShot(s, now) {
  var x = s.x, y = s.y;
  switch (s.kind) {
    case 'arrow': {
      var a = Math.atan2(s.target.y - s.sy, s.target.x - s.sx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.strokeStyle = '#f4ead0'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.18, 0); ctx.lineTo(0.12, 0); ctx.stroke();
      ctx.fillStyle = '#c9d3e0'; ctx.beginPath(); ctx.moveTo(0.18, 0); ctx.lineTo(0.08, -0.05); ctx.lineTo(0.08, 0.05); ctx.fill();
      ctx.restore(); break;
    }
    case 'fire': glow(ctx, x, y, 0.22, '#ff7a1a', 0.9); ctx.fillStyle = '#fff2a8'; circle(ctx, x, y, 0.07); ctx.fill(); break;
    case 'ice': glow(ctx, x, y, 0.16, '#8fe9ff', 0.9); ctx.fillStyle = '#ffffff'; star(ctx, x, y, 0.08, 6); ctx.fill(); break;
    case 'poison': glow(ctx, x, y, 0.15, '#5fdc4a', 0.9); ctx.fillStyle = '#d4ff7a'; circle(ctx, x, y, 0.06); ctx.fill(); break;
    case 'bomb': ctx.fillStyle = '#26262e'; circle(ctx, x, y, 0.1); ctx.fill(); glow(ctx, x + 0.06, y - 0.08, 0.07, '#ffd166', 1); break;
    case 'shadow': ctx.save(); ctx.translate(x, y); ctx.rotate(now / 50); ctx.fillStyle = '#ff4f7b'; star(ctx, 0, 0, 0.1, 4); ctx.fill(); ctx.restore(); break;
    case 'gear': ctx.save(); ctx.translate(x, y); ctx.rotate(now / 80); ctx.fillStyle = '#ffe6a3'; star(ctx, 0, 0, 0.1, 8); ctx.fill(); ctx.restore(); break;
    case 'bullet': ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(s.sx + (x - s.sx) * 0.7, s.sy + (y - s.sy) * 0.7); ctx.lineTo(x, y); ctx.stroke(); break;
    case 'holy': glow(ctx, x, y, 0.2, '#ffd34d', 0.9); ctx.fillStyle = '#ffffff'; star(ctx, x, y, 0.08, 4); ctx.fill(); break;
    default: ctx.fillStyle = s.color2; circle(ctx, x, y, 0.07); ctx.fill();
  }
}

/* ---------- controles táctiles ---------- */
function screenToCell(px, py) {
  var L = layout.main;
  var x = (px - L.ox) / L.sc, y = (py - L.oy) / L.sc;
  var c = Math.floor(x - PATH_W), r = Math.floor(y - PATH_W);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1;
  return r * COLS + c;
}
function canvasXY(ev) { var rect = canvas.getBoundingClientRect(); return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }; }
function onDown(ev) {
  if (!battle || battle.ended) return;
  var p = canvasXY(ev);
  var i = screenToCell(p.x, p.y);
  battle.drag = (i >= 0 && battle.player.cells[i]) ? { from: i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false } : null;
  battle.downCell = i;
  try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
}
function onMove(ev) {
  if (!battle || !battle.drag) return;
  var p = canvasXY(ev), d = battle.drag;
  d.x = p.x; d.y = p.y;
  if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 10) { d.moved = true; battle.selected = null; refreshUnitInfo(); }
}
function onUp(ev) {
  if (!battle) return;
  var p = canvasXY(ev);
  var i = screenToCell(p.x, p.y);
  var d = battle.drag, b = battle.player;
  battle.drag = null;
  if (d && d.moved) { dropUnit(d.from, i); return; }
  if (i < 0) { battle.selected = null; refreshUnitInfo(); return; }
  var sel = battle.selected;
  if (sel != null && sel !== i) {
    if (b.canMerge(sel, i)) { b.merge(sel, i); sfx('merge'); buzz(25); battle.selected = null; refreshUnitInfo(); return; }
    if (!b.cells[i]) { moveUnit(sel, i); battle.selected = null; refreshUnitInfo(); return; }
  }
  if (b.cells[i]) { battle.selected = sel === i ? null : i; sfx('tap'); }
  else battle.selected = null;
  refreshUnitInfo();
}
function dropUnit(from, to) {
  var b = battle.player;
  if (to < 0 || to === from) return;
  if (b.canMerge(from, to)) { b.merge(from, to); sfx('merge'); buzz(25); }
  else if (!b.cells[to]) { moveUnit(from, to); }
  else { // intercambiar posiciones
    var t = b.cells[to]; b.cells[to] = b.cells[from]; b.cells[from] = t;
    b.cells[to].anim = 0.4; b.cells[from].anim = 0.4; sfx('tap');
  }
  refreshUnitInfo();
}
// Novedad frente a otros juegos del género: las tropas se pueden recolocar
// para aprovechar casillas especiales y afinidades.
function moveUnit(from, to) {
  var b = battle.player;
  b.cells[to] = b.cells[from]; b.cells[from] = null;
  b.cells[to].anim = 0.4;
  sfx('tap');
}
