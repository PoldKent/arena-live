# Arena Live · v0.18

Juego para transmisiones con una sola partida y vistas sincronizadas 16:9 y 9:16. Incluye el puente local de chat de TikTok LIVE para **@polkent.live**.

## Versión principal

`main` contiene TikTok LIVE, las potencias por modo, los comandos visibles y la arena isométrica con caída y rescate. Ambas capturas se dibujan en Full HD: **1920 × 1080** horizontal y **1080 × 1920** vertical. Usa **`npm.cmd start`** y **http://127.0.0.1:4173**. El pie de Ajustes, la API, el servidor y el paquete identifican la versión 0.18. [Panel único de v0.18](docs/RELEASE-0.18-PANEL-UNICO.md). [Las seis correcciones y su validación](docs/RELEASE-0.15-CORRECCIONES.md).

## Probar en un celular con un solo archivo

Ejecuta **`npm.cmd run build:mobile`** para generar `dist/Arena-Live-v0.18.0-movil.html`. Copia ese único HTML al teléfono y ábrelo con un navegador que ejecute archivos HTML locales. No necesita npm, internet ni archivos adicionales en el celular. Incluye inicio rápido de 2 a 128 peleadores, Prota táctil, Ajustes, pruebas, comandos y radar de clases.

La exportación usa el combate de `main`; comienza en 720p, dibujo a 30 FPS y calidad Rendimiento. Permite cambiar a 540p/1080p y 30/60 FPS. TikTok LIVE real sigue necesitando el servidor: este archivo ofrece pruebas locales. [Uso, optimizaciones y límites de la exportación móvil](docs/MOVIL-MONOLITICO.md).

## Preferencias y herramientas de clase

En **Ajustes → Equilibrio por clase**, cada una de las cinco clases tiene preferencias independientes de objetivo. **Jugador, poderes y comandos** es el único panel para elegir al jugador, probar poderes y enviar comandos. Reúne un selector fijo o aleatorio compatible y la clase del jugador; sustituye al antiguo panel Jugador objetivo. **Adaptar clase para probar** permite lanzar Kame o Trueno con la misma identidad, indicando el cambio. Los botones preparan energía y recarga; el juego normal conserva sus reglas. [Uso del panel único](docs/RELEASE-0.18-PANEL-UNICO.md).

## Rivalidades de clase

La cadena **Guerrero → Titán → Rayo → Espíritu → Shinobi → Guerrero** aporta +10 % de daño en el sentido de la flecha y −10 % en sentido contrario, tanto en golpes como en poderes. Los otros enfrentamientos son neutros. Guerrero responde al rival cercano y prefiere otro Guerrero hasta un **25 % más lejos**, Shinobi enfrenta al cercano y prefiere otra clase si está como máximo un **15 % más lejos**, sin inmunidad entre compañeros y Titán ataca a cualquiera. Los Shinobi restantes disputan una final.

En **Ajustes → Equilibrio por clase → Rival del gráfico**, compara el daño real contra cada clase en un **radar pentagonal** con cinco ejes y dos polígonos: básico y especial. Revisa las reglas de los tres modos. La consulta mantiene el menú abierto y conserva OBS.

Las [2.400 simulaciones de validación de v0.15](docs/balance-v0.15-summary.json) usan semillas distintas a las de ajuste. En 100 rondas iniciadas con 125 peleadores: Guerrero **17 %**, Shinobi **20 %**, Titán **19 %**, Rayo **25 %** y Espíritu **19 %**. El control con las mismas semillas y el equilibrio anterior dio 8 %, 17 %, 37 %, 28 % y 10 %. En Duelo, las tasas por clase van de 46,5 % a 54,5 %. Son resultados de IA con intervalos de incertidumbre, sin apoyos ni reingresos. No garantizan el mismo resultado con público o reglas personalizadas. En **Ajustes → Equilibrio por clase → Resultados medidos**, consulta también grupos de 5, 10 y 25; las rondas incluyen sus cambios de modo.

En Arena, Kame, Coloso y Trueno alcanzan hasta dos objetivos. Enredadera enlaza hasta **dos rivales**, con **32 HP por objetivo y 28 pasos de carga**; conserva un objetivo en Duelo y Smash. Se mantienen 180 HP, golpe base 12 y rivalidades ±10 %.

