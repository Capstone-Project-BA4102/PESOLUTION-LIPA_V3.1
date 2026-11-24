const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(api,request){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/applicantEmailData.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:module.exports,require:name=>name==='./api'?api:{backendRequest:request}});return module.exports.fetchApplicantEmailData;}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
test('email bundle waits for status, welcome and both-recipient checks before publishing actual actions',async()=>{
 const events=deferred(),welcome=deferred(),referral=deferred();let published=false,calls=0;
 const read=load({fetchCurrentApplicantStatusEvents:()=>events.promise,fetchApplicantSetupEmailStatuses:()=>welcome.promise},async()=>{calls++;return referral.promise;});
 const pending=read(['a','b']).then(value=>{published=true;return value;});
 events.resolve([{applicantId:'a',applicationId:'app',status:'Referred'}]);await new Promise(r=>setImmediate(r));assert.equal(published,false);assert.equal(calls,0);
 welcome.resolve([{applicant_id:'b',email_status:'Sent'}]);await new Promise(r=>setImmediate(r));assert.equal(published,false);assert.equal(calls,1);
 referral.resolve({referralId:'ref',recipients:{applicant:{available:true,notification:{email_status:'Sent'}},company:{available:true,notification:null}}});
 const value=await pending;assert.equal(value.events.a.status,'Referred');assert.equal(value.setupEmails.b.email_status,'Sent');assert.equal(value.referralStatuses.a.recipients.applicant.notification.email_status,'Sent');
});
test('a status-history failure remains explicit while successful welcome receipts are available',async()=>{
 const read=load({fetchCurrentApplicantStatusEvents:async()=>{throw Error('offline');},fetchApplicantSetupEmailStatuses:async()=>[{applicant_id:'a',email_status:'Sent'}]},assert.fail);
 const value=await read(['a']);assert.match(value.statusErrors.a,/could not be checked/);assert.equal(value.events.a,undefined);
 assert.equal(value.setupEmails.a.email_status,'Sent');assert.equal(value.setupErrors.a,undefined);assert.match(value.notice,/Applicant records are still available/);
});
test('a welcome lookup failure does not disable valid status email actions',async()=>{
 const read=load({fetchCurrentApplicantStatusEvents:async()=>[{applicantId:'a',status:'Hired',notification:{email_status:'Sent'}}],fetchApplicantSetupEmailStatuses:async()=>{throw Error('offline');}},assert.fail);
 const value=await read(['a']);assert.equal(value.events.a.notification.email_status,'Sent');assert.equal(value.statusErrors.a,undefined);assert.match(value.setupErrors.a,/could not be checked/);
});
test('one unavailable referral check is explicit without discarding other applicants email states',async()=>{
 const read=load({fetchCurrentApplicantStatusEvents:async()=>[{applicantId:'a',applicationId:'app',status:'Referred'},{applicantId:'b',status:'Hired',notification:{email_status:'Sent'}}],fetchApplicantSetupEmailStatuses:async()=>[]},async()=>{throw Error('not available');});
 const value=await read(['a','b']);assert.match(value.referralErrors.a,/could not be checked/);assert.equal(value.referralStatuses.a,undefined);assert.equal(value.events.b.notification.email_status,'Sent');
});
