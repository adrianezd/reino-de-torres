'use strict';
/* =========================================================
   INTERFAZ: menús, controles de la partida, sonido y bucle
   ========================================================= */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
/* Iconos ilustrados (assets/icons) en lugar de los emojis del sistema: se
   cambian en todo el HTML de menús, modales, avisos y marcador. */
var ICON_FILES = { '🪙': 'icons/moneda', '💎': 'icons/gema', '🏆': 'icons/trofeo', '⭐': 'icons/estrella', '👑': 'icons/corona', '🔒': 'icons/candado',
  '⏱': 'icons/reloj', '⏳': 'icons/reloj', '🎟': 'icons/ticket', '❓': 'icons/pergamino', '⚔': 'icons/espadas', '💧': 'icons/gota', '🎁': 'chests/madera',
  '🗺': 'icons/estrella', '🤝': 'icons/escudo', '🌑': 'events/eclipse', '🌧': 'events/lluvia', '🌫': 'events/niebla', '👹': 'events/horda', '🍃': 'events/calma',
  // elementos, rasgos, estadísticas, rivales, pausa y tutorial (assets/set-icons-2.jpg)
  '🔥': 'icons/fuego', '❄': 'icons/hielo', '🌿': 'icons/hoja', '🔮': 'icons/arcano', '⚙': 'icons/engranaje', '💥': 'icons/explosion', '☠': 'icons/veneno',
  '⚡': 'icons/rayo', '🗡': 'icons/critico', '🛡': 'icons/perfora', '🎵': 'icons/musica', '🎯': 'icons/diana', '📈': 'icons/grafico', '📍': 'icons/vecinas',
  '✨': 'icons/chispas', '💀': 'icons/calavera', '🌊': 'icons/ola', '🙂': 'icons/rival-facil', '😠': 'icons/rival-normal', '😈': 'icons/rival-dificil',
  '🔊': 'icons/sonido', '🔇': 'icons/silencio', '⏩': 'icons/rapido', '↻': 'icons/reiniciar', '🏠': 'icons/casa', '⚠': 'icons/aviso', '👇': 'icons/mano',
  '🎲': 'icons/dado', '↔': 'icons/recolocar', '⬆': 'icons/mejorar' };
var ICON_RE = new RegExp('(' + Object.keys(ICON_FILES).join('|') + ')️?', 'g');
// tres estrellas de fase: las que no se han ganado, apagadas
function starRow(n) { var s = ''; for (var i = 0; i < 3; i++) s += '<x-ico class="' + (i < n ? '' : 'off') + '" style="background-image:url(assets/icons/estrella.webp)"></x-ico>'; return s; }
// etiqueta propia con la imagen de fondo: así no le afectan las reglas de
// «img», «span» o «i» de los sitios donde cae (precios, huecos, cartas…)
function ico(name) { return '<x-ico style="background-image:url(assets/' + name + '.webp)"></x-ico>'; }
function icons(html) { return String(html).replace(ICON_RE, function (m, e) { return ico(ICON_FILES[e]); }); }

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
  var t = $('toast'); t.innerHTML = icons(esc(msg)); t.classList.add('show');
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
// centro de cada aro del banner del mazo (assets/ui/banner-mazo.webp), en % del ancho
var DECK_RINGS = [13.66, 31.83, 49.95, 68.06, 86.24];
function topBar() {
  return '<div class="res-bar"><span class="pill gold">🪙 <b>' + meta.gold + '</b></span><span class="pill gem">💎 <b>' + meta.gems + '</b></span><span class="pill trophy">🏆 <b>' + meta.trophies + '</b></span><span class="pill star">⭐ <b>' + totalStars() + '</b></span></div>';
}
function renderMenu(name, arg) {
  var m = $('menu');
  var html = '';
  if (name === 'home') {
    var free = freeChestReady(), cmd = COMMANDERS[meta.commander];
    var side = function (go, pic, label, cls) { return '<button class="side-btn ' + (cls || '') + '" data-go="' + go + '"><img src="assets/' + pic + '.webp" alt=""><span>' + label + '</span></button>'; };
    html = topBar() +
      // título con los atajos a los lados, como las ofertas del género
      '<div class="home-top">' +
      '<div class="side-col">' + side('freeChest', 'chests/madera', freeChestLabel(), free ? 'glow' : '') + side('codes', 'icons/ticket', 'Códigos') + '</div>' +
      '<div class="logo"><h1><img src="assets/ui/titulo.webp" alt="Reino de Torres"></h1></div>' +
      '<div class="side-col">' + side('howto', 'icons/pergamino', 'Ayuda') + side('options', 'icons/engranaje', 'Opciones') + '</div>' +
      '</div>' +
      // mazo: banner del comandante (figura a la izquierda, nombre en el hueco)
      // y debajo las cinco tropas, cada retrato en un aro del banner
      '<div class="deck-panel">' +
      '<button class="cmd-banner" data-go="commanders" style="--cc:' + cmd.color + '"><img src="assets/commanders/' + meta.commander + '-cuerpo.webp" alt=""><span class="cb-txt"><small>Habilidad</small><b>' + esc(cmd.ability) + '</b></span><span class="cb-slot">' + esc(cmd.name) + '</span></button>' +
      '<button class="deck-preview" data-go="collection" aria-label="Mazo actual">' + meta.deck.map(function (id, i) { return '<img src="' + unitIcon(id, 0, 96) + '" alt="' + esc(UNITS[id].name) + '" style="left:' + DECK_RINGS[i] + '%">'; }).join('') + '</button>' +
      '</div>' +
      // tres botones de jugar: duelo, campaña (lista de fases) y cooperativo
      '<div class="play-row">' +
      '<button class="play-side" data-go="duelPick"><img src="assets/ui/boton-duelo.webp" alt=""><span>1 contra 1</span></button>' +
      '<div class="play-mid"><button class="play-hero" data-go="campaign" aria-label="Campaña"><img src="assets/ui/boton-jugar.webp" alt=""></button>' +
      '<button class="play-camp" data-go="campaign">Campaña <small>' + totalStars() + '/' + CAMPAIGN.length * 3 + ' ⭐</small></button></div>' +
      '<button class="play-side" data-go="coop"><img src="assets/ui/boton-coop.webp" alt=""><span>2 contra IA</span></button>' +
      '</div>' +
      // huecos de cofre abajo del todo, debajo de los botones de jugar
      '<div class="slots" id="chestSlots">' + slotsInner() + '</div>';
  } else if (name === 'campaign') {
    // placas de madera con el color de su zona; la siguiente por jugar late
    var nextSt = CAMPAIGN.filter(function (st) { return stageUnlocked(st.id) && !meta.campaign[st.id]; })[0];
    html = backBar('Campaña') + '<div class="stage-list">' + CAMPAIGN.map(function (st) {
      var open = stageUnlocked(st.id), stars = meta.campaign[st.id] || 0;
      return '<button class="stage ' + (open ? '' : 'locked') + (nextSt === st ? ' next' : '') + '" style="--zc:' + (ZONE_COLOR[st.biome] || '#ffd166') + '" ' + (open ? 'data-stage="' + st.id + '"' : 'disabled') + '>' +
        '<span class="stage-n">' + st.id + '</span>' +
        '<span class="stage-t"><b>' + esc(st.name) + '</b><small>' + st.waves + ' oleadas · Jefe: ' + esc(BOSSES[st.boss].name) + '</small></span>' +
        '<span class="stage-s">' + (open ? starRow(stars) : '🔒') + '</span></button>';
    }).join('') + '</div>';
  } else if (name === 'duelPick') {
    html = backBar('Duelo 1 contra 1') +
      '<p class="lead">Los dos recibís los mismos monstruos. Cada uno que se escapa te quita un corazón (el jefe, dos). Gana quien aguante más.</p>' +
      ['Fácil', 'Normal', 'Difícil'].map(function (n, i) {
        return '<button class="big-choice d' + i + '" data-duel="' + i + '"><span><b>' + ['🙂', '😠', '😈'][i] + ' Rival ' + n + '</b><small>' + rivalCardsText(DUEL_CARD_OFFSET[i]) + '</small><small>Premio: ' + (25 + i * 5) + ' 🏆 · ' + (60 + i * 40) + ' 🪙 · cofre de ' + (i >= 2 ? 'oro' : 'plata') + '</small></span></button>';
      }).join('') +
      '<p class="muted">Victorias ' + meta.duelWins + ' · Derrotas ' + meta.duelLosses + '</p>';
  } else if (name === 'collection') {
    html = backBar('Mazo', true) + deckTabs('collection') +
      '<p class="lead">Tu mazo (5 tropas). Toca una carta para verla, cambiarla o mejorarla.</p>' +
      '<div class="deck-slots">' + meta.deck.map(function (id) { return cardHtml(id, true); }).join('') + '</div>' +
      '<div class="coll-head"><h3>Colección</h3>' + sortSwitch() + '</div>' +
      (collSort === 'tipo' ? elementFilters() : rarityFilters()) + collectionGrid() +
      '<div class="legend"><b>Afinidad:</b> ' + Object.keys(ELEMENTS).map(function (k) { return ELEMENTS[k].icon + ' ' + ELEMENTS[k].name; }).join(' · ') + '. Dos tropas del mismo elemento juntas se potencian.</div>';
  } else if (name === 'commanders') {
    // tarjetas con el comandante de cuerpo entero; en los medallones de abajo
    // se enciende el suyo. Debajo, la habilidad del elegido con su efecto.
    var cs = COMMANDERS[meta.commander];
    html = backBar('Mazo', true) + deckTabs('commanders') + '<p class="lead">Su habilidad se carga durante la partida. Pulsa su retrato para usarla.</p>' +
      '<div class="cmd-cards">' + COMMANDER_ORDER.map(function (k, i) {
        var c = COMMANDERS[k];
        return '<button class="cmd-card' + (meta.commander === k ? ' sel' : '') + '" data-cmd="' + k + '" style="--cc:' + c.color + '" aria-label="' + esc(c.name) + '">' +
          '<img class="cmd-body" src="assets/commanders/' + k + '-cuerpo.webp" alt=""><span class="cmd-frame"></span><b>' + esc(c.name) + '</b>' +
          COMMANDER_ORDER.map(function (o, j) { return j === i ? '' : '<i class="cmd-dim" style="left:' + [26, 50.8, 75.8][j] + '%"></i>'; }).join('') + '</button>';
      }).join('') + '</div>' +
      '<div class="cmd-detail" style="--cc:' + cs.color + '"><img src="assets/fx/' + CMD_FX[meta.commander] + '.webp" alt=""><div><b>' + esc(cs.name) + ' · ' + esc(cs.title) + '</b>' +
      '<small><em>' + esc(cs.ability) + ':</em> ' + esc(cs.desc) + '</small><small>' + ico('icons/reloj') + ' Se carga en ' + cs.cd + ' s</small></div></div>';
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
  m.innerHTML = icons(html);
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
    return '<button class="sh-offer r-' + u.rarity + (sold ? ' sold' : '') + (o.cur === 'gems' ? ' gemmy' : '') + '" data-offer="' + o.i + '" style="--rc:' + RARITY[u.rarity].color + '"' + (sold ? ' disabled' : '') + '>' +
      '<span class="sh-rar">' + RARITY[u.rarity].name + '</span>' +
      (!sold && !meta.cards[o.id] ? '<span class="sh-new">Nueva</span>' : '') +
      '<img src="' + unitIcon(o.id, 0, 112) + '" alt="">' +
      '<b>' + esc(u.name) + '</b><span class="sh-n">×' + o.n + ' cartas</span>' +
      (sold ? '<span class="sh-price sold">Comprada</span>' : price(o.cur, o.price, poor)) + '</button>';
  }).join('');
  var chests = CHEST_ORDER.map(function (k) {
    var ch = CHESTS[k];
    return '<button class="sh-chest" data-buychest="' + k + '" style="--cc:' + ch.color + '"><img class="sh-chest-pic" src="' + chestPic(k) + '" alt=""><b>' + k.charAt(0).toUpperCase() + k.slice(1) + '</b>' + price('gems', ch.price, meta.gems < ch.price) + '</button>';
  }).join('');
  var golds = SHOP_GOLD.map(function (p, i) {
    return '<button class="sh-gold" data-buygold="' + i + '"><img class="sh-gold-pic" src="assets/chests/oro-' + ['monedas', 'saco', 'rebosante'][i] + '.webp" alt=""><b>' + p.gold + ' 🪙</b>' + price('gems', p.gems, meta.gems < p.gems) + '</button>';
  }).join('');
  return '<div class="sh-head"><h3>Ofertas del día</h3><small>Cambian en ' + left + ' h</small></div>' +
    '<div class="sh-offers">' + (offers || '<p class="muted">Desbloquea tropas para ver ofertas</p>') + '</div>' +
    '<div class="sh-head"><h3>Cofres</h3><small>También dan gemas</small></div><div class="sh-chests">' + chests + '</div>' +
    '<div class="sh-head"><h3>Oro</h3></div><div class="sh-golds">' + golds + '</div>' +
    '<p class="muted">💎 Ganas gemas en los cofres, con cada estrella nueva de la campaña, al ganar duelos y en el cooperativo.</p>';
}
function rivalCardsText(off) {
  if (!off) return 'Cartas a tu nivel';
  return 'Cartas ' + Math.abs(off) + (Math.abs(off) === 1 ? ' nivel ' : ' niveles ') + (off < 0 ? 'por debajo' : 'por encima') + ' de las tuyas';
}
// efecto ilustrado de la habilidad de cada comandante (assets/fx)
var CMD_FX = { aria: 'ventisca', merlo: 'marea', brann: 'meteoro' };
// Pestañas dentro de Mazo: tropas y comandante.
function deckTabs(on) {
  return '<div class="sub-tabs"><button data-go="collection" class="' + (on === 'collection' ? 'on' : '') + '">Tropas</button>' +
    '<button data-go="commanders" class="' + (on === 'commanders' ? 'on' : '') + '">👑 Comandante</button></div>';
}
// tab: pantalla de la barra de abajo, sin botón de volver
function backBar(title, tab) { return '<div class="back-bar">' + (tab ? '' : '<button class="back" data-go="home">‹</button>') + '<h2>' + title + '</h2>' + '<span class="pill gold">🪙 <b>' + meta.gold + '</b></span><span class="pill gem">💎 <b>' + meta.gems + '</b></span></div>'; }
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
// color de cada zona de la campaña (franja de su placa)
var ZONE_COLOR = { prado: '#7fd84a', bosque: '#3fbf6a', hielo: '#7fd6ff', pantano: '#a8e04a', ruinas: '#d8c08a', desierto: '#ffb347', volcan: '#ff6a2a', cripta: '#b98cff' };
/* Orden de la colección: por rareza (con su filtro) o por tipo, es decir,
   por elemento, cada uno con su símbolo y agrupado bajo su cabecera. */
