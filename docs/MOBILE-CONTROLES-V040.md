# Arena Live · Rediseño ergonómico de controles móviles (vista previa)

Base: **0.39.0**. Rama `feat/mobile-touch-joystick-layout`. Este cambio afecta únicamente a `portable/mobile.css`, `portable/mobile-runtime.js`, `portable/mobile-touch.js` y sus pruebas; no cambia la simulación, el balance, las capturas OBS de escritorio ni los comandos originales.

## Contrato de diseño

- **Un solo marco de juego 9:16**, centrado y sin botones administrativos o de combate superpuestos. En teléfonos cercanos a 9:20 o 9:21 se reserva espacio superior para la barra y espacio inferior para los controles. La escala responde al alto disponible y a las zonas seguras del navegador.
- **Barra superior de iconos, sin texto visible**: pausa (⏸), cambiar Jugador/Streamer (🎛/🎮), pruebas (🧪, solo en Streamer), menú (☰) y pantalla completa (⛶). Cada acción tiene etiqueta accesible y conserva el mismo handler. Se retira el acceso duplicado a Pruebas del menú móvil.
- **Franja inferior independiente:** en Jugador/Joystick contiene el joystick original a la izquierda y botones de poder, salto y golpe; en Streamer contiene las cinco habilidades originales y, a solicitud mediante 🧪, un panel avanzado compacto y desplazable. No se generan copias de los controles internos.
- **Táctil total** no dibuja botones sobre la arena: pulgar izquierdo desliza para orientar el movimiento; pulgar derecho toca para saltar, toca dos veces para salto aéreo, desliza para golpear y mantiene pulsado para lanzar el especial. Los dos punteros pueden coexistir. La guía visible permanece **debajo del juego**.
- **Joystick** reutiliza el control original de movimiento y su zona muerta; los cuatro controles pueden recolocarse y redimensionarse desde Ajustes → Controles. Las preferencias se guardan con las claves móviles existentes. Mientras la partida esté pausada, el joystick permanece a la vista, atenuado e inactivo, en lugar de desaparecer.
- **Pantalla completa** traslada barra, franja inferior y menú a la misma tarjeta fullscreen, siempre fuera del viewport 9:16. Con el panel de pruebas abierto, reduce temporalmente el tamaño visible de la captura para no taparla.

## Principios y tradeoffs

El diseño prioriza control con dos pulgares y acciones inmediatas, siguiendo el criterio de Apple HIG Game Controls y la guía de Microsoft Touch Adaptation Kit: controles frecuentes cerca de los pulgares, acciones administrativas arriba y estados visuales de pulsación. No se cambia el daño ni la puntería del Protagonista para simular diversión artificial; primero se verifica la respuesta táctil.

## Validación / criterios de aceptación

1. En 390×844, 360×800, 412×915 y orientación horizontal: barra y control shelf no se superponen a la captura, no hay desbordamiento horizontal ni botones cortados.
2. En pantalla completa vertical: las acciones ⏸, 🎛/🎮, 🧪 (Streamer), ☰ y ⛶ continúan utilizables **fuera del marco 9:16**.
3. Pausar y reanudar en Joystick: el analógico sigue visible en su lugar, no mueve al jugador durante la pausa y recupera el movimiento al reanudar.
4. Joystick: se mueve con una mano mientras la otra acciona Golpe, Salto y Poder. El doble toque del botón Salto intenta el salto aéreo sin mover el personaje por error.
5. Táctil total: movimiento izquierdo simultáneo a un toque/salto, un deslizamiento/golpe y una pulsación larga/poder en la mitad derecha. Un toque simple a la derecha no debe requerir tres toques para saltar.
6. Arrastrar/reordenar los cuatro controles en Ajustes funciona y persiste; Restablecer posiciones recupera la distribución original.
7. Streamer: el icono 🧪 abre/cierra un panel compacto que incluye el selector de participante, comandos y poderes originales sin duplicar ni perder listeners; en fullscreen la interfaz sigue visible y operable.
8. Tras rotación, pestaña oculta, pausa y cambio Jugador/Streamer, las direcciones táctiles se liberan y no quedan controles atascados.
9. Ejecutar `npm test`, `npm run test:mobile` y `npm run build:mobile`; finalmente probar Android físico con Chrome en los dos modos y pantalla completa. **El parseo sintáctico no equivale a esa validación funcional**.

**Estado:** vista previa técnica pendiente de pruebas Playwright/Android reales. No se debe sustituir la v0.39 estable hasta completar los casos anteriores.