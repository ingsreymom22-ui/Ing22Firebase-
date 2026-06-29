import React, { useState } from 'react';
import { Copy, Check, Database, ExternalLink, Terminal } from 'lucide-react';

const SUPABASE_SQL = `-- 1. Create the data synchronization table
CREATE TABLE IF NOT EXISTS public.dps_data (
    owner_id UUID PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create the shares table (REQUIRED for Cloud Links)
CREATE TABLE IF NOT EXISTS public.dps_shares (
    id TEXT PRIMARY KEY,
    owner_id UUID,
    owner_name TEXT,
    type TEXT,
    title TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create the backups table
CREATE TABLE IF NOT EXISTS public.dps_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL,
    data JSONB NOT NULL,
    type TEXT DEFAULT 'Manual',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Enable Row Level Security
ALTER TABLE public.dps_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dps_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dps_backups ENABLE ROW LEVEL SECURITY;

-- 5. Security Policies (Idempotent setup)
-- Drop existing policies first to avoid "already exists" errors
DROP POLICY IF EXISTS "Users manage own data" ON public.dps_data;
DROP POLICY IF EXISTS "Anyone reads shares" ON public.dps_shares;
DROP POLICY IF EXISTS "Users insert their shares" ON public.dps_shares;
DROP POLICY IF EXISTS "Users manage own backups" ON public.dps_backups;

-- Re-create policies
CREATE POLICY "Users manage own data" ON public.dps_data FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Anyone reads shares" ON public.dps_shares FOR SELECT USING (true);
CREATE POLICY "Users insert their shares" ON public.dps_shares FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own backups" ON public.dps_backups FOR ALL USING (auth.uid() = owner_id);

-- 6. Performance: Force full JSON payloads for WebSockets
ALTER TABLE public.dps_data REPLICA IDENTITY FULL;
ALTER TABLE public.dps_shares REPLICA IDENTITY FULL;

-- 7. Enable Real-Time Broadcasts
-- We wrap this in a DO block to avoid errors if already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'dps_data'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dps_data;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'dps_shares'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dps_shares;
    END IF;
END $$;`;;

export const SupabaseSetupHelper: React.FC = () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(SUPABASE_SQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border border-slate-700 shadow-2xl max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-500/20 rounded-2xl">
                    <Database className="text-orange-500" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Cloud Database Setup</h2>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">Fix "missing table" errors in 1 minute</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <p className="text-sm leading-relaxed text-slate-300">
                        To enable cloud synchronization and sharing, you must create the necessary tables in your 
                        <span className="text-orange-400 px-1.5 font-bold">Supabase SQL Editor</span>.
                    </p>
                </div>

                <div className="relative group">
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all active:scale-95 text-xs font-bold uppercase tracking-widest"
                        >
                            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            {copied ? "Copied SQL!" : "Copy SQL Script"}
                        </button>
                    </div>
                    
                    <div className="bg-black/40 rounded-2xl border border-slate-800 p-4 font-mono text-[10px] leading-tight text-slate-400 overflow-x-auto max-h-60 scrollbar-hide">
                        <pre>{SUPABASE_SQL}</pre>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    <a 
                        href="https://supabase.com/dashboard" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl transition-all"
                    >
                        <ExternalLink size={16} className="text-orange-500" />
                        <span className="text-xs font-black uppercase tracking-widest">Open Supabase Dashboard</span>
                    </a>
                    <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                        <Terminal size={16} className="text-orange-500 shrink-0" />
                        <p className="text-[10px] text-orange-200 leading-tight italic font-medium">
                            Paste the code into the SQL Editor and click "Run" to initialize your database.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
