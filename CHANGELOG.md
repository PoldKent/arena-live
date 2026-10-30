## Mantenimiento de v0.40.7 — auditoría de código y documentación (2026-10-29)

- README principal reorganizado por producto, arranque, arquitectura, pruebas y riesgos. Corregida la confusión entre la fuente 0.40.7 y el único HTML móvil rastreado, que continúa siendo 0.40.6.
- Actualizada la guía móvil offline y añadida la matriz técnica `docs/AUDITORIA-INTEGRAL-2026-10-29.md` con alcance y validaciones pendientes.
- Normalización de nombres de usuarios sociales LIVE centralizada para taps, compartir, follows, regalos, suscripciones y entradas informativas; añadidos casos de identificadores malformados.
- Eliminado el escaneo cuadrático de IDs al construir los resultados de hasta 128 luchadores; ampliada prueba de unicidad del podio.
- Concluida la limpieza de ramas: solo `main`. Retirados el comando y las pruebas del limpiador remoto ya innecesario; sus versiones se conservan en Git.
- No se modifica la física, el balance, los controles o la facturación. Verificación aislada de sintaxis/funciones básicas realizada; suite completa Node, Playwright, exportación móvil y TikTok real pendientes porque Actions no asigna runners con presupuesto 0 USD.

## v0.40.7 — Choques, reingreso y rebote de suelo (2026-10-29)

- Libre: entradas/reingresos ilimitados mientras la ronda está abierta, salvo el duelo 1vs1; las reglas de vidas y tiempo conservan sus restricciones.
- El golpe básico usa 6 fotogramas de recarga (4 en berserk). NPCs orientan el ataque básico arriba o abajo para alcanzar blancos en vertical.
- Básicos recíprocos en un mismo tick: choque, retroceso de ambos y cero daño entre ellos.
- Golpe hacia abajo contra el suelo: rebote ascendente y lateral que daña y empuja como máximo a un rival próximo a izquierda y uno a derecha.
- El especial mantiene la interacción preexistente: la carga puede interrumpirse con daño básico; el especial ya disparado aplica su impacto normal. El choque explícito básico/especial queda para decisión de diseño.
- Un solo motor para escritorio, TikTok y exportación móvil. La exportación v0.40.7 se regenera con el build oficial.

## v0.40.6 — Golpes verticales y control móvil multitáctil (2026-10-29)
- Golpes básicos y especiales hacia arriba/abajo con hitboxes y empuje direccional real, apuntado con analógico/WASD o con gestos verticales.
- Joystick móvil: hasta cinco contactos independientes a la vez (analógico, tres botones y un gesto sobre el escenario), liberación por dedo o cancelación.
- Leyenda compacta y translúcida visible solo en Táctil total sin joystick, sobre el escenario sin reducir las capturas 9:16 y 16:9.
- Pruebas de navegador de golpes verticales, especial apuntado y cinco contactos; el HTML móvil se genera desde la versión principal.

# Registro de cambios — Arena Live

## 2026-10-29 — Arena Live v0.40.5 · Refactorización de la versión oficial PC/OBS/TikTok

- El HTML oficial `index.html` pasa de aproximadamente 755 KB a 174 KB, sin eliminar el juego: se extraen intactos sus ~581 KB de lógica clásica a `engine/arena-game.js` y se cargan en el mismo orden que antes.
- El servidor local autoriza explícitamente la nueva ruta del motor, conservando su seguridad de origen local, la integración TikTok LIVE y el cliente puente; los estilos y capturas OBS no se modifican.
- Los tests de código y equilibrio pueden reconstruir virtualmente la fuente monolítica original para verificar las reglas existentes; se agregan pruebas del límite de 500 KB, el orden de dependencias, los módulos, fullscreen y el paquete móvil.
- Se conserva el generador de la versión móvil autónoma, que vuelve a incrustar el mismo motor para descomprimirlo localmente. Tanto el paquete móvil publicado como el HTML oficial mantienen la versión 0.40.5.
- El HTML oficial depende del resto de archivos del proyecto y debe iniciarse desde el servidor local (`npm.cmd start`); no es un archivo HTML autónomo. Pendiente validación de navegador y conexión TikTok LIVE real.


## 2026-10-29 — Arena Live v0.40.5 · Reconstrucción móvil y archivo menor a 500 KB

- Reconstrucción del CSS móvil: eliminados los parches históricos y el antiguo contenedor visual de controles. Los tres botones originales conservan sus funciones dentro de una capa independiente.
- Escenario 9:16 siempre a tamaño máximo. Joystick, botones y cinco poderes Streamer flotan debajo del horizonte visual sin reducir ni recortar el juego.
- Menú con X centrada, Atrás/Escape y doble ☰; Streamer con panel desplazable, clases intactas y transparencia de fondo real de 0–100%, manteniendo la legibilidad del texto.
- Opción móvil de marco automático, 9:16, 9:19.5, 9:20 y 9:21 independiente de OBS.
- HTML offline, compacto, íntegro, descomprimible en el navegador: `mobile-builds/Arena-Live-v0.40.5-movil.html` con límite estricto de 500.000 bytes.
- Nuevas comprobaciones estáticas y de empaquetado; pendiente validación visual/táctil de la versión en Android.


## 2026-10-29 — Arena Live v0.40.4 · Escenario siempre máximo / controles flotantes

- Revisión de las siete capturas Android posteriores a 0.40.3: no se reserva espacio inferior ni se reduce el escenario para joystick, botones, cinco poderes, panel de pruebas o menús. La arena 9:16 mantiene su escala máxima dentro de los límites reales de pantalla y barra superior; los controles son capas transparentes superpuestas y pueden sobresalir de su marco.
- Corregida la barra fantasma: la antigua barra de operador no dibuja contorno cuando sus botones se usan como controles Gameboy, y la fila original de cinco habilidades conserva colores distintivos y nombres.
- Botones de acción con separación de áreas táctiles: se usan las preferencias guardadas y, si están superpuestas, se presentan temporalmente en posiciones seguras sin borrar el ajuste previo. Joystick independiente de los límites del marco del video.
- X de menú sustituida por SVG centrado; menú flotante más compacto, controles ocultos mientras está abierto y cierre mediante X, segundo toque ☰ o Atrás/Escape cuando el navegador entrega el evento, sin cambiar el tamaño del juego.
- Panel Streamer compacto y desplazable, con scrolling interno y cinco habilidades visibles. Aviso de Prota limitado a los bordes reales del video.
- Ajustes móviles: marco de referencia automático/9:16/9:19.5/9:20/9:21 para pantalla completa; el marco no reduce, recorta ni cambia el motor 9:16. La calibración OBS del proyecto principal permanece independiente.
- Publicado el HTML monolítico completo `mobile-builds/Arena-Live-v0.40.4-movil.html`. Extensión de pruebas de regresión de interfaz y tamaño invariante. Validación visual real en Android y ejecución de navegador siguen siendo necesarias antes de considerarlo cerrado.


