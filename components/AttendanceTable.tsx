import React, { useState, useMemo } from 'react';
import { Student, AppData, UserRole, StudentCategory } from '../types';
import { format, addDays, getDaysInMonth, startOfMonth } from 'date-fns';
import { 
  Plus, UserCheck, 
  ChevronLeft, ChevronRight, ArrowUpDown, Calendar, Maximize2,
  Trash2, Zap, Check, AlertCircle, LayoutGrid, Search, EyeOff, Eye,
  CheckSquare, Square
} from 'lucide-react';

interface Props {
  students: Student[];
  data: AppData;
  filters: any;
  setFilters?: (f: any) => void;
  onUpdate: (newData: AppData) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
  onQuickAdd: () => void;
  isLocked?: boolean;
  role?: UserRole;
  onClearCategory?: (cats: StudentCategory[]) => void;
}

// Fixed color mapping based on provided screenshot
const ASSISTANT_COLORS: Record<string, string> = {
  'DALIN': '#EBF5FF', // Light Blue
  'LEAP': '#F0FFF4',  // Light Green
  'VORN': '#FFF5F5',  // Light Red/Pink
  'KHEANG': '#FFF9EB', // Light Orange
};

const getRowBg = (idx: number): string => {
  const colors = [
    'bg-emerald-400/5',
    'bg-emerald-400/5',
    'bg-amber-400/5',
    'bg-indigo-400/5',
    'bg-rose-400/5',
    'bg-violet-400/5',
    'bg-teal-400/5',
    'bg-orange-400/5'
  ];
  return colors[idx % colors.length];
};

/**
 * Icons for the Attendance Status based on screenshot: 
 * status 0 is a green solid check box.
 */
const getStatusIcon = (status?: number) => {
  if (status === 0) return (
    <div className="w-8 h-6 bg-[#67B18E] rounded-sm flex items-center justify-center text-white shadow-sm mx-auto">
      <Check size={16} strokeWidth={4} />
    </div>
  );
  if (status === 0.25) return (
    <div className="w-8 h-6 bg-orange-500 rounded-sm flex items-center justify-center text-white shadow-sm mx-auto">
       <span className="text-[10px] font-black">L</span>
    </div>
  );
  if (status === 1) return (
    <div className="w-8 h-6 bg-orange-500 rounded-sm flex items-center justify-center text-white shadow-sm mx-auto">
       <span className="text-[10px] font-black">A</span>
    </div>
  );
  return (
    <div className="w-8 h-6 border-2 border-slate-200 rounded-sm mx-auto bg-white/20"></div>
  );
};