## Sesión, pausa y configuración

**Ajustes → Sesión y rendimiento** reúne las reglas de especiales, acciones durante la pausa, calidad, límite de dibujo de 30/60 FPS, prioridad de Guerrero y volumen. El modo predeterminado exige **25 de energía y 8 s de espera** a IA, chat, Prota y pruebas. El especial consume hasta 45 de energía; la opción de participación libre conserva poderes débiles sin energía para acciones humanas, con una explicación visible.

Abrir Ajustes pausa y cerrarlo reanuda. Durante la pausa, el chat puede guardar la última acción de cada persona: hasta 64 personas, vigencia de 8 s y salida de 4 acciones/s. Se puede elegir mostrar sin ejecutar. Los poderes desactivados se rechazan antes de entrar en la cola. Revancha restaura los participantes de la ronda, incluido Prota; los perfiles guardan preferencias y ya no inscriben automáticamente a espectadores históricos.

**Guardar/Cargar configuración** conserva reglas, sesión, calibración OBS y las distribuciones de ambos espacios. El archivo no es una partida guardada ni contiene los perfiles del chat. La importación aplica opciones al instante. **Restablecer sesión** conserva OBS y los paneles. **Exportar diagnóstico** registra tiempos de CPU y resoluciones, sin inventar uso de GPU.

## Rendimiento con 128 jugadores

En ráfagas simultáneas de 128 especiales, el dibujo ahora comparte el índice de personajes entre ambas cámaras y descarta únicamente efectos completamente fuera de la vista, con márgenes de seguridad para rayos, columnas de K.O. y haces que cruzan la pantalla. Las partículas de especiales reservan sus huecos en bloque: mismo límite, orden y aspecto finales, menos desplazamientos del arreglo. El observador de traducción evita recorrer mensajes de chat que ya están normalizados. No se alteraron daño, física, aleatoriedad, duración de los especiales ni resolución de captura. Estas optimizaciones reducen trabajo innecesario; el FPS real depende de CPU, GPU y OBS y debe medirse en la emisión.



La interfaz sirve sus estilos ya generados desde `styles/arena-ui.css`: el navegador deja de compilar Tailwind y de vigilar el chat para generar CSS. El selector de objetivo conserva sus opciones y retira solo las de los eliminados. El HUD actualiza únicamente los valores que cambiaron.

La física conserva el orden secuencial de los peleadores y evita las llamadas de una función por cada par de cuerpos. Los poderes limitados eligen los mismos uno, dos o tres blancos con distancias calculadas una sola vez. La retirada de partículas, textos y efectos usa un recorrido estable, y los símbolos de estado reutilizan listas acotadas. Las dos capturas comparten orden y tiempo de animación; los fondos estáticos y las medidas de nombres siguen reutilizándose.

Se mantienen el cupo de 128, los poderes, los límites de efectos, la simulación de 60 Hz y las capturas **1920 × 1080** y **1080 × 1920**. [Mediciones y condiciones de v0.15](docs/performance-v0.15.json). Las cifras de este entorno no representan los FPS de tu equipo con OBS. La calidad **Rendimiento** dibuja menos partículas y conserva el combate completo. El límite de dibujo de 30 FPS mantiene la simulación de 60 pasos/s y ambas capturas Full HD.

Los lienzos opacos usan Canvas 2D con `willReadFrequently:false`; el navegador puede rasterizarlos con GPU cuando tiene aceleración gráfica disponible. El juego no lee píxeles durante la emisión. `npm.cmd run test:gpu` deja habilitada la configuración gráfica predeterminada del navegador de pruebas e informa de `2d_canvas`, composición y renderer reales. No fuerza una GPU ni confirma la configuración de tu navegador habitual. El control `test:performance` desactiva la GPU para conservar una medición por software comparable; sus tiempos incluyen lectura de píxeles, y los de `test:gpu` miden envío de comandos, sin esperar a que la GPU termine.

## Instalar y arrancar en Windows

Requiere Git y Node.js 20 o superior; CI verifica Node.js 24 en Windows y Linux. `npm-shrinkwrap.json` fija las dependencias para `npm.cmd ci` y tiene prioridad sobre un `package-lock.json` local, que no se elimina:

