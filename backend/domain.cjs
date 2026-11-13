class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Postgres/PostgREST codes for a table a dated migration has not created yet. */
const MISSING_SCHEMA = ['42P01', 'PGRST204', 'PGRST205'];
/** Codes for a column a dated migration has not added yet, so the query can be retried without it. */
const MISSING_COLUMN = ['PGRST204', '42703'];

const MATCHING_WEIGHTS = Object.freeze({ hard: 0.5, soft: 0.3, education: 0.2 });
const MATCHING_THRESHOLD = 60;
const eduRank = { 'Elementary Graduate': 1, 'High School Graduate': 2, 'Senior High School': 3,
  'Vocational / TESDA': 4, 'College Undergraduate': 4, 'College Graduate': 5, 'Post Graduate': 6,
  'High School Undergraduate': 1, 'Vocational Graduate': 4 };
const text = value => typeof value === 'string' ? value.trim() : '';
const normalize = value => text(value).toLowerCase().replace(/\s+/g, ' ');
const skills = value => Array.isArray(value) ? [...new Map(value.map(text).filter(Boolean).map(s => [normalize(s), s])).values()].slice(0, 100) : [];
const requireUuid = value => { if (!UUID.test(value || '')) throw new HttpError(400, 'Invalid record ID.'); return value; };
const check = result => { if (result.error) throw new HttpError(503, 'Database operation failed. Check the database setup and permissions.'); return result.data; };

function scoreJobs(applicant, jobs, equivalences) {
  if (!Array.isArray(equivalences)) throw new HttpError(502, 'Invalid skill equivalence list.');
  return jobs.map(job => {
    const split = category => {
      const available = skills(applicant[`${category}_skills`]);
      const required = skills(job[`${category}_skills`]);
      const matched = required.filter(requiredSkill => available.some(availableSkill =>
        normalize(availableSkill) === normalize(requiredSkill) || equivalences.some(e =>
          e && e.job_id === job.id && e.category === category && e.equivalent === true &&
          normalize(e.applicant_skill) === normalize(availableSkill) && normalize(e.job_skill) === normalize(requiredSkill))));
      return { matched, missing: required.filter(s => !matched.includes(s)), score: required.length ? matched.length / required.length * 100 : 100 };
    };
    const hard = split('hard'); const soft = split('soft');
    const education = (eduRank[applicant.education] || 0) >= (eduRank[job.education] || 0) ? 100 : 0;
    return { applicant_id: applicant.id, job_id: job.id, hard_skill_score: hard.score, soft_skill_score: soft.score,
      education_score: education, final_match_score: hard.score * MATCHING_WEIGHTS.hard + soft.score * MATCHING_WEIGHTS.soft + education * MATCHING_WEIGHTS.education,
      matched_hard_skills: hard.matched, missing_hard_skills: hard.missing,
      matched_soft_skills: soft.matched, missing_soft_skills: soft.missing };
  });
}

function validateRegistration(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Applicant information is required.');
  for (const field of ['firstName', 'lastSurname', 'emailAddress', 'dateOfBirth', 'education', 'contactNumber']) {
    if (!text(input[field])) throw new HttpError(400, `Missing applicant field: ${field}.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(input.emailAddress))) throw new HttpError(400, 'Enter a valid email address.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth) || Number.isNaN(Date.parse(input.dateOfBirth)) || new Date(input.dateOfBirth).toISOString().slice(0, 10) !== input.dateOfBirth || new Date(input.dateOfBirth) > new Date()) {
    throw new HttpError(400, 'Enter a valid date of birth.');
  }
}

// Passwords only ever arrive from the applicant themselves now, so the strength rule is enforced
// on the change path rather than on a staff-typed registration field.
function validateNewPassword(password, currentPassword) {
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'The new password must have at least 8 characters.');
  if (password.length > 72) throw new HttpError(400, 'The new password must be 72 characters or fewer.');
  if (currentPassword && password === currentPassword) throw new HttpError(400, 'Choose a new password that differs from the one you use now.');
}

function decodeFile(file, kind) {
  if (!file || typeof file.base64 !== 'string') throw new HttpError(400, `${kind} file is required.`);
  const bytes = Buffer.from(file.base64, 'base64');
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new HttpError(400, `${kind} must be between 1 byte and 10 MB.`);
  const pdf = bytes.subarray(0, 5).toString() === '%PDF-';
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!(png || jpg || (kind === 'resume' && pdf))) throw new HttpError(400, `Unsupported ${kind} file. Use ${kind === 'resume' ? 'PDF, ' : ''}PNG or JPEG.`);
  return { bytes, mime: pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg', extension: pdf ? 'pdf' : png ? 'png' : 'jpg' };
}

const recommendationItems = value => (Array.isArray(value?.recommendations) ? value.recommendations : []).map(item => ({
  skill: text(item?.skill), action: text(item?.action), practice: text(item?.practice), training_topic: text(item?.training_topic) }));

// Keeps only suggestions that answer a rule-verified gap, so a partial Gemini
// answer is still useful instead of being thrown away.
function filterRecommendations(value, gaps) {
  const covered = new Set(gaps.map(normalize));
  const items = recommendationItems(value).filter(item => covered.has(normalize(item.skill)) &&
    item.action && item.practice && item.training_topic && Object.values(item).every(entry => entry.length <= 1500));
  return [...new Map(items.map(item => [normalize(item.skill), item])).values()];
}

function validateRecommendations(value, gaps) {
  if (!value || !Array.isArray(value.recommendations)) throw new HttpError(502, 'Gemini returned invalid recommendations.');
  const covered = new Set(gaps.map(normalize));
  if (recommendationItems(value).some(item => !covered.has(normalize(item.skill)))) throw new HttpError(502, 'Gemini recommendations did not match the verified skill gaps. Please retry.');
  const items = filterRecommendations(value, gaps);
  if (gaps.some(gap => !items.some(item => normalize(item.skill) === normalize(gap)))) throw new HttpError(502, 'Gemini did not provide an action for every skill gap. Please retry.');
  return items;
}

module.exports = { HttpError, text, normalize, skills, requireUuid, check, scoreJobs, validateRegistration, validateNewPassword, decodeFile, filterRecommendations, validateRecommendations, MATCHING_WEIGHTS, MATCHING_THRESHOLD, MISSING_SCHEMA, MISSING_COLUMN };
