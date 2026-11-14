const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = require('../src/constants/lipa-barangays.json');
const { registrationAddress } = require('../backend/address.cjs');
const qualifications = require('../src/lib/jobQualifications.ts');
function load(file, modules) {
  const module = { exports:{} };
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code,{exports:module.exports,Error,require:name=>{
    if (Object.hasOwn(modules,name)) return modules[name];
    throw Error('Unexpected dependency: '+name);
  }});
  return module.exports;
}
const options = load('src/constants/options.ts',{'./lipa-barangays.json':source});
const address = load('src/lib/applicantAddress.ts',{'../constants/options':options});

test('central PSA list has 72 unique official names, provenance, and alphabetic/numeric ordering',()=>{
  assert.equal(source.names.length,72);assert.equal(new Set(source.names).size,72);
  assert.equal(source.url,'https://psa.gov.ph/classification/psgc/barangays/0401014000');
  assert.equal(source.verifiedOn,'2026-11-14');assert.equal(source.sourceAsOf,'2025-07-31');
  for(const name of ['Marauoy','Inosloban','Barangay 12','Poblacion Barangay 9-A','Santo Niño'])assert.ok(source.names.includes(name));
  for(const name of ['Tingloy','Pag-asa','Balete','Poblacion'])assert.ok(!source.names.includes(name));
  assert.ok(options.BARANGAYS.every((name,index,list)=>!index||list[index-1].localeCompare(name,'en',{numeric:true,sensitivity:'base'})<=0));
  assert.ok(options.BARANGAYS.indexOf('Poblacion Barangay 2')<options.BARANGAYS.indexOf('Poblacion Barangay 10'));
});

test('Lipa selections require official values, including when editing historical spellings',()=>{
  assert.equal(address.isLipaCity(' City of Lipa '),true);
  assert.equal(address.cityFromAddress('House 4, San Jose, Tanauan City'), 'Tanauan City');
  assert.equal(address.cityFromAddress('House 4, San Jose'), '');
  assert.equal(address.cityFromAddress('House 4, LIPA CITY, Batangas'),'Lipa City');
  assert.equal(address.barangayError('Tanauan City','San Vicente'),'');
  assert.equal(address.barangayError('','Historical Barangay'),'');
  assert.match(address.barangayError('Lipa City','Tingloy'),/official/);
  assert.match(address.barangayError('Lipa City','Marawoy'),/official/);
  assert.equal(address.barangayError('Lipa City','Marauoy'),'');
  assert.match(address.barangayError('Lipa City','Tingloy'),/official/);
  assert.equal(address.officialBarangay(' marauoy '),'Marauoy');
});

test('saved address text is preserved; explicit city choices round-trip in the existing address field',()=>{
  const historical=' House 1, Marawoy, Lipa City, Batangas ';
  assert.equal(address.addressWithCity(historical,'Lipa City'),historical);
  assert.equal(address.addressWithCity('Address with unknown city',''),'Address with unknown city');
  assert.equal(address.addressWithCity('House 2','Tanauan City'),'House 2, Tanauan City');
  assert.equal(address.addressWithCity('House 2, City of Lipa','Lipa City'),'House 2, City of Lipa');
  assert.match(address.addressCityError('House 1, Lipa City','Tanauan City'),/Review/);
});

test('registration accepts canonical Lipa and other municipalities without guessing or rewriting legacy callers',()=>{
  assert.deepEqual(registrationAddress({cityMunicipality:'Lipa City',barangay:' inosloban ',address:'House 1'}),{barangay:'Inosloban',address:'House 1, Lipa City'});
  assert.deepEqual(registrationAddress({cityMunicipality:'Tanauan City',barangay:'San Vicente',address:'House 2'}),{barangay:'San Vicente',address:'House 2, Tanauan City'});
  assert.deepEqual(registrationAddress({barangay:'Marawoy',address:'House 1, Lipa City'}),{barangay:'Marawoy',address:'House 1, Lipa City'});
  for(const input of [{cityMunicipality:'Lipa City',barangay:'Tingloy',address:'House 1'},{cityMunicipality:''},{cityMunicipality:{}},{cityMunicipality:'Lipa City',barangay:'Bulacnin',address:''}])assert.throws(()=>registrationAddress(input));
});

test('qualification mapping handles null/legacy fields and preserves technical identifiers and compound phrases',()=>{
  const original=[' C++ ','C#','JavaScript','Active Listening & Communication','C++'];
  const before=JSON.stringify(original);
  assert.deepEqual(qualifications.qualificationSkills(original),['C++','C#','JavaScript','Active Listening & Communication']);
  assert.deepEqual(qualifications.qualificationSkills('Excel, SQL\nGit;C#'),['Excel','SQL','Git','C#']);
  for(const empty of [null,undefined,{},123,''])assert.deepEqual(qualifications.qualificationSkills(empty),[]);
  assert.equal(JSON.stringify(original),before);
});

test('job API retrieves actual requirements and normalizes only the returned view data',async()=>{
  const rows=[{id:'one',status:'Active',date_posted:new Date().toISOString(),education:'College Graduate',hard_skills:['C++','C#'],soft_skills:'Communication, Teamwork'},
    {id:'two',status:'Active',date_posted:new Date().toISOString(),education:null,hard_skills:null,soft_skills:null}];
  const snapshot=JSON.stringify(rows);
  const db={from:table=>{assert.equal(table,'job_listings');return{select(){return this},update(){return this},eq(){return this},lt:async()=>({error:null}),order:async()=>({data:rows})}}};
  const api=load('src/lib/api.ts',{'./supabase':{supabase:db},'./jobQualifications':qualifications,'./referralDefaults':require('../src/lib/referralDefaults.ts'),'./applicantName':{},'./backend':{}});
  const jobs=await api.fetchJobs();
  assert.equal(jobs[0].education,'College Graduate');assert.equal(jobs[0].hardSkills.join('|'),'C++|C#');assert.equal(jobs[0].softSkills.join('|'),'Communication|Teamwork');
  assert.equal(jobs[1].education,'');assert.equal(jobs[1].hardSkills.length,0);assert.equal(jobs[1].softSkills.length,0);assert.equal(JSON.stringify(rows),snapshot);
});

test('OCR prefill retains an unrecognized or outside-city barangay for staff review',async()=>{
  const ocr=load('src/lib/ocr.ts',{'@/constants/options':options,'./backend':{fileToUpload:async()=>({}),backendRequest:async()=>({barangay:'San Vicente',address:'House 2, Tanauan City'})}});
  const result=await ocr.geminiExtract({});assert.equal(result.barangay,'San Vicente');assert.equal(result.address,'House 2, Tanauan City');
});


test('explicit city conflicts are rejected in either direction without inventing a corrected address', () => {
  for (const [recorded,selected] of [['Tanauan City','Lipa City'],['Lipa City','Tanauan City']]) {
    const full=`House 1, ${recorded}`;
    assert.match(address.addressCityError(full,selected),/Review/);
    assert.equal(address.addressWithCity(full,selected),full);
    assert.throws(()=>registrationAddress({cityMunicipality:selected,barangay:'Bulacnin',address:full}),/Review/);
  }
  assert.equal(address.addressCityError('House 1, City of Lipa','Lipa City'),'');
  assert.equal(address.cityFromAddress('Marawoy Lipa City'),'Lipa City');
  assert.equal(registrationAddress({cityMunicipality:'Lipa City',barangay:'Bulacnin',address:'Marawoy Lipa City'}).address,'Marawoy Lipa City');
});
