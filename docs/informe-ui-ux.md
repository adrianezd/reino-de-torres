# Reino de Torres: auditoría de UI/UX y polish visual

**Fecha:** 9 de octubre de 2026
**Versión revisada:** la del repositorio a esta fecha (`style.css?v=37`, `ui.js?v=37`, `battle.js?v=26`)
**Referencia de estilo:** Rush Royale (tablero de fusión), con apoyo de Clash Royale y Brawl Stars para menús y tienda
**Para:** equipo de arte y equipo de programación

---

## 0. Cómo leer este informe

### 0.1 Material revisado

No estaban en `assets/` las imágenes `image_0.png`, `image_2.png` e `image_8.png` del encargo. En su lugar se hicieron capturas nuevas del juego tal como está hoy (móvil de 400×860, densidad 2x). Están en [`docs/capturas/`](capturas/):

| Captura | Pantalla | Equivale a |
| --- | --- | --- |
| [1-home.webp](capturas/1-home.webp) | Inicio con mazo, huecos de cofre y botones de juego | image_8 |
| [2-shop.webp](capturas/2-shop.webp) | Tienda: ofertas, cofres y oro | image_2 |
| [3-mazo.webp](capturas/3-mazo.webp) | Mazo y colección | — |
| [4-campana.webp](capturas/4-campana.webp) | Lista de fases de la campaña | — |
| [5-partida.webp](capturas/5-partida.webp), [6-partida2.webp](capturas/6-partida2.webp) | Partida (oleadas 1 y 2) | image_0 |

Además se leyó el código de dibujo y efectos (`js/art.js`, `js/board.js`, `js/battle.js`, `style.css`) para separar lo que ya existe de lo que falta.

### 0.2 Correcciones al encargo

Varias cosas del encargo ya no describen el juego actual. Se indican aquí para no gastar trabajo en lo que ya está hecho:

| El encargo dice | Lo que hay hoy | Qué queda por hacer |
| --- | --- | --- |
| Las tarjetas de la tienda son azules y planas | Tienen marco de madera tallada con remaches e interior de pizarra | Diferenciar por rareza y dar foco (sección 5) |
| Los cofres son regalos rojos simples | Hay cofres ilustrados de madera, plata y oro, cerrados y abiertos | Darles luz, animación y una apertura más espectacular (sección 5) |
| La fuente es genérica | Ya se usan **Lilita One** (títulos) y **Nunito** (texto). El título es un logotipo ilustrado | No falta fuente: falta un **estilo de texto común** con contorno (sección 3) |
| Los personajes están estáticos | Hay pose de ataque propia por tropa (`pose/<id>-attack`), respiración en reposo y un aumento del 10 % al disparar | Hacer el disparo elástico (squash & stretch) y dar respuesta al impacto (sección 4) |
| Los disparos son bolas genéricas | Fuego, hielo, veneno y cañón tienen destello, proyectil e impacto ilustrados | 6 tipos de disparo siguen dibujados con formas de código (sección 4.3) |

### 0.3 Leyenda

- **Impacto:** cuánto mejora la percepción de calidad (Alto / Medio / Bajo).
- **Esfuerzo:** S = menos de medio día · M = 1–2 días · L = 3 días o más.
- **Equipo:** Arte, Código o los dos.

---

## Resumen y prioridades

El juego ya tiene una base artística sólida y coherente en personajes, cofres, logotipo y marcos de madera. Lo que lo separa de Rush Royale es sobre todo esto:

1. **El tablero se ve pequeño y vacío.** La cuadrícula ocupa cerca del 60 % del ancho y la mitad del área de juego es césped sin nada. Las tropas miden unos 45 px y su contorno grueso se pierde al reducirlas.
2. **Los golpes no se notan.** Los enemigos no reaccionan al recibir daño, las muertes son un aro de color y 6 de los 11 tipos de disparo no tienen arte.
3. **Hay dos estilos de interfaz mezclados.** Unas piezas son ilustradas (madera, oro, piedra) y otras son CSS de aplicación web (campaña, paneles de partida, pestañas). Las segundas rompen la fantasía.
4. **El texto no sigue una regla.** Unos textos llevan contorno y otros solo sombra, con grosores distintos según la pantalla.

### Prioridades (de más a menos rentable)

| # | Mejora | Sección | Impacto | Esfuerzo | Equipo |
| --- | --- | --- | --- | --- | --- |
| 1 | Squash & stretch al disparar (`u.recoil` ya existe y no se usa) | 4.1 | Alto | S | Código |
| 2 | Destello blanco y pequeño retroceso del enemigo al recibir un golpe | 4.2 | Alto | S | Código |
| 3 | Tablero más grande: cuadrícula al ~92 % del ancho y tropas mayores | 1.3 | Alto | M | Código |
| 4 | Contorno oscuro generado por código en las tropas del tablero | 1.3 | Alto | S | Código |
| 5 | Estilo de texto común con contorno exterior, también en el canvas | 3 | Alto | S | Código |
| 6 | Muerte con partículas y orbe de maná que vuela al contador | 4.4 | Alto | M | Código |
| 7 | Arte de destello, proyectil e impacto para flecha, rayo, sombra, engranaje, bala y luz sagrada (18 piezas) | 4.3 | Alto | L | Arte |
| 8 | Losetas de piedra para la cuadrícula del tablero | 1.3 | Alto | M | Arte y código |
| 9 | Animación de invocar (cae y rebota) y de fusionar (vuela hacia la otra tropa) | 4.5 | Medio | M | Código |
| 10 | Rehacer la lista de campaña como placas o como mapa | 2.5 | Medio | M | Arte y código |
| 11 | Tienda: fondo y luz por rareza, cinta de rareza y cofres animados | 5 | Medio | M | Arte y código |
| 12 | Botón Jugar con texto encima, pulso en reposo y brillo que lo recorre | 2.2 | Medio | S | Código |
| 13 | Hueco de cofre vacío con silueta y más contraste | 2.3 | Bajo | S | Arte y código |
| 14 | Arreglar el solape de la comandante con el primer hueco de cofre | 1.4 | Bajo | S | Código |
| 15 | Limpiar el CSS: `.summon-btn` y sus estados `:active` se redefinen 3–4 veces | 2.6 | Bajo (técnico) | M | Código |