## 2026-10-29 — Arena Live v0.40.3 · Interfaz móvil y navegación segura

- Corregida la franja vacía de la antigua barra táctil. Jugador conserva joystick, salto, golpe y poder sin mostrar el rail de cinco clases del Streamer; Streamer conserva exclusivamente sus cinco habilidades originales, con nombres visibles.
- Posiciones Gameboy escalonadas y con reserva vertical adaptada al tamaño de botones. Migración de posiciones predeterminadas v0.40 RC2 y conservación de preferencias personalizadas; cambiar tamaño recalcula el espacio de la arena.
- Pantalla completa nativa y teatro Android reservan cabecera y zona táctil sin ocultar el borde superior del marco 9:16 ni cambiar la simulación. El panel de pruebas y el menú no alteran el tamaño del video.
- Menú compacto con botón X; pulsar de nuevo ☰ lo cierra. Escape / Atrás gestionan submenús, menú, ajustes y pruebas antes de abandonar la vista; se utiliza historial cuando el navegador admite pushState sobre el archivo local. El sistema operativo puede conservar prioridad sobre el fullscreen nativo.
- Panel del Streamer con desplazamiento interno y altura limitada. La transparencia desvanece el fondo, nunca el texto ni los formularios; los cinco botones quedan independientes.
- Mejorado contraste del botón Iniciar partida y desambiguación del modo activo; aviso legible de Prota para combates multitudinarios o al quedar fuera de combate.
- Paquete oficial monolítico generado desde el mismo motor y estado de main: `mobile-builds/Arena-Live-v0.40.3-movil.html`. Los históricos RC1–RC4 se conservan como referencia.
- Añadidas pruebas estáticas y de navegador para aislamiento, cierre, fullscreen, separación geométrica de botones y transparencia. La validación CI de GitHub Actions debe ejecutarse en un runner; el servidor no modifica reglas físicas, TikTok LIVE ni OBS.


## 2026-10-28 — Arena Live v0.39 · Sincronización y regresiones móviles

- Sincronizadas las referencias de estilo y de los cinco módulos del motor con la versión 0.39 para evitar fallos al generar el HTML móvil desde los archivos fuente (quedaban referencias a v0.36).
- El generador móvil ahora registra las huellas Git de los archivos incluidos sin requerir Git instalado, como los HTML descargables publicados.
- Nombre visible consistente «Modo Streamer» en el panel avanzado y en su entrada de menú, manteniendo intacto el identificador interno de compatibilidad.
- Actualizadas las pruebas de ayuda desde Menú, disposición de los botones y consistencia de las versiones. Se conservan las cinco habilidades inferiores, el panel avanzado bajo demanda y el HUD 1v1. La verificación visual en Android sigue pendiente.


## 2026-10-28 — Arena Live v0.38 · Modo Streamer y ergonomía móvil

- Nombres visibles estandarizados: «Modo jugador» y «Modo Streamer»; antiguo identificador interno `director` conservado para compatibilidad del guardado. «Herramientas de dirección» se sustituye por «Panel del streamer», «Jugadores y K.O.» por «Participantes y K.O.», y «Jugador, poderes y comandos» por «Jugador y comandos» en móvil.
- Pausa, Menú y Pantalla completa pasan a una barra compacta en la esquina superior; la ayuda se consulta desde Menú y se elimina el botón redundante de herramientas flotantes. La acción de abrir Panel del streamer continúa accesible desde el menú.
- Las cinco habilidades de clase originales, con sus mismos handlers, aparecen en una barra de cinco botones al pie del escenario durante Modo Streamer. El panel avanzado queda cerrado por defecto, se abre a demanda, es compacto y desplazable.
- Ajustes y Combate se limitan al viewport, con columnas y campos min-width:0, selectores al ancho disponible, sliders fluidos y desplazamiento vertical interno. Los duelos 1v1 siguen mostrando las dos barras superiores.
- Cambios aplicados en fuentes `portable/mobile.css`, `portable/mobile-runtime.js` y `portable/mobile-touch.js`, HTML autónomo y tests. Prueba física en Android y TikTok LIVE aún pendiente.


## 2026-10-28 — Arena Live v0.37 · HUD independiente y panel Director compacto

- Sustituido el checkbox largo de participación TikTok por seis controles individuales: mostrar nombres, nombres de bots, vida, vida de bots, energía y energía de bots. Siguen las opciones existentes de números de daño y texto de habilidades.
- Migración automática de preferencias `arenaLiveCombatDisplayV1.tiktokNamesOnly` y compatibilidad con los controles guardados. Participantes LIVE y Protagonista mantienen sus datos; las estadísticas superiores 1v1 de ambos combatientes **nunca** se ocultan con este filtro.
- Rediseño del panel móvil Herramientas de dirección: selector fijo, contenido dentro de una única hoja desplazable con alto limitado, cierre, minimización y arrastre de la hoja completa. Se elimina la distribución flotante que se superponía al combate y al resultado. Se preserva el mismo panel de comandos, jugador, interacciones y simulación sin duplicarlo.
- Actualizados tanto los archivos fuente `portable/mobile.css` y `portable/mobile-touch.js` como el HTML monolítico v0.37, además de las pruebas de regresión. La comprobación visual en dispositivo y TikTok LIVE real queda pendiente.


## 2026-10-28 — Arena Live v0.36 · Mantener barras superiores en 1v1

