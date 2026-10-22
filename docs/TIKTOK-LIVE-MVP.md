# Arena Live — Primera conexión con TikTok LIVE (Windows)

**Cuenta de prueba:** [@polkent.live](https://www.tiktok.com/@polkent.live)

Esta rama añade un **puente local de chat**. No es todavía una aplicación instalable ni contiene una cámara virtual o salidas OBS independientes. El juego sigue en `index.html` sin cambiar las reglas de gameplay.

## Qué funciona en esta etapa

- Arrancar Arena Live desde un servidor local Node.js.
- Conectar manualmente al chat público de un TikTok LIVE que ya esté transmitiendo.
- Entregar comentarios reales al motor mediante `window.ArenaLive.sendChat(...)` y `platformKey: 'tiktok'`.
- Reutilizar autoinscripción, comandos, habilidades, límites antispam e identificación por plataforma.
- Probar el recorrido completo sin salir en directo mediante **Probar comando**.
- Mostrar estado de conexión y errores, sin exponer contraseñas ni cookies.
- Mantener apagada la audiencia automática, de acuerdo con las decisiones anteriores.

**No se activan automáticamente Likes, Taps, Compartir, Seguir, Bits ni Regalos reales.** Sus reglas de recompensas de sesión (Fase 2) siguen pendientes de integración específica.

## Instalación

1. Instala [Node.js LTS](https://nodejs.org/) **20 o superior** en Windows.
2. Descarga o clona el repositorio y selecciona la rama `feature/tiktok-live-chat-mvp`.
3. Abre PowerShell en la carpeta del proyecto y ejecuta:

   ```powershell
   npm install
   npm start
   ```

4. Abre **http://127.0.0.1:4173/** en Chrome o Edge.
5. En **Herramientas de Prueba**, busca el panel **TikTok LIVE**. Introduce `!guerrero` y pulsa **Probar comando**. Debería aparecer `@arena_prueba` en el chat y crearse su personaje conforme a las reglas vigentes.
6. Inicia el LIVE de **@polkent.live** desde TikTok LIVE Studio; después pulsa **Conectar LIVE** en Arena Live. Solo aparece **LIVE conectado** cuando el cliente ha confirmado la conexión.
7. Desde **otra cuenta o dispositivo**, escribe un mensaje en el LIVE. Comprueba que aparece en Arena Live, que puede inscribir al espectador y que acepta comandos como `!guerrero` y `!kame` cuando corresponda a su clase.

Al desconectarse la transmisión, utiliza **Desconectar** y vuelve a conectar en una nueva sesión. Si falla, el panel muestra el motivo notificado por el proveedor.

> `npm install` requiere conexión a Internet. En esta etapa no se han verificado recepción ni latencia con el LIVE real de @polkent.live: esa comprobación debe hacerse con una emisión activa.

## Para OBS y TikTok LIVE Studio: estado y próximo objetivo

**Por ahora** la ventana de control contiene ambas vistas 16:9 y 9:16 dentro de una sola página y motor. Puedes capturar esa ventana como ensayo en OBS y utilizar OBS Virtual Camera donde LIVE Studio permita seleccionarla.

**No añadas dos fuentes Browser Source independientes apuntando directamente a `index.html`:** producirían dos copias distintas del motor, con participantes y combates desincronizados.

La siguiente etapa implementará un mecanismo de **salidas sincronizadas desde una sola simulación** para que OBS pueda recibir 1920×1080 horizontal y 1080×1920 vertical sin duplicar la partida. Después se verificará el rendimiento y se evaluará el empaquetado con Electron.

## Seguridad y limitaciones

- El servidor escucha **solo en 127.0.0.1**, no en la red local ni en Internet.
- No pide contraseña, sesión, cookies ni claves privadas de TikTok.
- La UI requiere acciones explícitas para iniciar la conexión. El servidor no se conecta al iniciar.
- Se transmite al juego **solo el chat de texto**; regalos e interacciones no se procesan.
- El conector `tiktok-live-connector` es **no oficial** y puede dejar de funcionar por cambios en TikTok. Ver [documentación del conector](https://ttlc.docs.isaackogan.com/).
- La biblioteca indica licencia **AGPL-3.0-only** / condiciones modificadas: revisar obligaciones y compatibilidad antes de distribuir comercialmente la aplicación.
- El chat de TikTok puede contener datos de usuarios; no se escriben logs persistentes de comentarios por el puente, pero Arena Live puede conservar perfiles locales para partidas posteriores.
- El primer navegador que abre la página es el **controlador** que recibe eventos. Si abres otras pestañas simultáneamente, solo una recibe los mensajes; cierra esa pestaña para transferir el control.
- El botón **Probar comando** está pensado para desarrollo y no se habilita cuando se configura `NODE_ENV=production`.

## Pruebas de desarrollo

```powershell
npm test
```

También se recomienda verificar en un navegador: `!jugar`, `!guerrero`, `!kame`, reingreso bloqueado al quedar dos finalistas, duplicados, mensaje HTML de un espectador, cierre del LIVE y reconexión manual.
