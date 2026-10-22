# Pantalla completa dual — Puesto de control del directo

Versión de prueba de Arena Live para la rama `feature/tiktok-live-chat-mvp`. **No modifica la rama `main` independiente de TikTok.**

## Abrir el puesto de control

1. En Windows, abre PowerShell en la carpeta del proyecto y ejecuta `npm.cmd install` (solo la primera vez, o si faltan dependencias) y `npm.cmd start`.
2. Abre `http://127.0.0.1:4173` en Chrome o Edge.
3. Pulsa **Dual · Pantalla completa + controles**, encima de las dos vistas del juego.
4. Para salir, pulsa **⤡ Salir** o `Esc`.

El modo dual usa el fullscreen nativo del navegador sobre **un único juego**. Mantiene a la vista tanto el lienzo 16:9 como el 9:16. Los controles no se montan sobre ninguno de los dos lienzos; ocupan una columna lateral independiente. En pantallas estrechas las dos vistas se colocan arriba y las herramientas abajo.

## Herramientas en la barra lateral

- **Controles rápidos**: Pausa/Continuar, Unirse como Prota, Nuevo lobby (con confirmación) y Revancha.
- **TikTok LIVE**: el mismo panel local de Conectar, Desconectar y Probar comando que existe fuera de fullscreen.
- **Chat TikTok · recibido**: mensajes **entrantes** del LIVE recibidos por el puente, incluidos los comandos que el motor decida limitar por antispam.
- **Herramientas de Prueba**: el panel completo de pruebas del juego, desplegable y desplazable.
- **Chat general y comandos manuales**: panel separado, también desplegable.

Son **los mismos controles**, movidos temporalmente de su sitio original sin duplicar los eventos. Al salir de fullscreen vuelven a su posición previa.

## Cómo se gestiona el chat

El puente local utiliza `@polkent.live` de forma predeterminada. Cada mensaje de TikTok que llega al puente de la página controladora se agrega primero a la bandeja **Chat TikTok · recibido** y después se envía a `ArenaLive.sendChat()` para que el motor lo procese con sus reglas normales.

- Hasta **450 mensajes recientes** se dibujan simultáneamente en pantalla para mantener la fluidez del navegador. **Anteriores** permite consultar tramos más antiguos; **Directo** vuelve a los recientes.
- Se conserva un historial **en memoria durante la sesión**, hasta **50 000 mensajes recibidos**. Si se supera ese límite, los más antiguos dejan de estar en memoria y aparece un contador de lo descartado.
- **↓ TXT** exporta a un archivo local los mensajes aún conservados en memoria.
- Esto permite ver **todos los mensajes que efectivamente entregue el puente** dentro del límite de la sesión, incluso si alguno no genera una acción de juego. No significa que TikTok garantice entregar todos los comentarios a un conector no oficial.
- **No envía mensajes de vuelta al chat público de TikTok.** El panel es de lectura; para escribir en la sala oficial se requieren otras capacidades y autorizaciones. Los mensajes del juego aparecen en el chat de Arena Live, no en TikTok.

## Para OBS y TikTok LIVE Studio

Este fullscreen dual es una **consola de operación local**. Si capturas **toda la pantalla** por OBS, también aparecerá la barra lateral. Para transmitir **solo el juego** hay que capturar o recortar el lienzo correspondiente; las salidas independientes para OBS con una sola partida sincronizada siguen siendo un desarrollo separado.

No abras dos pestañas independientes del juego para crear las dos transmisiones: serían **partidas distintas**. El puente actual entrega el chat a una única pestaña controladora.

## Validaciones realizadas

- Chromium a 1920×1080, 1280×720 y móvil 390×844: ambas proporciones correctas, sin solapar los controles; restauración al salir; compatibilidad con el fullscreen individual.
- 810 mensajes de TikTok simulados: 450 visibles, navegación por el historial y exportación completa de los 810, incluso con comandos repetidos antispam.
- Se comprobaron pausa, autoaudiencia, traslado del panel de conexión, apertura de ajustes y funcionamiento de ocho traducciones desde el mismo HTML.
- Pruebas de normalización Node.js y comprobaciones sintácticas de los scripts sin errores.

**Pendiente:** prueba con un TikTok LIVE real; la recepción utiliza una biblioteca no oficial y puede cambiar si TikTok modifica su servicio.
