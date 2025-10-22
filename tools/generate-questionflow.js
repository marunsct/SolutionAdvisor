const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '..', 'db', 'data', 'sd-QuestionFlow.csv');
const TARGET_ROWS = 110; // Ensure at least this many rows total

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
}

function writeLines(file, lines) {
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

function uuidFromCounter(prefix, i) {
  // deterministic pseudo-UUID to keep things simple
  const padded = String(i).padStart(12, '0');
  return `${prefix}-${padded.substring(0,8)}-${padded.substring(8)}-0000-0000-000000000000`;
}

function generateRow(counter, typeKey, seq) {
  const id = uuidFromCounter(typeKey, counter);
  const questionId = `${typeKey}-G${String(seq).padStart(3,'0')}`;
  const objectMap = { R: 'Reports', I: 'Interfaces', C: 'Conversions', E: 'Enhancements', F: 'Forms', W: 'Workflows' };
  const objectType = objectMap[typeKey];
  const questionText = `Auto-generated question ${seq} for ${objectType}`;
  const questionHint = `Auto-generated hint for ${objectType} question ${seq}`;
  const detailedHint = `This question was generated to expand the decision tree coverage for ${objectType}.`;
  const answerOptions = JSON.stringify([
    { value: 'Option1', label: 'Option 1', description: 'Auto option 1' },
    { value: 'Option2', label: 'Option 2', description: 'Auto option 2' },
    { value: 'Option3', label: 'Option 3', description: 'Auto option 3' }
  ]);

  // Map answers to final levels for simplicity
  const navigationRules = {
    Option1: { nextQuestion: null, finalAnswer: 'Level A', reasoning: 'Auto-assigned Level A' },
    Option2: { nextQuestion: null, finalAnswer: 'Level B', reasoning: 'Auto-assigned Level B' },
    Option3: { nextQuestion: null, finalAnswer: 'Level C', reasoning: 'Auto-assigned Level C' }
  };

  // performanceContext small JSON
  const performanceContext = JSON.stringify({ category: 'Auto', notes: `Generated for ${objectType}` });

  const displayOrder = seq;
  const isActive = 'true';
  const tenant = '';

  const fields = [
    id,
    questionId,
    objectType,
    questionText,
    questionHint,
    detailedHint,
    3,
    answerOptions,
    JSON.stringify(navigationRules),
    performanceContext,
    displayOrder,
    isActive,
    tenant
  ];

  // Use semicolon delimiter consistent with repository file
  return fields.join(';');
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found at', CSV_PATH);
    process.exit(1);
  }

  const lines = readLines(CSV_PATH);
  const existingCount = lines.length;
  console.log(`Existing QuestionFlow rows: ${existingCount}`);

  if (existingCount >= TARGET_ROWS) {
    console.log(`Already >= ${TARGET_ROWS} rows, nothing to do.`);
    return;
  }

  // We'll append rows cycling through object types
  const typeKeys = ['R','I','C','E','F','W'];
  // Compute per-type starting seq numbers to avoid duplicates with existing ones
  const existingIds = new Set();
  const existingQids = new Set();
  lines.forEach((ln) => {
    const parts = ln.split(';');
    if (parts[0]) existingIds.add(parts[0]);
    if (parts[1]) existingQids.add(parts[1]);
  });

  let counter = 1;
  // find a counter seed that doesn't collide with existing IDs
  while (existingIds.has(uuidFromCounter('X', counter))) counter++;

  const newLines = [];
  let seqMap = { R:1, I:1, C:1, E:1, F:1, W:1 };
  // bump seqMap based on existing questionIds
  existingQids.forEach(qid => {
    const m = qid.match(/^([A-Z])-G?(\d+)/);
    if (m) {
      const k = m[1];
      const n = parseInt(m[2], 10);
      if (seqMap[k] <= n) seqMap[k] = n + 1;
    }
  });

  let total = existingCount;
  while (total < TARGET_ROWS) {
    for (const k of typeKeys) {
      if (total >= TARGET_ROWS) break;
      const row = generateRow(counter, k, seqMap[k]);
      newLines.push(row);
      counter++;
      seqMap[k]++;
      total++;
    }
  }

  // Append new lines to file
  const out = lines.concat(newLines);
  writeLines(CSV_PATH, out);
  console.log(`Appended ${newLines.length} rows, total now: ${out.length}`);
}

main();
