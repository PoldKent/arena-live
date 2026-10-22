# Arena Live

## Modo de transmisión dual definitivo (22/10/2026)

**La emisión oficial en OBS utiliza Dual Full Screen**, no dos procesos de juego distintos. En preparación, el navegador muestra solo **16:9 en escritorio** o **9:16 en móvil**; el botón «Ver 9:16 / Ver 16:9» alterna sin reiniciar la partida. El botón **Dual · Pantalla completa** activa ambos lienzos sincronizados: horizontal grande a la izquierda, vertical en el extremo derecho (corrección visual de 4 px para ultrawide), barra LIVE de 42 px y cajón inferior de pruebas cerrado. Abrir el cajón no mueve ni reescala los lienzos que captura OBS. La tipografía vertical se adapta al número de jugadores.

Controles en la barra: **Pausa, Lobby, Prota, Ajustes y Pruebas**. Esta rama mantiene su **HTML autónomo sin Node.js ni conexión a TikTok**. Consulta [decisiones de diseño](docs/DECISIONES-STREAM-DUAL-2026.md).

Prototipo de juego interactivo para transmisiones en vivo. Los espectadores pueden participar mediante mensajes y comandos; el streamer puede controlar al personaje principal y simular interacciones de audiencia para realizar pruebas.

## Ejecutar

1. Descarga **[index.html](index.html)**.
2. Ábrelo en un navegador moderno.
3. Utiliza **Herramientas de Prueba** para simular espectadores y comandos.

> **Estado:** prototipo local. Los eventos del simulador no equivalen a una conexión real con TikTok, YouTube, Facebook u otras plataformas; una integración en producción requerirá autenticación, recepción de eventos y validación en un servidor.

## Características actuales

- Aplicación monolítica: HTML, CSS y JavaScript en un solo archivo.
- Dos formatos de juego: **16:9** horizontal y **9:16** vertical, con vista dual.
- Combate automático con clases **Guerrero, Shinobi, Rayo, Espíritu y Titán**.
- Modos adaptables a la cantidad de participantes; lobby, combate, K.O. y victoria.
- Controles de teclado y gestos táctiles, incluida la opción de jugar como protagonista.
- Chat de prueba, comandos localizados, burbujas sobre los luchadores y efectos sociales simulados.
- Interfaz multilingüe: español, inglés, francés, alemán, portugués, italiano, chino y japonés.

## Controles principales

- **WASD:** desplazamiento de Prota.
- **Espacio:** salto y doble salto.
- **E:** golpe normal.
- **R:** ataque especial de la clase.
- **Móvil:** joystick de movimiento, toque para saltar, deslizamiento para golpear y pulsación mantenida para el especial.

La pantalla contiene ayuda contextual para otras acciones.

## Arquitectura del prototipo

Por decisión de diseño, el juego permanece en **[index.html](index.html)**. Dentro del archivo se han identificado límites lógicos para una futura separación de módulos, pero **no se ha dividido aún**.

Actualmente utiliza dependencias de interfaz desde CDN, por lo que algunas tipografías, iconos o estilos externos requieren conexión a Internet.

## Documentación

- [Registro de cambios](CHANGELOG.md).
- [Decisiones de producto y presentación](docs/DECISIONES.md).
- [Informe de la Fase 3](docs/informe-layout-fase3.md).

## Próximos pasos

- Terminar de implementar y verificar las recompensas de sesión acordadas en la Fase 2.
- Integrar eventos reales de plataformas mediante una capa de servidor segura.
- Añadir pruebas automatizadas repetibles y revisar el rendimiento en móviles reales.
- Separar módulos gradualmente cuando el prototipo esté estabilizado.

**Importante:** la rama `main` contiene la base actual; conviene desarrollar cambios posteriores en ramas y revisarlos antes de fusionarlos.
