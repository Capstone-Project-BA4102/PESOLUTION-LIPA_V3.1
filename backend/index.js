const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const config = require('./config.cjs');
const { geminiService } = require('./gemini.cjs');
const { createApp } = require('./app.cjs');
const { skillNlpService } = require('./skill-nlp.cjs');

const supabase = config.supabaseUrl && config.serviceKey ? createClient(config.supabaseUrl, config.serviceKey,
  { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const gemini = geminiService(config.geminiKey ? new GoogleGenAI({ apiKey: config.geminiKey }) : null, config);
createApp({ supabase, gemini, nlp: skillNlpService(config), config }).listen(config.port, process.env.HOST || '127.0.0.1', () => {
  console.log(`PESOLUTION backend: http://localhost:${config.port}`);
});
