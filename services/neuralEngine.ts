import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { NeuralEngine, QuickSource, OutlineItem, ExternalKeys } from "../types";

export interface NeuralResult {
  text: string;
  thought?: string;
  keyUsed?: string;
}

// ==========================================
//  KEY ROTATION ENGINE (Supports 2+ Keys)
// ==========================================
export const getGeminiKeys = (userKey?: string): string[] => {
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

function isRetryableError(error: any): boolean {
    const msg = error?.message?.toLowerCase() || "";
    const status = error?.status || error?.code || 0;
    return msg.includes("quota") || 
           msg.includes("429") || 
           msg.includes("resource_exhausted") || 
           msg.includes("limit") || 
           msg.includes("high demand") || 
           msg.includes("unavailable") ||
           msg.includes("503") ||
           status === 429 || 
           status === 503;
}

const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0 || !isRetryableError(error)) throw error;
    console.warn(`AI Synthesis failure (Retryable). Retrying in ${delay}ms...`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 1.5);
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
  
  // Try server proxy first for Gemini models (secure way)
  if (engine.toLowerCase().includes("gemini") && !userKeys[engine]) {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          model: (engine === 'gemini-3-flash-preview' || engine === 'gemini-3.1-flash-lite-preview') 
            ? 'gemini-3-flash-preview' 
            : engine
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return { 
          text: data.text,
          thought: `Neural synthesis complete via secure server proxy.`
        };
      }
    } catch (e) {
      console.warn("Server proxy failed, falling back to client-side direct call", e);
    }
  }

  // Fallback to client-side logic (existing)
  const isGeminiModel = engine.toLowerCase().includes("gemini");
  
  // Use a fallback stable model if a preview/placeholder was passed
  const modelToUse = (engine === 'gemini-3-flash-preview' || engine === 'gemini-3.1-flash-lite-preview') 
    ? 'gemini-3-flash-preview' 
    : engine;

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
            model: modelToUse,
            contents: [{ role: 'user', parts }],
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
        // If Retryable Error and we have more keys, try next key
        if (isRetryableError(error) && i < availableKeys.length - 1) {
          console.warn(`Gemini Key #${i + 1} exhausted or unavailable. Rotating to next key...`);
          continue; 
        }
        // If it's the last key or not a retryable error, show the specific error
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
        return items.map((item: any) => ({
          id: `outline-${Date.now()}-${Math.random()}`,
          title: item.title,
          expanded: true,
          children: item.children ? addIds(item.children) : []
        }));
      };

      return addIds(data);
    } catch (error: any) {
      if (isRetryableError(error) && i < availableKeys.length - 1) {
        continue; // Try next key
      }
      console.error(`Outline generation failed:`, error.message);
      return [];
    }
  }
  return [];
};
