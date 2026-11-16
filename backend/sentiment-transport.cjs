// Keep local REST inference unchanged; opt in to the ZeroGPU Gradio queue.
async function requestSentiment(text, config) {
  const signal = AbortSignal.timeout(config.sentimentTimeoutMs || 30000);
  const headers = { 'Content-Type': 'application/json',
    ...(config.sentimentInferenceKey ? (config.sentimentTransport === 'gradio'
      ? { 'X-PESOLUTION-Key': config.sentimentInferenceKey } : { Authorization: `Bearer ${config.sentimentInferenceKey}` }) : {}) };
  if (config.sentimentTransport !== 'gradio') {
    const response = await fetch(config.sentimentInferenceUrl, { method: 'POST', headers, body: JSON.stringify({ text }), signal });
    if (!response.ok) throw httpFailure(response, 'rest', 'Inference unavailable');
    return response.json();
  }
  if (!config.sentimentInferenceKey) throw failure('key_not_configured', 'configuration', 'Configure the inference key before enabling Gradio');
  const base = config.sentimentInferenceBase || String(config.sentimentInferenceUrl || '').replace(/\/predict\/?$/, '');
  const endpoint = `${base}/gradio_api/call/sentiment`;
  const queued = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ data: [text] }), signal });
  if (!queued.ok) throw httpFailure(queued, 'queue', 'Sentiment queue unavailable');
  const { event_id: eventId } = await queued.json();
  if (typeof eventId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) throw failure('invalid_response', 'stream', 'Invalid inference event');
  const response = await fetch(`${endpoint}/${encodeURIComponent(eventId)}`, { headers, signal });
  if (!response.ok || !response.body) throw httpFailure(response, 'stream', 'Sentiment stream unavailable');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      pending = pending.replace(/\r\n/g, '\n');
      if (pending.length > 65536) throw failure('invalid_response', 'stream', 'Inference response too large');
      let boundary;
      while ((boundary = pending.indexOf('\n\n')) >= 0 || (done && pending.length)) {
        const block = boundary >= 0 ? pending.slice(0, boundary) : pending;
        pending = boundary >= 0 ? pending.slice(boundary + 2) : '';
        const lines = block.split('\n');
        const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (event === 'error') throw failure(/quota|GPU.*duration|daily.*limit/i.test(data) ? 'quota_exceeded' : 'inference_error', 'inference', 'Sentiment inference failed');
        if (event === 'complete') {
          const result = JSON.parse(data);
          if (!Array.isArray(result) || !result[0] || typeof result[0] !== 'object') throw failure('invalid_response', 'stream', 'Invalid inference result');
          return result[0];
        }
      }
      if (done) throw failure('invalid_response', 'stream', 'Inference ended without a result');
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
const CODES = new Set(['unauthorized','quota_exceeded','endpoint_not_found','service_unavailable','http_error','key_not_configured','invalid_response','timeout','network_unavailable','inference_error','invalid_configuration']);
const STAGES = new Set(['configuration','rest','queue','stream','inference','request']);
function failure(code, stage, message, status = null) {
  const error = new Error(message);
  error.code = code; error.stage = stage; error.status = status;
  return error;
}
function httpFailure(response, stage, message) {
  const status = response.status;
  const code = status === 401 || status === 403 ? 'unauthorized' : status === 429 ? 'quota_exceeded' : status === 404 ? 'endpoint_not_found' : status === 408 || status === 504 ? 'timeout' : status >= 500 ? 'service_unavailable' : 'http_error';
  return failure(code, stage, message, status);
}
async function predictSentiment(text, config) {
  try { return await requestSentiment(text, config); }
  catch (error) {
    if (CODES.has(error?.code)) throw error;
    const code = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : error instanceof SyntaxError ? 'invalid_response' : error instanceof RangeError ? 'invalid_configuration' : 'network_unavailable';
    throw failure(code, 'request', 'Sentiment request failed');
  }
}
// Whitelist metadata only: never log URL, payload, header, exception message or body.
function inferenceDiagnostic(error, config) {
  return { code: CODES.has(error?.code) ? error.code : 'inference_error',
    stage: STAGES.has(error?.stage) ? error.stage : 'request',
    status: Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : null,
    transport: config.sentimentTransport === 'gradio' ? 'gradio' : 'rest' };
}
function sentimentHealth(config) {
  return { transport: ['rest','gradio'].includes(config.sentimentTransport || 'rest') ? config.sentimentTransport || 'rest' : 'invalid',
    configured: !!config.sentimentInferenceUrl, keyConfigured: !!config.sentimentInferenceKey,
    timeoutMs: Number.isFinite(config.sentimentTimeoutMs) ? config.sentimentTimeoutMs : null };
}
module.exports = { predictSentiment, inferenceDiagnostic, sentimentHealth };
