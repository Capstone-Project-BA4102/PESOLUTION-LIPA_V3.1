const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyLive, main } = require('../scripts/verify-live.cjs');

function fixture() {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.method, 'GET');
    const route = new URL(url).pathname;
    assert.ok(['/api/health', '/api/public/site', '/api/admin/site-content', '/api/admin/employment-analytics'].includes(route));
    if (route.startsWith('/api/admin/') && !options.headers.Authorization) return { status: 401, ok: false };
    return { status: 200, ok: true, json: async () => ({ status: 'ok' }) };
  };
  return { calls, fetchImpl };
}
test('live verification performs only current read-only HTTP checks without signing in or calling models', async () => {
  const f = fixture();
  const result = await verifyLive({ fetchImpl: f.fetchImpl });
  assert.equal(result.readOnly, true);
  assert.equal(result.authenticatedStaffChecked, false);
  assert.equal(f.calls.length, 4);
  assert.ok(f.calls.every(call => !call.options.headers.Authorization));
});
test('optional staff checks send the supplied access token only in headers and never return it', async () => {
  const f = fixture();
  const result = await verifyLive({ fetchImpl: f.fetchImpl, accessToken: 'synthetic-secret' });
  assert.equal(result.authenticatedStaffChecked, true);
  assert.equal(f.calls.filter(call => call.options.headers.Authorization).length, 2);
  assert.equal(JSON.stringify(result).includes('synthetic-secret'), false);
});
test('anonymous access failures are not reported as successful deployment verification', async () => {
  await assert.rejects(verifyLive({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }) }), /Anonymous access boundary failed/);
});
test('credential URLs and retired write/probe flags are rejected before network access', async () => {
  for (const baseUrl of ['https://user:secret@example.invalid', 'https://example.invalid?secret=value', 'file:///tmp/test']) {
    await assert.rejects(verifyLive({ baseUrl, fetchImpl: () => assert.fail('must not request') }), /backend origin only/);
  }
  for (const flag of ['--probe', '--predictions', '--unknown']) await assert.rejects(main([flag]), /Unsupported option/);
});
test('network errors do not expose raw exception contents or credentials', async () => {
  await assert.rejects(verifyLive({ fetchImpl: async () => { throw new Error('synthetic-private-value'); } }), error => !error.message.includes('synthetic-private-value'));
});
