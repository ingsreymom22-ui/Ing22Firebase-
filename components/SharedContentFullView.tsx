import React, { useState } from 'react';
import { format } from 'date-fns';
import { GraduationCap, Import, ShieldCheck, AlignLeft, Calendar, FileText, ChevronRight, Download, Eye, ExternalLink } from 'lucide-react';

interface SharedContentFullViewProps {
  data: any;
  onImport: (date?: string) => void;
  onClose: () => void;
}

export const SharedContentFullView: React.FC<SharedContentFullViewProps> = ({ data, onImport, onClose }) => {
  const [importingDate, setImportingDate] = useState(() => new Date().toISOString().split('T')[0]);

  const renderSelfLearningNode = (node: any, depth = 0) => {
    return (
      <div key={node.id} className={`pl-${depth > 0 ? 6 : 0} mt-4`}>
        <div className={`p-4 rounded-2xl ${depth === 0 ? 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800' : 'bg-transparent border-l-2 border-slate-200 dark:border-slate-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            {depth > 0 && <ChevronRight size={14} className="text-slate-400" />}
            <h4 className={`font-black ${depth === 0 ? 'text-xl' : 'text-md'} text-slate-800 dark:text-slate-100`}>
              {node.title}
            </h4>
          </div>
          {node.content && (
            <div className="mt-3 prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm" dangerouslySetInnerHTML={{ __html: node.content }} />
          )}
        </div>
        {node.children && node.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {node.children.map((child: any) => renderSelfLearningNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col items-center">
      <div className="w-full bg-slate-900 dark:bg-black text-white p-4 max-w-4xl mx-auto rounded-b-[32px] shadow-2xl flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 pl-4">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase">Shared Content</h1>
            <p className="text-[10px] text-slate-400">from {data.ownerName || 'Unknown user'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
          >
            Go to my Homepage
          </button>
          <button
            onClick={() => onImport(importingDate)}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <Import size={16} /> Import to Portal
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex-1 mt-6 animate-fade-in">
        {data.type === 'self-learning' && (
           <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-wider mb-6">
                 <FileText size={12} /> Self-Learning Topic
              </div>
              {renderSelfLearningNode(data.payload)}
           </div>
        )}

        {data.type === 'daily-note' && (
           <div className="mb-12 max-w-2xl mx-auto mt-12 bg-slate-50 dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider mb-6">
                <AlignLeft size={12} /> Daily Note
             </div>
             <h2 className="text-2xl font-black mb-6">{data.title}</h2>
             <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: data.payload.content || data.payload }} />
             
             <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 flex items-center gap-2">
                   <Calendar size={12} /> Import As:
                </div>
                <input 
                  type="date"
                  value={importingDate}
                  onChange={(e) => setImportingDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-xs font-bold outline-none"
                />
             </div>
           </div>
        )}

        {data.type === 'journal' && (
          <div className="mb-12 max-w-2xl mx-auto mt-12 bg-slate-50 dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider mb-2">
                <Calendar size={12} /> Daily Journal Entry
            </div>
            <h2 className="text-2xl font-black">{data.title}</h2>
            
            {data.payload.achievements && data.payload.achievements.length > 0 && (
              <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Achievements</h3>
                <ul className="space-y-3">
                  {data.payload.achievements.map((ach: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <ShieldCheck size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <span dangerouslySetInnerHTML={{ __html: ach }} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.payload.gratitude && (
              <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Gratitude</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{data.payload.gratitude}"</p>
              </div>
            )}
            
            {data.payload.affirmation && (
              <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Affirmation</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-bold">"{data.payload.affirmation}"</p>
              </div>
            )}

             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 flex items-center gap-2">
                   <Calendar size={12} /> Import As:
                </div>
                <input 
                  type="date"
                  value={importingDate}
                  onChange={(e) => setImportingDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-xs font-bold outline-none"
                />
             </div>
          </div>
        )}
      </div>
      
      <div className="w-full bg-slate-100 dark:bg-slate-900/50 py-12 mt-auto border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Peak Performance Growth Portal</p>
        <p className="text-[10px] uppercase font-bold text-slate-500 mt-2">Design your systems. Empower your growth.</p>
      </div>
    </div>
  );
};
