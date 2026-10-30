# Arena Live · v0.40.8

**Juego de combate para PC, OBS y teléfono, con una única simulación y un motor compartido.** La aplicación de escritorio ofrece dos capturas sincronizadas (**16:9** y **9:16**) y un puente local para TikTok LIVE. El móvil autónomo es un HTML empaquetado desde ese mismo código, con controles táctiles y simulación local, **sin conexión LIVE directa**.

> **Estado de la entrega (30/10/2026):** fuentes y exportación autónoma **v0.40.8**. La [versión móvil oficial](mobile-builds/Arena-Live-v0.40.8-movil.html) incorpora las ocho correcciones aprobadas para Android, sin cambiar el motor de combate. Pendiente validación física en Android. La rama de desarrollo es `main`; la publicación web utiliza GitHub Actions, sin requerir rama `gh-pages`.

## Empezar en PC (Windows / PowerShell)

Requiere **Node.js >= 20** (recomendado 24) y Git. Si el repositorio es privado, necesitas acceso autorizado a GitHub.

```powershell
git clone https://github.com/PoldKent/arena-live.git
cd arena-live
npm.cmd ci
npm.cmd start
```

- **Aplicación principal con puente LIVE:** http://127.0.0.1:4173/
- **Interfaz móvil en el navegador del PC:** http://127.0.0.1:4173/mobile
- `npm.cmd start` ejecuta `prestart` y regenera primero la exportación móvil en `dist/`.
- El servidor escucha **solo en 127.0.0.1**: no se publica en la red local ni en Internet.

Para actualizar una copia existente, detén el servidor y ejecuta:

```powershell
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd start
```

Si Git detecta modificaciones locales, consérvalas y resuelve el conflicto; **no** uses `git reset --hard`.

## Exportar y probar en el teléfono

```powershell
npm.cmd run build:mobile
```

Genera **`dist/Arena-Live-v0.40.8-movil.html`** desde el mismo `index.html`, los seis scripts de `engine/` y los adaptadores de `portable/`. Copia ese único archivo al teléfono y ábrelo en un navegador que permita ejecutar HTML local. Algunos visores de archivos o enlaces `content://` pueden limitar JavaScript, almacenamiento o pantalla completa; prueba «Abrir con» un navegador compatible.

La exportación es **offline**: puedes probar luchadores, clases, reglas, habilidades y controles sin servidor. **No recibe eventos reales de TikTok.** El empaquetador comprueba que el HTML sea autónomo, se descomprima íntegramente y no supere 750.000 bytes. Esto no sustituye una prueba en Android físico.

[Guía móvil y sus límites](docs/MOVIL-MONOLITICO.md) · [Controles táctiles actuales](docs/MOBILE-CONTROLES-V040.md).

## Pre-release web para compartir por enlace

La edición de prueba para navegador se construye con `npm.cmd run test:preview` y se despliega mediante `.github/workflows/pages-preview.yml` usando GitHub Actions. Un único enlace identifica el dispositivo: móvil → HTML offline; ordenador → cliente de escritorio en **vista previa web** (sin servidor Node/TikTok LIVE). **GitHub Pages debe habilitarse una vez en Settings → Pages → Source: GitHub Actions**; hasta que el trabajo `deploy` termine correctamente no se anuncia como publicado. En GitHub Free es compatible con el repositorio **público**; todos los archivos e historial del repositorio también son públicos. El JavaScript servido puede inspeccionarse.

**Pasos completos, riesgos y controles:** [Publicación del pre-release web](docs/PREVIEW-WEB.md).

## Qué incluye el juego

| Área | Funcionalidad |
| --- | --- |
| **Combate** | Hasta 128 luchadores; arenas isométricas; física de salto, empuje, caída y recuperación; cinco clases con golpes y habilidades |
| **Reglas** | Duelo 1v1, modos de reingreso libre, por vidas y por tiempo; estadísticas, eliminación, podio y revancha |
| **Participación** | Entradas por `!jugar` o taps/likes reales; comentarios, compartir, seguir, regalos y suscripciones desde el puente LIVE |
| **Dirección** | Protagonista (Prota), controles de prueba, selector de luchador y poderes/comandos desde un panel único |
| **Emisión** | Dos capturas OBS de la misma pelea, 1920×1080 horizontal y 1080×1920 vertical; configuración de encuadre y HUD |
| **Móvil** | Modo Jugador y Modo Streamer (identificador interno `director`), controles táctiles o joystick, cinco habilidades y panel de pruebas móvil |
| **Configuración** | Preferencias de clases, idioma, audio, calidad, HUD, reglas, semilla de pruebas y ajustes persistentes |

### Participación TikTok LIVE

El servidor usa `tiktok-live-connector`; la conexión se solicita explícitamente desde la interfaz. El puente normaliza mensajes y eventos por usuario; **no** trata las entradas a la sala ni los recuentos de audiencia como órdenes para incorporar combatientes. Los regalos en secuencia solo activan su beneficio tras el evento final. La disponibilidad de cada evento depende de TikTok y de un LIVE real; **las pruebas automáticas con eventos simulados no garantizan conectividad LIVE**.

Las clases y comandos de participación incluyen `!guerrero`/`!kame`, `!shinobi`/`!rasen`, `!titan`/`!coloso`, `!rayo`/`!trueno` y `!espiritu`/`!enred`. La guía de comandos también está visible en las dos capturas. [Detalles de la integración](docs/TIKTOK-LIVE-MVP.md).

### Cambios de combate de 0.40.7

