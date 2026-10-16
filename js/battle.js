'use strict';
/* =========================================================
   PARTIDA: modos, oleadas, dibujo de los tableros y controles
   Modos:
    - campaign: tu tablero contra oleadas, con jefe final.
    - duel: 1 contra 1 frente a un rival (IA). Gana quien aguante más.
      Antes de empezar, una ruleta elige un modificador para los dos
      (DUEL_MODS) y el jefe final, que sale en todas las oleadas de jefe.
      Con opts.tourney es el torneo: las cartas y los comandantes de los dos,
      a nivel de torneo (TOURNEY_LV), y el rival puede llevar cualquier tropa.
    - coop: tú y un aliado (IA) contra oleadas infinitas, vidas compartidas.
      Un solo camino, el de tu tablero: la cuadrícula del aliado va encima y
      los dos disparáis a los mismos monstruos; el maná de cada baja es para los dos.
    - rogue: tú solo contra ROGUE_WAVES oleadas y un jefe final elegido por la
      ruleta; cada ROGUE_PICK_EVERY segundos eliges 1 de 3 ventajas.
    - reto: reto con amigos. Supervivencia con semilla (opts.seed): oleadas,
      eventos, casillas, tablero, modificador y jefe salen igual para quien
      juegue el mismo reto. Mazo y comandante del reto, a nivel de torneo.
   ========================================================= */

var battle = null;
var canvas, ctx, dpr = 1;
var ALLY_NAMES = ['Pip el Valiente', 'Tula', 'Bram', 'Nora'];
// azar con semilla (mulberry32): en los retos, lo que tiene que salir igual
// para todos sale de aquí (battle.rng); en el resto de modos, Math.random
function seededRng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function brand() { return battle && battle.rng ? battle.rng() : Math.random(); }
function bpick(arr) { return arr[Math.floor(brand() * arr.length)]; }
// mazo de un rival: hasta tres tropas de su elemento favorito, al menos tres
// que ataquen y, si va al ahorro, Doblón y Oria
function rivalDeck(rv, pool) {
  var fav = shuffleArr(pool.filter(function (id) { return UNITS[id].element === rv.element; })).slice(0, 3);
  var deck = fav.concat(shuffleArr(pool.filter(function (id) { return fav.indexOf(id) === -1; }))).slice(0, 5);
  if (rv.style === 'ahorro') ['doblon', 'oria'].forEach(function (id, k) { if (pool.indexOf(id) !== -1 && deck.indexOf(id) === -1) deck[4 - k] = id; });
  var attackers = function () { return deck.filter(function (id) { return UNITS[id].dmg; }).length; };
  var extra = shuffleArr(pool.filter(function (id) { return UNITS[id].dmg && deck.indexOf(id) === -1; }));
  for (var i = deck.length - 1; i >= 0 && attackers() < 3 && extra.length; i--) if (!UNITS[deck[i]].dmg && !(rv.style === 'ahorro' && (deck[i] === 'doblon' || deck[i] === 'oria'))) deck[i] = extra.pop();
  return deck;
}

