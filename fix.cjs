const fs = require('fs');
let s = fs.readFileSync('components/FloatingToolbar.tsx', 'utf8');
s = s.replace(/\\`/g, '`');
s = s.replace(/\\\$/g, '$');
fs.writeFileSync('components/FloatingToolbar.tsx', s);
