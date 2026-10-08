# Reino de Torres

Tower defense de fusión para móvil y escritorio, gratis y sin anuncios. Invoca tropas al azar de tu mazo, fusiona las iguales para subirlas de rango y aguanta las oleadas que rodean tu tablero.

**Jugar:** https://adrianezd.github.io/reino-de-torres/

## Modos

- **🗺️ Campaña**: 15 fases con jefe final, estrellas según las vidas que conserves y tropas nuevas que se desbloquean. Cada fase empieza con algo más de maná y su dureza llega poco a poco: la primera oleada viene al 55 % y la última al 100 %. La primera partida trae un tutorial paso a paso (invocar, fusionar, mejorar y comandante), y los monstruos esperan a que tengas dos tropas.
- **⚔️ Duelo 1 contra 1**: tú y un rival (IA fácil, normal o difícil) recibís los mismos monstruos. Gana quien aguante más; si caéis a la vez es empate. El rival fácil lleva cartas 2 niveles por debajo de las tuyas y el difícil, 2 por encima (`DUEL_CARD_OFFSET` en `js/battle.js`). Da trofeos.
- **🤝 2 contra la máquina**: tú y un aliado (IA) compartís vidas contra oleadas infinitas. Récord de oleadas.

## Tropas

12 personajes con nombre, dibujo y papel propios:

| Tropa | Papel | Elemento |
| --- | --- | --- |
| Lyra, arquera del bosque | Daño rápido | 🌿 |
| Brasa, piromante | Área | 🔥 |
| Nívea, hechicera de escarcha | Ralentiza | ❄️ |
| Doblón, mercader | Genera maná | ⚙️ |
| Rocco, cañonero enano | Área grande | 🔥 |
| Volta, ingeniera Tesla | Rayo en cadena | 🔮 |
| Mirra, alquimista | Veneno | 🌿 |
| Melodía, bardo | Acelera a las vecinas | 🔮 |
| Sombra, asesina | Críticos | 🔮 |
| Cronos, relojero | Aturde | ⚙️ |
| Halcón, francotirador | Daño único enorme | ⚙️ |
| Ulric, paladín | Mata jefes | ❄️ |

## Lo que lo hace distinto

- **Próxima oleada**: con un solo tablero, una franja arriba dice cuántos monstruos quedan y qué trae la siguiente oleada (monstruos, jefe y evento).
- **Daño por tropa** al terminar cada partida, para saber qué mejorar.
- **Fusión dirigida**: dos tropas iguales del mismo rango se convierten en esa misma tropa con un rango más (no en una al azar).
- **Recolocar tropas**: arrástralas a otra casilla o intercámbialas.
- **Casillas especiales** que cambian cada partida: Altar (+daño), Fuente (maná) y Atalaya (+velocidad).
- **Afinidad elemental**: cada vecina del mismo elemento suma +12% de daño.
- **Comandantes** con habilidad que se carga: Aria (Ventisca), Merlo (Marea de maná) y Brann (Meteoro).
- **Eventos de oleada**: Eclipse, Lluvia de maná, Niebla, Horda y Calma.
- **Jefes** con habilidades: se dividen, congelan tropas, se blindan, invocan o queman rangos.

## Progreso

Oro, gemas, cartas con 10 niveles, cofres de madera, plata y oro, cofre gratis diario, mazo de 5 tropas, trofeos y estrellas. Todo se guarda en el navegador.

**🛒 Tienda:** ofertas de cartas que cambian cada día (por oro o, las épicas y legendarias, por gemas). Se guardan al abrir la tienda, así que no cambian aunque desbloquees tropas, y pueden ser de tropas que aún no tienes (marcadas «Nueva»; la compra la desbloquea), salvo las legendarias. También hay cofres por gemas y oro a cambio de gemas. Las gemas salen en los cofres, por cada estrella nueva de la campaña, al ganar duelos y en el cooperativo. Al tocar un cofre se ve su ficha (qué trae y la probabilidad de rara, épica y legendaria; puede tocar cualquier tropa aunque no la tengas y las legendarias solo salen en el de oro) y hay que darle a Abrir. Al abrirlo sale primero el oro y luego las cartas una a una, con un contador de las que quedan; «Saltar» va directo al resumen.