```powershell
git clone --branch main https://github.com/PoldKent/arena-live.git Arena_Live_GitHub
cd Arena_Live_GitHub
npm.cmd ci
npm.cmd start
```

Abre **http://127.0.0.1:4173/** y conserva abierta la consola. TikTok comienza desconectado; **📡 TikTok** conecta o desconecta según el estado real del puente.

Para actualizar, detén el servidor con **Ctrl+C**, ejecuta `git pull --ff-only origin main`, `npm.cmd ci` y `npm.cmd start` desde `main`. Detente si falla algún paso. Conserva los cambios locales antes de descargar si Git los señala. Recarga con **Ctrl+F5** y comprueba **v0.18 en el pie de Ajustes**.

Para volver a `main` desde una rama anterior:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd start
```

Detén la secuencia si Git avisa de cambios locales o falla algún comando; conserva esos cambios antes de continuar.

Después de actualizar, `npm.cmd run clean:branches` retira las cuatro ramas antiguas conocidas. Primero verifica que todo su historial esté en `origin/main`; usa una operación atómica con comprobación de referencias para conservar cualquier trabajo nuevo. Utiliza la autenticación Git de tu equipo y conserva las ramas personales ajenas a esta migración. Puede repetirse cuando ya estén retiradas.

El puente reconecta con espera gradual solo después de pulsar Conectar. Al cerrar la ventana que recibía el chat, las otras ventanas no toman su control automáticamente: usa **Usar esta partida**. LIVE recibe comentarios y taps (Me gusta) reales. El primer tap de una cuenta sin personaje la inscribe automáticamente mientras el lobby esté abierto, siempre dentro del cupo de 128 y sin duplicarla. Los siguientes taps pueden potenciar el empuje del personaje activo. Los taps en combate no inscriben automáticamente; se conservan las reglas de reingreso. Los apoyos sociales manuales del panel siguen siendo simulaciones. El puente agrupa taps en ráfagas breves y limita la frecuencia de efectos.

## Inicio / Pruebas

El juego ocupa el centro. A la izquierda están los chats con pestañas **TikTok** y **Chat de pruebas y comandos**. A la derecha están los paneles de objetivo, escenarios, interacciones sociales, jugadores, poderes, simulación y puente TikTok. Solo el grupo de interacciones sociales comienza desplegado; los chats también están visibles.

- **Mover:** arrastra el asa **⠿** de un panel. Suelta sobre una columna, sobre otro panel para ordenarlo o sobre el área central para dejarlo flotante. Durante el arrastre aparece una zona inferior donde acoplarlo.
- **Acoplar con teclado:** usa el selector junto al asa: izquierda, derecha, abajo o flotante.
- **Redimensionar:** arrastra el borde entre columnas, la esquina inferior del contenido desplegado o la esquina de un panel flotante. Los separadores también admiten las flechas del teclado.
- **Plegar:** pulsa el título; puedes dejar abiertas varias secciones.
- **Objetivo:** elige un jugador para consultar nombre, clase, vida y energía antes de probar poderes o apoyos.
- **Escenarios:** selecciona 1v1, Smash, Arena o 128 personajes y pulsa **Cargar**. Elegir la opción por sí sola no cambia la partida.

**🧪 Pruebas** ofrece accesos a las categorías. Las herramientas siguen en sus paneles al usarlas. Las distribuciones se guardan automáticamente en este navegador, por separado para Inicio/Pruebas y Stream. Puedes restablecer la distribución desde Ajustes o Pruebas, conservando la partida y la calibración OBS.

## Barra, pausa y ajustes

La barra horizontal empieza por **Vista, Pantalla, Pruebas y Ajustes**. Incluye **Modo Stream, Chat, Prota, un selector desplegable directo con sus cinco clases, Audio, TikTok, Pausa, Revancha y Lobby**. Ya no hay que abrir otro menú para elegir la clase de Prota: puede seleccionarse antes de entrar y también cambiarse durante la partida, respetando el mismo enfriamiento de cambio de clase y las restricciones de la ronda.

**Prota** permite participar como jugador. **Modo Stream** abre la composición de emisión. Vista alterna la preparación entre 16:9 y 9:16; Pantalla abre una captura individual en pantalla completa.

**Ajustes siempre pausa al abrir y reanuda al cerrar**, incluso si habías pausado manualmente. Sus opciones están en secciones plegables del mismo menú. Los cambios se aplican inmediatamente y el menú permanece abierto tanto en Inicio/Pruebas como en Stream. Cerrar Ajustes con ×, Continuar o Esc reanuda el juego.

**Opacidad de la información del juego** afecta a textos y barras de ambas vistas; **100 % = totalmente visible**. Tiene una explicación visible y ayuda al pasar el cursor.

**Vibración de cámara**, en **Ajustes → Pantallas y OBS**, comienza al **25 %** y admite **0–100 %**; **0 %** la apaga. Afecta a ambas vistas y se recuerda en este navegador. Conserva el daño, el empuje, las reglas y la calibración de OBS.

La versión aparece únicamente abajo, en el pie de Ajustes. **Mostrar números de daño/curación** y **Mostrar texto de los poderes**, en Audiencia y chat, revelan u ocultan los textos inmediatamente, incluso en animaciones ya visibles. Las opciones se recuerdan en este navegador y conservan los iconos al apagar las letras. Los botones de poderes muestran Kame, Rasen, Trueno, Enredadera y Coloso, con sus nombres adaptados al idioma.

## Reglas y parámetros de pelea

En **Ajustes → Reglas y parámetros** puedes configurar:

| Control | Opciones |
| --- | --- |
| Cupo de jugadores | De 2 a 128, incluyendo Prota y caídos inscritos en la ronda. |
| Clase de la ronda | Todas, o solo Guerrero, Shinobi, Titán, Rayo o Espíritu. |
| Poderes y apoyos | Permitidos; sin poderes de clase con apoyos sociales; o Solo golpes, sin poderes ni apoyos. |
| Vida máxima | 50–1000 HP; conserva el porcentaje de vida al cambiarla. |
| Daño | 0.25–3× para los ataques. |
| Empuje recibido | 0–2×; cero permite golpes sin lanzamiento. |
| Movimiento | 0.5–2× de la velocidad normal. |
| Recarga pasiva de energía | 0–3×; los aportes instantáneos de energía son independientes. |

El cupo bloquea nuevas identidades por TikTok, chat local, Prota, pruebas y lotes. Una identidad ya inscrita conserva su lugar para los reingresos permitidos por las reglas de vidas/tiempo. Reducir el cupo en el lobby ajusta los jugadores allí; reducirlo en combate conserva a quienes ya participan y limita la lista al preparar el próximo lobby. Los escenarios también respetan el cupo.

La clase única afecta a jugadores actuales y nuevos, incluidos Prota y las pruebas. Volver a Todas recupera sus clases preferidas; los comandos de otra clase no saltan la restricción. Sin poderes de clase bloquea especiales de IA, teclado/táctil, chat y pruebas, y cancela cargas pendientes. Solo golpes también elimina bonificaciones y bloquea apoyos sociales y el boost de un !jugar repetido.

Estas reglas se recuerdan en este navegador. **Restablecer reglas** recupera los valores originales sin borrar identidades, distribución de paneles ni calibración OBS. Las reglas de vidas y tiempo siguen en Partida.

## Modo Stream y OBS

Stream conserva una sola simulación, 16:9 grande a la izquierda y 9:16 al extremo derecho. Herramientas y chats se abren en una columna reservada al extremo izquierdo, fuera de los juegos. El chat se abre bajo demanda. El panel elegido permanece abierto al actuar, enviar mensajes, modificar valores o hacer clic en el juego. Elegir otro menú lo reemplaza. Usa **×** o Esc para cerrarlo; pulsar de nuevo el mismo acceso mantiene su panel abierto.

Los lienzos tienen resolución interna **1920 × 1080** y **1080 × 1920**, también cuando la preparación los muestra más pequeños. El juego y sus textos se dibujan a esa resolución. Puedes consultar ambos tamaños en **Ajustes → Pantallas y OBS**. Las proporciones, la distribución y la calibración guardada se conservan.

Los rayos nacen desde el borde superior de cada vista, los haces Kame llegan al borde correspondiente y las columnas de K.O. cubren la altura hasta el límite superior. Destellos y confeti utilizan todo el cuadro vertical. Los anillos de golpe/salto y las partículas siguen ligados a los personajes; el alcance visual hasta el borde no aumenta el daño ni el número de objetivos.

La columna puede ajustar su ancho. La barra superior oculta sus botones hasta acercar el cursor y también se muestra con el foco del teclado; conserva su espacio. Abrir/cerrar paneles o mostrar/ocultar la barra **no mueve ni reescala las capturas**. Los dispositivos táctiles mantienen accesible la barra.

Se conservan la calibración y su clave de almacenamiento: desplazamiento **0–16 px** (10 por defecto) y espacio inferior **72–148 px** (76 por defecto). La nueva columna forma parte de la composición v0.3: comprueba los recortes de OBS una vez al actualizar y después de cambiar deliberadamente ancho o calibración. Usa una sola instancia del juego para ambas capturas.

## Chats y TikTok

Los comandos se distinguen de los mensajes normales. Los mensajes nuevos vuelven automáticamente al más reciente, aunque estés leyendo anteriores. El historial recibido de TikTok conserva navegación y exportación TXT; ocultar el panel no borra mensajes ni cambia su recepción.

En **Chat de pruebas y comandos**, cada entrada o reingreso real muestra el nombre del peleador, `!jugar` y su clase, incluso desde escenarios o botones rápidos. Cada especial ejecutado muestra su comando: `!kame`, `!rasen`, `!coloso`, `!trueno` o `!enred`. Incluye IA, Prota y herramientas; si eliges otro objetivo para una prueba, el registro identifica a quien lanza el poder.

La etiqueta **🎮 Juego** distingue estas acciones observadas de los mensajes recibidos. Un comando escrito conserva su mensaje; al ejecutarse aparece además la confirmación del juego. Una carga interrumpida, un poder deshabilitado o una entrada rechazada no generan confirmación de ejecución. Un `!jugar` repetido de alguien que ya está activo sigue siendo un apoyo, sin anunciar otra entrada. El historial respeta el límite elegido en Ajustes y no envía estos registros a TikTok.

**Pruebas → TikTok LIVE → Probar comando** comprueba el recorrido local con `!guerrero`. El formulario del chat de pruebas es local: no publica respuestas en TikTok.

El conector de TikTok es no oficial. Una conexión real necesita un LIVE público activo y un comentario desde otra cuenta; sigue pendiente su validación durante una emisión real. La integración recibe comentarios y el evento LIKE de TikTok (taps). El contador del puente distingue taps reales, pruebas y efectos aplicados. Para probar sin LIVE, envía `!jugar` desde **Probar comando**, luego usa **Probar 10 taps** sobre `@arena_prueba`. Los regalos, las demás interacciones sociales y los botones de prueba siguen simulados.

## Cómo participar · Guía permanente en ambas emisiones

El lobby muestra una bienvenida simplificada con tipografía grande en **16:9 y 9:16**: escribe `!jugar`, aparece tu personaje y luego elige una clase y activa su ataque. El reloj, modo, reglas y los controles de prueba se mantienen. La tarjeta central desaparece al comenzar el combate.

Las indicaciones permanecen **arriba** en ambas capturas, también durante el combate, con un llamado visible a escribir `!jugar` y los cinco pares de clase/poder en texto, sin botones: `!guerrero → !kame`, `!shinobi → !rasen`, `!titan → !coloso`, `!rayo → !trueno` y `!espiritu → !enred`. El centro de la arena queda despejado.

En **Modo Stream dual**, la columna TikTok usa un **marco vertical 9:21** con el vídeo **9:16 centrado** y bandas simétricas arriba y abajo. Puedes usar una fuente de ventana/recorte del marco para adaptarlo, con escala proporcional, a pantallas 9:19.5, 9:20 o 9:21; no deformes el vídeo. Si OBS captura solo `#viewport9x16`, sigue siendo 9:16 (1080 × 1920). La preparación normal y el HTML móvil mantienen 9:16, sin el marco 9:21.

