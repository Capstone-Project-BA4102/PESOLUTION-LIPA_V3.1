const test = require('node:test');
const assert = require('node:assert/strict');
const { renewApplicant, renewalContext } = require('../backend/renewals.cjs');
const id = '11111111-1111-4111-8111-111111111111';
const profile = '22222222-2222-4222-8222-222222222222';
const staffId = '33333333-3333-4333-8333-333333333333';
const request = '44444444-4444-4444-8444-444444444444';
const actor = { id: staffId, role: 'admin' };
const token = 'a'.repeat(32);
const input = { firstName: 'Synthetic', lastSurname: 'Applicant', emailAddress: 'synthetic@example.invalid', dateOfBirth: '1999-01-01',
  contactNumber: '09123456789', gender: 'Female', cityMunicipality: 'Lipa City', barangay: 'Balintawak', address: 'Balintawak, Lipa City',
  education: 'College Graduate', course: 'IT', school: 'Fixture', hardSkills: ['C++', 'SQL'], softSkills: ['Teamwork'] };
const resume = { base64: Buffer.from('%PDF-1.4 synthetic').toString('base64') };
const photo = { base64: Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64') };
const body = () => ({ requestId: request, expectedToken: token, confirmed: true, reviewed: true, input: { ...input }, files: { resume } });
function fixture(options = {}) {
  const calls = []; let saved = null;
  const context = { eligible: true, token, version: 0, snapshot: { applicant: { profile_id: profile, email_address: input.emailAddress }, resume: { hard_skills: ['C'], soft_skills: [] } }, ...options.context };
  const supabase = {
    auth: new Proxy({}, { get() { assert.fail('Renewal must never create/reset/delete an Auth account'); } }),
    from(table) {
      assert.equal(table, 'applicant_renewals');
      return { select() { return this; }, eq() { return this; }, async maybeSingle() { calls.push('dedupe'); return { data: saved, error: options.missing ? { code: '42P01' } : null }; } };
    },
    storage: { from(bucket) { return { async upload(path, bytes, settings) {
      calls.push({ bucket, path, bytes, settings }); return { error: options.uploadError || null };
    } }; } },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      if (name === 'get_peso_renewal_context') return { data: context };
      if (options.rpcError) return { error: options.rpcError };
      saved = { id: request, applicant_id: id, version_no: 1, payload_digest: args.p_payload_digest };
      return { data: saved };
    },
  };
  return { supabase, calls };
}
test('renewal saves reviewed qualifications, stages a new resume and optional photo, without creating an account', async () => {
  const f = fixture(); const payload = body(); payload.files.photo = photo;
  const result = await renewApplicant(f.supabase, actor, id, payload, async () => ({ source: 'existing evidence' }));
  assert.equal(result.version, 1);
  const files = f.calls.filter(call => call.bucket);
  assert.equal(files.length, 2);
  assert.equal(files[0].settings.upsert, false);
  assert.match(files[0].path, new RegExp(`^${profile}/renewal-${request}-[a-f0-9]{64}\\.pdf$`));
  const save = f.calls.find(call => call.rpc === 'complete_peso_renewal').args;
  assert.deepEqual(save.p_input.hardSkills, ['C++', 'SQL']);
  assert.deepEqual(save.p_input.softSkills, ['Teamwork']);
  assert.equal(save.p_input.education, 'College Graduate');
  assert.equal(save.p_input.emailAddress, input.emailAddress);
  assert.equal(save.p_recorded_evidence.source, 'existing evidence');
  assert.equal(save.p_avatar_path, files[1].path);
});
test('retrying a committed confirmation returns the same version without another upload', async () => {
  const f = fixture(); await renewApplicant(f.supabase, actor, id, body());
  const uploads = f.calls.filter(call => call.bucket).length;
  const replay = await renewApplicant(f.supabase, actor, id, body());
  assert.equal(replay.reused, true);
  assert.equal(f.calls.filter(call => call.bucket).length, uploads);
  const changed = body(); changed.input.hardSkills = ['Java'];
  await assert.rejects(renewApplicant(f.supabase, actor, id, changed), /already used/);
});
test('nonstaff, unconfirmed, missing resume, invalid skills and invalid barangays fail before writes', async () => {
  for (const [who, patch] of [
    [{ id: profile, role: 'applicant' }, {}], [actor, { confirmed: false }], [actor, { reviewed: false }],
    [actor, { files: {} }], [actor, { input: { ...input, hardSkills: 'C++' } }],
    [actor, { input: { ...input, barangay: 'invented' } }],
  ]) {
    const f = fixture(); await assert.rejects(renewApplicant(f.supabase, who, id, { ...body(), ...patch }));
    assert.equal(f.calls.filter(call => call.bucket || call.rpc === 'complete_peso_renewal').length, 0);
  }
});
test('stale forms, changed login emails and active referrals cannot silently overwrite the applicant', async () => {
  for (const options of [{ context: { token: 'b'.repeat(32) } }, { context: { eligible: false } }]) {
    const f = fixture(options); await assert.rejects(renewApplicant(f.supabase, actor, id, body()));
    assert.equal(f.calls.filter(call => call.bucket).length, 0);
  }
  const f = fixture(); const changed = body(); changed.input.emailAddress = 'another@example.invalid';
  await assert.rejects(renewApplicant(f.supabase, actor, id, changed), /existing login email/);
});
test('missing schema and RPC/upload failures never report a successful renewal', async () => {
  for (const options of [{ missing: true }, { uploadError: { message: 'Storage unavailable' } }, { rpcError: { code: '40001', message: 'Applicant changed' } }]) {
    const f = fixture(options); await assert.rejects(renewApplicant(f.supabase, actor, id, body()));
  }
  const f = fixture(); await assert.rejects(renewalContext(f.supabase, { ...actor, role: 'applicant' }, id), /authorized/);
});
