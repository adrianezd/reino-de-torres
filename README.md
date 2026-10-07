# Reino de Torres

Tower defense de fusión para móvil y escritorio, gratis y sin anuncios. Invoca tropas al azar de tu mazo, fusiona las iguales para subirlas de rango y aguanta las oleadas que rodean tu tablero.

**Jugar:** https://adrianezd.github.io/reino-de-torres/

## Modos

- **🗺️ Campaña**: 15 fases con jefe final, estrellas según las vidas que conserves y tropas nuevas que se desbloquean.
- **⚔️ Duelo 1 contra 1**: tú y un rival (IA fácil, normal o difícil) recibís los mismos monstruos. Gana quien aguante más. Da trofeos.
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

- **Fusión dirigida**: dos tropas iguales del mismo rango se convierten en esa misma tropa con un rango más (no en una al azar).
- **Recolocar tropas**: arrástralas a otra casilla o intercámbialas.
- **Casillas especiales** que cambian cada partida: Altar (+daño), Fuente (maná) y Atalaya (+velocidad).
- **Afinidad elemental**: cada vecina del mismo elemento suma +12% de daño.
- **Comandantes** con habilidad que se carga: Aria (Ventisca), Merlo (Marea de maná) y Brann (Meteoro).
- **Eventos de oleada**: Eclipse, Lluvia de maná, Niebla, Horda y Calma.
- **Jefes** con habilidades: se dividen, congelan tropas, se blindan, invocan o queman rangos.

## Progreso

Oro, cartas con 10 niveles, cofres de madera, plata y oro, cofre gratis diario, mazo de 5 tropas, trofeos y estrellas. Todo se guarda en el navegador.

## Técnica

HTML, CSS y JavaScript sin dependencias ni build. Dibujo vectorial en canvas y sonido sintetizado. Funciona sin conexión tras la primera visita.

- `js/data.js`: tropas, enemigos, jefes, campaña, casillas, comandantes y eventos.
- `js/art.js`: dibujo de personajes y monstruos.
- `js/board.js`: tablero, combate e IA.
- `js/battle.js`: modos, oleadas, dibujo y controles.
- `js/meta.js`: progreso y cofres. `js/ui.js`: menús y bucle.

Juego original. Inspirado en el género de tower defense de fusión; no está afiliado a ningún juego comercial ni usa sus nombres, personajes ni gráficos.
