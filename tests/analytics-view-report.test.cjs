const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {aggregateAnalytics}=require('../backend/employment-analytics.cjs');
const {NOW,FILTERS,records}=require('./fixtures/employment-report.cjs');
const {buildMonthlyEmploymentReport,reportingMonthRange,renderMonthlyEmploymentPdf}=require('../src/lib/analyticsViewReport.ts');
const fixture=()=>aggregateAnalytics(records(),FILTERS,NOW);
const assets={normal:fs.readFileSync('public/fonts/LiberationSans-Regular.ttf').toString('base64'),bold:fs.readFileSync('public/fonts/LiberationSans-Bold.ttf').toString('base64')};
test('monthly report uses exact source aggregates and explains rates, current state and deterministic themes',()=>{
 const data=fixture(),copy=structuredClone(data),report=buildMonthlyEmploymentReport(data);assert.equal(report.month,'2026-11');assert.equal(report.gaps[0].affectedApplicants,2);assert.ok(report.insights.join(' ').includes('unique applicants'));assert.ok(report.notes.join(' ').includes('/ 4 monthly registrants'));assert.ok(report.notes.join(' ').includes('past monthly gap results are not stored'));assert.deepEqual(data,copy);
});
test('report periods support month/year boundaries and leap years and refuse partial/multimonth reports',()=>{
 assert.deepEqual(reportingMonthRange('2024-02'),{from:'2024-02-01',to:'2024-02-29'});assert.equal(reportingMonthRange('2026-02').to,'2026-02-28');assert.equal(reportingMonthRange('2026-12').to,'2026-12-31');
 for(const value of ['2026-13','2026-2','2026-00','bad','1999-01'])assert.throws(()=>reportingMonthRange(value));
 const data=fixture();data.filters.to='2026-11-17';assert.throws(()=>buildMonthlyEmploymentReport(data),/complete reporting month/);delete data.reporting;assert.throws(()=>buildMonthlyEmploymentReport({...data,filters:{...FILTERS}}),/unavailable/);
});
test('empty monthly data leaves rates unavailable and does not claim there are no training needs',()=>{
 const empty=aggregateAnalytics({},FILTERS,NOW),report=buildMonthlyEmploymentReport(empty);
 assert.deepEqual(report.gaps,[]);assert.ok(report.insights.join(' ').includes('does not mean'));assert.ok(report.notes[0].includes('Gap rates are unavailable'));
});
test('monthly PDF is valid A4 and handles ordinary, empty, and long category labels',()=>{
 for(const data of [fixture(),aggregateAnalytics({},FILTERS,NOW)]){const pdf=renderMonthlyEmploymentPdf(data,assets);assert.ok(pdf.getNumberOfPages()>=1&&pdf.getNumberOfPages()<=2);assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-595.28)<.1);assert.equal(Buffer.from(pdf.output('arraybuffer')).subarray(0,5).toString(),'%PDF-')}
 const long=fixture();long.options.companies=[{value:'c1',label:'Very long employer category '.repeat(40)}];long.filters.company='c1';long.reporting.trainingNeeds[0].skill='A long recorded skill '.repeat(50);long.reporting.suggestedThemes[0].theme='Long suggested planning theme '.repeat(30);const pdf=renderMonthlyEmploymentPdf(long,assets);assert.ok(pdf.getNumberOfPages()<=2);
});