**Plan propuesto:**
- **Sprint 1, solo código (unos 3 días):** puntos 1, 2, 4, 5, 6, 12, 13 y 14. Es lo que más mejora la sensación de juego sin esperar a arte.
- **Sprint 2, arte y código:** puntos 3, 7, 8 y 9.
- **Sprint 3, menús:** puntos 10, 11 y 15.

---

## 1. Coherencia estética global

### 1.1 La firma artística actual

Los personajes (`assets/units/`, `assets/units/board/`), comandantes, cofres, iconos y el logotipo comparten estilo:

- contorno marrón oscuro o negro grueso, de unos 3–4 px en un lienzo de 512 px;
- coloreado cel-shaded con 2–3 tonos y brillos duros;
- proporciones chibi, con la cabeza al 40–45 % de la altura;
- paleta cálida y saturada.

Es la firma correcta para el objetivo. **El problema no está en el arte de los personajes sino en lo que los rodea.**

### 1.2 Tropas y panel del mazo: ¿parecen del mismo mundo?

**En el inicio y en el mazo, sí.** Los retratos dentro de los aros del banner (captura 1) y las cartas de la colección (captura 3) se ven con su contorno completo, porque se muestran a 96–110 px. El marco dorado de las cartas y el borde de los aros tienen un grosor parecido al del contorno de los personajes.

**En el tablero, no del todo.** El mismo sprite de 512 px se dibuja a unos 45 px de alto (captura 5). Al reducirlo unas 11 veces, el contorno de 4 px queda en 0,35 px y prácticamente desaparece. Las tropas se ven más finas y lavadas que en los menús, como si fueran de otro juego. Junto a las losetas del altar y la fuente (con contorno grueso y muy contrastadas), la diferencia salta a la vista.

### 1.3 El tablero (código y arte)

Es la mejora de mayor impacto de todo el informe.

#### Lo que se ve hoy (capturas 5 y 6)

- La cuadrícula de 5×3 ocupa cerca del **60 % del ancho** de la pantalla.
- Por encima del camino hay unos **380 px de césped vacío** y por debajo de la valla, otros 280 px.
- Cada casilla mide unos 48 px y la tropa, unos 45 px de alto.

En Rush Royale la cuadrícula ocupa casi todo el ancho y cada tropa llena su casilla. El tablero **es** la pantalla.

#### Propuesta

1. **Escalar la cuadrícula y el camino** hasta que el camino toque los bordes, dejando unos 16 px de margen (cuadrícula al ~92 % del ancho). En un móvil de 400 px, la casilla pasa de 48 a unos 70 px y la tropa, de 45 a unos 65 px.
2. **Recortar el césped vacío de arriba.** La franja de "Siguiente oleada" puede bajar pegada al tablero, o ese espacio puede usarse para decorado (castillo al fondo, torres, estandartes) que dé contexto.
3. **Contorno generado por código** para que las tropas del tablero conserven su firma al reducirlas. Se calcula una vez por sprite al cargarlo y se guarda en caché:

```js
// art.js: versión con contorno de un sprite para dibujarlo pequeño en el tablero
function outlined(img, px, color) {
  var c = document.createElement('canvas');
  c.width = img.width + px * 2; c.height = img.height + px * 2;
  var g = c.getContext('2d');
  // silueta oscura desplazada en 8 direcciones
  var s = document.createElement('canvas'); s.width = img.width; s.height = img.height;
  var sg = s.getContext('2d');
  sg.drawImage(img, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = color; sg.fillRect(0, 0, s.width, s.height);
  for (var a = 0; a < 8; a++) {
    var ang = a * Math.PI / 4;
    g.drawImage(s, px + Math.cos(ang) * px, px + Math.sin(ang) * px);
  }
  g.drawImage(img, px, px);
  return c;
}
// uso: con px = 14 sobre el sprite de 512 px quedan unos 1,5 px en pantalla
```

   Se usa `source-in` y no `ctx.filter` porque `filter` en canvas no está disponible en todas las versiones de Safari para iOS.

4. **Losetas de piedra (arte).** Una loseta de 256×256 px con bisel claro arriba a la izquierda, sombra abajo a la derecha y contorno oscuro. Bastan 3 variantes (normal, agrietada y con musgo), repartidas al azar con una semilla por partida. Así se ve claramente dónde se puede soltar una tropa y el tablero gana la misma lectura que en Rush Royale.

5. **El rango debe leerse sin esfuerzo.** Hoy son estrellas pequeñas bajo los pies. Se propone sumar un **disco de color bajo la tropa** según el rango (gris, verde, azul, morado, naranja, rojo…, siguiendo `RANK_RIMS`) para leerlo de un vistazo, como los puntos de rango de Rush Royale.

