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

Además, legendarias que solo salen en el cofre de oro (Ígnea, Aurora y Titán) y dos **míticas**, entre la épica y la legendaria (Común < Rara < Épica < Mítica < Legendaria; en el cofre de oro, 4 % por carta la mítica y 1,2 % la legendaria): **Bóreas**, dragón del invierno (❄️, área que frena muchísimo y a veces congela, con su remolino de hielo sobre el enemigo) y **Midas**, rey dorado (⚙️, lanza monedas que perforan, críticos con el medallón «Critical» y +4 de maná por cada baja suya, `bounty`). Su arte sale de `assets/boreas_*` y `assets/midas_*`. En la tienda solo salen las míticas que ya tienes.

## Lo que lo hace distinto

- **Próxima oleada**: con un solo tablero, una franja arriba dice cuántos monstruos quedan y qué trae la siguiente oleada (monstruos, jefe y evento).
- **Daño por tropa** al terminar cada partida, para saber qué mejorar.
- **Fusión dirigida**: dos tropas iguales del mismo rango se convierten en esa misma tropa con un rango más (no en una al azar).
- **Recolocar tropas**: arrástralas a otra casilla o intercámbialas, una vez cada 5 segundos (`MOVE_COOLDOWN` en `js/battle.js`; fusionar no cuenta).
- **Rasgos de posición**: Nívea pega más con otra Nívea al lado (`twin`), Mirra y Cronos con vecinas distintas (`mixed`) y Halcón en las casillas de fuera (`edge`).
- **Casillas especiales** que cambian cada partida: Altar (+daño), Fuente (maná) y Atalaya (+velocidad).
- **Afinidad elemental**: cada vecina del mismo elemento suma +12% de daño.
- **Comandantes** con habilidad que se carga: Aria (Ventisca), Merlo (Marea de maná) y Brann (Meteoro).
- **Eventos de oleada**: Eclipse, Lluvia de maná, Niebla, Horda y Calma.
- **Jefes** con habilidades: se dividen, congelan tropas, se blindan, invocan o queman rangos.

## Progreso

Oro, gemas, cartas con 10 niveles, cofres de madera, plata y oro, cofre gratis diario, mazo de 5 tropas, trofeos y estrellas. Todo se guarda en el navegador.

**🛒 Tienda:** ofertas de cartas que cambian cada día (por oro o, las épicas y legendarias, por gemas). Se guardan al abrir la tienda, así que no cambian aunque desbloquees tropas, y pueden ser de tropas que aún no tienes (marcadas «Nueva»; la compra la desbloquea), salvo las legendarias. También hay cofres por gemas y oro a cambio de gemas. Las gemas salen en los cofres, por cada estrella nueva de la campaña, al ganar duelos y en el cooperativo. Al tocar un cofre se ve su ficha (qué trae y la probabilidad de rara, épica y legendaria; puede tocar cualquier tropa aunque no la tengas y las legendarias solo salen en el de oro) y hay que darle a Abrir. Al abrirlo sale primero el oro y luego las cartas una a una, con un contador de las que quedan; «Saltar» va directo al resumen.

La ficha de cada tropa tiene dos pestañas: Vídeo (una mini partida con la tropa en acción) y Stats (daño, velocidad y rasgos). Mejorar va en dos toques: el primero enseña lo que gana en cada stat al subir de nivel y el segundo lo confirma. Las tropas bloqueadas también tienen ficha, con lo que hacen y cómo conseguirlas.

**Navegación:** barra de pestañas abajo con Tienda, Mazo (tropas y comandante), Jugar y Equipos (bloqueado, llegará pronto).

**🎟️ Códigos:** en el inicio se canjean códigos de regalo (oro, gemas o cofres), una vez cada uno. Se definen en `CODES` de `js/data.js`.

**🎁 Huecos de cofre:** los cofres que ganas en batalla se guardan en 4 huecos de la pantalla principal. Se desbloquean de uno en uno (madera 5 min, plata 1 h, oro 3 h; `time` en `CHESTS`) o se abren ya pagando 1 gema por cada 6 minutos que falten. Con los 4 llenos, el cofre de la batalla se pierde.

**♻️ Restablecer juego:** en Opciones (atajo del inicio, junto al sonido); tras confirmarlo, borra todo el progreso (solo conserva el ajuste de sonido).

## Arte

