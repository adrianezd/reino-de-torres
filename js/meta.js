'use strict';
/* =========================================================
   PROGRESO: oro, cartas, mazo, comandante, campaña y cofres
   ========================================================= */
var SAVE_KEY = 'reinoDeTorres_v1';

function defaultMeta() {
  var cards = {};
  STARTER_UNITS.forEach(function (id) { cards[id] = { lv: 1, n: 0 }; });
  return {
    gold: 150, gems: 30, trophies: 0,
    trophyBest: 0,                   // récord de trofeos (abre las paradas del camino)
    road: [],                        // paradas del camino de trofeos ya cobradas (su at)
    daily: null,                     // misiones del día: { day, list, bonus }
    shop: { day: '', bought: [], offers: null },   // ofertas de hoy y las ya compradas
    codes: [],                       // códigos ya canjeados
    cards: cards,
    deck: STARTER_UNITS.slice(),
    commander: 'aria',
    cmdCards: defaultCmdCards(),      // nivel y cartas de cada comandante
    cmdOwned: COMMANDER_ORDER.filter(function (k) { return !COMMANDERS[k].locked; }),   // comandantes conseguidos
    campaign: {},          // fase -> estrellas
    coopBest: 0,
    duelWins: 0, duelLosses: 0,
    tourneyWins: 0, tourneyLosses: 0,
    tourneyMode: 'clasico',  // forma de jugar el torneo (TOURNEY_MODES)
    rogueBest: 0,            // récord de oleadas del modo roguelike
    talents: {},             // tropa -> rama elegida en cada piso de su árbol (TALENTS)
    cmdTree: {},             // comandante -> ramas elegidas en cada piso de su árbol (CMD_TREE)
    freeChestAt: 0,         // cuándo está listo el siguiente cofre gratis (ms)
    slots: [null, null, null, null],   // cofres ganados: { type, unlockAt } (unlockAt: cuándo se abre; 0 si no se ha empezado)
    // vibra: vibración · saver: ahorro de batería · dmgNums: vida de los monstruos y golpes críticos en números
    settings: { sound: true, music: true, vibra: true, saver: false, dmgNums: true },
    seenTutorial: false,
    lastSeenVersion: '',  // última versión cuyas novedades se han visto (js/version.js)
    name: '',             // nombre de quien juega (perfil y retos con amigos)
    decks: null,          // mazos guardados: [{ deck, cmd }] (DECK_SLOTS); el activo es meta.deck
    deckSlot: 0,
    stats: {},            // totales de todas las partidas (ver addGameStats)
    seen: {},             // bestiario: monstruo o jefe ('B' + clave) -> veces derrotado (0: solo visto)
    achieved: [],         // logros cobrados
    pity: 0,              // cofres de oro seguidos sin mítica ni legendaria (PITY_GOLD)
    retos: [],            // retos de amigos recibidos: { code, from, wave, best, won }
    login: { last: '', streak: 0 },          // racha de días seguidos (LOGIN_REWARDS)
    season: { id: '', xp: 0, got: [] },      // temporada del mes: puntos y niveles cobrados
    week: { id: '', wins: 0, got: false },   // evento de la semana: victorias y premio
    rogueAsc: 0, rogueAscSel: 0,             // Ascensión del Roguelike: la más alta abierta y la elegida
    frames: ['basico'], titles: ['novato'], frame: 'basico', title: 'novato',   // cosméticos
    modesSeen: null       // modos ya abiertos (para celebrar los nuevos)
  };
}
function defaultCmdCards() {
  var o = {};
  COMMANDER_ORDER.forEach(function (k) { o[k] = { lv: 1, n: 0 }; });
  return o;
}
function loadMeta() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    return fixMeta(raw ? JSON.parse(raw) : {});
  } catch (e) { return fixMeta({}); }
}
// completa y sanea una partida guardada (también la de una copia de seguridad)
function fixMeta(saved) {
  var m = Object.assign(defaultMeta(), saved);
  m.settings = Object.assign(defaultMeta().settings, saved.settings || {});
  ['stats', 'seen'].forEach(function (k) { if (!m[k] || typeof m[k] !== 'object') m[k] = {}; });
  ['achieved', 'retos', 'frames', 'titles'].forEach(function (k) { if (!Array.isArray(m[k])) m[k] = []; });
  if (m.frames.indexOf('basico') === -1) m.frames.unshift('basico');
  if (m.titles.indexOf('novato') === -1) m.titles.unshift('novato');
  if (!FRAMES[m.frame] || m.frames.indexOf(m.frame) === -1) m.frame = 'basico';
  if (!TITLES[m.title] || m.titles.indexOf(m.title) === -1) m.title = 'novato';
  ['login', 'season', 'week'].forEach(function (k) { if (!m[k] || typeof m[k] !== 'object') m[k] = defaultMeta()[k]; });
  if (!Array.isArray(m.season.got)) m.season.got = [];
  // saneado básico
  m.deck = (m.deck || []).filter(function (id) { return UNITS[id] && m.cards[id]; });
  STARTER_UNITS.forEach(function (id) { if (!m.cards[id]) m.cards[id] = { lv: 1, n: 0 }; });
  while (m.deck.length < 5) {
    var extra = Object.keys(m.cards).find(function (id) { return m.deck.indexOf(id) === -1; });
    if (!extra) break;
    m.deck.push(extra);
  }
  if (!COMMANDERS[m.commander]) m.commander = 'aria';
  if (!Array.isArray(m.road)) m.road = [];
  m.trophyBest = Math.max(m.trophyBest || 0, m.trophies || 0);
  if (!m.cmdCards) m.cmdCards = {};
  COMMANDER_ORDER.forEach(function (k) { if (!m.cmdCards[k]) m.cmdCards[k] = { lv: 1, n: 0 }; });
  // partidas de antes de los comandantes bloqueados: se quedan los que ya
  // tenían cartas, subidos o elegidos
  if (!Array.isArray(m.cmdOwned)) m.cmdOwned = COMMANDER_ORDER.filter(function (k) {
    var c = m.cmdCards[k];
    return !COMMANDERS[k].locked || k === m.commander || c.lv > 1 || c.n > 0;
  });
  if (m.cmdOwned.indexOf(m.commander) === -1) m.commander = 'aria';
  var slots = Array.isArray(m.slots) ? m.slots : [];
  m.slots = [];
  for (var i = 0; i < CHEST_SLOTS; i++) m.slots.push(slots[i] && CHESTS[slots[i].type] ? slots[i] : null);
  // mazos guardados: el activo es meta.deck; los demás, saneados igual
  if (!Array.isArray(m.decks)) m.decks = [];
  for (var d = 0; d < DECK_SLOTS; d++) {
    var dk = m.decks[d];
    var ids = dk && Array.isArray(dk.deck) ? dk.deck.filter(function (id) { return UNITS[id] && m.cards[id]; }) : [];
    m.decks[d] = ids.length === 5 ? { deck: ids, cmd: m.cmdOwned.indexOf(dk.cmd) !== -1 ? dk.cmd : m.commander } : null;
  }
  m.deckSlot = Math.max(0, Math.min(DECK_SLOTS - 1, m.deckSlot | 0));
  m.decks[m.deckSlot] = { deck: m.deck.slice(), cmd: m.commander };
  return m;
}
var meta = loadMeta();
function saveMeta() {
  // el mazo activo también queda en su hueco de mazos guardados
  if (meta.decks) meta.decks[meta.deckSlot] = { deck: meta.deck.slice(), cmd: meta.commander };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (e) {}
}
// empieza de cero (solo se conservan los ajustes y el nombre)
function resetMeta() {
  var settings = meta.settings, name = meta.name;
  meta = fixMeta({});
  meta.settings = settings; meta.name = name;
  saveMeta();
}

