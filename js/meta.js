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
    shop: { day: '', bought: [], offers: null },   // ofertas de hoy y las ya compradas
    codes: [],                       // códigos ya canjeados
    cards: cards,
    deck: STARTER_UNITS.slice(),
    commander: 'aria',
    campaign: {},          // fase -> estrellas
    coopBest: 0,
    duelWins: 0, duelLosses: 0,
    freeChestDay: '',
    slots: [null, null, null, null],   // cofres ganados: { type, unlockAt } (unlockAt: cuándo se abre; 0 si no se ha empezado)
    settings: { sound: true },
    seenTutorial: false
  };
}
function loadMeta() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultMeta();
    var m = Object.assign(defaultMeta(), JSON.parse(raw));
    // saneado básico
    m.deck = (m.deck || []).filter(function (id) { return UNITS[id] && m.cards[id]; });
    STARTER_UNITS.forEach(function (id) { if (!m.cards[id]) m.cards[id] = { lv: 1, n: 0 }; });
    while (m.deck.length < 5) {
      var extra = Object.keys(m.cards).find(function (id) { return m.deck.indexOf(id) === -1; });
      if (!extra) break;
      m.deck.push(extra);
    }
    if (!COMMANDERS[m.commander]) m.commander = 'aria';
    var slots = Array.isArray(m.slots) ? m.slots : [];
    m.slots = [];
    for (var i = 0; i < CHEST_SLOTS; i++) m.slots.push(slots[i] && CHESTS[slots[i].type] ? slots[i] : null);
    return m;
  } catch (e) { return defaultMeta(); }
}
var meta = loadMeta();
function saveMeta() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (e) {} }
// empieza de cero (solo se conserva si el sonido está activado)
function resetMeta() {
  var sound = meta.settings.sound;
  meta = defaultMeta();
  meta.settings.sound = sound;
  saveMeta();
}

function isUnlocked(id) { return !!meta.cards[id]; }
function unlockUnit(id) {
  if (meta.cards[id]) return false;
  meta.cards[id] = { lv: 1, n: 0 };
  saveMeta();
  return true;
}
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
  var got = {};
  for (var i = 0; i < ch.cards; i++) {
    var roll = Math.random() - (ch.myth || 0), pool;
    if (roll < 0) pool = byRarity.mitica;
    else if (roll < ch.legend) pool = byRarity.legendaria;
    else if (roll < ch.legend + ch.epic) pool = byRarity.epica;
    else if (roll < ch.legend + ch.epic + ch.rare) pool = byRarity.rara;
    else pool = byRarity.comun;
    var id = pool[Math.floor(Math.random() * pool.length)];
    got[id] = (got[id] || 0) + 1;
  }
  meta.gold += gold;
  meta.gems += gems;
  var fresh = [];
  Object.keys(got).forEach(function (id) {
    if (meta.cards[id]) { meta.cards[id].n += got[id]; return; }
    meta.cards[id] = { lv: 1, n: got[id] - 1 };
    fresh.push(id);
  });
  saveMeta();
  return { type: type, gold: gold, gems: gems, cards: got, fresh: fresh };
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
function freeChestReady() { return meta.freeChestDay !== todayKey(); }
function claimFreeChest() {
  if (!freeChestReady()) return null;
  meta.freeChestDay = todayKey();
  return openChest('plata');
}
function totalStars() {
  return Object.keys(meta.campaign).reduce(function (s, k) { return s + meta.campaign[k]; }, 0);
}
function stageUnlocked(n) { return n === 1 || (meta.campaign[n - 1] || 0) > 0; }

/* ---------- tienda ---------- */
// Ofertas del día: se eligen la primera vez que se abre la tienda en el día
// (semilla = fecha) y se guardan, para que no cambien al desbloquear tropas.
// Tres de cartas por oro y una de carta épica o legendaria por gemas.
// Pueden ser de tropas que aún no tienes (la primera carta la desbloquea),
// salvo las legendarias y míticas, que solo salen en el cofre de oro (en la
// tienda solo aparecen las que ya tienes).
function shopOffers() {
  var key = todayKey();
  if (meta.shop.day !== key) meta.shop = { day: key, bought: [], offers: null };
  if (!meta.shop.offers) { meta.shop.offers = makeShopOffers(key); saveMeta(); }
  return meta.shop.offers;
}
function makeShopOffers(key) {
  var seed = 0;
  for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 233280;
  var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  var pool = UNIT_ORDER.filter(function (id) { return meta.cards[id] || (UNITS[id].rarity !== 'legendaria' && UNITS[id].rarity !== 'mitica'); });
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
  add([rnd() < 0.5 ? 'comun' : 'rara', 'comun'], 'gold');
  add(['rara', 'comun'], 'gold');
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
function redeemCode(raw) {
  var code = String(raw || '').toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');
  var c = CODES[code];
  if (!code) return { error: 'Escribe un código' };
  if (!c) return { error: 'Ese código no existe' };
  if (meta.codes.indexOf(code) !== -1) return { error: 'Ya canjeaste ese código' };
  meta.codes.push(code);
  meta.gold += c.gold || 0;
  meta.gems += c.gems || 0;
  var chest = c.chest ? openChest(c.chest) : null;
  saveMeta();
  return { code: code, gold: c.gold || 0, gems: c.gems || 0, chest: chest };
}
