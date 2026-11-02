# Arena Live 0.42.0 · render y poderes verticales

Continúa en `main`, con el mismo motor para escritorio, TikTok/OBS y el móvil autónomo. Conserva las reglas y los ajustes de clases de 0.41; la evidencia de equilibrio sigue identificada como [2.400 partidas de 0.41](balance-v0.41-summary.json).

## Correcciones y depuración

- El filtro de cámara distinguía solo haces horizontales. Un Kame que nacía debajo de la vista y apuntaba hacia arriba, o encima y hacia abajo, desaparecía aunque cruzara la pantalla. Ahora se comprueban su eje y dirección. Se verifica la llegada a ambos extremos de la captura vertical.
- El dibujo de los seis efectos pasa de `arena-game.js` a `ArenaRender.drawSpecialEffects`. Recibe efectos, cámara, tiempo y actores explícitos; no modifica la simulación ni consume azar de combate. La aplicación mantiene una única implementación y su envoltorio compatible.
- La cámara horizontal reutiliza una capa opaca con cielo y escenario en fotogramas sin vibración ni destellos. Peleadores, poderes, partículas, textos y HUD se dibujan en vivo. Durante vibración o destellos se usa el recorrido original y se conserva la capa para volver a reutilizarla.
- La clave cambia con resolución, cámara, modo, fase, idioma, fuentes, plataformas o el paso entre lobby pequeño y arena isométrica. Hay una entrada por contexto; el móvil la libera al cambiar su resolución. La cámara vertical mantiene su seguimiento dinámico.
- Una capa 1920×1080 contiene **8.294.400 bytes de píxeles** adicionales, más la sobrecarga del navegador. Se crea al dibujar la vista horizontal. El móvil centrado solo en 9:16 no necesita esa capa horizontal.

## Mediciones y alcance

En una comparación alternada sobre la misma escena fija de 128 peleadores, dibujando las dos capturas Full HD, la mediana pasó de **41,4 ms con el recorrido directo a 32,1 ms con la caché** (24 muestras por recorrido). Es un ensayo sin vibración ni destellos, con renderizado de software y lectura del ráster. No representa FPS garantizados ni un aumento medido en una GPU física.

El [reporte de rendimiento](performance-v0.42.json) conserva también las mediciones secuenciales de 32/64/128 y las ráfagas. Esas series tienen variabilidad y 32/64 no muestran una mejora general. La comparación alternada aísla el beneficio de la capa estática; los fotogramas que la omiten conservan el trabajo original. El [ensayo sin desactivar GPU](gpu-v0.42.json) sigue identificando SwiftShader y mide envío de comandos, sin esperar a una GPU física.

## Validación

- **180** pruebas Node; **130** de escritorio; **40** móviles; **24** de rendimiento y **24** en el modo sin desactivar GPU. Las cuatro comprobaciones del paquete web también se ejecutaron y están incluidas en Node.
- Coincidencia exacta de todos los píxeles del escenario entre caché y recorrido directo en las nueve combinaciones de modo y fase.
- Mismo estado completo y huellas de combate que 0.41 para 32, 64 y 128 participantes y la ráfaga de poderes con empuje real. La carga incluye 128 especiales simultáneos, las dos capturas y 500 mensajes.
- Arranque real con `npm start`, API 0.42.0 en el puerto 4173 y `/mobile` idéntico a la descarga probada. El [registro](validation-v0.42.json) identifica su tamaño y SHA-256.

La publicación web sigue dependiendo de que pasen los controles en Windows y Linux. Android físico, GPU física y una emisión real con TikTok/OBS necesitan sus dispositivos y sesión; las pruebas automatizadas no certifican esos entornos. El choque de un básico contra un especial continúa como decisión de diseño separada.

## Actualizar

Detén el servidor con Ctrl+C y, dentro de tu carpeta habitual, ejecuta:

```powershell
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd start
```

Conserva tus cambios locales al actualizar. La app se abre en `http://127.0.0.1:4173/`. La descarga única es `mobile-builds/Arena-Live-v0.42.0-movil.html`; la [web](https://poldkent.github.io/arena-live/) elige móvil o escritorio según el dispositivo. TikTok LIVE requiere el servidor local.
