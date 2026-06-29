import React, { useRef, useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  LogOut, 
  CalendarCheck, 
  Contact, 
  LayoutGrid,
  ChevronDown,
  Eye,
  EyeOff,
  ChevronLeft,
  Menu,
  User as UserIcon,
  UserCheck,
  BookOpen,
  FilterX,
  Zap,
  ClipboardList,
  Bell,
  CheckSquare,
  Image as ImageIcon,
  Trash2,
  FileText,
  Wallet,
  RotateCcw,
  RotateCw,
  GraduationCap,
  Settings,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Bookmark
} from 'lucide-react';
import { Tab, UserRole, AppSettings, ViewMode, StudentCategory, AppData, CurrentUser } from '../types';
import { getSyncStatus } from '../services/supabase';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout: () => void;
  role: UserRole;
  currentUser?: CurrentUser | null;
  onSettingsOpen: () => void;
  filters: any;
  setFilters: (f: any) => void;
  uniqueTeachers: string[];
  uniqueAssistants: string[];
  uniqueTimes: string[];
  uniqueLevels?: string[];
  uniqueBehaviors?: string[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  globalScale: number;
  setGlobalScale: (s: number) => void;
  settings?: AppSettings;
  onUpdateSettings?: (s: AppSettings) => void;
  data: AppData;
  onClearCategory: (categories: StudentCategory[]) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isSyncing?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen, 
  activeTab, 
  setActiveTab, 
  onLogout,
  role, 
  currentUser,
  onSettingsOpen,
  filters,
  setFilters,
  uniqueTeachers,
  uniqueAssistants,
  uniqueTimes,
  uniqueLevels,
  uniqueBehaviors,
  viewMode,
  setViewMode,
  globalScale,
  setGlobalScale,
  settings,
  onUpdateSettings,
  data,
  onClearCategory,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSyncing
}) => {

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const { checkSupabaseConnection } = await import('../services/supabase');
      const active = typeof window !== 'undefined' && window.navigator.onLine && await checkSupabaseConnection();
      setIsOnline(!!active);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s

    const handleOnline = () => checkStatus();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTabSelect = (tab: Tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const navItems = [
    { id: Tab.DailyPerformanceCheck, icon: CheckSquare, label: 'Daily Performance', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.DPSS, icon: FileText, label: 'Note-taking', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.SelfLearning, icon: GraduationCap, label: 'Self-Learning', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.Templates, icon: Bookmark, label: 'Templates', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.ExpenseTracker, icon: Wallet, label: 'Daily Expenses', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.Reflections, icon: LayoutGrid, label: 'Growth Plan', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.DailyJournal, icon: BookOpen, label: 'Daily Journal', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.Analytics, icon: BarChart3, label: 'Analytics', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.AdvancedHabitTracker, icon: Sparkles, label: 'Advanced Habits', roles: ['Admin', 'Teacher', 'Finance'] },
    { id: Tab.RecycleBin, icon: Trash2, label: 'Recycle Bin', roles: ['Admin', 'Teacher'] },
    { id: Tab.Maintenance, icon: ShieldCheck, label: 'Maintenance & Sync', roles: ['Admin'] },
  ];

  const filterSelectStyle = "w-full bg-white/10 border border-white/20 rounded-xl py-2.5 px-3 text-[11px] text-slate-900 font-black outline-none transition-all cursor-pointer appearance-none hover:bg-white/20 focus:ring-4 focus:ring-primary-500/10 backdrop-blur-md";
  const labelStyle = "text-[10px] font-black text-slate-800 mb-2 flex items-center gap-2 ml-1 tracking-[3px]";

  return (
    <>
      {/* Re-open button when hidden */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-[60] w-8 h-8 bg-white text-[#1B254B] rounded-lg shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-slate-100"
        >
          <Menu size={16} />
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/5 z-40 md:hidden backdrop-blur-[2px] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`fixed md:relative h-full z-50 md:z-40 bg-white/[0.02] backdrop-blur-md border-r border-white/10 text-slate-900 flex flex-col transition-all duration-300 ease-in-out shadow-2xl no-print shrink-0 ${
          isOpen ? 'w-[85vw] sm:w-[320px] md:w-[280px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden'
        }`}
      >
        {/* Branding Area with Collapse Toggle */}
        <div className="p-4 sm:p-5 md:p-6 flex items-center justify-between border-b border-white/5 shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shrink-0">
              P
            </div>
            <div className="overflow-hidden">
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase leading-none text-slate-900 truncate">Peak Performance</h2>
              <p className="text-[9px] sm:text-[10px] font-black text-rose-600 uppercase tracking-widest mt-1 truncate">Growth Portal</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 sm:p-2 text-slate-400 hover:text-slate-800 hover:bg-white/10 rounded-xl transition-all shrink-0 ml-1"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Navigation & Filters */}
        <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {role && (
            <div className="bg-orange-500/10 rounded-lg p-2.5 border border-orange-500/20 mb-4 max-w-full relative shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[11px] font-black shrink-0">
                  {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden flex-1 flex flex-col justify-center">
                  <p className="text-[11px] font-black text-slate-900 dark:text-slate-200 truncate tracking-tight leading-tight">{currentUser?.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-500 animate-bounce' : isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span 
                      className={`text-[8px] font-black leading-none uppercase ${isSyncing ? 'text-blue-600' : isOnline ? 'text-emerald-600' : 'text-amber-600/90'}`} 
                      title={isSyncing ? "Syncing..." : isOnline ? "Online" : "Offline"}
                    >
                      {isSyncing ? 'Sync' : isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-0.5 shrink-0 ml-1">
                  <button onClick={() => setGlobalScale(Math.min(1.4, globalScale + 0.05))} className="w-5 h-5 flex items-center justify-center rounded-t border-b border-orange-500/10 bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-600 font-bold transition-colors leading-none" title="Bigger UI">＋</button>
                  <button onClick={() => setGlobalScale(Math.max(0.6, globalScale - 0.05))} className="w-5 h-5 flex items-center justify-center rounded-b bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-600 font-bold transition-colors leading-none" title="Smaller UI">－</button>
                </div>
              </div>
            </div>
          )}

          <nav className="space-y-1 sm:space-y-2">
              {navItems.filter(item => item.roles.includes(role)).map(item => (
                <button
                    key={item.id}
                    onClick={() => handleTabSelect(item.id)}
                    className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-[20px] transition-all w-full group ${
                      activeTab === item.id 
                        ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20 backdrop-blur-[4px]' 
                        : 'text-slate-600 hover:text-orange-600 hover:bg-white/[0.05]'
                    }`}
                >
                    <item.icon size={20} className="shrink-0" strokeWidth={activeTab === item.id ? 3 : 2} />
                    <span className="text-[10px] sm:text-[11px] font-black tracking-widest truncate">{item.label}</span>
                </button>
              ))}

              <button 
                onClick={onSettingsOpen}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-[20px] transition-all w-full group text-slate-600 hover:text-orange-600 hover:bg-white/[0.05]"
              >
                <Settings size={20} className="shrink-0" strokeWidth={2} />
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest truncate uppercase">Settings</span>
              </button>

              <button 
                onClick={() => {
                  document.documentElement.classList.toggle('dark');
                  const isDark = document.documentElement.classList.contains('dark');
                  localStorage.setItem('theme', isDark ? 'dark' : 'light');
                }}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-[20px] transition-all w-full group text-slate-600 hover:text-orange-600 hover:bg-white/[0.05]"
              >
                <Eye size={20} className="dark:hidden block shrink-0" strokeWidth={2} />
                <EyeOff size={20} className="dark:block hidden shrink-0" strokeWidth={2} />
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest truncate uppercase">Toggle Theme</span>
              </button>
          </nav>
        </div>
      </aside>
    </>
  );
};
