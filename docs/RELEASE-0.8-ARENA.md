# Arena Live v0.8 · Suelo isométrico, caída y rescate

Entrega directa en `main`, mediante `npm.cmd start`, puerto 4173 por defecto. Conserva la conexión local de TikTok, comandos de pruebas, paneles, calibración y las dos capturas sincronizadas.

## Comportamiento

El círculo isométrico usa una elipse compartida por todas las funciones: centro `(480, 302.4)` y radios `(451.2, 172.8)` en el mundo de 960 × 540. Antes los radios eran `(422.4, 162)`: el aumento es aproximadamente un 7 % por eje y un 14 % de superficie. Las dimensiones de los lienzos y los recortes de OBS se conservan.

La comprobación de suelo utiliza el punto de los pies/sombra del peleador. Fuera del borde no existe apoyo ni una tolerancia de varios cientos de píxeles. El peleador entra en caída y solo se salva al volver por encima del suelo y aterrizar desde arriba. Entrar bajo el suelo no lo convierte en un aterrizaje.

| Situación | Resultado |
| --- | --- |
| De pie dentro del círculo | Tiene suelo y recupera sus saltos. |
| Sale caminando | Empieza a caer y conserva un salto aéreo. |
| Salta desde el suelo | Consume un salto; puede usar otro en el aire. |
| Intenta el rescate a tiempo | Impulso vertical y, fuera del borde, dirección hacia el centro. Puede volver si alcanza el suelo desde arriba. |
| Agota sus saltos, cae demasiado o queda muy lejos | El rescate no garantiza la vuelta; la caída termina en K.O. |
| Cae por arriba, abajo, izquierda, derecha o diagonal | Usa el mismo borde y reglas, incluida la oportunidad de rescate de la IA aunque haya quedado inmóvil apenas fuera. |
| Carga un poder al salir | El movimiento y la gravedad siguen; la carga se cancela cuando se hunde. |
| Queda debajo de la plataforma | El suelo lo oculta y no puede golpear ni empujar cuerpos que siguen sobre ella. |
| Cae el noveno superviviente | Se aplica el K.O. y se prepara Smash con ocho supervivientes, limpiando los estados de caída. |

La implementación conserva `z` como altura respecto al suelo, permite alturas negativas para la caída y mantiene `fallDrop` para su presentación. No teletransporta al peleador hacia arriba al rescatarlo. El límite de rescate es de 60 unidades bajo el plano; a 150 se confirma la caída mortal. Un contador acota el tiempo fuera, y las cargas se restauran al aterrizar de verdad. Estas constantes están centralizadas en `ISOMETRIC_ARENA`.

El K.O. conserva la atribución del último golpe, las vidas, reingresos y comandos de la versión anterior. Un mismo peleador no se elimina ni acredita dos veces. Las potencias y estadísticas de las cinco clases se conservan; se corrigen suelo, gravedad, recuperación y estados de transición.

## Cámara y controles

En **Ajustes → Pantallas y OBS → Vibración de cámara**:

- **25 %** predeterminado; **0 %** apaga la vibración; **100 %** permite la intensidad completa.
- La elección se guarda en `arenaLiveCameraV1`, independiente de reglas, distribuciones y `arenaLiveObsCalibrationV01`.
- Ambas capturas comparten el desplazamiento de un mismo cuadro. La vibración usa movimiento visual independiente del generador aleatorio del combate y se detiene durante la pausa.
- No modifica daño, empuje, poderes ni proporciones o calibración de las capturas.

En Arena, **WASD** mueve sobre el plano; **Espacio** o **↑ Saltar** ejecuta el salto. Mantener Espacio no produce saltos consecutivos. El segundo salto en el aire y el rescate respetan cargas y no pueden encadenarse indefinidamente.

## Prueba manual

1. Actualiza `main`, reinicia y comprueba **v0.8** en Ajustes.
2. Carga Arena o 128 personajes. Observa el círculo ampliado en 16:9 y 9:16.
3. Únete como Prota y acércate al borde. Sal sin saltar: debe empezar a caer y terminar eliminado si no regresa.
4. Repite y pulsa Espacio/↑ Saltar mientras aún pueda rescatarse. Debe saltar hacia el círculo y recargar los saltos solamente al aterrizar.
5. Comprueba los cuatro lados, un rescate tardío, un golpe que lo aleje mucho y una carga de poder junto al borde.
6. Cambia la vibración entre 0 %, 25 % y 100 %. Recarga y comprueba que se recuerda la elección y que OBS conserva su calibración.

## Validación

Las pruebas y sus hashes de código se recogen en [validation-v0.8.json](validation-v0.8.json) y las mediciones en [performance-v0.8.json](performance-v0.8.json).

- 36 comprobaciones de Node, 49 de navegador y 11 de carga aprobadas, sin fallos.
- Node cubre apoyo y caída a distintas velocidades, el borde exacto en 72 direcciones, rescates de IA en 36 direcciones, aterrizaje desde arriba, agotamiento/profundidad, cargas y persistencia de cámara.
- Navegador cubre los controles y OBS existentes, 40 caídas completas cruzando clase, Prota y lado del borde, ocho rescates de IA/Prota, teclado, ocultación bajo el suelo y transiciones entre Arena y Smash.
- Carga cubre 32/64/128 participantes, poderes con empuje completo, límites de efectos y registros de comandos, y 500 comentarios. Para comparar CPU con una población constante se deshabilita el empuje en ambas fuentes: con el suelo corregido, mucha vida ya no impide un K.O. por caída. Las pruebas posteriores restituyen el empuje completo.
- El motor completó 240 partidas con semillas reproducibles y sin tiempos agotados. Los 160 duelos y 20 partidas de cinco jugadores reprodujeron sus resultados completos anteriores. Las 60 partidas de Arena de 10/25/125 jugadores cambiaron con la nueva geometría y física; sus ganadores cambiaron en 49 casos. Esta muestra comprueba regresiones y funcionamiento, no un nuevo equilibrio estadístico.

Las mediciones proceden de Chromium sin GPU y no representan los FPS del equipo del usuario con OBS. TikTok fue simulado; no se conectó con un LIVE real. La física de Arena ha cambiado: las tasas de victoria medidas para v0.6/v0.7 son históricas y no prueban el equilibrio estadístico de esta nueva arena.