## Móvil y controles

En móvil se prioriza 9:16 y una barra inferior con **Prota, Pausa, Saltar, Golpe, Poder y Menú**. Menú permite acceder a todas las opciones, chats y herramientas compactas. Se conservan joystick y gestos; las acciones de combate se habilitan al participar con control manual.

En escritorio: **WASD** mueve a Prota, **Espacio** salta, **E** golpea y **R** activa su especial. **Esc / P** abre o cierra Pausa/Ajustes cuando no estás escribiendo. Esc cierra primero el panel abierto y conserva Stream o la captura individual en pantalla completa.

## Arena isométrica, salto y caída

La arena es aproximadamente un 7 % mayor en ambos ejes. Su borde visible es también el límite del suelo, calculado bajo los pies del peleador. Fuera empieza la caída: ya no hay una franja invisible donde seguir caminando. Si no consigue regresar al suelo, el peleador queda eliminado y se aplican las reglas de vidas y reingreso habituales.

Prota puede intentar salvarse con **Espacio** o **↑ Saltar** mientras no haya caído demasiado. Tiene un salto desde el suelo y un salto aéreo; al salir caminando solo conserva el aéreo. El rescate dirige el impulso hacia la arena. Debe volver por encima del borde y aterrizar: pasar por debajo del suelo no lo salva. La IA intenta un rescate con las mismas cargas y límites; un golpe fuerte puede alejarla demasiado para regresar. Las cargas se recuperan al aterrizar y al preparar una nueva partida.

