const fs=require('fs');const path=require('path');
const FILE=path.resolve(__dirname,'..','db','data','sd-QuestionFlow.csv');
let lines=fs.readFileSync(FILE,'utf8').split(/\r?\n/);
if(!lines.length) process.exit(0);
for(let i=1;i<lines.length;i++){
  let ln=lines[i]; if(!ln.includes(';')) continue;
  const parts=ln.split(';'); if(parts.length<13) continue;
  // answerOptions idx7 nav idx8 perf idx9
  ['7','8','9'].forEach(idx=>{let v=parts[idx]; if(!v) return; v=v.replace(/""/g,'"'); parts[idx]=v;});
  lines[i]=parts.join(';');
}
fs.writeFileSync(FILE,lines.join('\n'),'utf8');
console.log('Deduplicated quotes in JSON fields.');