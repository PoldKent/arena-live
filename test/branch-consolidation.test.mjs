import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const [html,css,runtime,touch,builder,server]=await Promise.all([
  'index.html','portable/mobile.css','portable/mobile-runtime.js',
  'portable/mobile-touch.js','tools/build-mobile.mjs','bridge/server.mjs'
].map(read));

test('desktop markup has unique IDs and loads the six canonical engine scripts once',()=>{
  const ids=[...html.matchAll(/<[a-z][^>]*?\bid="([^"]+)"/gi)].map(m=>m[1]);
  assert.ok(ids.length>300,'Expected the complete Arena Live application');
  assert.equal(new Set(ids).size,ids.length,'Duplicate DOM ID in PC/OBS markup');
  for(const name of ['core','render','audio','settings','balance-evidence','game']){
    const src='engine/arena-'+name+'.js?v=0.40';
    assert.equal(html.split('src="'+src+'"').length-1,1,'Duplicated/missing engine module '+name);
  }
});

test('offline mobile exports the canonical engine and adapters, never a second game',()=>{
  for(const name of ['core','render','audio','settings','balance-evidence','game']){
    const file='engine/arena-'+name+'.js';
    assert.equal(builder.split('data-bundled-source="'+file+'"').length-1,
      name==='game'?1:0,'Unexpected bundled-source template for '+file);
  }
  assert.match(builder,/files\.get\('engine\/arena-game\.js'\)/);
  assert.match(builder,/files\.get\('portable\/mobile-runtime\.js'\)/);
  assert.match(builder,/files\.get\('portable\/mobile-touch\.js'\)/);
  assert.match(server,/pathname\s*===\s*'\/mobile'/);
  assert.doesNotMatch(runtime,/function applyDamage\(/);
  assert.doesNotMatch(touch,/function applyDamage\(/);
});

test('mobile Streamer moves existing skill buttons and controls without cloning them',()=>{
  assert.match(touch,/document\.querySelector\('#arenaPanelPowers \.arena-skill-buttons'\)/);
  assert.match(touch,/dock\.appendChild\(source\)/);
  assert.match(touch,/arenaMobileKeepStreamerSkillsVisible/);
  assert.match(runtime,/menu\.appendChild\(prota\)/);
  assert.match(runtime,/\['arenaMobileActionLayer','touchControlDock','arenaStreamerSkillsDock'\]/);
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/#arenaMobileControlShelf/);
  assert.match(css,/#arenaMobileGestureGuide/);
  assert.match(css,/@media\(min-width:420px\)/);
});

test('only one Streamer test drawer is created, with one selectable panel',()=>{
  assert.equal(touch.split("drawer.id='arenaPortableTestDrawer'").length-1,1);
  assert.equal(touch.split("document.createElement('aside')").length-1>=1,true);
  assert.match(touch,/mount\.appendChild\(panel\)/);
  assert.match(touch,/arenaMobilePositionTestDrawer/);
});
