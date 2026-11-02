# Completar las pruebas en tu equipo

La versión del juego sigue siendo **0.42.0**. Windows y Linux en CI validan el código; el teléfono, la GPU del equipo y una sesión real de TikTok/OBS necesitan evidencia de esos entornos.

## 1. Informe del PC

Detén el servidor con Ctrl+C y actualiza dentro de tu carpeta habitual:

```powershell
git pull --ff-only origin main
npm.cmd ci
npm.cmd start
```

Deja el servidor abierto. En otra ventana de PowerShell, dentro de esa misma carpeta, ejecuta antes de emitir:

```powershell
npm.cmd run test:device -- --install-browser
```

La opción instala Chromium solo si falta. La carga abre un navegador de prueba con la simulación de 128 peleadores y ambas capturas; reutiliza las pruebas existentes. El servidor de tu partida recibe únicamente un `GET /api/status`: el comando no conecta, desconecta ni envía eventos TikTok.

El resultado se guarda en una subcarpeta nueva de `reports/device/` y muestra la ruta completa. Cada ejecución conserva su propio informe:

| Archivo | Contenido |
| --- | --- |
| `diagnostico.json` | Versión, huellas de los archivos, integridad del HTML móvil, entorno, estado local y resumen de la carga |
| `carga-gpu.json` | Mediciones y adaptador reportado por el navegador de prueba, cuando la carga termina |
| `carga-gpu.log` | Salida de la carga, incluyendo el motivo si falla |
| `browser-install.log` | Instalación del navegador, solo cuando fue necesaria |

Para empezar a revisar tu equipo, comparte `diagnostico.json`. El estado del puente excluye cuenta, mensajes, identificadores de sala y errores crudos.

Durante una emisión puedes recoger el estado y verificar archivos sin ejecutar la carga:

```powershell
npm.cmd run test:device -- --skip-gpu
```

Para otra carpeta de informes o un puerto local distinto:

```powershell
npm.cmd run test:device -- --output "P:\Informes Arena" --port 4173
```

`load.status: passed` confirma la carga automatizada de esa ejecución. `rendererType: software` identifica un adaptador de software reportado; revisa también `canvas2d`, `compositing` y `rasterization`. Un adaptador reportado por este navegador de prueba no certifica la aceleración del navegador que usas para emitir.

`bridge.status: unavailable` indica que no pudo observar el servidor en ese puerto. `matchesSourceVersion: false` identifica un servidor de otra versión. `mobile.status: source-mismatch` identifica diferencias entre la descarga y las fuentes, incluso cuando el número de versión coincide; conserva los cambios locales para revisar el informe.

## 2. Navegador y Android físico

En el PC que emite, abre `chrome://gpu` en Chrome o `edge://gpu` en Edge y anota el adaptador y los estados de Canvas, Compositing y Rasterization. En Arena, carga 128 peleadores y, después de un minuto, usa **Ajustes → Sesión y rendimiento → Exportar diagnóstico**. Adjunta `arena-live-diagnostico.json` junto al informe del comando.

En el teléfono usa la [web](https://poldkent.github.io/arena-live/) o la descarga HTML de la versión actual. Registra modelo de teléfono, navegador, resolución y límite de FPS seleccionados, además del resultado de estas pruebas:

| Prueba | Resultado que comprobar |
| --- | --- |
| Juego y audio | Primero 32 y después 128 peleadores; movimiento, golpes y audio tras activarlo con un toque |
| Multitáctil | Mantener el joystick mientras golpeas, saltas y lanzas el poder de cada clase con energía y recarga listas |
| Editor | Distribuciones independientes de Jugador/Streamer; arrastrar durante edición solo acomoda controles; copiar pide confirmación |
| Navegación | Girar, entrar/salir de pantalla completa y cerrar Ajustes con X o Atrás conserva la partida |
| Persistencia | Recargar conserva perfil y distribuciones; pasar a segundo plano y volver permite continuar |
| Visor local | Abrir el HTML desde el administrador de archivos y comparar con la web si el visor limita la ejecución o las descargas |

Exporta también el diagnóstico desde Ajustes del teléfono. Las pruebas táctiles emuladas del PC no sustituyen esta comprobación.

## 3. TikTok LIVE real

Usa la app local en `http://127.0.0.1:4173/` y tu sesión LIVE. Comprueba un tap de ingreso permitido, selección de clase y uso de un poder mediante comentarios reales, verificando identidad y ausencia de duplicados. En duelo, verifica el cierre de entradas nuevas. Desconecta y vuelve a conectar desde la interfaz y comprueba que los eventos nuevos llegan sin reproducir el historial anterior.

El estado `connected` del informe confirma solo la conexión observada. Los eventos y la reconexión siguen como pendientes hasta comprobar ese recorrido real.

## 4. OBS en el equipo de emisión

Configura ambas capturas de la misma instancia en **Modo Stream**, según [la guía dual](DUAL-OPERADOR-TIKTOK.md). Con 128 peleadores, comprueba texto, poderes y bordes de la vista vertical. Abrir herramientas o Ajustes debe conservar los rectángulos de captura y la calibración. Graba una muestra y guarda las estadísticas de OBS, incluyendo pérdidas por renderizado o codificación.

El informe mantiene las cuatro comprobaciones manuales en `pending`; no las marca como aprobadas a partir de un test automatizado. Estos resultados permitirán cerrar cada pendiente con evidencia real.
