'use strict';
/* =========================================================
   VERSIÓN Y NOVEDADES
   En CADA subida: sube APP_VERSION y añade una entrada ARRIBA de
   APP_PATCH_NOTES. summary: titular corto (sale en «Versiones
   anteriores»); items: lo que nota quien juega, sin tecnicismos.
   La ventana sale sola al entrar con una versión nueva (meta.lastSeenVersion)
   y también desde Opciones.
   ========================================================= */
var APP_VERSION = '1.6.3';
var APP_PATCH_NOTES = [
  {
    version: '1.6.3',
    summary: 'Sello de escarcha bajo los monstruos ralentizados',
    items: [
      'Los monstruos frenados por Nívea o Bóreas llevan a los pies un sello de escarcha animado, más intenso cuanto más frenados van.',
      'La vida de un monstruo vivo marca siempre al menos 1.'
    ]
  },
  {
    version: '1.6.2',
    summary: 'Monstruos ralentizados en azul hielo',
    items: [
      'Los monstruos que frenan Nívea y Bóreas ya no llevan un aro: se tiñen de azul hielo, más cuanto más frenados van.',
      'La vida de los monstruos ya no marca 0 cuando aún les queda un poco.'
    ]
  },
  {
    version: '1.6.1',
    summary: 'Pestañas del Mazo con el estilo del juego',
    items: [
      'Las pestañas Tropas y Comandante y el selector Ordenar tienen ahora marco dorado y botón con brillo, como el resto del juego.',
      'El oro y las gemas de arriba usan la misma letra con contorno que la pantalla de inicio.'
    ]
  },
  {
    version: '1.6.0',
    summary: '15 fases nuevas, tropas solo en cofres y cofre gratis cada 3 horas',
    items: [
      'La campaña llega a 30 fases con 15 zonas nuevas, de Lagos Cristalinos a la Corona del Caos.',
      'La campaña ya no regala tropas: las tropas nuevas salen solo en los cofres y en la tienda.',
      'Cofre gratis cada 3 horas en vez de uno al día, con la cuenta atrás en el inicio.',
      'En el Mazo, las tropas que aún no tienes dicen «No encontrado» y salen debajo de las tuyas.'
    ]
  },
  {
    version: '1.5.0',
    summary: 'Campaña en placas, rangos y afinidades a la vista',
    items: [
      'Campaña: cada fase es una placa de madera con el color de su zona y la siguiente por jugar late.',
      'Cada tropa lleva bajo los pies un disco del color de su rango: gris, verde, azul, morado, naranja, rojo y dorado.',
      'Las tropas vecinas del mismo elemento se unen con un lazo de luz de su color: así ves qué afinidades están activas.',
      'Las cartas de la colección llevan el marco y el fondo de su rareza.',
      'El estandarte del inicio se tiñe con el color de tu comandante y el botón de campaña es más grande.',
      'Títulos y cifras con el mismo contorno en todas las pantallas.'
    ]
  },
  {
    version: '1.4.3',
    summary: 'Las actualizaciones llegan al momento',
    items: [
      'Al recargar, el juego comprueba siempre si hay versión nueva: ya no se queda unos minutos con la anterior (por eso a veces seguían viéndose losas distintas).'
    ]
  },
  {
    version: '1.4.2',
    summary: 'Las 15 losas del tablero, todas iguales',
    items: [
      'Las 15 casillas del tablero llevan ahora la misma losa lisa en todos los mapas.'
    ]
  },
  {
    version: '1.4.1',
    summary: 'Contador para recolocar tropas junto al maná',
    items: [
      'Nuevo contador redondo al lado del maná: mientras esperas, un anillo dorado se llena y te dice los segundos que faltan; cuando ya puedes recolocar una tropa, brilla.',
      'Tócalo para ver cuánto falta.'
    ]
  },
  {
    version: '1.4.0',
    summary: 'Auras en las casillas y efectos nuevos al invocar, fusionar y mover',
    items: [
      'Cada tropa tiene su aura en la casilla, que se enciende cuando dispara.',
      'Las tropas con condición enseñan su aura solo cuando la cumplen: dos Nívea juntas comparten un aura doble, Halcón saca su mira en las casillas de fuera, Mirra y Cronos brillan con vecinas distintas y Melodía con tropas alrededor.',
      'Doblón suelta una fuente de monedas al darte maná y tiene su propio remolino de oro al fusionarse.',
      'Efectos nuevos al invocar (círculo mágico), al fusionar (burbuja dorada) y al recolocar tropas (estelas cruzadas).'
    ]
  },
  {
    version: '1.3.1',
    summary: 'El tablero es siempre el mismo en todos los mapas',
    items: [
      'Las 15 losas del tablero son siempre las mismas en todos los mapas: 9 lisas y 6 agrietadas.',
      'Altar, Fuente y Atalaya ya no tapan su losa: salen como emblema con un borde de su color encima.'
    ]
  },
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