- Se corrige el alcance del filtro LIVE de v0.35: **solo** oculta nombres, HP y energía dibujados sobre personajes simulados. Las barras superiores del marcador de duelos 1v1 continúan mostrando a **ambos** participantes, incluidos bots, en 16:9 y 9:16.
- Se elimina el código que ocultaba paneles y cambiaba el ancho del marcador en 1v1. El daño, las reglas, las preferencias y la incorporación por taps o `!jugar` permanecen intactos.
- HTML móvil autónomo v0.36 y pruebas de regresión actualizados. Siguen pendientes las comprobaciones completas de navegador, Android y TikTok LIVE real.


## 2026-10-28 — Arena Live v0.35 · Ocultar vida y energía de luchadores simulados

- El filtro de participantes LIVE de Pantalla y HUD ahora oculta nombres, barras de vida y energía a los bots que no hayan entrado con taps o `!jugar`, en ambas capturas. Mantiene visibles los indicadores de participantes confirmados y Protagonista.
- Aplica también al panel 1v1 superior: ambos bots lo ocultan; cuando solo hay un participante confirmado, se oculta el bloque del bot y el superviviente visible usa el ancho del panel. No se alteran el combate, el daño ni las estadísticas del luchador.
- El filtro de participación es independiente del interruptor general de nombres; conserva la clave de preferencias existente para migración sin sobrescritura.
- HTML autónomo Mobile v0.35 sincronizado. La conexión TikTok LIVE real y las pruebas gráficas en Android requieren verificación fuera de la simulación local.


## 2026-10-28 — Arena Live v0.34 · Etiquetas de espectadores LIVE y entradas en combate

- Nuevo filtro opcional en Pantalla y HUD: mantener visibles solo nombres y clases de personas que hicieron tap o enviaron `!jugar` en TikTok, además del Protagonista. Los bots y participantes sin esas señales siguen peleando sin etiqueta. No modifica estadísticas, cupo, clasificación ni barras de vida.
- Los taps también confirman participación de luchadores ya activos, sin contabilizarlos otra vez como nuevas entradas. Se persiste la preferencia junto a los otros controles del HUD.
- Se comprueba la ruta de ingreso y reingreso por taps durante combate con Entrada libre, y la incorporación/reincorporación de Prota incluso cuando 128 plazas están ocupadas por bots; las victorias ya declaradas y los límites para espectadores reales permanecen protegidos.
- Edición monolítica Mobile 0.34.0 actualizada (solo pruebas locales: no conecta a TikTok por sí misma). Pruebas de integración agregadas, pendientes de ejecución completa en navegador y en un LIVE real.


## 2026-10-28 — Arena Live v0.26 · Puesto de mando y TikTok LIVE

- Ajustes reorganizados mediante cinco pestañas, buscador, selección persistente y carril lateral que reserva espacio para ver las capturas en escritorio; se reutilizan los controles, listeners y claves existentes.
- Centro de pruebas consolidado con seis accesos rápidos y un solo panel de pruebas expandido al navegar, manteniendo el chat independiente y la libertad de acoplar paneles.
- Barra de arriba reordenada por frecuencia: TikTok, Prota, Pausa, Ajustes, Pruebas y Chat, con menos espacio perdido y acceso a opciones secundarias por desplazamiento.
- La regla de ingreso se restaura del navegador después de actualizar en lugar de forzarse a Entrada libre.
- Auditoría y nueva recepción de eventos LIVE (seguir, regalos y suscripciones), con deduplicación y controles de diagnóstico: los regalos de racha solo aplican el apoyo final; los eventos apuntan al autor real; entradas y audiencia son únicamente métricas. Otros eventos y soportes no TikTok siguen disponibles en el simulador.
- Pruebas de integración del controlador único con los tres nuevos eventos y navegación entre secciones para las pruebas del operador.


## 2026-10-28 — Arena Live v0.25 · Transparencia del resultado final

- El regulador existente **Opacidad de la información del juego** ahora afecta a la tarjeta completa de victoria en 16:9 y 9:16: nombre del campeón, podio, estadísticas y controles, sin cambiar sus proporciones ni ocultarla.
- Comparte la misma variable persistida `--arena-hud-opacity` con el lobby (35–100 %); cambios en vivo sin recargar.
- Pruebas de navegador para los valores 35/70/100 en ambas capturas, restauración de la preferencia y controles de revancha/nuevo lobby.
- No se modifica física, lógica de victorias ni calibración OBS; versión sincronizada 0.25.0.


## 2026-10-28 — Arena Live v0.24 · Ingreso por TAP TAP durante el combate

- Los dos monitores y las pantallas de lobby invitan a **«¡Dale TAP TAP para unirte!»**, sin exigir escribir el comando de unión.
- El puente procesa taps de espectadores nuevos **y** de participantes eliminados durante lobby y combate, en vez de descartarlos si su personaje existía.
- Se preservan las reglas independientes: Entrada libre ilimitada, Por tiempo hasta que llegue a cero y Por vidas según oportunidades restantes; no se alteran desde el evento de tap.
- La victoria/KO decidido y el máximo de participantes siguen cerrando la entrada. Los taps de participantes vivos siguen siendo boosts, no curación repetida de `!jugar`.
- Las burbujas de cabeza muestran solamente texto normal, nunca comandos de clase/poder/unión, incluso ante llamadas directas del simulador.
- Pruebas de navegador de los tres modos y del puente, sin alterar física ni capturas 1920×1080 y 1080×1920.


## 2026-10-27 — Arena Live v0.23 · Lobby, reingresos y eventos TikTok

