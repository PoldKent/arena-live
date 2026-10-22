# Arena Live v0.1 — revisión de diseño OBS

22 de octubre de 2026

Esta es la versión pública **0.1** de la interfaz. La etiqueta está dentro de **Ajustes**, en el encabezado, y distingue la edición **main** o **TikTok**. El API `window.ArenaLive.version` devuelve `0.1.0`.

## Cambios

- Desaparecen las insignias redundantes «Lobby 16:9 en Vivo» y «TikTok Live 9:16» del panel central de los dos juegos. Se mantienen las instrucciones de ingreso, los tiempos, las clases y las barras de combate.
- El modo de emisión definitivo sigue siendo **Dual Full Screen**, una sola partida representada simultáneamente en los lienzos horizontal y vertical.
- **Pantallas de Stream y Audio → Calibración para OBS** muestra la versión, la dimensión aparente de ambas vistas y controles para ajustar el margen lateral de la 9:16 y la altura de la banda inferior del operador.
- Margen 9:16 hacia la derecha: **4 px** predeterminados, ajustable entre **0 y 16 px**.
- Banda inferior: **108 px** predeterminados (antes 148), ajustable entre **84 y 148 px**. El menor espacio disponible da protagonismo al 16:9.
- Abrir o cerrar las herramientas de prueba no modifica dimensiones de ninguno de los dos juegos. **Mover el control de calibración SÍ modifica la geometría intencionadamente**: primero calibra, después ajusta los recortes de OBS y evita cambiarla durante el directo.
- Los ajustes de calibración se recuerdan en el navegador mediante `localStorage` (`arenaLiveObsCalibrationV01`). Pulsa Restablecer para recuperar 4 px y 108 px.

## Cómo comprobar la versión

En Windows: detener con Ctrl+C, actualizar la rama apropiada en GitHub, ejecutar `npm.cmd start`, abrir `http://127.0.0.1:4173/?v=0.1` y refrescar con Ctrl+F5. Abrir Ajustes: debe decir **Arena Live v0.1 · TikTok**. En `main` dirá **Arena Live v0.1 · main**.

La vista previa de OBS puede estar escalada: un desplazamiento de **4 píxeles** en el navegador se ve como **~1,6 píxeles** si OBS muestra su lienzo al 39 %. Por ello puedes calibrar desde Ajustes antes de transmitir.

## Diferencias de integración

`main` sigue siendo un HTML autónomo sin servidor de TikTok. La rama TikTok conserva Node.js, el puente local y el historial de mensajes recibidos. El chat oficial de TikTok no se modifica desde la interfaz. Las reglas de combate y los 128 personajes quedan intactos.
