import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { NeuralEngine, QuickSource, OutlineItem, ExternalKeys, Student } from "../types";
import { addMonths, addDays, addWeeks, format, isValid } from 'date-fns';

export interface NeuralResult {
  text: string;
  thought?: string;
  keyUsed?: string;
}

// ==========================================
//  KEY ROTATION ENGINE (Supports 2+ Keys)
// ==========================================
const getGeminiKeys = (userKey?: string): string[] => {
    // 1. If user provided a custom key in UI settings, use only that
    if (userKey && userKey.trim().length > 0) {
        return [userKey.trim()];
    }

    // 2. Look for the comma-separated list from Vercel/Vite
    let envKeys = "";
    try {
        // Support both Vite (Client) and Process (Server/Node) environments
        const metaEnv = (import.meta as any).env;
        envKeys = metaEnv?.VITE_GEMINI_API_KEYS || metaEnv?.GEMINI_API_KEY || "";
        
        if (!envKeys) {
            envKeys = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEYS || "";
        }
    } catch (e) {
        console.error("Environment key lookup failed", e);
    }

    // Clean and split the keys into an array
    return envKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
};

function isQuotaError(error: any): boolean {
    const msg = error?.message?.toLowerCase() || "";
    return msg.includes("quota") || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("limit");
}

const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 1,
  delay: number = 1500
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

