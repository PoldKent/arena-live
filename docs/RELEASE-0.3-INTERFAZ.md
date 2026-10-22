# Arena Live v0.3 · reconstrucción de la interfaz

La interfaz diferencia Inicio/Pruebas, Stream y juego móvil. Inicio recupera controles persistentes y organizados; Stream presenta opciones temporales fuera de las capturas. El motor sigue en un solo HTML y ambas vistas usan la misma simulación.

## Encuesta confirmada y resultado

| Nº | Decisión | Resultado |
| --- | --- | --- |
| 1 | Pruebas en paneles que pueda acomodar | Paneles independientes para objetivo, escenarios, sociales, jugadores, poderes, simulación y TikTok. |
| 2 | Solo interacciones sociales desplegadas al inicio | Social abierto; las otras categorías de pruebas plegadas. Chats visibles. |
| 3 | Juego grande, herramientas compactas y legibles | Área central flexible; columnas ajustables y controles discretos. |
| 4 | Secciones plegables que puedan quedar abiertas | Títulos desplegables independientes, sin cierre por acción en Inicio. |
| 5 | Panel propio del objetivo | Nombre, clase, vida y energía actualizados. Aleatorio indica que cada acción sortea un objetivo. |
| 6 | Selector de escenario y Cargar | 1v1 (2), Smash (4), Arena (9), Arena (128); elegir no carga hasta pulsar. |
| 7 | Chats visibles a la izquierda en Inicio/Pruebas | Panel de chats a la izquierda por defecto; Stream los abre bajo demanda. |
| 8 | Pestañas para separar ambos chats | TikTok recibido y Chat de pruebas y comandos. |
| 9 | Ancho de Stream ajustable | Separador arrastrable y operable con flechas; guardado independiente. |
| 10 | Nombre del chat local | Chat de pruebas y comandos. |
| 11 | Diferenciar comandos | Borde y fondo propios en ambos feeds. |
| 12 | Volver automáticamente al último mensaje | Cada llegada vuelve a directo, incluso tras navegar por anteriores. |
| 13 | Herramientas de Stream en la columna izquierda | Sustituyen al chat; la columna está fuera de ambos juegos. |
| 14 | Barra de Stream autooculta, espacio conservado | Se revela con cursor cercano, foco de teclado o dispositivo táctil. |
| 15 | Botones compactos con emoji y leyenda | Una fila horizontal con nombres cortos y ayuda. |
| 16 | Vista, Pantalla, Pruebas, Ajustes primero | Orden aplicado y accesos directos previos conservados. |
| 17 | Alternar pruebas automáticas y control manual | Simulación, clase y entrada de Prota conservadas; campos editables mantienen prioridad al escribir. |
| 18 | Ajustes con secciones plegables | Partida, Prota/combate, Pantallas/OBS, Audio/idioma, Audiencia/chat y Paneles. |
| 19 | Cambios inmediatos con Ajustes abierto en Inicio | Botones, selectores y deslizadores permanecen en el menú. |
| 20 | Cerrar Ajustes siempre reanuda | También después de una pausa manual anterior. |
| 21 | Nombre claro y ayuda al pasar el cursor | Opacidad rotulada con alcance y significado de 100 %. |
| 22 | Mover, redimensionar y acoplar paneles | Asa de arrastre, esquinas, separadores y selector de zona con teclado. |
| 23 | Oscuro y discreto, pocos acentos | Superficies neutras en las herramientas; arte del juego conservado. |
| 24 | Móvil centrado en jugar y barra inferior | Prota, pausa, salto, golpe, poder y Menú; herramientas compactas bajo demanda, joystick conservado. |
| 25 | Recordar Inicio y Stream por separado | Claves `arenaLiveWorkspaceV03:preparation` y `arenaLiveWorkspaceV03:stream`. |

En Stream los paneles cierran al ejecutar una acción o confirmar un cambio, de acuerdo con la encuesta anterior. Navegar por pestañas o desplegar una categoría no ejecuta una acción. Elegir un escenario permite después pulsar Cargar.

## Funciones conservadas

Se reutilizan los controles y los manejadores existentes. Continúan las clases y cinco poderes, once eventos sociales simulados, jugador objetivo, entradas/reingresos, lotes de +4/+8, K.O. de prueba, 128 perfiles distintos, reloj +15 s, autoaudiencia, ataque automático, reglas por vidas/tiempo/libre, ritmo, Prota, audio, ocho idiomas, historial/exportación, puente HTTP/WS y dos lienzos sincronizados. La calibración conserva su clave y valores personalizados.

Los paneles flotantes pertenecen a Inicio/Pruebas. Stream conserva todo dentro de su columna para no tapar las capturas. El ancho y el estado de sus secciones se guardan independientemente. Móvil no sustituye el diseño de escritorio guardado.

## OBS y actualización

Las herramientas pasan de la antigua franja inferior a la columna izquierda. Al actualizar a v0.3, comprueba los recortes de OBS para esta nueva composición. La calibración guardada se conserva: +10 px y 76 px por defecto; límites 0–16 y 72–148. Después de preparar la composición, abrir/cerrar paneles no mueve ni cambia los tamaños de los juegos.

Detén el servidor, descarga con `git pull --ff-only`, instala con `npm.cmd install`, inicia con `npm.cmd start` y recarga con Ctrl+F5. No es necesario borrar la instalación ni los datos del navegador.

## Validación

- 21 pruebas de normalización y contratos de estructura/layout/versionado.
- 23 comprobaciones de navegador: paneles, carga de 128 personajes, objetivo, Prota, chat, conexión simulada, pausa, calibración, arrastre, redimensionado, persistencia, Stream, idiomas y acciones móviles.
- Rectángulos de captura estables con herramientas/chat abiertos o cerrados en 1720×720 y 3440×1440.
- Captura individual conserva Ajustes visible y Esc reanuda sin salir de pantalla completa.
- Móvil 390×844 sin desbordamiento horizontal, con barra inferior, joystick y acciones del motor.

TikTok real sigue pendiente de probar con LIVE activo. El puente recibe texto; los eventos sociales del simulador no son regalos ni pagos reales.
