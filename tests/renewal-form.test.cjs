const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeRenewalOcr } = require('../src/lib/renewalForm.ts');
test('new resume qualifications replace old values, including empty extracted skill categories', () => {
  const old = { email_address: 'same@example.invalid', first_name: 'Original', hard_skills: 'Old skill', soft_skills: 'Leadership', education: 'High School Graduate', course: 'Old', school: 'Old' };
  const next = mergeRenewalOcr(old, { first_name: 'Reviewed', email_address: 'different@example.invalid', hard_skills: 'C++\nC#\nJavaScript', education: 'College Graduate' });
  assert.equal(next.hard_skills, 'C++\nC#\nJavaScript');
  assert.equal(next.soft_skills, '');
  assert.equal(next.course, '');
  assert.equal(next.education, 'College Graduate');
  assert.equal(next.first_name, 'Reviewed');
  assert.equal(next.email_address, old.email_address);
  assert.equal(old.hard_skills, 'Old skill');
});