/* ---------- copia de seguridad ----------
   Toda la partida en un código de texto (RT1: y el JSON en base64) que se
   puede copiar, guardar en un archivo y cargar en otro móvil. */
function exportSave() {
  saveMeta();
  var json = JSON.stringify(meta);
  return 'RT1:' + btoa(unescape(encodeURIComponent(json)));
}
// carga una copia; devuelve false si el código no vale
function importSave(code) {
  try {
    code = String(code || '').trim().replace(/\s+/g, '');
    if (code.indexOf('RT1:') !== 0) return false;
    var saved = JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
    if (!saved || typeof saved !== 'object' || !saved.cards || !Array.isArray(saved.deck)) return false;
    var m = fixMeta(saved);
    m.lastSeenVersion = meta.lastSeenVersion;
    meta = m;
    saveMeta();
    return true;
  } catch (e) { return false; }
}
// pide al navegador que no borre la partida aunque falte espacio o pase tiempo sin entrar
function askPersist() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}

/* ---------- retos con amigos ----------
   Un reto es una semilla con un mazo y un comandante (ver el modo reto en
   js/battle.js). Se pasan por enlace (?reto=...) con el nombre de quien reta
   y la oleada a la que llegó. meta.retos guarda los retos jugados o recibidos
   con tu mejor oleada en cada uno. */
