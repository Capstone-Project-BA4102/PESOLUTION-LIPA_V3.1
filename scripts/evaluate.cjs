const fs = require('node:fs');
const { evaluateDataset } = require('../backend/evaluation.cjs');
const [input, output, split = 'test', threshold = '60'] = process.argv.slice(2);
try {
  if (!input) throw new Error('Usage: npm run evaluate -- dataset.json report.json [test|development] [threshold]');
  const result = evaluateDataset(JSON.parse(fs.readFileSync(input, 'utf8')), split, Number(threshold));
  const report = JSON.stringify({ generatedAt: new Date().toISOString(), ...result }, null, 2);
  if (output) fs.writeFileSync(output, report + '\n'); else console.log(report);
} catch (error) { console.error(error.message); process.exitCode = 1; }
