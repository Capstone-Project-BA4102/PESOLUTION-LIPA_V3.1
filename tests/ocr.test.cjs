const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOcrResult } = require('../backend/ocr.cjs');

test('OCR normalization preserves categories and queues ambiguous skills', () => {
  const result = normalizeOcrResult({
    hard_skills: ['Microsoft Excel', 'Cash Handling'],
    soft_skills: ['Communication'],
    ambiguous_skills: [{ skill: 'Project Management', suggested_category: 'hard', confidence: 0.62, reason: 'Context dependent' }],
  });
  assert.deepEqual(result.hard_skills, ['Microsoft Excel', 'Cash Handling']);
  assert.deepEqual(result.soft_skills, ['Communication']);
  assert.deepEqual(result.ambiguous_skills[0], {
    skill: 'Project Management', suggested_category: 'hard', confidence: 0.62,
    reason: 'Context dependent', source_context: '',
  });
});

test('OCR normalization sends cross-category duplicates to human review', () => {
  const result = normalizeOcrResult({ hard_skills: ['Negotiation'], soft_skills: ['negotiation'] });
  assert.deepEqual(result.hard_skills, []);
  assert.deepEqual(result.soft_skills, []);
  assert.equal(result.ambiguous_skills[0].skill, 'Negotiation');
});

test('OCR normalization keeps complete skill phrases containing commas', () => {
  const result = normalizeOcrResult({ hard_skills: ['MS Office (Word, Excel, PowerPoint, Access)'] });
  assert.deepEqual(result.hard_skills, ['MS Office (Word, Excel, PowerPoint, Access)']);
});
