# Arena Live v0.18.0 · Un archivo para celular

La descarga móvil es una exportación del juego de `main`, sin una rama de desarrollo ni una implementación distinta del combate. Reúne el HTML, estilos y cinco módulos del motor en un solo archivo. El formato es **HTML**, no APK ni aplicación de App Store.

## Descargar y jugar

1. Guarda `Arena-Live-v0.18.0-movil.html` en el teléfono.
2. Ábrelo con un navegador o visor que permita ejecutar JavaScript en archivos HTML locales. Algunas vistas previas de archivos muestran solo el documento o su código: en ese caso utiliza «Abrir con» un navegador compatible. La disponibilidad de esa opción depende del sistema y del gestor de archivos.
3. Elige la cantidad de peleadores y tu clase. Con «Jugar como Prota» desmarcado observas a la IA.
4. Pulsa **Iniciar partida**. El total seleccionado incluye a Prota.
5. Usa el joystick para moverte y la barra inferior para **Saltar**, **Golpe** y **Poder**. **☰ Menú** contiene **Nueva prueba**, **Ajustes**, **Pruebas**, **Chat**, **Clase**, audio, revancha y lobby.

La pantalla se adapta al girar el teléfono. El joystick cambia a la vista activa. El modo de pantalla completa depende del soporte del navegador; no es necesario para jugar.

No necesita internet, servidor ni instalación de dependencias en el celular. **TikTok LIVE real requiere el servidor de Arena Live**. Los comandos, mensajes y apoyos del archivo son pruebas locales. La exportación conserva sus controles y señala esta limitación en el inicio y el panel de conexión.

## Perfil de rendimiento

| Opción | Inicio | Alternativas |
| --- | --- | --- |
| Resolución de dibujo | 720p | 540p para ahorrar, 1080p para más detalle |
| Dibujo | Límite de 30 FPS | 60 FPS |
| Partículas visibles | Rendimiento | Cambiable en Ajustes → Sesión y rendimiento |
| Simulación | 60 pasos por segundo | Mismas reglas y ritmo que el principal |

720p corresponde a **1280 × 720** horizontal o **720 × 1280** vertical. Tiene un 56 % menos de píxeles que la captura Full HD. El canvas oculto pasa a 1 × 1 y libera su fondo almacenado; al volver a mostrarlo recupera la resolución elegida. Si seleccionas ambas vistas se dibujan ambas desde la misma partida.

El perfil reduce filtros de fondo y animaciones de interfaz, utiliza fuentes e iconos locales, evita trabajo de simulación/dibujo con el documento oculto y reinicia el acumulador al regresar de otra aplicación. Mientras está pausado, dibuja como máximo cinco veces por segundo. No elimina peleadores ni efectos de la simulación para reducir la carga visual.

Con 128 peleadores, empieza en **540p y 30 FPS** si el teléfono pierde fluidez. Los FPS elegidos son un límite de dibujo, no una garantía de rendimiento. No se ha medido un teléfono físico ni una GPU física. Canvas 2D conserva la posibilidad de aceleración que decida el navegador.

## Ajustes y equilibrio

Se conservan el cupo de jugadores, restricciones de clase, poderes, parámetros de batalla, tres modos automáticos, rivalidades ±10 %, el radar pentagonal y los informes medidos del equilibrio. El inicio rápido respeta el cupo configurado; si es menor que el escenario solicitado no lo salta.

Abrir Ajustes pausa y cerrarlo reanuda. Las claves del juego principal se conservan. El perfil móvil añade solo `arenaLivePortableV1`, para resolución, escenario, clase e inclusión de Prota. La persistencia de archivos locales depende del navegador: cuando el almacenamiento está bloqueado se puede jugar en memoria. Exportar/importar configuración sigue disponible en Ajustes.

La resolución de esta exportación no cambia las capturas Full HD ni la calibración OBS del servidor principal.

## Generar desde el principal

En la carpeta habitual del proyecto, después de actualizar `main`:

```powershell
npm.cmd run build:mobile
```

Resultado: `dist/Arena-Live-v0.18.0-movil.html`. La generación usa solo Node, no requiere minificadores ni nuevas dependencias. `dist` no se rastrea para evitar mantener una copia del motor a mano. El HTML incluye hashes SHA-256 de sus entradas. El generador se detiene si cambian los puntos de adaptación esperados.

Pruebas:

```powershell
npm.cmd test
npm.cmd run test:mobile
```

`test:mobile` abre el archivo con `file://` en Chromium sin red y con emulación táctil de teléfono. Cubre los tres modos, 128 peleadores, controles, calidad, rotación, reglas y radar, persistencia, regreso desde otra app, almacenamiento bloqueado y ausencia de solicitudes HTTP/WebSocket. Compara también un combate con la misma semilla entre 540p/30 FPS y 1080p/60 FPS. No sustituye una prueba de Safari/WebKit ni la prueba en el teléfono del usuario.
