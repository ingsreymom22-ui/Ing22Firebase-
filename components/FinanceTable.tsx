import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, AppData, StudyType } from '../types';
import { Search, ChevronLeft, ChevronRight, AlertCircle, Trash2, Lock } from 'lucide-react';
import { format } from 'date-fns';

const MultilineInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  readOnly?: boolean;
}> = ({ value, onChange, className, style, placeholder, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(36, scrollHeight) + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      readOnly={readOnly}
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

interface Props {
  students: Student[];
  data: AppData; 
  onUpdate: (newData: AppData) => void; 
  onQuickAdd: (defaults: Partial<Student>) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
  isLocked?: boolean;
}

const MONTHS = [
  { key: '01', label: 'JAN' }, { key: '02', label: 'FEB' }, { key: '03', label: 'MAR' },
  { key: '04', label: 'APR' }, { key: '05', label: 'MAY' }, { key: '06', label: 'JUN' },
  { key: '07', label: 'JUL' }, { key: '08', label: 'AUG' }, { key: '09', label: 'SEP' },
  { key: '10', label: 'OCT' }, { key: '11', label: 'NOV' }, { key: '12', label: 'DEC' },
];

const DEFAULT_WIDTHS = {
  no: 48, id: 128, name: 208, fee: 112, months: 64, act: 80
};

export const FinanceTable: React.FC<Props> = ({ students, data, onUpdate, onQuickAdd, onAddStudent, isLocked = false }) => {
  const [activeTab, setActiveTab] = useState<StudyType>('PartTime');
  const [selectedClass] = useState<string>('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyDue] = useState<boolean>(false);
  const [focusedCell, setFocusedCell] = useState<{ id: string; field: string } | null>(null);
  
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('dps_finance_widths');
    return saved ? JSON.parse(saved) : DEFAULT_WIDTHS;
  });

  useEffect(() => {
    localStorage.setItem('dps_finance_widths', JSON.stringify(widths));
  }, [widths]);

  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const onResizeStart = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { col, startX: e.clientX, startWidth: widths[col] || (DEFAULT_WIDTHS as any)[col] || 64 };
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    document.body.style.cursor = 'col-resize';
  };

  const onResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    setWidths(prev => ({ ...prev, [col]: Math.max(40, startWidth + diff) }));
  };

  const onResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    document.body.style.cursor = 'default';
  };

  const currentMonthKey = format(new Date(), 'MM');
  const currentPaymentKey = `${year}-${currentMonthKey}`;
  const todayDay = new Date().getDate();

  const isStudentDue = (s: Student) => {
      if (s.isHidden) return false;
      const status = s.payments?.[currentPaymentKey];
      const isPaid = status && (status.toLowerCase() === 'paid' || status === '16' || (!isNaN(Number(status)) && status !== ''));
      if (isPaid || status === 'ST' || status === 'SUS') return false;
      const startDay = parseInt((s.startDate || '').split('-')[0]); 
      return !isNaN(startDay) && todayDay >= startDay;
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = !query || 
        s.name.toLowerCase().includes(query) || 
        (s.displayId && s.displayId.toLowerCase().includes(query)) ||
        (s.assistant && s.assistant.toLowerCase().includes(query)) ||
        (s.teachers && s.teachers.toLowerCase().includes(query));

      return s.category === 'Office' &&
        (s.studyType || 'PartTime') === activeTab && 
        (!selectedClass || s.className === selectedClass) && 
        matchesSearch && 
        (showOnlyDue ? isStudentDue(s) : true);
    }).sort((a, b) => a.order - b.order);
  }, [students, activeTab, selectedClass, searchTerm, showOnlyDue, year]);

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

  const handleUpdate = (newStudents: Student[]) => {
      if (isLocked) return;
      onUpdate({ ...data, students: newStudents });
  };

  const renderInputCell = (s: Student, field: string, className: string, isPayment: boolean = false, paymentKey?: string, stickyLeft?: number) => {
    const val = isPayment ? (s.payments?.[paymentKey!] || '') : (s[field as keyof Student] as string);
    const fmt = s.formatting?.[field];

    return (
        <td 
            key={field}
            className={`p-0 border-r border-white/5 relative group/cell ${stickyLeft !== undefined ? 'sticky z-30' : ''}`} 
            style={{ left: stickyLeft }}
        >
            <MultilineInput 
                className={`w-full px-3 py-2 bg-transparent outline-none focus:bg-white/20 text-xs text-slate-900 ${isLocked ? 'cursor-not-allowed opacity-80' : ''} ${className}`} 
                value={val} 
                readOnly={isLocked}
                style={{ fontWeight: fmt?.bold ? '900' : 'inherit', fontStyle: fmt?.italic ? 'italic' : 'normal' }}
                onChange={val => {
                    if (isPayment) {
                        const pmts = { ...(s.payments || {}), [paymentKey!]: val };
                        handleUpdate(students.map(st => st.id === s.id ? { ...st, payments: pmts } : st));
                    } else {
                        handleUpdate(students.map(st => st.id === s.id ? { ...st, [field]: val } : st));
                    }
                }}
            />
        </td>
    );
  };

  const Th = ({ label, colId, width, stickyLeft, align = 'left' }: { label: string, colId: string, width: number, stickyLeft?: number, align?: string }) => (
    <th className={`p-3 bg-white/5 border-r border-white/5 text-[10px] font-black uppercase text-slate-900 relative group backdrop-blur-md ${stickyLeft !== undefined ? 'sticky z-50' : ''}`} style={{ width, left: stickyLeft }}>
      <div className={`flex items-center ${align === 'center' ? 'justify-center' : 'justify-start'}`}>{label}</div>
      <div onMouseDown={e => onResizeStart(colId, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
    </th>
  );

  return (
    <div className={`flex flex-col h-full rounded-[40px] shadow-2xl shadow-indigo-900/10 border border-white/5 overflow-hidden relative ${isLocked ? 'bg-white/[0.01] backdrop-blur-[1px] grayscale-[0.3]' : 'bg-white/[0.01] backdrop-blur-[1px]'}`}>
      <div className={`p-4 border-b border-white/5 flex-none backdrop-blur-[1px] ${isLocked ? 'bg-white/[0.01]' : 'bg-white/[0.01]'}`}>
        <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-4">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${isLocked ? 'bg-red-500/80' : 'bg-orange-500/80'}`}>
                    {isLocked ? <Lock size={20} /> : <AlertCircle size={20} />}
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase leading-none">Finance Module {isLocked && <span className="text-red-500 ml-2">(Locked)</span>}</h3>
                    <p className="text-[10px] font-black text-slate-700 uppercase mt-1 tracking-widest">Status: {isLocked ? 'Read-Only' : 'Active'}</p>
                 </div>
             </div>
             <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-2 py-1 shadow-sm backdrop-blur-[2px]">
                 <button onClick={() => setYear(y => y - 1)} className="p-1.5 text-slate-600 hover:text-slate-900"><ChevronLeft size={14}/></button>
                 <span className="font-black text-slate-900 mx-2 text-sm">{year}</span>
                 <button onClick={() => setYear(y => y + 1)} className="p-1.5 text-slate-600 hover:text-slate-900"><ChevronRight size={14}/></button>
             </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['PartTime', 'FullTime', 'Khmer'].map(type => (
                <button key={type} onClick={() => setActiveTab(type as StudyType)} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === type ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-white/40'}`}>{type}</button>
            ))}
        </div>
      </div>

      <div className="p-3 bg-white/[0.01] border-b border-white/5 flex items-center justify-between gap-4 backdrop-blur-[1px]">
          <div className="relative flex-1 max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
             <input placeholder="Find student..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm outline-none font-black text-slate-900 placeholder:text-slate-500" />
          </div>
          <div className="flex items-center gap-2">
              <button disabled={isLocked} onClick={() => onQuickAdd({ studyType: activeTab, className: selectedClass, category: 'Office' })} className="px-5 py-2 bg-orange-600/90 text-white rounded-xl text-xs font-black uppercase shadow-lg disabled:opacity-30 backdrop-blur-[2px]">AI Add</button>
              <button disabled={isLocked} onClick={() => onAddStudent({ studyType: activeTab, className: selectedClass, category: 'Office' })} className="px-5 py-2 bg-orange-500/90 text-white rounded-xl text-xs font-black uppercase shadow-lg disabled:opacity-30 backdrop-blur-[2px]">Add Record</button>
          </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar bg-transparent">
        <table className="w-full border-collapse relative bg-transparent min-w-max table-fixed">
          <thead className="sticky top-0 z-40 bg-white/[0.01] shadow-sm border-b border-white/5 backdrop-blur-[1px]">
            <tr className="bg-transparent">
              <Th label="#" colId="no" width={widths['no'] || DEFAULT_WIDTHS.no} stickyLeft={0} align="center" />
              <Th label="ID NUMBER" colId="id" width={widths['id'] || DEFAULT_WIDTHS.id} stickyLeft={widths['no'] || DEFAULT_WIDTHS.no} />
              <Th label="NAME" colId="name" width={widths['name'] || DEFAULT_WIDTHS.name} stickyLeft={(widths['no'] || DEFAULT_WIDTHS.no) + (widths['id'] || DEFAULT_WIDTHS.id)} />
              <Th label="TUITION FEE" colId="fee" width={widths['fee'] || DEFAULT_WIDTHS.fee} align="center" />
              {MONTHS.map(m => (
                <React.Fragment key={m.key}>
                  <Th label={m.label} colId="months" width={widths['months'] || DEFAULT_WIDTHS.months} align="center" />
                </React.Fragment>
              ))}
              <th className="p-3 text-center w-20 sticky right-0 bg-white/[0.02] z-40 uppercase text-[10px] font-black text-slate-900 border-l border-white/5 backdrop-blur-[1px]">ACT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
             {filteredStudents.map((s, i) => {
               const noWidth = widths['no'] || DEFAULT_WIDTHS.no;
               const idWidth = widths['id'] || DEFAULT_WIDTHS.id;
                return (
               <tr key={s.id} className={`hover:bg-white/20 group transition-colors ${getRowBg(i)}`}>
                 <td className="p-2 text-center text-slate-500 sticky left-0 bg-transparent text-[10px] border-r border-white/5 font-black" style={{ width: noWidth }}>{i + 1}</td>
                 {renderInputCell(s, 'displayId', 'font-black text-slate-900 border-r border-white/5', false, undefined, noWidth)}
                 {renderInputCell(s, 'name', 'font-black text-slate-900 border-r border-white/5', false, undefined, noWidth + idWidth)}
                 {renderInputCell(s, 'schoolFee', 'font-black text-emerald-700 text-center')}
                 {MONTHS.map(m => renderInputCell(s, `${year}-${m.key}`, `text-center font-black ${s.payments?.[`${year}-${m.key}`]?.toLowerCase() === 'paid' ? 'text-green-800' : 'text-emerald-800'}`, true, `${year}-${m.key}`))}
                 <td className="p-1 text-center sticky right-0 bg-white/[0.02] backdrop-blur-[1px] border-l border-white/5">
                    <button disabled={isLocked} onClick={() => { if (confirm('Permanently delete record?')) handleUpdate(students.filter(st => st.id !== s.id)); }} className="p-2 text-slate-500 hover:text-red-500 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"><Trash2 size={16}/></button>
                 </td>
               </tr>
             )})}
          </tbody>
        </table>
      </div>
    </div>
  );
};