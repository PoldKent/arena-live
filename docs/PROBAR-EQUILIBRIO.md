# Probar el equilibrio jugando

La rama `preview/class-balance-v05` contiene un inicio optativo del candidato. Abre el juego completo con su reloj, animación, azar, controles, chat y puente normales. No carga el adaptador de las simulaciones.

## Descargar una copia de prueba desde PowerShell

En otra ventana de PowerShell, desde tu repositorio actual:

```powershell
& {
    Set-Location 'P:\Arena_Live_GitHub' -ErrorAction Stop
    git fetch origin
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar la rama de prueba.' }
    git worktree add '..\Arena_Live_Equilibrio' origin/preview/class-balance-v05
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la copia de prueba. Revisa si esa carpeta ya existe.' }
    Set-Location '..\Arena_Live_Equilibrio' -ErrorAction Stop
    npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
    npm.cmd run start:balance
}
```

Abre **http://127.0.0.1:4174**. En Ajustes verás **v0.5 · equilibrio (prueba)**; la API del juego indica `0.5.0-balance-preview`. El servidor también indica `balancePreview: true` en `/api/status`.

El puerto 4174 tiene sus propias preferencias del navegador. Tu instalación habitual puede seguir abierta en el 4173 con su distribución y calibración. No hay dependencias nuevas ni hace falta instalar Playwright para jugar.

## Qué probar

En Herramientas, abre Escenarios, selecciona un escenario y pulsa Cargar. Luego inicia la partida:

| Escenario | Prueba |
|---|---|
| 2 | Duelo y poderes individuales |
| 4 | Smash, expulsiones y ataques de área |
| 9 | Arena y transición a Smash |
| 128 | Rendimiento, ataques masivos y transición hasta el duelo final |

Mantén las reglas de combate en sus valores predeterminados, todas las clases y poderes permitidos para comparar con el estudio. Usa Revancha para repetir. Luego prueba entrar como Prota y las herramientas sociales.

El candidato comparte selección de rivales cercanos, ajusta daño/carga por modo, limita Kame y Coloso a tres objetivos en Arena y Trueno a dos en Smash. La tabla está en `docs/balance-candidate-v0.5.json`.

## Volver y comparar

Detén la prueba con Ctrl+C. La copia habitual se inicia con `npm.cmd start` y abre http://127.0.0.1:4173. También puedes usar `npm.cmd start` dentro de esta copia: ese comando sirve los valores publicados originales. El archivo `index.html` se conserva; el candidato se prepara en memoria solo cuando usas `start:balance`.

La rama de prueba no se ha fusionado a `main`. Los porcentajes de las simulaciones son una referencia; esta prueba permite valorar el control manual, las ayudas y la fluidez real de tu equipo.
