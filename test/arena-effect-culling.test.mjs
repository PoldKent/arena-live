import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root={};
const source=await readFile(new URL('../engine/arena-render.js',import.meta.url),'utf8');
runInNewContext(source,{globalThis:root,Math,Array,Object,Set,Map});
const visible=root.ArenaRender.effectVisible;
const camera={left:200,right:740,top:0,bottom:960};
test('off-camera circles and quakes are culled without affecting their simulation',()=>{
 assert.equal(visible({type:'rasengan',x:300,y:400},camera),true);
 assert.equal(visible({type:'rasengan',x:-120,y:400},camera),false);
 assert.equal(visible({type:'titanQuake',x:-100,y:400},camera),false);
 assert.equal(visible({type:'titanQuake',x:20,y:400},camera),true);
 assert.equal(visible({type:'doubleJump',x:300,y:1100},camera),false);
});
test('beams crossing the viewport are never culled just because the caster is offscreen',()=>{
 assert.equal(visible({type:'kamehameha',x:-500,y:350,dir:1},camera),true);
 assert.equal(visible({type:'kamehameha',x:1200,y:350,dir:-1},camera),true);
 assert.equal(visible({type:'kamehameha',x:-500,y:350,dir:-1},camera),false);
 assert.equal(visible({type:'kamehameha',x:300,y:2000,dir:1},camera),false);
});
test('lightning and KO pillars may reach the screen from above or below',()=>{
 assert.equal(visible({type:'lightning',x:310,y:2000},camera),true);
 assert.equal(visible({type:'lightning',x:-200,y:2000},camera),false);
 assert.equal(visible({type:'ringOutPillar',x:300,y:1000},camera),true);
 assert.equal(visible({type:'ringOutPillar',x:300,y:-300},camera),false);
 assert.equal(visible({type:'futureEffect',x:-9000,y:-9000},camera),true);
});