---

### 1.4 Fallos visuales detectados (código)

- **La comandante tapa el texto del primer hueco de cofre.** En la captura 1, el báculo y la cabeza de Aria se superponen a "En espera". Hay que bajar la figura o darle `z-index` por debajo de los huecos.
- **El texto de ayuda del mazo apenas se lee.** "Tu mazo (5 tropas). Toca una carta…" va en azul apagado sobre azul. Hay que subir el contraste a 4.5:1 como mínimo o pasarlo a blanco al 80 %.
- **La barra de progreso de carta "0/2" no tiene relleno visible.** Debe tener un relleno verde y, cuando se pueda mejorar, una flecha y un brillo que lo indiquen (como en Clash Royale).

---

### 1.5 Piezas que desentonan

| Pieza | Problema | Solución |
| --- | --- | --- |
| **Cuadrícula del tablero** | Césped con líneas finas oscuras. No tiene volumen ni contorno, al contrario que todo lo demás | Losetas de piedra o tierra pisada con bisel (1.3) |
| **Lista de campaña** (captura 4) | Rectángulos azules en degradado con una franja de brillo de aspecto web. Es la pantalla menos "de fantasía" | Placas de madera o pergamino, o un mapa (2.5) |
| **Paneles de partida** (barra superior, cápsula de oleada, panel inferior) | Azul marino liso o negro translúcido sin textura ni marco | Marco fino de madera u oro y una textura sutil |
| **Pestañas y filtros del mazo** | Cápsulas con borde de color y fondo liso, como componentes web | Reutilizar el estilo de botón 2.5D (2.1) |
| **Fondo del inicio** | Árboles azules desenfocados, genéricos y con poco detalle | Escena del reino de noche o al atardecer con más capas de profundidad (parallax ligero opcional) |
| **Números de vida de los enemigos** | En Nunito 900 con un trazo fino de 3 px; todo lo demás va en Lilita | Lilita One con contorno proporcional (sección 3) |
| **Proyectiles de flecha, rayo, sombra, engranaje, bala y luz** | Líneas y estrellas geométricas sin contorno, junto a otros que son ilustrados | Arte nuevo (4.3) |

### 1.6 Exceso de madera en el inicio

En la captura 1 se apilan seguidos tres bloques de madera marrón casi iguales: los huecos de cofre, el banner de la comandante y el panel del mazo. El ojo no sabe qué es lo importante. Rush Royale y Clash Royale alternan materiales para jerarquizar.

**Propuesta para arte:**
- **Huecos de cofre:** piedra con remaches de hierro. Ya tienen interior de piedra; falta cambiar el marco.
- **Banner de la comandante:** tela o estandarte con el color del comandante (Aria azul hielo, Brann rojo, Merlo morado). Así el banner también dice qué comandante llevas.
- **Panel del mazo:** se queda en madera.

### 1.7 Dirección de arte en una frase (para el equipo)

> "Chibi de contorno grueso, cel-shading de 2–3 tonos, materiales reconocibles (madera, piedra, oro, tela) y **nada de superficies lisas sin bisel ni contorno**."

Toda pieza nueva debe cumplir esa frase. Hoy no la cumplen la cuadrícula, la campaña, los paneles de partida y algunos proyectiles.

---

## 2. Jerarquía y volumen de la interfaz

### 2.1 Receta común de botón 2.5D (CSS)

Todos los botones deberían salir de una misma receta de capas, de fondo a superficie:

1. **Contorno exterior oscuro** de 3 px.
2. **Canto inferior** (la "base" del botón), de 4–6 px en el tono oscuro del color.
3. **Cara** con degradado vertical: más claro arriba y saturado abajo.
4. **Brillo superior:** franja blanca al 35–45 % en la mitad de arriba, con bordes redondeados (el aspecto de caramelo).
5. **Sombra interior inferior** para que la cara parezca convexa.
6. **Sombra proyectada** suave sobre el fondo.

```css
.btn3d {
  --c1: #8df07a; --c2: #2fae3a; --edge: #1d6b23;
  position: relative;
  border: 3px solid #1a1430;
  border-radius: 16px;
  background: linear-gradient(180deg, var(--c1) 0%, var(--c2) 100%);
  box-shadow:
    0 6px 0 var(--edge),                  /* canto */
    0 9px 10px rgba(0,0,0,.35),           /* sombra proyectada */
    inset 0 -6px 0 rgba(0,0,0,.18),       /* sombra interior inferior */
    inset 0 2px 0 rgba(255,255,255,.55);  /* filo de luz arriba */
  transition: transform .06s, box-shadow .06s;
}
.btn3d::before {                          /* brillo de caramelo */
  content: ''; position: absolute; left: 8%; right: 8%; top: 6%; height: 42%;
  border-radius: 12px 12px 40% 40% / 12px 12px 18px 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.08));
  pointer-events: none;
}
.btn3d:active {
  transform: translateY(5px);
  box-shadow: 0 1px 0 var(--edge), 0 2px 3px rgba(0,0,0,.3),
              inset 0 -3px 0 rgba(0,0,0,.18), inset 0 2px 0 rgba(255,255,255,.4);
}
/* variantes: solo cambian los tres colores */
.btn3d.orange { --c1: #ffc65a; --c2: #f08a12; --edge: #a2520a; }
.btn3d.blue   { --c1: #6fc3ff; --c2: #1f74e0; --edge: #154a91; }
.btn3d.gray   { --c1: #b8bfd0; --c2: #7a8399; --edge: #4b5263; } /* sin dinero o bloqueado */
```

