# Guía de tropas: daño, apoyo y niveles

Cifras sacadas de `UNITS` en `js/data.js` y de las fórmulas de `js/board.js`. Si cambias esos números, esta hoja se queda vieja.

**Cómo leer las tablas:** DPS es daño por segundo con la tropa a rango 1, carta a nivel 1 y sin mejoras de partida, contra un solo monstruo sin armadura. Todo lo demás (rango, niveles, afinidad, casillas) multiplica estas cifras por igual, así que el orden entre tropas se mantiene.

## 1. Las que más daño hacen a un solo objetivo

| # | Tropa | Rareza | DPS base | DPS en su mejor sitio | Qué necesita |
|---|---|---|---|---|---|
| 1 | **Ulric** | Legendaria | 63 | **251 contra jefes** | Nada: hace ×4 a los jefes y apunta al más fuerte |
| 2 | **Kaia** | Rara | 48 | **86** | Sin ninguna tropa al lado: +80% |
| 3 | **Midas** | Mítica | 45 | **67** | Críticos del 25% ×3 (ya contados); ignora armadura; +4 de maná por baja |
| 4 | **Halcón** | Épica | 42 | **67** | En el anillo de fuera: +60%; apunta al de más vida |
| 5 | **Cronos** | Épica | 31 | **61** | +25% por cada vecina distinta (hasta 4): +100% |
| 6 | **Seren** | Mítica | 52 | 52 + remates | Remata a cualquier monstruo no jefe por debajo del 25%: en la práctica, un tercio más |
| 7 | **Sombra** | Épica | 31 | **50** | Críticos del 30% ×3 (ya contados) |
| 8 | **Nívea** | Común | 22 | **48** | +60% por cada Nívea al lado (dos vecinas: +120%) |
| 9 | **Titán** | Legendaria | 40 | 40 | Ignora armadura y apunta al más fuerte: contra rocosos rinde como 66 |
| 10 | **Lyra** | Común | 38 | 38 | Nada: la más fiable sin preparar el tablero |

**Conclusiones:**
- Para jefes, nada se acerca a **Ulric**: cuatro veces más daño que cualquier otra a un jefe.
- **Kaia, Halcón, Cronos y Nívea** dependen de dónde las pongas. Bien colocadas suben a lo más alto; mal colocadas, a media tabla.
- **Midas y Titán** son las únicas que atraviesan la armadura (ogro 25%, rocoso 40%). En oleadas tardías llenas de rocosos, Midas es la mejor de daño.
- **Lyra** es la común más fuerte sin preparación: buena para mazos de inicio.

## 2. Las que mejor limpian grupos (área y cadena)

| Tropa | Rareza | Cómo reparte | DPS total contra varios |
|---|---|---|---|
| **Aurora** | Legendaria | Rayo que salta a 4 monstruos (cada salto pega un 25% menos); aturde el 15% | 54 repartido; un salto más cada 2 rangos |
| **Volta** | Rara | Rayo que salta a 3 | 37 repartido; un salto más cada 2 rangos |
| **Ígnea** | Legendaria | Explosión (radio 0,7) + quemadura que se acumula | 36 al blanco + 60% a cada vecino + quemadura |
| **Bóreas** | Mítica | Explosión (radio 0,65) que frena hasta el 60% y congela el 12% | 29 al blanco + 60% a cada vecino |
| **Rocco** | Rara | Explosión grande (radio 0,8) | 22 al blanco + 60% a cada vecino |
| **Brasa** | Común | Explosión (radio 0,55) | 21 al blanco + 60% a cada vecino |
| **Mirra** | Rara | Nube de veneno que se acumula | Ver abajo: crece cuanto más dura el combate |
| **Garra** | Mítica | Lobos que corren el camino al revés, 3 mordiscos de 80 | Hasta 67 si hay 3 monstruos en fila; 22 contra uno solo |

El radio de las explosiones crece 0,06 casillas por rango.

**Veneno y quemadura se acumulan.** Cada golpe de Mirra suma 7,7 de daño por segundo al veneno del monstruo (un 60% de eso a los de alrededor) y el veneno no se resetea mientras le sigan pegando antes de 4 s. Con un monstruo recibiendo golpes 10 segundos, Mirra a rango 1 llega a unos 75 por segundo solo de veneno. Por eso Mirra es muy buena contra jefes y tanques lentos y floja contra monstruos rápidos que mueren enseguida. Ígnea hace lo mismo con 7 por golpe. La armadura reduce el veneno solo a la mitad de lo normal.

## 3. Las mejores de apoyo

