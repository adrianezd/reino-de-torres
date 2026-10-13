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
  clearTimeout(toast._h); toast._h = setTimeout(function () { t.classList.remove('show'); }, Math.max(1700, String(msg).length * 55));  // los largos duran más, para leerlos
}

/* ---------- pantallas ---------- */
var currentScreen = 'home';
function showScreen(name) {
  $('menu').hidden = name === 'battle';
  $('battleScreen').hidden = name !== 'battle';
  $('navbar').hidden = name === 'battle';
  if (name === 'battle') renderedScreen = '';
  currentScreen = name;
  // pestaña activa de la barra de abajo
  var tab = name === 'shop' ? 'shop' : name === 'collection' || name === 'commanders' ? 'collection' : 'home';
  document.querySelectorAll('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  if (name !== 'battle') renderMenu(name);
}
/* Deslizar a los lados cambia de pestaña (Tienda, Mazo y Jugar), como en
   los juegos de móvil. Solo con gestos claramente horizontales y rápidos, y
   nunca si empiezan sobre algo que se desplaza a lo ancho (filtros, mapas). */
var SWIPE_TABS = ['shop', 'collection', 'home'];
function swipeTab() { var t = currentScreen === 'commanders' ? 'collection' : currentScreen; return SWIPE_TABS.indexOf(t); }
function scrollsSideways(el, stop) {
  for (; el && el !== stop; el = el.parentNode) {
    if (el.nodeType !== 1) continue;
    var ox = getComputedStyle(el).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2) return true;
  }
  return false;
}
function bindSwipe() {
  var m = $('menu'), g = null;
  m.addEventListener('touchstart', function (e) {
    g = null;
    if (e.touches.length !== 1 || swipeTab() < 0 || !$('overlay').hidden || scrollsSideways(e.target, m)) return;
    var t = e.touches[0];
    g = { x: t.clientX, y: t.clientY, t: Date.now(), side: false };
  }, { passive: true });
  m.addEventListener('touchmove', function (e) {
    if (!g) return;
    var t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
    if (!g.side) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { g = null; return; } // es desplazamiento vertical
      if (Math.abs(dx) > 14) g.side = true;
    }
    if (g.side) {
      // sin pestaña a ese lado, se resiste más
      var to = swipeTab() - Math.sign(dx), k = to >= 0 && to < SWIPE_TABS.length ? 0.35 : 0.12;
      m.style.transform = 'translateX(' + dx * k + 'px)';
      g.dx = dx;
    }
  }, { passive: true });
  var end = function () {
    if (!g) return;
    var sideways = g.side, dx = g.dx || 0, fast = Date.now() - g.t < 700;
    g = null;
    var to = swipeTab() - Math.sign(dx);
    var go = sideways && Math.abs(dx) >= (fast ? 50 : 110) && to >= 0 && to < SWIPE_TABS.length;
    if (!go) {
      // vuelve a su sitio
      if (!dx) return;
      m.style.transition = 'transform 0.18s ease-out'; m.style.transform = '';
      setTimeout(function () { m.style.transition = ''; }, 200);
      return;
    }
    // la pestaña nueva entra desde el lado del gesto en un solo movimiento
    // (sin volver antes a su sitio, que daba un tirón doble)
    m.style.transition = ''; m.style.transform = '';
    sfx('tap');
    showScreen(SWIPE_TABS[to]);
    m.scrollTop = 0;
    m.classList.add('no-intro');
    if (m.animate) m.animate([{ transform: 'translateX(' + (dx < 0 ? 22 : -22) + '%)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
    setTimeout(function () { m.classList.remove('no-intro'); }, 700);
  };
  m.addEventListener('touchend', end);
  m.addEventListener('touchcancel', end);
}
// centro de cada aro del banner del mazo (assets/ui/banner-mazo.webp), en % del ancho
// centro de cada aro de la placa del mazo (assets/ui/panel-mazo), en % de la fila de aros
var DECK_RINGS = [10.79, 30.4, 49.95, 69.48, 89.1];
function topBar() {
  return '<div class="res-bar"><span class="pill gold">🪙 <b>' + meta.gold + '</b></span><span class="pill gem">💎 <b>' + meta.gems + '</b></span><span class="pill trophy">🏆 <b>' + meta.trophies + '</b></span><span class="pill star">⭐ <b>' + totalStars() + '</b></span></div>';
}
var renderedScreen = '';
function renderMenu(name, arg) {
  var m = $('menu');
  var html = '';
  // al volver a pintar la misma pantalla (mejorar, comprar…) se queda donde estaba
  var keepScroll = name === renderedScreen ? m.scrollTop : 0;
  renderedScreen = name;
  if (name === 'home') {
    var free = freeChestReady(), cmd = COMMANDERS[meta.commander];
    // badge: cuántas cosas hay por cobrar (punto rojo con la cifra)
    var side = function (go, pic, label, cls, badge) { return '<button class="side-btn ' + (cls || '') + '" data-go="' + go + '"><img src="assets/' + pic + '.webp" alt=""><span>' + label + '</span>' + (badge ? '<i class="side-dot">' + badge + '</i>' : '') + '</button>'; };
    var msN = dailyPending(), rdN = roadPending();
    html = topBar() +
      // título con los atajos a los lados, como las ofertas del género
      '<div class="home-top">' +
      '<div class="side-col">' + side('freeChest', 'chests/madera', freeChestLabel(), free ? 'glow' : '') + side('missions', 'ui/misiones', 'Misiones', msN ? 'glow' : '', msN) + side('codes', 'icons/ticket', 'Códigos') + '</div>' +
      '<div class="logo"><h1><img src="assets/ui/titulo.webp" alt="Reino de Torres"></h1></div>' +
      '<div class="side-col">' + side('road', 'icons/trofeo', 'Trofeos', rdN ? 'glow' : '', rdN) + side('howto', 'icons/pergamino', 'Ayuda') + side('options', 'icons/engranaje', 'Opciones') + '</div>' +
      '</div>' +
      // mazo: banner del comandante (figura a la izquierda, nombre en el hueco)
      // y debajo las cinco tropas, cada retrato en un aro del banner
      '<div class="deck-panel">' +
      '<button class="cmd-banner" data-go="commanders" style="--cc:' + cmd.color + '"><img src="' + cmd.body + '" alt=""><span class="cb-txt"><small>Habilidad</small><b>' + esc(cmd.ability) + '</b></span><span class="cb-slot">' + esc(cmd.name) + '</span></button>' +
      '<button class="deck-preview" data-go="collection" aria-label="Mazo actual">' + meta.deck.map(function (id, i) { return '<img src="' + unitIcon(id, 0, 96) + '" alt="' + esc(UNITS[id].name) + '" style="left:' + DECK_RINGS[i] + '%">'; }).join('') + '</button>' +
      '</div>' +
      // cuatro cartas de modo (assets/ui/modo-*, de assets/botones_jugar.jpg;
      // el nombre ya viene en la ilustración): campaña, 1 contra 1, 2 contra
      // la máquina y torneo. La de campaña lleva sus estrellas en una chapa.
      '<div class="mode-row">' +
      '<button class="mode-card" data-go="campaign" aria-label="Campaña"><img src="assets/ui/modo-campana.webp" alt=""><span class="mode-chip">' + ico('icons/estrella') + totalStars() + '/' + CAMPAIGN.length * 3 + '</span></button>' +
      '<button class="mode-card" data-go="duelPick" aria-label="1 contra 1"><img src="assets/ui/modo-duelo.webp" alt=""></button>' +
      // Co-op y Roguelike: ilustración sin el nombre (assets/ui/modo-coop-limpio y
      // modo-roguelike, la de 1 contra 1 en rojo) y el nombre escrito encima
      '<button class="mode-card" data-go="coop" aria-label="Co-op"><img src="assets/ui/modo-coop-limpio.webp" alt=""><span class="mode-name">Co-op</span></button>' +
      '<button class="mode-card" data-go="tourney" aria-label="Torneo"><img src="assets/ui/modo-torneo.webp" alt=""></button>' +
      '<button class="mode-card" data-go="rogue" aria-label="Roguelike"><img src="assets/ui/modo-roguelike.webp" alt=""><span class="mode-name long">Roguelike</span>' + (meta.rogueBest ? '<span class="mode-chip">' + meta.rogueBest + '/' + ROGUE_WAVES + '</span>' : '') + '</button>' +
      '</div>' +
      // huecos de cofre abajo del todo, debajo de los botones de jugar
      '<div class="slots" id="chestSlots">' + slotsInner() + '</div>';
  } else if (name === 'campaign') {
    // placas de madera con el color de su zona; la siguiente por jugar late
    var nextSt = CAMPAIGN.filter(function (st) { return stageUnlocked(st.id) && !meta.campaign[st.id]; })[0];
    html = backBar('Campaña', false, 'campana') + campaignMap(nextSt) + '<div class="stage-list">' + CAMPAIGN.map(function (st) {
      var open = stageUnlocked(st.id), stars = meta.campaign[st.id] || 0, z = stageZone(st.id);
      return (z.from === st.id ? '<h4 class="stage-zone" style="--zc:' + z.color + '"><span>Zona ' + (CAMPAIGN_ZONES.indexOf(z) + 1) + ' · ' + esc(z.name) + '</span><img src="' + chestPic(z.chest) + '" alt=""></h4>' : '') +
        '<button class="stage ' + (open ? '' : 'locked') + (nextSt === st ? ' next' : '') + '" style="--zc:' + (ZONE_COLOR[st.biome] || '#ffd166') + '" ' + (open ? 'data-stage="' + st.id + '"' : 'disabled') + '>' +
        '<span class="stage-n">' + st.id + '</span>' +
        '<span class="stage-t"><b>' + esc(st.name) + '</b><small>' + st.waves + ' oleadas · Jefe: ' + esc(BOSSES[st.boss].name) + '</small></span>' +
        '<span class="stage-s">' + (open ? starRow(stars) : '🔒') + '</span></button>';
    }).join('') + '</div>';
  } else if (name === 'duelPick') {
    // una fila por rival: su monstruo, el nivel de sus cartas y el premio en chapas
    html = backBar('1 contra 1', false, 'duelo') + arenaStrip() +
      '<div class="rival-list">' + ['Fácil', 'Normal', 'Difícil'].map(function (n, i) {
        return '<button class="rival-row d' + i + '" data-duel="' + i + '">' +
          '<span class="rv-face"><img src="assets/enemies/' + ['blob', 'orco', 'dragon'][i] + '.webp" alt=""></span>' +
          '<span class="rv-info"><b>' + n + '</b><small>' + rivalCardsText(DUEL_CARD_OFFSET[i]) + '</small></span>' +
          '<span class="rv-prize"><img class="rv-chest" src="' + chestPic(i >= 2 ? 'oro' : 'plata') + '" alt=""><span class="rv-chips">' + prizeChips(25 + i * 5, 60 + i * 40 + arenaIndex() * ARENA_GOLD, 0) + '</span></span></button>';
      }).join('') + '</div>' +
      recordChips(meta.duelWins, meta.duelLosses);
  } else if (name === 'rogue') {
    // portada del modo, tres datos y el premio por tramos
    html = backBar('Roguelike', false, 'rogue') +
      '<div class="mode-hero"><img src="assets/ui/modo-roguelike.webp" alt=""><span><b>' + ROGUE_WAVES + ' oleadas</b><small>Tú solo, con ventajas que se acumulan</small></span></div>' +
      '<div class="stat-tiles"><span>' + ico('icons/ola') + '<b>' + ROGUE_WAVES + '</b><small>oleadas</small></span>' +
      '<span>' + ico('icons/chispas') + '<b>' + ROGUE_PICK_EVERY + ' s</b><small>por ventaja</small></span>' +
      '<span>' + ico('icons/calavera') + '<b>×' + String(ROGUE_FINAL_HP).replace('.', ',') + '</b><small>jefe final</small></span></div>' +
      '<div class="tn-panel"><h3>Premios</h3><div class="prize-steps">' +
      [['madera', 'Oleada 10'], ['plata', 'Oleada 20'], ['oro', 'Jefe final']].map(function (p) {
        return '<span><img src="' + chestPic(p[0]) + '" alt=""><small>' + p[1] + '</small></span>';
      }).join('') + '</div></div>' +
      '<button class="btn btn-green tn-go" data-rogue="1">Jugar</button>' +
      '<div class="rec-row"><span class="rec-chip">' + ico('icons/trofeo') + '<b>' + (meta.rogueBest || 0) + '</b>récord</span></div>';
  } else if (name === 'road') {
    html = backBar('Trofeos', false, 'trofeos') + roadHtml();
  } else if (name === 'tourney') {
    // torneo: el nivel de cada rareza, el de los comandantes, el premio y a jugar
    var tm = meta.tourneyMode || 'clasico';
    html = backBar('Torneo', false, 'torneo') +
      '<div class="tn-modes">' + TOURNEY_MODES.map(function (t) {
        return '<button class="tn-mode' + (t.id === tm ? ' on' : '') + '" data-tmode="' + t.id + '"><b>' + esc(t.name) + '</b><small>' + esc(t.desc) + '</small></button>';
      }).join('') + '</div>' +
      '<div class="tn-panel"><h3>Nivel de torneo</h3><div class="tn-levels">' + Object.keys(RARITY).map(function (k) {
        return '<span class="tn-lv r-' + k + '" style="--rc:' + RARITY[k].color + '"><small>Nivel</small><b>' + TOURNEY_LV[k] + '</b><em>' + RARITY[k].name + '</em></span>';
      }).join('') + '</div>' +
      '<div class="tn-cmd"><span class="tn-faces">' + COMMANDER_ORDER.map(function (k) { return '<img src="' + COMMANDERS[k].pic + '" alt="" style="--cc:' + COMMANDERS[k].color + '">'; }).join('') + '</span><span>Comandantes al nivel <b>' + TOURNEY_CMD_LV + '</b></span></div></div>' +
      '<div class="tn-panel tn-prize"><img src="' + chestPic('comandante') + '" alt=""><span><b>Premio</b>' + prizeChips(0, 120, 4) + '<small>Cofre de comandante</small></span></div>' +
      '<button class="btn btn-green tn-go" data-tourney="1">Jugar</button>' +
      recordChips(meta.tourneyWins || 0, meta.tourneyLosses || 0);
  } else if (name === 'collection') {
    html = backBar('Mazo', true, 'mazo') + deckTabs('collection') +
      '<div class="deck-slots">' + meta.deck.map(function (id) { return cardHtml(id, true); }).join('') + '</div>' +
      '<div class="coll-head"><h3>Colección</h3>' + sortSwitch() + '</div>' +
      (collSort === 'tipo' ? elementFilters() : rarityFilters()) + collectionGrid();
  } else if (name === 'commanders') {
    html = backBar('Mazo', true, 'comandante') + deckTabs('commanders') + commandersHtml();
  } else if (name === 'shop') {
    html = backBar('Tienda', true, 'tienda') + shopHtml();
  } else if (name === 'howto') {
    html = backBar('Cómo jugar') + '<div class="help-grid">' + HELP.map(function (h) {
      return '<div class="help-card"><span class="help-ico">' + ico(h[0]) + '</span><span><b>' + h[1] + '</b><small>' + h[2] + '</small></span></div>';
    }).join('') + '</div>';
  }
  m.innerHTML = icons(html);
  m.scrollTop = keepScroll;
  bindMenu();
  // camino de trofeos: a la vista lo que toca (por cobrar o la siguiente parada)
  if (name === 'road') {
    var at = m.querySelector('.rd-stop.ready') || m.querySelector('.rd-stop.lock');
    if (at) at.scrollIntoView({ block: 'center' });
  }
}
/* Cómo jugar: icono, título y una frase por ficha. */
var HELP = [
  ['icons/dado', 'Invoca', 'Saca una tropa al azar de tu mazo. Cada invocación cuesta 10 de maná más.'],
  ['icons/chispas', 'Fusiona', 'Arrastra una tropa sobre otra igual y del mismo rango para subirla de rango.'],
  ['icons/recolocar', 'Recoloca', 'Arrastra una tropa a otra casilla o sobre otra para intercambiarlas.'],
  ['icons/mejorar', 'Mejora', 'Toca una carta de abajo para mejorar todas las tropas de ese tipo.'],
  ['icons/vecinas', 'Afinidad', 'Cada vecina del mismo elemento da un 12% más de daño.'],
  ['tiles/altar', 'Casillas especiales', 'Altar: más daño. Fuente: maná. Atalaya: más velocidad.'],
  ['icons/corona', 'Comandante', 'Cuando su retrato brilla, tócalo para usar su habilidad.'],
  ['icons/rayo', 'Combos', 'Dos fusiones seguidas en menos de 2 segundos dan maná extra.'],
  ['icons/gota', 'Maná', 'Se gana derrotando monstruos, con Doblón, Oria y la Fuente.'],
  ['events/eclipse', 'Eventos', 'Algunas oleadas traen Eclipse, Lluvia de maná, Niebla, Horda o Calma.'],
  ['icons/estrella', 'Talentos', 'Lyra, Brasa y Nívea abren ramas en los niveles 3, 6 y 9.'],
  ['icons/gema', 'Gemas', 'Salen en cofres, estrellas nuevas, duelos y Co-op. Se gastan en la tienda.']
];
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
    '<div class="sh-head"><h3>Cofres</h3></div><div class="sh-chests">' + chests + '</div>' +
    '<div class="sh-head"><h3>Oro</h3></div><div class="sh-golds">' + golds + '</div>';
}
function rivalCardsText(off) {
  if (!off) return 'Cartas a tu nivel';
  return 'Cartas ' + (off < 0 ? '−' : '+') + Math.abs(off) + (Math.abs(off) === 1 ? ' nivel' : ' niveles');
}
// chapas de premio con su icono (trofeos, oro y gemas; las que sean 0 no salen)
function prizeChips(trophies, gold, gems) {
  var chip = function (pic, v) { return v ? '<span class="pz-chip' + (v < 0 ? ' neg' : '') + '">' + ico(pic) + '<b>' + v + '</b></span>' : ''; };
  return chip('icons/trofeo', trophies) + chip('icons/moneda', gold) + chip('icons/gema', gems);
}
function recordChips(w, l) {
  return '<div class="rec-row"><span class="rec-chip win"><b>' + w + '</b>victorias</span><span class="rec-chip lose"><b>' + l + '</b>derrotas</span></div>';
}
/* Mapa de la campaña: cada zona es un camino de 10 fases que sube y baja,
   con lo recorrido en dorado, tu comandante encima de la siguiente fase y
   corona en la última de la zona. Arriba, el cofre que da la zona. Al tocar
   una fase baja a su placa. */
function campaignMap(nextSt) {
  var curve = function (list) {
    return 'M' + list[0].x + ' ' + list[0].y + list.slice(1).map(function (q, k) {
      var o = list[k], mx = (o.x + q.x) / 2;
      return ' C' + mx + ' ' + o.y + ' ' + mx + ' ' + q.y + ' ' + q.x + ' ' + q.y;
    }).join('');
  };
  return '<div class="camp-map">' + CAMPAIGN_ZONES.map(function (z, zi) {
    var ids = [];
    for (var id = z.from; id <= z.to; id++) ids.push(id);
    var n = ids.length, done = 0, stars = 0;
    var pts = ids.map(function (id, k) { return { x: 6 + k * 88 / Math.max(1, n - 1), y: k % 2 ? 68 : 32 }; });
    ids.forEach(function (id, k) { if (meta.campaign[id]) done = k + 1; stars += meta.campaign[id] || 0; });
    return '<div class="cm-zone' + (stageUnlocked(z.from) ? '' : ' locked') + '" style="--zc:' + z.color + '">' +
      '<div class="cm-head"><img src="' + chestPic(z.chest) + '" alt=""><span><b>Zona ' + (zi + 1) + ' · ' + esc(z.name) + '</b>' +
      '<small>Premio: cofre de ' + z.chest + '</small></span><em>' + ico('icons/estrella') + stars + '/' + n * 3 + '</em></div>' +
      '<div class="cm-trail"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="cm-path" d="' + curve(pts) + '"/>' +
      (done ? '<path class="cm-path done" d="' + curve(pts.slice(0, done + 1)) + '"/>' : '') + '</svg>' +
      ids.map(function (id, k) {
        var s = meta.campaign[id] || 0, nx = nextSt && nextSt.id === id, last = k === n - 1;
        return '<button class="cm-node' + (s ? ' done' : stageUnlocked(id) ? ' open' : ' lock') + (nx ? ' next' : '') + (last ? ' end' : '') + '" style="left:' + pts[k].x + '%;top:' + pts[k].y + '%" data-goto="' + id + '" aria-label="Fase ' + id + '">' +
          (last ? '<i class="cm-crown">' + ico('icons/corona') + '</i>' : '') +
          (nx ? '<img class="cm-here" src="' + COMMANDERS[meta.commander].pic + '" alt="">' : '') +
          '<b>' + id + '</b>' +
          (s ? '<i class="cm-st">' + [0, 1, 2].map(function (j) { return '<u class="' + (j < s ? 'on' : '') + '"></u>'; }).join('') + '</i>' : '') + '</button>';
      }).join('') + '</div></div>';
  }).join('') + '</div>';
}

/* ---------- arenas y camino de trofeos ---------- */
function arenaPic(i) { var f = ARENAS[i].field; return f === 'prado' ? 'assets/tablero.webp' : 'assets/boards/' + f + '.webp'; }
// franja del 1 contra 1: tu arena, tus trofeos y lo que falta para la siguiente parada
function arenaStrip() {
  var ai = arenaIndex(), ni = roadNext(), pend = roadPending();
  var stop = ni == null ? null : TROPHY_ROAD[ni], base = ni ? TROPHY_ROAD[ni - 1].at : 0;
  var pct = stop ? Math.min(100, Math.max(0, (meta.trophyBest - base) / (stop.at - base) * 100)) : 100;
  return '<button class="arena-strip" data-go="road"><img src="' + arenaPic(ai) + '" alt="">' +
    '<span class="as-txt"><small>Arena ' + (ai + 1) + ' · Camino de trofeos</small><b>' + esc(ARENAS[ai].name) + '</b>' +
    '<span class="ubar' + (pend || !stop ? ' ok' : '') + '"><span style="width:' + pct + '%"></span><em>' + (pend ? '¡Premio por cobrar!' : stop ? meta.trophyBest + '/' + stop.at : 'Camino completo') + '</em></span></span>' +
    '<span class="as-tro">' + ico('icons/trofeo') + '<b>' + meta.trophies + '</b></span></button>';
}
var RARITY_PLURAL = { comun: 'comunes', rara: 'raras', epica: 'épicas', mitica: 'míticas', legendaria: 'legendarias' };
// cómo se ve el premio de una parada: imagen, título y detalle
function roadReward(s) {
  if (s.arena != null) return { pic: arenaPic(s.arena), title: 'Arena ' + (s.arena + 1) + ': ' + ARENAS[s.arena].name, sub: (s.gems ? '+' + s.gems + ' 💎 · ' : '') + '+' + s.arena * ARENA_GOLD + ' 🪙 por victoria' };
  if (s.chest) return { pic: chestPic(s.chest), title: CHESTS[s.chest].name, sub: 'Se abre al cobrarlo' };
  if (s.cards) {
    var r = s.cards.rarity;
    return { pic: 'assets/ui/fondo-carta-' + r + '.webp', title: s.cards.n + (s.cards.n > 1 ? ' cartas ' + RARITY_PLURAL[r] : ' carta ' + RARITY[r].name.toLowerCase()), sub: 'De una tropa al azar, mejor una que no tengas', rc: RARITY[r].color, card: true };
  }
  if (s.gems) return { pic: 'assets/icons/gema.webp', title: '+' + s.gems + ' gemas' };
  return { pic: 'assets/chests/oro-' + (s.gold >= 2500 ? 'rebosante' : s.gold >= 1000 ? 'saco' : 'monedas') + '.webp', title: '+' + s.gold + ' de oro' };
}
function roadHtml() {
  var ai = arenaIndex(), best = meta.trophyBest;
  var stops = TROPHY_ROAD.map(function (s, i) {
    var r = roadReward(s), got = roadClaimed(i), ready = roadReady(i);
    return '<div class="rd-stop ' + (got ? 'got' : ready ? 'ready' : 'lock') + (s.arena != null ? ' arena' : '') + (best >= s.at ? ' reach' : '') + '">' +
      '<span class="rd-at">' + ico('icons/trofeo') + '<b>' + s.at + '</b></span>' +
      '<div class="rd-card"' + (r.rc ? ' style="--rc:' + r.rc + '"' : '') + '><span class="rd-pic' + (r.card ? ' card' : '') + '">' +
      (r.card ? (s.cards.n > 1 ? '<u style="background-image:url(' + r.pic + ')"></u>' : '') + '<u style="background-image:url(' + r.pic + ')"><i>?</i></u>' : '<img src="' + r.pic + '" alt="">') + '</span>' +
      '<span class="rd-txt"><b>' + esc(r.title) + '</b>' + (r.sub ? '<small>' + r.sub + '</small>' : '') + '</span>' +
      (got ? '<i class="rd-ok">✔</i>' : ready ? '<button class="btn btn-green rd-claim" data-road="' + i + '">Cobrar</button>' : '<i class="rd-lock">🔒</i>') + '</div></div>';
  }).join('');
  return '<div class="rd-head"><img src="' + arenaPic(ai) + '" alt=""><span><small>Arena ' + (ai + 1) + ' de ' + ARENAS.length + '</small><b>' + esc(ARENAS[ai].name) + '</b>' +
    '<em>' + ico('icons/trofeo') + meta.trophies + ' trofeos · récord ' + best + '</em></span></div>' +
    '<div class="road">' + stops + '</div>';
}
function claimRoadStop(i) {
  var r = claimRoad(i);
  if (!r) return;
  buzz(30);
  var extra = [r.gold ? '+' + r.gold + ' 🪙' : '', r.gems ? '+' + r.gems + ' 💎' : ''].filter(Boolean).join(' · ');
  if (r.chest) { showChest(r.chest); if (extra) toast(extra); return; }
  sfx('chest');
  if (r.card) {
    var u = UNITS[r.card.id];
    openOverlay('<div class="modal-card chest-modal"><div class="chest-cards"><div class="chest-card' + (r.card.fresh ? ' fresh' : '') + '" style="--rc:' + RARITY[u.rarity].color + '"><img src="' + unitIcon(r.card.id, 0, 96) + '" alt=""><b>×' + r.card.n + '</b><small>' + esc(u.name) + '</small></div></div>' +
      '<h2>' + (r.card.fresh ? '¡Tropa nueva!' : '¡Cartas!') + '</h2><p class="gold-big">' + r.card.n + (r.card.n > 1 ? ' cartas' : ' carta') + ' de ' + esc(u.name) + '</p>' +
      '<button class="btn chest-ok" id="chestOk">¡Genial!</button></div>');
    $('chestOk').onclick = function () { closeOverlay(); renderMenu(currentScreen); };
    return;
  }
  toast(extra);
  renderMenu(currentScreen);
}

/* ---------- misiones diarias ----------
   Tres al día con su barra y su premio; con las tres cobradas se abre el
   premio del día (DAILY_BONUS). */
function showMissions() {
  var d = dailyMissions(), gotN = d.list.filter(function (m) { return m.got; }).length, bonus = dailyBonusReady();
  var now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  var left = Math.max(1, Math.ceil((mid - now) / 3600000));
  openOverlay('<div class="modal-card missions"><img class="ms-medal" src="assets/ui/misiones.webp" alt=""><h2>Misiones diarias</h2>' +
    '<span class="time-chip">' + ico('icons/reloj') + 'Nuevas en ' + left + ' h</span>' +
    d.list.map(function (m, i) {
      var M = MISSIONS[m.k], done = m.prog >= m.goal;
      return '<div class="ms-row' + (m.got ? ' got' : done ? ' ready' : '') + '"><span class="ms-ico">' + ico(M.icon) + '</span>' +
        '<span class="ms-body"><b>' + esc(missionText(m.k, m.goal)) + '</b>' +
        '<span class="ubar' + (done ? ' ok' : '') + '"><span style="width:' + (m.prog / m.goal * 100) + '%"></span><em>' + m.prog + '/' + m.goal + '</em></span>' +
        '<span class="ms-prize">' + prizeChips(0, m.gold, m.gems) + '</span></span>' +
        (m.got ? '<i class="ms-ok">✔</i>' : '<button class="btn btn-green ms-claim" data-ms="' + i + '"' + (done ? '' : ' disabled') + '>Reclamar</button>') + '</div>';
    }).join('') +
    '<div class="ms-row ms-bonus' + (d.bonus ? ' got' : bonus ? ' ready' : '') + '"><span class="ms-ico"><img src="' + chestPic(DAILY_BONUS) + '" alt=""></span>' +
    '<span class="ms-body"><b>Premio del día</b><small>' + gotN + '/' + d.list.length + ' misiones cobradas</small></span>' +
    (d.bonus ? '<i class="ms-ok">✔</i>' : '<button class="btn btn-green ms-claim" id="msBonus"' + (bonus ? '' : ' disabled') + '>Abrir</button>') + '</div>' +
    '<button class="btn btn-ghost" id="msX">Cerrar</button></div>');
  document.querySelectorAll('[data-ms]').forEach(function (b) {
    b.onclick = function () {
      var m = claimMission(+b.dataset.ms);
      if (!m) return;
      sfx('chest'); buzz(20);
      toast('+' + m.gold + ' 🪙 · +' + m.gems + ' 💎');
      if (currentScreen !== 'battle') renderMenu(currentScreen);
      showMissions();
    };
  });
  if ($('msBonus')) $('msBonus').onclick = function () { var r = claimDailyBonus(); if (!r) return; closeOverlay(); showChest(r); };
  $('msX').onclick = function () { sfx('tap'); closeOverlay(); renderMenu(currentScreen); };
}

// efecto ilustrado de la habilidad de cada comandante (assets/fx)
var CMD_FX = { aria: 'ventisca', merlo: 'marea', brann: 'meteoro', nyx: 'nyx-maldicion', sol: 'sol-escudo', morgana: 'morgana-ensamblaje', torvald: 'torvald-forja' };
/* Árbol de habilidades del comandante elegido: un piso por nivel de
   CMD_TREE_LV; en el primero se elige 1 rama y en el segundo 2 (se pueden
   cambiar cuando quieras). */
function cmdTreeHtml(k, lv) {
  var picks = (meta.cmdTree && meta.cmdTree[k]) || [];
  return '<div class="ct-tree" style="--cc:' + COMMANDERS[k].color + '"><h3>Habilidades de ' + esc(COMMANDERS[k].name) + '</h3>' +
    treeHtml(TREE_CMD, CMD_TREE[k].map(function (tier, t) {
      return { lv: CMD_TREE_LV[t], n: CMD_TREE_PICK[t], open: lv >= CMD_TREE_LV[t], picked: picks[t] || [], nodes: tier, owner: k, attr: 'data-ctree' };
    }), 'Puedes cambiarlas cuando quieras.') + '</div>';
}

/* Pestaña Comandante: fila de retratos para elegir y, debajo, la ficha del
   que estás viendo (figura, habilidad, nivel y mejora) con su árbol a la
   vista. Tocar uno tuyo lo pone en el mazo; uno bloqueado solo se mira. */
var cmdView = null;
function commandersHtml() {
  if (!cmdView || !COMMANDERS[cmdView]) cmdView = meta.commander;
  var k = cmdView, c = COMMANDERS[k], own = cmdOwned(k), cc = meta.cmdCards[k] || { lv: 1, n: 0 }, lv = own ? cc.lv : 1;
  var pick = '<div class="cmd-pick">' + COMMANDER_ORDER.map(function (q) {
    var o = COMMANDERS[q], mine = cmdOwned(q);
    return '<button class="cp-btn' + (q === k ? ' view' : '') + (q === meta.commander ? ' eq' : '') + (mine ? '' : ' locked') + '" data-cmd="' + q + '" style="--cc:' + o.color + '" aria-label="' + esc(o.name) + '">' +
      '<span class="cp-face"><img src="' + o.pic + '" alt=""></span>' +
      (mine ? '<span class="cp-lv' + (canUpgradeCmd(q) ? ' ready' : '') + '">' + cmdLevel(q) + '</span>' : '<span class="cp-lock">' + ico('icons/candado') + '</span>') + '</button>';
  }).join('') + '</div>';
  var level = '';
  if (own) {
    var need = cmdCardsNeeded(cc.lv), gold = cmdUpgradeGold(cc.lv), max = cc.lv >= CMD_MAX;
    var why = max ? '' : cc.n < need ? (need - cc.n === 1 ? 'Falta 1 carta' : 'Faltan ' + (need - cc.n) + ' cartas') : meta.gold < gold ? 'Te faltan ' + (gold - meta.gold) + ' 🪙' : '';
    level = '<div class="ch-level"><span class="uc-lvmedal">' + cc.lv + '</span><div class="uc-lvbody"><div class="uc-lvtop"><b>' + (max ? 'Nivel máximo' : 'Nivel ' + cc.lv) + '</b>' +
      (max ? '' : '<span class="uc-gain">💪 ' + Math.round(cmdGrow(k, cc.lv) * 100) + '% → <b>' + Math.round(cmdGrow(k, cc.lv + 1) * 100) + '%</b></span>') + '</div>' +
      '<div class="ubar' + (canUpgradeCmd(k) ? ' ok' : '') + '"><span style="width:' + (max ? 100 : Math.min(100, cc.n / need * 100)) + '%"></span><em>' + (max ? 'MÁX' : cc.n + '/' + need) + '</em></div></div></div>' +
      (max ? '' : '<button class="btn btn-up cmd-upbtn" id="cmdUp" ' + (canUpgradeCmd(k) ? '' : 'disabled') + '>⬆ Mejorar ' + gold + ' 🪙</button>' + (why ? '<p class="cmd-why">' + why + '</p>' : ''));
  }
  var state = !own ? '<span class="ch-state locked">' + ico('icons/candado') + 'Cofre de comandante</span>'
    : k === meta.commander ? '<span class="ch-state on">✔ En tu mazo</span>' : '';
  return pick +
    '<div class="cmd-hero' + (own ? '' : ' locked') + '" style="--cc:' + c.color + '">' +
    '<div class="ch-top"><div class="ch-stage"><img class="ch-body" src="' + c.body + '" alt=""></div>' +
    '<div class="ch-info"><small class="ch-title">' + esc(c.title) + '</small><b class="ch-name">' + esc(c.name) + '</b>' + state +
    '<div class="ch-ab"><img src="' + cmdFxPic(k) + '" alt=""><span><em>' + esc(c.ability) + '</em><small>' + esc(cmdDesc(k, lv)) + '</small></span></div>' +
    '<span class="ch-cd">' + ico('icons/reloj') + 'Se carga en ' + cmdCd(k, lv) + ' s</span></div></div>' +
    level + '</div>' +
    cmdTreeHtml(k, own ? lv : 0);
}
function cmdFxPic(k) { return CMD_FX[k] ? 'assets/fx/' + CMD_FX[k] + '.webp' : COMMANDERS[k].pic; }
// Pestañas dentro de Mazo: tropas y comandante.
function deckTabs(on) {
  return '<div class="sub-tabs"><button data-go="collection" class="' + (on === 'collection' ? 'on' : '') + '">Tropas</button>' +
    '<button data-go="commanders" class="' + (on === 'commanders' ? 'on' : '') + '">👑 Comandante</button></div>';
}
// tab: pantalla de la barra de abajo, sin botón de volver; info: clave de
// INFO, que pone el botón «?» junto al título con la explicación de la pantalla
function backBar(title, tab, info) {
  return '<div class="back-bar">' + (tab ? '' : '<button class="back" data-go="home">‹</button>') +
    '<h2' + (title.length > 9 ? ' class="long"' : '') + '>' + title + '</h2>' +
    (info ? '<button class="info-btn" data-info="' + info + '" aria-label="Cómo funciona">?</button>' : '') +
    '<span class="pill gold">🪙 <b>' + meta.gold + '</b></span><span class="pill gem">💎 <b>' + meta.gems + '</b></span></div>';
}
/* Explicación de cada pantalla, en la ficha del botón «?»: icono y una
   frase por línea, para que las pantallas no lleven párrafos sueltos. */
var INFO = {
  mazo: { title: 'Mazo', rows: [
    ['icons/espadas', 'Llevas cinco tropas a cada partida. Toca una carta para verla, mejorarla o cambiarla.'],
    ['icons/vecinas', 'Afinidad: cada vecina del mismo elemento da un 12% más de daño.'],
    ['icons/mejorar', 'Las cartas repetidas suben de nivel a la tropa.']] },
  comandante: { title: 'Comandante', rows: [
    ['icons/reloj', 'Su habilidad se carga durante la partida. Toca su retrato para usarla.'],
    ['icons/mano', 'Morgana y Torvald la usan sobre el tablero: eliges tú las tropas.'],
    ['chests/comandante', 'Sus cartas salen en el cofre de comandante, que se gana en el Torneo y está en la tienda.']] },
  duelo: { title: '1 contra 1', rows: [
    ['icons/espadas', 'Los mismos monstruos para los dos. Gana quien aguante más.'],
    ['icons/dado', 'Antes de empezar, la ruleta elige un modificador y el jefe final.'],
    ['icons/trofeo', 'Cada victoria suma trofeos y abre arenas nuevas.']] },
  torneo: { title: 'Torneo', rows: [
    ['icons/estrella', 'Tus cartas y las del rival, al mismo nivel. Solo cuenta cómo juegas.'],
    ['icons/dado', 'Juega con tu mazo, con un mazo prestado o con cartas al azar.'],
    ['chests/comandante', 'Si ganas, cofre de comandante.']] },
  rogue: { title: 'Roguelike', rows: [
    ['icons/ola', 'Tú solo contra ' + ROGUE_WAVES + ' oleadas.'],
    ['icons/chispas', 'Cada ' + ROGUE_PICK_EVERY + ' s eliges una ventaja de tres. Se acumulan hasta el final.'],
    ['icons/calavera', 'El jefe final lo elige la ruleta y llega con ' + String(ROGUE_FINAL_HP).replace('.', ',') + ' veces más vida.']] },
  trofeos: { title: 'Trofeos', rows: [
    ['icons/trofeo', 'Gana duelos 1 contra 1 para sumar trofeos.'],
    ['icons/estrella', 'Cada parada se cobra una vez, aunque luego bajes.'],
    ['icons/moneda', 'Cada arena nueva da más oro por victoria.']] },
  tienda: { title: 'Tienda', rows: [
    ['icons/reloj', 'Las ofertas de cartas cambian cada día.'],
    ['icons/gema', 'Ganas gemas en los cofres, con estrellas nuevas de campaña, en los duelos y en Co-op.']] },
  campana: { title: 'Campaña', rows: [
    ['icons/estrella', 'Hasta tres estrellas por fase, según las vidas que te queden.'],
    ['chests/madera', 'Cada zona da su cofre, y uno mejor si sacas estrellas nuevas.']] }
};
function showInfo(k) {
  var inf = INFO[k];
  if (!inf) return;
  openOverlay('<div class="modal-card info-card"><h2>' + esc(inf.title) + '</h2><div class="info-list">' +
    inf.rows.map(function (r) { return '<div class="info-row"><span class="info-ico">' + ico(r[0]) + '</span><p>' + r[1] + '</p></div>'; }).join('') +
    '</div><button class="btn btn-green" id="infoOk">Entendido</button></div>');
  $('infoOk').onclick = function () { sfx('tap'); closeOverlay(); };
}
/* Filtro por rareza de la colección: todas o una rareza, con cuántas tienes de cada. */
var collFilter = 'all';
function rarityFilters() {
  var keys = ['all'].concat(Object.keys(RARITY));
  // pestañas de madera unidas por cuerdas (assets/ui/filtro-rareza, de assets/filtros-tabs.jpg)
  return '<div class="rar-filters rar-tabs">' + keys.map(function (k) {
    var ids = UNIT_ORDER.filter(function (id) { return k === 'all' || UNITS[id].rarity === k; });
    var own = ids.filter(isUnlocked).length;
    return '<button class="rar-f' + (collFilter === k ? ' on' : '') + '" data-rf="' + k + '" style="--rc:' + (k === 'all' ? 'var(--ui-gold)' : RARITY[k].color) + '">' +
      '<span class="rf-n">' + (k === 'all' ? 'Todas' : RARITY[k].name) + '</span><small>' + own + '/' + ids.length + '</small></button>';
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
      if (g === 'missions') { showMissions(); return; }
      if (g === 'options') { showOptions(); return; }
      if (g === 'freeChest') { var r = claimFreeChest(); if (r) showChest(r); else toast('⏱ Otro cofre gratis en ' + fmtDur(freeChestLeft())); return; }
      showScreen(g);
    };
  });
  m.querySelectorAll('[data-info]').forEach(function (b) { b.onclick = function () { sfx('tap'); showInfo(b.dataset.info); }; });
  m.querySelectorAll('[data-stage]').forEach(function (b) { b.onclick = function () { startBattle('campaign', { stage: +b.dataset.stage }); }; });
  // mapa de la campaña: lleva a la placa de la fase y la hace brillar
  m.querySelectorAll('[data-goto]').forEach(function (b) {
    b.onclick = function () {
      var el = m.querySelector('[data-stage="' + b.dataset.goto + '"]');
      if (!el) { sfx('no'); toast('Gana la fase anterior para abrirla'); return; }
      sfx('tap');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    };
  });
  m.querySelectorAll('[data-road]').forEach(function (b) { b.onclick = function () { claimRoadStop(+b.dataset.road); }; });
  m.querySelectorAll('[data-duel]').forEach(function (b) { b.onclick = function () { startBattle('duel', { level: +b.dataset.duel }); }; });
  m.querySelectorAll('[data-tourney]').forEach(function (b) { b.onclick = function () { startBattle('duel', { tourney: true, level: 1, tmode: meta.tourneyMode || 'clasico' }); }; });
  m.querySelectorAll('[data-tmode]').forEach(function (b) { b.onclick = function () { meta.tourneyMode = b.dataset.tmode; saveMeta(); sfx('tap'); renderMenu('tourney'); }; });
  m.querySelectorAll('[data-rogue]').forEach(function (b) { b.onclick = function () { startBattle('rogue'); }; });
  var cu = $('cmdUp');
  if (cu) cu.onclick = function () {
    var k = cmdView || meta.commander;
    if (upgradeCmd(k)) { sfx('power'); buzz(20); toast(COMMANDERS[k].name + ' sube a nivel ' + cmdLevel(k)); renderMenu('commanders'); }
  };
  m.querySelectorAll('[data-ctree]').forEach(function (b) {
    b.onclick = function () {
      var t = +b.dataset.ctree.split(':')[0], id = b.dataset.ctree.split(':')[1], k = cmdView || meta.commander;
      var cn = CMD_TREE[k][t].filter(function (o) { return o.id === id; })[0];
      if (!cmdOwned(k)) { sfx('tap'); toast(cn.name + ': ' + cn.desc); return; }
      if (cmdLevel(k) < CMD_TREE_LV[t]) { sfx('tap'); toast(cn.name + ': ' + cn.desc + ' Se abre en el nivel ' + CMD_TREE_LV[t] + '.'); return; }
      if (!meta.cmdTree) meta.cmdTree = {};
      var picks = (meta.cmdTree[k] || []).map(function (x) { return (x || []).slice(); });
      var mine = picks[t] || [], at = mine.indexOf(id);
      if (at !== -1) mine.splice(at, 1);
      else { mine.push(id); while (mine.length > CMD_TREE_PICK[t]) mine.shift(); }  // con el piso lleno, cambia la más antigua
      picks[t] = mine; meta.cmdTree[k] = picks; saveMeta();
      toast(cn.name + ': ' + cn.desc);
      sfx('power'); renderMenu('commanders');   // misma pantalla: se queda donde estaba
    };
  });
  m.querySelectorAll('[data-cmd]').forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.cmd;
      cmdView = k; sfx('tap');
      if (cmdOwned(k)) { meta.commander = k; saveMeta(); }
      renderMenu('commanders');
    };
  });
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
  if (u.wild) t.push(['✨', 'Comodín', 'Se fusiona con cualquier tropa de su rango'], ['🎲', 'Resuena', Math.round(u.wild.echo * 100) + '% de subir 2 rangos']);
  if (u.interest) t.push(['💧', 'Intereses', Math.round(u.interest.pct * 100) + '% del maná cada ' + u.interest.every + ' s']);
  if (u.wolves) t.push(['🐺', 'Manada', u.wolves.bites + ' mordiscos por lobo, más con rango']);
  if (u.execute) t.push(['💀', 'Remate', 'Bajo el ' + Math.round(u.execute * 100) + '% cae al instante']);
  if (u.dmg && !u.wolves) t.push(['🎯', 'Objetivo', u.target === 'strong' ? 'El más fuerte' : 'El primero']);
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
  var u = UNITS[id], tal = TALENTS[id] && meta.cards[id];
  var on = tab === 'stats' || (tab === 'talents' && tal) ? tab : 'video';
  return '<div class="uc-tabs"><button data-uct="video" class="' + (on === 'video' ? 'on' : '') + '">Vídeo</button><button data-uct="stats" class="' + (on === 'stats' ? 'on' : '') + '">Stats</button>' +
    (tal ? '<button data-uct="talents" class="' + (on === 'talents' ? 'on' : '') + '">Talentos' + (talentPending(id) ? '<i class="tab-dot"></i>' : '') + '</button>' : '') + '</div>' +
    '<div class="uc-pane" data-ucp="video"' + (on === 'video' ? '' : ' hidden') + '><div class="uc-demo"><canvas id="ucDemo" aria-label="' + esc(u.name) + ' en acción"></canvas><span>En acción</span></div></div>' +
    '<div class="uc-pane" data-ucp="stats"' + (on === 'stats' ? '' : ' hidden') + '>' + statsHtml + '</div>' +
    (tal ? '<div class="uc-pane" data-ucp="talents"' + (on === 'talents' ? '' : ' hidden') + '>' + talentTreeHtml(id) + '</div>' : '');
}
/* Árbol de talentos: un piso por nivel de TALENT_LV con dos ramas; la
   elegida brilla y se puede cambiar cuando quieras. */
