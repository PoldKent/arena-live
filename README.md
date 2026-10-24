# Arena Live · v0.12

Juego para transmisiones con una sola partida y vistas sincronizadas 16:9 y 9:16. Incluye el puente local de chat de TikTok LIVE para **@polkent.live**.

## Versión principal

`main` contiene TikTok LIVE, las potencias por modo, los comandos visibles y la arena isométrica con caída y rescate. Ambas capturas se dibujan en Full HD: **1920 × 1080** horizontal y **1080 × 1920** vertical. Usa **`npm.cmd start`** y **http://127.0.0.1:4173**. El pie de Ajustes, la API, el servidor y el paquete identifican la versión 0.12. [Cambios y validación](docs/RELEASE-0.12-CERCANIA-SHINOBI.md).

## Rivalidades de clase

La cadena **Guerrero → Titán → Rayo → Espíritu → Shinobi → Guerrero** aporta +10 % de daño en el sentido de la flecha y −10 % en sentido contrario, tanto en golpes como en poderes. Los otros enfrentamientos son neutros. Guerrero prefiere luchar con Guerreros, Shinobi enfrenta al cercano y prefiere otra clase si está como máximo un **15 % más lejos**, sin inmunidad entre compañeros y Titán ataca a cualquiera. Los Shinobi restantes disputan una final.

En **Ajustes → Equilibrio por clase → Rival del gráfico**, compara el daño real contra cada clase y revisa las reglas de los tres modos. La consulta mantiene el menú abierto y conserva OBS.

Las [2.400 simulaciones de v0.12](docs/balance-v0.12-summary.json) repiten la muestra de v0.11: las victorias Shinobi con 125 peleadores bajan de 93 a 23 de 100, y con 25, de 45 a 19. Los 2.000 duelos y las 100 partidas de cinco peleadores se reproducen exactamente. Guerrero y Espíritu siguen por debajo de otras clases en arenas numerosas; queda equilibrio por afinar.

## Rendimiento con 128 jugadores

La selección de rivales usa un recorrido lineal por luchador y las colisiones descartan cuerpos lejanos antes de calcular distancias. Ambas capturas comparten el orden de dibujo, las medidas de los nombres se reutilizan y el HUD solo cambia los valores que variaron. Los escenarios actualizan sus controles una vez al completar la lista; los chats agrupan scroll y contadores por cuadro.

Se mantiene el cupo de 128, todos los poderes, los efectos y las dos vistas sincronizadas. Los fondos y el suelo isométrico reutilizan capas estáticas para reducir el coste de dibujar Full HD; jugadores, textos y efectos se actualizan en cada cuadro. [Mediciones de v0.12](docs/performance-v0.12.json). Las cifras de este entorno no sustituyen una prueba en tu equipo con OBS.

## Instalar y arrancar en Windows

Requiere Git y Node.js 20 o superior:

```powershell
git clone --branch main https://github.com/PoldKent/arena-live.git Arena_Live_GitHub
cd Arena_Live_GitHub
npm.cmd install
npm.cmd start
```

Abre **http://127.0.0.1:4173/** y conserva abierta la consola. TikTok comienza desconectado; **📡 TikTok** conecta o desconecta según el estado real del puente.

Para actualizar, detén el servidor con **Ctrl+C**, ejecuta `git pull --ff-only origin main`, `npm.cmd install` y `npm.cmd start` desde `main`. Detente si falla algún paso. Conserva los cambios locales antes de descargar si Git los señala. Recarga con **Ctrl+F5** y comprueba **v0.12 en el pie de Ajustes**.

