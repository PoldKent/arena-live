# Arena Live v0.5 · revisión y rendimiento

> Documento histórico. La versión vigente y las instrucciones actuales están en [Arena Live v0.6](RELEASE-0.6-UNIFICADA.md) y en el [README](../README.md).

Fecha: 23 de octubre de 2026. Base comparada: main v0.4, commit `ce1b596`.

## Revisión del historial

Se revisaron el historial de ambas ramas y sus hitos de código: entrega inicial, v0.1, v0.2, v0.3, v0.4 y su integración en main. Se compararon funciones de simulación, selección, renderizado, cámara, admisión, eventos, persistencia y puente; se midieron cargas de 32, 64 y 128 luchadores. Los commits repetidos de documentación no representan motores diferentes.

| Entrega | Resultado de la comparación |
| --- | --- |
| Inicial, `2444ddf` | Ya contenía el selector que ordenaba rivales para cada luchador y separación contra todos los cuerpos. |
| v0.1, `a79fa45`, y main antiguo `c505cb8` | Incorporan catálogo individual de 128 y cambios de OBS/HUD. Mantienen el selector costoso. |
| v0.2, `98fe79d` | Cambia barra y menús; conserva las rutas principales de simulación y dibujo de v0.1. |
| v0.3, `0bb283b` | Cambia los espacios de trabajo; conserva aquellas rutas del motor. |
| v0.4, `9c29235`, integrada en `ce1b596` | Añade reglas. Cada admisión también refresca todos los controles de reglas. |

El límite seguía siendo 128: no había un límite nuevo de 32. Las mediciones no permiten atribuir toda la diferencia percibida en Windows/OBS a una única versión. Sí muestran trabajo repetido que crece muy rápidamente con la población, más actualizaciones de interfaz durante admisiones y ráfagas de chat.

## Cambios del motor y de la interfaz

- **Objetivos:** dos recorridos lineales sustituyen ordenar los rivales de cada actor. Se comparan distancias al cuadrado y se conserva el rival de clase más cercano, el criterio de vida del Titán, el alcance y los desempates por orden. Las pruebas contrastan el resultado con el selector publicado en escenas aleatorias hasta 128 cuerpos.
- **Separación:** se descartan cuerpos lejanos antes de calcular raíces. El orden secuencial de empujes permanece igual.
- **Escenarios y perfiles:** los lotes mantienen el modo y los cupos en el motor y actualizan HUD, objetivos y ajustes al terminar. También se corrige cargar otro escenario durante combate: la puerta de inscripción del duelo final estaba rechazando los primeros cuerpos del escenario. Los mensajes normales siguen sujetos a esa puerta.
- **Dibujo:** ambas salidas comparten un solo orden de profundidad. En preparación se dibuja la vista visible; al alternar se pinta el estado actual. Stream sigue dibujando simultáneamente ambas capturas de la misma simulación.
- **Rótulos:** dos pequeñas entradas de medidas por luchador, liberadas con el roster mediante WeakMap. Se renuevan al cambiar nombre, contador de vidas, tamaño o fuente. El texto se sigue dibujando de forma nativa y vida/energía permanecen dinámicas.
- **HUD del duelo:** escribe nombres, porcentajes y barras cuando sus valores cambian, reduciendo notificaciones al observador de idiomas.
- **Chats:** inserción y procesamiento de comentarios inmediatos; scroll y contadores agrupados por cuadro. Recibir un mensaje ya no redistribuye un estado de conexión que no cambió. Se conservan historial, exportación, pestañas, comandos y seguimiento automático.
- **Cambio de escenario/ronda:** limpia poderes y globos de cuerpos anteriores. Un identificador de ronda impide que un temporizador de victoria viejo sustituya al nuevo combate o al lobby.
- **Avisos K.O.:** su registro suelta las referencias a elementos retirados al terminar los 2,7 segundos de visualización.

