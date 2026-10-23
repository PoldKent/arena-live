# Propuesta de equilibrio por modo · Arena Live v0.5

**Documento histórico.** El perfil descrito aquí se integró de forma nativa en [Arena Live v0.6 de main](RELEASE-0.6-UNIFICADA.md). Las instrucciones de variantes de este documento corresponden al laboratorio anterior; usa el README actual para iniciar y medir el juego. La referencia original era el motor v0.5 con blob `c2260f181dbce56c896a4806537f5fd5327bee2a`.

## Qué significa dar las mismas posibilidades

La elección de clase debe tener un efecto pequeño sobre la probabilidad de ganar bajo condiciones equivalentes. El objetivo inicial es 45–55 % en Duelo y 15–25 % de victorias **por clase** en partidas con las cinco clases igualmente representadas. Son bandas de selección para candidatos, no una garantía de igualdad exacta.

En una partida de 125 jugadores hay 25 por clase: el objetivo individual es aproximadamente 1/125, mientras que el conjunto de cada clase apunta al 20 %. Las partidas con cantidades distintas por clase requieren otra comparación. Tampoco se pretende garantizar una victoria por turno ni compensar artificialmente a quien pierde.

## Cambios del candidato

1. **Selección de rivales equitativa.** Todas las clases buscan al rival más cercano dentro de los requisitos del ataque. Titán deja de perseguir preferentemente a quien tiene menos vida. También se desactivan las preferencias de clase y la prioridad especial de Rayo contra Shinobi. Este cambio es conjunto; no debe atribuirse todo el efecto únicamente al selector de Titán.
2. **Una tabla para cada modo.** Cada poder mantiene su forma: línea, golpe dirigido, área o cadena. Sus valores se adaptan al modo actual y cambian con las transiciones normales de la partida.
3. **Ataques masivos acotados.** En Arena, Kame y Coloso afectan como máximo a tres objetivos válidos cercanos. Trueno mantiene tres. En Smash, Trueno afecta como máximo a dos. Esto reduce la ventaja que crecía con la cantidad de jugadores.
4. **Mejor oportunidad de ejecutar los ataques individuales.** Shinobi y Espíritu cargan antes en los modos con varios jugadores, donde sus cargas se interrumpían con frecuencia.

Daño nominal por objetivo, antes de energía parcial, escudos o bonificaciones:

| Clase | Publicado | Duelo | Smash | Arena |
|---|---:|---:|---:|---:|
| Guerrero | 38 | 43 | 44 | 38 |
| Shinobi | 34 | 38 | 50 | 60 |
| Titán | 46 | 38 | 38 | 38 |
| Rayo | 32 | 37 | 28 | 32 |
| Espíritu | 38 | 37 | 44 | 60 |

La carga original es de 34 pasos. En Smash, Shinobi usa 18 y Espíritu 22; en Arena ambos usan 20. Las demás cargas siguen en 34. Se mantienen las mismas reglas de vida, golpes normales, energía, recarga, empuje, curación por eliminación y transiciones. No se ha reparado ni utilizado el argumento de empuje por poder que el motor publicado actualmente ignora.

El perfil completo está en [balance-candidate-v0.5.json](balance-candidate-v0.5.json). Solo se aplica a una copia del HTML en memoria al ejecutar el laboratorio; no cambia `index.html` ni las preferencias guardadas.

## Validación independiente

Se utilizaron semillas nuevas respecto a la exploración: 1000–1399 para Duelo, 1000–1039 y 2000–2039 para Smash, y 2000–2039 para las partidas del candidato final que empiezan en Arena. Se cruzan los lados y el orden de actualización en Duelo, y se rotan las asignaciones de clase en las partidas con varios jugadores.

| Clase | Duelo, 16.000 combates | Smash, 5 jugadores | Arena, 10 jugadores | Arena, 25 jugadores | Arena, 125 jugadores |
|---|---:|---:|---:|---:|---:|
| Guerrero | 51,28 % | 22,75 % | 19,5 % | 22,5 % | 23,5 % |
| Shinobi | 49,59 % | 17,00 % | 25,0 % | 19,0 % | 22,0 % |
| Titán | 49,13 % | 21,00 % | 16,5 % | 21,5 % | 16,5 % |
| Rayo | 50,47 % | 21,75 % | 18,5 % | 17,0 % | 19,5 % |
| Espíritu | 49,53 % | 17,50 % | 20,5 % | 20,0 % | 18,5 % |