- El regulador de opacidad afecta ahora al cartel y las instrucciones del lobby en los monitores 16:9 y 9:16.
- La entrada y el reingreso siguen disponibles durante Duelo 1v1, hasta que se activa el KO final; las vidas y el máximo de participantes siguen aplicándose.
- Los comentarios reales de TikTok generan burbujas sobre el luchador emisor, sin duplicar mensajes del simulador y respetando el interruptor.
- El puente se suscribe al evento SHARE y lo envía exclusivamente al propietario de la cuenta TikTok que compartió; aplica curación y diez segundos de protección. Endpoint local de prueba /api/test-share.
- Prota puede entrar durante el combate y liberar una plaza de un eliminado o de un bot al alcanzar capacidad, sin expulsar a espectadores reales activos.
- El campeón anterior queda incluido, con su clase y nombre, en el nuevo lobby incluso al limpiar la lista; indicador visible en ambas capturas.
- Sin cambios en física, daño de clases, resoluciones Full HD ni reglas de 3 vidas.
- Bloqueo preventivo de las admisiones después de una victoria y excepción de anti-spam para reingresos legales muy rápidos; seis escenarios de navegador que ejercitan las correcciones.
- Verificación HTTP del evento SHARE solo para la ventana controladora y de que sesiones LIVE antiguas no puedan repetir compartidos.
- Panel LIVE con botón «Probar compartir» y contadores de compartidos recibidos/boosts aplicados para detectar problemas de conexión o de admisión.


## 2026-10-27 — Arena Live v0.22 · Selección segura GPU / software

- Comparación de v0.21 con v0.20: el dibujo de sprites resultó más lento en el Chromium Linux que utiliza **SwiftShader**, por lo que la ruta acelerada ahora se usa **solo** si se detecta GPU física mediante WebGL; si no, vuelve al dibujo vectorial probado.
- Ambas rutas conservan exactamente los dos lienzos Full HD, el estado de combate, las etiquetas/bonus y las barras de vida. Los sprites se mantienen para GPU compatible; en software los cachés de métricas siguen evitando trabajo redundante.
- Para diagnosticar, `ArenaLive.renderSpriteMode` indica `hardware-candidate` o `software-safe-vectors`; parámetros locales `arenaSprites=off|force` permiten comparar, sin implicar una garantía de FPS.
- Ajustes de la prueba de regresión para verificar tanto la ruta vectorial como la ruta de imágenes. Versión visible/API/paquete 0.22.0.

## 2026-10-27 — Arena Live v0.21 · Composición acelerable por GPU

- Sprites Canvas 2D transparentes reutilizables de las placas de nombre/clase: un dibujo al crear o cambiar el texto, luego composición con `drawImage` para 32, 64 y 128 guerreros en 16:9 y 9:16.
- Sprites compartidos de cuerpo, ojos y cinta, con claves por color/clase, dirección, radio, daño y Prota. Límite global de 72 variaciones; sombras, animación de cola, aura, escudos, HP y poderes siguen vivos.
- El navegador sigue utilizando Canvas 2D con `willReadFrequently:false`, elegible para aceleración por GPU; el modo GPU y los controladores determinan si se ejecuta en hardware.
- Capturas 1920×1080 y 1080×1920 y física intactas; pruebas de cachés, comportamiento y estrés.
- Versión visible, API y paquete sincronizados en 0.21.0.

## 2026-10-27 — Arena Live v0.20 · Marcadores de vida por HP

- Los dos marcadores superiores de Duelo 1v1 muestran HP restantes en números enteros (`180 HP`, `75 HP`) en las capturas 16:9 y 9:16; ya no indican `100%`.
- Se conservan la anchura proporcional y los colores de las barras, los porcentajes de energía y el rendimiento existente de ambos lienzos.
- Prueba de regresión del formato de HP. Versión visible, API y paquete sincronizados en 0.20.0.

## 2026-10-27 — Arena Live v0.19 · KO y doble salto con recuperación lateral

- KO! centrado y sin marco, como GO!, en horizontal y vertical. Los resultados por tiempo muestran FIN!; el podio conserva su pantalla.
- IA de Smash/Duelo recupera antes del abismo y la isométrica rescata expulsiones lejanas incluso durante el ascenso.
- Más inercia lateral en caídas y mejor impulso de retorno al usar doble salto. Sin salto aéreo gratuito tras gastar los dos.
- Se eliminan los dos puntos celestes; pruebas de recuperación y KO, versión 0.19.0 sincronizada.
- Arregla dos fallos anteriores de CI: entorno de la prueba de rendimiento y utilidad CSS `.ease-out` de la hoja publicada.


## 2026-10-27 — Arena Live v0.18 · Un solo panel de jugador

- Retira Jugador objetivo y su acceso del navegador de herramientas. Jugador, poderes y comandos conserva el único selector, identidad, estado, clase y comandos, con la selección compartida por chat y apoyos.
- Elimina el selector espejo y los estados duplicados. Compacta nombre/clase y muestra el cambio de clase al elegir un jugador fijo.
- Adapta las distribuciones y configuraciones anteriores de ambos modos: conserva la posición de Poderes y lo abre si antes estaba abierto Jugador objetivo. Mantiene preferencias de clase y OBS.
- Actualiza versión, API, paquete y descarga monolítica a 0.18.0. Conserva las entregas e informes históricos.

## 2026-10-27 — Arena Live v0.17 · Preferencias y pruebas de clase

- Cinco preferencias de objetivo independientes en Ajustes → Equilibrio por clase, con persistencia, respaldo de configuración y restauración conjunta. Conserva los valores iniciales de Guerrero/Shinobi y la cercanía de Titán/Rayo/Espíritu. Identifica preferencias personalizadas junto a las victorias históricas.
- Panel de poderes con selector sincronizado, nombre/clase/HP/energía, clase de prueba, comandos dirigidos y última identidad usada. El aleatorio filtra por la firma; un fijo conserva su identidad, incluso eliminado.
- Adaptación explícita de clase para probar cualquier firma, energía completa y recarga lista solo en estas herramientas. Desde el lobby inicia el combate; mantiene pausa, clase única, poderes bloqueados y resultado final.
- Corrige accesos al panel en Stream/móvil y conserva el panel mientras se usan sus controles. Mantiene los comandos de ejecución vinculados al verdadero lanzador.
- Una sola v0.17.0 para paquete, API, pie de Ajustes, recursos y HTML móvil generado desde main. Documentos y datos v0.15/v0.16 conservados.

## 2026-10-27 — Exportación monolítica móvil de v0.16.0

