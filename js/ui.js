'use strict';
/* =========================================================
   INTERFAZ: menús, controles de la partida, sonido y bucle
   ========================================================= */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* ---------- sonido sintetizado ---------- */
var audioCtx = null;
function tone(f, dur, type, vol, delay) {
  if (!meta.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    var t0 = audioCtx.currentTime + (delay || 0);
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function sfx(k) {
  switch (k) {
    case 'tap': tone(700, 0.05, 'triangle', 0.06); break;
    case 'summon': tone(420, 0.08); tone(640, 0.1, 'triangle', 0.1, 0.06); break;
    case 'merge': [523, 659, 880].forEach(function (f, i) { tone(f, 0.12, 'triangle', 0.1, i * 0.05); }); break;
    case 'power': [392, 523, 784].forEach(function (f, i) { tone(f, 0.14, 'square', 0.06, i * 0.06); }); break;
    case 'no': tone(160, 0.15, 'sawtooth', 0.06); break;
    case 'wave': tone(330, 0.15, 'square', 0.06); tone(440, 0.2, 'square', 0.06, 0.12); break;
    case 'boss': [196, 165, 131].forEach(function (f, i) { tone(f, 0.3, 'sawtooth', 0.08, i * 0.15); }); break;
    case 'leak': tone(220, 0.2, 'sawtooth', 0.08); break;
    case 'win': [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.12, i * 0.1); }); break;
    case 'lose': [392, 330, 262].forEach(function (f, i) { tone(f, 0.3, 'sawtooth', 0.07, i * 0.16); }); break;
    case 'start': tone(523, 0.1); tone(784, 0.18, 'triangle', 0.1, 0.1); break;
    case 'cmd': tone(300, 0.3, 'sawtooth', 0.07); tone(900, 0.3, 'triangle', 0.08, 0.1); break;
    case 'chest': [440, 554, 659, 880, 1109].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.1, i * 0.07); }); break;
  }
}
function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
function toast(msg) {
  var t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._h); toast._h = setTimeout(function () { t.classList.remove('show'); }, 1700);
}

