const test=require('node:test'),assert=require('node:assert/strict');
const {summaryReportTables,reportDate}=require('../src/lib/summaryReportTables.ts');
test('complete table report retains all eight sections and actual counts, outcomes, hard/soft measures and activity details',()=>{
 const report={label:'Fixture',generatedAt:'2026-11-14T04:00:00Z',kpis:{matchesGenerated:{cur:7,prev:5},renewals:{cur:2,prev:2},declined:{cur:1,prev:0}},placementLog:[{date:'2026-11-14',action:'Not Hired',applicant:'Niño Peña',job:'Clerk',company:'Fixture Company',ref:'TEST',note:'Recorded outcome'}],demographics:{gender:[{label:'Not recorded',count:1}]},market:{activeCompanies:2,topIndustries:[{label:'IT',count:3}]},commonSkills:{applicantHard:[{label:'C++',count:2}],requiredSoft:[{label:'Teamwork',count:4}]},skillsGap:{avgScore:null,matchesAnalyzed:0},adminAudit:[{time:'2026-11-14T04:00:00Z',type:'job',title:'Updated',desc:'Description',meta:'Extra details'}]};
 const copy=structuredClone(report),sections=summaryReportTables(report);assert.equal(sections.length,8);assert.deepEqual(sections[0].rows[0],['Saved matches',7,5,'+2']);assert.ok(sections[1].rows[0].includes('Niño Peña'));assert.ok(sections[1].rows[0].includes('TEST\nRecorded outcome'));
 assert.ok(sections[5].rows.some(row=>row[1]==='Hard'&&row[2]==='C++'&&row[3]===2));assert.ok(sections[5].rows.some(row=>row[1]==='Soft'&&row[3]===4));assert.equal(sections[6].rows[0][2],'Not available');assert.equal(sections[6].rows[1][2],0);assert.equal(sections[7].rows[0][3],'Description\nExtra details');assert.deepEqual(report,copy);
 for(const section of sections){assert.equal(section.widths.length,section.columns.length);assert.ok(section.rows.every(row=>row.length===section.columns.length))}
});
test('empty or partial reports keep sections and unknown values without inventing zero scores or training advice',()=>{
 const sections=summaryReportTables({label:'Empty',generatedAt:'invalid'});assert.equal(sections.length,8);assert.equal(sections[0].rows[0][1],undefined);assert.equal(sections[6].rows[0][2],'Not available');assert.equal(reportDate('invalid'),'Not recorded');assert.equal(reportDate('2026-10-31T16:00:00Z'),'Nov 1, 2026');
});

test('text-table renderer paginates long rows with repeated headings and keeps a valid A4 PDF',()=>{
 const fs=require('node:fs');const {renderSummaryReportPdf}=require('../src/lib/summaryReportPdf.ts');
 const assets={normal:fs.readFileSync('public/fonts/LiberationSans-Regular.ttf').toString('base64'),bold:fs.readFileSync('public/fonts/LiberationSans-Bold.ttf').toString('base64')};
 const report={label:'Synthetic period',generatedAt:'2026-11-14T04:00:00Z',adminAudit:Array.from({length:5},(_,i)=>({time:'2026-11-14T04:00:00Z',type:'job',title:'Synthetic action '+i,desc:(i===0?'Niño Peña ':'Verification record ').repeat(i===0?800:30)+' END OF ROW '+i}))};
 const pdf=renderSummaryReportPdf(report,'weekly',assets);assert.ok(pdf.getNumberOfPages()>3);assert.ok(pdf.getNumberOfPages()<30);assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-595.28)<0.1);const bytes=Buffer.from(pdf.output('arraybuffer'));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
});
