import React from 'react';
import { Trash2, RotateCcw, Search, Clock, ShieldAlert } from 'lucide-react';
import { AppData, Student, Tab } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onPermanentDeleteStudent?: (id: string) => void;
  onPermanentDeleteTopic?: (id: string, category: 'dpss' | 'selfLearning') => void;
}

export const RecycleBin: React.FC<Props> = ({ 
  data, 
  onUpdate,
  onPermanentDeleteStudent,
  onPermanentDeleteTopic
}) => {
  const [search, setSearch] = React.useState('');

  const deletedItems = React.useMemo(() => {
    const items: any[] = [];
    
    // Students/Reminders/Tasks
    data.students.filter(s => s.deletedAt).forEach(s => items.push({ ...s, type: 'Student' }));
    
    const findDeletedTopics = (topics: any[], type: string) => {
      topics.forEach(t => {
        if (t.deletedAt) items.push({ ...t, type });
        if (t.children) findDeletedTopics(t.children, type);
      });
    };
    
    findDeletedTopics(data.dpssTopics || [], 'DPSS');
    findDeletedTopics(data.selfLearningTopics || [], 'SelfLearning');
    
    return items.sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
  }, [data.students, data.dpssTopics, data.selfLearningTopics]);

  const filtered = deletedItems.filter(s => 
    (s.name || s.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.category || s.type).toLowerCase().includes(search.toLowerCase())
  );

  const handleRestore = (id: string, type: string) => {
    if (type === 'Student') {
      const newStudents = data.students.map(s => {
        if (String(s.id) === String(id)) {
          const { deletedAt, ...rest } = s;
          return rest;
        }
        return s;
      });
      onUpdate({ ...data, students: newStudents as Student[] });
    } else {
      const field = type === 'DPSS' ? 'dpssTopics' : 'selfLearningTopics';
      const restoreInTopics = (items: any[]): any[] => {
        return items.map(item => {
          if (String(item.id) === String(id)) {
            const { deletedAt, ...rest } = item;
            return rest;
          }
          if (item.children) return { ...item, children: restoreInTopics(item.children) };
          return item;
        });
      };
      onUpdate({ ...data, [field]: restoreInTopics(data[field as keyof AppData] as any[]) });
    }
  };

  const handlePermanentDelete = (id: string, type: string) => {
    if (window.confirm(`This will permanently delete this ${type} item. Continue?`)) {
      if (type === 'Student' && onPermanentDeleteStudent) {
        onPermanentDeleteStudent(id);
      } else if ((type === 'DPSS' || type === 'SelfLearning') && onPermanentDeleteTopic) {
        onPermanentDeleteTopic(id, type === 'DPSS' ? 'dpss' : 'selfLearning');
      } else {
        // Fallback for standalone mode
        if (type === 'Student') {
          onUpdate({ ...data, students: data.students.filter(s => String(s.id) !== String(id)) });
        } else {
          const field = type === 'DPSS' ? 'dpssTopics' : 'selfLearningTopics';
          const deleteFromTopics = (items: any[]): any[] => {
            return items.filter(item => String(item.id) !== String(id)).map(item => ({
              ...item,
              children: item.children ? deleteFromTopics(item.children) : undefined
            }));
          };
          onUpdate({ ...data, [field]: deleteFromTopics(data[field as keyof AppData] as any[]) });
        }
      }
    }
  };

  const handleRestoreAll = () => {
    if (window.confirm(`Restore all ${deletedItems.length} items?`)) {
      let newData = { ...data };
      
      // Restore Students
      newData.students = (data.students || []).map(s => {
        if (s.deletedAt) {
          const { deletedAt, ...rest } = s;
          return rest as Student;
        }
        return s;
      });
      
      const restoreAllInTopics = (items: any[]): any[] => {
        return items.map(item => {
          let newItem = { ...item };
          if (newItem.deletedAt) delete newItem.deletedAt;
          if (newItem.children) newItem.children = restoreAllInTopics(newItem.children);
          return newItem;
        });
      };
      
      newData.dpssTopics = restoreAllInTopics(data.dpssTopics || []);
      newData.selfLearningTopics = restoreAllInTopics(data.selfLearningTopics || []);
      
      onUpdate(newData);
    }
  };

  const handleEmptyBin = () => {
    if (window.confirm('PERMANENTLY delete ALL items in the recycle bin? This cannot be undone.')) {
      if (onPermanentDeleteStudent || onPermanentDeleteTopic) {
        // Use granular deletes if available
        deletedItems.forEach(item => {
          if (item.type === 'Student' && onPermanentDeleteStudent) {
            onPermanentDeleteStudent(item.id);
          } else if ((item.type === 'DPSS' || item.type === 'SelfLearning') && onPermanentDeleteTopic) {
            onPermanentDeleteTopic(item.id, item.type === 'DPSS' ? 'dpss' : 'selfLearning');
          }
        });
      }

      let newData = { ...data };
      newData.students = data.students.filter(s => !s.deletedAt);
      
      const permanentDeleteTopics = (items: any[]): any[] => {
        return items.filter(item => !item.deletedAt).map(item => ({
          ...item,
          children: item.children ? permanentDeleteTopics(item.children) : undefined
        }));
      };
      
      newData.dpssTopics = permanentDeleteTopics(data.dpssTopics || []);
      newData.selfLearningTopics = permanentDeleteTopics(data.selfLearningTopics || []);
      
      onUpdate(newData);
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    try {
      const date = parseISO(deletedAt);
      const diff = 30 - differenceInDays(new Date(), date);
      return Math.max(0, diff);
    } catch {
      return 0;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
      <div className="p-8 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
               <Trash2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recycle Bin</h1>
              <p className="text-slate-500 text-sm font-medium">Deleted items are kept for 30 days before being removed permanently.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
             {deletedItems.length > 0 && (
               <>
                 <button 
                   onClick={handleRestoreAll}
                   className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                 >
                   <RotateCcw size={16} /> Restore All
                 </button>
                 <button 
                   onClick={handleEmptyBin}
                   className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                 >
                   <ShieldAlert size={16} /> Empty Bin
                 </button>
               </>
             )}
          </div>
        </div>

        <div className="relative max-w-xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
             type="text"
             placeholder="Search deleted items..."
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
           />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
         {filtered.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <Trash2 size={64} className="mb-4 stroke-[1px]" />
              <p className="font-black uppercase tracking-widest text-sm">No items found in Recycle Bin</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4">
                      <div className="flex items-center gap-1 text-slate-400 font-black text-[10px] uppercase tracking-tighter">
                         <Clock size={12} /> {getDaysRemaining(s.deletedAt!)} Days Left
                      </div>
                   </div>
                   
                   <div className="mb-4 flex items-center justify-between">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                        {s.category || s.type}
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {s.type === 'Student' ? 'Entity' : 'Note/Topic'}
                      </span>
                   </div>
                   
                   <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">{s.name || s.title || 'Untitled'}</h3>
                   <p className="text-slate-400 text-xs font-bold mb-6">Deleted on {format(parseISO(s.deletedAt!), 'MMM dd, yyyy HH:mm')}</p>
                   
                   <div className="flex gap-2">
                       <button 
                         onClick={() => handleRestore(s.id, s.type)}
                         className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                       >
                         <RotateCcw size={14} /> Restore
                       </button>
                       <button 
                         onClick={() => handlePermanentDelete(s.id, s.type)}
                         className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100"
                       >
                         <Trash2 size={18} />
                       </button>
                   </div>
                   
                   {/* Progress bar for auto-deletion */}
                   <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                      <div 
                        className="h-full bg-indigo-500 opacity-30 transition-all" 
                        style={{ width: `${(getDaysRemaining(s.deletedAt!) / 30) * 100}%` }}
                      ></div>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
};