var collSort = 'rareza', collEl = 'all';
var RARITY_ORDER = Object.keys(RARITY);
function sortSwitch() {
  return '<div class="sort-sw"><small>Ordenar</small>' + [['rareza', 'Rareza'], ['tipo', 'Tipo']].map(function (s) {
    return '<button class="' + (collSort === s[0] ? 'on' : '') + '" data-sort="' + s[0] + '">' + s[1] + '</button>';
  }).join('') + '</div>';
}
function elementFilters() {
  var keys = ['all'].concat(Object.keys(ELEMENTS));
  return '<div class="rar-filters el-filters">' + keys.map(function (k) {
    var ids = UNIT_ORDER.filter(function (id) { return k === 'all' || UNITS[id].element === k; });
    return '<button class="rar-f' + (collEl === k ? ' on' : '') + '" data-ef="' + k + '" style="--rc:' + (k === 'all' ? '#ffd166' : ELEMENTS[k].color) + '">' +
      (k === 'all' ? 'Todos' : '<span class="ef-ico">' + ELEMENTS[k].icon + '</span>' + ELEMENTS[k].name) +
      '<small>' + ids.filter(isUnlocked).length + '/' + ids.length + '</small></button>';
  }).join('') + '</div>';
}
function collectionGrid() {
  var card = function (id) { return cardHtml(id, meta.deck.indexOf(id) !== -1, true); };
  // las que tienes primero; las no encontradas, debajo (sin cambiar el orden dentro de cada grupo)
  var ownedFirst = function (ids) { return ids.filter(isUnlocked).concat(ids.filter(function (id) { return !isUnlocked(id); })); };
  // de común a legendaria, con la mítica antes que la legendaria (orden de RARITY)
  var byRar = function (a, b) { return RARITY_ORDER.indexOf(UNITS[a].rarity) - RARITY_ORDER.indexOf(UNITS[b].rarity) || UNIT_ORDER.indexOf(a) - UNIT_ORDER.indexOf(b); };
  if (collSort !== 'tipo') {
    var ids = ownedFirst(UNIT_ORDER.filter(function (id) { return collFilter === 'all' || UNITS[id].rarity === collFilter; }).sort(byRar));
    return '<div class="card-grid">' + (ids.map(card).join('') || '<p class="muted coll-empty">No hay tropas de esta rareza</p>') + '</div>';
  }
  // por tipo: dentro de cada elemento, por rareza
  return Object.keys(ELEMENTS).filter(function (k) { return collEl === 'all' || collEl === k; }).map(function (k) {
    var ids = ownedFirst(UNIT_ORDER.filter(function (id) { return UNITS[id].element === k; }).sort(byRar));
    return '<h4 class="el-head" style="--ec:' + ELEMENTS[k].color + '"><span class="ef-ico">' + ELEMENTS[k].icon + '</span>' + ELEMENTS[k].name + '<small>' + ids.filter(isUnlocked).length + '/' + ids.length + '</small></h4>' +
      '<div class="card-grid">' + ids.map(card).join('') + '</div>';
  }).join('');
}
// inColl: carta de la colección, que marca las que ya están en el mazo
function cardHtml(id, inDeck, inColl) {
  var u = UNITS[id], c = meta.cards[id];
  if (!c) {
    // aún no la tienes: solo sale en cofres (y en la tienda)
    return '<button class="ucard locked" data-card="' + id + '" style="--rc:' + RARITY[u.rarity].color + '">' +
      '<span class="uel">' + ELEMENTS[u.element].icon + '</span>' +
      '<span class="uport"><img src="' + unitIcon(id, 0, 128) + '" alt=""><i class="ulock">🔒</i></span>' +
      '<div class="ulv ulv-lock">No encontrado</div>' +
      '<small>' + esc(u.name) + '</small></button>';
  }
  var need = cardsNeeded(c.lv), pct = c.lv >= CARD_MAX ? 100 : Math.min(100, c.n / need * 100);
  var ready = canUpgradeCard(id);
  return '<button class="ucard r-' + u.rarity + (ready ? ' ready' : '') + '" data-card="' + id + '" style="--rc:' + RARITY[u.rarity].color + '">' +
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
      if (g === 'codes') { showCodes(); return; }
      if (g === 'options') { showOptions(); return; }
      if (g === 'freeChest') { var r = claimFreeChest(); if (r) showChest(r); else toast('⏱ Otro cofre gratis en ' + fmtDur(freeChestLeft())); return; }
      showScreen(g);
    };
  });
  m.querySelectorAll('[data-stage]').forEach(function (b) { b.onclick = function () { startBattle('campaign', { stage: +b.dataset.stage }); }; });
  m.querySelectorAll('[data-duel]').forEach(function (b) { b.onclick = function () { startBattle('duel', { level: +b.dataset.duel }); }; });
  m.querySelectorAll('[data-cmd]').forEach(function (b) { b.onclick = function () { meta.commander = b.dataset.cmd; saveMeta(); sfx('tap'); renderMenu('commanders'); }; });
  m.querySelectorAll('[data-rf]').forEach(function (b) { b.onclick = function () { collFilter = b.dataset.rf; sfx('tap'); renderMenu('collection'); }; });
  m.querySelectorAll('[data-ef]').forEach(function (b) { b.onclick = function () { collEl = b.dataset.ef; sfx('tap'); renderMenu('collection'); }; });
  m.querySelectorAll('[data-sort]').forEach(function (b) { b.onclick = function () { collSort = b.dataset.sort; sfx('tap'); renderMenu('collection'); }; });
  m.querySelectorAll('[data-card]').forEach(function (b) { b.onclick = function () { sfx('tap'); showCardModal(b.dataset.card); }; });
  m.querySelectorAll('[data-offer]').forEach(function (b) {
    b.onclick = function () {
      var o = shopOffers()[+b.dataset.offer], r = buyOffer(+b.dataset.offer);
      if (r === 'ok') { sfx('power'); buzz(20); toast('+' + o.n + ' cartas de ' + UNITS[o.id].name); renderMenu('shop'); }
      else if (r === 'new') { sfx('chest'); buzz(30); toast('¡Tropa nueva: ' + UNITS[o.id].name + '!'); renderMenu('shop'); }
      else if (r === 'poor') { sfx('no'); toast(o.cur === 'gems' ? 'Te faltan gemas' : 'Te falta oro'); }
    };
  });
  m.querySelectorAll('[data-buychest]').forEach(function (b) {
    b.onclick = function () {
      if (chestFxOn) return;
      sfx('tap');
      showChestInfo(b.dataset.buychest);
    };
  });
  m.querySelectorAll('[data-buygold]').forEach(function (b) {
    b.onclick = function () {
      if (buyGold(+b.dataset.buygold)) { sfx('chest'); toast('+' + SHOP_GOLD[+b.dataset.buygold].gold + ' 🪙'); renderMenu('shop'); }
      else { sfx('no'); toast('Te faltan gemas'); }
    };
  });
  var cs = $('chestSlots');
  if (cs) cs.onclick = function (e) { var b = e.target.closest('[data-slot]'); if (b) slotTap(+b.dataset.slot, b); };
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
  if (u.bounty) t.push(['💧', 'Botín', '+' + u.bounty + ' maná por baja']);
  if (u.buff) t.push(['🎵', 'Ritmo', '+' + Math.round(u.buff.speed * 100) + '% vecinas']);
  if (u.twin) t.push(['📍', 'Gemelas', '+' + Math.round(u.twin * 100) + '% por cada igual al lado']);
  if (u.mixed) t.push(['📍', 'Variedad', '+' + Math.round(u.mixed * 100) + '% por cada vecina distinta']);
  if (u.edge) t.push(['📍', 'Borde', '+' + Math.round(u.edge * 100) + '% en las casillas de fuera']);
  if (u.lone) t.push(['📍', 'Solitaria', '+' + Math.round(u.lone * 100) + '% sin tropas al lado']);
  if (u.execute) t.push(['💀', 'Remate', 'Bajo el ' + Math.round(u.execute * 100) + '% cae al instante']);
  if (u.dmg) t.push(['🎯', 'Objetivo', u.target === 'strong' ? 'El más fuerte' : 'El primero']);
  return t;
}
// Cómo se consigue una tropa que aún no tienes.
function unitSources(id) {
  var u = UNITS[id], out = [];
  if (u.chestOnly) out.push('🎁 Solo sale en el cofre de oro');
  else if (u.rarity === 'legendaria') out.push('🎁 También puede salir en el cofre de oro');
  else out.push('🎁 Puede salir en los cofres y en las ofertas de la tienda');
  return out;
}
// Pestañas de la ficha de tropa: primero el vídeo (mini partida) y luego las stats.
function ucTabs(id, statsHtml, tab) {
  var u = UNITS[id], on = tab === 'stats' ? 'stats' : 'video';
  return '<div class="uc-tabs"><button data-uct="video" class="' + (on === 'video' ? 'on' : '') + '">Vídeo</button><button data-uct="stats" class="' + (on === 'stats' ? 'on' : '') + '">Stats</button></div>' +
    '<div class="uc-pane" data-ucp="video"' + (on === 'video' ? '' : ' hidden') + '><div class="uc-demo"><canvas id="ucDemo" aria-label="' + esc(u.name) + ' en acción"></canvas><span>En acción</span></div></div>' +
    '<div class="uc-pane" data-ucp="stats"' + (on === 'stats' ? '' : ' hidden') + '>' + statsHtml + '</div>';
}
function bindUcTabs() {
  document.querySelectorAll('[data-uct]').forEach(function (b) {
    b.onclick = function () {
      sfx('tap');
      document.querySelectorAll('[data-uct]').forEach(function (o) { o.classList.toggle('on', o === b); });
      document.querySelectorAll('[data-ucp]').forEach(function (p) { p.hidden = p.dataset.ucp !== b.dataset.uct; });
    };
  });
}
// Lo que gana una tropa al subir su carta de nivel lv a lv + 1: [icono, nombre, antes, después]
function cardGainRows(u, lv) {
  var m = function (l) { return 1 + CARD_BONUS * (l - 1); }, rows = [];
  if (u.dmg) {
    rows.push(['⚔️', 'Daño', Math.round(u.dmg * m(lv)), Math.round(u.dmg * m(lv + 1))]);
    rows.push(['📈', 'Daño/s', Math.round(u.dmg * m(lv) * u.rate), Math.round(u.dmg * m(lv + 1) * u.rate)]);
  }
  if (u.poison) rows.push([u.element === 'fuego' ? '🔥' : '☠️', u.element === 'fuego' ? 'Quema/s' : 'Veneno/s', Math.round(u.poison.dps * m(lv)), Math.round(u.poison.dps * m(lv + 1))]);
  if (u.manaGen) rows.push(['💧', 'Maná', Math.round(u.manaGen.amount * m(lv)), Math.round(u.manaGen.amount * m(lv + 1))]);
  if (u.buff) rows.push(['🎵', 'Velocidad %', Math.round(u.buff.speed * m(lv) * 100), Math.round(u.buff.speed * m(lv + 1) * 100)]);
  return rows;
}
function showCardModal(id, tab) {
  if (!meta.cards[id]) { showLockedCard(id); return; }
  var u = UNITS[id], c = meta.cards[id], inDeck = meta.deck.indexOf(id) !== -1;
  var rar = RARITY[u.rarity], el = ELEMENTS[u.element];
  var need = cardsNeeded(c.lv), gold = cardUpgradeGold(c.lv), maxed = c.lv >= CARD_MAX;
  var dmgAt = function (lv) { return Math.round(u.dmg * (1 + CARD_BONUS * (lv - 1))); };
  var manaAt = function (lv) { return Math.round(u.manaGen.amount * (1 + CARD_BONUS * (lv - 1))); };
  var buffAt = function (lv) { return Math.round(u.buff.speed * (1 + CARD_BONUS * (lv - 1)) * 100); };
  var stats = unitStatsHtml(u, c.lv), traits = unitTraitsHtml(u);
  var pct = maxed ? 100 : Math.min(100, c.n / need * 100);
  var why = maxed ? '' : c.n < need ? (need - c.n === 1 ? 'Falta 1 carta' : 'Faltan ' + (need - c.n) + ' cartas') : meta.gold < gold ? 'Te faltan ' + (gold - meta.gold) + ' 🪙' : '';
  var gain = maxed ? ''
    : u.dmg ? '<span class="uc-gain">⚔️ ' + dmgAt(c.lv) + ' → <b>' + dmgAt(c.lv + 1) + '</b></span>'
    : u.manaGen ? '<span class="uc-gain">💧 ' + manaAt(c.lv) + ' → <b>' + manaAt(c.lv + 1) + '</b></span>'
    : u.buff ? '<span class="uc-gain">🎵 ' + buffAt(c.lv) + '% → <b>' + buffAt(c.lv + 1) + '%</b></span>' : '';
  var html = '<div class="modal-card unit-card rar-' + u.rarity + '" style="--rc:' + rar.color + ';--ec:' + el.color + '">' +
    '<button class="uc-x" id="mcX" aria-label="Cerrar">✕</button>' +
    '<div class="uc-hero"><div class="uc-rays"></div><img class="uc-img" src="' + unitIcon(id, Math.min(7, c.lv), 220) + '" alt=""></div>' +
    '<div class="uc-ribbon"><h2>' + esc(u.name) + '</h2></div>' +
    '<p class="uc-title">' + esc(u.title) + '</p>' +
    '<div class="uc-chips"><span class="uc-chip rar">' + (u.rarity === 'legendaria' || u.rarity === 'mitica' ? '★ ' : '') + rar.name + '</span><span class="uc-chip el">' + el.icon + ' ' + el.name + '</span><span class="uc-chip">' + esc(u.role) + '</span></div>' +
    '<p class="uc-desc">' + esc(u.desc) + (u.chestOnly ? '<br><em>🎁 Solo sale en el cofre de oro</em>' : '') + '</p>' +
    ucTabs(id, '<div class="pause-stats uc-stats">' + stats + '</div>' + (traits ? '<div class="uc-traits">' + traits + '</div>' : ''), tab) +
    '<div class="uc-level"><span class="uc-lvmedal">' + c.lv + '</span><div class="uc-lvbody"><div class="uc-lvtop"><b>' + (maxed ? 'Nivel máximo' : 'Nivel ' + c.lv) + '</b>' + gain + '</div>' +
    '<div class="ubar' + (canUpgradeCard(id) ? ' ok' : '') + '"><span style="width:' + pct + '%"></span><em>' + (maxed ? 'MÁX' : c.n + '/' + need) + '</em></div></div></div>' +
    // mejorar en dos toques: el primero enseña lo que gana, el segundo lo confirma
    (maxed ? '' : '<div class="uc-preview" id="mcPrev" hidden><b>Nivel ' + c.lv + ' → ' + (c.lv + 1) + '</b>' +
      cardGainRows(u, c.lv).map(function (r) { return '<div class="ucp-row"><i>' + r[0] + '</i><span>' + r[1] + '</span><em>' + r[2] + ' → <b>' + r[3] + '</b></em><small>+' + (r[3] - r[2]) + '</small></div>'; }).join('') + '</div>' +
      '<button class="btn btn-up" id="mcUp" ' + (canUpgradeCard(id) ? '' : 'disabled') + '>⬆ Mejorar ' + gold + ' 🪙</button>' + (why ? '<p class="uc-why">' + why + '</p>' : '')) +
    (inDeck ? '<p class="uc-indeck">✔ En tu mazo</p>' : '<p class="uc-swap-t">Ponla en el mazo en lugar de</p><div class="swap-row">' + meta.deck.map(function (d) { return '<button data-swap="' + d + '" style="--rc:' + RARITY[UNITS[d].rarity].color + '"><img src="' + unitIcon(d, 0, 80) + '" alt="' + esc(UNITS[d].name) + '"></button>'; }).join('') + '</div>') +
    '<button class="btn btn-ghost" id="mcClose">Cerrar</button></div>';
  openOverlay(html);
  startCardDemo($('ucDemo'), id);
  bindUcTabs();
  var up = $('mcUp');
  if (up) up.onclick = function () {
    var prev = $('mcPrev');
    if (prev.hidden) {
      prev.hidden = false; sfx('tap');
      up.innerHTML = icons('✔ Confirmar ' + gold + ' 🪙');
      prev.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (upgradeCard(id)) { sfx('power'); toast(u.name + ' sube a nivel ' + meta.cards[id].lv); showCardModal(id, 'stats'); renderMenu('collection'); }
  };
  document.querySelectorAll('[data-swap]').forEach(function (b) {
    b.onclick = function () { var k = meta.deck.indexOf(b.dataset.swap); meta.deck[k] = id; saveMeta(); closeOverlay(); sfx('merge'); renderMenu('collection'); };
  });
  $('mcClose').onclick = closeOverlay;
  $('mcX').onclick = closeOverlay;
}

function unitStatsHtml(u, lv) {
  var mult = 1 + CARD_BONUS * (lv - 1), dmg = Math.round((u.dmg || 0) * mult);
  var stat = function (icon, val, label) { return '<div class="ps-stat"><i>' + icon + '</i><b>' + val + '</b><small>' + label + '</small></div>'; };
  return u.dmg
    ? stat('⚔️', dmg, 'Daño') + stat('⏱️', u.rate, 'Disparos/s') + stat('📈', Math.round(dmg * u.rate), 'Daño/s')
    : u.manaGen
      ? stat('💧', '+' + Math.round(u.manaGen.amount * mult), 'Maná') + stat('⏱️', u.manaGen.every + ' s', 'Cada') + stat('✨', '×rango', 'Fusión')
      : stat('🎵', '+' + Math.round(u.buff.speed * mult * 100) + '%', 'Velocidad') + stat('📍', '4', 'Vecinas') + stat('✨', '×rango', 'Fusión');
}
function unitTraitsHtml(u) {
  return unitTraits(u).map(function (t) { return '<span class="uc-trait"><i>' + t[0] + '</i><b>' + t[1] + '</b><small>' + t[2] + '</small></span>'; }).join('');
}
// Ficha de una tropa que aún no tienes: qué hace y cómo conseguirla.
function showLockedCard(id) {
  var u = UNITS[id], rar = RARITY[u.rarity], el = ELEMENTS[u.element], traits = unitTraitsHtml(u);
  openOverlay('<div class="modal-card unit-card locked rar-' + u.rarity + '" style="--rc:' + rar.color + ';--ec:' + el.color + '">' +
    '<button class="uc-x" id="mcX" aria-label="Cerrar">✕</button>' +
    '<div class="uc-hero"><div class="uc-rays"></div><img class="uc-img" src="' + unitIcon(id, 0, 220) + '" alt=""></div>' +
    '<div class="uc-ribbon"><h2>' + esc(u.name) + '</h2></div>' +
    '<p class="uc-title">' + esc(u.title) + '</p>' +
    '<div class="uc-chips"><span class="uc-chip rar">' + (u.rarity === 'legendaria' || u.rarity === 'mitica' ? '★ ' : '') + rar.name + '</span><span class="uc-chip el">' + el.icon + ' ' + el.name + '</span><span class="uc-chip">' + esc(u.role) + '</span></div>' +
    '<p class="uc-desc">' + esc(u.desc) + '</p>' +
    ucTabs(id, '<div class="pause-stats uc-stats">' + unitStatsHtml(u, 1) + '</div>' + (traits ? '<div class="uc-traits">' + traits + '</div>' : '')) +
    '<div class="uc-get"><b>🔒 Aún no la tienes</b>' + unitSources(id).map(function (t) { return '<small>' + esc(t) + '</small>'; }).join('') + '</div>' +
    '<button class="btn btn-ghost" id="mcClose">Cerrar</button></div>');
  startCardDemo($('ucDemo'), id);
  bindUcTabs();
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
      drawUnit(dc, u.id, c.x, c.y - 0.02, 0.42 * (1 + u.anim * 0.25), u.rank, t, { board: true, atk: u.atk, aim: u.aim, recoil: u.recoil || 0 });
    }
    b.enemies.slice().sort(function (p, q) { return p.y - q.y; }).forEach(function (e) {
      drawEnemy(dc, e, ENEMIES[e.kind].size * 0.82, t);
    });
    var keep = ctx; ctx = dc; // drawShot dibuja en el lienzo global
    b.shots.forEach(function (s2) { drawShot(s2, t); });
    ctx = keep;
    b.fx.forEach(function (f) {
      if (f.type === 'pic') { drawPicFx(dc, f); return; }
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
      var fs = Math.max(10, sc * (tx.big ? 0.3 : 0.24));
      dc.font = '900 ' + fs + 'px Nunito, sans-serif';
      drawFloatText(dc, tx.text, ox + tx.x * sc, oy + tx.y * sc, fs, tx.color);
    });
    dc.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function openOverlay(html) { var o = $('overlay'); o.innerHTML = icons(html); o.hidden = false; }
function closeOverlay() { $('overlay').hidden = true; $('overlay').innerHTML = ''; }

/* Restablecer juego: borra todo el progreso tras confirmarlo. */
// Opciones: sonido y restablecer el juego
function showOptions() {
  openOverlay('<div class="modal-card options"><div class="code-ico">⚙️</div><h2>Opciones</h2>' +
    '<label class="sound-row"><input type="checkbox" id="soundChk" ' + (meta.settings.sound ? 'checked' : '') + '> Sonido</label>' +
    '<button class="btn btn-ghost" id="optNews">Novedades</button>' +
    '<button class="btn btn-red" id="optReset">Restablecer juego</button>' +
    '<button class="btn btn-ghost" id="optX">Cerrar</button>' +
    '<p class="foot">Versión ' + APP_VERSION + '. Juego original y gratuito, inspirado en los tower defense de fusión. Sin anuncios.</p></div>');
  var sc = $('soundChk'); sc.onchange = function () { meta.settings.sound = sc.checked; saveMeta(); };
  $('optNews').onclick = function () { showPatchNotes(); };
  $('optReset').onclick = showReset;
  $('optX').onclick = closeOverlay;
}
/* Novedades de la versión (js/version.js): la última con detalle y las
   anteriores, plegadas, con una línea cada una. Sale sola al entrar con
   una versión nueva. */
function showPatchNotes(older) {
  var last = APP_PATCH_NOTES[0], rest = APP_PATCH_NOTES.slice(1);
  openOverlay('<div class="modal-card patch-notes"><div class="code-ico">📣</div><h2>Novedades</h2>' +
    '<p class="pn-ver">Versión ' + esc(last.version) + ' · ' + esc(last.summary) + '</p>' +
    '<ul class="pn-list">' + last.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
    (rest.length ? '<button class="btn btn-ghost" id="pnOld">' + (older ? 'Ocultar' : 'Ver') + ' versiones anteriores</button>' +
      (older ? '<div class="pn-old">' + rest.map(function (n) { return '<p><b>' + esc(n.version) + '</b> ' + esc(n.summary) + '</p>'; }).join('') + '</div>' : '') : '') +
    '<button class="btn btn-green" id="pnOk">Aceptar</button></div>');
  if ($('pnOld')) $('pnOld').onclick = function () { sfx('tap'); showPatchNotes(!older); };
  $('pnOk').onclick = function () { meta.lastSeenVersion = APP_VERSION; saveMeta(); sfx('tap'); closeOverlay(); };
}
function showReset() {
  openOverlay('<div class="modal-card"><div class="code-ico">⚠️</div><h2>Restablecer juego</h2>' +
    '<p class="lead">Se borra todo tu progreso: oro, gemas, cartas, mazo, campaña, trofeos y códigos canjeados. No se puede deshacer.</p>' +
    '<button class="btn btn-red" id="resetOk">Borrar todo</button><button class="btn btn-ghost" id="resetX">Cancelar</button></div>');
  $('resetOk').onclick = function () {
    resetMeta();
    closeOverlay();
    sfx('no'); buzz(30);
    showScreen('home');
    toast('Juego restablecido');
  };
  $('resetX').onclick = closeOverlay;
}

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

/* Aviso de tropas nuevas desbloqueadas en un cofre. */
function chestNewHtml(r) {
  if (!r.fresh || !r.fresh.length) return '';
  if (r.fresh.length > 1) return '<div class="res-unlock secret"><b>¡' + r.fresh.length + ' tropas nuevas!</b></div>';
  return '<div class="res-unlock secret"><img src="' + unitIcon(r.fresh[0], 0, 96) + '" alt=""><b>¡Tropa nueva: ' + esc(UNITS[r.fresh[0]].name) + '!</b></div>';
}
/* ---------- cofres: ficha, apertura y reparto ----------
   Ficha: qué trae y la probabilidad de cada rareza; hay que darle a Abrir.
   Apertura: el cofre cerrado crece un 20 % y tiembla 0,3 s, se abre con el
   destello girando detrás y sube al centro de arriba. Reparto: primero el oro
   y luego las cartas una a una (de común a legendaria), con las que quedan en
   el cofre. Al final, el resumen. */
function chestPic(type, open) { return 'assets/chests/' + type + (open ? '-abierto' : '') + '.webp'; }
var chestFxOn = false;
var RARITY_RANK = ['comun', 'rara', 'epica', 'mitica', 'legendaria'];

// probabilidad de que el cofre traiga al menos una carta con esa probabilidad por carta
function chestOdds(p, n) {
  var v = (1 - Math.pow(1 - p, n)) * 100;
  if (v <= 0) return 'No sale';
  if (v >= 99.5) return 'Casi segura';
  return (v < 1 ? v.toFixed(1) : v < 10 ? v.toFixed(1).replace('.0', '') : Math.round(v)).toString().replace('.', ',') + ' %';
}
function showChestInfo(k, slot) {
  var ch = CHESTS[k], poor = meta.gems < ch.price, inSlot = slot != null;
  var row = function (color, name, sub, odds) {
    return '<div class="ci-row" style="--rc:' + color + '"><i></i><span><b>' + name + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><em>' + odds + '</em></div>';
  };
  openOverlay('<div class="modal-card chest-info" style="--cc:' + ch.color + '">' +
    '<div class="chest-pic closed"><img class="chest-pic-rays" src="assets/chests/destello.webp" alt=""><img class="chest-pic-img" id="ciPic" src="' + chestPic(k) + '" alt=""></div>' +
    '<h2>' + ch.name + '</h2>' +
    '<div class="ci-loot"><span><b>' + ch.cards + '</b>cartas</span><span><b>' + ch.gold[0] + ' a ' + ch.gold[1] + '</b>🪙 oro</span><span><b>' + ch.gems[0] + ' a ' + ch.gems[1] + '</b>💎 gemas</span></div>' +
    '<h3 class="ci-t">Probabilidad por cofre</h3>' +
    row(RARITY.rara.color, 'Rara', '', chestOdds(ch.rare, ch.cards)) +
    row(RARITY.epica.color, 'Épica', '', chestOdds(ch.epic, ch.cards)) +
    row(RARITY.mitica.color, 'Mítica', ch.myth ? '' : 'Solo en el cofre de oro', chestOdds(ch.myth || 0, ch.cards)) +
    row(RARITY.legendaria.color, 'Legendaria', ch.legend ? '' : 'Solo en el cofre de oro', chestOdds(ch.legend, ch.cards)) +
    '<p class="ci-note">Puede tocarte cualquier tropa, aunque aún no la tengas.</p>' +
    (inSlot ? slotButtons(slot) : '<button class="btn chest-ok' + (poor ? ' poor' : '') + '" id="ciOpen">Abrir<span>💎 ' + ch.price + '</span></button>') +
    '<button class="btn btn-ghost" id="ciX">Cerrar</button></div>');
  $('ciX').onclick = closeOverlay;
  if (inSlot) { bindSlotButtons(slot); return; }
  $('ciOpen').onclick = function () {
    if (chestFxOn) return;
    var r = buyChest(k);
    if (!r) { sfx('no'); buzz(20); toast('Te faltan gemas'); return; }
    showChest(r, $('ciPic'));
  };
}
function slotButtons(i) {
  var s = meta.slots[i], st = slotState(s), ch = CHESTS[s.type], cost = skipCost(i);
  var canStart = st === 'locked' && !slotUnlocking();
  return '<p class="ci-wait">⏱ ' + (st === 'unlocking' ? 'Se abre en <b id="ciLeft" data-slot="' + i + '">' + fmtDur(slotLeft(s)) + '</b>' : 'Tarda <b>' + fmtDur(ch.time) + '</b> en abrirse') + '</p>' +
    (canStart ? '<button class="btn chest-ok" id="ciUnlock">Desbloquear<span>⏱ ' + fmtDur(ch.time) + '</span></button>' : '') +
    '<button class="btn chest-ok' + (canStart ? ' alt' : '') + (meta.gems < cost ? ' poor' : '') + '" id="ciNow">Abrir ya<span>💎 ' + cost + '</span></button>' +
    (st === 'locked' && !canStart ? '<p class="ci-note">Ya se está abriendo otro cofre. Se abren de uno en uno.</p>' : '');
}
function bindSlotButtons(i) {
  if ($('ciUnlock')) $('ciUnlock').onclick = function () {
    if (startUnlock(i)) { sfx('power'); buzz(20); closeOverlay(); renderMenu('home'); toast('Desbloqueando ' + CHESTS[meta.slots[i].type].name.toLowerCase()); }
  };
  $('ciNow').onclick = function () {
    if (chestFxOn) return;
    var r = openSlot(i, true);
    if (!r) { sfx('no'); buzz(20); toast('Te faltan gemas'); return; }
    showChest(r, $('ciPic'));
  };
}

/* ---------- huecos de cofre de la pantalla principal ---------- */
function fmtDur(sec) {
  sec = Math.ceil(sec);
  var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (h) return h + ' h' + (m ? ' ' + m + ' min' : '');
  if (m) return m + ' min' + (s && m < 10 ? ' ' + s + ' s' : '');
  return s + ' s';
}
function slotsInner() {
  var busy = slotUnlocking();
  return meta.slots.map(function (s, i) {
    var st = slotState(s);
    if (st === 'empty') return '<button class="slot empty" data-slot="' + i + '"><span>Hueco libre</span></button>';
    var ch = CHESTS[s.type];
    var lab = st === 'ready' ? '<b class="slot-go">¡Abrir!</b>'
      : st === 'unlocking' ? '<b>' + fmtDur(slotLeft(s)) + '</b><small>💎 ' + skipCost(i) + '</small>'
      : '<b>' + fmtDur(ch.time) + '</b><small>' + (busy ? 'En espera' : 'Desbloquear') + '</small>';
    return '<button class="slot ' + st + '" data-slot="' + i + '" style="--cc:' + ch.color + '"><img src="' + chestPic(s.type, st === 'ready') + '" alt="">' + lab + '</button>';
  }).join('');
}
function slotTap(i, btn) {
  if (chestFxOn) return;
  var s = meta.slots[i], st = slotState(s);
  if (st === 'empty') { sfx('tap'); toast('Gana batallas para llenar tus cofres'); return; }
  if (st === 'ready') { showChest(openSlot(i), btn.querySelector('img')); return; }
  sfx('tap');
  showChestInfo(s.type, i);
}
// etiqueta del cofre gratis: «Gratis» o lo que falta, corto para que quepa bajo el icono
function freeChestLabel() {
  var s = Math.ceil(freeChestLeft());
  if (!s) return 'Gratis';
  var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return h ? h + 'h ' + pad(m) + 'm' : m + 'm ' + pad(s % 60) + 's';
}
// cuenta atrás de los huecos (y de la ficha abierta de un cofre que se está desbloqueando)
setInterval(function () {
  // cofre gratis: cuenta atrás y brillo cuando está listo
  var fc = document.querySelector('[data-go="freeChest"]');
  if (fc && !$('menu').hidden) {
    var fl = fc.querySelector('span'), lbl = freeChestLabel();
    if (fl && fl.textContent !== lbl) fl.textContent = lbl;
    fc.classList.toggle('glow', freeChestReady());
  }
  var el = $('chestSlots');
  if (el && !$('menu').hidden && !chestFxOn) {
    var html = slotsInner();
    if (html !== el._h) { el.innerHTML = icons(html); el._h = html; }
  }
  var left = $('ciLeft');
  if (left) { var s = meta.slots[+left.dataset.slot]; if (s) left.textContent = fmtDur(slotLeft(s)); }
}, 1000);

// lo que sale del cofre, en orden: el oro y luego las cartas de menor a mayor rareza
function chestItems(r) {
  var items = [{ gold: r.gold, gems: r.gems }];
  Object.keys(r.cards).sort(function (a, b) {
    return RARITY_RANK.indexOf(UNITS[a].rarity) - RARITY_RANK.indexOf(UNITS[b].rarity) || r.cards[a] - r.cards[b];
  }).forEach(function (id) { items.push({ id: id, n: r.cards[id], fresh: (r.fresh || []).indexOf(id) !== -1 }); });
  return items;
}
// from: imagen del cofre de la que sale (ficha del cofre); sin ella, sale en el centro
function showChest(r, from) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { sfx('chest'); chestResult(r); return; }
  chestFxOn = true;
  var open = new Image(); open.src = chestPic(r.type, true);   // precargado para que el cambio no parpadee
  var rect = from && from.getBoundingClientRect();
  if (rect && !rect.width) rect = null;
  var vw = window.innerWidth, vh = window.innerHeight;
  // abierto, el cofre se queda en el centro de arriba y las cartas salen al centro
  var size2 = Math.min(vw * 0.42, 170), cx2 = vw / 2, cy2 = Math.max(vh * 0.25, size2 * 0.75);
  var size = rect ? rect.width : size2, cx = rect ? rect.left + rect.width / 2 : cx2, cy = rect ? rect.top + rect.height / 2 : cy2;
  var cardY = Math.min(vh - 150, cy2 + size2 * 0.62 + 125);
  var fx = document.createElement('div');
  fx.className = 'chest-fx';
  fx.style.setProperty('--cc', CHESTS[r.type].color);
  fx.innerHTML = '<div class="cfx-dim"></div>' +
    '<div class="cfx-at" style="left:' + cx + 'px;top:' + cy + 'px;width:' + size + 'px">' +
    '<div class="cfx-rays"><img src="assets/chests/destello.webp" alt=""></div>' +
    '<img class="cfx-chest shake" src="' + chestPic(r.type) + '" alt=""></div>' +
    '<div class="cfx-left" style="left:' + (cx2 + size2 * 0.5) + 'px;top:' + (cy2 + size2 * 0.38) + 'px"><b></b><small>quedan</small></div>' +
    '<button class="cfx-skip">Saltar</button><p class="cfx-hint"></p>';
  document.body.appendChild(fx);
  if (from) from.style.visibility = 'hidden';
  var chest = fx.querySelector('.cfx-chest'), spot = fx.querySelector('.cfx-at'), left = fx.querySelector('.cfx-left'), hint = fx.querySelector('.cfx-hint');
  var items = chestItems(r), idx = -1, cur = null, lockUntil = Infinity, timers = [], done = false;
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
  function next() {
    if (done) return;
    if (cur) chestItemOut(cur, vw, cardY);
    idx++;
    if (idx >= items.length) { finish(); return; }
    var it = items[idx], rest = items.length - idx - 1;
    cur = chestItemIn(fx, it, cx2, cy2, vw / 2, cardY);
    if (!it.id) chestCoins(fx, cx2, cy2 - size2 * 0.12, size2);
    else chestBump(chest, fx, it);
    left.querySelector('b').textContent = rest;
    left.querySelector('small').textContent = rest === 1 ? 'queda' : 'quedan';
    left.classList.toggle('none', !rest);
    left.classList.remove('tick'); void left.offsetWidth; left.classList.add('tick');
    hint.textContent = rest ? 'Toca para la siguiente' : 'Toca para terminar';
    lockUntil = Date.now() + 380;
  }
  fx.onclick = function () { if (Date.now() >= lockUntil) next(); };
  fx.querySelector('.cfx-skip').onclick = function (e) { e.stopPropagation(); finish(); };
  sfx('tap'); buzz(15);
  at(300, function () {
    chest.src = open.src;
    chest.classList.remove('shake');
    chest.classList.add('opened');
    fx.classList.add('open');
    spot.style.transform = 'translate(-50%, -50%) translate(' + (cx2 - cx) + 'px,' + (cy2 - cy) + 'px) scale(' + size2 / size + ')';
    sfx('chest'); buzz(35);
  });
  at(rect ? 620 : 460, next);
}
// sonido y sacudida del cofre según la rareza; destello blanco con las
// legendarias y míticas
function chestBump(chest, fx, it) {
  var rar = UNITS[it.id].rarity, top = rar === 'legendaria' || rar === 'mitica';
  sfx({ comun: 'tap', rara: 'merge', epica: 'power', legendaria: 'win', mitica: 'win' }[rar]);
  if (rar === 'epica' || top) buzz(rar === 'legendaria' ? 90 : top ? 60 : 30);
  chest.classList.remove('bump'); void chest.offsetWidth; chest.classList.add('bump');
  if (top) {
    var f = document.createElement('div');
    f.className = 'cfx-flash';
    fx.appendChild(f);
    f.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 450, easing: 'ease-out', fill: 'both' }).onfinish = function () { f.remove(); };
  }
}
// monedas: salen disparadas del cofre y vuelan al contador de oro (o caen si no se ve)
function chestCoins(fx, x, y, size) {
  var pill = document.querySelector('.menu .pill.gold'), pr = pill && pill.getBoundingClientRect();
  var toPill = pr && pr.width && pr.bottom > 0 && pr.top < window.innerHeight && !$('overlay').innerHTML;
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
    ], { duration: 1000 + Math.random() * 350, delay: i * 28, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)', fill: 'both' }).onfinish = c.remove.bind(c);
  }
}
var cfxTf = function (tx, ty, s, rot) { return 'translate(' + tx + 'px,' + ty + 'px) translate(-50%,-50%) scale(' + s + ') rotate(' + rot + 'deg)'; };
// una carta (o el oro) sale de dentro del cofre y crece hasta el centro
function chestItemIn(fx, it, x, y, tx, ty) {
  var el = document.createElement('div');
  if (!it.id) {
    el.className = 'cfx-card cfx-gold';
    el.innerHTML = icons('<span class="cfx-rar">Oro</span><img src="assets/chests/oro-monedas.webp" alt=""><b>+' + it.gold + ' 🪙</b>' + (it.gems ? '<small>+' + it.gems + ' 💎</small>' : ''));
  } else {
    var u = UNITS[it.id], rar = RARITY[u.rarity], c = meta.cards[it.id];
    var max = c.lv >= CARD_MAX, need = cardsNeeded(c.lv), pct = max ? 100 : Math.min(100, c.n / need * 100);
    el.className = 'cfx-card r-' + u.rarity + (it.fresh ? ' fresh' : '');
    el.style.setProperty('--rc', rar.color);
    el.innerHTML = '<span class="cfx-rar">' + rar.name + '</span>' + (it.fresh ? '<span class="cfx-new">¡Nueva!</span>' : '') +
      '<img src="' + unitIcon(it.id, 0, 160) + '" alt=""><b>' + esc(u.name) + '</b><small>×' + it.n + '</small>' +
      '<div class="cfx-bar' + (!max && c.n >= need ? ' full' : '') + '"><span style="width:' + pct + '%"></span><em>' + (max ? 'MÁX' : 'Nv ' + c.lv + ' · ' + c.n + '/' + need) + '</em></div>';
  }
  fx.appendChild(el);
  el.animate([
    { transform: cfxTf(x, y, 0.12, -14), opacity: 0 },
    { transform: cfxTf(x + (tx - x) * 0.3, y - 30, 0.45, -8), opacity: 1, offset: 0.3 },
    { transform: cfxTf(tx, ty, 1, 0), opacity: 1 }
  ], { duration: 520, easing: 'cubic-bezier(0.25, 1.25, 0.45, 1)', fill: 'both' });
  return el;
}
// la carta anterior se aparta a un lado y desaparece
function chestItemOut(el, vw, ty) {
  el.style.pointerEvents = 'none';
  el.animate([
    { transform: cfxTf(vw / 2, ty, 1, 0), opacity: 1 },
    { transform: cfxTf(vw / 2 - Math.min(vw * 0.6, 260), ty - 40, 0.55, -18), opacity: 0 }
  ], { duration: 300, easing: 'cubic-bezier(0.5, 0, 0.8, 0.5)', fill: 'both' }).onfinish = function () { el.remove(); };
}
function chestResult(r) {
  var ch = CHESTS[r.type];
  var cards = chestItems(r).slice(1).reverse().map(function (it) {
    return '<div class="chest-card' + (it.fresh ? ' fresh' : '') + '" style="--rc:' + RARITY[UNITS[it.id].rarity].color + '"><img src="' + unitIcon(it.id, 0, 96) + '" alt=""><b>×' + it.n + '</b><small>' + esc(UNITS[it.id].name) + '</small></div>';
  }).join('');
  openOverlay('<div class="modal-card chest-modal"><div class="chest-pic"><img class="chest-pic-rays" src="assets/chests/destello.webp" alt=""><img class="chest-pic-img" src="' + chestPic(r.type, true) + '" alt=""></div><h2>' + ch.name + '</h2><p class="gold-big">+' + r.gold + ' 🪙' + (r.gems ? ' · +' + r.gems + ' 💎' : '') + '</p>' + chestNewHtml(r) + '<div class="chest-cards">' + cards + '</div><button class="btn chest-ok" id="chestOk">¡Genial!</button></div>');
  $('chestOk').onclick = function () { closeOverlay(); renderMenu(currentScreen === 'battle' ? 'home' : currentScreen); };
}

