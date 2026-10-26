# Arena Live v0.15 · Correcciones integradas

Entrega de 2026-10-26 en `main`. Una sola aplicación, un solo servidor local y ambas capturas sincronizadas: 1920 × 1080 y 1080 × 1920. Se conservan los paneles de pruebas, los comandos, la calibración OBS, las preferencias de espectadores y las claves anteriores de almacenamiento.

## 1. Integridad de partidas y reglas comunes

- Revancha reconstruye el roster de la ronda, incluidos Prota y participantes incorporados después del inicio. No lo sustituye por espectadores históricos.
- Una nueva vida limpia atribución de daño, velocidades, caída, cargas, estados temporales y escudos. Mantiene las estadísticas de la ronda; una ronda nueva también las reinicia.
- Las bajas por caída solo atribuyen al atacante un golpe reciente de la vida actual. Un atacante eliminado no recibe curación.
- Puntuación única: 250 por KO más HP efectivamente retirados. Un golpe de 60 contra un rival con 1 HP suma 1 de daño. Desempates: KO, supervivencia y proporción de vida.
- Resultado y podio son instantáneas; cada participante aparece una sola vez. Un campeón por puntuación puede estar eliminado: su presentación usa un actor separado y conserva el campo de batalla. Sin supervivientes se anuncia empate.
- Tras el KO final se bloquea el resultado durante su presentación. El temporizador de ronda avanza por pasos jugados, no por segundos de pared perdidos al bloquearse una pestaña.
- Especiales predeterminados: mínimo 25 de energía, consumo de hasta 45 y espera de 480 pasos, equivalentes a 8 s de simulación a 1×. IA, chat, Prota y pruebas comparten el validador. La opción participativa permite a las acciones humanas lanzar sin energía ni espera; a cero energía usa un factor de 0,25. La IA mantiene sus límites.
- Abrir Ajustes pausa; cerrarlo reanuda siempre. El chat registra el mensaje recibido y puede guardar la última acción por persona: 64 personas, vigencia de 8 s, despacho de 4 acciones/s. Se descartan acciones de una ronda anterior, objetivos desaparecidos y poderes desactivados. Existe la opción de mostrar sin ejecutar.

## 2. Rendimiento, dibujo y audio

La física continúa a 60 pasos/s con recuperación acotada de cuadros lentos. El dibujo se limita por separado a 30 o 60 FPS. Bajar este límite no reduce la resolución ni altera el resultado del combate; los tiempos descartados se exponen en el diagnóstico.

Las calidades Alta, Equilibrada y Rendimiento limitan las muestras de partículas dibujadas a presupuestos de 1800, 900 y 350. Se conservan todas las partículas de la simulación: no cambia su creación, duración ni el azar del combate. Se omiten cuerpos, partículas y textos completamente fuera de la cámara, con margen para sus adornos. Rayos y haces siguen extendiéndose por toda la captura vertical. Los nombres recuperan el tamaño de la final cuando quedan dos supervivientes de un roster grande.

Ambas vistas comparten orden de profundidad, vibración y tiempo de animación. Rasen y las burbujas siguen altura y caída. El audio usa un volumen maestro, hasta 16 voces, agrupación de sonidos simultáneos iguales y prioridad para victoria/transición. Los nodos terminados se desconectan.

El generador aleatorio de combate es independiente de partículas, confeti, métricas simuladas y dibujo. Las pruebas comparan el combate de 128 peleadores entre las tres calidades y entre límites de dibujo de 30 y 60 FPS.

Consulta [rendimiento](performance-v0.15.json) y [diagnóstico gráfico](gpu-v0.15.json). La prueba de rendimiento fuerza dibujo por software e incluye lectura de píxeles; no equivale a FPS durante una emisión. El diagnóstico de la aplicación mide CPU y envío de comandos, no tiempo de ejecución de GPU. Canvas 2D permite la aceleración que el navegador tenga disponible; este entorno usa SwiftShader y no permite validar una GPU física ni la configuración del PC del operador.

Se descartaron dos experimentos que empeoraron el control por software: fusionar trayectorias de partículas y convertir nombres en imágenes a escala 4×. Se conservan los círculos y textos nativos; no se publica una optimización por suponer que será más rápida.

## 3. TikTok y sesiones largas

