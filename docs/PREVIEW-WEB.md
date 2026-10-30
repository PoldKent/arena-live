# Arena Live · Pre-release web para compartir con un enlace

**Estado:** infraestructura preparada en `main`. La URL pública **no estará activa** hasta que publiques los archivos y habilites Pages. Es una **versión web de prueba**; no equivale a un GitHub Release público ni a la aplicación PC con servidor.

## Qué verá cada visitante

- `https://poldkent.github.io/arena-live/` detecta el dispositivo y redirige a `mobile.html` en teléfonos o `desktop/` en ordenadores.
- En `/?mode=mobile` y `/?mode=desktop` se puede forzar la versión, sin perder la detección automática del enlace base.
- **Móvil:** HTML offline con el mismo motor de combate y perfiles jugador/streamer, sin conexión TikTok LIVE.
- **Escritorio:** interfaz del cliente oficial y motor de simulación para navegador. La integración TikTok LIVE, el puente Node y las capturas OBS operativas necesitan ejecutar la aplicación local con `npm.cmd start`. Una página de GitHub Pages **no sustituye ese servidor**.

## Requisitos y publicación desde el repositorio privado

GitHub Pages con repositorios privados requiere **GitHub Pro, Team o Enterprise**. Si tu cuenta GitHub es Free, utiliza la alternativa de repositorio público de distribución descrita más abajo. Tu plan de ChatGPT no determina tu plan de GitHub.

En PowerShell, desde la copia local, con Git/Node instalados:

```powershell
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd run test:preview
```

`test:preview` genera y comprueba la salida `dist/arena-preview/`. Revisa los archivos antes de publicarlos. Si la compilación móvil falla por tamaño o una prueba falla, **no publiques**. Para enviar exclusivamente los archivos generados, ejecuta:

```powershell
npm.cmd run publish:preview -- --confirm-public
```

El publicador crea/actualiza una rama **`gh-pages` destinada exclusivamente al sitio** mediante un directorio Git temporal, sin tocar tus archivos de trabajo ni forzar los commits de `main`. Solo envía el HTML móvil empaquetado, la interfaz/recursos web de escritorio, el selector de dispositivo y metadatos mínimos. Necesitarás credenciales GitHub y autoría Git configurada.

Después, en [Settings → Pages](https://github.com/PoldKent/arena-live/settings/pages), configura:

1. **Source:** Deploy from a branch.
2. **Branch:** `gh-pages`.
3. **Folder:** `/(root)`.
4. **Save**. Cuando GitHub confirme la publicación, visita `https://poldkent.github.io/arena-live/` desde PC y móvil.

El archivo `.nojekyll` evita la compilación Jekyll. GitHub Pages sigue teniendo un flujo interno de despliegue; comprueba el resultado en Settings → Pages y Actions. Históricamente el CI de este proyecto ha estado limitado por el presupuesto de GitHub Actions, por lo que la publicación **no se debe considerar exitosa hasta probar la URL anónimamente**.

## Alternativa gratuita si GitHub Free no permite Pages desde un repositorio privado

Crea manualmente un repositorio público **vacío** llamado, por ejemplo, `arena-live-preview`. Mantén `arena-live` privado. Tras ejecutar `npm.cmd run test:preview`, publica el paquete generado en ese repositorio:

```powershell
npm.cmd run publish:preview -- --confirm-public --remote=https://github.com/PoldKent/arena-live-preview.git
```

Configura GitHub Pages de ese repositorio desde `gh-pages` y `/(root)`. El enlace será `https://poldkent.github.io/arena-live-preview/`.

**La alternativa pública expone el paquete web, no la historia ni los archivos del servidor del repositorio privado.** Los JS y HTML entregados al navegador son legibles por terceros en cualquiera de las opciones.

## Privacidad, limitaciones y reversión

- «Semipúblico» significa **acceso público por enlace**: no es un enlace secreto, no requiere cuenta ni es una autenticación. Los metadatos `noindex` y `robots.txt` son solicitudes voluntarias a buscadores, **no** control de acceso.
- No incrustes claves, tokens de TikTok, credenciales ni lógica privada en el paquete web. El navegador puede inspeccionar y guardar todo el código servido.
- El script no publica el servidor `bridge/`, los documentos internos, los archivos del repositorio, ni los datos de Git.
- No hagas público el repositorio `arena-live`; no uses su `main` como fuente de Pages.
- Para retirar el acceso, desactiva Pages en Settings → Pages (y elimina o invalida `gh-pages` si quieres quitar el artefacto publicado). Las copias que otros hayan descargado no pueden revocarse.
- Si quieres registrar además el hito como **GitHub Pre-release**, crea un release marcado como pre-release en el repositorio privado. Esa página seguirá requiriendo acceso GitHub, por lo que **el enlace para visitantes debe ser Pages**, no la URL del Release.
