# Arena Live — Diseño de emisión dual (decisiones cerradas)

> Documento histórico. La versión vigente y las instrucciones actuales están en [Arena Live v0.6](RELEASE-0.6-UNIFICADA.md) y en el [README](../README.md).

Fecha: 22 de octubre de 2026

**Nota histórica:** este documento describe el diseño de v0.1. Desde v0.4, `main` incluye también el puente de TikTok; la separación entre ramas descrita aquí ya no aplica. La organización actual usa paneles en la columna izquierda de Stream y se detalla en la [guía del operador](DUAL-OPERADOR-TIKTOK.md) y las [notas de v0.4](RELEASE-0.4-REGLAS.md).

## Objetivo

**Dual Full Screen es la única composición de emisión definitiva para OBS.** Nunca se elimina, no se sustituye por tres motores ni por tres ventanas, y muestra simultáneamente los dos lienzos del mismo combate.

## Decisiones confirmadas

| Nº | Área | Decisión |
|---|---|---|
| 1 | Preparación en escritorio | Vista 16:9 únicamente; botón **Ver 9:16** para alternar sin reiniciar la partida. |
| 2 | Preparación en móvil | Vista 9:16 únicamente; botón **Ver 16:9** para alternar. |
| 3 | Streaming dual | 16:9 maximizada a la izquierda; 9:16 reservada en el extremo derecho, con corrección fina de 10 píxeles predeterminados en monitores ultrawide. |
| 4 | Controles LIVE | Barra compacta superior con botones esenciales, sin cubrir el lienzo de juego. |
| 5 | Herramientas de prueba | Cajón inferior plegado de forma predeterminada; se conserva el panel existente sin duplicar lógica. |
| 6 | Captura estable | Mientras el modo dual esté activo, abrir/cerrar herramientas **no cambia tamaños ni posiciones de los lienzos**, para preservar los recortes de OBS. |
| 7 | Chat TikTok | Solo en la rama TikTok: historial de mensajes **recibidos por el puente local** dentro del cajón, plegado por defecto y exportable. No implica publicación en TikTok ni recepción garantizada de todo el chat de la plataforma. |
| 8 | Tipografía vertical | Escala según participantes: grande con pocos luchadores, compacta con multitudes, manteniendo legibles las clases. |
| 9 | Entrada al dual | Botón manual para activar Dual Full Screen, conservando partida y estado. Esc o botón Salir para restaurar la vista previa. |
| 10 | Controles permanentes | Pausa, Lobby, Prota, Ajustes, Pruebas; **Conectar TikTok** únicamente en la rama TikTok. |

## Política de interfaz y OBS

- El tamaño de los dos **lienzos reales** es siempre 960×540 y 540×960. El fullscreen los escala manteniendo relación 16:9 y 9:16.
- La geometría de captura se determina al entrar en pantalla completa y se **bloquea** mientras se está dentro, incluso al abrir/cerrar cajones, modificar el chat o interactuar con los controles. No se reescala en respuesta al cajón.
- Se reserva un área inferior compacta para los controles desplegables. El panel siempre queda fuera de los dos lienzos; cualquier espacio reservado permanece estable para que el recorte de OBS no se mueva.
- Los cambios manuales del tamaño de pantalla del navegador / resolución del sistema pueden alterar los recortes de OBS. Conviene configurarlos antes de comenzar el directo.
- En ultrawide la 9:16 se pega al extremo derecho; el pequeño ajuste de 4 px es visual y nunca depende del estado del cajón.
- Los controles visibles en la página también son visibles si OBS captura todo el monitor. Para una emisión limpia, recorta en OBS cada lienzo o las regiones de juego dentro del dual. **No estamos eliminando el modo dual**, que permanece como única consola principal de streaming.

## Diferencias entre ramas

- **main**: juego HTML autónomo con preparación adaptativa y consola dual para pruebas y ajustes, sin Node.js ni conexión real a TikTok.
- **feature/tiktok-live-chat-mvp**: lo anterior, además del servidor local, conexión a `@polkent.live` y bandeja plegable para chat recibido.
- Las reglas de combate y el tope de 128 luchadores no cambian.

## Comprobación funcional requerida

- Vista inicial escritorio 16:9, móvil 9:16; alternar no reinicia combate.
- En dual siempre aparecen los dos lienzos; el derecho no debe ocultarse por CSS.
- Las herramientas se mantienen utilizables desde el cajón sin clonarse.
- Tamaños y coordenadas de ambos lienzos iguales antes y después de abrir/cerrar el cajón.
- Los controles de Pausa/Lobby/Prota/Ajustes/Pruebas son clicables.
- En TikTok el botón de conexión usa el puente local, el chat recibido está en su cajón y el botón de exportación sigue disponible.

## Pulido de OBS en v0.1

El HUD de duelo en **9:16** usa barras de vida de **14 px** y nombres/porcentajes de **12 px**. En ultrawide, la barra superior mide **34 px** y el espacio inferior inicia en **76 px**, en vez de 108 px. La corrección derecha 9:16 inicia en **10 px**; ambos valores son configurables desde Ajustes. El pie de Ajustes identifica **Arena Live v0.1** y la edición.