function talentPicks(id) { return (meta.talents && meta.talents[id]) || []; }
function talentPending(id) {
  var lv = meta.cards[id] ? meta.cards[id].lv : 0, picks = talentPicks(id);
  return TALENT_LV.some(function (need, t) { return lv >= need && !picks[t]; });
}
function talentTreeHtml(id) {
  var lv = meta.cards[id].lv, picks = talentPicks(id);
  return treeHtml(TREE_TROOP, TALENTS[id].map(function (tier, t) {
    return { lv: TALENT_LV[t], n: 1, open: lv >= TALENT_LV[t], picked: picks[t] ? [picks[t]] : [], nodes: tier, owner: id, attr: 'data-tal' };
  }), 'Cada piso se abre con el nivel de la carta. Elige una rama en cada uno; puedes cambiarla cuando quieras.');
}
// casillas del árbol de talentos de la ficha: las bloqueadas solo dicen qué
// hacen; al elegir se repinta solo el árbol, sin mover la ficha
function bindTalents(id) {
  document.querySelectorAll('[data-tal]').forEach(function (b) {
    b.onclick = function () {
      var t = +b.dataset.tal.split(':')[0], k = b.dataset.tal.split(':')[1];
      var tn = TALENTS[id][t].filter(function (o) { return o.id === k; })[0];
      if (meta.cards[id].lv < TALENT_LV[t]) { sfx('tap'); toast(tn.name + ': ' + tn.desc + ' Se abre en el nivel ' + TALENT_LV[t] + '.'); return; }
      if (!meta.talents) meta.talents = {};
      var picks = (meta.talents[id] || [null, null, null]).slice();
      picks[t] = k; meta.talents[id] = picks; saveMeta();
      toast(tn.name + ': ' + tn.desc);
      sfx('power');
      var pane = document.querySelector('[data-ucp="talents"]');
      if (pane) { pane.innerHTML = icons(talentTreeHtml(id)); bindTalents(id); }
      var dot = document.querySelector('[data-uct="talents"] .tab-dot');
      if (dot && !talentPending(id)) dot.remove();
      renderMenu(currentScreen);
    };
  });
}
/* Árbol con la ilustración de assets/ui/arbol-* (sin texto): las casillas de
   cada piso, de abajo arriba, en píxeles de la imagen (box: lado de la
   casilla). En cada una, el icono de su rama; en el rombo, el nivel. */
