# Arena Live v0.13 · Radar pentagonal de daño

El menú **Ajustes → Equilibrio por clase** usa ahora el gráfico poligonal pentagonal solicitado. Cada eje corresponde a una clase: Guerrero, Shinobi, Titán, Rayo y Espíritu. Dos polígonos comparten una escala en HP: **básico discontinuo** y **especial continuo**.

Los valores se representan por su distancia al centro, sin puntuaciones inventadas ni normalización individual por clase. Los anillos indican cuartos de la escala; se muestran mitad y máximo. La escala se conserva entre Duelo, Smash y Arena e incluye la mayor ventaja de rivalidad. Con los valores nominales va de 0 a 70 HP.

## Uso

- **Modo:** actual, Duelo, Smash o Arena.
- **Valores:** perfil nominal de clase o reglas de la ronda.
- **Rival del gráfico:** neutro o cualquiera de las cinco clases, incluyendo su modificador de daño.
- **Clase:** los cinco botones inferiores muestran nombre de clase y poder, afinidad y HP exactos de básico/especial. Seleccionar uno resalta su eje y sus puntos, conserva el foco y actualiza su detalle de carga y cupo por modo.

Las columnas estrechas usan ejes numerados 1–5 vinculados a esa lista. En escritorio aparecen también los nombres en el pentágono. El gráfico responde al ancho mediante un solo observador, sin desplazar las capturas ni cerrar el menú elegido en Stream.

La leyenda distingue los trazados por patrón además de color. El SVG tiene nombre y descripción accesibles; los valores y las acciones también están disponibles como texto y botones nativos. Los nombres y ayudas cubren los ocho idiomas existentes. Un poder bloqueado o una clase excluida se representa con cero, conservando coordenadas válidas.

## Alcance de la entrega

Se actualiza la presentación del inspector y la versión visible. Las reglas de batalla, la cadena A, el ±10 % de daño, la preferencia local Shinobi del 15 %, las potencias y la integración TikTok conservan su código. Continúan las capturas Full HD y la calibración OBS.

La comparación del script completo, excluyendo funciones de presentación del inspector, sus textos/estado de ancho y las etiquetas de versión, confirma que las restantes líneas de simulación, IA, daño, dibujo del juego e integración coinciden con v0.12. El radar no consume el azar del combate ni modifica luchadores o reglas al consultarlo.

Los [resultados de equilibrio de v0.12](balance-v0.12-summary.json) se conservan como referencia de estas reglas. No se presenta una nueva campaña de simulaciones ni se afirma que el cambio de gráfico mejore las tasas de victoria.

La versión **0.13** aparece una sola vez, en el pie de Ajustes. Paquete, API y servidor usan **0.13.0**.

## Validación

- **52 comprobaciones de Node**, sin fallos.
- **64 comprobaciones de navegador**, sin errores: cinco ejes y dos polígonos, distancia de cada vértice equivalente al daño real en las 75 combinaciones de clase/rival/modo, poderes bloqueados, clases restringidas, escala común, ocho idiomas y selección accesible.
- Revisados escritorio, móvil de 320 px y columna Stream de 180 px, con etiquetas dentro del SVG, nombres completos en la lista y capturas estables. Inspección visual de los polígonos en escritorio y móvil.
- **12 comprobaciones de carga**, sin errores, con 32/64/128 peleadores, poderes y textos acotados, ambas capturas y 500 comentarios. [Mediciones](performance-v0.13.json).

[Registro de validación](validation-v0.13.json). TikTok se prueba con eventos simulados; no se establece una conexión LIVE real. Las mediciones con rasterizado por software no representan los FPS del equipo del usuario con OBS.