- Ataques básicos rápidos y selección de dirección frontal, ascendente o descendente para la IA.
- Choque de dos golpes básicos recíprocos en el mismo paso de simulación: retroceso, sin daño entre los participantes del choque.
- Impacto descendente contra el suelo con rebote lateral y ascendente, como máximo un objetivo por cada lado.
- En combate 1v1 no se admiten nuevas incorporaciones; los modos libre, por vidas y por tiempo mantienen sus restricciones respectivas.
- **Golpe básico frente a especial:** no hay todavía una regla nueva de «clash» implantada; los especiales mantienen sus efectos existentes. No documentar como validado un comportamiento aún no implementado.

Los cambios están en `engine/arena-game.js`, no en un motor móvil duplicado. [Registro de cambios](CHANGELOG.md).

## Arquitectura — una sola fuente de verdad

| Ruta | Responsabilidad |
| --- | --- |
| `index.html` | DOM principal, paneles, cámaras y estilos integrados |
| `engine/arena-game.js` | Simulación, IA, física, combate, entrada, reglas, controles y flujo de partida |
| `engine/arena-core.js` | Reglas puras, reset de vida, clasificación, resultados, selección de objetivos y RNG |
| `engine/arena-render.js` | Utilidades de dibujo, culling, partículas y diagnóstico de fotogramas |
| `engine/arena-audio.js` | Sonidos sintetizados con límite de voces |
| `engine/arena-settings.js` y `engine/arena-balance-evidence.js` | Preferencias de runtime y evidencia de equilibrio |
| `bridge/server.mjs` y `bridge/bridge-client.js` | HTTP/WebSocket local, TikTok y comunicación con la interfaz |
| `bridge/*-normalize.mjs` y `bridge/live-session.mjs` | Normalización de eventos y ciclo de conexión/reconexión |
| `portable/mobile-runtime.js`, `portable/mobile-touch.js` y `portable/mobile.css` | Adaptación offline, diseño móvil, modos y entrada táctil |
| `tools/build-mobile.mjs` | Construcción reproducible de un único HTML sin red |
| `styles/arena-ui.css` | Utilidades CSS ya compiladas; no hay compilador CSS en el navegador |
| `test/` | Contratos Node, pruebas de navegador, móvil, equilibrio y rendimiento |

El móvil utiliza la **misma lógica de daño y física**. No se debe copiar código de combate a `portable/`, duplicar controles DOM ni alterar claves guardadas sin migración. [Auditoría técnica de módulos y riesgos](docs/AUDITORIA-INTEGRAL-2026-10-29.md).

## Probar y mantener

```powershell
npm.cmd test
npm.cmd run build:mobile
npx.cmd playwright install chromium
npm.cmd run test:browser
npm.cmd run test:mobile
npm.cmd run test:performance
npm.cmd run verify:release
```

- `npm.cmd test`: pruebas de reglas, contratos, normalización y componentes.
- `test:browser`: interfaz principal, controles, idioma, capturas y pruebas de integración simulada.
- `test:mobile`: archivo HTML sin conexión, controles y escenario.
- `test:performance`: mediciones con cargas de luchadores; **no equivalen a FPS garantizados en el equipo del usuario**.
- `verify:release`: ejecuta el conjunto de pruebas y genera antes el móvil.
- `npm.cmd run analyze:balance`: análisis de equilibrio.
- `npm.cmd run build:styles`: regenera Tailwind solo si cambian clases CSS. Comprobar el resultado antes de publicarlo.

**Estado CI:** GitHub Actions está bloqueado por un presupuesto de 0 USD; las últimas ejecuciones fallaron **antes de que arrancaran las pruebas**. No confundas esos checks rojos con pruebas funcionales fallidas. Hasta que esté disponible un ejecutor, valida localmente y conserva los resultados. **No habilitar facturación ni elevar presupuestos sin autorización.**

## Política de desarrollo y limpieza

- **Una sola rama de desarrollo:** `main`. El sitio web de pruebas se publica mediante un artefacto GitHub Pages generado desde el código actual, sin una rama adicional de desarrollo.
- Cambiar el código canónico en lugar de añadir parches superpuestos; retirar solo lo demostrado obsoleto y conservar pruebas antes de borrar.
- Preservar las dos capturas OBS, interfaz táctil, clases, comandos, preferencias persistentes, balance, servidor local y simulación.
- Versionar conjuntamente paquete, API, interfaz y exportación **cuando se publique una nueva versión**, sin etiquetar como vigente una exportación vieja.
- Las exportaciones retiradas **se conservan en el historial Git**. La documentación histórica y las mediciones en `docs/` no son código activo.
- No se da por validada una función de TikTok con pruebas simuladas, ni Android sin probar en teléfono.

## Documentos y trazabilidad

- [Auditoría integral del 29/10/2026](docs/AUDITORIA-INTEGRAL-2026-10-29.md)
- [Registro de cambios](CHANGELOG.md)
- [Diseño PC y móvil 0.40](docs/RELEASE-0.40.md)
- [Guía móvil offline](docs/MOVIL-MONOLITICO.md)
- [Integración TikTok](docs/TIKTOK-LIVE-MVP.md)
- [Guía para OBS y operación dual](docs/DUAL-OPERADOR-TIKTOK.md)
- [Reglas de clases y equilibrio](docs/BALANCE-CLASES-v0.5.md)
- [Auditoría previa de peso y CSS](docs/CODE-WEIGHT-AUDIT-2026-10-29.md)

Las especificaciones antiguas de `docs/RELEASE-*` y otras guías por versión son **históricas**; cuando contradigan el README, usa el código vigente y sus pruebas como referencia.
