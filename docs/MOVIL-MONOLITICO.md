# Arena Live · móvil autónomo (fuente 0.40.7)

El **móvil offline** es un archivo HTML compilado desde `main`: no es una segunda rama, otro motor de combate, una APK ni un cliente TikTok LIVE autónomo. La exportación conserva el combate de la aplicación PC y añade únicamente adaptadores de interfaz y controles.

## Estado de la distribución

- **Fuentes actuales:** `package.json` versión **0.40.7**.
- **Exportación móvil oficial:** [v0.40.7](../mobile-builds/Arena-Live-v0.40.7-movil.html), generada desde `main` con el banner unificado.
- **Para regenerar la versión 0.40.7:** ejecuta `npm.cmd run build:mobile` y comprueba `dist/Arena-Live-v0.40.7-movil.html`.
- `npm.cmd start` o `npm.cmd run dev` también compilan el móvil durante el paso `prestart`/`predev` y lo muestran en http://127.0.0.1:4173/mobile.

La generación utiliza `index.html`, `styles/arena-ui.css`, los seis scripts `engine/` y `portable/mobile-*`. Incluye los scripts y CSS completos; no descarga paquetes externos. Cada compilación añade información de los archivos fuente para identificarla. El exportador exige **500.000 bytes como máximo** y verifica la descompresión sin pérdida. **El límite es un contrato del generador, no una validación actual de todos los teléfonos.**

## Abrir en Android

1. Genera el archivo desde una copia actualizada de `main`.
2. Copia el HTML al teléfono.
3. Abre con Chrome u otro navegador que admita archivos HTML locales y JavaScript. Las vistas previas del gestor de archivos pueden mostrar el texto del código en vez de ejecutarlo.
4. Configura luchadores, clase, escenario y si incluir a Prota; inicia la pelea.

Algunos visores `content://` no permiten pantalla completa nativa, almacenamiento persistente o la ejecución del HTML. La interfaz ofrece una vista ampliada cuando el navegador lo permite, pero **no puede ocultar las barras de Android si el sistema no concede pantalla completa**.

## Modos y controles

- **Modo Jugador:** controla a Prota. Puedes utilizar Táctil total o Joystick, según lo seleccionado y disponible.
- **Modo Streamer:** interfaz de dirección y pruebas con cinco habilidades originales, selector y panel móvil. Se conserva el identificador interno `director` para no romper preferencias guardadas.
- La arena vertical mantiene proporción **9:16**. La barra superior y las habilidades tienen espacio propio; el panel de pruebas es flotante y desplazable.
- Los botones de dirección y acción admiten ajustes de posición/tamaño. El joystick y los gestos táctiles deben probarse en el dispositivo de destino.

La configuración móvil conserva claves y preferencias del juego principal; los valores locales pueden no persistir cuando el navegador bloquea almacenamiento.

## Rendimiento y pruebas

La exportación puede comenzar con 720p, 30 FPS de dibujo y calidad Rendimiento; se puede elegir 540p/1080p o 60 FPS según el equipo. La simulación conserva el paso del motor y **el límite de dibujo no garantiza FPS reales**. En teléfonos lentos prueba **540p y 30 FPS** antes de reducir el número de luchadores.

```powershell
npm.cmd test
npm.cmd run build:mobile
npx.cmd playwright install chromium
npm.cmd run test:mobile
```

Estas pruebas utilizan navegador emulado y simulación local; no sustituyen Android físico, Safari/WebKit, una emisión OBS ni un LIVE real. TikTok, sus eventos y el servidor local se prueban por separado.

[README principal](../README.md) · [Controles v0.40](MOBILE-CONTROLES-V040.md) · [Pruebas y riesgos de la auditoría](AUDITORIA-INTEGRAL-2026-10-29.md)