function startBattle(mode, opts) {
  opts = opts || {};
  var reto = mode === 'reto', rng = reto ? seededRng(opts.seed) : null;
  var stage = mode === 'campaign' ? CAMPAIGN[opts.stage - 1] : null;
  var biome = stage ? stage.biome : pick(Object.keys(BIOMES));
  var deck = reto ? opts.deck.slice() : meta.deck.slice();
  var tourney = mode === 'duel' && !!opts.tourney;
  var lv = tourney || reto ? tourneyLevels() : cardLevels();
  var myCmd = reto ? opts.cmd : meta.commander;
  var myCmdLv = tourney || reto ? TOURNEY_CMD_LV : cmdLevel(meta.commander);
  // Ascensión del Roguelike elegida (como mucho la más alta abierta)
  var asc = mode === 'rogue' ? Math.max(0, Math.min(meta.rogueAsc || 0, meta.rogueAscSel || 0)) : 0;
  var lives = mode === 'campaign' ? { v: 5, max: 5 } : mode === 'rogue' ? { v: rogueAscLives(asc), max: rogueAscLives(asc) } : reto ? { v: RETO_LIVES, max: RETO_LIVES } : mode === 'duel' ? { v: 3, max: 3 } : { v: 6, max: 6 };
  // torneo con mazo prestado o con cartas al azar: el mazo de los dos cambia
  var tmode = tourney ? opts.tmode || 'clasico' : null, aiPreset = null, lent = null;
  if (tmode === 'prestado') {
    var two = shuffleArr(TOURNEY_DECKS.slice());
    lent = two[0]; deck = two[0].deck.slice(); aiPreset = two[1].deck.slice();
  } else if (tmode === 'azar') { deck = randomDeck(); aiPreset = randomDeck(); }
  // tablero ilustrado (al azar entre los que ya han cargado): la campaña usa
  // uno de su bioma; el cooperativo, cualquiera de los cinco (no hace falta
  // tener su arena), y el duelo, el de tu arena; con un bioma
  // que le pegue para el decorado de alrededor
  var loaded = function (k) { return art(FIELD_GEOS[k].image); };
  // el 1 contra 1 (no el torneo) se juega en el tablero de tu arena
  var choices = onlyNewFields(stage ? [].concat(BIOME_FIELD[biome] || 'prado') : mode === 'duel' && !opts.tourney ? [ARENAS[arenaIndex()].field] : Object.keys(FIELD_GEOS));
  // en el torneo se puede elegir la arena
  if (tourney && FIELDS[opts.arena]) choices = onlyNewFields([opts.arena]);
  var ready = choices.filter(loaded);
  var fid = ready.length ? pick(ready) : loaded('prado') ? 'prado' : null;
  if (reto) {
    // el tablero y su decorado, de la semilla (siempre se tira el dado, aunque no haya cargado)
    var want = choices[Math.floor(rng() * choices.length)], bio = rng();
    fid = loaded(want) ? want : loaded('prado') ? 'prado' : null;
    biome = Object.keys(BIOMES)[Math.floor(bio * Object.keys(BIOMES).length)];
  }
  if (!stage && fid) {
    var fits = Object.keys(BIOME_FIELD).filter(function (bk) { return [].concat(BIOME_FIELD[bk]).indexOf(fid) !== -1; });
    if (fits.length && fits.indexOf(biome) === -1) biome = reto ? fits[0] : pick(fits);
  }
  var geo = fid ? FIELD_GEOS[fid] : VECTOR_GEO;
  var floorTile = floorTileFor(geo.field);
  if (reto) { var ft = FIELD_TILES[geo.field], fr = rng(); if (ft) floorTile = ft.set + '-' + (1 + Math.floor(fr * ft.n)); }
  var player = new Board({ name: 'Tú', deck: deck, cardLv: lv, commander: myCmd, cmdLv: myCmdLv, lives: lives, biome: biome, geo: geo, floorTile: floorTile, mana: stage ? stage.mana : 100,
    talents: reto ? {} : myTalents(lv), cmdNodes: reto ? [] : cmdTreeActive(myCmd, myCmdLv, (meta.cmdTree || {})[myCmd]) });
  if (reto) {
    // casillas especiales de la semilla
    var spots = Array.from({ length: COLS * ROWS }, function (_, i) { return i; });
    for (var si = spots.length - 1; si > 0; si--) { var sj = Math.floor(rng() * (si + 1)), sw = spots[si]; spots[si] = spots[sj]; spots[sj] = sw; }
    player.tiles = {};
    pickTileTypes(TILE_COUNT, rng).forEach(function (t, k) { player.tiles[spots[k]] = t; });
  }
  // evento de la semana: más daño a un elemento (no en los retos, que se juegan igual para todos)
  if (!reto) { var wev = weekEvent(); player.elemBonus[wev.el] = (player.elemBonus[wev.el] || 0) + WEEK_BONUS; }
  battle = {
    rng: rng, asc: asc,
    mode: mode, stage: stage, opts: opts, tmode: tmode, lent: lent,
    boards: [player], player: player, other: null,
    wave: 0, maxWaves: stage ? stage.waves : mode === 'rogue' ? ROGUE_WAVES : Infinity,
    queue: [], spawnT: 0, spawnInterval: 1, gap: 3, waveTime: 0,
    event: null, ended: false, paused: false, speed: 1, time: 0,
    selected: null, drag: null, result: null,
    // primera partida de campaña: consejos paso a paso (ver updateCoach)
    tutorial: mode === 'campaign' && !meta.seenTutorial, coachStep: 0, coachT: 0
  };
  // reto: modificador y jefe final de la semilla, antes de planear la primera oleada
  if (reto) {
    var modId = RETO_MODS[Math.floor(rng() * RETO_MODS.length)];
    battle.mod = DUEL_MODS.filter(function (m) { return m.id === modId; })[0];
    battle.boss = BOSS_ORDER[Math.floor(rng() * BOSS_ORDER.length)];
    applyDuelMod(player, battle.mod.id);
    battle.intro = true;
  }
  battle.next = planWave(1);
  if (mode === 'duel') {
    var aiLv = opts.level == null ? 1 : opts.level;
    // cada rival juega a su manera y lleva tropas de su elemento favorito
    var rv = pick(RIVALS);
    battle.rival = rv;
    var aiDeck = aiPreset || rivalDeck(rv, (tourney ? UNIT_ORDER : AI_UNITS).filter(function (id) { return id !== 'melodia' || aiLv > 0; }));
    if (!aiPreset && rv.style !== 'ahorro' && aiDeck.indexOf('doblon') === -1 && aiLv > 0) aiDeck[4] = 'doblon';
    var aiCard = {};
    var avg = Math.round(Object.keys(lv).reduce(function (s, k) { return s + lv[k]; }, 0) / Math.max(1, Object.keys(lv).length));
    UNIT_ORDER.forEach(function (id) { aiCard[id] = Math.max(1, avg + DUEL_CARD_OFFSET[aiLv]); });
    if (tourney) aiCard = tourneyLevels();
    var aiCmdLv = tourney ? TOURNEY_CMD_LV : Math.max(1, Math.min(CMD_MAX, myCmdLv + DUEL_CARD_OFFSET[aiLv]));
    var aiCmd = pick(COMMANDER_ORDER);
    battle.other = new Board({ name: rv.name, style: rv.style, ai: true, aiLevel: aiLv, deck: aiDeck, cardLv: aiCard, commander: aiCmd, cmdLv: aiCmdLv, lives: { v: 3, max: 3 }, biome: biome, geo: geo, floorTile: floorTile, talents: aiTalents(aiCard), cmdNodes: cmdTreeActive(aiCmd, aiCmdLv, aiCmdTree(aiCmd)) });
  } else if (mode === 'coop') {
    var allyDeck = shuffleArr(AI_UNITS.slice()).slice(0, 5);
    var allyCard = {};
    UNIT_ORDER.forEach(function (id) { allyCard[id] = Math.max(1, (lv[id] || 1)); });
    // la cuadrícula del aliado va encima de tu tablero, en el mismo espacio
    // (mismo camino, mismas coordenadas): sus disparos van a tus monstruos
    // (ally: sin las losas dibujadas del tablero, que son las tuyas)
    var allyGeo = Object.assign({}, geo, { y0: -COOP_GAP - ROWS * geo.ch, ally: true });
    battle.other = new Board({ name: pick(ALLY_NAMES), ai: true, aiLevel: 2, deck: allyDeck, cardLv: allyCard, commander: pick(COMMANDER_ORDER), cmdLv: myCmdLv, lives: lives, biome: biome, geo: allyGeo, floorTile: floorTile === 'none' ? STONE_TILE : floorTile });
  }
  if (battle.other) { battle.boards.push(battle.other); battle.other.battle = battle; }
  if (mode === 'coop') {
    // un solo camino: los monstruos son los de tu tablero y el aliado los
    // ve y les dispara (feed); maná de las bajas, Maldición y Escudo, a medias
    var ally = battle.other;
    ally.feed = player;
    Object.defineProperty(ally, 'enemies', { get: function () { return player.enemies; }, set: function () {} });
    ally.shareWith = player; player.shareWith = ally;
    ally.partner = player; player.partner = ally;
  }
  // 1 contra 1 (no el torneo): modificador y jefe final al azar; la partida
  // espera a que la ruleta los enseñe (showDuelRoulette)
  if (mode === 'duel' && !tourney) {
    battle.mod = pick(DUEL_MODS);
    battle.boss = pick(BOSS_ORDER);
    battle.boards.forEach(function (bd) { applyDuelMod(bd, battle.mod.id); });
    battle.intro = true;
  }
  // torneo: el modificador que hayas elegido (o uno al azar)
  if (tourney && opts.mod) {
    battle.mod = opts.mod === 'azar' ? pick(DUEL_MODS) : DUEL_MODS.filter(function (m) { return m.id === opts.mod; })[0] || null;
    if (battle.mod) battle.boards.forEach(function (bd) { applyDuelMod(bd, battle.mod.id); });
  }
  // roguelike: la ruleta solo elige el jefe final; las ventajas llegan cada ROGUE_PICK_EVERY s
  if (mode === 'rogue') {
    battle.boss = pick(BOSS_ORDER);
    battle.nextPick = ROGUE_PICK_EVERY;
    player.rogueMods = [];
    battle.intro = true;
  }
  player.battle = battle;
  player.onLeak = function (e, loss) { if (!loss) return; sfx('leak'); buzz(80); aiEmote(pick(['😂', '😮']), 0.3); };
  if (mode === 'duel') {
    battle.other.onLeak = function (e, loss) { if (loss) aiEmote(pick(['😡', '😮']), 0.35); };
    battle.other.onKill = function (e) { if (e.boss) aiEmote(pick(['👑', '🔥', '👍']), 0.5); };
  }
  player.onCombo = function (n) { sfx('merge'); if (n >= 3) buzz(30); };
  player.onKill = function (e) { if (e.boss) sfx('boss'); bestiaryAdd(e.kind, e.boss, true); };

  showScreen('battle');
  buildBattleHud();
  resizeCanvas();
  resetReplay();
  musicFor(battle);
  if (battle.intro) { showDuelRoulette(); return; }
  showBanner(mode === 'campaign' ? 'Fase ' + stage.id + ': ' + stage.name : tourney ? 'Torneo contra ' + battle.other.name : mode === 'duel' ? '⚔️ Duelo contra ' + battle.other.name : '🤝 Con ' + battle.other.name + ' contra la horda',
    tourney ? 'Juega a ' + RIVAL_STYLES[battle.rival.style].name.toLowerCase() + (battle.mod ? ' · ' + battle.mod.name : '') : 'Prepárate…');
  sfx('start');
}
function applyDuelMod(bd, id) {
  if (id === 'mana2') { bd.manaMult = 2; bd.mana *= 2; }
  else if (id === 'rebajas') bd.powerCostMult = 0.5;
  else if (id === 'veteranos') bd.rank2 = 0.25;
  else if (id === 'carga') bd.chargeMult = 2;
  else if (id === 'subita') { bd.lives.v = 1; bd.lives.max = 1; }
  else if (id === 'gigantes') bd.rewardMult = 2;
  else if (id === 'estampida') bd.slowMult = 1.3;
  else if (id === 'fusion') bd.mergeBoost = 0.2;
  else if (id === 'fijo') { bd.summonCost = 20; bd.summonStep = 0; }
  else if (id === 'lazos') bd.affMult = 3;
  else if (id === 'directa') bd.directed = true;
  else if (id === 'r_suerte') bd.luck += 0.1;
  else if (id === 'r_caliz') bd.caliz = true;
  else if (id.indexOf('r_') === 0) { var el = id.slice(2); bd.elemBonus[el] = (bd.elemBonus[el] || 0) + 0.35; }
  else if (id === 'casillas') {
    var spots = shuffleArr(Array.from({ length: COLS * ROWS }, function (_, i) { return i; }).filter(function (i) { return !bd.tiles[i]; }));
    var have = Object.keys(bd.tiles).map(function (k) { return bd.tiles[k]; });
    pickTileTypes(TILE_COUNT, null, have).forEach(function (t, k) { bd.tiles[spots[k]] = t; });
  }
}
// vida de los monstruos según el modificador del duelo
function modHp() {
  var m = battle.mod && battle.mod.id;
  return m === 'gigantes' ? 1.5 : m === 'enjambre' ? 0.5 : m === 'estampida' ? 0.75 : 1;
}
// mazo de cinco tropas al azar de entre todas (torneo «Cartas al azar»), con al menos tres que ataquen
function randomDeck() {
  for (var t = 0; t < 50; t++) {
    var d = shuffleArr(UNIT_ORDER.slice()).slice(0, 5);
    if (d.filter(function (id) { return UNITS[id].dmg; }).length >= 3) return d;
  }
  return d;
}
// tus talentos, solo los pisos que abre el nivel de la carta en esta partida
function myTalents(lv) {
  var o = {};
  Object.keys(TALENTS).forEach(function (id) {
    var picks = (meta.talents || {})[id];
    if (picks) o[id] = picks.map(function (k, t) { return (lv[id] || 1) >= TALENT_LV[t] ? k : null; });
  });
  return o;
}
// la máquina elige las ramas de su comandante al azar
function aiCmdTree(k) {
  return (CMD_TREE[k] || []).map(function (tier, t) { return shuffleArr(tier.map(function (n) { return n.id; })).slice(0, CMD_TREE_PICK[t]); });
}
// la máquina elige sus talentos al azar
function aiTalents(lv) {
  var o = {};
  Object.keys(TALENTS).forEach(function (id) {
    o[id] = TALENTS[id].map(function (tier, t) { return (lv[id] || 1) >= TALENT_LV[t] ? pick(tier).id : null; });
  });
  return o;
}
// al acabar la ruleta empieza de verdad la partida
function endDuelIntro() {
  var b = battle;
  if (!b || !b.intro) return;
  b.intro = false;
  if (b.mode === 'rogue') showBanner('Modo roguelike', 'Jefe final en la oleada ' + b.maxWaves + ': ' + BOSSES[b.boss].name);
  else if (b.mode === 'reto') showBanner(b.opts.from ? 'Reto de ' + b.opts.from : 'Reto nuevo', b.opts.from ? 'Supera la oleada ' + b.opts.target : 'Aguanta todo lo que puedas');
  else showBanner('⚔️ Duelo contra ' + b.other.name, b.mod.name + ' · Jefe final: ' + BOSSES[b.boss].name);
  sfx('start');
  updateHud(true);
}