var TREE_TROOP = { img: 'assets/ui/arbol-talentos.webp', w: 687, h: 1344, box: 156,
  tiers: [{ at: [[97, 760], [435, 760]], badge: [343, 1013] }, { at: [[97, 440], [435, 440]], badge: [343, 693] }, { at: [[97, 120], [435, 120]], badge: [343, 368] }] };
var TREE_CMD = { img: 'assets/ui/arbol-comandante.webp', w: 687, h: 1024, box: 156,
  tiers: [{ at: [[97, 440], [435, 440]], badge: [343, 693] }, { at: [[97, 120], [267, 94], [435, 120]], badge: [343, 368] }] };
function treeHtml(g, tiers, note) {
  var pc = function (v, tot) { return (v / tot * 100).toFixed(2) + '%'; };
  var html = '<div class="tree" style="aspect-ratio:' + g.w + ' / ' + g.h + ';background-image:url(' + g.img + ')">';
  tiers.forEach(function (tr, t) {
    var geo = g.tiers[t];
    tr.nodes.forEach(function (o, k) {
      var at = geo.at[k], on = tr.picked.indexOf(o.id) !== -1;
      html += '<button class="tree-node' + (on ? ' on' : '') + (tr.open ? '' : ' locked') + '" ' + tr.attr + '="' + t + ':' + o.id + '"' +
        ' style="left:' + pc(at[0], g.w) + ';top:' + pc(at[1], g.h) + ';width:' + pc(g.box, g.w) + ';height:' + pc(g.box, g.h) + '" aria-label="' + esc(o.name) + '">' +
        '<img src="assets/' + (TREE_ICO[tr.owner + ':' + o.id] || 'icons/estrella') + '.webp" alt=""></button>';
    });
    html += '<span class="tree-lv' + (tr.open ? '' : ' locked') + '" style="left:' + pc(geo.badge[0], g.w) + ';top:' + pc(geo.badge[1], g.h) + '">' + tr.lv + '</span>';
  });
  html += '</div><div class="tree-list">' + tiers.map(function (tr) {
    var head = (tr.open ? '' : '🔒 ') + '<b>Nivel ' + tr.lv + '</b> · ' + (tr.open ? 'elige ' + tr.n + ' de ' + tr.nodes.length : 'se abre en el nivel ' + tr.lv);
    return '<p class="' + (tr.open ? '' : 'locked') + '">' + head + tr.nodes.map(function (o) {
      var on = tr.picked.indexOf(o.id) !== -1;
      return '<span class="' + (on ? 'on' : '') + '"><img src="assets/' + (TREE_ICO[tr.owner + ':' + o.id] || 'icons/estrella') + '.webp" alt=""><i><em>' + esc(o.name) + (on ? ' ✔' : '') + ':</em> ' + esc(o.desc) + '</i></span>';
    }).join('') + '</p>';
  }).reverse().join('') + '</div>' + (note ? '<p class="tal-note">' + note + '</p>' : '');
  return html;
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
  if (u.wild) rows.push(['🎲', 'Resuena %', Math.round(u.wild.echo * m(lv) * 100), Math.round(u.wild.echo * m(lv + 1) * 100)]);
  if (u.interest) rows.push(['🔒', 'Tope', Math.round(u.interest.cap * m(lv)), Math.round(u.interest.cap * m(lv + 1))]);
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
    : u.buff ? '<span class="uc-gain">🎵 ' + buffAt(c.lv) + '% → <b>' + buffAt(c.lv + 1) + '%</b></span>'
    : u.wild ? '<span class="uc-gain">🎲 ' + Math.round(u.wild.echo * (1 + CARD_BONUS * (c.lv - 1)) * 100) + '% → <b>' + Math.round(u.wild.echo * (1 + CARD_BONUS * c.lv) * 100) + '%</b></span>'
    : u.interest ? '<span class="uc-gain">🔒 ' + Math.round(u.interest.cap * (1 + CARD_BONUS * (c.lv - 1))) + ' → <b>' + Math.round(u.interest.cap * (1 + CARD_BONUS * c.lv)) + '</b></span>' : '';
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
  bindTalents(id);
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
  if (u.wolves) return stat('⚔️', dmg, 'Mordisco') + stat('🐺', u.wolves.bites, 'Mordiscos') + stat('⏱️', String(Math.round(10 / u.rate) / 10).replace('.', ',') + ' s', 'Cada lobo');
  if (u.wild) return stat('✨', 'Todas', 'Fusión') + stat('🎲', Math.round(u.wild.echo * mult * 100) + '%', 'Resuena') + stat('⬆', '+2', 'Rangos');
  if (u.interest) return stat('💧', Math.round(u.interest.pct * 100) + '%', 'Interés') + stat('⏱️', u.interest.every + ' s', 'Cada') + stat('🔒', Math.round(u.interest.cap * mult), 'Tope');
  return u.dmg
    ? stat('⚔️', dmg, 'Daño') + stat('⏱️', String(u.rate).replace('.', ','), 'Disparos/s') + stat('📈', Math.round(dmg * u.rate), 'Daño/s')
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

/* Mini partida en la ficha de una tropa: un trozo del tablero del prado
   (el camino de arriba y la primera fila de losetas) con la tropa en su
   loseta disparando a los monstruos que pasan (Melodía, con Lyra al lado).
   DEMO_CROP: el recorte de la ilustración, en sus píxeles. */
var DEMO_CROP = { x: 420, y: 112, w: 880, h: 335 };
function startCardDemo(cv, id) {
  if (!cv) return;
  var F = FIELDS.prado, cell = (F.gx1 - F.gx0) / COLS, D = DEMO_CROP;
  var W = D.w / cell, H = D.h / cell, PY = (F.way[3][1] - D.y) / cell;
  var ch = (F.gy1 - F.gy0) / ROWS / cell, y0 = (F.gy0 - D.y) / cell, col0 = (F.gx0 - D.x) / cell;
  // la tropa en la casilla del centro de la fila (y su pareja, en la de al lado)
  var geo = makeGeo({ W: W, H: H, x0: col0 + 2, y0: y0, cw: 1, ch: ch, way: [{ x: -0.6, y: PY }, { x: W + 0.6, y: PY }] });
  var floor = [0, 1, 2, 3, 4].map(function () { return 'bosque-3'; });
  var pair = UNITS[id].buff || UNITS[id].wild;
  var deck = pair ? [id, 'lyra'] : [id];
  var lv = {}; deck.forEach(function (k) { lv[k] = meta.cards[k] ? meta.cards[k].lv : 1; });
  var b = new Board({ name: 'demo', deck: deck, cardLv: lv, lives: { v: 999, max: 999 }, geo: geo, mana: 0 });
  b.tiles = {};
  b.cells[0] = { id: id, rank: 1, cd: 0.3, frozen: 0, anim: 0, gen: UNITS[id].manaGen ? UNITS[id].manaGen.every - 1.2 : 0 };
  if (pair) { b.cells[0].id = 'lyra'; b.cells[1] = { id: id, rank: 1, cd: 0, frozen: 0, anim: 0, gen: 1.5 }; }
  if (UNITS[id].interest) { b.mana = 300; b.cells[0].gen = UNITS[id].interest.every - 1.2; }
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
    var pic = art(F.image);
    if (pic) {
      var kx = pic.naturalWidth / F.iw, ky = pic.naturalHeight / F.ih;
      dc.drawImage(pic, D.x * kx, D.y * ky, D.w * kx, D.h * ky, 0, 0, W, H);
    } else {
      dc.fillStyle = '#c9a66b'; dc.fillRect(-1, PY - 0.42, W + 2, 0.84);
      dc.fillStyle = '#e6c78c'; dc.fillRect(-1, PY - 0.36, W + 2, 0.72);
    }
    // la fila de losetas, como en la partida
    floor.forEach(function (k, ci) {
      var tp = art('tiles/' + k);
      if (!tp) return;
      var tw = 1.02, th = Math.min(tw * tp.naturalHeight / tp.naturalWidth, ch * 1.16);
      dc.drawImage(tp, col0 + ci + 0.5 - tw / 2, y0 - 0.02, tw, th);
    });
    for (var i = 0; i < 2; i++) {
      if (!b.cells[i]) continue;
      var c = b.cc(i), u = b.cells[i];
      drawUnit(dc, u.id, c.x, c.y - 0.02 - ch * FLOOR_LIFT, 0.42 * ch * (1 + u.anim * 0.25), u.rank, t, { board: true, atk: u.atk, aim: u.aim, recoil: u.recoil || 0 });
    }
    b.enemies.slice().sort(function (p, q) { return p.y - q.y; }).forEach(function (e) {
      drawEnemy(dc, e, ENEMIES[e.kind].size * 0.82, t);
    });
    b.wolves.forEach(function (w) { drawWolf(dc, w); });
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
    '<label class="opt-row"><span>' + ico('icons/sonido') + 'Sonido</span><input type="checkbox" id="soundChk" class="switch" ' + (meta.settings.sound ? 'checked' : '') + '></label>' +
    '<button class="btn btn-ghost" id="optNews">Novedades</button>' +
    '<button class="btn btn-red" id="optReset">Restablecer juego</button>' +
    '<button class="btn btn-ghost" id="optX">Cerrar</button>' +
    '<span class="ver-chip">Versión ' + APP_VERSION + '</span></div>');
  var sc = $('soundChk'); sc.onchange = function () { meta.settings.sound = sc.checked; saveMeta(); sfx('tap'); };
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
  var cn = (r.cmdFresh || []).map(function (k) { return '<div class="res-unlock secret"><img src="' + COMMANDERS[k].pic + '" alt=""><b>¡Comandante nuevo: ' + esc(COMMANDERS[k].name) + '!</b></div>'; }).join('');
  return cn + unitNewHtml(r);
}
function unitNewHtml(r) {
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
    '<div class="chest-pic closed"><div class="chest-pic-glow"><img class="chest-pic-rays" src="assets/chests/destello.webp" alt=""></div><img class="chest-pic-img" id="ciPic" src="' + chestPic(k) + '" alt=""></div>' +
    '<h2>' + ch.name + '</h2>' +
    (ch.legendOnly ? '' : '<div class="ci-loot"><span><b>' + ch.cards + '</b>cartas</span><span><b>' + ch.gold[0] + ' a ' + ch.gold[1] + '</b>🪙 oro</span><span><b>' + ch.gems[0] + ' a ' + ch.gems[1] + '</b>💎 gemas</span></div>') +
    // legendario y de comandante: qué trae, sin decir qué tropa o comandante toca
    (ch.legendOnly
      ? row(RARITY.legendaria.color, 'Legendaria', 'Una tropa legendaria al azar', '1 carta') +
        ''
      : ch.cmd
      ? row(ch.color, 'Comandante', 'Uno al azar, aunque aún no lo tengas', ch.cards + ' cartas') +
        ''
      : '<h3 class="ci-t">Probabilidad por cofre</h3>' +
      row(RARITY.rara.color, 'Rara', '', chestOdds(ch.rare, ch.cards)) +
      row(RARITY.epica.color, 'Épica', '', chestOdds(ch.epic, ch.cards)) +
      row(RARITY.mitica.color, 'Mítica', ch.myth ? '' : 'Solo en el cofre de oro', chestOdds(ch.myth || 0, ch.cards)) +
      row(RARITY.legendaria.color, 'Legendaria', ch.legend ? '' : 'Solo en el cofre de oro', chestOdds(ch.legend, ch.cards)) +
      (ch.types ? row(COMMANDERS[meta.commander].color, 'Comandante', 'La mitad de las veces', ch.cmdCards + ' cartas') : '')) +
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
    if (st === 'empty') return '<button class="slot empty" data-slot="' + i + '" aria-label="Hueco libre"></button>';
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

// lo que sale del cofre, en orden: el oro, las cartas de comandante y luego
// las tropas de menor a mayor rareza
function chestItems(r) {
  var items = r.gold || r.gems ? [{ gold: r.gold, gems: r.gems }] : [];
  Object.keys(r.cmdCards || {}).forEach(function (k) { items.push({ cmd: k, n: r.cmdCards[k] }); });
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
    // se dibuja ya al tamaño grande (size2) y empieza reducido sobre el hueco:
    // así al crecer no se ve borroso
    '<div class="cfx-at" style="left:' + cx + 'px;top:' + cy + 'px;width:' + size2 + 'px;transform:translate(-50%, -50%) scale(' + (size / size2) + ')">' +
    '<div class="cfx-rays"><img src="assets/chests/destello.webp" alt=""></div>' +
    // portal de luz del cofre (assets/chests/portal-<tipo>): aparece debajo al abrirse
    '<img class="cfx-portal" src="assets/chests/portal-' + r.type + '.webp" alt="">' +
    '<img class="cfx-chest shake" src="' + chestPic(r.type) + '" alt=""></div>' +
    // rayos dorados detrás del contador cuando solo quedan legendarias
    '<div class="cfx-lrays" style="left:' + (cx2 + size2 * 0.5) + 'px;top:' + (cy2 + size2 * 0.38) + 'px"></div>' +
    '<div class="cfx-left" style="left:' + (cx2 + size2 * 0.5) + 'px;top:' + (cy2 + size2 * 0.38) + 'px"><b></b><small>quedan</small></div>' +
    '<button class="cfx-skip">Saltar</button><p class="cfx-hint"></p>';
  document.body.appendChild(fx);
  if (from) from.style.visibility = 'hidden';
  var chest = fx.querySelector('.cfx-chest'), spot = fx.querySelector('.cfx-at'), left = fx.querySelector('.cfx-left'), hint = fx.querySelector('.cfx-hint'), lrays = fx.querySelector('.cfx-lrays');
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
    if (!it.id && !it.cmd) chestCoins(fx, cx2, cy2 - size2 * 0.12, size2);
    else chestBump(chest, fx, it);
    left.querySelector('b').textContent = rest;
    left.querySelector('small').textContent = rest === 1 ? 'queda' : 'quedan';
    left.classList.toggle('none', !rest);
    // si todo lo que queda son legendarias, el contador brilla (sin decirlo)
    var legend = rest > 0 && items.slice(idx + 1).every(function (o) { return o.id && UNITS[o.id].rarity === 'legendaria'; });
    if (legend && !left.classList.contains('legend')) buzz([20, 40, 20]);
    left.classList.toggle('legend', legend);
    lrays.classList.toggle('on', legend);
    left.classList.remove('tick'); void left.offsetWidth; left.classList.add('tick');
    hint.textContent = rest ? 'Toca para la siguiente' : 'Toca para terminar';
    lockUntil = Date.now() + 380;
  }
  fx.onclick = function () { if (Date.now() >= lockUntil) next(); };
  fx.querySelector('.cfx-skip').onclick = function (e) { e.stopPropagation(); finish(); };
  sfx('tap'); buzz(15);
  var mid = CHESTS[r.type].mid, midT = mid ? 380 : 0;
  if (mid) {
    new Image().src = mid;
    at(300, function () { chest.src = mid; chest.classList.remove('shake'); void chest.offsetWidth; chest.classList.add('shake'); sfx('tap'); buzz(20); });
  }
  at(300 + midT, function () {
    chest.src = open.src;
    chest.classList.remove('shake');
    chest.classList.add('opened');
    fx.classList.add('open');
    spot.style.transform = 'translate(-50%, -50%) translate(' + (cx2 - cx) + 'px,' + (cy2 - cy) + 'px) scale(1)';
    sfx('chest'); buzz(35);
  });
  at((rect ? 620 : 460) + midT, next);
}
// sonido y sacudida del cofre según la rareza; destello blanco con las
// legendarias y míticas
function chestBump(chest, fx, it) {
  if (it.cmd) { sfx('power'); buzz(30); chest.classList.remove('bump'); void chest.offsetWidth; chest.classList.add('bump'); return; }
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
  if (it.cmd) {
    var cm = COMMANDERS[it.cmd], cc = meta.cmdCards[it.cmd], cmax = cc.lv >= CMD_MAX, cneed = cmdCardsNeeded(cc.lv);
    var cnew = (r.cmdFresh || []).indexOf(it.cmd) !== -1;
    el.className = 'cfx-card cfx-cmd' + (cnew ? ' fresh' : '');
    el.style.setProperty('--rc', cm.color);
    el.innerHTML = '<span class="cfx-rar">Comandante</span>' + (cnew ? '<span class="cfx-new">¡Nuevo!</span>' : '') + '<img src="' + COMMANDERS[it.cmd].body + '" alt=""><b>' + esc(cm.name) + '</b><small>×' + it.n + '</small>' +
      '<div class="cfx-bar' + (!cmax && cc.n >= cneed ? ' full' : '') + '"><span style="width:' + (cmax ? 100 : Math.min(100, cc.n / cneed * 100)) + '%"></span><em>' + (cmax ? 'MÁX' : 'Nv ' + cc.lv + ' · ' + cc.n + '/' + cneed) + '</em></div>';
  } else if (!it.id) {
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
  var cards = chestItems(r).filter(function (it) { return it.id || it.cmd; }).reverse().map(function (it) {
    if (it.cmd) return '<div class="chest-card" style="--rc:' + COMMANDERS[it.cmd].color + '"><img src="' + COMMANDERS[it.cmd].pic + '" alt=""><b>×' + it.n + '</b><small>' + esc(COMMANDERS[it.cmd].name) + '</small></div>';
    return '<div class="chest-card' + (it.fresh ? ' fresh' : '') + '" style="--rc:' + RARITY[UNITS[it.id].rarity].color + '"><img src="' + unitIcon(it.id, 0, 96) + '" alt=""><b>×' + it.n + '</b><small>' + esc(UNITS[it.id].name) + '</small></div>';
  }).join('');
  openOverlay('<div class="modal-card chest-modal"><div class="chest-pic"><div class="chest-pic-glow"><img class="chest-pic-rays" src="assets/chests/destello.webp" alt=""><img class="chest-pic-portal" src="assets/chests/portal-' + r.type + '.webp" alt=""></div><img class="chest-pic-img" src="' + chestPic(r.type, true) + '" alt=""></div><h2>' + ch.name + '</h2>' + (r.gold || r.gems ? '<p class="gold-big">+' + r.gold + ' 🪙' + (r.gems ? ' · +' + r.gems + ' 💎' : '') + '</p>' : '') + chestNewHtml(r) + '<div class="chest-cards">' + cards + '</div><button class="btn chest-ok" id="chestOk">¡Genial!</button></div>');
  $('chestOk').onclick = function () { closeOverlay(); renderMenu(currentScreen === 'battle' ? 'home' : currentScreen); };
}

/* ---------- partida: barra inferior y superior ---------- */
function buildBattleHud() {
  var b = battle;
  var deck = $('deckBar');
  deck.innerHTML = b.player.deck.map(function (id) {
    return '<button class="dcard" data-power="' + id + '" style="--rc:' + RARITY[UNITS[id].rarity].color + '"><img src="' + unitIcon(id, 0, 96) + '" alt=""><span class="dlv" id="dlv_' + id + '">1</span><span class="del" title="' + ELEMENTS[UNITS[id].element].name + '">' + icons(ELEMENTS[UNITS[id].element].icon) + '</span><span class="dcost" id="dcost_' + id + '">100</span></button>';
  }).join('');
  deck.querySelectorAll('[data-power]').forEach(function (btn) {
    // invocación dirigida: mantener pulsada la carta invoca esa tropa (el doble de maná)
    var hold = null;
    btn.onpointerdown = function () {
      clearTimeout(hold); btn._held = false;
      if (!b.player.directed) return;
      hold = setTimeout(function () {
        btn._held = true;
        if (battleBusy()) return;
        var id = btn.dataset.power, r = b.player.summon(false, id);
        if (r === 'ok') { sfx('summon'); buzz(30); toast(UNITS[id].name + ' invocada'); }
        else if (r === 'mana') { sfx('no'); toast('Necesitas ' + b.player.summonCost * 2 + ' 💧 para elegirla'); }
        else { sfx('no'); toast('Tablero lleno: fusiona tropas'); }
        updateHud(true);
      }, 450);
    };
    btn.onpointerup = btn.onpointerleave = btn.onpointercancel = function () { clearTimeout(hold); };
    btn.oncontextmenu = function (e) { e.preventDefault(); };
    btn.onclick = function () {
      if (btn._held) { btn._held = false; return; }
      if (battleBusy()) return;
      var r = b.player.powerUp(btn.dataset.power);
      if (r === 'ok') { sfx('power'); buzz(20); toast(UNITS[btn.dataset.power].name + ' mejorada a ' + b.player.power[btn.dataset.power]); }
      else if (r === 'mana') { sfx('no'); toast('Necesitas ' + b.player.powerCost(btn.dataset.power) + ' 💧'); }
      else toast('Mejora máxima');
      updateHud(true);
    };
  });
  var c = COMMANDERS[b.player.commander];
  $('cmdBtn').parentNode.style.setProperty('--cc', c.color); // el aro y sus rayos
  $('cmdIco').innerHTML = '<img src="' + c.pic + '" alt="' + esc(c.name) + '"><i>' + c.icon + '</i>';
  $('cmdBtn').title = c.ability + ': ' + c.desc;
  // modificador y jefe final del 1 contra 1, junto a la oleada
  ['roulette', 'skillPick'].forEach(function (id) { var el = $(id); if (el) el.remove(); });
  $('heroHint').hidden = true;
  // emojis rápidos: solo contra un rival
  $('emoteBtn').hidden = b.mode !== 'duel';
  $('emoteBar').hidden = true;
  $('emoteBar').innerHTML = EMOTES.map(function (e) { return '<button data-emo="' + e + '">' + e + '</button>'; }).join('');
  $('emoteBar').querySelectorAll('[data-emo]').forEach(function (eb) { eb.onclick = function () { sendEmote(eb.dataset.emo); }; });
  $('bMod').hidden = !b.mod;
  $('bMod').innerHTML = b.mod ? '<img src="' + b.mod.pic + '" alt="' + esc(b.mod.name) + '"><img src="' + enemyIcon(b.boss, true) + '" alt="' + esc(BOSSES[b.boss].name) + '">' : '';
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
    setHtml('dcost_' + id, lv >= POWER_MAX ? 'MÁX' : p.powerCost(id) + MANA_ICO);
    var el = document.querySelector('[data-power="' + id + '"]');
    if (el) el.classList.toggle('poor', lv >= POWER_MAX || p.mana < p.powerCost(id));
  });
  var wi = $('waveInfo'), showWi = !b.other && $('coach').hidden;
  wi.hidden = !showWi;
  if (showWi) setHtml('waveInfo', waveInfoHtml(b));
  var cb = $('cmdBtn');
  cb.style.setProperty('--charge', (p.charge * 360) + 'deg');
  cb.classList.toggle('ready', p.charge >= 1);
  cb.classList.toggle('aiming', !!b.targeting);
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
  if (d.dmg) bits.push('⚔️ ' + fmtNum(b.player.unitDamage(i)) + (d.wolves ? ' por mordisco' : ' por golpe'));
  if (d.manaGen) bits.push('💧 +' + b.player.manaAmount(u) + ' cada ' + d.manaGen.every + ' s');
  if (d.buff) bits.push('🎵 +' + Math.round(b.player.buffSpeed(u) * 100) + '% vel. a vecinas');
  if (d.interest) bits.push('💧 +' + b.player.interestAmount(u) + ' cada ' + d.interest.every + ' s');
  if (d.wild) bits.push('✨ Se fusiona con cualquiera de rango ' + u.rank + ' · 🎲 ' + Math.round(b.player.echoChance() * 100) + '%');
  if (aff) bits.push(ELEMENTS[d.element].icon + ' Afinidad +' + Math.round(aff * AFFINITY_BONUS * 100) + '%');
  if (b.player.tiles[i]) bits.push(TILES[b.player.tiles[i]].icon + ' ' + TILES[b.player.tiles[i]].name);
  box.innerHTML = icons('<img src="' + unitIcon(u.id, u.rank, 72) + '" alt=""><div><b>' + esc(d.name) + ' · Rango ' + u.rank + '</b><small>' + esc(d.role) + ' · ' + bits.join(' · ') + '</small><small class="hint">Toca otra igual para fusionar o una casilla vacía para moverla</small></div>');
  box.hidden = false;
}
/* ---------- 1 contra 1: ruleta del modificador y del jefe final ----------
   Dos franjas cruzan el mapa de lado a lado: primero gira la del modificador
   y se para en el que ha tocado (battle.mod), luego la del jefe (battle.boss).
   Tocar la salta. La partida espera (battle.intro) hasta que termina. */