function retoKey(o) { return o.seed + '|' + o.deck.join(',') + '|' + o.cmd; }
function retoRecord(o) {
  var k = retoKey(o), r = meta.retos.filter(function (x) { return x.key === k; })[0];
  if (!r) {
    r = { key: k, seed: o.seed, deck: o.deck.slice(), cmd: o.cmd, from: o.from || null, target: o.target || 0, best: 0, won: false, at: Date.now(), weekly: o.weekly || null };
    meta.retos.unshift(r);
    if (meta.retos.length > 20) meta.retos.length = 20;
  }
  return r;
}
// las opciones de partida de un reto guardado
function retoOpts(r) { return { seed: r.seed, deck: r.deck.slice(), cmd: r.cmd, from: r.from, target: r.target }; }
function newRetoOpts() { return { seed: Math.floor(Math.random() * 4294967296), deck: meta.deck.slice(), cmd: meta.commander }; }
function b64url(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64url(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
// código del enlace: tu nombre y tu oleada en ese reto
function encodeReto(o, wave) {
  return b64url(JSON.stringify({ s: o.seed, d: o.deck, c: o.cmd, n: (meta.name || 'Alguien').slice(0, 20), w: wave }));
}
function decodeReto(code) {
  try {
    var d = JSON.parse(unb64url(String(code)));
    if (!d || typeof d.s !== 'number' || !Array.isArray(d.d) || d.d.length !== 5 || !COMMANDERS[d.c]) return null;
    if (!d.d.every(function (id) { return UNITS[id]; })) return null;
    var w = Math.max(0, Math.min(999, Math.floor(+d.w || 0)));
    return { seed: d.s >>> 0, deck: d.d.slice(), cmd: d.c, from: String(d.n || 'Alguien').slice(0, 20), target: w };
  } catch (e) { return null; }
}
// guarda un reto que llega por enlace (si ya lo tenías, se queda tu mejor marca)
function receiveReto(o) {
  var r = retoRecord(o);
  r.from = o.from; r.target = o.target; r.won = r.best > r.target; r.at = Date.now();
  meta.retos.splice(meta.retos.indexOf(r), 1); meta.retos.unshift(r);
  saveMeta();
  return r;
}

/* ---------- ruleta de la tienda ---------- */
function wheelState() {
  if (!meta.wheel || meta.wheel.day !== dayKey(0)) meta.wheel = { day: dayKey(0), free: false, spins: 0 };
  return meta.wheel;
}
function wheelFreeReady() { return !wheelState().free; }
// tira la ruleta (gratis si toca; si no, por gemas): { index, gold, gems, chest, card, cmd } o null
function spinWheel() {
  var w = wheelState(), free = !w.free;
  if (!free && meta.gems < WHEEL_EXTRA_GEMS) return null;
  if (free) w.free = true; else meta.gems -= WHEEL_EXTRA_GEMS;
  w.spins++;
  var total = WHEEL_PRIZES.reduce(function (s, p) { return s + p.w; }, 0), r = Math.random() * total, i = 0;
  for (; i < WHEEL_PRIZES.length - 1; i++) { r -= WHEEL_PRIZES[i].w; if (r < 0) break; }
  var p = WHEEL_PRIZES[i], out = { index: i, free: free, gold: p.gold || 0, gems: p.gems || 0 };
  meta.gold += out.gold; meta.gems += out.gems;
  if (p.cards) {
    // una tropa de esa rareza; mejor una que puedas subir
    var pool = UNIT_ORDER.filter(function (id) { return UNITS[id].rarity === p.cards && !UNITS[id].chestOnly; });
    var useful = pool.filter(function (id) { return !meta.cards[id] || meta.cards[id].lv < CARD_MAX; });
    var id = pick(useful.length ? useful : pool);
    out.card = { id: id, n: p.n, fresh: !meta.cards[id] };
    if (meta.cards[id]) meta.cards[id].n += p.n; else meta.cards[id] = { lv: 1, n: p.n - 1 };
    out.surplus = takeSurplus();
  }
  if (p.cmd) {
    var k = pick(COMMANDER_ORDER), fresh = [];
    addCmdCards(k, p.cmd, fresh);
    out.cmd = { k: k, n: p.cmd, fresh: fresh.length > 0 };
    out.surplus = takeSurplus();
  }
  addSeasonXp(10);
  saveMeta();
  if (p.chest) out.chest = openChest(p.chest);
  return out;
}

/* ---------- cartas sobrantes ----------
   Con la tropa (o el comandante) al máximo, las cartas de más pasan a oro.
   Devuelve el oro ganado. */
function takeSurplus() {
  var gold = 0;
  Object.keys(meta.cards).forEach(function (id) {
    var c = meta.cards[id];
    if (c.lv >= CARD_MAX && c.n > 0 && UNITS[id]) { gold += c.n * SURPLUS_GOLD[UNITS[id].rarity]; c.n = 0; }
  });
  Object.keys(meta.cmdCards).forEach(function (k) {
    var c = meta.cmdCards[k];
    if (c.lv >= CMD_MAX && c.n > 0) { gold += c.n * SURPLUS_CMD_GOLD; c.n = 0; }
  });
  meta.gold += gold;
  return gold;
}

/* ---------- premios sueltos (racha y temporada) ---------- */
function giveReward(rw) {
  var out = { gold: rw.gold || 0, gems: rw.gems || 0 };
  meta.gold += out.gold; meta.gems += out.gems;
  if (rw.frame) { if (meta.frames.indexOf(rw.frame) === -1) { meta.frames.push(rw.frame); out.frame = rw.frame; } else { meta.gems += 30; out.gems += 30; } }
  if (rw.title) { if (meta.titles.indexOf(rw.title) === -1) { meta.titles.push(rw.title); out.title = rw.title; } else if (!rw.frame) { meta.gems += 30; out.gems += 30; } }
  saveMeta();
  if (rw.chest) out.chest = openChest(rw.chest);
  return out;
}

/* ---------- racha de días seguidos ---------- */
function dayKey(offset) { var d = new Date(); d.setDate(d.getDate() + (offset || 0)); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function loginReady() { return meta.login.last !== dayKey(0); }
// día de la racha que toca hoy (1 a 7)
function loginDay() {
  var l = meta.login, streak = l.last === dayKey(-1) || l.last === dayKey(0) ? l.streak : 0;
  return loginReady() ? streak % 7 + 1 : ((streak - 1) % 7) + 1;
}
function claimLogin() {
  if (!loginReady()) return null;
  var l = meta.login;
  l.streak = l.last === dayKey(-1) ? l.streak + 1 : 1;
  l.last = dayKey(0);
  var day = (l.streak - 1) % 7, r = giveReward(LOGIN_REWARDS[day]);
  r.day = day + 1;
  addSeasonXp(20);
  if (l.streak >= 30 && meta.titles.indexOf('racha') === -1) { meta.titles.push('racha'); r.title = 'racha'; }
  saveMeta();
  return r;
}

/* ---------- temporada del mes ---------- */
function seasonId() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); }
function seasonTheme() { var d = new Date(); return SEASON_THEMES[(d.getFullYear() * 12 + d.getMonth()) % SEASON_THEMES.length]; }
function seasonDaysLeft() { var d = new Date(), end = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.max(1, Math.ceil((end - d) / 864e5)); }
// la temporada se reinicia al cambiar de mes
function season() {
  if (meta.season.id !== seasonId()) meta.season = { id: seasonId(), xp: 0, got: [] };
  return meta.season;
}
function seasonLevel() { return Math.min(SEASON_LEVELS, Math.floor(season().xp / SEASON_XP)); }
function addSeasonXp(n) { if (n > 0) season().xp += Math.round(n); }
function seasonReady(lv) { return lv <= seasonLevel() && season().got.indexOf(lv) === -1; }
function seasonPending() { var n = 0; for (var lv = 1; lv <= seasonLevel(); lv++) if (seasonReady(lv)) n++; return n; }
function claimSeason(lv) {
  if (!seasonReady(lv)) return null;
  season().got.push(lv);
  return giveReward(seasonReward(lv, seasonTheme()));
}

/* ---------- evento de la semana ---------- */
// lunes de esta semana: su clave y su número (para rotar los eventos)
function weekInfo() {
  var d = new Date(), mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
  var n = Math.round((mon - new Date(2026, 0, 5)) / (7 * 864e5));
  return { id: mon.getFullYear() + '-' + (mon.getMonth() + 1) + '-' + mon.getDate(), n: n, end: new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7) };
}
function weekEvent() { var w = weekInfo(); return WEEK_EVENTS[((w.n % WEEK_EVENTS.length) + WEEK_EVENTS.length) % WEEK_EVENTS.length]; }
function weekState() {
  var w = weekInfo();
  if (meta.week.id !== w.id) meta.week = { id: w.id, wins: 0, got: false };
  return meta.week;
}
function weekReady() { var s = weekState(); return !s.got && s.wins >= WEEK_GOAL; }
function claimWeek() {
  if (!weekReady()) return null;
  meta.week.got = true;
  addSeasonXp(60);
  saveMeta();
  return openChest('oro');
}
function isWeekend() { var g = new Date().getDay(); return g === 0 || g === 6; }
// reto de la semana: la misma semilla, mazo y comandante para todo el mundo
function weeklyRetoOpts() {
  var w = weekInfo(), seed = 0;
  for (var i = 0; i < w.id.length; i++) seed = (seed * 31 + w.id.charCodeAt(i)) >>> 0;
  var k = ((w.n % TOURNEY_DECKS.length) + TOURNEY_DECKS.length) % TOURNEY_DECKS.length;
  return { seed: (seed * 2654435761) >>> 0, deck: TOURNEY_DECKS[k].deck.slice(), cmd: COMMANDER_ORDER[((w.n % 7) + 7) % 7], weekly: w.id };
}

