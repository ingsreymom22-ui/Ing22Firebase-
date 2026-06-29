import fs from 'fs';
const files = [
  './components/AISelfLearningModal.tsx',
  './components/Reflections.tsx',
  './components/DPSSTable.tsx',
  './components/HabitTracker.tsx',
  './components/AIChatModal.tsx',
  './components/SelfLearningTable.tsx',
  './components/DailyTaskTable.tsx',
  './services/geminiService.ts',
  './services/neuralEngine.ts',
  './server.ts'
];
for(const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/gemini-1\.5-flash-latest/g, 'gemini-3-flash-preview');
    // also remove the fallback logic in neuralEngine
    content = content.replace(/const modelToUse =.*?;/g, ''); 
    content = content.replace(/modelToUse/g, 'engine');
    fs.writeFileSync(file, content);
  }
}
