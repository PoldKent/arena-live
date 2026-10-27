# Arena Live v0.17 · Preferencias de clase y pruebas de poderes

Una entrega en `main`, con TikTok y exportación móvil desde el mismo motor.

## Preferencias de las cinco clases

En **Ajustes → Equilibrio por clase → Preferencias de ataque por clase**, cada clase tiene su selector independiente:

| Clase | Valor inicial | Otras opciones |
| --- | --- | --- |
| Guerrero | Preferir otro Guerrero hasta un 25 % más lejos | Siempre Guerrero, más cercano, rival favorable cercano |
| Shinobi | Preferir otra clase hasta un 15 % más lejos | Siempre otra clase, más cercano, rival favorable cercano |
| Titán | Más cercano, de cualquier clase | Rival favorable, misma clase u otra clase a distancia parecida |
| Rayo | Más cercano, de cualquier clase | Rival favorable, misma clase u otra clase a distancia parecida |
| Espíritu | Más cercano, de cualquier clase | Rival favorable, misma clase u otra clase a distancia parecida |

«Ventaja cerca» usa el rival favorable de la cadena: Guerrero → Titán → Rayo → Espíritu → Shinobi → Guerrero. Las preferencias adicionales por cercanía admiten hasta un 25 % de distancia extra frente al más próximo. Las preferencias absolutas siguen respetando el alcance de cada ataque y recurren a otro rival cuando no existe un candidato de la clase preferida.

Ninguna preferencia concede inmunidad: los Shinobi pueden dañarse y disputar la final. La política se aplica al buscar objetivos de movimiento y ataques dirigidos en los tres modos; los poderes conservan su geometría y sus cupos. Los perfiles numéricos, rivalidades ±10 % y parámetros iniciales conservan el equilibrio anterior.

Las cinco preferencias se guardan en `arenaLiveRuntimeV1` y se incluyen en exportar/importar configuración. Las configuraciones anteriores con prioridad de Guerrero mantienen su elección; las nuevas clases reciben sus valores iniciales. **Restaurar preferencias** afecta solo a esos cinco selectores. La tabla de victorias avisa cuando se usan preferencias personalizadas: sus mediciones históricas corresponden a los valores originales, no a cada combinación nueva.

## Objetivo y poderes conectados

El panel **Jugador, poderes y comandos** reúne:

- Un selector de jugador, sincronizado con el panel **Jugador objetivo**.
- Nombre, clase, vida y energía del seleccionado. En aleatorio muestra al último participante usado por la prueba.
- Un selector de clase para el jugador fijo.
- Los cinco poderes y un campo para enviar comandos al jugador elegido.
- La opción **Adaptar clase para probar**, activada inicialmente y recordada en la configuración.

El jugador elegido es **quien ejecuta el poder**. Los blancos que reciben daño siguen las reglas, alcance y geometría del combate.

### Aleatorio

Kame busca un Guerrero; Trueno un Rayo, y lo mismo ocurre con las otras firmas. Se excluyen los eliminados y quienes ya caen bajo la arena. Si no hay nadie de esa clase, **Adaptar clase para probar** permite adaptar un participante activo. No añade cuerpos ni supera el cupo.

### Jugador fijo

Cada prueba usa esa identidad. Con **Adaptar clase para probar**, pulsar Kame lo adapta a Guerrero y pulsar Trueno a Rayo. El cambio queda visible en ambos paneles y en el chat local. Si se desactiva la adaptación, solo se habilitan sus poderes compatibles, con una explicación para los demás.

Un jugador seleccionado que cae eliminado permanece identificado como K.O.; la prueba no salta silenciosamente a otra persona. `!jugar` en el campo de comandos puede solicitar su reingreso mediante las reglas normales de la ronda.

### Pruebas repetibles

Los botones de este panel preparan energía completa y recarga lista, y luego usan la carga y ejecución canónicas del poder. Desde el lobby, el primer poder inicia el combate. Una nueva prueba puede sustituir la carga que ese mismo jugador estaba preparando.

La pausa, los resultados bloqueados, los poderes desactivados, la clase única y las caídas siguen bloqueando acciones incompatibles y muestran el motivo. El chat LIVE, el chat general y los botones de Prota conservan sus validadores de energía, recarga y reglas; la preparación instantánea pertenece a estas herramientas explícitas de prueba.

El campo **Comando del jugador** envía comandos de clase, poderes, mensajes y `!jugar` usando la identidad elegida. El chat general conserva su identidad de emisor; sus poderes aleatorios también filtran por clase compatible. Las ejecuciones reales siguen generando una única observación estructurada del comando en el chat de pruebas, al terminar la carga.

En Stream y móvil el panel permanece abierto al seleccionar, cambiar de clase, probar poderes o enviar comandos. El acceso desde Jugador objetivo abre el anfitrión correcto. En preparación se conservan los dos paneles acoplables y sus distribuciones guardadas.

## Comprobarlo

1. Carga 32 o 128 peleadores y abre **Jugador, poderes y comandos**.
2. Elige **Aleatorio compatible con el poder** y alterna Kame, Rasen, Trueno, Enredadera y Coloso. Comprueba nombre, clase y comando de cada ejecución.
3. Fija un jugador. Con **Adaptar clase para probar**, alterna Kame y Trueno: la identidad debe mantenerse. Desactiva la opción para revisar los bloqueos de clase.
4. Prueba el selector de clase y escribe `!rayo` o `!trueno` en **Comando del jugador**.
5. Abre Ajustes, cambia una preferencia de cada clase, cierra y vuelve a abrir. Exporta/importa la configuración y comprueba también su persistencia al recargar.

Pruebas automatizadas: `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run test:mobile`, `npm.cmd run test:performance`. Incluyen un oráculo independiente de preferencias hasta 128 peleadores, selección compatible, adaptación, reingreso fijo, estados bloqueados, ocho idiomas, Stream y ancho móvil. La comparación de combate con v0.16 conserva los estados y el RNG con las preferencias iniciales.

Se usó Chromium con dibujo por software y datos simulados. No es una medición del PC/celular del operador ni una conexión a un LIVE real. Los datos históricos de equilibrio permanecen como referencia.

[Registro de validación de v0.17](validation-v0.17.json): 84 pruebas unitarias, 65 de operador, 24 de integridad, 17 de las nuevas herramientas, 13 del archivo móvil y 19 de carga/rendimiento. [Comparación reproducible con v0.16](performance-v0.17.json).