/* ---------- pantallas ---------- */
var currentScreen = 'home';
function showScreen(name) {
  $('menu').hidden = name === 'battle';
  $('battleScreen').hidden = name !== 'battle';
  $('navbar').hidden = name === 'battle';
  currentScreen = name;
  // pestaña activa de la barra de abajo
  var tab = name === 'shop' ? 'shop' : name === 'collection' || name === 'commanders' ? 'collection' : 'home';
  document.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  if (name !== 'battle') renderMenu(name);
}
function topBar() {
  return '<div class="res-bar"><span class="pill gold">🪙 ' + meta.gold + '</span><span class="pill gem">💎 ' + meta.gems + '</span><span class="pill trophy">🏆 ' + meta.trophies + '</span><span class="pill star">⭐ ' + totalStars() + '</span></div>';
}
function renderMenu(name, arg) {
  var m = $('menu');
  var html = '';
  if (name === 'home') {
    var free = freeChestReady();
    html = topBar() +
      '<div class="logo"><div class="logo-crest">🏰</div><h1>Reino de Torres</h1><p>Invoca tropas, fusiónalas y defiende tu reino</p></div>' +
      '<div class="deck-preview">' + meta.deck.map(function (id) { return '<img src="' + unitIcon(id, 0, 96) + '" alt="' + esc(UNITS[id].name) + '">'; }).join('') + '</div>' +
      '<button class="play-hero" data-go="playNext" aria-label="Jugar la siguiente fase de la campaña"><img src="assets/ui/boton.webp" alt=""></button>' +
      '<div class="mode-list">' +
      modeBtn('campaign', '🗺️', 'Campaña', '15 fases con jefes · ' + totalStars() + '/45 ⭐', 'm-campaign') +
      modeBtn('duelPick', '⚔️', 'Duelo 1 contra 1', 'Aguanta más que tu rival', 'm-duel') +
      modeBtn('coop', '🤝', '2 contra la máquina', 'Tú y un aliado vs oleadas · récord ' + meta.coopBest, 'm-coop') +
      '</div>' +
      '<div class="home-grid">' +
      '<button class="tile-btn ' + (free ? 'glow' : '') + '" data-go="freeChest">🎁<span>' + (free ? 'Cofre gratis' : 'Mañana más') + '</span></button>' +
      '<button class="tile-btn code" data-go="codes">🎟️<span>Códigos</span></button>' +
      '<button class="tile-btn" data-go="howto">❓<span>Cómo jugar</span></button>' +
      '</div>' +
      '<label class="sound-row"><input type="checkbox" id="soundChk" ' + (meta.settings.sound ? 'checked' : '') + '> Sonido</label>' +
      '<p class="foot">Juego original y gratuito, inspirado en los tower defense de fusión. Sin anuncios.</p>';
  } else if (name === 'campaign') {
    html = backBar('Campaña') + '<div class="stage-list">' + CAMPAIGN.map(function (st) {
      var open = stageUnlocked(st.id), stars = meta.campaign[st.id] || 0;
      return '<button class="stage ' + (open ? '' : 'locked') + '" ' + (open ? 'data-stage="' + st.id + '"' : 'disabled') + '>' +
        '<span class="stage-n">' + st.id + '</span>' +
        '<span class="stage-t"><b>' + esc(st.name) + '</b><small>' + st.waves + ' oleadas · Jefe: ' + esc(BOSSES[st.boss].name) + (st.unlock && !isUnlocked(st.unlock) ? ' · 🎁 ' + esc(UNITS[st.unlock].name) : '') + '</small></span>' +
        '<span class="stage-s">' + (open ? '★★★'.slice(0, stars).padEnd(3, '☆') : '🔒') + '</span></button>';
    }).join('') + '</div>';
  } else if (name === 'duelPick') {
    html = backBar('Duelo 1 contra 1') +
      '<p class="lead">Los dos recibís los mismos monstruos. Cada uno que se escapa te quita un corazón (el jefe, dos). Gana quien aguante más.</p>' +
      ['Fácil', 'Normal', 'Difícil'].map(function (n, i) {
        return '<button class="big-choice d' + i + '" data-duel="' + i + '"><b>' + ['🙂', '😠', '😈'][i] + ' Rival ' + n + '</b><small>Premio: ' + (25 + i * 5) + ' 🏆 · ' + (60 + i * 40) + ' 🪙 · cofre de ' + (i >= 2 ? 'oro' : 'plata') + '</small></button>';
      }).join('') +
      '<p class="muted">Victorias ' + meta.duelWins + ' · Derrotas ' + meta.duelLosses + '</p>';
  } else if (name === 'collection') {
    var collHtml = UNIT_ORDER.filter(function (id) { return collFilter === 'all' || UNITS[id].rarity === collFilter; }).map(function (id) { return cardHtml(id, meta.deck.indexOf(id) !== -1, true); }).join('');
    html = backBar('Mazo', true) + deckTabs('collection') +
      '<p class="lead">Tu mazo (5 tropas). Toca una carta para verla, cambiarla o mejorarla.</p>' +
      '<div class="deck-slots">' + meta.deck.map(function (id) { return cardHtml(id, true); }).join('') + '</div>' +
      '<h3>Colección</h3>' + rarityFilters() +
      '<div class="card-grid">' + (collHtml || '<p class="muted coll-empty">No hay tropas de esta rareza</p>') + '</div>' +
      '<div class="legend"><b>Afinidad:</b> ' + Object.keys(ELEMENTS).map(function (k) { return ELEMENTS[k].icon + ' ' + ELEMENTS[k].name; }).join(' · ') + '. Dos tropas del mismo elemento juntas se potencian.</div>';
  } else if (name === 'commanders') {
    html = backBar('Mazo', true) + deckTabs('commanders') + '<p class="lead">Su habilidad se carga durante la partida. Pulsa su retrato para usarla.</p>' +
      COMMANDER_ORDER.map(function (k) {
        var c = COMMANDERS[k];
        return '<button class="big-choice cmd ' + (meta.commander === k ? 'sel' : '') + '" data-cmd="' + k + '" style="--cc:' + c.color + '"><span class="cmd-ico"><img src="' + c.pic + '" alt="' + esc(c.name) + '"></span><span><b>' + c.name + ' · ' + c.title + '</b><small>' + c.ability + ': ' + c.desc + ' (cada ' + c.cd + ' s)</small></span></button>';
      }).join('');
  } else if (name === 'shop') {
    html = backBar('Tienda', true) + shopHtml();
  } else if (name === 'howto') {
    html = backBar('Cómo jugar') + '<div class="howto">' +
      '<p><b>🎲 Invoca</b> tropas al azar de tu mazo. Cada invocación cuesta 10 💧 más que la anterior.</p>' +
      '<p><b>✨ Fusiona</b> dos tropas <i>iguales y del mismo rango</i>: arrastra una sobre otra (o tócalas una tras otra). La tropa sube de rango y hace mucho más daño.</p>' +
      '<p><b>↔️ Recoloca</b> tus tropas arrastrándolas a una casilla vacía o sobre otra para intercambiarlas.</p>' +
      '<p><b>⚔️💧🏹 Casillas especiales:</b> Altar (+35% daño), Fuente (maná extra) y Atalaya (+30% velocidad). Cambian en cada partida.</p>' +
      '<p><b>🔥❄️🌿🔮⚙️ Afinidad:</b> cada tropa vecina del mismo elemento da +12% de daño.</p>' +
      '<p><b>⬆ Mejora</b> un tipo de tropa en plena partida tocando su carta abajo: afecta a todas las de ese tipo.</p>' +
      '<p><b>👑 Comandante:</b> cuando su retrato esté cargado, tócalo para usar su habilidad.</p>' +
      '<p><b>🌑 Eventos:</b> algunas oleadas traen Eclipse, Lluvia de maná, Niebla, Horda o Calma.</p>' +
      '<p><b>💧 Maná:</b> se gana derrotando monstruos, con el Mercader Doblón y con la Fuente.</p>' +
      '<p><b>💎 Gemas:</b> salen en los cofres, por cada estrella nueva de la campaña, al ganar duelos y en el cooperativo. Gástalas en la tienda.</p>' +
      '</div>';
  }
  m.innerHTML = html;
  m.scrollTop = 0;
  bindMenu();
}
/* Tienda: ofertas de cartas del día, cofres por gemas y oro por gemas. */
function shopHtml() {
  var now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  var left = Math.max(1, Math.ceil((mid - now) / 3600000));
  var price = function (cur, v, poor) { return '<span class="sh-price' + (poor ? ' poor' : '') + '">' + (cur === 'gems' ? '💎' : '🪙') + ' ' + v + '</span>'; };
  var offers = shopOffers().map(function (o) {
    var u = UNITS[o.id], sold = shopBought(o.i), poor = (o.cur === 'gems' ? meta.gems : meta.gold) < o.price;
    return '<button class="sh-offer' + (sold ? ' sold' : '') + (o.cur === 'gems' ? ' gemmy' : '') + '" data-offer="' + o.i + '" style="--rc:' + RARITY[u.rarity].color + '"' + (sold ? ' disabled' : '') + '>' +
      '<span class="sh-rar">' + RARITY[u.rarity].name + '</span>' +
      '<img src="' + unitIcon(o.id, 0, 112) + '" alt="">' +
      '<b>' + esc(u.name) + '</b><span class="sh-n">×' + o.n + ' cartas</span>' +
      (sold ? '<span class="sh-price sold">Comprada</span>' : price(o.cur, o.price, poor)) + '</button>';
  }).join('');
  var chests = CHEST_ORDER.map(function (k) {
    var ch = CHESTS[k];
    return '<button class="sh-chest" data-buychest="' + k + '" style="--cc:' + ch.color + '"><img class="sh-chest-pic" src="' + chestPic(k) + '" alt=""><b>' + ch.name.replace('Cofre de ', '') + '</b>' +
      '<small>' + ch.cards + ' cartas<br>' + ch.gold[0] + ' a ' + ch.gold[1] + ' 🪙</small>' + price('gems', ch.price, meta.gems < ch.price) + '</button>';
  }).join('');
  var golds = SHOP_GOLD.map(function (p, i) {
    return '<button class="sh-gold" data-buygold="' + i + '"><img class="sh-gold-pic" src="assets/chests/oro-' + ['monedas', 'saco', 'cofre'][i] + '.webp" alt=""><b>' + p.gold + ' 🪙</b>' + price('gems', p.gems, meta.gems < p.gems) + '</button>';
  }).join('');
  return '<div class="sh-head"><h3>Ofertas del día</h3><small>Cambian en ' + left + ' h</small></div>' +
    '<div class="sh-offers">' + (offers || '<p class="muted">Desbloquea tropas para ver ofertas</p>') + '</div>' +
    '<div class="sh-head"><h3>Cofres</h3><small>También dan gemas</small></div><div class="sh-chests">' + chests + '</div>' +
    '<div class="sh-head"><h3>Oro</h3></div><div class="sh-golds">' + golds + '</div>' +
    '<p class="muted">💎 Ganas gemas en los cofres, con cada estrella nueva de la campaña, al ganar duelos y en el cooperativo.</p>';
}
function modeBtn(go, icon, title, sub, cls) {
  return '<button class="mode-btn ' + cls + '" data-go="' + go + '"><span class="mode-ico">' + icon + '</span><span><b>' + title + '</b><small>' + sub + '</small></span><span class="mode-go">▶</span></button>';
}
// Pestañas dentro de Mazo: tropas y comandante.
function deckTabs(on) {
  return '<div class="sub-tabs"><button data-go="collection" class="' + (on === 'collection' ? 'on' : '') + '">🃏 Tropas</button>' +
    '<button data-go="commanders" class="' + (on === 'commanders' ? 'on' : '') + '">👑 Comandante</button></div>';
}
// tab: pantalla de la barra de abajo, sin botón de volver
function backBar(title, tab) { return '<div class="back-bar">' + (tab ? '' : '<button class="back" data-go="home">‹</button>') + '<h2>' + title + '</h2>' + '<span class="pill gold">🪙 ' + meta.gold + '</span><span class="pill gem">💎 ' + meta.gems + '</span></div>'; }
/* Filtro por rareza de la colección: todas o una rareza, con cuántas tienes de cada. */
var collFilter = 'all';
function rarityFilters() {
  var keys = ['all'].concat(Object.keys(RARITY));
  return '<div class="rar-filters">' + keys.map(function (k) {
    var ids = UNIT_ORDER.filter(function (id) { return k === 'all' || UNITS[id].rarity === k; });
    var own = ids.filter(isUnlocked).length;
    return '<button class="rar-f' + (collFilter === k ? ' on' : '') + '" data-rf="' + k + '" style="--rc:' + (k === 'all' ? '#ffd166' : RARITY[k].color) + '">' +
      (k === 'all' ? 'Todas' : RARITY[k].name) + '<small>' + own + '/' + ids.length + '</small></button>';
  }).join('') + '</div>';
}
// inColl: carta de la colección, que marca las que ya están en el mazo
function cardHtml(id, inDeck, inColl) {
  var u = UNITS[id], c = meta.cards[id];
  if (!c) {
    var from = CAMPAIGN.filter(function (st) { return st.unlock === id; })[0];
    return '<div class="ucard locked" style="--rc:' + RARITY[u.rarity].color + '">' +
      '<span class="uel">' + ELEMENTS[u.element].icon + '</span>' +
      '<span class="uport"><img src="' + unitIcon(id, 0, 128) + '" alt=""><i class="ulock">' + (u.chestOnly ? '🎁' : '🔒') + '</i></span>' +
      '<div class="ulv ulv-lock">' + (u.chestOnly ? 'Solo en cofres' : from ? 'Fase ' + from.id : 'Bloqueada') + '</div>' +
      '<small>' + esc(u.name) + '</small></div>';
  }
  var need = cardsNeeded(c.lv), pct = c.lv >= CARD_MAX ? 100 : Math.min(100, c.n / need * 100);
  var ready = canUpgradeCard(id);
  return '<button class="ucard ' + (ready ? 'ready' : '') + '" data-card="' + id + '" style="--rc:' + RARITY[u.rarity].color + '">' +
    '<span class="uel">' + ELEMENTS[u.element].icon + '</span>' +
    (inColl && inDeck ? '<span class="udeck">Mazo</span>' : '') +
    '<span class="uport"><img src="' + unitIcon(id, 0, 128) + '" alt=""></span>' +
    '<div class="ulv">Nv ' + c.lv + '</div>' +
    '<div class="ubar"><span style="width:' + pct + '%"></span><em>' + (c.lv >= CARD_MAX ? 'MÁX' : c.n + '/' + need) + '</em></div>' +
    '<small>' + esc(u.name) + '</small></button>';
}
function bindMenu() {
  var m = $('menu');
  m.querySelectorAll('[data-go]').forEach(function (b) {
    b.onclick = function () {
      sfx('tap');
      var g = b.dataset.go;
      if (g === 'coop') { startBattle('coop'); return; }
      if (g === 'playNext') {
        var next = 1;
        while (next < CAMPAIGN.length && (meta.campaign[next] || 0) > 0) next++;
        startBattle('campaign', { stage: next });
        return;
      }
      if (g === 'codes') { showCodes(); return; }
      if (g === 'freeChest') { var r = claimFreeChest(); if (r) showChest(r); else toast('Vuelve mañana a por otro cofre'); return; }
      showScreen(g);
    };
  });
  m.querySelectorAll('[data-stage]').forEach(function (b) { b.onclick = function () { startBattle('campaign', { stage: +b.dataset.stage }); }; });
  m.querySelectorAll('[data-duel]').forEach(function (b) { b.onclick = function () { startBattle('duel', { level: +b.dataset.duel }); }; });
  m.querySelectorAll('[data-cmd]').forEach(function (b) { b.onclick = function () { meta.commander = b.dataset.cmd; saveMeta(); sfx('tap'); renderMenu('commanders'); }; });
  m.querySelectorAll('[data-rf]').forEach(function (b) { b.onclick = function () { collFilter = b.dataset.rf; sfx('tap'); renderMenu('collection'); }; });
  m.querySelectorAll('[data-card]').forEach(function (b) { b.onclick = function () { sfx('tap'); showCardModal(b.dataset.card); }; });
  m.querySelectorAll('[data-offer]').forEach(function (b) {
    b.onclick = function () {
      var o = shopOffers()[+b.dataset.offer], r = buyOffer(+b.dataset.offer);
      if (r === 'ok') { sfx('power'); buzz(20); toast('+' + o.n + ' cartas de ' + UNITS[o.id].name); renderMenu('shop'); }
      else if (r === 'poor') { sfx('no'); toast(o.cur === 'gems' ? 'Te faltan gemas' : 'Te falta oro'); }
    };
  });
  m.querySelectorAll('[data-buychest]').forEach(function (b) {
    b.onclick = function () {
      if (chestFxOn) return;
      var r = buyChest(b.dataset.buychest);
      if (r) showChest(r, b.querySelector('.sh-chest-pic')); else { sfx('no'); toast('Te faltan gemas'); }
    };
  });
  m.querySelectorAll('[data-buygold]').forEach(function (b) {
    b.onclick = function () {
      if (buyGold(+b.dataset.buygold)) { sfx('chest'); toast('+' + SHOP_GOLD[+b.dataset.buygold].gold + ' 🪙'); renderMenu('shop'); }
      else { sfx('no'); toast('Te faltan gemas'); }
    };
  });
  var sc = $('soundChk'); if (sc) sc.onchange = function () { meta.settings.sound = sc.checked; saveMeta(); };
}

