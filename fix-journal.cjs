const fs = require('fs');
let c = fs.readFileSync('components/DailyJournal.tsx', 'utf8');
const lines = c.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('<RichTextDivvalue="" onChange={() => {}}className=""style={}/>')) {
    if (line.includes('Goal')) return '';
    return 'DUMMY';
  }
  return line;
});

const fileParts = [
    '<RichTextDiv value={""} onChange={() => {}} placeholder="Review your goals and progress this week..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />',
    '<RichTextDiv value={""} onChange={() => {}} placeholder="Identify changes to stay on track..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />',
    '<RichTextDiv value={""} onChange={() => {}} placeholder="What was your biggest win?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />',
    '<RichTextDiv value={""} onChange={() => {}} placeholder="Reflect on your biggest wins this month..." className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />',
    '<RichTextDiv value={""} onChange={() => {}} placeholder="What was the most significant area of maturity this month?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />',
    '<RichTextDiv value={""} onChange={() => {}} placeholder="How has your 3-month vision shifted since the start?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />',
    '<RichTextDiv value={""} onChange={() => {}} placeholder="What is the next major milestone for the upcoming quarter?" className="w-full bg-transparent outline-none font-bold text-slate-900 placeholder:text-slate-900/20 resize-none h-32" style={{ fontFamily: textFontFamily, fontSize: `${textFontSize}px` }} />'
];

let idx = 0;
const finalLines = lines.map(line => {
    if (line.includes('<RichTextDivvalue="" onChange={() => {}}className=""style={}/>')) {
        let replacement = fileParts[idx++];
        return line.replace('<RichTextDivvalue="" onChange={() => {}}className=""style={}/>', replacement);
    }
    return line;
});

fs.writeFileSync('components/DailyJournal.tsx', finalLines.join('\n'));
