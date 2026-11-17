const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {shareQueryData}=require('../src/lib/queryData.ts');
const policy=require('../src/lib/refreshPolicy.ts');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function harness(file,modules={},globals={}){
 const cells=[],effects=[];let cursor=0,current;
 const React={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value}]},useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i]},useCallback:fn=>fn,useEffect(fn,deps){const i=cursor++,old=effects[i];if(!old||!deps||deps.some((d,n)=>!Object.is(d,old.deps?.[n]))){old?.cleanup?.();effects[i]={deps,cleanup:fn()}}}};
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:module.exports,require:name=>name==='react'?React:name==='./refreshPolicy'?policy:name==='./queryData'?{shareQueryData}:name in modules?modules[name]:(()=>{throw Error(name)})(),setTimeout,clearTimeout,...globals});
 return {render(name,...args){cursor=0;current=module.exports[name](...args);return current},dispose(){effects.forEach(effect=>effect?.cleanup?.())}};
}
test('identical JSON results and unchanged subtrees keep identity; real changes and deletions still publish',()=>{
 const previous={generatedAt:'old',rows:[{id:'a',value:1},{id:'b',value:2}],nested:{count:3}};
 assert.equal(shareQueryData(previous,structuredClone(previous)),previous);
 const next=shareQueryData(previous,{...structuredClone(previous),generatedAt:'new'});assert.notEqual(next,previous);assert.equal(next.rows,previous.rows);assert.equal(next.nested,previous.nested);assert.equal(next.generatedAt,'new');
 const changed=shareQueryData(previous,{...structuredClone(previous),rows:[{id:'a',value:5},{id:'b',value:2}]});assert.equal(changed.rows[1],previous.rows[1]);assert.equal(changed.rows[0].value,5);
 assert.deepEqual(shareQueryData(previous,{rows:[]}),{rows:[]});const old={x:undefined};const replaced=shareQueryData(old,{y:undefined});assert.notEqual(replaced,old);assert.deepEqual(Object.keys(replaced),['y']);const safe=shareQueryData({},JSON.parse('{"__proto__":{"poison":true}}'));assert.equal(Object.getPrototypeOf(safe),Object.prototype);assert.equal(({}).poison,undefined);
});
test('automatic query refresh stays quiet, retains saved data on failures and manual reload remains visible',async()=>{
 const h=harness('src/lib/useQuery.ts'),releases=[];const fetcher=()=>new Promise((resolve,reject)=>releases.push({resolve,reject}));
 const render=()=>h.render('useQuery',fetcher,['scope']);render();await sleep(10);releases.shift().resolve({rows:[{id:'a',count:3}]});await sleep(10);const loaded=render();assert.equal(loaded.loading,false);const saved=loaded.data;
 loaded.reload(policy.BACKGROUND_REFRESH);render();await sleep(10);assert.equal(render().refreshing,false);assert.equal(render().data,saved);releases.shift().resolve({rows:[{id:'a',count:3}]});await sleep(10);assert.equal(render().data,saved);
 render().reload(policy.BACKGROUND_REFRESH);render();await sleep(10);releases.shift().reject(Error('offline'));await sleep(10);assert.equal(render().data,saved);assert.equal(render().error,'offline');
 render().reload();render();await sleep(10);assert.equal(render().refreshing,true);releases.shift().resolve({rows:[{id:'a',count:4}]});await sleep(10);assert.equal(render().data.rows[0].count,4);assert.equal(render().error,null);h.dispose();
});
test('number animation runs on initial reveal only and later values render directly without new frames',()=>{
 const frames=new Map();let id=0,now=0;const h=harness('src/lib/useCountUp.ts',{'./appReveal':{appReveal:{hidden:false,subscribe:assert.fail}}},{window:{matchMedia:()=>({matches:false})},performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)});
 assert.equal(h.render('useCountUp',8,800),0);const advance=time=>{now=time;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time))};advance(400);assert.equal(h.render('useCountUp',8,800),7);advance(800);assert.equal(h.render('useCountUp',8,800),8);assert.equal(frames.size,0);
 assert.equal(h.render('useCountUp',12,800),12);assert.equal(frames.size,0);assert.equal(h.render('useCountUp',3,800),3);assert.equal(frames.size,0);h.dispose();
});
test('automatic matching keeps current results visible while manual matching still shows progress and force intent',async()=>{
 let changed,scheduled;const gates=[],events=new Map(),docEvents=new Map();let source={matches:[{id:'job',score:80}]};
 const load=async()=>structuredClone(source),run=async(_id,options)=>new Promise(resolve=>gates.push({resolve,options}));
 const matching=require('../src/lib/matchingRefreshQueue.ts');
 const h=harness('src/lib/useReactiveMatching.ts',{'./api':{fetchApplicantMatchDetails:load,runApplicantMatching:run},'./supabase':{supabase:{}},'./matchingRefreshQueue':{matchingRefreshQueue:matching.matchingRefreshQueue,watchMatchingInputs:(_s,_id,fn,status)=>{changed=fn;status('SUBSCRIBED');return()=>{}}}},{window:{addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name),setInterval:(fn,ms)=>{assert.equal(ms,180000);scheduled=fn;return 1},clearInterval:()=>{scheduled=null}},document:{visibilityState:'visible',addEventListener:(name,fn)=>docEvents.set(name,fn),removeEventListener:name=>docEvents.delete(name)},navigator:{onLine:true}});
 const render=()=>h.render('useReactiveMatching','applicant',{load,run});render();await sleep(20);gates.shift().resolve({matchingKey:'same',checkedAt:'one'});await sleep(15);let current=render();assert.equal(current.loading,false);const saved=current.data;
 changed();await sleep(2100);assert.equal(gates.length,1);assert.equal(render().loading,false);assert.equal(render().data,saved);gates.shift().resolve({matchingKey:'same',checkedAt:'two'});await sleep(15);assert.equal(render().data,saved);
 render().refresh(true);await sleep(15);assert.equal(render().loading,true);const manual=gates.shift();assert.equal(manual.options.force,true);assert.equal(manual.options.automatic,false);source={matches:[{id:'job',score:90}]};manual.resolve({matchingKey:'changed',checkedAt:'three'});await sleep(15);assert.equal(render().data.matches[0].score,90);assert.equal(render().loading,false);h.dispose();assert.equal(events.size,0);assert.equal(docEvents.size,0);assert.equal(scheduled,null);
});