var RL_W = 92; // ancho de cada casilla de la franja, con su hueco (.rl-card en style.css)
function showDuelRoulette() {
  var b = battle;
  var rows = [
    { title: 'Modificador', items: DUEL_MODS.map(function (m) { return { pic: m.pic, name: m.name }; }), win: DUEL_MODS.indexOf(b.mod), desc: b.mod && b.mod.desc, dur: 2600 },
    { title: 'Jefe final', items: BOSS_ORDER.map(function (k) { return { pic: enemyIcon(k, true), name: BOSSES[k].name, boss: true }; }), win: BOSS_ORDER.indexOf(b.boss), desc: BOSSES[b.boss].desc, dur: 2300 }
  ];
  if (!b.mod) rows.shift();
  var REPS = 9;
  var el = document.createElement('div');
  el.id = 'roulette'; el.className = 'roulette';
  el.innerHTML = '<h2 class="rl-title">' + esc(b.other ? 'Contra ' + b.other.name : 'Modo roguelike') + '</h2>' + rows.map(function (r, ri) {
    var cards = '';
    for (var k = 0; k < r.items.length * REPS; k++) {
      var it = r.items[k % r.items.length];
      cards += '<span class="rl-card' + (it.boss ? ' boss' : '') + '"><img src="' + it.pic + '" alt=""><b>' + esc(it.name) + '</b></span>';
    }
    return '<div class="rl-row" id="rlRow' + ri + '"><h3>' + r.title + '</h3><div class="rl-track"><div class="rl-strip">' + cards + '</div><i class="rl-mark"></i></div><p class="rl-desc"></p></div>';
  }).join('') + '<small class="rl-skip">Toca para saltar</small>';
  $('arena').appendChild(el);
  rows.forEach(function (r, ri) {
    r.row = $('rlRow' + ri);
    r.track = r.row.querySelector('.rl-track');
    r.strip = r.row.querySelector('.rl-strip');
    r.from = Math.floor(Math.random() * r.items.length);
    r.to = r.items.length * (REPS - 2) + r.win;
    r.at = -1;
    place(r, r.from);
  });
  function alive() { return battle === b && !b.ended && el.isConnected; }
  // deja la casilla k (con decimales mientras gira) bajo la marca del centro
  function place(r, k) {
    r.strip.style.transform = 'translateX(' + (r.track.clientWidth / 2 - (k * RL_W + RL_W / 2)) + 'px)';
    var cur = Math.round(k);
    if (cur !== r.at) { r.at = cur; if (r.spinning) tone(700 + (cur % 3) * 60, 0.03, 'square', 0.04); }
  }
  function land(r) {
    r.spinning = false; r.done = true;
    place(r, r.to);
    r.strip.children[r.to].classList.add('win');
    r.row.classList.add('done');
    r.row.querySelector('.rl-desc').textContent = r.desc;
  }
  var idx = 0, finished = false, endTimer = null;
  function spin(r) {
    var t0 = performance.now();
    r.spinning = true;
    function step(now) {
      if (!alive() || r.done) return;
      var t = Math.min(1, (now - t0) / r.dur), e = 1 - Math.pow(1 - t, 4);
      place(r, r.from + (r.to - r.from) * e);
      if (t < 1) { requestAnimationFrame(step); return; }
      land(r); sfx(r.items[0].boss ? 'boss' : 'power'); next();
    }
    requestAnimationFrame(step);
  }
  function next() {
    idx++;
    if (idx < rows.length) { setTimeout(function () { if (alive()) spin(rows[idx]); }, 450); return; }
    finish();
  }
  function finish() {
    if (finished) return;
    finished = true;
    el.querySelector('.rl-skip').textContent = '¡A jugar!';
    endTimer = setTimeout(close, 1900);
  }
  function close() {
    clearTimeout(endTimer);
    if (!alive()) return;
    el.classList.add('out');
    setTimeout(function () { el.remove(); }, 300);
    endDuelIntro();
  }
  el.onclick = function () {
    if (finished) { close(); return; }
    rows.forEach(function (r) { if (!r.done) land(r); });
    idx = rows.length;
    sfx('boss');
    finish();
  };
  spin(rows[0]);
}