/* ---------- modos que se abren con la campaña ---------- */
function stagesWon() { return Object.keys(meta.campaign).filter(function (k) { return meta.campaign[k] > 0; }).length; }
function modeUnlocked(k) {
  var need = MODE_UNLOCK[k];
  if (!need || stagesWon() >= need) return true;
  // si ya lo habías jugado antes, sigue abierto
  if (k === 'duelPick') return (meta.duelWins || 0) + (meta.duelLosses || 0) > 0 || (meta.trophies || 0) > 0;
  if (k === 'coop') return (meta.coopBest || 0) > 0;
  if (k === 'tourney') return (meta.tourneyWins || 0) + (meta.tourneyLosses || 0) > 0;
  if (k === 'rogue') return (meta.rogueBest || 0) > 0;
  return false;
}
// modos recién abiertos que aún no se han celebrado
function newModes() {
  var open = Object.keys(MODE_UNLOCK).filter(modeUnlocked);
  if (!Array.isArray(meta.modesSeen)) { meta.modesSeen = open; saveMeta(); return []; }
  var fresh = open.filter(function (k) { return meta.modesSeen.indexOf(k) === -1; });
  if (fresh.length) { meta.modesSeen = meta.modesSeen.concat(fresh); saveMeta(); }
  return fresh;
}

/* ---------- mazos guardados ---------- */
function switchDeck(i) {
  if (i === meta.deckSlot || i < 0 || i >= DECK_SLOTS) return;
  meta.decks[meta.deckSlot] = { deck: meta.deck.slice(), cmd: meta.commander };
  // un hueco vacío empieza como copia del mazo de ahora
  var d = meta.decks[i] || { deck: meta.deck.slice(), cmd: meta.commander };
  meta.deckSlot = i;
  meta.deck = d.deck.slice();
  if (cmdOwned(d.cmd)) meta.commander = d.cmd;
  saveMeta();
}

