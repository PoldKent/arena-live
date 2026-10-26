# Arena Live v0.16 · Identificación de la entrega terminada

La entrega vigente en `main` es **0.16.0**, visible como **Arena Live v0.16 · TikTok** en el pie de Ajustes y en el título del navegador.

La etiqueta 0.15 se utilizó durante el desarrollo y también al publicar las seis correcciones. Eso permitía que una copia anterior y la entrega terminada mostraran el mismo número. La numeración 0.16 distingue ahora la entrega terminada.

Las correcciones están en el commit [`1976160`](https://github.com/PoldKent/arena-live/commit/1976160894eb07cfa92da394011d96a0200deb86); la compatibilidad de las pruebas con CRLF de Windows está en [`6ae39a4`](https://github.com/PoldKent/arena-live/commit/6ae39a4441e30ec471608314cae05094c74849ca). Esta entrega conserva esas correcciones y su equilibrio.

Paquete, shrinkwrap, API, arranque del servidor, título y pie de Ajustes comparten la versión. La revisión de recursos también se actualiza. Las comprobaciones de navegador verifican el título y el pie después de cambiar de idioma.

Los [detalles de las seis áreas](RELEASE-0.15-CORRECCIONES.md), los datos de equilibrio y los informes de carga v0.15 permanecen como evidencia histórica de las mediciones realizadas, sin renombrarlos como si fueran nuevas simulaciones.

Para actualizar, detén el servidor con Ctrl+C, conserva tus cambios locales y ejecuta desde la carpeta del proyecto:

```powershell
& {
    git switch main
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo seleccionar main.' }
    git pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw 'Actualización detenida; conserva tus cambios locales.' }
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación.' }
    npm.cmd start
}
```

Recarga con Ctrl+F5 y comprueba **v0.16** en el pie de Ajustes. `git log -1 --format="%h %s"` identifica además el commit exacto de tu copia.
