import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const engine=await read('engine/arena-game.js');
const runtime=await read('portable/mobile-runtime.js');
const touch=await read('portable/mobile-touch.js');
function mobileArray(name){
  const match=runtime.match(new RegExp('const '+name+'=Object\\.freeze\\((\\[[^\\n]+\\])\\);'));
  assert.ok(match,'Missing translations: '+name);return JSON.parse(match[1]);
}
test('mobile labels have all eight translations with no duplicate or blank keys',()=>{
  assert.deepEqual(mobileArray('ARENA_MOBILE_LANGUAGE_CODES'),['es','en','fr','de','zh','ja','pt','it']);
  const rows=mobileArray('ARENA_MOBILE_TRANSLATIONS'),keys=new Set();
  for(const row of rows){
    assert.equal(row.length,8,'Missing locale for '+row[0]);
    assert.ok(row.every(value=>typeof value==='string'&&value.trim()),'Empty localization for '+row[0]);
    assert.ok(!keys.has(row[0]),'Duplicate label: '+row[0]);keys.add(row[0]);
  }
  for(const label of ['Modo jugador','Modo Streamer','🎮 Modo jugador','🎛 Modo Streamer',
   'Cambiar a Modo Streamer','Cambiar a Modo jugador','Pausar combate','Continuar combate',
   'Cerrar menú','Salir de pantalla completa','Abrir opciones del Modo Streamer',
   'Minimizar panel','Expandir panel','Cerrar pruebas','Jugador y comandos',
   'Participantes y K.O.','Saltar','Golpe básico','Poder especial','Guardar posiciones',
   '▶ Iniciar partida','No mostrar de nuevo'])assert.ok(keys.has(label),label);
});
test('Italian UI includes target, class and audio labels',()=>{
  assert.match(engine,/it: \{ join: 'Entra come Prota'[\s\S]*?playerTarget: '🎯 Giocatore bersaglio' \}/);
  assert.match(engine,/const ARENA_SETTINGS_STATE_COPY=Object\.freeze/);
});
test('mobile language changes update text and accessibility labels',()=>{
  assert.match(engine,/typeof arenaMobileLocalizeAll==='function'\)arenaMobileLocalizeAll\(\)/);
  assert.match(runtime,/function arenaMobileLocalizeAll\(\)/);
  assert.match(runtime,/\['title','aria-label','aria-description','placeholder'\]/);
  assert.match(touch,/queueMicrotask\(/);
});
