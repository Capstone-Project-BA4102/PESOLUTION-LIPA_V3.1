const test = require('node:test');
const assert = require('node:assert/strict');
const { predictSentiment } = require('../backend/sentiment-transport.cjs');
const config = { sentimentTransport: 'gradio', sentimentInferenceBase: 'https://fixture.hf.space', sentimentInferenceKey: 'synthetic-key' };
async function mocked(handler, fn) { const original = global.fetch; global.fetch = handler;try { await fn(); } finally { global.fetch = original; } }
function stream(chunks) { const encoder = new TextEncoder();return { ok: true, body: new ReadableStream({ start(controller) { for (const text of chunks) controller.enqueue(encoder.encode(text));controller.close(); } }) }; }

test('local REST contract and Bearer key stay unchanged', async () => {
 await mocked(async (url, options) => { assert.equal(url,'http://127.0.0.1:8001/predict');assert.deepEqual(JSON.parse(options.body),{text:'Synthetic comment'});assert.equal(options.headers.Authorization,'Bearer synthetic-key');return {ok:true,json:async()=>({label:'positive'})}; },async()=>assert.equal((await predictSentiment('Synthetic comment',{sentimentInferenceUrl:'http://127.0.0.1:8001/predict',sentimentInferenceKey:'synthetic-key'})).label,'positive'));
});
test('ZeroGPU queue submission and fragmented SSE result both carry authentication', async () => {
 const calls=[];
 await mocked(async (url, options) => { calls.push({url,options});assert.equal(options.headers['X-PESOLUTION-Key'],'synthetic-key');assert.equal(options.headers.Authorization,undefined);if(calls.length===1){assert.deepEqual(JSON.parse(options.body),{data:['Synthetic comment']});return {ok:true,json:async()=>({event_id:'event_123'})};}return stream(['event: heartbeat\r\ndata: null\r\n\r\nevent: comp','lete\ndata: [{"label":"positive",','"confidence":0.9,"model_version":"fixture"}]\n\n']); },async()=>assert.deepEqual(await predictSentiment('Synthetic comment',config),{label:'positive',confidence:0.9,model_version:'fixture'}));
 assert.equal(calls.length,2);assert.equal(calls[0].url,'https://fixture.hf.space/gradio_api/call/sentiment');assert.equal(calls[1].url,calls[0].url+'/event_123');assert.equal(calls[0].options.signal,calls[1].options.signal);
});
test('a missing key stops before contacting the public Space', async () => {
 await mocked(()=>assert.fail('must not contact inference'),()=>assert.rejects(predictSentiment('test',{...config,sentimentInferenceKey:''}),/inference key/));
});
test('invalid queue events cannot inject paths into the stream request', async()=>{
 let calls=0;await mocked(async()=>{calls++;return {ok:true,json:async()=>({event_id:'../../secret'})}},()=>assert.rejects(predictSentiment('test',config),/Invalid inference event/));assert.equal(calls,1);
});
test('queue failures, quota errors and incomplete streams fail rather than inventing labels',async()=>{
 for(const result of [{ok:false},stream(['event: error\ndata: "quota unavailable"\n\n']),stream(['event: heartbeat\ndata: null\n\n']),stream(['event: complete\ndata: []\n\n'])]) {
 let calls=0;await mocked(async()=>++calls===1?{ok:true,json:async()=>({event_id:'test'})}:result,()=>assert.rejects(predictSentiment('test',config)));
 }
});

test('ZeroGPU readiness uses the app header without pretending it is a Hugging Face token',async()=>{
 const {inferenceReady}=require('../backend/feedback.cjs');
 await mocked(async(url,options)=>{assert.equal(url,'https://zerogpu-readiness-fixture.hf.space/health');assert.equal(options.headers['X-PESOLUTION-Key'],'synthetic-key');assert.equal(options.headers.Authorization,undefined);return {ok:true,json:async()=>({status:'ready'})};},async()=>assert.equal(await inferenceReady({...config,sentimentInferenceBase:'https://zerogpu-readiness-fixture.hf.space'}),true));
});

test('HTTP auth, routing and quota failures expose safe categories rather than generic availability', async () => {
 for (const [status, code] of [[401,'unauthorized'],[403,'unauthorized'],[404,'endpoint_not_found'],[429,'quota_exceeded'],[503,'service_unavailable'],[504,'timeout']]) {
  await mocked(async()=>({ok:false,status}),()=>assert.rejects(predictSentiment('private comment',config),error=>error.code===code && error.status===status && error.stage==='queue'));
 }
});
test('SSE quota failures are distinguishable without exposing the service error body', async () => {
 let n=0;
 await mocked(async()=>++n===1?{ok:true,json:async()=>({event_id:'quota'})}:stream(['event: error\ndata: "GPU quota exceeded; private details"\n\n']),()=>assert.rejects(predictSentiment('test',config),error=>error.code==='quota_exceeded' && !error.message.includes('private details')));
});
test('diagnostics and public health never include secrets, payloads, hosts or raw exception text', () => {
 const {inferenceDiagnostic,sentimentHealth}=require('../backend/sentiment-transport.cjs');
 const privateValue='synthetic-private-secret';
 const input={sentimentTransport:'gradio',sentimentInferenceKey:privateValue,sentimentInferenceUrl:'https://private.invalid/'+privateValue,sentimentTimeoutMs:60000};
 const result=inferenceDiagnostic({message:privateValue,code:privateValue,stage:privateValue,status:401},input);
 assert.deepEqual(result,{code:'inference_error',stage:'request',status:401,transport:'gradio'});
 assert.equal(JSON.stringify({result,health:sentimentHealth(input)}).includes(privateValue),false);
 assert.equal(sentimentHealth({...input,sentimentTransport:privateValue}).transport,'invalid');
});

test('public backend health exposes readiness configuration only and performs no inference or database access', async()=>{
 const {createApp}=require('../backend/app.cjs');
 const app=createApp({supabase:null,gemini:{model:'fixture'},config:{origins:[],version:'test',sentimentTransport:'gradio',sentimentInferenceUrl:'https://private.invalid/synthetic-secret',sentimentInferenceKey:'synthetic-secret',sentimentTimeoutMs:60000}});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try {
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/health`);assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.status,'ok');assert.equal(result.version,'test');
  assert.deepEqual(result.sentiment,{transport:'gradio',configured:true,keyConfigured:true,timeoutMs:60000});
  assert.equal(JSON.stringify(result).includes('synthetic-secret'),false);assert.equal(JSON.stringify(result).includes('private.invalid'),false);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
