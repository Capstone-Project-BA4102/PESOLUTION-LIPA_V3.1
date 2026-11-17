const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../backend/app.cjs');

async function serve(supabase, run) {
  const app = createApp({ supabase, gemini: { model: 'fixture' }, config: { origins: [], version: 'test' } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('retired feedback endpoints cannot read, write, delete or invoke inference', async () => {
  const supabase = {
    from() { assert.fail('Retired endpoint accessed the database'); },
    auth: { getUser() { assert.fail('Retired endpoint authenticated a request'); } },
  };
  await serve(supabase, async base => {
    for (const [method, path] of [
      ['GET', '/api/applicant/feedback'],
      ['POST', '/api/applicant/feedback/fixture/acknowledge'],
      ['POST', '/api/applicant/feedback/fixture/dismiss'],
      ['POST', '/api/applicant/feedback/fixture/submit'],
      ['GET', '/api/admin/feedback-analytics'],
      ['POST', '/api/admin/feedback/reclassify'],
      ['DELETE', '/api/admin/feedback/fixture'],
    ]) {
      const response = await fetch(base + path, { method });
      assert.equal(response.status, 404, `${method} ${path}`);
    }
    const health = await (await fetch(base + '/api/health')).json();
    assert.equal(health.status, 'ok');
    assert.equal(Object.hasOwn(health, 'sentiment'), false);
  });
});

test('public site still serves office and vacancy data without accessing reviews', async () => {
  const queries = [];
  const supabase = { from(table) {
    queries.push(table);
    assert.ok(['site_content', 'job_listings'].includes(table));
    const chain = {
      select() { return chain; }, eq() { return chain; }, maybeSingle() { return chain; },
      then(resolve) { resolve({ data: table === 'site_content'
        ? { content: { title: 'PESO', testimonials: [{ quote: 'Historical review' }] } }
        : [{ id: 'job', vacancies: 2 }], error: null }); },
    };
    return chain;
  } };
  await serve(supabase, async base => {
    const response = await fetch(base + '/api/public/site');
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.jobs, 1);
    assert.equal(result.vacancies, 2);
    assert.equal(Object.hasOwn(result, 'approvedTestimonials'), false);
    assert.equal(result.content.title, 'PESO');
    assert.equal(Object.hasOwn(result.content, 'testimonials'), false);
    assert.deepEqual(queries, ['site_content', 'job_listings']);
  });
});