Cada clase aparece en 6.400 duelos. Los diez enfrentamientos entre clases quedan entre 47,125 % y 52,875 %, por lo que la media cercana al 50 % tampoco oculta un enfrentamiento extremadamente desigual en esta muestra.

Smash reúne 400 partidas independientes con tablas de Duelo y Smash idénticas. Una variante solo cambia los valores de Arena, fase a la que una partida que empieza con cinco jugadores no llega. Se verificó la equivalencia exacta de 50 casos con la misma semilla. Cada columna de Arena contiene 200 partidas.

Las tasas son del ganador de **la partida completa**, con los cambios reales Arena → Smash → Duelo. No son tasas aisladas de supervivencia en la fase inicial. Se desactivaron ayudas de audiencia y reingresos, se conserva el azar de combate y se suprimen dibujo y tareas visuales para acelerar el cálculo.

El archivo de evidencia contiene **33.600 casos de validación sin duplicados**: 16.000 duelos con poderes, 16.000 controles sin poderes y 1.600 partidas con varios jugadores entre el candidato final y una alternativa anterior. Las pruebas de equivalencia adicionales y las exploraciones no se suman. Los controles sin poderes dan 50 % exacto por clase; no hubo partidas agotadas ni errores JavaScript. El resumen calcula intervalos del 95 % mediante 2.000 remuestreos de semillas, manteniendo juntos los casos relacionados.

La alternativa anterior, sin los nuevos límites de área, dejó a Guerrero en 27 % y Espíritu en 12,5 % con 125 jugadores. Está conservada como comparación; sus resultados de Arena no se mezclan con los del candidato final.

## Alcance de la recomendación

Este candidato pasa las bandas iniciales por su estimación de victorias. Todavía corresponde verificar partidas con control manual, otras composiciones y cantidades de jugadores, ayudas de audiencia y rendimiento con 128 participantes. Las simulaciones de combate sin dibujo no miden FPS. El siguiente cambio del juego debería usar esta tabla como punto de partida y mantener una configuración central para continuar ajustándola con resultados reales.

No se debe copiar directamente todo el HTML experimental al juego: el adaptador del laboratorio también altera reloj, presentación y conexiones para medir. Una implementación posterior debe trasladar únicamente las reglas de selección, daño, carga y objetivos, y conservar los controles, OBS y el resto de las funciones.

## Archivos y repetición

- [Resumen, intervalos, perfiles y comparación](balance-candidate-v0.5-summary.json).
- [Resultados por partida, CSV comprimido](balance-candidate-v0.5-matches.csv.gz). Su SHA-256 está en el resumen.
- `test/balance-variants.mjs`: parches experimentales que no escriben sobre el juego.
- `test/balance-simulation.mjs`: ejecución reproducible del motor real, ahora con perfil por modo y desplazamiento de semillas.
- `test/balance-candidate-summary.mjs`: validación de perfiles, equivalencias, intervalos y archivo de resultados.

En una copia que tenga estos archivos y Chromium para Playwright instalado, PowerShell permite ejecutar el candidato así:

```powershell
$env:ARENA_BALANCE_VARIANT = 'nearest'
$env:ARENA_BALANCE_TUNING = Get-Content -Raw docs/balance-candidate-v0.5.json
$env:ARENA_BALANCE_SEED_START = '2000'
$env:ARENA_BALANCE_DUEL_SEEDS = '400'
$env:ARENA_BALANCE_ARENA_SEEDS = '40'
$env:ARENA_BALANCE_OUTPUT = 'reports/balance/candidato.json'
npm.cmd run analyze:balance
```

Se ejecutan 32.800 casos de esa configuración completa. El archivo publicado tiene además la alternativa anterior y usa la validación independiente de Duelo compartida entre ambos perfiles. Para volver al análisis de la versión publicada, elimina las variables `ARENA_BALANCE_*` de esta sesión de PowerShell. El laboratorio no conecta con TikTok LIVE.