Las funciones de selección, actualización del roster, geometría del escenario, rótulos y sincronización del HUD quedan separadas dentro del HTML existente. La geometría del escenario fue trasladada literalmente a una función propia. Se mantiene la entrega monolítica compatible con los manejadores existentes.

Se conservan los 128 jugadores, clases, poderes, apoyos, límites de efectos, controles, simulación fija de 60 Hz, idiomas y geometría/calibración OBS. Permanecen `arenaLiveCombatRulesV04`, `arenaLiveObsCalibrationV01`, perfiles y distribuciones v0.3; la versión visible y el paquete avanzan a 0.5/0.5.0.

## Mediciones reproducibles

Medias en Chromium 153.0.8010, Node 24.19.0, viewport 1720×720, GPU desactivada. Las cargas usan el mismo generador aleatorio, ambas capturas activas y poblaciones constantes para aislar persecución/separación; las ráfagas de poderes se verifican aparte. Son costes locales por paso, no una medición de FPS de OBS ni de un LIVE real.

| Jugadores | Simulación v0.4 / paso | Simulación v0.5 / paso | Preparar escenario v0.4 | Preparar escenario v0.5 |
| --- | --- | --- | --- | --- |
| 32 | 0.47 ms | 0.12 ms | 38.9 ms | 6.5 ms |
| 64 | 1.89 ms | 0.18 ms | 67.6 ms | 4.7 ms |
| 128 | 8.03 ms | 0.60 ms | 126.0 ms | 7.4 ms |

El coste de simulación con 128 baja aproximadamente 13.4× en esta ejecución. La selección de objetivos pasa de 7.34 a 0.39 ms para el conjunto de actores y preparar el escenario de 126.0 a 7.4 ms. El dibujo conjunto, incluyendo rasterización y lectura de ambos lienzos, pasa de 22.26 a 21.86 ms de media. El dibujo sigue siendo un coste relevante y estas pruebas de rasterización por software no garantizan 60 FPS en todos los equipos. Falta comprobar la fluidez final en el PC del operador con OBS y el navegador habitual.

El [registro JSON](performance-v0.5.json) incluye medias, mediana, percentil 95, hashes de los dos HTML y entorno. Los tiempos tienen variación normal; no se fijan umbrales de FPS que dependan del equipo.

## Verificación

- `npm test`: 23/23, incluida equivalencia de selección con el comportamiento anterior y empates/alcance.
- `npm run test:browser`: 33/33, sin errores de JavaScript; paneles, chats, reglas, pausa, móvil, ocho idiomas y capturas estables en 1720×720 y 3440×1440.
- `npm run test:performance`: 11/11; 32/64/128, escenarios en combate, captura oculta/alternancia/dual, renovación de rótulos/fuentes, HUD estable, poderes autónomos, efectos acotados y liberación de avisos.
- Ráfaga de 500 recibidos: 450 visibles según el límite existente, comandos diferenciados y seguimiento al último; cero redistribuciones de estado de conexión por esos mensajes.
- Revisión visual de Stream con 128 y de las pantallas de escritorio/móvil.

Para repetir: instalar Chromium con `npx.cmd playwright install chromium` y ejecutar los tres comandos anteriores. Opcionalmente `ARENA_PERF_BASELINE` apunta a un index.html previo y `ARENA_PERF_REPORT` al JSON de salida. El test inicia/cierra su servidor de prueba y no conecta a TikTok real.

## Actualizar y comprobar en Windows

Detener el servidor con Ctrl+C. Desde la carpeta del proyecto ejecutar `git pull --ff-only origin main`, `npm.cmd install` y `npm.cmd start`; detenerse ante un error. Recargar con Ctrl+F5 y comprobar v0.5 en Ajustes.

Para una comparación en el equipo: Pruebas → Escenario → 32/64/128 → Cargar; iniciar combate, probar poderes y entrar en Stream con los mismos recortes OBS. Se conservan las dos regiones y los parámetros de calibración guardados.
