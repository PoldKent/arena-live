# Arena Live Mobile v0.29 · Control táctil y pruebas en pantalla

La edición Mobile utiliza **el mismo motor de física, clases, energía, ataques y recargas** que Stream, pero no necesita OBS, TikTok ni conexión a redes.

## Controles de Prota

- **Tocar y mantener** un punto de la arena: Prota se dirige hacia allí mientras el dedo esté apoyado. En Arena isométrica también puede moverse arriba/abajo.
- **Desplazar el dedo**: actualiza la dirección continuamente. Un deslizamiento **rápido** (mínimo 34 px, hasta 380 ms) dispara un golpe básico al soltar; un arrastre lento solo mueve al personaje.
- **Dos toques seguidos** (hasta 310 ms, próximos entre sí): primer salto.
- **Tres toques seguidos**: segundo salto cuando lo permita la física, respetando su recarga y saltos disponibles.
- **Mantener pulsado sin arrastrar** (460 ms): activa el especial de la clase actual, si tiene energía y la regla del combate lo permite.
- **Botones redondos flotantes** ↑, ⚔ y ⚡: alternativas de accesibilidad; ☰ abre opciones.
- El joystick analógico de la versión móvil queda retirado. Los controles originales de escritorio no se modifican.

## Pruebas sobre el escenario

El acceso flotante **🧪** abre un panel **arrastrable, minimizable y cerrable** sobre el juego. Su selector muestra uno de cinco grupos originales: «Jugador, poderes y comandos» (predeterminado), Jugadores y K.O., Escenarios, Interacciones y Simulación. No clona los controles: mueve el panel funcional existente al área flotante; se conserva el objetivo y el estado del combate. También puede abrirse desde ☰ Menú → Pruebas en pantalla.

La ventana está limitada de tamaño para dejar la mayor parte de la arena visible y se adapta a orientación vertical, horizontal y pantalla completa.

## Validación pendiente

Comprobar en un teléfono Android real el reconocimiento de gestos, el salto triple según la física, las opciones de pantalla completa que permita el navegador y la accesibilidad del panel. Ejecutar `npm test`, `npm run test:mobile`, `npm run build:mobile` y revisiones de rendimiento cuando GitHub Actions permita iniciar trabajos. La validación estática y un test aislado de secuencia de toques no equivalen a una prueba de gameplay física.
