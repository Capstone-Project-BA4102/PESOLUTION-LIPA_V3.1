// Synthetic live test only. Read the app key from stdin, never command-line arguments.
const { predictSentiment } = require('../backend/sentiment-transport.cjs');
(async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const key = Buffer.concat(chunks).toString('utf8').trim();
  const base = new URL(process.argv[2] || 'https://lorx-20-pesolution-xlmr-sentiment.hf.space');
  if (base.protocol !== 'https:' || !base.hostname.endsWith('.hf.space') || base.username || base.password) throw new Error('Use the actual HTTPS hf.space App URL.');
  if (!key || key.startsWith('hf_')) throw new Error('Enter SENTIMENT_INFERENCE_KEY, not HF_TOKEN.');
  const output = await predictSentiment('Mabilis ang tulong ng PESO at malinaw ang proseso.', {
    sentimentTransport: 'gradio', sentimentInferenceBase: base.origin, sentimentInferenceKey: key, sentimentTimeoutMs: 60000,
  });
  if (!['positive', 'neutral', 'negative'].includes(output.label) || typeof output.confidence !== 'number' || output.confidence < 0 || output.confidence > 1) throw new Error('Invalid model response.');
  console.log(JSON.stringify({ test: 'Synthetic feedback only; no Supabase writes', label: output.label, confidence: output.confidence, model_version: output.model_version }, null, 2));
})().catch(() => { console.error('Live inference test failed. Check the shared app key, HF runtime logs, and ZeroGPU queue/quota. No feedback was saved.'); process.exitCode = 1; });
