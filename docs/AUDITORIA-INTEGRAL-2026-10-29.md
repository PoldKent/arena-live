# Arena Live · auditoría técnica integral — 29/10/2026

## Alcance y veracidad

Inventario directo del árbol de GitHub en `main`: **164 archivos** y **3.232.504 bytes** de blobs rastreados (incluye documentación, artefactos de análisis y la exportación móvil de 0.40.6). La fuente actual usa `package.json` versión `0.40.7`. La inspección cubre estructura, rutas de carga, scripts, módulos de riesgo, contratos y resultados disponibles de CI. **No se ha podido ejecutar la suite Node/Playwright ni una sesión LIVE en esta revisión**: GitHub Actions no asigna ejecutores por la restricción del presupuesto de 0 USD.

**Auditoría de código no significa certificación de cada camino de ejecución.** El motor principal mide ~591 KB y más de 7.700 líneas; requiere pruebas de regresión con 128 participantes y revisión incremental de zonas acopladas antes de fragmentarlo o alterar física.

## Matriz por subsistema

| Componente | Inspección y contrato que debe conservarse | Estado / siguiente paso |
| --- | --- | --- |
| `index.html` | DOM, controles originales, estilos de la app y dos cámaras; seis módulos cargados una sola vez | Conservar IDs y orden; probar navegadores y fullscreen |
| `engine/arena-game.js` | Combate, colisiones, habilidades, IA, entradas LIVE, física y traducciones | Acoplamiento alto; **no** refactorización masiva sin pruebas |
| `engine/arena-core.js` | Reset, RNG, políticas de objetivo y clasificación de hasta 128 | Optimizar deduplicación del podio sin cambiar reglas |
| `engine/arena-render.js` | Culling de efectos, límite de partículas visuales y diagnóstico FPS | Ya tiene presupuesto de dibujo; medir en dispositivo real |
| `engine/arena-audio.js` | Síntesis Web Audio y número máximo de voces | Mantener límites, comprobar desbloqueo de audio en móviles |
| `engine/arena-settings.js` | Preferencias, controles por clase, internacionalización y persistencia | Proteger migraciones y mensajes guardados |
| `engine/arena-balance-evidence.js` | Evidencia y visualización de equilibrio | Datos históricos sirven de comparación, no garantía de balance |
| `bridge/server.mjs` | HTTP y WebSocket en loopback, endpoints de prueba, exclusividad de controlador | Mantener enlace en 127.0.0.1 y validar entradas |
| `bridge/bridge-client.js` | Eventos al motor, loteo de taps, chat y cesión del control | Evitar pérdida/reproducción de eventos y duplicados |
| `bridge/live-session.mjs` | Ciclo generacional, desconexiones y reintentos LIVE | Pruebas de sesión simuladas; validar con TikTok real |
| `bridge/chat-normalize.mjs` | Comentarios, ID estable y sanitización | Preservar Unicode válido de chat |
| `bridge/social-normalize.mjs` | Identidad de taps, compartir, seguir, regalos y suscripciones | Reducir normalización duplicada de handles |
| `portable/mobile-runtime.js` | Inicio offline, modos y escala de capturas | Sin copia de daño/física; verificar en Android |
| `portable/mobile-touch.js` | Pointer/touch, joystick, cinco habilidades y panel arrastrable | Probar contactos múltiples y orientación física |
| `portable/mobile.css` | Diseño 9:16 y paneles en pantalla completa | No eliminar selectores por simple similitud |
| `styles/arena-ui.css` | Tailwind compilado y utilizado por servidor y exportador | Comparar con `build:styles --check` antes de cambiar |
| `tools/build-mobile.mjs` | Empaquetado autónomo y hashes reproducibles | Verificar tamaño y que no altere motor |
| `tools/build-styles.mjs` / `tools/css-coverage.mjs` | Generación y control de utilidades CSS | Mantener ambos si hay estilos Tailwind |
| `test/*.test.mjs` | Contratos Node de UI, física, entradas y reglas | Ejecutar localmente cuando haya Node |
| `test/*browser.mjs` | Navegador PC, móvil, rendimiento y 128 luchadores | No ejecutados en Actions por presupuesto |
| `docs/` | Registro de decisiones, histórico de releases y métricas | Preservar como evidencia; identificar documentos obsoletos |
| `mobile-builds/` | HTML móvil 0.40.7 publicado desde el motor compartido | Fuente y distribución alineadas; Android físico pendiente |

