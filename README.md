# Arena Live · v0.2

Juego interactivo para transmisiones en vivo, con una sola partida y vistas sincronizadas 16:9 y 9:16. Esta rama incorpora el puente local de chat de TikTok LIVE para @polkent.live.

## Instalar y arrancar en Windows

Requiere Git y Node.js 20 o superior. Clona la edición TikTok:

```powershell
git clone --branch feature/tiktok-live-chat-mvp https://github.com/PoldKent/arena-live.git Arena_Live_GitHub
cd Arena_Live_GitHub
npm.cmd install
npm.cmd start
```

Abre **http://127.0.0.1:4173/** y mantén abierta la consola. El servidor comienza con TikTok desconectado. El botón **📡 TikTok** conecta o desconecta según el estado real del puente.

Para actualizar, detén el servidor con **Ctrl+C**, ejecuta `git pull --ff-only`, después `npm.cmd install` y `npm.cmd start`. Si Git señala cambios locales, consérvalos antes de actualizar. Comprueba `git log -1 --oneline`, recarga con **Ctrl+F5** y consulta **v0.2** en Ajustes.

## Barra del operador

La misma barra horizontal se utiliza en preparación y en **🎥 Modo Stream**. Los botones tienen icono, nombre corto y explicación al pasar el cursor. Incluye:

- **Modo Stream:** composición dual en pantalla completa, con 16:9 a la izquierda y 9:16 a la derecha.
- **Vista / Pantalla:** alternar la vista de preparación y abrir una vista individual en pantalla completa.
- **Pausa, Lobby, Revancha y Prota:** accesos directos a la partida y a la participación del streamer.
- **Clase, Audio, TikTok, Herramientas, Chat y Ajustes:** accesos del operador.

En pantallas estrechas la barra se desplaza horizontalmente. **Prota** significa participar como jugador; **Modo Stream** es la composición para emitir.

## Menús y ajustes

**Ajustes pausa la partida al abrirse y la reanuda al cerrarse.** Todas las opciones comparten el mismo menú: Partida, Prota y combate, Pantallas y OBS, Audio e idioma, y Audiencia y chat.

Los menús se ocultan **después de cada acción**: pulsar un botón, elegir un valor, marcar una casilla o terminar de mover un deslizador. También se cierran con Esc o clic fuera. Los campos de texto permiten terminar de escribir antes de enviar. Ocultar un menú conserva el historial, la selección del objetivo y sus valores.

La etiqueta **Opacidad de la información del juego** explica el porcentaje: afecta a textos y barras de ambas vistas; **100 % = totalmente visible**.

## OBS

**Modo Stream** conserva una sola simulación y dos regiones de captura. Los menús de herramientas y chat ocupan la franja reservada del operador; abrirlos o cerrarlos mantiene las dimensiones y posiciones de los juegos.

Se mantienen la calibración existente y sus valores guardados: desplazamiento lateral **0–16 px** (10 px por defecto) y franja inferior **72–148 px** (76 px por defecto). Los cambios deliberados de calibración deben realizarse antes de fijar los recortes de OBS.

## Chat de TikTok y pruebas

En **🧰 Herramientas** se encuentra **Probar comando**, para comprobar el recorrido local con `!guerrero`. Para una prueba real, inicia un LIVE público y pulsa **📡 TikTok**. El chat recibido se consulta en **💬 Chat**, con historial y exportación TXT.

El conector es no oficial. La conexión con un LIVE real requiere verificación en una emisión activa; las pruebas locales o simuladas no la sustituyen. La integración recibe texto; los regalos, likes y otros eventos sociales de las herramientas son simulaciones.

## Controles y desarrollo

WASD mueve a Prota, Espacio salta, E golpea y R activa su especial. En móvil se conserva el joystick y los gestos. Esc / P abre o cierra Pausa/Ajustes cuando no hay un menú que cerrar primero. Esc cierra primero las opciones abiertas y conserva Modo Stream.

El juego permanece en `index.html`; el puente usa `ws` y `tiktok-live-connector`, escucha solo en 127.0.0.1 y no pide contraseñas de TikTok.

```powershell
npm.cmd test
```

Para la regresión de menús en Chromium (dependencia de desarrollo):

```powershell
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Esta prueba arranca y cierra su propio servidor local; simula las respuestas de conexión a TikTok.

## Documentación

- [Notas de v0.2 y decisiones de la encuesta](docs/RELEASE-0.2-OPERADOR.md).
- [Operación de la composición dual](docs/DUAL-OPERADOR-TIKTOK.md).
- [Conexión inicial con TikTok LIVE y limitaciones](docs/TIKTOK-LIVE-MVP.md).
- [Registro de cambios](CHANGELOG.md).
- [Calibración y ajustes visuales de v0.1](docs/RELEASE-0.1-OBS.md).

La rama `main` conserva la edición HTML independiente. La edición con servidor y TikTok se mantiene en `feature/tiktok-live-chat-mvp`.

