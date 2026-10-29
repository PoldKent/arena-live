# Arena Live · Auditoría de peso y refactorización — 2026-10-29

## Base y objetivos
Proyecto unificado v0.40.6, rama principal `main`. Un único motor sirve a PC, OBS y
la compilación móvil sin conexión; `tools/build-mobile.mjs` empaqueta el motor
oficial y los adaptadores de controles móviles sin duplicar las reglas de combate.

## Peso antes del mantenimiento
- 165 archivos, 6.567.795 bytes de blobs en el árbol de Git (6,26 MiB).
- Cuatro exportaciones históricas sumaban 3.352.160 bytes (51,04 % del árbol):
  `Arena-Live-Mobile-v037-GAMEBOY-RC4.html` (1.001.830),
  `Arena-Live-v0.36.0-movil.html` (931.822),
  `Arena-Live-v0.37.0-movil.html` (933.899),
  `Arena-Live-v0.40.5-movil.html` (484.609).
- La exportación vigente `Arena-Live-v0.40.6-movil.html` permanece publicada.
- `index.html` contenía nueve bloques CSS consecutivos en el `<head>`.
- `portable/mobile.css` contenía 86 declaraciones dentro de 19 reglas que una
  declaración posterior de igual selector y prioridad anulaba.

## Intervención en el código fuente
1. **Estilos PC/OBS:** se consolidaron los nueve bloques del HTML en un solo
   `<style id="arena-app-styles">`, respetando exactamente la concatenación y el
   orden original de todas las reglas. Se conservan comentarios que identifican
   sus secciones, pero ya no hay nueve hojas inline separadas. No se trasladaron
   reglas fuera de su contexto ni se cambió el motor.
2. **CSS móvil:** se eliminaron 86 declaraciones redundantes de 19 reglas raíz,
   sin alterar el orden de las reglas supervivientes. La comparación de
   especificidad simple y prioridad `!important` dio la misma declaración
   efectiva para 1.194 pares selector/propiedad antes y después. Esta validación
   **no sustituye** la comparación visual de una página renderizada ni cubre
   todas las interacciones posibles entre selectores diferentes.
3. **Exportaciones antiguas:** se retiraron del árbol principal; sus commits,
   fuentes y archivos pueden recuperarse mediante el historial Git. El único
   HTML móvil vigente se genera desde `main`.
4. **Ramas:** las 11 ramas históricas se incluyeron en
   `tools/clean-merged-branches.mjs`, tras confirmar que todas tienen 0 commits
   exclusivos respecto a `main`. El script usa verificación de ancestros,
   `git push --atomic` y `--force-with-lease`; **no borra una rama divergente**.
   La eliminación del remoto requiere ejecutar el script con credenciales Git.
5. **Pruebas:** se incorporó `test/source-canonicalization.test.mjs` para
   impedir la reintroducción de capas CSS obsoletas y comprobar la lista de ramas.

## Invariantes obligatorias
- PC conserva seis scripts del motor cada uno cargado exactamente una vez.
- El móvil conserva una sola instancia del motor, un solo grupo de cinco
  poderes Streamer y el mismo panel de Pruebas, sin clonar escuchas de eventos.
- El escenario 9:16 no se reduce al mostrar herramientas y mantiene los
  controles superiores, reglas visuales y manejo de táctil.
- El HTML móvil debe continuar siendo autónomo, íntegro y <= 500.000 bytes.
- Revisar `npm.cmd test`, `npm.cmd run build:mobile`,
  `npm.cmd run test:mobile` y `npm.cmd run test:browser` en Windows.

## Límites
No se afirma que *todos* los selectores CSS con `!important` sean parches:
algunos son intencionales para la experiencia móvil y la compatibilidad con
las utilidades Tailwind. Tampoco se da por validado visualmente un cambio
solo porque se compile o su árbol CSS coincida. La refactorización ha evitado
modificaciones masivas no probadas de la simulación y el diseño.