| # | Tropa | Qué da | Fórmula | Cuándo brilla |
|---|---|---|---|---|
| 1 | **Melodía** | Velocidad de ataque a sus vecinas | +20% × rango a cada vecina que ataque (hasta 4) | Rodeada de tropas de daño. A rango 3 da +60% a cada una: es como tener casi 2,5 tropas más |
| 2 | **Doblón** | Maná | 10 × rango cada 6 s (rango 3: 5 por segundo) | Desde el principio; acelera todas las invocaciones |
| 3 | **Eco** | Comodín de fusión | Se fusiona con cualquiera de su rango; 10% de subir dos rangos | Para no atascarte sin parejas y saltar rangos |
| 4 | **Oria** | Intereses | 3% del maná guardado cada 5 s, con tope de 12 × rango | Si ahorras mucho. Llega al tope con 400 de maná guardado a rango 1 |
| 5 | **Nívea / Bóreas** | Frenar | Nívea: hasta 50%. Bóreas: hasta 60% y en área | Delante de tropas lentas como Halcón o Rocco |
| 6 | **Cronos / Aurora** | Aturdir | 26% de 1,2 s / 15% de 1 s | Contra jefes que congelan o queman tus tropas |

**Ojo con Melodía:** solo acelera a tropas que atacan. No acelera a Doblón, Oria ni Eco, así que no la pongas junto a ellas.

Comparación de maná a rango 1: Doblón da 1,7 por segundo siempre; Oria da hasta 2,4 por segundo pero solo con 400 guardados; una tropa cualquiera sobre la **Fuente** da 1 por segundo × su rango.

## 4. Cuándo influyen los niveles

Hay tres cosas que suben la fuerza de una tropa. Se multiplican entre sí.

| Qué | Cuánto da | Dónde se consigue |
|---|---|---|
| **Rango** (fusionar) | ×2,1, ×4,4, ×9, ×18,5, ×38, ×78 de daño, y +6% de velocidad por rango | En la partida, fusionando dos iguales |
| **Mejora de partida** (tocar la carta de abajo) | +22% de daño por nivel, hasta ×1,88 en el nivel 5 | En la partida, por 100, 200, 400 y 700 de maná |
| **Nivel de carta** (permanente) | +8% por nivel, hasta ×1,72 en el nivel 10 | Fuera de la partida, con cartas y oro |

**Lo que más importa es el rango, con diferencia.** Subir un solo rango (×2,2) da más que llevar una carta del nivel 1 al 10 (×1,72). Una tropa a rango 7 hace unas 106 veces el daño de rango 1.

**El nivel de carta pesa más de lo que parece en estos casos:**
- **En el 1 contra 1:** el rival fácil lleva cartas 2 niveles por debajo de las tuyas y el difícil 2 por encima, es decir, un 16% menos o más de fuerza en todo.
- **Al comparar rarezas:** una Lyra común al nivel 10 hace 66 por segundo y un Ulric legendario al nivel 1 hace 63 (fuera de jefes). Subir comunes no es tirar el oro.
- **En el torneo:** los niveles se igualan por rareza (común 8, rara 6, épica 4, mítica 2, legendaria 1). Ahí una común da ×1,56 y una legendaria ×1, así que en el torneo las comunes y raras bien colocadas rinden mucho más de lo habitual.
- **En las de apoyo:** el nivel de carta también sube el maná de Doblón y Oria, el empujón de Melodía y la probabilidad de que Eco resuene.

**La mejora de partida no rinde igual en todas:**
- En las de daño, +22% por nivel.
- En Doblón y Oria, +25% de maná por nivel.
- En Melodía, solo +10% por nivel: mejor gastar el maná en invocar o en mejorar a sus vecinas.
- En Eco, +50% de probabilidad de resonar por nivel: con la mejora al 5 y la carta al 10, resuena la mitad de las veces.

## 5. Otros multiplicadores del tablero

| Qué | Efecto |
|---|---|
| Afinidad | +12% de daño por cada vecina del mismo elemento (hasta +48%) |
| Altar | +35% de daño a la tropa de encima |
| Atalaya | +30% de velocidad a la tropa de encima |
| Fuente | 1 de maná por segundo × rango de la tropa de encima |

Las mejores combinaciones salen de juntar las dos cosas: por ejemplo, Cronos en el centro rodeado de cuatro tropas distintas del mismo elemento (+100% por su rasgo y +48% por afinidad), o Halcón sobre el Altar cuando sale en el borde.

## 6. Mazos que funcionan

- **Contra jefes:** Ulric, Mirra, Melodía, Doblón y Cronos. Melodía en el centro con Ulric, Mirra y Cronos alrededor.
- **Sin legendarias:** Kaia, Halcón, Sombra, Melodía y Doblón. Kaia sola en una esquina, Halcón en el borde y Melodía junto a Sombra.
- **Hielo:** Nívea, Bóreas, Ulric, Melodía y Doblón. Las Nívea en parejas para su +60% y las tres de hielo juntas por la afinidad.
- **Para rocosos y ogros (armadura):** Midas, Titán, Mirra, Melodía y Doblón.