/* Elección entre varias opciones (habilidades de comandante en el duelo,
   ventajas del roguelike): o.options [{ id, name, pic, desc }], se eligen o.n
   y al terminar se llama a done(elegidas). La partida espera mientras. */
function showChoice(o, done) {
  var b = battle, chosen = [], n = o.n, offer = o.options, face = o.face;
  var el = document.createElement('div');
  el.id = 'skillPick'; el.className = 'skill-pick';
  var sub = function () { return n === 1 ? 'Elige 1 de ' + offer.length : 'Elige ' + n + ' de ' + offer.length + ' · llevas ' + chosen.length; };
  el.innerHTML = '<div class="sp-card" style="--cc:' + face.color + '">' +
    '<div class="sp-head"><img src="' + face.pic + '" alt=""><span><b>' + esc(o.title) + '</b><small id="spSub">' + sub() + '</small></span></div>' +
    '<div class="sp-list">' + offer.map(function (op, i) {
      return '<button class="sp-opt' + (op.relic ? ' relic' : '') + '" data-op="' + i + '"><img src="' + op.pic + '" alt=""><span><b>' + esc(op.name) + '</b><small>' + esc(op.desc) + '</small></span></button>';
    }).join('') + '</div>' +
    (o.have && o.have.length ? '<p class="sp-have">Ya tienes: ' + o.have.map(esc).join(', ') + '</p>' : '') +
    '</div>';
  $('arena').appendChild(el);
  sfx('chest');
  el.querySelectorAll('[data-op]').forEach(function (btn) {
    btn.onclick = function () {
      var op = offer[+btn.dataset.op];
      if (chosen.length >= n || chosen.indexOf(op) !== -1 || b.paused) return;
      chosen.push(op);
      btn.classList.add('on'); btn.disabled = true;
      sfx('power'); buzz(20);
      $('spSub').textContent = sub();
      if (chosen.length < n) return;
      el.classList.add('out');
      setTimeout(function () { el.remove(); if (battle === b) done(chosen); }, 380);
    };
  });
}
// mientras gira la ruleta o eliges habilidades no se puede jugar
function battleBusy() { return !!(battle && (battle.intro || battle.picking)); }

