/**
 * Detect legacy comma-delimited rows in sd-QuestionFlow.csv and convert them to semicolon-delimited.
 * Assumptions:
 *  - Proper semicolon rows already OK.
 *  - Comma rows start with UUID followed by comma (no semicolon in line).
 *  - answerOptions field starts with '[' and navigationRules with '{'.
 *  - performanceContext may be empty or start with '{'.
 * Strategy:
 *  1. Identify comma-only rows.
 *  2. Parse prefix fields until answerOptions using heuristic: find first occurrence of ',[' which signals start of answerOptions.
 *  3. Extract answerOptions via bracket depth scanning from '[' to matching ']'.
 *  4. After answerOptions, expect a comma then '{' for navigationRules; scan braces until matching '}'.
 *  5. Remaining segments (performanceContext, displayOrder, isActive, tenant) split on commas.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'db', 'data', 'sd-QuestionFlow.csv');

function scanBalanced(str, startIdx, openChar, closeChar) {
  let depth = 0; let i = startIdx; const len = str.length; let inString = false; let escape = false;
  for (; i < len; i++) {
    const c = str[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') inString = !inString;
    if (!inString) {
      if (c === openChar) depth++;
      else if (c === closeChar) {
        depth--;
        if (depth === 0) return i; // inclusive index of closing char
      }
    }
  }
  return -1; // not found
}

function convertLine(line) {
  // Skip if already semicolon-delimited or blank
  if (!line.trim() || line.includes(';')) return line;
  // Basic UUID detection at start
  if (!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}),/.test(line)) return line;

  // Locate first '[' which should begin answerOptions (possibly after ," )
  const firstBracket = line.indexOf('[');
  if (firstBracket === -1) return line;
  // Ensure there's a comma somewhere before the bracket (after answerCount)
  const aoCommaIdx = line.lastIndexOf(',', firstBracket);
  if (aoCommaIdx === -1) return line;
  const prefix = line.substring(0, aoCommaIdx); // up to just before '[' (may exclude trailing quote)
  let rest = line.substring(aoCommaIdx + 1); // starts with optional quote then '['
  if (rest.startsWith('"[')) rest = rest.substring(1); // drop leading quote

  // Parse prefix tokens
  const prefixParts = prefix.split(',');
  // Expect at least 7 prefix parts (id, questionId, objectType, questionText, questionHint, detailedHint, answerCount)
  if (prefixParts.length < 7) return line;

  // Extract answerOptions
  const aoEnd = scanBalanced(rest, 0, '[', ']');
  if (aoEnd === -1) return line;
  const answerOptions = rest.substring(0, aoEnd + 1); // include closing ]
  rest = rest.substring(aoEnd + 1); // after ']' expected ,{" navigationRules
  if (rest.startsWith('"')) rest = rest.substring(1); // drop closing quote of field if present
  if (rest.startsWith(',')) rest = rest.substring(1);

  // Extract navigationRules starting with '{'
  if (rest.startsWith('"{')) rest = rest.substring(1);
  if (!rest.startsWith('{')) return line;
  const nrEnd = scanBalanced(rest, 0, '{', '}');
  if (nrEnd === -1) return line;
  const navigationRules = rest.substring(0, nrEnd + 1);
  rest = rest.substring(nrEnd + 1); // after navigationRules, expect comma then performanceContext or empty
  if (rest.startsWith('"')) rest = rest.substring(1); // drop closing quote if present
  if (rest.startsWith(',')) rest = rest.substring(1);

  // Remaining: performanceContext (may start with '{' or be empty), displayOrder, isActive, tenant (some may be missing tenant)
  let performanceContext = '';
  if (rest.startsWith('{')) {
    const pcEnd = scanBalanced(rest, 0, '{', '}');
    if (pcEnd !== -1) {
      performanceContext = rest.substring(0, pcEnd + 1);
      rest = rest.substring(pcEnd + 1);
      if (rest.startsWith(',')) rest = rest.substring(1);
    }
  }
  const tailParts = rest.split(',');
  // displayOrder is first numeric-looking part
  const displayOrder = tailParts[0] || '';
  const isActive = tailParts[1] || '';
  const tenant = tailParts[2] || '';

  const rebuilt = [
    ...prefixParts.slice(0, 7),
    answerOptions,
    navigationRules,
    performanceContext,
    displayOrder,
    isActive,
    tenant
  ].join(';');
  return rebuilt;
}

function run() {
  const original = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
  const out = original.map(convertLine);
  fs.writeFileSync(FILE, out.join('\n'), 'utf8');
  console.log('Delimiter normalization complete.');
}

run();
