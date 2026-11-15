const test = require('node:test');
const assert = require('node:assert/strict');
const { removeFeedbackReview } = require('../backend/feedback-moderation.cjs');
const { feedbackAnalytics, reclassifyPending } = require('../backend/feedback.cjs');
const { createApp } = require('../backend/app.cjs');
const id = '11111111-1111-4111-8111-111111111111';
const staffId = '22222222-2222-4222-8222-222222222222';
const applicantId = '33333333-3333-4333-8333-333333333333';
const actor = { id: staffId, email: 'synthetic@example.invalid', role: 'admin' };
const input = { feedbackId: id, confirmed: true };
const timestamp = '2026-11-14T10:00:00Z';

function database(options = {}) {
  const state = { row: { id, application_id: 'application-fixture', applicant_id: applicantId, submitted_at: '2026-11-10T09:00:00Z',
    rating: 5, feedback_text: 'Synthetic positive service review.', congratulations_acknowledged_at: '2026-11-10T08:00:00Z',
    invitation_dismissed_at: null, sentiment_status: 'classified', sentiment_label: 'positive', sentiment_confidence: .9,
    public_story_consent: true, public_story_display_name: 'Synthetic applicant', ...options.row }, updates: [], audit: [], queries: [] };
  const supabase = {
    auth: { getUser: async token => ({ data: { user: { id: token === 'admin' ? staffId : applicantId } } }) },
    from(table) {
      state.queries.push(table);
      const filters = {}, notNull = [], chain = {
        select() { return this; }, eq(key, value) { filters[key] = value; return this; }, not(key) { notNull.push(key); return this; },
        order() { return this; }, or() { return this; }, limit() { return this; },
        update(values) { this.patch = values; return this; },
        async insert(values) { state.audit.push(values); return { error: options.auditError ? { message: 'Synthetic audit failure' } : null }; },
        result(single = false) {
          if (table === 'admins') return { data: filters.profile_id === staffId ? { id: 'admin-fixture' } : null };
          if (table === 'applications') return { data: [], count: 1 };
          assert.equal(table, 'hired_application_feedback');
          const matches = state.row && Object.entries(filters).every(([key, value]) => state.row[key] === value) && notNull.every(key => state.row[key] != null);
          if (!matches || options.missing) return { data: single ? null : [], error: null };
          if (this.patch) {
            if (options.stale) return { data: null, error: null };
            if (options.writeError) return { error: { message: 'Synthetic storage failure' } };
            state.updates.push(this.patch); Object.assign(state.row, this.patch);
          }
          return { data: single ? { ...state.row } : [{ ...state.row }], error: null };
        },
        async maybeSingle() { return this.result(true); },
        then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); },
      };
      return chain;
    },
  };
  return { supabase, state };
}

test('review removal requires an admin, explicit confirmation and one valid record ID before any database access', async () => {
  const db = { from: assert.fail };
  await assert.rejects(removeFeedbackReview(db, { ...actor, role: 'applicant' }, input), error => error.status === 403);
  await assert.rejects(removeFeedbackReview(db, actor, { ...input, confirmed: false }), error => error.status === 400);
  for (const feedbackId of ['invalid', [id, id], null]) await assert.rejects(removeFeedbackReview(db, actor, { ...input, feedbackId }));
});

test('only selected review contents are removed; acknowledgement, linked employment and history remain untouched', async () => {
  const { supabase, state } = database();
  const acknowledged = state.row.congratulations_acknowledged_at;
  const result = await removeFeedbackReview(supabase, actor, input, () => timestamp);
  assert.deepEqual(result, { id, removed: true, removedAt: timestamp, auditRecorded: true });
  assert.equal(state.updates.length, 1);
  for (const key of ['rating','feedback_text','submitted_at','sentiment_label','sentiment_confidence','sentiment_model','public_story_display_name']) assert.equal(state.row[key], null);
  assert.equal(state.row.public_story_consent, false);
  assert.equal(state.row.congratulations_acknowledged_at, acknowledged);
  assert.equal(state.row.invitation_dismissed_at, timestamp);
  assert.equal(state.row.application_id, 'application-fixture');
  assert.ok(state.queries.every(table => ['hired_application_feedback','activity_logs'].includes(table)));
  assert.equal(state.audit[0].actor, actor.email);
  assert.match(state.audit[0].description, new RegExp(staffId));
  assert.match(state.audit[0].description, new RegExp(timestamp));
});

test('removed reviews disappear from sentiment analytics and are never reclassified as pending comments', async () => {
  const { supabase, state } = database();
  await removeFeedbackReview(supabase, actor, input, () => timestamp);
  const analytics = await feedbackAnalytics(supabase, {});
  assert.equal(analytics.total, 0);
  assert.equal(analytics.pending, 0);
  assert.deepEqual(analytics.records, []);
  assert.equal(analytics.eligible, 1);
  assert.equal(analytics.averageRating, null);
  const replay = await reclassifyPending(supabase, {});
  assert.equal(replay.checked, 0);
  assert.equal(state.updates.length, 1);
});

test('missing, stale and storage failures do not claim successful removal or write an activity', async () => {
  for (const options of [{ missing: true }, { stale: true }, { writeError: true }]) {
    const { supabase, state } = database(options);
    await assert.rejects(removeFeedbackReview(supabase, actor, input));
    assert.equal(state.audit.length, 0);
    assert.equal(state.updates.length, 0);
  }
});

test('a saved removal reports audit unavailability honestly and preserves previous dismissal', async () => {
  const dismissed = '2026-11-09T12:00:00Z';
  const { supabase, state } = database({ auditError: true, row: { invitation_dismissed_at: dismissed } });
  const result = await removeFeedbackReview(supabase, actor, input);
  assert.equal(result.removed, true); assert.equal(result.auditRecorded, false);
  assert.equal(state.row.invitation_dismissed_at, dismissed);
});

test('the HTTP removal route rejects missing sessions, applicant roles and missing confirmation; allows verified staff only', async () => {
  const { supabase, state } = database();
  const server = createApp({ supabase, gemini: { model: 'fixture' }, config: { origins: [], version: 'test' }, matchingCache: new Map() }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/admin/feedback/${id}`;
  const request = (token, confirmed) => fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ confirmed }) });
  try {
    assert.equal((await request(null, true)).status, 401);
    assert.equal((await request('applicant', true)).status, 403);
    assert.equal((await request('admin', false)).status, 400);
    assert.equal(state.updates.length, 0);
    const response = await request('admin', true);
    assert.equal(response.status, 200); assert.equal((await response.json()).removed, true);
    assert.equal(state.updates.length, 1);
    assert.equal((await request('admin', true)).status, 404);
    assert.equal(state.updates.length, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