Al pulsar, el botón **baja** lo mismo que mide su canto: así se siente físico. Hoy unos botones bajan 2 px, otros 3 y otros 4, y algunos solo encogen.

### 2.2 Botón central de Jugar

**Estado actual (captura 1):** es una imagen (`assets/ui/boton-jugar.webp`) con marco dorado, cara verde en degradado y un triángulo dorado. Ya tiene volumen y brillo, así que no es plano. Lo que falla es la **jerarquía y la vida**:

- **No es claramente el botón principal.** Mide casi lo mismo que los de duelo y cooperativo. En Rush Royale y Clash Royale el botón de batalla es el más grande de la pantalla y destaca por tamaño y color.
- **El texto va fuera.** "Campaña 0/45" queda debajo, separado y con un estilo distinto del botón. El juego de referencia pone la palabra **en** el botón, con contorno.
- **No se mueve.** No invita a pulsarlo.

**Propuesta:**
1. Hacerlo un 25–30 % más ancho y alto que los laterales.
2. Pedir a arte una versión sin el triángulo para escribir encima **"Jugar"** en Lilita con contorno grueso (sección 3), y poner "Campaña · 0/45" como subtítulo pequeño dentro.
3. **Pulso en reposo:** escala de 1 a 1,04 cada 1,6 s con `ease-in-out`.
4. **Brillo que lo recorre:** una franja diagonal blanca cruza la cara cada 3–4 s.
5. **Al pulsar:** baja 5 px, encoge un 3 % y suena un clic grave.

```css
.play-hero { animation: playPulse 1.6s ease-in-out infinite; overflow: hidden; }
.play-hero::after {
  content: ''; position: absolute; top: -20%; bottom: -20%; width: 30%; left: -40%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.55), transparent);
  transform: skewX(-18deg); animation: playShine 3.5s ease-in-out infinite;
  pointer-events: none; mix-blend-mode: screen;
}
@keyframes playPulse { 50% { transform: scale(1.04); } }
@keyframes playShine { 0%, 70% { left: -40%; } 100% { left: 130%; } }
@media (prefers-reduced-motion: reduce) { .play-hero, .play-hero::after { animation: none; } }
```

6. **Botones laterales** (naranja de duelo y azul de cooperativo): el icono está bien. Hay que poner el texto **dentro**, en la parte de abajo del botón, con contorno. Hoy "1 contra 1" y "2 contra IA" flotan debajo sin anclaje.

### 2.3 Huecos de cofre vacíos ("Hueco libre")

**Estado actual:** interior de piedra gris oscura con un marco de madera tallada (`assets/ui/hueco-cofre.webp`). Ya tienen algo de material, pero:

- el interior es **plano**: la piedra no tiene profundidad y parece una pegatina;
- el texto "Hueco libre" va en dorado oscuro sobre gris oscuro, con poco contraste;
- un hueco vacío no dice qué hacer para llenarlo.

**Propuesta para arte:**
- **Rebaje:** el interior debe parecer hundido. Sombra interior marcada arriba y a la izquierda (donde el marco tapa la luz) y un filo de luz abajo a la derecha.
- **Silueta de cofre** al 12–15 % de opacidad en el centro, como "aquí va un cofre".
- **Marco** con un bisel más marcado: luz en el canto superior y sombra en el inferior, más 4 remaches de hierro en las esquinas (ver 1.6).

**Propuesta para código (sin esperar a arte):**

```css
.slot.empty {
  box-shadow: inset 0 6px 10px rgba(0,0,0,.55),   /* hundido */
              inset 0 -2px 0 rgba(255,255,255,.12); /* filo de luz abajo */
}
.slot.empty span {
  font-family: 'Lilita One'; color: #e8d7b0;
  -webkit-text-stroke: 3px #2a1a0c; paint-order: stroke fill;
  opacity: .85;
}
```

- **Hueco ocupado:** el cofre debería **balancearse** suavemente y, cuando esté listo para abrir, rebotar y brillar. Hoy "5 min · En espera" y "50 min · 9 gemas" se leen como texto plano encima del cofre.

### 2.4 Paneles de partida

- **Barra superior** (corazones, oleada, maná, velocidad): sustituir el azul liso por un listón de madera oscura con canto dorado fino, igual que la barra de recursos del inicio, que ya está bien resuelta.
- **Cápsula "Oleada · Siguiente"**: hoy es negro translúcido. Debería ser un pergamino o una placa de piedra con los iconos de monstruo en pequeños medallones.
- **Panel inferior** (comandante, Invocar y mazo): el botón Invocar ya es claro y grande. Se propone:
  - mostrar en el botón **el maná que falta**: una barra que se llena por dentro mientras no llega al coste, como en Rush Royale;
  - cuando **sí** hay maná, dar un pulso leve al botón;
  - dar al fondo del panel textura de piedra o madera, no azul liso.

### 2.5 Pantalla de campaña

Es la pantalla con más distancia respecto a la referencia (captura 4). Son 15 rectángulos azules casi iguales, y las fases bloqueadas solo bajan la opacidad.

**Opción A, rápida: placas.** Cada fase es una placa de madera con su número en un escudo de metal. El color de la placa sigue la zona (verde pradera, blanco hielo, morado pantano, rojo desierto). La fase actual brilla y rebota; las bloqueadas son de piedra gris con candado.

