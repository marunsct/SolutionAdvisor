// Auto-wrap multi-line detailedHint fields in double quotes and escape embedded quotes for CSV compliance
const fs = require('fs');
const path = require('path');
const FILE = path.resolve(__dirname, '..', 'db', 'data', 'sd-QuestionFlow.csv');
const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);
const header = lines[0];
const outLines = [header];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) { outLines.push(line); continue; }
  const parts = line.split(';');
  if (parts.length < 12) { outLines.push(line); continue; }
  let hint = parts[5];
  if (hint && hint.includes('\n')) {
    // Escape embedded double quotes
    hint = hint.replace(/"/g, '""');
    // Wrap in double quotes
    hint = `"${hint}"`;
    parts[5] = hint;
  }
  outLines.push(parts.join(';'));
}
fs.writeFileSync(FILE, outLines.join('\n'), 'utf8');
console.log('Multi-line detailedHint fields fixed for CSV compliance.');