/* ---------- héroes: su habilidad se usa eligiendo tropas del tablero ---------- */
function startHeroTarget() {
  var b = battle, c = COMMANDERS[b.player.commander];
  if (b.targeting) { cancelHeroTarget(); return; }
  b.targeting = { picks: [] };
  b.selected = null; refreshUnitInfo();
  heroHint(c.hero === 2 ? 'Toca la primera tropa' : 'Toca la tropa que quieres subir', c.hero === 2 ? 'fx/morgana-ensamblaje' : 'fx/torvald-carga');
  sfx('tap');
}
function cancelHeroTarget() { if (battle) battle.targeting = null; $('heroHint').hidden = true; }
function heroHint(t, pic) {
  var h = $('heroHint');
  if (pic) h._pic = pic;
  h.innerHTML = (h._pic ? '<img src="assets/' + h._pic + '.webp" alt="">' : '') + '<span>' + icons(esc(t) + ' <small>Toca el retrato para cancelar</small>') + '</span>';
  h.hidden = false;
}
// toque en una casilla mientras se elige: devuelve true si lo ha usado
function heroTap(i) {
  var b = battle, t = b.targeting, p = b.player, c = COMMANDERS[p.commander];
  if (!t) return false;
  if (i < 0 || !p.cells[i]) return true;
  var picks = t.picks.concat([i]);
  if (!p.heroValid(picks)) { sfx('no'); toast(picks.length === 2 ? 'Tiene que ser otra tropa del mismo rango' : 'Esa tropa ya está al máximo'); return true; }
  if (picks.length < c.hero) { t.picks = picks; b.selected = i; heroHint('Ahora otra tropa de rango ' + p.cells[i].rank); sfx('tap'); return true; }
  b.selected = null;
  cancelHeroTarget();
  if (p.useCommander(picks)) { sfx('merge'); sfx('cmd'); buzz(60); }
  return true;
}