/* ---------- ventajas del roguelike ----------
   Cada ROGUE_PICK_EVERY segundos la partida se para y eliges una (showChoice). */
function skillOption(k, cmd) { return { kind: 'skill', id: k, name: CMD_SKILLS[k].name, pic: 'assets/' + CMD_SKILLS[k].pic + '.webp', desc: cmdSkillDesc(k, cmd) }; }
// roguelike: 1 de 3 entre habilidades, reliquias y modificadores que aún no tengas
function offerRogue() {
  var b = battle, p = b.player;
  var pool = CMD_SKILL_ORDER.filter(function (k) { return p.skills.indexOf(k) === -1; }).map(function (k) { return skillOption(k, p.commander); })
    .concat(ROGUE_MODS.filter(function (id) { return p.rogueMods.indexOf(id) === -1; }).map(function (id) {
      var m = DUEL_MODS.filter(function (x) { return x.id === id; })[0];
      return { kind: 'mod', id: id, name: m.name, pic: m.pic, desc: m.desc, relic: !!m.relic };
    }));
  if (!pool.length) return;
  b.picking = true;
  showChoice({ title: 'Elige una ventaja', face: COMMANDERS[p.commander], options: shuffleArr(pool).slice(0, 3), n: 1,
    have: p.skills.map(function (k) { return CMD_SKILLS[k].name; }).concat(p.rogueMods.map(function (id) { return DUEL_MODS.filter(function (x) { return x.id === id; })[0].name; })) }, finishPick);
}
function finishPick(chosen) {
  var b = battle;
  if (!b || !b.picking) return;
  chosen.forEach(function (o) {
    if (o.kind === 'skill') b.player.applySkill(o.id);
    else { applyDuelMod(b.player, o.id); b.player.rogueMods.push(o.id); }
  });
  b.picking = false;
  showBanner(b.wave ? 'Oleada ' + b.wave : '¡A por ellos!', chosen.map(function (o) { return o.name; }).join(' y '));
  updateHud(true);
}

/* ---------- oleadas ---------- */
// cartas del rival del duelo respecto a la media de las tuyas (fácil, normal, difícil)
var DUEL_CARD_OFFSET = [-2, 0, 2];
var ROGUE_LATE = 1.11;
var COOP_HP = 2.4;
function hpScale() {
  var b = battle, w = Math.max(1, b.wave);
  var s = 52 * Math.pow(1.18, w - 1);
  if (b.stage) {
    // la dureza de la fase llega poco a poco: la primera oleada, al 55 %
    var ramp = b.maxWaves > 1 ? 0.55 + 0.45 * (w - 1) / (b.maxWaves - 1) : 1;
    s *= 1 + (b.stage.hp - 1) * ramp;
  }
  if ((b.mode === 'duel' || b.mode === 'reto') && w > 12) s *= Math.pow(1.22, w - 12);
  // roguelike: a partir de la 15 aprieta más, que las ventajas se acumulan
  if (b.mode === 'rogue' && w > 15) s *= Math.pow(ROGUE_LATE, w - 15);
  if (b.mode === 'rogue' && b.asc) s *= rogueAscHp(b.asc);
  if (b.event && b.event.id === 'horda') s *= 0.7;
  // cooperativo: a cada monstruo le disparan los dos tableros a la vez
  if (b.mode === 'coop') s *= COOP_HP;
  return s * modHp();
}
function isBossWave(w) {
  if (battle.mode === 'campaign') return w === battle.maxWaves;
  return w % (battle.mod && battle.mod.id === 'jefes' ? 3 : 5) === 0;
}
// monstruos que pueden protagonizar una oleada, según por cuál vas
function leadPool(w) {
  var p = ['blob', 'imp'];
  if (w >= 3) p.push('brute', 'orco');
  if (w >= 4) p.push('ghost', 'escudado');
  if (w >= 5) p.push('escarcha');
  if (w >= 6) p.push('rocoso');
  return p;
}
// parte de la oleada que es del protagonista; el resto, monstruos variados
var LEAD_SHARE = 0.7;
// segundos que gira el sorteo de la siguiente oleada (showWaveDraw) y los que se queda a la vista
var DRAW_SPIN = 1.9, DRAW_HOLD = 1.6;
/* Se decide una oleada antes de que llegue, para poder anunciar la siguiente.
   Cada oleada tiene un monstruo protagonista sorteado (nunca el mismo de la
   anterior); cuántos salen depende de su vida, así la dureza no cambia. */
function planWave(w) {
  var b = battle;
  var caos = b.mod && b.mod.id === 'caos';
  var roll = brand(), evPick = brand();
  var event = w >= (caos ? 2 : 3) && (caos || roll < 0.4) ? WAVE_EVENTS[Math.floor(evPick * WAVE_EVENTS.length)] : null;
  var count = Math.round((9 + w * 2) * (event && event.id === 'horda' ? 1.4 : 1) * (b.mod && b.mod.id === 'enjambre' ? 2 : 1));
  var mix = ['blob', 'blob', 'blob'];
  if (w >= 2) mix.push('imp');
  if (w >= 3) mix.push('brute');
  if (w >= 4) mix.push('ghost', 'imp', 'escudado');
  if (w >= 7) mix.push('escudado');
  if (w >= 3) mix.push('orco');
  if (w >= 5) mix.push('escarcha', 'orco');
  if (w >= 6) mix.push('rocoso');
  if (w >= 8) mix.push('brute', 'ghost', 'rocoso', 'escarcha');
  var pool = leadPool(w), prev = b.next && b.next.wave === w - 1 ? b.next.lead : null;
  if (prev && pool.length > 1) pool = pool.filter(function (k) { return k !== prev; });
  var lead = bpick(pool);
  var avgHp = mix.reduce(function (s, k) { return s + ENEMIES[k].hp; }, 0) / mix.length;
  var nFill = Math.round(count * (1 - LEAD_SHARE));
  var nLead = Math.max(3, Math.min(Math.round(count * 1.6), Math.round(count * LEAD_SHARE * avgHp / ENEMIES[lead].hp)));
  var queue = [];
  for (var i = 0; i < nFill; i++) queue.push({ kind: bpick(mix) });
  for (i = 0; i < nLead; i++) queue.push({ kind: lead });
  for (i = queue.length - 1; i > 0; i--) { var j = Math.floor(brand() * (i + 1)), sw = queue[i]; queue[i] = queue[j]; queue[j] = sw; }
  count = queue.length;
  if (isBossWave(w)) {
    var rot = BOSS_ORDER[(w / 5 - 1) % BOSS_ORDER.length];
    // roguelike: rotan los jefes y el de la ruleta llega en la última oleada
    var boss = b.stage ? b.stage.boss : b.mode === 'rogue' ? (w === b.maxWaves ? b.boss : rot) : b.boss || rot;
    queue.push({ kind: boss, boss: true, final: b.mode === 'rogue' && w === b.maxWaves });
  }
  return { wave: w, event: event, queue: queue, count: count, lead: lead, drawn: false };
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
  bestiaryAdd(spec.kind, !!spec.boss, false);
  // en el cooperativo, un solo camino: el de tu tablero
  (b.mode === 'coop' ? [b.player] : b.boards).forEach(function (bd) {
    if (spec.boss) {
      var hp = sc * BOSSES[spec.kind].hp * (1 + b.wave * 0.04) * (spec.final ? ROGUE_FINAL_HP : 1);
      bd.spawn(spec.kind, hp, { boss: true });
    } else {
      bd.spawn(spec.kind, sc * ENEMIES[spec.kind].hp);
    }
  });
  if (spec.boss) { showBanner((spec.final ? '👑 Jefe final: ' : '👑 ') + BOSSES[spec.kind].name, BOSSES[spec.kind].desc); sfx('boss'); }
}

