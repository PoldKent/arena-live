# Arena Live v0.18 · Jugador, poderes y comandos

**Jugador, poderes y comandos** es el único panel para seleccionar un jugador y realizar pruebas. Se retiraron el panel Jugador objetivo y su acceso de Herramientas.

- Un selector compartido por poderes, comandos del jugador, poderes del chat y apoyos sociales. Se conserva su identificador para los controles existentes.
- Nombre y clase juntos, con vida y energía debajo.
- El cambio de clase aparece al seleccionar un jugador fijo. En aleatorio, el poder determina la clase compatible.
- Se mantienen los cinco poderes, Adaptar clase para probar, comandos dirigidos, reingreso y el tratamiento de Prota.
- El panel sigue disponible en preparación, Stream y móvil, con sus controles de acoplamiento y cierre.

Las distribuciones v0.17 y los archivos de configuración anteriores se adaptan al cargarlos. Se conserva la posición guardada de Poderes y el panel unificado se abre si antes estaba abierto cualquiera de los dos. Si solo existe la distribución antigua de Jugador objetivo, se utiliza como posición inicial. Se preservan las preferencias de clase, reglas, audio, idioma y calibración OBS.

Continúa una única aplicación en `main`, versión 0.18.0, con generación del HTML móvil desde los mismos módulos. El equilibrio y las reglas de combate corresponden a v0.17; esta entrega simplifica los controles.

Para comprobarlo, abre Herramientas, selecciona **Jugador, poderes y comandos** y alterna entre Aleatorio y un jugador fijo. Comprueba la identidad al probar Kame/Trueno y envía un comando al elegido. También puedes importar una configuración anterior y revisar que solo aparece el panel unificado.

[Validación de v0.18](validation-v0.18.json): pruebas unitarias, operador, integridad, herramientas y HTML móvil sin conexión. Incluye la migración de distribuciones anteriores, Stream, ancho de teléfono y conservación de OBS/preferencias.
