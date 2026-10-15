'use strict';
// Guarda el juego para poder jugar sin conexión. Página, JS y CSS van
// primero a la red (así se ven los cambios al momento); imágenes y fuentes
// salen de la caché y se renuevan por detrás.
// Al instalar solo se guarda lo justo para abrir el juego (CORE), cada
// archivo por su cuenta: si uno falla, los demás se quedan. El arte (EXTRA)
// se baja después, de pocos en pocos y sin bloquear, y lo que se vaya
// usando se guarda igualmente al pedirlo.
var CACHE = 'reino-de-torres-v99';
// tropas con el dibujo nuevo (assets/personajes)
var NEW_ART = ['cronos', 'eco', 'garra', 'halcon', 'kaia', 'lyra', 'oria', 'rocco', 'seren', 'sombra', 'titan', 'fenix'];
var CORE = ['./', 'index.html', 'style.css', 'favicon.svg', 'manifest.json', 'js/data.js', 'js/version.js', 'js/art.js', 'js/meta.js', 'js/board.js', 'js/battle.js', 'js/music.js', 'js/ui.js',
  'assets/ui/header.webp?v=2', 'assets/ui/navbar.webp?v=2', 'assets/ui/fondo-1.webp', 'assets/ui/fondo-2.webp', 'assets/ui/fondo-3.webp', 'assets/ui/titulo.webp', 'assets/ui/fondo.webp', 'assets/tablero.webp', 'assets/icons/moneda.webp', 'assets/icons/gema.webp', 'assets/icons/trofeo.webp', 'assets/icons/estrella.webp'];
