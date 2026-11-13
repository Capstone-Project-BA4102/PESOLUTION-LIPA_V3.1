const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { check, skills, requireUuid, MATCHING_WEIGHTS, MATCHING_THRESHOLD, filterRecommendations, validateRecommendations } = require('./domain.cjs');
const { loadMatchingInputs, analyzeApplicant, completeRecommendations } = require('./matching.cjs');
const { recommendationPrompt } = require('./prompts.cjs');
const { skillNlpService, exactAudit } = require('./skill-nlp.cjs');

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const policy = hash(['domain.cjs', 'skill-text.cjs', 'skill-nlp.cjs', 'matching.cjs'].map(file => readFileSync(path.join(__dirname, file), 'utf8')));
const skillFields = row => ({ hard_skills: skills(row.hard_skills).sort(), soft_skills: skills(row.soft_skills).sort(), education: row.education || '' });
const fields = ['applicant_id', 'job_id', 'hard_skill_score', 'soft_skill_score', 'education_score', 'final_match_score',
  'matched_hard_skills', 'missing_hard_skills', 'matched_soft_skills', 'missing_soft_skills'];
const matchRows = rows => rows.map(row => Object.fromEntries(fields.map(key => [key, row[key]]))).sort((a, b) => a.job_id.localeCompare(b.job_id));
const outputHash = rows => hash(matchRows(rows));
const recommendationFingerprint = (gaps, educationScore, title, model) => hash({ gaps, education: educationScore, title, model });

// Persist fingerprint-bound results and actual qualified-job evidence. Never reconstruct historical cosine values.
function fileCache(directory = path.join(__dirname, 'model-artifacts', 'matching-cache')) {
  const memory = new Map();
  return {
    async get(id) {
      requireUuid(id);
      if (memory.has(id)) return memory.get(id);
      try { const value = JSON.parse(await fs.readFile(path.join(directory, `${id}.json`), 'utf8')); memory.set(id, value); return value; }
      catch { return null; }
    },
    async set(id, value) {
      requireUuid(id);
      if (JSON.stringify(memory.get(id)) === JSON.stringify(value)) return;
      memory.set(id, value);
      try {
        await fs.mkdir(directory, { recursive: true });
        const target = path.join(directory, `${id}.json`);
        await fs.writeFile(`${target}.tmp`, JSON.stringify(value));
        await fs.rename(`${target}.tmp`, target);
      } catch { /* Read-only disks retain in-process caching; matching remains available. */ }
    },
  };
}

