# Equilibrio de clases · Arena Live v0.5

Estudio del 23 de octubre de 2026. Motor de main `6850dc1`, HTML Git blob `c2260f181dbce56c896a4806537f5fd5327bee2a`. Este cambio añade herramientas y resultados; los poderes del juego conservan sus valores publicados.

## Resultado principal

**Titán es la clase dominante de la IA actual.** Gana contra las otras cuatro en los enfrentamientos directos y su ventaja aumenta mucho con la población: llega al **95 %** de las arenas de 125 jugadores.

La clase más débil depende del escenario. **Rayo registra el menor porcentaje en duelos (42 %)**, cerca de Shinobi (43,63 %); sus intervalos se solapan y no hay que tratar esa diferencia pequeña como una separación concluyente. **Shinobi rinde peor en las arenas de 5 y 10 jugadores.** Espíritu resulta competitivo en duelo pero pierde gran parte de su eficacia en multitudes. Conviene corregir primero la dominación de Titán y volver a medir a los demás.

## Muestra y condiciones

33.400 partidas distintas: 16.000 duelos con poderes, 16.000 duelos de control sin poderes, 800 combates todos contra todos y 600 controles adicionales de selección de objetivos. Los duelos iniciales y pilotos repetidos están excluidos del recuento final.

- Duelos: los diez cruces posibles; 400 semillas por cruce y cuatro combinaciones de lado/orden. Cada pareja disputa 1.600 partidas; cada clase aparece en 6.400 duelos con poderes.
- Todos contra todos: 200 partidas por tamaño (5, 10, 25 y 125). Cinco rotaciones por cada una de 40 semillas equilibran la asignación de clases; el orden de actualización se baraja separadamente de las posiciones.
- Cinco jugadores usa Smash; 10, 25 y 125 comienzan en Arena y conservan las transiciones reales a Smash con ocho supervivientes y a duelo con dos. No son equipos por clase.
- Se usa 125, en lugar de 128, para disponer de exactamente 25 cuerpos de cada clase.
- 180 HP, 12 de daño básico, energía inicial 50, ritmo 1, parámetros predeterminados, IA activa, sin apoyos externos, sin Prota ni reingresos. Cada partida termina con el vencedor real del motor o a los 180 segundos simulados. No hubo timeouts en esta muestra.
- Simulación de 60 pasos/s con temporizadores virtuales: también avanzan la cámara lenta y la protección de las transiciones. Física, IA, poderes, daño, K.O. y consumo de números aleatorios por partículas proceden del juego real; se omite la presentación.

## Victorias por modo

En duelo el punto de referencia es 50 %. En estas arenas equilibradas, cada clase tiene el 20 % de los participantes, de modo que una cuota de victorias cercana al 20 % sería el punto de referencia colectivo, no una exigencia para cada cruce.

| Clase | Duelo | Intervalo 95 % duelo | 5 jugadores | 10 jugadores | 25 jugadores | 125 jugadores |
| --- | --- | --- | --- | --- | --- | --- |
| Titán | 63,84 % | 62.00–65.84 % | 34,50 % | 41,50 % | 74,00 % | 95,00 % |
| Espíritu | 54,28 % | 52.56–56.09 % | 12,00 % | 11,00 % | 4,00 % | 0,50 % |
| Guerrero | 46,25 % | 44.47–48.16 % | 20,50 % | 21,50 % | 7,00 % | 1,00 % |
| Shinobi | 43,62 % | 41.84–45.38 % | 6,50 % | 5,00 % | 5,00 % | 1,00 % |
| Rayo | 42,00 % | 40.22–43.84 % | 26,50 % | 21,00 % | 10,00 % | 2,50 % |

Los intervalos se obtienen con 2.000 remuestreos de grupos de semilla, manteniendo juntos lados, orden y rotaciones; no se cuentan estos últimos como ensayos independientes. Describen este experimento con IA, no jugadores humanos ni una emisión con regalos/comandos. Una o dos victorias entre las clases minoritarias de la arena grande no permiten ordenar con confianza a todas ellas.

## Cruces en duelo

Cada celda es el porcentaje de victorias de la fila contra la columna, con 1.600 partidas por pareja.

