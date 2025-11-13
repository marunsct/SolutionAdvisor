const fs = require('fs');
const path = require('path');
const FILE = path.resolve(__dirname, '..', 'db', 'data', 'sd-QuestionFlow.csv');

function parseCommaCSV(line) {
  const cols = []; let cur = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        cur += '"'; i++; continue;
      }
      inQuotes = !inQuotes; continue;
    }
    if (c === ',' && !inQuotes) { cols.push(cur); cur=''; continue; }
    cur += c;
  }
  cols.push(cur);
  return cols.map(c => c.trim());
}

function normalizeJSON(str, isArray=false) {
  if(!str) return str;
  let s = str.trim();
  // remove outer quotes if present
  if (s.startsWith('"') && s.endsWith('"')) s = s.substring(1, s.length-1);
  // Replace single quotes with double only if looks like pseudo JSON and not already valid
  if (/^\[.*\]$/.test(s) || /^\{.*\}$/.test(s)) {
    // convert ' to " where appropriate (not inside words with apostrophes but our data doesn't have those)
    if (s.includes("'")) {
      s = s.replace(/'([^']*)'/g, (m, inner) => '"'+inner+'"');
    }
    // Ensure keys use double quotes
    s = s.replace(/\{\s*'([^']+)'\s*:/g, (m,key)=>'{"'+key+'":');
    s = s.replace(/,\s*'([^']+)'\s*:/g, (m,key)=>',"'+key+'":');
  }
  return s;
}

function convert() {
  let lines = fs.readFileSync(FILE,'utf8').split(/\r?\n/);
  if(!lines.length) return;
  // Header
  if (lines[0].startsWith('ID,')) {
    lines[0] = 'ID;questionId;objectType;questionText;questionHint;detailedHint;answerCount;answerOptions;navigationRules;performanceContext;displayOrder;isActive;tenant';
  }
  for (let i=1;i<lines.length;i++) {
    let line = lines[i];
    if(!line.trim()) continue;
    if(line.startsWith('ID;')) continue; // header already converted
    if(line.includes(';')) continue; // already semicolon
    const cols = parseCommaCSV(line);
    if (cols.length < 13) continue; // malformed
    // answerOptions index 7, navigationRules index 8, performanceContext index 9
    cols[7] = normalizeJSON(cols[7], true);
    cols[8] = normalizeJSON(cols[8], false);
    cols[9] = normalizeJSON(cols[9], false);
    // Rejoin with semicolons (strip internal wrapping quotes now)
    lines[i] = cols.slice(0,13).join(';');
  }
  fs.writeFileSync(FILE, lines.join('\n'),'utf8');
  console.log('Full delimiter & JSON normalization complete');
}

convert();
