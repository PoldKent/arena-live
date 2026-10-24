# Arena Live v0.10 · Ajustes y equilibrio visible

Entrega directamente en `main`, mediante `npm.cmd start`, puerto 4173 por defecto. Mantiene Full HD, ambas capturas, TikTok, calibración OBS y las potencias de v0.9.

## Correcciones de Ajustes

El pie de Ajustes conservaba una versión fija v0.5, mientras una etiqueta nueva mostraba la versión arriba. Se elimina la etiqueta superior y el pie `arenaVersionInfo` se actualiza desde `ARENA_RELEASE_VERSION`, protegido frente a la traducción. La calibración tampoco repite el número. El pie muestra **Arena Live v0.10 · TikTok** y el paquete/API/servidor usan **0.10.0**.

Había tres causas distintas de texto ausente:

- La función de etiquetas consultaba `phase3Copy` aunque los controles declaran `data-ui-label`; algunas etiquetas terminaban vacías al cambiar configuraciones o idioma.
- Los botones reemplazaban el nombre del poder por la clase: Kame pasaba a Guerrero y Enred a Espíritu. Ahora muestran nombres de poderes y sus comandos permanecen disponibles.
- Los textos flotantes se reducían siempre a un emoji, aun con las opciones activadas; además, el signo menos Unicode de los daños no se reconocía como número. Se conserva tanto el texto como su icono y la selección decide cuál dibujar.

Los especiales indican explícitamente que su etiqueta es un poder, también en idiomas sin letras latinas y en Coloso/Enredadera, que antes solo emitían un emoji. Las opciones de números y poderes se aplican inmediatamente a los textos ya activos y se guardan en `arenaLiveCombatDisplayV1`; conservan reglas, distribución y calibración.

## Inspector

En **Ajustes → Equilibrio por clase**:

- Selector de modo actual, Duelo, Smash y Arena.
- Dos barras por clase: básico y especial en HP por objetivo, con valores directos y escala común entre los modos.
- **Perfil de clase** para consultar la configuración nominal; **Reglas de esta ronda** para incluir daño global, poderes bloqueados y clases excluidas.
- Selección de clase para comparar daño especial, carga y cupo configurado en los tres modos.
- Valores de referencia con energía completa y sin críticos, escudos ni apoyos. Un cupo sin límite adicional sigue sujeto al alcance; en Duelo solo existe un rival.

El daño básico compartido de 12 HP se centraliza en `ARENA_BASE_MELEE_DAMAGE`, utilizado por los peleadores, cambios de clase e inspector. Daño/carga/cupo especiales se leen directamente de `ARENA_CLASS_BALANCE`. No se duplican tablas de potencia para dibujar las barras.

Elegir un modo o una clase en el inspector no modifica partida, personajes ni reglas. El detalle conserva el foco del teclado. Se reutiliza el último estado dibujado y se omiten actualizaciones del inspector cerrado. En Stream usa el mismo Ajustes de la columna izquierda y conserva ambos recortes.

## Narrativa y decisiones pendientes

La solicitud de diseño establece Guerreros que luchan entre sí, Shinobi que se protegen y Titanes que intentan matar a todos. La IA actualmente aplicada sigue eligiendo al rival cercano para las cinco clases. v0.10 hace visible ese estado y conserva el combate mientras se eligen alianzas y rivalidades.

Antes de cambiarlo hay que decidir:

1. Cómo termina una partida cuando solo quedan Shinobi aliados: combate final, victoria de clan o protección con daño entre aliados.
2. Una cadena cerrada de cinco clases que dé a cada clase una presa y un adversario que la supere; las parejas restantes pueden quedar neutrales.
3. La intensidad de la ventaja de clase, y posteriormente su alcance sobre básicos/especiales y las prioridades de objetivo.

Dos cadenas iniciales para discutir:

- **A:** Guerrero → Titán → Rayo → Espíritu → Shinobi → Guerrero.
- **B:** Guerrero → Rayo → Shinobi → Titán → Espíritu → Guerrero.

Son propuestas; no están activadas. La elección de objetivos y cooperación debe distinguirse de los modificadores de daño. Las barras muestran parámetros, y las probabilidades de victoria deberán medirse de nuevo al aplicar esas reglas.

## Validación

- `npm test`: 45 comprobaciones aprobadas.
- `npm run test:browser`: 58 comprobaciones aprobadas, incluidos los ocho idiomas, texto real de las cinco clases, números, persistencia, pie único, barras nominales/efectivas y Stream sin movimiento de capturas.
- `npm run test:performance`: 12 comprobaciones aprobadas. Incluye 32/64/128 jugadores, poderes con nombres/números activos, límite de 120 textos y 500 comentarios.
- Regresión: 240 partidas del motor actual comparadas con v0.9, usando las mismas semillas y telemetría completa. Todos los resultados coinciden: 160 duelos, 20 partidas de Smash y 60 de Arena.

[Resumen y hashes](validation-v0.10.json) y [mediciones de carga](performance-v0.10.json). TikTok se simuló; no hubo conexión a un LIVE real. Los tiempos de Chromium sin GPU no representan los FPS del equipo del usuario con OBS.
