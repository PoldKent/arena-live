# Arena Live v0.6 · principal unificada

TikTok LIVE, interfaz, OBS, reglas y equilibrio de combate se entregan juntos en `main`. El inicio habitual es `npm.cmd start`, con http://127.0.0.1:4173. La versión es 0.6 en Ajustes y 0.6.0 en el paquete, la API del juego y `/api/status`.

## Combate integrado

`ARENA_CLASS_BALANCE`, dentro de `index.html`, define el perfil compartido por poderes de IA, Prota, chat y herramientas. `ArenaLive.getBalanceRules()` expone la tabla congelada para consultar las reglas sin modificarlas.

| Clase | Daño Duelo | Daño Smash | Daño Arena | Carga Smash / Arena |
|---|---:|---:|---:|---:|
| Guerrero | 43 | 44 | 38 | 34 / 34 |
| Shinobi | 38 | 50 | 60 | 18 / 20 |
| Titán | 38 | 38 | 38 | 34 / 34 |
| Rayo | 37 | 28 | 32 | 34 / 34 |
| Espíritu | 37 | 44 | 60 | 22 / 20 |

El daño es nominal, antes de energía parcial, escudos y ayudas. La carga se expresa en pasos de simulación; en Duelo todas usan 34. Se conservan vida, energía, recarga, empuje, críticos, curación por eliminación, reingresos y ayudas sociales.

- Todas las clases buscan al rival válido más cercano. Las restricciones de dirección y alcance de cada poder siguen aplicándose.
- En Arena, Kame y Coloso alcanzan como máximo a tres objetivos válidos cercanos. Sus efectos de línea y área se conservan.
- Trueno alcanza tres objetivos en Arena y Duelo, y dos en Smash.
- Una eliminación puede cambiar de modo y recolocar a los supervivientes durante un poder. La selección inicial y las comprobaciones de cada impacto conservan el comportamiento exacto del candidato medido.

La selección normal usa un único recorrido lineal con distancias al cuadrado. La ordenación por distancia se reserva para los ataques especiales que necesitan elegir un número limitado de objetivos.

## Depuración y continuidad

Se retiran el servidor de prueba, los parches del HTML, la guía de instalación separada y el comando `start:balance`. El analizador utiliza directamente el mismo HTML publicado; produce datos, resumen con intervalos y un CSV comprimido por ejecución. Los estudios anteriores se mantienen como documentos históricos.

Se conserva la composición dual, geometría y calibración OBS, distribución de paneles, reglas guardadas, perfiles, chat, controles móviles y cupo de 128. No se cambian las claves de almacenamiento del navegador. El puente continúa limitado a 127.0.0.1 y TikTok empieza desconectado hasta que el operador conecta.

El recorrido local de TikTok y sus estados se verificaron con mensajes y respuestas simulados. La conexión a un LIVE público requiere comprobarse durante una emisión activa, como se describe en el README.

## Validación

Pasaron **73 comprobaciones**: 26 de Node y limpieza de ramas, 36 de interfaz/combate y 11 de carga. Incluyen ambas capturas, 3440×1440, paneles y persistencia, pausa, reglas, controles móviles, poderes, clases, escenarios con 32/64/128 luchadores y una ráfaga de 500 comentarios.

La integración nativa reproduce **33.000 registros completos del candidato** sin diferencias: 16.000 duelos con poderes, 16.000 controles sin poderes y 1.000 partidas con varios jugadores. Los resultados conservan las transiciones reales Arena → Smash → Duelo.

| Clase | Duelo | Smash, 5 jugadores | Arena, 10 | Arena, 25 | Arena, 125 |
|---|---:|---:|---:|---:|---:|
| Guerrero | 51,28 % | 22,75 % | 19,5 % | 22,5 % | 23,5 % |
| Shinobi | 49,59 % | 17,00 % | 25,0 % | 19,0 % | 22,0 % |
| Titán | 49,13 % | 21,00 % | 16,5 % | 21,5 % | 16,5 % |
| Rayo | 50,47 % | 21,75 % | 18,5 % | 17,0 % | 19,5 % |
| Espíritu | 49,53 % | 17,50 % | 20,5 % | 20,0 % | 18,5 % |

Son victorias por clase con igual representación, sin ayudas de audiencia ni reingresos. El objetivo de referencia es alrededor del 50 % en Duelo y del 20 % por clase en partidas con las cinco clases. Las estimaciones no garantizan igualdad exacta para todas las composiciones ni reproducen habilidad humana o ayudas del LIVE. El resumen contiene intervalos por semilla.

La migración principal se midió antes de corregir el título HTML inicial de v0.5 a v0.6; se verificó que todos sus scripts son idénticos a los de la entrega final. Los 200 casos adicionales de Smash y el informe final de rendimiento usan el HTML definitivo. Se conservan hashes y procedencia para auditar esa diferencia de etiqueta.

| Carga | Simulación v0.5, media | Simulación v0.6, media |
|---|---:|---:|
| 32 jugadores | 0,137 ms | 0,125 ms |
| 64 jugadores | 0,157 ms | 0,113 ms |
| 128 jugadores | 0,546 ms | 0,397 ms |

La selección de objetivos con 128 pasó de 0,315 a 0,135 ms de media. Son mediciones del motor a 60 pasos, con navegador y rasterización por software. El dibujo de las dos capturas sigue alrededor de 22 ms en ese entorno: estas cifras no representan FPS completos ni garantizan 60 FPS en Windows con OBS.

- [Comprobaciones y procedencia](validation-v0.6.json).
- [Mediciones completas de rendimiento](performance-v0.6.json).
- [Resumen de equilibrio, intervalos y SHA-256 del archivo](balance-v0.6-summary.json).
- [33.000 resultados por partida, CSV comprimido](balance-v0.6-matches.csv.gz).

## Trabajo en main y retiro de ramas

Continúa el desarrollo en `main`. Se conserva el historial de TikTok, rendimiento, diagnóstico y prueba de equilibrio en la entrega unificada.

Después de actualizar desde Git autenticado en tu equipo, ejecuta:

```powershell
npm.cmd run clean:branches
```

El comando verifica las cuatro ramas anteriores conocidas, comprueba que sus puntas estén contenidas en `origin/main` y elimina sus referencias remotas en una sola operación con comprobación de cambios concurrentes. Si encuentra trabajo no integrado o el servidor rechaza alguna eliminación, conserva las referencias y comunica el motivo. No elimina ramas personales ni archivos/carpetas de tu equipo. Puede repetirse cuando las ramas ya estén retiradas.

Esta publicación actualiza `main` directamente. La herramienta que la publica no dispone de borrado de referencias; el comando de limpieza utiliza la autenticación Git existente del propietario para completar ese paso.
