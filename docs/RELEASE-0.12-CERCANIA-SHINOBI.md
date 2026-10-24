# Arena Live v0.12 · Preferencia local de los Shinobi

Un Shinobi enfrenta al rival cercano y prefiere otra clase solo cuando las distancias son parecidas. El margen inicial de semejanza es **15 % respecto al rival válido más cercano**.

- Shinobi a distancia 100 y Titán a 115: elige al Titán.
- Shinobi a distancia 100 y Titán a más de 115: elige al Shinobi.
- Si solo quedan Shinobi válidos, pelean entre ellos hasta que queda un ganador.

La regla se comparte entre persecución de IA, golpes y Rasen en Duelo, Smash y Arena. Cada acción filtra primero sus rivales válidos y su alcance. La preferencia no crea inmunidad entre compañeros ni exige alcanzar a un rival lejano antes de defenderse. En empates de una misma categoría se conserva el orden de la lista.

## Implementación y consulta

`ARENA_COMBAT_TARGET_RULES.shinobiSimilarDistancePercent` contiene el margen de cercanía. `findPreferredCombatTarget` encuentra al rival más cercano y al preferido en un único recorrido lineal, sin ordenar ni crear listas. Compara distancias al cuadrado y porcentajes enteros para incluir el límite exacto sin introducir una raíz por rival.

El panel **Ajustes → Equilibrio por clase** explica el margen en los ocho idiomas y lee su porcentaje de la misma constante. `ArenaLive.getCombatTargetRules()` expone una instantánea inmutable de esa configuración. El analizador registra el margen y la política en sus informes para que las mediciones sean reproducibles.

Se conservan la cadena A y su **+10 % / −10 % de daño**, los perfiles nominales de poderes, energía, críticos, escudos, cargas, alcances y cupos. Guerrero sigue prefiriendo otros Guerreros; Titán puede atacar a todos; Rayo y Espíritu eligen al más cercano. La localización de la preferencia se aplica únicamente a Shinobi.

Continúan TikTok, el chat de comandos, ambos lienzos Full HD, las herramientas y la calibración OBS. La versión **0.12** aparece una sola vez en el pie de Ajustes; API, servidor y paquete usan **0.12.0**.

## Comparación con v0.11

Se repitieron **2.400 partidas** con las mismas semillas y configuraciones de v0.11. Hay 1.000 duelos con poderes y 1.000 sin poderes, con 25 semillas y lados/orden cruzados. Las otras 400 partidas empiezan con 5, 10, 25 o 125 peleadores: 100 por población, con 20 semillas y cinco distribuciones por semilla, siempre igual cantidad de participantes por clase.

Todos los casos terminan antes de los 180 segundos simulados. Las estadísticas cuentan la partida completa, incluidas sus transiciones de Arena a Smash y Duelo. Son pruebas sin apoyos sociales ni reingresos.

| Peleadores iniciales | Shinobi: victorias v0.11 | Shinobi: victorias v0.12 |
|---|---:|---:|
| 5 | 18 de 100 | 18 de 100 |
| 10 | 24 de 100 | 24 de 100 |
| 25 | 45 de 100 | 19 de 100 |
| 125 | 93 de 100 | 23 de 100 |

Los **2.000 duelos y las 100 partidas de cinco peleadores reproducen exactamente sus resultados completos de v0.11**, incluidos tiempos y telemetría. Los cambios aparecen en poblaciones con varios Shinobi, donde la nueva regla puede alterar la selección de objetivos. Se comprueba además determinismo, aislamiento entre escenarios y equivalencia del combate con y sin telemetría.

El resultado mejora mucho el dominio anterior de los Shinobi. **Todavía no demuestra igualdad de oportunidades entre las cinco clases:** con 125 peleadores, las victorias se reparten en Guerrero 6, Shinobi 23, Titán 29, Rayo 35 y Espíritu 7. Guerrero y Espíritu quedan por debajo de la referencia del 20 % por clase. La muestra y sus intervalos agrupados por semilla están disponibles para seguir nivelando con datos.

[Resumen y configuración](balance-v0.12-summary.json) · [Archivo de partidas](balance-v0.12-matches.csv.gz) · [Validación y comparación](validation-v0.12.json).

## Verificación

- **52 comprobaciones de Node**, sin fallos: regla de cercanía, límite exacto, orientación, alcance, bajas, empates, daño y búsquedas hasta 128 peleadores.
- **62 comprobaciones de navegador**, sin errores: persecución real de IA en los tres modos, daño de golpe y Rasen contra el blanco correcto, final Shinobi, margen visible en ocho idiomas, barras, texto de poderes, comandos, TikTok simulado, paneles, Full HD y OBS.
- **12 comprobaciones de carga**, sin errores: escenarios de 32/64/128, poderes y textos acotados, ambas capturas y ráfaga de 500 comentarios. [Mediciones](performance-v0.12.json).

Las mediciones de dibujo usan rasterizado por software y lectura de píxeles; no son los FPS del equipo del usuario con OBS. Las pruebas de TikTok son simuladas y no validan una conexión LIVE real.

Para repetir la muestra desde `main`, con el navegador de Playwright instalado:

```powershell
$env:ARENA_BALANCE_DUEL_SEEDS = '25'
$env:ARENA_BALANCE_ARENA_SEEDS = '20'
$env:ARENA_BALANCE_SEED_START = '3000'
npm.cmd run analyze:balance
```
