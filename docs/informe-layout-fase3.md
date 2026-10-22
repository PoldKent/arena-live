# Arena Live — Fase 3: Diseño, avisos y nomenclatura

**Archivo entregado:** `Arena_Live_layout_fase3.html` (HTML monolítico).

**Base:** `Arena_Live_gameplay_60_decisiones.html`. Esta revisión cambia presentación, distribución, clasificación de avisos y accesibilidad. No cambia daño, estadísticas, IA, comandos internos ni los efectos de los eventos sociales.

## Cambios aplicados

| Categoría | Implementación |
|---|---|
| Mensajes centrales | Las notificaciones rutinarias ya no ocupan el centro. Se reserva el banner nuevo de inicio (`GO!`), la escena de K.O. final y la victoria existentes. Los cambios de modo actualizan el HUD. |
| Historial lateral | `addKillFeed` separa K.O. de avisos rutinarios. Solo los K.O. generan tarjetas rojas sobre los monitores, máximo tres por pantalla y duración 2,7 segundos. Eventos similares muy próximos se agrupan. |
| Eventos sociales | Desactivadas las tarjetas sociales dentro de 9:16. Los detalles van al chat de eventos. Taps y Compartir muestran icono breve sobre el jugador; los apoyos tienen partículas. No se muestra tiempo restante en pantalla. |
| Habilidades | Los comandos especiales dejan de crear avisos K.O. o banners centrales. Se conserva el efecto visual, sonido y aura propios de cada clase. Los textos flotantes se convierten a iconos sin cifras. |
| Burbujas del chat | Siguen al luchador en 16:9 y 9:16. Duración variable entre 2,2 y 6,8 segundos. Varias personas pueden hablar simultáneamente: un mensaje nuevo solo reemplaza la burbuja previa del mismo jugador. |
| Vistas | Se mantienen los dos canvas, la proporción 16:9/9:16 y el orden vertical móvil. El chat queda como desplegable inmediatamente después de los monitores. |
| HUD | Mantiene modo, tiempo y número de jugadores; se ocultan contadores y leyendas redundantes. Hay regulador de opacidad del HUD (35–100 %) en Ajustes → Pantallas. |
| Barra superior | Botón **Unirse como Prota** prioritario. Clase en submenú Prota. Idioma, chat y pausa accesibles en móvil. Retirados los accesos duplicados de vistas y autoaudiencia de la barra. Pantallas se controlan en Ajustes; autoaudiencia en Herramientas de Prueba. |
| Herramientas de Prueba | Nombre público reemplaza “Simulador de Audiencia”. Orden: jugador, acceso a mensaje/comando, habilidades, interacciones y opciones. Botones agrupados en Interacción, Fidelidad, Compartir y Apoyos. Habilidades ordenadas Guerrero, Shinobi, Rayo, Espíritu, Titán. |
| Controles menores | “Limpiar Chat” pasa de la pantalla principal a Ajustes → Streamer. |
| Pausa | Conserva pestañas General y Streamer, con iconos y ayudas contextuales para reglas. Simplifica explicaciones secundarias sin quitar nombres accesibles de controles. |
| Idiomas | Se centralizaron las etiquetas nuevas de presentación para ocho idiomas en `PRESENTATION_UI_COPY`. Se conservan claves internas y comandos originales estables; los nombres públicos de botones de habilidad aparecen sin `!`. |

## Límites y decisiones que dependen de otra fase

1. **Regalo extraordinario de alto valor:** esta fase visual reserva el centro para avisos premium, pero el prototipo actual no recibe un valor normalizado ni un nivel de recompensa. Por ello **no muestra banners premium arbitrarios**. Se necesita implementar primero la clasificación de apoyos de la Fase 2, sin inventar importes ni umbrales.
2. **Ventajas de sesión, niveles de apoyo y cosméticos:** las 15 respuestas de Fase 2 se respetaron como decisiones recopiladas, pero **no se implementaron ni modificaron sus efectos en este cambio de layout**. El motor conserva los efectos que tenía la versión de 60 decisiones; para materializar las recompensas de sesión queda pendiente una actualización separada del gameplay.
3. **Traducciones heredadas:** se localizaron los rótulos nuevos, pero no se certificó editorialmente todo el texto heredado de los menús y mensajes extraordinarios de los ocho idiomas.
4. **Iconografía dependiente de Internet:** el HTML sigue incluyendo Tailwind, Font Awesome y Google Fonts como recursos externos, igual que su versión de partida. La prueba visual usó CSS compilado localmente para permitir inspeccionar el diseño cuando el navegador no pudo cargar CDN externos.
5. **Rediseño sin alterar el combate:** no se tocaron las reglas previas de daño, saltos, K.O., ritmo de IA ni los valores de Taps y regalos. Esto también significa que los nuevos conceptos de fidelidad/apoyo de Fase 2 todavía deberán sustituir las recompensas heredadas cuando se implemente esa fase.

## Validaciones

- **JavaScript:** compilación sintáctica de scripts inline: correcta.
- **HTML:** 191 identificadores comprobados, sin duplicados.
- **Regresión de gameplay:** 25/25 escenarios aprobados, sin excepciones JavaScript (cinco habilidades, escudos, IA de plataformas, doble salto, controles táctiles, alias multilingües, Taps).
- **Presentación móvil (390 px):** 31 comprobaciones positivas de controles, chat desplegable, prioridad de banners, historial K.O., idioma y configuración.
- **Presentación escritorio (1280 px):** 27 comprobaciones positivas.
- **Burbujas de dos jugadores:** dos en cada pantalla simultáneamente y actualización independiente, sin errores.
- **Inspección visual:** se obtuvieron capturas de navegador con CSS Tailwind local de prueba, conservando intacto el HTML entregado y su dependencia original.

**Resultado:** prototipo con Fase 3 de presentación operativa, preparado para seguir con la implementación explícita de las recompensas de Fase 2 cuando se determine el origen real de los eventos y el valor normalizado de cada apoyo.