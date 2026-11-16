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
