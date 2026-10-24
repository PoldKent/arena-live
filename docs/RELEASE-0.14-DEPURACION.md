# Arena Live v0.14 · Depuración y carga con 128 peleadores

La entrega continúa en `main`, con una sola aplicación y el servidor habitual en 4173. Conserva TikTok, el radar pentagonal, las reglas y potencias de clase, los comandos visibles, los paneles, las preferencias guardadas y la calibración OBS.

## Limpieza verificada

- Retiradas doce funciones antiguas: accesos de interfaz sin llamadas, el refuerzo del personaje cooperativo que ya no podía crearse y la actualización que vaciaba tarjetas de HUD permanentemente ocultas.
- Eliminados los dos contenedores ocultos de esas tarjetas, sus leyendas, la animación del antiguo ticker, constantes sin referencias y la descripción de modo cuyo elemento ya no existía.
- Retirados 32 selectores CSS anteriores sin uso. El [registro de limpieza](cleanup-v0.14.json) identifica los nombres y el alcance del análisis.
- Conservados la API de integración, sus campos de datos y los documentos históricos. El análisis de referencias no se utiliza para borrar controles que se invocan mediante atributos HTML, eventos o adaptadores.

Los estilos de utilidades se entregan generados en `styles/arena-ui.css`. El navegador deja de descargar y ejecutar el compilador Tailwind y de observar las modificaciones del chat para generar CSS. Se utiliza la misma versión 3.4.17 para generar el archivo; su licencia está incluida. Para cambiar clases, ejecutar `npm.cmd run build:styles` y guardar el CSS generado. El inicio normal no ejecuta esa compilación.

## Trabajo durante cada paso y fotograma

La separación de cuerpos usa bucles directos, con el mismo orden secuencial y las mismas operaciones de empuje. La selección de blancos limitados conserva las distancias euclidianas y los empates estables; calcula cada distancia una vez y mantiene únicamente los uno, dos o tres candidatos necesarios.

La retirada de partículas, textos y poderes recorre cada lista una vez y conserva el orden de los supervivientes. Los límites siguen siendo 1.800 partículas, 240 efectos y 120 textos flotantes. La física sigue a 60 Hz.

Ambas capturas reutilizan una lista de profundidad y un único tiempo de animación. Los símbolos de bonificaciones reutilizan hasta 64 listas de estado, en vez de crear nueve listas pequeñas por cada cuerpo y captura. Los nombres y clases mantienen la línea base del texto aunque aparezcan esos símbolos; cargar fuentes, renombrar o cambiar clase/idioma sigue actualizando las etiquetas.

El selector de objetivo conserva sus nodos y la selección válida; al eliminar un participante retira su opción. El HUD evita volver a escribir valores y clases que no cambiaron. Las pruebas de chat esperan al fotograma en el que se aplica el desplazamiento agrupado.

## GPU y resolución

Los lienzos opacos usan Canvas 2D con `alpha:false` y `willReadFrequently:false`. El juego no lee píxeles durante la emisión. La elección de rasterizar en GPU o CPU corresponde al navegador y al dispositivo: estos parámetros favorecen el dibujo sin solicitar optimizaciones para lecturas frecuentes. Se conservan **1920 × 1080** y **1080 × 1920**, el mismo mundo lógico y las dos capturas sincronizadas.

La [especificación de Canvas](https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently) explica la elección entre GPU y CPU. La documentación de [optimización de Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) describe el contexto opaco. Los estilos precompilados siguen la [instalación de Tailwind 3](https://v3.tailwindcss.com/docs/installation).

```powershell
npx.cmd playwright install chromium
npm.cmd run test:gpu
```

`test:gpu` deja la configuración gráfica predeterminada de Chromium y muestra el estado real de Canvas 2D, composición y renderer mediante CDP. Sus tiempos de dibujo miden envío de comandos; no esperan la finalización de la GPU ni equivalen a FPS. El [diagnóstico de este entorno](gpu-v0.14.json) informa `unavailable_software` y SwiftShader: aquí no se valida una GPU física. La prueba no comprueba las preferencias del perfil de Chrome o de OBS del usuario.

El control `test:performance` desactiva la GPU e incluye lectura de píxeles para terminar el rasterizado. [Resultados completos](performance-v0.14.json), incluidos media, mediana y percentil 95. Los tiempos de ambos comandos miden trabajos distintos y no se deben comparar como si fueran aceleración GPU.

## Validación

- 57 pruebas de Node: estados, selección de blancos, reglas, rivalidades, geometría, caducidad estable y correspondencia del CSS generado.
- 65 pruebas de navegador: interfaz local, ocho idiomas, Stream/móvil, persistencia, TikTok simulado, comandos, poderes, daño, radar y capturas OBS.
- 18 comprobaciones de carga por software y las mismas 18 con configuración gráfica predeterminada, sin errores. Incluyen 32/64/128 peleadores, una ráfaga con los 128 a energía completa, efectos acotados y 500 comentarios.
- Coincidencia exacta de los estados completos de peleadores, partículas, textos, efectos y cámara frente a v0.13, en los tres tamaños y tras 180 pasos de la ráfaga.
- 200 partidas completas reproducen exactamente sus registros de la muestra v0.12: 160 duelos con/sin poderes y 40 partidas de 5/10/25/125 peleadores, con semillas 3000 y 3001. Es una comprobación de paridad, no un nuevo ajuste de equilibrio.

El [registro de validación](validation-v0.14.json) conserva las condiciones y huellas de fuente. La medición por software no demuestra un aumento general de FPS ni sustituye una prueba en el PC del usuario con OBS. La integración TikTok se comprueba con eventos simulados; no se abre una emisión LIVE real. La versión 0.14 aparece en el pie de Ajustes; paquete, servidor y API usan 0.14.0.
