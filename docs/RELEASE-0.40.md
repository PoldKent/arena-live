# Arena Live v0.40 — aplicación principal, PC y móvil unidos

## Fuente única

La versión principal del juego se encuentra en `main` y se ejecuta con el puente local TikTok LIVE en `http://127.0.0.1:4173/`. El paquete móvil no es otro juego ni una rama independiente: `tools/build-mobile.mjs` toma **el mismo `index.html`, `styles/arena-ui.css` y los cinco módulos `engine/` de la aplicación principal**, y solo añade los adaptadores `portable/` de interfaz, rendimiento y controles sin conexión. El motor no se copia a mano para mantener otra versión. El archivo oficial histórico v0.39 se conserva para poder retroceder.

Esta edición sincroniza `package.json`, `npm-shrinkwrap.json`, título, ajustes, API y recursos versionados en **v0.40.1**. Corrige la antigua constante `ARENA_RELEASE_VERSION` que todavía era v0.34.

## Cambios integrados

- Barra superior móvil de v0.36–v0.37: una única cápsula circular semitransparente arriba a la derecha (⏸, 🎛/🎮, 🧪 en Streamer, ☰, ⛶), no una fila de botones cuadrados.
- La arena OBS conserva la proporción 9:16 incluso en pantallas 9:20 o 9:21, con controles fuera del marco; al faltar espacio físico se reduce la visualización sin estirar el combate.
- Modo Jugador: elección persistente de **Táctil total** (dos pulgares, sin botones encima del juego) o **Joystick** (analógico original a la izquierda, Poder, Salto y Golpe recolocables en la franja inferior).
- Modo Streamer: las cinco habilidades originales permanecen y 🧪 abre un panel compacto con selector y opciones desplazables **fuera del 9:16**, también en pantalla completa. Los controles originales se trasladan sin clonar identificadores ni handlers.
- Se preserva una sola simulación, todas las clases, las dos capturas OBS, el puente TikTok, historial de comandos, paneles de pruebas, el guardado de ajustes y las reglas del juego.
- Para probar en PC el mismo paquete portátil, el servidor expone `/mobile` leyendo el artefacto generado en `dist/`; la interfaz principal sigue en `/`. Se añadió `verify:release` para ejecutar el conjunto de pruebas.

**`npm.cmd start` y `npm.cmd run dev` regeneran automáticamente el HTML móvil desde la fuente completa** antes de levantar el servidor, por lo que `/mobile` no depende de una versión anterior. `npm.cmd run build:mobile` sigue disponible para generar el archivo sin iniciar el servidor.

## Windows PowerShell

Necesitas Git y Node.js 20 o superior (recomendado Node.js 24).

Primera instalación:

```powershell
cd $HOME
git clone https://github.com/PoldKent/arena-live.git
cd arena-live
npm.cmd ci
npm.cmd start
```

Abre `http://127.0.0.1:4173/` (principal con TikTok LIVE) o `http://127.0.0.1:4173/mobile` (interfaz móvil con eventos simulados). El puente **solo** escucha en 127.0.0.1. Usa DevTools de Chrome (`F12`, `Ctrl+Shift+M`) para emular una pantalla de teléfono al abrir `/mobile`. La vista móvil no se conecta por sí sola a TikTok LIVE.

Para actualizar después:

```powershell
# Ctrl+C para detener el servidor antes de estos comandos.
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd start
```

Si Git informa cambios locales, guárdalos antes de continuar. No uses `git reset --hard` ni borres archivos para actualizar.

Para validar en otra consola:

```powershell
npx.cmd playwright install chromium
npm.cmd run verify:release
```

Esto ejecuta pruebas Node, reconstruye el móvil con la fuente oficial, comprueba navegador escritorio/móvil y prueba rendimiento. El HTML oficial se genera como `dist/Arena-Live-v0.40.1-movil.html`; también se incluye una copia versionada en `mobile-builds/Arena-Live-v0.40.1-movil.html`.


