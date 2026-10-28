# Arena Live v0.33 · Auditoría de los menús de Ajustes

Esta clasificación se aplica al **código compartido** de la app principal (Stream/OBS) y la edición Mobile (Modo Jugador y Modo Director).

| Pestaña | Ajustes y controles únicos | Motivo |
|---|---|---|
| **Partida** (`match`) | Modalidad, cuenta regresiva, duración, vidas, reingresos, cupo de jugadores, clase de la ronda, velocidad general | Define cómo se inicia y transcurre la ronda. La velocidad no pertenece al control manual del protagonista. |
| **Combate** (`combat`) | Vida máxima, modificador de daño real, empuje, movimiento, regeneración de energía, poderes permitidos, origen de especiales (IA/comandos), política de consumo de especiales | Modifica reglas de combate, física o habilidades. |
| **Clases** (`classes`) | Radar de equilibrio, daño básico/especial por clase, rivalidades y preferencias de objetivos de la IA | Balance y conducta específica de clases. |
| **Audiencia** (`audience`) | Frecuencia de audiencia simulada, multiplicador de interacciones, mensajes en historial, limpiar chat, activar/suspender simulación, política de eventos durante pausa | Administra las interacciones de espectadores. No contiene toggles de daño visual. |
| **Pantalla y HUD** (`broadcast`, clave interna histórica) | Vista 16:9/9:16/dual, calibración OBS, nombres y clases visibles, números de daño/curación, texto de poderes, transparencia HUD, vibración de cámara | Modifica únicamente presentación, composición y captura. |
| **Audio e idioma** (`audio`) | Idioma, silencio/sonido y volumen maestro | Sonido y localización. |
| **Controles** (`controls`) | Control manual de Protagonista; en Mobile, acomodar/restablecer botones y ajustar tamaño táctil | Entrada humana, no reglas de combate. |
| **Sistema** (`system`) | Calidad de partículas, límite FPS, guardar/importar/restablecer ajustes, exportar diagnóstico, restaurar paneles | Rendimiento y mantenimiento. |

## Comportamiento y persistencia

- Los controles existentes se **mueven en el DOM**, no se duplican; conservan sus IDs, listeners, valores y claves de almacenamiento.
- Se agregó el toggle **Mostrar nombres y clases de jugadores** (por defecto activado para conservar el aspecto previo). Se guarda en `arenaLiveCombatDisplayV1.names`, junto con `numbers` y `powerText`; los ajustes anteriores se migran automáticamente al cargar, sin alterar sus valores previos.
- Ocultar etiquetas de luchadores **no oculta barras de vida ni modifica daño**. «Números de daño/curación» no es el multiplicador de daño real.
- En Mobile, el control de transparencia `hudOpacityRange` permanece en **Pantalla y HUD**. En **Controles** hay una indicación de dónde encontrarlo, sin segundo slider.
- La clave interna histórica `broadcast` se conserva para compatibilidad con preferencias de tab guardadas, aunque el texto visible ahora es «Pantalla y HUD».
- La app principal mantiene calibración OBS y herramientas TikTok. Mobile sigue sin conexión a redes y conserva sus dos modos.
- Los menús de combate, controles y audiencia no han perdido acciones: todas las entradas mencionadas siguen disponibles en su categoría.

## Validación

Pruebas añadidas/actualizadas en `test/operator-browser.mjs`, `test/mobile-browser.mjs`, `test/broadcast-presentation.test.mjs` y `test/settings-live-specials.test.mjs`. La compilación HTML móvil de v0.33 se generó con scripts comprobados sintácticamente. En esta sesión GitHub Actions no pudo ejecutar los trabajos (fallan antes de iniciar los pasos); quedan pendientes las verificaciones gráficas de navegador, Android físico y OBS real.