- `build:mobile` reúne el HTML, cinco módulos del motor y CSS en un archivo reproducible de menos de 1 MiB, sin fuentes ni dependencias de red.
- Inicio rápido de 2, 4, 9, 32, 64 o 128 peleadores, Prota opcional, joystick en la vista activa y barra inferior en ambas orientaciones. Chat de pruebas seleccionado inicialmente.
- Perfil inicial de 720p / 30 FPS / Rendimiento; 540p o 1080p y 60 FPS opcionales. Un canvas oculto libera su respaldo, y la vuelta desde otra app reinicia el reloj sin adelantar la partida. La física sigue a 60 pasos por segundo.
- Generado desde el mismo combate y equilibrio de `main`; sin ramas ni otra implementación de reglas. El servidor principal conserva ambas capturas Full HD y TikTok LIVE. La descarga funciona sin conexión y sus interacciones sociales son simuladas.
- Pruebas de archivo local sin red, controles táctiles, los tres modos, carga con 128, persistencia, almacenamiento bloqueado y paridad de combate entre perfiles. CI incluye la exportación móvil en Windows y Linux.

## 2026-10-26 — Arena Live v0.16 · Identificación de la entrega terminada

- Distingue la entrega final de la etiqueta v0.15 utilizada durante su implementación. Las seis correcciones se incorporaron en `1976160` y la compatibilidad Windows en `6ae39a4`.
- Sincroniza paquete, shrinkwrap, API, título del navegador, pie de Ajustes y revisiones de recursos con 0.16.0 / 0.16. El título conserva la versión al cambiar cualquiera de los ocho idiomas.
- Conserva los informes de equilibrio y rendimiento v0.15 como evidencia de las correcciones. Esta entrega corrige su identificación; mantiene los parámetros de combate de la entrega validada.



## 2026-10-26 — Arena Live v0.15 · Seis correcciones integradas

- Partidas: revancha del roster completo, reinicio de vidas sin bonos ni atribución antiguos, puntuación por daño efectivo, podio inmutable sin duplicados y empate sin supervivientes. El ganador por tiempo puede estar eliminado y tiene una presentación separada.
- Juego: energía y espera compartidas entre IA/chat/Prota/pruebas; política participativa opcional; cola de pausa acotada y caducable; reloj por tiempo simulado y RNG de combate separado del visual.
- Rendimiento: presupuestos de partículas, descarte fuera de cámara, nombres según supervivientes, dibujo de 30/60 FPS independiente de la física, audio con 16 voces y diagnósticos con tiempos de CPU. Full HD y OBS conservados.
- TikTok: generaciones de conexión, timeout, reconexión gradual, descarte de eventos antiguos, cierre del servidor con sockets abiertos y traspaso explícito de ventana receptora. Historial circular de 50.000 mensajes; métricas sin datos ficticios.
- Equilibrio: Guerrero prioriza su clase a distancia parecida (25 %); Arena limita Kame/Coloso/Trueno a dos blancos; Enredadera enlaza dos con daño 32 y carga 28. Duelo y Smash conservan sus perfiles. Radar pentagonal con resultados medidos e intervalos de 2.400 partidas de validación.
- Ajustes: sesión/rendimiento en ocho idiomas, volumen, opacidad persistente, exportación/importación de configuración y diagnóstico; Stream conserva el panel hasta reemplazarlo o cerrarlo con ×.
- Compatibilidad Windows: lectura de pruebas con LF/CRLF y finales de línea canónicos, verificados con las 80 pruebas en ambos formatos.
- Mantenimiento: módulos de reglas/dibujo/audio/ajustes, eliminación de parámetros ignorados, dependencias exactas con shrinkwrap y CI para Windows/Linux. Historial documental y claves de almacenamiento conservados.


## 2026-10-24 — Arena Live v0.14 · Depuración y carga con 128 peleadores

- Retiradas doce funciones heredadas, rutas cooperativas inactivas, tarjetas/leyendas de HUD ocultas, descripción de modo sin elemento, constantes sin referencias y 32 selectores CSS anteriores.
- Estilos de utilidades precompilados y servidos localmente: el compilador Tailwind deja de ejecutarse y observar cambios del chat durante la emisión. CSS verificable con `build:styles`, incluido en la entrega.
- Bucles de física directos, selección estable de uno a tres blancos con una distancia por candidato y caducidad de efectos en un recorrido, conservando orden, RNG, potencias y límites.
- Menos listas temporales de estado/dibujo, tiempo de animación compartido, selector de objetivo incremental y HUD sin reescrituras innecesarias. Corregida la línea base de nombres/clases al mostrar bonificaciones.
- Canvas 2D opaco compatible con aceleración automática del navegador y diagnóstico `test:gpu` con estado real del renderer. Capturas Full HD, OBS, controles y almacenamiento conservados.
- 57 pruebas de Node, 65 de navegador, 18 de carga y 18 de diagnóstico aprobadas; estados de carga idénticos a v0.13 y 200 partidas idénticas a la muestra v0.12. Validación por software, sin GPU física ni LIVE real; no se promete una mejora general de FPS.

## 2026-10-24 — Arena Live v0.13 · Radar pentagonal de equilibrio

- El inspector de equilibrio sustituye las barras por un radar pentagonal: un eje por clase, dos polígonos en HP para daño básico (discontinuo) y especial (continuo), anillos de referencia y escala compartida entre modos.
- Conservados los selectores de modo, perfil y rival; botones con valores exactos, clase, poder y afinidad; selección con foco de teclado y detalle por modo. Los puntos representan los mismos daños que ejecuta el motor.
- Etiquetas completas en escritorio y ejes numerados vinculados a la lista en columnas estrechas. Ajuste al ancho con un solo observador, ocho idiomas, descripción accesible y polígonos válidos con poderes bloqueados o clases restringidas.
- La actualización cambia la presentación del inspector. Combate, prioridades, cadena A, potencias, TikTok, capturas y calibración OBS conservan su código; versión 0.13/0.13.0 en pie de Ajustes, API, servidor y paquete.

## 2026-10-24 — Arena Live v0.12 · Cercanía de los Shinobi