En este modo **WASD** mueve en el plano, y mantener Espacio pulsado no encadena saltos. Cargar un poder sigue respetando la gravedad y se cancela al hundirse bajo el suelo. El círculo, sus posiciones iniciales, los cambios de modo y el rescate usan la misma geometría en ambas capturas.

## Equilibrio de clases

**Ajustes → Equilibrio por clase** muestra un **radar pentagonal**, con un eje para cada clase. El polígono discontinuo representa el daño básico y el continuo, el especial; ambos usan la misma escala en HP. Elige Duelo, Smash, Arena o el modo actual. La escala es común entre modos para comparar valores. **Perfil de clase** muestra las potencias nominales; **Reglas de esta ronda** aplica el multiplicador global, las restricciones de clase y los poderes deshabilitados. El daño es por objetivo, con energía completa, sin críticos, escudos ni apoyos. Elegir un rival actualiza ambos polígonos con su modificador de clase. Los anillos marcan cuartos de la escala; se indican mitad y máximo, y los números de la lista muestran los HP exactos.

Debajo del gráfico hay cinco botones con el nombre de clase y poder, la afinidad y los valores exactos. En columnas estrechas, los ejes numerados 1–5 corresponden a esos botones. Pulsa una clase para resaltar sus puntos y consultar su carga y cupo configurado en los tres modos. El inspector lee las mismas constantes del combate. Estas selecciones son de consulta: conservan la partida y sus reglas. En Stream permanecen en Ajustes, dentro de la columna izquierda.

