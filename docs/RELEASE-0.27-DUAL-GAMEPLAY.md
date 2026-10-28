# Arena Live v0.27 — Stream y Mobile en paralelo

Esta edición conserva **un motor de combate compartido** para escritorio y HTML móvil autónomo.

## Operación y ajustes

- Abrir y cerrar Ajustes deja intacta la pausa manual. El combate puede seguir durante los cambios.
- La vista de preparación dual (16:9 + 9:16 simultáneos) no inicia pantalla completa; el Modo Stream es un botón de acceso rápido aparte.
- Velocidad de pelea (0.75x, 1x, 1.25x) pasa a Partida, separada del control manual/IA de Prota.
- Origen de ataques especiales es independiente de coste de energía y recarga: IA y comandos / solo comandos / desactivados. Ambos clientes comparten la misma regla.
- Siete pestañas: Partida, Combate y Prota, Equilibrio de clases, Audiencia, Pantallas, Audio, Sistema. Se mueven controles existentes; no se clonan handlers.

## Móvil

- Se genera desde el mismo motor mediante `npm run build:mobile`, en un solo HTML sin dependencias de red.
- Conserva controles táctiles, pruebas de poderes, clases, escenarios y simulaciones locales.
- Oculta controles TikTok LIVE, puente social, OBS, Stream y vista dual de emisión. La vista de juego móvil permite elegir orientación y ajuste gráfico.
- El selector de nueva partida conserva al cerrarse el estado previo de pausa.

## Validación

`npm test`, `npm run test:browser`, `npm run test:mobile`, `npm run build:mobile` y pruebas con hasta 128 luchadores. El CI no confirma rendimiento de un teléfono real ni conexión TikTok LIVE.
