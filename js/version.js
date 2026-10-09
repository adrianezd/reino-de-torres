'use strict';
/* =========================================================
   VERSIÓN Y NOVEDADES
   En CADA subida: sube APP_VERSION y añade una entrada ARRIBA de
   APP_PATCH_NOTES. summary: titular corto (sale en «Versiones
   anteriores»); items: lo que nota quien juega, sin tecnicismos.
   La ventana sale sola al entrar con una versión nueva (meta.lastSeenVersion)
   y también desde Opciones.
   ========================================================= */
var APP_VERSION = '1.3.0';
var APP_PATCH_NOTES = [
  {
    version: '1.3.0',
    summary: 'Mazo por tipos, espera al recolocar y cartas reequilibradas',
    items: [
      'Mazo: nuevo botón Ordenar para ver la colección por rareza o por tipo, agrupada por elemento con su símbolo.',
      'Recolocar o intercambiar tropas tiene una espera de 5 segundos. Fusionar sigue siendo libre. Al arrastrar, un reloj te dice cuánto falta.',
      'El tablero usa siempre las mismas 15 losas: 9 lisas y 6 agrietadas, en franjas.',
      'Melodía toca sin parar: ahora está siempre en su pose de ataque.',
      'Rasgos de posición nuevos: Nívea pega mucho más con otra Nívea al lado; Mirra y Cronos, con vecinas distintas; Halcón, en las casillas de fuera.',
      'Mirra lanza una nube tóxica que envenena también a los de alrededor.',
      'Equilibrio tras cientos de partidas simuladas: suben Nívea, Mirra, Cronos, Halcón, Ulric (×4 a jefes), Ígnea, Sombra, Lyra, Melodía y Doblón. Aurora salta a un enemigo menos.'
    ]
  },
  {
    version: '1.2.0',
    summary: 'Animaciones al invocar y fusionar, y cofres abajo del todo',
    items: [
      'Las tropas caen al invocarlas y rebotan; al fusionar, una vuela hasta la otra.',
      'Los monstruos sueltan gotas de maná que vuelan hasta el contador.',
      'Los huecos de cofre pasan debajo de los botones de jugar.'
    ]
  },
  {
    version: '1.1.0',
    summary: 'Lavado de cara: disparos, golpes, losas y tienda',
    items: [
      'Disparos, destellos e impactos ilustrados para todas las tropas.',
      'Los monstruos reaccionan a cada golpe y estallan en una nube al morir.',
      'Casillas de piedra en el tablero y ofertas de la tienda con el marco de su rareza.'
    ]
  }
];