**Opción B, completa: mapa.** Un camino vertical que serpentea por las zonas (Prado Verde → Río Helado → Pantano Tóxico → Desierto Rojo…), con nodos circulares, el retrato del jefe en los nodos de jefe y la tropa que se desbloquea como recompensa visible. Exige una ilustración larga de fondo (unos 1080×4000 px en tramos) y es lo más vistoso.

**Recomendación:** empezar por la opción A, porque reutiliza la receta 2.1 y 15 colores.

### 2.6 Deuda de CSS

En `style.css` (93 KB) hay reglas que se pisan entre sí. `.summon-btn` se define en las líneas 203, 286 y siguientes, y su `:active` en las líneas 210, 246, 292 y 370. Lo mismo ocurre con `.mode-btn:active` (líneas 49 y 250). Por eso cada botón se hunde una distancia distinta.

**Propuesta:** antes de aplicar la receta 2.1, sacar a variables de `:root` los colores, grosores de contorno, cantos y radios (`--ink`, `--edge-h`, `--stroke-sm/md/lg`, `--radius-btn`), y borrar las definiciones repetidas.

---

## 3. Tipografía y legibilidad

### 3.1 Diagnóstico

**La elección de fuentes es correcta.** Lilita One es justo el tipo de letra "cartoon gruesa" que usa el género, y Nunito 800–900 funciona bien para texto corrido. El título es un logotipo ilustrado (`assets/ui/titulo.webp`) de buena calidad, con letras doradas, gemas y corona. **No hace falta cambiar de fuente.**

Lo que falla es el **acabado del texto**. Hay al menos cuatro tratamientos distintos:

| Dónde | Tratamiento actual |
| --- | --- |
| Banner de oleada (`.banner b`) | Trazo de 2 px y sombra de 4 px |
| Nivel de carta (`.ucard .ubar em`) | Trazo de 2,5 px con `paint-order` |
| Títulos y etiquetas ("Campaña 0/45", "Ofertas del día", pestañas) | Solo sombra de 2 px abajo, sin contorno |
| Números de vida de los enemigos (canvas) | Nunito 900 con trazo de 3 px |

En Rush Royale y Clash Royale **todo texto sobre ilustración lleva contorno grueso y sombra proyectada**. Sin contorno, el texto parece pegado encima. Se nota sobre todo en "1 contra 1", "Campaña 0/45", "2 contra IA" y las etiquetas de la barra inferior.

### 3.2 Sistema de texto propuesto (3 estilos)

```css
:root { --ink: #1a1430; }

/* Grande: títulos de pantalla, botón Jugar, banners, VICTORIA */
.t-hero {
  font-family: 'Lilita One', sans-serif; color: #fff; letter-spacing: .02em;
  -webkit-text-stroke: 5px var(--ink);
  paint-order: stroke fill;                /* el trazo queda fuera y no come la letra */
  text-shadow: 0 4px 0 var(--ink), 0 6px 8px rgba(0,0,0,.35);
}
/* Medio: etiquetas de botón, nombres de carta, precios */
.t-label {
  font-family: 'Lilita One', sans-serif; color: #fff;
  -webkit-text-stroke: 3px var(--ink); paint-order: stroke fill;
  text-shadow: 0 2px 0 var(--ink);
}
/* Números: contadores, costes, vida */
.t-num {
  font-family: 'Lilita One', sans-serif; font-variant-numeric: tabular-nums; color: #fff;
  -webkit-text-stroke: 3px var(--ink); paint-order: stroke fill;
}
/* El texto corrido (descripciones, ayuda) sigue en Nunito, sin contorno y con buen contraste */
```

**Reglas:**
- El grosor del contorno es aproximadamente el 12–15 % del tamaño de letra (5 px para 36 px, 3 px para 20 px).
- El contorno **siempre** es del color tinta (`--ink`), nunca negro puro. Así combina con el contorno marrón y morado de las ilustraciones.
- Texto dorado o de color (precios, rareza): un degradado vertical en el relleno (`background-clip: text`) da el acabado metálico de los títulos del género. Solo en títulos y cifras grandes, porque cuesta más dibujarlo.
- `paint-order: stroke fill` funciona en Chrome, Edge, Firefox y Safari 11 o posterior.

### 3.3 Texto en el canvas (partida)

Para la vida, el daño y "Rango N":

```js
function drawOutlinedText(ctx, txt, x, y, size, fill) {
  ctx.font = '400 ' + size + 'px "Lilita One", Nunito, sans-serif';
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;      // evita picos en la M y la A
  ctx.lineWidth = Math.max(3, size * 0.28);         // trazo de ~14 % por cada lado
  ctx.strokeStyle = '#1a1430';
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillText(txt, x, y + size * 0.12); // sombra
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = fill; ctx.fillText(txt, x, y);
}
```

Con esto se sustituyen el texto de vida (`battle.js:685–692`) y el de `drawFloatText`.

### 3.4 Alternativas de fuente (solo si se quiere más carácter)

- **Títulos y logotipos de modo:** *Luckiest Guy* o *Titan One* (Google Fonts) son todavía más redondeadas y gruesas. Conviene probarlas solo en `.t-hero`.
- **Mantener Lilita One** para todo lo demás. Mezclar más de dos fuentes de pantalla resta coherencia.

---

## 4. Sensación de juego y respuesta visual

### 4.0 Lo que ya existe (no repetir)

