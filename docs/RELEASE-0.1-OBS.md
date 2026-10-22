# Arena Live v0.1 — ajuste visual para OBS

22 de octubre de 2026

**Dual Full Screen sigue siendo la vista de transmisión definitiva para OBS**, con una única partida y dos lienzos simultáneos. El juego independiente `main` no incorpora el puente de TikTok.

## Mejoras visuales

- **Vida del duelo 9:16:** las barras pasan de 8 a **14 píxeles** de altura interna; los nombres y porcentajes se muestran a **12 px**; la energía usa carriles de **6 px**. El HUD horizontal conserva sus proporciones.
- **Lobby sin duplicaciones:** se han retirado de ambas vistas las insignias «Lobby 16:9 en Vivo», «TikTok Live 9:16» y la etiqueta decorativa «16:9 LIVE». Se mantienen comandos, estado del combate e instrucciones necesarias.
- **Versión visible en Ajustes:** el pie del menú indica **Arena Live v0.1 · main** o **Arena Live v0.1 · TikTok**. La API mantiene `window.ArenaLive.version === '0.1.0'`.
- **16:9 con mayor superficie:** en ultrawide la barra superior pasa de 42 a **34 px**, mientras que el carril inferior predeterminado baja de 108 a **76 px** (más espacio libre para el juego).
- **9:16 al extremo derecho:** desplazamiento por defecto de **10 px** (antes 4), modificable entre **0 y 16 px**.
- **Calibración OBS:** la altura de herramientas puede regularse entre **72 y 148 px**, en pasos de 4. Se han migrado automáticamente los valores anteriores predeterminados (4 px / 108 px) a los nuevos (10 px / 76 px). Se respetan valores personalizados distintos.

El menú de calibración está en **Ajustes → Pantallas de Stream y Audio → Calibración para OBS**. Los ajustes se conservan en el navegador; usa «Restablecer» para volver a los nuevos valores predeterminados.

## Seguridad de los recortes

Al abrir o cerrar el cajón inferior no se modifican las dimensiones ni las coordenadas de los juegos; la franja siempre está reservada. **Cambiar manualmente el desplazamiento lateral o la altura del cajón sí altera la geometría de forma deliberada.** Configura esos valores antes de fijar tus recortes en OBS.

## Actualización en Windows

En la carpeta Git de la edición correspondiente ejecuta `git pull --ff-only`. Para TikTok, detén primero el servidor, vuelve a iniciarlo con `npm.cmd start` y recarga `http://127.0.0.1:4173/?v=0.1` mediante **Ctrl+F5**. En `main`, abre la página HTML actualizada.

## Versionado futuro

Esta es la versión **0.1**. El próximo conjunto acordado de cambios se documentará como **0.2**, y así sucesivamente. `main` y TikTok conservan la misma numeración de interfaz, pero sus integraciones son distintas.