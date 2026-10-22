# Arena Live

Prototipo de juego interactivo para transmisiones en vivo. Los espectadores pueden participar mediante mensajes y comandos; el streamer puede controlar al personaje principal y simular interacciones de audiencia para realizar pruebas.

## Ejecutar

1. Descarga **[index.html](index.html)**.
2. Ábrelo en un navegador moderno.
3. Utiliza **Herramientas de Prueba** para simular espectadores y comandos.

> **Estado:** prototipo local. Los eventos del simulador no equivalen a una conexión real con TikTok, YouTube, Facebook u otras plataformas; una integración en producción requerirá autenticación, recepción de eventos y validación en un servidor.

## Pantalla completa dual (TikTok)

Abre Arena Live mediante `npm.cmd start` en Windows, entra en `http://127.0.0.1:4173` y pulsa **Dual · Pantalla completa + controles**. Aparecerán ambos juegos y, a la derecha, herramientas del directo y una bandeja de mensajes **recibidos** de TikTok. El panel no escribe en el chat público de TikTok ni está destinado a capturar la imagen limpia del juego. Consulta [la guía de la consola dual](docs/DUAL-OPERADOR-TIKTOK.md).

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

## Primer puente de chat TikTok LIVE (rama de prueba)

La rama `feature/tiktok-live-chat-mvp` incorpora un servicio Node.js local para el primer experimento con el chat de **@polkent.live**. Todavía **no** integra eventos de regalos, no ofrece salidas OBS independientes ni sustituye al HTML monolítico.

En Windows, con Node.js 20+ instalado:

```powershell
npm install
npm start
```

Abre `http://127.0.0.1:4173/`, prueba el comando con el botón **Probar comando** y conecta al LIVE público desde el panel **TikTok LIVE** cuando estés emitiendo. Consulta la [guía paso a paso](docs/TIKTOK-LIVE-MVP.md).

El conector es no oficial, con dependencias de terceros. Esta integración requiere prueba real y revisión de licencias antes de distribuirse comercialmente.

## Pantalla completa dual ultrawide (3440×1440)

La pantalla **9:16 se muestra prioritariamente en el extremo derecho**; el juego **16:9** queda a la izquierda con los controles del LIVE encima y debajo. Se corrigió el problema por el que la pantalla vertical quedaba oculta. Compatible con escalado de Windows. [Guía de la corrección](docs/ULTRAWIDE-3440-FIX.md).
