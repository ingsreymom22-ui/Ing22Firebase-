import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, CurrentUser, AppData } from '../types';
import { X, Save, Settings2, Type, Baseline, Paintbrush, Check, Cloud, LogIn, LogOut, Image as ImageIcon, Trash2, FileText, Coins, Table, Download, Upload, RefreshCw, ExternalLink } from 'lucide-react';
import { PAPER_STYLES } from '../src/styles/paperStyles';
import { getFirebaseProjectId } from '../services/firebase';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  currentUser?: CurrentUser | null;
  onLogin?: () => void;
  onPhoneLogin?: (user: any) => void;
  onLogout?: () => void;
  appData?: AppData;
  onImportData?: (importedData: AppData) => void;
}

const fontFamilies = [
  { name: 'System Default', value: 'ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { name: 'Modern', value: '"Inter", sans-serif' },
  { name: 'Technical', value: '"JetBrains Mono", monospace' },
  { name: 'Elegant Serif', value: '"Playfair Display", serif' },
  { name: 'Playful', value: '"Comic Neue", "Comic Sans MS", cursive, sans-serif' },
  { name: 'Handwriting', value: '"Caveat", "Dancing Script", cursive' }
];

const colors = [
  { name: 'Default Dark', value: '#0f172a' },
  { name: 'Slate', value: '#334155' },
  { name: 'Midnight Blue', value: '#1e3a8a' },
  { name: 'Emerald', value: '#047857' },
  { name: 'Rose', value: '#be123c' },
  { name: 'Amber', value: '#b45309' },
];

const COLOR_PALETTES = [
  {
    name: 'Cosmic Lavender',
    fontColor: '#4c1d95',
    appBackgroundColor: '#faf5ff',
    dateTextColor: '#8b5cf6'
  },
  {
    name: 'Forest Sage',
    fontColor: '#064e3b',
    appBackgroundColor: '#ecfdf5',
    dateTextColor: '#10b981'
  },
  {
    name: 'Nordic Slate',
    fontColor: '#0f172a',
    appBackgroundColor: '#f1f5f9',
    dateTextColor: '#475569'
  },
  {
    name: 'Sunset Glow',
    fontColor: '#78350f',
    appBackgroundColor: '#fffbeb',
    dateTextColor: '#d97706'
  },
  {
    name: 'Rose Quartz',
    fontColor: '#4c0519',
    appBackgroundColor: '#fff1f2',
    dateTextColor: '#f43f5e'
  },
  {
    name: 'Classic Ivory',
    fontColor: '#0f172a',
    appBackgroundColor: '#fafaf9',
    dateTextColor: '#f97316'
  }
];

const ABSTRACT_BACKGROUND_PRESETS = [
  { name: 'Pure White', url: 'solid-white' },
  { name: 'Aurora Velvet', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2000' },
  { name: 'Liquid Emerald', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000' },
  { name: 'Holographic Silk', url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?auto=format&fit=crop&q=80&w=2000' },
  { name: 'Orchid Dream', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=2000' },
  { name: 'Pastel Ribbon', url: 'https://images.unsplash.com/photo-1550537687-c91072c4792d?auto=format&fit=crop&q=80&w=2000' },
  { name: 'Neon Cyberpunk', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=2000' },
  { name: 'Minimal Alabaster', url: 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&q=80&w=2000' },
  { name: 'Abstract Nebula', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&q=80&w=2000' }
];

const WALLPAPER_PRESETS_GROUPED = {
  'Light Purple': [
    { name: 'Lavender Mist', url: 'https://images.unsplash.com/photo-1550537687-c91072c4792d?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Purple Dreamscape', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Soft Purple Dawn', url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Amethyst Texture', url: 'https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Washi Purple', url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Lilac Floral Mix', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Lavender Field', url: 'https://images.unsplash.com/photo-1520038410233-7141be7b6f97?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Purple Hues', url: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Soft Purple Sky', url: 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Violet Waves', url: 'https://images.unsplash.com/photo-1528465424850-54d22f092f9d?auto=format&fit=crop&q=80&w=2000' },
  ],
  'Light Green': [
    { name: 'Whispering Willow Leaves', url: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Mindful Sage Paint', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Botanical Fern', url: 'https://images.unsplash.com/photo-1501004318641-724e645197c2?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Matcha Greens', url: 'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Mint Morning Dew', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Serenity Green Space', url: 'https://images.unsplash.com/photo-1505506874110-6a7a48e1a1bd?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Light Olive Texture', url: 'https://images.unsplash.com/photo-1533038590840-1cbea6e8140f?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Pale Green Flora', url: 'https://images.unsplash.com/photo-1517482811406-8c20577d4c0b?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Subtle Celadon', url: 'https://images.unsplash.com/photo-1549488344-c5a4d67cd2b2?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Green Minimalist Canvas', url: 'https://images.unsplash.com/photo-1533227260815-a56cf099f6b9?auto=format&fit=crop&q=80&w=2000' },
  ],
  'Light White': [
    { name: 'Serenity Ivory Plaster', url: 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Minimal Alabaster Silk', url: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Pure Cotton', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Clean Desk Space', url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26f5d?auto=format&fit=crop&q=80&w=2000' },
    { name: 'White Marble Clean', url: 'https://images.unsplash.com/photo-1506084803934-8c858bd966aa?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Soft Light Texture', url: 'https://images.unsplash.com/photo-1495195129352-aeb325a55b65?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Cloud White Blank', url: 'https://images.unsplash.com/photo-1502239608882-93b729c6af43?auto=format&fit=crop&q=80&w=2000' },
    { name: 'White Aesthetic Minimal', url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Snow Soft Morning', url: 'https://images.unsplash.com/photo-1486520299386-6d106b22014b?auto=format&fit=crop&q=80&w=2000' },
    { name: 'White Linen Feel', url: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&q=80&w=2000' },
  ],
  'Light Gray': [
    { name: 'Minimal Solid Slate Light', url: 'https://images.unsplash.com/photo-1533035353720-f1c6a75cd8ab?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Silver Tone Clean', url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Grey Minimal Architecture', url: 'https://images.unsplash.com/photo-1515549832467-8783363e19b6?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Dusty Fog Calm', url: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Ash Grey Gradient', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Pebble Smooth Concept', url: 'https://images.unsplash.com/photo-1513569771920-c9e1d31714fc?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Concrete Gentle Textures', url: 'https://images.unsplash.com/photo-1477505982272-dec890ae6bff?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Foggy Stone Blur', url: 'https://images.unsplash.com/photo-1444491741275-3747c53c99b4?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Soft Neutral Gray', url: 'https://images.unsplash.com/photo-1481555716071-8830d1e5c6ec?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Grey Monochrome Abstract', url: 'https://images.unsplash.com/photo-1470790376778-a9fbc86d70e2?auto=format&fit=crop&q=80&w=2000' },
  ],
  'Orange': [
    { name: 'Sunlit Sandy Canyons', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Autumn Amber Pathway', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Golden Quartz Horizon', url: 'https://images.unsplash.com/photo-1553570739-300e6e7373f6?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Tangerine Dream', url: 'https://images.unsplash.com/photo-1497215848128-444fc6ad4931?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Soft Citrus Light', url: 'https://images.unsplash.com/photo-1517614081395-65cf8593cc18?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Apricot Sky Setting', url: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Coral Warmth', url: 'https://images.unsplash.com/photo-1460505193952-b88d4474fdd9?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Persimmon Autumn', url: 'https://images.unsplash.com/photo-1533664404090-e555986fe7f0?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Light Orange Abstract', url: 'https://images.unsplash.com/photo-1555519894-3a56885dfd78?auto=format&fit=crop&q=80&w=2000' },
    { name: 'Marigold Calm Scene', url: 'https://images.unsplash.com/photo-1490680194605-e4d06a4cb991?auto=format&fit=crop&q=80&w=2000' }
  ]
};

import config from '../firebase-applet-config.json';
const getDirectAuthProvidersUrl = (): string => {
  return `https://console.firebase.google.com/project/${config.projectId}/authentication/providers`;
};
const getFirebaseDomainsUrl = (): string => {
  return `https://console.firebase.google.com/project/${config.projectId}/authentication/settings`;
};

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onUpdate, currentUser, onLogin, onPhoneLogin, onLogout, appData, onImportData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  
  const [localSettings, setLocalSettings] = useState<AppSettings>({
    fontFamily: settings?.fontFamily || 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontSize: settings?.fontSize || 16,
    textFontFamily: settings?.textFontFamily || 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    textFontSize: settings?.textFontSize || 16,
    fontColor: settings?.fontColor || '#0f172a',
    appBackgroundColor: settings?.appBackgroundColor || (settings?.backgroundImage === 'solid-white' ? '#ffffff' : ''),
    dateTextColor: settings?.dateTextColor || '#f97316',
    currency: settings?.currency || 'USD',
    exchangeRate: settings?.exchangeRate || 4000,
    backgroundImage: settings?.backgroundImage || 'solid-white',
    backgroundImageBlur: settings?.backgroundImageBlur || 0,
    backgroundDimOpacity: settings?.backgroundDimOpacity !== undefined ? settings.backgroundDimOpacity : (settings?.backgroundImage === 'solid-white' ? 0 : 20),
    paperStyle: settings?.paperStyle || 'none',
    tableBorderThickness: settings?.tableBorderThickness || 2,
    tableBorderColor: settings?.tableBorderColor || '#334155',
    dailyPerformanceSymbol: settings?.dailyPerformanceSymbol || 'star',
    priorities: settings?.priorities || []
  });

  const updateSettingsRealtimeMultiple = (updates: Partial<AppSettings>) => {
    setLocalSettings(prev => {
      const next = { ...prev, ...updates };
      onUpdate({ ...settings, ...next });
      return next;
    });
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const [syncStatus, setSyncStatus] = useState<{ configured: boolean; connected: boolean; error: string | null }>({
    configured: false,
    connected: false,
    error: null
  });
  const [checkingSync, setCheckingSync] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      checkSyncStatus();
    }
  }, [isOpen]);

  const handleDownloadJSON = () => {
    if (!appData) return;
    try {
      const json = JSON.stringify(appData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      const date = new Date().toISOString().split('T')[0];
      downloadAnchor.download = `growth-portal-backup-${date}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert("Error generating manual backup file");
    }
  };

  const handlePrintJournalAndTasks = () => {
    if (!appData) return;
    try {
      const journalEntries = appData.journalEntries || {};
      const tasks = appData.dailyPerformanceTasks || [];
      const completions = appData.dailyPerformanceCompletions || {};
      
      const sortedDates = Object.keys(journalEntries).sort().reverse();
      
      // Calculate completion statistics
      const totalTasks = tasks.length;
      let totalCompletedCount = 0;
      let totalOpportunityCount = 0;

      Object.keys(completions).forEach(dateKey => {
         const dayComp = completions[dateKey] || {};
         tasks.forEach(t => {
            totalOpportunityCount++;
            if (dayComp[t.id]) totalCompletedCount++;
         });
      });

      const overallCompletionRate = totalOpportunityCount > 0 
         ? Math.round((totalCompletedCount / totalOpportunityCount) * 100) 
         : 0;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Growth Portal - Journals & Task Performance Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 40px;
              line-height: 1.5;
            }
            .container {
              max-width: 850px;
              margin: 0 auto;
              background: #ffffff;
              padding: 50px;
              border-radius: 24px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
              border: 1px solid #e2e8f0;
            }
            .header {
              border-bottom: 3px double #e2e8f0;
              padding-bottom: 25px;
              margin-bottom: 35px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .title {
              font-size: 32px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: -1px;
              color: #0f172a;
              margin: 0;
            }
            .subtitle {
              font-size: 13px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-top: 5px;
            }
            .meta-info {
              text-align: right;
              font-size: 11px;
              font-weight: 700;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .stat-grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 40px;
            }
            .stat-card {
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              padding: 15px;
              border-radius: 12px;
              text-align: center;
            }
            .stat-value {
              font-size: 24px;
              font-weight: 900;
              color: #4f46e5;
            }
            .stat-label {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 3px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              color: #0f172a;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 5px;
              margin-top: 40px;
              margin-bottom: 20px;
              letter-spacing: 1px;
            }
            .journal-card {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 25px;
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .journal-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 12px;
              margin-bottom: 15px;
            }
            .journal-date {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
            }
            .journal-ratings {
              display: flex;
              gap: 8px;
            }
            .rating-tag {
              font-size: 10px;
              font-weight: 800;
              color: #475569;
              background: #f1f5f9;
              padding: 2px 8px;
              border-radius: 6px;
              text-transform: uppercase;
            }
            .field-group {
              margin-bottom: 15px;
            }
            .field-label {
              font-size: 10px;
              font-weight: 800;
              color: #6366f1;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 2px;
            }
            .field-content {
              font-size: 13px;
              color: #334155;
            }
            ul.journal-list {
              margin: 0;
              padding-left: 18px;
              font-size: 13px;
              color: #334155;
            }
            .task-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .task-table th {
              background: #0f172a;
              color: #ffffff;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 12px;
              text-align: left;
            }
            .task-table td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 12px;
            }
            .task-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .badge-completed {
              background: #dcfce7;
              color: #15803d;
              padding: 2px 8px;
              border-radius: 6px;
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
            }
            .badge-pending {
              background: #fee2e2;
              color: #b91c1c;
              padding: 2px 8px;
              border-radius: 6px;
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
            }
            .print-btn-container {
              text-align: center;
              margin-bottom: 20px;
            }
            .print-btn {
              background: #4f46e5;
              color: #ffffff;
              border: none;
              padding: 12px 24px;
              border-radius: 12px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              transition: all 0.2s;
              font-family: 'Inter', sans-serif;
            }
            .print-btn:hover {
              background: #4338ca;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .container {
                box-shadow: none;
                border: none;
                padding: 0;
              }
              .print-btn-container {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-btn-container">
            <button class="print-btn" onclick="window.print()">Print Report / Save as PDF</button>
          </div>
          <div class="container">
            <div class="header">
              <div>
                <h1 class="title">Growth Portfolio</h1>
                <div class="subtitle">Journals & Tasks History Report</div>
              </div>
              <div class="meta-info">
                Generated On<br/>
                <span style="font-size: 14px; font-weight: 900; color: #0f172a;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-value">${Object.keys(journalEntries).length}</div>
                <div class="stat-label">Total Journals</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${tasks.length}</div>
                <div class="stat-label">Configured Tasks</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${overallCompletionRate}%</div>
                <div class="stat-label">Task Completion</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${Object.keys(completions).length}</div>
                <div class="stat-label">Days Logged</div>
              </div>
            </div>

            <div class="section-title">Daily Performance Task Logs</div>
            <table class="task-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task Name</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${
                  Object.keys(completions).length > 0 ? Object.keys(completions).sort().reverse().map(dateKey => {
                    const dayComp = completions[dateKey] || {};
                    return tasks.map(task => {
                      const isDone = dayComp[task.id] === true;
                      return `
                        <tr>
                          <td style="font-weight: bold;">${dateKey}</td>
                          <td>${task.name}</td>
                          <td>${task.category || 'None'}</td>
                          <td style="font-weight: 600;">${task.priority || 'Medium'}</td>
                          <td>
                            <span class="${isDone ? 'badge-completed' : 'badge-pending'}">
                              ${isDone ? 'Completed' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      `;
                    }).join('');
                  }).join('') : `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No task historical data logged yet.</td></tr>`
                }
              </tbody>
            </table>

            <div class="section-title">Journal Logs</div>
            ${
              sortedDates.length > 0 ? sortedDates.map(dateKey => {
                const entry = journalEntries[dateKey];
                return `
                  <div class="journal-card">
                    <div class="journal-header">
                      <div class="journal-date">${dateKey}</div>
                      <div class="journal-ratings">
                        ${entry.energyRating !== undefined ? `<div class="rating-tag">Energy: ${entry.energyRating}/10</div>` : ''}
                        ${entry.focusRating !== undefined ? `<div class="rating-tag">Focus: ${entry.focusRating}/10</div>` : ''}
                        ${entry.productivityRating !== undefined ? `<div class="rating-tag">Productivity: ${entry.productivityRating}/10</div>` : ''}
                      </div>
                    </div>

                    ${entry.affirmation ? `
                      <div class="field-group">
                        <div class="field-label">Daily Affirmation</div>
                        <div class="field-content" style="font-style: italic; font-weight: 600; color: #475569;">"${entry.affirmation}"</div>
                      </div>
                    ` : ''}

                    ${entry.gratitude ? `
                      <div class="field-group">
                        <div class="field-label">Deep Gratitude</div>
                        <div class="field-content">${entry.gratitude}</div>
                      </div>
                    ` : ''}

                    ${entry.achievements && entry.achievements.length > 0 ? `
                      <div class="field-group">
                        <div class="field-label">Key Achievements</div>
                        <ul class="journal-list">
                          ${entry.achievements.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                      </div>
                    ` : ''}

                    ${entry.learning ? `
                      <div class="field-group">
                        <div class="field-label">Core Learnings</div>
                        <div class="field-content">${entry.learning}</div>
                      </div>
                    ` : ''}

                    ${entry.discipline ? `
                      <div class="field-group">
                        <div class="field-label">Discipline & Routine Notes</div>
                        <div class="field-content">${entry.discipline}</div>
                      </div>
                    ` : ''}

                    ${entry.lookingForward ? `
                      <div class="field-group">
                        <div class="field-label">Looking Forward</div>
                        <div class="field-content">${entry.lookingForward}</div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('') : `
                <div style="text-align: center; color: #64748b; padding: 40px; border: 1px dashed #e2e8f0; border-radius: 12px;">
                  No journal logs completed yet. List some today!
                </div>
              `
            }
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      const date = new Date().toISOString().split('T')[0];
      downloadAnchor.download = `journals-and-performance-report-${date}.html`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert("Error generating report: " + e.message);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportSuccess('');
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (!parsed || (typeof parsed !== 'object')) {
            throw new Error("Invalid file content. Must be a valid JSON object.");
          }
          if (!Array.isArray(parsed.students)) {
            throw new Error("Invalid schema: 'students' field is required and must be an array.");
          }
          
          if (onImportData) {
            onImportData(parsed);
            setImportSuccess("Backup imported successfully! Applying changes...");
          }
        } catch (err: any) {
          console.error(err);
          setImportError(err.message || "Failed to parse JSON backup file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleEmailPasswordAction = async () => {
    setEmailError('');
    setIsEmailLoading(true);
    try {
      const { authService, isFirebaseConfigured } = await import('../services/firebase');
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured yet!");
      }
      if (isSignUpMode) {
        const { error } = await authService.auth.signUp({ email, password });
        if (error) {
          if (error.code === 'auth/email-already-in-use') {
            throw new Error("This email is already registered. Please sign in instead.");
          }
          throw error;
        }
        
        // Firebase automatically signs in after sign up by default
      } else {
        const { error } = await authService.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error("Invalid email or password. Please check your credentials or sign up if you don't have an account.");
          }
          throw error;
        }
      }
      // Do not call onLogin() here because onLogin maps to signInWithGoogle.
      // onAuthStateChange in App.tsx will automatically pick up the login state change.
    } catch (error: any) {
      console.error(error);
      setEmailError(error.message || `Error ${isSignUpMode ? 'signing up' : 'signing in'} with Email/Password`);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleSave = () => {
    onUpdate({ ...settings, ...localSettings });
    onClose();
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateSettingsRealtimeMultiple({
          backgroundImage: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-[60] flex items-center justify-center backdrop-blur-md">
      <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/20 flex justify-between items-center bg-slate-900/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-xl text-white">
                 <Settings2 size={18} />
              </div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">System Control</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-slate-500">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar scroll-smooth">

            {/* Cloud Sync */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Cloud size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Cloud Sync</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm flex flex-col items-center text-center">
                    {currentUser?.uid ? (
                        <>
                          <>
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                              <Check size={24} strokeWidth={3} />
                            </div>
                            <div className="w-full">
                              <p className="text-sm font-black text-slate-800 mb-1">Synced & Backed Up</p>
                              {currentUser?.email && <p className="text-[10px] font-bold text-orange-600 mb-1 break-all tracking-tight">{currentUser.email}</p>}
                              {/* Hidden Firebase Cloud Active indicator per user request */}
                              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                                Your data is successfully synchronizing live!
                              </p>
                              <button 
                                onClick={onLogout}
                                className="px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-red-500 transition-colors font-bold text-xs flex items-center gap-2 mx-auto"
                              >
                                <LogOut size={14} /> Sign Out
                              </button>
                            </div>
                          </>
                        </>
                    ) : (
                        <>
                          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2">
                            <Cloud size={24} strokeWidth={2} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 mb-1">Local Mode</p>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                              Your data is only stored in this browser. Please sign in to sync.
                              <br />
                              <span className="text-[10px] text-orange-600 font-bold italic block mt-1">Note: We recently switched to Firebase. Please Sign Up again if you haven't yet on this new version.</span>
                            </p>
                            {emailError && (
                              <div className="mb-4 bg-red-50 text-red-650 border border-red-200 p-4 rounded-xl text-xs font-semibold text-left leading-relaxed shadow-sm">
                                <div className="font-black flex items-center gap-1.5 text-red-700 mb-1">
                                  <span>⚠️ Auth Error:</span>
                                </div>
                                <div className="text-[11.5px] font-bold text-slate-800">{emailError}</div>
                              </div>
                            )}
                             <div className="space-y-3 mb-4">
                                   <div id="recaptcha-container"></div>
                                   <input 
                                     type="email"
                                     className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400"
                                     placeholder="Email"
                                     value={email}
                                     onChange={(e) => setEmail(e.target.value)}
                                     disabled={isEmailLoading}
                                   />
                                   <input 
                                     type="password"
                                     className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400"
                                     placeholder="Password"
                                     value={password}
                                     onChange={(e) => setPassword(e.target.value)}
                                     disabled={isEmailLoading}
                                   />
                                   <button 
                                     onClick={handleEmailPasswordAction}
                                     disabled={isEmailLoading || !email || !password}
                                     className="px-6 w-full py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 shadow-lg transition-all font-black uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                     {isEmailLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                     ) : (
                                        <LogIn size={16} />
                                     )}
                                     {isSignUpMode ? 'Sign Up' : 'Sign In'} with Email
                                   </button>
                                   {!isSignUpMode && (
                                     <button
                                       onClick={async () => {
                                         if (!email) {
                                           setEmailError("Please enter your email first to reset password.");
                                           return;
                                         }
                                         setIsEmailLoading(true);
                                         try {
                                           const { authService: authS } = await import('../services/firebase');
                                           // @ts-ignore
                                           const { error } = await authS.auth.resetPassword(email);
                                           if (error) throw error;
                                           alert("Password reset email sent! Please check your inbox.");
                                         } catch (e: any) {
                                           setEmailError(e.message);
                                         } finally {
                                           setIsEmailLoading(false);
                                         }
                                       }}
                                       className="text-[10px] text-slate-400 hover:text-slate-600 font-bold block w-full text-center mt-1"
                                     >
                                       Forgot Password?
                                     </button>
                                   )}
                                   
                                   <div className="text-center pb-2">
                                      <button
                                         onClick={() => setIsSignUpMode(!isSignUpMode)}
                                         className="text-xs text-orange-600 hover:text-orange-700 font-bold underline"
                                      >
                                        {isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                                      </button>
                                   </div>

                                   <div className="flex items-center gap-2">
                                     <div className="h-px bg-slate-200 flex-1"></div>
                                     <span className="text-[10px] uppercase font-bold text-slate-400">or continue with</span>
                                     <div className="h-px bg-slate-200 flex-1"></div>
                                   </div>

                                   <div className="grid grid-cols-1 gap-2 pt-1">
                                      <button 
                                        onClick={async () => {
                                          try {
                                            const { authService } = await import('../services/firebase');
                                            // @ts-ignore
                                            await authService.auth.signInWithOAuth({ provider: 'google' });
                                          } catch (e: any) { setEmailError(e.message); }
                                        }}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold text-xs text-slate-700 flex items-center justify-center gap-2"
                                      >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                        Google
                                      </button>

                                      <button 
                                        onClick={async () => {
                                          try {
                                            const { authService } = await import('../services/firebase');
                                            // @ts-ignore
                                            await authService.auth.signInWithOAuth({ provider: 'facebook' });
                                          } catch (e: any) { setEmailError(e.message); }
                                        }}
                                        className="w-full px-4 py-2 bg-[#1877F2] hover:bg-[#1864D9] border border-transparent rounded-xl transition-all font-bold text-xs text-white flex items-center justify-center gap-2"
                                      >
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                        Facebook
                                      </button>
                                   </div>

                                   <div className="pt-2 text-center text-[10px] text-slate-500 font-medium">
                                      <p>Manage Auth Providers or add Domains in Firebase:</p>
                                      <div className="flex gap-2 justify-center mt-1">
                                        <a href={getDirectAuthProvidersUrl()} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Auth Providers</a>
                                        <span className="text-slate-300">|</span>
                                        <a href={getFirebaseDomainsUrl()} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Auth Domains</a>
                                      </div>
                                   </div>
                                </div>
                          </div>
                        </>
                    )}
                </div>
            </div>

            {/* Priority Management */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Check size={18} className="text-orange-500" />
                    <h3 className="tracking-wide uppercase text-[11px]">Priority Levels</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        Customize priority labels and colors. These apply to topics and notes.
                    </p>
                    
                    <div className="space-y-2">
                        {(localSettings.priorities || []).map((priority, index) => (
                            <div key={priority.id} className="flex items-center gap-2">
                                <div 
                                    className="w-4 h-4 rounded-full shrink-0 border border-white/50 shadow-sm"
                                    style={{ backgroundColor: priority.color }}
                                />
                                <input 
                                    type="text"
                                    value={priority.label}
                                    onChange={(e) => {
                                        const newPriorities = [...(localSettings.priorities || [])];
                                        newPriorities[index] = { ...newPriorities[index], label: e.target.value };
                                        updateSettingsRealtimeMultiple({ priorities: newPriorities });
                                    }}
                                    className="flex-1 bg-white/50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition-all"
                                />
                                <input 
                                    type="color"
                                    value={priority.color}
                                    onChange={(e) => {
                                        const newPriorities = [...(localSettings.priorities || [])];
                                        newPriorities[index] = { ...newPriorities[index], color: e.target.value };
                                        updateSettingsRealtimeMultiple({ priorities: newPriorities });
                                    }}
                                    className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer overflow-hidden rounded-md"
                                />
                                <button 
                                    onClick={() => {
                                        const newPriorities = (localSettings.priorities || []).filter((_, i) => i !== index);
                                        updateSettingsRealtimeMultiple({ priorities: newPriorities });
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={() => {
                            const newPriorities = [...(localSettings.priorities || [])];
                            const id = `priority-${Date.now()}`;
                            newPriorities.push({ id, label: 'New Priority', color: '#64748b' });
                            updateSettingsRealtimeMultiple({ priorities: newPriorities });
                        }}
                        className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-orange-300 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                        <Settings2 size={12} /> Add Priority Level
                    </button>
                </div>
            </div>

            {/* Manual Backup & Restore */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Download size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Manual Backup</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm flex flex-col items-center">
                    <p className="text-xs text-slate-500 leading-relaxed text-center">
                        Keep an independent JSON copy of your Growth Portal data locally on your computer or device.
                    </p>
                    
                    <button 
                      onClick={handleDownloadJSON}
                      className="px-6 w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all font-black uppercase text-xs flex items-center justify-center gap-2"
                    >
                      <Download size={16} /> Download JSON Backup
                    </button>

                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-transparent font-sans">
                            <span className="bg-white/90 px-2 rounded">Reports & PDF</span>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight text-center">
                        Generate a styled offline-printable Growth Portfolio document of all your logs.
                    </p>

                    <button 
                      onClick={handlePrintJournalAndTasks}
                      className="px-6 w-full py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-all font-black uppercase text-xs flex items-center justify-center gap-2"
                    >
                      <FileText size={16} /> Print/Export Journals & Tasks
                    </button>

                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-transparent text-sans">
                            <span className="bg-white/90 px-2 rounded">Restore</span>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight text-center">
                        Import a previously downloaded `.json` system backup file to restore your settings, student records, and custom progress data.
                        <br/><span className="text-orange-500 font-bold mt-1 inline-block">Note: To import separate Topic Folders, use the "Import" button directly in the Note-taking or Self-learning tabs.</span>
                    </p>

                    {importError && (
                      <div className="w-full bg-red-50 text-red-600 border border-red-200 p-2.5 rounded-xl text-xs font-semibold leading-tight text-center">
                        {importError}
                      </div>
                    )}

                    {importSuccess && (
                      <div className="w-full bg-green-50 text-green-600 border border-green-200 p-2.5 rounded-xl text-xs font-semibold leading-tight text-center">
                        {importSuccess}
                      </div>
                    )}

                    <button 
                      onClick={() => importFileRef.current?.click()}
                      className="px-6 w-full py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all font-black uppercase text-xs flex items-center justify-center gap-2"
                    >
                      <Upload size={16} /> Import Backup File
                    </button>
                    <input 
                      type="file" 
                      ref={importFileRef} 
                      onChange={handleImportJSON} 
                      className="hidden" 
                      accept=".json" 
                    />
                </div>
            </div>
            
            {/* Interface Font settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Baseline size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Interface Theme</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Interface Font</label>
                        <select 
                            value={localSettings.fontFamily}
                            onChange={(e) => setLocalSettings(prev => ({...prev, fontFamily: e.target.value}))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-slate-700"
                        >
                            {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center pl-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global scale</label>
                            <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">{localSettings.fontSize}px</span>
                        </div>
                        <input 
                            type="range" min="12" max="24" 
                            value={localSettings.fontSize} 
                            onChange={(e) => setLocalSettings(prev => ({...prev, fontSize: parseInt(e.target.value)}))}
                            className="w-full accent-orange-500 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Content Font settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Type size={18} className="text-blue-500" />
                    <h3 className="tracking-wide">Content Typography</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Document & Note Font</label>
                        <select 
                            value={localSettings.textFontFamily}
                            onChange={(e) => setLocalSettings(prev => ({...prev, textFontFamily: e.target.value}))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-700"
                        >
                            {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center pl-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Note Text size</label>
                            <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">{localSettings.textFontSize}px</span>
                        </div>
                        <input 
                            type="range" min="12" max="44" 
                            value={localSettings.textFontSize} 
                            onChange={(e) => setLocalSettings(prev => ({...prev, textFontSize: parseInt(e.target.value)}))}
                            className="w-full accent-blue-500 cursor-pointer"
                        />
                    </div>

                    <div className="pt-3 border-t border-slate-200/50">
                        <button
                            type="button"
                            onClick={() => setLocalSettings(prev => ({...prev, highContrastMode: !prev.highContrastMode}))}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${localSettings.highContrastMode ? 'bg-black text-white border-black ring-2 ring-black/20' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}
                        >
                            <div className="flex flex-col items-start gap-0.5">
                                <span className="text-sm font-black tracking-wide">High Contrast Mode</span>
                                <span className={`text-[10px] font-semibold ${localSettings.highContrastMode ? 'text-slate-300' : 'text-slate-500'}`}>Forces pure black text and 1.6x line height</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${localSettings.highContrastMode ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${localSettings.highContrastMode ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Colors */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Paintbrush size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Theme Colors</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl shadow-sm space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-3 pl-1">Pre-defined Color Themes</p>
                        <div className="grid grid-cols-2 gap-2.5 mb-2">
                            {COLOR_PALETTES.map(p => {
                                const active = localSettings.fontColor === p.fontColor && 
                                              (localSettings.appBackgroundColor === p.appBackgroundColor || 
                                               (!localSettings.appBackgroundColor && p.appBackgroundColor === '#fafaf9'));
                                return (
                                    <button
                                        key={p.name}
                                        type="button"
                                        onClick={() => {
                                            setLocalSettings(prev => ({
                                                ...prev,
                                                fontColor: p.fontColor,
                                                appBackgroundColor: p.appBackgroundColor,
                                                dateTextColor: p.dateTextColor
                                            }));
                                        }}
                                        className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${active ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20' : 'border-slate-200/60 bg-white/70'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider leading-none">{p.name}</span>
                                            {active && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />}
                                        </div>
                                        <div className="flex gap-1.5 items-center">
                                            <span className="w-3.5 h-3.5 rounded border border-slate-200 flex-shrink-0" style={{ backgroundColor: p.appBackgroundColor }} title="Background" />
                                            <span className="w-3.5 h-3.5 rounded border border-slate-200 flex-shrink-0" style={{ backgroundColor: p.fontColor }} title="Text color" />
                                            <span className="w-3.5 h-3.5 rounded border border-slate-200 flex-shrink-0" style={{ backgroundColor: p.dateTextColor }} title="Accent color" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Global App Text Color</p>
                        <div className="flex flex-wrap gap-3">
                            {colors.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setLocalSettings(prev => ({...prev, fontColor: c.value}))}
                                    className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 shadow-sm flex items-center justify-center ${localSettings.fontColor === c.value ? 'border-orange-500 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                >
                                    {localSettings.fontColor === c.value && <Check size={16} className="text-white mix-blend-overlay" />}
                                </button>
                            ))}
                            <input 
                                type="color" 
                                value={localSettings.fontColor} 
                                onChange={(e) => setLocalSettings(prev => ({...prev, fontColor: e.target.value}))} 
                                className="w-10 h-10 rounded-xl border-2 border-slate-200 cursor-pointer" 
                                title="Custom Text Color"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">App Background Color</p>
                        <div className="flex flex-wrap gap-3">
                            <input 
                                type="color" 
                                value={localSettings.appBackgroundColor || '#ffffff'} 
                                onChange={(e) => setLocalSettings(prev => ({...prev, appBackgroundColor: e.target.value}))} 
                                className="w-full h-10 rounded-xl border-2 border-slate-200 cursor-pointer" 
                                title="Custom Background Color"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Global Date Text Color</p>
                        <div className="flex flex-wrap gap-3">
                            <input 
                                type="color" 
                                value={localSettings.dateTextColor} 
                                onChange={(e) => setLocalSettings(prev => ({...prev, dateTextColor: e.target.value}))} 
                                className="w-full h-10 rounded-xl border-2 border-slate-200 cursor-pointer" 
                                title="Custom Date Text Color"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Paper Selection */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <FileText size={18} className="text-indigo-500" />
                    <h3 className="tracking-wide">Note Paper Style</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Select Canvas Texture (20 Styles)</p>
                    <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {PAPER_STYLES.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setLocalSettings(prev => ({...prev, paperStyle: style.id}))}
                                className={`group relative h-16 rounded-xl border-2 transition-all hover:-translate-y-1 shadow-sm overflow-hidden ${localSettings.paperStyle === style.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'}`}
                                title={style.name}
                            >
                                <div className={`absolute inset-0 ${style.className} flex items-center justify-center`}>
                                    {localSettings.paperStyle === style.id && (
                                        <div className="bg-indigo-600 text-white rounded-full p-1 shadow-lg">
                                            <Check size={12} />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm py-0.5 text-[7px] font-black uppercase text-white tracking-widest text-center">
                                    {style.name}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table Grid Settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Table size={18} className="text-orange-500" />
                    <h3 className="tracking-wide text-slate-800">Table & Grid Lines</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center pl-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Border Thickness</label>
                            <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">{(localSettings as any).tableBorderThickness || 2}px</span>
                        </div>
                        <input 
                            type="range" min="1" max="8" 
                            value={(localSettings as any).tableBorderThickness || 2} 
                            onChange={(e) => setLocalSettings(prev => ({...prev, tableBorderThickness: parseInt(e.target.value)}))}
                            className="w-full accent-orange-500 cursor-pointer"
                        />
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Grid Color / Visibility</p>
                        <select 
                            value={(localSettings as any).tableBorderColor || '#334155'}
                            onChange={(e) => setLocalSettings(prev => ({...prev, tableBorderColor: e.target.value}))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-slate-700"
                        >
                            <option value="#000000">Deep Black (Ultra High Contrast)</option>
                            <option value="#334155">Dark Blue-Slate (Standard high contrast)</option>
                            <option value="#475569">Slate Gray (Medium contrast)</option>
                            <option value="#94a3b8">Soft Gray (Lighter)</option>
                            <option value="#cbd5e1">Delicate Ghost Gray (Very Light)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Daily Performance Checklist Setting */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Check size={18} className="text-orange-500" />
                    <h3 className="tracking-wide">Daily Performance</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Select Symbol (15 Custom Shapes)</p>
                        <div className="grid grid-cols-5 gap-2">
                            {[
                                { id: 'circle', label: 'Circle', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="10" fill="none" />
                                    </svg>
                                ) },
                                { id: 'square', label: 'Square', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <rect x="15" y="15" width="70" height="70" rx="14" stroke={color} strokeWidth="10" fill="none" />
                                    </svg>
                                ) },
                                { id: 'star', label: 'Star', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M50 8 L62 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L38 36 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'heart', label: 'Heart', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M50 84 L18 52 C6 38 10 14 30 14 C40 14 46 22 50 28 C54 22 60 14 70 14 C90 14 94 38 82 52 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'diamond', label: 'Diamond', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M50 12 L88 50 L50 88 L12 50 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'hexagon', label: 'Hexagon', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M50 12 L85 32 L85 68 L50 88 L15 68 L15 32 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'triangle', label: 'Triangle', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M50 15 L85 75 L15 75 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'shield', label: 'Shield', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M22 20 L50 12 L78 20 L78 48 C78 66 50 84 50 84 C50 84 22 66 22 48 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'lightning', label: 'Bolt', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M54 10 L24 50 L46 50 L36 88 L74 38 L50 38 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'crown', label: 'Crown', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M15 75 L22 35 L38 52 L50 24 L62 52 L78 35 L85 75 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'moon', label: 'Moon', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M35 25 C48 25 65 35 68 52 C71 68 55 78 42 78 C59 78 74 67 74 49 C74 31 55 18 35 25 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'sparkle', label: 'Sparkle', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M50 15 Q50 50 85 50 Q50 50 50 85 Q50 50 15 50 Q50 50 50 15 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'octagon', label: 'Octagon', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M34 15 L66 15 L85 34 L85 66 L66 85 L34 85 L15 66 L15 34 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'cross', label: 'Cross', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M36 18 L64 18 L64 36 L82 36 L82 64 L64 64 L64 82 L36 82 L36 64 L18 64 L18 36 L36 36 Z" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) },
                                { id: 'cloud', label: 'Cloud', icon: (color: string) => (
                                    <svg viewBox="0 0 100 100" className="w-5.5 h-5.5">
                                        <path d="M32 64 C21 64 16 55 21 45 C26 35 38 35 44 43 C49 31 66 31 72 43 C79 43 83 51 79 59 C75 64 69 64 69 64 L32 64" stroke={color} strokeWidth="10" fill="none" strokeLinejoin="round" />
                                    </svg>
                                ) }
                            ].map(option => {
                                const isSelected = (localSettings.dailyPerformanceSymbol || 'star') === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setLocalSettings(prev => ({...prev, dailyPerformanceSymbol: option.id as any}))}
                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all hover:scale-105 ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600 font-extrabold shadow-xs' : 'border-slate-200/60 bg-white/40 text-slate-500 hover:border-slate-350'}`}
                                    >
                                        <div className="mb-1.5 flex items-center justify-center">
                                            {option.icon(isSelected ? '#f97316' : '#64748b')}
                                        </div>
                                        <span className="text-[9.5px] tracking-tight">{option.label}</span>
                                        {isSelected && (
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Customization */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <ImageIcon size={18} className="text-emerald-500" />
                    <h3 className="tracking-wide">Wallpaper & Readability</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    {/* Predefined High-Quality Background Presets */}
                    <div className="space-y-2 border-b border-slate-200/50 pb-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-2">Background Presets (Abstract & Professional)</p>
                        <div className="grid grid-cols-4 gap-2">
                            {ABSTRACT_BACKGROUND_PRESETS.map((preset) => {
                                const isActive = localSettings.backgroundImage === preset.url;
                                return (
                                    <button
                                        type="button"
                                        key={preset.name}
                                        onClick={() => {
                                            const updates: Partial<AppSettings> = { backgroundImage: preset.url, backgroundImageBlur: 0 };
                                            if (preset.url === 'solid-white') {
                                                updates.backgroundDimOpacity = 0;
                                                updates.appBackgroundColor = '#ffffff';
                                            }
                                            updateSettingsRealtimeMultiple(updates);
                                        }}
                                        className={`group relative h-14 rounded-xl overflow-hidden border text-left transition-all ${isActive ? 'ring-2 ring-emerald-500 border-transparent scale-95 shadow shadow-emerald-500/25' : 'border-slate-200/60 hover:border-slate-300 hover:scale-[1.03]'}`}
                                        title={preset.name}
                                    >
                                        {preset.url === 'solid-white' ? (
                                            <div className="absolute inset-0 bg-white" />
                                        ) : (
                                            <img src={preset.url} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={preset.name} />
                                        )}
                                        <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors" />
                                        <div className="absolute bottom-1 left-1 right-1 bg-black/45 backdrop-blur-[1px] px-1 py-0.5 rounded-[4px]">
                                            <p className="text-[8px] font-black text-white leading-tight truncate text-center drop-shadow-sm">{preset.name}</p>
                                        </div>
                                        {isActive && (
                                            <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                                <Check size={8} strokeWidth={4} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preset wallpapers selection */}
                    <div className="space-y-2 border-b border-slate-200/50 pb-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 mb-2">Other Wallpaper Presets</p>
                        <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                            {Object.entries(WALLPAPER_PRESETS_GROUPED).map(([category, presets]) => (
                                <div key={category} className="space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">{category}</p>
                                    <div className="grid grid-cols-2 gap-1.5 border border-slate-200/50 p-1.5 rounded-xl bg-white/40">
                                        {presets.map((preset) => {
                                            const isActive = localSettings.backgroundImage === preset.url;
                                            return (
                                                <button
                                                    type="button"
                                                    key={preset.name}
                                                    onClick={() => updateSettingsRealtimeMultiple({ backgroundImage: preset.url, backgroundImageBlur: 0 })}
                                                    className={`group relative h-11 rounded-lg overflow-hidden border text-left transition-all ${isActive ? 'ring-2 ring-emerald-500 border-transparent shadow shadow-emerald-500/20' : 'border-slate-200/60 hover:border-slate-300'}`}
                                                >
                                                    <img src={preset.url} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={preset.name} />
                                                    <div className="absolute inset-0 bg-slate-905/40 group-hover:bg-slate-905/30 transition-colors" />
                                                    <div className="absolute bottom-1 left-1.5 right-1.5">
                                                        <p className="text-[9px] font-black text-white leading-tight truncate drop-shadow-sm">{preset.name}</p>
                                                    </div>
                                                    {isActive && (
                                                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                                                            <Check size={10} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-1">Custom Background Wallpaper</p>
                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-xs font-bold shadow-sm"
                        >
                            <ImageIcon size={14} className="text-indigo-500" /> Upload Custom Photo
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleBackgroundUpload} className="hidden" accept="image/*" />
                        
                        {localSettings.backgroundImage && (
                            <button 
                                type="button"
                                onClick={() => updateSettingsRealtimeMultiple({ backgroundImage: undefined })}
                                className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                                title="Remove Background"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>

                    {localSettings.backgroundImage && (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-16 bg-slate-100">
                            <img src={localSettings.backgroundImage} className="w-full h-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                <span className="text-[8px] font-black uppercase text-white bg-black/45 px-2 py-0.5 rounded backdrop-blur-sm">Active Background</span>
                            </div>
                        </div>
                    )}

                    {/* Background Readability Sliders */}
                    <div className="border-t border-slate-200/50 pt-3 space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Adjust For Perfect Readability</p>
                        
                        {/* Background Dimming Opacity slider */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 pl-1">
                                <span className="flex items-center gap-1.5">Dimming Overlay (Darken) <span className="text-[8px] text-emerald-600 font-extrabold uppercase animate-pulse">Live Feed</span></span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700 font-extrabold">{localSettings.backgroundDimOpacity ?? 20}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={localSettings.backgroundDimOpacity ?? 20}
                                onChange={(e) => updateSettingsRealtimeMultiple({ backgroundDimOpacity: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <p className="text-[9px] text-slate-400 pl-1 leading-tight">Darkens the background in real-time. Drag up for maximum legibility of white text.</p>
                        </div>

                        {/* Background Blur px slider */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 pl-1">
                                <span className="flex items-center gap-1.5">Background Blur Depth <span className="text-[8px] text-indigo-600 font-extrabold uppercase animate-pulse">Live Feed</span></span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700 font-extrabold">{localSettings.backgroundImageBlur ?? 0}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="24" 
                                value={localSettings.backgroundImageBlur ?? 0}
                                onChange={(e) => updateSettingsRealtimeMultiple({ backgroundImageBlur: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <p className="text-[9px] text-slate-400 pl-1 leading-tight">Dissolves complex wallpaper details so you can focus entirely on your words in real-time.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black mb-2">
                    <Coins size={18} className="text-orange-500 animate-pulse" />
                    <h3 className="tracking-wide">Currency & Rate Settings</h3>
                </div>

                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Default Base Currency</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setLocalSettings(prev => ({...prev, currency: 'USD'}))}
                                className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider border transition-all ${localSettings.currency === 'USD' ? 'bg-orange-500 text-white border-transparent shadow shadow-orange-500/25' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                💵 USD ($)
                            </button>
                            <button
                                type="button"
                                onClick={() => setLocalSettings(prev => ({...prev, currency: 'KHR'}))}
                                className={`py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider border transition-all ${localSettings.currency === 'KHR' ? 'bg-orange-500 text-white border-transparent shadow shadow-orange-500/25' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                🇰🇭 KHR (Riel)
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                        <div className="flex justify-between items-center pl-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exchange Rate (1 USD = ? Riels)</label>
                            <span className="text-xs font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                                {localSettings.exchangeRate?.toLocaleString()} Riels
                            </span>
                        </div>
                        <input
                            type="number"
                            min="1000"
                            max="10000"
                            step="100"
                            value={localSettings.exchangeRate}
                            onChange={(e) => setLocalSettings(prev => ({...prev, exchangeRate: parseInt(e.target.value) || 4000}))}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-slate-800"
                            placeholder="KHR per 1 USD (e.g., 4000)"
                        />
                        <p className="text-[9.5px] font-bold text-slate-400 italic pl-1 leading-relaxed">
                            This custom exchange rate is used to convert and present transaction amounts when viewing stats or filtering. Default is 4,000 Riels per Dollar.
                        </p>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/20 bg-slate-900/5">
            <button 
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-black text-sm tracking-wide shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
            >
                <Save size={18} /> Apply Changes
            </button>
        </div>

      </div>
    </div>
  );
};