| Clase \ rival | Guerrero | Shinobi | Titán | Rayo | Espíritu |
| --- | --- | --- | --- | --- | --- |
| Guerrero | — | 53,00 % | 35,12 % | 54,62 % | 42,25 % |
| Shinobi | 47,00 % | — | 33,75 % | 51,75 % | 42,00 % |
| Titán | 64,88 % | 66,25 % | — | 67,00 % | 57,25 % |
| Rayo | 45,38 % | 48,25 % | 33,00 % | — | 41,38 % |
| Espíritu | 57,75 % | 58,00 % | 42,75 % | 58,62 % | — |

Titán supera incluso a Espíritu, su rival directo más cercano. Sin poderes, las cinco clases quedan exactamente en **50 %** en el control de posiciones/orden: las estadísticas básicas son iguales.

## De dónde procede la ventaja

Los poderes tienen el mismo gasto máximo de 45 de energía, carga de 34 pasos al ritmo normal y espera de IA de 480 pasos (8 s). La IA puede gastar una carga parcial desde 25 de energía; por eso el daño realizado durante una partida no siempre coincide con el daño nominal a carga completa.

| Clase | Poder | Daño nominal completo por objetivo | Impacto real |
| --- | --- | --- | --- |
| Guerrero | !kame | 38 | Todos los objetivos frontales dentro de ±75 px verticales; el impacto no comprueba un alcance horizontal máximo. La IA inicia la carga a 260 px o menos. |
| Shinobi | !rasen | 34 | Un objetivo frontal a menos de 170 px; la IA carga a 155 px o menos. Incluye desplazamiento horizontal. |
| Titán | !coloso | 46 | Todos los rivales a 135 px o menos, sin máximo de objetivos. La IA busca al más débil entre los cercanos. |
| Rayo | !trueno | 32 | Hasta tres rivales a menos de 300 px, con prioridad adicional hacia Shinobi. |
| Espíritu | !enred | 38 | Un rival a menos de 300 px en Arena; en plataformas admite hasta 340 px frontales con tolerancia vertical de 135 px. |

Las cargas son interrumpibles. Los golpes y escudos reales se mantienen. Los K.O. pueden recuperar hasta **30 HP** al autor del remate, lo que favorece encadenar eliminaciones. Titán combina el mayor daño por objetivo, área sin límite y prioridad hacia rivales heridos. Esta combinación es una explicación compatible con su rendimiento; la medición principal no aísla por separado cada uno de esos factores.

En 125 jugadores, el poder completado de Guerrero afecta a **16,85 objetivos de media** y el de Titán a **9,16**, frente a menos de uno de media para los poderes de Shinobi/Espíritu y 2,86 para Rayo. El daño de área de Guerrero es enorme, pero no se convierte en victorias como el de Titán: hacer daño y rematar/sobrevivir son métricas distintas.

El parámetro `knockbackPower` pasado a `applyDamage` está sin usar en el cálculo. El empuje procede del cálculo central de salto/daño/carga. Cambiar solo esos números por poder no modificaría su lanzamiento actual; los probes confirman que Kame y Enred a igual carga/daño producen el mismo impulso.

## Control de selección de objetivos

Se repitieron 600 arenas con los mismos valores de poderes, quitando en memoria las preferencias de clase, la prioridad del Titán hacia heridos y el peso especial de Rayo hacia Shinobi. Todos buscan al objetivo más cercano. Esta variante solo vive en el analizador; no sustituye al juego.

| Clase | 10 jugadores: publicada → neutral | 25 jugadores: publicada → neutral | 125 jugadores: publicada → neutral |
| --- | --- | --- | --- |
| Titán | 41,50 % → 21,00 % | 74,00 % → 22,00 % | 95,00 % → 32,50 % |
| Espíritu | 11,00 % → 17,00 % | 4,00 % → 11,00 % | 0,50 % → 11,00 % |
| Guerrero | 21,50 % → 24,50 % | 7,00 % → 25,50 % | 1,00 % → 28,00 % |
| Shinobi | 5,00 % → 8,00 % | 5,00 % → 10,50 % | 1,00 % → 7,50 % |
| Rayo | 21,00 % → 29,50 % | 10,00 % → 31,00 % | 2,50 % → 21,00 % |

