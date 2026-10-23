# Arena Live v0.7 · Comandos de acciones en el chat de pruebas

Entrega directa en `main`, con un solo arranque mediante `npm.cmd start` y puerto 4173 por defecto. TikTok y el equilibrio por Duelo, Smash y Arena siguen integrados.

## Corrección

Las entradas de escenarios y botones rápidos usaban la admisión silenciosa, que ocultaba el aviso del chat. Los especiales automáticos no pasaban por el procesador de mensajes y sus avisos antiguos se descartaban en el registro de K.O. Por eso el juego actuaba sin mostrar el comando correspondiente en el chat local.

Ahora la confirmación se produce en las funciones compartidas que admiten al peleador y ejecutan el especial. El registro observa la acción; nunca vuelve a enviarla al procesador de comandos. Así no añade un segundo boost, gasto de energía, carga ni daño.

| Acción real | Registro en Chat de pruebas y comandos |
| --- | --- |
| Entrada inicial, rápida, de escenario o por chat | `🎮 Juego · @Nombre: 👤 !jugar · Se unió · Clase` |
| Reingreso permitido | `🎮 Juego · @Nombre: 🔄 !jugar · Reingresó · Clase` |
| Especial de Guerrero | `🎮 Juego · @Nombre: ⚡ !kame · Especial ejecutado · Guerrero` |
| Especial de Shinobi | `🎮 Juego · @Nombre: ⚡ !rasen · Especial ejecutado · Shinobi` |
| Especial de Titán | `🎮 Juego · @Nombre: ⚡ !coloso · Especial ejecutado · Titán` |
| Especial de Rayo | `🎮 Juego · @Nombre: ⚡ !trueno · Especial ejecutado · Rayo` |
| Especial de Espíritu | `🎮 Juego · @Nombre: ⚡ !enred · Especial ejecutado · Espíritu` |

Incluye IA, teclado/táctil de Prota, botones de pruebas y comandos manuales. Cuando el operador selecciona a otro peleador para lanzar un poder, la confirmación nombra al lanzador real. Los alias se convierten al comando interno antes de cargar y ejecutar; la presentación utiliza el comando aceptado del idioma elegido.

Los mensajes escritos o recibidos conservan su propio registro. Una confirmación de **Juego** indica que la acción se produjo, aunque un especial no alcanzase a nadie. La carga por sí sola, una interrupción, otra clase, los poderes deshabilitados, el cupo completo o las vidas agotadas no crean una confirmación falsa. Un `!jugar` repetido de un participante activo sigue siendo apoyo y no anuncia otra entrada.

Los registros quedan únicamente en el chat local. El historial recibido de TikTok no se modifica y no se envían respuestas a la plataforma. Se conserva el límite de 20/40/80/120 mensajes configurado en Ajustes y el seguimiento agrupado por cuadro. Al superar ese límite se retiran los registros más antiguos, también en escenarios de 128 jugadores.

## Prueba manual

1. Abre **Chat → Chat de pruebas y comandos**.
2. En **Jugadores**, añade un peleador; debe aparecer su `!jugar`, nombre y clase bajo **🎮 Juego**.
3. Carga un escenario e inicia combate. Los especiales de la IA deben mostrar el comando de cada lanzador al ejecutarse.
4. Selecciona un objetivo y prueba el poder de su clase. La confirmación debe corresponder a ese objetivo.
5. Comprueba que una carga interrumpida o un poder bloqueado por las reglas no muestran «Especial ejecutado».

## Verificación

- `npm test`: 26 comprobaciones aprobadas.
- `npm run test:browser`: 41 comprobaciones aprobadas, sin errores de JavaScript. Incluye los 15 pares de clase/modo, las 128 admisiones silenciosas, reingresos, rechazos, atribución manual, alias y nombres escapados, además de controles, paneles y OBS existentes.
- `npm run test:performance`: 11 comprobaciones aprobadas. Escenarios de 32/64/128, ráfaga de 500 comentarios y especiales de 128 luchadores con una confirmación por ejecución y retención acotada.
- Regresión de equilibrio: 200 partidas reproducidas con resultados completos idénticos a v0.6: 160 duelos con/sin poderes y 40 partidas de 5/10/25/125 jugadores. Se compararon ganador, tiempo, daño, cargas, interrupciones y eliminaciones; esta muestra comprueba la regresión y no sustituye un estudio completo nuevo.

[Resumen de validación](validation-v0.7.json) y [mediciones frente a v0.6](performance-v0.7.json). Las mediciones proceden de Chromium sin GPU y no equivalen a FPS en el equipo del usuario con OBS. Las respuestas de TikTok fueron simuladas; sigue pendiente la prueba con un LIVE público real.
