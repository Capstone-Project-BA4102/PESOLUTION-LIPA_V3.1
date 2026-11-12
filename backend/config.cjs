const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const skillModel = process.env.GEMINI_SKILL_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

module.exports = {
  port: Number(process.env.PORT || 5000),
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  model: skillModel,
  skillModel,
  resumeModel: process.env.GEMINI_RESUME_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  deploymentUrl: process.env.DEPLOYMENT_HEALTH_URL || '',
  version: process.env.DEPLOYMENT_VERSION || 'local',
  pythonCommand: process.env.PYTHON_COMMAND || 'python',
  sentimentArtifactDir: process.env.SENTIMENT_ARTIFACT_DIR || '',
  sentimentModelDir: process.env.SENTIMENT_MODEL_DIR || path.join(__dirname, 'model-artifacts', 'pesolution_xlmr_sentiment'),
  sentimentInferenceUrl: process.env.SENTIMENT_INFERENCE_URL || 'http://127.0.0.1:8001/predict',
  sentimentInferenceKey: process.env.SENTIMENT_INFERENCE_KEY || '',
  // A hosted Space answers fast once warm but a cold container can take longer than a request
  // should hold an applicant waiting, so the timeout is a knob and a miss keeps the row pending.
  sentimentTimeoutMs: Number(process.env.SENTIMENT_TIMEOUT_MS || 30000),
  brevoApiKey: process.env.BREVO_API_KEY || '',
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL || '',
  brevoSenderName: process.env.BREVO_SENDER_NAME || 'PESOLUTION / PESO Lipa City',
  publicUrl: process.env.APP_PUBLIC_URL || '',
  // GoTrue needs a browser-grade key as the apikey header; the service role key cannot verify a
  // applicant's password through the token endpoint.
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5000').split(',').map(s => s.trim()),
};