En la arena grande, Titán pasa de 95 % a 32,5 % sin cambiar daño, vida ni alcance. **La elección de blancos influye mucho en el desequilibrio.** Es un control conjunto de varias prioridades: no demuestra que el criterio de Titán explique por sí solo toda esa diferencia.

## Orden propuesto para equilibrar

1. **Titán primero.** Probar aisladamente su prioridad de remate antes de reducir todos sus números: primero el rival cercano, dejando intactas las demás preferencias. Después repetir los mismos seeds y comprobar cuánta ventaja queda.
2. Si continúa dominante, ensayar un cambio cada vez en Coloso (daño o máximo de objetivos por golpe), manteniendo su identidad de ataque de área. Estos ajustes todavía no tienen una cifra validada.
3. Volver a evaluar a los demás tras ese cambio. Shinobi necesita atención en multitudes; Rayo necesita atención en duelo, pero ya gana 26,5 % en Smash de cinco y 31 % en Arena de 25 bajo el control neutral: un aumento global podría excederse.
4. Revisar el alcance/objetivos reales de Kame para que su capacidad se explique con claridad. No atribuirle el dominio de Titán solo por su daño de área.

Objetivo práctico de la primera iteración: reducir las ventajas sistemáticas grandes, sin forzar que todas las clases ganen cada enfrentamiento ni eliminar sus diferencias. **No se han aplicado nerfs ni mejoras de poderes en este estudio.**

## Evidencia y reproducción

- [Resumen numérico, intervalos, telemetría y probes](balance-v0.5-summary.json).
- [33.400 resultados por partida, CSV comprimido](balance-v0.5-matches.csv.gz); el resumen incluye su SHA-256.
- `test/balance-simulation.mjs`: ejecutor del juego real en Chromium.
- `test/balance-harness.js`: adaptador de medición y tiempo virtual, usado solo en pruebas.
- `test/balance-summary.mjs`: agregación, intervalos y archivo de resultados.

Comprobaciones: repetición determinista de semillas; independencia respecto del escenario anterior; mismo vencedor, tiempo, vida, K.O. y daño nominal con/sin instrumentación en duelo y arenas de 25/125; 4.000 duelos del estudio inicial reproducidos exactamente en el ampliado; sin errores de JavaScript; unicidad de casos y conservación de victorias; 23 pruebas de contrato existentes aprobadas. El HTML de producción conserva su hash.

### Evaluación rápida en Windows

```powershell
npx.cmd playwright install chromium
npm.cmd run analyze:balance
```

El comando rápido ejecuta 4.800 casos y guarda datos en `reports/balance/latest.json`. No conecta con un LIVE. Para una comprobación corta: `$env:ARENA_BALANCE_PILOT="1"` antes de ejecutarlo; elimina esa variable para volver al estudio normal.

### Repetir la muestra ampliada

Sobre este mismo motor, sin variables de análisis anteriores activas:

```powershell
Remove-Item Env:ARENA_BALANCE_* -ErrorAction SilentlyContinue
$env:ARENA_BALANCE_DUEL_SEEDS="400"
$env:ARENA_BALANCE_ARENA_SEEDS="40"
$env:ARENA_BALANCE_OUTPUT="reports/balance/publicada.json"
npm.cmd run analyze:balance
$env:ARENA_BALANCE_VARIANT="nearest"
$env:ARENA_BALANCE_DUEL_SEEDS="0"
$env:ARENA_BALANCE_COUNTS="10,25,125"
$env:ARENA_BALANCE_OUTPUT="reports/balance/neutral.json"
npm.cmd run analyze:balance
node test/balance-summary.mjs reports/balance/publicada.json reports/balance/publicada.json reports/balance/neutral.json reports/balance/repeticion
```

El archivo publicado sirve tanto como entrada de duelos como de arenas, y el agregador toma cada subconjunto una sola vez. Los resultados generados quedan en `reports/balance/`; al terminar elimina las variables `ARENA_BALANCE_*` si quieres regresar a los valores predeterminados. Una futura versión del motor produce otro hash: debe medirse como una nueva muestra.