/* ---------- estadísticas, bestiario y logros ---------- */
// al terminar cada partida se suman las cifras de tu tablero
function addGameStats(p, won, time) {
  var s = meta.stats;
  var add = function (k, v) { s[k] = (s[k] || 0) + (v || 0); };
  add('games', 1); if (won) add('wins', 1);
  add('kills', p.kills); add('bossKills', p.bossKills); add('merges', p.merges); add('summons', p.summons);
  add('cmds', p.cmds); add('time', Math.round(time || 0));
  s.bestCombo = Math.max(s.bestCombo || 0, p.bestCombo || 0);
  s.maxRank = Math.max(s.maxRank || 0, p.maxRank || 0);
  if (!s.used) s.used = {};
  if (!s.dmg) s.dmg = {};
  Object.keys(p.summonedBy || {}).forEach(function (id) { s.used[id] = (s.used[id] || 0) + p.summonedBy[id]; });
  Object.keys(p.dmgBy || {}).forEach(function (id) { if (id !== 'cmd') s.dmg[id] = Math.round((s.dmg[id] || 0) + p.dmgBy[id]); });
}
function bestiaryKey(kind, boss) { return (boss ? 'B' : '') + kind; }
// visto (kill false) o derrotado (kill true)
function bestiaryAdd(kind, boss, kill) {
  var k = bestiaryKey(kind, boss);
  meta.seen[k] = (meta.seen[k] || 0) + (kill ? 1 : 0);
}
function bestiarySeen() {
  return Object.keys(ENEMIES).filter(function (k) { return meta.seen[k] != null; }).length +
    BOSS_ORDER.filter(function (k) { return meta.seen['B' + k] != null; }).length;
}
function achValue(a) { return Math.min(a.goal, a.get()); }
function achClaimed(a) { return meta.achieved.indexOf(a.id) !== -1; }
function achReady(a) { return !achClaimed(a) && a.get() >= a.goal; }
function achPending() { return ACHIEVEMENTS.filter(achReady).length; }
function claimAch(id) {
  var a = ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
  if (!a || !achReady(a)) return null;
  meta.achieved.push(a.id);
  if (a.title && meta.titles.indexOf(a.title) === -1) meta.titles.push(a.title);
  meta.gold += a.gold || 0;
  meta.gems += a.gems || 0;
  saveMeta();
  return a;
}

function isUnlocked(id) { return !!meta.cards[id]; }
function cardLevels() {
  var o = {};
  Object.keys(meta.cards).forEach(function (id) { o[id] = meta.cards[id].lv; });
  return o;
}
function canUpgradeCard(id) {
  var c = meta.cards[id];
  return c && c.lv < CARD_MAX && c.n >= cardsNeeded(c.lv) && meta.gold >= cardUpgradeGold(c.lv);
}
function upgradeCard(id) {
  if (!canUpgradeCard(id)) return false;
  var c = meta.cards[id];
  meta.gold -= cardUpgradeGold(c.lv);
  c.n -= cardsNeeded(c.lv);
  c.lv++;
  saveMeta();
  return true;
}

/* ---------- niveles de comandante ---------- */
function cmdOwned(k) { return meta.cmdOwned.indexOf(k) !== -1; }
// cartas de comandante de un cofre: la primera de uno que no tienes lo consigue
function addCmdCards(k, n, fresh) {
  if (!cmdOwned(k)) { meta.cmdOwned.push(k); n--; fresh.push(k); }
  meta.cmdCards[k].n += n;
}
function cmdLevel(k) { return meta.cmdCards[k] ? meta.cmdCards[k].lv : 1; }
function canUpgradeCmd(k) {
  var c = meta.cmdCards[k];
  return c && c.lv < CMD_MAX && c.n >= cmdCardsNeeded(c.lv) && meta.gold >= cmdUpgradeGold(c.lv);
}
function upgradeCmd(k) {
  if (!canUpgradeCmd(k)) return false;
  var c = meta.cmdCards[k];
  meta.gold -= cmdUpgradeGold(c.lv);
  c.n -= cmdCardsNeeded(c.lv);
  c.lv++;
  saveMeta();
  return true;
}

/* Cofre: oro + cartas de cualquier tropa según rareza, la tengas o no (la
   primera carta de una tropa nueva la desbloquea). Las legendarias solo salen
   en el cofre que tiene legend > 0 (el de oro), y las míticas, algo menos
   raras, en el que tiene myth > 0 (también el de oro). */
