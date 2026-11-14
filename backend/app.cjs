const express = require('express');
const { employmentAnalytics } = require('./employment-analytics.cjs');
const { manageReferral } = require('./referrals.cjs');
const cors = require('cors');
const path = require('node:path');
const { authentication, requireRole, applicantAccess } = require('./auth.cjs');
const { HttpError, check, normalize, skills, requireUuid, decodeFile, validateRecommendations, MISSING_SCHEMA, MISSING_COLUMN } = require('./domain.cjs');
const { OCR_PROMPT, recommendationPrompt } = require('./prompts.cjs');
const { normalizeOcrResult } = require('./ocr.cjs');
const { createMatchingRefresh, recommendationFingerprint } = require('./matching-refresh.cjs');
const { validateContent } = require('./content.cjs');
const { registerApplicant } = require('./registration.cjs');
const { feedbackEligibility, markFeedbackEvent, submitFeedback, reclassifyPending, feedbackAnalytics } = require('./feedback.cjs');
const { listNotificationEvents, listCurrentNotificationEvents, previewNotification, sendNotification } = require('./notifications.cjs');
const { sendAccountEmail } = require('./account-email.cjs');
const { changePassword, issueNewCredential, logReceiptEvent } = require('./credentials.cjs');

function createApp({ supabase, gemini, nlp, config, matchingCache }) {
  const matchingRefresh = createMatchingRefresh({ supabase, gemini, nlp, cache: matchingCache });
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || config.origins.includes(origin)) }));
  app.use(express.json({ limit: '32mb' }));
  const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  const available = () => { if (!supabase) throw new HttpError(503, 'Supabase backend configuration is missing.'); };
  const authenticate = authentication(supabase);
  const admin = requireRole('admin');
  const budgets = new Map();
  const rateLimit = (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of budgets) if (value.until < now) budgets.delete(key);
    const key = req.actor.id;
    const bucket = budgets.get(key) || { count: 0, until: now + 60000 };
    if (++bucket.count > 12) return next(new HttpError(429, 'Too many AI requests. Please wait one minute.'));
    budgets.set(key, bucket); next();
  };
  const locks = new Set();
  const withLock = async (key, fn) => {
    if (locks.has(key)) throw new HttpError(409, 'This request is already processing. Please wait.');
    locks.add(key); try { return await fn(); } finally { locks.delete(key); }
  };
  // Cached recommendations are keyed on the verified gaps, so the one-click
  // matching run and the per-job generate action must hash identically.
  const fingerprintFor = (gaps, educationScore, title) =>
    recommendationFingerprint(gaps, educationScore, title, gemini.model);

  app.post('/api/admin/referrals/manage', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    res.json(await manageReferral(supabase, req.actor, req.body));
  }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', version: config.version }));
  app.get('/api/applicant/feedback', authenticate, requireRole('applicant'), asyncRoute(async (req, res) => {
    res.json(await feedbackEligibility(supabase, req.actor));
  }));
  app.post('/api/applicant/feedback/:applicationId/acknowledge', authenticate, requireRole('applicant'), asyncRoute(async (req, res) => {
    res.json(await markFeedbackEvent(supabase, req.actor, req.params.applicationId, 'acknowledge'));
  }));
  app.post('/api/applicant/feedback/:applicationId/dismiss', authenticate, requireRole('applicant'), asyncRoute(async (req, res) => {
    res.json(await markFeedbackEvent(supabase, req.actor, req.params.applicationId, 'dismiss'));
  }));
  app.post('/api/applicant/feedback/:applicationId/submit', authenticate, requireRole('applicant'), asyncRoute(async (req, res) => {
    res.status(201).json(await withLock(`feedback:${req.params.applicationId}`, () => submitFeedback(supabase, req.actor,
      { ...req.body, applicationId: req.params.applicationId }, config)));
  }));
  app.get('/api/admin/employment-analytics', authenticate, admin, asyncRoute(async (req, res) => {
    res.json(await employmentAnalytics(supabase, req.query));
  }));
  app.get('/api/admin/feedback-analytics', authenticate, admin, asyncRoute(async (req, res) => {
    res.json(await feedbackAnalytics(supabase, config));
  }));
  app.post('/api/admin/feedback/reclassify', authenticate, admin, asyncRoute(async (req, res) => {
    res.json(await withLock('feedback:reclassify', () => reclassifyPending(supabase, config)));
  }));
  app.get('/api/admin/applicants/:applicantId/status-events', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    res.json(await listNotificationEvents(supabase, req.params.applicantId));
  }));
  app.post('/api/admin/status-events/current', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    res.json(await listCurrentNotificationEvents(supabase, req.body?.applicantIds));
  }));
  app.post('/api/admin/setup-emails/current', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    const ids = [...new Set((Array.isArray(req.body?.applicantIds) ? req.body.applicantIds : []).map(requireUuid))];
    if (ids.length > 50) throw new HttpError(400, 'A maximum of 50 applicants may be checked at once.');
    if (!ids.length) return res.json([]);
    const result = await supabase.from('applicant_account_email_notifications')
      .select('id,applicant_id,email_status,provider_message_id,error_details,sent_at,updated_at')
      .in('applicant_id', ids).eq('email_kind', 'setup');
    if (result.error && ['42P01', 'PGRST204', 'PGRST205'].includes(result.error.code)) return res.json([]);
    res.json(check(result) || []);
  }));
  app.get('/api/admin/status-events/:eventId/email-preview', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    res.json(await previewNotification(supabase, req.params.eventId, config));
  }));
  app.post('/api/admin/status-events/:eventId/email', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    const eventId = requireUuid(req.params.eventId);
    res.json(await withLock(`status-email:${eventId}`, () => sendNotification(supabase, req.actor, eventId, config)));
  }));
  app.post('/api/admin/applicants/:applicantId/setup-email', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    const applicantId = requireUuid(req.params.applicantId);
    const applicant = check(await supabase.from('applicants')
      .select('id,profile_id,full_name,email_address')
      .eq('id', applicantId).single());
    const existingResult = await supabase.from('applicant_account_email_notifications')
      .select('*').eq('applicant_id', applicantId).eq('email_kind', 'setup').maybeSingle();
    if (existingResult.error && ['42P01', 'PGRST204', 'PGRST205'].includes(existingResult.error.code)) {
      throw new HttpError(503, 'Account email history is not set up yet. Apply the applicant account email migration first.');
    }
    if (existingResult.error) throw new HttpError(503, 'Unable to verify the account email history.');
    const existing = existingResult.data;
    if (existing?.email_status === 'Sending') throw new HttpError(409, 'This welcome email is already being processed.');
    // The welcome email carries no expiring token, so staff may resend it any time the
    // applicant needs the sign-in instructions again.
    const row = { applicant_id: applicantId, recipient_email: applicant.email_address, email_kind: 'setup',
      email_status: 'Sending', provider: 'brevo', sent_by: req.actor.id, provider_message_id: null,
      error_details: null, sent_at: null, updated_at: new Date().toISOString() };
    const notification = existing
      ? check(await supabase.from('applicant_account_email_notifications').update(row).eq('id', existing.id).select('*').single())
      : check(await supabase.from('applicant_account_email_notifications').insert(row).select('*').single());
    try {
      const result = await withLock(`setup-email:${applicantId}`, () => sendAccountEmail({
        id: applicant.profile_id || applicant.id,
        email: applicant.email_address,
        name: applicant.full_name,
      }, config));
      res.json(check(await supabase.from('applicant_account_email_notifications').update({ email_status: 'Sent',
        provider_message_id: result.providerMessageId, sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        error_details: null }).eq('id', notification.id).select('*').single()));
    } catch (error) {
      console.error('Applicant setup email failed:', error);
      await supabase.from('applicant_account_email_notifications').update({ email_status: 'Failed',
        error_details: String(error.message || error).slice(0, 2000), updated_at: new Date().toISOString() }).eq('id', notification.id);
      throw error instanceof HttpError ? error : new HttpError(502, String(error.message || error).slice(0, 500));
    }
  }));
  app.get('/api/admin/applicants/:applicantId/account-receipts', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    const applicantId = requireUuid(req.params.applicantId);
    const withSerial = await supabase.from('applicant_account_receipts')
      .select('id,action,staff_id,serial_number,created_at').eq('applicant_id', applicantId)
      .order('created_at', { ascending: false }).limit(20);
    // serial_number only exists once 20261024_receipt_serial_number.sql is applied.
    const receiptsResult = withSerial.error && MISSING_COLUMN.includes(withSerial.error.code)
      ? await supabase.from('applicant_account_receipts')
        .select('id,action,staff_id,created_at').eq('applicant_id', applicantId)
        .order('created_at', { ascending: false }).limit(20)
      : withSerial;
    // Before 20261023_applicant_account_receipts.sql is applied the timeline simply has no receipt entries.
    if (receiptsResult.error && MISSING_SCHEMA.includes(receiptsResult.error.code)) return res.json([]);
    const receipts = check(receiptsResult) || [];
    const staffIds = [...new Set(receipts.map(row => row.staff_id).filter(Boolean))];
    const staff = staffIds.length ? check(await supabase.from('profiles')
      .select('id,first_name,middle_surname,last_surname').in('id', staffIds)) || [] : [];
    const nameOf = id => {
      const profile = staff.find(row => row.id === id);
      return profile ? [profile.first_name, profile.last_surname].filter(Boolean).join(' ') || 'PESO staff' : 'PESO staff';
    };
    // Opening a receipt is a credential-hand-over event, so it is audited even though nothing
    // sensitive is left to read: initial passwords are printed once and never stored.
    const applicant = check(await supabase.from('applicants')
      .select('id,applicant_code,full_name').eq('id', applicantId).maybeSingle());
    if (applicant) {
      const latest = receipts.find(row => row.serial_number) || receipts[0];
      await logReceiptEvent(supabase, req.actor, applicant, 'Account receipt opened',
        `${applicant.full_name || 'Name not recorded'} (${applicant.applicant_code || 'no applicant code'}) — `
        + `${receipts.length} hand-over ${receipts.length === 1 ? 'event' : 'events'} on file, `
        + `latest ${latest?.serial_number || 'without a serial'} issued ${latest ? new Date(latest.created_at).toLocaleDateString('en-CA') : 'never'}.`);
    }
    res.json(receipts.map(row => ({ ...row, staff_name: nameOf(row.staff_id) })));
  }));
  app.post('/api/admin/applicants/:applicantId/credential-receipt', authenticate, admin, asyncRoute(async (req, res) => {
    available();
    const applicantId = requireUuid(req.params.applicantId);
    res.status(201).json(await withLock(`credential:${applicantId}`, () => issueNewCredential(supabase, req.actor, applicantId)));
  }));
  app.post('/api/applicant/password-change', authenticate, requireRole('applicant'), rateLimit, asyncRoute(async (req, res) => {
    available();
    res.json(await withLock(`password:${req.actor.id}`, () => changePassword(supabase, config, req.actor, req.body)));
  }));
  app.get('/api/public/site', asyncRoute(async (req, res) => {
    available();
    const contentResult = await supabase.from('site_content').select('content, updated_at').eq('id', 'public').eq('published', true).maybeSingle();
    if (contentResult.error && !['42P01', 'PGRST205'].includes(contentResult.error.code)) check(contentResult);
    const jobs = check(await supabase.from('job_listings').select('id, vacancies').eq('status', 'Active')) || [];
    const approved = check(await supabase.from('hired_application_feedback')
      .select('id,feedback_text,public_story_display_name,submitted_at,applications(job_listings(title))')
      .eq('public_story_consent', true).not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }).limit(6)) || [];
    res.json({ content: contentResult.data?.content || null, updatedAt: contentResult.data?.updated_at || null,
      jobs: jobs.length, vacancies: jobs.reduce((sum, job) => sum + Math.max(0, Number(job.vacancies) || 0), 0),
      approvedTestimonials: approved.map(row => ({ id: `feedback-${row.id}`, name: row.public_story_display_name || 'PESOLUTION Applicant',
        role: row.applications?.job_listings?.title || 'Hired applicant', quote: row.feedback_text })) });
  }));
  app.post('/api/registrations/walk-in', authenticate, admin, asyncRoute(async (req, res) => {
    res.status(201).json(await withLock(`registration:${String(req.body?.input?.emailAddress).toLowerCase()}`, () => registerApplicant(supabase, req.body, config, req.actor.id)));
  }));
  app.post('/api/ocr-resume', authenticate, admin, rateLimit, asyncRoute(async (req, res) => {
    const file = decodeFile(req.body, 'resume');
    const value = await gemini.request([{ role: 'user', parts: [{ inlineData: { mimeType: file.mime, data: file.bytes.toString('base64') } }, { text: OCR_PROMPT }] }],
      { resume: true, attempts: 2, timeoutMs: 90000 });
    const normalized = normalizeOcrResult(value);
    if (!normalized) throw new HttpError(502, 'OCR returned invalid data.');
    res.json(normalized);
  }));
  app.post('/api/match/:applicantId', authenticate, admin, rateLimit, asyncRoute(async (req, res) => {
    const applicantId = requireUuid(req.params.applicantId);
    if (req.body?.force !== undefined && typeof req.body.force !== 'boolean') throw new HttpError(400, 'force must be a boolean.');
    // Existing callers retain force-refresh behavior; automatic checks explicitly send false.
    res.json(await matchingRefresh.run(applicantId, { force: req.body?.force !== false }));
  }));
  app.post('/api/applicant/match/:applicantId', authenticate, requireRole('applicant'), rateLimit, asyncRoute(async (req, res) => {
    const applicantId = requireUuid(req.params.applicantId);
    await applicantAccess(supabase, req.actor, applicantId);
    if (req.body?.force !== undefined && req.body.force !== false) throw new HttpError(400, 'Applicant matching reuses valid results; force refresh is reserved for staff.');
    res.json(await matchingRefresh.run(applicantId, { force: false }));
  }));
  const recommendationContext = async req => {
    const applicantId = requireUuid(req.params.applicantId); const jobId = requireUuid(req.params.jobId);
    await applicantAccess(supabase, req.actor, applicantId);
    const match = check(await supabase.from('job_matches').select('*, job_listings(title, status)').eq('applicant_id', applicantId).eq('job_id', jobId).maybeSingle());
    if (!match || match.job_listings?.status !== 'Active') throw new HttpError(404, 'An active job match is required.');
    const gaps = skills([...(match.missing_hard_skills || []), ...(match.missing_soft_skills || [])]);
    return { applicantId, jobId, match, gaps, fingerprint: fingerprintFor(gaps, match.education_score, match.job_listings.title) };
  };
  app.get('/api/applicants/:applicantId/jobs/:jobId/recommendations', authenticate, asyncRoute(async (req, res) => {
    const c = await recommendationContext(req);
    res.json(check(await supabase.from('skill_recommendations').select('*').eq('applicant_id', c.applicantId).eq('job_id', c.jobId).eq('fingerprint', c.fingerprint).maybeSingle()));
  }));
  app.post('/api/applicants/:applicantId/jobs/:jobId/recommendations', authenticate, rateLimit, asyncRoute(async (req, res) => {
    const c = await recommendationContext(req);
    const saved = await withLock(`recommendation:${c.applicantId}:${c.jobId}`, async () => {
      const existing = check(await supabase.from('skill_recommendations').select('*').eq('applicant_id', c.applicantId).eq('job_id', c.jobId).eq('fingerprint', c.fingerprint).maybeSingle());
      const cached = Array.isArray(existing?.recommendations) ? existing.recommendations : [];
      const answered = new Set(cached.map(item => normalize(item?.skill)));
      const missing = c.gaps.filter(gap => !answered.has(normalize(gap)));
      if (existing && !missing.length) return existing;
      const items = missing.length ? validateRecommendations(await gemini.request(recommendationPrompt(c.match.job_listings, missing)), missing) : [];
      return check(await supabase.from('skill_recommendations').upsert({ applicant_id: c.applicantId, job_id: c.jobId,
        fingerprint: c.fingerprint, recommendations: [...cached, ...items], model: gemini.model, generated_at: new Date().toISOString() },
        { onConflict: 'applicant_id,job_id' }).select('*').single());
    });
    res.json(saved);
  }));
  app.get('/api/admin/site-content', authenticate, admin, asyncRoute(async (req, res) => {
    res.json(check(await supabase.from('site_content').select('*').eq('id', 'public').maybeSingle()));
  }));
  app.put('/api/admin/site-content', authenticate, admin, asyncRoute(async (req, res) => {
    const content = validateContent(req.body?.content);
    if (typeof req.body.published !== 'boolean') throw new HttpError(400, 'Publication status must be true or false.');
    // Older office-content clients must not erase the configured referral manager.
    if (!Object.hasOwn(content, 'referralSignatoryName')) {
      const current = check(await supabase.from('site_content').select('content').eq('id', 'public').maybeSingle());
      if (current?.content?.referralSignatoryName) content.referralSignatoryName = current.content.referralSignatoryName;
    }
    res.json(check(await supabase.from('site_content').upsert({ id: 'public', content, published: req.body.published,
      updated_by: req.actor.id, updated_at: new Date().toISOString() }).select('*').single()));
  }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => res.sendFile(path.join(dist, 'index.html'), error => error && next(error)));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof HttpError ? error.status : error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ error: error instanceof HttpError ? error.message : status === 413 ? 'Uploaded files exceed the request limit.' : status === 400 ? 'Invalid request data.' : 'The request could not be completed.' });
  });
  return app;
}
module.exports = { createApp };
