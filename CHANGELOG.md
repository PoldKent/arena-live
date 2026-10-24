# Registro de cambios — Arena Live

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

