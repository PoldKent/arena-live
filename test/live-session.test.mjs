import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {LiveSession} from '../bridge/live-session.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
class Connection extends EventEmitter{constructor(promise=Promise.resolve()){super();this.promise=promise;this.closed=0;}connect(){return this.promise;}async disconnect(){this.closed++;}}
function fixture(connections){const chats=[],likes=[],shares=[],statuses=[],timers=new Map();let id=0;const session=new LiveSession({createConnection:async()=>connections.shift(),onChat:e=>chats.push(e),onLike:e=>likes.push(e),onShare:e=>shares.push(e),onStatus:s=>statuses.push(s),setTimer:(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key;},clearTimer:key=>timers.delete(key)});return{session,chats,likes,shares,statuses,timers};}
test('disconnect while connecting cannot later restore a connected session or deliver stale chat',async()=>{const d=deferred(),old=new Connection(d.promise),f=fixture([old]);const pending=f.session.connect();await Promise.resolve();await f.session.disconnect();d.resolve();await pending;old.emit('chat','old');old.emit('error',Error('late'));assert.equal(f.session.status.phase,'disconnected');assert.deepEqual(f.chats,[]);assert.equal(old.closed,1);});
test('a newer generation alone owns events after reconnect',async()=>{const old=new Connection(),current=new Connection(),f=fixture([old,current]);await f.session.connect();old.emit('chat','first');await f.session.disconnect();await f.session.connect();old.emit('chat','stale');current.emit('chat','second');assert.deepEqual(f.chats,['first','second']);assert.equal(f.session.status.phase,'connected');await f.session.disconnect();});
test('reconnect uses bounded exponential delays and manual disconnect cancels the pending retry',async()=>{const connections=Array.from({length:8},()=>new Connection(Promise.resolve()));const f=fixture(connections);f.session.createConnection=async()=>{throw Error('offline');};await f.session.connect();const delays=[];for(let i=0;i<7;i++){const [key,t]=f.timers.entries().next().value;delays.push(t.ms);f.timers.delete(key);t.fn();await new Promise(r=>setImmediate(r));}assert.deepEqual(delays,[1000,2000,4000,8000,16000,30000,30000]);await f.session.disconnect();assert.equal(f.timers.size,0);});
test('parallel connect requests allocate one connection and never start automatically',async()=>{const d=deferred(),connection=new Connection(d.promise);let calls=0;const session=new LiveSession({createConnection:async()=>{calls++;return connection;}});assert.equal(calls,0);const p=session.connect();await session.connect();assert.equal(calls,1);d.resolve();await p;await session.disconnect();});
test('an interrupted hanging connect does not block the next reconnect generation',async()=>{const d=deferred(),old=new Connection(d.promise),current=new Connection(),f=fixture([old,current]);const pending=f.session.connect();await Promise.resolve();old.emit('disconnected');const [key,t]=[...f.timers.entries()].find(([,t])=>t.ms===1000);assert.equal(t.ms,1000);f.timers.delete(key);t.fn();await new Promise(r=>setImmediate(r));assert.equal(f.session.status.phase,'connected');current.emit('chat','new');d.resolve();await pending;assert.deepEqual(f.chats,['new']);await f.session.disconnect();});
test('errors are bounded and keep the current connected generation intact',async()=>{const live=new Connection(),f=fixture([live]);await f.session.connect();live.emit('error',Error('x'.repeat(1000)));assert.equal(f.session.status.phase,'connected');assert.equal(f.session.status.lastError.length,240);assert.ok(f.session.status.connectedSince);await f.session.disconnect();live.emit('error',Error('late'));assert.equal(f.session.status.phase,'disconnected');});
test('a stalled LIVE connection expires and schedules reconnect instead of waiting forever',async()=>{const d=deferred(),live=new Connection(d.promise),f=fixture([live]);const pending=f.session.connect();await Promise.resolve();const [key,t]=[...f.timers].find(([,timer])=>timer.ms===20000);f.timers.delete(key);t.fn();await pending;assert.equal(f.session.status.phase,'reconnecting');assert.equal(live.closed,1);assert.ok([...f.timers.values()].some(timer=>timer.ms===1000));await f.session.disconnect();d.reject(Error('late rejection'));});

test('LIVE likes reach the active session and never leak from a stale connection',async()=>{
  const old=new Connection(),current=new Connection(),f=fixture([old,current]);
  await f.session.connect();
  old.emit('like',{user:{displayId:'one'},count:3});
  await f.session.disconnect();
  old.emit('like',{user:{displayId:'stale'},count:900});
  await f.session.connect();
  old.emit('like',{user:{displayId:'stale2'},count:20});
  current.emit('like',{user:{displayId:'two'},count:5});
  assert.deepEqual(f.likes.map(x=>x.count),[3,5]);
  await f.session.disconnect();
  current.emit('like',{count:700});
  assert.deepEqual(f.likes.map(x=>x.count),[3,5]);
});

test('LIVE shares belong to the active connection and cannot replay after reconnect',async()=>{
 const old=new Connection(),current=new Connection(),f=fixture([old,current]);
 await f.session.connect();
 old.emit('share',{user:{displayId:'first'}});
 await f.session.disconnect();
 old.emit('share',{user:{displayId:'stale'}});
 await f.session.connect();
 old.emit('share',{user:{displayId:'stale2'}});
 current.emit('share',{user:{displayId:'second'}});
 await f.session.disconnect();
 current.emit('share',{user:{displayId:'late'}});
 assert.deepEqual(f.shares.map(e=>e.user.displayId),['first','second']);
});

test('follow gift subscribe roomUser and member events follow the active connection only',async()=>{
 const old=new Connection(),active=new Connection();
 const supports=[],audience=[],members=[];
 const session=new LiveSession({createConnection:async()=>[old,active].shift(),
  onSupport:(kind,event)=>supports.push([kind,event.id]),
  onRoomUser:event=>audience.push(event.viewerCount),
  onMember:event=>members.push(event.user?.displayId)});
 await session.connect();
 old.emit('follow',{id:'a'});old.emit('gift',{id:'b'});old.emit('subscribe',{id:'c'});
 old.emit('roomUser',{viewerCount:4});old.emit('member',{user:{displayId:'first'}});
 await session.disconnect();
 old.emit('gift',{id:'stale'});
 await session.connect();
 active.emit('gift',{id:'new'});
 active.emit('roomUser',{viewerCount:9});
 await session.disconnect();
 assert.deepEqual(supports,[['follow','a'],['gift','b'],['subscribe','c'],['gift','new']]);
 assert.deepEqual(audience,[4,9]);assert.deepEqual(members,['first']);
});
