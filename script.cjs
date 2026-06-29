const fs = require('fs');
const file = 'components/DailyJournal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/onChange=\{\(e\) => updateEntry\('([^']+)', e\.target\.value\)\}/g, "onChange={(val) => updateEntry('$1', val)}");

fs.writeFileSync(file, content);
console.log('Fixed onChanges in DailyJournal.tsx');