/* ---------- emojis rápidos ---------- */
function sendEmote(e) {
  var b = battle;
  if (!b || !b.other) return;
  $('emoteBar').hidden = true;
  if (b.emoteCd > performance.now()) { toast('Espera un momento'); return; }
  b.emoteCd = performance.now() + 2500;
  emoteBubble(e, 'me'); sfx('tap');
  // el rival contesta a veces
  if (Math.random() < 0.6) setTimeout(function () { if (battle === b && !b.ended) emoteBubble(pick(EMOTES), 'foe'); }, 700 + Math.random() * 1200);
}
function emoteBubble(e, who) {
  var el = document.createElement('div');
  el.className = 'emote-bubble ' + who;
  el.innerHTML = icons(e);
  $('arena').appendChild(el);
  setTimeout(function () { el.remove(); }, 2200);
}
// la máquina también reacciona a lo que pasa en la partida
function aiEmote(e, chance) {
  var b = battle;
  if (!b || b.mode !== 'duel' || Math.random() > chance) return;
  if (b.foeEmoteAt && performance.now() - b.foeEmoteAt < 6000) return;
  b.foeEmoteAt = performance.now();
  emoteBubble(e, 'foe');
}

/* ---------- repetición: los últimos 30 segundos ----------
   Mientras se juega se guarda una foto pequeña del tablero REPLAY_FPS veces
   por segundo (en JPEG, unos 10 KB cada una); al terminar se pueden ver en
   bucle desde el resultado. */
