'use strict';
/* =========================================================
   PROGRESO: oro, cartas, mazo, comandante, campaña y cofres
   ========================================================= */
var SAVE_KEY = 'reinoDeTorres_v1';

function defaultMeta() {
  var cards = {};
  STARTER_UNITS.forEach(function (id) { cards[id] = { lv: 1, n: 0 }; });
  return {
    gold: 150, trophies: 0,
    cards: cards,
    deck: STARTER_UNITS.slice(),
    commander: 'aria',
    campaign: {},          // fase -> estrellas
    coopBest: 0,
    duelWins: 0, duelLosses: 0,
    freeChestDay: '',
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
    return m;
  } catch (e) { return defaultMeta(); }
}
var meta = loadMeta();
function saveMeta() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (e) {} }

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

/* Cofre: oro + cartas repartidas entre las tropas desbloqueadas según rareza. */
function openChest(type) {
  var ch = CHESTS[type];
  var gold = Math.round(ch.gold[0] + Math.random() * (ch.gold[1] - ch.gold[0]));
  var owned = Object.keys(meta.cards);
  var byRarity = { comun: [], rara: [], epica: [], legendaria: [] };
  owned.forEach(function (id) { byRarity[UNITS[id].rarity].push(id); });
  var got = {};
  for (var i = 0; i < ch.cards; i++) {
    var roll = Math.random(), pool;
    if (roll < ch.legend && byRarity.legendaria.length) pool = byRarity.legendaria;
    else if (roll < ch.legend + ch.epic && byRarity.epica.length) pool = byRarity.epica;
    else if (roll < ch.legend + ch.epic + ch.rare && byRarity.rara.length) pool = byRarity.rara;
    else pool = byRarity.comun.length ? byRarity.comun : owned;
    var id = pool[Math.floor(Math.random() * pool.length)];
    got[id] = (got[id] || 0) + 1;
  }
  meta.gold += gold;
  Object.keys(got).forEach(function (id) { meta.cards[id].n += got[id]; });
  // muy de vez en cuando, una legendaria que solo sale en cofres
  var secret = null;
  var hidden = UNIT_ORDER.filter(function (id) { return UNITS[id].chestOnly && !meta.cards[id]; });
  if (hidden.length && Math.random() < ch.secret) {
    secret = hidden[Math.floor(Math.random() * hidden.length)];
    meta.cards[secret] = { lv: 1, n: 0 };
  }
  saveMeta();
  return { type: type, gold: gold, cards: got, secret: secret };
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
