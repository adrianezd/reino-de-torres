'use strict';
// Guarda el juego para poder jugar sin conexión. Página, JS y CSS van
// primero a la red (así se ven los cambios al momento); imágenes y fuentes
// salen de la caché y se renuevan por detrás.
var CACHE = 'reino-de-torres-v17';
var CORE = ['./', 'index.html', 'style.css', 'favicon.svg', 'manifest.json', 'js/data.js', 'js/art.js', 'js/meta.js', 'js/board.js', 'js/battle.js', 'js/ui.js', 'assets/ui/boton.webp', 'assets/tablero.webp', 'assets/enemies/blob.webp', 'assets/ui/fondo.webp', 'assets/ui/boton-invocar.webp', 'assets/ui/marco-carta.webp', 'assets/ui/carta.webp', 'assets/ui/vida.webp', 'assets/ui/mana.webp', 'assets/ui/contador-mana.webp', 'assets/ui/comandante.webp', 'assets/ui/boton-invocar-2.webp', 'assets/ui/marco.webp', 'assets/commanders/aria.webp', 'assets/commanders/merlo.webp', 'assets/commanders/brann.webp', 'assets/events/eclipse.webp', 'assets/events/lluvia.webp', 'assets/events/niebla.webp', 'assets/events/horda.webp', 'assets/events/calma.webp', 'assets/boards/arena.webp', 'assets/boards/lava.webp', 'assets/tiles/altar.webp', 'assets/tiles/fuente.webp', 'assets/tiles/atalaya.webp'].concat(['lyra', 'brasa', 'nivea', 'doblon', 'rocco', 'volta', 'mirra', 'melodia', 'sombra', 'cronos', 'halcon', 'ulric', 'fenix', 'aurora', 'titan'].map(function (id) { return 'assets/units/' + id + '.webp'; })).concat(['ghost', 'brute', 'orco', 'rocoso', 'escarcha', 'gelido', 'coloso', 'coloso2', 'nigro', 'dragon'].map(function (id) { return 'assets/enemies/' + id + '.webp'; }));
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin && url.hostname.indexOf('fonts.') !== 0) return;
  var fresh = url.origin === location.origin && (e.request.mode === 'navigate' || /\.(html|js|css|json)$|\/$/.test(url.pathname));
  e.respondWith(caches.open(CACHE).then(function (c) {
    if (fresh) {
      return fetch(e.request).then(function (r) { if (r && r.ok) c.put(e.request, r.clone()); return r; })
        .catch(function () { return c.match(e.request, { ignoreSearch: true }); });
    }
    return c.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
