'use strict';
/* =========================================================
   VERSIÓN Y NOVEDADES
   En CADA subida: sube APP_VERSION y añade una entrada ARRIBA de
   APP_PATCH_NOTES. summary: titular corto (sale en «Versiones
   anteriores»); items: lo que nota quien juega, sin tecnicismos.
   La ventana sale sola al entrar con una versión nueva (meta.lastSeenVersion)
   y también desde Opciones.
   ========================================================= */
var APP_VERSION = '1.33.0';
var APP_PATCH_NOTES = [
  {
    version: '1.33.0',
    summary: 'Tropas con animación de ataque',
    items: [
      'Garra, Hilda, Tilo, Valka y Aurora encadenan varias poses al atacar y cambian de golpe en cada disparo.',
      'Toca cualquier tropa del tablero y hará su ataque.',
      'En el vídeo de la ficha de una tropa, tócala para verla atacar.'
    ]
  },
  {
    version: '1.32.0',
    summary: 'Oleadas sorteadas y Aurora nueva',
    items: [
      'Cada oleada tiene un monstruo protagonista elegido al azar, y nunca repite el de la anterior.',
      'Antes de cada oleada, una ruleta sobre tu tablero sortea qué monstruo viene. La partida no se para y arriba ves quién te toca.',
      'Los monstruos tienen más vida, sobre todo en las oleadas altas: las partidas largas se acaban antes.',
      'Aurora estrena dibujo: retrato, poses, un rayo propio que salta entre los enemigos y su propio remolino al aturdir.'
    ]
  },
  {
    version: '1.31.7',
    summary: 'Daño de los monstruos a la vista',
    items: [
      'Encima de cada monstruo ya no sale la vida que le queda, sino el daño que le has hecho.',
      'El número cambia de color según lo tocado que esté: amarillo, naranja y rojo cuando está a punto de caer.'
    ]
  },
  {
    version: '1.31.6',
    summary: 'Co-op arreglado y torneo con todos los tableros',
    items: [
      'Co-op: las casillas especiales de tu aliado ya no salen repetidas en tu tablero ni tapan tus tropas.',
      'Co-op: la cuadrícula de tu aliado lleva las mismas losas que el tablero y el dibujo se funde con el fondo por arriba y por abajo.',
      'En el torneo puedes elegir cualquiera de los siete tableros.',
      'Los empujones hacia atrás hacen retroceder lo mismo en todos los tableros, sea el camino largo o corto.',
      'La flecha de mejorar ya no lleva un 2 dentro.'
    ]
  },
  {
    version: '1.31.5',
    summary: 'Tablero mágico nuevo y hielo retocado',
    items: [
      'Las fases de cripta estrenan tablero mágico: losas de cielo estrellado, camino entre líneas doradas y portales de estrella.',
      'En el tablero de hielo, las casillas especiales encajan dentro de su losa y se sigue viendo el hielo alrededor.'
    ]
  },
  {
    version: '1.31.4',
    summary: 'Tablero de lava nuevo',
    items: [
      'El Río de Lava y las fases de volcán estrenan tablero: losas con vetas de magma, camino de adoquines por fuera y dos arcos de runas como entrada y salida.'
    ]
  },
  {
    version: '1.31.3',
    summary: 'Comandantes bien recortados y Pantano con portales',
    items: [
      'Los siete comandantes, recortados de nuevo: Aria ya sale entera, Merlo sin manchas blancas, Brann centrado y Sol y Torvald sin huecos.',
      'En el Pantano Tóxico se ven el portal de entrada y el de salida, los monstruos son algo más pequeños y las casillas especiales encajan en su losa.',
      'En el móvil, la barra de cartas de cada tropa ya no queda tapada por su nombre.'
    ]
  },
  {
    version: '1.31.2',
    summary: 'Brann y Merlo retocados',
    items: [
      'Brann y Merlo estrenan retrato y figura, con meteoros, cráter y marea de maná nuevos.'
    ]
  },
  {
    version: '1.31.1',
    summary: 'Comandantes a su tamaño y botón de mejorar nuevo',
    items: [
      'Los comandantes ya caben enteros en el inicio y en Mazo, sin salirse ni cortarse.',
      'El botón de Mejorar de tropas y comandantes estrena dibujo.'
    ]
  },
  {
    version: '1.31.0',
    summary: 'Comandantes redibujados y ficha de tropa nueva',
    items: [
      'Los siete comandantes estrenan retrato, cuerpo y efectos: la ventisca de Aria, la marea de Merlo, los meteoros de Brann, la maldición de Nyx, el escudo de Sol, el ensamblaje de Morgana y la forja de Torvald.',
      'Ficha de tropa nueva: cabecera con runas, cinta de piedra, pestañas de metal, panel de stats con sus iconos y panel de nivel con escudo.',
      'Al deslizar de lado entre menús, la pantalla ya no sube ni baja.'
    ]
  },
  {
    version: '1.30.0',
    summary: 'Fichas de tropa renovadas y tableros más finos',
    items: [
      'Stats nuevas en la ficha de cada tropa: cada valor con su barra comparada con las demás y, en verde, cuánto sube al mejorarla.',
      'Los vídeos de las tropas se ven en el tablero nuevo del prado, con sus losetas y los efectos de ahora.',
      'En los tableros con las casillas dibujadas, las tropas pisan el centro y las casillas especiales cubren la casilla entera.',
      'Ya no sale el iconito de la casilla especial encima de la tropa.',
      'Pantano: sin portales encima de la fila de abajo.'
    ]
  },
  {
    version: '1.29.0',
    summary: 'Cuatro tableros nuevos',
    items: [
      'Tableros nuevos: Estelar, Estelar II, Roca y Pantano, con sus casillas dibujadas.',
      'El Pantano Tóxico y las Ruinas de Piedra del 1 contra 1 se juegan ya en sus tableros nuevos.',
      'La cripta de la campaña usa los tableros estelares.'
    ]
  },
  {
    version: '1.28.0',
    summary: 'Muertes según el golpe y cartas nuevas equilibradas',
    items: [
      'Los monstruos mueren de cuatro formas según el golpe que los remata: estallido, veneno, fuego o humo y piedras.',
      'Las casillas especiales encajan en la losa de cada tablero sin pisar las de al lado. El Semillero deja de salir.',
      'Hilda: +22% de daño a las vecinas por rango (antes 15%).',
      'Tilo: el ácido hace recibir un 12% más de daño por rango (antes 4%).',
      'Elian: 18% de crítico por rango, como mucho 75% (antes 7%).',
      'Marea pega más fuerte y algo más rápido.',
      'Pyra estalla con 4 ascuas y quita un 15% de la vida (5% a los jefes).',
      'Valka pega más de base; da un 6% por cada tropa en el campo (antes 7%).'
    ]
  },
  {
    version: '1.27.0',
    summary: 'Garra y sus lobos nuevos, torneo a tu gusto y tropas del mismo tamaño',
    items: [
      'Garra estrena dibujo, sus lobos son nuevos y al soltar cada uno aparece un espíritu de lobo.',
      'Torneo: elige la arena (con su tablero de muestra), si el rival es fácil, normal o difícil, y el modificador, con las flechas.',
      'Todas las tropas se ven del mismo tamaño en la partida. Valka, Garra y Elian ya no salen más pequeñas.',
      'Al morir, los monstruos se deshacen en un destello de luz en vez de la nube de antes.',
      'Las cartas de Hilda, Tilo y Elian ya dicen bien cuánto suben al mejorarlas.'
    ]
  },
  {
    version: '1.26.0',
    summary: 'Hilda, Tilo y Elian con dibujo, Valka nueva y tienda más grande',
    items: [
      'Hilda, Tilo y Elian ya tienen su dibujo, y su efecto sale hacia las tropas que potencian.',
      'Valka estrena retrato, poses y lanza.',
      'La tienda trae seis ofertas al día, en dos filas de tres.',
      'Mantén pulsada una carta de tu colección y arrástrala sobre una del mazo para cambiarlas. También sirve para ordenar el mazo.',
      'De momento todas las partidas se juegan en los tableros nuevos de prado, hielo y lava.'
    ]
  },
  {
    version: '1.25.0',
    summary: 'Tres tropas raras de apoyo y casillas especiales ilustradas',
    items: [
      'Hilda (rara, metal): no ataca; afila las armas de las tropas de al lado y hacen más daño.',
      'Tilo (rara, naturaleza): no ataca; las tropas de al lado golpean con ácido, que quita armadura y hace que el monstruo reciba más daño.',
      'Elian (rara, arcano): no ataca; su luz da golpe crítico doble a las tropas de al lado.',
      'Las casillas especiales estrenan dibujo: Altar, Fuente, Atalaya, Vórtice y Diana ocupan toda la losa.'
    ]
  },
  {
    version: '1.24.0',
    summary: 'Tres casillas especiales nuevas y más maná por baja',
    items: [
      'Vórtice: si fusionas dos tropas encima, la nueva sube un rango más.',
      'Diana: la tropa que esté encima tiene un 20% de golpe crítico doble.',
      'Semillero: la tropa que esté encima hace daño en zona, o más zona si ya lo hacía.',
      'Cada tablero trae tres casillas especiales al azar entre las seis.',
      'Los monstruos dan un 25% más de maná al morir, en todos los modos.'
    ]
  },
  {
    version: '1.23.0',
    summary: 'Cuatro tropas nuevas, tableros nuevos y monstruos con escudo',
    items: [
      'Marea (común, hielo): su ola empuja a los monstruos hacia atrás por el camino.',
      'Frida (rara, naturaleza): sus zarzas hacen que el monstruo reciba más daño de todas tus tropas durante 3 segundos.',
      'Pyra (mítica, fuego, solo en cofre): cada golpe deja una ascua y con 5 el monstruo estalla y pierde parte de su vida máxima.',
      'Valka (legendaria, metal, solo en cofre): cuantas más tropas tengas en el campo, más pega, y con muchas sus lanzas alcanzan a varios enemigos.',
      'Ígnea estrena dibujo.',
      'Tres tableros nuevos de prado, hielo y lava, con sus losetas, y portales de entrada y salida en el prado.',
      'Nuevo Ogro escudado: lleva un escudo de vida dorado que hay que romper antes de hacerle daño.',
      'Los monstruos con armadura llevan su escudo junto a la vida, y Titán y Midas se la rompen para siempre.',
      'Efectos nuevos al invocar, al fusionar, en los rayos, el veneno, el fuego, el hielo, el aturdido, el crítico, el maná de Doblón y las tropas que acelera Melodía.'
    ]
  },
  {
    version: '1.22.0',
    summary: 'Once tropas redibujadas e interfaz nueva',
    items: [
      'Lyra, Kaia, Rocco, Cronos, Halcón, Sombra, Eco, Oria, Seren, Titán y Garra estrenan dibujo: retrato, figura en el tablero y pose de ataque.',
      'Cada una dispara su propio proyectil: flechas de Lyra y Kaia, bala de Halcón, estrella de Seren, tajo de Sombra, roca de Titán, engranaje de Cronos y bomba de Rocco.',
      'Eco, Oria y Garra también tienen pose de ataque, Garra suelta lobos nuevos y Eco y Oria tienen efectos nuevos.',
      'Cofres nuevos, y todos se ven abriéndose antes de dar el premio.',
      'Fondos del castillo en cada pantalla, barra de recursos y barra de pestañas nuevas, avisos y consejos en pergamino y la cinta roja de la pausa.',
      'Las cartas que aún no tienes salen en su carta morada y el botón Nuevo reto lleva su espada.'
    ]
  },
  {
    version: '1.21.2',
    summary: 'Marcos por rareza y mazo visible en la colección',
    items: [
      'Todas las cartas de una rareza llevan el mismo marco: las raras como Rocco, las épicas como Sombra, las míticas en rojo y las legendarias como Ulric.',
      'Las cartas de tu mazo también salen en la colección, con la marca En el mazo, ordenes como ordenes.'
    ]
  },
  {
    version: '1.21.1',
    summary: 'Ruleta con tirada gratis en la tienda',
    items: [
      'Nueva ruleta arriba de la tienda: una tirada gratis cada día con oro, gemas, cofres, cartas y cartas de comandante.',
      'Cuando ya la has usado, puedes volver a girar por 10 gemas.',
      'La pestaña Tienda lleva un punto rojo mientras tengas la tirada gratis sin usar.'
    ]
  },
  {
    version: '1.21.0',
    summary: 'Temporada, racha de días y evento de la semana',
    items: [
      'Temporada del mes: 30 niveles de premios que subes jugando cualquier modo, con marcos y títulos que solo salen ese mes. Está arriba en el inicio.',
      'Racha de días: entra cada día para cobrar su premio; el séptimo, cofre de oro.',
      'Evento de la semana: un elemento pega un 25% más en todos los modos y, si ganas 5 partidas, cofre de oro. Los fines de semana, oro doble.',
      'Reto de la semana en la pestaña Retos: el mismo para todo el mundo, para comparar con tus amigos.',
      'Marcos y títulos para tu perfil.',
      'En el inicio verás siempre lo siguiente que tienes a mano, y al terminar una partida, lo que se te quedó cerca.',
      'Los modos se abren con la campaña: 1 contra 1 en la fase 3, Co-op en la 5, Torneo en la 8 y Roguelike en la 10. Si ya los jugabas, siguen abiertos.',
      'Ascensión en el Roguelike: al superar las 30 oleadas se abre un nivel más difícil, hasta 10.',
      'Las cartas de una tropa al nivel máximo se cambian por oro.',
      'Con el juego instalado, el icono enseña cuántas cosas tienes por cobrar.'
    ]
  },
  {
    version: '1.20.0',
    summary: 'Retos con amigos, perfil, logros, zona 4 y música',
    items: [
      'Nueva pestaña Retos: juega un reto y manda el enlace. Tus amigos se enfrentan a los mismos monstruos con tu mazo y gana quien llegue más lejos.',
      'Perfil con tus cifras y récords, 23 logros con premio y un bestiario que se llena con los monstruos que encuentras. Está en el inicio, donde antes estaban los Códigos.',
      'Zona 4 de la campaña: Tierras del Eclipse, diez fases nuevas hasta el Trono del Rey Dragón.',
      'Tres mazos guardados, cada uno con su comandante, en la pestaña Mazo.',
      'Música para el menú, para cada tipo de tablero y para los jefes. Se quita aparte del sonido.',
      'Los rivales tienen su forma de jugar: al ataque, al ahorro, a fusionar o recolocando tropas, y llevan tropas de su elemento favorito.',
      'Cofre de oro con garantía: como mucho cada 8 cofres sale una mítica.',
      'Los trofeos del 1 contra 1 dependen de tu arena: el rival fácil da menos en las arenas altas y perder quita algo más.',
      'Opciones nuevas: vibración, números en partida y ahorro de batería. Los Códigos ahora están aquí.',
      'Copia de seguridad en Opciones para no perder la partida y pasarla a otro móvil, y botón para instalar el juego.',
      'Decorado animado en los tableros: hojas, nieve, brasas, burbujas y polvo, y transiciones suaves entre pantallas.',
      'El juego se guarda para jugar sin conexión aunque falle alguna imagen, y ya no se cuelga al abrir cartas de comandante en un cofre.'
    ]
  },
  {
    version: '1.19.3',
    summary: 'Menú de tropas renovado',
    items: [
      'Las cartas de tropa llevan el fondo ilustrado de su rareza, el nivel en un escudo dorado y el nombre en una placa.',
      'Tu mazo va en su bandeja arriba y ya no se repite en la colección.',
      'Filtros en una sola fila de chapas, y las tropas que aún no tienes se ven en sombra, sin texto.',
      'Los niveles de los comandantes ya no parpadean y el menú no se repinta al cargar las imágenes.'
    ]
  },
  {
    version: '1.19.2',
    summary: 'Comandantes bien encajados en su ficha',
    items: [
      'En la ficha de cada comandante la figura sale entera y ya no tapa el nombre.',
      'El nivel de cada retrato va en un escudo dorado; verde si puedes mejorarlo.'
    ]
  },
  {
    version: '1.19.1',
    summary: 'Comandante y mazo en una placa, y ficha de comandante nueva',
    items: [
      'En el inicio, tu comandante y tus cinco tropas comparten la misma placa de madera.',
      'En la pestaña Comandante eliges en una fila de retratos y ves al momento su ficha: figura, habilidad, nivel, mejora y su árbol justo debajo.',
      'También puedes ver la ficha y el árbol de los comandantes que aún no tienes.'
    ]
  },
  {
    version: '1.19.0',
    summary: 'Interfaz más limpia',
    items: [
      'Fuera los párrafos de explicación de las pantallas: cada una tiene un botón ? junto al título con lo que necesitas saber.',
      'Cómo jugar, ahora en fichas con icono, título y una frase.',
      'Roguelike con portada, sus datos en fichas y los premios de cada tramo.',
      'Final de partida más claro: logros, premio en chapas y oleada, bajas y daño en fichas.',
      'Opciones con interruptor de sonido, misiones con el tiempo que queda en una chapa y huecos de cofre vacíos sin texto.',
      'Co-op y Roguelike llevan el nombre con la misma letra que el resto de modos.'
    ]
  },
  {
    version: '1.18.0',
    summary: 'Co-op con un solo camino',
    items: [
      'En Co-op hay un solo camino, el de tu tablero, y los monstruos pasan por él desde el principio.',
      'Las tropas de tu aliado están encima de tu tablero y disparan a los mismos monstruos que las tuyas.',
      'La Maldición de Nyx y el Escudo divino de Sol sirven para los dos, los eche quien los eche.'
    ]
  },
  {
    version: '1.17.5',
    summary: 'Losetas enteras y tropas encima de ellas',
    items: [
      'La última loseta de cada fila ya no sale cortada en el prado, la lava, el veneno y el hielo.',
      'Las tropas pisan la loseta en vez de quedarse en su borde de abajo, también en el vídeo de cada tropa.'
    ]
  },
  {
    version: '1.17.4',
    summary: 'Casillas especiales bien encajadas también en lava',
    items: [
      'En los tableros con losetas altas, como el de lava, el borde del altar, la fuente y la atalaya ya no se mete en la fila de abajo.'
    ]
  },
  {
    version: '1.17.3',
    summary: 'Casillas especiales encajadas en su loseta',
    items: [
      'El altar, la fuente y la atalaya se ven justo encima de su loseta: el borde de color la rodea entera y el emblema va en el centro.',
      'En el tablero de roca, los carteles de entrada y salida ya no tapan las casillas.'
    ]
  },
  {
    version: '1.17.2',
    summary: 'Losetas iguales en todo el tablero',
    items: [
      'Las 15 casillas del tablero llevan la misma loseta, que cambia de una partida a otra.',
      'En Co-op te puede tocar cualquiera de los cinco tableros, aunque aún no hayas llegado a su arena.'
    ]
  },
  {
    version: '1.17.1',
    summary: 'Garra con aro verde',
    items: [
      'El retrato de Garra lleva un aro verde alrededor, como el dorado de Midas.'
    ]
  },
  {
    version: '1.17.0',
    summary: 'Losetas nuevas, carteles en el camino y comandantes equilibrados',
    items: [
      'Cada tablero tiene sus propias losetas: musgo en el prado, lava, hielo, veneno y roca, distintas en cada casilla.',
      'Carteles de Entrada y Salida de monstruos junto al camino de cada tablero.',
      'Las cartas de la partida enseñan su elemento arriba a la derecha.',
      'Oria, Garra y Eco estrenan dibujos, y el lobo de Garra también.',
      'Todas las épicas llevan el mismo marco morado con rombos.',
      'El vídeo de cada tropa se ve en un trozo del tablero de verdad, con la tropa en su loseta.',
      'Las fichas del cofre de comandante y del legendario ya no dicen quién puede tocar.',
      'Merlo da 150 de maná, se carga en 28 s y da más en las oleadas avanzadas.',
      'Brann tira más meteoros al subir de nivel: 9 al nivel 10 y 11 al 25.',
      'Nyx: la Maldición dura 8 s y se carga en 28 s.',
      'Sol: el Escudo dura 6 s, se carga en 30 s y además frena a los monstruos un 35%.',
      'Torvald se carga en 90 s en vez de 110.',
      'Aria: la Ventisca crece menos con el nivel y Escarcha cortante ya no barre a todos de un golpe.'
    ]
  },
  {
    version: '1.16.3',
    summary: 'Misiones con Reclamar y fichas de cofre más limpias',
    items: [
      'En las misiones diarias, el botón ahora dice Reclamar.',
      'La ficha del cofre de comandante y la del legendario enseñan solo quién puede tocar, con su retrato y su nivel.'
    ]
  },
  {
    version: '1.16.2',
    summary: 'Morgana se carga antes y Brann bien colocado',
    items: [
      'Morgana se carga en 30 segundos en vez de 45.',
      'Brann ya no sale demasiado arriba en su tarjeta.',
      'Morgana y Torvald ya no llevan la etiqueta Héroe.',
      'Los avisos largos, como el de un talento al elegirlo, se leen enteros en varias líneas y duran algo más.'
    ]
  },
  {
    version: '1.16.1',
    summary: 'Tablero del rival más grande y talentos más claros',
    items: [
      'En el 1 contra 1 y en Co-op, el tablero de arriba aprovecha todo el hueco: sale más grande y con su marco a lo ancho de la pantalla, en todos los mapas.',
      'En los árboles de talentos y de habilidades ves lo que hace cada rama aunque aún no esté abierta. Toca una casilla cerrada para leerla.',
      'Al elegir un talento, la ficha se queda donde estaba.',
      'Los cofres que abres desde tus huecos ya no se ven borrosos al crecer.'
    ]
  },
  {
    version: '1.16.0',
    summary: 'Efectos de los comandantes nuevos, árboles ilustrados y repaso visual',
    items: [
      'Nyx deja un anillo de runas a los pies de cada monstruo mientras dura su Maldición; Sol tapa la salida con una esfera de luz; Morgana une las dos tropas con engranajes y a la que forja Torvald le suben unas flechas doradas.',
      'Los talentos de las tropas y las habilidades de los comandantes tienen ahora un árbol ilustrado, con un icono en cada casilla y el nivel en cada rombo.',
      'Camino de trofeos: los premios de cartas ya no salen estirados.',
      'Repaso visual: los títulos largos ya no se cortan, los atajos del inicio no quedan detrás del comandante, la ficha del cofre legendario enseña cada legendaria, la elección de ventajas no se transparenta y la oleada cabe en la barra de arriba.'
    ]
  },
  {
    version: '1.15.2',
    summary: 'Tarjetas de comandante iguales y casillas que no pisan el camino',
    items: [
      'Los siete comandantes usan la misma tarjeta de madera, sin los medallones de abajo.',
      'En los tableros de hielo, roca y veneno las casillas son un poco más pequeñas y ya no pisan el camino de los monstruos.'
    ]
  },
  {
    version: '1.15.1',
    summary: 'Fuera el modificador Comandantes con habilidades',
    items: [
      'La ruleta del 1 contra 1 ya no saca Comandantes con habilidades: ahora cada comandante tiene su propio árbol de habilidades permanente, en la pestaña Comandante.'
    ]
  },
  {
    version: '1.15.0',
    summary: 'Árbol de habilidades de comandante, Co-op con camino compartido y comandantes nuevos ilustrados',
    items: [
      'Cada comandante tiene su árbol de habilidades: en el nivel 5 eliges 1 de 2 y en el nivel 25, 2 de 3. Están en la pestaña Comandante y puedes cambiarlas cuando quieras.',
      'Los comandantes suben ahora hasta el nivel 25. Del 11 en adelante cada nivel da algo menos de fuerza y pide más cartas.',
      'Nyx, Sol, Morgana y Torvald ya tienen su ilustración. Empiezan bloqueados: se consiguen con sus cartas en el cofre de comandante y en el de oro.',
      'Co-op (antes 2 contra la máquina): ahora es un camino compartido. Los monstruos pasan primero por el tablero de tu aliado y lo que se le escapa llega al tuyo. El maná de cada baja es para los dos.',
      'El Roguelike tiene su carta en la fila de modos, en rojo.',
      'El destello y el portal de los cofres ya no se cortan en su ficha ni en el resumen.',
      'Al mejorar una carta o comprar en la tienda, la pantalla se queda donde estaba en vez de volver arriba.'
    ]
  },
  {
    version: '1.14.1',
    summary: 'Cofre legendario en la tienda',
    items: [
      'Nuevo cofre legendario en la tienda, por 500 gemas: trae una sola carta, siempre legendaria y al azar.',
      'Al abrirlo, el cofre se entreabre con su brillo azul y después suelta un remolino.'
    ]
  },
  {
    version: '1.14.0',
    summary: 'Modo roguelike, héroes, talentos, torneos nuevos y repeticiones',
    items: [
      'Modo roguelike: 30 oleadas tú solo y, cada 30 segundos, eliges una ventaja de tres que se acumula hasta el final. La ruleta elige el jefe final. Está debajo de las cartas de modo.',
      'Dos comandantes nuevos, Nyx (Maldición: los monstruos reciben más daño) y Sol (Escudo divino: un rato sin perder vidas), y dos héroes que usan su habilidad sobre el tablero: Morgana fusiona dos tropas cualesquiera del mismo rango y Torvald sube un rango a la que elijas. Por ahora llevan un dibujo provisional.',
      'Talentos: Lyra, Brasa y Nívea tienen un árbol de tres pisos que se abre con los niveles 3, 6 y 9 de su carta. En cada piso eliges una de dos ramas, en la pestaña Talentos de su ficha.',
      'Combos de fusión: dos fusiones en menos de 2 segundos dan maná extra, y más si sigues la racha.',
      'Reliquias en la ruleta del 1 contra 1 y en el roguelike: más daño para un elemento, críticos para todas las tropas o una vida por cada jefe. Nuevo modificador Invocación dirigida: mantén pulsada una carta para invocar esa tropa por el doble de maná.',
      'Torneo con tres formas de jugar: con tu mazo, con un mazo prestado o con cartas al azar.',
      'Emojis rápidos en el duelo, y el rival a veces contesta.',
      'Repetición: al terminar una partida puedes ver sus últimos 30 segundos.',
      'Los tableros de hielo, roca y veneno tienen las casillas más grandes, así las tropas se ven mejor.',
      'El cofre de comandante trae 10 cartas, todas de un mismo comandante. El cofre de oro reparte sus cartas entre menos tropas y la mitad de las veces trae además 4 cartas de comandante, que salen las primeras.',
      'Deslizar entre pestañas ya no da un tirón doble.'
    ]
  },
  {
    version: '1.13.0',
    summary: 'Ruleta de modificadores en el 1 contra 1 y deslizar entre pestañas',
    items: [
      'Antes de cada 1 contra 1, una ruleta cruza el mapa y elige un modificador para los dos y el jefe final de la partida, que es el que sale en todas las oleadas de jefe.',
      'Hay 16 modificadores: Doble de maná, Comandantes con habilidades, Mejoras a mitad, Veteranos, Carga rápida, Muerte súbita, Gigantes, Enjambre, Estampida, Fusión potente, Tierra sagrada, Precio fijo, Noche de jefes, Caos, Lazos elementales y Botín de guerra.',
      'Con Comandantes con habilidades, en la oleada 5 eliges 1 habilidad de 2 y en la 15, 2 de 3. El rival también elige las suyas.',
      'El modificador y el jefe se ven junto a la oleada; tócalos para leer qué hacen y qué habilidades llevas.',
      'Ahora puedes deslizar a los lados para pasar entre Tienda, Mazo y Jugar.'
    ]
  },
  {
    version: '1.12.1',
    summary: 'Eco, Oria y Garra estrenan sus ilustraciones',
    items: [
      'Las tres cartas nuevas ya tienen su retrato y su figura en el tablero.',
      'Garra suelta dos lobos distintos y tiene un aura de raíces con runas en su casilla.',
      'Al fusionar con Eco aparece su vórtice y, si resuena, su doble fantasma.',
      'Oria suelta una lluvia de monedas cada vez que cobra intereses, con un engranaje de gema verde en su casilla.'
    ]
  },
  {
    version: '1.12.0',
    summary: 'Tres cartas nuevas: Eco, Oria y Garra',
    items: [
      'Eco, la Imitadora (épica, arcano): no ataca, pero se fusiona con cualquier tropa de su mismo rango y se convierte en ella. A veces resuena y la tropa sube dos rangos de golpe.',
      'Oria, la Banquera (épica, metal): no ataca. Cada 5 segundos te da un 3% del maná que tengas guardado, con un tope. Cuanto más ahorras, más gana.',
      'Garra, Domadora de Lobos (mítica, naturaleza): suelta lobos que recorren el camino al revés y muerden a los monstruos que se cruzan. Con más rango, más mordiscos. Solo sale en el cofre de oro.',
      'Por ahora llevan un dibujo provisional; su ilustración llega pronto.'
    ]
  },
  {
    version: '1.11.0',
    summary: 'Misiones diarias, camino de trofeos y mapa de la campaña',
    items: [
      'Misiones diarias: cada día hay tres, con oro y gemas de premio. Si cobras las tres, abres un cofre de plata. Están en el nuevo botón Misiones del inicio, junto a Gratis y Códigos.',
      'Camino de trofeos: ganar duelos te acerca a paradas con premios (oro, gemas, cofres, cartas épicas, una mítica y una legendaria). Se abre desde el botón Trofeos del inicio o desde la pantalla de 1 contra 1.',
      'Arenas: con más trofeos, el 1 contra 1 se juega en otro tablero (Prado, Pantano, Ruinas, Glaciar y Río de Lava) y cada victoria da más oro.',
      'La campaña tiene un mapa arriba: tres zonas con su camino de fases, tus estrellas y tu comandante encima de la fase que te toca. Toca una fase para ir a ella.',
      'El cofre de la campaña depende de la zona: madera en las fases 1 a 10, plata en la 11 a 20 y oro en la 21 a 30. Si sacas estrellas nuevas, te llevas uno mejor.',
      'La pantalla del Torneo luce los niveles con las cartas y cintas de cada rareza, y los tres comandantes.',
      'Arreglado: ganar al rival fácil daba los mismos trofeos que al normal.',
      'Los filtros de rareza de la colección ya no salen cortados por arriba.',
      'El nombre de la rareza en las cartas de la tienda se lee mucho más grande.'
    ]
  },
  {
    version: '1.10.0',
    summary: 'Portales al abrir cofres, tienda renovada y filtros en horizontal',
    items: [
      'Al abrir un cofre aparece debajo un portal de luz de su tipo: madera, plata, oro o comandante.',
      'Las cartas de la tienda tienen el fondo de su rareza y una cinta encima con el nombre de la rareza.',
      'Los filtros por rareza de la colección van en horizontal, en dos filas.',
      'La cadena de runas entre tropas vecinas del mismo elemento se ve mucho más grande en el tablero.',
      'Nueva letra para los textos, más limpia, y titulares de la tienda más gruesos.',
      'Los botones verdes de aceptar y jugar tienen un diseño nuevo.',
      'El título «1 contra 1» ya no se parte en dos líneas.'
    ]
  },
  {
    version: '1.9.1',
    summary: 'Botones de jugar nuevos y pantalla de duelo renovada',
    items: [
      'La pantalla principal tiene cuatro cartas para jugar: Campaña, 1 contra 1, 2 contra la máquina y Torneo.',
      'El Torneo tiene su propia pantalla, con el nivel de cada rareza y el premio.',
      'El 1 contra 1 se ve más limpio: cada rival con su monstruo, el nivel de sus cartas y el premio en chapas.'
    ]
  },
  {
    version: '1.9.0',
    summary: 'Premio en cada victoria, cadenas de runas y filtros de madera',
    items: [
      'Ganar cualquier batalla da siempre algo de oro y al menos una gema, también al repetir fases de la campaña.',
      'Las tropas vecinas del mismo elemento se unen con una cadena de runas de su color en el tablero.',
      'Los filtros por rareza de la colección son ahora pestañas de madera unidas por cuerdas.',
      'Colores unificados en todo el juego: elementos, rarezas, maná y contornos con la misma paleta.',
      'Nuevo código de regalo: GEMAS15000.'
    ]
  },
  {
    version: '1.8.0',
    summary: 'Torneo, niveles de comandante y cofre de comandante',
    items: [
      'Nuevo Torneo en 1 contra 1: tus cartas y las del rival juegan al mismo nivel, el de torneo: común 8, rara 6, épica 4, mítica 2 y legendaria 1. Los dos comandantes, al nivel 5. Si ganas, cofre de comandante.',
      'Los comandantes suben de nivel: cada nivel hace su habilidad un 8% más fuerte (Aria congela más rato, Merlo da más maná y el meteoro de Brann pega más). Se mejoran en Mazo, pestaña Comandante.',
      'Cofre de comandante: trae 3 cartas de comandantes al azar, algo de oro y a veces una gema. Lo ganas en el Torneo y también está en la tienda.'
    ]
  },
  {
    version: '1.7.0',
    summary: 'Dos cartas nuevas: Kaia (rara) y Seren (mítica)',
    items: [
      'Kaia, Exploradora (rara, naturaleza): caza mejor sola; sin ninguna tropa al lado pega mucho más.',
      'Seren, Guardiana Astral (mítica, arcano): remata al instante a los monstruos que no sean jefe cuando bajan del 25% de vida. Solo sale en el cofre de oro.',
      'Las dos llegan con su ilustración, sus poses de ataque y su aura en la casilla; la de Kaia solo sale cuando está sola.'
    ]
  },
  {
    version: '1.6.6',
    summary: 'Las míticas, antes que las legendarias',
    items: [
      'En la colección, las cartas se ordenan por rareza: común, rara, épica, mítica y legendaria. Tus cartas siguen saliendo primero y las no encontradas, debajo.'
    ]
  },
  {
    version: '1.6.5',
    summary: 'Las míticas, después de las legendarias',
    items: [
      'En la colección, el filtro Mítica y las cartas míticas van ahora después de las legendarias.'
    ]
  },
  {
    version: '1.6.4',
    summary: 'Monedas alineadas, botón Mejorar nuevo y Siguiente fase hasta la 30',
    items: [
      'Oro, gemas, trofeos y estrellas en fichas con aro dorado y el icono a la misma altura que la cifra, en todas las pantallas.',
      'Las gotas de maná de la barra de partida, centradas con su número.',
      'El botón Mejorar de las cartas tiene el mismo estilo que Cerrar, en verde.',
      'Arreglado: «Siguiente fase» dejaba de salir a partir de la fase 15.'
    ]
  },
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
