import React, { useState, useMemo, useEffect } from 'react';
import { Student, AppData, StudentCategory } from '../types';
import { 
  Plus, Trash2, Camera, Zap, Settings, 
  Sliders, RefreshCw, Upload, ImageIcon, Printer, ClipboardList, LayoutGrid
} from 'lucide-react';
import { PhotoEditorModal } from './PhotoEditorModal';

interface Props {
  students: Student[];
  data: AppData;
  onUpdate: (data: AppData) => void;
  onQuickAdd: (defaults: Partial<Student>) => void;
  onAddStudent: (defaults: Partial<Student>) => void;
}

type SubTab = 'Batch' | 'Queue' | 'Form' | 'Settings';

export const CardGenerator: React.FC<Props> = ({ students, data, onUpdate, onAddStudent }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('Batch');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [idCounters, setIdCounters] = useState(data.idCounters || { FullTime: 2021, PartTime: 2000 });

  // Sync local sequence state with global data if it changes externally
  useEffect(() => {
    if (data.idCounters) {
      setIdCounters(data.idCounters);
    }
  }, [data.idCounters]);

  const cardStudents = useMemo(() => {
    return students.filter(s => s.category === 'Card')
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [students, searchTerm]);

  const queueStudents = useMemo(() => {
    return students.filter(s => s.category === 'Queue');
  }, [students]);

  const updateStudentData = (newStudents: Student[]) => {
      onUpdate({ ...data, students: newStudents });
  };

  const approveSubmission = (s: Student) => {
      const type = s.studyType || 'PartTime';
      const currentCounters = data.idCounters || { FullTime: 2021, PartTime: 2000 };
      const count = currentCounters[type];
      const displayId = `DPSS-${type === 'FullTime' ? 'FT' : 'PT'}${String(count).padStart(4, '0')}`;
      
      const updatedStudents = students.map(st => st.id === s.id ? { 
          ...st, 
          category: 'Card' as StudentCategory, 
          displayId 
      } : st);
      
      const newCounters = { ...currentCounters, [type]: count + 1 };
      onUpdate({ ...data, students: updatedStudents, idCounters: newCounters });
  };

  const handleExportAll = () => {
    if (cardStudents.length === 0) {
      alert("No cards available to export.");
      return;
    }
    window.print();
  };

  const handleFormSubmit = (formData: Partial<Student>) => {
      onAddStudent({
          ...formData,
          category: 'Queue',
          order: students.length
      });
      alert("Application Submitted Successfully!");
      setActiveSubTab('Queue');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({ ...data, schoolLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSequence = () => {
      onUpdate({ ...data, idCounters });
      alert('Sequence settings saved successfully!');
  };

  const renderBatchGenerator = () => (
    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 custom-scrollbar justify-items-center bg-slate-50/50 id-print-area">
        {cardStudents.length === 0 ? (
            <div className="col-span-full h-96 flex flex-col items-center justify-center text-slate-400 no-print">
                <LayoutGrid size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-center">No cards ready for export.<br/><span className="text-xs font-normal">Go to "Queue" to approve submissions.</span></p>
            </div>
        ) : cardStudents.map((s) => (
            <div key={s.id} className="group relative print-card-wrapper">
                <div className="scale-[0.85] origin-top print:scale-100 print:origin-center">
                    <StudentIdCard student={s} logo={data.schoolLogo} />
                </div>
                <div className="absolute top-4 right-[-40px] flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                    <button onClick={() => setEditingStudent(s)} className="p-2.5 bg-white rounded-full shadow-lg text-slate-600 hover:text-primary-500 transition-all border border-slate-100" title="Edit Card"><Sliders size={20} /></button>
                    <button onClick={() => { if(confirm('Delete card?')) updateStudentData(students.filter(st => st.id !== s.id)); }} className="p-2.5 bg-white rounded-full shadow-lg text-slate-600 hover:text-red-500 transition-all border border-slate-100" title="Delete Card"><Trash2 size={20} /></button>
                </div>
            </div>
        ))}
    </div>
  );

  const renderQueue = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-[#1B254B] uppercase">Submission Queue</h3>
            <p className="text-xs font-bold text-slate-400 uppercase">Review and approve student ID applications</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
             <span className="text-xs font-black text-slate-400 uppercase mr-2">Pending:</span>
             <span className="text-sm font-black text-[#1B254B]">{queueStudents.length} Students</span>
          </div>
        </div>

        {queueStudents.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400">
             <RefreshCw size={48} className="mb-4 opacity-20" />
             <p className="font-bold">Queue is empty</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {queueStudents.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between hover:border-primary-300 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                    {s.photo ? (
                      <img src={s.photo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-[#1B254B] uppercase">{s.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase">{s.studyType}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">DOB: {s.dob || 'N/A'}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Gender: {s.gender}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { if(confirm('Remove from queue?')) updateStudentData(students.filter(st => st.id !== s.id)); }}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Reject"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => approveSubmission(s)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    <Zap size={14} /> Approve & Generate ID
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-12 max-w-2xl mx-auto space-y-12 flex-1 overflow-y-auto custom-scrollbar">
        <div>
            <h3 className="text-2xl font-black text-[#1B254B] uppercase mb-1">Card Studio Settings</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Configurations</p>
        </div>

        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-8">
            <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Global School Logo</label>
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                        {data.schoolLogo ? (
                            <img src={data.schoolLogo} className="w-full h-full object-contain" />
                        ) : (
                            <ImageIcon size={32} className="text-slate-300" />
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Upload size={20} className="text-white" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">Logo Upload</p>
                        <p className="text-xs text-slate-400 mt-1">This logo will be applied to all ID cards. High resolution PNG/SVG recommended.</p>
                        {data.schoolLogo && (
                             <button onClick={() => onUpdate({ ...data, schoolLogo: undefined })} className="mt-3 text-xs font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-600">
                                <Trash2 size={12} /> Remove Logo
                             </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
                <label className="block text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Next ID Sequence</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Full-Time Start</span>
                        <input 
                            type="number" 
                            className="bg-transparent font-black text-xl text-[#1B254B] outline-none" 
                            value={idCounters.FullTime}
                            onChange={e => setIdCounters({...idCounters, FullTime: parseInt(e.target.value) || 0})}
                        />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Part-Time Start</span>
                        <input 
                            type="number" 
                            className="bg-transparent font-black text-xl text-[#1B254B] outline-none" 
                            value={idCounters.PartTime}
                            onChange={e => setIdCounters({...idCounters, PartTime: parseInt(e.target.value) || 0})}
                        />
                    </div>
                </div>
                <button 
                    onClick={handleSaveSequence}
                    className="mt-6 w-full py-3 bg-[#1B254B] text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-black/20 hover:scale-[1.02] transition-transform active:scale-95"
                >
                    Save Sequence Settings
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header Tabs */}
      <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-none z-10 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f9db3d] rounded-xl flex items-center justify-center text-black font-black shadow-lg shadow-[#f9db3d]/30">D</div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">DPSS Card Studio</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Student ID Center</p>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            {(['Batch', 'Queue', 'Form', 'Settings'] as SubTab[]).map(tab => (
                <button 
                    key={tab} 
                    /**
                     * Fixes: Error in file components/CardGenerator.tsx on line 270: Cannot find name 'setActiveTab'. Did you mean 'setActiveSubTab'?
                     */
                    onClick={() => setActiveSubTab(tab)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                        activeSubTab === tab ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    {tab === 'Batch' && <LayoutGrid size={14} />}
                    {tab === 'Queue' && <RefreshCw size={14} />}
                    {tab === 'Form' && <ClipboardList size={14} />}
                    {tab === 'Settings' && <Settings size={14} />}
                    {tab === 'Queue' ? `${tab} (${queueStudents.length})` : tab}
                </button>
            ))}
        </div>

        <button 
          onClick={handleExportAll}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#e3342f] text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-red-500/20 hover:scale-105 transition-transform active:scale-95"
        >
          <Printer size={16} /> Export All ({cardStudents.length})
        </button>
      </div>

      {activeSubTab === 'Batch' && renderBatchGenerator()}
      {activeSubTab === 'Queue' && renderQueue()}
      {activeSubTab === 'Settings' && renderSettings()}
      {activeSubTab === 'Form' && (
          <div className="flex-1 overflow-y-auto bg-slate-100/50 p-6 md:p-12 flex flex-col items-center custom-scrollbar">
              <div className="w-full max-w-[700px] flex flex-col items-center pb-32">
                  <h3 className="text-2xl font-black text-[#1B254B] uppercase mb-1">Registration</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] mb-12">Only fields required for your card are shown</p>
                  <StudentRegistrationForm 
                    onSubmit={handleFormSubmit}
                  />
              </div>
          </div>
      )}

      {editingStudent && (
          <PhotoEditorModal 
            student={editingStudent} 
            isOpen={!!editingStudent} 
            onClose={() => setEditingStudent(null)} 
            onSave={(updates) => {
                updateStudentData(students.map(s => s.id === editingStudent.id ? { ...s, ...updates } : s));
                setEditingStudent(null);
            }} 
          />
      )}
    </div>
  );
};

// --- Subcomponents ---

const StudentRegistrationForm: React.FC<{ onSubmit: (data: Partial<Student>) => void }> = ({ onSubmit }) => {
    const [form, setForm] = useState<Partial<Student>>({
        studyType: 'PartTime',
        gender: 'Female',
        name: '',
        dob: ''
    });
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.photo) return alert("Please provide your name and a photo.");
        onSubmit({ ...form, startDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) });
    };

    return (
        <form onSubmit={handleSubmit} className="w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#f9db3d] p-10 flex flex-col items-center relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0px, #000 1px, transparent 1px, transparent 10px)" }}></div>
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center font-black text-xl shadow-xl z-10 mb-4 border-2 border-black/5 text-[#1B254B]">D</div>
                <h2 className="text-3xl font-[900] text-black uppercase tracking-tight z-10">STUDENT DATA SHEET</h2>
                <p className="text-[10px] font-black text-black uppercase tracking-[2px] z-10 mt-2 opacity-70">FILL IN DATA FOR YOUR ID CARD</p>
            </div>

            <div className="p-10 flex flex-col items-center space-y-12">
                <div className="flex flex-col items-center">
                    <label className="w-44 aspect-[3/4] border-[4px] border-dashed border-slate-200 rounded-[30px] flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-primary-400 transition-all relative overflow-hidden group shadow-inner bg-slate-50/50">
                        {photoPreview ? (
                            <img src={photoPreview} className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <Plus className="text-slate-300 group-hover:scale-110 transition-transform" size={40} />
                                <div className="text-center px-4 mt-4">
                                    <span className="text-[9px] font-black text-slate-400 uppercase block leading-tight">ATTACH PHOTO (3x4)</span>
                                </div>
                            </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setPhotoPreview(reader.result as string);
                                    setForm({...form, photo: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                            }
                        }} />
                    </label>
                    <p className="text-[10px] font-black text-slate-300 uppercase mt-4 tracking-tighter text-center">CLEAR FACE VISIBLE</p>
                </div>

                <div className="w-full max-w-md space-y-10">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">PROGRAM TYPE</label>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setForm({...form, studyType: 'FullTime'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${form.studyType === 'FullTime' ? 'bg-black text-white border-black shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>FULL-TIME</button>
                            <button type="button" onClick={() => setForm({...form, studyType: 'PartTime'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${form.studyType === 'PartTime' ? 'bg-black text-white border-black shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>PART-TIME</button>
                        </div>
                    </div>

                    <div className="border-b-2 border-slate-100 pb-3 group focus-within:border-primary-500 transition-colors">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">FULL NAME</label>
                        <input placeholder="ENTER FULL NAME" className="w-full text-xl font-black text-[#1B254B] uppercase bg-transparent outline-none placeholder:text-slate-100" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="border-b-2 border-slate-100 pb-3 group focus-within:border-primary-500 transition-colors">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">DATE OF BIRTH</label>
                            <input placeholder="23-Dec-2025" className="w-full text-sm font-bold text-[#1B254B] bg-transparent outline-none" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} />
                        </div>
                        <div className="border-b-2 border-slate-100 pb-3 group focus-within:border-primary-500 transition-colors">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">GENDER</label>
                            <select className="w-full text-sm font-bold text-[#1B254B] bg-transparent outline-none appearance-none cursor-pointer" value={form.gender} onChange={e => setForm({...form, gender: e.target.value as any})}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full max-w-md py-5 bg-black text-white rounded-[24px] font-[900] uppercase tracking-[4px] shadow-2xl hover:bg-slate-900 transition-all active:scale-[0.98] text-xs">
                    SUBMIT APPLICATION
                </button>
            </div>
            <div className="p-6 bg-slate-50/50 text-center">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-[2px]">DEVELOPING POTENTIAL FOR SUCCESS SCHOOL © 2024</p>
            </div>
        </form>
    );
};

// High fidelity SVG reconstruction of the school logo or uploaded image
const SchoolLogo: React.FC<{ logo?: string }> = ({ logo }) => {
    if (logo) {
        return (
            <div className="relative w-32 h-32 flex items-center justify-center p-2">
                <img src={logo} className="max-w-full max-h-full object-contain" />
            </div>
        );
    }

    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
                {/* Concentric Circles */}
                <circle cx="100" cy="100" r="92" fill="none" stroke="#00008b" strokeWidth="4.5" />
                <circle cx="100" cy="100" r="70" fill="none" stroke="#00008b" strokeWidth="2" />
                
                {/* Text Paths */}
                <defs>
                    <path id="topCurvePath" d="M 35,100 A 65,65 0 0,1 165,100" />
                    <path id="bottomCurvePath" d="M 25,110 A 75,75 0 0,0 175,110" />
                </defs>
                
                {/* Khmer Title */}
                <text className="font-bold" style={{ fontSize: '15.5px', fill: '#00008b' }}>
                    <textPath href="#topCurvePath" startOffset="50%" textAnchor="middle">
                        សាលារៀន អភិវឌ្ឍន៍ សក្តានុពល ដើម្បីជោគជ័យ
                    </textPath>
                </text>

                {/* English Title */}
                <text className="font-bold uppercase" style={{ fontSize: '9px', fill: '#00008b', letterSpacing: '0.4px' }}>
                    <textPath href="#bottomCurvePath" startOffset="50%" textAnchor="middle">
                        DEVELOPING POTENTIAL FOR SUCCESS SCHOOL
                    </textPath>
                </text>

                {/* Side Star Icons */}
                <g className="fill-[#00008b]">
                    <g transform="translate(18, 100) scale(0.6)">
                        <circle cx="0" cy="0" r="4" />
                        <path d="M -15,0 L 15,0 M 0,-15 L 0,15 M -10,-10 L 10,10 M -10,10 L 10,-10" stroke="#00008b" strokeWidth="3" />
                    </g>
                    <g transform="translate(182, 100) scale(0.6)">
                        <circle cx="0" cy="0" r="4" />
                        <path d="M -15,0 L 15,0 M 0,-15 L 0,15 M -10,-10 L 10,10 M -10,10 L 10,-10" stroke="#00008b" strokeWidth="3" />
                    </g>
                </g>

                {/* Central Runner Figure */}
                <g transform="translate(65, 58) scale(0.72)">
                    <path d="M20 30 L60 35 L80 15 M55 35 L40 60 L65 75 M40 60 L15 90" fill="none" stroke="#c41230" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="85" cy="15" r="11" fill="#c41230" />
                    <text x="48" y="47" fill="white" fontSize="13" fontWeight="900" textAnchor="middle" transform="rotate(7, 48, 47)" style={{ fontFamily: 'sans-serif' }}>DPSS</text>
                </g>
            </svg>
        </div>
    );
};

const StudentIdCard: React.FC<{ student: Student, logo?: string }> = ({ student, logo }) => (
    <div 
        className="w-[340px] h-[520px] bg-[#f9db3d] rounded-[28px] border-[1px] border-black/10 shadow-2xl relative overflow-hidden flex flex-col items-center p-6 flex-shrink-0"
        style={{
            backgroundImage: `url('https://www.transparenttextures.com/patterns/damask.png'), radial-gradient(circle at center, #ffe800 0%, #f9db3d 100%)`,
            boxShadow: '0 30px 60px -15px rgba(0,0,0,0.35)'
        }}
    >
        {/* Background Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.5] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/damask.png')" }}></div>
        
        <div className="w-full flex flex-col items-center mb-1 z-10 text-center">
            {/* Global/Default Logo */}
            <SchoolLogo logo={logo} />
            
            <h1 className="text-[14.5px] font-[900] text-black tracking-tight leading-[1.1] uppercase px-1 mb-0.5 mt-1">DEVELOPING POTENTIAL FOR SUCCESS SCHOOL</h1>
            <p className="text-[12px] font-bold text-black italic">Building Wisdom with Virtues</p>
        </div>

        <div className="text-center mb-3 z-10">
            <h2 className="text-[17px] font-black text-black leading-tight max-w-[260px] mx-auto">Part-Time English Program<br/>for Adult Learners</h2>
            <h3 className="text-[15.5px] font-black text-black mt-3 tracking-widest uppercase">STUDENT'S ID CARD</h3>
        </div>

        {/* Photo Container - Exact 3:4 Aspect Ratio (165px : 220px) */}
        <div className="relative w-[165px] h-[220px] bg-[#0000ff] border-[2.5px] border-red-600 rounded-sm mb-4 shadow-xl overflow-hidden z-10 flex-shrink-0 flex items-center justify-center">
            {student.photo ? (
                <img 
                    src={student.photo} 
                    className="absolute w-full h-full object-cover"
                    style={{
                        transform: `scale(${student.photoAdjust?.scale || 1}) translate(${student.photoAdjust?.x || 0}px, ${student.photoAdjust?.y || 0}px)`
                    }}
                    alt={student.name}
                />
            ) : (
                <div className="flex flex-col items-center text-white/30">
                    <Camera size={44} />
                    <span className="text-[11px] mt-2 font-black uppercase tracking-tighter">No Photo</span>
                </div>
            )}
        </div>

        {/* Identity Info */}
        <div className="text-center z-10 w-full mb-4">
            <h4 className="text-[23px] font-[900] text-[#c41230] uppercase leading-none mb-1 tracking-tight truncate px-3">{student.name || 'STUDENT NAME'}</h4>
            <p className="text-[17px] font-bold text-[#c41230] uppercase tracking-wider">{student.displayId || 'DPSS-PT0000'}</p>
        </div>

        {/* Precise Alignment Grid */}
        <div className="w-full px-8 flex flex-col gap-1.5 z-10 mt-auto pb-5">
            <div className="grid grid-cols-[125px_1fr] items-baseline text-black">
                <span className="text-[19px] font-black leading-none tracking-tight">Gender:</span>
                <span className="text-[19px] font-medium leading-none pl-3">{student.gender || 'Female'}</span>
            </div>
            <div className="grid grid-cols-[125px_1fr] items-baseline text-black mt-1">
                <span className="text-[19px] font-black leading-none tracking-tight">Date of Birth:</span>
                <span className="text-[19px] font-medium leading-none pl-3 whitespace-nowrap">{student.dob || '23-Dec-2025'}</span>
            </div>
        </div>
    </div>
);