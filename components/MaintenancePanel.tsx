import React, { useState, useEffect, useMemo } from 'react';
import { AppData, BackupEntry, ModuleLocks } from '../types';
import { 
  ShieldCheck, RefreshCw, Clock, Lock, Unlock, Download, Upload, Database, ExternalLink, Camera, Sparkles,
  CalendarDays, CalendarRange, History
} from 'lucide-react';
import { getCloudBackups, createCloudBackup, getFirebaseProjectId } from '../services/firebase';
import { format, differenceInDays } from 'date-fns';

interface Props {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  currentUser: any;
}

export const MaintenancePanel: React.FC<Props> = ({ data, onUpdate, currentUser }) => {
  const [backups, setBackups] = useState<Partial<BackupEntry>[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [activeTab, setActiveTab] = useState<'Backups' | 'Safety' | 'Locks'>('Backups');

  const [syncStatus, setSyncStatus] = useState<{ configured: boolean; connected: boolean; error: string | null }>({
    configured: false,
    connected: false,
    error: null
  });
  const [checkingSync, setCheckingSync] = useState(false);

  const [driveConnected, setDriveConnected] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
    return localStorage.getItem('dps_drive_autobackup') === 'true';
  });
  const [driveUploading, setDriveUploading] = useState(false);

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const { connectGoogleDrive } = await import('../services/googleDrive');
      const token = await connectGoogleDrive();
      if (token) {
        setDriveConnected(true);
        alert("Google Drive Connected! You can now enable Auto-Backup.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to connect Drive: " + err.message);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const toggleAutoBackup = () => {
    const newState = !autoBackupEnabled;
    setAutoBackupEnabled(newState);
    localStorage.setItem('dps_drive_autobackup', newState.toString());
  };

  const forceDriveUpload = async () => {
    setDriveUploading(true);
    try {
      const { uploadDataToDrive } = await import('../services/googleDrive');
      await uploadDataToDrive(data);
      alert("Database manually synced to Google Drive!");
    } catch (err: any) {
      console.error(err);
      alert("Backup to Drive failed: " + err.message);
    } finally {
      setDriveUploading(false);
    }
  };

  const checkSyncStatus = async () => {
    setCheckingSync(true);
    try {
      const { isFirebaseConfigured, checkFirebaseConnection } = await import('../services/firebase');
      const configured = isFirebaseConfigured();
      const connected = await checkFirebaseConnection();
      setSyncStatus({ 
        configured, 
        connected, 
        error: !configured ? "Environment variables missing." : (connected ? null : "Could not reach Firebase.")
      });
    } catch (err: any) {
      setSyncStatus({ configured: false, connected: false, error: err.message || String(err) });
    } finally {
      setCheckingSync(false);
    }
  };

  const FIREBASE_SETUP_INFO = `
Firestore Security Rules:
service cloud.firestore {
  match /databases/{database}/documents {
    match /dps_data/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
  `.trim();

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIREBASE_SETUP_INFO);
    alert("Firebase Rules copied to clipboard!");
  };

  useEffect(() => {
    checkSyncStatus();
  }, []);

  const fetchBackups = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    const list = await getCloudBackups(currentUser.uid);
    setBackups(list);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'Backups') fetchBackups();
  }, [activeTab]);

  // Logic to identify Key Restore Points (Daily, Weekly, Monthly)
  const keyRestorePoints = useMemo(() => {
    if (backups.length === 0) return { daily: null, weekly: null, monthly: null };

    const sorted = [...backups].sort((a, b) => 
      new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
    );

    const now = new Date();
    
    // Find latest backup that is at least 1 day old for "Daily"
    const daily = sorted.find(b => differenceInDays(now, new Date(b.timestamp!)) >= 1);
    
    // Find latest backup that is at least 7 days old for "Weekly"
    const weekly = sorted.find(b => differenceInDays(now, new Date(b.timestamp!)) >= 7);
    
    // Find latest backup that is at least 30 days old for "Monthly"
    const monthly = sorted.find(b => differenceInDays(now, new Date(b.timestamp!)) >= 30);

    return { daily, weekly, monthly };
  }, [backups]);

  const handleCreateSnapshot = async () => {
    if (creatingBackup || !currentUser?.uid) return;
    setCreatingBackup(true);
    try {
        await createCloudBackup(currentUser.uid, data);
        await fetchBackups();
        alert("Manual Snapshot created successfully!");
    } catch (err) {
        alert("Failed to create snapshot.");
    } finally {
        setCreatingBackup(false);
    }
  };

  const toggleModuleLock = (module: keyof ModuleLocks) => {
    const currentLocks = data.moduleLocks || { Hall: false, Attendance: false, Finance: false };
    const newState = !currentLocks[module];
    onUpdate({
        ...data,
        moduleLocks: { ...currentLocks, [module]: newState }
    });
  };

  const handleRestore = async (backup: any) => {
    if (confirm(`CRITICAL WARNING: You are about to restore data from ${format(new Date(backup.timestamp), 'PPPP p')}. This will delete all changes made after that time. Are you sure?`)) {
       try {
         setLoading(true);
         const { fetchBackupPayload } = await import('../services/firebase');
         const fullData = await fetchBackupPayload(backup);
         if (fullData) {
           onUpdate({ ...fullData, systemLocked: false });
           alert("System Restored Successfully!");
         } else {
           alert("Failed to restore: Backup data is corrupted or missing.");
         }
       } catch (err) {
         console.error("Restore failed", err);
         alert("Restore failed. Please check your connection.");
       } finally {
         setLoading(false);
       }
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden bg-slate-50">
      <div className="max-w-6xl mx-auto w-full space-y-8 h-full flex flex-col">
        
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                    <ShieldCheck size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-[#1B254B] uppercase tracking-tighter leading-none">Maintenance & Recovery</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-widest">Admin Control • Data Integrity • Cloud Snapshots</p>
                </div>
            </div>

            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                {(['Backups', 'Safety', 'Locks'] as const).map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                            activeTab === tab ? 'bg-[#1B254B] text-white shadow-lg' : 'text-slate-500 hover:text-[#1B254B]'
                        }`}
                    >
                        {tab === 'Locks' ? 'Module Locks' : tab}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {activeTab === 'Locks' && (
                <div className="p-12 space-y-10">
                    <div className="text-center max-w-xl mx-auto">
                        <h3 className="text-2xl font-black text-[#1B254B] uppercase mb-2">Module Security Matrix</h3>
                        <p className="text-sm text-slate-500 font-medium">When locked, users can view data but CANNOT add, edit, or delete any records. Locks are applied instantly 100%.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(['Hall', 'Attendance', 'Finance'] as const).map(module => {
                            const isLocked = data.moduleLocks?.[module] || false;
                            return (
                                <div key={module} className={`p-8 rounded-[32px] border-2 transition-all flex flex-col items-center text-center gap-4 ${isLocked ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-white hover:border-indigo-100'}`}>
                                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-2 ${isLocked ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-100 text-slate-400'}`}>
                                        {isLocked ? <Lock size={32} /> : <Unlock size={32} />}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-[#1B254B] uppercase text-lg">{module} Study</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Status: {isLocked ? 'Locked (100%)' : 'Open'}</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleModuleLock(module)}
                                        className={`mt-4 w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isLocked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
                                    >
                                        {isLocked ? `Unlock ${module}` : `Lock ${module} 100%`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'Backups' && (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                             <History className="text-emerald-500" />
                             <div>
                                <h3 className="text-xl font-black text-[#1B254B] uppercase">Restore Hub</h3>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Recover accidentally deleted data from previous states</p>
                             </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleCreateSnapshot}
                                disabled={creatingBackup}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                            >
                                {creatingBackup ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />} 
                                {creatingBackup ? 'Saving State...' : 'Manual Snapshot'}
                            </button>
                            <button onClick={fetchBackups} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-primary-500 transition-all shadow-sm">
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        
                        {/* Summary restore points */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Daily Restore', point: keyRestorePoints.daily, icon: CalendarDays, color: 'blue' },
                                { label: 'Weekly Restore', point: keyRestorePoints.weekly, icon: CalendarRange, color: 'indigo' },
                                { label: 'Monthly Restore', point: keyRestorePoints.monthly, icon: CalendarDays, color: 'purple' }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center gap-4 hover:border-primary-500 transition-all group">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform`}>
                                        <item.icon size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-[#1B254B] uppercase">{item.label}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                            {item.point ? format(new Date(item.point.timestamp!), 'PP') : 'No Point Found'}
                                        </p>
                                    </div>
                                    <button 
                                        disabled={!item.point}
                                        onClick={() => handleRestore(item.point as BackupEntry)}
                                        className={`mt-2 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            item.point ? 'bg-slate-800 text-white hover:bg-black' : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                        }`}
                                    >
                                        Restore this point
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[4px] pl-2 mb-4">Detailed Snapshot History</h3>
                            {backups.length === 0 && !loading ? (
                                <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
                                    <Sparkles className="mx-auto text-slate-200 mb-4" size={48} />
                                    <p className="font-black text-slate-300 uppercase tracking-widest text-sm">No snapshots found yet</p>
                                </div>
                            ) : backups.map((b) => (
                                <div key={b.id} className="bg-white border border-slate-100 p-6 rounded-[30px] flex items-center justify-between hover:border-indigo-500 transition-all group shadow-sm">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${b.type === 'Auto' ? 'bg-emerald-500 text-white' : 'bg-green-500 text-white'}`}>
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-lg font-black text-[#1B254B] uppercase leading-none">{b.type} Snapshot</h4>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${b.type === 'Auto' ? 'bg-emerald-100 text-emerald-600' : 'bg-green-100 text-green-600'}`}>
                                                    {b.type === 'Auto' ? 'AUTO' : 'MANUAL'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{format(new Date(b.timestamp!), 'PPPP p')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleRestore(b as BackupEntry)} 
                                            className="px-6 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Restore Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Firebase Integration Control Panel */}
                        <div className="bg-slate-50 border border-slate-200 p-8 rounded-[40px] mt-12 space-y-6">
                            <div className="flex items-start justify-between gap-6 flex-wrap md:flex-nowrap">
                                <div className="flex items-start gap-5">
                                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center border shadow-sm transition-all ${
                                        syncStatus.connected 
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100' 
                                            : !syncStatus.configured 
                                                ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-amber-100' 
                                                : 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-100'
                                    }`}>
                                        <Database size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-black text-slate-800 uppercase text-base tracking-tight leading-none">Firebase Cloud Database</h4>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded">
                                                Project: {getFirebaseProjectId()}
                                              </span>
                                              {currentUser?.uid && (
                                                <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded">
                                                  Auth: {currentUser.uid.substring(0, 8)}...
                                                </span>
                                              )}
                                            </div>
                                            {syncStatus.connected ? (
                                                <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Active Cloud Sync
                                                </span>
                                            ) : !syncStatus.configured ? (
                                                <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 bg-amber-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                    Missing Configuration
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-[9px] font-black text-rose-600 bg-rose-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                    Connection Issue
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {syncStatus.connected 
                                                ? "Your master digital portal sheets, topics, and student ledger are actively saved in Firebase. Real-time multi-browser sync is enabled."
                                                : !syncStatus.configured 
                                                    ? "Connected to reactive local database storage. Please configure Firebase to synchronize records globally."
                                                    : `An issue occurred while reaching your Firebase project: ${syncStatus.error}`
                                            }
                                        </p>
                                        
                                        <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5 shadow-sm">
                                          <h5 className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">Vercel & Deployment Sync Notice</h5>
                                          <p className="text-[9px] text-indigo-700 leading-relaxed font-bold">
                                            If redeploying on Vercel, ensure you include your <span className="text-indigo-900 underline decoration-indigo-300">firebase-applet-config.json</span>. 
                                          </p>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={checkSyncStatus}
                                    disabled={checkingSync}
                                    className="px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase shadow-xs hover:border-indigo-500 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                                >
                                    <RefreshCw size={14} className={checkingSync ? "animate-spin" : ""} />
                                    {checkingSync ? "Pinging..." : "Test Link"}
                                </button>
                            </div>

                            {!syncStatus.connected && (
                                <div className="p-6 bg-slate-100/50 rounded-3xl border border-slate-200/60 text-xs text-slate-600 space-y-5">
                                    <div className="flex items-center gap-2 text-rose-800 font-bold uppercase tracking-widest text-[11px]">
                                        <Sparkles size={14} className="text-orange-500" />
                                        ⚡ Firebase Cloud Sync Setup
                                    </div>

                                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl space-y-3">
                                        <p className="font-bold text-orange-950 text-xs leading-snug underline">👉 CRITICAL Vercel Setup:</p>
                                        <p className="text-[10px] text-orange-900 font-medium leading-relaxed">
                                          Ensure your project config is intact during deployment.
                                        </p>
                                    </div>

                                    <div className="text-slate-800 font-bold uppercase tracking-wide text-[10px]">
                                        🛠️ Vercel Deployment Sync Steps
                                    </div>
                                    <ul className="list-disc list-inside space-y-2 pl-1 leading-relaxed text-[11px] font-medium text-slate-500">
                                        <li>Go to your **Vercel Project Settings**.</li>
                                        <li>Make sure `firebase-applet-config.json` is deployed.</li>
                                        <li>Redeploy your application on Vercel.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Safety' && (
                <div className="p-12 space-y-12 max-w-2xl mx-auto w-full overflow-y-auto">
                    <div className="text-center">
                        <h3 className="text-2xl font-black text-[#1B254B] uppercase mb-1">Manual Data Portability</h3>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Physical backups for your own Google Drive or PC</p>
                    </div>

                    <div className="grid gap-6">
                        {/* Google Drive Auto Backup */}
                        <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 shrink-0">
                                    <Cloud size={32} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-[#1B254B] uppercase tracking-tighter">Google Drive Auto-Backup</h4>
                                    <p className="text-sm text-slate-500 mt-1 font-medium max-w-lg">
                                        Securely mirror your data directly to your personal Google Drive. 
                                        Once enabled, your database will be automatically exported when significant changes occur.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                                {!driveConnected ? (
                                    <button 
                                        onClick={handleConnectDrive}
                                        disabled={isConnectingDrive}
                                        className="w-full md:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isConnectingDrive ? <RefreshCw size={16} className="animate-spin" /> : <Cloud size={16} />}
                                        Connect Google Drive
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-3 w-full">
                                        <button 
                                            onClick={toggleAutoBackup}
                                            className={`w-full px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 border-2 ${
                                                autoBackupEnabled 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-500 hover:bg-emerald-100' 
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            {autoBackupEnabled ? <Check size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                                            {autoBackupEnabled ? 'Auto-Backup Active' : 'Enable Auto-Backup'}
                                        </button>
                                        
                                        <button 
                                            onClick={forceDriveUpload}
                                            disabled={driveUploading}
                                            className="w-full px-6 py-3 bg-[#1B254B] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {driveUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                            Force Sync Now
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-200 flex items-center gap-8 shadow-sm">
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-primary-500 shadow-xl border border-slate-100">
                                <Download size={32} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-[#1B254B] uppercase">Download Database File</h4>
                                <p className="text-xs text-slate-500 mt-1">Export your entire school data as a JSON file. We recommend doing this once a week and uploading it to your Google Drive.</p>
                                <button 
                                    onClick={() => { const blob = new Blob([JSON.stringify(data)], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `dpss_backup_${format(new Date(), 'yyyy-MM-dd')}.json`; a.click(); }}
                                    className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-primary-500/30"
                                >
                                    Export JSON
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-200 flex items-center gap-8 shadow-sm">
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-500 shadow-xl border border-slate-100">
                                <Upload size={32} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-[#1B254B] uppercase">Import Backup File</h4>
                                <p className="text-xs text-slate-500 mt-1">Upload a previously exported JSON file to restore the portal state. This overwrites all current cloud data.</p>
                                <label className="inline-block mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-emerald-500/30">
                                    Upload JSON
                                    <input type="file" className="hidden" accept=".json" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            try {
                                                const imported = JSON.parse(event.target?.result as string);
                                                if (imported.students && Array.isArray(imported.students)) {
                                                    if (confirm("Restore entire database from this file? Current data will be lost.")) {
                                                        onUpdate(imported);
                                                    }
                                                } else { alert("Invalid backup file."); }
                                            } catch (err) { alert("Error reading file."); }
                                        };
                                        reader.readAsText(file);
                                    }} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};