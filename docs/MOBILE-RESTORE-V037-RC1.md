# Arena Live Mobile — restauración v0.37 · candidata RC1

**Base visual verificada en el historial:** commit `6333737ef147a78ada66068a1c535aca5b04fca0`, versión mobile `0.37.0`.

**Motor conservado:** paquete `0.40.2` de la aplicación principal. Esta reconstrucción **no retrocede ni duplica la física, las clases o el combate**.

**Rama de aislamiento:** `restore/mobile-v037-contract`; la rama `main`, PC/OBS y todas las publicaciones posteriores permanecen intactas hasta una aprobación expresa después de probar en Android.

**Contrato:** documento del usuario «ARENA LIVE — Inventario histórico y especificación funcional Mobile hasta v0.40.2», 100 requisitos. El cuadro siguiente asigna cada ID del documento a su fuente y estado de integración; `Código` no significa `Probado en Android`.

## Matriz del contrato completo

| IDs | Función obligatoria | Origen de la implementación | Resultado de esta rama |
|---|---|---|---|
| 1–12 | Fuente única, diseño 9:16, vistas, fullscreen, 5 poderes, panel, offline, Android | `main` + CSS visual v0.37 restaurado | Código integrado; Android pendiente |
| 13–21 | Capturas 16:9/9:16/dual, memoria de canvas, ratios y OBS | `index.html`, motor 0.40.2, `portable/mobile-runtime.js` | Compartido; comprobar ambas vistas |
| 22–28 | Cápsula superior, menú, pausa, ayuda y fallo `content://` | Diseño v0.37 + controles de runtime posterior | Barra y alternativa móvil integradas; Android pendiente |
| 29–37 | HTML offline, inicio, perfiles, Jugador/Streamer y persistencia | Runtime 0.40.2, motor compartido | Funciones reutilizadas |
| 38–47 | Táctil total, joystick, salto doble, acciones, edición y ✓ | `portable/mobile-touch.js` 0.40.2 + distribución v0.37 | Funciones reutilizadas; táctil real pendiente |
| 48–56 | Cinco poderes, selector compatible, comandos, adaptador de clase, registro | Panel del motor + rail fijo del layout restaurado | Integrados en código; visibilidad Android pendiente |
| 57–67 | Panel único, cinco tipos de Pruebas, arrastre, scroll, opacidad 0–75, mantener video | Motor + `mobile-touch.js`, CSS v0.37 con contrato de presentación | Integrados en código; táctil real pendiente |
| 68–76 | Clases, Arena/Smash/Duelo, IA, K.O., reglas, radar y energía | Motor 0.40.2 sin modificaciones | Conservado; no se reprograma |
| 77–82 | Seis opciones HUD, HP 1v1, estadísticas, pantalla de resultados y efectos | Motor y ajustes 0.40.2 | Conservado |
| 83–89 | Ocho secciones Ajustes, sonido, idiomas, guardar/cargar, claves de preferencias | Motor y adaptadores 0.40.2 | Conservado, migraciones sin cambiar |
| 90–93 | Sin LIVE en HTML offline, simulación local, puente principal independiente | Motor/servidor compartidos | Sin modificaciones |
| 94–100 | 30/60 FPS, 540/720/1080p, HTML monolítico, un repositorio, pruebas | Generador `tools/build-mobile.mjs`, test móvil ampliado | Generación reproducible; test de navegador pendiente |

## Decisiones de reconstrucción

1. `portable/mobile.css` comienza con **la fuente CSS exacta v0.37** de GitHub; el contrato posterior se concentra en un bloque con encabezado `RESTORE MOBILE v0.37 UI · RC1`. No se copian las 936 líneas de reglas móviles conflictivas introducidas hasta 0.40.2.
2. `portable/mobile-runtime.js` y `portable/mobile-touch.js` conservan los comportamientos posteriores (dos esquemas táctiles, barra de habilidades, arrastre/transparencia de Pruebas, alternativa para `content://`) sin afectar reglas ni motor.
3. En `index.html`, la regla de captura PC que oculta hermanos de video se condiciona con `html:not(.arena-mobile-offline)`: el navegador no volverá a ocultar la barra y poderes propios de Mobile por esa regla.
4. El contenido del juego y los controles de operador no se duplican, ni en pantalla normal ni fullscreen. La fila de poderes queda en su elemento original.
5. Se elimina la doble reserva de espacio inferior de v0.37 cuando el rail posterior es fijo; la cámara sigue en relación 9:16.
6. No se fuerza una falsa pantalla completa del sistema: el HTML `content://` solicita fullscreen nativa y usa vista ampliada de respaldo si Chrome la rechaza.
7. El diseño y los adaptadores de candidato no se publican en `main` hasta aprobación.

