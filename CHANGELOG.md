# Registro de cambios — Arena Live

## 2026-10-22 — Pulido visual de Arena Live v0.1

- Barras de vida del duelo **9:16** aumentadas a **14 px**, nombres y porcentajes a **12 px**, energía a **6 px**.
- **Arena Live v0.1** y la edición identificadas en el pie de **Ajustes**.
- Los rótulos redundantes de lobby ya retirados permanecen ausentes en ambas pantallas.
- En Dual Full Screen ultrawide, barra superior **34 px**, franja inferior **76 px** y ajuste horizontal 9:16 predeterminado **+10 px**.
- Calibración de OBS entre **0–16 px** horizontal y **72–148 px** inferior; migración de valores previos por defecto, sin alterar valores personalizados distintos.
- El cajón continúa sin cambiar tamaño ni posición de los lienzos al abrirse o cerrarse.

## 2026-10-22 — Emisión dual definitiva y preparación adaptativa

- **Dual Full Screen** reservado como composición principal de OBS con dos lienzos de una sola partida.
- Preparación: solo 16:9 en escritorio y solo 9:16 en móvil, con botón para alternar sin reiniciar.
- En ultrawide, 9:16 fija al extremo derecho (ajuste visual +4 px) y 16:9 maximizada a la izquierda.
- Barra LIVE compacta y cajón inferior de herramientas, cerrado inicialmente. El cajón no cambia los recortes del juego.
- Controles: Pausa, Lobby, Prota, Ajustes, Pruebas; conexión y chat real únicamente en la rama TikTok.
- Tipografía de etiquetas del formato vertical adaptada a la cantidad de luchadores.
- Documento de decisiones cerrado y pruebas de regresión de interfaz y geometría.
- Sin cambios en reglas de combate, clases ni límite de 128 luchadores.


## 2026-10-21 — Base inicial en GitHub

- Se incorpora `index.html`, el prototipo monolítico de Arena Live.
- Se publica la revisión visual **Fase 3**: jerarquía de avisos, HUD, chat, vistas duales, controles y nombres públicos.
- Se documentan las decisiones de **Fase 2** sobre interacciones y recompensas como **pendientes de implementación** donde aún no están reflejadas en el motor.
- Se establece documentación básica del prototipo y sus limitaciones.

### Alcance de esta importación

Se ha importado la última entrega **Arena_Live_layout_fase3.html**. No se han reescrito reglas de gameplay ni inventado integraciones con plataformas reales. No se incluyen archivos de pruebas locales ni capturas en el repositorio inicial.
