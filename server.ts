import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { MongoClient } from 'mongodb';

let mongoClient: MongoClient | null = null;

async function getMongoDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }
  if (!mongoClient) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    mongoClient = client;
    console.log("Lazily connected to MongoDB database.");
  }

  try {
    // Ping DB to confirm the connection is active and whitelisted
    await mongoClient.db().command({ ping: 1 });
  } catch (err) {
    console.warn("MongoDB client ping failed, resetting connection...", err);
    try {
      await mongoClient.close();
    } catch (_) {}
    mongoClient = null;
    throw err;
  }

  return mongoClient.db();
}

export const app = express();
const PORT = 3000;

// Vercel path-rewrite normalization middleware
app.use((req, res, next) => {
  if (process.env.VERCEL && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));



  // AI Proxy Route
  app.post('/api/ai/generate', async (req, res) => {
    const { prompt, systemInstruction, model } = req.body;
    const rawKeys = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEYS || "";
    const apiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (apiKeys.length === 0) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set in the server environment.' });
    }

    const isRetryableError = (error: any) => {
      const msg = error?.message?.toLowerCase() || "";
      const status = error?.status || error?.code || 500;
      return msg.includes("quota") || msg.includes("429") || msg.includes("high demand") || 
             msg.includes("unavailable") || status === 429 || status === 503;
    };

    for (let i = 0; i < apiKeys.length; i++) {
        let retries = 2;
        const currentKey = apiKeys[i];
        
        while (retries >= 0) {
            try {
                const ai = new GoogleGenAI({ apiKey: currentKey });
                const response = await ai.models.generateContent({
                  model: model || 'gemini-3-flash-preview',
                  contents: prompt,
                  config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7,
                  }
                });

                return res.json({ text: response.text });
            } catch (error: any) {
                if (isRetryableError(error)) {
                    if (retries > 0) {
                        console.warn(`Server AI Proxy: Retryable error on key #${i+1}, retries left: ${retries}`);
                        retries--;
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        continue;
                    } else if (i < apiKeys.length - 1) {
                        console.warn(`Server AI Proxy: Key #${i+1} failed after retries. Rotating...`);
                        break; // Exit while, move to next key in for loop
                    }
                }
                
                // If it's the last key and last retry, or not retryable
                if (i === apiKeys.length - 1 && (retries <= 0 || !isRetryableError(error))) {
                    console.error('AI Proxy Final Error:', error);
                    return res.status(500).json({ error: error.message });
                }
                
                if (!isRetryableError(error)) {
                     return res.status(500).json({ error: error.message });
                }
                break; // move to next key
            }
        }
    }
  });

  // ==========================================
  // Supabase Keep-Alive/Cron API Route
  // ==========================================
  app.get('/api/cron/keep-alive', async (req, res) => {
    console.log("Supabase Keep-Alive Cron triggered.");
    
    // Verify Vercel Cron Secret (if configured to secure against unauthorized triggers)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kugvbcwrjzoxkabpjvcr.supabase.co';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'dummy-key';
    
    if (!supabaseUrl || supabaseUrl.includes('dummy') || !supabaseAnonKey || supabaseAnonKey.includes('dummy')) {
      return res.status(200).json({
        success: false,
        message: 'Supabase credentials are not fully configured in environment variables. Skipped keep-alive ping.',
        config: { url: !!supabaseUrl, key: !!supabaseAnonKey }
      });
    }

    try {
      // Construct the REST API url for querying the chat_history or dps_data table
      const cleanedUrl = supabaseUrl.replace(/\/+$/, "");
      const testPingUrl = `${cleanedUrl}/rest/v1/chat_history?select=id&limit=1`;
      
      console.log(`Pinging Supabase DB at: ${testPingUrl}`);
      
      let response = await fetch(testPingUrl, {
        method: "GET",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Accept: "application/json",
        },
      });

      // Fallback to dps_data if chat_history doesn't exist yet
      if (!response.ok) {
        const dpsPingUrl = `${cleanedUrl}/rest/v1/dps_data?select=updated_at&limit=1`;
        console.log(`chat_history ping failed, trying dps_data: ${dpsPingUrl}`);
        response = await fetch(dpsPingUrl, {
          method: "GET",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            Accept: "application/json",
          },
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Supabase Keep-Alive query completed successfully.");
      
      return res.json({
        success: true,
        message: 'Successfully pinged and made active requests to Supabase database. Project is kept active!',
        timestamp: new Date().toISOString(),
        rows: data.length
      });
    } catch (error: any) {
      console.error("Error keeping Supabase project alive:", error);
      return res.status(500).json({
        success: false,
        error: error.message || String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==========================================
  // MongoDB Real-time Sync API Routes
  // ==========================================
  
  // 1. Connection Status Checking
  app.get('/api/mongodb/status', async (req, res) => {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        return res.json({ configured: false, connected: false, error: "MONGODB_URI is absent from environment variables." });
      }
      await getMongoDb();
      res.json({ configured: true, connected: true, error: null });
    } catch (err: any) {
      res.json({ configured: true, connected: false, error: err.message || String(err) });
    }
  });

  // 2. Load Full App Data Structure
  app.get('/api/mongodb/data', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }
    try {
      const db = await getMongoDb();

      // Parallel reads for optimal performance
      const [
        userRecord,
        studentsList,
        habitsList,
        expensesList,
        journalList,
        attendanceList,
        dpssTopicsList,
        selfLearningTopicsList,
        habitCompletionsList,
        dailyNotesList
      ] = await Promise.all([
        db.collection<any>('users').findOne({ _id: userId }),
        db.collection('students').find({ userId }).toArray(),
        db.collection('habits').find({ userId }).toArray(),
        db.collection('expenses').find({ userId }).toArray(),
        db.collection('journal').find({ userId }).toArray(),
        db.collection('attendance').find({ userId }).toArray(),
        db.collection('dpss_topics').find({ userId }).toArray(),
        db.collection('self_learning_topics').find({ userId }).toArray(),
        db.collection('habit_completions').find({ userId }).toArray(),
        db.collection('daily_notes').find({ userId }).toArray()
      ]);

      // Map Document lists back into Firebase-compatible key-value record maps
      const journalEntries: Record<string, any> = {};
      journalList.forEach(d => {
        const { _id, userId: _, ...entry } = d;
        journalEntries[d.id] = entry;
      });

      const attendance: Record<string, any> = {};
      attendanceList.forEach(d => {
        const { _id, id, userId: _, ...other } = d;
        attendance[d.id] = d.data || other;
      });

      const habitCompletions: Record<string, any> = {};
      habitCompletionsList.forEach(d => {
        const { _id, id, userId: _, ...other } = d;
        habitCompletions[d.id] = d.completions || other;
      });

      const dailyNotes: Record<string, any> = {};
      dailyNotesList.forEach(d => {
        dailyNotes[d.id] = d.content || "";
      });

      // Default settings fallback
      const defaultSettings = {
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
        textFontFamily: "'Inter', sans-serif",
        textFontSize: 16,
        backgroundImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000'
      };

      const compiledData = {
        settings: userRecord?.settings || defaultSettings,
        students: studentsList.map(({ _id, userId: _, ...s }) => s),
        habits: habitsList.map(({ _id, userId: _, ...h }) => h),
        expenses: expensesList.map(({ _id, userId: _, ...e }) => e),
        journalEntries,
        attendance,
        dpssTopics: dpssTopicsList.map(({ _id, userId: _, ...t }) => t),
        selfLearningTopics: selfLearningTopicsList.map(({ _id, userId: _, ...t }) => t),
        habitCompletions,
        dailyNotes
      };

      res.json(compiledData);
    } catch (err: any) {
      console.warn("MongoDB Load Error - falling back:", err.message);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // 3. Save Settings
  app.post('/api/mongodb/save', async (req, res) => {
    const { userId, settings } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      const db = await getMongoDb();
      await db.collection('users').updateOne(
        { _id: userId },
        { $set: { settings, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Save Student record
  app.post('/api/mongodb/student', async (req, res) => {
    const { userId, student } = req.body;
    if (!userId || !student?.id) return res.status(400).json({ error: 'userId and student.id are required' });
    try {
      const db = await getMongoDb();
      await db.collection('students').updateOne(
        { userId, id: student.id },
        { $set: { ...student, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Delete Student record
  app.delete('/api/mongodb/student', async (req, res) => {
    const { userId, id } = req.body;
    if (!userId || !id) return res.status(400).json({ error: 'userId and student.id are required' });
    try {
      const db = await getMongoDb();
      await db.collection('students').deleteOne({ userId, id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Save Attendance record
  app.post('/api/mongodb/attendance', async (req, res) => {
    const { userId, date, data } = req.body;
    if (!userId || !date) return res.status(400).json({ error: 'userId and date are required' });
    try {
      const db = await getMongoDb();
      await db.collection('attendance').updateOne(
        { userId, id: date },
        { $set: { data, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Save / Delete Expense
  app.post('/api/mongodb/expense', async (req, res) => {
    const { userId, expense, isDelete } = req.body;
    if (!userId || !expense?.id) return res.status(400).json({ error: 'userId and expense.id are required' });
    try {
      const db = await getMongoDb();
      if (isDelete) {
        await db.collection('expenses').deleteOne({ userId, id: expense.id });
      } else {
        await db.collection('expenses').updateOne(
          { userId, id: expense.id },
          { $set: { ...expense, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Save Journal Entry
  app.post('/api/mongodb/journal', async (req, res) => {
    const { userId, date, entry } = req.body;
    if (!userId || !date) return res.status(400).json({ error: 'userId and date are required' });
    try {
      const db = await getMongoDb();
      await db.collection('journal').updateOne(
        { userId, id: date },
        { $set: { ...entry, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Save DPSS / Self Learning Topic
  app.post('/api/mongodb/topic', async (req, res) => {
    const { userId, topic, category } = req.body;
    if (!userId || !topic?.id) return res.status(400).json({ error: 'userId and topic.id are required' });
    const coll = category === 'dpss' ? 'dpss_topics' : 'self_learning_topics';
    try {
      const db = await getMongoDb();
      await db.collection(coll).updateOne(
        { userId, id: topic.id },
        { $set: { ...topic, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Delete DPSS / Self Learning Topic
  app.delete('/api/mongodb/topic', async (req, res) => {
    const { userId, id, category } = req.body;
    if (!userId || !id) return res.status(400).json({ error: 'userId and id are required' });
    const coll = category === 'dpss' ? 'dpss_topics' : 'self_learning_topics';
    try {
      const db = await getMongoDb();
      await db.collection(coll).deleteOne({ userId, id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Bulk Topics saving (efficient)
  app.post('/api/mongodb/topics-bulk', async (req, res) => {
    const { userId, topicsToSave, topicIdsToDelete } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    try {
      const db = await getMongoDb();
      
      const bulkOps: Record<string, any[]> = {
        dpss_topics: [],
        self_learning_topics: []
      };

      topicsToSave?.forEach(({ topic, category }: any) => {
        const coll = category === 'dpss' ? 'dpss_topics' : 'self_learning_topics';
        bulkOps[coll].push({
          updateOne: {
            filter: { userId, id: topic.id },
            update: { $set: { ...topic, updatedAt: new Date().toISOString() } },
            upsert: true
          }
        });
      });

      topicIdsToDelete?.forEach(({ id, category }: any) => {
        const coll = category === 'dpss' ? 'dpss_topics' : 'self_learning_topics';
        bulkOps[coll].push({
          deleteOne: {
            filter: { userId, id }
          }
        });
      });

      await Promise.all([
        bulkOps.dpss_topics.length > 0 ? db.collection('dpss_topics').bulkWrite(bulkOps.dpss_topics) : Promise.resolve(),
        bulkOps.self_learning_topics.length > 0 ? db.collection('self_learning_topics').bulkWrite(bulkOps.self_learning_topics) : Promise.resolve(),
      ]);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Save Daily Notes content
  app.post('/api/mongodb/daily-note', async (req, res) => {
    const { userId, date, content } = req.body;
    if (!userId || !date) return res.status(400).json({ error: 'userId and date are required' });
    try {
      const db = await getMongoDb();
      await db.collection('daily_notes').updateOne(
        { userId, id: date },
        { $set: { content, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Save Habits list
  app.post('/api/mongodb/habits', async (req, res) => {
    const { userId, habits } = req.body;
    if (!userId || !Array.isArray(habits)) return res.status(400).json({ error: 'userId and habits array are required' });
    try {
      if (habits.length === 0) return res.json({ success: true });
      const db = await getMongoDb();
      const operations = habits.map((h: any) => ({
        updateOne: {
          filter: { userId, id: h.id },
          update: { $set: { ...h, updatedAt: new Date().toISOString() } },
          upsert: true
        }
      }));
      await db.collection('habits').bulkWrite(operations);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Delete Habit record
  app.delete('/api/mongodb/habit', async (req, res) => {
    const { userId, id } = req.body;
    if (!userId || !id) return res.status(400).json({ error: 'userId and habit.id are required' });
    try {
      const db = await getMongoDb();
      await db.collection('habits').deleteOne({ userId, id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Save Habits completions
  app.post('/api/mongodb/habit-completion', async (req, res) => {
    const { userId, date, completions } = req.body;
    if (!userId || !date) return res.status(400).json({ error: 'userId and date are required' });
    try {
      const db = await getMongoDb();
      await db.collection('habit_completions').updateOne(
        { userId, id: date },
        { $set: { completions, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 16. Share document metadata (supports offline compilation)
  app.post('/api/mongodb/share', async (req, res) => {
    const { shareId, metadata } = req.body;
    if (!shareId || !metadata) return res.status(400).json({ error: 'shareId and metadata are required' });
    try {
      const db = await getMongoDb();
      await db.collection('shared_notes').updateOne(
        { _id: shareId },
        { $set: { ...metadata, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 17. Load shared element
  app.get('/api/mongodb/share/:shareId', async (req, res) => {
    const { shareId } = req.params;
    try {
      const db = await getMongoDb();
      const note = await db.collection<any>('shared_notes').findOne({ _id: shareId });
      if (!note) {
        return res.status(404).json({ error: 'Shared content has expired or is invalid.' });
      }
      res.json(note);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Middleware
  async function startServer() {
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
      // Static file serving and wildcard SPA routes are disabled on Vercel serverless environments.
      // Doing this here in Vercel lambdas is dangerous and unnecessary as Vercel serves static files directly from its CDN.
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get(/.*$/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    }
  }

  // Global Express Error-handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled Server Error Catch:', err);
    res.status(500).json({
      error: err?.message || 'An unexpected server error occurred.',
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined
    });
  });

  // Global process exception boundaries to prevent hard crashes
  process.on('unhandledRejection', (reason) => {
    console.error('Global Unhandled Rejection:', reason);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Global Uncaught Exception:', error);
  });

  startServer().catch(err => {
    console.error('Initial server startup error:', err);
  });