## Comprobación obligatoria antes del merge

- [ ] `npm.cmd run build:mobile` genera desde la rama sin errores.
- [ ] `npm.cmd run test:mobile` finaliza con todas sus comprobaciones aprobadas.
- [ ] `npm.cmd run test:browser` y `npm.cmd test` pasan.
- [ ] Android real, orientación vertical, HTML local `content://`: 5 poderes visibles, táctiles y sin recorte, barra superior en normal y ampliado.
- [ ] Android real, servidor HTTP/HTTPS: pantalla completa nativa y salida sin perder barra, poderes ni controles.
- [ ] Cambiar 9:16/16:9/dual no deja vistas fantasmas ni invade paneles.
- [ ] Pruebas con arrastre y transparencia (0 % y 75 %): abrir, cerrar y rotar no alteran la geometría de la arena.
- [ ] Modo Jugador: Táctil total/Joystick, doble salto, golpe, poder y edición/guardado de posiciones.
- [ ] Modo Streamer: 5 poderes siempre activos; objetivo fijo o aleatorio compatible.
- [ ] Partida de prueba 2/32/128, Arena/Smash/Duelo, persistencia y rendimiento aceptable.
- [ ] **Usuario confirma expresamente el funcionamiento correcto** en su móvil.

## Política de limpieza tras aprobación

**NO BORRAR** archivos de 0.38–0.40.2, ramas antiguas, artefactos, historial ni otras opciones mientras no se cumpla la aceptación anterior. Si se aprueba, proponer un inventario concreto de archivos generados obsoletos para que el usuario autorice su eliminación; conservar la historia Git y el código del motor que siga en uso. Ningún borrado del historial ni `git push --force`.

## Referencias

- [HTML móvil original 0.37.0](https://github.com/PoldKent/arena-live/blob/main/mobile-builds/Arena-Live-v0.37.0-movil.html)
- [Motor principal de la aplicación](https://github.com/PoldKent/arena-live/blob/main/index.html)
- [Historial de decisiones mobile](https://github.com/PoldKent/arena-live/blob/main/README.md)
- [Pruebas existentes](https://github.com/PoldKent/arena-live/blob/main/test/mobile-browser.mjs)


## RC2 · Controles tipo Gameboy, barra superior alineada

- Archivo de prueba único: `mobile-builds/Arena-Live-Mobile-v037-GAMEBOY-RC2.html` (no sustituye RC1).
- En Mobile normal, el encabezado ARENA LIVE y la cápsula circular comparten un mismo carril superior de 54 px; fullscreen mantiene su encabezado original dentro de la tarjeta fullscreen.
- Se retira la explicación de gestos superpuesta bajo la escena; la ayuda sigue en el menú de opciones y en Ajustes → Controles.
- Modo Jugador / Joystick: analógico a la izquierda y tres acciones (Poder, Salto, Golpe) escalonadas a la derecha, disposición tipo Gameboy sin modificar sus funciones ni el motor.
- La fila inferior se coloca inmediatamente después de la vista de combate utilizando medidas del área visible de Android. En Streamer permanece una fila compacta de cinco poderes.
- Se usa `arenaLiveMobileButtonsV2` para nuevos valores predeterminados. Al migrar desde V1, las posiciones explícitamente personalizadas se conservan; únicamente se sustituyen las coordenadas por defecto antiguas, preservando el tamaño escogido.
- Se añadió una aserción de navegador para disposición lateral de joystick/acciones, orden de botones, barra superior y geometría de video. **No validada todavía en un Android físico.**
- `main`, PC/OBS y los archivos 0.38–0.40.2 permanecen intactos; RC2 es candidata, no una publicación final.
