import React, { useRef, useState } from 'react';
import { AppData, ReflectionData, ReflectionEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Target, Compass, Award, Flag, Wand2, Loader2, RefreshCw, CheckSquare, Palette, Download, FileText, FileDown, ChevronDown } from 'lucide-react';
import { PAPER_STYLES } from '../src/styles/paperStyles';
import { format, subDays, eachDayOfInterval, startOfWeek } from 'date-fns';
import { callNeuralEngine } from '../services/neuralEngine';
import { RichTextDiv } from './FloatingToolbar';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import Markdown from 'react-markdown';

interface ReflectionsProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

interface ReflectionCardProps {
  title: string;
  icon: any;
  value: string;
  onChange: (val: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  colorClass: string;
  subtitle: string;
  paperClassName: string;
  isDarkPaper: boolean;
}

const ReflectionCard: React.FC<ReflectionCardProps> = ({ 
  title, 
  icon: Icon, 
  value, 
  onChange, 
  onFocus,
  onBlur,
  colorClass, 
  subtitle,
  paperClassName,
  isDarkPaper
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-[36px] p-6 md:p-8 ${isDarkPaper ? 'bg-slate-900/50 backdrop-blur-3xl border-white/10 text-white' : 'bg-white/95 backdrop-blur-3xl border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-900'} border hover:shadow-xl transition-all`}
  >
    <div className={`absolute top-0 right-0 w-48 h-48 -mr-24 -mt-24 rounded-full ${colorClass} opacity-10 blur-3xl transition-all`}></div>
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-5">
        <div className={`p-4 rounded-[22px] ${colorClass} bg-opacity-90 text-white shadow-lg`}>
          <Icon size={26} />
        </div>
        <div>
          <h3 className={`text-2xl font-black ${isDarkPaper ? 'text-slate-100' : 'text-slate-900'} uppercase tracking-tighter italic flex items-center gap-2`}>
            {title}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const html = `<ul style="list-style-type: none; padding-left: 0; margin-top: 4px; margin-bottom: 4px;"><li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span>&nbsp;</span></li></ul><div><br></div>`;
                  let safeValue = typeof value === 'string' ? value : '';
                  if (safeValue === '[object Object]') safeValue = '';
                  onChange(safeValue + html);
                }}
                className="text-slate-400 hover:text-emerald-400 transition-colors" 
                title="Insert Checklist"
              >
                <CheckSquare size={16} />
              </button>
            </div>
          </h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{subtitle}</p>
        </div>
      </div>
      <button 
        onClick={() => onChange('ARCHIVE')}
        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
        title="Archive current entry and start fresh"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
      </button>
    </div>
    
    <RichTextDiv
      value={typeof value === 'string' && value !== '[object Object]' ? value : ''}
      onChange={(val) => onChange(val)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={`Type your goals and vision here...`}
      className={`w-full border border-white/20 rounded-[24px] p-6 ${isDarkPaper ? 'text-slate-100' : 'text-slate-800'} text-base font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[180px] transition-all placeholder:text-slate-400/40 block custom-scrollbar ${paperClassName}`}
    />
  </motion.div>
);

 export const Reflections: React.FC<ReflectionsProps> = ({ data, onUpdate }) => {
  const [showHistory, setShowHistory] = React.useState(false);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  
  // Local state for auto-syncing inputs to prevent cursor jumping
  const [localReflections, setLocalReflections] = React.useState<Record<string, string>>({});
  const [activeField, setActiveField] = React.useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!summaryRef.current) return;
    
    const settings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
    const paperStyle = settings.paperStyle || 'none';
    const selectedPaper = PAPER_STYLES.find(s => s.id === paperStyle) || PAPER_STYLES[0];

    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#0f172a' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#1e293b';

    // Create a robust container for export with fixed layout width
    const exportContainer = document.createElement('div');
    exportContainer.style.position = 'relative';
    exportContainer.style.zIndex = '999999';
    exportContainer.style.pointerEvents = 'none';
    exportContainer.style.width = '1100px';
    exportContainer.style.boxSizing = 'border-box';
    exportContainer.style.padding = '40px';
    exportContainer.style.backgroundColor = bgColor;
    exportContainer.style.color = textColor;
    exportContainer.style.fontFamily = "'Inter', sans-serif";
    
    const title = (data.settings as any)?.name || 'Growth Mastery Summary';
    exportContainer.innerHTML = `
      <div style="margin-bottom: 30px; border-bottom: 3px solid #ea580c; padding-bottom: 20px;">
        <h1 style="font-size: 24pt; font-weight: 900; color: ${isDark ? '#f97316' : '#0f172a'}; margin: 0;">${title}</h1>
        <p style="font-size: 10pt; color: ${isDark ? '#94a3b8' : '#64748b'}; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;">Strategic Reflection Summary • ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
      <div class="reflection-content" style="line-height: 1.6; font-size: 11.5pt;">
        ${summaryRef.current.innerHTML}
      </div>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          background-color: ${bgColor};
          color: ${textColor};
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          break-after: avoid;
          color: ${isDark ? '#f97316' : '#0f172a'};
        }
        
        /* Avoid slicing lines vertically */
        p, li, tr, th, td, blockquote, pre,
        h1, h2, h3, h4, h5, h6,
        .synthesis-card-wrapper, .qa-board-wrapper,
        .reflection-content > p, .reflection-content > div,
        .grid > div, [class*="grid-cols"] > div,
        [style*="border"], [style*="background"] {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .flex { display: flex !important; }
        .grid { display: grid !important; }

        .reflection-content h2 { font-size: 18pt; font-weight: 900; margin-top: 25pt; color: #ea580c; }
        .reflection-content h3 { font-size: 14pt; font-weight: 800; margin-top: 15pt; color: ${isDark ? '#e2e8f0' : '#1e293b'}; }
        .reflection-content p { margin-bottom: 12pt; font-size: 11pt; }
        .reflection-content ul { margin-bottom: 12pt; }
        .reflection-content li { margin-bottom: 5pt; }
        .paper-dots, .paper-grid, .paper-ruled { background-image: none !important; background-color: ${isDark ? '#1e293b' : '#f8fafc'} !important; border: 1px solid ${isDark ? '#334155' : '#e2e8f0'} !important; border-radius: 12px !important; padding: 15px !important; }
        .synthesis-card-wrapper, .qa-board-wrapper { border: 2px solid ${isDark ? '#334155' : '#e2e8f0'} !important; border-radius: 15px !important; padding: 20px !important; margin: 20px 0 !important; background-color: ${isDark ? '#1e293b' : '#f8fafc'} !important; color: ${textColor} !important; }
      </style>
    `;

    const opt = {
      margin:       [10, 10, 10, 10] as [number, number, number, number],
      filename:     `Strategic_Summary.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        windowWidth: 1100,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: bgColor
      },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Show full-screen loading spinner/overlay to hide the print generation process
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    overlay.style.color = '#ffffff';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999999';
    overlay.style.fontFamily = "'Inter', sans-serif";
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="margin-bottom: 20px; font-size: 20px; font-weight: 900; tracking: tight;">GENERATING DOCUMENT PDF...</div>
        <div style="font-size: 13px; color: #94a3b8; font-weight: bold; margin-bottom: 20px;">Applying professional themes and layout presets</div>
        <div style="display: inline-block; width: 32px; height: 32px; border: 4px solid #38bdf8; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);

    const originalScrollY = window.scrollY || window.pageYOffset || 0;
    const originalScrollX = window.scrollX || window.pageXOffset || 0;
    window.scrollTo(0, 0);

    document.body.appendChild(exportContainer);
 
    // Give browser brief window to layout and paint the added container
    await new Promise(resolve => setTimeout(resolve, 100));

    // To prevent html2canvas from crash-looping or hanging on modern CSS stylesheet rules (e.g. Tailwind v4 variables, container queries),
    // we temporarily disable all external stylesheets during PDF rendering. High-z-index dark overlay hides any content flicker.
    const disabledSheets: (HTMLStyleElement | HTMLLinkElement)[] = [];
    try {
      Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((sheet) => {
        if (sheet instanceof HTMLStyleElement || sheet instanceof HTMLLinkElement) {
          if (!exportContainer.contains(sheet) && !overlay.contains(sheet) && (sheet as any).disabled !== true) {
            (sheet as any).disabled = true;
            disabledSheets.push(sheet);
          }
        }
      });
    } catch (err) {
      console.warn("Could not disable style sheets during PDF render:", err);
    }

    try {
      await html2pdf().set(opt).from(exportContainer).save();
    } catch (e) {
      console.error(e);
      alert('Export failed. Please try again.');
    } finally {
      // Restore all disabled sheets
      disabledSheets.forEach((sheet) => {
        try {
          (sheet as any).disabled = false;
        } catch (err) {
          console.error("Error restoring stylesheet:", err);
        }
      });
      document.body.removeChild(exportContainer);
      document.body.removeChild(overlay);
      window.scrollTo(originalScrollX, originalScrollY);
    }
   };

  const exportWord = () => {
    if (!summaryRef.current) return;
    
    const settings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
    const paperStyle = settings.paperStyle || 'none';
    const selectedPaper = PAPER_STYLES.find(s => s.id === paperStyle) || PAPER_STYLES[0];

    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#0f172a' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#334155';

    const title = (data.settings as any)?.name || 'Growth Mastery Summary';
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4;
            margin: 1in;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: ${textColor};
            background-color: ${bgColor};
            margin: 0;
            padding: 0;
          }
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
            color: ${isDark ? '#f97316' : '#0f172a'};
          }
          p, li, tr, .synthesis-card-wrapper, .qa-board-wrapper, table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h1 { color: ${isDark ? '#f97316' : '#0f172a'}; font-size: 26pt; font-weight: bold; border-bottom: 2pt solid #ea580c; padding-bottom: 10pt; margin-bottom: 20pt; }
          h2 { color: #ea580c; font-size: 18pt; margin-top: 25pt; border-left: 4pt solid #ea580c; padding-left: 10pt; }
          h3 { color: ${isDark ? '#e2e8f0' : '#1e293b'}; font-size: 14pt; margin-top: 15pt; font-weight: bold; }
          p { margin-bottom: 10pt; line-height: 1.5; }
          .synthesis-card-wrapper, .qa-board-wrapper { 
            border: 1pt solid ${isDark ? '#334155' : '#cbd5e1'}; 
            padding: 15pt; 
            margin: 15pt 0; 
            background-color: ${isDark ? '#1e293b' : '#f8fafc'};
            border-radius: 10pt;
            color: ${textColor};
          }
          table { width: 100% !important; border-collapse: collapse; margin: 15pt 0; }
          th, td { border: 1pt solid ${isDark ? '#334155' : '#e2e8f0'}; padding: 8pt; text-align: left; }
          th { background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; font-weight: bold; color: ${isDark ? '#ffffff' : '#000000'}; }
          .paper-dots, .paper-grid, .paper-ruled {
            background-color: ${isDark ? '#1e293b' : '#f8fafc'} !important;
            border: 1px solid ${isDark ? '#334155' : '#e2e8f0'} !important;
            padding: 15px !important;
          }
        </style>
      </head>
      <body style="background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0;">
        <h1>${title}</h1>
        ${summaryRef.current.innerHTML}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Strategic_Summary.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const [isThemeDark, setIsThemeDark] = React.useState(() => document.documentElement.classList.contains('dark'));

  React.useEffect(() => {
    const handleThemeChange = () => {
      setIsThemeDark(document.documentElement.classList.contains('dark'));
    };
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          handleThemeChange();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const settings = data.settings || { fontSize: 12, fontFamily: "'Inter', sans-serif" };
  const paperStyle = settings.paperStyle || 'none';
  const selectedPaper = PAPER_STYLES.find(s => s.id === paperStyle) || PAPER_STYLES[0];
  const isDarkPaper = isThemeDark;
  
  const reflections = data.reflections || {
    weeklyReview: { id: 'weekly', title: 'Weekly Review', content: '' },
    monthlyChallenge: { id: 'monthly', title: 'Monthly Challenge', content: '' },
    threeMonthVision: { id: '3month', title: '3-Month Vision', content: '' },
    sixMonthVision: { id: '6month', title: '6-Month Vision', content: '' },
    oneYearVision: { id: '1year', title: '1-Year Vision', content: '' },
    archives: []
  };

  // Generate rolling 365 days grouped by weeks (columns)
  const heatmapWeeks = React.useMemo(() => {
    try {
      const today = new Date();
      const startDate = subDays(today, 364); // 52 rolling weeks
      const startOfFirstWeek = startOfWeek(startDate); // Align to Sunday
      const allDays = eachDayOfInterval({ start: startOfFirstWeek, end: today });
      
      const weeks: Date[][] = [];
      let currentWeek: Date[] = [];
      
      allDays.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });
      
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      
      return weeks;
    } catch (e) {
      console.error("Error generating heatmap:", e);
      return [];
    }
  }, [data.journalEntries]);

  // Sync prop data to local state when not focused
  React.useEffect(() => {
    const fields: (keyof ReflectionData)[] = ['weeklyReview', 'monthlyChallenge', 'threeMonthVision', 'sixMonthVision', 'oneYearVision'];
    const newLocal: Record<string, string> = { ...localReflections };
    let changed = false;

    fields.forEach(field => {
      if (activeField !== field) {
        const cloudContent = (reflections[field] as ReflectionEntry)?.content || '';
        if (newLocal[field] !== cloudContent) {
          newLocal[field] = cloudContent;
          changed = true;
        }
      }
    });

    if (changed) {
      setLocalReflections(newLocal);
    }
  }, [reflections, activeField]);

  const handleUpdateReflection = (key: keyof ReflectionData, content: string) => {
    if (content === 'ARCHIVE') {
      const entryToArchive = reflections[key] as ReflectionEntry;
      if (!entryToArchive.content.trim()) return;

      const archivedEntry: ReflectionEntry = {
        ...entryToArchive,
        id: `${entryToArchive.id}-${Date.now()}`,
        archivedAt: new Date().toISOString()
      };

      const newReflections = {
        ...reflections,
        [key]: { ...entryToArchive, content: '' },
        archives: [...(reflections.archives || []), archivedEntry]
      };
      
      // Update local too
      setLocalReflections(prev => ({ ...prev, [key]: '' }));
      onUpdate({ ...data, reflections: newReflections });
      return;
    }

    // Update local state immediately for responsiveness
    setLocalReflections(prev => ({ ...prev, [key]: content }));

    const newReflections = {
      ...reflections,
      [key]: { ...(reflections[key] as ReflectionEntry), content }
    };
    onUpdate({ ...data, reflections: newReflections });
  };

  const generateAISummary = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummary(null);

    const context = `
      Weekly Review: ${reflections.weeklyReview.content}
      Monthly Challenge: ${reflections.monthlyChallenge.content}
      3-Month Vision: ${reflections.threeMonthVision.content}
      6-Month Vision: ${reflections.sixMonthVision.content}
      1-Year Vision: ${reflections.oneYearVision.content}
    `;

    try {
      const result = await callNeuralEngine(
        'gemini-3-flash-preview',
        `Summarize my growth journey based on these reflections. Highlight key achievements, identify core patterns in my goals and vision, and suggest areas for improvement for the next quarter. Keep it concise, simple, professional, and empowering. Use sections with simple emojis.
        IMPORTANT instructions: Do NOT use any markdown symbols, meaning NO double asterisks (**), NO single asterisks (*) anywhere (not even for bullet points), and NO hash characters (#, ##). Use standard paragraphs separated by blank lines and clear emojis (🏆, 🎯, 📈) for bullet headings. No stars or markdown headers at all!
        Context: ${context}`,
        "You are an elite performance coach. Synthesize reflections into a cohesive growth strategy."
      );
      // Regex sanitize any stray stars/hashes
      const cleanText = result.text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '');
      setSummary(cleanText);
    } catch (e) {
      console.error(e);
      alert('Failed to generate summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/[0.01] backdrop-blur-3xl p-4 md:p-8 overflow-y-auto custom-scrollbar font-sans text-slate-900">
      <div className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase italic drop-shadow-sm">
            Growth Mastery Plan
          </h1>
          <p className="text-orange-600 font-bold tracking-widest text-[10px] mt-2 uppercase opacity-80">
            Synthesize your journey from days to years
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={generateAISummary}
            disabled={isSummarizing}
            className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSummarizing ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
            AI Journey Summary
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex-1 md:flex-none px-6 py-3 bg-white/40 hover:bg-white/60 rounded-2xl text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all border border-white/40 shadow-sm"
          >
            {showHistory ? 'View Master Plan' : 'View Motivation Archives'}
          </button>
        </div>
      </div>

      {/* Visual Journal Consistency Heatmap */}
      <div className="relative overflow-visible rounded-[38px] p-8 bg-white/95 border-2 border-slate-200 shadow-xl mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Calendar size={22} className="text-orange-500 animate-pulse" />
              Journal Consistency Heatmap
            </h2>
            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider mt-0.5">Your daily reflections log over the rolling 365 days</p>
          </div>
          
          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl shadow-sm">
            <span>Less</span>
            <div className="flex gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-slate-200 border border-slate-300" title="No journal logged" />
              <div className="w-4 h-4 rounded-sm bg-orange-100 border border-orange-200" title="1-2 ratings / simple journal present" />
              <div className="w-4 h-4 rounded-sm bg-orange-200 border border-orange-300" title="Journal logged" />
              <div className="w-4 h-4 rounded-sm bg-orange-400 border border-orange-500" title="High-quality reflection log" />
              <div className="w-4 h-4 rounded-sm bg-orange-600 border border-orange-700 shadow-sm shadow-orange-500/20" title="Deep reflection completed (4+ ratings)" />
            </div>
            <span>More Entries</span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="overflow-x-auto custom-scrollbar-orange pb-4">
          <div className="flex gap-2 min-w-[850px] select-none items-start pt-1">
            {/* Days labels using matching 7-row layout for absolute alignment */}
            <div className="grid grid-rows-7 gap-1.5 pr-2 w-8 text-[9px] font-black text-slate-400 uppercase tracking-tighter text-right">
              <span className="h-3.5 flex items-center justify-end">Sun</span>
              <span className="h-3.5 flex items-center justify-end"></span>
              <span className="h-3.5 flex items-center justify-end">Tue</span>
              <span className="h-3.5 flex items-center justify-end"></span>
              <span className="h-3.5 flex items-center justify-end">Thu</span>
              <span className="h-3.5 flex items-center justify-end"></span>
              <span className="h-3.5 flex items-center justify-end">Sat</span>
            </div>

            {/* Weeks columns */}
            {heatmapWeeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-rows-7 gap-1.5">
                {week.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const entry = data.journalEntries?.[dateKey];
                  
                  // Level algorithm
                  let level = 0; // standard uncompleted
                  let tooltip = `${format(day, 'MMM do, yyyy')}: No entry`;
                  
                  if (entry) {
                    level = 1;
                    tooltip = `${format(day, 'MMM do, yyyy')}: Journal Entry present!`;
                    
                    const ratingCount = [
                      entry.energyRating,
                      entry.focusRating,
                      entry.productivityRating,
                      entry.stressRating,
                      entry.gratitudeRating,
                      entry.vitalityRating
                    ].filter(Boolean).length;

                    if (ratingCount >= 4) {
                      level = 4;
                      tooltip = `${format(day, 'MMM do, yyyy')}: Deep reflection journal completed! ⭐`;
                    } else if (ratingCount >= 2) {
                      level = 3;
                      tooltip = `${format(day, 'MMM do, yyyy')}: High-quality reflection log!`;
                    } else if (entry.isCompleted) {
                      level = 2;
                      tooltip = `${format(day, 'MMM do, yyyy')}: Journal logged!`;
                    }
                  }

                  const getCellBg = (lvl: number) => {
                    switch (lvl) {
                      case 1: return 'bg-orange-100 border border-orange-200 text-orange-700 hover:scale-130 hover:shadow-md';
                      case 2: return 'bg-orange-200 border border-orange-300 text-orange-850 hover:scale-130 hover:shadow-md';
                      case 3: return 'bg-orange-400 border border-orange-500 hover:scale-130 hover:shadow-md';
                      case 4: return 'bg-orange-600 border border-orange-700 hover:scale-130 hover:shadow-lg shadow-orange-500/30';
                      default: return 'bg-slate-200 border border-slate-350/60 hover:bg-slate-300 hover:scale-130 hover:border-slate-400';
                    }
                  };

                  return (
                    <div 
                      key={day.toString()}
                      className={`w-3.5 h-3.5 rounded-[3.5px] transition-all duration-150 cursor-pointer ${getCellBg(level)}`}
                      title={tooltip}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-10 bg-white border-2 border-slate-200/90 p-8 rounded-[40px] shadow-2xl relative"
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="relative z-[200]">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold transition-all"
                  title="Export notes"
                >
                  <Download size={14} className="text-slate-600" />
                  Export
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 z-[250] w-[180px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-150">
                    <button 
                      onClick={() => { exportWord(); setShowExportMenu(false); }}
                      className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl transition-colors font-bold text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" /> MS Word (.doc)
                      </span>
                    </button>
                    <button 
                      onClick={() => { exportPDF(); setShowExportMenu(false); }}
                      className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-xl transition-colors font-bold text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <FileDown size={14} className="text-red-500" /> PDF Document
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setSummary(null)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                title="Clear summary"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            <div ref={summaryRef}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-orange-100 border border-orange-200 rounded-2xl text-orange-600">
                  <Wand2 size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase italic">AI Evolution Strategic Summary</h2>
              </div>
              <div className="markdown-body prose prose-slate prose-p:leading-relaxed max-w-none text-slate-800 font-bold text-sm leading-relaxed">
                 <Markdown>{summary}</Markdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showHistory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-16">
          <ReflectionCard 
            title="Weekly Review" 
            subtitle="Wins & Adjustments"
            icon={Calendar}
            value={localReflections.weeklyReview ?? reflections.weeklyReview.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('weeklyReview', 'ARCHIVE');
              } else {
                handleUpdateReflection('weeklyReview', val);
              }
            }}
            onFocus={() => setActiveField('weeklyReview')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-orange-500"
            paperClassName={selectedPaper.className}
            isDarkPaper={isDarkPaper}
          />
          <ReflectionCard 
            title="Monthly Challenge" 
            subtitle="30-Day Mastery Status"
            icon={Target}
            value={localReflections.monthlyChallenge ?? reflections.monthlyChallenge.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('monthlyChallenge', 'ARCHIVE');
              } else {
                handleUpdateReflection('monthlyChallenge', val);
              }
            }}
            onFocus={() => setActiveField('monthlyChallenge')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-emerald-500"
            paperClassName={selectedPaper.className}
            isDarkPaper={isDarkPaper}
          />
          <ReflectionCard 
            title="3-Month Vision" 
            subtitle="Quarterly Evolution"
            icon={Compass}
            value={localReflections.threeMonthVision ?? reflections.threeMonthVision.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('threeMonthVision', 'ARCHIVE');
              } else {
                handleUpdateReflection('threeMonthVision', val);
              }
            }}
            onFocus={() => setActiveField('threeMonthVision')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-indigo-500"
            paperClassName={selectedPaper.className}
            isDarkPaper={isDarkPaper}
          />
          <ReflectionCard 
            title="6-Month Vision" 
            subtitle="Bi-Annual Milestones"
            icon={Award}
            value={localReflections.sixMonthVision ?? reflections.sixMonthVision.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('sixMonthVision', 'ARCHIVE');
              } else {
                handleUpdateReflection('sixMonthVision', val);
              }
            }}
            onFocus={() => setActiveField('sixMonthVision')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-purple-500"
            paperClassName={selectedPaper.className}
            isDarkPaper={isDarkPaper}
          />
          <ReflectionCard 
            title="1-Year Vision" 
            subtitle="Long-term Legacy"
            icon={Flag}
            value={localReflections.oneYearVision ?? reflections.oneYearVision.content}
            onChange={(val) => {
              if (val === 'ARCHIVE') {
                handleUpdateReflection('oneYearVision', 'ARCHIVE');
              } else {
                handleUpdateReflection('oneYearVision', val);
              }
            }}
            onFocus={() => setActiveField('oneYearVision')}
            onBlur={() => setActiveField(null)}
            colorClass="bg-rose-500"
            paperClassName={selectedPaper.className}
            isDarkPaper={isDarkPaper}
          />
        </div>
      ) : (
        <div className="space-y-8 pb-16">
          {(reflections.archives || []).length === 0 && (
            <div className="py-32 text-center text-white/20 uppercase font-black italic tracking-widest border-2 border-dashed border-white/5 rounded-[40px]">
              No archived motivations yet.
            </div>
          )}
          {(reflections.archives || []).slice().reverse().map((archive) => (
            <motion.div 
              key={archive.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${isDarkPaper ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'} border p-8 rounded-[40px] shadow-2xl relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 px-6 py-2 ${isDarkPaper ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} text-[10px] font-black uppercase tracking-widest rounded-bl-[20px]`}>
                {new Date(archive.archivedAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <h3 className={`text-xl font-black ${isDarkPaper ? 'text-orange-400' : 'text-orange-600'} uppercase italic mb-4`}>{archive.title}</h3>
              <div 
                className={`${isDarkPaper ? 'text-slate-300' : 'text-slate-700'} text-lg leading-relaxed whitespace-pre-wrap italic`}
                dangerouslySetInnerHTML={{ __html: archive.content }} 
              />
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .custom-scrollbar-orange::-webkit-scrollbar {
          height: 10px;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-track {
          background: rgba(249, 115, 22, 0.05);
          border-radius: 6px;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.35);
          border-radius: 6px;
          border: 2px solid white;
        }
        .custom-scrollbar-orange::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.55);
        }
      `}</style>
    </div>
  );
};
