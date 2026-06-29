const fs = require('fs');
let content = fs.readFileSync('components/HabitTracker.tsx', 'utf8');
content = content.replace("import { ChevronLeft", "import { CheckSquare, ChevronLeft");
fs.writeFileSync('components/HabitTracker.tsx', content);
