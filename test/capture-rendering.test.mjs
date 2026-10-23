import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=name=>{
  const match=html.match(new RegExp(`        function ${name}\\([\\s\\S]*?\\n        }\\n`));
  assert.ok(match,name);return match[0];
};
const engine=()=>{
  const e=vm.createContext({WORLD_W:960,WORLD_H:540,activeEffects:[],fighters:[]});
  vm.runInContext(['getArenaViewportBounds','drawSpecialEffectsOnCtx'].map(source).join('\n'),e);return e;
};
const recorder=()=>{
  const paths=[],rects=[];
  return {paths,rects,save(){},restore(){},beginPath(){},stroke(){},
    moveTo(x,y){paths.push(['move',x,y]);},lineTo(x,y){paths.push(['line',x,y]);},
    fillRect(...args){rects.push(args);},createLinearGradient(){return {addColorStop(){}};}};
};
test('both capture backing stores are Full HD, with logical simulation dimensions retained',()=>{
  assert.match(html, /id="canvas16x9" width="1920" height="1080"/);
  assert.match(html, /id="canvas9x16" width="1080" height="1920"/);
  assert.match(html, /const WORLD_W = 960;/);assert.match(html, /const WORLD_H = 540;/);
});
test('camera inverse bounds put every logical edge at its correct world coordinate',()=>{
  const e=engine();
  for(const [width,height] of [[960,540],[540,960]])for(const zoom of [.64,1,1.32])for(const shake of [{x:0,y:0},{x:3,y:-2}]){
    const b=e.getArenaViewportBounds(width,height,480,302.4,zoom,shake);
    const x=wx=>(wx-480)*zoom+width*.5+shake.x;
    const y=wy=>(wy-302.4)*zoom+height*.56+shake.y;
    for(const [actual,expected] of [[x(b.left),0],[x(b.right),width],[y(b.top),0],[y(b.bottom),height]])assert.ok(Math.abs(actual-expected)<1e-9);
  }
});
test('lightning reaches the portrait top and its hit point without consuming combat randomness',()=>{
  const e=engine(),ctx=recorder();vm.runInContext('globalThis.randomCalls=0;Math.random=()=>{randomCalls++;return .5;}',e);
  const b=e.getArenaViewportBounds(540,960,480,302.4,.64);
  e.activeEffects=[{type:'lightning',x:480,y:300,timer:28,maxTimer:28}];e.drawSpecialEffectsOnCtx(ctx,b);
  assert.ok(ctx.paths[0][2]<b.top);assert.deepEqual(ctx.paths.at(-1),['line',480,300]);
  assert.ok(ctx.paths.length<80,'visible segments stay bounded');assert.equal(e.randomCalls,0);
});
test('beam endpoints and KO pillars reach viewport edges at different zooms and camera positions',()=>{
  const e=engine();
  for(const zoom of [.64,1,1.32]){
    const b=e.getArenaViewportBounds(540,960,600,320,zoom);
    for(const dir of [-1,1]){
      const ctx=recorder();e.activeEffects=[{type:'kamehameha',x:480,y:300,dir,timer:36,maxTimer:36}];e.drawSpecialEffectsOnCtx(ctx,b);
      const end=ctx.paths.at(-1)[1];assert.ok(dir===1?end>b.right:end<b.left);
    }
    const ctx=recorder();e.activeEffects=[{type:'ringOutPillar',x:480,y:300,color:'#f43f5e',timer:32,maxTimer:32}];e.drawSpecialEffectsOnCtx(ctx,b);
    assert.ok(ctx.rects[0][1]<b.top);assert.equal(ctx.rects[0][1]+ctx.rects[0][3],300);
  }
});
