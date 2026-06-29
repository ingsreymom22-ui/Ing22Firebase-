
// Shared types for the application

export type StudyType = 'FullTime' | 'PartTime' | 'Khmer';

export type StudentCategory = 'Hall' | 'Class' | 'Office' | 'Card' | 'Queue' | 'Penalty' | 'Reminder';

export type UserRole = 'Admin' | 'Teacher' | 'Finance';

export interface ColumnConfig {
  id: string;
  key: string;
  label: string;
  width: number;
  visible: boolean;
  type: 'text' | 'date' | 'boolean' | 'select';
}

export interface CurrentUser {
  name: string;
  role: UserRole;
  uid?: string;
  email?: string | null;
}

export interface PhotoAdjust {
  x: number;
  y: number;
  scale: number;
}

export interface Student {
  id: string;
  name: string;
  category: StudentCategory;
  order: number;
  isHidden?: boolean;
  deletedAt?: string;
  parentContact?: boolean;
  headTeacher?: boolean;
  photo?: string;
  photoAdjust?: PhotoAdjust;
  thumbprintNotes?: string;
  [key: string]: any; // Support for dynamic columns
}

export interface PriorityLevel {
  id: string;
  label: string;
  color: string;
}

export interface AppSettings {
  fontSize: number;
  fontFamily: string;
  textFontFamily?: string;
  textFontSize?: number;
  columns?: ColumnConfig[];
  backgroundImage?: string;
  backgroundImageBlur?: number;
  backgroundDimOpacity?: number;
  appBackgroundColor?: string;
  currency?: 'USD' | 'KHR';
  exchangeRate?: number;
  monthlyBudgetGoal?: number;
  fontColor?: string;
  dateTextColor?: string;
  highContrastMode?: boolean;
  paperStyle?: string;
  tableBorderThickness?: number;
  tableBorderColor?: string;
  dailyPerformanceSymbol?: 'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon' | 'triangle' | 'shield' | 'lightning' | 'crown' | 'moon' | 'sparkle' | 'octagon' | 'cross' | 'cloud';
  dopamineFast?: any;
  dopamineFastsHistory?: any[];
  weeklyAIInsight?: Record<string, string>;
  priorities?: PriorityLevel[];
}

export interface ModuleLocks {
  Hall: boolean;
  Attendance: boolean;
  Finance: boolean;
}

export type NeuralEngine = string;
export interface QuickSource { data: string; mimeType: string; }
export interface OutlineItem { id: string; title: string; expanded: boolean; children: OutlineItem[]; }
export type ExternalKeys = Record<string, string>;

/**
 * Interface for staff contact information (phone and telegram).
 */
export interface StaffDirectory {
  [name: string]: {
    phone?: string;
    telegram?: string;
  };
}

/**
 * Interface representing a single chat message in AI Studio.
 */
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

/**
 * Interface representing a saved chat session in AI Studio.
 */
export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'table' | 'image' | 'file' | 'date';
  data: any;
}

export interface DPSSTopic {
  id: string;
  title: string;
  content: string;
  alignment: 'left' | 'center' | 'right';
  deletedAt?: string; // Soft delete support
  children?: DPSSTopic[];
  order?: number;
  createdAt?: number;
  attachments?: { id: string; name: string; url: string; type: string }[];
  isArchived?: boolean;
  isLocked?: boolean;
  priority?: string;
  customBullets?: string[];
  customChecklists?: string[];
  defaultListType?: 'bullet' | 'checklist' | 'number';
  defaultMarker?: string;
  textFontFamily?: string;
  textFontSize?: number;
  headerFontFamily?: string;
  headerFontSize?: number;
  paperStyle?: string;
  gridSpacing?: number;
}

export interface Habit {
  id: string;
  name: string;
  color?: string;
  order: number;
  isNumeric?: boolean;
  targetValue?: number;
  unit?: string;
  category?: string;
}

export interface HabitCompletion {
  [habitId: string]: boolean | number;
}

export interface DailyPerformanceTask {
  id: string;
  name: string;
  color: string; // 'blue' | 'green' | 'red' | 'yellow' | 'purple' etc.
  priority?: 'Low' | 'Medium' | 'High';
  category?: string;
}