| Efecto | Dónde |
| --- | --- |
| Pose de ataque propia por tropa | `art.js:224–239`, `assets/units/board/<id>-attack.webp` |
| Respiración en reposo (estiramiento vertical del 2,5 %) | `art.js:242` |
| Escala del 110 % mientras dura el ataque | `art.js:221` |
| Destello en la boca del arma (fuego, hielo, veneno y cañón) | `board.js:346–351` |
| Impacto ilustrado del tamaño del área (los mismos 4) | `board.js:452–454` |
| Temblor de pantalla en eventos grandes (meteoro, jefes) | `board.js:303, 487, 502` |
| Bamboleo continuo de los enemigos | `art.js:593, 686` |
| Texto flotante de crítico, Bloqueo y Fallo | `board.js:274–286` |

### 4.1 Squash & stretch al disparar (Prioridad 1)

**Problema:** el disparo hoy es un salto instantáneo del 100 % al 110 % y vuelta. No tiene anticipación ni rebote, así que se ve rígido. Además `fire()` ya pone `u.recoil = 1` y `update()` lo baja a 0 en unos 0,17 s (`board.js:329, 413`), pero **ningún código de dibujo lo lee**. La variable está lista para usarse.

**Propuesta:** sustituir la escala fija de `art.js:221` por una curva elástica que tome `recoil` (de 1 a 0) y aplique la deformación desde los pies, conservando el volumen (si estira en vertical, encoge en horizontal):

```js
// art.js, dentro de drawUnit (rama del tablero), después de c.translate(0, foot)
// opt.recoil: 1 al disparar → 0. Pasarlo desde battle.js junto a opt.atk.
function jelly(recoil) {
  var t = 1 - recoil;                                    // 0 → 1
  // anticipación (aplasta), estirón y rebote amortiguado
  var k = Math.sin(t * Math.PI * 2.5) * Math.pow(recoil, 1.4) * 0.16;
  return { sx: 1 + k, sy: 1 - k };                       // conserva el área
}
if (opt.recoil > 0) { var j = jelly(opt.recoil); c.scale(j.sx, j.sy); }
```

- Para que se note, alargar el decaimiento de `recoil` de `dt * 6` a `dt * 4` (unos 0,25 s).
- **Retroceso:** sumar un desplazamiento de `-cos(aim) * 0.04 * recoil` en la dirección contraria al disparo. La tropa "da un culatazo".
- **Por tipo de tropa:** los cañones (Rocco, Titán) usan amplitud 0,22 y retroceso doble; los arqueros, 0,12; los magos, un estirón hacia arriba sin retroceso.

### 4.2 Respuesta en el impacto: el enemigo debe notar el golpe (Prioridad 2)

**Problema:** al recibir daño normal, el enemigo no cambia. Solo varía el número de vida. No se sabe qué está pegando ni si pega.

**Propuesta (tres capas baratas):**

1. **Destello blanco:** 60–80 ms con la silueta del enemigo en blanco. Se calcula la silueta blanca una vez por sprite con la misma técnica `source-in` de 1.3, y se dibuja encima con `globalAlpha = e.hitT / 0.08`.
2. **Golpe de escala:** al recibir el impacto, el enemigo se aplasta (`sx 1.15`, `sy 0.85`) y vuelve en 0,12 s.
3. **Retroceso de 0,03 casillas** hacia fuera del tablero (los enemigos rodean la cuadrícula, así que "hacia fuera" equivale a "lejos de las tropas"). No altera la lógica del camino: es solo un desplazamiento de dibujo que vuelve a 0.

```js
// board.js, en Board.prototype.hit, justo después de e.hp -= dmg
e.hitT = 0.08;
var cx = this.geo.W / 2, cy = this.geo.H / 2;
var d = Math.hypot(e.x - cx, e.y - cy) || 1;
e.kbx = (e.x - cx) / d * 0.03; e.kby = (e.y - cy) / d * 0.03;

// board.js, en update, por cada enemigo
e.hitT = Math.max(0, (e.hitT || 0) - dt);
var f = Math.pow(0.0001, dt);           // vuelve a 0 en ~0,1 s
e.kbx = (e.kbx || 0) * f; e.kby = (e.kby || 0) * f;

// battle.js, al dibujar: sumar (e.kbx, e.kby) a la posición del sprite
// y, si e.hitT > 0, dibujar encima la silueta blanca con globalAlpha = e.hitT / 0.08
```

4. **Número de vida que reacciona:** al bajar, se escala al 130 % y vuelve. Si lleva un golpe fuerte (más del 25 % de su vida máxima), se tiñe de rojo un instante.
5. **Números de daño opcionales:** hoy solo salen los críticos. Rush Royale enseña la vida que queda, igual que este juego, así que **no** se recomienda sacar todos los números de daño porque llenaría la pantalla. Como mucho, enseñar los golpes grandes, por ejemplo los del francotirador.

### 4.3 Proyectiles e impactos que faltan (Arte, Prioridad 7)

Solo cuatro tipos (`fire`, `ice`, `poison`, `bomb`) tienen arte (`FX_OF` en `art.js:100`). Los demás se dibujan con líneas y estrellas geométricas (`battle.js:816–833`):

