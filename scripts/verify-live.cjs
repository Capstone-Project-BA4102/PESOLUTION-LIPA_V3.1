const { URL } = require('node:url');

/** Read-only deployment smoke checks. No login, writes, model calls or paid probes. */
async function verifyLive({ baseUrl = 'http://127.0.0.1:5000', accessToken = '', fetchImpl = fetch } = {}) {
  const parsed = new URL(baseUrl);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Use a backend origin only, such as http://127.0.0.1:5000. Do not include credentials or query parameters.');
  }
  const results = [];
  const request = async (route, token = '') => {
    try {
      return await fetchImpl(`${parsed.origin}${route}`, { method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(15000) });
    } catch { throw new Error(`Backend connection failed while checking ${route}.`); }
  };
  const health = await request('/api/health');
  const healthValue = await health.json().catch(() => null);
  if (!health.ok || healthValue?.status !== 'ok') throw new Error('Backend health check did not report ready.');
  results.push('Backend health');
  const publicSite = await request('/api/public/site');
  if (!publicSite.ok) throw new Error(`Public site read failed (HTTP ${publicSite.status}). Verify backend database configuration.`);
  results.push('Public site read');
  for (const route of ['/api/admin/site-content', '/api/admin/employment-analytics']) {
    const anonymous = await request(route);
    if (![401, 403].includes(anonymous.status)) throw new Error(`Anonymous access boundary failed for ${route} (HTTP ${anonymous.status}).`);
    if (accessToken) {
      const authorized = await request(route, accessToken);
      if (!authorized.ok) throw new Error(`Authorized staff read failed for ${route} (HTTP ${authorized.status}).`);
    }
  }
  results.push('Anonymous administrative access denied');
  if (accessToken) results.push('Authorized staff reads');
  return { readOnly: true, checks: results, authenticatedStaffChecked: Boolean(accessToken) };
}
async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('Usage: npm run verify:live -- [--url http://127.0.0.1:5000]');
    console.log('Optional backend-only VERIFICATION_ACCESS_TOKEN enables staff read checks. All requests use GET.');
    return;
  }
  let baseUrl = process.env.VERIFICATION_BACKEND_URL || 'http://127.0.0.1:5000';
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--url' || !args[i + 1]) throw new Error('Unsupported option. Legacy --probe and --predictions actions are retired; use --help.');
    baseUrl = args[++i];
  }
  const result = await verifyLive({ baseUrl, accessToken: process.env.VERIFICATION_ACCESS_TOKEN || '' });
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyLive, main };
