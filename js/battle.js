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
  // tablero ilustrado (al azar entre los que ya han cargado): la campaña usa
  // uno de su bioma; el duelo y el cooperativo, cualquiera, con un bioma
  // que le pegue para el decorado de alrededor
  var loaded = function (k) { return art(FIELD_GEOS[k].image); };
  var choices = stage ? [].concat(BIOME_FIELD[biome] || 'prado') : Object.keys(FIELD_GEOS);
  var ready = choices.filter(loaded);
  var fid = ready.length ? pick(ready) : loaded('prado') ? 'prado' : null;
  if (!stage && fid) {
    var fits = Object.keys(BIOME_FIELD).filter(function (bk) { return [].concat(BIOME_FIELD[bk]).indexOf(fid) !== -1; });
    if (fits.length) biome = pick(fits);
  }
  var geo = fid ? FIELD_GEOS[fid] : VECTOR_GEO;
  var player = new Board({ name: 'Tú', deck: deck, cardLv: lv, commander: meta.commander, lives: lives, biome: biome, geo: geo, mana: stage ? stage.mana : 100 });
  battle = {
    mode: mode, stage: stage, opts: opts,
    boards: [player], player: player, other: null,
    wave: 0, maxWaves: stage ? stage.waves : Infinity,
    queue: [], spawnT: 0, spawnInterval: 1, gap: 3, waveTime: 0,
    event: null, ended: false, paused: false, speed: 1, time: 0,
    selected: null, drag: null, result: null,
    // primera partida de campaña: consejos paso a paso (ver updateCoach)
    tutorial: mode === 'campaign' && !meta.seenTutorial, coachStep: 0, coachT: 0
  };
  battle.next = planWave(1);
  if (mode === 'duel') {
    var aiLv = opts.level == null ? 1 : opts.level;
    var aiDeck = shuffleArr(AI_UNITS.slice()).filter(function (id) { return id !== 'melodia' || aiLv > 0; }).slice(0, 5);
    if (aiDeck.indexOf('doblon') === -1 && aiLv > 0) aiDeck[4] = 'doblon';
    var aiCard = {};
    var avg = Math.round(Object.keys(lv).reduce(function (s, k) { return s + lv[k]; }, 0) / Math.max(1, Object.keys(lv).length));
    UNIT_ORDER.forEach(function (id) { aiCard[id] = Math.max(1, avg + DUEL_CARD_OFFSET[aiLv]); });
    battle.other = new Board({ name: pick(RIVAL_NAMES), ai: true, aiLevel: aiLv, deck: aiDeck, cardLv: aiCard, commander: pick(COMMANDER_ORDER), lives: { v: 3, max: 3 }, biome: biome, geo: geo });
  } else if (mode === 'coop') {
    var allyDeck = shuffleArr(AI_UNITS.slice()).slice(0, 5);
    var allyCard = {};
    UNIT_ORDER.forEach(function (id) { allyCard[id] = Math.max(1, (lv[id] || 1)); });
    battle.other = new Board({ name: pick(ALLY_NAMES), ai: true, aiLevel: 2, deck: allyDeck, cardLv: allyCard, commander: pick(COMMANDER_ORDER), lives: lives, biome: biome, geo: geo });
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
// cartas del rival del duelo respecto a la media de las tuyas (fácil, normal, difícil)
var DUEL_CARD_OFFSET = [-2, 0, 2];
function hpScale() {
  var b = battle, w = Math.max(1, b.wave);
  var s = 42 * Math.pow(1.17, w - 1);
  if (b.stage) {
    // la dureza de la fase llega poco a poco: la primera oleada, al 55 %
    var ramp = b.maxWaves > 1 ? 0.55 + 0.45 * (w - 1) / (b.maxWaves - 1) : 1;
    s *= 1 + (b.stage.hp - 1) * ramp;
  }
  if (b.mode === 'duel' && w > 12) s *= Math.pow(1.22, w - 12);
  if (b.event && b.event.id === 'horda') s *= 0.7;
  return s;
}
function isBossWave(w) {
  if (battle.mode === 'campaign') return w === battle.maxWaves;
  return w % 5 === 0;
}
// Se decide una oleada antes de que llegue, para poder anunciar la siguiente.
function planWave(w) {
  var b = battle;
  var event = w >= 3 && Math.random() < 0.4 ? pick(WAVE_EVENTS) : null;
  var count = Math.round((9 + w * 2) * (event && event.id === 'horda' ? 1.4 : 1));
  var mix = ['blob', 'blob', 'blob'];
  if (w >= 2) mix.push('imp');
  if (w >= 3) mix.push('brute');
  if (w >= 4) mix.push('ghost', 'imp');
  if (w >= 3) mix.push('orco');
  if (w >= 5) mix.push('escarcha', 'orco');
  if (w >= 6) mix.push('rocoso');
  if (w >= 8) mix.push('brute', 'ghost', 'rocoso', 'escarcha');
  var queue = [];
  for (var i = 0; i < count; i++) queue.push({ kind: pick(mix) });
  if (isBossWave(w)) {
    var boss = b.stage ? b.stage.boss : BOSS_ORDER[(w / 5 - 1) % BOSS_ORDER.length];
    queue.push({ kind: boss, boss: true });
  }
  return { wave: w, event: event, queue: queue, count: count };
}
function startWave() {
  var b = battle;
  var plan = b.next && b.next.wave === b.wave + 1 ? b.next : planWave(b.wave + 1);
  b.wave = plan.wave;
  b.waveTime = 0;
  b.event = plan.event;
  b.boards.forEach(function (bd) { bd.event = b.event ? b.event.id : null; });
  b.queue = plan.queue;
  b.next = b.wave < b.maxWaves ? planWave(b.wave + 1) : null;
  b.spawnInterval = Math.max(0.45, 14 / plan.count);
  b.spawnT = 0;
  var sub = b.event ? b.event.name + ': ' + b.event.desc : isBossWave(b.wave) ? '👑 ¡Llega un jefe al final!' : '';
  showBanner('Oleada ' + b.wave + (b.maxWaves !== Infinity ? ' / ' + b.maxWaves : ''), sub, b.event ? b.event.pic : null);
  sfx('wave');
  updateHud(true);
}
/* ---------- tutorial de la primera partida ----------
   Pasos: invocar dos tropas (la oleada espera), fusionar, mejorar una carta
   y usar el comandante. Cada paso avanza al hacerlo; los dos últimos también
   se pasan solos al rato. */
function updateCoach(dt) {
  var b = battle, p = b.player;
  b.coachT += dt;
  var step = b.coachStep;
  var go = function () { b.coachStep++; b.coachT = 0; };
  if (step === 0) { if (p.summons >= 1) go(); else showCoach('👇 Toca <b>Invocar</b> para sacar una tropa al azar de tu mazo.', 'bottom'); }
  else if (step === 1) { if (p.summons >= 2) go(); else showCoach('👇 Invoca otra. Cada invocación cuesta 10 de maná más que la anterior. Los monstruos esperan a que tengas dos tropas.', 'bottom'); }
  else if (step === 2) {
    if (p.merges >= 1) { go(); return; }
    var pair = false;
    for (var a = 0; a < p.cells.length && !pair; a++) for (var c = a + 1; c < p.cells.length; c++) if (p.canMerge(a, c)) { pair = true; break; }
    showCoach(pair ? '✨ Tienes dos tropas iguales: <b>arrastra una sobre la otra</b> para fusionarlas. Suben de rango y pegan mucho más.'
      : 'Sigue invocando con el maná de las bajas. Cuando salgan dos tropas iguales, <b>arrastra una sobre la otra</b> para fusionarlas.', 'top');
  }
  else if (step === 3) { if (p.powers >= 1 || b.coachT > 14) go(); else showCoach('👇 Toca una <b>carta de abajo</b> para mejorar ese tipo de tropa durante la partida. Cuesta maná.', 'bottom'); }
  else if (step === 4) {
    if (p.cmds >= 1 || (p.charge >= 1 && b.coachT > 12)) go();
    else if (p.charge >= 1) showCoach('👇 Tu comandante está listo: <b>toca su retrato</b> para usar su habilidad.', 'bottom');
    else { hideCoach(); b.coachT = 0; }
  }
  else { hideCoach(); b.tutorial = false; meta.seenTutorial = true; saveMeta(); }
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
  if (b.moveCd > 0) b.moveCd = Math.max(0, b.moveCd - dt / (b.speed || 1));
  if (b.tutorial) updateCoach(dt);
  if (b.gap > 0) {
    // en el tutorial, la primera oleada espera a que invoques dos tropas
    if (!(b.tutorial && b.wave === 0 && b.player.summons < 2)) b.gap -= dt;
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

  // finales (en duelo, si caéis los dos a la vez es empate)
  var meOut = b.player.lives.v <= 0, foeOut = b.mode === 'duel' && b.other.lives.v <= 0;
  if (meOut && foeOut) { endBattle(false, true); return; }
  if (meOut) { endBattle(false); return; }
  if (foeOut) { endBattle(true); return; }
}

function endBattle(won, draw) {
  var b = battle;
  if (b.ended) return;
  b.ended = true;
  if (b.tutorial) { meta.seenTutorial = true; hideCoach(); }
  var res = { won: won, draw: !!draw, mode: b.mode, lines: [], gold: 0, gems: 0, chest: null, stars: 0, trophies: 0 };
  if (b.mode === 'campaign') {
    var st = b.stage;
    if (won) {
      var lives = b.player.lives.v;
      res.stars = lives >= 5 ? 3 : lives >= 3 ? 2 : 1;
      var prev = meta.campaign[st.id] || 0;
      res.gold = st.gold + (res.stars > prev ? (res.stars - prev) * 30 : 0);
      // gemas por cada estrella nueva
      if (res.stars > prev) { res.gems = (res.stars - prev) * 5; meta.campaign[st.id] = res.stars; }
      if (st.unlock && unlockUnit(st.unlock)) res.unlocked = st.unlock;
      res.chest = res.stars === 3 ? 'oro' : res.stars === 2 ? 'plata' : 'madera';
      res.lines.push('Has defendido ' + st.name + '.');
    } else {
      res.gold = 15 + b.wave * 5;
      res.lines.push('Caíste en la oleada ' + b.wave + ' de ' + b.maxWaves + '.');
    }
  } else if (b.mode === 'duel') {
    if (draw) {
      res.gold = 40;
      res.lines.push(b.other.name + ' y tú caísteis a la vez.');
    } else if (won) {
      res.trophies = 25 + (b.opts.level || 1) * 5;
      res.gold = 60 + b.opts.level * 40;
      res.gems = 2 + b.opts.level * 2;
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
    res.gems = Math.floor(b.wave / 5);
    res.chest = b.wave >= 20 ? 'oro' : b.wave >= 10 ? 'plata' : 'madera';
    if (b.wave > meta.coopBest) { meta.coopBest = b.wave; res.lines.push('¡Nuevo récord!'); }
    res.lines.push('Aguantasteis hasta la oleada ' + b.wave + '.');
    won = true;
    res.won = b.wave >= 10;
  }
  meta.gold += res.gold;
  meta.gems += res.gems;
  if (res.chest) res.chestSlot = addChestSlot(res.chest);   // se guarda en los huecos de cofre
  saveMeta();
  res.kills = b.player.kills;
  res.damage = b.player.damage;
  // daño de cada tropa (y del meteoro del comandante), de más a menos
  res.dmgBy = Object.keys(b.player.dmgBy).map(function (k) { return { id: k, v: b.player.dmgBy[k] }; })
    .filter(function (d) { return d.v >= 1; }).sort(function (p, q) { return q.v - p.v; });
  res.commander = b.player.commander;
  b.result = res;
  sfx(res.won ? 'win' : res.draw ? 'wave' : 'lose');
  setTimeout(function () { showResult(res); }, 900);
}

/* ---------- disposición ---------- */
var layout = { main: null, other: null };
var WAVE_INFO_H = 52;
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
  var gm = battle ? battle.player.geo : VECTOR_GEO;
  if (battle && battle.other) {
    var go = battle.other.geo;
    // arriba, la cabecera del rival o aliado (RIVAL_HEAD_H) y su tablero
    var topH = h * 0.35;
    var pw = go.image ? 0 : pad;
    var s2 = Math.min((w - pw * 2) / go.W, (topH - RIVAL_HEAD_H - 6) / go.H);
    layout.other = { sc: s2, ox: (w - go.W * s2) / 2, oy: RIVAL_HEAD_H + 4, g: go };
    var s1 = Math.min((w - pw * 2) / gm.W, (h - topH - pad - 6) / gm.H);
    layout.main = { sc: s1, ox: (w - gm.W * s1) / 2, oy: topH + (h - topH - gm.H * s1) / 2, g: gm };
  } else {
    // arriba queda la franja de la próxima oleada (#waveInfo)
    var mg = gm.image ? 0 : pad, top = WAVE_INFO_H;
    var s = Math.min((w - mg * 2) / gm.W, (h - top - mg * 2 - 20) / gm.H);
    layout.main = { sc: s, ox: (w - gm.W * s) / 2, oy: top + (h - top - gm.H * s) / 2 + (gm.image ? 0 : 8), g: gm };
    if (gm.image && gm.px.over && gm.px.frame) fitFrame(layout.main, gm, w, h, top);
    layout.other = null;
  }
  layout.w = w; layout.h = h;
}

/* Tableros «over»: el marco entero (px.frame) se ve completo y centrado si
   cabe con las casillas como mucho un 15% más pequeñas que encajando solo la
   zona de juego; si no (móvil estrecho), se queda la zona de juego encajada y
   el marco se sale por los bordes. La zona de juego siempre queda dentro. */
function fitFrame(L, g, w, h, top) {
  var F = g.px, upx = F.cw / g.W, fr = F.frame;
  var fx0 = (fr[0] - F.cx) / upx, fy0 = (fr[1] - F.cy) / upx, fw = (fr[2] - fr[0]) / upx, fh = (fr[3] - fr[1]) / upx;
  var availH = h - top - 6;
  var sFull = Math.min(w / fw, availH / fh);
  var s = sFull >= L.sc * 0.85 ? sFull : L.sc;
  var ox = w / 2 - (fx0 + fw / 2) * s, oy = top + availH / 2 - (fy0 + fh / 2) * s;
  var clamp = function (v, a, b) { return a <= b ? Math.min(Math.max(v, a), b) : (a + b) / 2; };
  L.sc = s;
  L.ox = clamp(ox, 0, w - g.W * s);
  L.oy = clamp(oy, top, top + availH - g.H * s);
}

/* Cabecera del rival o aliado, como en el género: retrato del comandante
   con su carga, nombre, vidas (duelo) y maná, y a la derecha las cartas de
   su mazo con su nivel en la partida. */
var RIVAL_HEAD_H = 40;
function drawRivalHeader(b, L) {
  var x0 = 6, x1 = layout.w - 6, hh = RIVAL_HEAD_H - 4, y0 = L.oy - hh - 3, cy = y0 + hh / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,40,0.78)'; rrect(ctx, x0, y0, x1 - x0, hh, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(245,196,0,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  // comandante: lo que falta por cargar, oscuro; listo, con brillo de su color
  var c = COMMANDERS[b.commander], pr = hh / 2 - 3, px = x0 + 5 + pr, pic = art('commanders/' + b.commander);
  if (b.charge >= 1) glow(ctx, px, cy, pr * 1.7, c.color, 0.55 + Math.sin(performance.now() / 180) * 0.15);
  ctx.save(); circle(ctx, px, cy, pr); ctx.clip();
  ctx.fillStyle = '#16215a'; ctx.fillRect(px - pr, cy - pr, pr * 2, pr * 2);
  if (pic) ctx.drawImage(pic, px - pr * 1.18, cy - pr * 1.18, pr * 2.36, pr * 2.36);
  if (b.charge < 1) {
    ctx.fillStyle = 'rgba(8,10,30,0.62)'; ctx.beginPath(); ctx.moveTo(px, cy);
    ctx.arc(px, cy, pr, -Math.PI / 2 + b.charge * Math.PI * 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.lineWidth = 2.5; ctx.strokeStyle = b.charge >= 1 ? c.color : '#f5c400'; circle(ctx, px, cy, pr); ctx.stroke();
  // nombre y, debajo, vidas y maná
  var tx = px + pr + 7;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.font = '400 13px "Lilita One", Nunito, sans-serif';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#fff';
  ctx.strokeText(b.name, tx, cy - 8); ctx.fillText(b.name, tx, cy - 8);
  var lx = tx, ly = cy + 9, vi = art('ui/vida'), gi = art('icons/gota');
  if (battle.mode === 'duel' && vi) {
    for (var hi = 0; hi < b.lives.max; hi++) { ctx.globalAlpha = hi < b.lives.v ? 1 : 0.3; ctx.drawImage(vi, lx, ly - 6, 13, 12); lx += 12; }
    ctx.globalAlpha = 1; lx += 6;
  }
  if (gi) { ctx.drawImage(gi, lx, ly - 7, 14, 14); lx += 15; }
  ctx.font = '900 12px Nunito, sans-serif'; var mt = String(Math.floor(b.mana));
  ctx.strokeText(mt, lx, ly); ctx.fillStyle = '#8ff3ff'; ctx.fillText(mt, lx, ly);
  // mazo a la derecha
  var n = b.deck.length, gap = 3, avail = x1 - 5 - Math.max(tx + 92, lx + ctx.measureText(mt).width + 10);
  var cw = Math.max(18, Math.min(hh - 6, avail / n - gap)), ch = cw, ty = cy - ch / 2;
  b.deck.forEach(function (id, k) {
    var cx = x1 - 5 - (n - k) * (cw + gap) + gap, rc = RARITY[UNITS[id].rarity].color;
    var bg = ctx.createLinearGradient(0, ty, 0, ty + ch); bg.addColorStop(0, shade(rc, -10)); bg.addColorStop(1, shade(rc, -60));
    ctx.fillStyle = bg; rrect(ctx, cx, ty, cw, ch, 5); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#f5c400'; ctx.stroke();
    var up = art('units/' + id);
    if (up) ctx.drawImage(up, cx + 1, ty + 1, cw - 2, ch - 2);
    // nivel de la tropa en esta partida (empieza en 1 y sube con sus mejoras), como en tu barra
    var lv = String(b.power[id] || 1), bw = 13, bx = cx + cw / 2, by = ty + ch - 1;
    ctx.fillStyle = '#f5c400'; rrect(ctx, bx - bw / 2 - 1, by - 7, bw + 2, 11, 4); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a2600'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = '400 10px "Lilita One", Nunito, sans-serif'; ctx.fillStyle = '#3a1d00'; ctx.fillText(lv, bx, by - 1.5);
  });
  ctx.restore();
}

/* ---------- decorado alrededor de los tableros ---------- */
var scenery = { key: '', items: [] };
function buildScenery() {
  var key = layout.w + 'x' + layout.h + battle.player.biome + (battle.other ? 2 : 1);
  if (scenery.key === key) return;
  scenery.key = key;
  scenery.items = [];
  var rects = [layout.main, layout.other].filter(Boolean).map(function (L) {
    return { x0: L.ox - 14, y0: L.oy - 26, x1: L.ox + L.g.W * L.sc + 14, y1: L.oy + L.g.H * L.sc + 14 };
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
  if (battle.player.geo.image && battle.player.geo.px.fade) { g.addColorStop(0, '#5cc23a'); g.addColorStop(1, '#3f9a2a'); }
  else { g.addColorStop(0, shade(bio.bg, 20)); g.addColorStop(1, shade(bio.bg, -30)); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, layout.w, layout.h);
  var G0 = battle.player.geo;
  var fieldPic = G0.image ? art(G0.image) : null;
  var fondo = art('ui/fondo');
  var grassy = ['prado', 'bosque', 'pantano'].indexOf(battle.player.biome) !== -1;
  if (fieldPic && G0.px.over) {
    drawBackdrop(fieldPic, G0.px);
  } else if (fondo && ((fieldPic && G0.px.bg === 'fondo') || (!fieldPic && grassy))) {
    // prado ilustrado de fondo, a pantalla completa
    var k = Math.max(layout.w / fondo.naturalWidth, layout.h / fondo.naturalHeight);
    var fw = fondo.naturalWidth * k, fh = fondo.naturalHeight * k;
    ctx.drawImage(fondo, (layout.w - fw) / 2, (layout.h - fh) / 2, fw, fh);
    if (G0.px && G0.px.bg === 'fondo' && battle.player.biome !== 'prado') {
      // tono del bioma por encima del prado
      ctx.fillStyle = alpha(BIOMES[battle.player.biome].bg, 0.45); ctx.fillRect(0, 0, layout.w, layout.h);
    }
  } else if (fieldPic && G0.px.fade) {
    // césped del mismo tono que la ilustración, con matas y flores sueltas
    var gg = ctx.createLinearGradient(0, 0, 0, layout.h);
    gg.addColorStop(0, '#6fc322'); gg.addColorStop(0.5, '#6abd1f'); gg.addColorStop(1, '#5aa81b');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, layout.w, layout.h);
    drawLawn();
  } else {
    drawScenery(now);
  }
  if (battle.other) {
    drawBoard(battle.other, layout.other, now, false);
    // separador
    var sy = layout.other.oy + layout.other.g.H * layout.other.sc + 4;
    if (fieldPic) {
      var sg = ctx.createLinearGradient(0, sy - 3, 0, sy + 5);
      var sep = G0.px.fade ? '30,70,10' : '0,0,0'; // verde sobre el césped, oscuro en los demás
      sg.addColorStop(0, 'rgba(' + sep + ',0)'); sg.addColorStop(0.5, 'rgba(' + sep + ',0.35)'); sg.addColorStop(1, 'rgba(' + sep + ',0)');
      ctx.fillStyle = sg; ctx.fillRect(0, sy - 3, layout.w, 8);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, sy, layout.w, 3);
    }
  }
  drawBoard(battle.player, layout.main, now, true);
}
/* Fondo de los tableros «over»: su propia zona de juego muy desenfocada
   (reducida a 40 px y ampliada) y oscurecida, a pantalla completa, para
   que cualquier forma de pantalla quede rellena con sus colores. */
var _backdrop = {};
function drawBackdrop(pic, F) {
  var cv = _backdrop[F.image];
  if (!cv) {
    var kx = pic.naturalWidth / F.iw, ky = pic.naturalHeight / F.ih;
    cv = document.createElement('canvas'); cv.width = 40; cv.height = Math.max(1, Math.round(40 * F.ch / F.cw));
    cv.getContext('2d').drawImage(pic, F.cx * kx, F.cy * ky, F.cw * kx, F.ch * ky, 0, 0, cv.width, cv.height);
    _backdrop[F.image] = cv;
  }
  var k = Math.max(layout.w / cv.width, layout.h / cv.height);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cv, (layout.w - cv.width * k) / 2, (layout.h - cv.height * k) / 2, cv.width * k, cv.height * k);
  var v = ctx.createRadialGradient(layout.w / 2, layout.h / 2, Math.min(layout.w, layout.h) * 0.2, layout.w / 2, layout.h / 2, Math.max(layout.w, layout.h) * 0.75);
  v.addColorStop(0, 'rgba(6,8,24,0.35)'); v.addColorStop(1, 'rgba(6,8,24,0.7)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, layout.w, layout.h);
}
var lawn = { key: '', items: [] };
function drawLawn() {
  var key = layout.w + 'x' + layout.h;
  if (lawn.key !== key) {
    lawn.key = key; lawn.items = [];
    var seed = 11, rnd2 = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (var i = 0; i < 90; i++) lawn.items.push({ x: rnd2() * layout.w, y: rnd2() * layout.h, t: rnd2(), s: 5 + rnd2() * 6 });
  }
  lawn.items.forEach(function (it) {
    if (it.t < 0.8) { // mata de hierba
      ctx.strokeStyle = 'rgba(40,110,20,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(it.x - it.s * 0.5, it.y); ctx.lineTo(it.x - it.s * 0.7, it.y - it.s);
      ctx.moveTo(it.x, it.y); ctx.lineTo(it.x, it.y - it.s * 1.3);
      ctx.moveTo(it.x + it.s * 0.5, it.y); ctx.lineTo(it.x + it.s * 0.7, it.y - it.s); ctx.stroke();
    } else { // florecilla
      ctx.fillStyle = '#ffffff';
      for (var k = 0; k < 5; k++) { var a = k * Math.PI * 2 / 5; circle(ctx, it.x + Math.cos(a) * 3.2, it.y + Math.sin(a) * 3.2, 2.6); ctx.fill(); }
      ctx.fillStyle = '#ffd34d'; circle(ctx, it.x, it.y, 2.2); ctx.fill();
    }
  });
}

function drawBoard(b, L, now, isMain) {
  var sc = L.sc, bio = BIOMES[b.biome];
  ctx.save();
  var sh = b.shake > 0 ? b.shake * 10 : 0;
  ctx.translate(L.ox + (Math.random() - 0.5) * sh, L.oy + (Math.random() - 0.5) * sh);
  ctx.scale(sc, sc);

  var G = b.geo;
  var pic = G.image ? art(G.image) : null;
  var dual = !!battle.other;
  // con dos tableros, tu tablero «over» se pinta entero hasta los lados de
  // la pantalla, por debajo del separador; el del rival o aliado se recorta
  // a su zona de juego (los monstruos entran por el camino desde el borde)
  var wide = pic && G.px.over && (!dual || b === battle.player);
  if (pic && dual) {
    ctx.beginPath();
    if (wide) {
      var Lo = layout.other, sepY = Lo.oy + Lo.g.H * Lo.sc + 4;
      ctx.rect(-L.ox / sc, (sepY - L.oy) / sc, layout.w / sc, (layout.h - sepY) / sc);
    } else ctx.rect(0, 0, G.W, G.H);
    ctx.clip();
  }
  if (pic) {
    // tablero ilustrado (recortado sin la interfaz de las esquinas)
    var F = G.px, kx = pic.naturalWidth / F.iw, ky = pic.naturalHeight / F.ih;
    if (wide) {
      // ilustración entera con la zona de juego en su sitio: el marco asoma
      // por arriba, abajo y los lados hasta donde llegue la pantalla
      var upx = F.cw / G.W; // píxeles de la imagen por unidad
      ctx.drawImage(pic, -F.cx / upx, -F.cy / upx, F.iw / upx, F.ih / upx);
    } else ctx.drawImage(pic, F.cx * kx, F.cy * ky, F.cw * kx, F.ch * ky, 0, 0, G.W, G.H);
    if (F.fade) {
      // funde los bordes superior e inferior con el césped de alrededor
      // (con dos tableros, el inferior apenas, para que se vea el camino)
      var fz = 0.35, fb = dual ? 0.2 : fz;
      var g1 = ctx.createLinearGradient(0, 0, 0, fz); g1.addColorStop(0, '#6fc322'); g1.addColorStop(1, 'rgba(111,195,34,0)');
      ctx.fillStyle = g1; ctx.fillRect(-0.02, -0.02, G.W + 0.04, fz);
      var g2 = ctx.createLinearGradient(0, G.H - fb, 0, G.H); g2.addColorStop(0, 'rgba(90,168,27,0)'); g2.addColorStop(1, dual ? 'rgba(95,172,28,0.6)' : '#5fac1c');
      ctx.fillStyle = g2; ctx.fillRect(-0.02, G.H - fb, G.W + 0.04, fb + 0.02);
      if (dual && L.ox > 1) {
        // el tablero de arriba no llega a los lados: funde también sus bordes
        var fside = 0.6;
        var g3 = ctx.createLinearGradient(0, 0, fside, 0); g3.addColorStop(0, '#6abd1f'); g3.addColorStop(1, 'rgba(106,189,31,0)');
        ctx.fillStyle = g3; ctx.fillRect(-0.02, -0.02, fside, G.H + 0.04);
        var g4 = ctx.createLinearGradient(G.W - fside, 0, G.W, 0); g4.addColorStop(0, 'rgba(106,189,31,0)'); g4.addColorStop(1, '#6abd1f');
        ctx.fillStyle = g4; ctx.fillRect(G.W - fside, -0.02, fside + 0.02, G.H + 0.04);
      }
    }
    for (var ti = 0; ti < COLS * ROWS; ti++) {
      var tt = b.tiles[ti];
      // las 15 losas siempre; la casilla especial, como emblema encima
      drawStoneTile(b, ti, b.cc(ti), G);
      if (tt) drawTileFloor(tt, b.cc(ti), G, ti, now);
    }
  } else {
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
    drawStoneTile(b, i, c, b.geo);
    if (b.tiles[i]) drawTileFloor(b.tiles[i], c, b.geo, i, now);
  }
  // franja inferior bajo el tablero
  ctx.fillStyle = shade(bio.frame, -10);
  ctx.fillRect(PATH_W, PATH_W + ROWS + 0.12, COLS, BOARD_H - PATH_W - ROWS - 0.12);
  // portal de entrada y puerta de salida, donde empieza y acaba el camino
  drawPortal(WAYPOINTS[0].x, WAYPOINTS[0].y, now, '#b26bff');
  drawGate(WAYPOINTS[WAYPOINTS.length - 1].x, WAYPOINTS[WAYPOINTS.length - 1].y);
  }

  // marcas de casillas especiales
  Object.keys(b.tiles).forEach(function (k) {
    var cc = b.cc(+k);
    if (!b.cells[k] && !art('tiles/' + b.tiles[k])) {
      ctx.globalAlpha = 0.85;
      drawTileIcon(b.tiles[k], cc.x, cc.y, 0.32);
      ctx.globalAlpha = 1;
    }
  });

  drawCellAuras(b, G, now);

  // tropas
  var sel = isMain ? battle.selected : null;
  var drag = isMain ? battle.drag : null;
  for (i = 0; i < b.cells.length; i++) {
    var u = b.cells[i];
    if (!u) continue;
    var cc2 = b.cc(i);
    if (drag && drag.moved && drag.from === i) { ctx.globalAlpha = 0.3; }
    var partner = (sel != null || (drag && drag.moved)) && b.canMerge(sel != null ? sel : drag.from, i);
    if (partner) {
      ctx.strokeStyle = alpha('#ffd166', 0.6 + Math.sin(now / 120) * 0.35); ctx.lineWidth = 0.07;
      rrect(ctx, cc2.x - G.cw * 0.46, cc2.y - G.ch * 0.46, G.cw * 0.92, G.ch * 0.92, 0.14); ctx.stroke();
    }
    if (sel === i) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.07;
      rrect(ctx, cc2.x - G.cw * 0.47, cc2.y - G.ch * 0.47, G.cw * 0.94, G.ch * 0.94, 0.14); ctx.stroke();
    }
    var r = 0.42 * Math.min(G.cw, G.ch) * (1 + u.anim * 0.25);
    // al invocar cae y rebota; al fusionar se estira (desde los pies)
    var pose = summonPose(u.drop) || mergePose(u.pop);
    if (pose) {
      var footY = cc2.y - 0.02 + r * 0.9;
      ctx.save();
      ctx.globalAlpha *= pose.a;
      ctx.translate(cc2.x, footY + pose.dy); ctx.scale(pose.sx, pose.sy); ctx.translate(-cc2.x, -footY);
    }
    drawUnit(ctx, u.id, cc2.x, cc2.y - 0.02, r, u.rank, now, { frozen: u.frozen > 0, board: true, atk: u.atk, aim: u.aim, recoil: u.recoil || 0, flash: pose ? pose.flash : 0 });
    if (pose) ctx.restore();
    if (b.tiles[i]) drawTileIcon(b.tiles[i], cc2.x + G.cw * 0.33, cc2.y - G.ch * 0.33, 0.13);
    ctx.globalAlpha = 1;
  }

  // monstruos (los de más atrás primero)
  var ens = b.enemies.slice().sort(function (p, q) { return p.y - q.y; });
  ens.forEach(function (e) {
    var d = e.boss ? BOSSES[e.kind] : ENEMIES[e.kind];
    // en el tablero dibujado salen del portal: aparecen creciendo
    // (en los tableros con portal, además, se van encogiendo al final del camino)
    var grow = G.image && !G.px.portal ? 1 : Math.min(1, 0.25 + e.d / 0.5);
    if (G.image && G.px.portal) grow = Math.min(grow, 0.25 + (G.len - e.d) / 0.5);
    if (grow < 1) ctx.globalAlpha = grow;
    drawEnemy(ctx, e, (e.boss ? 0.42 : d.size) * (G.image ? 0.82 : 1) * grow, now);
    ctx.globalAlpha = 1;
  });
  // proyectiles
  b.shots.forEach(function (s) { drawShot(s, now); });
  // efectos
  b.fx.forEach(function (f) {
    var t = 1 - f.life / f.max;
    if (f.type === 'bolt') {
      // rayo ilustrado estirado entre los dos puntos (se voltea al azar para
      // que chisporrotee) y un trazo quebrado encima
      var bim = art('fx/rayo-bola');
      ctx.globalAlpha = f.life / f.max;
      if (bim) {
        var bl = Math.hypot(f.x2 - f.x1, f.y2 - f.y1), bh = 0.42;
        ctx.save(); ctx.translate((f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2); ctx.rotate(Math.atan2(f.y2 - f.y1, f.x2 - f.x1));
        if (Math.random() < 0.5) ctx.scale(1, -1);
        ctx.drawImage(bim, -bl / 2, -bh / 2, bl, bh);
        ctx.restore();
      }
      ctx.strokeStyle = f.color; ctx.lineWidth = 0.06;
      ctx.beginPath(); ctx.moveTo(f.x1, f.y1);
      for (var s = 1; s < 5; s++) ctx.lineTo(f.x1 + (f.x2 - f.x1) * s / 5 + (Math.random() - 0.5) * 0.2, f.y1 + (f.y2 - f.y1) * s / 5 + (Math.random() - 0.5) * 0.2);
      ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (f.type === 'pic') {
      drawPicFx(ctx, f);
    } else if (f.type === 'sweep') {
      // habilidad de Aria o Merlo: la ola cruza el tablero y se apaga al final
      var sw = G.W * 0.8;
      ctx.globalAlpha = t < 0.8 ? 1 : (1 - t) * 5;
      drawFxPic(ctx, f.key, -sw / 2 + (G.W + sw) * t, f.y, sw, 0);
      ctx.globalAlpha = 1;
    } else if (f.type === 'fall') {
      // meteoro de Brann: baja en diagonal y desaparece al tocar suelo
      if (f.life <= METEOR_FALL) {
        var q = 1 - f.life / METEOR_FALL;
        drawFxPic(ctx, f.key, f.x - 1.9 * (1 - q), f.y - 0.25 - 2.6 * (1 - q), f.size, 0);
      }
    } else if (f.type === 'fly') {
      // la tropa que se funde vuela en arco hasta su pareja y encoge al llegar
      var ft = 1 - f.life / f.max, fe = 1 - Math.pow(1 - ft, 3);
      var fr = 0.42 * Math.min(G.cw, G.ch) * (1 - 0.45 * ft);
      drawUnit(ctx, f.id, f.x1 + (f.x2 - f.x1) * fe, f.y1 + (f.y2 - f.y1) * fe - Math.sin(ft * Math.PI) * 0.25, fr, f.rank, now, { board: true, recoil: 0, noRank: true });
    } else if (f.type === 'part') {
      // trocito del monstruo que sale volando y encoge
      var pk = f.life / f.max;
      ctx.globalAlpha = Math.min(1, pk * 2);
      ctx.fillStyle = f.color; circle(ctx, f.x, f.y, f.r * (0.4 + pk * 0.6)); ctx.fill();
      ctx.strokeStyle = 'rgba(26,20,48,0.8)'; ctx.lineWidth = 0.015; ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.type === 'flash') {
      ctx.globalAlpha = (f.life / f.max) * 0.5; ctx.fillStyle = f.color; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1;
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
    if (dual && pic && e.y > G.H + 0.1) return; // aún fuera del mapa
    var p = toS(e.x, e.y - (e.boss ? 0.92 : ENEMIES[e.kind].size + 0.16));
    // el número da un saltito al recibir un golpe
    var fs = Math.max(9, sc * (e.boss ? 0.3 : 0.22)) * (1 + 0.3 * (e.hitT > 0 ? e.hitT / HIT_TIME : 0));
    drawOutlinedText(ctx, fmtNum(Math.max(0, e.hp)), p.x, p.y, fs, e.boss ? '#ffd166' : '#ffffff');
  });
  if (isMain || sc > 30) {
    b.texts.forEach(function (t) {
      var p = toS(t.x, t.y);
      ctx.globalAlpha = Math.min(1, t.life / t.max * 1.6);
      var fs = Math.max(10, sc * (t.big ? 0.3 : 0.22));
      drawFloatText(ctx, t.text, p.x, p.y, fs, t.color);
    });
    ctx.globalAlpha = 1;
  }
  if (isMain && b.orbs.length) drawOrbs(b, toS, sc);
  // arrastre
  if (isMain && drag && drag.moved && b.cells[drag.from]) {
    var du = b.cells[drag.from];
    drawUnit(ctx, du.id, drag.x, drag.y, 0.46 * Math.min(G.cw, G.ch) * sc, du.rank, now, { board: true });
    // aún no se puede recolocar: reloj con lo que falta (fusionar sí se puede)
    if (battle.moveCd > 0) drawMoveTimer(drag.x + sc * 0.32, drag.y - sc * 0.42, Math.max(11, sc * 0.17), battle.moveCd / MOVE_COOLDOWN);
  }
  if (!isMain) drawRivalHeader(b, L);
}

/* Aura de cada tropa en su casilla (assets/cells/<id>), debajo de todas las
   fichas para que ninguna tape a una vecina.
    - las de posición y apoyo solo salen cuando cumplen su condición:
      Nívea con otra Nívea al lado (un aura doble entre las dos), Mirra y
      Cronos con vecinas distintas, Halcón en el borde, Melodía con tropas
      que atacan alrededor; Doblón, al dar maná.
    - el resto, suave siempre y se enciende al disparar.
   Las de remolino giran despacio; las altas (Doblón, Ulric) se apoyan en los pies. */
var AURA_SPIN = { lyra: 1, brasa: -1, rocco: 0.5, volta: 1.4, melodia: 0.4, sombra: -1.2, cronos: 0.35, fenix: 1, aurora: 1.3, boreas: -1 };
var AURA_TALL = { doblon: true, ulric: true };
function drawCellAuras(b, G, now) {
  var s = Math.min(G.cw, G.ch);
  for (var i = 0; i < b.cells.length; i++) {
    var u = b.cells[i];
    if (!u || u.drop > SUMMON_LAND) continue;
    var pic = art('cells/' + u.id), d = UNITS[u.id];
    if (!pic) continue;
    var c = b.cc(i), pulse = 0.5 + 0.5 * Math.sin(now / 420 + i), a, k = 1;
    if (d.twin) {
      // aura doble entre cada pareja de Nívea (una vez por pareja)
      neighbors(i).forEach(function (j) {
        var v = b.cells[j];
        if (j < i || !v || v.id !== u.id) return;
        var c2 = b.cc(j), w = s * 1.9, h = w * pic.naturalHeight / pic.naturalWidth;
        ctx.save(); ctx.globalAlpha = 0.75 + pulse * 0.2;
        ctx.translate((c.x + c2.x) / 2, (c.y + c2.y) / 2 + s * 0.08);
        if (Math.abs(c2.y - c.y) > Math.abs(c2.x - c.x)) ctx.rotate(Math.PI / 2);
        ctx.drawImage(pic, -w / 2, -h / 2, w, h);
        ctx.restore();
      });
      continue;
    }
    if (d.mixed || d.edge) { if (!(b.posBonus(i) > 0)) continue; a = 0.7 + pulse * 0.25; }
    else if (d.buff) { if (!(b.placeScore(i) > 0)) continue; a = 0.65 + pulse * 0.25; }
    else if (d.manaGen) { if (!(u.atk > 0)) continue; a = Math.min(1, u.atk / 0.25); k = 1.1 - 0.2 * (u.atk / 0.5); }
    else { a = 0.4 + 0.5 * (u.recoil || 0); k = 1 + 0.12 * (u.recoil || 0); }
    if (u.frozen > 0) a *= 0.4;
    var w2 = s * 0.95 * k, h2 = w2 * pic.naturalHeight / pic.naturalWidth;
    if (h2 > s * 1.1 * k) { h2 = s * 1.1 * k; w2 = h2 * pic.naturalWidth / pic.naturalHeight; }
    ctx.save();
    ctx.globalAlpha = a;
    // los remolinos, sobre el suelo y girando; las altas, de pie sobre los pies
    var cy = AURA_TALL[u.id] ? c.y + s * 0.42 - h2 / 2 : c.y + s * 0.06;
    ctx.translate(c.x, cy);
    if (AURA_SPIN[u.id]) ctx.rotate(now / 1000 * 0.6 * AURA_SPIN[u.id]);
    ctx.drawImage(pic, -w2 / 2, -h2 / 2, w2, h2);
    ctx.restore();
  }
}
/* Reloj de la espera para recolocar: disco oscuro con la parte que falta
   en dorado y los segundos en medio. */
function drawMoveTimer(x, y, r, left) {
  ctx.save();
  circle(ctx, x, y, r); ctx.fillStyle = 'rgba(14,12,28,0.85)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.86, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.closePath();
  ctx.fillStyle = 'rgba(255,209,102,0.85)'; ctx.fill();
  circle(ctx, x, y, r); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawOutlinedText(ctx, String(Math.ceil(left * MOVE_COOLDOWN)), x, y + 1, r * 1.1, '#ffffff');
  ctx.restore();
}
/* Portal de piedra con un remolino mágico dentro (tablero dibujado). */
function drawPortal(x, y, now, col) {
  var R = 0.36, t = now / 1000;
  ctx.save();
  // sombra y halo
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 0.06, R * 1.15, R * 1.05, 0, 0, Math.PI * 2); ctx.fill();
  glow(ctx, x, y, R * 1.9, col, 0.32 + Math.sin(t * 3) * 0.08);
  // aro de piedra con runas
  circle(ctx, x, y, R); ctx.fillStyle = vgrad(ctx, y - R, y + R, '#9a93a8', '#4a4458'); ctx.fill(); ink(ctx, 0.035);
  for (var k = 0; k < 8; k++) {
    var a = k * Math.PI / 4 + Math.PI / 8;
    ctx.strokeStyle = 'rgba(30,24,44,0.55)'; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * 0.74, y + Math.sin(a) * R * 0.74); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke();
    var ra = k * Math.PI / 4;
    ctx.fillStyle = alpha('#e6c8ff', 0.55 + 0.45 * Math.sin(t * 4 + k));
    circle(ctx, x + Math.cos(ra) * R * 0.87, y + Math.sin(ra) * R * 0.87, 0.026); ctx.fill();
  }
  // interior: pozo oscuro con brazos de remolino girando
  var r = R * 0.74;
  circle(ctx, x, y, r);
  var core = ctx.createRadialGradient(x, y, 0, x, y, r);
  core.addColorStop(0, '#f6e8ff'); core.addColorStop(0.18, shade(col, 30)); core.addColorStop(0.6, shade(col, -60)); core.addColorStop(1, '#140a24');
  ctx.fillStyle = core; ctx.fill();
  ctx.save(); circle(ctx, x, y, r); ctx.clip();
  ctx.lineCap = 'round';
  for (var arm = 0; arm < 4; arm++) {
    var base = -t * 2.6 + arm * Math.PI / 2;
    ctx.beginPath();
    for (var s = 0; s <= 1.0001; s += 0.08) {
      var ang = base + s * 3.2, rr = r * (0.12 + s * 0.95);
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.strokeStyle = alpha('#f2dcff', 0.55); ctx.lineWidth = 0.04; ctx.stroke();
  }
  ctx.restore();
  ink(ctx, 0.03);
  glow(ctx, x, y, r * 0.5, '#ffffff', 0.5 + Math.sin(t * 5) * 0.15);
  ctx.restore();
}
function drawGate(x, y) {
  rrect(ctx, x - 0.32, y - 0.38, 0.64, 0.5, 0.12); ctx.fillStyle = '#5a3a20'; ctx.fill(); ink(ctx, 0.04);
  ctx.fillStyle = '#ffd166'; star(ctx, x, y - 0.12, 0.14); ctx.fill();
}
/* Casilla especial (altar, fuente, atalaya) sobre su losa de piedra: la
   losa no cambia; encima van un borde que late del color de la casilla y
   su ilustración en pequeño, como emblema. */
function drawTileFloor(type, cc, G, i, now) {
  var pic = art('tiles/' + type), t = TILES[type];
  var s = Math.min(G.cw, G.ch), pulse = Math.sin(now / 500 + i);
  rrect(ctx, cc.x - s * 0.45, cc.y - s * 0.45, s * 0.9, s * 0.9, 0.1);
  ctx.strokeStyle = alpha(t.color, 0.75 + pulse * 0.2); ctx.lineWidth = 0.05; ctx.stroke();
  if (!pic) {
    ctx.fillStyle = alpha(t.color, 0.18 + pulse * 0.06); ctx.fill();
    return;
  }
  glow(ctx, cc.x, cc.y, s * 0.45, t.color, 0.35 + pulse * 0.12);
  var w = s * 0.58, h = w * pic.naturalHeight / pic.naturalWidth;
  ctx.drawImage(pic, cc.x - w / 2, cc.y - h / 2, w, h);
}
/* Losa de piedra de cada casilla: las 15 iguales, la lisa, en todos los mapas. */
var STONE_TILE = 'piedra-1';
function drawStoneTile(b, i, cc, G) {
  var pic = art('tiles/' + STONE_TILE);
  if (!pic) return false;
  var s = Math.min(G.cw, G.ch) * 0.97;
  ctx.fillStyle = 'rgba(10,12,30,0.3)';
  rrect(ctx, cc.x - s / 2 + 0.02, cc.y - s / 2 + 0.05, s, s, 0.08); ctx.fill();
  ctx.drawImage(pic, cc.x - s / 2, cc.y - s / 2, s, s);
  return true;
}
function drawTileIcon(type, x, y, r) {
  var t = TILES[type];
  var pic = art('tiles/' + type);
  if (pic) {
    circle(ctx, x, y, r * 1.15); ctx.fillStyle = 'rgba(14,12,28,0.55)'; ctx.fill();
    ctx.drawImage(pic, x - r, y - r, r * 2, r * 2);
    return;
  }
  // medallón con marco dorado, como las fichas ilustradas
  circle(ctx, x, y, r * 1.12); ctx.fillStyle = '#4a3200'; ctx.fill();
  var rim = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  rim.addColorStop(0, '#fff1a8'); rim.addColorStop(0.5, '#f5c400'); rim.addColorStop(1, '#b8860b');
  circle(ctx, x, y, r * 1.02); ctx.fillStyle = rim; ctx.fill();
  var inner = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 0.8);
  inner.addColorStop(0, shade(t.color, 60)); inner.addColorStop(1, shade(t.color, -40));
  circle(ctx, x, y, r * 0.8); ctx.fillStyle = inner; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.42, r * 0.42, r * 0.18, -0.3, 0, Math.PI * 2); ctx.fill();
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
/* Gotas de maná que salen de cada monstruo muerto y vuelan en curva hasta
   el contador de arriba. Al llegar cada una, el contador da un saltito. */
function manaTarget() {
  var m = document.querySelector('#battleScreen .mana img'), cr = canvas.getBoundingClientRect();
  if (!m) return { x: layout.w * 0.6, y: -20 };
  var r = m.getBoundingClientRect();
  return { x: r.left + r.width / 2 - cr.left, y: r.top + r.height / 2 - cr.top };
}
function bumpMana() {
  var m = document.querySelector('#battleScreen .mana');
  if (!m || !m.animate) return;
  if (bumpMana._a) bumpMana._a.cancel();
  bumpMana._a = m.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
}
function drawOrbs(b, toS, sc) {
  var E = manaTarget(), rad = Math.max(6, sc * 0.13);
  b.orbs.forEach(function (o) {
    var p = (o.t - o.delay) / o.dur;
    if (p < 0) return;
    if (p >= 1) { if (!o.hit) { o.hit = true; bumpMana(); } return; }
    var S = toS(o.x, o.y);
    // control de la curva hacia un lado y por encima, para que suba en arco
    var C = { x: (S.x + E.x) / 2 + o.side * 90, y: (S.y + E.y) / 2 + 40 };
    var e = p * p, q = 1 - e;
    var x = q * q * S.x + 2 * q * e * C.x + e * e * E.x, y = q * q * S.y + 2 * q * e * C.y + e * e * E.y;
    var rr = rad * (1 - 0.35 * p);
    glow(ctx, x, y, rr * 2.4, '#4af3ff', 0.55);
    var g = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.35, rr * 0.1, x, y, rr);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#7dfcff'); g.addColorStop(1, '#1a8fe0');
    ctx.fillStyle = g; circle(ctx, x, y, rr); ctx.fill();
    ctx.strokeStyle = '#0b2a5a'; ctx.lineWidth = Math.max(1, rr * 0.18); ctx.stroke();
  });
}
// lado mayor de cada proyectil ilustrado, en casillas
var SHOT_SIZE = { fire: 0.5, ice: 0.42, bomb: 0.34, arrow: 0.5, shadow: 0.42, gear: 0.3, bullet: 0.55, holy: 0.32 };
function drawShot(s, now) {
  var x = s.x, y = s.y;
  // proyectiles ilustrados: fuego y hielo miran hacia donde van, el frasco
  // gira y la bomba da vueltas despacio
  var el = FX_OF[s.kind];
  if (el) {
    var key = 'fx/' + el + '-bola', rot;
    if (FX_TURNS[key]) {
      var px = s.px != null ? s.px : s.sx, py = s.py != null ? s.py : s.sy;
      rot = (Math.abs(x - px) + Math.abs(y - py) > 0.001) ? Math.atan2(y - py, x - px) : Math.atan2(s.target.y - s.sy, s.target.x - s.sx);
    } else rot = FX_STILL[key] ? 0 : now / (s.kind === 'bomb' ? 260 : 120);
    s.px = x; s.py = y;
    var size = SHOT_SIZE[s.kind] || 0.32;
    if (s.def && s.def.id === 'titan') size *= 1.3;
    if (s.kind === 'fire') glow(ctx, x, y, 0.26, '#ff7a1a', 0.45);
    if (s.kind === 'holy') glow(ctx, x, y, 0.24, '#ffd34d', 0.5);
    if (s.kind === 'shadow') glow(ctx, x, y, 0.2, '#b026ff', 0.4);
    if (drawFxPic(ctx, key, x, y, size, rot)) return;
  }
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
    case 'coin': glow(ctx, x, y, 0.18, '#ffd34d', 0.7); if (!drawFxPic(ctx, 'chests/moneda', x, y, 0.28, now / 90)) { ctx.fillStyle = '#ffd34d'; circle(ctx, x, y, 0.09); ctx.fill(); } break;
    case 'holy': glow(ctx, x, y, 0.2, '#ffd34d', 0.9); ctx.fillStyle = '#ffffff'; star(ctx, x, y, 0.08, 4); ctx.fill(); break;
    default: ctx.fillStyle = s.color2; circle(ctx, x, y, 0.07); ctx.fill();
  }
}

