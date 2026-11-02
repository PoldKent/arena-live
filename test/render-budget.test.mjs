import test from 'node:test';
import assert from 'node:assert/strict';
import '../engine/arena-render.js';
const r=globalThis.ArenaRender;
test('visual budgets preserve all simulation particles and retain exact color/opacity for drawn samples',()=>{const particles=Array.from({length:1800},(_,i)=>({x:i%900,y:20,color:'#00ff00',size:3,life:25,maxLife:50})),before=structuredClone(particles);const counts=[];for(const quality of ['high','balanced','performance']){let count=0;const ctx={beginPath(){},arc(){},fill(){assert.equal(this.fillStyle,'#00ff00');assert.equal(this.globalAlpha,.5);count++;}};r.drawParticles(ctx,particles,{left:0,right:960,top:0,bottom:540},quality);counts.push(count);assert.equal(ctx.globalAlpha,1);}assert.deepEqual(counts,[1800,900,300]);assert.deepEqual(particles,before);});
test('culling includes intersecting edges and rejects objects wholly outside the camera',()=>{const b={left:100,right:200,top:0,bottom:300};assert.equal(r.intersects(b,95,100,5),true);assert.equal(r.intersects(b,94.9,100,5),false);assert.equal(r.intersects(b,150,-5,5),true);assert.equal(r.intersects(b,150,306,5),false);});
test('diagnostics keep a bounded sample window and report measured frame percentiles',()=>{const d=r.createDiagnostics(4);for(let i=1;i<=6;i++)d.record(i*10,i,i*2);const s=d.snapshot();assert.equal(s.samples,4);assert.equal(s.frame.p50Ms,50);assert.equal(s.frame.p95Ms,60);assert.equal(s.frame.p99Ms,60);assert.equal(s.simulation.meanMs,4.5);assert.equal(s.drawing.meanMs,9);assert.ok(Math.abs(s.fps-1000/45)<.00001);});

test('static viewport layers are reused and invalidated by scene or native resolution, independently per context',()=>{
 const cache=new WeakMap();let layers=0,paints=0;
 const document={createElement(){layers++;return {getContext(type,options){assert.equal(type,'2d');assert.equal(options.alpha,false);return {setTransform(){}};}};}};
 const makeContext=()=>({canvas:{width:1920,height:1080,ownerDocument:document},drawImage(layer,x,y,w,h){assert.ok(layer.width>0);assert.deepEqual([x,y,w,h],[0,0,960,540]);}});
 const first=makeContext(),second=makeContext(),paint=()=>paints++;
 const a=r.paintCachedViewport(cache,first,960,540,'arena',paint);
 assert.equal(r.paintCachedViewport(cache,first,960,540,'arena',paint),a);
 assert.equal(paints,1);
 r.paintCachedViewport(cache,second,960,540,'arena',paint);assert.equal(paints,2);
 assert.equal(cache.get(first),a);
 r.paintCachedViewport(cache,first,960,540,'lobby',paint);assert.equal(paints,3);
 first.canvas.width=1280;first.canvas.height=720;
 const resized=r.paintCachedViewport(cache,first,960,540,'lobby',paint);
 assert.equal(paints,4);assert.equal(layers,4);
 assert.deepEqual([resized.layer.width,resized.layer.height],[1280,720]);
});

test('extracted effect painter follows the indexed moving actor without mutating effects or actor state',()=>{
 const actor={id:'ninja',x:400,y:300,z:30,fallDrop:4,facing:-1};
 const effect={type:'rasengan',fighterId:'ninja',x:0,y:0,timer:15,maxTimer:30};
 const before=JSON.stringify({actor,effect}),arcs=[];
 const ctx={save(){},restore(){},beginPath(){},stroke(){},arc(x,y){arcs.push([x,y]);}};
 r.drawSpecialEffects(ctx,[effect],{left:200,right:600,top:100,bottom:500},123,new Map([[actor.id,actor]]),[]);
 assert.deepEqual(arcs,[[380,274],[380,274],[380,274]]);
 assert.equal(JSON.stringify({actor,effect}),before);
});
