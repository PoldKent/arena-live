# Trabajo en Arena Live

- La entrega y el desarrollo continúan en `main`. No crear ramas, worktrees ni instalaciones separadas salvo petición explícita del usuario.
- Mantener una única versión con TikTok y equilibrio integrados, iniciada con `npm.cmd start` en el puerto 4173 por defecto.
- En cambios del juego, actualizar conjuntamente versión visible, API, servidor y paquete. Conservar los documentos históricos como referencia.
- Preservar ambas capturas sincronizadas, calibración OBS, claves de almacenamiento, paneles, controles y funciones existentes.
- Validar con `npm test` y las pruebas de navegador; ejecutar carga con 128 jugadores cuando cambien combate, física o dibujo. Diferenciar simulaciones de una conexión LIVE real y de los FPS del equipo del usuario.
- Actualizar `main` sin forzar el historial y con comprobación de su referencia actual. Conservar cambios locales y el `package-lock.json` no rastreado del usuario al preparar actualizaciones.
