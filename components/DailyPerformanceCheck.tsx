import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import { toPng } from 'html-to-image';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Sparkles,
  Check,
  Edit2,
  Trash,
  Eye,
  EyeOff,
  Clock,
  Flame,
  ShieldAlert,
  Bell,
  Heart,
  Lightbulb,
  Zap,
  Target,
  Smile,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { AppData, DailyPerformanceTask, Student, FilterState, UserRole } from '../types';
import { startOfWeek, addDays, subDays, format, isSameDay, parseISO } from 'date-fns';
import ReminderTable from './ReminderTable';

interface DailyPerformanceCheckProps {
  data: AppData;
  onUpdate: (updated: AppData) => void;
  // Optional Reminder Props passed from parent App.tsx
  students?: Student[];
  onAddStudent?: (defaults?: Partial<Student>) => void;
  onUpdateStudent?: (id: string, updates: Partial<Student>) => void;
  onDeleteStudent?: (id: string) => void;
  onClearCategory?: (categories: string[]) => void;
  filters?: FilterState;
  setFilters?: (filters: FilterState) => void;
  role?: UserRole;
}

const PRESET_COLORS = [
  { name: 'Vibrant Orange', value: '#f97316' },
  { name: 'Peach Coral', value: '#fca5a5' },
  { name: 'Deep Pink', value: '#db2777' },
  { name: 'Hot Pink', value: '#ec4899' },
  { name: 'Rose Petal', value: '#e11d48' },
  { name: 'Cherry Red', value: '#ef4444' },
  { name: 'Golden Yellow', value: '#f59e0b' },
  { name: 'Amber Gold', value: '#fbbf24' },
  { name: 'Dark Sun', value: '#eab308' },
  { name: 'Lime Juice', value: '#84cc16' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Mint Green', value: '#34d399' },
  { name: 'Teal Forest', value: '#14b8a6' },
  { name: 'Sky Cyan', value: '#06b6d4' },
  { name: 'Classic Blue', value: '#3b82f6' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Indigo Aura', value: '#6366f1' },
  { name: 'Amethyst', value: '#8b5cf6' },
  { name: 'Classic Purple', value: '#a855f7' },
  { name: 'Vibrant Fuchsia', value: '#d946ef' }
];

const DEFAULT_TASKS: DailyPerformanceTask[] = [
  { id: 'dt-1', name: 'Meditation for 5 Minutes', color: '#f97316', priority: 'High', category: 'General' },
  { id: 'dt-2', name: 'Daily Number of Students', color: '#10b981', priority: 'High', category: 'General' },
  { id: 'dt-3', name: 'Daily Learning', color: '#a855f7', priority: 'Medium', category: 'General' },
  { id: 'dt-4', name: 'Ask if Kids are bullied', color: '#ef4444', priority: 'High', category: 'General' },
  { id: 'dt-5', name: 'Personal Journal', color: '#fca5a5', priority: 'Medium', category: 'General' }
];

const DEFAULT_TOMORROW_TASKS = [
  { id: 'tt-1', name: 'Construct target class objectives & outlines', completed: false },
  { id: 'tt-2', name: 'Select individual student milestone checks', completed: false },
  { id: 'tt-3', name: 'Plan visual cues/games for interactive learning', completed: false },
  { id: 'tt-4', name: 'Prepare refreshing stretch routine & deep breathing', completed: false },
  { id: 'tt-5', name: 'Set key focus area for classroom inspiration', completed: false }
];

const CARD_THEMES = [
  { bg: 'bg-orange-50/70', border: 'border-orange-200/50 hover:border-orange-400 text-orange-950', completedBg: 'bg-emerald-50/20 border-emerald-200' },
  { bg: 'bg-fuchsia-50/70', border: 'border-fuchsia-200/50 hover:border-fuchsia-400 text-fuchsia-950', completedBg: 'bg-emerald-50/20 border-emerald-200' },
  { bg: 'bg-amber-50/70', border: 'border-amber-200/50 hover:border-amber-400 text-amber-950', completedBg: 'bg-emerald-50/20 border-emerald-200' },
  { bg: 'bg-emerald-50/50', border: 'border-emerald-205/40 hover:border-emerald-400 text-emerald-950', completedBg: 'bg-emerald-50/20 border-emerald-200' },
  { bg: 'bg-purple-50/70', border: 'border-purple-200/50 hover:border-purple-400 text-purple-950', completedBg: 'bg-emerald-50/20 border-emerald-200' },
  { bg: 'bg-rose-50/70', border: 'border-rose-200/50 hover:border-rose-400 text-[rgb(90,40,40)]', completedBg: 'bg-emerald-50/20 border-emerald-200' }
];

const renderChecklistSymbol = (
  symbol: 'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon' | 'triangle' | 'shield' | 'lightning' | 'crown' | 'moon' | 'sparkle' | 'octagon' | 'cross' | 'cloud',
  isCompleted: boolean,
  isToday: boolean,
  taskColor: string,
  isMobile: boolean
) => {
  const sizeClass = isMobile ? "w-9 h-9" : "w-11 h-11 md:w-12 md:h-12";
  
  // Uncompleted colors
  const strokeColor = isToday ? "#f97316" : "#cbd5e1"; // orange-500 today, slate-300 standard
  const strokeWidth = isToday ? "10" : "8";
  
  // Completed colors
  const shadowStyle = isCompleted 
    ? { filter: `drop-shadow(0 4px 8px ${taskColor}60)` } 
    : undefined;

  let shapeContent = null;

  switch (symbol) {
    case 'square':
      shapeContent = (
        <>
          <rect 
            x="12" y="12" width="76" height="76" rx="16" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 50 L44 62 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'star':
      shapeContent = (
        <>
          <path 
            d="M50 8 L62 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L38 36 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M33 50 L44 61 L65 39" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'heart':
      shapeContent = (
        <>
          <path 
            d="M50 84 L18 52 C6 38 10 14 30 14 C40 14 46 22 50 28 C54 22 60 14 70 14 C90 14 94 38 82 52 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M33 46 L44 57 L65 35" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'diamond':
      shapeContent = (
        <>
          <path 
            d="M50 10 L90 50 L50 90 L10 50 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 50 L44 62 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'hexagon':
      shapeContent = (
        <>
          <path 
            d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 50 L44 62 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'triangle':
      shapeContent = (
        <>
          <path 
            d="M50 12 L88 78 L12 78 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M34 54 L44 64 L64 43" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'shield':
      shapeContent = (
        <>
          <path 
            d="M20 18 L50 10 L80 18 L80 48 C80 68 50 88 50 88 C50 88 20 68 20 48 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 48 L44 60 L68 36" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'lightning':
      shapeContent = (
        <>
          <path 
            d="M54 8 L22 52 L46 52 L34 92 L78 38 L50 38 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M34 50 L46 62 L66 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'crown':
      shapeContent = (
        <>
          <path 
            d="M12 78 L20 34 L38 52 L50 22 L62 52 L80 34 L88 78 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 56 L44 66 L68 42" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'moon':
      shapeContent = (
        <>
          <path 
            d="M32 20 C48 20 68 32 72 52 C76 72 56 84 40 84 C62 84 82 70 82 48 C82 26 58 12 32 20 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M38 50 L48 60 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'sparkle':
      shapeContent = (
        <>
          <path 
            d="M50 10 Q50 50 90 50 Q50 50 50 90 Q50 50 10 50 Q50 50 50 10 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 50 L44 62 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'octagon':
      shapeContent = (
        <>
          <path 
            d="M32 12 L68 12 L88 32 L88 68 L68 88 L32 88 L12 68 L12 32 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 50 L44 62 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'cross':
      shapeContent = (
        <>
          <path 
            d="M34 14 L66 14 L66 34 L86 34 L86 66 L66 66 L66 86 L34 86 L34 66 L14 66 L14 34 L34 34 Z" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M36 50 L46 60 L64 42" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'cloud':
      shapeContent = (
        <>
          <path 
            d="M30 68 C18 68 12 58 18 46 C24 34 40 34 48 44 C54 28 74 28 82 44 C90 44 94 54 88 64 C82 70 74 68 74 68 L30 68" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 50 L44 62 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
      break;

    case 'circle':
    default:
      shapeContent = (
        <>
          <circle 
            cx="50" cy="50" r="40" 
            stroke={isCompleted ? "transparent" : strokeColor} 
            strokeWidth={strokeWidth} 
            fill={isCompleted ? taskColor : "#ffffff"} 
            className="transition-all duration-300"
          />
          {isCompleted && (
            <path 
              d="M32 50 L44 62 L68 38" 
              fill="none" 
              stroke="white" 
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-in zoom-in-75 duration-150"
            />
          )}
        </>
      );
  }

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`${sizeClass} cursor-pointer select-none transition-all duration-300 transform active:scale-75 hover:scale-105`}
      style={shadowStyle}
    >
      {shapeContent}
    </svg>
  );
};

export const DailyPerformanceCheck: React.FC<DailyPerformanceCheckProps> = ({ 
  data, 
  onUpdate,
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onClearCategory,
  filters,
  setFilters,
  role
}) => {
  const dailyPerformanceSymbol = data.settings?.dailyPerformanceSymbol || 'star';
  const taskClickTimesRef = useRef<Record<string, number>>({});
  const [activeSubTab, setActiveSubTab] = useState<'Daily' | 'Tomorrow' | 'Reminder'>('Daily');

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  // Collapsible bottom states: we set them to TRUE (collapsed/hidden) by default to save space!
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [isActionBarCollapsed, setIsActionBarCollapsed] = useState(true);
  const [showTrend, setShowTrend] = useState(false);
  const [showOverview, setShowOverview] = useState(false);

  // Tomorrow Vibe Selector
  const [tomorrowVibe, setTomorrowVibe] = useState<'Focus' | 'Creative' | 'Care' | 'Productive'>('Focus');

  // Input states
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('#f97316');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [isAdding, setIsAdding] = useState(false);

  // Export states
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportPaperSize, setExportPaperSize] = useState<'a4' | 'letter' | 'a3' | 'legal'>('a4');
  const dpcRef = useRef<HTMLDivElement>(null);

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [editingPriority, setEditingPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Load daily performance check tasks, initializing with default tasks if not set
  const tasks = useMemo(() => {
    return data.dailyPerformanceTasks && data.dailyPerformanceTasks.length > 0
      ? data.dailyPerformanceTasks
      : DEFAULT_TASKS;
  }, [data.dailyPerformanceTasks]);

  const completions = data.dailyPerformanceCompletions || {};

  // Load tomorrow's planning tasks, initializing with default strategic tasks if empty
  const tomorrowTasks = useMemo(() => {
    const rawTomorrow = data.tomorrowTasks && data.tomorrowTasks.length > 0 
      ? data.tomorrowTasks 
      : DEFAULT_TOMORROW_TASKS;

    const dailyNamesToExclude = [
      'meditation for 5 minutes',
      'daily number of students',
      'daily learning',
      "ask kids if they're bullied",
      "ask if kids are bullied",
      'personal journal',
      'go to sleep early: meditation for 5 minutes',
      'go to sleep early: meditation for 5 min',
      'grade assignments: daily number of students'
    ];

    return rawTomorrow.filter(t => !dailyNamesToExclude.includes(t.name.trim().toLowerCase()));
  }, [data.tomorrowTasks]);

  // Generate suggestions based on the last 7 days from reminders, journal entries, and existing targets.
  const suggestedChips = useMemo(() => {
    const set = new Set<string>();

    // 1. Core items from Reminder category in students
    const studentsArr = data.students || [];
    if (Array.isArray(studentsArr)) {
      studentsArr
        .filter(s => s.category === 'Reminder' && !s.deletedAt && s.name)
        .forEach(s => {
          let name = s.name.trim();
          // Clean leading dashes, bullets, or checkboxes
          name = name.replace(/^[-•*⬜✅\s\d\+]+/, '').trim();
          if (name.length >= 2 && name.length <= 60) {
            set.add(name);
          }
        });
    }

    // 2. Scan past 7 days from journal entries
    const today = new Date();
    const journal = data.journalEntries || {};
    
    // We want to scan the last 7 calendar days
    for (let i = 0; i < 7; i++) {
      const d = subDays(today, i);
      const dateKey = format(d, 'yyyy-MM-dd');
      const entry = journal[dateKey];
      if (entry) {
        // Achievements string[]
        if (Array.isArray(entry.achievements)) {
          entry.achievements.forEach(ach => {
            if (typeof ach === 'string') {
              let cleaned = ach.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/^[-•*⬜✅\s\d\+]+/, '').trim();
              if (cleaned.length >= 3 && cleaned.length <= 60 && !cleaned.toLowerCase().includes('type an objective')) {
                set.add(cleaned);
              }
            }
          });
        }
        
        // Checklist fields or textual lists inside fields
        const stringFields = [
          entry.lookingForward,
          entry.discipline,
          entry.inspiration,
          entry.affirmation,
          entry.learning,
          entry.gratitude
        ];

        stringFields.forEach(fieldVal => {
          if (typeof fieldVal === 'string' && fieldVal) {
            // Strip HTML simple helper
            const textContent = fieldVal
              .replace(/<[^>]*>/g, '\n') // turn tags into newlines to split properly
              .replace(/&nbsp;/g, ' ');
            
            const lines = textContent.split(/\n+/);
            lines.forEach(line => {
              let cleaned = line.replace(/^[-•*⬜✅\s\d\+]+/, '').trim();
              // Remove list bullet sequences like 1., 2. etc
              cleaned = cleaned.replace(/^\d+[\.\)]\s*/, '').trim();
              
              if (cleaned.length >= 3 && cleaned.length <= 60) {
                // Ignore placeholder text or common long descriptions
                const lower = cleaned.toLowerCase();
                if (!lower.includes('capable') && 
                    !lower.includes('grateful for') && 
                    !lower.includes('learned today') &&
                    !lower.includes('surprising with') &&
                    !lower.includes('moments of joy')) {
                  set.add(cleaned);
                }
              }
            });
          }
        });
      }
    }

    // 3. Scan existing/completed tomorrow's tasks if we had any
    const rawTomorrow = data.tomorrowTasks || [];
    if (Array.isArray(rawTomorrow)) {
      rawTomorrow
        .filter(t => t.name)
        .forEach(t => {
          let name = t.name.trim();
          name = name.replace(/^[-•*⬜✅\s\d\+]+/, '').trim();
          if (name.length >= 2 && name.length <= 60) {
            set.add(name);
          }
        });
    }

    // Exclude default boring names
    const namesToExclude = [
      'meditation for 5 minutes',
      'meditation for 5 Minutes',
      'daily number of students',
      'daily learning',
      'ask if kids are bullied',
      'personal journal',
      'go to sleep early',
      'construct target class objectives & outlines',
      'select individual student milestone checks',
      'plan visual cues/games for interactive learning',
      'prepare refreshing stretch routine & deep breathing',
      'set key focus area for classroom inspiration',
      'construct target class objectives',
      'select individual student milestone',
      'plan visual cues',
      'prepare refreshing stretch',
      'set key focus area'
    ].map(n => n.toLowerCase());

    const result = Array.from(set)
      .map(s => s.trim())
      .filter(s => s.length >= 2 && !namesToExclude.includes(s.toLowerCase()));

    // Limit to maximum 10 suggestions as requested
    return result.slice(0, 10);
  }, [data.students, data.journalEntries, data.tomorrowTasks]);

  const handleUpdateTasks = (newTasks: DailyPerformanceTask[]) => {
    onUpdate({
      ...data,
      dailyPerformanceTasks: newTasks
    });
  };

  const handleUpdateCompletions = (newCompletions: Record<string, Record<string, boolean>>) => {
    onUpdate({
      ...data,
      dailyPerformanceCompletions: newCompletions
    });
  };

  const handleUpdateTomorrowTasks = (newTomorrowTasks: { id: string; name: string; completed: boolean }[]) => {
    onUpdate({
      ...data,
      tomorrowTasks: newTomorrowTasks
    });
  };

  const handleResetTasksToDefault = () => {
    if (window.confirm('Reset Daily planner tasks to default (Meditation, Grading, Learning, Ask Kids, Personal Journal)? This will overwrite current list.')) {
      handleUpdateTasks(DEFAULT_TASKS);
    }
  };

  const handleResetTomorrowToDefault = () => {
    if (window.confirm('Reset Tomorrow targets to default planning?')) {
      handleUpdateTomorrowTasks(DEFAULT_TOMORROW_TASKS);
    }
  };

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskName.trim()) return;

    const newTask: DailyPerformanceTask = {
      id: `dt-${Date.now()}`,
      name: newTaskName.trim(),
      color: newTaskColor,
      priority: newTaskPriority,
      category: 'General'
    };

    handleUpdateTasks([...tasks, newTask]);
    setNewTaskName('');
    setNewTaskPriority('Medium');
    setIsAdding(false);
  };

  const handleSaveTaskEdit = (taskId: string) => {
    if (!editingName.trim()) return;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          name: editingName.trim(),
          color: editingColor,
          priority: editingPriority
        };
      }
      return t;
    });
    handleUpdateTasks(updated);
    setEditingTaskId(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm('Remove this duty task?')) return;
    handleUpdateTasks(tasks.filter(t => t.id !== taskId));
    if (editingTaskId === taskId) setEditingTaskId(null);
  };

  const handleToggleTomorrowTask = (id: string) => {
    const updated = tomorrowTasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t);
    handleUpdateTomorrowTasks(updated);
  };

  const handleEditTomorrowTask = (id: string, name: string) => {
    const updated = tomorrowTasks.map((t) => t.id === id ? { ...t, name } : t);
    handleUpdateTomorrowTasks(updated);
  };

  const handleDeleteTomorrowTask = (id: string) => {
    handleUpdateTomorrowTasks(tomorrowTasks.filter(item => item.id !== id));
  };

  const handleAddTomorrowTaskFromValue = (nameStr: string) => {
    const id = 'tt-' + Date.now() + Math.random().toString(36).substring(2, 5);
    handleUpdateTomorrowTasks([...tomorrowTasks, { id, name: nameStr, completed: false }]);
  };

  const toggleCompletion = (dateStr: string, taskId: string) => {
    const dayCompletions = completions[dateStr] || {};
    const updatedDayCompletions = {
      ...dayCompletions,
      [taskId]: !dayCompletions[taskId]
    };

    const updatedCompletions = {
      ...completions,
      [dateStr]: updatedDayCompletions
    };

    handleUpdateCompletions(updatedCompletions);
  };

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  // Stats calculation
  let completedCount = 0;
  daysOfWeek.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayCompletions = completions[dateStr] || {};
    tasks.forEach((task) => {
      if (dayCompletions[task.id]) {
        completedCount++;
      }
    });
  });

  const totalPossible = tasks.length * 7;

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'prev' ? -7 : 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const doExportPDF = () => {
    if (!dpcRef.current) return;
    const opt = {
      margin:       10,
      filename:     `Daily_Performance_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: exportPaperSize, orientation: 'portrait' }
    };
    html2pdf().set(opt).from(dpcRef.current).save();
    setShowExportMenu(false);
  };

  const doExportWord = () => {
    try {
      if (!dpcRef.current) return;
      const clone = dpcRef.current.cloneNode(true) as HTMLElement;
      const ignoreNodes = clone.querySelectorAll('[data-html2canvas-ignore]');
      ignoreNodes.forEach(node => node.parentNode?.removeChild(node));
      
      const htmlContent = clone.innerHTML;
      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
            * { box-sizing: border-box; }
            svg { display: none; }
          </style>
        </head>
        <body>
      `;
      const sourceHTML = header + htmlContent + "</body></html>";
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const fileDownload = document.createElement("a");
      document.body.appendChild(fileDownload);
      fileDownload.href = source;
      fileDownload.download = `Daily_Performance_${format(currentWeekStart, 'yyyy-MM-dd')}.doc`;
      fileDownload.click();
      document.body.removeChild(fileDownload);
      setShowExportMenu(false);
    } catch (e) {
      console.error(e);
      alert("Failed to export Word");
    }
  };

  const doExportImage = async () => {
    if (!dpcRef.current) return;
    try {
      const dataUrl = await toPng(dpcRef.current, { 
        cacheBust: true, 
        backgroundColor: '#f8fafc',
        filter: (node) => {
          if (node?.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) {
            return false;
          }
          return true;
        }
      });
      const link = document.createElement('a');
      link.download = `Daily_Performance_${format(currentWeekStart, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
      setShowExportMenu(false);
    } catch (err) {
      console.error(err);
      alert('Image export failed.');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return [...tasks].sort((a, b) => {
      const weightA = priorityWeight[a.priority || 'Medium'] || 2;
      const weightB = priorityWeight[b.priority || 'Medium'] || 2;
      return weightB - weightA;
    });
  }, [tasks]);

  const last7DaysStats = useMemo(() => {
    return daysOfWeek.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayCompletions = completions[dateStr] || {};
      let comp = 0;
      tasks.forEach((task) => {
        if (dayCompletions[task.id]) comp++;
      });
      const pct = tasks.length > 0 ? Math.round((comp / tasks.length) * 100) : 0;
      return {
        dateLabel: format(day, 'EEE dd'),
        isToday: isSameDay(day, new Date()),
        count: comp,
        total: tasks.length,
        percentage: pct
      };
    });
  }, [daysOfWeek, completions, tasks]);

  // Yearly metric analysis (simplified & streamlined to avoid bloat)
  const yearlyAnalytics = useMemo(() => {
    const currentYearStr = format(new Date(), 'yyyy');
    let totalChecked = 0;
    let totalPossibleYear = 0;
    
    Object.entries(completions).forEach(([dateStr, dayCompletions]) => {
      if (!dateStr.startsWith(currentYearStr)) return;
      tasks.forEach((task) => {
        totalPossibleYear++;
        if (dayCompletions[task.id]) {
          totalChecked++;
        }
      });
    });
    
    const overallYearPct = totalPossibleYear > 0 ? Math.round((totalChecked / totalPossibleYear) * 100) : 0;
    return {
      overallYearPct,
      totalChecked,
      totalPossibleYear
    };
  }, [completions, tasks]);

  // Emojis mapping for Tomorrow goals list to make it extremely "interesting" and visual
  const getTaskEmoji = (name: string, index: number) => {
    const lower = name.toLowerCase();
    if (lower.includes('sleep') || lower.includes('meditation') || lower.includes('bed')) return '🧘‍♀️';
    if (lower.includes('grade') || lower.includes('students') || lower.includes('assignment')) return '✍️';
    if (lower.includes('learn') || lower.includes('read') || lower.includes('study')) return '💡';
    if (lower.includes('ask') || lower.includes('kid') || lower.includes('bullied')) return '🛡️';
    if (lower.includes('journal') || lower.includes('personal') || lower.includes('write')) return '📓';
    if (lower.includes('sport') || lower.includes('exercise') || lower.includes('run') || lower.includes('walk')) return '🏃‍♀️';
    if (lower.includes('water') || lower.includes('hydrate')) return '💧';
    if (lower.includes('food') || lower.includes('eat') || lower.includes('meal')) return '🥗';
    
    const indexEmojis = ['❤️', '⭐', '🔥', '✨', '🎯'];
    return indexEmojis[index % indexEmojis.length];
  };

  // Completed percentage for tomorrow tasks focus
  const tomorrowCompletedCount = tomorrowTasks.filter(t => t.completed).length;
  const tomorrowTotalCount = tomorrowTasks.length;
  const tomorrowProgressPct = tomorrowTotalCount > 0 ? Math.round((tomorrowCompletedCount / tomorrowTotalCount) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-6 lg:p-8 space-y-6 text-stone-800" id="daily-performance-tracker-container">
      
      {/* 1. Header Navigation Switcher: Daily, Tomorrow, and Reminder */}
      <div className="flex bg-orange-100/40 p-1 mb-2 border border-orange-200/50 rounded-2xl w-full max-w-lg md:max-w-2xl mx-auto shadow-sm md:p-1.5 md:mb-6">
        {(['Daily', 'Tomorrow', 'Reminder'] as const).map((tab) => {
          let tabIcon = <Calendar className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />;
          if (tab === 'Tomorrow') tabIcon = <Sparkles className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />;
          if (tab === 'Reminder') tabIcon = <Bell className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />;
          
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`flex-1 py-2 px-3 md:py-3 md:px-5 text-center text-xs md:text-sm font-black uppercase tracking-wider rounded-xl md:rounded-2xl transition-all duration-200 flex items-center justify-center gap-1.5 md:gap-2.5 ${
                activeSubTab === tab
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-stone-605 text-stone-605 hover:bg-orange-50 hover:text-orange-950'
              }`}
            >
              {tabIcon}
              <span>{tab}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Sub-tab Content: Daily planning */}
      {activeSubTab === 'Daily' && (
        <div ref={dpcRef} className="space-y-4 animate-in fade-in duration-150">
          <div className="md:bg-white md:rounded-3xl md:border md:border-stone-200 md:shadow-sm md:overflow-hidden">
            {/* Desktop Checklist Table: Generously spaced & larger for PC view */}
            <div className="hidden md:block overflow-x-auto mobile-a4-wrapper">
              <div className="a4-container shadow-none min-h-full">
                <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/50">
                    <th className="py-4 px-6 text-left text-[11px] md:text-xs font-black text-stone-500 uppercase tracking-widest min-w-[200px]">
                      Task Name & Urgency
                    </th>
                    {daysOfWeek.map((day) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <th key={day.toString()} className="py-4 px-3 text-center text-[10px] md:text-[11px] font-black uppercase tracking-wider w-20 md:w-24">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[10px] md:text-xs ${isToday ? 'text-orange-600 font-extrabold scale-105' : 'text-stone-400'}`}>
                              {format(day, 'EEE').toUpperCase()}
                            </span>
                            <span className={`text-[11px] md:text-sm font-black ${
                              isToday ? 'text-orange-600 bg-orange-50 px-2 rounded-lg border border-orange-200/50' : 'text-stone-600'
                            }`}>
                              {format(day, 'd')}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="py-4 px-4 text-center text-[10px] md:text-[11px] font-black text-stone-400 uppercase tracking-wider w-16">
                      Del
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-150">
                  {filteredAndSortedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-stone-50/20 transition-colors">
                      <td className="py-4 px-6">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-2 max-w-sm animate-in zoom-in-95 duration-100">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800 outline-none w-full"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTaskEdit(task.id);
                                if (e.key === 'Escape') setEditingTaskId(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveTaskEdit(task.id)}
                              className="p-1 px-2.5 bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="p-1 px-2 text-stone-400 rounded-lg text-[9px] font-black uppercase hover:bg-stone-100"
                            >
                              x
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group/task cursor-pointer py-1.5">
                            <div className="flex items-center gap-2.5">
                              <span 
                                className="w-3.5 h-3.5 rounded-full ring-2 shadow-xs ring-white shrink-0" 
                                style={{ backgroundColor: task.color, boxShadow: `0 2px 6px ${task.color}40` }}
                              />
                              <span 
                                onClick={() => {
                                  const now = Date.now();
                                  const lastTime = taskClickTimesRef.current[task.id] || 0;
                                  if (now - lastTime < 350) {
                                    setEditingTaskId(task.id);
                                    setEditingName(task.name);
                                    setEditingColor(task.color);
                                    setEditingPriority(task.priority || 'Medium');
                                  }
                                  taskClickTimesRef.current[task.id] = now;
                                }}
                                onDoubleClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingName(task.name);
                                  setEditingColor(task.color);
                                  setEditingPriority(task.priority || 'Medium');
                                }}
                                title="Double-click or double-tap to edit task details"
                                className="font-extrabold text-xs md:text-sm lg:text-[15px] text-stone-750 tracking-tight hover:text-orange-605 hover:text-orange-600 transition-colors select-none"
                              >
                                {task.name}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[8.5px] md:text-[9.5px] font-black uppercase tracking-wider ${
                                task.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-105/50' :
                                task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-105/50' :
                                'bg-purple-50 text-purple-600 border border-purple-105/50'
                              }`}>
                                {task.priority || 'Medium'}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {daysOfWeek.map((day) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const isCompleted = completions[dateStr]?.[task.id] || false;
                        const isToday = isSameDay(day, new Date());
                        return (
                          <td key={day.toString()} className="text-center py-3.5 px-1.5">
                            <button
                              onClick={() => toggleCompletion(dateStr, task.id)}
                              className="focus:outline-none block mx-auto cursor-pointer p-0.5 hover:scale-105 active:scale-95 transition-transform"
                              title={`${isCompleted ? 'Completed' : 'Not completed'}: ${task.name}`}
                            >
                              {renderChecklistSymbol(
                                dailyPerformanceSymbol,
                                isCompleted,
                                isToday,
                                task.color,
                                false
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-stone-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete task"
                        >
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedTasks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs md:text-sm font-bold text-stone-400 tracking-wide uppercase">
                        No duties listed. Reset to default to list standard duties.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>

            {/* Mobile checklist grid: premium, spaced card-like list */}
            <div className="block md:hidden space-y-4 py-2 px-1">
              {filteredAndSortedTasks.map(task => {
                const isEditing = editingTaskId === task.id;
                return (
                  <div key={task.id} className="bg-white rounded-3xl border border-stone-150 p-4 shadow-sm space-y-3.5 transition-all animate-in fade-in-50 duration-150">
                    {isEditing ? (
                      <div className="space-y-3.5 animate-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Edit Checklist Task</span>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="text-[10px] font-black uppercase text-stone-400 hover:text-stone-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-800 outline-none w-full focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTaskEdit(task.id);
                              if (e.key === 'Escape') setEditingTaskId(null);
                            }}
                          />
                          
                          <div className="flex flex-col gap-2 pt-1 w-full">
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-450 block mb-0.5">Select Accent Color</span>
                            <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                              {PRESET_COLORS.map((col) => (
                                <button
                                  key={col.value}
                                  type="button"
                                  onClick={() => setEditingColor(col.value)}
                                  className={`w-6 h-6 rounded-full border-2 transition-transform ${editingColor === col.value ? 'scale-110 border-orange-500 ring-2 ring-white ring-offset-2 ring-offset-orange-500' : 'border-transparent hover:scale-110'}`}
                                  style={{ backgroundColor: col.value }}
                                  title={col.name}
                                />
                              ))}
                            </div>
                            
                            <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-stone-450">Priority</span>
                              <div className="flex bg-stone-100 p-0.5 rounded-xl border border-stone-200">
                                {(['Low', 'Medium', 'High'] as const).map((pri) => (
                                  <button
                                    key={pri}
                                    type="button"
                                    onClick={() => setEditingPriority(pri)}
                                    className={`text-[9.5px] font-black uppercase px-2.5 py-1 rounded-lg transition-all ${editingPriority === pri ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-400 hover:text-stone-600'}`}
                                  >
                                    {pri}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleSaveTaskEdit(task.id)}
                          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors shadow-sm"
                        >
                          Save Task Details
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2 cursor-pointer select-none group/mtitle flex-1"
                          title="Double-click or double-tap to edit task"
                          onDoubleClick={() => {
                            setEditingTaskId(task.id);
                            setEditingName(task.name);
                            setEditingColor(task.color);
                            setEditingPriority(task.priority || 'Medium');
                          }}
                          onClick={() => {
                            const now = Date.now();
                            const lastTime = taskClickTimesRef.current[task.id] || 0;
                            if (now - lastTime < 350) {
                              setEditingTaskId(task.id);
                              setEditingName(task.name);
                              setEditingColor(task.color);
                              setEditingPriority(task.priority || 'Medium');
                            }
                            taskClickTimesRef.current[task.id] = now;
                          }}
                        >
                          <span 
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                            style={{ 
                              backgroundColor: task.color,
                              boxShadow: `0 2px 6px ${task.color}40`
                            }} 
                          />
                          <span className="font-extrabold text-[16px] text-stone-850 tracking-tight leading-snug group-hover/mtitle:text-orange-500 transition-colors">
                            {task.name}
                          </span>
                          <span className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                            task.priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100/60' :
                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100/60' :
                            'bg-purple-50 text-purple-600 border-purple-100/60'
                          }`}>
                            {task.priority || 'Medium'}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteTask(task.id)} 
                          className="text-stone-300 hover:text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                          title="Delete task"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    )}

                  <div className="grid grid-cols-7 gap-1.5 pt-1">
                    {daysOfWeek.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isCompleted = completions[dateStr]?.[task.id] || false;
                      const isToday = isSameDay(day, new Date());
                      const dayName = format(day, 'EEE');
                      const isWeekend = dayName === 'Sat' || dayName === 'Sun';

                      return (
                        <div key={day.toString()} className="flex flex-col items-center gap-1.5">
                          <span className={`text-[9.5px] font-black uppercase tracking-widest ${
                            isToday 
                              ? 'text-orange-500 font-extrabold' 
                              : isWeekend 
                                ? 'text-indigo-600' 
                                : 'text-stone-400'
                          }`}>
                            {dayName.toUpperCase()}
                          </span>
                          <button
                            onClick={() => toggleCompletion(dateStr, task.id)}
                            className="focus:outline-none cursor-pointer"
                            title={`Toggle completion: ${task.name} for ${dayName}`}
                          >
                            {renderChecklistSymbol(
                              dailyPerformanceSymbol,
                              isCompleted,
                              isToday,
                              task.color,
                              true
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
              {filteredAndSortedTasks.length === 0 && (
                <div className="py-12 text-center bg-white rounded-3xl border border-stone-150 shadow-sm text-xs font-bold text-stone-400">
                  No tasks listed yet.
                </div>
              )}
            </div>

            {/* Action Header block on Daily: clean and spacious */}
            <div className="p-4 md:p-6 px-6 bg-white md:bg-stone-50/50 rounded-3xl md:rounded-none border border-stone-150 md:border-none md:border-t md:border-stone-100 flex items-center justify-between flex-wrap gap-4 shadow-sm md:shadow-none mb-3 md:mb-0 mt-3 md:mt-0">
              <div>
                <h2 className="text-xs md:text-sm font-black text-stone-850 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-orange-500 shrink-0" />
                  "Where Focus Goes, Energy Flows" Tony Robbins
                </h2>
                <p className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-wider font-mono mt-1">
                  MY Compassion for {format(daysOfWeek[0], 'MMM dd')} - {format(daysOfWeek[6], 'MMM dd')}
                </p>
              </div>

              <div className="flex items-center gap-2.5 mt-2 sm:mt-0">
                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="px-3.5 py-2 md:px-5 md:py-2.5 bg-orange-100/50 hover:bg-orange-100 text-orange-700 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all"
                >
                  {isAdding ? "Cancel" : "+ Add Task"}
                </button>
                <button
                  onClick={handleResetTasksToDefault}
                  className="px-3 py-1.5 md:px-5 md:py-2.5 bg-stone-105 bg-stone-100 hover:bg-stone-200 text-stone-605 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all"
                  title="Resets to requested 5 standard duties"
                >
                  Reset defaults
                </button>
              </div>
            </div>

            {/* Quick adding task drawer inline */}
            {isAdding && (
              <div className="p-5 md:p-6 bg-white md:bg-orange-50/10 rounded-3xl md:rounded-none border border-stone-150 md:border-none md:border-t md:border-stone-100 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-sm md:shadow-none mb-3 md:mb-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-stone-450 uppercase block mb-1.5">New Task Name</label>
                    <input 
                      type="text"
                      placeholder="Enter task name..."
                      value={newTaskName}
                      onChange={e => setNewTaskName(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-stone-800 outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-stone-450 uppercase block mb-1.5">Priority</label>
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as any)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-stone-700 outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                    >
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 gap-4 flex-wrap">
                  <div className="flex gap-2 flex-wrap max-w-[280px]">
                    {PRESET_COLORS.map(col => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setNewTaskColor(col.value)}
                        className="w-6 h-6 rounded-full border transition-all active:scale-95 hover:scale-110"
                        title={col.name}
                        style={{ 
                          backgroundColor: col.value, 
                          borderColor: newTaskColor === col.value ? '#a855f7' : 'transparent',
                          borderWidth: newTaskColor === col.value ? '2px' : '0' 
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => handleAddTask()}
                    className="p-2 px-5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] md:text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                  >
                    Confirm Add
                  </button>
                </div>
              </div>
            )}

            {/* Bottom info row: Total completions */}
            <div className="bg-white md:bg-stone-50 rounded-3xl md:rounded-none border border-stone-150 md:border-none md:border-t md:border-stone-100 p-4 md:p-6 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm md:shadow-none mt-3 md:mt-0">
              <div className="flex items-center gap-3 relative">
                <span className="text-[10px] md:text-xs font-black text-stone-450 uppercase tracking-widest block">
                  Weekly completions:
                </span>
                <span className="text-xs md:text-sm bg-white border border-stone-200 rounded-lg px-3 py-1 font-black text-stone-750 shadow-xs">
                  {completedCount} / {totalPossible} checked
                </span>

                {/* Export Dropdown */}
                <div className="relative ml-2" data-html2canvas-ignore="true">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`p-1.5 px-3 border text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 ${
                      showExportMenu 
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Export
                    <svg className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showExportMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-52 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50">
                      <div className="mb-2 px-2 pt-1">
                        <label className="text-[9px] font-black uppercase text-stone-400 block mb-1">Paper Size</label>
                        <select 
                          className="w-full text-xs font-bold bg-stone-50 border border-stone-200 rounded p-1.5 outline-none text-stone-700 focus:border-orange-400"
                          value={exportPaperSize}
                          onChange={(e) => setExportPaperSize(e.target.value as any)}
                        >
                          <option value="a4">A4 Size</option>
                          <option value="a3">A3 Size (Large)</option>
                          <option value="letter">Letter</option>
                          <option value="legal">Legal</option>
                        </select>
                      </div>
                      <div className="h-px bg-stone-100 my-1.5 mx-2"></div>
                      <button onClick={doExportPDF} className="w-full text-left px-3 py-2 text-xs font-bold text-stone-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors flex items-center gap-2">📄 Export as PDF</button>
                      <button onClick={doExportImage} className="w-full text-left px-3 py-2 text-xs font-bold text-stone-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors flex items-center gap-2">🖼️ Export as Image</button>
                      <button onClick={doExportWord} className="w-full text-left px-3 py-2 text-xs font-bold text-stone-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors flex items-center gap-2">📝 Export as Word</button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-wider hidden lg:flex items-center gap-1">
                ☀️ Soft peach & emerald eye-friendly themes (No blue & black)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Sub-tab Content: Tomorrow Planning (More Interesting View) */}
      {activeSubTab === 'Tomorrow' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-orange-50/60 to-purple-50/40 rounded-3xl p-5 border border-orange-100 shadow-md">
            
            {/* Header / Vibe controller */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-orange-100/50">
              <div>
                <span className="p-1 px-2.5 text-[8.5px] font-black uppercase text-orange-700 bg-orange-100/50 border border-orange-200/50 rounded-full">
                  Commitment Planning
                </span>
                <h2 className="text-sm font-black text-stone-800 uppercase tracking-widest mt-1">
                  Tomorrow's Strategic Intention Sheet
                </h2>
                <p className="text-[10px] text-stone-450 font-bold uppercase tracking-wider mt-0.5 font-mono">
                  Rise in advance: prioritize for premium mental clarity
                </p>
              </div>

              {/* Vibe selection cards with responsive emojis */}
              <div className="flex gap-1.5 bg-white border border-orange-100/60 p-1 rounded-xl self-start sm:self-auto shrink-0 shadow-sm relative z-10">
                {([
                  { id: 'Focus', emoji: '🎯', c: 'border-amber-400' },
                  { id: 'Creative', emoji: '🎨', c: 'border-fuchsia-400' },
                  { id: 'Care', emoji: '🧘‍♀️', c: 'border-emerald-400' },
                  { id: 'Productive', emoji: '⚡', c: 'border-orange-400' }
                ] as const).map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTomorrowVibe(item.id)}
                    className={`p-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                      tomorrowVibe === item.id
                        ? 'bg-orange-500 text-white font-extrabold shadow-sm'
                        : 'text-stone-500 hover:bg-orange-50'
                    }`}
                    title={`Switches vibe focusing to ${item.id}`}
                  >
                    <span>{item.emoji}</span>
                    <span className="hidden xs:inline">{item.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Micro Dynamic progress report */}
            <div className="bg-white/90 p-3 rounded-2xl mb-4 border border-orange-100 shadow-xs flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full border-2 border-orange-300 flex items-center justify-center font-black text-[10px] text-orange-600 bg-orange-50/50">
                  {tomorrowProgressPct}%
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-stone-605 text-stone-850">
                    {tomorrowCompletedCount === tomorrowTotalCount ? '🎉 Everything ready!' : '📝 Intentions being crafted'}
                  </p>
                  <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">
                    {tomorrowCompletedCount} of {tomorrowTotalCount} targets checked
                  </p>
                </div>
              </div>

              {/* Suggestions chips to add high impact tasks with 1 click */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const id = 'tt-' + Date.now();
                    handleUpdateTomorrowTasks([...tomorrowTasks, { id, name: '', completed: false }]);
                  }}
                  className="px-3 py-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-xs"
                >
                  + Add Custom Target
                </button>
                <button
                  onClick={handleResetTomorrowToDefault}
                  className="px-2 py-1 bg-stone-105 bg-stone-100 hover:bg-stone-200 text-stone-605 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Dynamic Suggestions based on last 7 days history */}
            {suggestedChips.length > 0 && (
              <div className="mb-4 bg-orange-50/25 border border-orange-100/60 p-3 rounded-2xl relative z-10">
                <span className="text-[9px] font-black text-orange-850 uppercase tracking-widest block mb-1.5 pl-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  💡 RECENT TARGETS & TASKS (LAST 7 DAYS HISTORY)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedChips.map(chipText => (
                    <button
                      key={chipText}
                      onClick={() => handleAddTomorrowTaskFromValue(chipText)}
                      className="p-1 px-2.5 bg-white hover:bg-orange-50 border border-orange-100 hover:border-orange-300 rounded-xl text-[11px] font-bold text-stone-700 hover:text-orange-700 transition-all active:scale-95 text-left truncate max-w-[220px]"
                      title={`Add "${chipText}" directly to tomorrow's list`}
                    >
                      <span>➕ {chipText}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Staggered lists of Planned items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
              {tomorrowTasks.map((t, index) => {
                const taskEmoji = getTaskEmoji(t.name, index);
                const theme = CARD_THEMES[index % CARD_THEMES.length];
                return (
                  <motion.div 
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between min-h-[90px] relative group ${
                      t.completed 
                        ? `${theme.completedBg} shadow-xs ring-2 ring-emerald-50` 
                        : `${theme.bg} ${theme.border} shadow-sm`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none shrink-0" role="img" aria-label="task-emoji">
                          {taskEmoji}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wider ${t.completed ? 'text-emerald-605' : 'opacity-70'}`}>
                          Priority No. {index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteTomorrowTask(t.id)}
                          className="p-1 text-stone-300 hover:text-rose-500 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete Target"
                        >
                          <Trash2 size={11} />
                        </button>

                        <button
                          onClick={() => handleToggleTomorrowTask(t.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                            t.completed
                              ? 'bg-emerald-500 border-transparent text-white shadow-sm shadow-emerald-500/20'
                              : 'border-stone-300 hover:border-orange-400 bg-white'
                          }`}
                        >
                          {t.completed ? (
                            <Check size={11} strokeWidth={3.5} />
                          ) : (
                            <div className="w-1 h-1 rounded-full bg-stone-305 bg-stone-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 relative">
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => handleEditTomorrowTask(t.id, e.target.value)}
                        placeholder={`Describe strategic target #${index + 1}...`}
                        className={`w-full bg-transparent border-b border-transparent focus:border-orange-300 py-0.5 font-bold text-[18px] text-stone-850 outline-none transition-all placeholder:text-stone-400/80 ${
                          t.completed ? 'line-through text-stone-400/80' : ''
                        }`}
                        style={{ fontSize: '18px' }}
                      />
                    </div>
                  </motion.div>
                );
              })}

              {tomorrowTasks.length === 0 && (
                <div className="col-span-2 text-center py-8 bg-white rounded-2xl border border-dashed border-orange-200">
                  <p className="text-xs font-bold text-stone-400 tracking-wider">
                    No strategic tomorrow tasks planned. Click "+ Add Custom Target" above to start!
                  </p>
                </div>
              )}
            </div>

            {/* Motivational bottom block */}
            <p className="text-center text-[9px] font-black uppercase tracking-wider text-orange-700/60 mt-4 leading-normal italic pl-1 select-none">
              "An hour of planning today saves three hours of correcting mistakes tomorrow." – Systematic Routine
            </p>
          </div>
        </div>
      )}

      {/* 4. Sub-tab Content: Reminder view utilizing the fully passed props */}
      {activeSubTab === 'Reminder' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {students && onAddStudent && onUpdateStudent && onDeleteStudent && onClearCategory && filters && setFilters ? (
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden relative z-10 w-full">
              <ReminderTable
                students={students}
                onAddStudent={onAddStudent}
                onUpdateStudent={onUpdateStudent}
                onDeleteStudent={onDeleteStudent}
                onClearCategory={onClearCategory}
                filters={filters}
                setFilters={setFilters}
                role={(role as any) || "Teacher"}
                settings={data.settings}
                onUpdateSettings={(s) =>
                  onUpdate({ ...data, settings: s })
                }
              />
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-bold text-stone-400 uppercase tracking-widest bg-white border border-stone-100 rounded-3xl">
              Growth reminders database linkage loading...
            </div>
          )}
        </div>
      )}

      {/* 5. Space-saving Collapsible bottom elements defaults to HIDDEN */}
      <div className="space-y-3 pt-2">
        {/* Toggle bar for secondary settings and trends */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-stone-50 border border-stone-200/60 rounded-2xl p-2 px-3 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="p-1 py-0.5 bg-orange-500 text-white rounded text-[8px] font-black uppercase font-mono">
              SECONDARY SETUP
            </span>
            <span className="text-[10px] text-stone-500 font-bold">
              Secondary details and week navigations are hidden as default
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setIsActionBarCollapsed(!isActionBarCollapsed)}
              className={`p-1 px-2.5 text-[9px] rounded-lg font-black uppercase tracking-wider transition-all border flex items-center gap-1 ${
                !isActionBarCollapsed 
                  ? 'bg-orange-500 text-white border-transparent' 
                  : 'bg-white hover:bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              <SlidersHorizontal size={10} />
              <span>{!isActionBarCollapsed ? 'Hide setups' : 'Show setup controls'}</span>
            </button>

            <button
              onClick={() => setShowTrend(!showTrend)}
              className={`p-1 px-2.5 text-[9px] rounded-lg font-black uppercase tracking-wider transition-all border flex items-center gap-1 ${
                showTrend 
                  ? 'bg-orange-500 text-white border-transparent' 
                  : 'bg-white hover:bg-stone-100 text-stone-600 border-stone-200'
              }`}
              title="7-Day compliance trends collapsed to save layout vertical space"
            >
              📊
              <span>{showTrend ? 'Hide trends' : 'Show trend charts'}</span>
            </button>
          </div>
        </div>

        {/* Persistent Week Navigation bar (Number Two) */}
        {!isActionBarCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => navigateWeek('prev')}
                className="p-1.5 bg-white hover:bg-stone-100 rounded-lg border border-stone-200 active:scale-95 transition-all text-stone-600"
                title="Previous Week"
              >
                <ChevronLeft size={14} />
              </button>
              
              <div className="px-3 py-1 bg-stone-50 rounded-lg border border-stone-200 text-[10px] font-black text-stone-700 tracking-wider uppercase min-w-[150px] text-center shadow-inner">
                {format(daysOfWeek[0], 'MMM dd')} - {format(daysOfWeek[6], 'MMM dd, yyyy')}
              </div>

              <button 
                onClick={() => navigateWeek('next')}
                className="p-1.5 bg-white hover:bg-stone-100 rounded-lg border border-stone-200 active:scale-95 transition-all text-stone-600"
                title="Next Week"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={goToCurrentWeek}
                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[10px] tracking-wider uppercase rounded-lg border border-orange-100 shadow-xs transition-all active:scale-95"
              >
                Back To Current Week
              </button>

              <button 
                onClick={() => setShowOverview(!showOverview)}
                className={`px-2.5 py-1.5 rounded-lg border font-bold text-[10px] tracking-wider uppercase shadow-xs transition-all active:scale-95 flex items-center gap-1 ${
                  showOverview 
                    ? 'bg-amber-50 border-amber-300 text-amber-800' 
                    : 'bg-orange-50 border-orange-100 text-orange-700 hover:bg-orange-100'
                }`}
              >
                <Clock size={11} />
                <span>{showOverview ? 'Hide YTD Stats' : 'YTD compliance'}</span>
              </button>

              <button 
                onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[10px] tracking-wider uppercase rounded-lg border border-stone-200 shadow-xs transition-all flex items-center gap-1"
              >
                {isHeaderCollapsed ? "Show Info Card" : "Hide Info Card"}
              </button>
            </div>
          </motion.div>
        )}

        {/* 7-Day progress visual trends bar chart */}
        {showTrend && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between mb-3.5 pl-1">
              <div className="flex items-center gap-1.5">
                <span className="p-0.5 px-2 text-[8px] font-black uppercase text-orange-700 bg-orange-50 border border-orange-100 rounded-full">
                  Discipline Velocity
                </span>
                <h3 className="text-[10px] font-black text-stone-800 uppercase tracking-widest">
                  7-Day Completion Trend Check (%)
                </h3>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {last7DaysStats.map((stat, i) => (
                <div key={i} className="flex flex-col items-center group/trend relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-9 scale-0 group-hover/trend:scale-100 transition-all bg-stone-800 text-white font-bold py-1 px-2 rounded text-[8px] pointer-events-none z-10 shadow uppercase tracking-wider min-w-[70px] text-center">
                    {stat.count}/{stat.total} ({stat.percentage}%)
                  </div>

                  {/* Date labels on top */}
                  <div className="mb-1.5 text-center">
                    <p className={`text-[8px] font-black uppercase tracking-wider ${
                      stat.isToday ? 'text-orange-600' : 'text-stone-400'
                    }`}>
                      {stat.dateLabel.split(' ')[0]}
                    </p>
                    <p className="text-[9px] font-bold text-stone-600">
                      {stat.dateLabel.split(' ')[1]}
                    </p>
                  </div>

                  {/* The dynamic bar container */}
                  <div className="w-full bg-stone-50 border border-stone-100/80 rounded-xl h-16 relative overflow-hidden flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${stat.percentage}%` }}
                      transition={{ duration: 0.5 }}
                      className={`w-full rounded-b-lg transition-all ${
                        stat.isToday 
                          ? 'bg-gradient-to-t from-orange-400 to-orange-500' 
                          : stat.percentage === 100 
                            ? 'bg-emerald-500' 
                            : stat.percentage >= 50 
                              ? 'bg-amber-400' 
                              : 'bg-fuchsia-400'
                      }`}
                    />
                    <div className="absolute inset-x-0 bottom-1 flex justify-center pointer-events-none">
                      <span className={`text-[8px] font-black ${
                        stat.percentage > 30 ? 'text-white drop-shadow' : 'text-stone-500'
                      }`}>
                        {stat.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* YTD compliance statistics panel */}
        {showOverview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-stone-50/50 rounded-2xl p-4 border border-stone-200 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="bg-white rounded-xl p-3 border border-stone-150 flex items-center gap-3">
              <span className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                <Flame size={16} />
              </span>
              <div>
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Year compliance</h4>
                <p className="text-sm font-bold text-stone-700">{yearlyAnalytics.overallYearPct}% checked YTD</p>
                <p className="text-[8px] text-stone-405 text-stone-550 font-bold uppercase tracking-wider">
                  {yearlyAnalytics.totalChecked} registered duty ticks this year
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-stone-150 flex items-center gap-3">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <CheckCircle2 size={16} />
              </span>
              <div>
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Task Urgency distribution</h4>
                <div className="flex gap-2.5 mt-0.5">
                  {['High', 'Medium', 'Low'].map(prio => {
                    const cnt = tasks.filter(t => (t.priority || 'Medium') === prio).length;
                    return (
                      <span key={prio} className="text-[9px] font-extrabold text-stone-600">
                        {prio}: <b className="text-stone-850">{cnt}</b>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Weekly tracker about card header info */}
        {!isHeaderCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-amber-50/30 rounded-2xl p-4 border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 bg-orange-100/50 text-orange-600 rounded-xl">
                <Calendar size={18} />
              </span>
              <div>
                <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                  Discipline Routines Tracker
                </h3>
                <p className="text-[10px] text-stone-500 font-medium">
                  Define high-impact micro tasks and verify checklist completions daily to master extreme execution consistency.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsHeaderCollapsed(true)}
              className="text-[9px] font-black uppercase text-orange-850 hover:bg-orange-100 bg-orange-100/50 p-1 px-3 rounded-lg border border-orange-200/50 shrink-0 self-start sm:self-auto"
            >
              Hide explanation
            </button>
          </motion.div>
        )}
      </div>

    </div>
  );
};
