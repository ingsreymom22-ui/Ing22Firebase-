import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, Loader2, BookOpen } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { DPSSTopic } from '../types';

interface AISelfLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: DPSSTopic;
}

export const AISelfLearningModal: React.FC<AISelfLearningModalProps> = ({ isOpen, onClose, topic }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
        endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;
    
    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a highly professional personal development AI assistant, combining the energizing, transformational style of Tony Robbins with the structured, high-performance coaching of Brendon Burchard. Your tone should be empowering, highly structured, professional, and actionable. You should structure your responses using markdown, with tables when appropriate.
      
Use the following context about the user's current topic to guide your answer. If they ask about the topic, summarize it or provide helpful resources.

CURRENT TOPIC CONTEXT:
Title: ${topic ? topic.title : 'No specific topic selected'}
Content snippet: ${topic && topic.content ? topic.content.substring(0, 1000) : 'None'}

User's query: ${userMsg}
`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e: any) {
        console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-end justify-end p-6 pointer-events-none"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm bg-white shadow-2xl rounded-3xl flex flex-col overflow-hidden bottom-6 right-6 absolute pointer-events-auto border border-slate-200"
            style={{ height: '600px', maxHeight: 'calc(100vh - 48px)' }}
          >
            <div className="bg-emerald-600 p-4 flex items-center justify-between text-white shadow-md relative z-10">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-200" />
                <h3 className="font-black text-sm uppercase tracking-widest">Learning Tutor</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 relative z-0">
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-2xl p-4 text-sm shadow-sm inline-block max-w-[85%] rounded-tl-sm">
                 <p className="font-medium">Hello! I am your AI Learning Tutor.</p>
                 <p className="mt-2 text-emerald-700/80 text-xs">I can help you understand <strong>{topic?.title || "new subjects"}</strong>, summarize materials, or create study plans.</p>
              </div>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl text-sm shadow-sm max-w-[90%] overflow-hidden ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'}`}>
                    {m.role === 'model' ? (
                       <div className="markdown-body text-sm font-sans leading-relaxed">
                         <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{m.text}</ReactMarkdown>
                       </div>
                    ) : (
                       <p className="font-medium">{m.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-sm p-4 shadow-sm inline-flex items-center gap-2">
                     <Loader2 className="animate-spin text-emerald-500" size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200 relative z-10">
              <div className="relative flex items-center bg-slate-100 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-emerald-500/50 transition-shadow">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={e => {
                      if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSend();
                      }
                  }}
                  placeholder="Ask your tutor..."
                  className="w-full bg-transparent border-none outline-none text-sm px-4 py-2 font-medium text-slate-700 placeholder:text-slate-400"
                  autoFocus
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !query.trim()}
                  className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:shadow-none"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