var EXTRA = ['assets/icons/gota.webp?v=2', 'assets/ui/boton.webp', 'assets/ui/boton-jugar.webp', 'assets/ui/banner-mazo.webp', 'assets/ui/panel-mazo.webp', 'assets/ui/hueco-cofre.webp', 'assets/ui/boton-duelo.webp', 'assets/ui/boton-coop.webp', 'assets/ui/banner-comandante.webp', 'assets/ui/letrero.webp', 'assets/enemies/blob.webp', 'assets/ui/boton-invocar.webp', 'assets/ui/marco-carta.webp', 'assets/ui/carta.webp', 'assets/ui/vida.webp?v=2', 'assets/ui/placa-vida.webp', 'assets/ui/cinta-titulo.webp', 'assets/ui/boton-azul.webp', 'assets/ui/boton-reto.webp', 'assets/ui/carta-vacia.webp', 'assets/ui/cartel-flecha.webp', 'assets/ui/separador.webp', 'assets/ui/panel-1.webp', 'assets/ui/panel-2.webp', 'assets/ui/panel-3.webp', 'assets/ui/panel-4.webp', 'assets/ui/mana.webp', 'assets/ui/contador-mana.webp', 'assets/ui/comandante.webp', 'assets/ui/boton-invocar-2.webp', 'assets/ui/boton-invocar-gris.webp', 'assets/ui/marco.webp', 'assets/ui/marco-tienda.webp', 'assets/ui/filtro-rareza.webp', 'assets/ui/filtro-rareza-h.webp?v=2', 'assets/ui/modo-campana.webp', 'assets/ui/modo-duelo.webp', 'assets/ui/modo-coop.webp', 'assets/ui/modo-torneo.webp', 'assets/ui/modo-coop-limpio.webp', 'assets/ui/modo-roguelike.webp', 'assets/chests/destello.webp', 'assets/chests/moneda.webp', 'assets/chests/oro-monedas.webp', 'assets/chests/oro-saco.webp', 'assets/chests/oro-cofre.webp', 'assets/commanders/aria.webp?v=2', 'assets/commanders/aria-cuerpo.webp', 'assets/commanders/merlo.webp?v=2', 'assets/commanders/merlo-cuerpo.webp', 'assets/commanders/brann.webp?v=2', 'assets/commanders/brann-cuerpo.webp', 'assets/commanders/nyx.webp', 'assets/commanders/nyx-cuerpo.webp', 'assets/commanders/sol.webp', 'assets/commanders/sol-cuerpo.webp', 'assets/commanders/morgana.webp', 'assets/commanders/morgana-cuerpo.webp', 'assets/commanders/torvald.webp', 'assets/commanders/torvald-cuerpo.webp', 'assets/events/eclipse.webp', 'assets/events/lluvia.webp', 'assets/events/niebla.webp', 'assets/events/horda.webp', 'assets/events/calma.webp', 'assets/boards/lava2.webp', 'assets/boards/hielo.webp', 'assets/boards/roca.webp', 'assets/boards/veneno.webp', 'assets/ui/tarjeta-tienda.webp', 'assets/ui/misiones.webp', 'assets/fx/eco-resuena.webp?v=2', 'assets/fx/fusion-eco.webp?v=2', 'assets/fx/oria-interes.webp?v=2', 'assets/fx/garra-lobo.webp?v=2', 'assets/fx/garra-lobo-2.webp?v=2', 'assets/ui/tarjeta-comandante-2.webp', 'assets/ui/arbol-talentos.webp', 'assets/ui/arbol-comandante.webp', 'assets/fx/nyx-maldicion.webp', 'assets/fx/nyx-chispas.webp', 'assets/fx/sol-escudo.webp', 'assets/fx/morgana-ensamblaje.webp', 'assets/fx/torvald-forja.webp', 'assets/fx/torvald-carga.webp', 'assets/fx/ventisca.webp', 'assets/fx/marea.webp', 'assets/fx/meteoro.webp', 'assets/fx/crater.webp', 'assets/fx/boreas-ventisca.webp', 'assets/fx/midas-critico.webp', 'assets/fx/estado-helado.webp', 'assets/fx/estado-armadura.webp', 'assets/fx/estado-quemado.webp', 'assets/fx/estado-veneno.webp?v=2', 'assets/fx/estado-critico.webp?v=2', 'assets/fx/estado-aturdido.webp?v=2', 'assets/chests/oro-rebosante.webp', 'assets/tiles/altar.webp', 'assets/tiles/fuente.webp', 'assets/tiles/atalaya.webp', 'assets/fx/muerte-puf.webp', 'assets/fx/invocar.webp?v=2', 'assets/fx/fusion.webp?v=2', 'assets/fx/fusion-doblon.webp', 'assets/fx/mover.webp', 'assets/fx/ralentizado-1.webp', 'assets/fx/ralentizado-2.webp', 'assets/fx/ralentizado-3.webp', 'assets/fx/ralentizado-4.webp', 'assets/fx/ralentizado-5.webp', 'assets/fx/conector-fuego.webp', 'assets/fx/conector-hielo.webp', 'assets/fx/conector-naturaleza.webp', 'assets/fx/conector-arcano.webp', 'assets/fx/conector-metal.webp', 'assets/ui/cartel-entrada.webp', 'assets/ui/cartel-salida.webp'].concat(['lyra', 'brasa', 'nivea', 'doblon', 'rocco', 'volta', 'mirra', 'melodia', 'sombra', 'cronos', 'halcon', 'ulric', 'fenix', 'aurora', 'titan', 'boreas', 'midas', 'kaia', 'seren', 'oria', 'garra'].map(function (id) { return 'assets/cells/' + id + '.webp'; })).concat(['piedra-1'].map(function (k) { return 'assets/tiles/' + k + '.webp?v=2'; })).concat([['bosque', 6], ['lava', 6], ['hielo', 2], ['veneno', 6], ['roca', 12]].reduce(function (a, t) { for (var n = 1; n <= t[1]; n++) a.push('assets/tiles/' + t[0] + '-' + n + '.webp?v=2'); return a; }, [])).concat(['comun', 'rara', 'epica', 'mitica', 'legendaria'].map(function (k) { return 'assets/ui/tienda-' + k + '.webp'; })).concat(['lyra', 'brasa', 'nivea', 'doblon', 'rocco', 'volta', 'mirra', 'melodia', 'sombra', 'cronos', 'halcon', 'ulric', 'fenix', 'aurora', 'titan', 'boreas', 'midas', 'kaia', 'seren', 'eco', 'oria', 'garra'].map(function (id) { return 'assets/units/' + id + '.webp?v=' + (NEW_ART.indexOf(id) !== -1 ? 3 : 2); })).concat(['lyra', 'brasa', 'nivea', 'doblon', 'rocco', 'volta', 'mirra', 'melodia', 'sombra', 'cronos', 'halcon', 'ulric', 'fenix', 'aurora', 'titan', 'boreas', 'midas', 'kaia', 'seren'].concat(['eco', 'oria', 'garra']).reduce(function (a, id) { var n = NEW_ART.indexOf(id) !== -1; return a.concat(['assets/units/board/' + id + '-idle.webp?v=' + (n ? 4 : 3), 'assets/units/board/' + id + '-attack.webp' + (n ? '?v=2' : '')]); }, [])).concat(['lyra', 'kaia', 'halcon', 'seren', 'sombra', 'titan', 'cronos', 'rocco'].map(function (id) { return 'assets/fx/' + id + '-tiro.webp'; })).concat(['madera', 'plata', 'oro', 'comandante', 'legendario'].reduce(function (a, k) { return a.concat(['assets/chests/' + k + '.webp?v=2', 'assets/chests/' + k + '-abierto.webp?v=2', 'assets/chests/' + k + '-abriendo.webp?v=2', 'assets/chests/portal-' + k + '.webp']); }, []).concat(['comun', 'rara', 'epica', 'mitica', 'legendaria'].reduce(function (a, k) { return a.concat(['assets/ui/fondo-carta-' + k + '.webp', 'assets/ui/cinta-' + k + '.webp']); }, []))).concat(['fuego', 'hielo', 'veneno', 'canon', 'flecha', 'rayo', 'sombra', 'engranaje', 'bala', 'luz'].reduce(function (a, k) { return a.concat(['destello', 'bola', 'impacto'].map(function (p) { return 'assets/fx/' + k + '-' + p + '.webp' + (p === 'impacto' && (k === 'fuego' || k === 'veneno') ? '?v=2' : ''); })); }, [])).concat(['corona', 'espadas', 'escudo', 'candado', 'pergamino', 'ticket', 'reloj', 'fuego', 'hielo', 'hoja', 'arcano', 'engranaje', 'explosion', 'veneno', 'rayo', 'critico', 'perfora', 'musica', 'diana', 'grafico', 'vecinas', 'chispas', 'calavera', 'ola', 'rival-facil', 'rival-normal', 'rival-dificil', 'derrota', 'sonido', 'silencio', 'rapido', 'reiniciar', 'casa', 'aviso', 'mano', 'dado', 'recolocar', 'mejorar'].map(function (k) { return 'assets/icons/' + k + '.webp'; })).concat(['ghost', 'brute', 'orco', 'rocoso', 'escarcha', 'escudado', 'gelido', 'coloso', 'nigro', 'dragon'].map(function (id) { return 'assets/enemies/' + id + '.webp'; }))
  // 1.23.0: tableros nuevos, losetas, portales, tropas nuevas y efectos
  .concat(['assets/enemies/coloso2.webp?v=2', 'assets/boards/prado3.webp', 'assets/boards/hielo2.webp', 'assets/boards/lava3.webp', 'assets/boards/suelo-prado.webp', 'assets/boards/camino.webp',
    'assets/ui/portal-entrada.webp', 'assets/ui/portal-salida.webp'])
  .concat(['blanca-1', 'blanca-2', 'blanca-3', 'escarcha-1', 'escarcha-2', 'magma-1', 'magma-2'].map(function (k) { return 'assets/tiles/' + k + '.webp?v=2'; }))
  .concat(['marea', 'frida', 'pyra', 'valka'].reduce(function (a, id) { return a.concat(['assets/units/' + id + '.webp?v=2', 'assets/units/board/' + id + '-idle.webp?v=3', 'assets/units/board/' + id + '-attack.webp']); }, []))
  .concat(['marea', 'frida', 'pyra', 'valka', 'fenix'].map(function (id) { return 'assets/fx/' + id + '-tiro.webp'; }))
  .concat(['invocar-aro', 'acelerar', 'rayo-cadena', 'congelado-1', 'congelado-2', 'ganancia-mana', 'pyra-estallido', 'icono-armadura', 'icono-barrera', 'estado-enredado', 'estado-ascuas'].map(function (k) { return 'assets/fx/' + k + '.webp'; }));