Para volver a `main` desde una rama anterior:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
npm.cmd install
npm.cmd start
```

Detén la secuencia si Git avisa de cambios locales o falla algún comando; conserva esos cambios antes de continuar.

Después de actualizar, `npm.cmd run clean:branches` retira las cuatro ramas antiguas conocidas. Primero verifica que todo su historial esté en `origin/main`; usa una operación atómica con comprobación de referencias para conservar cualquier trabajo nuevo. Utiliza la autenticación Git de tu equipo y conserva las ramas personales ajenas a esta migración. Puede repetirse cuando ya estén retiradas.

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

La barra horizontal empieza por **Vista, Pantalla, Pruebas y Ajustes**. Incluye **Modo Stream, Chat, Prota, Clase, Audio, TikTok, Pausa, Revancha y Lobby**, con iconos, nombres cortos y ayuda al pasar el cursor.

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

El conector de TikTok es no oficial. Una conexión real necesita un LIVE público activo y un comentario desde otra cuenta; sigue pendiente su validación durante una emisión real. La integración recibe texto. Regalos, likes y otros eventos sociales de las herramientas son simulaciones.

## Móvil y controles

En móvil se prioriza 9:16 y una barra inferior con **Prota, Pausa, Saltar, Golpe, Poder y Menú**. Menú permite acceder a todas las opciones, chats y herramientas compactas. Se conservan joystick y gestos; las acciones de combate se habilitan al participar con control manual.

En escritorio: **WASD** mueve a Prota, **Espacio** salta, **E** golpea y **R** activa su especial. **Esc / P** abre o cierra Pausa/Ajustes cuando no estás escribiendo. Esc cierra primero el panel abierto y conserva Stream o la captura individual en pantalla completa.

## Arena isométrica, salto y caída

La arena es aproximadamente un 7 % mayor en ambos ejes. Su borde visible es también el límite del suelo, calculado bajo los pies del peleador. Fuera empieza la caída: ya no hay una franja invisible donde seguir caminando. Si no consigue regresar al suelo, el peleador queda eliminado y se aplican las reglas de vidas y reingreso habituales.

Prota puede intentar salvarse con **Espacio** o **↑ Saltar** mientras no haya caído demasiado. Tiene un salto desde el suelo y un salto aéreo; al salir caminando solo conserva el aéreo. El rescate dirige el impulso hacia la arena. Debe volver por encima del borde y aterrizar: pasar por debajo del suelo no lo salva. La IA intenta un rescate con las mismas cargas y límites; un golpe fuerte puede alejarla demasiado para regresar. Las cargas se recuperan al aterrizar y al preparar una nueva partida.

En este modo **WASD** mueve en el plano, y mantener Espacio pulsado no encadena saltos. Cargar un poder sigue respetando la gravedad y se cancela al hundirse bajo el suelo. El círculo, sus posiciones iniciales, los cambios de modo y el rescate usan la misma geometría en ambas capturas.

## Equilibrio de clases

**Ajustes → Equilibrio por clase** muestra barras de daño básico y especial para las cinco clases. Elige Duelo, Smash, Arena o el modo actual. La escala es común entre modos para comparar valores. **Perfil de clase** muestra las potencias nominales; **Reglas de esta ronda** aplica el multiplicador global, las restricciones de clase y los poderes deshabilitados. El daño es por objetivo, con energía completa, sin críticos, escudos ni apoyos.

Pulsa una clase para consultar el nombre del poder, su carga y cupo configurado en los tres modos. El inspector lee las mismas constantes del combate. Estas selecciones son de consulta: conservan la partida y sus reglas. En Stream permanecen en Ajustes, dentro de la columna izquierda.

Guerrero prefiere otros Guerreros. Shinobi elige al rival cercano y prefiere otra clase hasta un 15 % más lejos respecto al rival válido más cercano, con ataques entre compañeros permitidos. Los demás eligen por cercanía. Daño, carga y objetivos nominales se definen en `ARENA_CLASS_BALANCE`, y la cadena A en `ARENA_CLASS_RIVALRIES`, compartidos por IA, Prota, chat y herramientas. En Arena, Kame y Coloso alcanzan hasta tres objetivos; Trueno alcanza tres en Arena y dos en Smash. Shinobi y Espíritu cargan antes en partidas con varios jugadores.

Las preferencias y el ±10 % están activos en la partida; consultar las barras solo cambia la vista del inspector. Los Shinobi pueden dañarse entre sí y disputan la victoria cuando quedan solos. El margen de cercanía se consulta en ese panel y en `ArenaLive.getCombatTargetRules()`. Los resultados iniciales mejoran el dominio Shinobi; queda por afinar el rendimiento de Guerrero y Espíritu en Arena numerosa. Daño, carga, alcance, blancos y cooperación se evalúan juntos mediante partidas; las barras no garantizan tasas de victoria iguales.

La integración de v0.6 reprodujo 33.000 casos del candidato: 16.000 duelos con poderes, 16.000 controles y 1.000 partidas con varios jugadores. [Resultados de esa geometría e intervalos](docs/balance-v0.6-summary.json). v0.8 conserva esas potencias, pero corrige el suelo, las caídas y las cargas en movimiento de Arena: sus resultados con varios jugadores pueden cambiar y las tasas históricas no deben atribuirse a la arena actual. El [diagnóstico v0.5](docs/BALANCE-CLASES-v0.5.md) también se conserva como antecedente.

`npm.cmd run analyze:balance` evalúa la versión actual con 4.800 casos y genera `reports/balance/latest.json`, `latest-summary.json` y `latest-matches.csv.gz`. Requiere Chromium de Playwright. `ARENA_BALANCE_PILOT=1` reduce la muestra para comprobar el recorrido; `ARENA_BALANCE_DUEL_SEEDS`, `ARENA_BALANCE_ARENA_SEEDS`, `ARENA_BALANCE_SEED_START`, `ARENA_BALANCE_COUNTS` y `ARENA_BALANCE_OUTPUT` permiten ampliar o guardar otra muestra. El analizador sirve el mismo juego publicado y no conecta con un LIVE.

## Desarrollo y verificación

El juego permanece en `index.html`. El puente usa `ws` y `tiktok-live-connector`, escucha solo en 127.0.0.1 y no pide contraseñas.

```powershell
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:browser
npm.cmd run test:performance
```

Las pruebas del navegador arrancan y cierran su servidor local y simulan las respuestas de TikTok. Cubren paneles, persistencia, escenarios, chats, pausa, capturas, idiomas y controles móviles; no conectan con una emisión real.

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

El desarrollo y las actualizaciones continúan en `main`. La entrega vigente es Arena Live v0.12, con ambas capturas Full HD, textos de poderes configurables, inspector de equilibrio, TikTok, reglas, potencias, comandos y caída isométrica integrados. Las entregas anteriores quedan como historial.
