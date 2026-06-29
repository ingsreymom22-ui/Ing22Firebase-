import React, { useState, useMemo, useEffect } from 'react';
import { AppData, AdvancedHabit, HabitReframerRecord } from '../types';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Sparkles, 
  Scale, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Flame, 
  Brain, 
  ShieldAlert, 
  CheckCircle2, 
  PlusCircle,
  HelpCircle,
  Calendar,
  X,
  Gauge,
  Hourglass,
  Sliders,
  Check,
  Save,
  Edit,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  startOfWeek, 
  addDays, 
  format, 
  isToday as checkIsToday, 
  parseISO, 
  subDays,
  startOfDay
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface AdvancedHabitTrackerProps {
  data: AppData;
  onUpdate: (newDataOrUpdater: AppData | ((prev: AppData) => AppData)) => void;
}

const DEFAULT_COLOR_THEMES = [
  { id: 'amber', bg: 'bg-amber-50/75 border-amber-200 text-amber-800', activeBg: 'bg-amber-600', barBg: 'bg-amber-200/60', accent: 'text-amber-700', ring: 'focus:ring-amber-500/20' },
  { id: 'emerald', bg: 'bg-emerald-50/75 border-emerald-200 text-emerald-800', activeBg: 'bg-emerald-600', barBg: 'bg-emerald-200/60', accent: 'text-emerald-700', ring: 'focus:ring-emerald-500/20' },
  { id: 'rose', bg: 'bg-rose-50/75 border-rose-200 text-rose-800', activeBg: 'bg-rose-600', barBg: 'bg-rose-200/60', accent: 'text-rose-700', ring: 'focus:ring-rose-500/20' },
  { id: 'slate', bg: 'bg-slate-50/75 border-slate-200 text-slate-800', activeBg: 'bg-slate-700', barBg: 'bg-slate-300/65', accent: 'text-slate-700', ring: 'focus:ring-slate-500/20' },
  { id: 'bronze', bg: 'bg-[#fcf9f2] border-yellow-300 text-amber-900', activeBg: 'bg-[#ca8a04]', barBg: 'bg-yellow-250', accent: 'text-[#854d0e]', ring: 'focus:ring-[#ca8a04]/20' }
];

// Individual day input to prevent parent card re-renders on every keystroke
const DailyValueInput = React.memo(({ initialValue, onSave, style }: { initialValue: number, onSave: (val: string) => void, style: any }) => {
  const [localValue, setLocalValue] = useState(initialValue === 0 ? '' : initialValue.toString());
  
  useEffect(() => {
    setLocalValue(initialValue === 0 ? '' : initialValue.toString());
  }, [initialValue]);

  return (
    <input 
      type="number"
      min="0"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== (initialValue === 0 ? '' : initialValue.toString())) {
          onSave(localValue);
        }
      }}
      placeholder="0"
      className={`w-full text-center bg-transparent text-base font-black outline-none placeholder:text-slate-300 font-mono transition-all focus:scale-110 ${style.inputColor}`}
    />
  );
});

