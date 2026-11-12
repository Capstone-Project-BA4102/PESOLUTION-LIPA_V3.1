const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../backend/app.cjs');

async function withApp(fn) {
  const supabase = {
    auth: { getUser: async token => ({ data: { user: token === 'invalid' ? null : { id: '11111111-1111-4111-8111-111111111111', app_metadata: {}, user_metadata: { role: 'admin' } } }, error: null }) },
    from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: null }) }),
  };
  const app = createApp({ supabase, gemini: { model: 'test', request: async () => { throw new Error('AI must not be called'); } }, config: { origins: [], version: 'test' } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('AI and account-creation endpoints deny missing and invalid sessions', async () => {
  await withApp(async url => {
    for (const path of ['/api/ocr-resume','/api/match/11111111-1111-4111-8111-111111111111','/api/registrations/walk-in','/api/admin/status-events/22222222-2222-4222-8222-222222222222/email']) {
      assert.equal((await fetch(url + path, { method: 'POST' })).status, 401);
      assert.equal((await fetch(url + path, { method: 'POST', headers: { Authorization: 'Bearer invalid' } })).status, 401);
    }
  });
});
test('applicants cannot run admin operations through editable user metadata', async () => {
  await withApp(async url => {
    const options = { headers: { Authorization: 'Bearer applicant' } };
    assert.equal((await fetch(url + '/api/admin/site-content', options)).status, 403);
    assert.equal((await fetch(url + '/api/registrations/walk-in', { ...options, method: 'POST' })).status, 403);
    assert.equal((await fetch(url + '/api/admin/status-events/22222222-2222-4222-8222-222222222222/email', { ...options, method: 'POST' })).status, 403);
  });
});
test('an applicant cannot retrieve another applicant recommendation record', async () => {
  await withApp(async url => {
    const response = await fetch(url + '/api/applicants/22222222-2222-4222-8222-222222222222/jobs/33333333-3333-4333-8333-333333333333/recommendations', { headers: { Authorization: 'Bearer applicant' } });
    assert.equal(response.status, 403);
  });
});