Guerrero prefiere otros Guerreros. Shinobi elige al rival cercano y prefiere otra clase hasta un 15 % más lejos respecto al rival válido más cercano, con ataques entre compañeros permitidos. Los demás eligen por cercanía. Daño, carga y objetivos nominales se definen en `ARENA_CLASS_BALANCE`, y la cadena A en `ARENA_CLASS_RIVALRIES`, compartidos por IA, Prota, chat y herramientas. En Arena, Kame y Coloso alcanzan hasta tres objetivos; Trueno alcanza tres en Arena y dos en Smash. Shinobi y Espíritu cargan antes en partidas con varios jugadores.

Las preferencias y el ±10 % están activos en la partida; consultar el radar solo cambia la vista del inspector. Los Shinobi pueden dañarse entre sí y disputan la victoria cuando quedan solos. El margen de cercanía se consulta en ese panel y en `ArenaLive.getCombatTargetRules()`. Los resultados iniciales mejoran el dominio Shinobi; queda por afinar el rendimiento de Guerrero y Espíritu en Arena numerosa. Daño, carga, alcance, blancos y cooperación se evalúan juntos mediante partidas; el radar no garantiza tasas de victoria iguales.

La integración de v0.6 reprodujo 33.000 casos del candidato: 16.000 duelos con poderes, 16.000 controles y 1.000 partidas con varios jugadores. [Resultados de esa geometría e intervalos](docs/balance-v0.6-summary.json). v0.8 conserva esas potencias, pero corrige el suelo, las caídas y las cargas en movimiento de Arena: sus resultados con varios jugadores pueden cambiar y las tasas históricas no deben atribuirse a la arena actual. El [diagnóstico v0.5](docs/BALANCE-CLASES-v0.5.md) también se conserva como antecedente.

