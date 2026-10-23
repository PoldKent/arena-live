import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const source = name => {
  const match = html.match(new RegExp(`        function ${name}\\([\\s\\S]*?\\n        }\\n`));
  assert.ok(match, name);
  return match[0];
};
const geometrySource = html.match(/        const ISOMETRIC_ARENA = Object\.freeze\([\s\S]*?\n        \}\);/)[0];
function engine() {
  const context = vm.createContext({
    WORLD_W:960, WORLD_H:540, playSound(){}, addActiveEffect(){},
    SPECTATOR_RECOVERY:{recoveryKnockbackFrames:3}
  });
  vm.runInContext([geometrySource, ...['getIsometricArenaPosition','performIsometricJump','updateIsometricFloor','isSpectatorLaunchRecoverable','tryIsometricSpectatorRecovery'].map(source),
    'globalThis.geometry = ISOMETRIC_ARENA;'].join('\n'), context);
  return context;
}
function fighter(geometry, angle=0, radial=0) {
  return {x:geometry.centerX+Math.cos(angle)*geometry.radiusX*radial,
    y:geometry.centerY+Math.sin(angle)*geometry.radiusY*radial-17.5*.85,
    radius:17.5,z:0,vz:0,vx:0,vy:0,fallDrop:0,ringOutTimer:0,onGround:true,
    jumpsLeft:2,maxJumps:2,doubleJumpCooldown:0,recoveryJumpUsed:false,
    extraRecoveryUsed:false,edgeRecoveryPending:false,knockbackTimer:0,eliminated:false,castingSkill:null};
}

test('one ellipse is about 7% larger per axis and its exact visible foot boundary supports every direction',()=>{
  const e=engine(),g=e.geometry;
  assert.ok(g.radiusX/(960*.44)>1.06&&g.radiusX/(960*.44)<1.08);
  assert.ok(g.radiusY/(540*.30)>1.06&&g.radiusY/(540*.30)<1.08);
  for(let i=0;i<72;i++)for(const radial of [.999999,1,1.000001]) {
    const f=fighter(g,i*Math.PI/36,radial);
    assert.equal(e.getIsometricArenaPosition(f).outside,radial>1,`direction ${i}, radius ${radial}`);
  }
});
test('grounded fighters remain supported and outside fighters sink and reach a finite fatal depth at all game paces',()=>{
  const e=engine(),g=e.geometry;
  for(const dt of [.75,1,1.25])for(let i=0;i<12;i++) {
    const inside=fighter(g,i*Math.PI/6,.999);
    for(let n=0;n<200;n++)assert.equal(e.updateIsometricFloor(inside,dt),false);
    assert.equal(inside.z,0);assert.equal(inside.onGround,true);assert.equal(inside.jumpsLeft,2);
    const outside=fighter(g,i*Math.PI/6,1.001);
    let fatal=false,ticks=0;
    while(!fatal&&ticks++<200)fatal=e.updateIsometricFloor(outside,dt);
    assert.equal(fatal,true);assert.ok(ticks*dt<40);assert.ok(outside.fallDrop>=g.deathDepth);
    assert.equal(outside.onGround,false);assert.equal(outside.jumpsLeft,1);
  }
});
test('walking back under the ellipse cannot create a landing or restore jump charges',()=>{
  const e=engine(),g=e.geometry,f=fighter(g,0,1.02);
  for(let n=0;n<8;n++)e.updateIsometricFloor(f,1);
  f.x=g.centerX;f.y=g.centerY-f.radius*.85;f.recoveryJumpUsed=true;
  assert.ok(f.z<0);assert.equal(e.updateIsometricFloor(f,1),false);
  assert.ok(f.z<0);assert.equal(f.onGround,false);assert.equal(f.jumpsLeft,1);assert.equal(f.recoveryJumpUsed,true);
  let fatal=false;for(let n=0;n<100&&!fatal;n++)fatal=e.updateIsometricFloor(f,1);
  assert.equal(fatal,true);
});
test('one timely rescue clears the plane and restores jumps only after a real landing from above',()=>{
  const e=engine(),g=e.geometry,f=fighter(g,0,1.02);
  for(let n=0;n<8;n++)e.updateIsometricFloor(f,1);
  const height=f.z;
  assert.equal(e.performIsometricJump(f,true),true);
  assert.equal(f.z,height,'a rescue does not teleport upward');assert.equal(f.jumpsLeft,0);
  assert.equal(e.performIsometricJump(f,true),false);
  let landed=false;
  for(let n=0;n<100;n++) {
    f.vx*=.84;f.vy*=.84;f.x+=f.vx;f.y+=f.vy;
    assert.equal(e.updateIsometricFloor(f,1),false);
    if(f.onGround){landed=true;break;}
  }
  assert.equal(landed,true);assert.equal(f.z,0);assert.equal(f.fallDrop,0);assert.equal(f.ringOutTimer,0);
  assert.equal(f.jumpsLeft,2);assert.equal(f.recoveryJumpUsed,false);
  assert.equal(f.doubleJumpCooldown,0);
});
test('a spent or too-late rescue is refused, and a successful jump can still fail when too far from the floor',()=>{
  const e=engine(),g=e.geometry;
  const spent=fighter(g,0,1.02);spent.jumpsLeft=0;assert.equal(e.performIsometricJump(spent,true),false);
  const late=fighter(g,0,1.02);late.z=-g.rescueDepth-1;late.fallDrop=-late.z;
  assert.equal(e.performIsometricJump(late,true),false);
  const far=fighter(g,0,1.6);assert.equal(e.performIsometricJump(far,true),true);
  let fatal=false;
  for(let n=0;n<200&&!fatal;n++){
    far.vx*=.84;far.vy*=.84;far.x+=far.vx;far.y+=far.vy;
    fatal=e.updateIsometricFloor(far,1);
  }
  assert.equal(fatal,true);assert.equal(e.performIsometricJump(far,true),false);
});
test('a falling AI can attempt one rescue even just beyond any side of the ellipse without outward momentum',()=>{
  const e=engine(),g=e.geometry;
  for(let i=0;i<36;i++) {
    const f=fighter(g,i*Math.PI/18,1.001);f.z=-2;f.fallDrop=2;f.vz=-.38;f.jumpsLeft=1;f.onGround=false;
    assert.equal(e.tryIsometricSpectatorRecovery(f),true,`direction ${i}`);
    assert.equal(f.recoveryJumpUsed,true);assert.equal(f.jumpsLeft,0);assert.ok(f.vz>0);
    assert.equal(e.tryIsometricSpectatorRecovery(f),false);
  }
});
test('normal jump and one aerial jump cannot become infinite mid-air jumps',()=>{
  const e=engine(),g=e.geometry,f=fighter(g);
  assert.equal(e.performIsometricJump(f),true);assert.equal(f.jumpsLeft,1);
  assert.equal(e.performIsometricJump(f),false,'input cooldown prevents a same-frame double jump');
  for(let i=0;i<10;i++)e.updateIsometricFloor(f,1);
  f.doubleJumpCooldown=0;assert.equal(e.performIsometricJump(f),true);assert.equal(f.jumpsLeft,0);
  f.doubleJumpCooldown=0;assert.equal(e.performIsometricJump(f),false);
});
test('a sinking cast is cancelled and no charge provides floor support',()=>{
  const e=engine(),g=e.geometry,f=fighter(g,0,1.02);f.castingSkill={timer:100};
  e.updateIsometricFloor(f,1);e.updateIsometricFloor(f,1);
  assert.equal(f.castingSkill,null);assert.ok(f.fallDrop>0);assert.equal(f.onGround,false);
});

