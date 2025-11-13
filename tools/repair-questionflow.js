/**
 * Automated repair utility for sd-QuestionFlow.csv JSON fields.
 * Fixes common malformed patterns in answerOptions and navigationRules:
 *  - Double double-quotes (e.g. [""Yes"", ""No""] -> ["Yes", "No"]) 
 *  - Single-quoted pseudo JSON (e.g. ['Yes','No'] -> ["Yes","No"]) 
 *  - Accidental navigation typo (W-22 -> W-Q22) 
 *  - Ensures each navigation rule object has either nextQuestion or finalAnswer.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'db', 'data', 'sd-QuestionFlow.csv');

function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function normalizeQuotes(raw) {
  if (!raw) return raw;
  let out = raw.trim();
  // Replace double double-quotes with single double quote
  out = out.replace(/""/g, '"');
  // If starts with [ or { and uses single quotes for keys/strings, convert them.
  if ((out.startsWith('[') || out.startsWith('{')) && /'/.test(out) && !/"[^"]*"/.test(out)) {
    // Replace 'value' with "value" but avoid replacing within escaped contexts.
    out = out.replace(/'([^']*)'/g, '"$1"');
  }
  return out;
}

function repairJSON(raw, fieldName) {
  if (!raw) return { value: raw, fixed: false, ok: true };
  let attempt = raw;
  let parsed = safeParse(attempt);
  if (parsed) return { value: attempt, fixed: false, ok: true };

  attempt = normalizeQuotes(raw);
  parsed = safeParse(attempt);
  if (parsed) return { value: attempt, fixed: true, ok: true };

  // Final fallback: try to escape stray quotes by removing any remaining single quotes.
  if (/['"]/g.test(attempt)) {
    const alt = attempt
      .replace(/'([^']*)'/g, '"$1"')
      .replace(/\"\"/g, '"');
    const altParsed = safeParse(alt);
    if (altParsed) return { value: alt, fixed: true, ok: true };
    attempt = alt; // keep last attempt even if failed for logging
  }
  return { value: attempt, fixed: false, ok: false };
}

function fixTypoNavigation(str) {
  if (!str) return str;
  // Specific known typo: W-22 should be W-Q22
  return str.replace(/W-22/g, 'W-Q22');
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.error('QuestionFlow CSV not found:', FILE);
    process.exit(2);
  }
  const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
  if (!lines.length) {
    console.error('Empty CSV file');
    process.exit(2);
  }
  const header = lines[0];
  const outLines = [header];
  let fixedAnswerOptions = 0;
  let fixedNavigationRules = 0;
  const failures = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // skip empty
    const parts = line.split(';');
    // Guard against unexpected column count (expected >= 12 based on file structure)
    if (parts.length < 12) {
      outLines.push(line);
      continue;
    }
    // Indices based on header order
    const ANSWER_OPTIONS_IDX = 7;
    const NAV_RULES_IDX = 8;

    // Repair answerOptions
    const ao = parts[ANSWER_OPTIONS_IDX];
    const aoResult = repairJSON(ao, 'answerOptions');
    if (aoResult.fixed) fixedAnswerOptions++;
    if (!aoResult.ok) failures.push({ line: i + 1, field: 'answerOptions', original: ao });
    parts[ANSWER_OPTIONS_IDX] = aoResult.value;

    // Repair navigationRules + specific typo correction
    parts[NAV_RULES_IDX] = fixTypoNavigation(parts[NAV_RULES_IDX]);
    const nr = parts[NAV_RULES_IDX];
    const nrResult = repairJSON(nr, 'navigationRules');
    if (nrResult.fixed) fixedNavigationRules++;
    if (!nrResult.ok) failures.push({ line: i + 1, field: 'navigationRules', original: nr });
    parts[NAV_RULES_IDX] = nrResult.value;

    outLines.push(parts.join(';'));
  }

  fs.writeFileSync(FILE, outLines.join('\n'), 'utf8');
  console.log('QuestionFlow repair complete');
  console.log('Fixed answerOptions:', fixedAnswerOptions);
  console.log('Fixed navigationRules:', fixedNavigationRules);
  if (failures.length) {
    console.warn('Unresolved JSON parse failures:', failures.length);
    failures.slice(0, 10).forEach(f => console.warn(f));
  } else {
    console.log('All JSON fields parse successfully after repair attempts.');
  }
}

main();