function updateBattle(dt) {
  var b = battle;
  if (!b || b.ended || b.paused || b.intro || b.picking) return;
  b.time += dt;
  if (b.mode === 'rogue' && b.time >= b.nextPick) { b.nextPick += ROGUE_PICK_EVERY; offerRogue(); if (b.picking) return; }
  if (b.moveCd > 0) b.moveCd = Math.max(0, b.moveCd - dt / (b.speed || 1));
  if (b.tutorial) updateCoach(dt);
  // sorteo de la siguiente oleada: al salir el último monstruo de la actual
  // (o antes de la primera), sin parar la partida
  if (b.next && !b.next.drawn && (!b.wave || !b.queue.length)) { b.next.drawn = true; showWaveDraw(b.next); }
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
      var prev = meta.campaign[st.id] || 0, better = res.stars > prev;
      res.gold = st.gold + (better ? (res.stars - prev) * 30 : 0);
      // gemas por cada estrella nueva
      if (better) { res.gems = (res.stars - prev) * 5; meta.campaign[st.id] = res.stars; }
      // cofre de su zona; uno mejor si has sacado estrellas nuevas
      res.chest = stageChest(st.id, better);
      res.lines.push('Has defendido ' + st.name + '.');
    } else {
      res.gold = 15 + b.wave * 5;
      res.lines.push('Caíste en la oleada ' + b.wave + ' de ' + b.maxWaves + '.');
    }
  } else if (b.mode === 'duel' && b.opts.tourney) {
    // torneo: sin trofeos; si ganas, cofre de comandante
    if (draw) {
      res.gold = 40;
      res.lines.push(b.other.name + ' y tú caísteis a la vez.');
    } else if (won) {
      res.gold = 120;
      res.gems = 4;
      res.chest = 'comandante';
      meta.tourneyWins++;
      res.lines.push('Con las mismas cartas, ' + b.other.name + ' no pudo contigo.');
    } else {
      res.gold = 25;
      meta.tourneyLosses++;
      res.lines.push('Con las mismas cartas, ' + b.other.name + ' aguantó más.');
    }
  } else if (b.mode === 'duel') {
    if (draw) {
      res.gold = 40;
      res.lines.push(b.other.name + ' y tú caísteis a la vez.');
    } else if (won) {
      res.trophies = duelTrophies(b.opts.level, arenaIndex());
      res.gold = 60 + b.opts.level * 40 + arenaIndex() * ARENA_GOLD;
      res.gems = 2 + b.opts.level * 2;
      res.chest = b.opts.level >= 2 ? 'oro' : 'plata';
      meta.duelWins++;
      res.lines.push(b.other.name + ' no pudo con tu defensa.');
    } else {
      res.trophies = -Math.min(meta.trophies, duelLoss(arenaIndex()));
      res.gold = 20;
      meta.duelLosses++;
      res.lines.push(b.other.name + ' aguantó más que tú.');
    }
    if (b.mod && b.mod.id === 'oro' && won && !draw) res.gold *= 2;
    if (b.mod) res.lines.push(b.mod.name + (b.boss ? ' · Jefe final: ' + BOSSES[b.boss].name : ''));
    var arena0 = arenaIndex();
    addTrophies(res.trophies);
    if (arenaIndex() > arena0) res.lines.push('¡Nueva arena: ' + ARENAS[arenaIndex()].name + '!');
    if (roadPending()) res.lines.push('Tienes premios en el camino de trofeos.');
  } else if (b.mode === 'reto') {
    var o = b.opts, rec = retoRecord(o);
    res.gold = 20 + b.wave * 8;
    res.gems = Math.floor(b.wave / 5);
    res.reto = { wave: b.wave };
    var better = b.wave > (rec.best || 0);
    rec.best = Math.max(rec.best || 0, b.wave);
    if (o.from) {
      res.won = b.wave > o.target;
      res.lines.push(res.won ? '¡Has superado a ' + o.from + '! Llegó a la oleada ' + o.target + '.' : o.from + ' sigue por delante: llegó a la oleada ' + o.target + '.');
      // la primera vez que ganas un reto, cofre de plata
      if (res.won && !rec.won) { rec.won = true; meta.stats.retosWon = (meta.stats.retosWon || 0) + 1; res.chest = 'plata'; }
    } else {
      res.won = b.wave >= 10;
      res.lines.push('Has llegado a la oleada ' + b.wave + '. Reta a un amigo a superarlo.');
    }
    if (better && rec.best > 1) res.lines.push('Tu mejor marca en este reto: oleada ' + rec.best + '.');
    won = res.won;
  } else if (b.mode === 'rogue') {
    res.gold = 20 + b.wave * 10;
    res.gems = Math.floor(b.wave / 5) + (won ? 5 : 0);
    res.chest = won ? 'oro' : b.wave >= 20 ? 'plata' : b.wave >= 10 ? 'madera' : null;
    if (b.wave > (meta.rogueBest || 0)) { meta.rogueBest = b.wave; res.lines.push('¡Nuevo récord!'); }
    if (b.asc) { res.gold = Math.round(res.gold * (1 + 0.1 * b.asc)); res.lines.push('Ascensión ' + b.asc + '.'); }
    if (won && b.asc >= (meta.rogueAsc || 0) && (meta.rogueAsc || 0) < ROGUE_ASC_MAX) { meta.rogueAsc = b.asc + 1; meta.rogueAscSel = meta.rogueAsc; res.lines.push('¡Ascensión ' + meta.rogueAsc + ' abierta!'); }
    res.lines.push(won ? '¡Has vencido a ' + BOSSES[b.boss].name + ' en la oleada final!' : 'Caíste en la oleada ' + b.wave + ' de ' + b.maxWaves + '.');
    res.lines.push((b.player.skills.length + b.player.rogueMods.length) + ' ventajas reunidas.');
  } else {
    res.gold = 20 + b.wave * 12;
    res.gems = Math.floor(b.wave / 5);
    res.chest = b.wave >= 20 ? 'oro' : b.wave >= 10 ? 'plata' : 'madera';
    if (b.wave > meta.coopBest) { meta.coopBest = b.wave; res.lines.push('¡Nuevo récord!'); }
    res.lines.push('Aguantasteis hasta la oleada ' + b.wave + '.');
    won = true;
    res.won = b.wave >= 10;
  }
  // ganar cualquier batalla siempre da algo de oro y gemas, aunque sea poco
  if (res.won) { res.gold = Math.max(res.gold, 30); res.gems = Math.max(res.gems, 1); }
  // fin de semana: oro doble
  if (isWeekend() && res.gold > 0) { res.gold *= 2; res.weekend = true; }
  // evento de la semana: cuenta las victorias
  if (res.won && !b.tutorial) weekState().wins++;
  // puntos de temporada
  var lv0 = seasonLevel();
  res.xp = seasonXp(b, res);
  addSeasonXp(res.xp);
  if (seasonLevel() > lv0) res.seasonUp = seasonLevel();
  // misiones diarias
  var p = b.player;
  missionAdd('summon', p.summons); missionAdd('merge', p.merges); missionAdd('kills', p.kills);
  missionAdd('boss', p.bossKills); missionAdd('cmd', p.cmds); missionAdd('power', p.powers); missionAdd('rank', p.maxRank);
  if (res.won) missionAdd('win', 1);
  if (b.mode === 'duel' && res.won) missionAdd('duel', 1);
  if (b.mode === 'campaign' && res.won && res.stars === 3) missionAdd('stars', 1);
  if (b.mode === 'coop') missionAdd('coop', b.wave);
  addGameStats(p, res.won, b.time);
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
  res.near = nearMisses(b, res);
  b.result = res;
  sfx(res.won ? 'win' : res.draw ? 'wave' : 'lose');
  setTimeout(function () { showResult(res); }, 900);
}

// puntos de temporada de una partida: por jugar, por la oleada y por ganar
function seasonXp(b, res) {
  var xp = 10 + Math.min(50, b.wave * 2) + (res.won ? 15 : 0);
  if (b.mode === 'campaign' && res.won) xp += res.stars * 5;
  return xp;
}
/* Lo que se quedó cerca: se enseña en el resultado para que apetezca otra. */
function nearMisses(b, res) {
  var out = [];
  if (b.mode === 'campaign' && res.won && res.stars < 3) { var miss = 5 - b.player.lives.v; out.push((miss === 1 ? 'Te faltó 1 vida' : 'Te faltaron ' + miss + ' vidas') + ' para las 3 estrellas'); }
  if (b.mode === 'duel' && !b.opts.tourney) {
    var ai = arenaIndex(), nx = ARENAS[ai + 1];
    if (nx && nx.at - meta.trophies <= 120) out.push('A ' + (nx.at - meta.trophies) + ' trofeos de ' + nx.name);
  }
  var ms = dailyMissions().list.filter(function (m) { return !m.got && m.prog < m.goal && m.prog / m.goal >= 0.6; })[0];
  if (ms) out.push('Misión: ' + missionText(ms.k, ms.goal) + ' · ' + ms.prog + '/' + ms.goal);
  var ach = ACHIEVEMENTS.filter(function (a) { return !achClaimed(a) && a.get() < a.goal && a.get() / a.goal >= 0.8; })[0];
  if (ach) out.push('Logro: ' + ach.name + ' · ' + fmtNum(ach.get()) + '/' + fmtNum(ach.goal));
  var ws = weekState();
  if (!ws.got && ws.wins < WEEK_GOAL && ws.wins >= WEEK_GOAL - 2) out.push(weekEvent().name + ': ' + ws.wins + '/' + WEEK_GOAL + ' victorias');
  return out.slice(0, 3);
}

