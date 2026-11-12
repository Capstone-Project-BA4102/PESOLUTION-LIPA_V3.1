const { randomInt } = require('node:crypto');
const { HttpError, text, check, validateNewPassword, MISSING_SCHEMA, MISSING_COLUMN } = require('./domain.cjs');

// Initial passwords are generated here, printed once on the account receipt, and never stored,
// so no database view, backup, or key can hand a usable credential back to anybody.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PASSWORD_LENGTH = 12;
const CHANGES_PER_WEEK = 3;

function generateInitialPassword() {
  return Array.from({ length: PASSWORD_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

function authReady(config) {
  if (!config?.supabaseUrl || !config?.publishableKey) {
    throw new HttpError(503, 'Supabase Authentication is not configured on the server.');
  }
}

// Only GoTrue can confirm a password, and the service-role client cannot, so the backend performs
// the same password grant a signed-in applicant's browser would.
async function passwordGrant(config, email, password) {
  authReady(config);
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.publishableKey },
    body: JSON.stringify({ email, password }),
  });
  // 403, not 401: the applicant's own session is still valid, and a 401 answer makes the browser
  // throw it away, so one mistyped current password would sign everybody out.
  if (!response.ok) throw new HttpError(403, 'Your current password is incorrect.');
  const session = await response.json().catch(() => null);
  if (!session?.access_token) throw new HttpError(502, 'Supabase did not return a sign-in session. Please try again.');
  return session.access_token;
}

async function applyPassword(config, accessToken, password) {
  authReady(config);
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', apikey: config.publishableKey, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new HttpError(502, 'Your password could not be updated. Please try again.');
}

async function applicantOf(supabase, profileId) {
  const result = await supabase.from('applicants').select('id,profile_id,applicant_code,full_name,email_address')
    .eq('profile_id', profileId).maybeSingle();
  if (result.error) throw new HttpError(503, 'Unable to load your applicant record.');
  if (!result.data) throw new HttpError(403, 'This action is only available to applicant accounts.');
  return result.data;
}

// The append-only change history drives the weekly budget and is the record that a real,
// server-verified change happened, so a client can neither fake it nor skip it.
async function usedThisWeek(supabase, profileId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = await supabase.from('applicant_password_changes')
    .select('id', { count: 'exact', head: true }).eq('profile_id', profileId).gt('changed_at', since);
  if (result.error && MISSING_SCHEMA.includes(result.error.code)) {
    throw new HttpError(503, 'Password change history is not set up yet. Apply 20261025_password_change_weekly_limit.sql first.');
  }
  if (result.error) throw new HttpError(503, 'Unable to check your password change allowance.');
  return result.count || 0;
}

// GoTrue has already applied the new password by the time these two writes run, so a database
// blip must leave the applicant a clean retry instead of a half-recorded change. Transient
// failures are retried, and a stamp that still cannot be written rolls its history row back, so
// the failed attempt does not spend one of the three weekly changes.
const FINAL_ERRORS = ['42501', 'PGRST301', ...MISSING_SCHEMA, ...MISSING_COLUMN];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function writeWithRetry(run) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await run();
    if (!result.error) return result;
    last = result.error;
    if (FINAL_ERRORS.includes(last.code)) break;
    if (attempt < 3) await sleep(150 * attempt);
  }
  throw last;
}

const RECORDING_FAILED = 'Your new password already works, but the portal could not record the change. Please change it once more from Profile to finish; this attempt was not counted against your weekly limit.';

function recordingFailed(error) {
  console.error('Password change could not be recorded:', error?.code || error?.message || error);
  return new HttpError(503, RECORDING_FAILED);
}

async function recordChange(supabase, applicant, changedAt) {
  let historyId;
  try {
    const inserted = await writeWithRetry(() => supabase.from('applicant_password_changes')
      .insert({ profile_id: applicant.profile_id, changed_at: changedAt }).select('id').single());
    historyId = inserted.data?.id;
  } catch (error) {
    throw recordingFailed(error);
  }
  try {
    await writeWithRetry(() => supabase.from('applicants')
      .update({ password_changed_at: changedAt }).eq('id', applicant.id));
  } catch (error) {
    if (historyId) {
      const rolledBack = await supabase.from('applicant_password_changes').delete().eq('id', historyId);
      if (rolledBack.error) console.error('Password change history rollback failed:', rolledBack.error.code || rolledBack.error.message);
    }
    throw recordingFailed(error);
  }
}

