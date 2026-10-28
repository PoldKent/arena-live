# Arena Live Mobile v0.31 · Controles y pruebas sin recuadro

## Gameplay táctil

- **Arena:** mantener el dedo lleva a Prota en la dirección tocada; arrastrar actualiza la dirección. Tocar y soltar el escenario **nunca salta**.
- **Salto:** un toque sobre el círculo **↑** activa el primer salto; dos toques rápidos sobre **↑** solicitan el doble salto, respetando la recarga y la física del personaje. Así moverse no provoca saltos por accidente.
- **Golpe:** deslizar rápido en el escenario; el botón circular **⚔** también ejecuta el golpe.
- **Poder:** mantener pulsado sin deslizar o usar el círculo **⚡**.
- Cada botón **↑, ⚔, ⚡, ☰** es independiente y movible desde **Ajustes → Sistema → Controles táctiles → Acomodar botones**. El tamaño se ajusta entre 56 y 94 píxeles y las posiciones se guardan localmente. «Restablecer posiciones» devuelve la distribución original.
- **⏸ Pausa** sigue separado y fijo en la esquina superior izquierda, también en Director.

## Modo Director

Las pruebas se distribuyen en el espacio libre del escenario, sin fondo ni borde alrededor de toda la ventana. Encabezado y selector compacto arriba, jugador/objetivo en una tarjeta pequeña y habilidades en una cuadrícula independiente inferior. No se duplican botones: se reutilizan los controles reales de «Jugador, poderes y comandos». Los demás grupos aparecen en paneles pequeños y desplazables.

## Menú

«Partida» contiene Lobby, Nueva partida y Revancha en una sección plegable. Se retiraron los accesos de Chat, Vista y salir de pantalla completa del menú móvil. El control de pantalla completa permanece como icono pequeño sobre la arena. La transparencia de menús y botones usa el mismo control único de opacidad del HUD (movido a la sección de controles táctiles).

## Pruebas

Comprobar con Android: clic/doble clic en ↑ sin salto al mover; posición de botones después de rotación; tamaños 56/94 px; pulsación larga; panel con 2/32/128 jugadores; menú plegable; opacidad 35/100 %; pausa en lobby y combate; pantalla completa. GitHub Actions puede fallar sin asignar corredores; eso no equivale a una prueba funcional completada.
