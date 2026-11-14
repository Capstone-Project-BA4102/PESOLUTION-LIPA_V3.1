const test = require('node:test');
const assert = require('node:assert/strict');
const { activityMonitor, IDLE_TIMEOUT, IDLE_WARNING, remainingSeconds, validActivity } = require('../src/lib/sessionActivity.ts');
function fixture() {
  let now=1000000, record={lastActivity:now,ended:false}, expired=0;const updates=[];
  const create=()=>activityMonitor({read:()=>record,write:value=>{record=value},now:()=>now,changed:value=>updates.push(value),expired:()=>expired++});
  return {create,updates,get record(){return record},get expired(){return expired},advance:ms=>{now+=ms}};
}
test('idle warning starts at 28 minutes, countdown reaches zero at 30, expiry fires once',()=>{
 const f=fixture(),m=f.create();assert.equal(m.check(),1800);f.advance(IDLE_TIMEOUT-IDLE_WARNING);assert.equal(m.check(),120);
 f.advance(1000);assert.equal(m.check(),119);f.advance(119000);assert.equal(m.check(),0);assert.equal(f.expired,1);m.check();assert.equal(f.expired,1);assert.equal(f.record.ended,true);
});
test('meaningful activity / Stay Logged In resets remaining time; background checks do not',()=>{
 const f=fixture(),m=f.create();f.advance(28*60000);m.check();assert.equal(m.interact(),true);assert.equal(m.check(),1800);
 f.advance(29*60000);for(let i=0;i<10;i++)m.check();assert.equal(m.check(),60);f.advance(60000);assert.equal(m.check(),0);
});
test('multiple tabs share activity and logout; a sleeping or closed tab cannot revive an expired session',()=>{
 const f=fixture(),a=f.create(),b=f.create();f.advance(27*60000);a.interact();assert.equal(b.check(),1800);
 f.advance(31*60000);assert.equal(b.interact(),false);assert.equal(a.check(),0);assert.equal(f.expired,2);assert.equal(f.record.ended,true);
});
test('disposed monitor has no more notifications, writes or logout callbacks',()=>{
 const f=fixture(),m=f.create();m.dispose();f.advance(IDLE_TIMEOUT);m.check();assert.equal(m.interact(),false);assert.equal(f.expired,0);assert.deepEqual(f.updates,[]);
});
test('remaining seconds uses absolute time and malformed stored records are rejected',()=>{
 assert.equal(remainingSeconds({lastActivity:0,ended:false},IDLE_TIMEOUT+1),0);
 assert.equal(remainingSeconds({lastActivity:0,ended:true},0),0);
 for(const value of [null,{}, {lastActivity:'1',ended:false},{lastActivity:NaN,ended:false}])assert.equal(validActivity(value),false);
});
test('session gate aborts protected requests, rejects post-logout work and permits only a fresh login',async t=>{
 const originalFetch=global.fetch,originalStorage=global.localStorage;
 const storage=new Map();global.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
 const gate=require('../src/lib/sessionGate.ts');
 t.after(()=>{global.fetch=originalFetch;global.localStorage=originalStorage});
 gate.activateSession('fixture-user',true);
 let started,signal;const ready=new Promise(resolve=>started=resolve);
 global.fetch=(_input,init)=>new Promise((_resolve,reject)=>{signal=init.signal;started();signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))});
 const request=gate.protectedFetch('http://fixture.invalid');await ready;gate.endSession();assert.equal(signal.aborted,true);await assert.rejects(request,/Aborted/);
 assert.throws(()=>gate.assertSessionActive(),/expired/);assert.equal(gate.activateSession('fixture-user'),false);
 assert.equal(gate.activateSession('fixture-user',true),true);assert.doesNotThrow(()=>gate.assertSessionActive());
 // Even a transport ignoring cancellation cannot publish an earlier login's result.
 let resolve;global.fetch=()=>new Promise(done=>resolve=done);const stale=gate.protectedFetch('http://fixture.invalid');
 gate.endSession();gate.activateSession('fixture-user',true);resolve(new Response('{}'));await assert.rejects(stale,/account changed/);
});
