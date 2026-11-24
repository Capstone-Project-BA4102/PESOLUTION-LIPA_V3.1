const test = require('node:test');
const assert = require('node:assert/strict');
const { previewReferralEmails, sendReferralEmails } = require('../backend/referral-emails.cjs');
const REF = '22222222-2222-4222-8222-222222222222';
const EVENT = '33333333-3333-4333-8333-333333333333';
const ACTOR = { role: 'admin', id: '11111111-1111-4111-8111-111111111111' };
const CONFIG = { brevoApiKey: 'test-only', brevoSenderEmail: 'peso@example.com', publicUrl: 'https://portal.example.com' };
function store() {
  const company = { id: 'company', name: 'Demo Company', email: 'hr@example.com', location: 'Lipa City' };
  const applicant = { full_name: 'Demo Applicant', email_address: 'applicant@example.com', contact_number: '09000000000' };
  const application = { id: 'application', applicant_id: 'applicant', status: 'Referred', applicants: applicant, job_listings: { title: 'Office Assistant', companies: company } };
  const ref = { id: REF, application_id: application.id, referral_number: 'REF-2026-0001', date_issued: '2026-11-24T00:00:00Z', applications: application };
  const event = { id: EVENT, application_id: application.id, applicant_id: 'applicant', status: 'Referred', applicants: applicant, applications: application };
  const state = { applicant: null, company: null, ref, event };
  return { state, from(table) {
    let mode = 'read', values, filters = [];
    const key = table === 'company_referral_emails' ? 'company' : 'applicant';
    const q = { select() { return q; }, eq(k,v) { filters.push([k,v]); return q; }, in(k,v) { filters.push([k,v]); return q; }, order() { return q; }, limit() { return q; },
      insert(v) { mode='insert'; values=v; return q; }, update(v) { mode='update'; values=v; return q; }, single: run, maybeSingle: run,
      then(resolve,reject) { return run().then(resolve,reject); } };
    async function run() {
      if (table === 'referrals') return { data: state.ref };
      if (table === 'status_history') return { data: state.event };
      if (mode === 'insert') {
        if (state[key]) return { error: { code: '23505' } };
        state[key] = { id: key, ...values };
      }
      if (mode === 'update') {
        if (!filters.every(([k,v]) => Array.isArray(v) ? v.includes(state[key]?.[k]) : state[key]?.[k]===v)) return { data: null };
        Object.assign(state[key],values);
      }
      return { data: state[key] && {...state[key]} };
    }
    return q;
  } };
}
function body(preview, recipients = ['applicant','company']) {
  return { confirmed: true, recipients, fingerprints: Object.fromEntries(recipients.map(kind => [kind,preview.recipients[kind].fingerprint])) };
}
test('dual preview prepares both recipients without writes and a missing company email does not block applicant', async () => {
  const db=store(); let p=await previewReferralEmails(db,REF,CONFIG);
  assert.equal(p.recipients.applicant.canSend,true); assert.equal(p.recipients.company.canSend,true);
  assert.equal(db.state.applicant,null); assert.equal(db.state.company,null);
  assert.equal(Buffer.from(p.pdfBase64,'base64').subarray(0,5).toString(),'%PDF-');
  db.state.ref.applications.job_listings.companies.email='';
  p=await previewReferralEmails(db,REF,CONFIG);
  assert.equal(p.recipients.company.available,false); assert.equal(p.recipients.applicant.canSend,true);
});
test('one explicit confirmation sends two separate messages, one PDF each, never CC/BCC', async () => {
  const db=store();const p=await previewReferralEmails(db,REF,CONFIG);const original=global.fetch;const calls=[];
  global.fetch=async (_,options)=>{ const payload=JSON.parse(options.body);calls.push(payload);return {ok:true,status:201,json:async()=>({messageId:`msg-${calls.length}`})}; };
  try {
    const result=await sendReferralEmails(db,ACTOR,REF,body(p),CONFIG);
    assert.ok(result.outcomes.applicant.success);assert.ok(result.outcomes.company.success);
    assert.deepEqual(calls.map(c=>c.to[0].email),['applicant@example.com','hr@example.com']);
    for(const call of calls){assert.equal(call.to.length,1);assert.equal(call.cc,undefined);assert.equal(call.bcc,undefined);assert.equal(call.attachment.length,1);assert.match(call.attachment[0].name,/\.pdf$/);}
    assert.notEqual(calls[0].subject,calls[1].subject);
    const next=await previewReferralEmails(db,REF,CONFIG);
    assert.equal(next.recipients.applicant.canSend,false);assert.equal(next.recipients.company.canSend,false);
  } finally {global.fetch=original;}
});
test('partial failure retries only the failed recipient and keeps existing applicant receipt', async () => {
  const db=store();const p=await previewReferralEmails(db,REF,CONFIG);const original=global.fetch;let applicantCalls=0,companyCalls=0;
  global.fetch=async (_,options)=>{const payload=JSON.parse(options.body);if(payload.to[0].email==='applicant@example.com'){applicantCalls++;return {ok:true,status:201,json:async()=>({messageId:'app-sent'})};}companyCalls++;return companyCalls===1?{ok:false,status:400,json:async()=>({})}:{ok:true,status:201,json:async()=>({messageId:'company-sent'})};};
  try {
    const first=await sendReferralEmails(db,ACTOR,REF,body(p),CONFIG);assert.equal(first.outcomes.applicant.success,true);assert.equal(first.outcomes.company.success,false);
    const next=await previewReferralEmails(db,REF,CONFIG);assert.equal(next.recipients.applicant.canSend,false);assert.equal(next.recipients.company.canSend,true);
    const retry=await sendReferralEmails(db,ACTOR,REF,body(next,['company']),CONFIG);assert.equal(retry.outcomes.company.success,true);
    assert.equal(applicantCalls,1);assert.equal(companyCalls,2);assert.equal(db.state.applicant.provider_message_id,'app-sent');
  } finally {global.fetch=original;}
});
test('empty/forged selection and stale previews never send any recipient', async () => {
  const db=store();const p=await previewReferralEmails(db,REF,CONFIG);const original=global.fetch;global.fetch=assert.fail;
  try {
    await assert.rejects(sendReferralEmails(db,ACTOR,REF,{confirmed:true,recipients:[]},CONFIG),/Select/);
    await assert.rejects(sendReferralEmails(db,ACTOR,REF,{confirmed:true,recipients:['other']},CONFIG),/Select/);
    db.state.ref.applications.job_listings.companies.email='changed@example.com';
    await assert.rejects(sendReferralEmails(db,ACTOR,REF,body(p),CONFIG),/changed/);
    assert.equal(db.state.applicant,null);
  } finally {global.fetch=original;}
});
test('unselected recipient receives nothing; uncertain applicant delivery is blocked against retry', async () => {
  const db=store();const p=await previewReferralEmails(db,REF,CONFIG);const original=global.fetch;global.fetch=async()=>{throw Error('timeout');};
  try {
    const result=await sendReferralEmails(db,ACTOR,REF,body(p,['applicant']),CONFIG);
    assert.equal(result.outcomes.applicant.success,false);assert.equal(result.outcomes.company,undefined);
    assert.equal(db.state.company,null);assert.equal(db.state.applicant.email_status,'Queued');
    const next=await previewReferralEmails(db,REF,CONFIG);assert.equal(next.recipients.applicant.canSend,false);assert.equal(next.recipients.company.canSend,true);
  } finally {global.fetch=original;}
});