`LiveSession` asigna una generación a cada conexión. Los eventos de una conexión antigua no entregan chat ni restablecen un estado conectado. Una conexión pendiente se puede cancelar, tiene un plazo de 20 s y el cierre se limita a 1,5 s. La reconexión empieza en 1 s y aumenta hasta 30 s, únicamente después de una conexión solicitada por el operador; Desconectar cancela los reintentos.

El servidor verifica actividad de WebSockets y cierra clientes al detenerse, incluso con una ventana del juego abierta. Solo una ventana recibe comentarios. Cuando se cierra, otra ventana existente debe pulsar **Usar esta partida**: no se envían acciones silenciosamente a una partida distinta. La API diferencia ventanas locales de audiencia real.

El historial LIVE es circular, de hasta 50.000 mensajes; conserva navegación y exportación sin desplazar todo el arreglo por cada mensaje nuevo. Una ráfaga de comentarios no reconstruye la barra de conexión por mensaje. Las métricas sin fuente LIVE muestran ausencia de datos, y las simuladas se identifican como tales.

**Alcance:** LIVE recibe comentarios. Likes, regalos y otros apoyos del panel continúan siendo simulaciones. Se probaron normalización, recepción local, sesiones falsas y fallos controlados; no se conectó una emisión real ni se validaron cambios del protocolo de TikTok en producción.

## 4. Equilibrio, narrativa y evidencia

Se conserva la cadena Guerrero → Titán → Rayo → Espíritu → Shinobi → Guerrero: +10 % en el sentido de la flecha y −10 % al contrario. Los demás cruces son neutros. HP base 180, golpe base 12 y probabilidad crítica 14 %.

Decisiones confirmadas por el operador:

- Guerrero responde al peligro cercano y prefiere otro Guerrero si está como máximo un 25 % más lejos. Puede recuperarse la prioridad absoluta en Ajustes.
- Shinobi prefiere otra clase hasta un 15 % más lejos; puede golpear a otro Shinobi cercano y la partida termina con un ganador. No hay inmunidad de clase.
- Espíritu puede enlazar dos rivales en Arena; en Smash y Duelo conserva un objetivo.

Perfiles de Arena:

| Clase | Daño especial por objetivo | Carga en pasos | Objetivos máximos |
|---|---:|---:|---:|
| Guerrero | 38 | 34 | 2 |
| Shinobi | 60 | 20 | 1 |
| Titán | 38 | 34 | 2 |
| Rayo | 32 | 34 | 2 |
| Espíritu | 32 | 28 | 2 |

La carga indicada corresponde a la escala de simulación; 60 pasos ≈ 1 s a ritmo 1×. Los objetivos deben estar dentro del alcance. Los perfiles numéricos de Duelo y Smash se mantienen. El menor daño individual de Enredadera compensa que ahora pueda alcanzar a dos rivales y su daño total potencial, sin convertirlo en daño garantizado.

El ajuste exploratorio empleó semillas desde 6000. La validación se reservó para semillas desde 8000: 25 semillas de Duelo y 20 de Arena. No se retocaron los valores para perseguir cada diferencia observada en esta muestra final. El mismo control de ciclo de vida, RNG y reglas de acción se usa en la comparación; el control restaura la prioridad global anterior de Guerrero y los perfiles anteriores de Arena. No se presenta esa comparación como una ejecución del binario completo v0.14.

| Muestra de validación | Guerrero | Shinobi | Titán | Rayo | Espíritu |
|---|---:|---:|---:|---:|---:|
| Duelo · 400 participaciones por clase | 54,5 % | 46,5 % | 48 % | 51 % | 50 % |
| Inicio con 5 · 100 rondas | 25 % | 16 % | 23 % | 21 % | 15 % |
| Inicio con 10 · 100 rondas | 14 % | 22 % | 17 % | 31 % | 16 % |
| Inicio con 25 · 100 rondas | 21 % | 20 % | 21 % | 26 % | 12 % |
| Inicio con 125 · 100 rondas | 17 % | 20 % | 19 % | 25 % | 19 % |
| Control anterior, inicio con 125 | 8 % | 17 % | 37 % | 28 % | 10 % |

Son **2.400 partidas**: 1.000 duelos con poderes, 1.000 sin especiales y 400 rondas repartidas entre los cuatro tamaños. Duelo cruza lado y orden de actualización; Arena rota cinco veces la asignación de clases por semilla. Los grupos numerosos usan 125 para repartir exactamente 25 de cada clase; la carga técnica se verifica aparte con 128.

