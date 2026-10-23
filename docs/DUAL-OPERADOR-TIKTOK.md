# Operador de Arena Live · v0.5 · TikTok

## Preparar y jugar

En escritorio, Inicio/Pruebas presenta 16:9 en el centro, chats con pestañas a la izquierda y paneles plegables a la derecha. En móvil inicia en 9:16 con una barra inferior de acciones. Vista cambia el formato; Pantalla permite una captura individual en pantalla completa.

Arrastra el asa ⠿ para mover, ordenar o acoplar paneles. El selector junto al asa ofrece las mismas zonas con teclado. Los bordes de columnas y las esquinas de los paneles desplegados permiten redimensionar. La distribución se recuerda en este navegador. Ajustes → Paneles permite restablecerla.

Las pruebas siguen disponibles en Inicio: objetivo con nombre/clase/estado, selector de escenario con Cargar, los once eventos sociales, entradas y reingresos, cinco poderes, audiencia/ataques automáticos, multiplicadores y prueba de reloj para rondas con tiempo. Las secciones permanecen abiertas al actuar.

## Emitir

Modo Stream, disponible en la barra y dentro de Ajustes → Pantallas y OBS, abre dos vistas de **la misma partida**. La barra pasa a la parte superior del área horizontal y oculta sus botones al retirar el cursor; su espacio permanece reservado. Foco de teclado y dispositivos táctiles mantienen el acceso.

Las herramientas y chats se abren en la columna del extremo izquierdo; el chat no permanece desplegado al entrar. El panel permanece abierto al actuar, cambiar valores, enviar un mensaje, volver a pulsar su acceso o hacer clic fuera. Para pasar de chat a herramientas o Ajustes, usa la barra: el nuevo menú reemplaza al anterior. La × del encabezado cierra el panel; Esc también permite cerrarlo. El selector de escenario deja elegir antes de pulsar Cargar.

El borde derecho de la columna ajusta su ancho; las flechas del teclado también funcionan al enfocar el separador. Stream guarda ese ancho, las secciones abiertas y la pestaña de chat por separado de Inicio/Pruebas. La emisión mantiene los paneles dentro de su columna para que no cubran los juegos; la colocación libre pertenece a Inicio/Pruebas.

## Pausa y ajustes

Pausa es un acceso directo. Ajustes pausa siempre al abrirse y reanuda siempre al cerrarse, aunque la partida estuviera pausada de antemano. Todas las opciones comparten un menú con secciones plegables, incluido Modo Stream.

Puedes realizar varios cambios sin cerrar tanto en Inicio/Pruebas como en Stream. En Stream, Ajustes se muestra dentro de la columna izquierda, debajo del encabezado con su × accesible. Los deslizadores aplican el valor en vivo y el menú sigue abierto al soltarlos. Esc cierra primero el panel abierto y conserva la pantalla completa.

## Reglas de pelea

Ajustes → Reglas y parámetros añade cupo 2–128, clase única o todas, poderes completos/sin especiales/Solo golpes, vida 50–1000 HP, daño 0.25–3×, empuje 0–2×, movimiento 0.5–2× y recarga pasiva 0–3×. Mantiene las reglas de vidas, duración y ritmo de simulación ya disponibles.

El cupo incluye Prota y caídos inscritos. Bloquea nuevas identidades en todas las entradas; reducirlo en combate conserva la ronda actual y se aplica al preparar el próximo lobby. La clase única conserva las preferencias originales, y Sin poderes se respeta en IA, Prota, comandos y pruebas. Solo golpes también bloquea apoyos sociales y elimina sus bonificaciones activas. Las configuraciones se recuerdan en el navegador; restablecer reglas conserva perfiles, paneles y calibración.

## Conexión y chat

El servidor inicia desconectado. TikTok muestra el estado real del puente y su disponibilidad. El detalle y Probar comando se encuentran en el panel TikTok LIVE. Solo la ventana controladora recibe comentarios para el juego.

Las pestañas separan **TikTok recibido** y **Chat de pruebas y comandos**. Este último es local y no responde en TikTok. Los comandos tienen un acento visual propio. Cada llegada nueva vuelve al último mensaje, incluso después de consultar anteriores. Se conservan historial de hasta 50.000 recibidos por sesión, navegación y exportación TXT; ocultar el panel no interrumpe la recepción.

## OBS

16:9 ocupa el área horizontal restante; 9:16 queda a la derecha. La columna izquierda y los espacios superior/inferior permanecen reservados: abrir/cerrar herramientas o mostrar/ocultar botones no cambia los rectángulos de captura.

La calibración conserva `arenaLiveObsCalibrationV01`, sus valores personalizados y los límites de v0.1: desplazamiento 0–16 px, espacio inferior 72–148 px. Valores predeterminados: +10 y 76 px. Restablecer distribución no restablece esa calibración.

Comprueba los recortes al pasar a la nueva composición v0.3 y después de cambiar ancho o calibración deliberadamente. Usa una única instancia del juego: dos cargas independientes producirían partidas distintas.

## Verificación

Las regresiones comprueban geometría estable en 1720×720 y 3440×1440, restauración de paneles, pausa, chats, escenarios y móvil 390×844. No acreditan conexión ni latencia real de TikTok; esa validación necesita un LIVE activo y un comentario desde otra cuenta.

Consulta [las reglas y ajustes de v0.4](RELEASE-0.4-REGLAS.md), [las 25 decisiones de v0.3](RELEASE-0.3-INTERFAZ.md) y [la guía de TikTok LIVE](TIKTOK-LIVE-MVP.md).

La [v0.5](RELEASE-0.5-RENDIMIENTO.md) optimiza el trabajo del motor y del chat sin cambiar la distribución ni la calibración. Para comprobar el equipo con 128 participantes usa Pruebas → Escenario → 128 → Cargar y, después, inicia combate en Modo Stream.