function openChest(type) {
  var ch = CHESTS[type];
  var gold = Math.round(ch.gold[0] + Math.random() * (ch.gold[1] - ch.gold[0]));
  var gems = Math.round(ch.gems[0] + Math.random() * (ch.gems[1] - ch.gems[0]));
  var byRarity = { comun: [], rara: [], epica: [], mitica: [], legendaria: [] };
  UNIT_ORDER.forEach(function (id) { byRarity[UNITS[id].rarity].push(id); });
  // pocas tropas distintas: de cada rareza solo pueden tocar unas cuantas
  if (ch.types) Object.keys(byRarity).forEach(function (r) { if (ch.types[r]) byRarity[r] = shuffleArr(byRarity[r].slice()).slice(0, ch.types[r]); });
  var got = {};
  // cofre legendario: una legendaria al azar
  if (ch.legendOnly) got[pick(byRarity.legendaria)] = 1;
  // cofre de comandante: todas las cartas, de un mismo comandante al azar
  else if (ch.cmd) {
    got[pick(COMMANDER_ORDER)] = ch.cards;
    var cmdFresh = [];
    Object.keys(got).forEach(function (k) { addCmdCards(k, got[k], cmdFresh); });
    meta.gold += gold;
    meta.gems += gems;
    missionAdd('chest', 1);
    var cs = takeSurplus();
    saveMeta();
    return { type: type, gold: gold, gems: gems, cards: {}, cmdCards: got, fresh: [], cmdFresh: cmdFresh, surplus: cs };
  }
  for (var i = 0; i < (ch.legendOnly ? 0 : ch.cards); i++) {
    var roll = Math.random() - (ch.myth || 0), pool;
    if (roll < 0) pool = byRarity.mitica;
    else if (roll < ch.legend) pool = byRarity.legendaria;
    else if (roll < ch.legend + ch.epic) pool = byRarity.epica;
    else if (roll < ch.legend + ch.epic + ch.rare) pool = byRarity.rara;
    else pool = byRarity.comun;
    var id = pool[Math.floor(Math.random() * pool.length)];
    got[id] = (got[id] || 0) + 1;
  }
  // garantía del cofre de oro: tras PITY_GOLD seguidos sin mítica ni
  // legendaria, una común se cambia por una mítica
  var pity = false;
  if (ch.myth > 0) {
    var top = Object.keys(got).some(function (k) { var r = UNITS[k].rarity; return r === 'mitica' || r === 'legendaria'; });
    if (top) meta.pity = 0;
    else if ((meta.pity || 0) + 1 >= PITY_GOLD && byRarity.mitica.length) {
      var low = Object.keys(got).filter(function (k) { return UNITS[k].rarity === 'comun'; })[0] || Object.keys(got)[0];
      if (--got[low] <= 0) delete got[low];
      var my = pick(byRarity.mitica);
      got[my] = (got[my] || 0) + 1;
      meta.pity = 0; pity = true;
    } else meta.pity = (meta.pity || 0) + 1;
  }
  // cartas de comandante (salen antes que las tropas, ver chestItems)
  var cmdGot = {}, cmdNew = [];
  if (ch.cmdChance && Math.random() < ch.cmdChance) {
    var ck = pick(COMMANDER_ORDER);
    cmdGot[ck] = ch.cmdCards;
    addCmdCards(ck, ch.cmdCards, cmdNew);
  }
  meta.gold += gold;
  meta.gems += gems;
  missionAdd('chest', 1);
  var fresh = [];
  Object.keys(got).forEach(function (id) {
    if (meta.cards[id]) { meta.cards[id].n += got[id]; return; }
    meta.cards[id] = { lv: 1, n: got[id] - 1 };
    fresh.push(id);
  });
  var surplus = takeSurplus();
  saveMeta();
  return { type: type, gold: gold, gems: gems, cards: got, cmdCards: cmdGot, fresh: fresh, cmdFresh: cmdNew, pity: pity, surplus: surplus };
}

/* ---------- huecos de cofre ----------
   Los cofres ganados en batalla se guardan aquí. Se desbloquean de uno en uno
   (tardan CHESTS[tipo].time) o se abren ya pagando gemas. */
function slotState(s) {
  if (!s) return 'empty';
  if (!s.unlockAt) return 'locked';
  return Date.now() >= s.unlockAt ? 'ready' : 'unlocking';
}
function slotLeft(s) { return s.unlockAt ? Math.max(0, (s.unlockAt - Date.now()) / 1000) : CHESTS[s.type].time; }
function slotUnlocking() { return meta.slots.some(function (s) { return slotState(s) === 'unlocking'; }); }
function skipCost(i) { return Math.max(1, Math.ceil(slotLeft(meta.slots[i]) / SKIP_SECONDS)); }
// guarda un cofre en el primer hueco libre; -1 si están todos llenos
function addChestSlot(type) {
  var i = meta.slots.indexOf(null);
  if (i === -1) return -1;
  meta.slots[i] = { type: type, unlockAt: 0 };
  saveMeta();
  return i;
}
function startUnlock(i) {
  var s = meta.slots[i];
  if (slotState(s) !== 'locked' || slotUnlocking()) return false;
  s.unlockAt = Date.now() + CHESTS[s.type].time * 1000;
  saveMeta();
  return true;
}
// abre el cofre del hueco si ya está listo, o pagando gemas (pay)
function openSlot(i, pay) {
  var s = meta.slots[i], st = slotState(s);
  if (st === 'empty') return null;
  if (st !== 'ready') {
    if (!pay || meta.gems < skipCost(i)) return null;
    meta.gems -= skipCost(i);
  }
  meta.slots[i] = null;
  return openChest(s.type);
}