## Corrección posterior: fullscreen y disposición clásica v0.36–v0.37

- El 9:16 de la edición móvil vuelve a centrarse verticalmente, siguiendo la distribución de v0.36–v0.37. La cápsula superior permanece fuera del vídeo, y se reserva espacio inferior para Joystick/habilidades y el panel compacto de Pruebas.
- En pantalla completa móvil, Pruebas, Menú y Ajustes se alojan dentro del elemento fullscreen porque el navegador oculta los elementos hermanos. El vídeo nunca se estira a una proporción diferente de 9:16.
- En pantalla completa **del juego completo de PC**, el modo de una cámara ofrece accesos a 🧪 Pruebas, 💬 Chat, ⚙ Ajustes y ⤡ Salir. El panel elegido usa el **mismo elemento de DOM original** y sus eventos; al salir vuelve a su posición anterior. No se duplica el motor, el chat, los comandos ni la selección de jugador.
- En pantallas estrechas, el cajón de PC se desplaza a la parte inferior y reduce el espacio visible del vídeo, en lugar de ocultarse tras la vista fullscreen.
- Se añadieron pruebas Playwright para verificar visibilidad real del cajón tanto en móvil como en escritorio, y retorno de nodos al cerrar.
- Esta es una corrección de interfaz de v0.40, no una modificación de las reglas ni de las capturas OBS.

## Ajuste de usabilidad Streamer móvil: arena de tamaño constante

- Abrir 🧪 Pruebas **no modifica el ancho, alto ni posición** de la arena 9:16 (en pantalla normal y en pantalla completa). Se retiraron todas las reglas que cambiaban la cámara al abrir el panel.
- La arena se escala únicamente para dejar espacio permanente a la barra superior y a las cinco habilidades inferiores. Se aprovecha más altura que antes sin deformar la imagen.
- Las cinco habilidades originales (Kame, Rasen, Trueno, Enredadera y Coloso) deben estar siempre visibles en Modo Streamer; el panel avanzado nunca se sitúa encima de esa barra.
- En pantallas verticales pequeñas es físicamente imposible mostrar una arena 9:16 máxima, las cinco habilidades y todas las opciones avanzadas en franjas separadas de altura completa. Por ello, **Pruebas se superpone temporalmente a una parte de la imagen**, en una ventana compacta desplazable con botón minimizar, mientras la arena conserva exactamente su tamaño y los poderes permanecen accesibles.
- Se calcula el borde inferior del panel avanzado desde la posición real de los cinco poderes, en modo normal y fullscreen, y se vuelve a calcular al girar el dispositivo.
- La prueba móvil mide la geometría antes/después de abrir el panel y falla si cambia el tamaño de la cámara o se tapan los cinco poderes.

## Qué está comprobado y qué falta

Se comprobó que el HTML oficial es autocontenido, que sus scripts integrados no presentan errores de sintaxis y que su manifest apunta a los archivos fuente integrados. **Esto no confirma la interacción en Windows, Android o TikTok LIVE**. Las ejecuciones previas de GitHub Actions terminaron con fallo antes de ejecutar los pasos de prueba; son necesarias pruebas reales de Playwright y una sesión LIVE antes de considerar todas las funciones verificadas.

La meta de futuras mejoras es modificar `main` como **fuente única** y actualizar ambos productos derivados (servidor completo y exportación móvil oficial), sin publicar prototipos móviles como ramas funcionalmente divergentes.

## Corrección 0.40.1 · panel flotante y habilidades permanentes

Abrir 🧪 Pruebas nunca modifica las dimensiones del 9:16; en Modo Streamer los cinco poderes originales siguen visibles y accionables incluso con pruebas abiertas y en pantalla completa. El panel flotante se posiciona en relación con la fila real de poderes y no dentro del layout del video. El paquete móvil oficial es `mobile-builds/Arena-Live-v0.40.1-movil.html`.
