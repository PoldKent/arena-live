# Arena Live v0.19 · KO y doble salto

El KO decisivo usa tipografía enorme, centrada y sin recuadro en 16:9 y 9:16, con la misma jerarquía visual de GO!. En modo por tiempo se presenta FIN! en lugar de atribuir un KO. El podio y los datos del ganador permanecen.

Las cinco clases siguen teniendo dos saltos totales por aterrizaje. La IA de Smash y Duelo intenta el segundo salto más cerca del borde, priorizando la cúspide salvo expulsiones lejanas. La arena isométrica permite recuperar lanzamientos ascendentes que se hayan separado del borde. No se recupera un tercer salto ni se teletransporta al guerrero.

El rozamiento horizontal es menor durante la expulsión, de modo que el movimiento lateral persiste sobre el abismo; la recuperación usa mayor impulso de retorno. No se modifican daño, energía, clases, controles ni capacidad de 128.

Desaparecen los dos indicadores celestes dibujados sobre cada luchador, ahorrando dibujo por fotograma en Smash y Duelo. Pruebas: `test/broadcast-presentation.test.mjs`, `test/isometric-floor.test.mjs` y `test/spectator-recovery.test.mjs`. Para evaluar FPS reales en 128 personajes se requiere probar con el OBS/equipo de emisión.
