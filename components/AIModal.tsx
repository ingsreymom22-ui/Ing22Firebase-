import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Upload } from 'lucide-react';
import { parseStudentData } from '../services/geminiService';
import { Student } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: Partial<Student> | Partial<Student>[]) => void;
  defaults?: Partial<Student>;
  mode: 'Hall' | 'Finance' | 'Attendance';
}

export const AIModal: React.FC<Props> = ({ isOpen, onClose, onAdd, defaults, mode }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Paste handler for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleImageSelection(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const resetState = () => {
      setText('');
      setImage(null);
      setImagePreview(null);
  };

  const handleClose = () => {
      resetState();
      onClose();
  };

  const handleImageSelection = (file: File) => {
    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!text.trim() && !image) return;
    setLoading(true);
    
    // Pass text, image, and MODE to logic
    const results = await parseStudentData(text, image || undefined, mode);
    setLoading(false);
    
    if (results && results.length > 0) {
      onAdd(results);
      handleClose();
    } else {
      alert("Could not parse data. Please ensure the text or image matches the selected category.");
    }
  };

  if (!isOpen) return null;

  // Determine placeholder based on MODE
  let placeholderText = '';
  let title = '';

  if (mode === 'Attendance') {
      title = 'AI Quick Add (Attendance)';
      placeholderText = `Format:
1- Ros Sombath (M)
2- Name (F)

(Simple list of names. Sex (M)/(F) is optional.)`;
  } else if (mode === 'Hall') {
      title = 'AI Quick Add (Hall Study)';
      placeholderText = `Format:
Name: Sok Chandara
Teacher: Leang Pichdavina
Level: 2A
Behavior: Incomplete Homework
Mon-Fri or Sat & Sunday: Mon-Fri
Time: 5:20-6:20
Duration: 1 Month
Start: 23-Dec-2025
Assistant: Kheang Dalin

(Or paste a table screenshot with these columns)`;
  } else {
      title = 'AI Quick Add (Finance)';
      placeholderText = `Format:
Number, Student ID, Full Name, Teachers, Level, Start Date, January, February...

Example:
1, DPSS-EP1326, Bin Tith, [Teacher Name], 1A, 16-Oct-25, 16, 16, Paid`;
  }

  // INPUT MODE UI
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative flex flex-col max-h-[90vh]">
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-2 mb-2 text-primary-600">
          <Sparkles size={24} />
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>

        {/* Context Information */}
        {defaults && (defaults.className || defaults.category) && (
             <div className="bg-primary-50 border border-primary-100 rounded-lg p-2 mb-4 text-sm text-primary-800 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                Adding to: <strong>{mode}</strong> 
                {defaults.className ? ` - ${defaults.className}` : ''}
             </div>
        )}
        
        <p className="text-slate-500 mb-4 text-sm">
          Paste a list of names, or <strong>paste a screenshot</strong> (Ctrl+V) of a table to add multiple students at once.
        </p>

        {/* Image Preview Area */}
        {imagePreview ? (
            <div className="mb-4 relative group">
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                <button 
                    onClick={() => { setImage(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X size={14} />
                </button>
            </div>
        ) : (
            <div 
                className="mb-4 border-2 border-dashed border-slate-200 rounded-lg h-24 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-primary-300 transition-colors"
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input 
                    id="file-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleImageSelection(e.target.files[0])}
                />
                <div className="flex items-center gap-2 mb-1">
                    <Upload size={20} />
                    <span className="font-medium">Upload or Paste Image</span>
                </div>
                <span className="text-xs">Supports Screenshots & Photos</span>
            </div>
        )}
        
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholderText}
          className="w-full h-32 p-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-slate-700 text-sm mb-4 font-mono leading-relaxed"
        />
        
        <div className="mt-auto flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button 
            onClick={handleProcess}
            disabled={loading || (!text && !image)}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} />}
            {loading ? 'Processing...' : 'Process Bulk Data'}
          </button>
        </div>
      </div>
    </div>
  );
};