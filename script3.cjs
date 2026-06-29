const fs = require('fs');
let content = fs.readFileSync('components/HabitTracker.tsx', 'utf8');

// Replace Architecture of Resolve
content = content.replace(
  `<h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">{format(selectedPlanningDate, 'MMMM do, yyyy')}</h3>`,
  `<h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-3">\n                                  {format(selectedPlanningDate, 'MMMM do, yyyy')}\n                                  <button onClick={() => { const html = \`<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>List item</span></li></ul><div><br></div>\`; const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd'); const newNote = planningNote + html; setPlanningNote(newNote); if (onUpdateDailyNote) { onUpdateDailyNote(dateKey, newNote); } else { onUpdate({ ...data, dailyNotes: { ...(data.dailyNotes || {}), [dateKey]: newNote } }); } }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={20} /></button>\n                              </h3>`
);

// Replace Strategic Planning
content = content.replace(
  `<h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">Strategic Planning</h3>`,
  `<h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-2">Strategic Planning <button onClick={() => { const html = \`<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>List item</span></li></ul><div><br></div>\`; const dateKey = format(selectedPlanningDate, 'yyyy-MM-dd'); const newNote = planningNote + html; setPlanningNote(newNote); if (onUpdateDailyNote) { onUpdateDailyNote(dateKey, newNote); } else { onUpdate({ ...data, dailyNotes: { ...(data.dailyNotes || {}), [dateKey]: newNote } }); } }} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Insert Checklist"><CheckSquare size={16} /></button></h3>`
);

// Add import CheckSquare if missing
if (!content.includes('CheckSquare')) {
  content = content.replace("Trash2,", "Trash2, CheckSquare,");
}

fs.writeFileSync('components/HabitTracker.tsx', content);
