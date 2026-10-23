# Arena Live v0.2 — barra del operador y pausa

> Documento histórico. La versión vigente y las instrucciones actuales están en [Arena Live v0.6](RELEASE-0.6-UNIFICADA.md) y en el [README](../README.md).

22 de octubre de 2026. Edición TikTok.

## Decisiones confirmadas por el usuario

1. **Abrir Ajustes pausa; cerrar reanuda.**
2. **Cada acción oculta su menú**, también en herramientas, chat y calibración.
3. **Audio, TikTok, Prota, Revancha, Lobby y Pausa** tienen acceso directo en la barra.

Estas decisiones sustituyen la separación entre ajustes generales y la pestaña Streamer, así como los controles independientes de Ajustes LIVE.

## Interfaz

- Una barra horizontal compartida entre preparación y Modo Stream, con iconos, nombres cortos, estados y ayudas.
- **🎥 Modo Stream** sustituye «Dual · Pantalla completa + controles». Su acceso también está dentro de Pausa/Ajustes.
- **Vista** concentra el cambio 16:9/9:16; **Pantalla** concentra las pantallas completas individuales.
- **Herramientas** y **Chat** despliegan las opciones en la zona reservada al operador.
- Partida, Prota y combate, Pantallas y OBS, Audio e idioma, Audiencia y chat comparten el mismo menú.
- El 85 % se identifica como **Opacidad de la información del juego** y explica a qué afecta.
- El botón TikTok refleja la disponibilidad del puente y su fase real; acciona Conectar o Desconectar según corresponda.
- La versión visible y la API pasan a **0.2 / 0.2.0**.

## Cierre de menús

Los botones se aplican y después cierran el menú. Las casillas y selectores cierran al confirmar el cambio. Los deslizadores actualizan mientras se mueven y cierran al terminar el gesto; escribir en un campo no cierra el panel antes de enviar. Esc cierra primero el menú abierto, incluso dentro de Modo Stream.

Ocultar no reconstruye controles: mantiene historial, valores y objetivo seleccionado. Abrir o cerrar opciones no crea otro motor, controlador de chat o partida.

## Calibración preservada

Se conserva la clave de almacenamiento de v0.1, los valores personalizados y los límites existentes. En ultrawide continúan la barra de 34 px, el pie de 76 px por defecto y la vista vertical al extremo derecho. Los menús se sitúan dentro de las franjas del operador. Ajustar expresamente la calibración puede modificar las regiones de captura.

## Verificación

`npm.cmd test` ejecuta las regresiones existentes de normalización, identidad, estructura, vistas y versión. La comprobación de navegador cubre pausa/reanudación, cierre tras botones/selectores/deslizadores, clase de Prota, herramientas, envío de chat, acciones de conexión con respuestas simuladas, calibración y entrada/salida de Modo Stream.

Una prueba con respuestas simuladas no valida un LIVE real. La recepción y latencia reales se comprueban con una emisión activa de @polkent.live.

Prueba de navegador repetible, después de `npm.cmd install`:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Usa el puerto local 4175 y un perfil temporal de Chromium. `ARENA_TEST_PORT` permite cambiar el puerto. Para entornos sin acceso al CDN puede utilizarse `ARENA_TEST_CSS` con Tailwind compilado; `ARENA_BROWSER_EXECUTABLE` permite seleccionar un Chromium instalado.

## Actualización Windows

Detén Arena Live con Ctrl+C. En `P:\Arena_Live_GitHub`, sobre `feature/tiktok-live-chat-mvp`:

```powershell
git pull --ff-only
npm.cmd install
npm.cmd start
```

Abre http://127.0.0.1:4173/, pulsa Ctrl+F5 y comprueba v0.2 en Ajustes.
