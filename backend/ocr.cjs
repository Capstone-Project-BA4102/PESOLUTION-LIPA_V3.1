const { text } = require('./domain.cjs');

const normalizeKey = value => text(value).toLowerCase().replace(/\s+/g, ' ');

function stringSkills(value) {
  if (!Array.isArray(value)) return [];
  return [...new Map(value
    .map(item => text(typeof item === 'string' ? item : item?.skill || item?.name))
    .filter(Boolean)
    .map(skill => [normalizeKey(skill), skill])).values()];
}

function normalizeOcrResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const hard = stringSkills(value.hard_skills);
  const soft = stringSkills(value.soft_skills);
  const hardKeys = new Set(hard.map(normalizeKey));
  const softKeys = new Set(soft.map(normalizeKey));
  const ambiguous = [];

  for (const item of Array.isArray(value.ambiguous_skills) ? value.ambiguous_skills : []) {
    const skill = text(typeof item === 'string' ? item : item?.skill || item?.name);
    if (!skill) continue;
    const category = String(item?.suggested_category || item?.category || '').toLowerCase();
    const confidence = Number(item?.confidence);
    ambiguous.push({
      skill,
      suggested_category: ['hard', 'soft'].includes(category) ? category : null,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : null,
      reason: text(item?.reason).slice(0, 300),
      source_context: text(item?.source_context || item?.source).slice(0, 300),
    });
  }

  for (const skill of hard.filter(item => softKeys.has(normalizeKey(item)))) {
    ambiguous.push({ skill, suggested_category: null, confidence: null,
      reason: 'The OCR response placed this skill in both categories.', source_context: '' });
    hardKeys.delete(normalizeKey(skill));
    softKeys.delete(normalizeKey(skill));
  }

  const ambiguousKeys = new Set();
  const cleanedAmbiguous = ambiguous.filter(item => {
    const key = normalizeKey(item.skill);
    if (!key || ambiguousKeys.has(key)) return false;
    ambiguousKeys.add(key);
    return true;
  });

  return {
    ...value,
    hard_skills: hard.filter(skill => hardKeys.has(normalizeKey(skill)) && !ambiguousKeys.has(normalizeKey(skill))),
    soft_skills: soft.filter(skill => softKeys.has(normalizeKey(skill)) && !ambiguousKeys.has(normalizeKey(skill))),
    ambiguous_skills: cleanedAmbiguous,
  };
}

module.exports = { normalizeOcrResult };