// Memoized Habit Card to isolate re-renders and fix typing lag issues
const AdvancedHabitCard = React.memo(({ 
  habit, 
  stats, 
  theme, 
  onLogValue, 
  onOpenLogging, 
  onEdit, 
  onDelete, 
  onOpenNote,
  logs 
}: {
  habit: AdvancedHabit;
  stats: any;
  theme: any;
  onLogValue: (id: string, date: Date, val: string) => void;
  onOpenLogging: (id: string) => void;
  onEdit: (habit: AdvancedHabit) => void;
  onDelete: (id: string) => void;
  onOpenNote: (habit: AdvancedHabit, dateStr: string) => void;
  logs: any;
}) => {
  const { dailyValues, total, average } = stats;
  const isLimit = habit.goalType === 'limit';
  const hasGoal = habit.weeklyGoal !== undefined;
  const limitExceeded = hasGoal && isLimit && total > (habit.weeklyGoal || 0);
  const targetAchieved = hasGoal && !isLimit && total >= (habit.weeklyGoal || 0);

  // Heatmap color mapper helper
  const getHeatmapColor = (habit: AdvancedHabit, val: number, themeId: string) => {
    if (val === 0) return habit.type === 'dopamine' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-100 hover:bg-slate-200';
    if (habit.type === 'dopamine') {
      const dailyCap = habit.weeklyGoal ? (habit.weeklyGoal / 7) : 0;
      if (dailyCap > 0 && val > dailyCap) return 'bg-rose-500 hover:bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
      return 'bg-amber-400 hover:bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.3)]';
    }
    const dailyTarget = habit.weeklyGoal ? (habit.weeklyGoal / 7) : 1;
    const ratio = val / dailyTarget;
    if (themeId === 'amber') return ratio >= 1 ? 'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.3)]' : ratio >= 0.5 ? 'bg-amber-400' : 'bg-amber-200';
    if (themeId === 'emerald') return ratio >= 1 ? 'bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.3)]' : ratio >= 0.5 ? 'bg-emerald-400' : 'bg-emerald-200';
    if (themeId === 'rose') return ratio >= 1 ? 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.3)]' : ratio >= 0.5 ? 'bg-rose-400' : 'bg-rose-200';
    return ratio >= 1 ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.3)]' : ratio >= 0.5 ? 'bg-indigo-400' : 'bg-indigo-200';
  };

  // Helper to color coordinate days
  const getDayStyle = (day: Date) => {
    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const dayIndex = (day.getDay() + 6) % 7;
    if (isToday) return { bg: 'bg-white border-indigo-200 shadow-lg shadow-indigo-100 ring-2 ring-indigo-50', labelColor: 'text-indigo-600 font-extrabold', inputColor: 'text-slate-900', numColor: 'text-indigo-400' };
    return { bg: 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm', labelColor: 'text-slate-400', inputColor: 'text-slate-900', numColor: 'text-slate-400' };
  };

  const past30Days = Array.from({ length: 30 }).map((_, i) => subDays(startOfDay(new Date()), 29 - i));

  return (
    <motion.div layout className="bg-white/90 backdrop-blur-md rounded-[40px] border border-slate-100 shadow-[0_8px_32px_rgba(15,23,42,0.05)] p-8 relative group/card hover:shadow-[0_16px_48px_rgba(15,23,42,0.1)] hover:border-slate-200 transition-all duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-50 mb-8">
        <div className="flex items-start gap-5">
          <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center font-black shadow-inner ${theme.bg}`}>
            {habit.type === 'dopamine' ? <Zap size={26} className="text-amber-500 drop-shadow-sm" /> : <Flame size={26} className="text-emerald-500 drop-shadow-sm" />}
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-[0.01em] uppercase italic">{habit.name}</h3>
            <div className="flex flex-wrap gap-2.5 items-center mt-2">
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl tracking-widest ${habit.type === 'dopamine' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                {habit.type === 'dopamine' ? '🔴 Pleasure Limit' : '🟢 Resilience Target'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{habit.unit}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Strategy</span>
            <span className="text-base font-black text-slate-800">{hasGoal ? `${isLimit ? 'Limit' : 'Goal'} ${habit.weeklyGoal}` : 'Intuitive'} <span className="text-[10px] text-slate-400 uppercase">{habit.unit}</span></span>
          </div>
          <div className="h-10 w-px bg-slate-100" />
          <div className="flex items-center gap-2">
            <button onClick={() => onOpenLogging(habit.id)} className="p-3 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-[18px] transition-all hover:scale-105" title="Quick Batch Log"><Sliders size={18} /></button>
            <button onClick={() => onEdit(habit)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-[18px] transition-all hover:scale-105" title="Edit Metric"><Edit3 size={18} /></button>
            <button onClick={() => onDelete(habit.id)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-[18px] transition-all hover:scale-105" title="Delete Metric"><Trash2 size={18} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 mb-8">
        {dailyValues.map(({ day, val }: { day: Date, val: number }) => {
          const style = getDayStyle(day);
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <div key={day.toISOString()} className={`p-4 rounded-[28px] flex flex-col items-center justify-between min-h-[100px] border-2 transition-all duration-300 ${style.bg} relative group/daycell`}>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenNote(habit, dateStr); }}
                className="absolute top-2 right-2 p-1.5 rounded-xl hover:bg-slate-100 opacity-0 group-hover/daycell:opacity-100 transition-all text-slate-300 hover:text-indigo-500"
              >
                <MessageSquare size={14} />
              </button>
              <span className={`text-[10px] uppercase font-black tracking-[0.2em] ${style.labelColor}`}>{format(day, 'EEE')}</span>
              <div className="my-2">
                <DailyValueInput 
                  initialValue={val} 
                  onSave={(newVal) => onLogValue(habit.id, day, newVal)} 
                  style={style} 
                />
              </div>
              <span className={`text-[9px] font-bold text-slate-300 uppercase tracking-widest`}>{format(day, 'MMM d')}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-50/50">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">30-Day Resilience Heatmap</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded ${i === 0 ? 'bg-slate-100' : 'bg-indigo-300 opacity-' + (i * 25)}`} />)}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 p-3 rounded-[24px] bg-slate-50/50 border border-slate-50 justify-start">
            {past30Days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const val = logs[dateStr]?.[habit.id] || 0;
              const cellBg = getHeatmapColor(habit, val, theme.id);
              return (
                <div 
                  key={dateStr}
                  className={`w-5 h-5 rounded-lg transition-all cursor-crosshair relative group/heatmap ${cellBg}`}
                >
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-3 py-1.5 text-[10px] font-black tracking-widest hidden group-hover/heatmap:block whitespace-nowrap shadow-2xl z-50 pointer-events-none border border-white/10 animate-in fade-in zoom-in duration-200">
                    {format(day, 'MMM d')}: <span className="text-amber-400 font-mono">{val}</span> {habit.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-50/30 p-6 rounded-[32px] border border-white/40 shadow-inner flex flex-col justify-center">
            <div className="flex items-end justify-between mb-4">
               <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Accumulated Load</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{total}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{habit.unit}</span>
                  </div>
               </div>
               <div className="text-right">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Status</span>
                  <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${limitExceeded ? 'bg-rose-100 text-rose-700' : targetAchieved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {limitExceeded ? 'Limit Hit' : targetAchieved ? 'Target Met' : 'In Progress'}
                  </span>
               </div>
            </div>
            {hasGoal && (
               <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-200/50 rounded-full overflow-hidden shadow-inner border border-white/20">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (total / (habit.weeklyGoal || 1)) * 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${limitExceeded ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' : targetAchieved ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.4)]'}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    <span>Baseline</span>
                    <span>{Math.round((total / (habit.weeklyGoal || 1)) * 100)}% to Optima</span>
                  </div>
               </div>
            )}
        </div>
      </div>
    </motion.div>
  );
});

// Cognitive Reframer Modal - FULL 8-STEP D.O.P.A.M.I.N.E Implementation
const CognitiveReframerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  data: AppData;
}> = ({ isOpen, onClose, onSave, data }) => {
  const [form, setForm] = useState({
    thought: '',
    feeling: '',
    intention: '',
    actualOutcome: '',
    alternativeStrategy: '',
    studentId: '',
    isFullDopamineAudit: false,
    substanceOrBehavior: '',
    frequencyAndAmount: '',
    objectives: '',
    pNeuroadaptation: '',
    pRelationships: '',
    pWork: '',
    pFinancial: '',
    pHealth: '',
    pSpiritual: '',
    abstinencePlan: '',
    mindfulnessNotes: '',
    insightHonesty: '',
    nextStepsPlan: '',
    experimentRules: ''
  });

  if (!isOpen) return null;

  const modalSubjectId = form.studentId;
  const modalSubjectName = modalSubjectId ? data.students?.find(s => s.id === modalSubjectId)?.name : 'Self';
  
  const getSubjectShortName = (nameOrText?: string) => {
    if (!nameOrText || nameOrText === 'Self') return 'you';
    const firstWord = nameOrText.trim().split(/\s+/)[0];
    return firstWord || 'you';
  };
  
  const modalShortName = getSubjectShortName(modalSubjectName);

  const AuditStep = ({ letter, title, color, children }: { letter: string, title: string, color: string, children: React.ReactNode }) => (
    <div className={`p-8 rounded-[32px] border ${color === 'indigo' ? 'bg-indigo-50/30 border-indigo-100' : color === 'rose' ? 'bg-rose-50/30 border-rose-100' : 'bg-emerald-50/30 border-emerald-100'} space-y-6 shadow-sm`}>
      <div className={`flex items-center gap-4 border-b pb-4 ${color === 'indigo' ? 'border-indigo-100/50' : color === 'rose' ? 'border-rose-100/50' : 'border-emerald-100/50'}`}>
        <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg ${color === 'indigo' ? 'bg-indigo-600' : color === 'rose' ? 'bg-rose-600' : 'bg-emerald-600'}`}>{letter}</span>
        <h4 className={`text-sm font-black uppercase tracking-[0.2em] italic ${color === 'indigo' ? 'text-indigo-900' : color === 'rose' ? 'text-rose-900' : 'text-emerald-900'}`}>Step {letter}: {title}</h4>
      </div>
      {children}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 40 }}
        className={`bg-white rounded-[48px] p-10 md:p-14 w-full ${form.isFullDopamineAudit ? 'max-w-5xl' : 'max-w-2xl'} border border-slate-200 relative my-8 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] max-h-[94vh] overflow-y-auto no-scrollbar scroll-smooth`}
      >
        <button 
          onClick={onClose}
          className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 p-3 hover:bg-slate-50 rounded-full transition-all group"
        >
          <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
             <Brain className="text-indigo-600" size={32} />
             <span className="text-[11px] font-black uppercase text-indigo-500 tracking-[0.3em]">Cognitive Realignment</span>
          </div>
          <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            {form.isFullDopamineAudit ? 'The D.O.P.A.M.I.N.E. Workbook' : 'The Trigger Loop Audit'}
          </h3>
          <p className="text-base font-medium text-slate-400 mt-4 max-w-xl">
            {form.isFullDopamineAudit 
              ? `An exhaustive 8-step clinical framework to diagnose and purge addictive loops in ${modalShortName}.`
              : `Map out the immediate triggers and emotional states of ${modalShortName} to build a resilient response pivot.`
            }
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-2 bg-slate-100 rounded-[32px] mb-12 border border-slate-200/50 shadow-inner">
          <button
            type="button"
            onClick={() => setForm({ ...form, isFullDopamineAudit: false })}
            className={`py-5 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all ${!form.isFullDopamineAudit ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Trigger Loop
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, isFullDopamineAudit: true })}
            className={`py-5 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all ${form.isFullDopamineAudit ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Full Audit
          </button>
        </div>

        <div className="space-y-4 mb-10">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] block ml-2">Target Profile</label>
          <div className="relative group">
            <select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] py-5 px-8 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-8 focus:ring-indigo-100/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">General / Self (You)</option>
              {data.students?.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
            <ChevronDown size={20} className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:rotate-180 transition-transform" />
          </div>
        </div>

        {!form.isFullDopamineAudit ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-900 tracking-widest block ml-2">1. Automatic Thought</label>
                <textarea value={form.thought} onChange={(e) => setForm({ ...form, thought: e.target.value })} placeholder="What crossed your mind?" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] py-6 px-8 text-sm font-medium h-32 resize-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-900 tracking-widest block ml-2">2. Urge & Feeling</label>
                <textarea value={form.feeling} onChange={(e) => setForm({ ...form, feeling: e.target.value })} placeholder="Boredom, anxiety, Scale 1-10..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] py-6 px-8 text-sm font-medium h-32 resize-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-900 tracking-widest block ml-2">3. Surface Intention</label>
                <textarea value={form.intention} onChange={(e) => setForm({ ...form, intention: e.target.value })} placeholder="The lie you told yourself..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] py-6 px-8 text-sm font-medium h-32 resize-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-900 tracking-widest block ml-2">4. Actual Outcome</label>
                <textarea value={form.actualOutcome} onChange={(e) => setForm({ ...form, actualOutcome: e.target.value })} placeholder="What really happened?" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] py-6 px-8 text-sm font-medium h-32 resize-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" />
              </div>
            </div>
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <label className="text-xs font-black uppercase text-emerald-700 tracking-[0.2em] block ml-2">5. Resilience Resilience Pivot (Target Fix)</label>
              <textarea value={form.alternativeStrategy} onChange={(e) => setForm({ ...form, alternativeStrategy: e.target.value })} placeholder="The hard thing you will do instead next time..." className="w-full bg-white border-2 border-emerald-500 rounded-[40px] py-8 px-8 text-base font-black text-slate-900 h-40 resize-none border-l-[16px] outline-none shadow-[0_32px_64px_rgba(16,185,129,0.15)] ring-8 ring-emerald-50" />
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <AuditStep letter="D" title="Data (Root Behavior)" color="indigo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input value={form.substanceOrBehavior} onChange={(e) => setForm({ ...form, substanceOrBehavior: e.target.value })} placeholder="Behavior/Substance?" className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 px-7 text-sm font-bold shadow-sm" />
                <input value={form.frequencyAndAmount} onChange={(e) => setForm({ ...form, frequencyAndAmount: e.target.value })} placeholder="How much/often?" className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 px-7 text-sm font-bold shadow-sm" />
              </div>
            </AuditStep>

            <AuditStep letter="O" title="Objectives (Why you do it)" color="indigo">
              <textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="What problem is this solving? (Boredom, escape, pain relief?)" className="w-full h-32 bg-white border-2 border-slate-100 rounded-2xl py-5 px-7 text-sm font-medium resize-none shadow-sm" />
            </AuditStep>

            <AuditStep letter="P" title="Problems (Costs Matrix)" color="rose">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-rose-500 ml-2">Neuroadaptation (Tolerance)</label>
                   <textarea value={form.pNeuroadaptation} onChange={(e) => setForm({ ...form, pNeuroadaptation: e.target.value })} placeholder="Does it still feel good?" className="w-full h-24 border-2 rounded-2xl p-4 text-xs font-bold" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-rose-500 ml-2">Life Impact (Work/Health)</label>
                   <textarea value={form.pWork} onChange={(e) => setForm({ ...form, pWork: e.target.value })} placeholder="Sleep? Focus? Career? Health?" className="w-full h-24 border-2 rounded-2xl p-4 text-xs font-bold" />
                 </div>
               </div>
            </AuditStep>

            <AuditStep letter="A" title="Abstinence (The 30-Day Rule)" color="emerald">
               <textarea value={form.abstinencePlan} onChange={(e) => setForm({ ...form, abstinencePlan: e.target.value })} placeholder="How will you survive the first 30 days of reset?" className="w-full h-32 bg-white border-2 border-emerald-100 rounded-2xl py-5 px-7 text-sm font-extrabold resize-none shadow-lg" />
            </AuditStep>

            <div className="p-10 bg-slate-900 rounded-[48px] shadow-2xl space-y-8 animate-pulse border-[6px] border-indigo-500/20">
               <div className="text-center">
                  <h4 className="text-white font-black uppercase text-xs tracking-[0.4em] mb-4">Steps M.I.N.E. (Deep Reflection)</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <textarea value={form.mindfulnessNotes} onChange={(e) => setForm({ ...form, mindfulnessNotes: e.target.value })} placeholder="Mindfulness (Sit with the pain)" className="w-full h-32 bg-slate-800 border-none rounded-3xl p-6 text-indigo-300 text-xs font-black placeholder:text-slate-600" />
                 <textarea value={form.insightHonesty} onChange={(e) => setForm({ ...form, insightHonesty: e.target.value })} placeholder="Insight (The radical truth)" className="w-full h-32 bg-slate-800 border-none rounded-3xl p-6 text-indigo-300 text-xs font-black placeholder:text-slate-600" />
                 <textarea value={form.nextStepsPlan} onChange={(e) => setForm({ ...form, nextStepsPlan: e.target.value })} placeholder="Next Steps (Forward action)" className="w-full h-32 bg-indigo-600 border-none rounded-3xl p-6 text-white text-xs font-black placeholder:text-indigo-400 shadow-xl" />
                 <textarea value={form.experimentRules} onChange={(e) => setForm({ ...form, experimentRules: e.target.value })} placeholder="Experiment Rules (Long-term)" className="w-full h-32 bg-indigo-600 border-none rounded-3xl p-6 text-white text-xs font-black placeholder:text-indigo-400 shadow-xl" />
               </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 mt-16 pt-12 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 py-6 text-slate-400 font-black text-xs uppercase tracking-[0.3em] transition-colors hover:text-slate-900">Abort Audit</button>
          <button type="button" onClick={() => onSave(form)} className="flex-[2] bg-slate-900 text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.4em] shadow-[0_24px_48px_rgba(15,23,42,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4">
             <Save size={18} /> Serialize to Database
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AdvancedHabitTracker: React.FC<AdvancedHabitTrackerProps> = ({ data, onUpdate }) => {
  const [activeMainTab, setActiveMainTab] = useState<'tracker' | 'analytics' | 'journal'>('tracker');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isLoggingModalOpen, setIsLoggingModalOpen] = useState<string | null>(null); // habit ID
  const [activeFastingTab, setActiveFastingTab] = useState<'tracker' | 'reflections'>('tracker');
  const [newFastRef, setNewFastRef] = useState('');
  const [previewName, setPreviewName] = useState('Self');

  // Dopamine Fast Scheduler States
  const [schedulerTab, setSchedulerTab] = useState<'presets' | 'custom'>('presets');
  const [schedStartDate, setSchedStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [schedEndDate, setSchedEndDate] = useState(format(addDays(new Date(), 4), 'yyyy-MM-dd'));
  const [isGeneratingFastingPrompts, setIsGeneratingFastingPrompts] = useState(false);

  // Dopamine Fast reset history and completion states
  const [isCompletingFast, setIsCompletingFast] = useState(false);
  const [finalReflectionText, setFinalReflectionText] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('Notifications not supported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setRemindersEnabled(true);
        new Notification('Reminders Enabled', { body: 'You will receive local reminders for uncompleted targets!', icon: '/logo.png' });
      }
    } catch (e) {
      console.log('Notification permission failed', e);
    }
  };

  const [editingAdvancedNoteState, setEditingAdvancedNoteState] = useState<{
    habitId: string;
    habitName: string;
    habitColor?: string;
    date: string;
    noteText: string;
  } | null>(null);

  const openAdvancedNoteDialog = (habit: AdvancedHabit, dateStr: string) => {
    const existingNote = data.advancedHabitNotes?.[dateStr]?.[habit.id] || '';
    setEditingAdvancedNoteState({
      habitId: habit.id,
      habitName: habit.name,
      habitColor: habit.color === 'emerald' ? '#10b981' : habit.color === 'rose' ? '#f43f5e' : habit.color === 'sky' ? '#0ea5e9' : '#6366f1',
      date: dateStr,
      noteText: existingNote
    });
  };

  // CBT Habit Writing states
  const [isAddingReframer, setIsAddingReframer] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Form states for custom habit
  const [habitForm, setHabitForm] = useState({
    name: '',
    type: 'dopamine' as 'dopamine' | 'effort',
    unit: 'Minutes',
    weeklyGoal: '120',
    goalType: 'limit' as 'limit' | 'target',
    color: 'amber'
  });

  // Editing habit states
  const [editingHabit, setEditingHabit] = useState<AdvancedHabit | null>(null);
  const [editHabitForm, setEditHabitForm] = useState({
    name: '',
    type: 'dopamine' as 'dopamine' | 'effort',
    unit: 'Minutes',
    weeklyGoal: '',
    color: 'amber'
  });

  const handleEditHabitStart = (habit: AdvancedHabit) => {
    setEditingHabit(habit);
    setEditHabitForm({
      name: habit.name,
      type: habit.type,
      unit: habit.unit || 'Minutes',
      weeklyGoal: habit.weeklyGoal !== undefined ? habit.weeklyGoal.toString() : '',
      color: habit.color || 'amber'
    });
  };

  const handleSaveEditedHabit = () => {
    if (!editingHabit) return;
    if (!editHabitForm.name.trim()) return;

    const updatedHabits = habits.map(h => {
      if (h.id === editingHabit.id) {
        return {
          ...h,
          name: editHabitForm.name.trim(),
          type: editHabitForm.type,
          unit: editHabitForm.unit,
          weeklyGoal: editHabitForm.weeklyGoal ? parseFloat(editHabitForm.weeklyGoal) : undefined,
          goalType: editHabitForm.type === 'dopamine' ? ('limit' as const) : ('target' as const),
          color: editHabitForm.color
        };
      }
      return h;
    });

    onUpdate(prev => ({
      ...prev,
      advancedHabits: (prev.advancedHabits || []).map(h => {
        if (h.id === editingHabit.id) {
          return {
            ...h,
            name: editHabitForm.name.trim(),
            type: editHabitForm.type,
            unit: editHabitForm.unit,
            weeklyGoal: editHabitForm.weeklyGoal ? parseFloat(editHabitForm.weeklyGoal) : undefined,
            goalType: editHabitForm.type === 'dopamine' ? ('limit' as const) : ('target' as const),
            color: editHabitForm.color
          };
        }
        return h;
      })
    }));

    setEditingHabit(null);
  };

  // Heatmap color mapper helper
  const getHeatmapColor = (habit: AdvancedHabit, val: number, themeId: string) => {
    if (val === 0) {
      if (habit.type === 'dopamine') return 'bg-emerald-500 hover:bg-emerald-600'; // Clean slate!
      return 'bg-slate-100 hover:bg-slate-200';
    }
    
    if (habit.type === 'dopamine') {
      const dailyCap = habit.weeklyGoal ? (habit.weeklyGoal / 7) : 0;
      if (dailyCap > 0 && val > dailyCap) {
        return 'bg-rose-500 hover:bg-rose-600'; // limit exceeded
      }
      return 'bg-amber-400 hover:bg-amber-500'; // moderate use
    }
    
    // Effort type: map to theme color shades
    const dailyTarget = habit.weeklyGoal ? (habit.weeklyGoal / 7) : 1;
    const ratio = val / dailyTarget;
    
    if (themeId === 'amber') {
      if (ratio >= 1) return 'bg-amber-600 hover:bg-amber-700';
      if (ratio >= 0.5) return 'bg-amber-400 hover:bg-amber-500';
      return 'bg-amber-200 hover:bg-amber-300';
    }
    if (themeId === 'emerald') {
      if (ratio >= 1) return 'bg-emerald-600 hover:bg-emerald-700';
      if (ratio >= 0.5) return 'bg-emerald-400 hover:bg-emerald-500';
      return 'bg-emerald-200 hover:bg-emerald-300';
    }
    if (themeId === 'rose') {
      if (ratio >= 1) return 'bg-rose-600 hover:bg-rose-700';
      if (ratio >= 0.5) return 'bg-rose-400 hover:bg-rose-500';
      return 'bg-rose-200 hover:bg-rose-300';
    }
    if (themeId === 'sky') {
      if (ratio >= 1) return 'bg-sky-600 hover:bg-sky-700';
      if (ratio >= 0.5) return 'bg-sky-400 hover:bg-sky-500';
      return 'bg-sky-200 hover:bg-sky-300';
    }
    if (themeId === 'violet') {
      if (ratio >= 1) return 'bg-violet-600 hover:bg-violet-700';
      if (ratio >= 0.5) return 'bg-violet-400 hover:bg-violet-500';
      return 'bg-violet-200 hover:bg-violet-300';
    }
    // default indigo
    if (ratio >= 1) return 'bg-indigo-600 hover:bg-indigo-700';
    if (ratio >= 0.5) return 'bg-indigo-400 hover:bg-indigo-500';
    return 'bg-indigo-200 hover:bg-indigo-300';
  };

  // Generate 30 days interval statically
  const past30Days = useMemo(() => {
    const dates = [];
    const today = startOfDay(new Date());
    for (let i = 29; i >= 0; i--) {
      dates.push(subDays(today, i));
    }
    return dates;
  }, []);

  // Helper function to color coordinate days of week elegantly from Monday to Sunday
  const getDayStyle = (day: Date, isToday: boolean) => {
    // Get customized absolute index relative to Monday: Mon=0, Tue=1, ..., Sun=6
    const dayIndex = (day.getDay() + 6) % 7;
    
    if (isToday) {
      return {
        bg: 'bg-amber-100/50 border-amber-400 text-amber-950 shadow-inner font-extrabold ring-1 ring-amber-400/30',
        labelColor: 'text-amber-800 font-extrabold',
        inputColor: 'text-amber-950 focus:text-amber-700',
        numColor: 'text-amber-750 font-black'
      };
    }
    
    // Distinct, gorgeous warm clay / sage / terracotta / gold elements for each weekday
    const DAY_THEMES = [
      { // Monday
        bg: 'bg-[#faf6f0] hover:bg-[#faf4ea] border-amber-200/80 text-amber-900',
        labelColor: 'text-amber-600 font-bold',
        inputColor: 'text-slate-900 focus:text-amber-600',
        numColor: 'text-amber-600'
      },
      { // Tuesday
        bg: 'bg-[#fef5f5] hover:bg-[#fef0f0] border-rose-200/85 text-rose-900',
        labelColor: 'text-rose-500 font-bold',
        inputColor: 'text-slate-900 focus:text-rose-600',
        numColor: 'text-rose-605'
      },
      { // Wednesday
        bg: 'bg-[#f4faf6] hover:bg-[#ebf7ee] border-emerald-200/85 text-emerald-900',
        labelColor: 'text-emerald-600 font-bold',
        inputColor: 'text-slate-900 focus:text-emerald-600',
        numColor: 'text-emerald-600'
      },
      { // Thursday
        bg: 'bg-[#fcf7ee] hover:bg-[#faf2e4] border-orange-200/85 text-amber-900',
        labelColor: 'text-orange-500 font-bold',
        inputColor: 'text-slate-900 focus:text-orange-600',
        numColor: 'text-orange-600'
      },
      { // Friday
        bg: 'bg-[#faf9f2] hover:bg-[#f8f6e8] border-yellow-300 text-yellow-950',
        labelColor: 'text-amber-700 font-bold',
        inputColor: 'text-slate-900 focus:text-amber-600',
        numColor: 'text-amber-600'
      },
      { // Saturday
        bg: 'bg-[#f2faf9] hover:bg-[#e6f5f4] border-teal-200/85 text-teal-900',
        labelColor: 'text-teal-500 font-bold',
        inputColor: 'text-slate-900 focus:text-teal-600',
        numColor: 'text-teal-600'
      },
      { // Sunday
        bg: 'bg-[#fbp6fe]/30 hover:bg-[#f6f2fc]/60 border-purple-200/85 text-purple-900',
        labelColor: 'text-purple-500 font-bold',
        inputColor: 'text-slate-900 focus:text-purple-600',
        numColor: 'text-purple-605'
      },
    ];
    
    return DAY_THEMES[dayIndex] || DAY_THEMES[0];
  };

  const habits = data.advancedHabits || [];
  const logs = data.advancedHabitLogs || {};

  // Formatted start & end of currently viewing week
  const startOfCurrentWeek = useMemo(() => {
    return startOfWeek(selectedDate, { weekStartsOn: 1 }); // Starts on Monday
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));
  }, [startOfCurrentWeek]);

  // Fasting Challenge state: (stored in settings for easy persistence)
  const fastingState = data.settings?.dopamineFast || {
    isActive: false,
    startDate: '',
    durationDays: 1,
    reflections: [] as { date: string; content: string }[]
  };

  const todayKeyStr = format(new Date(), 'yyyy-MM-dd');
  const activePrompt = useMemo(() => {
    if (!fastingState.isActive || !fastingState.prompts) return null;
    return fastingState.prompts.find((p: any) => p.date === todayKeyStr);
  }, [fastingState, todayKeyStr]);

  const handlePrevWeek = () => {
    setSelectedDate(subDays(selectedDate, 7));
  };

  const handleNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const showReminderNotification = (uncompletedCount: number) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Habit Reminder', {
          body: `You have ${uncompletedCount} effort targets to work on today!`,
          icon: '/logo.png'
        });
      } catch (e) {
        console.error('Failed to display notification:', e);
      }
    }
  };

  const getSubjectShortName = (nameOrText?: string) => {
    if (!nameOrText || nameOrText === 'Self') return 'you';
    const firstWord = nameOrText.trim().split(/\s+/)[0];
    return firstWord || 'you';
  };

  const handleAddReframer = (formData: any) => {
    if (formData.isFullDopamineAudit && !formData.substanceOrBehavior?.trim()) {
      alert('Please fill out the Substance or Behavior (Data) field to proceed.');
      return;
    }
    if (!formData.isFullDopamineAudit && !formData.thought.trim()) {
      alert('Please fill out the Automatic Thought field.');
      return;
    }
    const selectedStudent = data.students?.find(s => s.id === formData.studentId);
    
    const newRecord: HabitReframerRecord = {
      id: uuidv4(),
      date: new Date().toISOString(),
      thought: formData.isFullDopamineAudit 
        ? `Behavior: ${formData.substanceOrBehavior?.trim()}` 
        : formData.thought.trim(),
      feeling: formData.isFullDopamineAudit 
        ? `${formData.frequencyAndAmount?.trim() || 'Dopamine audit'}` 
        : formData.feeling.trim(),
      intention: formData.isFullDopamineAudit 
        ? `Reset: ${formData.abstinencePlan?.trim() || 'Purification'}` 
        : formData.intention.trim(),
      actualOutcome: formData.isFullDopamineAudit 
        ? `Action: ${formData.nextStepsPlan?.trim() || 'Post-reset code'}` 
        : formData.actualOutcome.trim(),
      alternativeStrategy: formData.isFullDopamineAudit 
        ? `Rules: ${formData.experimentRules?.trim() || 'Active Experiment'}` 
        : formData.alternativeStrategy.trim(),
      studentId: formData.studentId || undefined,
      studentName: selectedStudent ? selectedStudent.name : 'Self',
      
      // Save all extended fields for full DOPAMINE framework
      isFullDopamineAudit: formData.isFullDopamineAudit,
      substanceOrBehavior: formData.substanceOrBehavior?.trim() || undefined,
      frequencyAndAmount: formData.frequencyAndAmount?.trim() || undefined,
      objectives: formData.objectives?.trim() || undefined,
      
      pNeuroadaptation: formData.pNeuroadaptation?.trim() || undefined,
      pRelationships: formData.pRelationships?.trim() || undefined,
      pWork: formData.pWork?.trim() || undefined,
      pFinancial: formData.pFinancial?.trim() || undefined,
      pHealth: formData.pHealth?.trim() || undefined,
      pSpiritual: formData.pSpiritual?.trim() || undefined,
      
      abstinencePlan: formData.abstinencePlan?.trim() || undefined,
      mindfulnessNotes: formData.mindfulnessNotes?.trim() || undefined,
      insightHonesty: formData.insightHonesty?.trim() || undefined,
      nextStepsPlan: formData.nextStepsPlan?.trim() || undefined,
      experimentRules: formData.experimentRules?.trim() || undefined
    };
    
    onUpdate(prev => ({
      ...prev,
      habitReframers: [newRecord, ...(prev.habitReframers || [])]
    }));
    
    setIsAddingReframer(false);
  };

  const handleDeleteReframer = (id: string) => {
    if (window.confirm('Are you sure you want to delete this cognitive alignment reflection record?')) {
      onUpdate((prev: AppData) => ({
        ...prev,
        habitReframers: (prev.habitReframers || []).filter(r => r.id !== id)
      }));
    }
  };

  const handleAddAdvancedHabit = () => {
    if (!habitForm.name.trim()) return;

    const newHabit: AdvancedHabit = {
      id: uuidv4(),
      name: habitForm.name.trim(),
      type: habitForm.type,
      unit: habitForm.unit,
      weeklyGoal: habitForm.weeklyGoal ? parseFloat(habitForm.weeklyGoal) : undefined,
      goalType: habitForm.type === 'dopamine' ? 'limit' : 'target',
      color: habitForm.color,
      createdAt: new Date().toISOString()
    };

    onUpdate(prev => ({
      ...prev,
      advancedHabits: [...(prev.advancedHabits || []), newHabit]
    }));

    setHabitForm({
      name: '',
      type: 'dopamine',
      unit: 'Minutes',
      weeklyGoal: '120',
      goalType: 'limit',
      color: 'sky'
    });
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = (id: string) => {
    if (confirm('Are you sure you want to delete this habit and all its logged statistics?')) {
      onUpdate((prev: AppData) => ({
        ...prev,
        advancedHabits: (prev.advancedHabits || []).filter(h => h.id !== id)
      }));
    }
  };

  // Safe numerical logging
  const handleLogValue = (habitId: string, dayDate: Date, valueStr: string) => {
    const dateStr = format(dayDate, 'yyyy-MM-dd');
    const numericVal = parseFloat(valueStr);
    const finalVal = isNaN(numericVal) ? 0 : Math.max(0, numericVal);

    const updatedLogs = { ...logs };
    if (!updatedLogs[dateStr]) {
      updatedLogs[dateStr] = {};
    }
    updatedLogs[dateStr][habitId] = finalVal;

    onUpdate((prev: AppData) => ({
      ...prev,
      advancedHabitLogs: updatedLogs
    }));
  };

  // Helper: Format metrics beautifully, handle minutes conversion to hours
  const formatMetric = (val: number, unit: string) => {
    const num = val || 0;
    if (unit.toLowerCase() === 'minutes') {
      if (num >= 60) {
        const hrs = Math.floor(num / 60);
        const mins = Math.round(num % 60);
        return `${num}m (${hrs}h ${mins}m)`;
      }
      return `${num} mins`;
    }
    return `${num} ${unit}`;
  };

  // Retrieve logged values for a habit across the 7 days of the selected week
  const getWeeklyHabitStats = (habit: AdvancedHabit) => {
    let total = 0;
    const dailyValues = weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const val = logs[dateStr]?.[habit.id] || 0;
      total += val;
      return { day, val };
    });

    const average = total / 7;
    return { dailyValues, total, average };
  };

  // Totals for Dopamine (Pleasure) and Effort (Pain/Resilience)
  const balanceSums = useMemo(() => {
    let dopaminePoints = 0;
    let effortPoints = 0;

    habits.forEach(h => {
      const { total } = getWeeklyHabitStats(h);
      // We normalize slightly: minutes are divided by 60 for hour-equivalent load, others taken directly
      const points = h.unit.toLowerCase() === 'minutes' ? total / 60 : total;
      if (h.type === 'dopamine') {
        dopaminePoints += points;
      } else {
        effortPoints += points;
      }
    });

    return { dopaminePoints, effortPoints };
  }, [habits, logs, startOfCurrentWeek]);

  // Compute scale angle of tilt based on balance
  const tiltAngle = useMemo(() => {
    const { dopaminePoints, effortPoints } = balanceSums;
    if (dopaminePoints === 0 && effortPoints === 0) return 0;
    const diff = effortPoints - dopaminePoints; // more effort tilts right (+), more dopamine tilts left (-)
    const maxScore = Math.max(1, dopaminePoints + effortPoints);
    const rawTilt = (diff / maxScore) * 25; // tilt up to 25 degrees
    return Math.min(Math.max(rawTilt, -25), 25);
  }, [balanceSums]);

  // Start Dopamine Reset Fast from Scheduling Flow
  const handleStartScheduledFast = async () => {
    const daysBetween = (d1: string, d2: string) => {
      const date1 = new Date(d1);
      const date2 = new Date(d2);
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    };

    const daysLeadUp = daysBetween(format(new Date(), 'yyyy-MM-dd'), schedStartDate);
    const durationDays = daysBetween(schedStartDate, schedEndDate) + 1; // inclusive

    setIsGeneratingFastingPrompts(true);
    let parsedPrompts = [];
    try {
      const systemInstruction = 'You are an elite cognitive-behavioral coach, neuroscientist, and clinical psychologist specialising in dopamine detox and brain receptor purification. Your task is to output a single JSON array with absolutely no markdown wrapping, tick marks, or lead text context. Starting with [ and ending with ].';
      const userPrompt = `I am scheduling a Dopamine Fast.
Start Date: ${schedStartDate}
End Date: ${schedEndDate}
Today is: ${format(new Date(), 'yyyy-MM-dd')}

Please generate standard daily motivational focus prompts for this sequence.
Generate exactly 1 prompt item per date:
- For dates in the preparation/lead-up stage (from today ${format(new Date(), 'yyyy-MM-dd')} until the day before the fast starts). Content focuses on digital cleaning, grouping sensory hooks, and preparing papers / offline activities.
- For dates during the fast (from ${schedStartDate} to ${schedEndDate}). Content focuses on handling boredom, dealing with dopamine withdrawal cravings, focus endurance, and slow reading.

Format output strictly as a single JSON array (no markdown backticks, no comments, just the raw valid array):
Array<{ date: string, stage: 'lead-up' | 'during', content: string }>
date format must be 'yyyy-MM-dd'.`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemInstruction,
          model: 'gemini-3.5-flash'
        })
      });

      if (response.ok) {
        const resData = await response.json();
        const jsonText = resData.text?.replace(/```json|```/g, '').trim() || '[]';
        try {
          parsedPrompts = JSON.parse(jsonText);
        } catch (err) {
          console.error("Fasting prompt JSON parse error, falling back", err);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingFastingPrompts(false);
    }

    // Programmatic backup generator if empty or error
    if (!parsedPrompts || parsedPrompts.length === 0) {
      const backup = [];
      // Today lead up
      backup.push({
        date: format(new Date(), 'yyyy-MM-dd'),
        stage: 'lead-up',
        content: 'Preparation mode active: Declutter your home screen, group sensory triggers, and announce your digital detox boundary to a close friend.'
      });
      // Fasting days
      let cur = new Date(schedStartDate);
      const endD = new Date(schedEndDate);
      let safety = 50;
      while (cur <= endD && safety > 0) {
        safety--;
        const curStr = format(cur, 'yyyy-MM-dd');
        backup.push({
          date: curStr,
          stage: 'during',
          content: 'Detox mode active: Lean fully into stillness. When Boredom peaks, observe it as your neuro-receptors rewiring and restoring deep-level focus capabilities.'
        });
        cur = addDays(cur, 1);
      }
      parsedPrompts = backup;
    }

    onUpdate((prev: AppData) => ({
      ...prev,
      settings: {
        ...prev.settings,
        dopamineFast: {
          isActive: true,
          startDate: schedStartDate,
          endDate: schedEndDate,
          durationDays: durationDays,
          prompts: parsedPrompts,
          reflections: []
        }
      }
    }));
  };

  // Start Dopamine Reset Fast
  const handleStartResetFast = (days: number) => {
    onUpdate((prev: AppData) => ({
      ...prev,
      settings: {
        ...prev.settings,
        dopamineFast: {
          isActive: true,
          startDate: format(new Date(), 'yyyy-MM-dd'),
          durationDays: days,
          reflections: []
        }
      }
    }));
  };

  // End / Stop Fast
  const handleStopResetFast = () => {
    if (confirm('Stop your dopamine reset process early? Receptors restore best when you complete the session.')) {
      onUpdate((prev: AppData) => ({
        ...prev,
        settings: {
          ...prev.settings,
          dopamineFast: {
            isActive: false,
            startDate: '',
            durationDays: 1,
            reflections: []
          }
        }
      }));
    }
  };

  // Master triggers for Word & Excel Exporting (fully compatible with local MS Word/Excel printing)
  const exportCBTToWord = (record: HabitReframerRecord) => {
    const subjectName = record.studentName || 'Self';
    const dateFormatted = format(new Date(record.date), 'MMMM dd, yyyy HH:mm');
    const title = record.isFullDopamineAudit 
      ? 'D.O.P.A.M.I.N.E. Complete Reset Audit' 
      : 'Cognitive Trigger & Core Loop Audit';

    let contentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0;
            padding: 0; 
            color: #333333; 
            line-height: 1.6; 
            background-color: #ffffff;
          }
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
          }
          p, li, tr, .question-box, .btn-pivot, .problem-cell, table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1 { color: #1e293b; font-size: 24px; border-bottom: 2px solid #ca8a04; padding-bottom: 10px; margin-bottom: 5px; text-transform: uppercase; }
          h2 { color: #334155; font-size: 15px; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
          .meta { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; }
          .question-box { background-color: #faf9f6; border-left: 4px solid #ca8a04; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
          .btn-pivot { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
          .label { font-weight: bold; font-size: 11px; color: #475569; text-transform: uppercase; margin-bottom: 5px; display: block; }
          .value { font-size: 13px; font-weight: 500; color: #0f172a; white-space: pre-wrap; }
          .problem-grid { display: table; width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
          .problem-row { display: table-row; }
          .problem-cell { display: table-cell; border: 1px solid #e2e8f0; padding: 12px; width: 50%; vertical-align: top; background-color: #faf9f6; }
          .problem-title { font-weight: bold; font-size: 11px; color: #e11d48; text-transform: uppercase; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Subject: ${subjectName} &bull; Logged: ${dateFormatted}</div>
    `;

    if (record.isFullDopamineAudit) {
      contentHtml += `
        <h2>Step 1: Data (Substance or Behavior)</h2>
        <div class="question-box">
          <div class="label">Behavior description:</div>
          <div class="value">${record.substanceOrBehavior || 'N/A'}</div>
          ${record.frequencyAndAmount ? `<div class="label" style="margin-top: 10px;">Frequency & logs:</div><div class="value">${record.frequencyAndAmount}</div>` : ''}
        </div>

        <h2>Step 2: Objectives (Motive of pursuit)</h2>
        <div class="question-box">
          <div class="label">Why is it pursued?</div>
          <div class="value">${record.objectives || 'N/A'}</div>
        </div>

        <h2>Step 3: Problems Checked (DOPAMINE 6-dimensional analysis)</h2>
        <div class="problem-grid">
          <div class="problem-row">
            <div class="problem-cell">
              <div class="problem-title">🌀 Neuroadaptation (tolerance & craving)</div>
              <div class="value">${record.pNeuroadaptation || 'None logged'}</div>
            </div>
            <div class="problem-cell">
              <div class="problem-title">👥 Relationships (impact on boundaries)</div>
              <div class="value">${record.pRelationships || 'None logged'}</div>
            </div>
          </div>
          <div class="problem-row">
            <div class="problem-cell">
              <div class="problem-title">💼 Work & Study problems</div>
              <div class="value">${record.pWork || 'None logged'}</div>
            </div>
            <div class="problem-cell">
              <div class="problem-title">💳 Financial cost</div>
              <div class="value">${record.pFinancial || 'None logged'}</div>
            </div>
          </div>
          <div class="problem-row">
            <div class="problem-cell" style="width:100%;" colspan="2">
              <div class="problem-title">❤️ Physical health / Sleep problems</div>
              <div class="value">${record.pHealth || 'None logged'}</div>
            </div>
          </div>
          <div class="problem-row">
            <div class="problem-cell" style="width:100%;" colspan="2">
              <div class="problem-title">✨ Spiritual & Values alignment</div>
              <div class="value">${record.pSpiritual || 'None logged'}</div>
            </div>
          </div>
        </div>

        <h2>Step 4: Abstinence Reset plan (Resetting receptors)</h2>
        <div class="question-box">
          <div class="label">Details of standard abstinence rules:</div>
          <div class="value">${record.abstinencePlan || 'N/A'}</div>
        </div>

        <h2>Step 5: Mindfulness waves (Craving surfing)</h2>
        <div class="question-box">
          <div class="label">How will I cope with withdrawal waves?</div>
          <div class="value">${record.mindfulnessNotes || 'N/A'}</div>
        </div>

        <h2>Step 6: Insight & Honesty (Self-deception review)</h2>
        <div class="question-box">
          <div class="label">What are my classic rationalizations/excuses?</div>
          <div class="value">${record.insightHonesty || 'N/A'}</div>
        </div>

        <h2>Step 7: Next Steps moderated plan</h2>
        <div class="question-box">
          <div class="label">Proactive limits after reset:</div>
          <div class="value">${record.nextStepsPlan || 'N/A'}</div>
        </div>

        <h2>Step 8: Active Experiment rules (Discipline Pivot)</h2>
        <div class="btn-pivot">
          <div class="label" style="color: #16a34a;">My Active Discipline Pivot rules:</div>
          <div class="value" style="font-weight: bold; color: #14532d;">${record.experimentRules || record.alternativeStrategy || 'N/A'}</div>
        </div>
      `;
    } else {
      contentHtml += `
        <h2>Step 1: Automatic Trigger Thought</h2>
        <div class="question-box">
          <div class="value">${record.thought || 'N/A'}</div>
        </div>

        <h2>Step 2: Urges / Emotional Craving core</h2>
        <div class="question-box">
          <div class="value">${record.feeling || 'N/A'}</div>
        </div>

        <h2>Step 3: Original Constructive Intention</h2>
        <div class="question-box">
          <div class="value">${record.intention || 'N/A'}</div>
        </div>

        <h2>Step 4: Actual Outcome</h2>
        <div class="question-box">
          <div class="value">${record.actualOutcome || 'N/A'}</div>
        </div>

        <h2>Step 5: Disciplined Reframed Alternative Pivot (Instead?)</h2>
        <div class="btn-pivot">
          <div class="label" style="color: #16a34a;">Next time this arises, I commit to:</div>
          <div class="value" style="font-weight: bold; color: #14532d;">${record.alternativeStrategy || 'N/A'}</div>
        </div>
      `;
    }

    contentHtml += `
        <div style="margin-top: 50px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8;">
          Balanced Reset System &bull; Printed from Neurochemical Balance Register Workspace
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + contentHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${subjectName.replace(/\s+/g, '_')}_CBT_Exercise_${format(new Date(record.date), 'yyyyMMdd_HHmm')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCBTToPDF = async (record: HabitReframerRecord) => {
    const subjectName = record.studentName || 'Self';
    const dateFormatted = format(new Date(record.date), 'MMMM dd, yyyy HH:mm');
    const title = record.isFullDopamineAudit 
      ? 'D.O.P.A.M.I.N.E. Complete Reset Audit' 
      : 'Cognitive Trigger & Core Loop Audit';

    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.zIndex = '999999';
    container.style.pointerEvents = 'none';
    container.style.width = '1100px';
    container.style.boxSizing = 'border-box';
    container.style.padding = '40px';
    container.style.backgroundColor = 'white';
    container.style.color = '#334155';
    container.style.fontFamily = "'Inter', sans-serif";
    
    let html = `
      <div style="border-bottom: 3px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase;">${title}</h1>
        <p style="font-size: 10px; font-weight: 800; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">
          Subject: ${subjectName} &bull; Date: ${dateFormatted}
        </p>
      </div>
    `;

    if (record.isFullDopamineAudit) {
      const sections = [
        { label: 'D. Data', val: record.substanceOrBehavior },
        { label: 'O. Objectives', val: record.objectives },
        { label: 'P. Problems', grid: true },
        { label: 'A. Abstinence', val: record.abstinencePlan },
        { label: 'M. Mindfulness', val: record.mindfulnessNotes },
        { label: 'I. Insight', val: record.insightHonesty },
        { label: 'N. Next Steps', val: record.nextStepsPlan },
        { label: 'E. Experiment', val: record.experimentRules || record.alternativeStrategy, primary: true },
      ];

      sections.forEach(s => {
        if (s.grid) {
          html += `
            <div style="margin-bottom: 25px;" class="problem-box">
              <h2 style="font-size: 11px; font-weight: 900; color: #ef4444; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">P. Problems (6-Dimensional Matrix)</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="padding: 10px; border: 1px solid #f1f5f9; border-radius: 8px; background-color: #faf9f6;">
                  <strong style="display: block; font-size: 8px; color: #94a3b8; text-transform: uppercase;">Neuroadaptation</strong>
                  <p style="font-size: 11px; margin: 3px 0 0 0;">${record.pNeuroadaptation || 'None'}</p>
                </div>
                <div style="padding: 10px; border: 1px solid #f1f5f9; border-radius: 8px; background-color: #faf9f6;">
                  <strong style="display: block; font-size: 8px; color: #94a3b8; text-transform: uppercase;">Relationships</strong>
                  <p style="font-size: 11px; margin: 3px 0 0 0;">${record.pRelationships || 'None'}</p>
                </div>
                <div style="padding: 10px; border: 1px solid #f1f5f9; border-radius: 8px; background-color: #faf9f6;">
                  <strong style="display: block; font-size: 8px; color: #94a3b8; text-transform: uppercase;">Work/School</strong>
                  <p style="font-size: 11px; margin: 3px 0 0 0;">${record.pWork || 'None'}</p>
                </div>
                <div style="padding: 10px; border: 1px solid #f1f5f9; border-radius: 8px; background-color: #faf9f6;">
                  <strong style="display: block; font-size: 8px; color: #94a3b8; text-transform: uppercase;">Financial</strong>
                  <p style="font-size: 11px; margin: 3px 0 0 0;">${record.pFinancial || 'None'}</p>
                </div>
              </div>
            </div>
          `;
        } else {
          html += `
            <div style="margin-bottom: 20px; padding: 15px; background-color: ${s.primary ? '#f0fdf4' : '#faf9f6'}; border-left: 4px solid ${s.primary ? '#22c55e' : '#cbd5e1'}; border-radius: 4px;">
              <h3 style="font-size: 9px; font-weight: 900; color: ${s.primary ? '#166534' : '#475569'}; text-transform: uppercase; margin: 0 0 5px 0;">${s.label}</h3>
              <p style="font-size: 12px; margin: 0; color: #1e293b; font-weight: ${s.primary ? '700' : '500'};">${s.val || 'N/A'}</p>
            </div>
          `;
        }
      });
    } else {
      const stages = [
        { label: 'Situation / Thought', val: record.thought },
        { label: 'Emotion / Urge', val: record.feeling },
        { label: 'Original Intention', val: record.intention },
        { label: 'Actual Outcome', val: record.actualOutcome },
        { label: 'Discipline Pivot', val: record.alternativeStrategy, primary: true },
      ];

      stages.forEach(s => {
        html += `
          <div style="margin-bottom: 20px; padding: 15px; background-color: ${s.primary ? '#f0fdf4' : '#faf9f6'}; border: 1px solid ${s.primary ? '#bcf0da' : '#e2e8f0'}; border-radius: 12px;">
            <h3 style="font-size: 9px; font-weight: 900; color: ${s.primary ? '#065f46' : '#64748b'}; text-transform: uppercase; margin: 0 0 5px 0;">${s.label}</h3>
            <p style="font-size: 12px; margin: 0; color: #0f172a; font-weight: ${s.primary ? '700' : '500'};">${s.val || 'N/A'}</p>
          </div>
        `;
      });
    }

    container.innerHTML = html;
    
    // Append styles for PDF matching
    const style = document.createElement('style');
    style.innerHTML = `
      @page {
        size: A4;
        margin: 10mm;
      }
      body {
        background-color: #ffffff;
        color: #334155;
        font-family: 'Segoe UI', Arial, sans-serif;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
        break-after: avoid;
      }
      p, li, tr, th, td, .question-box, .btn-pivot, .problem-cell, table,
      .problem-box, .problem-box > div, .problem-box div {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    `;
    container.appendChild(style);
    
    document.body.appendChild(container);

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `Audit_${subjectName}_${format(new Date(record.date), 'yyyyMMdd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        windowWidth: 1100,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Show full-screen loading spinner/overlay to hide the print generation process
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    overlay.style.color = '#ffffff';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999999';
    overlay.style.fontFamily = "'Inter', sans-serif";
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="margin-bottom: 20px; font-size: 20px; font-weight: 900; tracking: tight;">GENERATING CBT AUDIT PDF...</div>
        <div style="font-size: 13px; color: #94a3b8; font-weight: bold; margin-bottom: 20px;">Formatting cognitive pathways and triggers loop</div>
        <div style="display: inline-block; width: 32px; height: 32px; border: 4px solid #6366f1; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);

    const originalScrollY = window.scrollY || window.pageYOffset || 0;
    const originalScrollX = window.scrollX || window.pageXOffset || 0;
    window.scrollTo(0, 0);

    document.body.appendChild(container);

    // Give browser brief window to layout and paint the added container
    await new Promise(resolve => setTimeout(resolve, 100));

    // To prevent html2canvas from crash-looping or hanging on modern CSS stylesheet rules (e.g. Tailwind v4 variables, container queries),
    // we temporarily disable all external stylesheets during PDF rendering. High-z-index dark overlay hides any content flicker.
    const disabledSheets: (HTMLStyleElement | HTMLLinkElement)[] = [];
    try {
      Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((sheet) => {
        if (sheet instanceof HTMLStyleElement || sheet instanceof HTMLLinkElement) {
          if (!container.contains(sheet) && !overlay.contains(sheet) && (sheet as any).disabled !== true) {
            (sheet as any).disabled = true;
            disabledSheets.push(sheet);
          }
        }
      });
    } catch (err) {
      console.warn("Could not disable style sheets during PDF render:", err);
    }

    try {
      await html2pdf().set(opt).from(container).save();
    } catch (err) {
      console.error(err);
      alert('Export failed. Please try again.');
    } finally {
      // Restore all disabled sheets
      disabledSheets.forEach((sheet) => {
        try {
          (sheet as any).disabled = false;
        } catch (err) {
          console.error("Error restoring stylesheet:", err);
        }
      });
      document.body.removeChild(container);
      document.body.removeChild(overlay);
      window.scrollTo(originalScrollX, originalScrollY);
    }
  };

  const exportWeeklyStatsToExcel = () => {
    const formattedWeekStart = format(startOfCurrentWeek, 'yyyy-MM-dd');
    const formattedWeekEnd = format(addDays(startOfCurrentWeek, 6), 'yyyy-MM-dd');
    
    // Header Row
    const csvRows = [];
    csvRows.push(`Weekly Habit Logs (Week of ${formattedWeekStart} to ${formattedWeekEnd})`);
    csvRows.push('');
    
    // Table Headers
    const headers = [
      'Habit Name',
      'Neurochemical Type',
      'Target Goal',
      'Goal Type',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Weekly Total',
      'Unit',
      'Achieved Goal'
    ];
    csvRows.push(headers.join(','));

    habits.forEach(habit => {
      const stats = getWeeklyHabitStats(habit);
      const row = [
        `"${habit.name.replace(/"/g, '""')}"`,
        habit.type === 'dopamine' ? 'Pleasure/Gratification' : 'Pain/Effort',
        habit.weeklyGoal || 'No goal',
        habit.goalType === 'limit' ? 'Limit (Do not exceed)' : 'Min Target (Achieve at least)',
        stats.dailyValues[0]?.val || '0',
        stats.dailyValues[1]?.val || '0',
        stats.dailyValues[2]?.val || '0',
        stats.dailyValues[3]?.val || '0',
        stats.dailyValues[4]?.val || '0',
        stats.dailyValues[5]?.val || '0',
        stats.dailyValues[6]?.val || '0',
        stats.total,
        habit.unit,
        stats.total >= (habit.weeklyGoal || 0) ? 'YES' : 'NO'
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob(['\ufeff' + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Weekly_Habit_Spreadsheet_${formattedWeekStart}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCBTDatabaseToExcel = () => {
    if (!data.habitReframers || data.habitReframers.length === 0) {
      alert("No CBT trigger loop items are currently logged to export.");
      return;
    }
    
    const csvRows = [];
    csvRows.push('Cognitive Trigger and Core Loop Alignment Ledger');
    csvRows.push('');
    
    const headers = [
      'Individual Name',
      'Log Date',
      'Automatic Thought / Trigger Situation',
      'Emotional State / Urge Info',
      'Original Intention',
      'Actual Outcome',
      'Alternative Pivot Strategy',
      'Is Full DOPAMINE Audit?',
      'Substance / Shortcut Behavior',
      'Frequency & Logs',
      'Motive Objectives',
      'P - Neuroadaptation Response',
      'P - Relationship Impact',
      'P - Work/School Impact',
      'P - Financial Cost',
      'P - Physical Health/Sleep Impact',
      'P - Spiritual/Values Cost'
    ];
    csvRows.push(headers.join(','));

    data.habitReframers.forEach(record => {
      const line = [
        `"${(record.studentName || 'Self').replace(/"/g, '""')}"`,
        `"${format(new Date(record.date), 'yyyy-MM-dd HH:mm')}"`,
        `"${(record.thought || '').replace(/"/g, '""')}"`,
        `"${(record.feeling || '').replace(/"/g, '""')}"`,
        `"${(record.intention || '').replace(/"/g, '""')}"`,
        `"${(record.actualOutcome || '').replace(/"/g, '""')}"`,
        `"${(record.alternativeStrategy || '').replace(/"/g, '""')}"`,
        record.isFullDopamineAudit ? 'YES' : 'NO',
        `"${(record.substanceOrBehavior || '').replace(/"/g, '""')}"`,
        `"${(record.frequencyAndAmount || '').replace(/"/g, '""')}"`,
        `"${(record.objectives || '').replace(/"/g, '""')}"`,
        `"${(record.pNeuroadaptation || '').replace(/"/g, '""')}"`,
        `"${(record.pRelationships || '').replace(/"/g, '""')}"`,
        `"${(record.pWork || '').replace(/"/g, '""')}"`,
        `"${(record.pFinancial || '').replace(/"/g, '""')}"`,
        `"${(record.pHealth || '').replace(/"/g, '""')}"`,
        `"${(record.pSpiritual || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(line.join(','));
    });

    const blob = new Blob(['\ufeff' + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "CBT_Alignment_Spreadsheet.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportFastingToWord = (fast: any) => {
    const startDateFormatted = fast.startDate;
    const completedDateFormatted = fast.completedAt;
    const duration = fast.durationDays;
    
    let contentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Completed Dopamine Reset Fast Archive</title>
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0;
            padding: 0; 
            color: #333333; 
            line-height: 1.6; 
            background-color: #ffffff;
          }
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
          }
          p, li, tr, .detail-box, .reflection-box, .final-box, table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1 { color: #ca8a04; font-size: 24px; border-bottom: 2px solid #ca8a04; padding-bottom: 10px; margin-bottom: 10px; text-transform: uppercase; }
          .meta { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 35px; }
          .detail-box { border: 1px solid #e2e8f0; background-color: #fafaf9; padding: 18px; margin-bottom: 25px; border-radius: 8px; }
          .reflection-box { background-color: #faf9f6; border-left: 4px solid #ca8a04; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
          .final-box { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin-top: 30px; border-radius: 6px; }
          .label { font-weight: bold; font-size: 11px; color: #475569; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 13px; color: #1e293b; }
          h2 { color: #0f172a; font-size: 14px; text-transform: uppercase; margin-top: 30px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; }
        </style>
      </head>
      <body>
        <h1>Dopamine Reset Fast Report</h1>
        <div class="meta">Status: Fully Achieved &bull; Saved to Neurohistorical Records</div>
        
        <div class="detail-box">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 33%; font-weight: bold; font-size: 11px; color: #64748b; text-transform: uppercase;">Duration</td>
              <td style="width: 33%; font-weight: bold; font-size: 11px; color: #64748b; text-transform: uppercase;">Start Date</td>
              <td style="width: 34%; font-weight: bold; font-size: 11px; color: #64748b; text-transform: uppercase;">Completion Timestamp</td>
            </tr>
            <tr>
              <td style="font-size: 18px; font-weight: bold; color: #ca8a04;">${duration} Daily Cycle(s)</td>
              <td style="font-size: 13px; color: #334155;">${startDateFormatted}</td>
              <td style="font-size: 13px; color: #334155;">${completedDateFormatted}</td>
            </tr>
          </table>
        </div>

        <h2>Detox Journal Notes Logged during Fast</h2>
    `;

    if (!fast.reflections || fast.reflections.length === 0) {
      contentHtml += `<p style="font-style: italic; color: #64748b;">No intermediate journal entries logged during this period.</p>`;
    } else {
      fast.reflections.forEach((ref: any, idx: number) => {
        contentHtml += `
          <div class="reflection-box">
            <div class="label">Log Entry #${idx + 1} &bull; ${ref.date}</div>
            <div class="value">${ref.content}</div>
          </div>
        `;
      });
    }

    contentHtml += `
        <h2>Final Cleansing Reflection summary</h2>
        <div class="final-box">
          <div class="label" style="color: #16a34a; font-size: 11px; font-weight: bold;">User Reflection Content</div>
          <div class="value" style="font-size: 13px; font-weight: 500; color: #14532d; white-space: pre-wrap; margin-top: 5px;">${fast.finalReflection}</div>
        </div>

        <div style="margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8;">
          Neurochemical Balance Systems &bull; Printed from Personal Resilience Workspace
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + contentHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Completed_Dopamine_Fast_Report_${startDateFormatted}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger final reflection prompt
  const handleCompleteResetFast = () => {
    setIsCompletingFast(true);
    setFinalReflectionText('');
  };

  const handleCompleteResetWithReflection = (text: string) => {
    const finalReflectionCleaned = text.trim() || 'No final reflection was logged.';
    const historyEntry = {
      id: uuidv4(),
      startDate: fastingState.startDate || format(new Date(), 'yyyy-MM-dd'),
      completedAt: format(new Date(), 'yyyy-MM-dd HH:mm'),
      durationDays: fastingState.durationDays,
      reflections: fastingState.reflections || [],
      finalReflection: finalReflectionCleaned
    };

    const currentHistory = data.settings?.dopamineFastsHistory || [];
    
    onUpdate(prev => {
      const currentHistory = prev.settings?.dopamineFastsHistory || [];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          dopamineFastsHistory: [...currentHistory, historyEntry],
          dopamineFast: {
            isActive: false,
            startDate: '',
            durationDays: 1,
            reflections: []
          }
        }
      };
    });

    setIsCompletingFast(false);
    setFinalReflectionText('');
  };

  // Record daily fast thoughts

  // Record daily fast thoughts
  const handleAddFastReflection = () => {
    if (!newFastRef.trim()) return;
    const currentReflections = fastingState.reflections || [];
    onUpdate({
      ...data,
      settings: {
        ...data.settings,
        dopamineFast: {
          ...fastingState,
          reflections: [
            ...currentReflections,
            { date: format(new Date(), 'MMM d, yyyy h:mm a'), content: newFastRef.trim() }
          ]
        }
      }
    });
    setNewFastRef('');
  };

  return (
    <div id="advanced-habit-tracker-root" className="flex-1 bg-slate-50 p-4 md:p-8 overflow-y-auto font-sans text-slate-900 relative">
      
      {/* Premium Animated Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#fafbfc]">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 45, 0],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-15%] left-[-15%] w-[80%] h-[80%] bg-gradient-to-br from-indigo-200/40 via-blue-100/20 to-transparent rounded-full blur-[140px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-tr from-rose-200/30 via-amber-100/20 to-transparent rounded-full blur-[160px]" 
        />
        <motion.div 
          animate={{ 
            y: [0, -100, 0],
            opacity: [0.08, 0.18, 0.08]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[-5%] w-[60%] h-[60%] bg-gradient-to-bl from-amber-100/30 via-emerald-50/20 to-transparent rounded-full blur-[120px]" 
        />
      </div>
      
      {/* Header and Metaphor Explanation */}
      <div className="w-full mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
             <Scale className="text-amber-500 animate-pulse" size={32} />
             Advanced Dopamine Tracker
          </h1>
          <p className="text-slate-500 font-bold tracking-tight italic mt-1 text-sm">
             Calibrating the pleasure-pain balance to reclaim neurochemical focus, inspired by <span className="text-slate-900 font-extrabold uppercase">Dopamine Nation</span>.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button 
            onClick={requestNotificationPermission}
            className={`px-4 py-2 border rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${notificationPermission === 'granted' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
             {notificationPermission === 'granted' ? <CheckCircle2 size={14} /> : <Calendar size={14} />}
             {notificationPermission === 'granted' ? 'Reminders On' : 'Enable Reminders'}
          </button>
          
          <button 
            onClick={() => setIsInfoOpen(true)}
            className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2"
          >
             <Info size={14} className="text-amber-600" />
             Neurochemical Science
          </button>
          
          <button 
            onClick={() => setIsAddingHabit(true)}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-slate-850 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
          >
             <PlusCircle size={16} />
             Add Metric Tracker
          </button>
        </div>
      </div>

      {/* Interactive Science Modal */}
      <AnimatePresence>
        {isInfoOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-xs flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 md:p-10 w-full max-w-2xl border border-slate-200 relative shadow-2xl overflow-y-auto max-h-[85vh]"
            >
              <button 
                onClick={() => setIsInfoOpen(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <Brain className="text-indigo-600" size={32} />
                <h3 className="text-xl font-black leading-none uppercase tracking-tight text-indigo-950">
                  The Neuroscience of Balance
                </h3>
              </div>

              <div className="space-y-4 text-slate-700 text-xs md:text-sm font-medium leading-relaxed">
                <p>
                  In <strong className="text-indigo-900">“Dopamine Nation,”</strong> Dr. Anna Lembke explains that pleasure and pain are co-localized in the brain and function like a <strong>pleasure-pain balance scale</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                    <h4 className="font-black text-rose-800 uppercase text-xs mb-1 flex items-center gap-1">
                      🔴 Left Side: High-Dopamine Gratif.
                    </h4>
                    <p className="text-[11px] text-rose-700 font-bold">
                      Scrolling feeds, streaming videos, gambling, sugars. Inputs are instant. The balance tips heavily to pleasure, but the brain compensates by putting weights on the pain side (craving/anxiety).
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <h4 className="font-black text-emerald-800 uppercase text-xs mb-1 flex items-center gap-1">
                      🟢 Right Side: High-Effort Resist.
                    </h4>
                    <p className="text-[11px] text-emerald-700 font-bold">
                      Exercise, cold exposure, reading, tidying, coding. Choosing difficult things first tilts the balance to pain. The brain compensates by naturally weighting the pleasure side afterwards!
                    </p>
                  </div>
                </div>
                <p>
                  By creating strict numerical caps on instant gratification (Dopamine Limits) and targets on hard tasks (Effort Targets), you reset your baseline to appreciate humble joys, achieve supreme focus, and defeat dopamine depletion.
                </p>
                <div className="p-4 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex gap-3 text-[11px] text-indigo-950">
                  <Info size={16} className="text-indigo-600 shrink-0" />
                  <span>
                    <strong>How to use this tracker:</strong> Fill in your weekly caps, log your daily numbers dynamically, check your homeostatic balance scale, and track your metrics over time!
                  </span>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setIsInfoOpen(false)}
                  className="px-6 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'tracker', label: 'Metric Tracker', icon: Sliders },
          { id: 'analytics', label: 'Trend Analytics', icon: BarChart },
          { id: 'journal', label: 'Reframing Journal', icon: Brain },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[11px] font-black uppercase tracking-wider transition-all ${
              activeMainTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeMainTab === 'tracker' && (
          <motion.div 
            key="tracker"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* LEFT TWO COLUMNS: Weekly Time Loggers and Lists */}
            <div className="lg:col-span-2 space-y-6">
          
          {/* Calendar Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
            <button 
              onClick={handlePrevWeek}
              className="p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-center">
              <span className="block text-[10px] font-black uppercase tracking-widest text-[#a0aec0]">
                WEEK VIEW
              </span>
              <span className="text-sm font-black text-[#1B254B] mt-1 block">
                {format(startOfCurrentWeek, 'MMM dd, yyyy')} — {format(addDays(startOfCurrentWeek, 6), 'MMM dd, yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={handleToday}
                className="px-3.5 py-1.5 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-[#1B254B] transition-colors"
              >
                Today
              </button>
              <button 
                onClick={handleNextWeek}
                className="p-3 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors"
                title="Next Week"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Metric Habits List Grid */}
          <div className="space-y-8">
            {habits.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-[40px] p-24 text-center text-slate-300">
                <Sliders size={64} className="mx-auto mb-6 stroke-[1px] text-slate-300" />
                <h3 className="font-black text-slate-500 text-xl uppercase tracking-tighter">No Metrics Active</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-2">Personalize your neurochemical growth trackers to start.</p>
              </div>
            ) : (
              habits.map((habit) => {
                const stats = getWeeklyHabitStats(habit);
                const theme = DEFAULT_COLOR_THEMES.find(t => t.id === habit.color) || DEFAULT_COLOR_THEMES[0];
                return (
                  <AdvancedHabitCard 
                    key={habit.id}
                    habit={habit}
                    stats={stats}
                    theme={theme}
                    onLogValue={handleLogValue}
                    onOpenLogging={setIsLoggingModalOpen}
                    onEdit={handleEditHabitStart}
                    onDelete={handleDeleteHabit}
                    onOpenNote={openAdvancedNoteDialog}
                    logs={logs}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Neurochemical scale and resets */}
        <div className="space-y-6">
          
          {/* INTERACTIVE PLEASURE-PAIN BALANCE BOARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-black text-[#1b254b] leading-none uppercase text-xs flex items-center gap-2 mb-2">
              <Scale size={16} className="text-indigo-600" />
              Receptor Balance Scale
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mb-6">
              A visual projection of the co-localized pleasure & pain balance inside your brain. Keep it aligned or effort-leaning.
            </p>

            {/* Visual Balance scale canvas animation */}
            <div className="relative h-44 flex flex-col justify-end items-center my-4 overflow-visible">
              
              {/* Balance Beam line */}
              <motion.div 
                className="w-full h-1 bg-slate-900 rounded-full relative origin-center"
                animate={{ rotate: tiltAngle }}
                transition={{ type: 'spring', stiffness: 60, damping: 12 }}
              >
                
                {/* Platter Left: Instant Gratification */}
                <motion.div 
                  className="absolute left-4 -top-1 w-fit flex flex-col items-center origin-center font-sans text-slate-900"
                  animate={{ rotate: -tiltAngle }}
                  transition={{ type: 'spring', stiffness: 60, damping: 12 }}
                >
                  <div className="w-1 bg-slate-900/10 h-7" />
                  <div className="bg-rose-500 text-white rounded-2xl py-2 px-3 text-[10px] font-black uppercase text-center shadow-md min-w-[75px]">
                    Pleasure
                    <span className="block text-[8px] opacity-75 font-mono">{Math.round(balanceSums.dopaminePoints * 10) / 10} pts</span>
                  </div>
                </motion.div>
                
                {/* Platter Right: Long effort */}
                <motion.div 
                  className="absolute right-4 -top-1 w-fit flex flex-col items-center origin-center font-sans text-slate-900"
                  animate={{ rotate: -tiltAngle }}
                  transition={{ type: 'spring', stiffness: 60, damping: 12 }}
                >
                  <div className="w-1 bg-slate-900/10 h-7" />
                  <div className="bg-emerald-500 text-white rounded-2xl py-2 px-3 text-[10px] font-black uppercase text-center shadow-md min-w-[75px]">
                    Pain/Effort
                    <span className="block text-[8px] opacity-75 font-mono">{Math.round(balanceSums.effortPoints * 10) / 10} pts</span>
                  </div>
                </motion.div>
                
                {/* Arrow Pointer */}
                <div className="absolute left-1/2 -top-4 w-0.5 h-4 bg-slate-900 -translate-x-1/2 origin-bottom" />
                
              </motion.div>

              {/* Fulcrum base */}
              <div className="w-10 h-10 border-b-[24px] border-b-slate-900 border-x-[16px] border-x-transparent" />
            </div>

            {/* Status indicators */}
            <div className="p-4 rounded-2xl border bg-slate-50 flex flex-col items-center text-center mt-6">
              {tiltAngle < -3 ? (
                <>
                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1 mb-1 animate-pulse">
                    <ShieldAlert size={12} /> Gratification Overdrive
                  </span>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal">
                    The scale favors instant pleasure. Your brain will down-regulate dopamine, yielding anxiety/exhaustion. Introduce standard resilience effort!
                  </p>
                </>
              ) : tiltAngle > 3 ? (
                <>
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1 mb-1">
                    <CheckCircle2 size={12} /> Hormetic Resilient Base
                  </span>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal">
                    You have done hard things first. This triggers slow, lasting neurochemical satisfaction and supreme clarity. Keep weighting this side.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1 mb-1">
                    <Gauge size={12} /> Homeostatic Flatline
                  </span>
                  <p className="text-[11px] text-slate-500 font-bold leading-normal">
                    Chemistry is balanced. You feel steady, content, and highly responsive. Avoid visual binges to preserve your baseline.
                  </p>
                </>
              )}
            </div>

            {/* Pleasure-Pain Balance Ratio Bar Chart */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                📊 Neurochemical Ratio Chart
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mb-4">
                Comparing weekly accumulated Dopamine Limits (Pleasure) against Effort Targets (Resilience).
              </p>
              <div className="h-56 w-full rounded-2xl bg-slate-50/50 p-4 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: 'Pleasure (Dopamine)',
                        value: Math.round(balanceSums.dopaminePoints * 10) / 10,
                        fill: '#f43f5e',
                      },
                      {
                        name: 'Effort (Resilience)',
                        value: Math.round(balanceSums.effortPoints * 10) / 10,
                        fill: '#10b981',
                      }
                    ]}
                    margin={{ top: 10, right: 30, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: '700' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderRadius: '12px', 
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                    />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={50}>
                      <Cell fill="#f43f5e" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {/* DOPAMINE RESET FAST / FAST CHALLENGE CARD */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-50 rounded-full -z-10 opacity-30" />

            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-[#1b254b] leading-none uppercase text-xs flex items-center gap-2">
                <Hourglass size={16} className="text-amber-600 animate-spin-slow" />
                Dopamine Fasting reset
              </h3>
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="text-[9px] font-black uppercase text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 bg-amber-50 px-2 py-1.5 rounded-xl border border-amber-200/50"
              >
                📜 Archive ({data.settings?.dopamineFastsHistory?.length || 0})
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-bold mb-6">
              Do a 24-Hour to 30-Day receptor purification and cure cravings. Avoid scrolling files, junk inputs, and binge habits.
            </p>

            {!fastingState.isActive ? (
              <div className="space-y-4">
                {/* Mode Selector Toggle */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/40">
                  <button 
                    onClick={() => setSchedulerTab('presets')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${schedulerTab === 'presets' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    ⚡ Presets
                  </button>
                  <button 
                    onClick={() => setSchedulerTab('custom')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${schedulerTab === 'custom' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    📅 Scheduler
                  </button>
                </div>

                {schedulerTab === 'presets' ? (
                  <div className="space-y-4">
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Lock your brain and clean out receptor fatigue. Select a preset limit to quickly launch the reset protocol:
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-black">
                      {[
                        { label: '24 Hours', days: 1 },
                        { label: '3 Days', days: 3 },
                        { label: '7 Days', days: 7 },
                        { label: '30 Days', days: 30 }
                      ].map((preset) => (
                        <button
                          key={preset.days}
                          onClick={() => handleStartResetFast(preset.days)}
                          className="py-3 bg-slate-50 border border-slate-200/50 hover:border-amber-300 hover:bg-[#fffbeb] rounded-2xl text-[10px] uppercase text-[#1b254b] transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] text-slate-505 font-semibold leading-relaxed">
                      Pick any custom start and end dates. Gemini will generate standard focus prompts leading up to and during your deep fast:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</label>
                        <input 
                          type="date"
                          value={schedStartDate}
                          onChange={(e) => setSchedStartDate(e.target.value)}
                          className="w-full bg-slate-50 text-slate-800 text-xs font-bold p-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">End Date</label>
                        <input 
                          type="date"
                          value={schedEndDate}
                          onChange={(e) => setSchedEndDate(e.target.value)}
                          className="w-full bg-slate-50 text-slate-800 text-xs font-bold p-2.5 rounded-xl border border-slate-200 outline-none focus:border-amber-400 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <button
                      id="launch-scheduled-fast-btn"
                      onClick={handleStartScheduledFast}
                      disabled={isGeneratingFastingPrompts || !schedStartDate || !schedEndDate}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 select-none"
                    >
                      {isGeneratingFastingPrompts ? 'Generating AI Coach Prompts...' : 'Schedule & Generate Prompts'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Visual Circular Active Fast Indicator */}
                <div className="p-4 border border-amber-100 bg-[#fffbeb]/50 rounded-2xl flex items-center justify-between mb-4">
                  <div>
                    <span className="block text-[8px] font-black uppercase text-amber-700 tracking-widest">
                      CHALLENGE STATUS
                    </span>
                    <span className="text-md font-black text-amber-950 uppercase block mt-0.5">
                      Fast in Progress
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 capitalize block">
                      Goal duration: {fastingState.durationDays} {fastingState.durationDays === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                  
                  {/* Glowing Flame indicator */}
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center animate-pulse border border-amber-200">
                    <Flame className="text-amber-600" size={20} />
                  </div>
                </div>

                {/* Sub Tab View selectors */}
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  <button 
                    onClick={() => setActiveFastingTab('tracker')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase ${activeFastingTab === 'tracker' ? 'bg-white text-slate-800 shadow' : 'text-slate-400 hover:text-slate-705'}`}
                  >
                    Detox Coach
                  </button>
                  <button 
                    onClick={() => setActiveFastingTab('reflections')}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase ${activeFastingTab === 'reflections' ? 'bg-white text-slate-800 shadow' : 'text-slate-400 hover:text-slate-705'}`}
                  >
                    Notes ({fastingState.reflections?.length || 0})
                  </button>
                </div>

                {activeFastingTab === 'tracker' ? (
                  <div className="space-y-3 pt-2">
                    {/* Active Coaching prompt */}
                    {activePrompt && (
                      <div className="p-3.5 bg-gradient-to-tr from-amber-500/10 via-yellow-500/5 to-amber-600/10 rounded-2xl border border-amber-500/20 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Sparkles size={12} className="text-amber-600 animate-pulse" />
                          <span className="text-[9px] font-extrabold uppercase text-amber-700 tracking-wider">
                            Daily Coach Prompt ({activePrompt.stage === 'lead-up' ? 'Preparation' : 'Active Fast'})
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-normal italic select-all">
                          "{activePrompt.content || activePrompt.prompt}"
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 font-medium leading-normal">
                      🛡️ <strong className="text-amber-950 uppercase text-[9px]">Prohibited Inputs:</strong> Quick gratification videos, adult feeds, gaming apps, gambling logs, binge scrolling formats.
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium leading-normal">
                      🔥 <strong className="text-amber-950 uppercase text-[9px]">Recommended Habits:</strong> Solid paper books, slow writing, tidying archives, cold nature showers, long endurance walks.
                    </p>

                    {/* Timeline representation list */}
                    {fastingState.prompts && fastingState.prompts.length > 0 && (
                      <div className="border-t border-dashed border-slate-200/60 pt-3">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-2">📅 SCHEDULE TIMELINE PROMPTS</span>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                          {fastingState.prompts.map((p: any, idx: number) => {
                            const isTodayPrompt = p.date === todayKeyStr;
                            return (
                              <div key={idx} className={`p-2 rounded-xl border text-[10px] transition-all ${isTodayPrompt ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-slate-50/50 border-slate-100'}`}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="font-extrabold text-[9px] text-[#1b254b]">Day {idx+1}: {p.date}</span>
                                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${p.stage === 'lead-up' ? 'bg-teal-55 text-teal-700' : 'bg-amber-500 text-white'}`}>
                                    {p.stage === 'lead-up' ? 'Prep' : 'Fast'}
                                  </span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-700 leading-snug italic">{p.content || p.prompt}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={handleStopResetFast}
                        className="flex-1 py-3 border border-slate-200 text-[#1b254b]/40 hover:bg-slate-50 transition-colors uppercase font-black text-[9px] tracking-widest rounded-2xl"
                      >
                        Abandon
                      </button>
                      <button 
                        onClick={handleCompleteResetFast}
                        className="flex-1 py-3 bg-amber-600 text-white hover:bg-amber-700 transition-colors uppercase font-black text-[9px] tracking-widest rounded-2xl flex items-center justify-center gap-1 shadow-lg shadow-amber-600/10"
                      >
                        <Check size={12} /> Succeed Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    
                    {/* Reflections history logger slider */}
                    <div className="max-h-[140px] overflow-y-auto no-scrollbar space-y-2 pr-1">
                      {(!fastingState.reflections || fastingState.reflections.length === 0) ? (
                        <p className="text-center text-[10px] text-slate-350 italic font-bold py-6">
                          No thoughts logged yet. Record your urges or clarity when they hit.
                        </p>
                      ) : (
                        fastingState.reflections.map((ref, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-indigo-600">
                              <span>Log Entry #{i+1}</span>
                              <span>{ref.date}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 leading-normal">
                              {ref.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <textarea
                        value={newFastRef}
                        onChange={(e) => setNewFastRef(e.target.value)}
                        placeholder="Log any cravings, boredom, or focus sessions..."
                        className="flex-1 h-14 bg-slate-50 rounded-xl border border-slate-200 outline-none p-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:italic resize-none"
                      />
                      <button 
                        onClick={handleAddFastReflection}
                        disabled={!newFastRef.trim()}
                        className="px-3 shrink-0 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-indigo-700 select-none disabled:opacity-50"
                      >
                        Log
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </motion.div>
        )}

        {activeMainTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-8"
          >
            {/* Trend Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const totalDopamine = habits.filter(h => h.type === 'dopamine').reduce((acc, h) => {
                  const { total } = getWeeklyHabitStats(h);
                  return acc + (h.unit.toLowerCase() === 'minutes' ? total / 60 : total);
                }, 0);
                const totalEffort = habits.filter(h => h.type === 'effort').reduce((acc, h) => {
                  const { total } = getWeeklyHabitStats(h);
                  return acc + (h.unit.toLowerCase() === 'minutes' ? total / 60 : total);
                }, 0);
                
                return (
                  <>
                    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Pleasure Load</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-rose-600">{Math.round(totalDopamine * 10) / 10}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hours Eq.</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Current weekly total stimulus</p>
                    </div>
                    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Resilience Load</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-emerald-600">{Math.round(totalEffort * 10) / 10}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hours Eq.</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Current weekly effort spent</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Recharts Visualization */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Neurochemical Trend Analysis</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">Comparing 30-day dopamine stimulus vs chosen effort</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-[10px] font-black uppercase text-slate-500">Dopamine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-black uppercase text-slate-500">Effort</span>
                  </div>
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    return past30Days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      let dPoints = 0;
                      let ePoints = 0;
                      
                      habits.forEach(h => {
                        const val = logs[dateStr]?.[h.id] || 0;
                        const points = h.unit.toLowerCase() === 'minutes' ? val / 60 : val;
                        if (h.type === 'dopamine') dPoints += points;
                        else ePoints += points;
                      });

                      return {
                        date: format(day, 'MMM dd'),
                        fullDate: dateStr,
                        dopamine: Math.round(dPoints * 10) / 10,
                        effort: Math.round(ePoints * 10) / 10
                      };
                    });
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                      interval={2}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl text-white">
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">{label}</p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-8">
                                  <span className="text-[11px] font-bold text-slate-300">Dopamine Load:</span>
                                  <span className="text-[11px] font-black text-rose-400 tracking-wider">
                                    {payload[0].value} <span className="text-[8px] opacity-75">pts</span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-8">
                                  <span className="text-[11px] font-bold text-slate-300">Resilience Effort:</span>
                                  <span className="text-[11px] font-black text-indigo-400 tracking-wider">
                                    {payload[1].value} <span className="text-[8px] opacity-75">pts</span>
                                  </span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-500 uppercase">Ratio:</span>
                                  <span className={`text-[11px] font-black ${
                                    (payload[1].value as number) >= (payload[0].value as number) 
                                      ? 'text-emerald-400' 
                                      : 'text-rose-400'
                                  }`}>
                                    {Math.round(((payload[1].value as number) / Math.max(0.1, payload[0].value as number)) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="dopamine" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar dataKey="effort" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeMainTab === 'journal' && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="w-full"
          >
            {/* COGNITIVE BEHAVIORAL HABIT REFRAMER TABLE (CBT) */}
            <div className="w-full bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 md:p-8 border border-slate-200/65 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1b254b]/50 block mb-1">COGNITIVE BEHAVIORAL PROTOCOL</span>
            <h2 className="text-2xl md:text-3xl font-black text-[#1b254b] uppercase italic tracking-tighter flex items-center gap-2">
              🧠 Habit Trigger & Cognitive Reframing Board
            </h2>
            <p className="text-xs font-bold text-slate-500 leading-normal max-w-2xl mt-1">
              Analyze mental triggers, emotions, and original intentions vs actual outcomes. Formulate proactive, actionable alternatives when problems arise to rewire behavioral loops.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportWeeklyStatsToExcel}
              className="px-4 py-3.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/60 font-black text-[10px] uppercase tracking-wider rounded-2xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              📊 Weekly Excel CSV
            </button>
            <button
              onClick={exportCBTDatabaseToExcel}
              className="px-4 py-3.5 bg-amber-50 hover:bg-amber-100/85 text-amber-850 border border-amber-200/60 font-black text-[10px] uppercase tracking-wider rounded-2xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              📥 Ledger CSV
            </button>
            <button
              onClick={() => setIsAddingReframer(true)}
              className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-slate-900/10 group animate-pulse"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
              Analyze Trigger Loop
            </button>
          </div>
        </div>

        {/* QUESTION SAMPLES EXPLORER */}
        <div className="mb-8 p-6 bg-slate-50 border border-slate-150 rounded-[28px] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                📋 Reframer Guidance & Question Samples
              </h3>
              <p className="text-[11px] text-slate-500 font-bold leading-normal">
                See how questions adapt based on the selected individual's short name to explore behavioral triggers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Preview name:</span>
              <select 
                id="demo-student-select"
                className="bg-white border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl text-slate-850 outline-none cursor-pointer"
                onChange={(e) => {
                  setPreviewName(e.target.value);
                }}
                value={previewName}
              >
                <option value="Self">Self (You)</option>
                {data.students?.slice(0, 15).map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl relative">
              <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Situation & Thought</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What crossed {getSubjectShortName(previewName)}'s mind right before the action?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "Identify what automated thought or rationalization occurred in {getSubjectShortName(previewName)}."
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider">Emotion & Feeling</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What core emotional state did {getSubjectShortName(previewName)} experience?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "Describe the feel of the urge state and its core intensity for {getSubjectShortName(previewName)}."
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Original Intention</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What was {getSubjectShortName(previewName)}'s healthy, original objective?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "What safety, pleasure, or positive relief did {getSubjectShortName(previewName)} seek before the shortcut?"
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200/60 rounded-2xl">
              <span className="text-[9px] font-black uppercase text-rose-700 tracking-wider">Actual Outcome</span>
              <p className="text-[11px] text-slate-500 font-bold mt-1.5 leading-relaxed italic">
                "What actually happened after the trigger situation?"
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-slate-650 font-semibold leading-normal block mt-0.5">
                "Detail what actions were taken and describe {getSubjectShortName(previewName)}'s real feeling afterward."
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-150 rounded-2xl border-l-4 border-emerald-500">
              <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Pivot (Instead?)</span>
              <p className="text-[11px] text-emerald-750 font-bold mt-1.5 leading-relaxed italic animate-pulse">
                "What can {getSubjectShortName(previewName)} do instead when triggers return?"
              </p>
              <span className="text-[9px] font-black uppercase text-emerald-600 block mt-2">Sample question:</span>
              <p className="text-[10.5px] text-emerald-950 font-black leading-normal block mt-0.5">
                "What concrete, high-effort alternative strategy can {getSubjectShortName(previewName)} commit to?"
              </p>
            </div>
          </div>
        </div>

        {/* Guided prompt cards (Compact Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50/50 p-4 rounded-[24px] border border-slate-200/50">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">💡 1. DETECT TRIGGERS</span>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Identify situations, cues, or automatic thoughts that trigger habit desires.
            </p>
          </div>
          <div className="space-y-1 border-t md:border-t-0 md:border-x border-slate-200/60 pt-2.5 md:pt-0 md:px-4">
            <span className="text-[9px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">🎭 2. INTENTION VS OUTCOME</span>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Examine the tension between healthy motivations and regret-inducing behaviors.
            </p>
          </div>
          <div className="space-y-1 border-t md:border-t-0 pt-2.5 md:pt-0">
            <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1">🔄 3. DISCIPLINE PIVOT</span>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Formulate concrete alternative steps when problems arise to change your routines.
            </p>
          </div>
        </div>

        {/* The Records Table (Desktop) / Cards (Mobile) */}
        {(!data.habitReframers || data.habitReframers.length === 0) ? (
          <div className="py-16 text-center text-slate-400">
            <Sliders size={48} className="mx-auto mb-3 opacity-25 text-slate-500" />
            <p className="font-black text-[11px] uppercase tracking-[0.2em] italic text-[#1b254b]/60">Alignment desk is empty</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Add your first mental trigger loop assessment to build awareness.</p>
          </div>
        ) : (
          <>
            {/* Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-4 px-4 w-[12%]">Individual</th>
                    <th className="py-4 px-4 w-[11%]">Date & Time</th>
                    <th className="py-4 px-4 w-[20%]">Cognitive Trigger (Thought)</th>
                    <th className="py-4 px-4 w-[14%]">Feeling / Urge</th>
                    <th className="py-4 px-4 w-[14%]">Healthy Intention</th>
                    <th className="py-4 px-4 w-[13%]">Actual Outcome</th>
                    <th className="py-4 px-4 w-[16%]">Discipline Pivot (Instead?)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-850">
                  {data.habitReframers.map((record) => {
                    const isExpanded = expandedRecordId === record.id;
                    return (
                      <React.Fragment key={record.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-[10px] font-black uppercase">
                                👤 {record.studentName || 'Self'}
                              </span>
                              <button
                                onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-[#1b254b]/60 hover:bg-slate-200/80'}`}
                              >
                                {isExpanded ? 'Collapse ▲' : record.isFullDopamineAudit ? '📊 Review Audit' : '👁️ View Loop'}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-slate-400 leading-relaxed text-[11px]">
                            {format(new Date(record.date), 'MMM dd, HH:mm')}
                          </td>
                          <td className="py-4 px-4 font-sans text-slate-900 font-medium leading-relaxed max-w-[200px] truncate" title={record.thought}>
                            {record.thought}
                          </td>
                          <td className="py-4 px-4 leading-relaxed max-w-[140px] truncate" title={record.feeling}>
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-500/10 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-tight">
                              {record.feeling}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-emerald-800 leading-relaxed font-semibold max-w-[140px] truncate" title={record.intention}>
                            {record.intention}
                          </td>
                          <td className="py-4 px-4 text-rose-600 leading-relaxed font-semibold max-w-[130px] truncate" title={record.actualOutcome}>
                            {record.actualOutcome}
                          </td>
                          <td className="py-4 px-4 bg-emerald-50/10 leading-relaxed font-semibold rounded-lg border-l-2 border-emerald-400 relative">
                            <div className="flex justify-between items-start gap-1 pr-6">
                              <span className="text-emerald-950 font-bold block max-w-[125px] truncate" title={record.alternativeStrategy}>
                                {record.alternativeStrategy}
                              </span>
                              <button
                                onClick={() => handleDeleteReframer(record.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED DETAILED REPORT BENTO CARD (DESKTOP) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/65">
                            <td colSpan={7} className="py-6 px-8 border-b border-slate-200">
                              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">📊</span>
                                    <div>
                                      <h4 className="text-sm font-black text-[#1b254b] uppercase tracking-wider">
                                        {record.isFullDopamineAudit ? 'Comprehensive D.O.P.A.M.I.N.E. Alignment Ledger' : 'Trigger Loop Reflection Record'}
                                      </h4>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        Subject: {record.studentName || 'Self'} • Logged At {format(new Date(record.date), 'MMMM dd, yyyy HH:mm')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => exportCBTToWord(record)}
                                      className="px-3 py-1.5 bg-[#fefbeb] hover:bg-amber-100 text-amber-850 font-black text-[9.5px] uppercase tracking-wider rounded-xl border border-amber-200/60 flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                      📥 Word
                                    </button>
                                    <button
                                      onClick={() => exportCBTToPDF(record)}
                                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-black text-[9.5px] uppercase tracking-wider rounded-xl border border-rose-200/60 flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                      📄 PDF
                                    </button>
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">
                                      Format: {record.isFullDopamineAudit ? '8-Step Workbook' : 'Quick Loop'}
                                    </span>
                                  </div>
                                </div>

                                {record.isFullDopamineAudit ? (
                                  <div className="space-y-6">
                                    {/* D & O */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* D = DATA */}
                                      <div className="p-4 bg-indigo-50/25 border border-indigo-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">D</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider block">D. DATA (SHUTOUT REPAIR)</span>
                                          <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">
                                            {record.substanceOrBehavior}
                                          </p>
                                          {record.frequencyAndAmount && (
                                            <span className="inline-block mt-1.5 bg-indigo-100/60 text-indigo-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md">
                                              ⏰ Frequency: {record.frequencyAndAmount}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* O = OBJECTIVES */}
                                      <div className="p-4 bg-sky-50/25 border border-sky-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0">O</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider block">O. OBJECTIVES (MIND MOTIVE)</span>
                                          <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed">
                                            {record.objectives || 'No motive data logged.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* P = PROBLEMS METRICS */}
                                    <div className="p-5 bg-rose-50/15 border border-rose-100 rounded-2xl space-y-4">
                                      <div className="flex gap-2 items-center">
                                        <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">P</span>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">P. PROBLEMS MATRIX (Exploring Impacts and Costs)</span>
                                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Corroborated 6 dimensional problem checks</span>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Neuroadaptation */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-rose-700 flex items-center gap-1">🌀 Neuroadaptation</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pNeuroadaptation || 'None reported or minimal tolerance change.'}
                                          </p>
                                        </div>
                                        {/* Relationships */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-amber-700 flex items-center gap-1">👥 Relationship Boundaries</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pRelationships || 'None reported or healthy.'}
                                          </p>
                                        </div>
                                        {/* Work/School */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-indigo-700 flex items-center gap-1">💼 Work & Study</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pWork || 'None reported or high productive flow.'}
                                          </p>
                                        </div>
                                        {/* Financial */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-[#1a5f7a] flex items-center gap-1">💳 Financial Waste</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pFinancial || 'None reported or no overspending.'}
                                          </p>
                                        </div>
                                        {/* Health */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-red-700 flex items-center gap-1">❤️ Sleep & Physical Health</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pHealth || 'None reported or steady wellness.'}
                                          </p>
                                        </div>
                                        {/* Spiritual */}
                                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                          <span className="text-[9px] font-black uppercase text-[#4d4d4d] flex items-center gap-1">✨ Spiritual Integrity</span>
                                          <p className="text-slate-700 text-[11px] leading-relaxed font-semibold">
                                            {record.pSpiritual || 'None reported or aligned with ethics.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* A, M, I */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {/* A = ABSTINENCE */}
                                      <div className="p-4 bg-amber-50/20 border border-amber-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">A</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">A. ABSTINENCE reset</span>
                                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                                            {record.abstinencePlan || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* M = MINDFULNESS */}
                                      <div className="p-4 bg-purple-50/20 border border-purple-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">M</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider block">M. MINDFULNESS waves</span>
                                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                                            {record.mindfulnessNotes || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* I = INSIGHT */}
                                      <div className="p-4 bg-teal-50/20 border border-teal-100 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">I</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider block">I. INSIGHT & HONESTY</span>
                                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">
                                            {record.insightHonesty || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* N & E */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* N = NEXT STEPS */}
                                      <div className="p-4 bg-slate-100/50 border border-slate-200 rounded-2xl flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0">N</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">N. NEXT STEPS (MODERATION RULES)</span>
                                          <p className="text-xs font-black text-slate-800 mt-1 leading-relaxed">
                                            {record.nextStepsPlan || 'None reported.'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* E = EXPERIMENT */}
                                      <div className="p-4 bg-emerald-50/30 border border-emerald-150 rounded-2xl border-l-4 border-l-emerald-500 flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">E</div>
                                        <div>
                                          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block font-black">E. EXPERIMENT (ACTIVE HORMESIS)</span>
                                          <p className="text-xs font-black text-emerald-950 mt-1 leading-relaxed">
                                            {record.experimentRules || record.alternativeStrategy}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* QUICK REFLECTION MATRIX VIEW */
                                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">1. Trigger Thought</span>
                                      <p className="text-xs font-semibold text-slate-800 leading-normal">{record.thought}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">2. Emotional Core</span>
                                      <p className="text-xs font-semibold text-slate-850 leading-normal">{record.feeling}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-emerald-700 uppercase">3. Objective Intention</span>
                                      <p className="text-xs font-semibold text-emerald-900 leading-normal">{record.intention}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                                      <span className="text-[9px] font-black text-rose-700 uppercase">4. Outcome</span>
                                      <p className="text-xs font-semibold text-rose-900 leading-normal">{record.actualOutcome}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl space-y-1 border-l-4 border-emerald-505">
                                      <span className="text-[9px] font-black text-emerald-800 uppercase block">5. Active Discipline Pivot</span>
                                      <p className="text-xs font-black text-emerald-950 leading-normal">{record.alternativeStrategy}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stack View */}
            <div className="block md:hidden space-y-4">
              {data.habitReframers.map((record, index) => {
                const isExpanded = expandedRecordId === record.id;
                return (
                  <div key={record.id} className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm relative overflow-hidden space-y-4">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500/35"></div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          👤 {record.studentName || 'Self'} • Entry #{data.habitReframers!.length - index}
                        </span>
                        <span className="text-[9px] font-bold text-slate-405 font-mono">
                          {format(new Date(record.date), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => exportCBTToWord(record)}
                          className="px-2 py-1 bg-[#fffbeb] border border-amber-200 text-amber-800 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all"
                        >
                          Word
                        </button>
                        <button
                          onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                          className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isExpanded ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {isExpanded ? 'Collapse' : 'Details'}
                        </button>
                        <button
                          onClick={() => handleDeleteReframer(record.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {!isExpanded ? (
                      /* COLLAPSED INSTANCE CARD */
                      <div className="space-y-3 font-semibold text-xs text-slate-700 pt-1">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">BEHAVIOR / COGNITIVE TRIGGER</span>
                          <p className="text-slate-900 leading-relaxed font-bold">{record.thought}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">URGE / INTENSITY</span>
                            <span className="inline-block px-2.5 py-0.5 bg-amber-500/10 text-amber-800 rounded-lg text-[10px] font-black uppercase">
                              {record.feeling}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">INTENTION</span>
                            <p className="text-emerald-700 leading-relaxed font-bold">{record.intention}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50/30 rounded-xl border-l-2 border-emerald-500">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5">PIVOT RULE</span>
                          <p className="text-slate-900 font-bold leading-relaxed">{record.alternativeStrategy}</p>
                        </div>
                      </div>
                    ) : (
                      /* EXPANDED FULL DOPAMINE LEDGER (MOBILE) */
                      <div className="space-y-4 pt-1 divide-y divide-slate-100 text-xs font-semibold">
                        {record.isFullDopamineAudit ? (
                          <div className="space-y-4">
                            {/* D */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-indigo-700 uppercase tracking-widest block mb-0.5">D. DATA (BEHAVIOR)</span>
                              <p className="text-slate-900 font-black text-xs leading-normal">{record.substanceOrBehavior}</p>
                              {record.frequencyAndAmount && (
                                <span className="inline-block bg-indigo-50 text-indigo-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md mt-1">
                                  ⏰ {record.frequencyAndAmount}
                                </span>
                              )}
                            </div>
                            {/* O */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-sky-700 uppercase tracking-widest block mb-0.5">O. OBJECTIVES</span>
                              <p className="text-slate-700 font-medium leading-relaxed">{record.objectives || 'No details'}</p>
                            </div>
                            {/* P */}
                            <div className="pt-2 space-y-2">
                              <span className="text-[9.5px] font-black text-rose-700 uppercase tracking-widest block">P. EXPLORED PROBLEMS MATRIX</span>
                              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150 space-y-2.5">
                                <div>
                                  <span className="text-[9px] font-black uppercase text-rose-600 block">🌀 Neuroadaptation</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pNeuroadaptation || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-amber-600 block">👥 Relationships</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pRelationships || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-indigo-600 block">💼 Work & Productivity</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pWork || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-[#1a5f7a] block">💳 Financial cost</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pFinancial || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-red-600 block">❤️ Physical health / Sleep</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pHealth || 'Healthy'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] font-black uppercase text-[#4d4d4d] block">✨ Spiritual & Values alignment</span>
                                  <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">{record.pSpiritual || 'Healthy'}</p>
                                </div>
                              </div>
                            </div>
                            {/* A */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-amber-700 uppercase tracking-widest block mb-0.5">A. ABSTINENCE FOCUS</span>
                              <p className="text-slate-700 leading-normal">{record.abstinencePlan || 'No details'}</p>
                            </div>
                            {/* M */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-purple-700 uppercase tracking-widest block mb-0.5">M. MINDFULNESS WAVES</span>
                              <p className="text-slate-700 leading-normal">{record.mindfulnessNotes || 'No details'}</p>
                            </div>
                            {/* I */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-teal-700 uppercase tracking-widest block mb-0.5">I. INSIGHT & HONEST EXCUSES</span>
                              <p className="text-slate-700 leading-normal">{record.insightHonesty || 'No details'}</p>
                            </div>
                            {/* N */}
                            <div className="pt-2">
                              <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-widest block mb-0.5">N. NEXT STEPS MODE</span>
                              <p className="text-slate-800 font-extrabold leading-normal">{record.nextStepsPlan || 'No details'}</p>
                            </div>
                            {/* E */}
                            <div className="pt-2 p-3 bg-emerald-50 rounded-xl border-l-2 border-emerald-500">
                              <span className="text-[9.5px] font-black text-emerald-800 uppercase tracking-widest block mb-0.5">E. ACTIVE EXPERIMENT TRIAL</span>
                              <p className="text-emerald-950 font-black leading-relaxed">{record.experimentRules || record.alternativeStrategy}</p>
                            </div>
                          </div>
                        ) : (
                          /* SHORT DETAILED EXPANSION FORM (MOBILE) */
                          <div className="space-y-2.5 pt-2">
                            <div>
                              <span className="text-[9px] font-black text-slate-400 block tracking-widest uppercase">1. Trigger thought</span>
                              <p className="text-slate-850 font-medium mt-0.5">{record.thought}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-slate-400 block tracking-widest uppercase">2. Emotion urge</span>
                              <p className="text-slate-850 font-medium mt-0.5">{record.feeling}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-emerald-700 block tracking-widest uppercase">3. Objective Intention</span>
                              <p className="text-emerald-900 font-bold mt-0.5">{record.intention}</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black text-rose-700 block tracking-widest uppercase">4. Real Outcome</span>
                              <p className="text-rose-950 font-bold mt-0.5">{record.actualOutcome}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 border-l-2 border-emerald-500 rounded-xl">
                              <span className="text-[9px] font-black text-emerald-800 block tracking-widest uppercase">5. Action pivot discipline</span>
                              <p className="text-emerald-950 font-black animate-pulse-slow mt-0.5">{record.alternativeStrategy}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* COGNITIVE REFRAMING DIALOG (EXTRACTED) */}
      <CognitiveReframerModal 
        isOpen={isAddingReframer} 
        onClose={() => setIsAddingReframer(false)} 
        onSave={handleAddReframer} 
        data={data} 
      />
        </motion.div>
        )}
      </AnimatePresence>

      {/* POP-OVER MODAL FOR CUSTOM HABIT CREATION */}
      <AnimatePresence>
        {isAddingHabit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-xs flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[36px] p-6 md:p-10 w-full max-w-lg border border-slate-200 relative shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsAddingHabit(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase italic tracking-tighter">
                Add Metric Tracker
              </h3>

              <div className="space-y-5">
                
                {/* Metric Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Metric Name / Activity
                  </label>
                  <input 
                    value={habitForm.name}
                    onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })}
                    placeholder="e.g. YouTube, Book Reading, Social Scroll, Coding"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all font-sans"
                  />
                </div>

                {/* Metric Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Metaphor Category Type
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                    <button 
                      onClick={() => setHabitForm({ ...habitForm, type: 'dopamine' })}
                      className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${habitForm.type === 'dopamine' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Dopamine Cap
                    </button>
                    <button 
                      onClick={() => setHabitForm({ ...habitForm, type: 'effort' })}
                      className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${habitForm.type === 'effort' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Effort Target
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-bold block ml-3 italic">
                    {habitForm.type === 'dopamine' 
                      ? '🔴 Pleasure: Low effort instant gratification to limit.'
                      : '🟢 Pain/Effort: Hard active discipline to target.'
                    }
                  </span>
                </div>

                {/* Metric Sizing Inputs (Goal, Unit) */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Unit */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                      Measurement Unit
                    </label>
                    <select 
                      value={habitForm.unit}
                      onChange={(e) => setHabitForm({ ...habitForm, unit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black text-slate-950 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Pages">Pages</option>
                      <option value="Liters">Liters</option>
                      <option value="Times">Times</option>
                      <option value="Cups">Cups</option>
                      <option value="Repetitions">Repetitions</option>
                    </select>
                  </div>

                  {/* Weekly Goal value */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                      Weekly Goal ({habitForm.type === 'dopamine' ? 'Max' : 'Min'})
                    </label>
                    <input 
                      type="number"
                      min="1"
                      value={habitForm.weeklyGoal}
                      onChange={(e) => setHabitForm({ ...habitForm, weeklyGoal: e.target.value })}
                      placeholder="e.g. 180"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                </div>

                {/* Color Schemes Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Visual Accent Color
                  </label>
                  <div className="flex gap-2 ml-3">
                    {DEFAULT_COLOR_THEMES.map((theme) => (
                      <button 
                        key={theme.id}
                        onClick={() => setHabitForm({ ...habitForm, color: theme.id })}
                        className={`w-7 h-7 rounded-full transition-transform hover:scale-125 border-2 ${
                          habitForm.color === theme.id ? 'border-indigo-600 scale-110 shadow-md' : 'border-white'
                        }`}
                        style={{ backgroundColor: `var(--color-${theme.id}-500, ${
                          theme.id === 'rose' ? '#f43f5e' : 
                          theme.id === 'sky' ? '#0ea5e9' : 
                          theme.id === 'emerald' ? '#10b981' : 
                          theme.id === 'amber' ? '#f59e0b' : 
                          theme.id === 'violet' ? '#8b5cf6' : '#6366f1'
                        })` }}
                        title={theme.id}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setIsAddingHabit(false)} 
                  className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-750 font-black text-[10px] uppercase tracking-wider text-center"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddAdvancedHabit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/10"
                >
                  Create Metric
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK-EDIT MODAL FOR HABIT METRIC TRACKER */}
      <AnimatePresence>
        {editingHabit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-xs flex items-center justify-center p-6 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[36px] p-8 md:p-10 w-full max-w-lg border border-slate-200 relative shadow-2xl"
            >
              <button 
                onClick={() => setEditingHabit(null)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter">
                Quick Edit Metric
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mb-6">
                Update metric settings in real-time. All historic logging data in your calendar remain fully preserved.
              </p>

              <div className="space-y-5">
                
                {/* Metric Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Metric Name / Activity
                  </label>
                  <input 
                    value={editHabitForm.name}
                    onChange={(e) => setEditHabitForm({ ...editHabitForm, name: e.target.value })}
                    placeholder="e.g. YouTube, Book Reading, Social Scroll, Coding"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all font-sans"
                  />
                </div>

                {/* Metric Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Metaphor Category Type
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                    <button 
                      onClick={() => setEditHabitForm({ ...editHabitForm, type: 'dopamine' })}
                      className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${editHabitForm.type === 'dopamine' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Dopamine Cap
                    </button>
                    <button 
                      onClick={() => setEditHabitForm({ ...editHabitForm, type: 'effort' })}
                      className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${editHabitForm.type === 'effort' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      Effort Target
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-bold block ml-3 italic">
                    {editHabitForm.type === 'dopamine' 
                      ? '🔴 Pleasure: Low effort instant gratification to limit.'
                      : '🟢 Pain/Effort: Hard active discipline to target.'
                    }
                  </span>
                </div>

                {/* Metric Sizing Inputs (Goal, Unit) */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Unit */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                      Measurement Unit
                    </label>
                    <select 
                      value={editHabitForm.unit}
                      onChange={(e) => setEditHabitForm({ ...editHabitForm, unit: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Pages">Pages</option>
                      <option value="Liters">Liters</option>
                      <option value="Times">Times</option>
                      <option value="Cups">Cups</option>
                      <option value="Repetitions">Repetitions</option>
                    </select>
                  </div>

                  {/* Weekly Goal value */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                      Weekly Goal ({editHabitForm.type === 'dopamine' ? 'Max' : 'Min'})
                    </label>
                    <input 
                      type="number"
                      min="1"
                      value={editHabitForm.weeklyGoal}
                      onChange={(e) => setEditHabitForm({ ...editHabitForm, weeklyGoal: e.target.value })}
                      placeholder="e.g. 180"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                </div>

                {/* Color Schemes Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-[#1b254b]/40 tracking-wider block ml-3">
                    Visual Accent Color
                  </label>
                  <div className="flex gap-2 ml-3">
                    {DEFAULT_COLOR_THEMES.map((theme) => (
                      <button 
                        key={theme.id}
                        onClick={() => setEditHabitForm({ ...editHabitForm, color: theme.id })}
                        className={`w-7 h-7 rounded-full transition-transform hover:scale-125 border-2 ${
                          editHabitForm.color === theme.id ? 'border-indigo-600 scale-110 shadow-md' : 'border-white'
                        }`}
                        style={{ backgroundColor: `var(--color-${theme.id}-500, ${
                          theme.id === 'rose' ? '#f43f5e' : 
                          theme.id === 'sky' ? '#0ea5e9' : 
                          theme.id === 'emerald' ? '#10b981' : 
                          theme.id === 'amber' ? '#f59e0b' : 
                          theme.id === 'violet' ? '#8b5cf6' : '#6366f1'
                        })` }}
                        title={theme.id}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setEditingHabit(null)} 
                  className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-750 font-black text-[10px] uppercase tracking-wider text-center font-sans"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEditedHabit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/10"
                >
                  Save Changes
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOPAMINE RESET FAST COMPLETION DESIGN MODAL */}
      <AnimatePresence>
        {isCompletingFast && (
          <motion.div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 outline-none select-none font-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white rounded-[32px] border border-amber-100 shadow-2xl p-6 md:p-8 max-w-lg w-full relative outline-none"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
            >
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setIsCompletingFast(false)}
                  className="p-1 px-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 font-extrabold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Sparkles className="text-amber-600 animate-pulse" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-none uppercase">
                    PURIFICATION COMPLETE
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Log Your Reset Insight Reflection
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">
                Congratulations on completing your Dopamine Reset Fast! Provide a brief reflection on your mental clarity, withdrawal surges, or lessons to preserve baseline receptor sensitivity:
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 block ml-3">
                    My Core Takeaways & Next Steps
                  </label>
                  <textarea
                    value={finalReflectionText}
                    onChange={(e) => setFinalReflectionText(e.target.value)}
                    placeholder="Describe how your focus shifted, which urges arose, and which positive constraints you will keep..."
                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all resize-none placeholder:text-slate-400 placeholder:italic"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsCompletingFast(false)}
                    className="flex-1 py-4 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-2xl font-black text-[10px] uppercase tracking-wider text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleCompleteResetWithReflection(finalReflectionText)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-xl shadow-amber-600/10 animate-bounce-slow"
                  >
                    🔒 Finalize & Save Fast
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOPAMINE RESET FASTS HISTORY ARCHIVE MODAL */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 outline-none font-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-white rounded-[36px] border border-amber-100 shadow-2xl p-6 md:p-8 max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col relative outline-none"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
            >
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 px-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 font-extrabold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Hourglass className="text-amber-600 animate-spin-slow" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-none uppercase">
                    Neurochemical reset archives
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Completed Dopamine Detoxification logs
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                {(!data.settings?.dopamineFastsHistory || data.settings.dopamineFastsHistory.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-[28px] space-y-3">
                    <p className="text-xs text-slate-400 italic font-bold">
                      No completed dopamine fasts are currently registered in your permanent archive ledger.
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Embark on your primary Reset Fast protocol inside the Detox panel to restore receptor baseline satisfaction!
                    </p>
                  </div>
                ) : (
                  data.settings.dopamineFastsHistory.map((fast: any, index: number) => (
                    <div key={fast.id || index} className="p-5 bg-slate-50 border border-slate-200/60 rounded-3xl space-y-4 relative overflow-hidden transition-all hover:border-amber-300">
                      
                      {/* Left border bookmark tag */}
                      <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: '#ca8a04' }} />
                      
                      <div className="flex justify-between items-start gap-4 pr-1 pl-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-200/50 rounded-lg text-[9px] font-black uppercase">
                            {fast.durationDays} Daily Cycle({fast.durationDays === 1 ? '' : 's'})
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 font-mono mt-1">
                            Started: {fast.startDate} • Completed: {fast.completedAt}
                          </span>
                        </div>

                        <button
                          onClick={() => exportFastingToWord(fast)}
                          className="px-2.5 py-1.5 bg-[#fcf9f2] hover:bg-amber-100 border border-yellow-300 text-amber-800 text-[9px] font-black uppercase rounded-xl flex items-center gap-1 transition-all"
                        >
                          Word Doc (.doc)
                        </button>
                      </div>

                      {fast.reflections && fast.reflections.length > 0 && (
                        <div className="space-y-1.5 pl-5 border-l-[1.5px] border-amber-200">
                          <span className="block text-[8.5px] font-black uppercase text-slate-400">Intermediate Detox Journal Notes ({fast.reflections.length})</span>
                          <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                            {fast.reflections.map((ref: any, rIdx: number) => (
                              <div key={rIdx} className="text-[11px] text-slate-600 leading-normal font-medium">
                                <strong className="text-amber-705 font-mono">{ref.date}:</strong> {ref.content}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-3.5 bg-white border border-slate-150 rounded-2xl space-y-1 pl-4 ml-2">
                        <span className="block text-[8.5px] font-black uppercase text-amber-900 tracking-wider">Final Reset Reflection insight</span>
                        <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {fast.finalReflection}
                        </p>
                      </div>

                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 shrink-0 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all"
                >
                  Close Archive
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Habit Note Modal */}
      <AnimatePresence>
        {editingAdvancedNoteState && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Advanced Habit Daily Context</p>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: editingAdvancedNoteState.habitColor || '#6366f1' }} />
                    {editingAdvancedNoteState.habitName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{editingAdvancedNoteState.date}</p>
                </div>
                <button 
                  onClick={() => setEditingAdvancedNoteState(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Body */}
              <div className="p-6 flex flex-col gap-4">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Why was this goal met or missed?
                </label>
                <textarea
                  className="w-full h-32 p-4 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-800 placeholder:text-slate-400 text-sm font-medium resize-none transition-all shadow-inner"
                  placeholder="e.g., Struggled with a craving around 4 PM but pivot strategy kept me focused on writing instead!"
                  value={editingAdvancedNoteState.noteText}
                  onChange={(e) => setEditingAdvancedNoteState(prev => prev ? { ...prev, noteText: e.target.value } : null)}
                  autoFocus
                />
              </div>
              
              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setEditingAdvancedNoteState(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-100 transition-all font-sans"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const updatedNotes = { ...(data.advancedHabitNotes || {}) };
                    if (!updatedNotes[editingAdvancedNoteState.date]) {
                      updatedNotes[editingAdvancedNoteState.date] = {};
                    }
                    updatedNotes[editingAdvancedNoteState.date][editingAdvancedNoteState.habitId] = editingAdvancedNoteState.noteText;
                    
                    onUpdate((prev: AppData) => ({
                      ...prev,
                      advancedHabitNotes: updatedNotes
                    }));
                    
                    setEditingAdvancedNoteState(null);
                  }}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all shadow-lg font-sans"
                >
                  Save Context Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
