import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, Loader2, ImagePlus, History, MessageSquarePlus, Trash2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose, contextData }) => {
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('dpss_ai_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Could not load chat history", e);
      }
    }
  }, []);

  const saveSessions = (newSessions: ChatSession[]) => {
    setSessions(newSessions);
    try {
      localStorage.setItem('dpss_ai_chat_history', JSON.stringify(newSessions));
    } catch (e) {
      console.warn("Storage quota exceeded for chat history.", e);
    }
  };

  const activeSession = sessions.find(s => s.id === currentSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    if (endRef.current && !showHistory) {
        endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, showHistory]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setShowHistory(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!query.trim() && !selectedImage) || isLoading) return;
    
    const userMsg = query;
    const userImage = selectedImage;
    setQuery('');
    setSelectedImage(null);
    
    let sessionId = currentSessionId;
    let currentSessions = [...sessions];
    
    if (!sessionId) {
        sessionId = Date.now().toString();
        const newSession: ChatSession = {
            id: sessionId,
            title: userMsg.substring(0, 30) || 'Image Analysis',
            updatedAt: Date.now(),
            messages: []
        };
        currentSessions.unshift(newSession);
        setCurrentSessionId(sessionId);
    }
    
    let sessionIndex = currentSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex > -1) {
        currentSessions[sessionIndex].messages.push({ role: 'user', text: userMsg, image: userImage || undefined });
        currentSessions[sessionIndex].updatedAt = Date.now();
        // Move to top
        const [session] = currentSessions.splice(sessionIndex, 1);
        currentSessions.unshift(session);
        saveSessions(currentSessions);
    }

    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const currentSessionData = currentSessions.find(s => s.id === sessionId);
      const historyMessages = currentSessionData?.messages || [];
      const historyText = historyMessages.slice(0, -1).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n\n');

      const prompt = `You are a highly professional personal development AI assistant, combining the energizing, transformational style of Tony Robbins with the structured, high-performance coaching of Brendon Burchard. Your tone should be empowering, highly structured, professional, and actionable. You should structure your responses using markdown, with tables when appropriate.
Use the following context about the user's tasks to answer their questions. If the user uploads an image, analyze it accurately and provide helpful insights.

CONTEXT:
${contextData}

${historyText ? `PREVIOUS CONVERSATION HISTORY:\n${historyText}\n\n` : ''}User's query: ${userMsg}`;

      const contents: any[] = [];
      if (userImage) {
          const mimeType = userImage.split(';')[0].split(':')[1];
          const data = userImage.split(',')[1];
          contents.push({ inlineData: { data, mimeType } });
      }
      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: contents },
      });

      setSessions(prev => {
        const updated = [...prev];
        const sIdx = updated.findIndex(s => s.id === sessionId);
        if (sIdx > -1) {
            updated[sIdx].messages.push({ role: 'model', text: response.text || '' });
            updated[sIdx].updatedAt = Date.now();
            try {
              localStorage.setItem('dpss_ai_chat_history', JSON.stringify(updated));
            } catch (err) {
              console.warn("Storage quota exceeded for chat history.", err);
            }
        }
        return updated;
      });
      
    } catch (e: any) {
      console.error(e);
      setSessions(prev => {
        const updated = [...prev];
        const sIdx = updated.findIndex(s => s.id === sessionId);
        if (sIdx > -1) {
            updated[sIdx].messages.push({ role: 'model', text: "Sorry, I encountered an error. Please try again." });
            try {
              localStorage.setItem('dpss_ai_chat_history', JSON.stringify(updated));
            } catch (err) {
              console.warn("Storage quota exceeded for chat history.", err);
            }
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSessions = sessions.filter(s => s.id !== id);
      saveSessions(newSessions);
      if (currentSessionId === id || newSessions.length === 0) {
          setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
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
            <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shadow-md relative z-10 transition-colors">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-200" />
                <h3 className="font-black text-sm uppercase tracking-widest">
                   {showHistory ? 'Chat History' : 'AI Task Assistant'}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {!showHistory ? (
                  <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-black/10 rounded-full transition-colors text-white/80 hover:text-white" title="History">
                    <History size={18} />
                  </button>
                ) : (
                  <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors text-white/80 hover:text-white" title="Back to Chat">
                    <MessageSquarePlus size={18} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors text-white/80 hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 relative z-0 custom-scrollbar">
                <button 
                  onClick={handleNewChat}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm mb-4 font-semibold text-sm"
                >
                  <MessageSquarePlus size={18} /> New Conversation
                </button>
                {sessions.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 text-sm">
                    No past conversations.
                  </div>
                ) : (
                  sessions.map(session => (
                    <div 
                      key={session.id}
                      onClick={() => {
                        setCurrentSessionId(session.id);
                        setShowHistory(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl border flex items-center justify-between group cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-semibold text-slate-800 truncate text-sm">{session.title || 'Conversation'}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(session.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} {new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 relative z-0">
                <div className="bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-2xl p-4 text-sm shadow-sm inline-block max-w-[85%] rounded-tl-sm">
                   <p className="font-medium">Hello! I can help you manage your tasks, prioritize your day, or summarize your pending work.</p>
                   <p className="mt-2 text-indigo-700/80 text-xs">How can I help?</p>
                </div>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-4 rounded-2xl text-sm shadow-sm max-w-[90%] overflow-hidden ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'}`}>
                      {m.image && (
                         <img src={m.image} alt="Uploaded" className="max-w-full rounded-lg mb-2 shadow-sm border border-black/10" />
                      )}
                      {m.role === 'model' ? (
                         <div className="markdown-body text-sm font-sans leading-relaxed">
                           <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{m.text}</ReactMarkdown>
                         </div>
                      ) : (
                         <p className="font-medium whitespace-pre-wrap">{m.text}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-sm p-4 shadow-sm inline-flex items-center gap-2">
                       <Loader2 className="animate-spin text-indigo-500" size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}

            {!showHistory && (
              <div className="p-4 bg-white border-t border-slate-200 relative z-10">
                {selectedImage && (
                  <div className="mb-3 relative inline-block">
                    <img src={selectedImage} alt="Preview" className="h-16 rounded-xl shadow-sm border border-slate-200" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="relative flex items-end bg-slate-100 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-shadow">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors mb-0.5"
                    title="Upload Image"
                  >
                    <ImagePlus size={20} />
                  </button>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Ask your AI assistant..."
                    className="w-full bg-transparent border-none outline-none text-sm px-3 py-3 font-medium text-slate-700 placeholder:text-slate-400 resize-none max-h-32 custom-scrollbar"
                    autoFocus
                    rows={1}
                    style={{ minHeight: '44px' }}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={isLoading || (!query.trim() && !selectedImage)}
                    className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:shadow-none mb-0.5"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