`npm.cmd run analyze:balance` evalúa la versión actual con 4.800 casos y genera `reports/balance/latest.json`, `latest-summary.json` y `latest-matches.csv.gz`. Requiere Chromium de Playwright. `ARENA_BALANCE_PILOT=1` reduce la muestra para comprobar el recorrido; `ARENA_BALANCE_DUEL_SEEDS`, `ARENA_BALANCE_ARENA_SEEDS`, `ARENA_BALANCE_SEED_START`, `ARENA_BALANCE_COUNTS` y `ARENA_BALANCE_OUTPUT` permiten ampliar o guardar otra muestra. El analizador sirve el mismo juego publicado y no conecta con un LIVE.

## Desarrollo y verificación

El juego permanece en `index.html`. El puente usa `ws` y `tiktok-live-connector`, escucha solo en 127.0.0.1 y no pide contraseñas.

```powershell
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:browser
npm.cmd run test:performance
npm.cmd run test:gpu
```

Para modificar clases de la interfaz, ejecuta `npm.cmd run build:styles` y guarda también `styles/arena-ui.css`. El CSS ya está incluido para jugar; `npm.cmd start` no ejecuta un compilador. `npm.cmd test` verifica que coincida con las clases actuales.

Las pruebas del navegador arrancan y cierran su servidor local y simulan las respuestas de TikTok. Cubren paneles, persistencia, escenarios, chats, pausa, capturas, idiomas y controles móviles; no conectan con una emisión real.

- [Correcciones de integridad, rendimiento, TikTok, equilibrio, ajustes y verificación de v0.15](docs/RELEASE-0.15-CORRECCIONES.md).
- [Depuración, carga de 128 peleadores y diagnóstico gráfico de v0.14](docs/RELEASE-0.14-DEPURACION.md).
- [Radar pentagonal de daño en v0.13](docs/RELEASE-0.13-RADAR.md).
- [Cercanía Shinobi y comparación de v0.12](docs/RELEASE-0.12-CERCANIA-SHINOBI.md).
- [Cadena A, prioridades y resultados de v0.11](docs/RELEASE-0.11-RIVALIDADES.md).
- [Ajustes corregidos e inspector de equilibrio en v0.10](docs/RELEASE-0.10-AJUSTES-EQUILIBRIO.md).
- [Full HD y efectos de toda la vista en v0.9](docs/RELEASE-0.9-FULL-HD.md).
- [Arena ampliada, caída, rescate y vibración de v0.8](docs/RELEASE-0.8-ARENA.md).
- [Comandos visibles de entradas y especiales en v0.7](docs/RELEASE-0.7-COMANDOS.md).
- [Integración del equilibrio en v0.6](docs/RELEASE-0.6-UNIFICADA.md).
- [Rendimiento y depuración de v0.5](docs/RELEASE-0.5-RENDIMIENTO.md).
- [Reglas y paneles persistentes de v0.4](docs/RELEASE-0.4-REGLAS.md).
- [Decisiones de la reconstrucción v0.3](docs/RELEASE-0.3-INTERFAZ.md).
- [Guía de operación y OBS](docs/DUAL-OPERADOR-TIKTOK.md).
- [Puente TikTok y limitaciones](docs/TIKTOK-LIVE-MVP.md).
- [Registro de cambios](CHANGELOG.md).
- Historial: [v0.2](docs/RELEASE-0.2-OPERADOR.md), [v0.1](docs/RELEASE-0.1-OBS.md).

El desarrollo y las actualizaciones continúan en `main`. La entrega vigente es Arena Live v0.18, con ambas capturas Full HD, textos de poderes configurables, inspector de equilibrio, TikTok, reglas, potencias, comandos y caída isométrica integrados. Las entregas anteriores quedan como historial.
