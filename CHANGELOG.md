# Registro de cambios — Arena Live

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

