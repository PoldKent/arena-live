# Arena Live 0.41.0 · correcciones de auditoría

Una sola rama `main`, un motor compartido y dos entregas: servidor local con TikTok/OBS y HTML móvil offline. No cambia las cifras de daño, la narrativa de las clases ni la cadena de rivalidades.

## Correcciones

- **Carga:** la API vuelve a definir exportación/importación de configuración. Se mantiene el esquema 1 y las claves existentes, incluyendo migración del antiguo panel Jugador objetivo; no vuelven los botones manuales retirados. Importar conserva perfiles de espectadores y restaura formato OBS y las cuatro velocidades, incluida 0.5×.
- **Móvil:** varias tareas de dibujo podían pedir `history.back()` antes del primer `popstate`, abandonando el archivo al cerrar Ajustes, menú o inicio. Ahora hay una sola navegación pendiente; el retorno programático no cierra una herramienta nueva.
- **Editor:** posiciones y tamaños separados para Jugador y Streamer, copia explícita con confirmación y sin referencias compartidas. Streamer permite editar aunque se haya elegido Táctil total en Jugador. Mientras se edita, arrastrar o tocar no mueve, salta ni lanza poderes. La disposición se mantiene dentro de la pantalla al girar; no cambia la resolución ni proporción del juego.
- **Poder:** icono ligado a la clase real, incluido Espíritu; muestra y respeta energía, recarga y bloqueo con el validador del motor. La política Participación libre conserva su comportamiento. No modifica costes, espera ni daño para simular que un botón funciona.
- **Escenarios:** cargar un escenario crea el roster en lobby y recupera después el estado de combate. Ya no se queda vacío por el cierre de entradas del duelo anterior. Las entradas LIVE en un duelo real siguen cerradas.
- **Pantalla completa:** la captura inactiva puede abrirse en fullscreen, las herramientas originales permanecen visibles y el encabezado vacío deja de interceptar los botones en la vista ampliada Android.
- **TikTok:** un tap confirma a un participante que ya está peleando en el duelo sin permitir nuevos ingresos ni curaciones de unión duplicadas.
- **Entrega:** la prueba compara la descarga existente con una generación temporal, sin regenerar primero el archivo comprobado. El despliegue Pages depende de Node, navegador, móvil y carga en Windows y Linux; si fallan, no reemplaza la web publicada.
- **Herramientas de medición:** rendimiento sirve los seis módulos, incluido el motor extraído, y registra sus huellas. El estudio de equilibrio conserva todos los argumentos de daño, incluida su dirección. Se comprueban determinismo, independencia entre escenarios y paridad con el motor sin telemetría.

## Equilibrio medido

Muestra de **2.400 partidas**: 1.000 duelos con poderes, 1.000 sin especiales y 400 partidas multitudinarias. Se cruzan lado/orden en los duelos y cinco rotaciones por semilla en las arenas. Las clases se reparten por igual en 5/10/25/125; 128 se utiliza en rendimiento, no como reparto perfectamente divisible entre cinco. Se usa el ritmo inicial 0.75×, vida 360 HP y movimiento 0.5×. Cada partida tiene hasta 180 segundos de reloj virtual a 60 pasos/s; el ritmo sigue aplicándose a la física.

| Clase | Duelo con poderes | Inicio 5 | Inicio 10 | Inicio 25 | Inicio 125 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Guerrero | 54.5 % | 21 % | 23 % | 12 % | 13 % |
| Shinobi | 52 % | 24 % | 30 % | 24 % | 20 % |
| Titán | 42.5 % | 17 % | 12 % | 18 % | 20 % |
| Rayo | 49 % | 21 % | 18 % | 24 % | 23 % |
| Espíritu | 52 % | 17 % | 17 % | 22 % | 24 % |

Los intervalos al 95 % y las semillas están en [el resumen](balance-v0.41-summary.json) y los resultados en [el archivo CSV comprimido](balance-v0.41-matches.csv.gz). Son **partidas completas con transiciones**, no tasas aisladas de cada fase. No incluyen Prota, apoyos ni reingresos. Las arenas tienen 100 partidas por tamaño; las rotaciones de una misma semilla están correlacionadas y el intervalo usa remuestreo de semillas completas.

Los resultados aún muestran diferencias: Titán queda por debajo en los duelos y Guerrero en las multitudes mayores. Esta entrega actualiza la evidencia del menú, conserva los valores existentes y permite decidir ajustes posteriores con datos actuales. No declara que cada clase gane exactamente lo mismo ni nerfea basándose en la muestra piloto.

## Rendimiento y límites

Se ejecutan escenarios de 32/64/128, ráfagas de especiales, presupuestos de efectos, ambas capturas Full HD y chat. Se guardan [las mediciones de software](performance-v0.41.json) y [la ejecución sin desactivar GPU](gpu-v0.41.json). El entorno disponible identifica **SwiftShader**: no es una GPU física.

En la muestra de software, la simulación con 128 tuvo una mediana aproximada de 2.1 ms y el dibujo de ambas capturas 46.0 ms con lectura del ráster. Es un cuello de botella de dibujo en este entorno, no una promesa de FPS para un PC o teléfono. La ejecución sin `--disable-gpu` mide envío de comandos sin esperar a la GPU: sus tiempos no se comparan como una mejora de FPS frente al ensayo con lectura.

El móvil conserva 540/720/1080p, 30/60 FPS de dibujo y simulación a 60 pasos/s; el servidor mantiene las dos capturas nativas 1920×1080 y 1080×1920. El navegador gestiona la aceleración compatible y conserva la ruta segura de software.

## Validación automatizada

176 comprobaciones Node, 130 de navegador de escritorio, 34 móviles y 6 del editor; 21 de carga y 21 con GPU sin desactivar (el entorno sigue siendo software). El [registro de validación](validation-v0.41.json) identifica alcance y huella exacta del HTML móvil probado. Las cuatro comprobaciones de empaquetado web están incluidas en Node. El workflow de publicación vuelve a ejecutar los controles requeridos en Windows y Linux antes de desplegar.

## Actualizar y probar

Detén el servidor con Ctrl+C. Dentro de tu carpeta habitual:

```powershell
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd start
```

La app principal abre en `http://127.0.0.1:4173/`; `/mobile` usa el HTML generado automáticamente. La [web de prueba](https://poldkent.github.io/arena-live/) selecciona móvil o escritorio. El móvil y Pages no reciben TikTok LIVE directamente: ese flujo necesita el servidor local.

Para ejecutar los controles completos:

```powershell
npx.cmd playwright install chromium
npm.cmd run verify:release
```

La exportación oficial es `mobile-builds/Arena-Live-v0.41.0-movil.html`; el generador también puede crear `dist/Arena-Live-v0.41.0-movil.html`. Los cambios locales y `package-lock.json` deben conservarse al actualizar.

## Comprobaciones externas pendientes

Android físico (incluido `content://`, multitáctil, audio, orientación y suspensión), una GPU física, TikTok LIVE real y OBS en el equipo de transmisión requieren verificación en esos entornos. Las pruebas locales y CI no equivalen a esas comprobaciones. La modularización adicional del motor se hará por subsistemas con esta línea base; el choque básico frente a especial sigue siendo una decisión de diseño separada.