- Shinobi enfrenta al rival cercano y prefiere otra clase solo hasta un 15 % más lejos, dentro del alcance de cada acción. La misma regla sirve para persecución, golpes y Rasen; los compañeros pueden dañarse y disputar la final.
- Búsqueda lineal sin ordenar listas, empates estables y comparación del límite exacto. El margen comparte constante con el texto del inspector en ocho idiomas, la API de consulta y la metadata del analizador.
- Conservados cadena A, +10 % / −10 % de daño, perfiles de poderes, TikTok, comandos, Full HD y OBS. Versión 0.12/0.12.0 en pie de Ajustes, API, servidor y paquete.
- 52 comprobaciones de Node, 62 de navegador y 12 de carga. Se repiten 2.400 partidas: 2.000 duelos y 100 partidas con cinco peleadores idénticos a v0.11. En las muestras de 25 y 125, las victorias Shinobi bajan de 45 a 19 y de 93 a 23 sobre 100. Guerrero y Espíritu siguen débiles en Arena numerosa; no se presenta como equilibrio definitivo.

## 2026-10-24 — Arena Live v0.11 · Cadena A y preferencias de clase

- Rivalidades Guerrero → Titán → Rayo → Espíritu → Shinobi → Guerrero: +10 % al atacar a su presa, −10 % contra su contrarrival, tres enfrentamientos neutros. Una sola aplicación en golpes y poderes, con redondeo y defensas conservados.
- Guerrero prefiere otros Guerreros; Shinobi prefiere otras clases, puede dañar a compañeros y disputa la final; Titán ataca a cualquiera. Preferencia entre blancos válidos dentro del alcance, cercanía y orden estable para empates; búsqueda lineal.
- Inspector de equilibrio con rival seleccionable, barras reales por clase/modo, afinidad, presa, contrarrival y cadena. Conserva perfil nominal y reglas de la ronda, ocho idiomas, menú seleccionado en Stream y geometría OBS.
- Versión 0.11/0.11.0 en pie de Ajustes, API, servidor y paquete. 51 pruebas de Node, 60 de navegador y 12 de carga aprobadas.
- Estudio inicial de 2.400 partidas completas: conserva determinismo y telemetría; detecta dominio Shinobi en Arena numerosa (93 de 100 victorias con 125), por lo que esta entrega no se presenta como equilibrio definitivo. Datos y límites en `docs/RELEASE-0.11-RIVALIDADES.md`.

## 2026-10-23 — Arena Live v0.10 · Ajustes e inspector de equilibrio

- Versión actual únicamente en el pie de Ajustes; retiradas la etiqueta superior y la versión redundante de la calibración OBS. El pie usa la misma versión de entrega y conserva su texto al cambiar de idioma.
- Corregida la clave que vaciaba etiquetas de interfaz y el reemplazo de nombres de poderes por nombres de clases. Kame, Rasen, Trueno, Enredadera y Coloso vuelven a identificarse correctamente.
- Las opciones de números y texto de poderes respetan su estado, reconocen el signo menos de los daños reales y restauran textos o iconos sin eliminar las animaciones. Se guardan de forma independiente en `arenaLiveCombatDisplayV1`.
- Nuevo menú plegable de equilibrio: barras por clase/modo con daño básico y especial, perfil nominal o reglas de la ronda, carga y cupo de blancos. Comparte las constantes del combate y conserva una escala entre modos.
- El inspector es de consulta; se preservan potencias y selección actual del rival más cercano. Las alianzas y ventajas entre clases quedan pendientes de las decisiones de diseño del usuario.
- Los ajustes plegables conservan identificadores y protección de idioma al organizarse, y el inspector mantiene foco, menú seleccionado y capturas estables en Stream.
- Versión 0.10/0.10.0 en pie, API, servidor y paquete. 45 pruebas de Node, 58 de navegador y 12 de carga aprobadas; 240 resultados completos de combate reproducen v0.9.

## 2026-10-23 — Arena Live v0.9 · Full HD y efectos en toda la vista

- Lienzos nativos de 1920 × 1080 para 16:9 y 1080 × 1920 para 9:16. Vectores y textos se dibujan al doble de resolución, conservando el mundo, la física y las dimensiones de las capturas en OBS.
- Rayos y columnas de K.O. hasta el límite superior real de cada cámara, y Kame hasta su borde lateral. Se elimina el origen vertical fijo que cortaba los rayos a media pantalla en 9:16.
- Destellos de cuadro completo y confeti de victoria normalizado sobre cada vista. Anillos y partículas locales conservan su relación con el personaje.
- Trazado visual de rayos sin consumir azar del combate y con el extremo vinculado al punto de impacto. Las potencias, el alcance físico y los objetivos no cambian.
- Reutilización acotada de fondos a resolución nativa y un suelo isométrico estático, conservando jugadores y efectos vivos en cada cuadro.
- Resoluciones visibles en Pantallas y OBS; versión 0.9/0.9.0 en Ajustes, API, servidor y paquete. Detalles y validación en `docs/RELEASE-0.9-FULL-HD.md`.

## 2026-10-23 — Arena Live v0.8 · Borde isométrico, caída y rescate

- Coliseo aproximadamente un 7 % mayor en cada eje. Dibujo, puntos de apoyo bajo los pies, aparición y transiciones comparten una sola elipse.
- Retirada la tolerancia que permitía caminar fuera del círculo. Fuera no hay suelo: comienza la caída y termina en K.O. si no se logra regresar.
- Salto de rescate para Prota por teclado/táctil y para la IA, con cargas limitadas, límite de profundidad y aterrizaje real para recargarlas. Entrar por debajo de la arena no crea un apoyo invisible.
- Las cargas de poderes isométricos ya no congelan movimiento ni gravedad, y se cancelan al hundirse. Los cuerpos bajo el suelo no golpean ni separan a los que siguen sobre él; el suelo los oculta.
- Espacio actúa por pulsación y W mueve en el plano isométrico. Aterrizajes, reingresos y cambios de modo limpian las cargas y estados de recuperación correspondientes.
- Vibración de cámara al 25 % de forma predeterminada, ajustable de 0 a 100 % en Pantallas y OBS y persistente. Ambas capturas usan el mismo movimiento y la vibración no consume azar del combate.
- Conservados TikTok, comandos, potencias, paneles, proporciones de las capturas y calibración OBS. La nueva física puede cambiar los resultados en Arena; los informes de equilibrio anteriores conservan su versión histórica.
- Versión 0.8/0.8.0 en Ajustes, API, servidor y paquete. Validación detallada en `docs/RELEASE-0.8-ARENA.md`.

