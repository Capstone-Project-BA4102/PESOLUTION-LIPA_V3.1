const test = require('node:test');
const assert = require('node:assert/strict');
const { templateFor, sendNotification } = require('../backend/notifications.cjs');

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const APPLICATION_ID = '33333333-3333-4333-8333-333333333333';
const APPLICANT_ID = '44444444-4444-4444-8444-444444444444';

function event(status = 'Referred') {
  return {
    status,
    applicants: { full_name: 'Ana Reyes', email_address: 'ana@example.com' },
    applications: { job_listings: { title: 'Inventory Assistant', companies: { name: 'Lipa Retail Inc.' } } },
  };
}

test('status email templates use persisted applicant and application context', () => {
  const value = templateFor(event(), 'https://pesolution.example/applicant');
  assert.equal(value.recipientEmail, 'ana@example.com');
  assert.match(value.subject, /Inventory Assistant/);
  assert.match(value.text, /Lipa Retail Inc\./);
  assert.match(value.text, /Application status: Referred/);
  assert.match(value.html, /Open Applicant Portal/);
});

test('internal application statuses cannot produce applicant email', () => {
  assert.throws(() => templateFor(event('Referral Requested'), ''), /internal status/);
});

test('email HTML escapes persisted names and job fields', () => {
  const value = templateFor({
    ...event('Hired'),
    applicants: { full_name: '<img src=x onerror=alert(1)>', email_address: 'safe@example.com' },
  }, '');
  assert.doesNotMatch(value.html, /<img src=x/);
  assert.match(value.html, /&lt;img/);
});

function notificationStore(initial = null) {
  let notification = initial;
  const statusEvent = { id: EVENT_ID, applicant_id: APPLICANT_ID, application_id: APPLICATION_ID,
    status: 'Hired', applicants: event().applicants,
    applications: { id: APPLICATION_ID, applicant_id: APPLICANT_ID, status: 'Hired', ...event().applications } };
  const chain = terminal => ({
    select() { return this; }, eq() { return this; }, in() { return this; },
    maybeSingle: async () => ({ data: terminal(), error: null }),
    single: async () => ({ data: terminal(), error: null }),
  });
  return {
    get notification() { return notification; },
    from(table) {
      if (table === 'status_history') return chain(() => statusEvent);
      assert.equal(table, 'application_email_notifications');
      return {
        select() { return chain(() => notification); },
        insert(row) { notification = { id: '55555555-5555-4555-8555-555555555555', ...row }; return chain(() => notification); },
        update(values) {
          return {
            eq() { notification = { ...notification, ...values }; return this; },
            in() { return this; }, select() { return this; },
            then(resolve) { return Promise.resolve({ data: notification, error: null }).then(resolve); },
            single: async () => ({ data: notification, error: null }),
          };
        },
      };
    },
  };
}

test('a successful Brevo acceptance is persisted as Sent with the provider message ID', async () => {
  const supabase = notificationStore();
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ messageId: '<brevo-message-id>' }) };
  };
  try {
    const result = await sendNotification(supabase, { id: '11111111-1111-4111-8111-111111111111' }, EVENT_ID,
      { brevoApiKey: 'server-secret', brevoSenderEmail: 'peso@example.com', brevoSenderName: 'PESOLUTION', publicUrl: '' });
    assert.equal(result.email_status, 'Sent');
    assert.equal(result.provider_message_id, '<brevo-message-id>');
    assert.match(request.headers.idempotencyKey, /^[a-f0-9]{32}$/);
  } finally { global.fetch = originalFetch; }
});

test('an already sent status event returns its audit record without calling Brevo again', async () => {
  const existing = { id: '55555555-5555-4555-8555-555555555555', email_status: 'Sent', provider_message_id: '<existing>' };
  const supabase = notificationStore(existing);
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('Brevo must not be called for a duplicate event'); };
  try {
    const result = await sendNotification(supabase, { id: '11111111-1111-4111-8111-111111111111' }, EVENT_ID,
      { brevoApiKey: 'server-secret', brevoSenderEmail: 'peso@example.com', publicUrl: '' });
    assert.equal(result, existing);
  } finally { global.fetch = originalFetch; }
});

test('a rejected Brevo request is recorded as Failed and remains retryable', async () => {
  const supabase = notificationStore();
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 429, json: async () => ({ message: 'Rate limit reached' }) });
  try {
    await assert.rejects(
      sendNotification(supabase, { id: '11111111-1111-4111-8111-111111111111' }, EVENT_ID,
        { brevoApiKey: 'server-secret', brevoSenderEmail: 'peso@example.com', publicUrl: '' }),
      /could not send the email/,
    );
    assert.equal(supabase.notification.email_status, 'Failed');
    assert.match(supabase.notification.error_details, /Rate limit reached/);
  } finally { global.fetch = originalFetch; }
});

test('a failed event can be retried and accepted without creating a second audit row', async () => {
  const existing = { id: '55555555-5555-4555-8555-555555555555', email_status: 'Failed', error_details: 'Temporary failure' };
  const supabase = notificationStore(existing);
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ messageId: '<retry-message-id>' }) });
  try {
    const result = await sendNotification(supabase, { id: '11111111-1111-4111-8111-111111111111' }, EVENT_ID,
      { brevoApiKey: 'server-secret', brevoSenderEmail: 'peso@example.com', publicUrl: '' });
    assert.equal(result.email_status, 'Sent');
    assert.equal(result.provider_message_id, '<retry-message-id>');
    assert.equal(result.id, existing.id);
  } finally { global.fetch = originalFetch; }
});