| Tipo | Tropas | Dibujo actual | Pedido a arte (3 piezas: `-destello`, `-bola`, `-impacto`) |
| --- | --- | --- | --- |
| `arrow` | Lyra | Línea blanca de 0,04 con punta gris (las rayas blancas de la captura 6) | Flecha con plumas verdes y estela de hojas. Impacto: astillas y hojas |
| `bolt` | Volta, Aurora | Línea quebrada aleatoria | Rayo en sprite con 3 variantes que se alternan. Impacto: chispa azul en estrella |
| `shadow` | Sombra | Estrella rosa de 4 puntas girando | Daga o shuriken morado oscuro con estela. Impacto: tajo en X |
| `gear` | Cronos | Estrella amarilla de 8 puntas | Engranaje de latón con brillo. Impacto: reloj o remolino (relacionado con el aturdimiento) |
| `bullet` | Halcón | Trazo amarillo | Trazador con fogonazo grande en el cañón. Impacto: polvo y cráter pequeño |
| `holy` | Ulric | Estrella blanca de 4 puntas | Espada o lanza de luz dorada. Impacto: columna de luz y cruz |

**Especificación de los sprites:**
- WebP con transparencia, 256×256 px (los de impacto, 384×384 px).
- **Mismo contorno** que los personajes: oscuro, de 6–8 px en 256 px para que aguante la reducción.
- Proyectil **mirando a la derecha** (el código lo gira con `FX_TURNS`).
- Nombres: `assets/fx/<elemento>-destello.webp`, `-bola.webp`, `-impacto.webp`. Después, programación solo tiene que añadir la clave a `FX_OF` y a `FX_TURNS`.

**Estelas para todos los proyectiles (código):** guardar las últimas 4–6 posiciones del proyectil y dibujar círculos decrecientes con el color del elemento y opacidad baja. Así ningún disparo parece una bola suelta, tenga o no arte propio.

### 4.4 Muerte del enemigo y recompensa (Prioridad 6)

**Problema:** al morir aparece un aro de color con un brillo (`addFx('pop')`) y el maná sube en el contador sin que se vea de dónde llega.

**Propuesta:**
1. **Estallido:** 8–12 partículas del color del enemigo con velocidad radial, gravedad y desvanecimiento en 0,4 s, más una nube de humo blanca ilustrada (arte: `fx/puf.webp`).
2. **Orbe de maná:** de 1 a 3 gotas azules salen del enemigo y vuelan en curva (Bézier) hasta el contador de maná en 0,5 s. Al llegar, el contador hace un pequeño salto (`scale 1.15`) y suena un tintineo. Así la recompensa se ve.
3. **Jefe:** pausa de 80 ms (hit-stop), temblor fuerte, destello blanco a pantalla completa con una opacidad de 0,3 y una lluvia de monedas.
4. **Rendimiento:** usar un *pool* de partículas fijo (unas 200) y dejar de crear nuevas al llegar al límite.

### 4.5 Invocar y fusionar (Prioridad 9)

**Invocar** (hoy: aro de color, `board.js:197`):
- La tropa cae desde unos 0,6 casillas de altura, aplasta al tocar el suelo (`sx 1.25`, `sy 0.75`) y rebota.
- Polvo en los pies y un destello del color del elemento.
- Un sonido distinto según la rareza.

**Fusionar** (hoy: estallido dorado y el texto "Rango N", `board.js:213–215`):
- La tropa de origen **vuela** hasta la de destino en 0,15 s y encoge al llegar.
- La de destino se pone blanca, se estira y se asienta con el rebote de 4.1.
- Las estrellas de rango aparecen de una en una con un "pop" encadenado.
- Al subir de rango, el disco de color (1.3) cambia de color con un anillo que se expande.

**Mejorar tropa en partida:** hoy son anillos verdes en cada casilla. Se propone una flecha verde que sube sobre cada tropa afectada y que la carta del mazo de abajo dé un salto.

### 4.6 Otros detalles

- **Contador de maná:** cuando llega a un coste de invocar alcanzable, el botón Invocar da un destello.
- **Corazones:** al perder uno, el corazón se rompe con dos mitades que caen, y la pantalla tiembla y se tiñe de rojo en los bordes 0,2 s.
- **Velocidad x2:** el botón debería animarse (flechas que se mueven) mientras esté activo.
- **Accesibilidad:** respetar `prefers-reduced-motion` reduciendo los temblores y destellos a pantalla completa, y añadir un interruptor "Temblor de pantalla" en Opciones.

---

## 5. Tienda y apertura de cofres

### 5.1 Tarjetas de oferta (captura 2)

**Estado actual:** marco de madera tallada con remaches, interior de pizarra gris oscura, retrato redondo, nombre, "×10 cartas" y botón verde de precio. Tiene una pastilla de rareza arriba y una etiqueta "Nueva". Está bastante bien, pero **todas las ofertas se ven igual de valiosas**.

| Problema | Propuesta |
| --- | --- |
| El interior es el mismo gris para todas las rarezas | **Fondo por rareza** (arte: 5 fondos de 256×320 px): común gris azulado, rara azul, épica morada, mítica rosa o carmesí y legendaria dorada con rayos |
| No hay foco de luz sobre la tropa | **Rayos de luz girando** detrás del retrato en épica o superior (CSS `conic-gradient` animado o un sprite de rayos) |
| La rareza es una pastilla pequeña | **Cinta** que cruza la parte de arriba de la tarjeta, con el color de la rareza y un contorno |
| "×10 cartas" va en texto apagado | **Insignia** "×10" en la esquina inferior derecha del retrato, en `.t-num` grande, como en Clash Royale |
| El retrato es redondo y no coincide con las cartas del mazo | Mostrar la **misma carta** que en la colección (marco dorado, elemento y rareza), para que el jugador reconozca lo que compra |
| El botón de precio es verde plano | Receta 2.1. Si no hay dinero, en gris y con el precio en rojo |
| "Cambian en 12 h" pasa desapercibido | Reloj y cuenta atrás en una pastilla oscura con `.t-num` |
| Comprado | Tarjeta desaturada con un sello de "Comprado" inclinado |