## 2026-10-23 — Arena Live v0.7 · Comandos visibles de entradas y especiales

- Entradas y reingresos reales vinculados a `!jugar`, nombre, clase e identidad del peleador en Chat de pruebas y comandos. Incluye inicio automático, escenarios silenciosos, botones rápidos, Prota y entradas por mensajes o elección de clase.
- Especiales de IA, chat, Prota y herramientas registrados una sola vez al ejecutarse, con el comando y quien lo lanza. Las cargas interrumpidas y acciones rechazadas no se anuncian como ejecutadas.
- Etiqueta 🎮 Juego para distinguir acciones locales observadas de comentarios recibidos. Los registros respetan la retención y el seguimiento del chat; no se publican en TikTok ni ejecutan comandos adicionales.
- Alias de poderes normalizados antes de cargar y ejecutar, también en accesos directos. Se conservan daño, energía, efectos, reglas y el equilibrio medido.
- Versión 0.7/0.7.0 en Ajustes, API, servidor y paquete. 26 pruebas de Node, 41 de navegador y 11 de carga aprobadas; 200 resultados completos de partidas idénticos a v0.6.

## 2026-10-23 — Arena Live v0.6 · TikTok y equilibrio unificados en main

- Equilibrio nativo por Duelo, Smash y Arena, compartido por IA, Prota, chat y pruebas. Selección de rivales cercana para las cinco clases.
- Kame y Coloso limitados a tres objetivos en Arena; Trueno a dos en Smash. Daño y cargas por clase conservan el perfil medido, incluidas transiciones durante un mismo poder.
- Retirados el inicio separado, puerto de prueba y parches del HTML. Un solo inicio con `npm.cmd start`, puerto 4173 por defecto; versión 0.6/0.6.0 en Ajustes, API, servidor y paquete.
- Selección de objetivos simplificada a un recorrido lineal y retirada una función de duelo sin uso. Se mantienen física, apoyos, reingresos, controles, paneles y calibración OBS.
- Analizador unificado del motor publicado: genera resumen con intervalos y archivo de partidas sin mezclar variantes. Evidencia de equivalencia de 33.000 partidas del candidato.
- Limpieza de ramas antiguas mediante `npm.cmd run clean:branches`, con verificación de historial integrado, referencias y operación atómica desde Git autenticado.
- 26 pruebas de Node, 36 de interfaz/combate y 11 de carga; escenarios de 32/64/128 jugadores y ráfaga de 500 comentarios.

## 2026-10-23 — Diagnóstico de equilibrio sobre v0.5

- Analizador reproducible del motor real: semillas, lados/orden cruzados, tiempo virtual, telemetría de poderes y control de selección de blancos.
- 33.400 partidas distintas: 16.000 duelos con poderes, 16.000 sin poderes, 800 arenas equilibradas y 600 controles de IA.
- Informe por clase/modo, matriz de enfrentamientos, intervalos agrupados por semilla y archivo de resultados verificable.
- Se añaden herramientas de análisis; el juego conserva el HTML y los poderes de v0.5. No hay ajustes de equilibrio aplicados todavía.

## 2026-10-23 — Arena Live v0.5 · rendimiento con 128 jugadores

- Selección de objetivos con dos recorridos lineales y distancias al cuadrado; conserva las rivalidades, prioridades del Titán y desempates de las versiones anteriores.
- Separación física descarta cuerpos lejanos antes de calcular raíces; conserva el orden de respuesta y los 60 pasos de simulación por segundo.
- En preparación se dibuja la vista visible; Stream conserva ambas capturas simultáneas, que comparten el orden de luchadores. Medidas de rótulos reutilizadas por vista y renovación al cambiar nombre, vidas o fuente; texto y efectos se siguen dibujando de forma nativa.
- Carga de escenarios y perfiles agrupa las actualizaciones de HUD, objetivos y ajustes. Se corrige cargar escenarios durante combate, conservando el cupo y la transición de modo.
- Scroll y contadores de chat agrupados por cuadro; los comentarios se reciben y procesan de inmediato sin redistribuir el estado de conexión por mensaje.
- Al reemplazar escenario se limpian efectos anteriores; los temporizadores de victoria quedan ligados a su ronda.
- HUD del duelo evita reescribir valores iguales; los avisos K.O. liberan las referencias a sus elementos al vencer.
- Funciones de selección, geometría del escenario, rótulos y sincronización de HUD separadas dentro del HTML existente. No cambia la geometría OBS ni las claves de datos guardados.
- Revisión comparativa de la entrega inicial y v0.1–v0.4; pruebas específicas de equivalencia de IA y cargas de 32, 64 y 128 jugadores.

## 2026-10-23 — Arena Live v0.4 en main

- Integración de la rama TikTok en main, conservando el historial de ambas ramas y las mejoras de juego y OBS de v0.1.
- Main incluye ahora el servidor local, TikTok, la interfaz reconstruida y las reglas configurables de v0.4.
- Código de juego v0.4 conservado; calibración OBS, paneles, perfiles y reglas guardadas mantienen sus claves.
- Documentación de instalación y actualización dirigida a main; decisiones de v0.1 identificadas como históricas.
- Las comprobaciones de versión v0.4 sustituyen a las de v0.1; se conservan las entradas históricas del registro de main.

## 2026-10-22 — Arena Live v0.4 · reglas de combate y paneles persistentes

- Ajustes → Reglas y parámetros: cupo compartido 2–128, clase única o todas, y modos con poderes, sin especiales o Solo golpes.
- Vida máxima, daño, empuje recibido, movimiento y recarga pasiva ajustables y guardados por navegador.
- Cupo aplicado a TikTok, chat local, Prota, escenarios y lotes; una reducción en combate se completa al preparar el próximo lobby, conservando los inscritos durante la pelea.
- Clase única para jugadores actuales y nuevos; preferencias originales conservadas. Bloqueos compartidos para poderes de IA, Prota, chat y pruebas; Solo golpes también elimina/bloquea apoyos.
- Stream mantiene el panel elegido al actuar y hacer clic fuera; otro menú lo reemplaza y la × o Esc lo cierran. Ajustes conserva su × visible.
- Calibración y distribuciones de v0.3 conservadas. Versiones visibles/API/paquete 0.4/0.4.0.
- 21 comprobaciones de contrato y 33 de navegador, incluidos efectos reales de las reglas y geometría estable.
- Publicación original en la rama TikTok; integrada posteriormente en main (ver 2026-10-23).

