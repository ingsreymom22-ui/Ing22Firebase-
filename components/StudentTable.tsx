import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, FilterState, ColumnConfig, UserRole, StudentCategory } from '../types';
import { 
    Trash2, Eye, EyeOff, CheckSquare, Square, ArrowUpDown, Zap, Plus, 
    LayoutGrid, Search, Lock, Unlock,
    PlusCircle, MinusCircle, Type, AlertCircle
} from 'lucide-react';
import { isBefore, isToday, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const MultilineInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}> = ({ value, onChange, className, style, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(44, scrollHeight) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={className}
      style={{ ...style, resize: 'none', overflow: 'hidden', display: 'block' }}
    />
  );
};

/**
 * Interface for StudentTable component props.
 * Fixes: Error in file components/StudentTable.tsx on line 58: Cannot find name 'StudentTableProps'.
 */
interface StudentTableProps {
  students: Student[];
  columns: ColumnConfig[];
  onUpdate: (students: Student[]) => void;
  onUpdateColumns: (columns: ColumnConfig[]) => void;
  filters: FilterState;
  setFilters?: (filters: FilterState) => void;
  uniqueTeachers?: string[];
  uniqueAssistants?: string[];
  uniqueTimes?: string[];
  uniqueLevels?: string[];
  uniqueBehaviors?: string[];
  onQuickAdd?: () => void;
  onAddStudent?: (defaults: Partial<Student>) => void;
  role?: UserRole;
  onClearCategory?: (cats: StudentCategory[]) => void;
}

const robustParseDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    return isValid(d) ? d : null;
  }
  const iso = new Date(clean);
  return isValid(iso) ? iso : null;
};

const startOfDayManual = (d: Date): Date => {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
};

const isDeadlineDue = (deadline: string) => {
    if (!deadline) return false;
    const d = robustParseDate(deadline);
    if (!d || d.getFullYear() < 2000) return false;
    const today = startOfDayManual(new Date());
    const deadlineDay = startOfDayManual(d);
    return isToday(deadlineDay) || isBefore(deadlineDay, today);
};

const ASSISTANT_PALETTE = [
  'rgba(224, 242, 254, 0.4)', // Sky
  'rgba(240, 253, 244, 0.4)', // Emerald
  'rgba(254, 252, 232, 0.4)', // Amber
  'rgba(250, 245, 255, 0.4)', // Purple
  'rgba(255, 247, 237, 0.4)', // Orange
  'rgba(253, 242, 248, 0.4)', // Pink
  'rgba(240, 253, 250, 0.4)', // Teal
  'rgba(245, 243, 255, 0.4)', // Indigo
  'rgba(236, 253, 245, 0.4)', // Mint
  'rgba(255, 241, 242, 0.4)'  // Rose
];

