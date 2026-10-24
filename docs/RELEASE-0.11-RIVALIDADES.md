# Arena Live v0.11 · Rivalidades y prioridades de clase

## Reglas elegidas

La cadena A se aplica a las cinco clases en Duelo, Smash y Arena:

**Guerrero → Titán → Rayo → Espíritu → Shinobi → Guerrero.**

Cada flecha significa un **+10 % de daño** al atacar en ese sentido y un **−10 %** en sentido contrario. Cada clase tiene exactamente una presa y un rival que la contrarresta. Sus otros tres enfrentamientos, incluida su propia clase, son neutros.

La modificación entra una sola vez en la función compartida de daño, después de los apoyos/carga y junto al multiplicador de la ronda, antes del redondeo final a HP enteros. Se conserva el redondeo previo de energía y apoyos del especial. Así, un golpe de 12 hace 13 contra la presa, 11 contra el contrarrival y 12 contra un rival neutro. Críticos, absorción y reducción defensiva conservan su orden. También pasan por esta regla los impactos de apoyos sociales que usan la función de daño de un peleador.

Las potencias nominales, cargas, energía, cupos de blancos y alcances de los poderes se conservan. La rivalidad cambia el daño por pareja; no garantiza que esa clase gane la partida ni que desaparezcan las diferencias de alcance y derribo.

## Narrativa y elección de objetivos

- **Guerrero:** prefiere otro Guerrero; en su ausencia, al resto.
- **Shinobi:** prefiere otra clase; cuando solo hay Shinobi válidos, pelea contra ellos hasta que queda un ganador. **No hay inmunidad entre Shinobi.**
- **Titán:** puede atacar a cualquier clase, incluido otro Titán.
- **Rayo y Espíritu:** el rival válido más cercano.

Dentro de cada prioridad se elige al más cercano y se conserva el orden de la lista en empates. Solo se consideran rivales vivos, atacables y dentro del alcance de esa acción. Si un Shinobi solo tiene a otro Shinobi al alcance, puede golpearlo aunque haya otra clase más lejos. Los golpes de área conservan sus blancos y pueden dañar a la misma clase. No se añaden escudos, equipos ni victoria compartida.

La búsqueda de movimiento mantiene la prioridad sobre todos los rivales válidos, mientras que los golpes y poderes la evalúan dentro de su alcance. Esta diferencia queda explícita porque influye en la supervivencia del clan a poblaciones grandes. Se conserva un único recorrido lineal por búsqueda, sin ordenar listas para perseguir al rival.

## Consulta visual

En **Ajustes → Equilibrio por clase**, el selector **Rival del gráfico** permite comparar los valores neutros o el daño contra cualquiera de las cinco clases. Las barras básico/especial muestran los mismos valores que ejecuta el motor, la afinidad de daño y sus cambios según el modo y las reglas de la ronda.

El detalle identifica la presa y el contrarrival de la clase seleccionada. La cadena y las prioridades están descritas en el mismo panel. La escala incluye la mayor ventaja y se mantiene entre modos; en el perfil nominal va de 0 a 70 HP. La tabla conserva los valores nominales de los tres modos para distinguirlos del ajuste por rivalidad.

El inspector sigue siendo de consulta. Mantiene abierto Ajustes en Stream y conserva las capturas y calibración OBS. Las etiquetas cubren los ocho idiomas existentes. La versión **0.11** aparece una sola vez en el pie de Ajustes; API, servidor y paquete usan **0.11.0**.

## Validación

- `npm test`: **51 comprobaciones**, sin fallos. Incluye la matriz completa de 25 enfrentamientos, espejo Shinobi sin inmunidad, críticos, apoyos, carga, escudos y selección de 2 a 128 peleadores.
- `npm run test:browser`: **60 comprobaciones**, sin errores de JavaScript. Incluye comparación de las barras con golpes y poderes reales en las 75 combinaciones clase/rival/modo, final entre Shinobi, idiomas, comandos, TikTok simulado, Full HD y OBS.
- `npm run test:performance`: **12 comprobaciones**, sin errores; escenarios de 32/64/128, poderes y textos acotados, ambas capturas y 500 comentarios. [Mediciones](performance-v0.11.json).
- **2.400 partidas simuladas** del motor publicado: 1.000 duelos con poderes y 1.000 sin poderes, más 100 partidas por población inicial de 5, 10, 25 y 125. Veinticinco semillas de duelo con lados/orden cruzados, veinte de arena con cinco distribuciones, sin apoyos ni reingresos. Todas terminan antes de los 180 segundos simulados. Determinismo, aislamiento entre escenarios y equivalencia con/sin telemetría verificados.

Los resultados cambian respecto a v0.10 porque ahora cambian las prioridades y el daño por rivalidad. No corresponde exigir ganadores idénticos a la versión anterior. [Resumen reproducible](balance-v0.11-summary.json), [partidas](balance-v0.11-matches.csv.gz) y [validación](validation-v0.11.json).

## Equilibrio pendiente de afinar

La nueva regla es una **primera configuración de prueba**, no un equilibrio final certificado. Con poderes, las victorias de duelo por clase van de 45,5 % a 55 %. En las partidas que empiezan con cinco peleadores van de 16 % a 25 % de las victorias, y con diez, de 16 % a 24 %.

La diferencia crece en Arena numerosa: **Shinobi gana 45 de 100 partidas con 25 peleadores y 93 de 100 con 125**; Guerrero gana 3 y 0, respectivamente. En cada población inicial hay la misma cantidad de participantes por clase. El informe incluye intervalos agrupados por semilla y cuenta transiciones reales a Smash y Duelo.

La supervivencia asociada a las prioridades es un problema distinto del daño nominal. Reducir los poderes a ciegas podría dañar el resultado del duelo, que ya está mucho más cercano. Antes de un nuevo ajuste, conviene concretar cómo influye la distancia en la preferencia de clase. Se conserva el ±10 % elegido y se deja el resultado visible para decidir ese siguiente paso.

Estas mediciones son simulaciones, no una conexión TikTok LIVE ni los FPS del equipo del usuario. Las cifras de dibujo incluyen rasterizado por software y lectura de píxeles; no sirven para prometer rendimiento en OBS.

Para reproducir la muestra desde `main`, con un navegador de Playwright instalado:

```powershell
$env:ARENA_BALANCE_DUEL_SEEDS = '25'
$env:ARENA_BALANCE_ARENA_SEEDS = '20'
$env:ARENA_BALANCE_SEED_START = '3000'
npm.cmd run analyze:balance
```
