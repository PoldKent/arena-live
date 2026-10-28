# Arena Live v0.40 — aplicación principal, PC y móvil unidos

## Fuente única

La versión principal del juego se encuentra en `main` y se ejecuta con el puente local TikTok LIVE en `http://127.0.0.1:4173/`. El paquete móvil no es otro juego ni una rama independiente: `tools/build-mobile.mjs` toma **el mismo `index.html`, `styles/arena-ui.css` y los cinco módulos `engine/` de la aplicación principal**, y solo añade los adaptadores `portable/` de interfaz, rendimiento y controles sin conexión. El motor no se copia a mano para mantener otra versión. El archivo oficial histórico v0.39 se conserva para poder retroceder.

Esta edición sincroniza `package.json`, `npm-shrinkwrap.json`, título, ajustes, API y recursos versionados en **v0.40.0**. Corrige la antigua constante `ARENA_RELEASE_VERSION` que todavía era v0.34.

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

Esto ejecuta pruebas Node, reconstruye el móvil con la fuente oficial, comprueba navegador escritorio/móvil y prueba rendimiento. El HTML oficial se genera como `dist/Arena-Live-v0.40.0-movil.html`; también se incluye una copia versionada en `mobile-builds/Arena-Live-v0.40.0-movil.html`.

## Qué está comprobado y qué falta

Se comprobó que el HTML oficial es autocontenido, que sus scripts integrados no presentan errores de sintaxis y que su manifest apunta a los archivos fuente integrados. **Esto no confirma la interacción en Windows, Android o TikTok LIVE**. Las ejecuciones previas de GitHub Actions terminaron con fallo antes de ejecutar los pasos de prueba; son necesarias pruebas reales de Playwright y una sesión LIVE antes de considerar todas las funciones verificadas.

La meta de futuras mejoras es modificar `main` como **fuente única** y actualizar ambos productos derivados (servidor completo y exportación móvil oficial), sin publicar prototipos móviles como ramas funcionalmente divergentes.