var REPLAY_FPS = 6, REPLAY_SECS = 30, REPLAY_W = 260;
var replay = { frames: [], at: 0, cv: null, busy: false };
function resetReplay() { replay.frames = []; replay.at = 0; }
function recordReplay(t) {
  if (!canvas || replay.busy || t - replay.at < 1000 / REPLAY_FPS) return;
  replay.at = t;
  if (!replay.cv) replay.cv = document.createElement('canvas');
  var w = REPLAY_W, h = Math.round(w * canvas.height / Math.max(1, canvas.width)), rc = replay.cv;
  if (rc.width !== w || rc.height !== h) { rc.width = w; rc.height = h; }
  var g = rc.getContext('2d');
  if (!g || !rc.toBlob) return;
  g.drawImage(canvas, 0, 0, w, h);
  replay.busy = true;
  rc.toBlob(function (bl) {
    replay.busy = false;
    if (!bl) return;
    replay.frames.push(bl);
    if (replay.frames.length > REPLAY_FPS * REPLAY_SECS) replay.frames.shift();
  }, 'image/jpeg', 0.6);
}
function showReplay(res) {
  var urls = replay.frames.map(function (bl) { return URL.createObjectURL(bl); });
  if (!urls.length) { toast('No hay repetición'); return; }
  openOverlay('<div class="modal-card replay-card"><h2>Repetición</h2><div class="rp-view"><img id="rpImg" alt="Repetición de la partida"></div>' +
    '<div class="rp-bar"><i id="rpBar"></i></div><small class="muted">Los últimos ' + Math.round(urls.length / REPLAY_FPS) + ' segundos</small>' +
    '<button class="btn btn-ghost" id="rpBack">Volver</button></div>');
  var k = 0, img = $('rpImg');
  var tick = setInterval(function () {
    if (!img.isConnected) { clearInterval(tick); return; }
    img.src = urls[k]; $('rpBar').style.width = ((k + 1) / urls.length * 100) + '%';
    k = (k + 1) % urls.length;
  }, 1000 / REPLAY_FPS);
  $('rpBack').onclick = function () { clearInterval(tick); urls.forEach(URL.revokeObjectURL); closeOverlay(); showResult(res); };
}
function modInfo(b) {
  return b.mod.name + ': ' + b.mod.desc + ' Jefe final: ' + BOSSES[b.boss].name + '.' +
    (b.player.skills.length ? ' Habilidades: ' + b.player.skills.map(function (k) { return CMD_SKILLS[k].name; }).join(', ') + '.' : '');
}

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
    (res.lines.length ? '<div class="res-lines">' + res.lines.map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') + '</div>' : '') +
    '<div class="res-prize">' + prizeChips(res.trophies || 0, res.gold, res.gems) + '</div>' + chest + unlock +
    '<div class="stat-tiles res-stats"><span>' + ico('icons/ola') + '<b>' + (battle ? battle.wave : 0) + '</b><small>oleada</small></span>' +
    '<span>' + ico('icons/calavera') + '<b>' + fmtNum(res.kills || 0) + '</b><small>bajas</small></span>' +
    '<span>' + ico('icons/espadas') + '<b>' + fmtNum(res.damage || 0) + '</b><small>daño</small></span></div>' + dmgSummary(res) +
    '<button class="btn btn-green" id="resAgain">' + (res.mode === 'campaign' && res.won && battle.stage.id < CAMPAIGN.length ? 'Siguiente fase ▶' : 'Otra vez') + '</button>' +
    (replay.frames.length ? '<button class="btn btn-ghost" id="resReplay">Repetición</button>' : '') +
    '<button class="btn btn-ghost" id="resMenu">Menú</button></div>');
  if ($('resReplay')) $('resReplay').onclick = function () { sfx('tap'); showReplay(res); };
  $('resAgain').onclick = function () {
    closeOverlay();
    var b = battle;
    if (b.mode === 'campaign') startBattle('campaign', { stage: res.won && b.stage.id < CAMPAIGN.length ? b.stage.id + 1 : b.stage.id });
    else startBattle(b.mode, b.opts);
  };
  $('resMenu').onclick = function () { closeOverlay(); battle = null; resetReplay(); showScreen(res.mode === 'campaign' ? 'campaign' : res.mode === 'rogue' ? 'rogue' : 'home'); };
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
    : b.mode === 'rogue' ? 'Roguelike · Jefe final: ' + esc(BOSSES[b.boss].name)
    : b.mode === 'duel' ? (b.opts.tourney ? 'Torneo contra ' : '⚔️ Duelo contra ') + esc(b.other.name) : '🤝 Con ' + esc(b.other.name) + ' contra la horda';
  if (b.mode === 'rogue' && (b.player.skills.length || b.player.rogueMods.length)) where += '<small class="pause-mod">Ventajas: ' + esc(b.player.skills.map(function (k) { return CMD_SKILLS[k].name; }).concat(b.player.rogueMods.map(function (id) { return DUEL_MODS.filter(function (x) { return x.id === id; })[0].name; })).join(', ')) + '</small>';
  if (b.lent) where += '<small class="pause-mod">Mazo prestado: ' + esc(b.lent.name) + '</small>';
  if (b.mod) where += '<small class="pause-mod">' + esc(modInfo(b)) + '</small>';
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
    if (battle) {
      drawBattle(t); updateHud(false);
      if (!battle.ended && !battle.paused && !battle.intro) recordReplay(t);
    }
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
    if (!battle || battleBusy()) return;
    var r = battle.player.summon();
    if (r === 'ok') { sfx('summon'); buzz(15); }
    else if (r === 'mana') { sfx('no'); toast('Necesitas ' + battle.player.summonCost + ' 💧'); }
    else { sfx('no'); toast('Tablero lleno: fusiona tropas'); }
    updateHud();
  };
  $('cmdBtn').onclick = function () {
    if (!battle || battleBusy()) return;
    if (COMMANDERS[battle.player.commander].hero) {
      if (battle.targeting) { cancelHeroTarget(); return; }
      if (battle.player.charge < 1) { toast('El comandante aún se está cargando'); return; }
      if (!battle.player.heroPicks() && !battle.player.cells.some(function (u) { return u && u.rank < MAX_RANK; })) { toast('No tienes tropas que elegir'); return; }
      startHeroTarget();
      return;
    }
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
  $('emoteBtn').onclick = function () { if (battle && !battleBusy()) { sfx('tap'); $('emoteBar').hidden = !$('emoteBar').hidden; } };
  $('bMod').onclick = function () { if (battle && battle.mod) { sfx('tap'); toast(modInfo(battle)); } };
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
  bindSwipe();
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