/* Rasgos de una tropa como etiquetas (icono, nombre, valor). */
function unitTraits(u) {
  var t = [];
  if (u.splash) t.push(['💥', 'Área', 'Zona ' + Math.round(u.splash * 100) + '%']);
  if (u.poison) t.push([u.element === 'fuego' ? '🔥' : '☠️', u.element === 'fuego' ? 'Quema' : 'Veneno', u.poison.dps + '/s · ' + u.poison.dur + ' s']);
  if (u.chain) t.push(['⚡', 'Cadena', u.chain + ' saltos']);
  if (u.crit) t.push(['🗡️', 'Crítico', Math.round(u.crit.chance * 100) + '% ×' + u.crit.mult]);
  if (u.stun) t.push(['⏳', 'Aturde', Math.round(u.stun.chance * 100) + '% · ' + u.stun.dur + ' s']);
  if (u.slow) t.push(['❄️', 'Ralentiza', 'Hasta ' + Math.round(u.slow.max * 100) + '%']);
  if (u.bossMult) t.push(['👑', 'Cazajefes', '×' + u.bossMult + ' a jefes']);
  if (u.pierce) t.push(['🛡️', 'Perfora', 'Sin armadura']);
  if (u.buff) t.push(['🎵', 'Ritmo', '+' + Math.round(u.buff.speed * 100) + '% vecinas']);
  if (u.dmg) t.push(['🎯', 'Objetivo', u.target === 'strong' ? 'El más fuerte' : 'El primero']);
  return t;
}
function showCardModal(id) {
  var u = UNITS[id], c = meta.cards[id], inDeck = meta.deck.indexOf(id) !== -1;
  var rar = RARITY[u.rarity], el = ELEMENTS[u.element];
  var need = cardsNeeded(c.lv), gold = cardUpgradeGold(c.lv), maxed = c.lv >= CARD_MAX;
  var dmgAt = function (lv) { return Math.round(u.dmg * (1 + CARD_BONUS * (lv - 1))); };
  var stat = function (icon, val, label) { return '<div class="ps-stat"><i>' + icon + '</i><b>' + val + '</b><small>' + label + '</small></div>'; };
  var stats = u.dmg
    ? stat('⚔️', dmgAt(c.lv), 'Daño') + stat('⏱️', u.rate, 'Disparos/s') + stat('📈', Math.round(dmgAt(c.lv) * u.rate), 'Daño/s')
    : u.manaGen
      ? stat('💧', '+' + u.manaGen.amount, 'Maná') + stat('⏱️', u.manaGen.every + ' s', 'Cada') + stat('✨', '×rango', 'Fusión')
      : stat('🎵', '+' + Math.round(u.buff.speed * 100) + '%', 'Velocidad') + stat('📍', '8', 'Vecinas') + stat('✨', '×rango', 'Fusión');
  var traits = unitTraits(u).map(function (t) { return '<span class="uc-trait"><i>' + t[0] + '</i><b>' + t[1] + '</b><small>' + t[2] + '</small></span>'; }).join('');
  var pct = maxed ? 100 : Math.min(100, c.n / need * 100);
  var why = maxed ? '' : c.n < need ? (need - c.n === 1 ? 'Falta 1 carta' : 'Faltan ' + (need - c.n) + ' cartas') : meta.gold < gold ? 'Te faltan ' + (gold - meta.gold) + ' 🪙' : '';
  var gain = !maxed && u.dmg ? '<span class="uc-gain">⚔️ ' + dmgAt(c.lv) + ' → <b>' + dmgAt(c.lv + 1) + '</b></span>' : '';
  var html = '<div class="modal-card unit-card rar-' + u.rarity + '" style="--rc:' + rar.color + ';--ec:' + el.color + '">' +
    '<button class="uc-x" id="mcX" aria-label="Cerrar">✕</button>' +
    '<div class="uc-hero"><div class="uc-rays"></div><img class="uc-img" src="' + unitIcon(id, Math.min(7, c.lv), 220) + '" alt=""></div>' +
    '<div class="uc-ribbon"><h2>' + esc(u.name) + '</h2></div>' +
    '<p class="uc-title">' + esc(u.title) + '</p>' +
    '<div class="uc-chips"><span class="uc-chip rar">' + (u.rarity === 'legendaria' ? '★ ' : '') + rar.name + '</span><span class="uc-chip el">' + el.icon + ' ' + el.name + '</span><span class="uc-chip">' + esc(u.role) + '</span></div>' +
    '<p class="uc-desc">' + esc(u.desc) + (u.chestOnly ? '<br><em>🎁 Solo sale en cofres</em>' : '') + '</p>' +
    '<div class="uc-demo"><canvas id="ucDemo" aria-label="' + esc(u.name) + ' en acción"></canvas><span>En acción</span></div>' +
    '<div class="pause-stats uc-stats">' + stats + '</div>' +
    (traits ? '<div class="uc-traits">' + traits + '</div>' : '') +
    '<div class="uc-level"><span class="uc-lvmedal">' + c.lv + '</span><div class="uc-lvbody"><div class="uc-lvtop"><b>' + (maxed ? 'Nivel máximo' : 'Nivel ' + c.lv) + '</b>' + gain + '</div>' +
    '<div class="ubar' + (canUpgradeCard(id) ? ' ok' : '') + '"><span style="width:' + pct + '%"></span><em>' + (maxed ? 'MÁX' : c.n + '/' + need) + '</em></div></div></div>' +
    (maxed ? '' : '<button class="btn btn-green" id="mcUp" ' + (canUpgradeCard(id) ? '' : 'disabled') + '>⬆ Mejorar · ' + gold + ' 🪙</button>' + (why ? '<p class="uc-why">' + why + '</p>' : '')) +
    (inDeck ? '<p class="uc-indeck">✔ En tu mazo</p>' : '<p class="uc-swap-t">Ponla en el mazo en lugar de</p><div class="swap-row">' + meta.deck.map(function (d) { return '<button data-swap="' + d + '" style="--rc:' + RARITY[UNITS[d].rarity].color + '"><img src="' + unitIcon(d, 0, 80) + '" alt="' + esc(UNITS[d].name) + '"></button>'; }).join('') + '</div>') +
    '<button class="btn btn-ghost" id="mcClose">Cerrar</button></div>';
  openOverlay(html);
  startCardDemo($('ucDemo'), id);
  var up = $('mcUp');
  if (up) up.onclick = function () { if (upgradeCard(id)) { sfx('power'); toast(u.name + ' sube a nivel ' + meta.cards[id].lv); showCardModal(id); renderMenu('collection'); } };
  document.querySelectorAll('[data-swap]').forEach(function (b) {
    b.onclick = function () { var k = meta.deck.indexOf(b.dataset.swap); meta.deck[k] = id; saveMeta(); closeOverlay(); sfx('merge'); renderMenu('collection'); };
  });
  $('mcClose').onclick = closeOverlay;
  $('mcX').onclick = closeOverlay;
}