Cada porcentaje de Arena describe una **ronda completa iniciada con ese tamaño**, incluidos los cambios posteriores a Smash y Duelo. No es la victoria de una fase aislada. Los intervalos del 95 % remuestrean semillas completas mediante 2.000 bootstrap; las rotaciones de una semilla no se consideran observaciones independientes. Los datos no incluyen apoyos, Prota, reingresos ni reglas personalizadas. Rayo todavía destaca con diez participantes y Espíritu queda rezagado con 25; se muestran esas diferencias en vez de prometer igualdad exacta.

El menú mantiene el **radar pentagonal** de HP básico/especial, perfiles por modo, rivalidades y comparación con reglas de ronda. Añade una tabla de victorias e intervalos, con tamaño de muestra por clase, separada de los daños nominales. Consultar un perfil no cambia la partida.

Datos reproducibles:

- [Perfil nativo](balance-v0.15-profile.json).
- [Resumen de validación e intervalos](balance-v0.15-summary.json) y [partidas CSV comprimidas](balance-v0.15-matches.csv.gz).
- [Resumen del control](balance-v0.15-control-summary.json) y [partidas del control](balance-v0.15-control-matches.csv.gz).
- `npm.cmd run analyze:balance` ejecuta el motor real con el adaptador de pruebas; admite `ARENA_BALANCE_SEED_START`, `ARENA_BALANCE_DUEL_SEEDS`, `ARENA_BALANCE_ARENA_SEEDS` y `ARENA_BALANCE_OUTPUT`. Con `ARENA_BALANCE_CONTROL=1`, aplica la intervención del equilibrio anterior en memoria sobre el mismo motor para repetir la comparación; no modifica la aplicación.

## 5. Ajustes, accesibilidad y respaldo

**Sesión y rendimiento** añade nombres y explicaciones explícitas en los ocho idiomas. Mantiene el resto de controles de Inicio/Pruebas y de Ajustes. Opacidad indica que afecta a textos y barras, muestra el porcentaje y lo recuerda. El volumen maestro también se guarda.

Stream conserva el menú seleccionado hasta elegir otro o cerrar con ×. Ajustes se expone como región en la columna de Stream y como diálogo modal en preparación; el foco se limita solo cuando corresponde. Escape cierra Ajustes y reanuda. La versión visible permanece únicamente en el pie del menú.

Guardar configuración exporta un JSON con esquema validado: reglas, sesión, volumen, cámara, calibración OBS, duración/vidas, idioma y las dos distribuciones. Cargar no elimina perfiles y rechaza formatos desconocidos antes de modificar opciones. El archivo no guarda la simulación ni datos de chat. Restablecer sesión conserva calibración y paneles. El diagnóstico se exporta por separado.

La nueva clave es `arenaLiveRuntimeV1`; las claves existentes de perfiles, idioma, cámara, visualización, reglas, OBS y espacios de trabajo se conservan. No se migra ni borra el almacenamiento del operador.

## 6. Mantenimiento y validación

Se extraen módulos clásicos de reglas puras, dibujo, audio, ajustes y evidencia sin romper las llamadas de la interfaz ni la API. Se retiran `forceFree` y el parámetro ignorado de impulso de `applyDamage`; el impulso real continúa calculándose con las reglas compartidas. Los documentos y datos de versiones anteriores permanecen como historial. La inspección de declaraciones no demuestra que toda rama posible del código sea alcanzable.

Las dependencias directas son exactas y `npm-shrinkwrap.json` fija las transitivas con direcciones públicas del registro npm. `npm.cmd ci` no requiere eliminar el `package-lock.json` local del operador. CI ejecuta instalación, pruebas unitarias, navegador y carga en Node.js 24 sobre Windows y Linux. La validación de esta entrega está en [validation-v0.15.json](validation-v0.15.json); la ejecución remota de CI depende del estado del servicio después de publicar.

Para actualizar, detén el servidor con Ctrl+C y ejecuta desde la carpeta del proyecto. Conserva antes tus cambios locales. La secuencia se detiene si Git o npm fallan:

```powershell
& {
    git status -sb
    git switch main
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo seleccionar main.' }
    git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw 'Actualización detenida; conserva tus cambios locales.' }
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación.' }
    npm.cmd start
}
```

Abre http://127.0.0.1:4173, recarga con Ctrl+F5 y comprueba **Arena Live v0.15 · TikTok** en el pie de Ajustes. Carga el escenario de 128, prueba las tres calidades y usa Exportar diagnóstico para medir el equipo real con OBS.
