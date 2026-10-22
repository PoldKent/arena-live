# Registro de cambios — Arena Live

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