export const AttendanceTable: React.FC<Props> = ({ 
  students, data, filters, setFilters, onUpdate, onAddStudent, isLocked = false, role, onClearCategory
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const monthKey = format(viewDate, 'yyyy-MM');
  const daysInMonth = getDaysInMonth(viewDate);
  const dayDisplay = format(viewDate, 'd');

  /**
   * Fixes: Error in file components/AttendanceTable.tsx on line 133: Cannot find name 'handleSort'.
   */
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
      const query = filters.searchQuery?.toLowerCase() || '';
      const matchesSearch = !query || 
        s.name.toLowerCase().includes(query) ||
        (s.assistant && s.assistant.toLowerCase().includes(query)) ||
        (s.time && s.time.toLowerCase().includes(query)) ||
        (s.teachers && s.teachers.toLowerCase().includes(query));

      return (s.category === 'Class' || s.category === 'Hall') && 
        (filters.showHidden || !s.isHidden) && 
        matchesSearch && 
        (!filters.teacher || (s.teachers && s.teachers.toUpperCase().includes(filters.teacher.toUpperCase()))) && 
        (!filters.assistant || (s.assistant && s.assistant.toUpperCase().includes(filters.assistant.toUpperCase()))) && 
        (!filters.level || (s.level && s.level.toUpperCase().includes(filters.level.toUpperCase()))) &&
        (!filters.time || (s.time && s.time.toUpperCase().includes(filters.time.toUpperCase())));
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = String((a as any)[sortConfig.key] || '').toLowerCase();
        let valB = String((b as any)[sortConfig.key] || '').toLowerCase();
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else {
      result.sort((a, b) => a.order - b.order);
    }
    return result;
  }, [students, filters, sortConfig]);

  const cycleStatus = (studentId: string, day: number) => {
    if (isLocked) return;
    const dayKey = `${monthKey}-${String(day).padStart(2, '0')}`;
    const newAttendance = { ...data.attendance };
    const studentRecord = { ...(newAttendance[studentId] || {}) };
    const cur = studentRecord[dayKey];
    
    let next: number | undefined;
    if (cur === undefined) next = 0; // Present
    else if (cur === 0) next = 0.25; // Late
    else if (cur === 0.25) next = 1; // Absent
    else next = undefined; // Reset

    if (next === undefined) {
      delete studentRecord[dayKey];
    } else {
      studentRecord[dayKey] = next;
    }
    
    newAttendance[studentId] = studentRecord;
    onUpdate({ ...data, attendance: newAttendance });
  };

  const markAllPresent = () => {
    if (isLocked) return;
    const dayKey = `${monthKey}-${String(viewDate.getDate()).padStart(2, '0')}`;
    const newAttendance = { ...data.attendance };
    filteredStudents.forEach(s => {
      const studentRecord = { ...(newAttendance[s.id] || {}) };
      studentRecord[dayKey] = 0;
      newAttendance[s.id] = studentRecord;
    });
    onUpdate({ ...data, attendance: newAttendance });
  };

  const Th = ({ label, colId, width, stickyLeft }: { label: string, colId: string, width?: number, stickyLeft?: number }) => (
    <th 
      onClick={() => handleSort(colId)}
      className={`px-4 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors group ${stickyLeft !== undefined ? 'sticky z-20 bg-inherit' : ''}`}
      style={{ width, left: stickyLeft }}
    >
      <div className="flex items-center justify-between">
        {label}
        <ArrowUpDown size={10} className={`${sortConfig?.key === colId ? 'opacity-100 text-primary-500' : 'opacity-20 group-hover:opacity-100'} transition-opacity`} />
      </div>
    </th>
  );

  const resetFilters = () => {
    setFilters?.({
      searchQuery: '',
      teacher: '',
      assistant: '',
      time: '',
      level: '',
      behavior: '',
      deadline: '',
      showHidden: false
    });
  };

  const filterSelectStyle = "bg-slate-200/50 mix-blend-multiply border border-slate-300/30 rounded-xl pl-8 pr-3 py-1.5 text-[10px] font-black uppercase text-slate-800 outline-none shadow-sm transition-all focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 hover:bg-slate-300/60 cursor-pointer h-9 appearance-none backdrop-blur-md";

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden p-2 md:p-6 lg:p-8">
      {/* Table Header UI */}
      <div className="bg-white/30 backdrop-blur-3xl rounded-[32px] p-6 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-2xl shadow-slate-300/50 border border-white/60 flex-none relative z-10">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
            <UserCheck size={24} strokeWidth={3} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1B254B] uppercase tracking-tighter leading-none">Attendance Log</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase mt-1 tracking-[2px]">{format(viewDate, 'MMMM yyyy')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md">
            <button onClick={() => setViewDate(d => addDays(d, -1))} className="p-1.5 text-slate-500 hover:text-orange-500 transition-colors"><ChevronLeft size={18}/></button>
            <span className="px-5 text-[11px] font-black text-[#1B254B] uppercase tracking-[2px] min-w-[80px] text-center">
                {format(viewDate, 'MMM d').toUpperCase()}
            </span>
            <button onClick={() => setViewDate(d => addDays(d, 1))} className="p-1.5 text-slate-500 hover:text-orange-500 transition-colors"><ChevronRight size={18}/></button>
          </div>
          <button className="p-2.5 bg-white border border-white/60 rounded-xl text-slate-400 hover:text-orange-500 transition-all shadow-sm">
            <Calendar size={18} />
          </button>
          <button className="p-2.5 bg-white border border-white/60 rounded-xl text-slate-400 hover:text-orange-500 transition-all shadow-sm">
            <Maximize2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end shrink-0">
          <button 
            disabled={isLocked}
            onClick={markAllPresent}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all h-11 ${!isLocked ? 'bg-white text-slate-400 border border-white hover:bg-slate-50 hover:text-orange-500' : 'bg-white border-white text-slate-300 opacity-60 cursor-not-allowed'}`}
          >
            <Zap size={14} /> Mark All Present
          </button>
          
          {role === 'Admin' && (
            <button 
              onClick={() => onClearCategory?.(['Class'])}
              title="CLEAR ALL CLASS RECORDS"
              className="w-11 h-11 bg-rose-50 text-rose-500 border border-rose-100 rounded-xl flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white transition-all"
            >
              <AlertCircle size={20} />
            </button>
          )}

          {selectedIds.size > 0 && (
            <button 
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} selected records?`)) {
                  onUpdate({ ...data, students: students.filter(s => !selectedIds.has(s.id)) });
                  setSelectedIds(new Set());
                }
              }}
              className="px-4 h-11 bg-red-500 text-white rounded-xl flex items-center gap-2 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <Trash2 size={16} /> Delete ({selectedIds.size})
            </button>
          )}

          <button 
            onClick={() => onAddStudent({ category: 'Class' })}
            className="w-11 h-11 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-xl shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <Plus size={24} strokeWidth={4} />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="w-full basis-full flex items-center gap-3 pt-4 border-t border-slate-300/30 overflow-x-auto no-scrollbar pointer-events-auto shrink-0 relative flex-wrap">
              <div className="relative w-64 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Search spreadsheet..." 
                      className="w-full h-9 pl-9 pr-3 bg-white border border-white/80 rounded-2xl shadow-sm text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                      value={filters.searchQuery || ''}
                      onChange={e => setFilters && setFilters({...filters, searchQuery: e.target.value})}
                  />
              </div>

              <div className="flex items-center gap-2 shrink-0 border-l border-slate-300/30 pl-4">
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.teacher || ''} onChange={e => setFilters && setFilters({...filters, teacher: e.target.value})} className={filterSelectStyle}>
                          <option value="">Teachers</option>
                          {Array.from(new Set(students.filter(s => s.category === 'Class' || s.category === 'Hall').map(s => s.teachers?.split('&')?.[0]?.trim()).filter(Boolean))).sort().map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.assistant || ''} onChange={e => setFilters && setFilters({...filters, assistant: e.target.value})} className={filterSelectStyle}>
                          <option value="">Assistants</option>
                          {Array.from(new Set(students.filter(s => s.category === 'Class' || s.category === 'Hall').map(s => s.assistant?.trim()).filter(Boolean))).sort().map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.level || ''} onChange={e => setFilters && setFilters({...filters, level: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Levels</option>
                          {Array.from(new Set(students.filter(s => s.category === 'Class' || s.category === 'Hall').map(s => s.level?.trim()).filter(Boolean))).sort().map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={filters.time || ''} onChange={e => setFilters && setFilters({...filters, time: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Times</option>
                          {Array.from(new Set(students.filter(s => s.category === 'Class' || s.category === 'Hall').map(s => s.time?.trim()).filter(Boolean))).sort().map(tm => <option key={tm} value={tm}>{tm}</option>)}
                      </select>
                  </div>

                  <button onClick={resetFilters} className="p-2 ml-1 bg-white/50 border border-slate-300/30 text-slate-800 hover:bg-slate-300/50 rounded-xl transition-all backdrop-blur-md shadow-sm" title="Clear Filters">
                      <Trash2 size={16} />
                  </button>
              </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="flex-1 bg-white/[0.02] backdrop-blur-[2px] rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/5 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse table-fixed min-w-[1200px]">
            <thead className="sticky top-0 z-40 bg-white/[0.02] backdrop-blur-[2px] border-b border-white/5">
              <tr>
                <th className="w-10 h-10 border-r border-white/5 sticky left-0 z-50 bg-white/[0.02] backdrop-blur-[2px] text-center">
                  <button onClick={() => setSelectedIds(selectedIds.size === filteredStudents.length ? new Set() : new Set(filteredStudents.map(s => s.id)))}>
                      {selectedIds.size > 0 ? <CheckSquare size={14} className="text-orange-500 mx-auto" /> : <Square size={14} className="text-slate-900/30 mx-auto" />}
                  </button>
                </th>
                <th className="px-4 py-4 text-center text-[10px] font-black uppercase text-slate-900 w-12 border-r border-white/5 sticky left-[40px] z-50 bg-white/[0.02] backdrop-blur-[2px]">#</th>
                <Th label="Student Name" colId="name" width={220} stickyLeft={88} />
                <Th label="Teacher" colId="teachers" width={160} />
                <Th label="Level" colId="level" width={100} />
                <Th label="Time" colId="time" width={140} />
                <Th label="Assistant" colId="assistant" width={150} />
                
                {/* Numeric Date Columns */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                   <th 
                    key={day}
                    onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                    className={`text-center text-[10px] font-black w-12 border-r border-slate-100 cursor-pointer transition-colors ${parseInt(dayDisplay) === day ? 'bg-orange-50/50 text-orange-600 border-b-2 border-b-orange-400' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                     {day}
                   </th>
                ))}
                
                <th className="px-4 py-4 text-center text-[10px] font-black uppercase text-slate-400 w-24 sticky right-0 z-50 bg-[#F8FAFC] border-l border-slate-100 shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, idx) => {
                const rowBgClass = getRowBg(idx);
                const isHidden = s.isHidden;

                return (
                  <tr 
                    key={s.id} 
                    className={`group transition-all hover:brightness-95 h-10 ${isHidden ? 'bg-slate-50' : rowBgClass}`}
                  >
                    <td className="px-0 text-center border-r border-slate-200/10 sticky left-0 z-30 bg-inherit w-10">
                      <button onClick={() => { const ns = new Set(selectedIds); ns.has(s.id) ? ns.delete(s.id) : ns.add(s.id); setSelectedIds(ns); }}>
                        {selectedIds.has(s.id) ? <CheckSquare size={14} className="text-orange-600" /> : <Square size={14} className="text-slate-400/30" />}
                      </button>
                    </td>
                    <td className="px-4 text-center text-xs font-black text-slate-400 border-r border-slate-200/10 sticky left-[40px] z-30 bg-inherit">{idx + 1}</td>
                    <td className="px-5 border-r border-slate-200/10 sticky left-[88px] z-30 bg-inherit shadow-sm">
                      <div className={`text-[12px] font-black text-[#1B254B] uppercase tracking-tight truncate ${isHidden ? 'opacity-30' : ''}`}>{s.name}</div>
                    </td>
                    <td className="px-4 border-r border-slate-200/10">
                      <div className={`text-[11px] font-bold text-slate-500 uppercase truncate ${isHidden ? 'opacity-30' : ''}`}>{s.teachers || 'N/A'}</div>
                    </td>
                    <td className="px-4 border-r border-slate-200/10 text-center">
                      <div className={`text-[11px] font-black text-slate-600 uppercase ${isHidden ? 'opacity-30' : ''}`}>{s.level || 'N/A'}</div>
                    </td>
                    <td className="px-4 border-r border-slate-200/10">
                      <div className={`text-[11px] font-black text-slate-500 ${isHidden ? 'opacity-30' : ''}`}>{s.time || 'N/A'}</div>
                    </td>
                    <td className="px-4 border-r border-slate-200/10">
                      <div className={`text-[11px] font-black text-primary-600 uppercase tracking-widest ${isHidden ? 'opacity-30' : ''}`}>{s.assistant || 'N/A'}</div>
                    </td>
                    
                    {/* Dynamic Date Columns */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const dayKey = `${monthKey}-${String(day).padStart(2, '0')}`;
                        const status = data.attendance[s.id]?.[dayKey];
                        const isCurrentColumn = parseInt(dayDisplay) === day;

                        return (
                          <td 
                            key={day} 
                            onClick={() => cycleStatus(s.id, day)}
                            className={`p-0 border-r border-slate-200/10 cursor-pointer transition-colors ${isCurrentColumn ? 'bg-orange-500/5' : ''}`}
                          >
                            <div className={`w-full h-full flex items-center justify-center ${isHidden ? 'opacity-20 grayscale' : ''}`}>
                                {getStatusIcon(status)}
                            </div>
                          </td>
                        );
                    })}

                    {/* Actions Sticky Column */}
                    <td className="px-4 sticky right-0 z-30 bg-inherit border-l border-slate-200/10 shadow-[-2px_0_4px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => onUpdate({ ...data, students: students.map(st => st.id === s.id ? { ...st, isHidden: !isHidden } : st) })}
                          className={`p-1.5 rounded-lg transition-all ${isHidden ? 'bg-[#1B254B] text-white' : 'text-slate-300 hover:text-primary-500 hover:bg-white'}`}
                        >
                          {isHidden ? <Eye size={16}/> : <EyeOff size={16}/>}
                        </button>
                        <button 
                          onClick={() => confirm('Delete record?') && onUpdate({ ...data, students: students.filter(st => st.id !== s.id) })}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};