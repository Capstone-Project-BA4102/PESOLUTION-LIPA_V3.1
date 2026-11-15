const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {analyticsViewSections,analyticsScopeSummary,buildAnalyticsViewCsv,renderAnalyticsViewPdf}=require('../src/lib/analyticsViewReport.ts');

const fixture={
  registrations:[{label:'2026-10',count:4},{label:'2026-11',count:6}],
  filters:{from:'2026-10-01',to:'2026-11-15',barangay:'',education:'',company:'c1',jobStatus:'Active'},
  generatedAt:'2026-11-15T04:00:00Z',
  totals:{applicants:10,listings:8,availableListings:5,availablePositions:12,matchedApplicants:6,matchPairs:9},
  demographics:{
    gender:[{label:'Female',count:6,percentage:60},{label:'Male',count:4,percentage:40}],
    education:[{label:'College',count:7,percentage:70}],
    barangay:[{label:'Poblacion',count:10,percentage:100}],
    status:[{label:'Referred',count:3,percentage:30}],
  },
  demand:{
    monthly:[{label:'2026-10',count:3},{label:'2026-11',count:5}],
    status:[{label:'Active',count:8}],industry:[{label:'IT',count:5}],
    company:[{label:'Fixture Company',count:8}],positions:[{label:'Clerk',count:4}],
  },
  skills:{
    hard:[{label:'Excel',count:5}],soft:[{label:'Teamwork',count:4}],
    missingHard:[{label:'SQL',count:2}],missingSoft:[{label:'Communication',count:3}],
  },
  options:{education:['College'],companies:[{value:'c1',label:'Fixture Company'}]},
};

test('filtered export sections keep the on-screen cohort, every demographic category and the 4.1-4.3 objectives',()=>{
  const copy=structuredClone(fixture),sections=analyticsViewSections(fixture);
  assert.deepEqual(fixture,copy);
  assert.deepEqual(sections.map(section=>section.title),['Summary metrics','4.1 Applicant demographics','Applicant registrations by month','4.2 Job demand trends','4.3 Common skills']);
  for(const section of sections){assert.equal(section.widths.length,section.columns.length);assert.ok(section.rows.length>0);assert.ok(section.rows.every(row=>row.length===section.columns.length))}
  assert.ok(analyticsScopeSummary(fixture).includes('Fixture Company'));
  assert.ok(analyticsScopeSummary(fixture).includes('All barangays'));
  assert.ok(sections[1].rows.some(row=>row[0]==='Barangay'&&row[1]==='Poblacion'&&row[2]===10&&row[3]==='100.0%'));
  assert.ok(sections[3].rows.some(row=>row[0]==='Monthly postings'&&row[1]==='2026-11'&&row[2]===5));
  assert.ok(sections[3].rows.some(row=>row[0]==='Company'&&row[1]==='Fixture Company'));
  assert.ok(sections[4].rows.some(row=>row[1]==='Hard requirement'&&row[2]==='Excel'&&row[3]===5));
  assert.ok(sections[4].rows.some(row=>row[1]==='Soft gap'&&row[2]==='Communication'&&row[3]===3));
});

test('filtered CSV carries the applied filters, section headings and exact values',()=>{
  const csv=buildAnalyticsViewCsv(fixture);
  assert.ok(csv.includes('"Applied filters","2026-10-01 to 2026-11-15 | All barangays | All education levels | Fixture Company | Active"'));
  assert.ok(csv.includes('"4.1 Applicant demographics"'));
  assert.ok(csv.includes('"Female","6","60.0%"'));
  assert.ok(csv.includes('"4.3 Common skills"'));
  assert.ok(csv.includes('"Saved matches (distinct applicants)","Hard gap","SQL","2"'));
  assert.ok(csv.includes('"Method notes"'));
});

test('filtered PDF is a valid A4 document and empty cohorts still render honestly',()=>{
  const assets={normal:fs.readFileSync('public/fonts/LiberationSans-Regular.ttf').toString('base64'),bold:fs.readFileSync('public/fonts/LiberationSans-Bold.ttf').toString('base64')};
  const pdf=renderAnalyticsViewPdf(fixture,assets);
  assert.ok(pdf.getNumberOfPages()>=2);assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-595.28)<0.1);
  assert.equal(Buffer.from(pdf.output('arraybuffer')).subarray(0,5).toString(),'%PDF-');
  const empty={...structuredClone(fixture),registrations:[],demographics:{gender:[],education:[],barangay:[],status:[]},demand:{monthly:[],status:[],industry:[],company:[],positions:[]},skills:{hard:[],soft:[],missingHard:[],missingSoft:[]},totals:{applicants:0,listings:0,availableListings:0,availablePositions:0,matchedApplicants:0,matchPairs:0}};
  const emptySections=analyticsViewSections(empty);
  assert.ok(emptySections[1].rows.some(row=>row[1]==='No records in this scope'));
  assert.ok(emptySections[4].rows.every(row=>row[1]==='No records in this scope'));
  const emptyPdf=renderAnalyticsViewPdf(empty,assets);
  assert.ok(emptyPdf.getNumberOfPages()>=1);assert.equal(Buffer.from(emptyPdf.output('arraybuffer')).subarray(0,5).toString(),'%PDF-');
});
