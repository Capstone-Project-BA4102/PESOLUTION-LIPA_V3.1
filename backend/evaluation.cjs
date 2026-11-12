const { normalize, MATCHING_THRESHOLD } = require('./domain.cjs');
const OCR_FIELDS = ['first_name','middle_name','last_name','suffix','date_of_birth','gender','contact_number','email','barangay','address','civil_status','nationality','education','course','school','hard_skills','soft_skills'];
const ratio = (n, d) => d ? n / d : null;
const metrics = ({ tp, tn = 0, fp, fn }) => ({ accuracy: ratio(tp + tn, tp + tn + fp + fn), precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn), f1: ratio(2 * tp, 2 * tp + fp + fn) });

function validateDataset(dataset) {
  if (!dataset || !['ocr','matching'].includes(dataset.kind) || !Array.isArray(dataset.records) || !dataset.records.length) throw new Error('A nonempty OCR or matching dataset is required.');
  const ids = new Set(); const sourceSplits = new Map();
  for (const row of dataset.records) {
    if (!row || typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id)) throw new Error('Every record needs a unique ID.');
    ids.add(row.id);
    if (!['development','test'].includes(row.split) || typeof row.sourceId !== 'string' || !row.sourceId.trim()) throw new Error('Every record needs a development/test split and source ID.');
    if (!row.validatedBy?.trim() || !row.validatedAt || Number.isNaN(Date.parse(row.validatedAt))) throw new Error('Ground-truth records need validator and validation date.');
    if (sourceSplits.has(row.sourceId) && sourceSplits.get(row.sourceId) !== row.split) throw new Error('The same source cannot appear in both development and test splits.');
    sourceSplits.set(row.sourceId, row.split);
    if (dataset.kind === 'ocr') {
      if (!row.expected || typeof row.expected !== 'object' || Array.isArray(row.expected) || !Object.keys(row.expected).length) throw new Error('OCR records need annotated expected fields.');
      for (const [key, value] of Object.entries(row.expected)) {
        if (!OCR_FIELDS.includes(key)) throw new Error(`Unsupported OCR field: ${key}`);
        if (key.endsWith('_skills') ? !Array.isArray(value) || value.some(s => typeof s !== 'string') : typeof value !== 'string') throw new Error(`Invalid expected value for ${key}.`);
      }
    } else if (typeof row.expected !== 'boolean' || !Number.isFinite(row.predictedScore) || row.predictedScore < 0 || row.predictedScore > 100) throw new Error('Matching records need a boolean label and a score from 0 to 100.');
  }
  return dataset;
}

function evaluateDataset(dataset, split = 'test', threshold = MATCHING_THRESHOLD) {
  validateDataset(dataset);
  if (!['development','test'].includes(split) || !Number.isFinite(threshold) || threshold < 0 || threshold > 100) throw new Error('Invalid evaluation split or threshold.');
  const rows = dataset.records.filter(row => row.split === split);
  if (!rows.length) throw new Error(`No validated ${split} records are available.`);
  if (dataset.kind === 'matching') {
    const counts = { tp: 0, tn: 0, fp: 0, fn: 0 };
    const details = rows.map(row => {
      const predicted = row.predictedScore >= threshold;
      const outcome = predicted ? row.expected ? 'tp' : 'fp' : row.expected ? 'fn' : 'tn';
      counts[outcome]++;
      return { id: row.id, expected: row.expected, predicted, score: row.predictedScore, outcome };
    });
    return { kind: 'matching', split, threshold, sampleCount: rows.length, counts, metrics: metrics(counts), details, configuration: dataset.configuration || null };
  }
  let total = 0; let correct = 0;
  const skillCounts = { tp: 0, fp: 0, fn: 0 };
  const fields = {};
  const details = [];
  for (const row of rows) {
    if (!row.predicted || typeof row.predicted !== 'object' || Array.isArray(row.predicted)) throw new Error(`Record ${row.id} needs actual OCR predictions.`);
    for (const [field, expected] of Object.entries(row.expected)) {
      const predicted = row.predicted[field];
      let equal;
      if (field.endsWith('_skills')) {
        if (predicted !== undefined && (!Array.isArray(predicted) || predicted.some(s => typeof s !== 'string'))) throw new Error(`Invalid predicted skills in ${row.id}.`);
        const reference = new Set(expected.map(normalize).filter(Boolean));
        const actual = new Set((predicted || []).map(normalize).filter(Boolean));
        const overlap = [...reference].filter(s => actual.has(s)).length;
        skillCounts.tp += overlap; skillCounts.fp += actual.size - overlap; skillCounts.fn += reference.size - overlap;
        equal = actual.size === reference.size && overlap === reference.size;
      } else {
        if (predicted !== undefined && typeof predicted !== 'string') throw new Error(`Invalid predicted ${field} in ${row.id}.`);
        const canonical = value => field === 'contact_number' ? String(value || '').replace(/\D/g, '') : normalize(value);
        equal = canonical(expected) === canonical(predicted);
      }
      total++; if (equal) correct++;
      fields[field] ||= { total: 0, correct: 0 };
      fields[field].total++; if (equal) fields[field].correct++;
      details.push({ id: row.id, field, expected, predicted: predicted ?? (field.endsWith('_skills') ? [] : ''), correct: equal });
    }
  }
  return { kind: 'ocr', split, sampleCount: rows.length, fieldAccuracy: ratio(correct, total), fields,
    exactFields: { total, correct }, skillCounts, skillMetrics: { precision: metrics(skillCounts).precision, recall: metrics(skillCounts).recall, f1: metrics(skillCounts).f1 }, details };
}
module.exports = { OCR_FIELDS, validateDataset, evaluateDataset };
