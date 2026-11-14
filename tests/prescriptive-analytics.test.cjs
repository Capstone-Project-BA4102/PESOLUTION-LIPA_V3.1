const test=require('node:test'),assert=require('node:assert/strict');
const {rankedMatches,recommendationsForGaps}=require('../src/lib/prescriptiveAnalytics.ts');
test('job comparison ranks saved percentages, deduplicates jobs and excludes below-cutoff/invalid scores without recalculating',()=>{
 const rows=[{jobId:'b',audit:{title:'B',score:85}},{jobId:'a',audit:{title:'A',score:100}},{jobId:'c',audit:{title:'C',score:60}},{jobId:'d',audit:{title:'D',score:59.99}},{jobId:'e',audit:{title:'E',score:NaN}}];const snapshot=structuredClone(rows);assert.deepEqual(rankedMatches([...rows,rows[0]]).map(row=>row.jobId),['a','b','c']);assert.deepEqual(rows,snapshot);
});
test('saved training suggestions display only current missing skills, once, and do not invent guidance',()=>{
 const items=[{skill:'SQL',action:'Saved advice'},{skill:' SQL ',action:'Last saved advice'},{skill:'Leadership',action:'Stale advice'}];const filtered=recommendationsForGaps(items,['sql','C++']);assert.equal(filtered.length,1);assert.equal(filtered[0].action,'Last saved advice');assert.deepEqual(recommendationsForGaps(items,[]),[]);
});