### 5.2 Cofres en la tienda

**Estado actual:** cofres ilustrados de madera, plata y oro (`assets/chests/`), de calidad buena y con la misma firma que los personajes.

| Problema | Propuesta |
| --- | --- |
| Están quietos | **Reposo:** balanceo de ±2° y salto pequeño cada 3 s; destellos en el de oro |
| No hay luz detrás | Halo radial del color del cofre (marrón cálido, azul plata y dorado) |
| No se distingue el más valioso | Cinta de "Mejor valor" en el de oro y tarjeta un 10 % más alta |
| No se ve qué trae | Tres iconos pequeños bajo el nombre: oro, número de cartas y la rareza máxima posible |

### 5.3 Apertura del cofre

**Estado actual:** sale primero el oro, luego las cartas una a una, con un contador de las que quedan y un botón "Saltar". La secuencia está bien pensada. Falta **dramatismo**:

1. **Anticipación:** el cofre tiembla más cuanto mejor es lo que trae (2, 4 o 7 sacudidas), y la luz que sale por la rendija **anuncia la rareza máxima** con su color. Es el truco central del género.
2. **Apertura:** la tapa salta, hay un destello blanco y sale un chorro de partículas del color de la rareza.
3. **Carta:** aparece del revés y se gira (`rotateY` de 180° a 0°). Las épicas y superiores tardan más, tienen rayos detrás y un sonido propio. Las legendarias añaden un temblor de pantalla y un destello dorado.
4. **"Nueva":** si la tropa no se tenía, sale una cinta grande de "¡Nueva!" y la carta da un salto.
5. **Resumen:** las cartas en cuadrícula, cada una con su barra de progreso llenándose con animación.

---

## 6. Encargos para el equipo de arte

Lista cerrada para presupuestar. Todo en WebP con transparencia, contorno oscuro grueso (6–8 px en 256 px) y cel-shading de 2–3 tonos.

| # | Pieza | Medida | Unidades | Uso |
| --- | --- | --- | --- | --- |
| A1 | Losetas de piedra del tablero (normal, agrietada y con musgo) | 256×256 | 3 | 1.3 |
| A2 | Destello, proyectil e impacto de flecha, rayo, sombra, engranaje, bala y luz sagrada | 256 (impacto 384) | 18 | 4.3 |
| A3 | Nube de humo de muerte y gota de maná | 256 | 2 | 4.4 |
| A4 | Fondos de tarjeta por rareza | 256×320 | 5 | 5.1 |
| A5 | Rayos de luz giratorios | 512 | 1 | 5.1–5.3 |
| A6 | Botón Jugar sin triángulo (para escribir encima) | igual que el actual | 1 | 2.2 |
| A7 | Marco de hueco de cofre en piedra y hierro, con interior rebajado | igual que el actual | 1 | 2.3 |
| A8 | Banner de comandante en tela, una variante por comandante | igual que el actual | 3 | 1.6 |
| A9 | Placas de fase de campaña por zona, o el mapa (opción B) | 900×160 | 5–6 | 2.5 |
| A10 | Fondo del inicio con más capas | 1080×1920 | 1 | 1.5 |

## 7. Encargos para el equipo de programación

| # | Tarea | Archivos | Esfuerzo |
| --- | --- | --- | --- |
| P1 | Squash & stretch y retroceso con `u.recoil` | `art.js`, `battle.js`, `board.js` | S |
| P2 | Destello blanco, golpe de escala y retroceso del enemigo | `board.js`, `art.js` | S |
| P3 | Contorno por código en caché para los sprites del tablero | `art.js` | S |
| P4 | Escalar el tablero al ~92 % del ancho y recolocar la franja de oleada | `battle.js` (cálculo de `layout`) | M |
| P5 | Estilos `.t-hero`, `.t-label` y `.t-num`, y `drawOutlinedText` en el canvas | `style.css`, `battle.js` | S |
| P6 | Partículas con *pool*, orbe de maná y salto del contador | `board.js`, `battle.js`, `ui.js` | M |
| P7 | Estelas de proyectil y alta en `FX_OF` de los sprites A2 | `battle.js`, `art.js` | S |
| P8 | Animaciones de invocar, fusionar y mejorar | `board.js`, `art.js` | M |
| P9 | Botón Jugar: tamaño, texto encima, pulso y brillo | `ui.js`, `style.css` | S |
| P10 | Hueco vacío hundido; cofres que se balancean y rebotan | `style.css`, `ui.js` | S |
| P11 | Arreglar el solape de Aria, el contraste del texto de ayuda y la barra de progreso de carta | `style.css` | S |
| P12 | Receta `.btn3d` y limpieza de reglas repetidas en `style.css` | `style.css` | M |
| P13 | Tienda: fondos, cintas, insignia ×N y cuenta atrás | `ui.js` (`shopHtml`), `style.css` | M |
| P14 | Apertura de cofre: luz por rareza, giro de carta y "¡Nueva!" | `ui.js` (`showChest`) | M |
| P15 | Interruptor de temblor y `prefers-reduced-motion` | `ui.js`, `style.css` | S |

**Recordatorio para cada entrega:** al tocar `style.css` o cualquier `js/*.js`, hay que subir su `?v=` en `index.html` para que el navegador no sirva la versión vieja.
