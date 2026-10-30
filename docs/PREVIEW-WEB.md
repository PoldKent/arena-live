# Arena Live · Pre-release web de acceso público por enlace

**Estado de infraestructura (30/10/2026):** `main` incluye el generador estático, pruebas de distribución y flujo `.github/workflows/pages-preview.yml` para GitHub Pages. La publicación **solo queda confirmada** cuando GitHub Actions finaliza con éxito y la URL se abre sin autenticación.

## Un enlace para dos experiencias

- **Entrada:** `https://poldkent.github.io/arena-live/`.
- **Móviles:** redirección automática a `/mobile.html` (HTML autónomo sin conexión TikTok LIVE).
- **Escritorios:** redirección a `/desktop/` (interfaz y motor oficial de navegador; el puente TikTok LIVE y la integración OBS necesitan el servidor Node local).
- Para abrir manualmente una edición: `/?mode=mobile` y `/?mode=desktop`.

## Publicación gratuita recomendada: GitHub Actions

En GitHub Free, el repositorio `PoldKent/arena-live` debe ser **público** para utilizar Pages. Se ha autorizado ese cambio, por lo que **todo el código y su historial son públicos**, no solo la web.

1. Abre [GitHub → Settings → Pages](https://github.com/PoldKent/arena-live/settings/pages).
2. En **Build and deployment → Source**, selecciona **GitHub Actions**. No selecciones `Deploy from a branch` para este flujo.
3. En [Actions → Arena Live · Web prerelease](https://github.com/PoldKent/arena-live/actions/workflows/pages-preview.yml), elige **Run workflow** sobre `main` si no hay un despliegue exitoso. Los nuevos commits de `main` también lo activan.
4. Comprueba el resultado del trabajo **build** (genera `dist/arena-preview/` y ejecuta pruebas) y **deploy** (sube exclusivamente ese directorio como artefacto Pages).
5. Verifica la URL en una pestaña privada, primero en celular y después en ordenador.

El flujo usa `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4` y `actions/deploy-pages@v4`; permisos mínimos: lectura de contenido, escritura de Pages e ID token durante el despliegue.

**Las URL de Pages no son privadas ni protegidas por contraseña.** Los archivos HTML/JS publicados pueden descargarse e inspeccionarse; `noindex` y `robots.txt` solo intentan reducir indexación.

## Pruebas locales opcionales (Windows PowerShell)

```powershell
git switch main
git pull --ff-only origin main
npm.cmd ci
npm.cmd run test:preview
```

El resultado está en `dist/arena-preview/`. Si la exportación móvil excede el límite o alguna prueba falla, corrige la causa antes de publicar; no incrementes arbitrariamente el límite.

## Publicación manual de respaldo

También existe `npm.cmd run publish:preview -- --confirm-public`, que envía archivos generados a `gh-pages`. **Esta es una alternativa**, no la estrategia activa: requiere configurar **Settings → Pages → Deploy from a branch → gh-pages / (root)** y desactivar la fuente GitHub Actions, por lo que no se deben mezclar ambos métodos.

## Restricciones y retirada

- La vista web para PC no aloja un servidor de TikTok ni transmite directamente a OBS; para el flujo LIVE completo usa `npm.cmd start` en un PC.
- El empaquetador estático solo copia explícitamente el motor/interfaz web, HTML móvil y documentación mínima de la demo; no publica los archivos del servidor `bridge/` como parte del sitio Pages. **Sin embargo, al ser público el repositorio principal, cualquiera puede leer `bridge/` y todos los archivos versionados en GitHub.**
- No se permiten secretos de producción en código cliente. Realizar una auditoría de credenciales y del historial antes de considerar la distribución como segura.
- Para retirar la web: desactiva Pages desde Settings → Pages y cancela el despliegue automatizado. Para volver a ocultar el código, configura el repositorio como privado; los forks o copias ya realizadas no pueden recuperarse.
