const { HttpError } = require('./domain.cjs');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// One wrapper for every Gemini call: picks the task's model, retries transient
// failures with exponential backoff, and always surfaces a clean HttpError.
function geminiService(ai, options = {}) {
  const model = options.skillModel || options.model || 'gemini-3.5-flash-lite';
  const resumeModel = options.resumeModel || model;
  const call = async (contents, usedModel, timeoutMs) => {
    const result = await ai.models.generateContent({ model: usedModel, contents,
      config: { responseMimeType: 'application/json', temperature: 0, httpOptions: { timeout: timeoutMs } } });
    return JSON.parse(result.text || '');
  };
  const request = async (contents, { resume = false, attempts = 2, timeoutMs = 45000 } = {}) => {
    if (!ai) throw new HttpError(503, 'Gemini is not configured on the server.');
    const usedModel = resume ? resumeModel : model;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try { return await call(contents, usedModel, timeoutMs); }
      catch (error) {
        lastError = error;
        if (attempt < attempts) await wait(400 * 2 ** (attempt - 1));
      }
    }
    throw lastError instanceof HttpError ? lastError : new HttpError(502, 'Gemini could not complete the request. Please retry later.');
  };
  return { request, model, resumeModel };
}
module.exports = { geminiService };