function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
// cofre gratis: uno cada FREE_CHEST_EVERY segundos (meta.freeChestAt: cuándo está listo el siguiente)
var FREE_CHEST_EVERY = 3 * 3600;
function freeChestLeft() { return Math.max(0, ((meta.freeChestAt || 0) - Date.now()) / 1000); }
function freeChestReady() { return freeChestLeft() <= 0; }
function claimFreeChest() {
  if (!freeChestReady()) return null;
  meta.freeChestAt = Date.now() + FREE_CHEST_EVERY * 1000;
  return openChest('plata');
}
function totalStars() {
  return Object.keys(meta.campaign).reduce(function (s, k) { return s + meta.campaign[k]; }, 0);
}
function stageUnlocked(n) { return n === 1 || (meta.campaign[n - 1] || 0) > 0; }

/* ---------- tienda ---------- */
// Ofertas del día: se eligen la primera vez que se abre la tienda en el día
// (semilla = fecha) y se guardan, para que no cambien al desbloquear tropas.
// Cinco de cartas por oro y una de carta épica, mítica o legendaria por gemas.
// Pueden ser de tropas que aún no tienes (la primera carta la desbloquea),
// salvo las legendarias y míticas, que solo salen en el cofre de oro (en la
// tienda solo aparecen las que ya tienes).
function shopOffers() {
  var key = todayKey();
  if (meta.shop.day !== key) meta.shop = { day: key, bought: [], offers: null };
  if (!meta.shop.offers) { meta.shop.offers = makeShopOffers(key); saveMeta(); }
  else if (meta.shop.offers.length < 6) {
    // las de hoy se hicieron cuando había cuatro: se completan sin tocar las que había
    var have = meta.shop.offers.map(function (o) { return o.id; });
    makeShopOffers(key).forEach(function (o) {
      if (meta.shop.offers.length < 6 && have.indexOf(o.id) === -1) { o.i = meta.shop.offers.length; meta.shop.offers.push(o); }
    });
    saveMeta();
  }
  return meta.shop.offers;
}
function makeShopOffers(key) {
  var seed = 0;
  for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 233280;
  var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  var pool = UNIT_ORDER.filter(function (id) { return meta.cards[id] ? meta.cards[id].lv < CARD_MAX : UNITS[id].rarity !== 'legendaria' && UNITS[id].rarity !== 'mitica'; });
  var of = function (r) { return pool.filter(function (id) { return UNITS[id].rarity === r; }); };
  var pickFrom = function (list, taken) {
    var free = list.filter(function (id) { return taken.indexOf(id) === -1; });
    if (!free.length) free = list;
    return free.length ? free[Math.floor(rnd() * free.length)] : null;
  };
  var out = [], taken = [];
  var add = function (rarities, cur) {
    for (var k = 0; k < rarities.length; k++) {
      var id = pickFrom(of(rarities[k]), taken);
      if (id) { taken.push(id); var p = SHOP_CARDS[rarities[k]]; out.push({ id: id, n: p.n, cur: cur, price: p[cur] }); return; }
    }
  };
  add(['comun'], 'gold');
  add(['comun'], 'gold');
  add([rnd() < 0.5 ? 'comun' : 'rara', 'comun'], 'gold');
  add(['rara', 'comun'], 'gold');
  add(['epica', 'rara', 'comun'], 'gold');
  var g = rnd();
  add([g < 0.08 ? 'legendaria' : g < 0.33 ? 'mitica' : 'epica', 'epica', 'mitica'], 'gems');
  out.forEach(function (o, i) { o.i = i; });
  return out;
}
function shopBought(i) { return meta.shop.day === todayKey() && meta.shop.bought.indexOf(i) !== -1; }
// 'ok', 'new' (desbloquea la tropa), 'poor' o 'sold'
function buyOffer(i) {
  var o = shopOffers()[i];
  if (!o || shopBought(i)) return 'sold';
  var have = o.cur === 'gems' ? meta.gems : meta.gold;
  if (have < o.price) return 'poor';
  if (o.cur === 'gems') meta.gems -= o.price; else meta.gold -= o.price;
  meta.shop.bought.push(i);
  var fresh = !meta.cards[o.id];
  if (fresh) meta.cards[o.id] = { lv: 1, n: o.n - 1 };
  else meta.cards[o.id].n += o.n;
  takeSurplus();
  saveMeta();
  return fresh ? 'new' : 'ok';
}
function buyChest(type) {
  var ch = CHESTS[type];
  if (meta.gems < ch.price) return null;
  meta.gems -= ch.price;
  return openChest(type);
}
function buyGold(i) {
  var p = SHOP_GOLD[i];
  if (!p || meta.gems < p.gems) return false;
  meta.gems -= p.gems; meta.gold += p.gold;
  saveMeta();
  return true;
}

