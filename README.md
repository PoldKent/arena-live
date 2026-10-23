# Arena Live · v0.4

Juego para transmisiones con una sola partida y vistas sincronizadas 16:9 y 9:16. Incluye el puente local de chat de TikTok LIVE para **@polkent.live**.

## Instalar y arrancar en Windows

Requiere Git y Node.js 20 o superior:

```powershell
git clone --branch main https://github.com/PoldKent/arena-live.git Arena_Live_GitHub
cd Arena_Live_GitHub
npm.cmd install
npm.cmd start
```

Abre **http://127.0.0.1:4173/** y conserva abierta la consola. TikTok comienza desconectado; **📡 TikTok** conecta o desconecta según el estado real del puente.

Para actualizar, detén el servidor con **Ctrl+C**, ejecuta `git pull --ff-only`, `npm.cmd install` y `npm.cmd start`. Detente si falla algún paso. Conserva los cambios locales antes de descargar si Git los señala. Recarga con **Ctrl+F5** y comprueba **v0.4** en Ajustes.

Si venías usando la rama de TikTok, cambia a `main` antes de actualizar:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
npm.cmd install
npm.cmd start
```

Detén la secuencia si Git avisa de cambios locales o falla algún comando; conserva esos cambios antes de continuar.

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

La columna puede ajustar su ancho. La barra superior oculta sus botones hasta acercar el cursor y también se muestra con el foco del teclado; conserva su espacio. Abrir/cerrar paneles o mostrar/ocultar la barra **no mueve ni reescala las capturas**. Los dispositivos táctiles mantienen accesible la barra.

Se conservan la calibración y su clave de almacenamiento: desplazamiento **0–16 px** (10 por defecto) y espacio inferior **72–148 px** (76 por defecto). La nueva columna forma parte de la composición v0.3: comprueba los recortes de OBS una vez al actualizar y después de cambiar deliberadamente ancho o calibración. Usa una sola instancia del juego para ambas capturas.

## Chats y TikTok

Los comandos se distinguen de los mensajes normales. Los mensajes nuevos vuelven automáticamente al más reciente, aunque estés leyendo anteriores. El historial recibido de TikTok conserva navegación y exportación TXT; ocultar el panel no borra mensajes ni cambia su recepción.

**Pruebas → TikTok LIVE → Probar comando** comprueba el recorrido local con `!guerrero`. El formulario del chat de pruebas es local: no publica respuestas en TikTok.

El conector de TikTok es no oficial. Una conexión real necesita un LIVE público activo y un comentario desde otra cuenta; sigue pendiente su validación durante una emisión real. La integración recibe texto. Regalos, likes y otros eventos sociales de las herramientas son simulaciones.

## Móvil y controles

En móvil se prioriza 9:16 y una barra inferior con **Prota, Pausa, Saltar, Golpe, Poder y Menú**. Menú permite acceder a todas las opciones, chats y herramientas compactas. Se conservan joystick y gestos; las acciones de combate se habilitan al participar con control manual.

En escritorio: **WASD** mueve a Prota, **Espacio** salta, **E** golpea y **R** activa su especial. **Esc / P** abre o cierra Pausa/Ajustes cuando no estás escribiendo. Esc cierra primero el panel abierto y conserva Stream o la captura individual en pantalla completa.

## Desarrollo y verificación

El juego permanece en `index.html`. El puente usa `ws` y `tiktok-live-connector`, escucha solo en 127.0.0.1 y no pide contraseñas.

```powershell
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Las pruebas del navegador arrancan y cierran su servidor local y simulan las respuestas de TikTok. Cubren paneles, persistencia, escenarios, chats, pausa, capturas, idiomas y controles móviles; no conectan con una emisión real.

- [Reglas y paneles persistentes de v0.4](docs/RELEASE-0.4-REGLAS.md).
- [Decisiones de la reconstrucción v0.3](docs/RELEASE-0.3-INTERFAZ.md).
- [Guía de operación y OBS](docs/DUAL-OPERADOR-TIKTOK.md).
- [Puente TikTok y limitaciones](docs/TIKTOK-LIVE-MVP.md).
- [Registro de cambios](CHANGELOG.md).
- Historial: [v0.2](docs/RELEASE-0.2-OPERADOR.md), [v0.1](docs/RELEASE-0.1-OBS.md).

`main` contiene Arena Live v0.4, incluida la interfaz reconstruida, las reglas de combate y el puente local de TikTok. La edición independiente v0.1 se conserva en el historial de Git. La integración mantiene el historial de ambas ramas.