const getAssistantBgColor = (assistant: string): string => {
  if (!assistant) return 'rgba(248, 250, 252, 0.4)';
  let hash = 0;
  for (let i = 0; i < assistant.length; i++) {
    hash = assistant.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ASSISTANT_PALETTE[Math.abs(hash) % ASSISTANT_PALETTE.length];
};

export const StudentTable: React.FC<StudentTableProps> = ({ 
  students, columns, onUpdate, onUpdateColumns, filters, setFilters, 
  uniqueTeachers = [], uniqueAssistants = [], uniqueTimes = [], uniqueLevels = [], onQuickAdd, onAddStudent,
  role, onClearCategory
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFrozen, setIsFrozen] = useState(false); 
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, colId: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const filteredStudents = useMemo(() => {
    let result = students.filter(s => {
        const query = filters.searchQuery?.toLowerCase() || '';
        const matchesSearch = !query || 
            columns.some(col => String(s[col.key] || '').toLowerCase().includes(query)) ||
            String(s.name || '').toLowerCase().includes(query) ||
            String(s.assistant || '').toLowerCase().includes(query) ||
            String(s.teachers || '').toLowerCase().includes(query);
        
        // Exact Teacher filtering
        const matchesTeacher = !filters.teacher || 
            String(s.teachers || '').toUpperCase().includes(filters.teacher.toUpperCase());
            
        // Exact Assistant filtering (usually selected from list, but let's be robust)
        const matchesAssistant = !filters.assistant || 
            String(s.assistant || '').toUpperCase().includes(filters.assistant.toUpperCase());
            
        const matchesTime = !filters.time || String(s.time || '').toUpperCase().includes(filters.time.toUpperCase());
        const matchesLevel = !filters.level || String(s.level || '').toUpperCase().includes(filters.level.toUpperCase());
        const matchesBehavior = !filters.behavior || String(s.behavior || '').toUpperCase().includes(filters.behavior.toUpperCase());
        const matchesVisibility = filters.showHidden || !s.isHidden;
        const matchesCategory = s.category === 'Hall';
        
        return matchesSearch && matchesTeacher && matchesAssistant && matchesTime && matchesLevel && matchesBehavior && matchesVisibility && matchesCategory;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = a[sortConfig.key];
        let valB: any = b[sortConfig.key];
        
        // Date sorting check
        if (sortConfig.key === 'startDate' || sortConfig.key === 'deadline') {
           const d1 = robustParseDate(String(valA || '')), d2 = robustParseDate(String(valB || ''));
           if (d1 && d2) {
             return sortConfig.direction === 'asc' ? d1.getTime() - d2.getTime() : d2.getTime() - d1.getTime();
           }
        }

        // Numeric check
        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));
        if (!isNaN(numA) && !isNaN(numB) && String(numA) === String(valA).trim() && String(numB) === String(valB).trim()) {
           return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        // String sorting
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        if (sortConfig.direction === 'asc') return strA.localeCompare(strB);
        return strB.localeCompare(strA);
      });
    } else {
      result.sort((a, b) => a.order - b.order);
    }
    
    return result;
  }, [students, filters, columns, sortConfig]);

  const updateField = (id: string, key: string, val: any) => {
      onUpdate(students.map(s => s.id === id ? { ...s, [key]: val } : s));
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const onHeaderContextMenu = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, colId });
  };

  const insertColumn = (side: 'left' | 'right') => {
      if (!contextMenu) return;
      const index = columns.findIndex(c => c.id === contextMenu.colId);
      const name = prompt("Enter Column Name:", "New Column");
      if (!name) return;
      
      const newCol: ColumnConfig = {
          id: uuidv4(),
          key: `col_${Date.now()}`,
          label: name.toUpperCase(),
          width: 150,
          visible: true,
          type: 'text'
      };

      const newCols = [...columns];
      newCols.splice(side === 'left' ? index : index + 1, 0, newCol);
      onUpdateColumns(newCols);
      setContextMenu(null);
  };

  const deleteColumn = () => {
      if (!contextMenu) return;
      if (confirm("Permanently delete this column and its data?")) {
          onUpdateColumns(columns.filter(c => c.id !== contextMenu.colId));
      }
      setContextMenu(null);
  };

  const renameColumn = () => {
    if (!contextMenu) return;
    const col = columns.find(c => c.id === contextMenu.colId);
    const name = prompt("Rename Column:", col?.label);
    if (name) {
        onUpdateColumns(columns.map(c => c.id === contextMenu.colId ? { ...c, label: name.toUpperCase() } : c));
    }
    setContextMenu(null);
  };

  const onResizeStart = (colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    resizingRef.current = { col: colId, startX: e.clientX, startWidth: col.width };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    onUpdateColumns(columns.map(c => c.id === col ? { ...c, width: Math.max(50, startWidth + diff) } : c));
  };

  const onResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
  };

  const totalWidth = columns.reduce((acc, c) => acc + c.width, 0) + 280;

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

  const filterSelectStyle = "bg-white/[0.05] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-black uppercase text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all cursor-pointer h-9 appearance-none backdrop-blur-[4px]";

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden relative" onClick={() => setContextMenu(null)}>
      {/* Table Header Bar */}
      <div className="h-[64px] border-b border-white/10 flex items-center px-4 gap-4 no-print shrink-0 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <LayoutGrid size={20} />
              </div>
              <div className="hidden sm:block">
                  <h2 className="text-sm font-black text-[#1B254B] uppercase leading-none tracking-tight">Portal Records</h2>
                  <p className="text-[10px] font-bold text-slate-900 uppercase mt-1 tracking-widest">{filteredStudents.length} Results Found</p>
              </div>
          </div>

          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <div className="relative w-48 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Search spreadsheet..." 
                      className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                      value={filters.searchQuery}
                      onChange={e => setFilters?.({...filters, searchQuery: e.target.value})}
                  />
              </div>

              {/* Advanced Header Filters */}
              <div className="flex items-center gap-2 shrink-0 border-l border-slate-100 pl-4">
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <select value={filters.teacher} onChange={e => setFilters?.({...filters, teacher: e.target.value})} className={filterSelectStyle}>
                          <option value="">Teachers</option>
                          {uniqueTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <select value={filters.assistant} onChange={e => setFilters?.({...filters, assistant: e.target.value})} className={filterSelectStyle}>
                          <option value="">Assistants</option>
                          {uniqueAssistants.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <select value={filters.level} onChange={e => setFilters?.({...filters, level: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Levels</option>
                          {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                  </div>
                  <div className="relative group">
                      <LayoutGrid size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <select value={filters.time} onChange={e => setFilters?.({...filters, time: e.target.value})} className={filterSelectStyle}>
                          <option value="">All Times</option>
                          {uniqueTimes.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                      </select>
                  </div>
                  <button onClick={resetFilters} className="p-2.5 bg-white/10 border border-white/20 text-slate-900 hover:text-red-500 hover:border-red-500 rounded-xl transition-all backdrop-blur-md" title="Reset All Filters">
                      <Trash2 size={16} />
                  </button>
                  {role === 'Admin' && (
                    <button 
                      onClick={() => onClearCategory?.(['Hall', 'Class'])} 
                      className="p-2.5 bg-red-50 border border-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all font-black"
                      title="CLEAR ALL HALL STUDY & ATTENDANCE"
                    >
                        <AlertCircle size={16} />
                    </button>
                  )}

                  {/* Action Buttons moved closer to filters */}
                  <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                      <button onClick={onQuickAdd} className="flex items-center gap-2 px-5 py-2 bg-orange-600/80 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/10 hover:scale-105 active:scale-95 transition-all backdrop-blur-md">
                          <Zap size={14} className="fill-white text-white" /> AI QUICK ADD
                      </button>

                      <button onClick={() => onAddStudent?.({ category: 'Hall' })} className="flex items-center gap-2 px-5 py-2 bg-orange-500/80 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/10 hover:bg-orange-600 active:scale-95 transition-all backdrop-blur-md">
                          <Plus size={16} strokeWidth={3}/> ADD STUDENT
                      </button>
                      
                      <button onClick={() => setIsFrozen(!isFrozen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black uppercase text-[9px] transition-all border backdrop-blur-md ${isFrozen ? 'bg-amber-500/80 text-white border-amber-600 shadow-md' : 'bg-white/10 text-slate-900 border-white/20 hover:bg-white/20'}`}>
                        {isFrozen ? <Lock size={12}/> : <Unlock size={12}/>} {isFrozen ? 'FROZEN' : 'FREEZE'}
                      </button>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-auto bg-transparent p-4 custom-scrollbar">
          <div className="h-full bg-white/[0.01] backdrop-blur-[1px] border border-white/5 rounded-2xl shadow-xl overflow-auto relative custom-scrollbar">
              <table className="border-collapse table-fixed bg-transparent" style={{ width: totalWidth, minWidth: '100%' }}>
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/5 h-10 backdrop-blur-[1px]">
                        <th className={`border-r border-white/5 sticky top-0 z-50 bg-white/[0.01] ${isFrozen ? 'left-0 shadow-[1px_0_0_0_rgba(255,255,255,0.05)]' : ''}`} style={{ width: 45, left: isFrozen ? 0 : undefined }}>
                            <button onClick={() => setSelectedIds(selectedIds.size === filteredStudents.length ? new Set() : new Set(filteredStudents.map(s => s.id)))}>
                                {selectedIds.size > 0 ? <CheckSquare size={16} className="text-primary-500 mx-auto" /> : <Square size={16} className="text-slate-900/30 mx-auto" />}
                            </button>
                        </th>
                        <th className={`border-r border-white/5 sticky top-0 z-50 bg-white/[0.02] text-center text-[10px] font-black text-slate-900 ${isFrozen ? 'left-[45px] shadow-[1px_0_0_0_rgba(255,255,255,0.05)]' : ''}`} style={{ width: 40, left: isFrozen ? 45 : undefined }}>#</th>
                        <th className={`px-3 border-r border-white/5 sticky top-0 z-50 bg-white/[0.01] text-slate-900 font-black text-[11px] uppercase tracking-tighter cursor-pointer ${isFrozen ? 'left-[85px] shadow-[1px_0_0_0_rgba(255,255,255,0.05)]' : ''}`} style={{ width: 220, left: isFrozen ? 85 : undefined }}>STUDENT NAME</th>
                        
                        {columns.map((col, idx) => {
                            let stickyLeft = isFrozen && idx === 0 ? 85 + 220 : undefined;
                            const isSorted = sortConfig?.key === col.key;
                            return (
                                <th 
                                    key={col.id} 
                                    onContextMenu={e => onHeaderContextMenu(e, col.id)}
                                    onClick={() => handleSort(col.key)}
                                    className={`px-3 border-r border-white/5 sticky top-0 z-40 bg-white/[0.01] group text-slate-900 font-black text-[11px] uppercase tracking-tighter cursor-pointer select-none transition-colors hover:bg-white/[0.05] backdrop-blur-[1px] ${stickyLeft !== undefined ? 'sticky z-50 shadow-[1px_0_0_0_rgba(255,255,255,0.05)]' : ''}`}
                                    style={{ width: col.width, left: stickyLeft }}
                                >
                                    <div className="flex items-center justify-between">
                                        {col.label}
                                        <ArrowUpDown size={10} className={`${isSorted ? 'opacity-100 text-primary-500' : 'opacity-0 group-hover:opacity-30'} ml-1 shrink-0 transition-opacity`} />
                                    </div>
                                    <div onMouseDown={e => { e.stopPropagation(); onResizeStart(col.id, e); }} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-400 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                                </th>
                            );
                        })}
                        <th className="px-3 border-r border-white/5 sticky top-0 z-30 bg-white/[0.01] text-slate-900 font-black text-[10px] uppercase tracking-tighter backdrop-blur-[1px]" style={{ width: 60 }}>CONTACT</th>
                        <th className="px-3 border-r border-white/5 sticky top-0 z-30 bg-white/[0.01] text-slate-900 font-black text-[10px] uppercase tracking-tighter backdrop-blur-[1px]" style={{ width: 60 }}>HEAD T.</th>
                        <th className="px-3 border-r border-white/5 sticky top-0 z-30 bg-white/[0.01] text-slate-900 font-black text-[10px] uppercase tracking-tighter backdrop-blur-[1px]" style={{ width: 80 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {filteredStudents.map((s, i) => {
                          const deadlineDue = isDeadlineDue(String(s.deadline || ''));
                          
                          // Priorities: Head Teacher (Soft Red) > Deadline (Soft Orange) > Assistant Palette
                          let rowBg = getAssistantBgColor(s.assistant || '');
                          let textColor = '#0f172a';
                          
                          if (deadlineDue) {
                              rowBg = 'rgba(255, 237, 213, 0.4)'; // Orange (Orange 100)
                              textColor = '#c2410c'; // High contrast dark orange text
                          }
                          
                          if (s.headTeacher) {
                              rowBg = 'rgba(254, 226, 226, 0.4)'; // Red (Red 100)
                              textColor = '#b91c1c'; // High contrast dark red text
                          }

                          if (s.isHidden) {
                              rowBg = 'rgba(248, 250, 252, 0.4)';
                              textColor = '#475569';
                          }

                          return (
                            <tr key={s.id} className={`h-9 transition-all hover:brightness-95`} style={{ backgroundColor: rowBg, color: textColor }}>
                                <td className={`text-center border-r border-white/5 ${isFrozen ? 'sticky left-0 z-20 shadow-[1px_0_0_0_rgba(255,255,255,0.05)]' : ''}`} style={{ left: isFrozen ? 0 : undefined, backgroundColor: rowBg }}>
                                    <button onClick={() => { const ns = new Set(selectedIds); ns.has(s.id) ? ns.delete(s.id) : ns.add(s.id); setSelectedIds(ns); }}>
                                      {selectedIds.has(s.id) ? <CheckSquare size={14} className="text-primary-600" /> : <Square size={14} className="text-slate-400/30" />}
                                    </button>
                                </td>
                                <td className={`text-center text-[10px] font-black border-r border-slate-200/30 ${isFrozen ? 'sticky left-[45px] z-20 shadow-[1px_0_0_0_#cbd5e1]' : ''}`} style={{ left: isFrozen ? 45 : undefined, backgroundColor: rowBg, color: '#94a3b8' }}>{i + 1}</td>
                                <td className={`px-0 border-r border-slate-200/30 ${isFrozen ? 'sticky left-[85px] z-20 shadow-[1px_0_0_0_#cbd5e1]' : ''}`} style={{ left: isFrozen ? 85 : undefined, backgroundColor: rowBg }}>
                                    <MultilineInput value={s.name} onChange={val => updateField(s.id, 'name', val)} className="w-full bg-transparent outline-none focus:bg-white/40 text-[11px] font-black tracking-tight px-3 py-1 scrollbar-none" style={{ color: textColor }} />
                                </td>
                                
                                {columns.map((col, idx) => {
                                    return (
                                      <td 
                                          key={col.id} 
                                          className={`p-0 border-r border-slate-200/20`}
                                          style={{ backgroundColor: rowBg }}
                                      >
                                          <MultilineInput 
                                              value={String(s[col.key] || '')} 
                                              onChange={val => updateField(s.id, col.key, val)} 
                                              className="w-full bg-transparent outline-none focus:bg-white/40 text-[11px] font-black tracking-tight transition-colors px-3 py-1 scrollbar-none"
                                              style={{ color: textColor }}
                                          />
                                      </td>
                                    );
                                })}

                                <td className="text-center border-r border-slate-200/20">
                                    <button onClick={() => updateField(s.id, 'parentContact', !s.parentContact)} className="w-full h-full flex items-center justify-center transition-colors hover:bg-white/20">
                                        {s.parentContact ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-slate-300/40" />}
                                    </button>
                                </td>
                                <td className="text-center border-r border-slate-200/20">
                                    <button onClick={() => updateField(s.id, 'headTeacher', !s.headTeacher)} className="w-full h-full flex items-center justify-center transition-colors hover:bg-white/20">
                                        {s.headTeacher ? <CheckSquare size={18} className="text-red-500" /> : <Square size={18} className="text-slate-300/40" />}
                                    </button>
                                </td>

                                <td className="px-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => updateField(s.id, 'isHidden', !s.isHidden)} className={`p-1.5 rounded-lg transition-all ${s.isHidden ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600'}`}>
                                            {s.isHidden ? <Eye size={16}/> : <EyeOff size={16}/>}
                                        </button>
                                        <button onClick={() => confirm('Delete record?') && onUpdate(students.filter(st => st.id !== s.id))} className={`p-1.5 transition-all text-red-200 hover:text-red-500`}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Excel Context Menu */}
      {contextMenu && (
          <div 
            className="fixed bg-white border border-slate-200 shadow-2xl rounded-xl p-1 w-52 z-[100] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
          >
              <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                      <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input placeholder="Search menus" className="w-full text-[10px] pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none" />
                  </div>
              </div>
              
              <button className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                  <MinusCircle size={14} className="text-emerald-500" /> Cut <span className="ml-auto text-slate-300">Ctrl+X</span>
              </button>
              <button className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-100">
                  <LayoutGrid size={14} className="text-slate-500" /> Copy <span className="ml-auto text-slate-300">Ctrl+C</span>
              </button>

              <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Spreadsheet Actions</div>
              
              <button onClick={() => insertColumn('left')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                  <PlusCircle size={14} className="text-emerald-500" /> Insert Column Left
              </button>
              <button onClick={() => insertColumn('right')} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                  <PlusCircle size={14} className="text-emerald-500" /> Insert Column Right
              </button>
              <button onClick={renameColumn} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                  <Type size={14} className="text-indigo-500" /> Rename Column
              </button>
              <button onClick={deleteColumn} className="w-full text-left px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                  <MinusCircle size={14} /> Delete Column
              </button>
          </div>
      )}
    </div>
  );
};