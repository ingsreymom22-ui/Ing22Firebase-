const fs = require('fs');
let code = fs.readFileSync('components/DPSSTable.tsx', 'utf8');

code = code.replace(/const \[activeTopicId, setSelectedTopicId\]/g, 'const [selectedTopicId, setSelectedTopicId]');
code = code.replace(/activeTopicId === /g, 'selectedTopicId === ');
code = code.replace(/\(activeTopicId \? /g, '(selectedTopicId ? ');
code = code.replace(/ activeTopicId\)/g, ' selectedTopicId)');
code = code.replace(/ activeTopicId/g, ' selectedTopicId');

// Remove line 2695 completely since activeTopic is already declared
const lines = code.split('\n');
code = lines.filter(line => !line.includes('const activeTopic = selectedTopicId ? findTopic')).join('\n');

fs.writeFileSync('components/DPSSTable.tsx', code);
console.log("Done");