La ficha de cada tropa muestra una mini partida con la tropa en acción. Las tropas bloqueadas también tienen ficha, con lo que hacen y cómo conseguirlas.

**Navegación:** barra de pestañas abajo con Tienda, Mazo (tropas y comandante), Jugar y Equipos (bloqueado, llegará pronto).

**🎟️ Códigos:** en el inicio se canjean códigos de regalo (oro, gemas o cofres), una vez cada uno. Se definen en `CODES` de `js/data.js`.

**🎁 Huecos de cofre:** los cofres que ganas en batalla se guardan en 4 huecos de la pantalla principal. Se desbloquean de uno en uno (madera 5 min, plata 1 h, oro 3 h; `time` en `CHESTS`) o se abren ya pagando 1 gema por cada 6 minutos que falten. Con los 4 llenos, el cofre de la batalla se pierde.

**♻️ Restablecer juego:** botón al final del inicio que, tras confirmarlo, borra todo el progreso (solo conserva el ajuste de sonido).

## Arte

- `assets/units/*.webp`: fichas ilustradas de las 12 tropas (recortadas de los originales `assets/*.jpg`).
- `assets/enemies/*.webp`: gelatina, espectro, ogro, orco, rocoso, gólem de escarcha y los jefes Señor Gélido, Coloso (con versión blindada), Nigromante y Dragón. El Diablillo y el Rey Gelatina salen de la gelatina teñida.
- `assets/tiles/*.webp`: suelo de las casillas Altar, Fuente y Atalaya.
- `assets/tablero.*`, `assets/boards/arena.webp` y `assets/boards/lava.webp`: tableros ilustrados de la campaña (prado, arena con marco de madera para hielo, ruinas y desierto, y lava para volcán y cripta). En arena y lava los monstruos aparecen abajo a la izquierda, rodean las casillas en U y se van abajo a la derecha. Salen de `assets/tablero-arena.jpg` y `assets/tablero-lava.jpg`.
- `assets/chests/*.webp`: cofres de madera, plata y oro (cerrado y `-abierto`), el destello que gira detrás al abrirlos, la moneda de las partículas y los tres paquetes de oro de la tienda. Recortados sin fondo de `assets/cofre-*.jpg`, `assets/destello-cofre.jpg` y `assets/oro.jpg`. `assets/ui/marco-tienda.webp` es el marco de las tarjetas de cofres y oro.
- `assets/units/board/*-idle.webp` y `*-attack.webp`: las 15 tropas en el tablero sin chapa, en reposo (recortadas de su ficha) y atacando (de los originales `assets/*-attacking.*`).
- `assets/commanders/*.webp`: retratos de Aria, Merlo y Brann.
- `assets/events/*.webp`: medallones de los eventos de oleada (recortados de `assets/wave_events.jpg`).
- `assets/ui/`: botón de jugar, botones verde y amarillo, corazón de vida, gota y frasco de maná, aro del comandante, marcos de carta, carta de la colección y fondo del menú.
- Los `assets/*.jpg|png` sueltos son los originales; las versiones del juego son los `.webp` recortados.

## Técnica

HTML, CSS y JavaScript sin dependencias ni build. Dibujo vectorial en canvas y sonido sintetizado. Funciona sin conexión tras la primera visita.

- `js/data.js`: tropas, enemigos, jefes, campaña, casillas, comandantes y eventos.
- `js/art.js`: dibujo de personajes y monstruos.
- `js/board.js`: tablero, combate e IA.
- `js/battle.js`: modos, oleadas, dibujo y controles.
- `js/meta.js`: progreso y cofres. `js/ui.js`: menús y bucle.

Juego original. Inspirado en el género de tower defense de fusión; no está afiliado a ningún juego comercial ni usa sus nombres, personajes ni gráficos.