/* Mini partida en la ficha de una tropa: la tropa en su casilla disparando
   a los monstruos que pasan por el camino (Melodía, con Lyra al lado). */
function startCardDemo(cv, id) {
  if (!cv) return;
  var W = 6, H = 2.5, PY = 1.9;
  var geo = makeGeo({ W: W, H: H, x0: 2.5, y0: 0.4, cw: 1, ch: 1, way: [{ x: -0.6, y: PY }, { x: W + 0.6, y: PY }] });
  var deck = UNITS[id].buff ? [id, 'lyra'] : [id];
  var lv = {}; deck.forEach(function (k) { lv[k] = meta.cards[k] ? meta.cards[k].lv : 1; });
  var b = new Board({ name: 'demo', deck: deck, cardLv: lv, lives: { v: 999, max: 999 }, geo: geo, mana: 0 });
  b.tiles = {};
  b.cells[0] = { id: id, rank: 1, cd: 0.3, frozen: 0, anim: 0, gen: UNITS[id].manaGen ? UNITS[id].manaGen.every - 1.2 : 0 };
  if (UNITS[id].buff) { b.cells[0].id = 'lyra'; b.cells[1] = { id: id, rank: 1, cd: 0, frozen: 0, anim: 0, gen: 1.5 }; }
  // vida de los monstruos: unos cuantos golpes de la tropa
  var dps = UNITS[b.cells[0].id].dmg ? b.unitDamage(0) * UNITS[b.cells[0].id].rate : 20;
  var kinds = ['blob', 'orco', 'ghost', 'brute'], nk = 0, spawnT = 0, last = 0;
  var dc = cv.getContext('2d');
  function frame(t) {
    if (!cv.isConnected) return;
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    var r = window.devicePixelRatio || 1, cw = cv.clientWidth, chh = cv.clientHeight;
    if (cv.width !== Math.round(cw * r)) { cv.width = Math.round(cw * r); cv.height = Math.round(chh * r); }
    var sc = Math.min(cw / W, chh / H), ox = (cw - W * sc) / 2, oy = (chh - H * sc) / 2;
    spawnT -= dt;
    if (spawnT <= 0 && b.enemies.length < 6) {
      spawnT = 1.3;
      var k = kinds[nk++ % kinds.length];
      b.spawn(k, Math.max(25, dps * 1.8 * ENEMIES[k].hp), { speedMult: 2.4 });
    }
    b.update(dt);
    dc.setTransform(r, 0, 0, r, 0, 0);
    var g = dc.createLinearGradient(0, 0, 0, chh); g.addColorStop(0, '#6fc322'); g.addColorStop(1, '#4f9a1c');
    dc.fillStyle = g; dc.fillRect(0, 0, cw, chh);
    dc.save(); dc.translate(ox, oy); dc.scale(sc, sc);
    dc.fillStyle = '#c9a66b'; dc.fillRect(-1, PY - 0.42, W + 2, 0.84);
    dc.fillStyle = '#e6c78c'; dc.fillRect(-1, PY - 0.36, W + 2, 0.72);
    for (var i = 0; i < 2; i++) {
      if (!b.cells[i]) continue;
      var c = b.cc(i), u = b.cells[i];
      dc.fillStyle = 'rgba(0,0,0,0.18)'; rrect(dc, c.x - 0.46, c.y - 0.46, 0.92, 0.92, 0.14); dc.fill();
      drawUnit(dc, u.id, c.x, c.y - 0.02, 0.42 * (1 + u.anim * 0.25), u.rank, t, { board: true, atk: u.atk, aim: u.aim });
    }
    b.enemies.slice().sort(function (p, q) { return p.y - q.y; }).forEach(function (e) {
      drawEnemy(dc, e, ENEMIES[e.kind].size * 0.82, t);
    });
    var keep = ctx; ctx = dc; // drawShot dibuja en el lienzo global
    b.shots.forEach(function (s2) { drawShot(s2, t); });
    ctx = keep;
    b.fx.forEach(function (f) {
      var a = f.life / f.max;
      dc.globalAlpha = a; dc.strokeStyle = f.color; dc.lineWidth = 0.06;
      if (f.type === 'bolt') { dc.beginPath(); dc.moveTo(f.x1, f.y1); dc.lineTo(f.x2, f.y2); dc.stroke(); }
      else if (f.type !== 'flash') { circle(dc, f.x, f.y, (f.type === 'boom' ? f.r : 0.5) * (1.4 - a)); dc.stroke(); }
      dc.globalAlpha = 1;
    });
    dc.restore();
    dc.textAlign = 'center'; dc.textBaseline = 'middle';
    b.texts.forEach(function (tx) {
      dc.globalAlpha = Math.min(1, tx.life / tx.max * 1.6);
      dc.font = '900 ' + Math.max(10, sc * (tx.big ? 0.3 : 0.24)) + 'px Nunito, sans-serif';
      dc.lineWidth = 3; dc.strokeStyle = 'rgba(10,8,20,0.85)';
      dc.strokeText(tx.text, ox + tx.x * sc, oy + tx.y * sc); dc.fillStyle = tx.color; dc.fillText(tx.text, ox + tx.x * sc, oy + tx.y * sc);
    });
    dc.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function openOverlay(html) { var o = $('overlay'); o.innerHTML = html; o.hidden = false; }
function closeOverlay() { $('overlay').hidden = true; $('overlay').innerHTML = ''; }

/* Canjear códigos de regalo. */
function showCodes() {
  openOverlay('<div class="modal-card code-modal"><div class="code-ico">🎟️</div><h2>Códigos</h2>' +
    '<p class="lead">Escribe un código de regalo para conseguir oro, gemas o cofres.</p>' +
    '<input id="codeIn" class="code-in" type="text" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CÓDIGO">' +
    '<p class="code-err" id="codeErr" hidden></p>' +
    '<button class="btn btn-green" id="codeOk">Canjear</button><button class="btn btn-ghost" id="codeX">Cerrar</button></div>');
  var inp = $('codeIn');
  setTimeout(function () { try { inp.focus(); } catch (e) {} }, 50);
  function go() {
    var r = redeemCode(inp.value), err = $('codeErr');
    if (r.error) { sfx('no'); buzz(20); err.textContent = r.error; err.hidden = false; return; }
    var extra = [r.gold ? '+' + r.gold + ' 🪙' : '', r.gems ? '+' + r.gems + ' 💎' : ''].filter(Boolean).join(' · ');
    if (r.chest) { showChest(r.chest); if (extra) toast('Además: ' + extra); return; }
    sfx('chest');
    openOverlay('<div class="modal-card chest-modal"><div class="chest-ico" style="--cc:#b48bff">🎟️</div><h2>¡Código canjeado!</h2><p class="gold-big">' + extra + '</p><button class="btn btn-green" id="chestOk">¡Genial!</button></div>');
    $('chestOk').onclick = function () { closeOverlay(); renderMenu(currentScreen); };
  }
  $('codeOk').onclick = go;
  inp.onkeydown = function (e) { if (e.key === 'Enter') go(); };
  $('codeX').onclick = closeOverlay;
}

/* Aviso de legendaria secreta desbloqueada en un cofre. */
function secretHtml(r) {
  if (!r.secret) return '';
  var u = UNITS[r.secret];
  return '<div class="res-unlock secret"><img src="' + unitIcon(r.secret, 0, 96) + '" alt=""><b>¡Legendaria secreta: ' + esc(u.name) + '!</b></div>';
}
/* ---------- apertura del cofre ----------
   Anticipación (el cofre cerrado crece un 20 % y tiembla 0,3 s), cambia al
   abierto con el destello girando detrás, vuelan monedas y la mejor carta sale
   del cofre hacia el centro de la pantalla. Tocar la pantalla lo salta. */
function chestPic(type, open) { return 'assets/chests/' + type + (open ? '-abierto' : '') + '.webp'; }
var chestFxOn = false;
var RARITY_RANK = ['comun', 'rara', 'epica', 'legendaria'];
function bestChestCard(r) {
  if (r.secret) return { id: r.secret, n: 1 };
  var ids = Object.keys(r.cards).sort(function (a, b) {
    return RARITY_RANK.indexOf(UNITS[b].rarity) - RARITY_RANK.indexOf(UNITS[a].rarity) || r.cards[b] - r.cards[a];
  });
  return ids.length ? { id: ids[0], n: r.cards[ids[0]] } : null;
}
// from: imagen del cofre en la tienda; sin ella, el cofre sale en el centro
function showChest(r, from) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { sfx('chest'); chestResult(r); return; }
  chestFxOn = true;
  var open = new Image(); open.src = chestPic(r.type, true);   // precargado para que el cambio no parpadee
  var rect = from && from.getBoundingClientRect();
  if (rect && !rect.width) rect = null;
  var vw = window.innerWidth, vh = window.innerHeight;
  // al abrirse sube al centro de la parte de arriba (en el móvil, desde la tarjeta
  // de la esquina se saldría de la pantalla) y la carta baja al centro
  var size2 = Math.min(vw * 0.42, 170), cx2 = vw / 2, cy2 = Math.max(vh * 0.27, size2 * 0.75);
  var size = rect ? rect.width : size2, cx = rect ? rect.left + rect.width / 2 : cx2, cy = rect ? rect.top + rect.height / 2 : cy2;
  var cardY = Math.min(vh - 125, cy2 + size2 * 0.62 + 115);
  var fx = document.createElement('div');
  fx.className = 'chest-fx';
  fx.style.setProperty('--cc', CHESTS[r.type].color);
  fx.innerHTML = '<div class="cfx-dim"></div>' +
    '<div class="cfx-at" style="left:' + cx + 'px;top:' + cy + 'px;width:' + size + 'px">' +
    '<div class="cfx-rays"><img src="assets/chests/destello.webp" alt=""></div>' +
    '<img class="cfx-chest shake" src="' + chestPic(r.type) + '" alt=""></div>';
  document.body.appendChild(fx);
  if (from) from.style.visibility = 'hidden';
  var chest = fx.querySelector('.cfx-chest'), spot = fx.querySelector('.cfx-at'), timers = [], done = false;
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    fx.classList.add('out');
    setTimeout(function () { fx.remove(); }, 260);
    if (from) from.style.visibility = '';
    chestFxOn = false;
    chestResult(r);
  }
  // el toque que compra no puede saltarse la animación nada más empezar
  var t0 = Date.now();
  fx.onclick = function () { if (Date.now() - t0 > 450) finish(); };
  sfx('tap'); buzz(15);
  at(300, function () {
    chest.src = open.src;
    chest.classList.remove('shake');
    chest.classList.add('opened');
    fx.classList.add('open');
    spot.style.transform = 'translate(-50%, -50%) translate(' + (cx2 - cx) + 'px,' + (cy2 - cy) + 'px) scale(' + size2 / size + ')';
    sfx('chest'); buzz(35);
  });
  at(rect ? 560 : 340, function () { chestCoins(fx, cx2, cy2 - size2 * 0.12, size2); });
  var best = bestChestCard(r);
  if (best) at(rect ? 640 : 460, function () { chestCardOut(fx, best, cx2, cy2, vw / 2, cardY); });
  at(best ? 2000 : 1400, finish);
}
// monedas: salen disparadas del cofre y vuelan al contador de oro (o caen si no se ve)
function chestCoins(fx, x, y, size) {
  var pill = document.querySelector('.menu .pill.gold'), pr = pill && pill.getBoundingClientRect();
  var toPill = pr && pr.width && pr.bottom > 0 && pr.top < window.innerHeight;
  for (var i = 0; i < 16; i++) {
    var c = document.createElement('img');
    c.className = 'cfx-coin';
    c.src = 'assets/chests/moneda.webp';
    c.alt = '';
    c.style.left = x + 'px';
    c.style.top = y + 'px';
    fx.appendChild(c);
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, dist = Math.max(70, size) * (0.8 + Math.random() * 0.9);
    var bx = Math.cos(ang) * dist, by = Math.sin(ang) * dist;
    var ex = toPill ? pr.left + 14 - x : bx * 1.5, ey = toPill ? pr.top + pr.height / 2 - y : by + 260;
    var spin = (Math.random() < 0.5 ? -1 : 1) * (300 + Math.random() * 420);
    var tf = function (tx, ty, s, rot) { return 'translate(-50%,-50%) translate(' + tx + 'px,' + ty + 'px) scale(' + s + ') rotate(' + rot + 'deg)'; };
    c.animate([
      { transform: tf(0, 0, 0.3, 0), opacity: 0 },
      { transform: tf(bx, by, 1, spin * 0.5), opacity: 1, offset: 0.38, easing: 'cubic-bezier(0.5, 0, 0.75, 0.4)' },
      { transform: tf(ex, ey, 0.55, spin), opacity: toPill ? 1 : 0, offset: 0.96 },
      { transform: tf(ex, ey, 0.4, spin), opacity: 0 }
    ], { duration: 1000 + Math.random() * 350, delay: i * 28, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)', fill: 'both' });
  }
}
// la mejor carta del cofre sale de dentro y crece hasta el centro de la pantalla
function chestCardOut(fx, best, x, y, tx, ty) {
  var u = UNITS[best.id], rar = RARITY[u.rarity];
  var el = document.createElement('div');
  el.className = 'cfx-card';
  el.style.setProperty('--rc', rar.color);
  el.innerHTML = '<span class="cfx-rar">' + rar.name + '</span><img src="' + unitIcon(best.id, 0, 160) + '" alt=""><b>' + esc(u.name) + '</b><small>×' + best.n + '</small>';
  fx.appendChild(el);
  var tf = function (tx, ty, s, rot) { return 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%) scale(' + s + ') rotate(' + rot + 'deg)'; };
  el.animate([
    { transform: tf(x, y, 0.12, -14), opacity: 0 },
    { transform: tf(x + (tx - x) * 0.3, y - 30, 0.45, -8), opacity: 1, offset: 0.3 },
    { transform: tf(tx, ty, 1, 0), opacity: 1 }
  ], { duration: 700, easing: 'cubic-bezier(0.25, 1.25, 0.45, 1)', fill: 'both' });
}
function chestResult(r) {
  var ch = CHESTS[r.type];
  var cards = Object.keys(r.cards).map(function (id) {
    return '<div class="chest-card" style="--rc:' + RARITY[UNITS[id].rarity].color + '"><img src="' + unitIcon(id, 0, 96) + '" alt=""><b>×' + r.cards[id] + '</b><small>' + esc(UNITS[id].name) + '</small></div>';
  }).join('');
  openOverlay('<div class="modal-card chest-modal"><div class="chest-pic"><img class="chest-pic-rays" src="assets/chests/destello.webp" alt=""><img class="chest-pic-img" src="' + chestPic(r.type, true) + '" alt=""></div><h2>' + ch.name + '</h2><p class="gold-big">+' + r.gold + ' 🪙' + (r.gems ? ' · +' + r.gems + ' 💎' : '') + '</p>' + secretHtml(r) + '<div class="chest-cards">' + cards + '</div><button class="btn btn-green" id="chestOk">¡Genial!</button></div>');
  $('chestOk').onclick = function () { closeOverlay(); renderMenu(currentScreen === 'battle' ? 'home' : currentScreen); };
}

/* ---------- partida: barra inferior y superior ---------- */
function buildBattleHud() {
  var b = battle;
  var deck = $('deckBar');
  deck.innerHTML = b.player.deck.map(function (id) {
    return '<button class="dcard" data-power="' + id + '" style="--rc:' + UNITS[id].color + '"><img src="' + unitIcon(id, 0, 96) + '" alt=""><span class="dlv" id="dlv_' + id + '">1</span><span class="dcost" id="dcost_' + id + '">100</span></button>';
  }).join('');
  deck.querySelectorAll('[data-power]').forEach(function (btn) {
    btn.onclick = function () {
      var r = b.player.powerUp(btn.dataset.power);
      if (r === 'ok') { sfx('power'); buzz(20); toast(UNITS[btn.dataset.power].name + ' mejorada a ' + b.player.power[btn.dataset.power]); }
      else if (r === 'mana') { sfx('no'); toast('Necesitas ' + POWER_COSTS[b.player.power[btn.dataset.power]] + ' 💧'); }
      else toast('Mejora máxima');
      updateHud(true);
    };
  });
  var c = COMMANDERS[b.player.commander];
  $('cmdBtn').style.setProperty('--cc', c.color);
  $('cmdIco').innerHTML = '<img src="' + c.pic + '" alt="' + esc(c.name) + '"><i>' + c.icon + '</i>';
  $('cmdBtn').title = c.ability + ': ' + c.desc;
  $('unitInfo').hidden = true;
  updateHud(true);
}
var _hud = {};
function setTxt(id, v) { if (_hud[id] === v) return; _hud[id] = v; var e = $(id); if (e) e.textContent = v; }
function setHtml(id, v) { if (_hud[id] === v) return; _hud[id] = v; var e = $(id); if (e) e.innerHTML = v; }
var MANA_ICO = '<img class="mi" src="assets/ui/mana.webp" alt="maná">';
function heartsHtml(l) {
  var s = '';
  for (var i = 0; i < l.max; i++) s += '<img class="heart' + (i < l.v ? '' : ' lost') + '" src="assets/ui/vida.webp" alt="">';
  return s;
}
function updateHud(force) {
  var b = battle;
  if (!b) return;
  if (force) _hud = {};
  var p = b.player;
  setTxt('bMana', Math.floor(p.mana));
  setHtml('summonCost', p.summonCost + ' ' + MANA_ICO);
  $('summonBtn').classList.toggle('poor', p.mana < p.summonCost || !p.freeCells().length);
  setTxt('bWave', b.wave ? 'Oleada ' + b.wave + (b.maxWaves !== Infinity ? '/' + b.maxWaves : '') : 'Preparando…');
  setHtml('bEvent', b.event ? '<img src="' + b.event.pic + '" alt="">' + esc(b.event.name) : '');
  $('bEvent').hidden = !b.event;
  setHtml('bLives', heartsHtml(p.lives));
  $('bLivesBox').title = (b.mode === 'coop' ? 'Vidas compartidas: ' : 'Tus vidas: ') + p.lives.v;
  p.deck.forEach(function (id) {
    var lv = p.power[id] || 1;
    setTxt('dlv_' + id, String(lv));
    setHtml('dcost_' + id, lv >= POWER_MAX ? 'MÁX' : POWER_COSTS[lv] + MANA_ICO);
    var el = document.querySelector('[data-power="' + id + '"]');
    if (el) el.classList.toggle('poor', lv >= POWER_MAX || p.mana < POWER_COSTS[lv]);
  });
  var cb = $('cmdBtn');
  cb.style.setProperty('--charge', (p.charge * 360) + 'deg');
  cb.classList.toggle('ready', p.charge >= 1);
  setTxt('bSpeed', 'x' + b.speed);
}
function refreshUnitInfo() {
  var b = battle, box = $('unitInfo');
  var i = b.selected;
  if (i == null || !b.player.cells[i]) { box.hidden = true; return; }
  var u = b.player.cells[i], d = UNITS[u.id];
  var aff = b.player.affinity(i);
  var bits = [];
  if (d.dmg) bits.push('⚔️ ' + fmtNum(b.player.unitDamage(i)) + ' por golpe');
  if (d.manaGen) bits.push('💧 +' + Math.round(d.manaGen.amount * u.rank * (1 + 0.25 * ((b.player.power[u.id] || 1) - 1))) + ' cada ' + d.manaGen.every + ' s');
  if (d.buff) bits.push('🎵 +' + Math.round(d.buff.speed * u.rank * 100) + '% vel. a vecinas');
  if (aff) bits.push(ELEMENTS[d.element].icon + ' Afinidad +' + Math.round(aff * AFFINITY_BONUS * 100) + '%');
  if (b.player.tiles[i]) bits.push(TILES[b.player.tiles[i]].icon + ' ' + TILES[b.player.tiles[i]].name);
  box.innerHTML = '<img src="' + unitIcon(u.id, u.rank, 72) + '" alt=""><div><b>' + esc(d.name) + ' · Rango ' + u.rank + '</b><small>' + esc(d.role) + ' · ' + bits.join(' · ') + '</small><small class="hint">Toca otra igual para fusionar o una casilla vacía para moverla</small></div>';
  box.hidden = false;
}
var bannerTimer = null;
function showBanner(title, sub, pic) {
  var el = $('banner');
  el.innerHTML = (pic ? '<img class="banner-pic" src="' + pic + '" alt="">' : '') + '<b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function showResult(res) {
  var title = res.mode === 'coop' ? (res.won ? '¡Gran defensa!' : 'Fin de la partida') : res.won ? '¡Victoria!' : 'Derrota';
  var stars = res.mode === 'campaign' && res.won ? '<div class="res-stars">' + '★★★'.slice(0, res.stars).padEnd(3, '☆') + '</div>' : '';
  var chest = res.chestResult ? '<div class="res-chest">🎁 ' + CHESTS[res.chestResult.type].name + ': +' + res.chestResult.gold + ' 🪙 y ' + Object.keys(res.chestResult.cards).reduce(function (s, k) { return s + res.chestResult.cards[k]; }, 0) + ' cartas</div>' + secretHtml(res.chestResult) : '';
  var unlock = res.unlocked ? '<div class="res-unlock"><img src="' + unitIcon(res.unlocked, 0, 96) + '" alt=""><b>¡Nueva tropa: ' + esc(UNITS[res.unlocked].name) + '!</b></div>' : '';
  openOverlay('<div class="modal-card result ' + (res.won ? 'win' : 'lose') + '"><div class="res-emoji">' + (res.won ? '🏆' : '💀') + '</div><h2>' + title + '</h2>' + stars +
    '<p>' + res.lines.map(esc).join('<br>') + '</p>' +
    '<p class="res-gold">+' + res.gold + ' 🪙' + (res.gems ? ' · +' + res.gems + ' 💎' : '') + (res.trophies ? ' · ' + (res.trophies > 0 ? '+' : '') + res.trophies + ' 🏆' : '') + '</p>' + chest + unlock +
    '<p class="muted">Bajas ' + res.kills + ' · Daño ' + fmtNum(res.damage) + '</p>' +
    '<button class="btn btn-green" id="resAgain">' + (res.mode === 'campaign' && res.won && battle.stage.id < 15 ? 'Siguiente fase ▶' : 'Otra vez') + '</button>' +
    '<button class="btn btn-ghost" id="resMenu">Menú</button></div>');
  $('resAgain').onclick = function () {
    closeOverlay();
    var b = battle;
    if (b.mode === 'campaign') startBattle('campaign', { stage: res.won && b.stage.id < 15 ? b.stage.id + 1 : b.stage.id });
    else startBattle(b.mode, b.opts);
  };
  $('resMenu').onclick = function () { closeOverlay(); battle = null; showScreen(res.mode === 'campaign' ? 'campaign' : 'home'); };
}
function fmtTime(sec) { sec = Math.floor(sec); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
function confirmQuit() {
  if (!battle || battle.ended) return;
  if (battle.paused && $('pauseCard')) { resumeBattle(); return; }
  battle.paused = true;
  sfx('tap');
  var b = battle, p = b.player;
  var where = b.mode === 'campaign' ? '🗺️ Fase ' + b.stage.id + ' · ' + esc(b.stage.name)
    : b.mode === 'duel' ? '⚔️ Duelo contra ' + esc(b.other.name) : '🤝 Con ' + esc(b.other.name) + ' contra la horda';
  var wave = b.wave ? b.wave + (b.maxWaves !== Infinity ? '<small>/' + b.maxWaves + '</small>' : '') : '—';
  var prog = b.maxWaves !== Infinity ? Math.min(1, b.wave / b.maxWaves) : 0;
  function stat(ico, val, lbl) { return '<div class="ps-stat"><i>' + ico + '</i><b>' + val + '</b><small>' + lbl + '</small></div>'; }
  openOverlay('<div class="pause-wrap"><div class="pause-rays"></div>' +
    '<div class="modal-card pause-card" id="pauseCard" role="dialog" aria-labelledby="pauseTitle">' +
    '<div class="pause-medal"><span></span><span></span></div>' +
    '<div class="pause-ribbon"><h2 id="pauseTitle">Pausa</h2></div>' +
    '<p class="pause-where">' + where + '</p>' +
    (b.maxWaves !== Infinity ? '<div class="pause-prog" title="Progreso de la fase"><i style="width:' + (prog * 100) + '%"></i></div>' : '') +
    '<div class="pause-stats">' +
      stat('🌊', wave, 'Oleada') +
      stat('💀', fmtNum(p.kills), 'Bajas') +
      stat('⏱️', fmtTime(b.time), 'Tiempo') +
      stat(MANA_ICO, Math.floor(p.mana), 'Maná') +
    '</div>' +
    '<div class="pause-lives">' + heartsHtml(p.lives) + '<small>' + (b.mode === 'coop' ? 'Vidas compartidas' : 'Vidas') + '</small></div>' +
    '<div class="pause-opts">' +
      '<button class="pause-opt' + (meta.settings.sound ? ' on' : '') + '" id="pSound"><i>' + (meta.settings.sound ? '🔊' : '🔇') + '</i>Sonido</button>' +
      '<button class="pause-opt on" id="pSpeed"><i>⏩</i>Velocidad <b>x' + b.speed + '</b></button>' +
    '</div>' +
    '<button class="btn btn-green pause-resume" id="qResume">▶ Seguir jugando</button>' +
    '<div class="pause-row">' +
      '<button class="btn btn-ghost" id="qRestart">↻ Reiniciar</button>' +
      '<button class="btn btn-red" id="qQuit">🏠 Salir</button>' +
    '</div>' +
    '<p class="pause-confirm" id="qConfirm" hidden></p>' +
    '</div></div>');
  $('qResume').onclick = resumeBattle;
  $('pSound').onclick = function () {
    meta.settings.sound = !meta.settings.sound; saveMeta();
    this.classList.toggle('on', meta.settings.sound);
    this.querySelector('i').textContent = meta.settings.sound ? '🔊' : '🔇';
    sfx('tap');
  };
  $('pSpeed').onclick = function () {
    b.speed = b.speed === 1 ? 2 : b.speed === 2 ? 3 : 1;
    this.querySelector('b').textContent = 'x' + b.speed;
    updateHud(); sfx('tap');
  };
  // reiniciar y salir piden un segundo toque para no perder la partida sin querer
  var armed = null;
  function arm(btn, msg, act) {
    if (armed === btn.id) { act(); return; }
    armed = btn.id;
    ['qRestart', 'qQuit'].forEach(function (id) { $(id).classList.toggle('armed', id === btn.id); });
    var c = $('qConfirm'); c.textContent = msg; c.hidden = false;
    c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
    sfx('no'); buzz(20);
  }
  $('qRestart').onclick = function () {
    arm(this, 'Toca otra vez para empezar de nuevo', function () {
      closeOverlay(); b.ended = true;
      startBattle(b.mode, b.mode === 'campaign' ? { stage: b.stage.id } : b.opts);
    });
  };
  $('qQuit').onclick = function () {
    arm(this, 'Toca otra vez para salir: perderás esta partida', function () {
      closeOverlay(); b.ended = true; battle = null; showScreen('home');
    });
  };
}
function resumeBattle() {
  if (!battle) return;
  closeOverlay(); battle.paused = false; sfx('tap');
}

/* ---------- bucle ---------- */
var lastT = 0;
function loop(t) {
  var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
  lastT = t;
  if (battle && currentScreen === 'battle') {
    if (!battle.paused && !battle.ended) {
      for (var s = 0; s < battle.speed; s++) updateBattle(dt);
    }
    if (battle) { drawBattle(t); updateHud(false); }
  }
  requestAnimationFrame(loop);
}

window.onArtReady = function () {
  if (imgReadyCount >= 14 && currentScreen !== 'battle') renderMenu(currentScreen);
};
function initGame() {
  canvas = $('cv');
  ctx = canvas.getContext('2d');
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', function () { if (battle) battle.drag = null; });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', resizeCanvas);
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe($('arena'));
  $('summonBtn').onclick = function () {
    if (!battle) return;
    var r = battle.player.summon();
    if (r === 'ok') { sfx('summon'); buzz(15); }
    else if (r === 'mana') { sfx('no'); toast('Necesitas ' + battle.player.summonCost + ' 💧'); }
    else { sfx('no'); toast('Tablero lleno: fusiona tropas'); }
    updateHud();
  };
  $('cmdBtn').onclick = function () {
    if (!battle) return;
    if (battle.player.useCommander()) { sfx('cmd'); buzz(60); toast(COMMANDERS[battle.player.commander].ability + '!'); }
    else toast('El comandante aún se está cargando');
  };
  $('bSpeed').onclick = function () { if (battle) { battle.speed = battle.speed === 1 ? 2 : battle.speed === 2 ? 3 : 1; updateHud(); } };
  $('bQuit').onclick = confirmQuit;
  $('overlay').addEventListener('click', function (e) { if (e.target === this && !(battle && !battle.ended && battle.paused === false)) { /* los modales se cierran con sus botones */ } });
  document.addEventListener('visibilitychange', function () { if (document.hidden && battle && !battle.ended && !battle.paused) confirmQuit(); });
  document.addEventListener('keydown', function (e) {
    if (!battle || currentScreen !== 'battle') return;
    if (e.key === ' ') { e.preventDefault(); $('summonBtn').click(); }
    else if (e.key === 'q') $('cmdBtn').click();
    else if (e.key === 'Escape') confirmQuit();
    else if (e.key >= '1' && e.key <= '5') { var b = document.querySelectorAll('.dcard')[+e.key - 1]; if (b) b.click(); }
  });
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.onclick = function () {
      if (b.dataset.tab === 'teams') { sfx('no'); toast('Equipos llegará pronto'); return; }
      sfx('tap'); closeOverlay(); showScreen(b.dataset.tab);
    };
  });
  showScreen('home');
  requestAnimationFrame(loop);
}
document.addEventListener('DOMContentLoaded', initGame);
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  // si llega una versión nueva del juego, recarga una vez para estrenarla
  var hadSW = !!navigator.serviceWorker.controller, reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadSW || reloaded || (typeof battle !== 'undefined' && battle && !battle.ended)) return;
    reloaded = true; location.reload();
  });
}
