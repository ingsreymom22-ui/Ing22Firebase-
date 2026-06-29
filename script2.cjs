const fs = require('fs');
const file = 'components/DailyJournal.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace inputs that are not checkboxes
content = content.replace(/<input\s+type="text"/g, '<RichTextDiv');

// we also need to fix self-closing inputs -> RichTextDiv requires closing tag, but our script just replaces the opening tag.
// It's probably easier to just replace them manually via multi_edit_file since there are only two text inputs in DailyJournal (feeling, appreciation).
