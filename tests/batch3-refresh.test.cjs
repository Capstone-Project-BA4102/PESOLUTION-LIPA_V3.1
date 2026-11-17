const test=require('node:test');const assert=require('node:assert/strict');
const {watchRows}=require('../src/lib/rowChanges.ts');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('list and matching consumers share one table channel; only the last unsubscribe removes it',()=>{
 const channels=[],removed=[];const client={channel(name){const c={name,on(_kind,spec,changed){this.spec=spec;this.changed=changed;return this},subscribe(status){this.status=status;status('SUBSCRIBED');return this}};channels.push(c);return c},removeChannel(c){removed.push(c)}};
 let lists=0,matches=0;const a=watchRows(client,'job_listings',undefined,()=>lists++),b=watchRows(client,'job_listings',undefined,()=>matches++);
 assert.equal(channels.length,1);channels[0].changed();assert.equal(lists,1);assert.equal(matches,1);a();assert.equal(removed.length,0);
 channels[0].changed();assert.equal(lists,1);assert.equal(matches,2);b();assert.equal(removed.length,1);
 const c=watchRows(client,'resumes','applicant_id=eq.one',()=>{}),d=watchRows(client,'resumes','applicant_id=eq.two',()=>{});assert.equal(channels.length,3);c();d();
});
function loadHook(file,modules,globals={}){
 const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:module.exports,require:name=>{if(name in modules)return modules[name];throw Error(name)},setTimeout,clearTimeout,...globals});return module.exports;
}
test('live refresh consolidates bursts, catches focus/reconnection and cleans every listener/channel/timer',async()=>{
 const events=new Map(),docEvents=new Map(),stops=[];let timer,change,refresh=0,cleanup;
 const window={addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k),setInterval:v=>{timer=v;return 1},clearInterval:()=>{timer=null}};
 const document={visibilityState:'visible',addEventListener:(k,v)=>docEvents.set(k,v),removeEventListener:k=>docEvents.delete(k)};const navigator={onLine:true};
 const {useLiveRefresh}=loadHook('src/lib/useLiveRefresh.ts',{'react':{useRef:current=>({current}),useEffect:fn=>{cleanup=fn()}},'./supabase':{supabase:{}},'./rowChanges':{watchRows:(_c,_t,_f,fn)=>{change=fn;return()=>stops.push(true)}}},{window,document,navigator});
 useLiveRefresh(()=>refresh++,['job_listings']);for(let i=0;i<20;i++)change();await sleep(450);assert.equal(refresh,1);
 navigator.onLine=false;change();await sleep(450);assert.equal(refresh,1);navigator.onLine=true;events.get('online')();await sleep(450);assert.equal(refresh,2);
 document.visibilityState='hidden';timer();await sleep(450);assert.equal(refresh,2);document.visibilityState='visible';docEvents.get('visibilitychange')();await sleep(450);assert.equal(refresh,3);
 events.get('focus')();cleanup();await sleep(450);assert.equal(refresh,3);assert.equal(events.size,0);assert.equal(docEvents.size,0);assert.equal(timer,null);assert.equal(stops.length,1);
});
test('query serializes overlapping generations and discards stale responses while retaining saved data',async()=>{
 let cells=[],effects=[],cursor=0,current;const React={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value}]},useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i]},useCallback:fn=>fn,useEffect(fn,deps){const i=cursor++,old=effects[i];if(!old||!deps||deps.some((d,n)=>!Object.is(d,old.deps?.[n]))){old?.cleanup?.();effects[i]={deps,cleanup:fn()}}}};
 const {useQuery}=loadHook('src/lib/useQuery.ts',{react:React});const releases=[];let calls=0,active=0,max=0;
 const fetcher=()=>{calls++;active++;max=Math.max(max,active);return new Promise(resolve=>releases.push(value=>{active--;resolve(value)}))};
 const render=function QueryHarness(dep){cursor=0;current=useQuery(fetcher,[dep]);return current};
 render('one');await sleep(15);assert.equal(calls,1);render('two');await sleep(15);assert.equal(calls,1);releases.shift()('stale');await sleep(15);assert.equal(calls,2);assert.equal(render('two').data,null);
 releases.shift()('latest');await sleep(15);assert.equal(render('two').data,'latest');assert.equal(max,1);
 current.reload();render('two');await sleep(15);assert.equal(render('two').loading,false);assert.equal(current.data,'latest');releases.shift()('refreshed');await sleep(15);assert.equal(render('two').data,'refreshed');
 for(const effect of effects)effect?.cleanup?.();
});