function createMatchingRefresh({ supabase, gemini, nlp = skillNlpService(), cache = fileCache(), now = Date.now }) {
  const pending = new Map();
  const savedMatches = async id => matchRows(check(await supabase.from('job_matches').select('*').eq('applicant_id', id)) || []);
  async function refresh(id, force) {
    const inputs = await loadMatchingInputs(supabase, id);
    const [saved, previous, identity, recommendationRows] = await Promise.all([
      savedMatches(id), cache.get(id), nlp.identity?.() || { threshold: 0.85 },
      supabase.from('skill_recommendations').select('*').eq('applicant_id', id).then(check),
    ]);
    const baseConfigKey = hash({ threshold: identity.threshold, endpoint: identity.endpoint || '', policy,
      weights: MATCHING_WEIGHTS, cutoff: MATCHING_THRESHOLD });
    // A temporary service outage does not invalidate otherwise valid semantic scores.
    // Keep the last observed provider hash; new/changed jobs can still use exact fallback.
    const providerKey = identity.ready ? hash({ model: identity.model, policy: identity.policy }) :
      previous?.baseConfigKey === baseConfigKey ? previous.providerKey : 'unavailable';
    const configKey = hash({ baseConfigKey, providerKey });
    const applicantKey = hash(skillFields(inputs.applicant));
    const keys = new Map(inputs.jobs.map(job => [job.id, hash({ applicantKey, configKey, job: skillFields(job) })]));
    const savedByJob = new Map(saved.map(row => [row.job_id, row]));
    const evidenceValid = (entry, job) => {
      const evidence = entry?.evidence;
      return evidence && Array.isArray(evidence.audit) && evidence.threshold === identity.threshold &&
        Number.isFinite(Date.parse(evidence.capturedAt)) && hash(evidence) === entry.evidenceHash &&
        evidence.audit.length === skills(job.hard_skills).length + skills(job.soft_skills).length &&
        evidence.audit.every(row => row.job_id === job.id);
    };
    const evidenceOnly = new Set();
    const changed = inputs.jobs.filter(job => {
      const entry = previous?.jobs?.[job.id];
      const savedRow = savedByJob.get(job.id);
      const validRow = entry?.qualified ? savedRow && entry.outputHash === outputHash([savedRow]) : !savedRow;
      const recalculate = force || entry?.key !== keys.get(job.id) || !validRow ||
        entry.degraded && identity.ready && now() >= entry.retryAt;
      if (recalculate) return true;
      const exact = exactAudit(inputs.applicant, [job]);
      const canExplainExactly = exact.every(row => row.method === 'exact' || !skills(inputs.applicant[`${row.category}_skills`]).length);
      if (entry.qualified && !evidenceValid(entry, job) && (identity.ready || canExplainExactly) && now() >= (entry.evidenceRetryAt || 0)) {
        evidenceOnly.add(job.id); return true;
      }
      return false;
    });
    const analysis = changed.length ? await analyzeApplicant(supabase, nlp, id, { ...inputs, jobs: changed }) : null;
    // A failed evidence-only backfill must not downgrade previously valid semantic scores.
    const deferredEvidence = new Set(analysis?.aiDegraded ? evidenceOnly : []);
    const changedIds = new Set(changed.filter(job => !deferredEvidence.has(job.id)).map(job => job.id));
    const activeIds = new Set(inputs.jobs.map(job => job.id));
    const matches = [...saved.filter(row => activeIds.has(row.job_id) && !changedIds.has(row.job_id)),
      ...(analysis?.matches || []).filter(row => changedIds.has(row.job_id) && row.final_match_score >= MATCHING_THRESHOLD)];
    const titles = new Map(inputs.jobs.map(job => [job.id, job.title]));
    const existing = new Map((recommendationRows || []).map(row => [row.job_id, row]));
    const fingerprints = new Map(); const answered = new Map(); const reused = new Map(); const sources = new Map();
    for (const match of matches) {
      const gaps = skills([...match.missing_hard_skills, ...match.missing_soft_skills]);
      const fingerprint = recommendationFingerprint(gaps, match.education_score, titles.get(match.job_id), gemini.model);
      fingerprints.set(match.job_id, fingerprint);
      const row = existing.get(match.job_id);
      if (row?.fingerprint === fingerprint) {
        answered.set(match.job_id, row.recommendations); sources.set(match.job_id, row);
        try { validateRecommendations(row, gaps); reused.set(match.job_id, row); } catch { /* Repair only incomplete coaching. */ }
      } else if (row) {
        const prior = savedByJob.get(match.job_id);
        const priorGaps = prior && skills([...prior.missing_hard_skills, ...prior.missing_soft_skills]);
        // A changed gap list does not invalidate advice for an unchanged gap when its job/model context still matches.
        if (prior && prior.education_score === match.education_score && row.fingerprint ===
            recommendationFingerprint(priorGaps, prior.education_score, titles.get(match.job_id), gemini.model)) {
          answered.set(match.job_id, filterRecommendations(row, gaps)); sources.set(match.job_id, row);
        }
      }
    }
    const generated = new Set(matches.filter(match => {
      const gaps = skills([...match.missing_hard_skills, ...match.missing_soft_skills]);
      return filterRecommendations({ recommendations: answered.get(match.job_id) || [] }, gaps).length < gaps.length;
    }).map(match => match.job_id));
    // Prepare complete recommendations before replacing any existing results.
    const prepared = await completeRecommendations(gemini, recommendationPrompt, matches, answered, titles);
    const rows = prepared.map(({ match, items }) => reused.get(match.job_id) || ({
      applicant_id: id, job_id: match.job_id, fingerprint: fingerprints.get(match.job_id),
      recommendations: items, model: gemini.model, generated_at: generated.has(match.job_id) ? new Date().toISOString() : sources.get(match.job_id)?.generated_at || new Date().toISOString(),
    }));
    const replace = outputHash(matches) !== outputHash(saved);
    if (replace) check(await supabase.rpc('replace_applicant_matches', { p_applicant_id: id, p_matches: matches }));
    const writes = replace ? rows : rows.filter(row => !reused.has(row.job_id));
    if (writes.length) check(await supabase.from('skill_recommendations').upsert(writes, { onConflict: 'applicant_id,job_id' }));
    const persisted = replace ? await savedMatches(id) : saved;
    const qualified = new Set(matches.map(row => row.job_id));
    const persistedByJob = new Map(persisted.map(row => [row.job_id, row]));
    const membershipChanged = previous && hash(Object.keys(previous.jobs || {}).sort()) !== hash([...activeIds].sort());
    const jobs = Object.fromEntries(inputs.jobs.map(job => {
      const degraded = changedIds.has(job.id) ? Boolean(analysis?.aiDegraded) : Boolean(previous?.jobs?.[job.id]?.degraded);
      const evidence = !qualified.has(job.id) ? undefined : changedIds.has(job.id) ? {
        ...analysis.nlpAudit, audit: analysis.nlpAudit.audit.filter(row => row.job_id === job.id),
      } : evidenceValid(previous?.jobs?.[job.id], job) ? previous.jobs[job.id].evidence : undefined;
      return [job.id, { key: keys.get(job.id), qualified: qualified.has(job.id),
        ...(evidence ? { evidence, evidenceHash: hash(evidence) } : {}),
        evidenceRetryAt: deferredEvidence.has(job.id) ? now() + 60000 : evidence || changedIds.has(job.id) ? 0 : previous?.jobs?.[job.id]?.evidenceRetryAt || 0,
        outputHash: persistedByJob.has(job.id) ? outputHash([persistedByJob.get(job.id)]) : null, degraded,
        retryAt: changedIds.has(job.id) ? (degraded ? now() + 60000 : 0) : previous?.jobs?.[job.id]?.retryAt || 0 }];
    }).sort(([a], [b]) => a.localeCompare(b)));
    await cache.set(id, { outputHash: outputHash(persisted), baseConfigKey, providerKey, jobs });
    return { matchesFound: matches.length, recommendationsGenerated: generated.size,
      recommendationsReused: rows.filter(row => !generated.has(row.job_id)).length, recalculatedJobs: changed.length,
      cacheStatus: changedIds.size || replace || writes.length || membershipChanged ? 'updated' : 'reused',
      matchingKey: hash({ applicantKey, configKey, jobs: [...keys].sort() }),
      aiDegraded: Object.values(jobs).some(job => job.degraded),
      nlpAudit: changedIds.size ? { ...analysis.nlpAudit, audit: analysis.nlpAudit.audit.filter(row => changedIds.has(row.job_id)) } : undefined,
      jobAudits: Object.fromEntries(Object.entries(jobs).filter(([, entry]) => entry.evidence).map(([jobId, entry]) => [jobId, entry.evidence])),
      checkedAt: new Date(now()).toISOString() };
  }

  return { run(id, { force = false } = {}) {
    requireUuid(id);
    const current = pending.get(id);
    if (current) {
      if (!force || current.force) return current.promise;
      current.forced ||= current.promise.then(() => this.run(id, { force: true }), () => this.run(id, { force: true }));
      return current.forced;
    }
    const entry = { force };
    entry.promise = refresh(id, force).finally(() => { if (pending.get(id) === entry) pending.delete(id); });
    pending.set(id, entry);
    return entry.promise;
  } };
}

module.exports = { createMatchingRefresh, fileCache, recommendationFingerprint };