// ==========================================
//  MAIN AI GENERATOR (With Rotation)
// ==========================================
export const callNeuralEngine = async (
  engine: NeuralEngine,
  prompt: string,
  systemInstruction: string,
  file?: QuickSource | null,
  userKeys: ExternalKeys = {}
): Promise<NeuralResult> => {
  
  // FIX: Check if the engine name contains "gemini"
  const isGeminiModel = engine.toLowerCase().includes("gemini");
  


  if (isGeminiModel) {
    const availableKeys = getGeminiKeys(userKeys[engine]);

    if (availableKeys.length === 0) {
      return { 
        text: `<div class="p-6 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl">
                <strong>Configuration Required:</strong> No Gemini API Keys found. 
                Please set <code>GEMINI_API_KEY</code> in your environment or Settings.
               </div>` 
      };
    }

    // Loop through all keys (Rotation logic)
    for (let i = 0; i < availableKeys.length; i++) {
      try {
        return await withRetry(async () => {
          const ai = new GoogleGenAI({ apiKey: availableKeys[i] });
          const parts: any[] = [{ text: prompt }];
          
          if (file) {
            parts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
          }

          const response: GenerateContentResponse = await ai.models.generateContent({
            model: engine,
            contents: { parts },
            config: {
              systemInstruction,
              temperature: 0.7,
              topP: 0.95,
              topK: 64,
              maxOutputTokens: 8192
            },
          });

          return {
            text: response.text || "No content generated.",
            thought: `Neural synthesis complete via ${engine} (Key #${i + 1}/${availableKeys.length})`
          };
        });
      } catch (error: any) {
        // If Quota Error and we have more keys, try next key
        if (isQuotaError(error) && i < availableKeys.length - 1) {
          console.warn(`Gemini Key #${i + 1} exhausted (Quota). Rotating to next key...`);
          continue; 
        }
        // If it's the last key or not a quota error, show the specific error
        return { text: `<div class="p-6 bg-red-50 text-red-600 rounded-xl border border-red-200"><strong>Neural Error:</strong> ${error.message}</div>` };
      }
    }
  }

  // ==========================================
  //  NON-GEMINI ENGINES (GPT, Grok, Deepseek)
  // ==========================================
  const userKey = userKeys[engine];
  if (!userKey) {
      return { text: `<div class="p-6 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl">API Key required for ${engine} in Settings.</div>` };
  }

  return withRetry(async () => {
    let endpoint = "";
    if (engine.includes("gpt")) endpoint = "https://api.openai.com/v1/chat/completions";
    else if (engine.includes("grok")) endpoint = "https://api.x.ai/v1/chat/completions";
    else if (engine.includes("deepseek")) endpoint = "https://api.deepseek.com/chat/completions";

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${userKey}` 
      },
      body: JSON.stringify({
        model: engine,
        messages: [
            { role: "system", content: systemInstruction }, 
            { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "External API call failed");
    }

    const data = await response.json();
    return { 
        text: data.choices[0].message.content, 
        thought: `External synthesis via ${engine}.` 
    };
  }).catch((error: any) => ({ 
      text: `<div class="p-6 bg-red-50 text-red-600 border border-red-200 rounded-xl"><strong>${engine} Error:</strong> ${error.message}</div>` 
  }));
};

// ==========================================
//  OUTLINE GENERATOR (With Rotation)
// ==========================================
export const generateNeuralOutline = async (
  prompt: string
): Promise<OutlineItem[]> => {
  const availableKeys = getGeminiKeys();

  for (let i = 0; i < availableKeys.length; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: availableKeys[i] });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Outline is light, always use flash
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                children: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      children: { 
                          type: Type.ARRAY, 
                          items: { type: Type.OBJECT, properties: { title: { type: Type.STRING } } } 
                      }
                    }
                  }
                }
              },
              required: ["title"]
            }
          }
        }
      });

      const jsonStr = response.text || "[]";
      const data = JSON.parse(jsonStr);
      
      const addIds = (items: any[]): OutlineItem[] => {
        return items.map((item, index) => ({
          id: `outline-${Date.now()}-${index}-${Math.random()}`,
          title: item.title,
          expanded: true,
          children: item.children ? addIds(item.children) : []
        }));
      };

      return addIds(data);
    } catch (error: any) {
      if (isQuotaError(error) && i < availableKeys.length - 1) {
        continue; // Try next key
      }
      console.error(`Outline generation failed:`, error.message);
      return [];
    }
  }
  return [];
};


const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const sanitizeValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.toLowerCase() === 'null') return '';
  return str;
};

const manualParse = (str: string, fmt: string): Date | null => {
    const clean = str.trim();
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length !== 3) return null;
    
    let d, m, y;
    if (fmt === 'dd/MM/yyyy') {
        [d, m, y] = parts.map(Number);
    } else if (fmt === 'MM/dd/yyyy') {
        [m, d, y] = parts.map(Number);
    } else if (fmt === 'yyyy-MM-dd') {
        [y, m, d] = parts.map(Number);
    } else {
        return null;
    }
    
    if (y < 100) y += 2000;
    const date = new Date(y, m - 1, d);
    return isValid(date) ? date : null;
};

const normalizeDate = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim();
    const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (match) {
        const d = parseInt(match[1], 10);
        const m = parseInt(match[2], 10) - 1;
        let y = parseInt(match[3], 10);
        if (y < 100) y += 2000;
        else if (y < 1000) y = 2000 + (y % 100);
        const date = new Date(y, m, d);
        return isValid(date) ? date : null;
    }
    const iso = new Date(clean);
    if (isValid(iso)) {
        if (iso.getFullYear() < 100) iso.setFullYear(2000 + iso.getFullYear());
        return iso;
    }
    const formats = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];
    for (const fmt of formats) {
        const d = manualParse(clean, fmt);
        if (d && isValid(d)) {
            if (d.getFullYear() < 100) d.setFullYear(2000 + d.getFullYear());
            return d;
        }
    }
    return null;
};

const calculateDeadline = (startDate: Date, durationStr: string): Date => {
    const normalized = durationStr.toLowerCase().trim();
    const amountMatch = normalized.match(/\d+/);
    const amount = amountMatch ? parseInt(amountMatch[0], 10) : 1;
    if (normalized.includes('day')) return addDays(startDate, amount);
    if (normalized.includes('week')) return addWeeks(startDate, amount);
    if (normalized.includes('year')) return addMonths(startDate, amount * 12);
    return addMonths(startDate, amount);
};

export const parseStudentData = async (inputText: string, imageFile?: File, mode: 'Hall' | 'Finance' | 'Attendance' = 'Hall'): Promise<Partial<Student>[] | null> => {
  
  // Attempt secure server proxy first (no image support in simple proxy yet, skip if image)
  if (!imageFile) {
      try {
          const proxyPrompt = `Analyze this MESSY data for ${mode}: ${inputText}. 
          Extract all valid records. Even if the data is fragmented, disorganized, or contains unrelated text, find the names, dates, amounts, and levels.
          Return a JSON array of objects.`;
          
          const response = await fetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  prompt: proxyPrompt,
                  systemInstruction: "You are a professional data extraction specialist. Convert MESSY, UNSTRUCTURED text into clean JSON. Be aggressive in finding matches. Always return valid JSON array.",
                  model: 'gemini-3-flash-preview'
              })
          });
          
          if (response.ok) {
              const data = await response.json();
              // Attempt to sanitize and parse the text into JSON
              const cleaned = data.text.replace(/```json|```/g, '').trim();
              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed)) return parsed.map(p => ({ ...p, _fromProxy: true }));
          }
      } catch (e) {
          console.warn("Proxy failed for parseStudentData, using direct SDK...", e);
      }
  }

  const parts: any[] = [];
  if (imageFile) parts.push(await fileToGenerativePart(imageFile));
  if (inputText) parts.push({ text: `Context: ${inputText}` });

  let prompt = '';
  if (mode === 'Hall') {
      prompt = `EXTRACT Hall Study records from the messy input. 
      Identify fields even if formatted poorly:
      - Name (name): Person's full name.
      - Fee (schoolFee): Currency/Amount.
      - Teacher (teachers): List of names.
      - Level (level): Class/Grade level.
      - Behavior (behavior): Comments on conduct.
      - Schedule (schedule): e.g. Mon-Fri or Sat & Sunday.
      - Time (time): Duration or start/end times.
      - Start Date (startDate): Any mention of a starting date.
      - Assistant (assistant): Staff helping.
      - Duration (duration): e.g. 1 month, 2 weeks.`;
  } else if (mode === 'Finance') {
      prompt = `EXTRACT Finance records from the messy input. 
      Identify fields even if formatted poorly:
      - ID (displayId): Student ID starting with DPSS.
      - Name (name): Full student name.
      - Fee (schoolFee): Amount paid or due.
      - Level (level): Grade/Level.
      - Start Date (startDate): When they start.
      - Teachers (teachers): Names of teachers.
      - Monthly Payments (paymentList): Array of {period: string, status: string}.
      - Duration (duration): How long they paid for.`;
  } else {
      prompt = `EXTRACT Attendance list from the messy input. 
      - Full Name (name)
      - Sex: Keep (M) or (F) if found.`;
  }
  prompt += `\nINSTRUCTION: You are a high-precision extraction engine. Use deep natural language understanding to find these fields even in unstructured sentences, messy bullet points, or complex tables.
  CRITICAL: Return startDate in format dd/MM/yyyy (e.g., 24/12/2025). Ensure year is ALWAYS 4 digits. JSON array format.`;

  const availableKeys = getGeminiKeys();
  if (availableKeys.length === 0) return null;

  for (let i = 0; i < availableKeys.length; i++) {
    try {
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: availableKeys[i] });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                schoolFee: { type: Type.STRING },
                displayId: { type: Type.STRING },
                behavior: { type: Type.STRING }, 
                level: { type: Type.STRING },
                teachers: { type: Type.STRING },
                startDate: { type: Type.STRING },
                time: { type: Type.STRING },
                schedule: { type: Type.STRING },
                assistant: { type: Type.STRING },
                duration: { type: Type.STRING },
                shift: { type: Type.STRING },
                paymentList: { 
                  type: Type.ARRAY,
                  items: { type: Type.OBJECT, properties: { period: { type: Type.STRING }, status: { type: Type.STRING } } }
                },
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) return null;
      const rawData = JSON.parse(text);

      return rawData.map((item: any) => {
          const payments: Record<string, string> = {};
          if (item.paymentList) item.paymentList.forEach((p: any) => payments[p.period] = sanitizeValue(p.status));
          const { paymentList, ...studentData } = item;
          const sanitizedData: any = {};
          Object.keys(studentData).forEach(k => sanitizedData[k] = sanitizeValue(studentData[k]));

          if (sanitizedData.startDate) {
              const dateObj = normalizeDate(sanitizedData.startDate);
              if (dateObj) {
                  sanitizedData.startDate = format(dateObj, 'dd/MM/yy');
                  const durationText = sanitizedData.duration || '1 month';
                  const deadlineDate = calculateDeadline(dateObj, durationText);
                  sanitizedData.deadline = format(deadlineDate, 'dd/MM/yy');
              }
          }
          return { ...sanitizedData, payments };
      });
    } catch (error: any) {
      if (typeof isQuotaError === 'function' && isQuotaError(error) && i < availableKeys.length - 1) {
        console.warn(`Gemini Key #${i + 1} exhausted in parseStudentData. Rotating...`);
        continue;
      }
      console.error('GenAI Error:', error);
      return null;
    }
  }
  return null;
};