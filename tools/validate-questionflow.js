const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '..', 'db', 'data', 'sd-QuestionFlow.csv');

function readLines(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
}

function parseRow(line) {
  const parts = line.split(';');
  return {
    id: parts[0],
    questionId: parts[1],
    objectType: parts[2],
    questionText: parts[3],
    questionHint: parts[4],
    detailedHint: parts[5],
    answerCount: parts[6],
    answerOptions: parts[7],
    navigationRules: parts[8],
    performanceContext: parts[9],
    displayOrder: parts[10]
  };
}

function safeJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function validate() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found:', CSV_PATH);
    process.exit(2);
  }

  const lines = readLines(CSV_PATH);
  // Detect header row (starts with ID;questionId) and skip it
  let hasHeader = false;
  if (lines.length > 0) {
    const firstParts = lines[0].split(';');
    if (firstParts[0] && firstParts[0].toUpperCase() === 'ID' || firstParts[1] === 'questionId') {
      hasHeader = true;
    }
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows = dataLines.map(parseRow);
  const rowOffset = hasHeader ? 1 : 0;
  const qMap = new Map();
  rows.forEach(r => qMap.set(r.questionId, r));

  const errors = [];

  // Validate JSON fields and navigation references
  rows.forEach((r, idx) => {
    const nav = safeJSON(r.navigationRules);
    if (!nav) {
      errors.push({ row: idx + 1 + rowOffset, questionId: r.questionId, error: 'Invalid navigationRules JSON' });
      return;
    }

    for (const [answer, rule] of Object.entries(nav)) {
      if (rule.nextQuestion) {
        if (!qMap.has(rule.nextQuestion)) {
          errors.push({ row: idx + 1, questionId: r.questionId, error: `navigationRules references unknown nextQuestion: ${rule.nextQuestion}` });
        }
      } else if (!rule.finalAnswer) {
        errors.push({ row: idx + 1, questionId: r.questionId, error: `navigation rule for answer ${answer} has neither nextQuestion nor finalAnswer` });
      }
    }
  });

  // Detect cycles in graph (questionId nodes, edges from question -> nextQuestion)
  const visited = new Set();
  const stack = new Set();

  function dfs(qid) {
    if (stack.has(qid)) return [true, [qid]]; // cycle
    if (visited.has(qid)) return [false, []];
    visited.add(qid);
    stack.add(qid);

    const r = qMap.get(qid);
    if (!r) { stack.delete(qid); return [false, []]; }
    const nav = safeJSON(r.navigationRules) || {};
    for (const rule of Object.values(nav)) {
      if (rule.nextQuestion) {
        const [hasCycle, path] = dfs(rule.nextQuestion);
        if (hasCycle) return [true, path.concat(qid)];
      }
    }

    stack.delete(qid);
    return [false, []];
  }

  for (const qid of qMap.keys()) {
    const [hasCycle, path] = dfs(qid);
    if (hasCycle) {
      errors.push({ row: null, questionId: qid, error: 'Cycle detected in navigation path: ' + path.join(' -> ') });
    }
  }

  if (errors.length === 0) {
    console.log(`Validation passed: ${rows.length} questions, no JSON or navigation errors found`);
    return 0;
  }

  console.error('Validation failed with', errors.length, 'issues:');
  errors.forEach(e => {
    console.error('-', e.questionId || '<unknown>', e.error, e.row ? `(row ${e.row})` : '');
  });

  return 1;
}

const rc = validate();
process.exit(rc);
