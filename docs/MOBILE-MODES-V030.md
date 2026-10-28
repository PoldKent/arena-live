# Arena Live Mobile v0.30 · Roles de juego

## Nomenclatura uniforme

- **Modo Jugador** (`player`): controla al **protagonista** mediante gestos y botones táctiles. No muestra automáticamente el panel de herramientas ni su acceso flotante. Desde el menú puede elegir **Modo Director**, y puede abrir herramientas manualmente si lo necesita.
- **Modo Director (Streamer)** (`director`): dirige una partida local, utiliza jugadores, habilidades, comandos, escenarios y simulaciones. El panel de **Herramientas de dirección** se abre automáticamente durante un combate y el acceso 🧪 queda disponible. Los controles táctiles de Protagonista se ocultan. No requiere conexión a redes y no conecta a TikTok.
- **Partida**: grupo de **Nueva partida**, **Lobby**, **Revancha**.
- **Pausa**: botón persistente e independiente de los menús, tanto para el Jugador como para el Director.

## Comportamiento

- La selección del modo en **Nueva partida** solo se aplica al pulsar **Iniciar partida**.
- Cambiar el modo desde el menú durante una partida no reinicia el combate.
- De Jugador a Director: se deshabilita el control manual del protagonista y se muestran las herramientas de dirección.
- De Director a Jugador: se ocultan las herramientas y se habilita el control manual. Si no hay un protagonista vivo, se solicita incorporarlo mediante el mecanismo del motor; si el motor lo impide, se avisa. No se salta la regla del límite de jugadores ni el estado KO.
- El modo y las preferencias persisten localmente. Las configuraciones antiguas con el booleano `join` se migran al nuevo campo `mode` para no perder elecciones previas.
- Solo existen dos roles en Mobile; **Modo Stream** de escritorio y las capturas OBS no forman parte de esta distinción.
- Los identificadores internos heredados del motor (`isStreamer`, `joinAsStreamer`, etc.) se mantienen por compatibilidad. La experiencia y documentación utilizan terminología estándar.

## Validación

Se ha comprobado el código fuente y la sintaxis de los scripts integrados en la versión HTML autónoma. Las pruebas de navegador Android y GitHub CI deben repetirse cuando el entorno de ejecución esté disponible, antes de considerar la funcionalidad validada físicamente. El archivo móvil v0.30 se encuentra en `mobile-builds/Arena-Live-v0.30.0-movil.html`.
