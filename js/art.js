'use strict';
/* =========================================================
   DIBUJO: fichas de tropas (busto del personaje), monstruos,
   jefes y efectos. Todo vectorial en canvas.
   ========================================================= */

var INK = 'rgba(14,12,28,0.9)';

function shade(hex, amt) {
  var n = parseInt(hex.slice(1), 16);
  var r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  var b = Math.max(0, Math.min(255, (n & 255) + amt));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function alpha(hex, a) {
  var n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
function ink(c, w) { c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = w; c.stroke(); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function glow(c, x, y, r, color, a) {
  var g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(color, a == null ? 0.6 : a)); g.addColorStop(1, alpha(color, 0));
  c.fillStyle = g; circle(c, x, y, r); c.fill();
}
function vgrad(c, y1, y2, a, b) { var g = c.createLinearGradient(0, y1, 0, y2); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function star(c, x, y, r, pts) {
  pts = pts || 5;
  c.beginPath();
  for (var i = 0; i < pts * 2; i++) {
    var a = -Math.PI / 2 + i * Math.PI / pts, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

/* ---------- imágenes de los diseños (assets/) ---------- */
var IMG = {};
var IMG_LIST = {
  units: UNIT_ORDER.filter(function (id) { return !UNITS[id].noArt; }),
  enemies: ['blob', 'ghost', 'brute', 'orco', 'rocoso', 'escarcha', 'gelido', 'coloso', 'coloso2', 'nigro', 'dragon'],
  tiles: ['altar', 'fuente', 'atalaya', 'piedra-1', 'piedra-2'],
  boards: ['lava2', 'hielo', 'roca', 'veneno'],
  ui: ['boton', 'fondo', 'vida'],
  commanders: ['aria', 'merlo', 'brann'],
  icons: ['estrella', 'gota', 'espadas', 'escudo'],
  chests: ['moneda'], // proyectil de Midas
  cells: UNIT_ORDER.slice() // aura de cada tropa en su casilla (assets/cells)
};
var imgReadyCount = 0;
Object.keys(IMG_LIST).forEach(function (dir) {
  IMG_LIST[dir].forEach(function (id) {
    var im = new Image();
    im.onload = function () { im.ready = true; imgReadyCount++; _unitIconCache = {}; _enemyIconCache = {}; _tintCache = {}; if (window.onArtReady) window.onArtReady(); };
    im.src = 'assets/' + dir + '/' + id + '.webp' + (dir === 'boards' ? '?v=4' : dir === 'tiles' || dir === 'commanders' ? '?v=2' : '');
    IMG[dir + '/' + id] = im;
  });
});
// tablero ilustrado de la campaña: se prueba con varias extensiones
(function loadBoard(exts) {
  if (!exts.length) return;
  var im = new Image();
  im.onload = function () { im.ready = true; IMG['board/tablero'] = im; };
  im.onerror = function () { loadBoard(exts.slice(1)); };
  im.src = 'assets/tablero.' + exts[0];
})(['webp', 'png', 'jpg', 'jpeg']);
function art(key) { var im = IMG[key]; return im && im.ready ? im : null; }

/* Poses del tablero: cuerpo entero sin chapa, en reposo y disparando,
   con el mismo encuadre (pies abajo en el centro) para que no salte.
   face: hacia dónde mira la pose de ataque (1 derecha, -1 izquierda). */
var POSES = {
  lyra: { face: 1 }, brasa: { face: -1 }, rocco: { face: -1 }, sombra: { face: -1 },
  nivea: { face: -1 }, doblon: { face: 1 }, volta: { face: -1 }, mirra: { face: -1 },
  melodia: { face: 1 }, cronos: { face: -1 }, halcon: { face: 1 }, ulric: { face: 1 },
  fenix: { face: -1 }, aurora: { face: 1 }, titan: { face: 1 }, boreas: { face: 1 }, midas: { face: 1 }
};
var ATK_POSE_TIME = 0.15;
Object.keys(POSES).forEach(function (id) {
  ['idle', 'attack'].forEach(function (pose) {
    var im = new Image();
    im.onload = function () { im.ready = true; };
    im.src = 'assets/units/board/' + id + '-' + pose + '.webp' + (pose === 'idle' ? '?v=2' : '');
    IMG['pose/' + id + '-' + pose] = im;
  });
});

/* Efectos ilustrados (assets/fx/<elemento>-<parte>.webp) por tipo de
   proyectil: destello al disparar, proyectil e impacto. El proyectil
   de fuego y hielo y el destello de hielo y cañón miran a la derecha. */
var FX_OF = { fire: 'fuego', ice: 'hielo', poison: 'veneno', bomb: 'canon', arrow: 'flecha', shadow: 'sombra', gear: 'engranaje', bullet: 'bala', holy: 'luz' };
['fuego', 'hielo', 'veneno', 'canon', 'flecha', 'sombra', 'engranaje', 'bala', 'luz', 'rayo'].forEach(function (el) {
  ['destello', 'bola', 'impacto'].forEach(function (part) {
    var im = new Image();
    im.onload = function () { im.ready = true; };
    im.src = 'assets/fx/' + el + '-' + part + '.webp';
    IMG['fx/' + el + '-' + part] = im;
  });
});
['ventisca', 'marea', 'meteoro', 'crater', 'boreas-ventisca', 'midas-critico', 'muerte-puf', 'invocar', 'fusion', 'fusion-doblon', 'mover'].forEach(function (k) {
  var im = new Image();
  im.onload = function () { im.ready = true; };
  im.src = 'assets/fx/' + k + '.webp';
  IMG['fx/' + k] = im;
});
var FX_TURNS = { 'fx/fuego-bola': true, 'fx/hielo-bola': true, 'fx/hielo-destello': true, 'fx/canon-destello': true,
  'fx/flecha-bola': true, 'fx/flecha-destello': true, 'fx/sombra-bola': true, 'fx/bala-bola': true, 'fx/bala-destello': true, 'fx/engranaje-destello': true };
// proyectiles que no giran sobre sí mismos (la cruz de luz va derecha)
var FX_STILL = { 'fx/luz-bola': true };
/* Estados sobre la cabeza del monstruo (assets/fx/estado-*.webp): congelado
   o aturdido, quemado o envenenado, y un momento el crítico y la armadura
   rota. Si son varios, van en fila. */
['helado', 'armadura', 'quemado', 'veneno', 'critico', 'aturdido'].forEach(function (k) {
  var im = new Image();
  im.onload = function () { im.ready = true; };
  im.src = 'assets/fx/estado-' + k + '.webp';
  IMG['fx/estado-' + k] = im;
});
function drawStatus(c, e, r, now) {
  var list = [];
  if (e.stun > 0) list.push(e.stunIce ? 'helado' : 'aturdido');
  if (e.poison > 0) list.push(e.poisonBy && UNITS[e.poisonBy] && UNITS[e.poisonBy].element === 'fuego' ? 'quemado' : 'veneno');
  if (e.breakT > 0) list.push('armadura');
  if (e.critT > 0) list.push('critico');
  if (!list.length) return;
  // encima del número de vida (ver drawBoard en battle.js), en unidades del tablero
  var s = e.boss ? 0.52 : 0.42, gap = s * 0.85, x0 = e.x - (list.length - 1) * gap / 2;
  var y = e.y - (e.boss ? 0.92 : ENEMIES[e.kind].size + 0.16) - 0.14 - s / 2;
  list.forEach(function (k, i) {
    var x = x0 + i * gap, bob = Math.sin(now / 220 + i) * r * 0.05;
    if (k === 'aturdido' && !art('fx/estado-aturdido')) { drawStun(c, x, y, r, now); return; }
    var pop = k === 'critico' ? 1 + Math.max(0, e.critT - 0.35) * 2.5 : k === 'armadura' ? 1 + Math.max(0, e.breakT - 0.35) * 2.5 : 1;
    if (!drawFxPic(c, 'fx/estado-' + k, x, y + bob, s * pop, k === 'aturdido' ? Math.sin(now / 300) * 0.15 : 0) && k === 'veneno') {
      c.fillStyle = 'rgba(120,255,90,0.85)'; circle(c, x, y, r * 0.18); c.fill();
    }
  });
}
/* Aturdido sin imagen: dos estrellas que giran sobre la cabeza. */
function drawStun(c, x, y, r, now) {
  var im = art('icons/estrella');
  if (!im) { c.fillStyle = '#ffe6a3'; c.font = 'bold ' + (r * 0.9).toFixed(3) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('✦', x, y); return; }
  var s = r * 0.42;
  for (var k = 0; k < 2; k++) {
    var a = now / 260 + k * Math.PI;
    c.drawImage(im, x + Math.cos(a) * r * 0.42 - s / 2, y + Math.sin(a) * r * 0.12 - s / 2, s, s);
  }
}
/* Texto flotante con contorno (alineado al centro). Un « 💧» final se
   dibuja con la gota ilustrada en lugar del emoji. */
function drawFloatText(c, text, x, y, fs, color) {
  var gota = / 💧$/.test(text) && art('icons/gota');
  if (gota) text = text.replace(/ 💧$/, '');
  c.font = '400 ' + fs + 'px "Lilita One", Nunito, sans-serif';
  var sz = fs * 1.25, off = gota ? sz * 0.55 : 0, w = c.measureText(text).width;
  drawOutlinedText(c, text, x - off, y, fs, color);
  if (gota) c.drawImage(gota, x - off + w / 2 + 1, y - sz / 2, sz, sz);
}
/* Texto del juego: Lilita One con contorno grueso redondeado y sombra
   debajo, el mismo acabado que los títulos de la interfaz. */
function drawOutlinedText(c, text, x, y, fs, color) {
  c.font = '400 ' + fs + 'px "Lilita One", Nunito, sans-serif';
  c.lineJoin = 'round'; c.miterLimit = 2;
  c.lineWidth = Math.max(3, fs * 0.28); c.strokeStyle = '#1a1430';
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillText(text, x, y + fs * 0.12);
  c.strokeText(text, x, y);
  c.fillStyle = color; c.fillText(text, x, y);
}
/* Dibuja un efecto centrado en (x, y) con el lado mayor = size. */
function drawFxPic(c, key, x, y, size, rot) {
  var im = art(key);
  if (!im) return false;
  var k = size / Math.max(im.naturalWidth, im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
  c.save(); c.translate(x, y);
  if (rot) c.rotate(rot);
  c.drawImage(im, -w / 2, -h / 2, w, h);
  c.restore();
  return true;
}
/* Efecto 'pic' de la lista fx: crece de golpe con rebote y se apaga en la segunda mitad. */
function drawPicFx(c, f) {
  var t = 1 - f.life / f.max, gk = Math.min(1, t * 4);
  var pop = f.grow + (1 - f.grow) * (gk + Math.sin(gk * Math.PI) * 0.25);
  c.globalAlpha = t < 0.5 ? 1 : (1 - t) * 2;
  drawFxPic(c, f.key, f.x, f.y, f.size * pop, f.rot);
  c.globalAlpha = 1;
}

/* Copia teñida de una imagen (para crear monstruos a partir de la gelatina). */
var _tintCache = {};
function tinted(key, color, strength) {
  var k = key + color + strength;
  if (_tintCache[k]) return _tintCache[k];
  var im = art(key);
  if (!im) return null;
  var cv = document.createElement('canvas');
  cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  var c = cv.getContext('2d');
  c.drawImage(im, 0, 0);
  c.globalCompositeOperation = 'color';
  c.globalAlpha = strength == null ? 1 : strength;
  c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(im, 0, 0);
  _tintCache[k] = cv;
  return cv;
}

/* Silueta de un solo color (destello al recibir un golpe) y versión con
   contorno oscuro (tropas del tablero, que al reducirlas pierden el suyo).
   Se hacen una vez, a 256 px como mucho, y se guardan en la propia imagen. */
var SPRITE_MAX = 256, OUTLINE_PX = 7, HIT_TIME = 0.1;
function spriteCanvas(im, pad) {
  var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  var k = Math.min(1, SPRITE_MAX / Math.max(w, h));
  var cv = document.createElement('canvas');
  cv.sw = Math.round(w * k); cv.sh = Math.round(h * k);
  cv.width = cv.sw + pad * 2; cv.height = cv.sh + pad * 2;
  return cv;
}
function silhouette(im, color) {
  var key = '_sil' + color;
  if (im[key]) return im[key];
  var cv = spriteCanvas(im, 0), c = cv.getContext('2d');
  c.drawImage(im, 0, 0, cv.sw, cv.sh);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height);
  return (im[key] = cv);
}
function outlined(im) {
  if (im._outl) return im._outl;
  var p = OUTLINE_PX, cv = spriteCanvas(im, p), c = cv.getContext('2d'), sil = silhouette(im, '#1a1430');
  // la silueta oscura desplazada en 8 direcciones y el dibujo encima
  for (var a = 0; a < 8; a++) c.drawImage(sil, p + Math.cos(a * Math.PI / 4) * p, p + Math.sin(a * Math.PI / 4) * p);
  c.drawImage(im, p, p, cv.sw, cv.sh);
  cv.padX = p / cv.sw; cv.padY = p / cv.sh;
  return (im._outl = cv);
}
// dibuja im en el rectángulo (x, y, w, h) con el contorno por fuera
function drawOutlined(c, im, x, y, w, h, flash) {
  var o = outlined(im), mx = o.padX * w, my = o.padY * h;
  c.drawImage(o, x - mx, y - my, w + mx * 2, h + my * 2);
  if (flash > 0) {
    // destello blanco encima (al fusionar)
    var ga = c.globalAlpha;
    c.globalAlpha = ga * flash;
    c.drawImage(silhouette(o, '#ffffff'), x - mx, y - my, w + mx * 2, h + my * 2);
    c.globalAlpha = ga;
  }
}

/* Rebote elástico al disparar (recoil va de 1 a 0): aplasta, estira y se
   asienta, conservando el volumen. Los cañones y el francotirador pegan
   más fuerte y dan más culatazo; los magos casi no retroceden. */
var JELLY_AMP = { bomb: 0.22, bullet: 0.22 };
var KICK = { bomb: 2, bullet: 2, arrow: 1, coin: 1, shadow: 1, gear: 0.6 };
function jellyScale(recoil, amp) {
  var t = 1 - recoil;
  var k = Math.sin(t * Math.PI * 2.5) * Math.pow(recoil, 1.4) * amp;
  return { sx: 1 + k, sy: 1 - k };
}

/* Invocar (drop de 1 a 0): cae estirada desde 0,6 casillas y, al tocar
   suelo (SUMMON_LAND), se aplasta y rebota. Fusionar (pop de >1 a 0):
   mientras pop > 1 espera a la que llega volando; luego se pone blanca,
   se estira y se asienta. */
var SUMMON_TIME = 0.5, SUMMON_LAND = 0.4, MERGE_FLY = 0.18, MERGE_POP_TIME = 0.4;
function summonPose(drop) {
  if (!(drop > 0)) return null;
  if (drop > SUMMON_LAND) {
    var q = (1 - drop) / (1 - SUMMON_LAND);
    return { dy: -(1 - q * q) * 0.6, sx: 0.9, sy: 1.12, a: Math.min(1, q * 3), flash: 0 };
  }
  var l = 1 - drop / SUMMON_LAND, k = Math.sin(l * Math.PI * 2) * (1 - l) * 0.25;
  return { dy: 0, sx: 1 + k, sy: 1 - k, a: 1, flash: 0 };
}
function mergePose(pop) {
  if (!(pop > 0) || pop > 1) return null;
  var l = 1 - pop, k = Math.sin(l * Math.PI * 2.5) * Math.pow(1 - l, 1.2) * 0.22;
  return { dy: 0, sx: 1 - k, sy: 1 + k, a: 1, flash: Math.max(0, 1 - l * 3) };
}

var RANK_RIMS = ['#9fb3c8', '#9fb3c8', '#c9d4e6', '#ffd166', '#ffb020', '#c77dff', '#ff5fd2', '#ff3b5c'];

/* ---------- ficha de tropa ---------- */
function drawUnit(c, id, x, y, r, rank, now, opt) {
  var u = UNITS[id];
  opt = opt || {};
  rank = rank || 1;
  c.save();
  c.translate(x, y);
  var bob = opt.still ? 0 : Math.sin(now / 420 + x * 0.05) * r * 0.025;

  // aura de rango alto
  if (rank >= 5) glow(c, 0, 0, r * 1.35, RANK_RIMS[rank], 0.45 + Math.sin(now / 300) * 0.12);

  // efecto muelle al disparar: un 10% más grande hacia arriba
  // (en el tablero lo sustituye el rebote elástico de opt.recoil)
  var atk = opt.atk > 0;
  if (atk && opt.recoil == null) { c.translate(0, r * 0.9); c.scale(1.1, 1.1); c.translate(0, -r * 0.9); }

  // en el tablero: cuerpo recortado sin chapa, con pose de reposo y de ataque
  var idle = opt.board && art('pose/' + id + '-idle');
  // las que solo potencian (Melodía) tocan sin parar: siempre en pose de ataque
  var hit = idle && (atk || u.buff) && art('pose/' + id + '-attack');
  if (idle) {
    var foot = r * 0.9;
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, foot, r * 0.7, r * 0.2, 0, 0, Math.PI * 2); c.fill();
    if (rank >= 4) {
      c.lineWidth = r * 0.07; c.strokeStyle = alpha(RANK_RIMS[rank], 0.75 + Math.sin(now / 250) * 0.2);
      c.beginPath(); c.ellipse(0, foot, r * 0.8, r * 0.26, 0, 0, Math.PI * 2); c.stroke();
    }
    c.save();
    c.translate(0, foot);
    if (opt.recoil > 0) {
      // culatazo hacia atrás respecto al disparo y rebote desde los pies
      var kick = (KICK[u.proj] || 0.4) * opt.recoil;
      if (opt.aim != null) c.translate(-Math.cos(opt.aim) * r * 0.1 * kick, -Math.sin(opt.aim) * r * 0.05 * kick);
      var jl = jellyScale(opt.recoil, JELLY_AMP[u.proj] || 0.16);
      c.scale(jl.sx, jl.sy);
    }
    if (hit) {
      // la pose de ataque mira hacia el enemigo
      if (opt.aim != null && Math.cos(opt.aim) * POSES[id].face < 0) c.scale(-1, 1);
      // al compás: se balancea un poco mientras toca
      if (u.buff && !opt.still) c.rotate(Math.sin(now / 300 + x * 0.05) * 0.05);
      var sa = r * 2.35;
      drawOutlined(c, hit, -sa / 2, -sa, sa, sa, opt.flash);
    } else {
      // respiración: se estira un poco hacia arriba
      if (!opt.still) c.scale(1, 1 + Math.sin(now / 520 + x * 0.05) * 0.025);
      var si = r * 2.35;
      drawOutlined(c, idle, -si / 2, -si, si, si, opt.flash);
    }
    c.restore();
    if (!opt.noRank) drawRankStars(c, rank, r);
    if (opt.frozen) {
      c.beginPath(); c.ellipse(0, r * 0.05, r * 0.85, r * 0.95, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(170,225,255,0.5)'; c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.06; c.stroke();
    }
    c.restore();
    return;
  }

  var pic = art('units/' + id);
  if (pic) {
    // diseño ilustrado: la ficha ya trae su marco
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, r * 0.9, r * 0.8, r * 0.22, 0, 0, Math.PI * 2); c.fill();
    if (rank >= 4) {
      c.lineWidth = r * 0.09; c.strokeStyle = alpha(RANK_RIMS[rank], 0.75 + Math.sin(now / 250) * 0.2);
      circle(c, 0, bob, r * 1.06); c.stroke();
    }
    var sz = r * 2.12;
    c.drawImage(pic, -sz / 2, -sz / 2 + bob, sz, sz);
    if (!opt.noRank) drawRankStars(c, rank, r);
    if (opt.frozen) {
      circle(c, 0, bob, r * 0.98); c.fillStyle = 'rgba(170,225,255,0.55)'; c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.06; c.stroke();
    }
    c.restore();
    return;
  }

  // base: disco con el color de la tropa
  circle(c, 0, r * 0.06, r); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fill();
  var bg = c.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  bg.addColorStop(0, shade(u.color, 60)); bg.addColorStop(1, shade(u.color, -50));
  circle(c, 0, 0, r); c.fillStyle = bg; c.fill();
  // aro de rango
  c.lineWidth = r * (0.1 + Math.min(rank, 7) * 0.012);
  var rim = c.createLinearGradient(-r, -r, r, r);
  rim.addColorStop(0, shade(RANK_RIMS[rank].length === 7 ? RANK_RIMS[rank] : '#c9d4e6', 80));
  rim.addColorStop(0.45, RANK_RIMS[rank]);
  rim.addColorStop(0.55, shade(RANK_RIMS[rank], -40));
  rim.addColorStop(1, shade(RANK_RIMS[rank], 30));
  c.strokeStyle = rim;
  circle(c, 0, 0, r * 0.95); c.stroke();
  circle(c, 0, 0, r); ink(c, r * 0.05);

  // busto, recortado al círculo salvo los sombreros
  c.save();
  circle(c, 0, 0, r * 0.9); c.clip();
  drawBody(c, u, r, bob);
  c.restore();
  drawHead(c, id, u, r, bob, now);

  // estrellas de rango
  if (!opt.noRank) drawRankStars(c, rank, r);

  if (opt.frozen) {
    circle(c, 0, 0, r); c.fillStyle = 'rgba(170,225,255,0.55)'; c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.06; c.stroke();
  }
  c.restore();
}

function drawRankStars(c, rank, r) {
  var n = Math.min(rank, 7);
  var sr = r * 0.13, gap = sr * 1.75;
  var w = (n - 1) * gap;
  rrect(c, -w / 2 - sr * 1.3, r * 0.68, w + sr * 2.6, sr * 2.3, sr * 1.1);
  c.fillStyle = 'rgba(14,12,28,0.82)'; c.fill();
  for (var i = 0; i < n; i++) {
    star(c, -w / 2 + i * gap, r * 0.68 + sr * 1.15, sr);
    c.fillStyle = RANK_RIMS[rank]; c.fill();
  }
}

function drawBody(c, u, r, bob) {
  // hombros
  c.beginPath(); c.ellipse(0, r * 0.82 + bob, r * 0.72, r * 0.5, 0, 0, Math.PI * 2);
  c.fillStyle = vgrad(c, r * 0.35, r * 1.2, shade(u.color, 20), shade(u.color, -60)); c.fill(); ink(c, r * 0.045);
  // cuello del traje
  c.beginPath(); c.moveTo(-r * 0.22, r * 0.38 + bob); c.lineTo(0, r * 0.62 + bob); c.lineTo(r * 0.22, r * 0.38 + bob);
  c.fillStyle = u.color2; c.fill(); ink(c, r * 0.03);
}

function face(c, r, hy, opt) {
  opt = opt || {};
  var ex = r * 0.15, ey = hy + r * 0.02, er = r * (opt && opt.big ? 0.092 : 0.075);
  if (!opt.noEyes) {
    [-1, 1].forEach(function (s) {
      if (opt.patch && s === 1) {
        c.fillStyle = '#1a1a1a'; c.beginPath(); c.ellipse(s * ex, ey, er * 1.3, er * 1.1, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#1a1a1a'; c.lineWidth = r * 0.03; c.beginPath(); c.moveTo(-r * 0.36, hy - r * 0.12); c.lineTo(r * 0.36, hy - r * 0.02); c.stroke();
        return;
      }
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(s * ex, ey, er, er * 1.15, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = opt.eyeColor || '#2a1e3a'; circle(c, s * ex + er * 0.15, ey + er * 0.1, er * 0.62); c.fill();
      c.fillStyle = '#ffffff'; circle(c, s * ex + er * 0.35, ey - er * 0.25, er * 0.22); c.fill();
      if (opt.big) { c.fillStyle = 'rgba(255,255,255,0.85)'; circle(c, s * ex - er * 0.2, ey + er * 0.45, er * 0.12); c.fill(); }
    });
  }
  if (opt.brows) {
    c.strokeStyle = opt.brows; c.lineWidth = r * 0.045;
    c.beginPath(); c.moveTo(-ex - er, ey - er * 1.7); c.lineTo(-ex + er, ey - er * 1.3); c.stroke();
    c.beginPath(); c.moveTo(ex + er, ey - er * 1.7); c.lineTo(ex - er, ey - er * 1.3); c.stroke();
  }
  if (!opt.noMouth) {
    c.strokeStyle = '#7a2a2a'; c.lineWidth = r * 0.035;
    c.beginPath(); c.arc(0, hy + r * 0.13, r * 0.07, 0.2, Math.PI - 0.2); c.stroke();
  }
  if (!opt.noBlush) {
    c.fillStyle = 'rgba(255,120,120,0.35)';
    circle(c, -r * 0.24, hy + r * 0.11, r * 0.05); c.fill(); circle(c, r * 0.24, hy + r * 0.11, r * 0.05); c.fill();
  }
}

function headBase(c, u, r, hy) {
  circle(c, 0, hy, r * 0.36);
  c.fillStyle = vgrad(c, hy - r * 0.36, hy + r * 0.36, shade(u.skin, 15), shade(u.skin, -25)); c.fill(); ink(c, r * 0.045);
}

function drawHead(c, id, u, r, bob, now) {
  var hy = -r * 0.12 + bob;
  var i;
  switch (id) {
    case 'lyra': {
      // capucha verde con hoja, broche y arco en la mano
      c.beginPath(); c.moveTo(-r * 0.46, hy + r * 0.38); c.quadraticCurveTo(-r * 0.5, hy - r * 0.5, 0, hy - r * 0.62); c.quadraticCurveTo(r * 0.5, hy - r * 0.5, r * 0.46, hy + r * 0.38); c.closePath();
      c.fillStyle = vgrad(c, hy - r * 0.6, hy + r * 0.4, '#5fd47e', '#2a8a45'); c.fill(); ink(c, r * 0.045);
      // mechones que asoman de la capucha
      c.fillStyle = vgrad(c, hy - r * 0.3, hy + r * 0.45, '#ffb35c', '#d9762a');
      [-1, 1].forEach(function (sd) {
        c.beginPath(); c.moveTo(sd * r * 0.3, hy - r * 0.2); c.quadraticCurveTo(sd * r * 0.46, hy + r * 0.15, sd * r * 0.3, hy + r * 0.46); c.quadraticCurveTo(sd * r * 0.22, hy + r * 0.15, sd * r * 0.3, hy - r * 0.2); c.fill(); ink(c, r * 0.025);
      });
      headBase(c, u, r, hy + r * 0.04);
      c.fillStyle = vgrad(c, hy - r * 0.35, hy - r * 0.05, '#ffbf6a', '#e0802e');
      c.beginPath(); c.moveTo(-r * 0.34, hy - r * 0.02); c.quadraticCurveTo(-r * 0.3, hy - r * 0.36, 0, hy - r * 0.34); c.quadraticCurveTo(r * 0.3, hy - r * 0.36, r * 0.34, hy - r * 0.02);
      c.quadraticCurveTo(r * 0.18, hy - r * 0.14, r * 0.06, hy - r * 0.06); c.quadraticCurveTo(-r * 0.02, hy - r * 0.16, -r * 0.12, hy - r * 0.06); c.quadraticCurveTo(-r * 0.22, hy - r * 0.16, -r * 0.34, hy - r * 0.02); c.closePath();
      c.fill(); ink(c, r * 0.025);
      face(c, r, hy + r * 0.07, { big: true, eyeColor: '#2f7a3a' });
      c.fillStyle = '#b8f27a'; c.beginPath(); c.ellipse(-r * 0.2, hy - r * 0.48, r * 0.12, r * 0.05, -0.6, 0, Math.PI * 2); c.fill(); ink(c, r * 0.025);
      // broche de hoja en el cuello de la capa
      c.save(); c.translate(0, r * 0.42 + bob); c.rotate(-0.5);
      c.beginPath(); c.moveTo(0, -r * 0.1); c.quadraticCurveTo(r * 0.09, 0, 0, r * 0.1); c.quadraticCurveTo(-r * 0.09, 0, 0, -r * 0.1);
      c.fillStyle = vgrad(c, -r * 0.1, r * 0.1, '#ffe27a', '#d4a020'); c.fill(); ink(c, r * 0.02);
      c.strokeStyle = '#8a6418'; c.lineWidth = r * 0.012; c.beginPath(); c.moveTo(0, -r * 0.08); c.lineTo(0, r * 0.08); c.stroke();
      c.restore();
      // arquito de madera en la mano
      c.save(); c.translate(r * 0.46, r * 0.36 + bob); c.rotate(-0.25);
      c.strokeStyle = INK; c.lineWidth = r * 0.11;
      c.beginPath(); c.arc(-r * 0.2, 0, r * 0.36, -1.15, 1.15); c.stroke();
      c.strokeStyle = '#a8703a'; c.lineWidth = r * 0.065;
      c.beginPath(); c.arc(-r * 0.2, 0, r * 0.36, -1.15, 1.15); c.stroke();
      c.strokeStyle = '#f4ead0'; c.lineWidth = r * 0.018;
      c.beginPath(); c.moveTo(-r * 0.2 + Math.cos(-1.15) * r * 0.36, Math.sin(-1.15) * r * 0.36); c.lineTo(-r * 0.2 + Math.cos(1.15) * r * 0.36, Math.sin(1.15) * r * 0.36); c.stroke();
      circle(c, r * 0.15, 0, r * 0.075); c.fillStyle = u.skin; c.fill(); ink(c, r * 0.022);
      c.restore();
      break;
    }
    case 'brasa': {
      // sombrero de mago con llama en la punta y bola de fuego
      headBase(c, u, r, hy);
      c.fillStyle = '#5a2a1a'; c.beginPath(); c.ellipse(0, hy + r * 0.3, r * 0.3, r * 0.14, 0, 0, Math.PI); c.fill();
      face(c, r, hy, { brows: '#5a2a1a' });
      c.beginPath(); c.ellipse(0, hy - r * 0.24, r * 0.52, r * 0.12, 0, 0, Math.PI * 2);
      c.fillStyle = '#b8261a'; c.fill(); ink(c, r * 0.04);
      c.beginPath(); c.moveTo(-r * 0.32, hy - r * 0.26); c.quadraticCurveTo(-r * 0.12, hy - r * 0.75, r * 0.12, hy - r * 0.98); c.quadraticCurveTo(r * 0.12, hy - r * 0.6, r * 0.32, hy - r * 0.26); c.closePath();
      c.fillStyle = vgrad(c, hy - r, hy - r * 0.2, '#ff5a2c', '#a01e12'); c.fill(); ink(c, r * 0.04);
      c.fillStyle = '#ffc04a'; c.fillRect(-r * 0.3, hy - r * 0.36, r * 0.6, r * 0.06);
      var fl = Math.sin(now / 90) * r * 0.03;
      glow(c, r * 0.12, hy - r * 1.02, r * 0.22, '#ffb020', 0.8);
      c.fillStyle = '#ffdd55'; c.beginPath(); c.moveTo(r * 0.12, hy - r * 1.18 - fl); c.quadraticCurveTo(r * 0.24, hy - r * 0.98, r * 0.12, hy - r * 0.92); c.quadraticCurveTo(0, hy - r * 0.98, r * 0.12, hy - r * 1.18 - fl); c.fill();
      glow(c, -r * 0.56, r * 0.5, r * 0.25, '#ff7a1a', 0.85);
      c.fillStyle = '#ffd34d'; circle(c, -r * 0.56, r * 0.5, r * 0.1); c.fill();
      break;
    }
    case 'nivea': {
      // melena blanca, corona de hielo
      c.fillStyle = '#f2f8ff';
      c.beginPath(); c.ellipse(0, hy + r * 0.1, r * 0.48, r * 0.5, 0, 0, Math.PI * 2); c.fill(); ink(c, r * 0.04);
      headBase(c, u, r, hy);
      c.fillStyle = '#f2f8ff'; c.beginPath(); c.moveTo(-r * 0.36, hy - r * 0.02); c.quadraticCurveTo(-r * 0.2, hy - r * 0.42, r * 0.36, hy - r * 0.1); c.quadraticCurveTo(r * 0.1, hy - r * 0.28, -r * 0.36, hy - r * 0.02); c.fill();
      face(c, r, hy + r * 0.03, { eyeColor: '#2a6fb0' });
      for (i = -2; i <= 2; i++) {
        var hx = i * r * 0.12, h = (i === 0 ? 0.42 : Math.abs(i) === 1 ? 0.3 : 0.2) * r;
        c.beginPath(); c.moveTo(hx - r * 0.07, hy - r * 0.3); c.lineTo(hx, hy - r * 0.3 - h); c.lineTo(hx + r * 0.07, hy - r * 0.3); c.closePath();
        c.fillStyle = vgrad(c, hy - r * 0.75, hy - r * 0.3, '#ffffff', '#58c9ff'); c.fill(); ink(c, r * 0.025);
      }
      glow(c, r * 0.55, r * 0.45, r * 0.22, '#bfefff', 0.7);
      c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.03;
      for (i = 0; i < 3; i++) { var a = i * Math.PI / 3 + now / 800; c.beginPath(); c.moveTo(r * 0.55 - Math.cos(a) * r * 0.1, r * 0.45 - Math.sin(a) * r * 0.1); c.lineTo(r * 0.55 + Math.cos(a) * r * 0.1, r * 0.45 + Math.sin(a) * r * 0.1); c.stroke(); }
      break;
    }
    case 'doblon': {
      // chistera con banda dorada, bigote y moneda
      headBase(c, u, r, hy + r * 0.02);
      face(c, r, hy + r * 0.04, { noMouth: true });
      c.fillStyle = '#6b3a1a'; c.beginPath(); c.moveTo(0, hy + r * 0.14); c.quadraticCurveTo(-r * 0.2, hy + r * 0.06, -r * 0.3, hy + r * 0.2); c.quadraticCurveTo(-r * 0.12, hy + r * 0.22, 0, hy + r * 0.16); c.quadraticCurveTo(r * 0.12, hy + r * 0.22, r * 0.3, hy + r * 0.2); c.quadraticCurveTo(r * 0.2, hy + r * 0.06, 0, hy + r * 0.14); c.fill();
      c.beginPath(); c.ellipse(0, hy - r * 0.27, r * 0.46, r * 0.1, 0, 0, Math.PI * 2); c.fillStyle = '#2a2230'; c.fill(); ink(c, r * 0.035);
      rrect(c, -r * 0.27, hy - r * 0.8, r * 0.54, r * 0.55, r * 0.05); c.fillStyle = vgrad(c, hy - r * 0.8, hy - r * 0.25, '#4a3a58', '#1e1828'); c.fill(); ink(c, r * 0.035);
      c.fillStyle = '#f2b632'; c.fillRect(-r * 0.27, hy - r * 0.42, r * 0.54, r * 0.08);
      var spin = Math.abs(Math.cos(now / 400));
      c.beginPath(); c.ellipse(r * 0.55, r * 0.48, r * 0.17 * Math.max(0.2, spin), r * 0.17, 0, 0, Math.PI * 2);
      c.fillStyle = vgrad(c, r * 0.3, r * 0.65, '#fff1a8', '#d4901a'); c.fill(); ink(c, r * 0.03);
      break;
    }
    case 'rocco': {
      // enano: barba pelirroja enorme y casco de hierro, bomba
      headBase(c, u, r, hy);
      face(c, r, hy - r * 0.02, { noMouth: true, brows: '#8a3a12' });
      c.beginPath(); c.moveTo(-r * 0.36, hy + r * 0.04); c.quadraticCurveTo(-r * 0.4, hy + r * 0.62, 0, hy + r * 0.72); c.quadraticCurveTo(r * 0.4, hy + r * 0.62, r * 0.36, hy + r * 0.04); c.quadraticCurveTo(0, hy + r * 0.24, -r * 0.36, hy + r * 0.04);
      c.fillStyle = vgrad(c, hy, hy + r * 0.7, '#e86a2a', '#a8401a'); c.fill(); ink(c, r * 0.04);
      c.beginPath(); c.arc(0, hy - r * 0.08, r * 0.4, Math.PI, 0); c.closePath();
      c.fillStyle = vgrad(c, hy - r * 0.5, hy, '#c9ccd6', '#6a6e7c'); c.fill(); ink(c, r * 0.04);
      c.fillStyle = '#ffd166'; c.fillRect(-r * 0.42, hy - r * 0.1, r * 0.84, r * 0.07);
      c.fillStyle = '#f2ead8';
      c.beginPath(); c.moveTo(-r * 0.36, hy - r * 0.2); c.quadraticCurveTo(-r * 0.62, hy - r * 0.4, -r * 0.58, hy - r * 0.62); c.quadraticCurveTo(-r * 0.46, hy - r * 0.4, -r * 0.3, hy - r * 0.3); c.fill(); ink(c, r * 0.025);
      c.beginPath(); c.moveTo(r * 0.36, hy - r * 0.2); c.quadraticCurveTo(r * 0.62, hy - r * 0.4, r * 0.58, hy - r * 0.62); c.quadraticCurveTo(r * 0.46, hy - r * 0.4, r * 0.3, hy - r * 0.3); c.fill(); ink(c, r * 0.025);
      circle(c, -r * 0.56, r * 0.5, r * 0.15); c.fillStyle = '#26262e'; c.fill(); ink(c, r * 0.03);
      glow(c, -r * 0.5, r * 0.32, r * 0.1, '#ffd166', 0.9 + Math.sin(now / 60) * 0.1);
      break;
    }
    case 'volta': {
      // pelo morado de punta, gafas de inventora y antena
      c.fillStyle = '#7a4dff';
      for (i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * r * 0.14 - r * 0.1, hy - r * 0.2); c.lineTo(i * r * 0.16, hy - r * 0.6 + Math.abs(i) * r * 0.08); c.lineTo(i * r * 0.14 + r * 0.1, hy - r * 0.2); c.closePath(); c.fill(); ink(c, r * 0.025); }
      headBase(c, u, r, hy);
      face(c, r, hy + r * 0.04, {});
      [-1, 1].forEach(function (s) {
        circle(c, s * r * 0.15, hy - r * 0.2, r * 0.11); c.fillStyle = '#fff07a'; c.fill(); ink(c, r * 0.04);
        c.fillStyle = 'rgba(255,255,255,0.7)'; circle(c, s * r * 0.15 - r * 0.03, hy - r * 0.23, r * 0.035); c.fill();
      });
      c.strokeStyle = '#3a2a5a'; c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(-r * 0.36, hy - r * 0.2); c.lineTo(r * 0.36, hy - r * 0.2); c.stroke();
      c.strokeStyle = '#9a9aa8'; c.lineWidth = r * 0.035; c.beginPath(); c.moveTo(r * 0.28, hy - r * 0.32); c.lineTo(r * 0.44, hy - r * 0.72); c.stroke();
      glow(c, r * 0.44, hy - r * 0.74, r * 0.16, '#fff07a', 0.6 + Math.sin(now / 70) * 0.3);
      c.fillStyle = '#ffffff'; circle(c, r * 0.44, hy - r * 0.74, r * 0.05); c.fill();
      break;
    }
    case 'mirra': {
      // capucha con máscara de gas y frasco de veneno
      c.beginPath(); c.moveTo(-r * 0.46, hy + r * 0.4); c.quadraticCurveTo(-r * 0.52, hy - r * 0.55, 0, hy - r * 0.6); c.quadraticCurveTo(r * 0.52, hy - r * 0.55, r * 0.46, hy + r * 0.4); c.closePath();
      c.fillStyle = vgrad(c, hy - r * 0.6, hy + r * 0.4, '#5a7a3a', '#2a3a1a'); c.fill(); ink(c, r * 0.045);
      headBase(c, u, r, hy + r * 0.04);
      [-1, 1].forEach(function (s) {
        circle(c, s * r * 0.15, hy + r * 0.02, r * 0.1); c.fillStyle = '#9cff6a'; c.fill(); ink(c, r * 0.04);
        c.fillStyle = 'rgba(255,255,255,0.6)'; circle(c, s * r * 0.15 - r * 0.03, hy - r * 0.01, r * 0.03); c.fill();
      });
      rrect(c, -r * 0.12, hy + r * 0.12, r * 0.24, r * 0.2, r * 0.06); c.fillStyle = '#5a5a66'; c.fill(); ink(c, r * 0.03);
      c.fillStyle = '#2a2a33'; for (i = -1; i <= 1; i++) { circle(c, i * r * 0.06, hy + r * 0.22, r * 0.02); c.fill(); }
      c.beginPath(); c.arc(-r * 0.55, r * 0.52, r * 0.14, 0, Math.PI * 2); c.fillStyle = 'rgba(210,255,190,0.4)'; c.fill(); ink(c, r * 0.03);
      c.fillStyle = '#5fdc4a'; c.beginPath(); c.arc(-r * 0.55, r * 0.52, r * 0.12, 0.1, Math.PI - 0.1); c.fill();
      c.fillStyle = '#a0663a'; c.fillRect(-r * 0.6, r * 0.3, r * 0.1, r * 0.08);
      break;
    }
    case 'melodia': {
      // boina rosa con pluma y nota musical
      c.fillStyle = '#ffd36b'; c.beginPath(); c.ellipse(0, hy + r * 0.12, r * 0.46, r * 0.42, 0, 0, Math.PI * 2); c.fill(); ink(c, r * 0.035);
      headBase(c, u, r, hy);
      face(c, r, hy + r * 0.03, { eyeColor: '#b03a7a' });
      c.beginPath(); c.ellipse(-r * 0.04, hy - r * 0.3, r * 0.44, r * 0.16, -0.2, 0, Math.PI * 2);
      c.fillStyle = vgrad(c, hy - r * 0.45, hy - r * 0.15, '#ff8fc8', '#d43a8a'); c.fill(); ink(c, r * 0.04);
      c.beginPath(); c.moveTo(r * 0.2, hy - r * 0.38); c.quadraticCurveTo(r * 0.6, hy - r * 0.7, r * 0.66, hy - r * 1.0); c.quadraticCurveTo(r * 0.4, hy - r * 0.7, r * 0.26, hy - r * 0.42);
      c.fillStyle = '#ffffff'; c.fill(); ink(c, r * 0.025);
      var nb = Math.sin(now / 300) * r * 0.06;
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(-r * 0.6, r * 0.42 + nb, r * 0.08, r * 0.06, -0.4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = r * 0.03; c.beginPath(); c.moveTo(-r * 0.53, r * 0.4 + nb); c.lineTo(-r * 0.53, r * 0.12 + nb); c.lineTo(-r * 0.42, r * 0.18 + nb); c.stroke();
      break;
    }
    case 'sombra': {
      // capucha oscura, máscara y ojos brillantes, puñal
      c.beginPath(); c.moveTo(-r * 0.48, hy + r * 0.42); c.quadraticCurveTo(-r * 0.5, hy - r * 0.5, 0, hy - r * 0.68); c.quadraticCurveTo(r * 0.5, hy - r * 0.5, r * 0.48, hy + r * 0.42); c.closePath();
      c.fillStyle = vgrad(c, hy - r * 0.7, hy + r * 0.4, '#3a2a5e', '#140e24'); c.fill(); ink(c, r * 0.045);
      c.beginPath(); c.ellipse(0, hy + r * 0.04, r * 0.3, r * 0.3, 0, 0, Math.PI * 2); c.fillStyle = '#1e1630'; c.fill();
      c.fillStyle = '#ff4f7b';
      glow(c, -r * 0.12, hy, r * 0.12, '#ff4f7b', 0.8); glow(c, r * 0.12, hy, r * 0.12, '#ff4f7b', 0.8);
      c.beginPath(); c.ellipse(-r * 0.12, hy, r * 0.07, r * 0.03, 0.3, 0, Math.PI * 2); c.ellipse(r * 0.12, hy, r * 0.07, r * 0.03, -0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2a2040'; rrect(c, -r * 0.26, hy + r * 0.08, r * 0.52, r * 0.18, r * 0.06); c.fill();
      c.save(); c.translate(r * 0.56, r * 0.42); c.rotate(-0.7);
      c.fillStyle = vgrad(c, -r * 0.35, 0, '#ffffff', '#9aa0b8'); c.beginPath(); c.moveTo(0, -r * 0.38); c.lineTo(r * 0.06, -r * 0.05); c.lineTo(-r * 0.06, -r * 0.05); c.closePath(); c.fill(); ink(c, r * 0.02);
      c.fillStyle = '#ff4f7b'; c.fillRect(-r * 0.1, -r * 0.06, r * 0.2, r * 0.05);
      c.restore();
      break;
    }
    case 'cronos': {
      // sombrero con engranaje, monóculo y bigote gris
      headBase(c, u, r, hy + r * 0.02);
      face(c, r, hy + r * 0.04, { noMouth: true });
      circle(c, r * 0.15, hy + r * 0.06, r * 0.12); c.strokeStyle = '#ffd166'; c.lineWidth = r * 0.035; c.stroke();
      c.strokeStyle = '#ffd166'; c.lineWidth = r * 0.015; c.beginPath(); c.moveTo(r * 0.26, hy + r * 0.12); c.quadraticCurveTo(r * 0.35, hy + r * 0.35, r * 0.28, hy + r * 0.5); c.stroke();
      c.fillStyle = '#c9c9d4'; c.beginPath(); c.ellipse(-r * 0.1, hy + r * 0.18, r * 0.12, r * 0.04, 0.2, 0, Math.PI * 2); c.ellipse(r * 0.1, hy + r * 0.18, r * 0.12, r * 0.04, -0.2, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(0, hy - r * 0.42); c.rotate(now / 1500);
      c.beginPath();
      for (i = 0; i < 10; i++) { var ga = i / 10 * Math.PI * 2; c.lineTo(Math.cos(ga) * r * 0.3, Math.sin(ga) * r * 0.3); c.lineTo(Math.cos(ga + 0.3) * r * 0.3, Math.sin(ga + 0.3) * r * 0.3); c.lineTo(Math.cos(ga + 0.34) * r * 0.22, Math.sin(ga + 0.34) * r * 0.22); c.lineTo(Math.cos(ga + 0.62) * r * 0.22, Math.sin(ga + 0.62) * r * 0.22); }
      c.closePath(); c.fillStyle = vgrad(c, -r * 0.3, r * 0.3, '#ffe6a3', '#b8862b'); c.fill(); ink(c, r * 0.03);
      circle(c, 0, 0, r * 0.08); c.fillStyle = '#2bb5a8'; c.fill();
      c.restore();
      break;
    }
    case 'halcon': {
      // tricornio, parche en el ojo y fusil
      c.save(); c.translate(-r * 0.5, r * 0.3); c.rotate(-0.9);
      c.fillStyle = '#3a2a1a'; rrect(c, -r * 0.05, -r * 0.6, r * 0.1, r * 0.75, r * 0.03); c.fill(); ink(c, r * 0.02);
      c.fillStyle = '#5a5a66'; c.fillRect(-r * 0.03, -r * 0.95, r * 0.06, r * 0.4);
      c.restore();
      headBase(c, u, r, hy + r * 0.02);
      face(c, r, hy + r * 0.04, { patch: true, brows: '#3a2a1a' });
      c.fillStyle = '#5a3a1a'; c.beginPath(); c.arc(0, hy + r * 0.18, r * 0.2, 0.1, Math.PI - 0.1); c.fill();
      c.beginPath(); c.moveTo(-r * 0.56, hy - r * 0.2); c.quadraticCurveTo(0, hy - r * 0.1, r * 0.56, hy - r * 0.2); c.lineTo(r * 0.34, hy - r * 0.42); c.quadraticCurveTo(0, hy - r * 0.78, -r * 0.34, hy - r * 0.42); c.closePath();
      c.fillStyle = vgrad(c, hy - r * 0.7, hy - r * 0.15, '#3a5aa8', '#1a2a5a'); c.fill(); ink(c, r * 0.04);
      c.strokeStyle = '#ffd166'; c.lineWidth = r * 0.035; c.beginPath(); c.moveTo(-r * 0.5, hy - r * 0.22); c.quadraticCurveTo(0, hy - r * 0.12, r * 0.5, hy - r * 0.22); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(r * 0.12, hy - r * 0.55, r * 0.12, r * 0.04, -0.6, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'ulric': {
      // yelmo de caballero con penacho dorado y escudo
      var plume = Math.sin(now / 400) * r * 0.04;
      c.beginPath(); c.moveTo(0, hy - r * 0.42); c.quadraticCurveTo(r * 0.3 + plume, hy - r * 0.95, -r * 0.1, hy - r * 1.05); c.quadraticCurveTo(r * 0.05, hy - r * 0.7, 0, hy - r * 0.42);
      c.fillStyle = '#ffd34d'; c.fill(); ink(c, r * 0.03);
      c.beginPath(); c.arc(0, hy, r * 0.42, Math.PI, 0); c.lineTo(r * 0.4, hy + r * 0.3); c.quadraticCurveTo(0, hy + r * 0.48, -r * 0.4, hy + r * 0.3); c.closePath();
      c.fillStyle = vgrad(c, hy - r * 0.42, hy + r * 0.4, '#f2f6ff', '#7a86a0'); c.fill(); ink(c, r * 0.045);
      c.fillStyle = '#1a1e2a'; rrect(c, -r * 0.3, hy - r * 0.02, r * 0.6, r * 0.09, r * 0.04); c.fill();
      glow(c, 0, hy + r * 0.02, r * 0.2, '#7fd6ff', 0.5);
      c.strokeStyle = '#ffd34d'; c.lineWidth = r * 0.04; c.beginPath(); c.moveTo(0, hy - r * 0.42); c.lineTo(0, hy - r * 0.04); c.stroke();
      c.beginPath(); c.moveTo(r * 0.42, r * 0.22); c.lineTo(r * 0.72, r * 0.22); c.lineTo(r * 0.72, r * 0.5); c.quadraticCurveTo(r * 0.57, r * 0.72, r * 0.42, r * 0.5); c.closePath();
      c.fillStyle = vgrad(c, r * 0.2, r * 0.7, '#4da3ff', '#1a4a9a'); c.fill(); ink(c, r * 0.03);
      star(c, r * 0.57, r * 0.42, r * 0.09, 4); c.fillStyle = '#ffd34d'; c.fill();
      break;
    }
    default: {
      // tropa aún sin dibujo propio: cara con corona dorada y orbe de su color
      headBase(c, u, r, hy);
      face(c, r, hy, { big: true });
      c.beginPath(); c.moveTo(-r * 0.3, hy - r * 0.28);
      for (i = 0; i < 5; i++) c.lineTo(-r * 0.3 + i * r * 0.15, hy - r * (i % 2 ? 0.46 : 0.62));
      c.lineTo(r * 0.3, hy - r * 0.28); c.closePath();
      c.fillStyle = vgrad(c, hy - r * 0.62, hy - r * 0.28, '#fff1a8', '#d4901a'); c.fill(); ink(c, r * 0.03);
      glow(c, r * 0.55, r * 0.48, r * 0.24, u.color2, 0.85);
      c.fillStyle = u.color2; circle(c, r * 0.55, r * 0.48, r * 0.1); c.fill();
      break;
    }
  }
}

/* ---------- monstruos ---------- */
function drawEnemyVector(c, e, r, now) {
  var d = e.boss ? BOSSES[e.kind] : ENEMIES[e.kind];
  var col = d.color;
  c.save();
  c.translate(e.x, e.y);
  var squash = 1 + Math.sin(now / 140 + e.seed) * 0.06;
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, r * 0.75, r * 0.85, r * 0.25, 0, 0, Math.PI * 2); c.fill();
  if (e.kind === 'ghost') c.globalAlpha = 0.82;
  c.scale(1 / squash, squash);
  if (e.boss) glow(c, 0, 0, r * 1.6, col, 0.35);
  // cuerpo
  c.beginPath();
  if (e.kind === 'imp') {
    c.moveTo(-r * 0.8, r * 0.7); c.quadraticCurveTo(-r, -r * 0.4, -r * 0.4, -r * 0.8); c.lineTo(-r * 0.25, -r * 1.25); c.lineTo(0, -r * 0.85); c.lineTo(r * 0.25, -r * 1.25); c.lineTo(r * 0.4, -r * 0.8); c.quadraticCurveTo(r, -r * 0.4, r * 0.8, r * 0.7); c.closePath();
  } else if (e.kind === 'ghost') {
    c.moveTo(-r * 0.85, r * 0.8); c.lineTo(-r * 0.85, -r * 0.1); c.arc(0, -r * 0.1, r * 0.85, Math.PI, 0); c.lineTo(r * 0.85, r * 0.8);
    for (var w = 3; w >= 0; w--) c.lineTo(-r * 0.85 + w * r * 0.567, r * (w % 2 ? 0.55 : 0.85));
    c.closePath();
  } else if (e.kind === 'brute' || e.kind === 'coloso') {
    rrect(c, -r * 0.9, -r * 0.9, r * 1.8, r * 1.7, r * 0.45);
  } else {
    c.moveTo(-r * 0.95, r * 0.75); c.quadraticCurveTo(-r * 1.05, -r * 0.9, 0, -r * 0.95); c.quadraticCurveTo(r * 1.05, -r * 0.9, r * 0.95, r * 0.75); c.closePath();
  }
  c.fillStyle = vgrad(c, -r, r, shade(col, 45), shade(col, -45)); c.fill(); ink(c, r * 0.1);
  // brillo
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.45, r * 0.25, r * 0.13, -0.6, 0, Math.PI * 2); c.fill();
  // ojos
  var angry = e.boss || e.kind === 'brute' || e.kind === 'imp';
  [-1, 1].forEach(function (s) {
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(s * r * 0.32, -r * 0.12, r * 0.2, r * 0.24, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1028'; circle(c, s * r * 0.3, -r * 0.08, r * 0.11); c.fill();
    if (angry) { c.strokeStyle = INK; c.lineWidth = r * 0.1; c.beginPath(); c.moveTo(s * r * 0.55, -r * 0.42); c.lineTo(s * r * 0.12, -r * 0.3); c.stroke(); }
  });
  c.strokeStyle = INK; c.lineWidth = r * 0.08;
  c.beginPath();
  if (angry) { c.moveTo(-r * 0.25, r * 0.38); c.lineTo(-r * 0.1, r * 0.3); c.lineTo(r * 0.05, r * 0.38); c.lineTo(r * 0.2, r * 0.3); }
  else c.arc(0, r * 0.25, r * 0.18, 0.2, Math.PI - 0.2);
  c.stroke();
  if (e.boss) {
    c.fillStyle = '#ffd166';
    c.beginPath(); c.moveTo(-r * 0.5, -r * 0.9); c.lineTo(-r * 0.5, -r * 1.35); c.lineTo(-r * 0.25, -r * 1.12); c.lineTo(0, -r * 1.45); c.lineTo(r * 0.25, -r * 1.12); c.lineTo(r * 0.5, -r * 1.35); c.lineTo(r * 0.5, -r * 0.9); c.closePath(); c.fill(); ink(c, r * 0.06);
    c.fillStyle = '#ff3b5c'; circle(c, 0, -r * 1.08, r * 0.08); c.fill();
  }
  if (e.kind === 'brute') { c.fillStyle = '#f2ead8'; c.beginPath(); c.moveTo(-r * 0.4, r * 0.45); c.lineTo(-r * 0.3, r * 0.15); c.lineTo(-r * 0.2, r * 0.45); c.fill(); c.beginPath(); c.moveTo(r * 0.4, r * 0.45); c.lineTo(r * 0.3, r * 0.15); c.lineTo(r * 0.2, r * 0.45); c.fill(); }
  c.restore();

  if (e.slowPct > 0) { c.strokeStyle = 'rgba(160,225,255,0.85)'; c.lineWidth = r * 0.1; circle(c, e.x, e.y, r * 1.05); c.stroke(); }
  drawStatus(c, e, r, now);
  if (e.shield > 0) { c.strokeStyle = 'rgba(200,210,230,0.95)'; c.lineWidth = r * 0.14; circle(c, e.x, e.y, r * 1.25); c.stroke(); }
}

/* Monstruos con el diseño ilustrado de la gelatina: cada tipo es una
   gelatina de otro color con sus propios accesorios. */
var ENEMY_LOOK = {
  blob:   { tint: null,      scale: 1 },
  imp:    { tint: '#ff7a2a', scale: 0.92, horns: '#c8261a', tail: true, brows: true },
  brute:  { tint: '#8c8ca6', scale: 1.08, helmet: true, tusks: true, brows: true },
  ghost:  { tint: '#9d86ff', scale: 0.95, alpha: 0.8 },
  rey:    { tint: '#3ea6ff', scale: 1, crown: '#ffd166' },
  gelido: { tint: '#8fe3ff', scale: 1, iceCrown: true, brows: true },
  coloso: { tint: '#9a9aa8', scale: 1.05, crown: '#c9a24a', plates: true, brows: true },
  nigro:  { tint: '#9b5cff', scale: 1, hood: true, staff: true },
  dragon: { tint: '#ff4b2b', scale: 1, horns: '#ffd166', wings: true, brows: true }
};
/* Monstruos con ilustración propia (assets/enemies/<id>.webp). El Coloso
   cambia a su versión de grietas azules mientras tiene el escudo puesto. */
function enemyPic(e) {
  if (e.kind === 'coloso' && e.shield > 0 && art('enemies/coloso2')) return art('enemies/coloso2');
  return art('enemies/' + e.kind);
}
function drawEnemyPic(c, e, r, now, pic) {
  var d = e.boss ? BOSSES[e.kind] : ENEMIES[e.kind];
  var H = r * (e.boss ? 3 : 2.5) * (d.picScale || 1);
  var W = H * pic.naturalWidth / pic.naturalHeight;
  var float = e.kind === 'ghost' ? Math.sin(now / 300 + e.seed) * r * 0.15 : 0;
  var step = Math.abs(Math.sin(now / 160 + e.seed)) * r * 0.08;
  var hk = e.hitT > 0 ? e.hitT / HIT_TIME : 0;
  c.save();
  c.translate(e.x + (e.kbx || 0), e.y + (e.kby || 0));
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(0, r * 0.82, r * 0.85, r * 0.22, 0, 0, Math.PI * 2); c.fill();
  if (e.boss) glow(c, 0, 0, r * 1.7, d.color, 0.4);
  if (e.kind === 'ghost') c.globalAlpha = 0.85;
  // al recibir un golpe se aplasta desde los pies
  if (hk) { c.translate(0, r * 0.95); c.scale(1 + 0.14 * hk, 1 - 0.14 * hk); c.translate(0, -r * 0.95); }
  c.rotate(Math.sin(now / 200 + e.seed) * 0.05);
  c.drawImage(pic, -W / 2, r * 0.95 - H - step + float, W, H);
  if (hk) { c.globalAlpha = 0.85 * hk; c.drawImage(silhouette(pic, '#ffffff'), -W / 2, r * 0.95 - H - step + float, W, H); }
  c.globalAlpha = 1;
  c.restore();
  if (e.slowPct > 0) { c.strokeStyle = 'rgba(160,225,255,0.85)'; c.lineWidth = r * 0.1; circle(c, e.x, e.y, r * 1.1); c.stroke(); }
  drawStatus(c, e, r, now);
  if (e.shield > 0) { c.strokeStyle = 'rgba(120,220,255,0.8)'; c.lineWidth = r * 0.12; circle(c, e.x, e.y, r * 1.35); c.stroke(); }
}
function drawEnemy(c, e, r, now) {
  var pic = enemyPic(e);
  if (pic) { drawEnemyPic(c, e, r, now, pic); return; }
  var base = art('enemies/blob');
  if (!base) { drawEnemyVector(c, e, r, now); return; }
  var look = ENEMY_LOOK[e.kind] || ENEMY_LOOK.blob;
  var body = look.tint ? tinted('enemies/blob', look.tint, 0.85) : base;
  var col = (e.boss ? BOSSES[e.kind] : ENEMIES[e.kind]).color;
  var S = r * 2.5 * look.scale;
  var squash = 1 + Math.sin(now / 140 + e.seed) * 0.05;
  var float = e.kind === 'ghost' ? Math.sin(now / 300 + e.seed) * r * 0.15 : 0;
  var hk = e.hitT > 0 ? e.hitT / HIT_TIME : 0;
  c.save();
  c.translate(e.x + (e.kbx || 0), e.y + (e.kby || 0) + float);
  c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(0, r * 0.82 - float, r * 0.85, r * 0.22, 0, 0, Math.PI * 2); c.fill();
  if (e.boss) glow(c, 0, 0, r * 1.7, col, 0.4);
  c.scale((1 + 0.14 * hk) / squash, squash * (1 - 0.14 * hk));
  var top = -S * 0.56; // parte superior de la imagen
  var Y = function (f) { return top + f * S; }; // fracción vertical de la imagen
  var X = function (f) { return (f - 0.5) * S; };

  // detrás del cuerpo
  if (look.wings) {
    var flap = Math.sin(now / 160) * 0.15;
    [-1, 1].forEach(function (sd) {
      c.save(); c.translate(sd * S * 0.3, Y(0.45)); c.rotate(sd * (0.35 + flap));
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sd * S * 0.35, -S * 0.32, sd * S * 0.42, -S * 0.02); c.quadraticCurveTo(sd * S * 0.28, -S * 0.04, sd * S * 0.22, S * 0.12); c.closePath();
      c.fillStyle = vgrad(c, -S * 0.3, S * 0.1, '#ff8a5a', '#a01e12'); c.fill(); ink(c, r * 0.06);
      c.restore();
    });
  }
  if (look.tail) {
    c.strokeStyle = shade(look.tint, -40); c.lineWidth = r * 0.12;
    c.beginPath(); c.moveTo(X(0.75), Y(0.82)); c.quadraticCurveTo(X(1.02), Y(0.78), X(0.98), Y(0.55)); c.stroke();
    c.fillStyle = look.horns; c.beginPath(); c.moveTo(X(0.98), Y(0.47)); c.lineTo(X(1.06), Y(0.58)); c.lineTo(X(0.9), Y(0.57)); c.closePath(); c.fill();
  }
  if (look.staff) {
    c.strokeStyle = '#5a3a20'; c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(X(0.92), Y(0.95)); c.lineTo(X(0.92), Y(0.12)); c.stroke();
    glow(c, X(0.92), Y(0.1), r * 0.45, '#7dffb0', 0.7);
    c.fillStyle = '#f2ead8'; circle(c, X(0.92), Y(0.1), r * 0.2); c.fill(); ink(c, r * 0.05);
    c.fillStyle = '#1a1028'; circle(c, X(0.88), Y(0.09), r * 0.05); c.fill(); circle(c, X(0.96), Y(0.09), r * 0.05); c.fill();
  }

  if (look.alpha) c.globalAlpha = look.alpha;
  c.drawImage(body, -S / 2, top, S, S);
  if (e.hitT > 0) { c.globalAlpha = 0.85 * e.hitT / HIT_TIME; c.drawImage(silhouette(body, '#ffffff'), -S / 2, top, S, S); }
  c.globalAlpha = 1;

  // delante del cuerpo
  if (look.hood) {
    c.beginPath(); c.moveTo(X(0.1), Y(0.62)); c.quadraticCurveTo(X(0.06), Y(0.0), X(0.5), Y(-0.04)); c.quadraticCurveTo(X(0.94), Y(0.0), X(0.9), Y(0.62)); c.closePath();
    c.ellipse(0, Y(0.38), S * 0.3, S * 0.24, 0, 0, Math.PI * 2, true);
    c.fillStyle = vgrad(c, Y(0), Y(0.6), '#5a3a8a', '#1e1236'); c.fill('evenodd'); ink(c, r * 0.07);
  }
  if (look.helmet) {
    c.beginPath(); c.moveTo(X(0.2), Y(0.3)); c.quadraticCurveTo(X(0.5), Y(0.02), X(0.8), Y(0.3)); c.lineTo(X(0.8), Y(0.36)); c.lineTo(X(0.2), Y(0.36)); c.closePath();
    c.fillStyle = vgrad(c, Y(0.05), Y(0.36), '#d6dae6', '#6a6e7c'); c.fill(); ink(c, r * 0.06);
    c.fillStyle = '#f2ead8';
    [-1, 1].forEach(function (sd) { c.beginPath(); c.moveTo(X(0.5 + sd * 0.28), Y(0.24)); c.quadraticCurveTo(X(0.5 + sd * 0.46), Y(0.12), X(0.5 + sd * 0.44), Y(-0.04)); c.quadraticCurveTo(X(0.5 + sd * 0.36), Y(0.12), X(0.5 + sd * 0.22), Y(0.2)); c.fill(); ink(c, r * 0.04); });
  }
  if (look.plates) {
    c.fillStyle = 'rgba(90,90,104,0.9)';
    [[0.24, 0.62], [0.68, 0.66], [0.46, 0.8]].forEach(function (p) { rrect(c, X(p[0]), Y(p[1]), S * 0.14, S * 0.1, S * 0.02); c.fill(); ink(c, r * 0.04); });
  }
  if (look.tusks) {
    c.fillStyle = '#f7f0dc';
    [-1, 1].forEach(function (sd) { c.beginPath(); c.moveTo(X(0.5 + sd * 0.1), Y(0.58)); c.lineTo(X(0.5 + sd * 0.14), Y(0.46)); c.lineTo(X(0.5 + sd * 0.17), Y(0.58)); c.closePath(); c.fill(); ink(c, r * 0.035); });
  }
  if (look.brows) {
    c.strokeStyle = INK; c.lineWidth = r * 0.11; c.lineCap = 'round';
    [-1, 1].forEach(function (sd) { c.beginPath(); c.moveTo(X(0.5 + sd * 0.28), Y(0.24)); c.lineTo(X(0.5 + sd * 0.08), Y(0.31)); c.stroke(); });
  }
  if (look.horns) {
    c.fillStyle = look.horns;
    [-1, 1].forEach(function (sd) { c.beginPath(); c.moveTo(X(0.5 + sd * 0.12), Y(0.12)); c.quadraticCurveTo(X(0.5 + sd * 0.26), Y(-0.06), X(0.5 + sd * 0.3), Y(-0.12)); c.quadraticCurveTo(X(0.5 + sd * 0.28), Y(0.06), X(0.5 + sd * 0.24), Y(0.16)); c.closePath(); c.fill(); ink(c, r * 0.05); });
  }
  if (look.crown) {
    var cw = S * 0.34, cy = Y(0.1);
    c.beginPath(); c.moveTo(-cw / 2, cy); c.lineTo(-cw / 2, cy - cw * 0.45); c.lineTo(-cw / 4, cy - cw * 0.2); c.lineTo(0, cy - cw * 0.55); c.lineTo(cw / 4, cy - cw * 0.2); c.lineTo(cw / 2, cy - cw * 0.45); c.lineTo(cw / 2, cy); c.closePath();
    c.fillStyle = vgrad(c, cy - cw * 0.55, cy, '#fff1a8', look.crown); c.fill(); ink(c, r * 0.06);
    c.fillStyle = '#ff3b5c'; circle(c, 0, cy - cw * 0.14, cw * 0.08); c.fill();
  }
  if (look.iceCrown) {
    for (var k = -2; k <= 2; k++) {
      var hx = k * S * 0.07, hh = (k === 0 ? 0.22 : Math.abs(k) === 1 ? 0.16 : 0.1) * S;
      c.beginPath(); c.moveTo(hx - S * 0.04, Y(0.12)); c.lineTo(hx, Y(0.12) - hh); c.lineTo(hx + S * 0.04, Y(0.12)); c.closePath();
      c.fillStyle = vgrad(c, Y(0.12) - hh, Y(0.12), '#ffffff', '#58c9ff'); c.fill(); ink(c, r * 0.04);
    }
  }
  c.restore();

  if (e.slowPct > 0) { c.strokeStyle = 'rgba(160,225,255,0.85)'; c.lineWidth = r * 0.1; circle(c, e.x, e.y, r * 1.1); c.stroke(); }
  drawStatus(c, e, r, now);
  if (e.shield > 0) { c.strokeStyle = 'rgba(200,210,230,0.95)'; c.lineWidth = r * 0.14; circle(c, e.x, e.y, r * 1.3); c.stroke(); }
}

/* ---------- icono para la interfaz (canvas → dataURL, cacheado) ---------- */
// monstruo quieto (para la franja de la próxima oleada); se cachea cuando ya
// han cargado sus imágenes
var _enemyIconCache = {};
function enemyIcon(kind, boss) {
  var k = (boss ? 'B' : '') + kind;
  if (_enemyIconCache[k]) return _enemyIconCache[k];
  var cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  var c = cv.getContext('2d');
  if (!c) return '';
  var e = { kind: kind, boss: !!boss, x: 32, y: boss ? 40 : 38, seed: 0, slowPct: 0, poison: 0, stun: 0, shield: 0 };
  drawEnemy(c, e, boss ? 13 : 15, 0);
  var url = cv.toDataURL();
  if (art('enemies/blob') && (art('enemies/' + kind) || ENEMY_LOOK[kind])) _enemyIconCache[k] = url;
  return url;
}
var _unitIconCache = {};
function unitIcon(id, rank, size) {
  size = size || 128;
  // sin rango: la ficha ilustrada; si la tropa aún no tiene, su retrato dibujado
  if (!rank && !UNITS[id].noArt) return 'assets/units/' + id + '.webp';
  if (!art('units/' + id) && !UNITS[id].noArt) { var tmp = drawIconCanvas(id, rank, size); return tmp; }
  var k = id + '_' + (rank || 0) + '_' + size;
  if (_unitIconCache[k]) return _unitIconCache[k];
  _unitIconCache[k] = drawIconCanvas(id, rank, size);
  return _unitIconCache[k];
}
function drawIconCanvas(id, rank, size) {
  var cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  var c = cv.getContext('2d');
  if (!c) return '';
  drawUnit(c, id, size / 2, size * 0.47, size * 0.4, rank || 1, 1000, { still: true, noRank: !rank });
  return cv.toDataURL();
}
