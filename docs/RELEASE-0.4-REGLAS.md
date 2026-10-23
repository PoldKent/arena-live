# Arena Live v0.4 · reglas y paneles persistentes

## Reglas y parámetros

La sección nueva de Ajustes comparte los mismos valores en Inicio/Pruebas y Stream. Los cambios son inmediatos y se guardan en el navegador; no se necesita recargar el juego.

| Parámetro | Rango / opciones | Predeterminado |
| --- | --- | --- |
| Cupo | 2–128 jugadores inscritos | 128 |
| Clase | Todas / Guerrero / Shinobi / Titán / Rayo / Espíritu | Todas |
| Poderes y apoyos | Permitidos / Sin poderes de clase con apoyos / Solo golpes sin poderes ni apoyos | Permitidos |
| Vida máxima | 50–1000 HP | 180 HP |
| Daño | 0.25–3× | 1× |
| Empuje recibido | 0–2× | 1× |
| Velocidad de movimiento | 0.5–2× | 1× |
| Recarga pasiva de energía | 0–3× | 1× |

El cupo cuenta cuerpos inscritos, incluidos Prota y caídos, siguiendo la lógica del límite global anterior. Una identidad inscrita conserva su plaza para reingresar según vidas/tiempo; otra identidad no puede ocupar una plaza extra. El límite se valida en el punto común de admisión para chat TikTok, mensajes normales que autoinscriben, chat local, Prota, clases, poderes iniciales y pruebas. Los escenarios se ajustan al cupo; los lotes se verifican en cada entrada.

Reducir el cupo en el lobby ajusta la lista de inmediato y da prioridad a conservar Prota. Reducirlo durante una pelea bloquea nuevas entradas, conserva a los participantes actuales y muestra el exceso en Ajustes. Al preparar el próximo lobby o la siguiente partida se aplica el nuevo tamaño. Los perfiles guardados permanecen disponibles para otras rondas.

La clase única convierte a los participantes de la ronda, incluidos Prota y los bots. Impide que comandos de otra clase la cambien. Cada cuerpo conserva su clase preferida y los perfiles no se sobrescriben por esta restricción: al volver a Todas se recupera la preferencia original.

Sin poderes de clase cancela cargas y bloquea los especiales de IA, Prota, comandos y herramientas, incluida su ejecución directa. No gasta energía al bloquear. Los apoyos sociales siguen permitidos en esa opción. Solo golpes también borra bonificaciones activas, bloquea todos los eventos sociales y evita el boost de repetir !jugar. Los comandos y mensajes siguen registrándose en el chat.

La vida máxima mantiene el porcentaje de vida actual; no reinicia al jugador. El daño se escala en el cálculo común antes de absorber escudos; el empuje cero no añade lanzamiento ni aturdimiento de retroceso. Movimiento y recarga pasiva usan sus cálculos comunes; la energía instantánea de ataques y apoyos es independiente de la recarga pasiva.

`arenaLiveCombatRulesV04` guarda solo estas reglas. La lectura valida opciones, rangos y pasos. Restablecer reglas no borra perfiles, reglas de vidas/tiempo, paneles ni `arenaLiveObsCalibrationV01`. La API de solo lectura informa el cupo en `maxFighters`, el límite absoluto 128 en `hardMaxFighters` y una copia congelada de `combatRules`.

## Stream

El panel seleccionado permanece abierto al pulsar botones, seleccionar valores, soltar deslizadores, enviar mensajes o hacer clic en el juego. Repetir su acceso mantiene el panel. Elegir otro menú reemplaza el contenido anterior. La × del encabezado y Esc permiten cerrarlo expresamente.

Ajustes sigue pausando al abrir y reanudando al cerrar; elegir otro panel lo cierra y reanuda. Su contenido ahora empieza debajo del encabezado de Stream para conservar accesible la ×. Las dos regiones de captura no cambian al usar o reemplazar paneles.

Móvil conserva los paneles compactos bajo demanda y la barra de acciones. La acción Poder se deshabilita cuando las reglas prohíben especiales; las demás herramientas reflejan la restricción de poderes/apoyos.

## Rama y actualización

La v0.4 se integra en `main` con el historial de la rama `feature/tiktok-live-chat-mvp` y las mejoras previas de la rama principal. Continúa una sola simulación para 16:9 y 9:16 y se conservan la calibración y las distribuciones guardadas de v0.3. La edición independiente v0.1 permanece en el historial de Git.

Detener servidor, `git fetch origin`, `git switch main`, `git pull --ff-only origin main`, `npm.cmd install`, `npm.cmd start`, Ctrl+F5; comprobar v0.4 en Ajustes. Detenerse si falla un comando y conservar los cambios locales que Git señale antes de continuar.

## Validación

- `npm test`: 21 comprobaciones de estructura, normalización, vistas y versión.
- `npm run test:browser`: 33 comprobaciones en Chromium, sin errores de JavaScript.
- Capacidad contra API/chat, admisión directa, Prota, reingreso, escenarios de 128 y lotes diferidos.
- Clase única para existentes, nuevos y Prota; recuperación de preferencias al quitarla.
- Desactivación de poderes por chat, pruebas, IA, Prota y ejecución; cancelación de cargas sin consumo adicional de energía.
- Solo golpes bloquea los once eventos y elimina escudos/bonificaciones, además del boost de entrada repetida.
- Vida proporcional, daño y escudo, empuje cero/normal, multiplicador de movimiento y recarga real por pasos de simulación.
- Reducción de cupo sin expulsión durante combate, recorte al preparar lobby y preservación de perfiles.
- Persistencia y restablecimiento independiente de OBS y distribución.
- Paneles persistentes, reemplazo, cierre con ×, pausa y geometría en 1720×720 y 3440×1440; móvil 390×844.

TikTok real continúa pendiente de validar durante un LIVE activo. Las pruebas de conexión y comentarios usan estados HTTP/WS simulados; el puente y sus permisos no cambian.