/* ---------- partida: barra inferior y superior ---------- */
function buildBattleHud() {
  var b = battle;
  var deck = $('deckBar');
  deck.innerHTML = b.player.deck.map(function (id) {
    return '<button class="dcard" data-power="' + id + '" style="--rc:' + RARITY[UNITS[id].rarity].color + '"><img src="' + unitIcon(id, 0, 96) + '" alt=""><span class="dlv" id="dlv_' + id + '">1</span><span class="dcost" id="dcost_' + id + '">100</span></button>';
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
  $('cmdBtn').parentNode.style.setProperty('--cc', c.color); // el aro y sus rayos
  $('cmdIco').innerHTML = '<img src="' + c.pic + '" alt="' + esc(c.name) + '"><i>' + c.icon + '</i>';
  $('cmdBtn').title = c.ability + ': ' + c.desc;
  $('unitInfo').hidden = true;
  hideCoach();
  updateHud(true);
}
var _hud = {};
function setTxt(id, v) { if (_hud[id] === v) return; _hud[id] = v; var e = $(id); if (e) e.textContent = v; }
function setHtml(id, v) { if (_hud[id] === v) return; _hud[id] = v; var e = $(id); if (e) e.innerHTML = icons(v); }
var MANA_ICO = '<img class="mi" src="assets/icons/gota.webp" alt="maná">';
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
  // gris solo si falta maná; con el tablero lleno se queda en color y lo dice
  var full = !p.freeCells().length;
  $('summonBtn').classList.toggle('poor', p.mana < p.summonCost);
  $('summonBtn').classList.toggle('full', full);
  setHtml('summonCost', full ? 'Tablero lleno' : p.summonCost + ' ' + MANA_ICO);
  // en pantallas estrechas la palabra «Oleada» se esconde (style.css) y queda el número
  setHtml('bWave', b.wave ? '<span class="wv-w">Oleada </span>' + b.wave + (b.maxWaves !== Infinity ? '/' + b.maxWaves : '') : 'Preparando…');
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
  var wi = $('waveInfo'), showWi = !b.other && $('coach').hidden;
  wi.hidden = !showWi;
  if (showWi) setHtml('waveInfo', waveInfoHtml(b));
  var cb = $('cmdBtn');
  cb.style.setProperty('--charge', (p.charge * 360) + 'deg');
  cb.classList.toggle('ready', p.charge >= 1);
  setTxt('bSpeed', 'x' + b.speed);
  // espera para recolocar tropas: anillo que se llena y segundos que faltan
  var cd = b.moveCd > 0 ? b.moveCd : 0, mv = $('bMove');
  mv.style.setProperty('--p', ((1 - cd / MOVE_COOLDOWN) * 360) + 'deg');
  setTxt('bMoveT', cd > 0 ? String(Math.ceil(cd)) : '');
  if (mv.classList.contains('cooling') && !cd && mv.animate) mv.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
  mv.classList.toggle('cooling', cd > 0);
}
/* Consejo del tutorial: abajo (junto a los botones) o arriba (sobre el tablero). */
function showCoach(html, where) {
  var el = $('coach');
  if (el._h !== html) { el.innerHTML = icons(html); el._h = html; }
  el.className = 'coach ' + where;
  el.hidden = false;
}
function hideCoach() { var el = $('coach'); if (el) { el.hidden = true; el._h = ''; } }

/* Franja de arriba con un solo tablero: la oleada en curso y lo que trae la
   siguiente (monstruos, jefe y evento). */
function waveInfoHtml(b) {
  var left = b.queue.length + b.player.enemies.length;
  var now = '<span class="wi-now"><b>' + (b.wave ? 'Oleada ' + b.wave : 'Preparando') + '</b><small>' +
    (!b.wave ? 'Coloca tus tropas' : left ? (left === 1 ? 'Queda 1' : 'Quedan ' + left) : '¡Superada!') + '</small></span>';
  var nx = b.next;
  if (!nx) return now + '<span class="wi-next"><b class="wi-last">👑 ¡Última oleada!</b></span>';
  var groups = [], by = {};
  nx.queue.forEach(function (q) {
    var k = (q.boss ? 'B' : '') + q.kind;
    if (!by[k]) { by[k] = { kind: q.kind, boss: !!q.boss, n: 0 }; groups.push(by[k]); }
    by[k].n++;
  });
  groups.sort(function (p, q) { return (p.boss - q.boss) || (q.n - p.n); });
  var chips = groups.slice(0, 5).map(function (g) {
    var name = g.boss ? BOSSES[g.kind].name : ENEMIES[g.kind].name;
    return '<i class="wi-chip' + (g.boss ? ' boss' : '') + '" title="' + esc(name) + '"><img src="' + enemyIcon(g.kind, g.boss) + '" alt="' + esc(name) + '">' + (g.boss ? '👑' : '×' + g.n) + '</i>';
  }).join('');
  var ev = nx.event ? '<i class="wi-chip ev" title="' + esc(nx.event.name + ': ' + nx.event.desc) + '"><img src="' + nx.event.pic + '" alt="' + esc(nx.event.name) + '"></i>' : '';
  return now + '<span class="wi-next"><small>' + (b.wave ? 'Siguiente' : 'Llega') + '</small>' + chips + ev + '</span>';
}
function refreshUnitInfo() {
  var b = battle, box = $('unitInfo');
  var i = b.selected;
  if (i == null || !b.player.cells[i]) { box.hidden = true; return; }
  var u = b.player.cells[i], d = UNITS[u.id];
  var aff = b.player.affinity(i);
  var bits = [];
  if (d.dmg) bits.push('⚔️ ' + fmtNum(b.player.unitDamage(i)) + ' por golpe');
  if (d.manaGen) bits.push('💧 +' + b.player.manaAmount(u) + ' cada ' + d.manaGen.every + ' s');
  if (d.buff) bits.push('🎵 +' + Math.round(b.player.buffSpeed(u) * 100) + '% vel. a vecinas');
  if (aff) bits.push(ELEMENTS[d.element].icon + ' Afinidad +' + Math.round(aff * AFFINITY_BONUS * 100) + '%');
  if (b.player.tiles[i]) bits.push(TILES[b.player.tiles[i]].icon + ' ' + TILES[b.player.tiles[i]].name);
  box.innerHTML = icons('<img src="' + unitIcon(u.id, u.rank, 72) + '" alt=""><div><b>' + esc(d.name) + ' · Rango ' + u.rank + '</b><small>' + esc(d.role) + ' · ' + bits.join(' · ') + '</small><small class="hint">Toca otra igual para fusionar o una casilla vacía para moverla</small></div>');
  box.hidden = false;
}
var bannerTimer = null;
function showBanner(title, sub, pic) {
  var el = $('banner');
  el.innerHTML = (pic ? '<img class="banner-pic" src="' + pic + '" alt="">' : '') + '<b>' + icons(esc(title)) + '</b>' + (sub ? '<small>' + icons(esc(sub)) + '</small>' : '');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function showResult(res) {
  var title = res.mode === 'coop' ? (res.won ? '¡Gran defensa!' : 'Fin de la partida') : res.draw ? 'Empate' : res.won ? '¡Victoria!' : 'Derrota';
  var stars = res.mode === 'campaign' && res.won ? '<div class="res-stars">' + starRow(res.stars) + '</div>' : '';
  var chest = !res.chest ? '' : res.chestSlot >= 0
    ? '<div class="res-chest"><img src="' + chestPic(res.chest) + '" alt=""><span><b>' + CHESTS[res.chest].name + '</b><small>Guardado en tus cofres · tarda ' + fmtDur(CHESTS[res.chest].time) + ' en abrirse</small></span></div>'
    : '<div class="res-chest full"><img src="' + chestPic(res.chest) + '" alt=""><span><b>Tus cofres están llenos</b><small>Abre alguno para que quepan los próximos</small></span></div>';
  var unlock = res.unlocked ? '<div class="res-unlock"><img src="' + unitIcon(res.unlocked, 0, 96) + '" alt=""><b>¡Nueva tropa: ' + esc(UNITS[res.unlocked].name) + '!</b></div>' : '';
  openOverlay('<div class="modal-card result ' + (res.won ? 'win' : 'lose') + '"><div class="res-emoji">' + (res.won ? '🏆' : res.draw ? '🤝' : ico('icons/derrota')) + '</div><h2>' + title + '</h2>' + stars +
    '<p>' + res.lines.map(esc).join('<br>') + '</p>' +
    '<p class="res-gold">+' + res.gold + ' 🪙' + (res.gems ? ' · +' + res.gems + ' 💎' : '') + (res.trophies ? ' · ' + (res.trophies > 0 ? '+' : '') + res.trophies + ' 🏆' : '') + '</p>' + chest + unlock +
    '<p class="muted">Bajas ' + res.kills + ' · Daño ' + fmtNum(res.damage) + '</p>' + dmgSummary(res) +
    '<button class="btn btn-green" id="resAgain">' + (res.mode === 'campaign' && res.won && battle.stage.id < CAMPAIGN.length ? 'Siguiente fase ▶' : 'Otra vez') + '</button>' +
    '<button class="btn btn-ghost" id="resMenu">Menú</button></div>');
  $('resAgain').onclick = function () {
    closeOverlay();
    var b = battle;
    if (b.mode === 'campaign') startBattle('campaign', { stage: res.won && b.stage.id < CAMPAIGN.length ? b.stage.id + 1 : b.stage.id });
    else startBattle(b.mode, b.opts);
  };
  $('resMenu').onclick = function () { closeOverlay(); battle = null; showScreen(res.mode === 'campaign' ? 'campaign' : 'home'); };
}
/* Daño de cada tropa en la partida, en barras (la mayor, llena). */
function dmgSummary(res) {
  var list = (res.dmgBy || []).slice(0, 6);
  if (!list.length) return '';
  var top = list[0].v, total = list.reduce(function (s, d) { return s + d.v; }, 0);
  return '<div class="res-dmg"><h3>Daño por tropa</h3>' + list.map(function (d) {
    var cmd = d.id === 'cmd' ? COMMANDERS[res.commander] : null;
    var pic = cmd ? cmd.pic : unitIcon(d.id, 0, 64), name = cmd ? cmd.ability : UNITS[d.id].name;
    return '<div class="rd-row"><img src="' + pic + '" alt=""><span class="rd-bar"><i style="width:' + Math.max(4, d.v / top * 100) + '%"></i><b>' + esc(name) + '</b><em>' + fmtNum(d.v) + ' · ' + Math.round(d.v / total * 100) + '%</em></span></div>';
  }).join('') + '</div>';
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
    this.querySelector('i').innerHTML = icons(meta.settings.sound ? '🔊' : '🔇');
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
  $('bMove').onclick = function () {
    if (!battle) return;
    sfx('tap');
    toast(battle.moveCd > 0 ? '⏱ Podrás recolocar una tropa en ' + Math.ceil(battle.moveCd) + ' s' : '↔ Ya puedes recolocar una tropa: arrástrala a otra casilla');
  };
  $('bQuit').onclick = confirmQuit;
  $('overlay').addEventListener('click', function (e) { if (e.target === this && !(battle && !battle.ended && battle.paused === false)) { /* los modales se cierran con sus botones */ } });
  // nada de zoom: ni pellizcando (Safari no hace caso al viewport), ni con doble toque, ni con Ctrl + rueda
  ['gesturestart', 'gesturechange', 'dblclick'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('visibilitychange', function () { if (document.hidden && battle && !battle.ended && !battle.paused) confirmQuit(); });
  document.addEventListener('keydown', function (e) {
    if (!battle || currentScreen !== 'battle') return;
    // en pausa (o al terminar) solo responde Escape, que reanuda
    // (Espacio y Enter tampoco pulsan el botón de la partida que tenga el foco)
    if (battle.ended || battle.paused) {
      if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('#battleScreen')) e.preventDefault();
      if (e.key === 'Escape' && !battle.ended) confirmQuit();
      return;
    }
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
  // versión nueva desde la última visita: enseña las novedades
  if (meta.lastSeenVersion !== APP_VERSION) showPatchNotes();
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
