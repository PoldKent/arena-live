import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

class NodeStub {
  constructor() {
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.value = '!jugar';
    this.handlers = new Map();
  }
  setAttribute() {}
  addEventListener(type, fn) { this.handlers.set(type, fn); }
  querySelectorAll() { return []; }
  prepend() {}
  remove() {}
}

function fixture(source) {
  const nodes = new Map();
  const getNode = selector => {
    if (!nodes.has(selector)) nodes.set(selector, new NodeStub());
    return nodes.get(selector);
  };
  const panel = new NodeStub();
  panel.querySelector = getNode;
  const mount = new NodeStub();
  const timers = new Map();
  let timerId = 0;
  const effects = [];
  const joins = [];
  const tapObservations = [];
  let gamePhase = 'LOBBY';
  const fighters = [
    { id:'f1',name:'@viewer_one',platform:'tiktok',alive:true },
    { id:'f2',name:'@fallen',platform:'tiktok',alive:false },
    { id:'f3',name:'@viewer_one',platform:'youtube',alive:true }
  ];
  let socket;
  class FakeSocket {
    constructor() { this.handlers = new Map(); socket = this; }
    addEventListener(name, handler) { this.handlers.set(name, handler); }
    emit(name, payload) { this.handlers.get(name)?.(payload); }
    close() {}
  }
  const window = {
    addEventListener() {}, dispatchEvent() {},
    ArenaLive:{
      getFighters: () => fighters,
      joinOnTap: ({ username, platformKey }) => {
        tapObservations.push(username);
        if (!['LOBBY','COMBAT'].includes(gamePhase) || platformKey !== 'tiktok') return false;
        const existing=fighters.find(f=>f.platform===platformKey&&f.name.toLowerCase()===username.toLowerCase());
        if(existing){
          if(existing.alive)return false;
          existing.alive=true;joins.push(username);return true;
        }
        if(fighters.length>=128)return false;
        fighters.push({id:'f'+(fighters.length+1),name:username,platform:platformKey,alive:true});
        joins.push(username);
        return true;
      },
      support: args => { effects.push(args); return true; }
    }
  };
  const ctx = {
    document:{
      createElement: () => panel,
      getElementById: id => id === 'arenaBridgeMount' ? mount : null,
      querySelector: () => null,
      body: mount
    },
    window,
    location:{host:'127.0.0.1:4173'},
    WebSocket: FakeSocket,
    ArenaCore:{createHistory: () => []},
    CustomEvent: class { constructor(type, options) { this.type=type; this.detail=options.detail; } },
    setTimeout:(callback,ms)=>{const id=++timerId;timers.set(id,{callback,ms});return id;},
    clearTimeout:id=>timers.delete(id),
    requestAnimationFrame: callback=>callback(),
    fetch:async()=>({ok:true,json:async()=>({sent:true})}),
    console
  };
  runInNewContext(source,ctx,{timeout:500});
  socket.emit('open', {});
  function send(message){socket.emit('message',{data:JSON.stringify(message)});}
  send({type:'status',phase:'connected',isController:true,clientId:'c1',canClaimControl:false});
  function flush(){
    for(const [id,task] of [...timers]) {
      if(task.ms === 800) { timers.delete(id); task.callback(); }
    }
  }
  return {send,flush,effects,joins,tapObservations,nodes,combat:()=>{gamePhase='COMBAT';},fighters};
}

const source = await readFile(new URL('../bridge/bridge-client.js', import.meta.url),'utf8');

test('LIVE taps admit and rejoin their owner during lobby or combat, without duplicating fighters',()=>{
  const f=fixture(source);
  const send=(username,count,source)=>
    f.send({type:'social',platformKey:'tiktok',eventType:'taps',username,count,source});
  send('@viewer_one',4);
  send('@VIEWER_ONE',6);
  send('@new_fan',3);
  send('@fallen',2); // A fallen fighter must rejoin on tap if this mode permits it.
  f.flush();
  assert.deepEqual(f.joins,['@new_fan','@fallen']);
  assert.ok(f.tapObservations.includes('@viewer_one'),'active fighters also receive tap confirmation');
  assert.equal(f.effects.length,3);
  assert.deepEqual(JSON.parse(JSON.stringify(f.effects[0])),{
    eventType:'taps',targetId:'f1',tapCount:10
  });
  assert.equal(f.effects[1].tapCount,3);
  assert.equal(f.effects[2].tapCount,2);
  assert.equal(f.fighters.find(p=>p.name==='@fallen').alive,true);
  assert.equal(f.fighters.filter(p=>p.name==='@new_fan').length,1);
  assert.match(f.nodes.get('#bridge-taps-count').textContent,/Taps LIVE: 15/);
  assert.match(f.nodes.get('#bridge-taps-count').textContent,/entradas\/reingresos: 2/);
  send('@new_fan',8);f.flush();
  assert.equal(f.joins.length,2);
  f.combat();
  send('@late_fan',10);f.flush();
  assert.deepEqual(f.joins,['@new_fan','@fallen','@late_fan']);
  assert.equal(f.fighters.filter(p=>p.name==='@late_fan').length,1);
  f.fighters.find(p=>p.name==='@fallen').alive=false;
  send('@fallen',1);f.flush();
  assert.equal(f.joins.length,4);
  assert.equal(f.fighters.filter(p=>p.name==='@fallen').length,1);
  assert.equal(f.fighters.find(p=>p.name==='@fallen').alive,true);
  assert.match(f.nodes.get('#bridge-taps-count').textContent,/entradas\/reingresos: 4/);
  send('@viewer_one',10,'test');f.flush();
  assert.match(f.nodes.get('#bridge-taps-count').textContent,/pruebas: 10/);
  assert.match(f.nodes.get('#bridge-taps-count').textContent,/Taps LIVE: 34/);
});

test('inactive controller never receives or applies another window\'s taps',()=>{
  const f=fixture(source);
  f.send({type:'status',phase:'connected',isController:false,clientId:'c1',canClaimControl:false});
  f.send({type:'social',platformKey:'tiktok',eventType:'taps',username:'@viewer_one',count:10});
  f.flush();
  assert.equal(f.effects.length,0);
});

test('spectators cannot bypass the full 128-player cap with taps',()=>{
  const f=fixture(source);
  while(f.fighters.length<128)f.fighters.push({id:'extra'+f.fighters.length,name:'@occupant'+f.fighters.length,platform:'tiktok',alive:true});
  f.send({type:'social',platformKey:'tiktok',eventType:'taps',username:'@over_limit',count:20});
  f.flush();
  assert.equal(f.joins.length,0);
  assert.equal(f.fighters.length,128);
});
