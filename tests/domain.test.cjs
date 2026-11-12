const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreJobs, validateRecommendations, decodeFile, validateRegistration, validateNewPassword } = require('../backend/domain.cjs');
const { validateContent } = require('../backend/content.cjs');
const { evaluateDataset } = require('../backend/evaluation.cjs');

test('scoring preserves weighting and accepts only same-category, supplied equivalences', () => {
  const [match] = scoreJobs({ id: 'a', education: 'College Graduate', hard_skills: ['MS Excel'], soft_skills: ['Communication'] },
    [{ id: 'j', education: 'College Graduate', hard_skills: ['Microsoft Excel','Python'], soft_skills: ['Communication'] }],
    [{ job_id: 'j', category: 'hard', applicant_skill: 'MS Excel', job_skill: 'Microsoft Excel', equivalent: true }]);
  assert.equal(match.final_match_score, 75);
  assert.equal(match.hard_skill_score, 50);
  assert.deepEqual(match.missing_hard_skills, ['Python']);
});
test('duplicate required skills do not inflate matching scores', () => {
  const [match] = scoreJobs({ id: 'a', hard_skills: ['Excel'], soft_skills: [] }, [{ id: 'j', hard_skills: ['Excel','excel','SQL'], soft_skills: [] }], []);
  assert.equal(match.hard_skill_score, 50);
});
test('recommendations must cover every verified gap and cannot invent new ones', () => {
  assert.throws(() => validateRecommendations({ recommendations: [{ skill: 'Java', action: 'Learn', practice: 'Build', training_topic: 'Java' }] }, ['Excel']), /verified skill gaps/);
  assert.throws(() => validateRecommendations({ recommendations: [] }, ['Excel']), /every skill gap/);
  assert.equal(validateRecommendations({ recommendations: [{ skill: 'Excel', action: 'Learn formulas', practice: 'Build a budget', training_topic: 'Spreadsheet basics' }] }, ['Excel']).length, 1);
});
test('uploads enforce content signatures and registration validates required values', () => {
  assert.throws(() => decodeFile({ base64: Buffer.from('not a pdf').toString('base64') }, 'resume'), /Unsupported/);
  assert.throws(() => decodeFile({ base64: Buffer.from('%PDF-1.7').toString('base64') }, 'photo'), /Unsupported/);
  assert.throws(() => validateRegistration({ firstName: 'Sample' }), /Missing applicant field/);
});
test('registration rejects impossible calendar dates', () => {
  assert.throws(() => validateRegistration({ firstName: 'Sample', lastSurname: 'Fixture', emailAddress: 'sample@example.com', contactNumber: '09000000000', education: 'College Graduate', dateOfBirth: '2000-02-30' }), /date of birth/);
});
test('a chosen password must be long enough and different from the current one', () => {
  assert.throws(() => validateNewPassword('shorty'), /at least 8 characters/);
  assert.throws(() => validateNewPassword('brand-new-password', 'brand-new-password'), /differs from the one you use now/);
  validateNewPassword('brand-new-password', 'printed-receipt-12');
});
const label = (id, expected, predictedScore) => ({ id, sourceId: id, split: 'test', validatedBy: 'Test validator', validatedAt: '2026-10-12', expected, predictedScore });
test('matching evaluation calculates confusion matrix including negatives and threshold boundary', () => {
  const result = evaluateDataset({ kind: 'matching', records: [label('1', true, 60), label('2', false, 70), label('3', true, 50), label('4', false, 20)] });
  assert.deepEqual(result.counts, { tp: 1, tn: 1, fp: 1, fn: 1 });
  assert.deepEqual(result.metrics, { accuracy: 0.5, precision: 0.5, recall: 0.5, f1: 0.5 });
});
test('OCR evaluation compares annotated fields and counts skill omissions and additions', () => {
  const result = evaluateDataset({ kind: 'ocr', records: [{ ...label('1', { first_name: 'Juan', hard_skills: ['Excel','SQL'] }, 0), predicted: { first_name: ' juan ', hard_skills: ['excel','Python'] } }] });
  assert.equal(result.fieldAccuracy, 0.5);
  assert.deepEqual(result.skillCounts, { tp: 1, fp: 1, fn: 1 });
  assert.equal(result.skillMetrics.f1, 0.5);
});
test('evaluation rejects split leakage, empty tests, and unvalidated labels', () => {
  assert.throws(() => evaluateDataset({ kind: 'matching', records: [label('1', true, 70), { ...label('2', false, 50), sourceId: '1', split: 'development' }] }), /same source/);
  assert.throws(() => evaluateDataset({ kind: 'matching', records: [{ ...label('1', true, 70), split: 'development' }] }), /No validated test/);
  assert.throws(() => evaluateDataset({ kind: 'matching', records: [{ ...label('1', true, 70), validatedBy: '' }] }), /validator/);
});
test('undefined metrics are reported as null, not fabricated perfect scores', () => {
  const result = evaluateDataset({ kind: 'matching', records: [label('1', false, 20)] });
  assert.equal(result.metrics.precision, null);
  assert.equal(result.metrics.recall, null);
  assert.equal(result.metrics.f1, null);
});
test('public content rejects unsafe links and invalid training entries', () => {
  assert.throws(() => validateContent({ title: 'PESO', tagline: 'Lipa', facebookUrl: 'javascript:alert(1)' }), /HTTPS/);
});
test('public content requires testimonial consent and validates service photos', () => {
  const base = { title: 'PESO', tagline: 'Lipa', services: [], announcements: [], trainingCatalog: [], testimonials: [] };
  assert.throws(() => validateContent({ ...base, testimonials: [{ id: 't1', name: 'Applicant', role: 'Hired', quote: 'Approved quote' }] }), /consent/);
  const withPhoto = validateContent({ ...base, services: [{ id: 's1', title: 'Job Matching', description: 'Referral assistance',
    imageUrl: 'https://example.com/media.jpg' }] });
  assert.equal(withPhoto.services[0].imageUrl, 'https://example.com/media.jpg');
  assert.equal(withPhoto.services[0].description, 'Referral assistance');
  assert.equal(validateContent({ ...base, services: [{ id: 's2', title: 'Walk-in', description: '', imageUrl: '' }] }).services[0].imageUrl, '');
  assert.throws(() => validateContent({ ...base, services: [{ id: 's3', title: 'Bad', description: '', imageUrl: 'javascript:alert(1)' }] }), /HTTPS/);
});