## Hallazgos y depuración aplicada

1. **Alta — README inconsistente.** Mezclaba «entrega vigente v0.18», build 0.40.6 y fuente 0.40.7. Se sustituye por una guía de uso, arquitectura y pruebas coherente; `docs/MOVIL-MONOLITICO.md` ahora explica la diferencia entre exportación versionada y fuente.
2. **Media — herramientas de ramas retiradas.** Tras verificar que GitHub conserva solo `main`, el script de eliminación remota y sus pruebas de uso único dejan de formar parte del código activo. Su historial permanece en Git.
3. **Media — normalización LIVE repetida.** `bridge/social-normalize.mjs` construía identificadores de usuarios cuatro veces con variantes mínimas. Consolidar en una función interna mantiene los formatos y reduce discrepancias; añadir prueba de handles inválidos.
4. **Baja — clasificación de resultados.** `ArenaCore.result` buscaba duplicados mediante `order.some(...)` sobre el podio en construcción. Usar `Set` evita escaneo O(n²) con hasta 128 luchadores, sin cambiar el orden ni las estadísticas.
5. **Alta — pruebas no ejecutadas.** Actions falló antes del primer paso; el presupuesto de Actions es 0 USD y figura como «Usage blocked». No significa que la suite haya pasado o fallado. No cambiar facturación sin autorización.
6. **Media — monolito de combate y pruebas de rendimiento.** `arena-game.js` concentra física/IA, HUD, idiomas y sesión. Dividirlo sin línea base de navegador es riesgoso. Priorizar extracción gradual **solo** tras ejecutar suite local y medir 128 luchadores.
7. **Media — entrega móvil desfasada.** La exportación móvil v0.40.7 está publicada con manifiesto de blobs y verificación de descompresión LZW sin pérdida. Queda pendiente probarla en Android físico.

## Invariantes antes de futuros cambios

- Un único motor, una única simulación, una sola rama remota `main`.
- Nada de controles duplicados ni otra copia de la física en `portable/`.
- Pantallas OBS 16:9 y 9:16 funcionales, con HUD, calibración y capturas sincronizadas.
- Compatibilidad de claves guardadas, formatos de configuración y paneles.
- Ningún nuevo efecto LIVE a partir de solo entrar a sala ni eventos sociales falsificados.
- 128 luchadores como prueba de carga, no afirmación de rendimiento garantizado.
- La exportación móvil debe conservar íntegro el juego, funcionar sin red y respetar el límite de 500.000 bytes.

## Validación pendiente para declarar «optimización completa»

| Prueba | Comando o entorno | Estado |
| --- | --- | --- |
| Node, core, normalización y contratos | `npm.cmd test` | Pendiente de ejecución real |
| Empaquetado determinista y tamaño móvil | `npm.cmd run build:mobile` | Pendiente |
| Navegador de escritorio | `npm.cmd run test:browser` | Pendiente |
| Navegador táctil offline | `npm.cmd run test:mobile` | Pendiente |
| Medición de 128 peleadores | `npm.cmd run test:performance` | Pendiente |
| Android físico y controles multitáctiles | Dispositivo del usuario | Pendiente |
| TikTok LIVE real, reconexión y eventos | Sesión real del usuario | Pendiente |
| Captura OBS 16:9 y 9:16 | Equipo de transmisión | Pendiente |

## Verificaciones aisladas de esta revisión

Se comprobó con ejecución aislada de JavaScript la sintaxis del motor y las utilidades de render, la deduplicación de 128 IDs en el podio, el cooldown restablecido y seis casos representativos de normalización LIVE. También se comprobó la coherencia documental de versión y la ausencia del comando de ramas en el paquete. **No equivalen a ejecutar `npm test` ni Playwright**.

La siguiente etapa debe abordar la modularización y rendimiento de `arena-game.js` **por subsistemas y con pruebas verificables**. No borrar ni reescribir cientos de líneas sobre la base de coincidencias textuales; comparar los resultados antes y después.
