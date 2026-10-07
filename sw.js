'use strict';
// Guarda el juego para poder jugar sin conexión (stale-while-revalidate).
var CACHE = 'reino-de-torres-v1';
var CORE = ['./', 'index.html', 'style.css', 'favicon.svg', 'manifest.json', 'js/data.js', 'js/art.js', 'js/meta.js', 'js/board.js', 'js/battle.js', 'js/ui.js'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin && url.hostname.indexOf('fonts.') !== 0) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request, { ignoreSearch: url.origin === location.origin }).then(function (hit) {
      var net = fetch(e.request).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