/* ---------- códigos ---------- */
// huella SHA-256 en hexadecimal (los códigos de CODES llevan sus 8 primeros)
function sha256Hex(s) {
  if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.reject(new Error('sin cifrado'));
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  });
}
// devuelve una promesa con { gold, gems, chest } o { error }
function redeemCode(raw) {
  var code = String(raw || '').toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');
  if (!code) return Promise.resolve({ error: 'Escribe un código' });
  return sha256Hex(code).then(function (full) {
    var h = full.slice(0, 8), c = CODES[h];
    if (!c) return { error: 'Ese código no existe' };
    // antes se guardaba el código tal cual y luego su huella entera; ahora, la corta
    if (meta.codes.indexOf(h) !== -1 || meta.codes.indexOf(full) !== -1 || meta.codes.indexOf(code) !== -1) return { error: 'Ya canjeaste ese código' };
    meta.codes.push(h);
    meta.gold += c.gold || 0;
    meta.gems += c.gems || 0;
    var tr = c.trophies ? Math.max(0, c.trophies - meta.trophies) : 0;
    if (tr) addTrophies(tr);
    var chest = c.chest ? openChest(c.chest) : null;
    saveMeta();
    return { code: code, gold: c.gold || 0, gems: c.gems || 0, trophies: tr, chest: chest };
  }, function () { return { error: 'Aquí no se pueden canjear códigos' }; });
}

/* ---------- trofeos: arenas y camino de trofeos ---------- */
// arena en la que juegas el 1 contra 1 (según los trofeos que tienes ahora)
function arenaIndex(t) {
  var tr = t == null ? meta.trophies : t, i = 0;
  ARENAS.forEach(function (a, k) { if (tr >= a.at) i = k; });
  return i;
}
function addTrophies(n) {
  meta.trophies = Math.max(0, meta.trophies + n);
  meta.trophyBest = Math.max(meta.trophyBest || 0, meta.trophies);
}
function roadClaimed(i) { return meta.road.indexOf(TROPHY_ROAD[i].at) !== -1; }
function roadReady(i) { return !roadClaimed(i) && meta.trophyBest >= TROPHY_ROAD[i].at; }
function roadPending() { return TROPHY_ROAD.filter(function (s, i) { return roadReady(i); }).length; }
// siguiente parada por cobrar o por alcanzar (null si ya están todas)
function roadNext() {
  for (var i = 0; i < TROPHY_ROAD.length; i++) if (!roadClaimed(i)) return i;
  return null;
}
// cobra una parada: { gold, gems, card: { id, n, fresh }, chest: lo que dio el cofre }
function claimRoad(i) {
  if (!roadReady(i)) return null;
  var s = TROPHY_ROAD[i], out = { gold: s.gold || 0, gems: s.gems || 0 };
  meta.road.push(s.at);
  meta.gold += out.gold;
  meta.gems += out.gems;
  if (s.cards) {
    // de una tropa al azar de esa rareza; mejor una que aún no tengas
    var pool = UNIT_ORDER.filter(function (id) { return UNITS[id].rarity === s.cards.rarity; });
    var fresh = pool.filter(function (id) { return !meta.cards[id]; });
    var id = pick(fresh.length ? fresh : pool);
    out.card = { id: id, n: s.cards.n, fresh: !meta.cards[id] };
    if (meta.cards[id]) meta.cards[id].n += s.cards.n;
    else meta.cards[id] = { lv: 1, n: s.cards.n - 1 };
  }
  out.surplus = takeSurplus();
  saveMeta();
  if (s.chest) out.chest = openChest(s.chest);
  return out;
}

/* ---------- misiones diarias ---------- */
// tres al día, las mismas para todos ese día (semilla = fecha)
function dailyMissions() {
  var key = todayKey();
  if (!meta.daily || meta.daily.day !== key) { meta.daily = makeDaily(key); saveMeta(); }
  return meta.daily;
}
function makeDaily(key) {
  var seed = 7;
  for (var i = 0; i < key.length; i++) seed = (seed * 37 + key.charCodeAt(i)) % 233280;
  var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  var keys = Object.keys(MISSIONS), list = [];
  while (list.length < DAILY_COUNT && keys.length) {
    var k = keys.splice(Math.floor(rnd() * keys.length), 1)[0], m = MISSIONS[k];
    var gi = rnd() < 0.5 ? 0 : 1, f = gi ? 1.5 : 1;
    list.push({ k: k, goal: m.goals[gi], prog: 0, gold: Math.round(m.gold * f / 10) * 10, gems: Math.round(m.gems * f), got: false });
  }
  return { day: key, list: list, bonus: false };
}
// suma progreso a las misiones de ese tipo (las de max guardan el mejor
// resultado de una partida). Lo guarda quien la llama.
function missionAdd(k, v) {
  if (!v) return;
  dailyMissions().list.forEach(function (m) {
    if (m.k !== k || m.got) return;
    m.prog = Math.min(m.goal, MISSIONS[k].max ? Math.max(m.prog, v) : m.prog + v);
  });
}
function claimMission(i) {
  var m = dailyMissions().list[i];
  if (!m || m.got || m.prog < m.goal) return null;
  m.got = true;
  meta.gold += m.gold;
  meta.gems += m.gems;
  addSeasonXp(25);
  saveMeta();
  return m;
}
function dailyBonusReady() { var d = dailyMissions(); return !d.bonus && d.list.every(function (m) { return m.got; }); }
function claimDailyBonus() {
  if (!dailyBonusReady()) return null;
  meta.daily.bonus = true;
  addSeasonXp(40);
  saveMeta();
  return openChest(DAILY_BONUS);
}
// lo que hay por cobrar (misiones cumplidas y el premio del día)
function dailyPending() {
  return dailyMissions().list.filter(function (m) { return !m.got && m.prog >= m.goal; }).length + (dailyBonusReady() ? 1 : 0);
}