## 2026-10-22 — Arena Live v0.3 · espacios de trabajo reconstruidos

- Inicio/Pruebas con juego central, chats con pestañas a la izquierda y paneles de prueba persistentes; solo sociales desplegados por defecto.
- Paneles movibles, redimensionables, acoplables y flotantes; restauración independiente de Inicio y Stream.
- Objetivo con nombre, clase y estado; selector de escenario con Cargar, incluidos 128 personajes.
- Stream abre herramientas/chats en la columna izquierda y los oculta al actuar; barra superior autoocultable sin cambiar las capturas.
- Ajustes por secciones plegables: en Inicio permanece abierto al cambiar valores; al cerrarlo siempre reanuda.
- Comandos diferenciados y seguimiento automático del mensaje más reciente en ambos chats.
- Móvil orientado a jugar: barra inferior de acciones, herramientas bajo Menú, joystick y gestos conservados.
- Conservada la calibración OBS y sus valores; comprobar recortes una vez para la nueva composición con columna izquierda.
- Versiones visibles/API/paquete 0.3/0.3.0; 21 pruebas de contrato y 23 verificaciones de navegador.

## 2026-10-22 — Arena Live v0.2 · barra y menús del operador

- Barra horizontal única en preparación y Modo Stream, con iconos, leyendas cortas y estados.
- Acceso directo a Pausa, Lobby, Revancha, Prota, Audio y Conectar/Desconectar TikTok.
- Ajustes pausa al abrir y reanuda al cerrar; cada acción cierra su panel, incluidos selectores y calibración.
- Modo Stream y audiencia integrados en el mismo menú de ajustes; retirada la separación General/Streamer.
- Opacidad de la información del juego rotulada y explicada; versión visible 0.2 y API 0.2.0.
- Menús dentro de las franjas del operador, manteniendo los recortes y la calibración OBS guardada.
- Historial, controles y partida reutilizados al entrar y salir de Modo Stream.

## 2026-10-22 — Pulido visual de Arena Live v0.1

- Barras de vida del duelo **9:16** aumentadas a **14 px**, nombres y porcentajes a **12 px**, energía a **6 px**.
- **Arena Live v0.1** y la edición identificadas en el pie de **Ajustes**.
- Los rótulos redundantes de lobby ya retirados permanecen ausentes en ambas pantallas.
- En Dual Full Screen ultrawide, barra superior **34 px**, franja inferior **76 px** y ajuste horizontal 9:16 predeterminado **+10 px**.
- Calibración de OBS entre **0–16 px** horizontal y **72–148 px** inferior; migración de valores previos por defecto, sin alterar valores personalizados distintos.
- El cajón continúa sin cambiar tamaño ni posición de los lienzos al abrirse o cerrarse.

## 2026-10-22 — Arena Live v0.1 · OBS

- Versión visible en Ajustes (`Arena Live v0.1 · main`) y API `window.ArenaLive.version = '0.1.0'`.
- Rótulos redundantes del lobby 16:9/9:16 eliminados.
- Calibración OBS del margen vertical (0–16 px) y franja inferior (72–148 px; 76 por defecto).
- Más espacio para 16:9; geometría estable al abrir/cerrar herramientas.
- Edición autónoma, sin puente de TikTok.


## 2026-10-22 — Emisión dual definitiva y preparación adaptativa

- **Dual Full Screen** reservado como composición principal de OBS con dos lienzos de una sola partida.
- Preparación: solo 16:9 en escritorio y solo 9:16 en móvil, con botón para alternar sin reiniciar.
- En ultrawide, 9:16 fija al extremo derecho (ajuste visual +4 px) y 16:9 maximizada a la izquierda.
- Barra LIVE compacta y cajón inferior de herramientas, cerrado inicialmente. El cajón no cambia los recortes del juego.
- Controles: Pausa, Lobby, Prota, Ajustes, Pruebas; conexión y chat real únicamente en la rama TikTok.
- Tipografía de etiquetas del formato vertical adaptada a la cantidad de luchadores.
- Documento de decisiones cerrado y pruebas de regresión de interfaz y geometría.
- Sin cambios en reglas de combate, clases ni límite de 128 luchadores.


## 2026-10-21 — Catálogo de 128 luchadores en la rama principal

- 128 nombres de prueba únicos, asignados a Guerrero, Shinobi, Titán, Rayo o Espíritu.
- Límite de 128 luchadores registrados por partida, incluido el protagonista; los espectadores nuevos no crean un luchador compartido al llenarse el cupo.
- Nuevo preset de prueba `128 · Arena`, con posiciones distribuidas dentro del círculo.
- Encabezados del HUD simplificados a **Arena**, **Smash** y **Final**, tanto en 16:9 como en 9:16.
- Caída animada al abismo circular antes del K.O., respetando el intento de rescate.
- Solo se han trasladado cambios del juego, **sin integrar en `main` Node.js, WebSocket ni el conector TikTok**.
- Validación funcional del catálogo, aforo, HUD en ocho idiomas y caída fuera del círculo.

## 2026-10-21 — Base inicial en GitHub

- Se incorpora `index.html`, el prototipo monolítico de Arena Live.
- Se publica la revisión visual **Fase 3**: jerarquía de avisos, HUD, chat, vistas duales, controles y nombres públicos.
- Se documentan las decisiones de **Fase 2** sobre interacciones y recompensas como **pendientes de implementación** donde aún no están reflejadas en el motor.
- Se establece documentación básica del prototipo y sus limitaciones.

### Alcance de esta importación

Se ha importado la última entrega **Arena_Live_layout_fase3.html**. No se han reescrito reglas de gameplay ni inventado integraciones con plataformas reales. No se incluyen archivos de pruebas locales ni capturas en el repositorio inicial.