- `assets/units/*.webp`: fichas ilustradas de las 12 tropas (recortadas de los originales `assets/*.jpg`).
- `assets/enemies/*.webp`: gelatina, espectro, ogro, orco, rocoso, gólem de escarcha y los jefes Señor Gélido, Coloso (con versión blindada), Nigromante y Dragón. El Diablillo y el Rey Gelatina salen de la gelatina teñida.
- `assets/tiles/*.webp`: suelo de las casillas Altar, Fuente y Atalaya.
- `assets/tablero.*` y `assets/boards/lava2.webp`: tableros ilustrados de la campaña (prado, y lava en anillo para volcán y cripta). `assets/boards/hielo.webp`, `roca.webp` y `veneno.webp` (sin fondo, de `assets/tablero-*.jpg`) son los de hielo, ruinas y desierto (roca) y pantano (al azar con el prado). El tablero de arena con marco de madera ya no se usa. El duelo y el cooperativo usan cualquiera de los cinco al azar, con un decorado del bioma que le pega. En `lava2`, hielo, roca y veneno (`over` en `FIELDS`) el recorte es solo la zona de juego, que es lo que se encaja en la pantalla; el resto de la ilustración se pinta alrededor y el hueco que quede se rellena con el mismo tablero desenfocado, así se adaptan a cualquier forma de móvil. En duelo y cooperativo tu tablero también pinta la ilustración hasta los lados de la pantalla (el del rival se recorta a su zona de juego). en `lava2` salen por la boca de abajo, dan la vuelta entera al río y vuelven a ella. La lava sale de `assets/tablero-lava-invertido.jpg` (volteado en vertical); `assets/tablero-lava-antiguo.jpg` es el primer tablero de lava, ya fuera del juego.
- `assets/chests/*.webp`: cofres de madera, plata y oro (cerrado y `-abierto`), el destello que gira detrás al abrirlos, la moneda de las partículas y los tres paquetes de oro de la tienda. Recortados sin fondo de `assets/cofre-*.jpg`, `assets/destello-cofre.jpg` y `assets/oro.jpg`. `assets/ui/tarjeta-tienda.webp` (de `assets/tarjeta_unificada_tienda.jpg`) es el marco de madera y pizarra de todas las tarjetas de la tienda, y `assets/chests/oro-rebosante.webp` (de `assets/cofre-abierto.jpg`), el paquete grande de oro.
- `assets/units/board/*-idle.webp` y `*-attack.webp`: las 15 tropas en el tablero sin chapa y de cuerpo entero, en reposo (de los originales `assets/set_*.jpg`) y atacando (de `assets/*-attacking.*`). Las dos poses van encuadradas igual: pies abajo en el centro y la figura ocupando el alto.
- `assets/fx/<elemento>-<parte>.webp`: destello al disparar, proyectil e impacto de fuego (Brasa y Fénix), hielo (Nívea), veneno (Mirra) y cañón (Rocco y Titán), recortados de `assets/proyectiles_*.jpg`. El proyectil de fuego y hielo y el destello de hielo y cañón miran a la derecha y se giran hacia el enemigo.
- `assets/commanders/*.webp`: retratos de Aria, Merlo y Brann y su cuerpo entero (`*-cuerpo.webp`), de `assets/set-aria-merlo-brann.jpg`. De la misma hoja salen `assets/ui/tarjeta-comandante.webp` (la tarjeta de la pestaña Comandante) y los efectos de sus habilidades en `assets/fx/`: `ventisca`, `marea`, `meteoro` y `crater`.
- `assets/fx/estado-*.webp` (de `assets/set_efectos.jpg`): iconos sobre la cabeza de los monstruos, encima de su vida: congelado (aturdido por hielo: Aria, Bóreas) o aturdido (Cronos, Aurora), quemado (fuego) o envenenado, y un momento la armadura rota (golpe que perfora a un monstruo con armadura) y el crítico. Si tiene varios, van en fila (`drawStatus` en `js/art.js`).
- `assets/events/*.webp`: medallones de los eventos de oleada (recortados de `assets/wave_events.jpg`).
- Pantalla principal (`assets/ui/`), al estilo del género: `header` (barra de recursos), título con atajos a los lados (cofre gratis, códigos, ayuda y opciones, con el sonido y restablecer juego), `hueco-cofre` (huecos de cofre), panel del mazo con `banner-comandante` (figura del comandante a la izquierda, su habilidad y su nombre en el hueco oscuro; de `assets/comandante-banner.jpg`) sobre `banner-mazo` (las 5 tropas, una por aro; centros en `DECK_RINGS` de `js/ui.js`), y tres botones de jugar: `boton-duelo`, `boton-jugar` (abre la lista de fases de la campaña) y `boton-coop` (de `assets/botones-jugar-2.jpg`). `navbar` es la barra de pestañas. Recortados sin fondo de `assets/header.jpg`, `assets/banner-*.jpg`, `assets/boton jugar.jpg`, `assets/hueco-cofres.jpg` y `assets/navbar.jpg`. `banner-campana`, `banner-duelo` y `banner-coop` son los banners de modo anteriores.
- `assets/icons/*.webp`: moneda, gema, trofeo, estrella, gota de maná, corona, espadas, escudo, candado, pergamino, ticket y reloj, recortados de `assets/set_iconos.jpg`. Con los de `assets/set-icons-2.jpg` (elementos, rasgos, estadísticas, rivales, pausa y tutorial) sustituyen a los emojis en toda la interfaz (`icons()` en `js/ui.js`); el cofre gratis usa el cofre de madera. Sin icono quedan la Atalaya (🏹) y los signos ✕, ✔, → y ‹.
- `assets/ui/`: botones verde y amarillo, corazón de vida, gota y frasco de maná, aro del comandante, marcos de carta, carta de la colección y fondo del menú.
- Los `assets/*.jpg|png` sueltos son los originales; las versiones del juego son los `.webp` recortados.

## Técnica

HTML, CSS y JavaScript sin dependencias ni build. Dibujo vectorial en canvas y sonido sintetizado. Funciona sin conexión tras la primera visita.

- `js/data.js`: tropas, enemigos, jefes, campaña, casillas, comandantes y eventos.
- `js/art.js`: dibujo de personajes y monstruos.
- `js/board.js`: tablero, combate e IA.
- `js/battle.js`: modos, oleadas, dibujo y controles.
- `js/meta.js`: progreso y cofres. `js/ui.js`: menús y bucle.

Juego original. Inspirado en el género de tower defense de fusión; no está afiliado a ningún juego comercial ni usa sus nombres, personajes ni gráficos.