/* ---------- disposición ---------- */
var layout = { main: null, other: null };
var WAVE_INFO_H = 52;
function resizeCanvas() {
  if (!canvas) return;
  var wrap = canvas.parentNode;
  var w = wrap.clientWidth, h = wrap.clientHeight;
  dpr = Math.min(meta.settings.saver ? 1.25 : 2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  var pad = 8;
  var gm = battle ? battle.player.geo : VECTOR_GEO;
  if (battle && battle.mode === 'coop') {
    // co-op: un solo tablero y, encima, la cuadrícula del aliado (de y0 del
    // aliado hacia abajo, todo en las mismas coordenadas); arriba, su cabecera
    var yTop = battle.other.geo.y0 - COOP_PANEL_PAD, wh = gm.H - yTop, top = RIVAL_HEAD_H + 6;
    var sc = Math.min(w / gm.W, (h - top - pad) / wh);
    layout.main = { sc: sc, ox: (w - gm.W * sc) / 2, oy: top - yTop * sc + Math.max(0, (h - top - pad - wh * sc) / 2), g: gm };
    layout.other = { sc: sc, ox: layout.main.ox, oy: layout.main.oy, g: battle.other.geo, ally: true, headY: top };
  } else if (battle && battle.other) {
    var go = battle.other.geo;
    // arriba, la cabecera del rival o aliado (RIVAL_HEAD_H) y su tablero.
    // Tu tablero se queda con lo que necesita a todo el ancho y lo que sobra
    // es para el de arriba (entre el 35 y el 45 % del alto), así no quedan
    // franjas vacías ni arriba ni abajo
    var pw = go.image ? 0 : pad;
    var needMain = gm.H * (w - pw * 2) / gm.W + pad + 6;
    var topH = Math.max(h * 0.35, Math.min(h * 0.45, h - needMain));
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
  drawOutlinedText(ctx, b.name, tx, cy - 8, 13, '#ffffff');
  var lx = tx, ly = cy + 9, vi = art('ui/vida'), gi = art('icons/gota');
  if (battle.mode === 'duel' && vi) {
    for (var hi = 0; hi < b.lives.max; hi++) { ctx.globalAlpha = hi < b.lives.v ? 1 : 0.3; ctx.drawImage(vi, lx, ly - 6, 13, 12); lx += 12; }
    ctx.globalAlpha = 1; lx += 6;
  }
  if (gi) { ctx.drawImage(gi, lx, ly - 7, 14, 14); lx += 15; }
  var mt = String(Math.floor(b.mana));
  drawOutlinedText(ctx, mt, lx, ly, 12, '#8ff3ff');
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
  if (battle.mode === 'coop') {
    // tu tablero con el camino y, por encima, la cuadrícula del aliado
    drawBoard(battle.player, layout.main, now, true);
    drawBoard(battle.other, layout.other, now, false);
    drawRivalHeader(battle.other, { oy: layout.other.headY });
    drawAmbient(now);
    return;
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
  drawAmbient(now);
}
/* Decorado animado de cada bioma, por encima de todo y muy suave: hojas en
   el prado y el bosque, nieve en el hielo, brasas que suben (y el suelo que
   late) en el volcán y la cripta, burbujas y luciérnagas en el pantano y
   polvo en las ruinas y el desierto. Con el ahorro de batería no sale. */
var AMBIENT = { prado: 'hojas', bosque: 'hojas', hielo: 'nieve', volcan: 'brasas', cripta: 'brasas', pantano: 'burbujas', ruinas: 'polvo', desierto: 'polvo' };
var amb = { key: '', parts: [], last: 0 };
function ambPart(kind, w, h, anywhere) {
  var p = { x: Math.random() * w, y: anywhere ? Math.random() * h : 0, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.3, t: Math.random() };
  if (kind === 'nieve' || kind === 'hojas') { if (!anywhere) p.y = -10; p.vy = (kind === 'nieve' ? 22 : 16) + Math.random() * 22; }
  else if (kind === 'brasas' || kind === 'burbujas') { if (!anywhere) p.y = h + 10; p.vy = -(14 + Math.random() * 30); }
  else { p.vx = 8 + Math.random() * 18; p.vy = (Math.random() - 0.5) * 4; if (!anywhere) p.x = -10; }
  return p;
}
function drawAmbient(now) {
  var kind = AMBIENT[battle.player.biome] || 'polvo', n = meta.settings.saver ? 0 : kind === 'polvo' ? 22 : 26;
  var w = layout.w, h = layout.h, key = kind + w + 'x' + h;
  var dt = amb.last ? Math.min(0.05, (now - amb.last) / 1000) : 0;
  amb.last = now;
  if (battle.paused || battle.ended) dt = 0;
  if (!n) return;
  if (amb.key !== key) { amb.key = key; amb.parts = []; for (var i = 0; i < n; i++) amb.parts.push(ambPart(kind, w, h, true)); }
  ctx.save();
  if (kind === 'brasas') {
    // el suelo del volcán late con luz naranja
    var lg = ctx.createLinearGradient(0, h, 0, h * 0.55);
    lg.addColorStop(0, 'rgba(255,100,30,' + (0.13 + 0.07 * Math.sin(now / 700)) + ')'); lg.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, h * 0.55, w, h * 0.45);
  }
  amb.parts.forEach(function (p, k) {
    p.ph += dt * (kind === 'hojas' ? 2.2 : 1.4);
    var sway = Math.sin(p.ph) * (kind === 'hojas' ? 26 : kind === 'nieve' ? 14 : 6);
    p.y += p.vy * dt; p.x += (p.vx || 0) * dt + sway * dt;
    if (p.y > h + 12 || p.y < -14 || p.x > w + 12 || p.x < -14) amb.parts[k] = ambPart(kind, w, h, false);
    var x = p.x, y = p.y, s = p.s;
    if (kind === 'nieve') {
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffffff'; circle(ctx, x, y, 1.3 + s * 1.6); ctx.fill();
    } else if (kind === 'hojas') {
      ctx.globalAlpha = 0.8; ctx.save(); ctx.translate(x, y); ctx.rotate(p.ph);
      ctx.fillStyle = k % 3 ? '#7fcf4a' : '#f2c14a';
      ctx.beginPath(); ctx.ellipse(0, 0, 4 * s + 1.5, 2 * s + 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (kind === 'brasas') {
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(p.ph * 3);
      glow(ctx, x, y, 5 * s + 2, '#ff7a1a', 0.7); ctx.fillStyle = '#ffd38a'; circle(ctx, x, y, 0.8 + s); ctx.fill();
    } else if (kind === 'burbujas') {
      if (k % 3) { ctx.globalAlpha = 0.45; ctx.strokeStyle = '#c8f59a'; ctx.lineWidth = 1.2; circle(ctx, x, y, 1.5 + s * 2.5); ctx.stroke(); }
      else { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(p.ph * 2); glow(ctx, x, y, 7, '#e8ff7a', 0.8); }
    } else {
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#f3e2b8'; circle(ctx, x, y, 0.8 + s * 1.2); ctx.fill();
    }
  });
  ctx.restore();
}
/* Fondo de los tableros «over»: su propia zona de juego muy desenfocada
   (reducida a 40 px y ampliada) y oscurecida, a pantalla completa, para
   que cualquier forma de pantalla quede rellena con sus colores. */
var _backdrop = {};
function drawBackdrop(pic, F) {
  // tablero sin fondo propio: alrededor, su suelo (F.ground) repetido
  var gp = F.ground && art(F.ground);
  if (gp) {
    var gk = 'ground:' + F.ground, pat = _backdrop[gk];
    if (!pat) pat = _backdrop[gk] = ctx.createPattern(gp, 'repeat');
    var gs = Math.max(0.6, layout.w / 700);
    ctx.save(); ctx.scale(gs, gs); ctx.fillStyle = pat; ctx.fillRect(0, 0, layout.w / gs, layout.h / gs); ctx.restore();
    ctx.fillStyle = 'rgba(20,40,10,0.18)'; ctx.fillRect(0, 0, layout.w, layout.h);
    return;
  }
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
  var ally = !!L.ally; // co-op: solo la cuadrícula del aliado, sin tablero ni camino
  var pic = G.image && !ally ? art(G.image) : null;
  var dual = !!battle.other && battle.mode !== 'coop';
  // con dos tableros, los dos tableros «over» se pintan enteros hasta los
  // lados de la pantalla: el tuyo por debajo del separador y el del rival o
  // aliado por encima, así su marco llena la franja de arriba en vez de
  // quedar un hueco a los lados
  var wide = pic && G.px.over;
  if (pic && dual) {
    ctx.beginPath();
    var Lo = layout.other, sepY = Lo.oy + Lo.g.H * Lo.sc + 4;
    if (wide && b === battle.player) ctx.rect(-L.ox / sc, (sepY - L.oy) / sc, layout.w / sc, (layout.h - sepY) / sc);
    else if (wide) ctx.rect(-L.ox / sc, -L.oy / sc, layout.w / sc, sepY / sc);
    else ctx.rect(0, 0, G.W, G.H);
    ctx.clip();
  }
  if (ally) {
    drawAllyPanel(b, G, now);
  } else if (pic) {
    // tablero ilustrado (recortado sin la interfaz de las esquinas)
    var F = G.px, kx = pic.naturalWidth / F.iw, ky = pic.naturalHeight / F.ih;
    if (wide) {
      // ilustración entera con la zona de juego en su sitio: el marco asoma
      // por arriba, abajo y los lados hasta donde llegue la pantalla
      var upx = F.cw / G.W; // píxeles de la imagen por unidad
      if (F.road) drawRoad(F, upx);
      // co-op: los bordes de arriba y abajo se funden con el fondo (encima va la cuadrícula del aliado)
      ctx.drawImage(battle.mode === 'coop' ? fadedTop(pic, F) : pic, -F.cx / upx, -F.cy / upx, F.iw / upx, F.ih / upx);
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
    // las 15 losas siempre; después, las casillas especiales como emblema
    // encima (así la fila de abajo no les tapa el borde)
    for (var ti = 0; ti < COLS * ROWS; ti++) drawStoneTile(b, ti, b.cc(ti), G);
    for (ti = 0; ti < COLS * ROWS; ti++) if (b.tiles[ti]) drawTileFloor(b.tiles[ti], b.cc(ti), G, ti, now, b);
    drawPathSigns(G);
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
    if (b.tiles[i]) drawTileFloor(b.tiles[i], c, b.geo, i, now, b);
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
    var r = 0.42 * Math.min(G.cw, G.ch) * (1 + u.anim * 0.25), uy = cc2.y - 0.02 - unitLift(b, i, G);
    // al invocar cae y rebota; al fusionar se estira (desde los pies)
    var pose = summonPose(u.drop) || mergePose(u.pop);
    // aro de notas bajo las tropas que acelera Melodía (assets/fx/acelerar)
    var acel = art('fx/acelerar');
    if (acel && UNITS[u.id].dmg && neighbors(i).some(function (j) { var v = b.cells[j]; return v && UNITS[v.id].buff && UNITS[v.id].buff.speed && !(v.frozen > 0); })) {
      var aw = G.cw * 0.95, ah = aw * acel.naturalHeight / acel.naturalWidth;
      ctx.save(); ctx.globalAlpha *= 0.5 + 0.15 * Math.sin(now / 260 + i);
      ctx.drawImage(acel, cc2.x - aw / 2, uy + r * 0.9 - ah * 0.6, aw, ah);
      ctx.restore();
    }
    if (pose) {
      var footY = uy + r * 0.9;
      ctx.save();
      ctx.globalAlpha *= pose.a;
      ctx.translate(cc2.x, footY + pose.dy); ctx.scale(pose.sx, pose.sy); ctx.translate(-cc2.x, -footY);
    }
    drawUnit(ctx, u.id, cc2.x, uy, r, u.rank, now, { frozen: u.frozen > 0, board: true, atk: u.atk, aim: u.aim, recoil: u.recoil || 0, flash: pose ? pose.flash : 0 });
    if (pose) ctx.restore();
    // (sin icono de la casilla especial encima: la losa entera y su borde ya se ven alrededor)
    ctx.globalAlpha = 1;
  }

  // Maldición de Nyx: anillo de runas a los pies de cada monstruo mientras dure
  // (en co-op, también si la echa el aliado)
  var curseT = Math.max(b.curseT, b.partner ? b.partner.curseT : 0);
  if (!ally && curseT > 0 && art('fx/nyx-maldicion')) {
    ctx.globalAlpha = Math.min(1, curseT / 0.5) * 0.9;
    b.enemies.forEach(function (e) {
      var es = e.boss ? 0.42 : ENEMIES[e.kind].size;
      drawFxPic(ctx, 'fx/nyx-maldicion', e.x, e.y + es * 0.55, es * 2.4, 0);
    });
    ctx.globalAlpha = 1;
  }
  // monstruos (los de más atrás primero)
  var ens = ally ? [] : b.enemies.slice().sort(function (p, q) { return p.y - q.y; });
  ens.forEach(function (e) {
    var d = e.boss ? BOSSES[e.kind] : ENEMIES[e.kind];
    // en el tablero dibujado salen del portal: aparecen creciendo
    // (en los tableros con portal, además, se van encogiendo al final del camino)
    var grow = G.image && !G.px.portal ? 1 : Math.min(1, 0.25 + e.d / 0.5);
    if (G.image && G.px.portal) grow = Math.min(grow, 0.25 + (G.len - e.d) / 0.5);
    if (grow < 1) ctx.globalAlpha = grow;
    drawEnemy(ctx, e, (e.boss ? 0.42 : d.size) * (G.image ? 0.82 * (G.px.mobScale || 1) : 1) * grow, now);
    ctx.globalAlpha = 1;
  });
  // Escudo divino de Sol: esfera de luz tapando la salida mientras dure
  var guardT = Math.max(b.guardT, b.partner ? b.partner.guardT : 0);
  if (!ally && guardT > 0 && art('fx/sol-escudo')) {
    var gp = b.pos(G.len - 0.35);
    ctx.globalAlpha = Math.min(1, guardT / 0.5) * (0.8 + 0.15 * Math.sin(now / 160));
    drawFxPic(ctx, 'fx/sol-escudo', gp.x, gp.y, 1.25 + 0.05 * Math.sin(now / 220), 0);
    ctx.globalAlpha = 1;
  }
  // lobos de Garra
  b.wolves.forEach(function (w) { drawWolf(ctx, w); });
  // proyectiles
  b.shots.forEach(function (s) { drawShot(s, now); });
  // efectos
  b.fx.forEach(function (f) {
    var t = 1 - f.life / f.max;
    if (f.type === 'bolt') {
      // rayo ilustrado estirado entre los dos puntos (se voltea al azar para
      // que chisporrotee) y un trazo quebrado encima
      // (el propio de la tropa, si tiene: boltPic)
      var cad = (f.pic && art(f.pic)) || art('fx/rayo-cadena'), bim = cad || art('fx/rayo-bola');
      ctx.globalAlpha = f.life / f.max;
      if (bim) {
        var bl = Math.hypot(f.x2 - f.x1, f.y2 - f.y1), bh = cad ? Math.min(0.55, bl * bim.naturalHeight / bim.naturalWidth * 1.4) : 0.42;
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
    } else if (f.type === 'rise') {
      // Forja de Torvald: las flechas suben desde la tropa y se desvanecen
      ctx.globalAlpha = t < 0.6 ? 1 : (1 - t) / 0.4;
      drawFxPic(ctx, f.key, f.x, f.y - 0.1 - t * 0.45, f.size * (0.7 + 0.3 * Math.min(1, t * 4)), 0);
      ctx.globalAlpha = 1;
    } else if (f.type === 'sweep') {
      // habilidad de Aria o Merlo: la ola cruza el tablero y se apaga al final
      // como mucho 2,2 casillas de lado: los dibujos casi cuadrados (ventisca, marea) no tapan el tablero
      var sw = Math.min(G.W * 0.8, 2.2);
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
  (ally ? [] : b.enemies).forEach(function (e) {
    if (dual && pic && e.y > G.H + 0.1) return; // aún fuera del mapa
    var p = toS(e.x, e.y - (e.boss ? 0.92 : ENEMIES[e.kind].size + 0.16));
    // el número da un saltito al recibir un golpe
    var fs = Math.max(9, sc * (e.boss ? 0.3 : 0.22)) * (1 + 0.3 * (e.hitT > 0 ? e.hitT / HIT_TIME : 0));
    // daño que lleva encima: amarillo, naranja o rojo según cuánta vida ha perdido
    var lost = Math.min(e.maxHp, e.maxHp - Math.max(0, e.hp)), tw = 0;
    if (meta.settings.dmgNums && lost >= 1) {
      var lf = lost / e.maxHp, txt = fmtNum(Math.floor(lost));
      drawOutlinedText(ctx, txt, p.x, p.y, fs, lf < 0.34 ? '#ffe14d' : lf < 0.67 ? '#ff9a2e' : '#ff3b3b');
      tw = ctx.measureText(txt).width;
    }
    // a la izquierda del número: placa de armadura y escudo de vida
    var ix = p.x - tw / 2 - fs * 0.15, is = Math.max(10, fs * 1.05);
    [[e.armor > 0, 'fx/icono-armadura'], [e.barrier > 0, 'fx/icono-barrera']].forEach(function (q) {
      var im = q[0] && art(q[1]);
      if (!im) return;
      var iw = is * im.naturalWidth / im.naturalHeight;
      ctx.drawImage(im, ix - iw, p.y - is / 2, iw, is); ix -= iw + 1;
    });
  });
  if (isMain || sc > 30) {
    b.texts.forEach(function (t) {
      if (t.dmg && !meta.settings.dmgNums) return;
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
  if (!isMain && !ally) drawRivalHeader(b, L);
}

/* Aura de cada tropa en su casilla (assets/cells/<id>), debajo de todas las
   fichas para que ninguna tape a una vecina.
    - las de posición y apoyo solo salen cuando cumplen su condición:
      Nívea con otra Nívea al lado (un aura doble entre las dos), Mirra y
      Cronos con vecinas distintas, Halcón en el borde, Melodía con tropas
      que atacan alrededor; Doblón, al dar maná.
    - el resto, suave siempre y se enciende al disparar.
   Las de remolino giran despacio; las altas (Doblón, Ulric) se apoyan en los pies. */
/* Afinidad (+AFFINITY_BONUS por vecina del mismo elemento): una cadena de
   runas del elemento (assets/fx/conector-<elemento>, de assets/conectores.jpg)
   entre las dos casillas, a ras de suelo, que late, con una chispa que la
   recorre; sin la imagen, un lazo de luz de su color. Así se ve qué tropas
   se están potenciando. */
function drawAffinityLinks(b, s, now) {
  ctx.save();
  ctx.lineCap = 'round';
  for (var i = 0; i < b.cells.length; i++) {
    var u = b.cells[i];
    if (!u || u.drop > SUMMON_LAND) continue;
    var el = UNITS[u.id].element;
    neighbors(i).forEach(function (j) {
      var v = b.cells[j];
      if (j < i || !v || v.drop > SUMMON_LAND || UNITS[v.id].element !== el) return;
      var a = b.cc(i), c = b.cc(j), col = ELEMENTS[el].color, fy = s * 0.3;
      var pulse = 0.5 + 0.5 * Math.sin(now / 350 + i + j);
      var rune = art('fx/conector-' + el);
      if (rune) {
        // ancho de casilla a casilla y alto de media casilla: la cadena se ve entera entre las dos tropas
        var dx = c.x - a.x, dy = c.y - a.y, len = Math.hypot(dx, dy), rh = s * 0.5;
        ctx.save();
        ctx.translate((a.x + c.x) / 2, (a.y + c.y) / 2 + fy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.globalAlpha = 0.85 + pulse * 0.15;
        ctx.drawImage(rune, -len * 0.62, -rh / 2, len * 1.24, rh);
        ctx.restore();
        var tr = 0.5 + 0.5 * Math.sin(now / 600 + i);
        glow(ctx, a.x + dx * tr, a.y + fy + dy * tr, s * 0.1, col, 0.8);
        return;
      }
      ctx.globalAlpha = 0.35 + pulse * 0.25; ctx.strokeStyle = col; ctx.lineWidth = s * 0.11;
      ctx.beginPath(); ctx.moveTo(a.x, a.y + fy); ctx.lineTo(c.x, c.y + fy); ctx.stroke();
      ctx.globalAlpha = 0.55 + pulse * 0.3; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.03;
      ctx.beginPath(); ctx.moveTo(a.x, a.y + fy); ctx.lineTo(c.x, c.y + fy); ctx.stroke();
      // chispa que va y viene por el lazo
      var t = 0.5 + 0.5 * Math.sin(now / 600 + i);
      glow(ctx, a.x + (c.x - a.x) * t, a.y + fy + (c.y - a.y) * t, s * 0.12, col, 0.9);
    });
  }
  ctx.restore();
}
var AURA_SPIN = { lyra: 1, brasa: -1, rocco: 0.5, volta: 1.4, melodia: 0.4, sombra: -1.2, cronos: 0.35, fenix: 1, aurora: 1.3, boreas: -1 };
var AURA_TALL = { doblon: true, ulric: true };
function drawCellAuras(b, G, now) {
  var s = Math.min(G.cw, G.ch);
  drawAffinityLinks(b, s, now);
  for (var i = 0; i < b.cells.length; i++) {
    var u = b.cells[i];
    if (!u || u.drop > SUMMON_LAND) continue;
    var pic = art('cells/' + u.id), d = UNITS[u.id];
    if (!pic) continue;
    var c = b.cc(i), pulse = 0.5 + 0.5 * Math.sin(now / 420 + i), a, k = 1;
    c = { x: c.x, y: c.y - unitLift(b, i, G) };
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
    if (d.mixed || d.edge || d.lone) { if (!(b.posBonus(i) > 0)) continue; a = 0.7 + pulse * 0.25; }
    else if (d.buff) { if (!(b.placeScore(i) > 0)) continue; a = 0.65 + pulse * 0.25; }
    else if (d.manaGen || d.interest) { if (!(u.atk > 0)) continue; a = Math.min(1, u.atk / 0.25); k = 1.1 - 0.2 * (u.atk / 0.5); }
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
/* Casilla especial: su losa ilustrada (assets/tiles/<tipo>) ocupa el sitio
   de la del tablero, con un borde que late del color de la casilla. Sin
   ilustración, la losa de siempre teñida de ese color. */
function drawTileFloor(type, cc, G, i, now, b) {
  var pic = art('tiles/' + type), t = TILES[type];
  var s = Math.min(G.cw, G.ch), pulse = Math.sin(now / 500 + i);
  var fr = b && floorRect(b, i, cc, G);
  // con loseta, justo sobre la parte que se ve de ella (sin sus bordes
  // transparentes, para no meterse en las de al lado); si no, donde va la de piedra
  var r;
  if (allySlab(G, i)) r = { x: cc.x - G.cw * 0.42, y: cc.y - G.ch * 0.42, w: G.cw * 0.84, h: G.ch * 0.84 };
  else if (fr) {
    // si el juego de losetas dice dónde está su cara de arriba (face), solo ahí,
    // para que se siga viendo el canto de la loseta alrededor
    var face = G.field && FIELD_TILES[G.field] && FIELD_TILES[G.field].face;
    var bx = face ? { x0: face[0], y0: face[1], x1: face[2], y1: face[3] } : opaqueBox(fr.pic);
    r = { x: fr.x + bx.x0 * fr.w, y: fr.y + bx.y0 * fr.h, w: (bx.x1 - bx.x0) * fr.w, h: (bx.y1 - bx.y0) * fr.h };
  } else if (b && b.floor && b.floor[i] === 'none') {
    // casilla ya dibujada en el tablero: la losa especial la cubre entera
    // (justo encima de la dibujada si el tablero dice dónde está cada una)
    var sl = !G.ally && G.px && G.px.slabs;
    if (sl) {
      var F = G.px, cell = (F.gx1 - F.gx0) / COLS, sx = sl.xs[i % COLS], sy = sl.ys[Math.floor(i / COLS)];
      r = { x: (sx[0] - F.cx) / cell, y: (sy[0] - F.cy) / cell, w: (sx[1] - sx[0]) / cell, h: (sy[1] - sy[0]) / cell };
    } else r = { x: cc.x - G.cw * 0.46, y: cc.y - G.ch * 0.46, w: G.cw * 0.92, h: G.ch * 0.92 };
  } else r = { x: cc.x - s * 0.485, y: cc.y - s * 0.485, w: s * 0.97, h: s * 0.97 };
  if (pic) {
    glow(ctx, r.x + r.w / 2, r.y + r.h / 2, s * 0.55, t.color, 0.22 + pulse * 0.1);
    ctx.drawImage(pic, r.x, r.y, r.w, r.h);
  }
  rrect(ctx, r.x + 0.03, r.y + 0.03, r.w - 0.06, r.h - 0.06, 0.1);
  if (!pic) { ctx.fillStyle = alpha(t.color, 0.18 + pulse * 0.06); ctx.fill(); }
  ctx.strokeStyle = alpha(t.color, 0.6 + pulse * 0.25); ctx.lineWidth = 0.04; ctx.stroke();
}
// parte opaca de una imagen, en fracciones de su ancho y alto (se mide una vez)
function opaqueBox(pic) {
  if (pic._box) return pic._box;
  var box = { x0: 0, y0: 0, x1: 1, y1: 1 };
  try {
    var w = pic.naturalWidth, h = pic.naturalHeight, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var c = cv.getContext('2d'); c.drawImage(pic, 0, 0);
    var d = c.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 >= 0) box = { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
  } catch (e) {}
  pic._box = box;
  return box;
}
/* Co-op: la cuadrícula del aliado, encima del camino de tu tablero, sobre
   una placa oscura con borde dorado (sin tablero propio ni camino). */
var COOP_GAP = 0.25, COOP_PANEL_PAD = 0.22;
function drawAllyPanel(b, G, now) {
  var x = G.x0 - COOP_PANEL_PAD, y = G.y0 - COOP_PANEL_PAD, w = COLS * G.cw + COOP_PANEL_PAD * 2, h = ROWS * G.ch + COOP_PANEL_PAD * 2 + 0.12;
  ctx.fillStyle = 'rgba(8,12,40,0.55)'; rrect(ctx, x, y, w, h, 0.25); ctx.fill();
  ctx.strokeStyle = 'rgba(245,196,0,0.6)'; ctx.lineWidth = 0.04; ctx.stroke();
  for (var i = 0; i < COLS * ROWS; i++) drawStoneTile(b, i, b.cc(i), G);
  for (i = 0; i < COLS * ROWS; i++) if (b.tiles[i]) drawTileFloor(b.tiles[i], b.cc(i), G, i, now, b);
}
/* Carteles de entrada y salida de los monstruos (assets/ui/cartel-*,
   de assets/set-salida-entrada-monstruos.jpg), plantados junto a la boca
   del camino: la entrada a su izquierda y la salida a su derecha, a F.signOff
   de la boca; F.signs (píxeles de la ilustración, pie de cada cartel) los
   coloca a mano. */
var SIGN_W = 1.15;
/* Camino que sigue por fuera del tablero bajo cada puerta (F.road), con la
   tira de tierra y césped de assets/boards/camino repetida hacia abajo. */
function drawRoad(F, upx) {
  var pic = art('boards/camino');
  if (!pic) return;
  var r = F.road, w = r.w / upx * pic.naturalWidth / (pic.naturalWidth * 0.4), h = w * pic.naturalHeight / pic.naturalWidth;
  r.xs.forEach(function (px) {
    var x = (px - F.cx) / upx - w / 2;
    for (var y = (r.y - F.cy) / upx; y < (r.y - F.cy) / upx + 12; y += h * 0.98) ctx.drawImage(pic, x, y, w, h);
  });
}
/* Portales de entrada y salida (assets/ui/portal-*) en las dos puertas de los
   tableros con gates; los que traen los suyos (ownGates) no llevan nada. */
var PORTAL_W = 1.5;
function drawPathSigns(G) {
  var w = G.way, F = G.px, upx = F.cw / G.W;
  if (F.ownGates) return;
  if (F.gates) {
    [['entrada', w[0]], ['salida', w[w.length - 1]]].forEach(function (p) {
      var pic = art('ui/portal-' + p[0]);
      if (!pic) return;
      var pw = F.portalW || PORTAL_W, h = pw * pic.naturalHeight / pic.naturalWidth;
      ctx.drawImage(pic, p[1].x - pw / 2, p[1].y + 0.45 - h, pw, h);
    });
    return;
  }
  var at = F.signs ? F.signs.map(function (q) { return { x: (q[0] - F.cx) / upx, y: (q[1] - F.cy) / upx }; })
    : [{ x: w[0].x - (F.signOff || 0.7), y: Math.min(w[0].y, G.H - 0.05) }, { x: w[w.length - 1].x + (F.signOff || 0.7), y: Math.min(w[w.length - 1].y, G.H - 0.05) }];
  ['entrada', 'salida'].forEach(function (k, i) {
    var pic = art('ui/cartel-' + k);
    if (!pic) return;
    var h = SIGN_W * pic.naturalHeight / pic.naturalWidth;
    ctx.drawImage(pic, at[i].x - SIGN_W / 2, at[i].y - h, SIGN_W, h);
  });
}
/* Losa de cada casilla: la del juego de su tablero (b.floor, al azar en
   cada partida); se ve de frente, con su canto abajo. Sin ella, la lisa. */
// con loseta de canto, la tropa sube un poco para pisar su cara de arriba
// (si no, los pies le quedan en el borde de abajo)
var FLOOR_LIFT = 0.16;
// en los tableros con las casillas dibujadas (ownTiles), un poco menos: sin canto
var OWN_TILE_LIFT = 0.1;
function unitLift(b, i, G) {
  if (b.floor && b.floor[i] === 'none') return G.ch * OWN_TILE_LIFT;
  return b.floor && b.floor[i] !== STONE_TILE && art('tiles/' + b.floor[i]) ? G.ch * FLOOR_LIFT : 0;
}
// dónde se pinta la loseta de una casilla (null si es la lisa o no ha cargado)
function floorRect(b, i, cc, G) {
  var pic = b.floor && b.floor[i] !== STONE_TILE && b.floor[i] !== 'none' && art('tiles/' + b.floor[i]);
  if (!pic) return null;
  var w = G.cw * 1.02, h = Math.min(w * pic.naturalHeight / pic.naturalWidth, G.ch * 1.16);
  return { pic: pic, x: cc.x - w / 2, y: cc.y - G.ch / 2 - 0.02, w: w, h: h };
}
// la ilustración con sus franjas de arriba y abajo desvaneciéndose (se hace una vez)
function fadedTop(pic, F) {
  if (pic._fade) return pic._fade;
  try {
    var w = pic.naturalWidth, h = pic.naturalHeight, cv = document.createElement('canvas'), c = cv.getContext('2d');
    cv.width = w; cv.height = h;
    c.drawImage(pic, 0, 0);
    var top = Math.max(80, F.cy * 1.1) / F.ih, bot = Math.max(60, F.ih - F.cy - F.ch) / F.ih, g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(Math.min(0.45, top), 'rgba(0,0,0,1)');
    g.addColorStop(Math.max(0.55, 1 - bot), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    pic._fade = cv;
  } catch (e) { pic._fade = pic; }
  return pic._fade;
}
// co-op: en los tableros con las losas dibujadas, el aliado lleva esas mismas
// losas (recortadas de la ilustración) en vez de la piedra lisa
function allySlab(G, i) {
  var sl = G.ally && G.px && G.px.slabs, pic = sl && art(G.image);
  if (!pic) return null;
  var F = G.px, kx = pic.naturalWidth / F.iw, ky = pic.naturalHeight / F.ih, sx = sl.xs[i % COLS], sy = sl.ys[Math.floor(i / COLS)];
  return { pic: pic, sx: sx[0] * kx, sy: sy[0] * ky, sw: (sx[1] - sx[0]) * kx, sh: (sy[1] - sy[0]) * ky };
}
function drawStoneTile(b, i, cc, G) {
  var as = allySlab(G, i);
  if (as) { ctx.drawImage(as.pic, as.sx, as.sy, as.sw, as.sh, cc.x - G.cw * 0.47, cc.y - G.ch * 0.47, G.cw * 0.94, G.ch * 0.94); return true; }
  // tableros con sus casillas ya dibujadas: nada encima
  if (b.floor && b.floor[i] === 'none') return false;
  var fr = floorRect(b, i, cc, G);
  if (fr) { ctx.drawImage(fr.pic, fr.x, fr.y, fr.w, fr.h); return true; }
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
  } else if (type === 'vortice') {
    // dos aros enlazados
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.13;
    circle(ctx, x - r * 0.2, y, r * 0.32); ctx.stroke(); circle(ctx, x + r * 0.2, y, r * 0.32); ctx.stroke();
  } else if (type === 'diana') {
    // punto de mira
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.12;
    circle(ctx, x, y, r * 0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.62, y); ctx.lineTo(x + r * 0.62, y); ctx.moveTo(x, y - r * 0.62); ctx.lineTo(x, y + r * 0.62); ctx.stroke();
    circle(ctx, x, y, r * 0.12); ctx.fill();
  } else if (type === 'semillero') {
    // ondas que se expanden desde una semilla
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.1;
    circle(ctx, x, y, r * 0.58); ctx.stroke(); circle(ctx, x, y, r * 0.36); ctx.stroke();
    circle(ctx, x, y, r * 0.15); ctx.fill();
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
  // si la tropa tiene proyectil propio (UNIT_SHOT), ese en vez del de su elemento
  var el = FX_OF[s.kind], uid = s.def && s.def.id;
  var own = uid && UNIT_SHOT[uid] && art('fx/' + uid + '-tiro') ? 'fx/' + uid + '-tiro' : null;
  if (el || own) {
    var key = own || 'fx/' + el + '-bola', rot;
    if (own ? !UNIT_SHOT_SPIN[uid] : FX_TURNS[key]) {
      var px = s.px != null ? s.px : s.sx, py = s.py != null ? s.py : s.sy;
      rot = (Math.abs(x - px) + Math.abs(y - py) > 0.001) ? Math.atan2(y - py, x - px) : Math.atan2(s.target.y - s.sy, s.target.x - s.sx);
    } else rot = !own && FX_STILL[key] ? 0 : now / (s.kind === 'bomb' ? 260 : 120);
    s.px = x; s.py = y;
    var size = own ? UNIT_SHOT[uid] : SHOT_SIZE[s.kind] || 0.32;
    if (!own && uid === 'titan') size *= 1.3;
    if (s.kind === 'fire') glow(ctx, x, y, 0.26, '#ff7a1a', 0.45);
    if (s.kind === 'holy') glow(ctx, x, y, 0.24, uid === 'seren' && own ? '#9fc8ff' : '#ffd34d', 0.5);
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
  if (battle.targeting) { battle.drag = null; battle.downCell = i; return; } // eligiendo tropas para el héroe
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
  if (battle.targeting) { heroTap(i); return; }
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