function camera() {
  const saved=new Map();
  const e=vm.createContext({screenShake:14,isGamePaused:false,arenaScreenShake:25,
    ARENA_DEFAULT_SCREEN_SHAKE:25,ARENA_CAMERA_SETTINGS_KEY:'camera-test',
    performance:{now:()=>123},refreshArenaCameraSettings(){},
    localStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)??null}});
  vm.runInContext(['setArenaScreenShake','loadArenaCameraSettings','sampleArenaScreenShake'].map(source).join('\n'),e);
  return {e,saved};
}
test('camera intensity is bounded, persisted, reloadable at zero and recovers from malformed values',()=>{
  const {e,saved}=camera();
  for(const [input,expected] of [[0,0],['0',0],[35,35],[999,100],[-30,0],[null,25],[' ',25],[false,25],[{},25],[NaN,25]]) {
    e.setArenaScreenShake(input);assert.equal(e.arenaScreenShake,expected);
  }
  e.setArenaScreenShake(0);e.arenaScreenShake=25;e.loadArenaCameraSettings();assert.equal(e.arenaScreenShake,0);
  saved.set('camera-test','{broken');e.loadArenaCameraSettings();assert.equal(e.arenaScreenShake,25);
});
test('zero and pause fully disable camera motion; intensity changes never consume combat randomness',()=>{
  const {e}=camera();
  vm.runInContext('globalThis.randomCalls=0;Math.random=()=>{randomCalls++;return .5;}',e);
  e.setArenaScreenShake(25);const quarter=e.sampleArenaScreenShake(123);
  e.setArenaScreenShake(100);const full=e.sampleArenaScreenShake(123);
  assert.ok(Math.abs(quarter.x-full.x/4)<1e-12);assert.ok(Math.abs(quarter.y-full.y/4)<1e-12);
  e.setArenaScreenShake(0);assert.equal(e.sampleArenaScreenShake().x,0);assert.equal(e.sampleArenaScreenShake().y,0);
  e.setArenaScreenShake(100);e.isGamePaused=true;assert.equal(e.sampleArenaScreenShake().x,0);
  assert.equal(e.randomCalls,0);
});
