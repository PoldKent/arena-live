# Arena Live v0.26 — Puesto de mando y auditoría TikTok LIVE

Fecha: 28 de octubre de 2026. Alcance: interfaz de operación y puente local de TikTok LIVE de Arena Live.

## Mapa del puesto de mando

- **Barra de arriba:** conexión TikTok, Prota/clase, Pausa, Ajustes, Pruebas, Chat; Lobby, Revancha, Stream, Vista y Pantalla permanecen accesibles. Las capturas 16:9 y 9:16 no contienen botones del operador.
- **Ajustes:** cinco pestañas: Partida (vidas, tiempo, cuenta regresiva); Combate (ritmo, Prota, cupo, clase, poderes, HP, daño, energía y equilibrio); Pantallas (formatos OBS, offsets, audio e idioma); Audiencia (boosts, chat, efectos); Espacio (distribución).
- **Buscar:** filtra las secciones existentes según textos, IDs y títulos; jamás clona los elementos, por lo que siguen funcionando sus handlers y guardado.
- **Persistencia:** pestaña de Ajustes y modalidad Por vidas/Por tiempo/Entrada libre se recuerdan mediante localStorage. Se conserva la distribución de paneles y las calibraciones OBS existentes. Las reglas no se mezclan.
- **Centro de pruebas:** nav agrupado en Poderes, Interacciones, Entradas/K.O., Escenarios, Simulación y TikTok. Solo abre el grupo elegido; el chat se controla por separado.
- **Pantalla de combate:** el editor de Ajustes ocupa un carril lateral en escritorio (o la columna del operador en Stream), reservando ancho para el juego. Los lienzos nativos Full HD y la física no se alteran.

## Auditoría del puente TikTok LIVE

La librería **tiktok-live-connector 2.5.x** es no oficial. Un evento anunciado en su catálogo no garantiza que una transmisión real lo produzca; verificar en LIVE real.

| Evento del conector | Ruta en v0.26 | Resultado |
| --- | --- | --- |
| `chat` | Recibido, normalizado, límite anti-spam | Chat visible, comandos y burbuja solo para mensajes normales del dueño |
| `like` | Delta por usuario → `taps`, agrupado ≤800 ms | Alta/reingreso por tap cuando la modalidad lo permita; boosts al luchador vivo |
| `share` | Usuario validado, deduplicación | Curación hasta 30 % HP máximo y reducción temporal de daño |
| `follow` | Usuario validado, deduplicación | Energía y regeneración durante 10 s para su luchador |
| `gift` | Usuario validado, regalo final de racha, deduplicación | Berserk para su luchador; los `gift` de racha intermedios no lo repiten |
| `subscribe` | Usuario validado, deduplicación | Escudo para su luchador |
| `roomUser` | Conteo validado | Estadística de audiencia LIVE; no confundir con ventanas locales conectadas |
| `member` | Nombre validado | Contador de entradas a la sala; **no** crea personaje sin tap |
| `social` | No se aplica como boost adicional | Evita aplicar dos veces `follow` o `share` derivados del mismo hecho |
| `emote`, `questionNew`, `superFan`, `linkMicBattle`, `envelope` y otros | Sin poder asignado | Pendientes de definir su efecto de producto; no generar daño ni ventajas por intuición |
| `streamEnd` | No tiene una acción específica de resultado | El cierre/desconexión se gestiona por estado de la sesión; la lucha no debe terminar por una señal ambigua |
| Bits, donaciones, Super Chat, Stars/Estrellas | Solo simulador | Conceptos de otras plataformas: no atribuirlos a TikTok ni falsificar eventos |

## Cómo diagnosticar

1. Abrir `http://127.0.0.1:4173`, panel `🧪 Centro de pruebas → 📡 TikTok LIVE` y pulsar **Conectar**.
2. Confirmar una sola ventana controladora activa. Otra ventana únicamente visualiza estados; no debe duplicar apoyos.
3. Verificar el contador de mensajes, taps, compartidos, seguidores, regalos, suscripciones, espectadores LIVE y entradas a sala.
4. Con un luchador participante, probar `/api/test-like`, `/api/test-share` y `/api/test-social` mediante los botones del panel. Las pruebas no acreditan el éxito de un LIVE real.
5. Probar un LIVE real y confirmar autor y tipo de evento: los regalos en racha tienen que aparecer **una sola vez al finalizar**, mientras que los taps se suman por ráfagas.
6. El modo **Por vidas** impide reingreso tras agotar oportunidades; **Por tiempo** cierra a 00:00; **Entrada libre** permite reingresar hasta la decisión definitiva.

## Cobertura de pruebas

- `npm test`: normalización, seguimiento de eventos por conexión y deduplicación.
- `npm run test:browser`: categorías de Ajustes, acceso al juego, escenarios, interacción real simulada y layout OBS.
- `npm run test:mobile`: interacción táctil y archivo independiente.
- `npm run test:performance`: física y capturas Full HD con 32, 64, 128 participantes.

**Fuentes técnicas externas:** documentación del conector no oficial: https://github.com/zerodytrash/TikTok-Live-Connector y https://www.npmjs.com/package/tiktok-live-connector.
