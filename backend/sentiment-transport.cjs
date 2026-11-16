// Keep local REST inference unchanged; opt in to the ZeroGPU Gradio queue.
async function predictSentiment(text, config) {
  const signal = AbortSignal.timeout(config.sentimentTimeoutMs || 30000);
  const headers = { 'Content-Type': 'application/json',
    ...(config.sentimentInferenceKey ? (config.sentimentTransport === 'gradio'
      ? { 'X-PESOLUTION-Key': config.sentimentInferenceKey } : { Authorization: `Bearer ${config.sentimentInferenceKey}` }) : {}) };
  if (config.sentimentTransport !== 'gradio') {
    const response = await fetch(config.sentimentInferenceUrl, { method: 'POST', headers, body: JSON.stringify({ text }), signal });
    if (!response.ok) throw new Error('Inference unavailable');
    return response.json();
  }
  if (!config.sentimentInferenceKey) throw new Error('Configure the inference key before enabling Gradio');
  const base = config.sentimentInferenceBase || String(config.sentimentInferenceUrl || '').replace(/\/predict\/?$/, '');
  const endpoint = `${base}/gradio_api/call/sentiment`;
  const queued = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ data: [text] }), signal });
  if (!queued.ok) throw new Error('Sentiment queue unavailable');
  const { event_id: eventId } = await queued.json();
  if (typeof eventId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)) throw new Error('Invalid inference event');
  const response = await fetch(`${endpoint}/${encodeURIComponent(eventId)}`, { headers, signal });
  if (!response.ok || !response.body) throw new Error('Sentiment stream unavailable');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      pending = pending.replace(/\r\n/g, '\n');
      if (pending.length > 65536) throw new Error('Inference response too large');
      let boundary;
      while ((boundary = pending.indexOf('\n\n')) >= 0 || (done && pending.length)) {
        const block = boundary >= 0 ? pending.slice(0, boundary) : pending;
        pending = boundary >= 0 ? pending.slice(boundary + 2) : '';
        const lines = block.split('\n');
        const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (event === 'error') throw new Error('Sentiment inference failed or quota exhausted');
        if (event === 'complete') {
          const result = JSON.parse(data);
          if (!Array.isArray(result) || !result[0] || typeof result[0] !== 'object') throw new Error('Invalid inference result');
          return result[0];
        }
      }
      if (done) throw new Error('Inference ended without a result');
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
module.exports = { predictSentiment };
