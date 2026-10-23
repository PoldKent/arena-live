# Solución del fullscreen dual en 3440×1440

## Causa del error
La vista 9:16 no aparecía porque una regla anterior de `display:none !important` ocultaba el contenedor `arenaDualUltrawideVerticalStage` aunque otra regla posterior intentara mostrarlo. Se corrigió el selector para excluir expresamente la pantalla vertical.

## Orden de prioridad
1. Se reserva primero el extremo derecho para el lienzo **9:16**.
2. Se calcula el espacio restante para el lienzo **16:9** al centro-izquierda.
3. Se acomodan herramientas del LIVE arriba y abajo de la pantalla horizontal, sin superposición.

En la prueba de Chromium a 3440×1440, la vista 9:16 ocupó **793×1410 px**, mientras que la 16:9 ocupó **1773×997 px**. Ambas se mostraron en paralelo, sin solapamientos.

El modo ultrawide se activa por relación de aspecto de al menos 2,18 y una resolución CSS de 1600×680 o superior. Así funciona con escalado de Windows (incluida la prueba equivalente a 3440×1440 al 200 %, esto es, 1720×720 CSS). La vista dual normal sigue funcionando a 1920×1080.

## Probar en Windows
Detén el servidor con Ctrl+C, actualiza el archivo `index.html`, ejecuta `npm.cmd start`, recarga `http://127.0.0.1:4173` con Ctrl+F5 y pulsa **Dual · Pantalla completa + controles**. Para salir usa el botón **⤡ Salir**.

Los cambios se limitan a la consola dual de la rama TikTok; no se modifican las reglas de combate ni la rama `main`.