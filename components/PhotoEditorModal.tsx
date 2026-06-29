import React, { useState } from 'react';
import { Student, PhotoAdjust } from '../types';
import { X, Save, RotateCcw, ZoomIn, Move } from 'lucide-react';

interface Props {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Student>) => void;
}

export const PhotoEditorModal: React.FC<Props> = ({ student, isOpen, onClose, onSave }) => {
  const [adjust, setAdjust] = useState<PhotoAdjust>(student.photoAdjust || { x: 0, y: 0, scale: 1 });
  const [gender, setGender] = useState(student.gender || 'Male');
  const [dob, setDob] = useState(student.dob || '');
  const [name, setName] = useState(student.name || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-[#1B254B] p-6 text-white flex justify-between items-center">
            <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Edit Student Card</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase mt-1">Adjust Photo & Basic Info</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
            <div className="flex gap-8">
                {/* Preview */}
                <div className="w-36 h-44 bg-slate-100 border-2 border-slate-200 rounded overflow-hidden relative">
                    {student.photo ? (
                        <img 
                            src={student.photo} 
                            className="absolute"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transform: `scale(${adjust.scale}) translate(${adjust.x}px, ${adjust.y}px)`
                            }}
                            alt="Student preview"
                        />
                    ) : <div className="w-full h-full flex items-center justify-center text-slate-300">No Photo</div>}
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Full Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Gender</label>
                            <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Date of Birth</label>
                            <input value={dob} onChange={e => setDob(e.target.value)} placeholder="May 26, 2024" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4">
                    <ZoomIn size={16} className="text-slate-400" />
                    <input type="range" min="0.5" max="3" step="0.01" value={adjust.scale} onChange={e => setAdjust({...adjust, scale: parseFloat(e.target.value)})} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500" />
                    <span className="text-xs font-bold text-slate-600 w-12">{Math.round(adjust.scale * 100)}%</span>
                </div>
                <div className="flex items-center gap-4">
                    <Move size={16} className="text-slate-400" />
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-400 w-8">X Axis</span>
                             <input type="range" min="-100" max="100" value={adjust.x} onChange={e => setAdjust({...adjust, x: parseInt(e.target.value)})} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black text-slate-400 w-8">Y Axis</span>
                             <input type="range" min="-100" max="100" value={adjust.y} onChange={e => setAdjust({...adjust, y: parseInt(e.target.value)})} className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-slate-50 p-6 flex justify-between gap-3">
            <button onClick={() => setAdjust({x:0, y:0, scale: 1})} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 uppercase tracking-widest"><RotateCcw size={14}/> Reset View</button>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-2 text-slate-500 hover:bg-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={() => onSave({ photoAdjust: adjust, name, gender, dob })} className="px-8 py-2 bg-primary-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-500/30 flex items-center gap-2"><Save size={16}/> Apply Changes</button>
            </div>
        </div>
      </div>
    </div>
  );
};