function cacheEach(c, list) { return Promise.all(list.map(function (u) { return c.add(u).catch(function () {}); })); }
// el arte, de 6 en 6 (lo que ya esté guardado no se vuelve a bajar)
function warmExtra() {
  return caches.open(CACHE).then(function (c) {
    var i = 0;
    function next() {
      var part = EXTRA.slice(i, i + 6); i += 6;
      if (!part.length) return null;
      return Promise.all(part.map(function (u) { return c.match(u).then(function (hit) { return hit || c.add(u).catch(function () {}); }); })).then(next);
    }
    return next();
  });
}
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return cacheEach(c, CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); })
    .then(function () { warmExtra(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin && url.hostname.indexOf('fonts.') !== 0) return;
  var fresh = url.origin === location.origin && (e.request.mode === 'navigate' || /\.(html|js|css|json)$|\/$/.test(url.pathname));
  e.respondWith(caches.open(CACHE).then(function (c) {
    if (fresh) {
      // no-cache: pregunta siempre al servidor (si no ha cambiado, responde al momento), así una versión nueva llega al recargar sin esperar a que caduque la caché del navegador
      // (una navegación no se puede copiar con opciones: se pide por su URL)
      var req = e.request.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-cache' });
      return fetch(req).then(function (r) { if (r && r.ok) c.put(e.request, r.clone()); return r; })
        .catch(function () { return c.match(e.request, { ignoreSearch: true }); });
    }
    return c.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