export interface AppData {
  students: Student[];
  settings?: AppSettings;
  attendance: Record<string, Record<string, number>>;
  dpssTopics?: DPSSTopic[];
  systemLocked?: boolean;
  moduleLocks?: ModuleLocks;
  idCounters?: Record<string, number>;
  schoolLogo?: string;
  staffDirectory?: StaffDirectory;
  habits?: Habit[];
  habitCompletions?: Record<string, HabitCompletion>; // key: YYYY-MM-DD
  journalEntries?: Record<string, JournalEntry>; // key: YYYY-MM-DD
  reflections?: ReflectionData;
  expenses?: ExpenseEntry[];
  expenseCategories?: string[];
  selfLearningTopics?: DPSSTopic[];
  dailyNotes?: Record<string, string>;
  advancedHabits?: AdvancedHabit[];
  advancedHabitLogs?: Record<string, Record<string, number>>; // Key: YYYY-MM-DD, value: { habitId: value }
  habitNotes?: Record<string, Record<string, string>>; // Key: YYYY-MM-DD, value: { habitId: notesText }
  advancedHabitNotes?: Record<string, Record<string, string>>; // Key: YYYY-MM-DD, value: { habitId: notesText }
  habitReframers?: HabitReframerRecord[];
  recurringExpenses?: RecurringExpense[];
  dailyPerformanceTasks?: DailyPerformanceTask[];
  dailyPerformanceCompletions?: Record<string, Record<string, boolean>>; // Key: YYYY-MM-DD, value is { [taskId]: boolean }
  tomorrowTasks?: { id: string; name: string; completed: boolean }[];
  templates?: Template[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  content: string; // The rich HTML/text configuration
  customBullets: string[];
  customChecklists: string[];
  defaultListType: 'bullet' | 'checklist' | 'number';
  defaultMarker: string;
  themeColor: string; // Tailwind class prefix, e.g. emerald, rose, blue, amber, violet, zinc
  createdAt: string;
  isSystem?: boolean;
  textFontFamily?: string;
  textFontSize?: number;
  headerFontFamily?: string;
  headerFontSize?: number;
}

export interface HabitReframerRecord {
  id: string;
  date: string;
  thought: string;
  feeling: string;
  intention: string;
  actualOutcome: string;
  alternativeStrategy: string; // What can I do instead when the problem arises?
  studentId?: string;
  studentName?: string;
  
  // D.O.P.A.M.I.N.E. Expanded framework properties
  isFullDopamineAudit?: boolean;
  substanceOrBehavior?: string; // D - Data (What)
  frequencyAndAmount?: string;  // D - Data (How much, how often)
  objectives?: string;          // O - Objectives (Why)
  
  // P - Detailed Problem Checklist fields
  pNeuroadaptation?: string;    // Neuroadaptation (tolerance, withdrawal, craving)
  pRelationships?: string;      // Relationship problems
  pWork?: string;               // Work/School problems
  pFinancial?: string;          // Financial problems
  pHealth?: string;             // Health problems
  pSpiritual?: string;          // Spiritual/Values problems
  
  abstinencePlan?: string;      // A - Abstinence
  mindfulnessNotes?: string;    // M - Mindfulness
  insightHonesty?: string;      // I - Insight
  nextStepsPlan?: string;       // N - Next Steps
  experimentRules?: string;     // E - Experiment
}

export interface AdvancedHabit {
  id: string;
  name: string;
  type: 'dopamine' | 'effort'; // dopamine = Instant Gratification/pleasure; effort = High Effort/pain
  unit: string; // e.g. Minutes, Hours, Pages, Liters, Times
  weeklyGoal?: number; // target or limit value for weekly total
  goalType: 'limit' | 'target'; // limit = do not exceed; target = achieve at least
  color: string; // e.g. emerald, rose, sky, indigo
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: 'USD' | 'KHR';
  dayOfMonth: number; // e.g. 1 to 31
  lastLoggedDate?: string; // YYYY-MM-DD format to prevent duplicate logs
  active?: boolean;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'Income' | 'Expense';
  currency?: 'USD' | 'KHR';
  notes?: string;
}

export interface ReflectionEntry {
  id: string;
  title: string;
  content: string;
  archivedAt?: string; // If present, it's archived
}

export interface ReflectionData {
  weeklyReview: ReflectionEntry;
  monthlyChallenge: ReflectionEntry;
  threeMonthVision: ReflectionEntry;
  sixMonthVision: ReflectionEntry;
  oneYearVision: ReflectionEntry;
  archives?: ReflectionEntry[];
}

export interface JournalEntry {
  achievements: string[];
  affirmation: string;
  gratitude: string;
  feeling: string;
  appreciation: string;
  lookingForward: string;
  inspiration: string;
  learning: string;
  discipline: string;
  isCompleted: boolean;
  energyRating?: number;
  focusRating?: number;
  productivityRating?: number;
  stressRating?: number;
  gratitudeRating?: number;
  vitalityRating?: number;
}

export interface BackupEntry {
  id: string;
  timestamp: string;
  data: AppData;
  type: 'Auto' | 'Manual';
}

export enum Tab {
  HabitTracker = 'HabitTracker',
  AdvancedHabitTracker = 'AdvancedHabitTracker',
  Reflections = 'Reflections',
  DailyJournal = 'DailyJournal',
  DailyPerformanceCheck = 'DailyPerformanceCheck',
  Reminder = 'Reminder',
  DPSS = 'DPSS',
  SelfLearning = 'SelfLearning',
  ExpenseTracker = 'ExpenseTracker',
  Analytics = 'Analytics',
  RecycleBin = 'RecycleBin',
  Maintenance = 'Maintenance',
  Templates = 'Templates'
}

export type ViewMode = 'Default' | 'Minimalist';

export interface FilterState {
  searchQuery: string; 
  teacher: string;
  assistant: string;
  time: string;
  level: string;
  behavior: string;
  deadline: string;
  showHidden: boolean;
}