/**
 * Replaces the password printed on the account receipt with one the applicant chose. The new
 * password is applied through the session that only a correct current password can open, so the
 * recorded change is proof the applicant really holds the credential.
 */
async function changePassword(supabase, config, actor, body) {
  const applicant = await applicantOf(supabase, actor.id);
  const currentPassword = String(body?.currentPassword || '');
  const newPassword = String(body?.newPassword || '');
  validateNewPassword(newPassword, currentPassword);
  const accessToken = await passwordGrant(config, applicant.email_address, currentPassword);
  const used = await usedThisWeek(supabase, applicant.profile_id);
  if (used >= CHANGES_PER_WEEK) {
    throw new HttpError(429, `You have used all ${CHANGES_PER_WEEK} password changes for this week. Please try again in a few days.`);
  }
  await applyPassword(config, accessToken, newPassword);
  const changedAt = new Date().toISOString();
  await recordChange(supabase, applicant, changedAt);
  return { changedAt, usedThisWeek: used + 1, remaining: CHANGES_PER_WEEK - used - 1 };
}

/**
 * A lost receipt is replaced, not recovered: staff generate a brand new initial password, which
 * invalidates whatever the applicant used before and re-arms the first-login change prompt.
 */
async function issueNewCredential(supabase, actor, applicantId) {
  const found = await supabase.from('applicants')
    .select('id,profile_id,applicant_code,full_name,email_address').eq('id', applicantId).maybeSingle();
  check(found);
  if (!found.data) throw new HttpError(404, 'No applicant record found.');
  const applicant = found.data;
  if (!applicant.profile_id) throw new HttpError(409, 'This applicant has no portal login account to reset.');
  const initialPassword = generateInitialPassword();
  const updated = await supabase.auth.admin.updateUserById(applicant.profile_id, { password: initialPassword });
  if (updated.error) throw new HttpError(502, 'The new password could not be applied to this applicant account.');
  check(await supabase.from('applicants').update({ password_changed_at: null }).eq('id', applicant.id));
  const receipt = await recordAccountReceipt(supabase, applicant.id, 'reissued', actor.id);
  await logReceiptEvent(supabase, actor, applicant,
    'New initial password issued', `A replacement initial password was generated for ${applicant.full_name || 'the applicant'} (${applicant.applicant_code || 'no code'}) and printed on receipt ${receipt?.serial_number || 'without a serial'}. The previous password no longer works.`);
  return {
    applicantId: applicant.id, profileId: applicant.profile_id, code: applicant.applicant_code || '',
    fullName: applicant.full_name || '', email: applicant.email_address || '',
    initialPassword, issuedAt: new Date().toISOString(), receiptSerial: receipt?.serial_number || null,
  };
}

async function recordAccountReceipt(supabase, applicantId, action, staffId) {
  const row = { applicant_id: applicantId, action, staff_id: staffId || null };
  const inserted = await supabase.from('applicant_account_receipts').insert(row).select('id,created_at,serial_number').single();
  // serial_number only exists once 20261024_receipt_serial_number.sql is applied.
  const result = inserted.error && MISSING_COLUMN.includes(inserted.error.code)
    ? await supabase.from('applicant_account_receipts').insert(row).select('id,created_at').single()
    : inserted;
  if (result.error && !MISSING_SCHEMA.includes(result.error.code)) console.error('Account receipt log failed:', result.error);
  return result.data || null;
}

/** Receipt access is audited without ever carrying a credential, since none is stored. */
async function logReceiptEvent(supabase, actor, applicant, title, description) {
  const result = await supabase.from('activity_logs').insert({
    actor: text(actor?.email) || 'PESO staff', type: 'applicant', title, description,
  });
  if (result.error) console.error('Receipt audit log failed:', result.error.code || result.error.message);
}

module.exports = {
  ALPHABET, CHANGES_PER_WEEK, PASSWORD_LENGTH, generateInitialPassword, changePassword,
  issueNewCredential, recordAccountReceipt, logReceiptEvent,
};
