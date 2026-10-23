# Arena Live v0.9 · Full HD y efectos de toda la vista

Entrega en `main`, mediante `npm.cmd start`, puerto 4173 por defecto. Mantiene una sola simulación, TikTok, reglas, potencias, comandos y la caída/rescate de v0.8.

## Resolución y presentación

| Captura | Resolución nativa anterior | Resolución nativa actual |
| --- | --- | --- |
| 16:9 | 960 × 540 | **1920 × 1080** |
| 9:16 | 540 × 960 | **1080 × 1920** |

El tamaño real de ambos `canvas` se duplica por eje y el dibujo usa la escala correspondiente: vectores y textos se rasterizan en Full HD. El mundo conserva sus coordenadas 960 × 540 y las cámaras sus dimensiones lógicas, de modo que velocidad, alcance, controles y física permanecen iguales. La resolución nativa es independiente del tamaño con que el navegador muestra la vista en la preparación.

Se conservan proporciones, rectángulos de las capturas, posición vertical derecha, distribuciones, márgenes y clave de calibración OBS. **Ajustes → Pantallas y OBS** muestra las resoluciones. Esta actualización cambia el juego; no modifica automáticamente la configuración de salida de OBS.

## Efectos

El límite vertical anterior era un punto fijo del mundo horizontal. Al mostrar ese mundo en una cámara alta de 9:16, los rayos empezaban a media altura aunque quedara espacio visible por encima.

Ahora se invierte la transformación de cada cámara para conocer sus límites visibles, incluyendo zoom y vibración:

- Los rayos parten por encima del borde superior y terminan en su punto de impacto.
- Los haces Kame alcanzan el borde lateral en su dirección.
- Las columnas de K.O. se prolongan hasta el borde superior de cada captura.
- Los destellos cubren todo el cuadro y el confeti se distribuye sobre toda la anchura y altura de cada salida, independientemente de la cámara.
- Las partículas de impacto, saltos, anillos y poderes locales siguen ancladas a sus personajes.

La extensión es visual. No cambia daño, alcance físico, límites de objetivos ni reglas de los poderes. El trazado de rayos utiliza ruido visual determinista, sin llamar al generador aleatorio del combate; mostrar una cámara más alta ya no consume más azar al dibujar segmentos adicionales.

## Coste de dibujo

Full HD utiliza cuatro veces los píxeles anteriores por captura. Para reducir el coste se mantiene una capa de fondo por contexto, que se reemplaza al cambiar escena o resolución, y una sola capa estática del suelo isométrico. Sus tamaños están acotados. Los jugadores, sus textos, las partículas, poderes y destellos se siguen dibujando en cada cuadro; no se almacena una imagen congelada de la partida.

Las capas de fondo conservan resolución nativa y se prueban los cambios de lobby, victoria, modo y destello para evitar imágenes antiguas. La geometría de suelo usada por la física y el rescate no se modifica.

## Comprobación manual

1. Actualiza `main`, reinicia y recarga con Ctrl+F5. Comprueba **v0.9** y ambas resoluciones en Pantallas y OBS.
2. Carga Arena, inicia combate y prueba Trueno: debe entrar desde el borde superior del 9:16 y alcanzar al objetivo.
3. Prueba Kame en ambas direcciones y observa una columna de K.O.; deben llegar a los bordes correspondientes.
4. Comprueba la lluvia de confeti en victoria sobre todo el cuadro vertical.
5. Alterna preparación, Stream y captura individual. Los tamaños nativos y la calibración se conservan.

## Verificación

[Resumen y hashes del motor](validation-v0.9.json) y [mediciones de carga](performance-v0.9.json).

Las pruebas verifican píxeles nativos en el borde superior y en el punto de impacto de los rayos, ambos extremos de Kame, destellos en la última fila y confeti cerca del pie de la vista vertical. También comprueban el relleno completo de los lienzos Full HD, la renovación de las capas y las funciones anteriores de interfaz, reglas, caída y OBS.

Se aprobaron **40 comprobaciones de Node, 53 de navegador y 11 de carga**. Las 240 partidas con semillas de v0.8 reprodujeron sus resultados completos: 160 duelos, 20 partidas de Smash y 60 de Arena. Esta muestra verifica que la actualización de dibujo conserva el combate; no es un estudio estadístico nuevo.

Las pruebas de carga usan 32/64/128 jugadores, poderes y 500 comentarios. Las cifras proceden de Chromium sin GPU con lectura de píxeles: sirven para comparar el trabajo en ese entorno, no para prometer FPS en el equipo del usuario con OBS. TikTok fue simulado; no se conectó a un LIVE real.
