# Auditoría de consolidación de ramas — 29/10/2026

## Objetivo

Unificar en `main` los commits históricos de las ramas de trabajo sin sustituir el motor
v0.40.6, copiar compilaciones antiguas ni introducir duplicados entre PC/OBS y móvil.
La integración usa una combinación de **portado selectivo** y **merge de historial conservando
el árbol actual** (estrategia equivalente a `git merge -s ours`). No se ejecuta
`git cherry-pick` de archivos obsoletos.

## Ramas divergentes consolidadas

| Rama | Commits exclusivos antes de la consolidación | Resultado |
| --- | ---: | --- |
| `feat/mobile-touch-joystick-layout` | 24 | Controles ya modernizados en main; se recuperaron objetivos táctiles de 44 px en pantallas >= 420 px |
| `fix/fullscreen-panels-v037-centering` | 8 | Centrado y paneles únicos conservados en el diseño actual |
| `fix/mobile-tests-panel-visibility` | 8 | Panel de pruebas actual flotante y visible, sin duplicar DOM |
| `fix/mobile-v037-top-controls` | 6 | Barra superior circular preservada, sin copiar estilos RC antiguos |
| `fix/streamer-tests-overlay-constant-arena` | 8 | Arena 9:16 constante y cinco poderes accesibles |
| `fix/v040-auto-build-mobile-on-start` | 4 | `prestart`, `predev` y ruta `/mobile` existentes |
| `fix/v0401-mobile-streamer-power-rail` | 10 | Cinco botones originales movidos sin clonar handlers |
| `release/arena-live-v040-full` | 11 | Fuente única y motor completo ya integrados |

Los recuentos de commits se solapan entre ramas porque algunas historias incluyen merges
de las mismas PR. No se deben sumar como si fueran cambios de código independientes.

## Ramas que ya eran ancestras de main

`fix/mobile-v0405-clean-rebuild`,
`refactor/official-v0405-index-cleanup`,
`restore/mobile-v037-contract`.

## Prevención de duplicados

- `index.html` tiene identificadores DOM únicos y carga exactamente una vez cada
  módulo de `engine/`: core, render, audio, settings, balance-evidence, game.
- `tools/build-mobile.mjs` usa los mismos archivos fuente para producir el HTML
  sin conexión. El móvil no mantiene una segunda implementación de combate.
- Los botones originales de las cinco habilidades se **mueven** mediante
  `dock.appendChild(source)`, no se duplican.
- Las herramientas y el selector de clase reubican el nodo existente. Los paneles
  fullscreen del PC conservan sus nodos y handlers originales.
- Las pruebas `test/branch-consolidation.test.mjs` supervisan estas invariantes.
- El HTML oficial se genera desde `main` con `npm.cmd run build:mobile`; no
  se restauran exportaciones previas ni vistas preliminares de ramas antiguas.

## Criterios de preservación

No se reintroducen commits cuyo contenido ya haya sido reemplazado por la versión actual:
versiones 0.39/0.40.0/0.40.1, estilos de barras antiguas, HTML móvil de prueba
y métodos de panel que reducían el escenario al mostrar herramientas. La recuperación
de historial hace que sus commits queden alcanzables desde `main`, **no** que sus
implementaciones antiguas sustituyan a las actuales.

## Validación

La comprobación estática observa 332 IDs distintos, seis referencias de motor
sin repetición y una instancia del panel móvil de pruebas en el código fuente.
El contrato de entrega exige `npm.cmd test`, `npm.cmd run test:mobile` y
`npm.cmd run build:mobile` en Windows antes de afirmar validación funcional.
Un test o análisis de sintaxis no sustituye el uso en Android/TikTok LIVE.