/* ---------- controles táctiles ---------- */
function screenToCell(px, py) {
  var L = layout.main, G = battle.player.geo;
  var x = (px - L.ox) / L.sc, y = (py - L.oy) / L.sc;
  var c = Math.floor((x - G.x0) / G.cw), r = Math.floor((y - G.y0) / G.ch);
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
  if (d && d.moved) { dropUnit(d.from, i, { x: (p.x - layout.main.ox) / layout.main.sc, y: (p.y - layout.main.oy) / layout.main.sc }); return; }
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
function dropUnit(from, to, start) {
  var b = battle.player;
  if (to < 0 || to === from) return;
  if (b.canMerge(from, to)) { b.merge(from, to, start); sfx('merge'); buzz(25); }
  else if (!b.cells[to]) { moveUnit(from, to); }
  else if (canReposition()) { // intercambiar posiciones
    var t = b.cells[to]; b.cells[to] = b.cells[from]; b.cells[from] = t;
    b.cells[to].anim = 0.4; b.cells[from].anim = 0.4; sfx('tap'); moveFx(b, from, to);
    battle.moveCd = MOVE_COOLDOWN;
  }
  refreshUnitInfo();
}
// Novedad frente a otros juegos del género: las tropas se pueden recolocar
// para aprovechar casillas especiales y afinidades, pero solo una vez cada
// MOVE_COOLDOWN segundos (fusionar no cuenta). Corre en tiempo real: a x2
// no se acorta, y en pausa se para.
var MOVE_COOLDOWN = 5;
function canReposition() {
  if (!(battle.moveCd > 0)) return true;
  sfx('no');
  toast('⏱ Podrás mover otra tropa en ' + Math.ceil(battle.moveCd) + ' s');
  return false;
}
// dos estelas cruzadas entre la casilla de salida y la de llegada (assets/fx/mover)
function moveFx(b, from, to) {
  var a = b.cc(from), c = b.cc(to), dist = Math.hypot(c.x - a.x, c.y - a.y);
  if (!art('fx/mover')) return;
  b.fx.push({ type: 'pic', key: 'fx/mover', x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, size: Math.max(1, dist * 0.85), rot: Math.atan2(c.y - a.y, c.x - a.x), grow: 0.5, life: 0.45, max: 0.45 });
}
function moveUnit(from, to) {
  var b = battle.player;
  if (!canReposition()) return;
  b.cells[to] = b.cells[from]; b.cells[from] = null;
  b.cells[to].anim = 0.4;
  moveFx(b, from, to);
  battle.moveCd = MOVE_COOLDOWN;
  sfx('tap');
}
