import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  FileText, 
  CheckSquare, 
  Settings2, 
  Bookmark, 
  Sparkles, 
  Check, 
  RotateCcw,
  Palette as PaletteIcon,
  ChevronRight,
  List,
  ListOrdered,
  HelpCircle,
  Brain,
  Layers,
  Scale,
  Star,
  Activity,
  BookOpen,
  Zap
} from 'lucide-react';
import { AppData, Template, DPSSTopic, Tab } from '../types';
import { RichTextDiv, fontFamilies } from './FloatingToolbar';

interface TemplatesPanelProps {
  data: AppData;
  onUpdate: (newDataOrUpdater: AppData | ((prev: AppData) => AppData)) => void;
  setActiveTab: (tab: Tab) => void;
  onOpenSidebar?: () => void;
}

// Preset templates loaded as fallbacks or default templates
const presetTemplates: Template[] = [
  {
    id: 'sys_template_daily_performance',
    name: 'Daily Habits Routine',
    description: 'Track hydration, study blocks, physical stretches, and mindfulness check-ins daily.',
    content: `<h3>⚡ Daily Peak Performance Habits</h3>
<p>Perform these daily rituals to optimize mindfulness, high study discipline, and peak energy.</p>
<hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);"/>
<h4>🌿 Morning Rituals</h4>
<ul style="list-style-type: none; padding-left: 20px;">
  <li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span> Drink 500ml water & do 10 diaphragmatic deep breaths</span></li>
  <li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span> Journal 3 things I am grateful for inside the Growth Plan</span></li>
</ul>
<h4>📚 Focus Blocks & Study</h4>
<ul style="list-style-type: none; padding-left: 20px;">
  <li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span> Complete 1x uninterrupted 90-minute academic deep-work session</span></li>
  <li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span> Clean study workspace and organize desktop notes</span></li>
</ul>`,
    customBullets: ['•', '⚡', '🌿', '📚', '⭐', '💡'],
    customChecklists: ['⬜', '✅', '🟢', '🔴', '🔳'],
    defaultListType: 'checklist',
    defaultMarker: '⬜',
    themeColor: 'emerald',
    createdAt: new Date().toISOString(),
    isSystem: true
  },
  {
    id: 'sys_template_meeting_minutes',
    name: 'Meeting Minutes & Agenda',
    description: 'Structure agendas, track attendees, record discussion points, and assign checkboxed actions.',
    content: `<h3>📝 Team Synced Sync & Agenda</h3>
<p><strong>Date:</strong> 2026-06-19 &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Lead:</strong> Study Coordinator</p>
<p><strong>Attendees:</strong> [Name 1], [Name 2], [Name 3]</p>
<hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);"/>
<h4>📌 Essential Agenda</h4>
<ul>
  <li>👥 Review of previous milestones, performance indicators & challenges.</li>
  <li>👥 Discussion on study routines, material coverage, and exam schedules.</li>
</ul>
<h4>✅ Actionable Items Checklist</h4>
<ul style="list-style-type: none; padding-left: 20px;">
  <li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span> Update study guide outlines for Khmer study course.</span></li>
  <li style="display: flex; gap: 8px; align-items: flex-start;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span><span> Log daily expenses and update the budget categories.</span></li>
</ul>`,
    customBullets: ['•', '👥', '📌', '⏳', '✅', '🔥'],
    customChecklists: ['⬜', '✅', '⏳', '📌', '✓'],
    defaultListType: 'checklist',
    defaultMarker: '⬜',
    themeColor: 'indigo',
    createdAt: new Date().toISOString(),
    isSystem: true
  },
  {
    id: 'sys_template_fitness_growth',
    name: 'Athletic Nutrition & Log',
    description: 'Track workouts, sleep quality, daily hydration levels, and macronutrient meals easily.',
    content: `<h3>💪 Body & Mind Athletic Canvas</h3>
<p>Maintain physical durability and cognitive sharpness with rigorous athletic logs.</p>
<hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);"/>
<h4>🏃 Active Routines</h4>
<ul>
  <li>🏃 Flexibility stretching & yoga flow: 15 minutes</li>
  <li>🏃 High intensity cardio or weightlifting: 45 minutes</li>
</ul>
<h4>🥑 Calories & Hydration Log</h4>
<ul>
  <li>💧 Daily hydration target: 3.5 Liters of pure water</li>
  <li>🥑 Nutrient intake: High lean proteins, low processed foods</li>
</ul>`,
    customBullets: ['•', '🏃', '🥑', '💧', '💪', '🍎', '⭐'],
    customChecklists: ['⬜', '✅', '🟢', '🔴', '✓'],
    defaultListType: 'bullet',
    defaultMarker: '🏃',
    themeColor: 'rose',
    createdAt: new Date().toISOString(),
    isSystem: true
  },
  {
    id: 'sys_template_task_matrix',
    name: 'Task Performance Matrix',
    description: 'High-visibility table for tracking complex tasks, sub-priorities, and completion status.',
    content: `<h3>⚡ Task Execution Matrix</h3>
<p>Organize high-impact initiatives and monitor real-time completion states.</p>
<div class="table-scroll-container" style="overflow-x: auto; max-width: 100%; border-radius: 12px; margin: 16px 0; border: 1px solid rgba(0,0,0,0.1);">
  <table class="card-stack" style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: #64748b; font-size: 10px; width: 50px;">No.</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: #64748b; font-size: 10px; min-width: 150px;">Strategic Task</th>
        <th style="padding: 12px; text-align: center; font-weight: 800; text-transform: uppercase; color: #64748b; font-size: 10px; width: 100px;">Priority</th>
        <th style="padding: 12px; text-align: center; font-weight: 800; text-transform: uppercase; color: #64748b; font-size: 10px; width: 120px;">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="No." style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 800;">1</td>
        <td data-label="Task" style="padding: 12px; border-bottom: 1px solid #f1f5f9;">[Enter Primary Focus]</td>
        <td data-label="Priority" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;"><span style="background: #fef2f2; color: #ef4444; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px;">🔥 HIGH</span></td>
        <td data-label="Status" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span> Pending</td>
      </tr>
      <tr>
        <td data-label="No." style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 800;">2</td>
        <td data-label="Task" style="padding: 12px; border-bottom: 1px solid #f1f5f9;">[Enter Secondary Focus]</td>
        <td data-label="Priority" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;"><span style="background: #fdfae6; color: #d97706; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px;">⚡ MED</span></td>
        <td data-label="Status" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span> In Progress</td>
      </tr>
    </tbody>
  </table>
</div>`,
    customBullets: ['•', '⚡', '🎯', '🔥'],
    customChecklists: ['⬜', '✅', '🟢'],
    defaultListType: 'checklist',
    defaultMarker: '⬜',
    themeColor: 'sky',
    createdAt: new Date().toISOString(),
    isSystem: true
  },
  {
    id: 'sys_template_resource_tracker',
    name: 'Resource & Link Library',
    description: 'Catalog academic papers, digital links, and video resources with categorized icons.',
    content: `<h3>📚 Digital Resource Library</h3>
<p>Consolidate all external learning materials and reference documentation.</p>
<div class="table-scroll-container" style="overflow-x: auto; max-width: 100%; border-radius: 12px; margin: 16px 0; border: 1px solid rgba(0,0,0,0.1);">
  <table class="card-stack" style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background-color: #f0f9ff; border-bottom: 2px solid #bae6fd;">
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: #0369a1; font-size: 10px; width: 80px;">Type</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: #0369a1; font-size: 10px; min-width: 150px;">Resource Name</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: #0369a1; font-size: 10px; min-width: 100px;">Category</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: #0369a1; font-size: 10px; width: 100px;">Action</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Type" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 18px;">📄</td>
        <td data-label="Name" style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">[Academic Paper Title]</td>
        <td data-label="Cat" style="padding: 12px; border-bottom: 1px solid #f1f5f9;"><span style="background: #f0fdf4; color: #166534; padding: 2px 8px; border-radius: 6px; font-size: 10px;">RESEARCH</span></td>
        <td data-label="Action" style="padding: 12px; border-bottom: 1px solid #f1f5f9;"><a href="#" style="color: #2563eb; font-weight: 800; text-decoration: none;">OPEN ↗</a></td>
      </tr>
      <tr>
        <td data-label="Type" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 18px;">🎬</td>
        <td data-label="Name" style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">[Lecture Video URL]</td>
        <td data-label="Cat" style="padding: 12px; border-bottom: 1px solid #f1f5f9;"><span style="background: #fef2f2; color: #991b1b; padding: 2px 8px; border-radius: 6px; font-size: 10px;">VIDEO</span></td>
        <td data-label="Action" style="padding: 12px; border-bottom: 1px solid #f1f5f9;"><a href="#" style="color: #2563eb; font-weight: 800; text-decoration: none;">WATCH ↗</a></td>
      </tr>
    </tbody>
  </table>
</div>`,
    customBullets: ['•', '🔗', '📄', '🎬'],
    customChecklists: ['⬜', '✅'],
    defaultListType: 'bullet',
    defaultMarker: '🔗',
    themeColor: 'sky',
    createdAt: new Date().toISOString(),
    isSystem: true
  },
  {
    id: 'sys_template_smart_check_matrix',
    name: 'Smart Comparison Matrix',
    description: 'Word-style compact table with smart toggle checkmarks and cross symbols for feature comparisons.',
    content: `<h3>💎 Feature Comparison Matrix</h3>
<p>Utilize the smart-toggle cells to quickly compare variables, specifications, or task requirements.</p>
<div class="table-scroll-container" style="overflow-x: auto; max-width: 100%; border-radius: 12px; margin: 16px 0;">
  <table class="compact-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
        <th style="padding: 10px; text-align: left; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px;">Specification</th>
        <th style="padding: 10px; text-align: center; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; width: 60px;">Flex</th>
        <th style="padding: 10px; text-align: center; font-weight: 800; text-transform: uppercase; color: #475569; font-size: 10px; width: 60px;">Home</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">Height (inches)</td>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">62</td>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">58</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">Diameter (inches)</td>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">30</td>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">24</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">Extension Kit</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #10b981;">✅</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #ef4444;">❌</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">Microgreens Extension</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #10b981;">✅</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #ef4444;">❌</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">Support Cage</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #10b981;">✅</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #ef4444;">❌</td>
      </tr>
    </tbody>
  </table>
</div><p></p>`,
    customBullets: ['•', '💎', '✅', '❌'],
    customChecklists: ['⬜', '✅', '❌'],
    defaultListType: 'bullet',
    defaultMarker: '💎',
    themeColor: 'emerald',
    createdAt: new Date().toISOString(),
    isSystem: true
  },
  {
    id: 'sys_template_salary_report',
    name: 'Salary & Expense Audit',
    description: 'Detailed financial tracker with smart check verification for payments and categorization.',
    content: `<h3>💰 Monthly Financial Performance Audit</h3>
<p>Audit your salary distributions, fixed expenses, and savings targets with smart check confirmation.</p>
<div class="table-scroll-container" style="overflow-x: auto; max-width: 100%; border-radius: 12px; margin: 16px 0; border: 1px solid rgba(0,0,0,0.1);">
  <table class="compact-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background-color: #fefce8; border-bottom: 2px solid #fde68a;">
        <th style="padding: 10px; text-align: left; font-weight: 800; text-transform: uppercase; color: #a16207; font-size: 10px; width: 50px;">Day</th>
        <th style="padding: 10px; text-align: left; font-weight: 800; text-transform: uppercase; color: #a16207; font-size: 10px; min-width: 180px;">Expense/Income Item</th>
        <th style="padding: 10px; text-align: right; font-weight: 800; text-transform: uppercase; color: #a16207; font-size: 10px; width: 100px;">Amount</th>
        <th style="padding: 10px; text-align: center; font-weight: 800; text-transform: uppercase; color: #a16207; font-size: 10px; width: 80px;">Paid?</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #fef9c3; text-align: center; font-weight: 800;">01</td>
        <td style="padding: 8px; border-bottom: 1px solid #fef9c3; font-weight: 600;">Monthly Salary Deposit</td>
        <td style="padding: 8px; border-bottom: 1px solid #fef9c3; text-align: right; color: #059669; font-weight: 800;">+$0.00</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #fef9c3; text-align: center; color: #10b981;">✅</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #fef9c3; text-align: center; font-weight: 800;">05</td>
        <td style="padding: 8px; border-bottom: 1px solid #fef9c3; font-weight: 600;">Rent & Utilities</td>
        <td style="padding: 8px; border-bottom: 1px solid #fef9c3; text-align: right; color: #dc2626; font-weight: 800;">-$0.00</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #fef9c3; text-align: center; color: #ef4444;">❌</td>
      </tr>
    </tbody>
  </table>
</div>`,
    customBullets: ['•', '💰', '💸', '📈'],
    customChecklists: ['⬜', '✅', '❌'],
    defaultListType: 'bullet',
    defaultMarker: '💰',
    themeColor: 'amber',
    createdAt: new Date().toISOString(),
    isSystem: true
  },
  {
    id: 'sys_template_lecture_notes',
    name: 'Smart Lecture Notes',
    description: 'Structure academic lectures with summary blocks and verification checkboxes for concepts understood.',
    content: `<h3>🎓 Advanced Lecture Synthesis</h3>
<p><strong>Topic:</strong> [Subject Name] &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Instructor:</strong> [Name]</p>
<hr style="margin: 15px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);"/>
<div class="table-scroll-container" style="overflow-x: auto; max-width: 100%; border-radius: 12px; margin: 16px 0; border: 1px solid rgba(0,0,0,0.1);">
  <table class="compact-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background-color: #f0fdf4; border-bottom: 2px solid #bbf7d0;">
        <th style="padding: 10px; text-align: left; font-weight: 800; text-transform: uppercase; color: #166534; font-size: 10px;">Core Concept</th>
        <th style="padding: 10px; text-align: left; font-weight: 800; text-transform: uppercase; color: #166534; font-size: 10px;">Detailed Explanation</th>
        <th style="padding: 10px; text-align: center; font-weight: 800; text-transform: uppercase; color: #166534; font-size: 10px; width: 80px;">Mastered?</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #f0fdf4; font-weight: 700;">[Concept 1]</td>
        <td style="padding: 8px; border-bottom: 1px solid #f0fdf4;">[Enter explanation/notes here]</td>
        <td class="smart-check-cell" style="padding: 8px; border-bottom: 1px solid #f0fdf4; text-align: center; color: #10b981;">✅</td>
      </tr>
    </tbody>
  </table>
</div>`,
    customBullets: ['•', '🎓', '📚', '💡'],
    customChecklists: ['⬜', '✅', '❌'],
    defaultListType: 'bullet',
    defaultMarker: '🎓',
    themeColor: 'emerald',
    createdAt: new Date().toISOString(),
    isSystem: true
  }
];

const presetColors = [
  { name: 'Emerald', class: 'emerald', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
  { name: 'Indigo', class: 'indigo', bg: 'bg-indigo-50 text-indigo-600 border-indigo-200', dot: 'bg-indigo-500' },
  { name: 'Rose', class: 'rose', bg: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500' },
  { name: 'Amber', class: 'amber', bg: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500' },
  { name: 'Sky', class: 'sky', bg: 'bg-sky-50 text-sky-600 border-sky-200', dot: 'bg-sky-500' },
  { name: 'Violet', class: 'violet', bg: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-500' },
  { name: 'Orange', class: 'orange', bg: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500' },
  { name: 'Teal', class: 'teal', bg: 'bg-teal-50 text-teal-600 border-teal-200', dot: 'bg-teal-500' },
  { name: 'Red', class: 'red', bg: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
  { name: 'Yellow', class: 'yellow', bg: 'bg-yellow-50 text-yellow-600 border-yellow-250', dot: 'bg-yellow-500' },
  { name: 'Fuchsia', class: 'fuchsia', bg: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200', dot: 'bg-fuchsia-500' },
  { name: 'Slate', class: 'slate', bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-500' },
];

const bulletPool = ['•', '🌹', '⭐', '🚗', '❤️', '✅', '✨', '🔥', '🔮', '🍃', '🎵', '👑', '☀️', '🌙', '💎', '📌', '👥', '⏳', '💡', '🏃', '🥑', '💧', '💪', '🍎', '⚡', '🌿', '📚'];
const checklistPool = ['⬜', '[ ]', '🔳', '⚪', '🔴', '❎', '✓', '☑️', '⌛', '📌', '🟢', '🔴'];

// 10 Color Palettes for the Insertable Smart Cards
const insertionColors = [
  { name: 'Blue', hex: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: 'bg-[#2563eb]' },
  { name: 'Green', hex: '#059669', bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', dot: 'bg-[#059669]' },
  { name: 'Red', hex: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: 'bg-[#dc2626]' },
  { name: 'Yellow', hex: '#d97706', bg: '#fffbeb', border: '#fef08a', text: '#b45309', dot: 'bg-[#d97706]' },
  { name: 'Purple', hex: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', dot: 'bg-[#7c3aed]' },
  { name: 'Orange', hex: '#ea580c', bg: '#fff7ed', border: '#ffedd5', text: '#c2410c', dot: 'bg-[#ea580c]' },
  { name: 'Teal', hex: '#0d9488', bg: '#f0fdfa', border: '#ccfbf1', text: '#0f766e', dot: 'bg-[#0d9488]' },
  { name: 'Violet', hex: '#9333ea', bg: '#faf5ff', border: '#f3e8ff', text: '#7e22ce', dot: 'bg-[#9333ea]' },
  { name: 'Sky', hex: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1', dot: 'bg-[#0284c7]' },
  { name: 'Slate', hex: '#4b5563', bg: '#f9fafb', border: '#e5e7eb', text: '#1f2937', dot: 'bg-[#4b5563]' },
];

export const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ 
  data, 
  onUpdate, 
  setActiveTab,
  onOpenSidebar
}) => {
  const customTemplates = data.templates || [];
  const allTemplates = [...presetTemplates, ...customTemplates];

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formBullets, setFormBullets] = useState<string[]>(['•', '⭐', '🔥', '💡', '✅']);
  const [formChecklists, setFormChecklists] = useState<string[]>(['⬜', '✅', '🟢', '✓']);
  const [formListType, setFormListType] = useState<'bullet' | 'checklist' | 'number'>('bullet');
  const [formMarker, setFormMarker] = useState('•');
  const [formColor, setFormColor] = useState('emerald');
  const [formTextFontFamily, setFormTextFontFamily] = useState('Inter');
  const [formTextFontSize, setFormTextFontSize] = useState(16);
  const [formHeaderFontFamily, setFormHeaderFontFamily] = useState('Space Grotesk');
  const [formHeaderFontSize, setFormHeaderFontSize] = useState(20);
  const [selectedFrameworkIcon, setSelectedFrameworkIcon] = useState('⚖️');
  const frameworkIconPool = ['⚖️', '📊', '⚡', '💡', '🔥', '🛡️', '⚙️', '🔍', '🚀', '🎯', '🧩', '💎', '📈', '🔬'];

  const [feedback, setFeedback] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormDescription('');
    setFormContent('<h3>New List Custom Template</h3><p>Start outlining your structured lists here...</p>');
    setFormBullets(['•', '⭐', '🔥', '💡', '✅']);
    setFormChecklists(['⬜', '✅', '🟢', '✓']);
    setFormListType('bullet');
    setFormMarker('•');
    setFormColor('emerald');
    setFormTextFontFamily('Inter');
    setFormTextFontSize(16);
    setFormHeaderFontFamily('Space Grotesk');
    setFormHeaderFontSize(20);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    if (t.isSystem) {
      // Clones system template to custom
      setEditingTemplate(null);
      setFormName(t.name + ' (Copy)');
      setFormDescription(t.description);
    } else {
      setEditingTemplate(t);
      setFormName(t.name);
      setFormDescription(t.description);
    }
    setFormContent(t.content);
    setFormBullets([...t.customBullets]);
    setFormChecklists([...t.customChecklists]);
    setFormListType(t.defaultListType);
    setFormMarker(t.defaultMarker);
    setFormColor(t.themeColor);
    setFormTextFontFamily(t.textFontFamily || 'Inter');
    setFormTextFontSize(t.textFontSize || 16);
    setFormHeaderFontFamily(t.headerFontFamily || 'Space Grotesk');
    setFormHeaderFontSize(t.headerFontSize || 20);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Do you really want to delete this custom template?')) {
      onUpdate((prev: AppData) => {
        const currentCustoms = prev.templates || [];
        return {
          ...prev,
          templates: currentCustoms.filter(t => t.id !== id)
        };
      });
      showFeedback('Template successfully deleted!');
    }
  };

  const handleSave = () => {
    if (!formName.trim()) {
      alert('Please fill in a template name');
      return;
    }

    const templatePayload: Template = {
      id: editingTemplate ? editingTemplate.id : 'template_' + Date.now().toString(),
      name: formName,
      description: formDescription,
      content: formContent,
      customBullets: formBullets,
      customChecklists: formChecklists,
      defaultListType: formListType,
      defaultMarker: formMarker,
      themeColor: formColor,
      textFontFamily: formTextFontFamily,
      textFontSize: formTextFontSize,
      headerFontFamily: formHeaderFontFamily,
      headerFontSize: formHeaderFontSize,
      createdAt: editingTemplate ? editingTemplate.createdAt : new Date().toISOString()
    };

    onUpdate((prev: AppData) => {
      const currentCustoms = prev.templates || [];
      let updatedTemplates: Template[];
      if (editingTemplate) {
        updatedTemplates = currentCustoms.map(t => t.id === editingTemplate.id ? templatePayload : t);
      } else {
        updatedTemplates = [...currentCustoms, templatePayload];
      }
      return {
        ...prev,
        templates: updatedTemplates
      };
    });

    setIsModalOpen(false);
    showFeedback(editingTemplate ? 'Template updated successfully!' : 'New Template created!');
  };

  const handleUseTemplate = (template: Template, target: 'dpss' | 'selfLearning') => {
    const newTopic: DPSSTopic = {
      id: 'topic_' + Date.now().toString(),
      title: template.name + ' Logs',
      content: template.content,
      alignment: 'left',
      customBullets: template.customBullets,
      customChecklists: template.customChecklists,
      defaultListType: template.defaultListType,
      defaultMarker: template.defaultMarker,
      textFontFamily: template.textFontFamily,
      textFontSize: template.textFontSize,
      headerFontFamily: template.headerFontFamily,
      headerFontSize: template.headerFontSize,
      order: Date.now(),
      children: []
    };

    onUpdate((prev: AppData) => {
      if (target === 'dpss') {
        const topics = prev.dpssTopics || [];
        return {
          ...prev,
          dpssTopics: [...topics, newTopic]
        };
      } else {
        const topics = prev.selfLearningTopics || [];
        return {
          ...prev,
          selfLearningTopics: [...topics, newTopic]
        };
      }
    });

    setActiveTab(target === 'dpss' ? Tab.DPSS : Tab.SelfLearning);
    showFeedback(`Note generated from template & synced! Navigating...`);
  };

  const toggleBullet = (bullet: string) => {
    if (formBullets.includes(bullet)) {
      if (formBullets.length <= 1) return; // Must keep at least one
      setFormBullets(formBullets.filter(b => b !== bullet));
      if (formMarker === bullet) {
        setFormMarker(formBullets.filter(b => b !== bullet)[0]);
      }
    } else {
      setFormBullets([...formBullets, bullet]);
    }
  };

  const toggleChecklist = (item: string) => {
    if (formChecklists.includes(item)) {
      if (formChecklists.length <= 1) return; // Must keep at least one
      setFormChecklists(formChecklists.filter(c => c !== item));
      if (formMarker === item) {
        setFormMarker(formChecklists.filter(c => c !== item)[0]);
      }
    } else {
      setFormChecklists([...formChecklists, item]);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  // HTML Snippet Insertion Handler
  const insertSpecialBlock = (
    type: 'synthesis' | 'brainstorm' | 'qa' | 'proscons' | 'threecols' | 'fourcols' | 'taskmatrix' | 'resourcelibrary' | 'resources' | 'feedback' | 'dailylearning' | 'selflearning', 
    colorObj: typeof insertionColors[0]
  ) => {
    const { hex, bg, border, text, name, dot } = colorObj;
    let snippet = '';

    if (type === 'synthesis') {
      snippet = `<div class="synthesis-card" style="margin: 14px 0; padding: 14px; border-left: 5px solid ${hex}; background-color: ${bg}; border-radius: 12px; border-top: 1px solid ${border}; border-right: 1px solid ${border}; border-bottom: 1px solid ${border}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
  <h4 style="margin: 0 0 6px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;">
    ${selectedFrameworkIcon} KEY ACADEMIC SYNTHESIS (${name})
  </h4>
  <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5; font-weight: 500;">
    [Insert study summary here. Consolidate primary findings, key formulas, and lecture takeaways.]
  </p>
 </div><p></p>`;
    } else if (type === 'brainstorm') {
      snippet = `<div class="brainstorm-card" style="margin: 14px 0; padding: 14px; background-color: ${bg}; border: 1.5px dashed ${hex}; border-radius: 12px;">
  <h4 style="margin: 0 0 8px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
    ${selectedFrameworkIcon} CREATIVE BRAINSTORM CANVAS
  </h4>
  <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 6px;">
    <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid ${border};">
      <strong style="font-size: 10px; color: ${text}; display: block; margin-bottom: 2px;">${selectedFrameworkIcon} Primary Hypothesis:</strong>
      <p style="margin: 0; font-size: 10px; color: #64748b;">[What is the major creative breakthrough concept?]</p>
    </div>
    <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid ${border};">
      <strong style="font-size: 10px; color: ${text}; display: block; margin-bottom: 2px;">${selectedFrameworkIcon} Branching Innovations:</strong>
      <p style="margin: 0; font-size: 10px; color: #64748b;">[List potential dependencies or unique use cases]</p>
    </div>
  </div>
 </div><p></p>`;
    } else if (type === 'qa') {
      snippet = `<div class="qa-board-card" style="margin: 14px 0; padding: 14px; border: 1px solid ${border}; background-color: ${bg}; border-radius: 12px;">
  <h4 style="margin: 0 0 10px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
    ${selectedFrameworkIcon} QUERY & RESOLUTION BOARD
  </h4>
  <div style="margin-bottom: 8px; padding: 10px; background: rgba(255,255,255,0.85); border-radius: 8px; border-left: 3px solid ${hex};">
    <strong style="font-size: 10.5px; color: #1e293b; display: block; margin-bottom: 2px;">Q: [Enter complex study academic question or outstanding paradox]</strong>
  </div>
  <div style="padding: 10px; background: #ffffff; border-radius: 8px; border-left: 3px solid #10b981;">
    <strong style="font-size: 10.5px; color: #047857; display: block; margin-bottom: 2px;">A: Recommended Theoretical Output</strong>
    <p style="margin: 0; font-size: 10px; color: #475569;">[Detail logical proof, solutions, and relevant reference pages here]</p>
  </div>
 </div><p></p>`;
    } else if (type === 'proscons') {
      snippet = `<div class="pros-cons-card" style="margin: 14px 0; padding: 14px; border: 1px solid ${border}; background-color: ${bg}; border-radius: 12px;">
  <h4 style="margin: 0 0 10px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
    ${selectedFrameworkIcon} PROS & CONS DECISION GRID (${name})
  </h4>
  <div style="display: flex; gap: 10px; margin-top: 6px;">
    <div style="flex: 1; background: #ffffff; padding: 8px; border-radius: 8px; border-top: 2.5px solid #10b981; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 10px; color: #047857; text-transform: uppercase; display: block; margin-bottom: 4px;">🟢 Strategic Pros</strong>
      <ol style="margin: 0; padding-left: 12px; font-size: 9.5px; color: #475569; line-height: 1.4;">
        <li>High study coverage speed</li>
        <li>Enhanced conceptual clarity</li>
      </ol>
    </div>
    <div style="flex: 1; background: #ffffff; padding: 8px; border-radius: 8px; border-top: 2.5px solid #ef4444; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 10px; color: #b91c1c; text-transform: uppercase; display: block; margin-bottom: 4px;">🔴 Critical Cons</strong>
      <ol style="margin: 0; padding-left: 12px; font-size: 9.5px; color: #475569; line-height: 1.4;">
        <li>Requires initial concentration</li>
        <li>Time consumption limits</li>
      </ol>
    </div>
  </div>
 </div><p></p>`;
    } else if (type === 'threecols') {
      snippet = `<div class="three-col-wrapper three-column-grid" style="margin: 14px 0; padding: 14px; border: 1px solid ${border}; background-color: ${bg}; border-radius: 12px;">
  <h4 style="margin: 0 0 10px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
    ${selectedFrameworkIcon} 3-COLUMN ANALYTICAL COMPARISON GRID (${name})
  </h4>
  <div style="display: flex; gap: 10px; margin-top: 6px;">
    <div style="flex: 1; background: #ffffff; padding: 8px; border-radius: 8px; border-top: 2.5px solid #10b981; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 10px; color: #047857; text-transform: uppercase; display: block; margin-bottom: 4px;">🟢 Option A (High Yield)</strong>
      <ol style="margin: 0; padding-left: 12px; font-size: 9.5px; color: #475569; line-height: 1.4;">
        <li>Rapid execution cycle</li>
        <li>Minimal initial overhead</li>
      </ol>
    </div>
    <div style="flex: 1; background: #ffffff; padding: 8px; border-radius: 8px; border-top: 2.5px solid #f59e0b; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 10px; color: #b45309; text-transform: uppercase; display: block; margin-bottom: 4px;">🟡 Option B (Balanced)</strong>
      <ol style="margin: 0; padding-left: 12px; font-size: 9.5px; color: #475569; line-height: 1.4;">
        <li>Adaptive resource load</li>
        <li>Reliable continuous output</li>
      </ol>
    </div>
    <div style="flex: 1; background: #ffffff; padding: 8px; border-radius: 8px; border-top: 2.5px solid #ef4444; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 10px; color: #b91c1c; text-transform: uppercase; display: block; margin-bottom: 4px;">🔴 Option C (Deep Invest)</strong>
      <ol style="margin: 0; padding-left: 12px; font-size: 9.5px; color: #475569; line-height: 1.4;">
        <li>Maximum long-term leverage</li>
        <li>Demands specialized oversight</li>
      </ol>
    </div>
  </div>
 </div><p></p>`;
    } else if (type === 'fourcols') {
      snippet = `<div class="four-col-wrapper four-column-grid" style="margin: 14px 0; padding: 14px; border: 1px solid ${border}; background-color: ${bg}; border-radius: 12px;">
  <h4 style="margin: 0 0 10px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
    ${selectedFrameworkIcon} 4-COLUMN MULTI-DIMENSIONAL ASSESSMENT GRID (${name})
  </h4>
  <div style="display: flex; gap: 8px; margin-top: 6px;">
    <div style="flex: 1; background: #ffffff; padding: 6px; border-radius: 8px; border-top: 2.5px solid #3b82f6; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 9px; color: #1d4ed8; text-transform: uppercase; display: block; margin-bottom: 3px;">🔵 Quadrant 1 (Focus)</strong>
      <p style="margin: 0; font-size: 8.5px; color: #475569; line-height: 1.3;">[Strategic focus areas and instant wins]</p>
    </div>
    <div style="flex: 1; background: #ffffff; padding: 6px; border-radius: 8px; border-top: 2.5px solid #10b981; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 9px; color: #047857; text-transform: uppercase; display: block; margin-bottom: 3px;">🟢 Quadrant 2 (Scale)</strong>
      <p style="margin: 0; font-size: 8.5px; color: #475569; line-height: 1.3;">[Medium-term targets & growth engines]</p>
    </div>
    <div style="flex: 1; background: #ffffff; padding: 6px; border-radius: 8px; border-top: 2.5px solid #f59e0b; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 9px; color: #b45309; text-transform: uppercase; display: block; margin-bottom: 3px;">🟡 Quadrant 3 (Optimize)</strong>
      <p style="margin: 0; font-size: 8.5px; color: #475569; line-height: 1.3;">[Process efficiency & minor pivots]</p>
    </div>
    <div style="flex: 1; background: #ffffff; padding: 6px; border-radius: 8px; border-top: 2.5px solid #ef4444; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <strong style="font-size: 9px; color: #b91c1c; text-transform: uppercase; display: block; margin-bottom: 3px;">🔴 Quadrant 4 (Mitigate)</strong>
      <p style="margin: 0; font-size: 8.5px; color: #475569; line-height: 1.3;">[Vulnerabilities and direct constraints]</p>
    </div>
  </div>
 </div><p></p>`;
    } else if (type === 'taskmatrix') {
      snippet = `<div class="table-scroll-container" style="overflow-x: auto; max-width: 100%; border-radius: 12px; margin: 16px 0; border: 1px solid ${border};">
  <table class="card-stack" style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background-color: ${bg}; border-bottom: 2px solid ${border};">
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px; width: 50px;">No.</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px;">Strategic Task</th>
        <th style="padding: 12px; text-align: center; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px; width: 100px;">Priority</th>
        <th style="padding: 12px; text-align: center; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px; width: 120px;">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="No." style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: 800;">1</td>
        <td data-label="Task" style="padding: 12px; border-bottom: 1px solid #f1f5f9;">[Enter Primary Focus]</td>
        <td data-label="Priority" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;"><span style="background: #fef2f2; color: #ef4444; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px;">🔥 HIGH</span></td>
        <td data-label="Status" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;"><span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none;">⬜</span> Pending</td>
      </tr>
    </tbody>
  </table>
 </div><p></p>`;
    } else if (type === 'resourcelibrary') {
      snippet = `<div class="table-scroll-container" style="overflow-x: auto; max-width: 100%; border-radius: 12px; margin: 16px 0; border: 1px solid ${border};">
  <table class="card-stack" style="width: 100%; border-collapse: collapse; font-size: 13px;">
    <thead>
      <tr style="background-color: ${bg}; border-bottom: 2px solid ${border};">
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px; width: 80px;">Type</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px;">Resource Name</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px;">Category</th>
        <th style="padding: 12px; text-align: left; font-weight: 800; text-transform: uppercase; color: ${text}; font-size: 10px; width: 100px;">Action</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Type" style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 18px;">📄</td>
        <td data-label="Name" style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-weight: 700;">[Academic Paper Title]</td>
        <td data-label="Cat" style="padding: 12px; border-bottom: 1px solid #f1f5f9;"><span style="background: #f0fdf4; color: #166534; padding: 2px 8px; border-radius: 6px; font-size: 10px;">RESEARCH</span></td>
        <td data-label="Action" style="padding: 12px; border-bottom: 1px solid #f1f5f9;"><a href="#" style="color: #2563eb; font-weight: 800; text-decoration: none;">OPEN ↗</a></td>
      </tr>
    </tbody>
  </table>
 </div><p></p>`;
    } else if (type === 'resources') {
      snippet = `<div class="resources-card" style="margin: 14px 0; padding: 14px; border: 1.5px solid ${border}; background-color: ${bg}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01);">
  <h4 style="margin: 0 0 8px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
    📚 STUDY RESOURCES & REFERENCE ARCHIVE
  </h4>
  <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
    <div style="background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="font-size: 11px; color: #1e293b; display: block;">📖 Core Literature Database</strong>
        <p style="margin: 0; font-size: 10px; color: #64748b;">Primary textbook readings, research journals, and syllabus guides</p>
      </div>
      <span style="font-size: 10px; font-weight: 800; color: ${text}; background: ${bg}; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">Required</span>
    </div>
    <div style="background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="font-size: 11px; color: #1e293b; display: block;">🖥️ Interactive Virtual Library</strong>
        <p style="margin: 0; font-size: 10px; color: #64748b;">Lecture videos, visualization tools, and shared notes archives</p>
      </div>
      <span style="font-size: 10px; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">Optional</span>
    </div>
  </div>
 </div><p></p>`;
    } else if (type === 'feedback') {
      snippet = `<div class="feedback-metric-card" style="margin: 14px 0; padding: 14px; border: 1px solid ${border}; background-color: #ffffff; border-radius: 12px; border-left: 5px solid ${hex}; shadow: 0 4px 6px -1px rgba(0,0,0,0.01);">
  <h4 style="margin: 0 0 10px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
    🎯 ACADEMIC PERFORMANCE FEEDBACK METRIC
  </h4>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px;">
    <div style="background: ${bg}; padding: 10px; border-radius: 8px; border: 1px solid ${border}; text-align: center;">
      <span style="font-size: 18px; display: block; margin-bottom: 2px;">🧠</span>
      <strong style="font-size: 10px; color: #475569; text-transform: uppercase; display: block;">Comprehension</strong>
      <div style="font-size: 14px; font-weight: 900; color: ${text}; margin-top: 2px;">9.2 / 10</div>
    </div>
    <div style="background: ${bg}; padding: 10px; border-radius: 8px; border: 1px solid ${border}; text-align: center;">
      <span style="font-size: 18px; display: block; margin-bottom: 2px;">⚡</span>
      <strong style="font-size: 10px; color: #475569; text-transform: uppercase; display: block;">Focus Intensity</strong>
      <div style="font-size: 14px; font-weight: 900; color: ${text}; margin-top: 2px;">8.8 / 10</div>
    </div>
    <div style="background: ${bg}; padding: 10px; border-radius: 8px; border: 1px solid ${border}; text-align: center;">
      <span style="font-size: 18px; display: block; margin-bottom: 2px;">🔥</span>
      <strong style="font-size: 10px; color: #475569; text-transform: uppercase; display: block;">Daily Streak</strong>
      <div style="font-size: 14px; font-weight: 900; color: ${text}; margin-top: 2px;">12 Days</div>
    </div>
  </div>
  <div style="margin-top: 10px; padding: 8px; background: ${bg}; border-radius: 6px; font-size: 10px; color: #475569; font-weight: 500;">
    💡 <strong>Growth Diagnostic:</strong> Focus intensity remained strong; review core active-recall literature to elevate comprehension of complex sub-topics.
  </div>
 </div><p></p>`;
    } else if (type === 'dailylearning') {
      snippet = `<div class="daily-learning-card" style="margin: 14px 0; padding: 14px; border: 1px solid ${border}; background-color: ${bg}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01);">
  <h4 style="margin: 0 0 10px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
    📅 DAILY LEARNING & ACTION RETROSPECTIVE
  </h4>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid ${border};">
      <strong style="font-size: 10px; color: ${text}; text-transform: uppercase; display: block; margin-bottom: 3px;">☀️ Today's Major Academic Takeaway:</strong>
      <p style="margin: 0; font-size: 10.5px; color: #475569; font-weight: 500;">[Synthesize the single most important concept mastered today in 1-2 key sentences]</p>
    </div>
    <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid ${border};">
      <strong style="font-size: 10px; color: ${text}; text-transform: uppercase; display: block; margin-bottom: 3px;">🛠️ Immediate Real-World Application:</strong>
      <p style="margin: 0; font-size: 10.5px; color: #475569; font-weight: 500;">[How does this knowledge translate into direct clinical, financial, or academic breakthroughs?]</p>
    </div>
    <div style="background: #ffffff; padding: 8px; border-radius: 6px; border: 1px solid ${border};">
      <strong style="font-size: 10px; color: ${text}; text-transform: uppercase; display: block; margin-bottom: 3px;">⚠️ Friction Points & Strategy Adjustments:</strong>
      <p style="margin: 0; font-size: 10.5px; color: #475569; font-weight: 500;">[What was difficult? What adjustments will you make tomorrow to maintain high flow state?]</p>
    </div>
  </div>
 </div><p></p>`;
    } else if (type === 'selflearning') {
      snippet = `<div class="self-learning-card" style="margin: 14px 0; padding: 14px; border: 1.5px dashed ${hex}; background-color: #ffffff; border-radius: 12px;">
  <h4 style="margin: 0 0 10px 0; color: ${text}; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
    🧠 STRUCTURED SELF-LEARNING & ACTIVE RECALL NOTES
  </h4>
  <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-top: 8px;">
    <div style="background: ${bg}; padding: 10px; border-radius: 8px; border: 1px solid ${border};">
      <strong style="font-size: 10px; color: ${text}; text-transform: uppercase; display: block; margin-bottom: 6px;">🔑 Key Terminology</strong>
      <ul style="margin: 0; padding-left: 12px; font-size: 9.5px; color: #334155; line-height: 1.4;">
        <li><strong>Concept 1:</strong> [Definition]</li>
        <li><strong>Concept 2:</strong> [Definition]</li>
        <li><strong>Concept 3:</strong> [Definition]</li>
      </ul>
    </div>
    <div style="background: ${bg}; padding: 10px; border-radius: 8px; border: 1px solid ${border};">
      <strong style="font-size: 10px; color: ${text}; text-transform: uppercase; display: block; margin-bottom: 6px;">✍️ Deep Elaborative Exposition</strong>
      <p style="margin: 0; font-size: 10px; color: #334155; line-height: 1.4;">
        [Write comprehensive research notes, formulas, logical proofs, or study summaries here. Use this area to explain concepts to yourself in your own words to verify mental models.]
      </p>
    </div>
  </div>
 </div><p></p>`;
    }

    setFormContent(prev => prev + snippet);
    const labelType = type === 'threecols' ? '3-COLUMN MATRIX' : type === 'fourcols' ? '4-COLUMN MATRIX' : type.toUpperCase();
    showFeedback(`Appended color-matched ${name} ${labelType} directly to canvas!`);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto h-full flex flex-col overflow-hidden px-4 md:px-0">
      
      {/* Feedback banner */}
      {feedback && (
        <div className="fixed top-6 right-6 z-[999] bg-[#121824] text-white py-3 px-5 rounded-2xl shadow-xl border border-slate-700/65 font-black text-[10px] uppercase flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check size={14} className="text-emerald-400 stroke-[3]" />
          {feedback}
        </div>
      )}

      {/* Main Container - Scrollable Area with a smart customized scrollbar styled inside Tailwind */}
      <div className="flex-1 overflow-y-auto pb-24 pr-1 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
        
        {/* Compact Hero Header Area */}
        <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/[0.02] to-transparent p-6 rounded-[32px] border border-orange-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm mt-2">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-black text-[8px] uppercase tracking-wider border border-orange-200">
              <Sparkles size={10} className="animate-pulse" /> Reusable structures
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">List Templates</h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Design structured documents, define icon palettes, and inject smart blocks instantly.
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {onOpenSidebar && (
              <button 
                onClick={onOpenSidebar}
                className="md:hidden h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-xs font-black uppercase tracking-wider"
              >
                Menu
              </button>
            )}
            <button 
              onClick={handleOpenCreate}
              className="h-11 px-5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 hover:shadow-lg active:scale-95 transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <Plus size={15} strokeWidth={3} /> Create Custom Template
            </button>
          </div>
        </div>

        {/* Custom Codes & Presets Layout */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-500 tracking-widest uppercase flex items-center gap-1.5">
            <Bookmark size={13} className="text-orange-500" /> Presets & Custom Saved Templates ({allTemplates.length})
          </h2>

          {/* Sizing is a bit tighter as requested: compact cards layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allTemplates.map((template) => {
              const resolvedColor = presetColors.find(c => c.class === template.themeColor) || presetColors[0];
              return (
                <div 
                  key={template.id}
                  className="bg-white border border-slate-100 rounded-[24px] overflow-hidden hover:shadow-xl hover:border-slate-200/90 transition-all duration-300 flex flex-col h-full group"
                >
                  {/* Visual Accent Header Block */}
                  <div className={`p-4 pb-3.5 border-b border-dashed border-slate-100 ${resolvedColor.bg}/40 flex justify-between items-start transition-all`}>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase">
                        {template.isSystem ? '🔒 System Preset' : '⭐ Custom Template'}
                      </span>
                      <h3 className="text-sm font-black text-slate-800 group-hover:text-orange-600 transition-colors leading-tight truncate pr-2">{template.name}</h3>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${resolvedColor.dot} ring-3 ring-white shadow-sm shrink-0 mt-1`} />
                  </div>

                  {/* Body Details Area */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed line-clamp-2 min-h-[30px]">
                      {template.description || 'No custom details added. Click Edit to define outline templates description.'}
                    </p>

                    {/* Bullet Configuration Display details - Very Compact */}
                    <div className="space-y-2 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-wider">
                        <span>Marker Preset</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-white border font-bold text-[8px] text-slate-550 uppercase">
                          {template.defaultListType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white border shadow-sm border-slate-200 rounded-lg flex items-center justify-center text-sm font-black">
                          {template.defaultMarker}
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-black text-slate-400 block uppercase">Palette Shortcuts</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {template.defaultListType === 'checklist' 
                              ? template.customChecklists.slice(0, 5).map((e, idx) => (
                                  <span key={idx} className="text-[10px] bg-white border border-slate-100 w-4.5 h-4.5 flex items-center justify-center rounded-md font-mono">{e}</span>
                                ))
                              : template.customBullets.slice(0, 5).map((e, idx) => (
                                  <span key={idx} className="text-[10px] bg-white border border-slate-100 w-4.5 h-4.5 flex items-center justify-center rounded-md">{e}</span>
                                ))
                            }
                            {(template.defaultListType === 'checklist' ? template.customChecklists : template.customBullets).length > 5 && (
                              <span className="text-[8px] text-slate-400 font-bold font-mono">+{(template.defaultListType === 'checklist' ? template.customChecklists : template.customBullets).length - 5}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operational Toolbar Buttons inside each template card */}
                    <div className="space-y-2 pt-1 border-t border-slate-50">
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleUseTemplate(template, 'dpss')}
                          className="flex-1 h-8 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg hover:bg-orange-100/70 active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                        >
                          <FileText size={11} /> Note-taking
                        </button>
                        <button 
                          onClick={() => handleUseTemplate(template, 'selfLearning')}
                          className="flex-1 h-8 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                        >
                          <Sparkles size={11} /> Learning
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(template)}
                          className="flex-1 h-7.5 bg-white border border-slate-250 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg font-bold text-[9px] uppercase tracking-wide flex items-center justify-center"
                        >
                          {template.isSystem ? 'Clone & Customize' : 'Edit Template'}
                        </button>
                        {!template.isSystem && (
                          <button 
                            onClick={(e) => handleDelete(template.id, e)}
                            className="w-7.5 h-7.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-500 transition-all flex items-center justify-center shrink-0"
                            title="Delete Custom Template"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Spacious Interactive 3-column Custom Scrollable CREATE/EDIT Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[94vh] flex flex-col md:flex-row overflow-hidden animate-in zoom-in duration-300">
            
            {/* COLUMN 1: Settings Form Configuration Section (Left) */}
            <div className="md:w-[26%] border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col justify-between overflow-y-auto max-h-[35vh] md:max-h-none scrollbar-thin">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-950 tracking-tight">
                    {editingTemplate ? 'Modify Template' : 'Design Template'}
                  </h3>
                  <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Properties & Icon Rules</p>
                </div>

                {/* Template basic info inputs */}
                <div className="space-y-2.5">
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase pl-1">Name</label>
                    <input 
                      type="text" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Science Report Routine"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-400 text-slate-800"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase pl-1">Description</label>
                    <textarea 
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g. Structure reports, add experimental checkboxes and summary cards."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-400 text-slate-800 resize-none leading-normal"
                    />
                  </div>
                </div>

                {/* Color Tag picker (Expanded options: More Colors as requested) */}
                <div className="space-y-1.5 pt-1 border-t border-dashed border-slate-100">
                  <label className="text-[8px] font-black text-slate-400 uppercase pl-1">Card Theme Tag Color ({presetColors.length})</label>
                  <div className="grid grid-cols-6 gap-1.5 pt-0.5">
                    {presetColors.map(color => (
                      <button 
                        key={color.class}
                        type="button"
                        onClick={() => setFormColor(color.class)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center ring-offset-1 hover:scale-115 active:scale-90 transition-all bg-${color.class}-500`}
                        style={{ backgroundColor: color.class === 'slate' ? '#64748b' : color.class === 'red' ? '#ef4444' : color.class === 'yellow' ? '#eab308' : color.class === 'fuchsia' ? '#d946ef' : undefined }}
                        title={color.name}
                      >
                        {formColor === color.class ? (
                          <Check size={11} className="text-white stroke-[3.5]" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full bg-white opacity-40`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Palette selection & Default list formatting rules */}
                <div className="space-y-3 pt-3 border-t border-dashed border-slate-100">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">List Formatter rules</span>
                  
                  <div className="space-y-1.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-150">
                    <span className="text-[8px] font-black text-slate-400 uppercase block">1. List Type</span>
                    <div className="flex gap-1 pt-0.5">
                      <button 
                        type="button"
                        onClick={() => {
                          setFormListType('bullet');
                          setFormMarker(formBullets[0] || '•');
                        }}
                        className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 font-bold text-[8px] uppercase transition-all ${formListType === 'bullet' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <List size={11} /> Bullet
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setFormListType('checklist');
                          setFormMarker(formChecklists[0] || '⬜');
                        }}
                        className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 font-bold text-[8px] uppercase transition-all ${formListType === 'checklist' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <CheckSquare size={11} /> Check
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setFormListType('number');
                          setFormMarker('1.');
                        }}
                        className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 font-bold text-[8px] uppercase transition-all ${formListType === 'number' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <ListOrdered size={11} /> 1,2,3
                      </button>
                    </div>
                  </div>

                  {/* Bullet Palette Customize */}
                  {formListType === 'bullet' && (
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">2. Customized Bullet Palette</span>
                      <div className="grid grid-cols-6 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 max-h-[85px] overflow-y-auto">
                        {bulletPool.map((emoji) => {
                          const isActive = formBullets.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleBullet(emoji)}
                              className={`h-6 rounded flex items-center justify-center text-xs transition-all ${isActive ? 'bg-orange-500/10 border border-orange-500 text-slate-800 font-bold scale-105' : 'bg-white border border-slate-150 text-slate-400 hover:text-slate-600'}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase block pl-1">Starting Bullet</label>
                        <select 
                          value={formMarker}
                          onChange={(e) => setFormMarker(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-1.5 text-[10px] font-semibold text-slate-800 focus:outline-none"
                        >
                          {formBullets.map(b => (
                            <option key={b} value={b}>List starts with "{b}"</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Checklist Palette Customize */}
                  {formListType === 'checklist' && (
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">2. Customized Checkbox Icons</span>
                      <div className="grid grid-cols-6 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 max-h-[85px] overflow-y-auto">
                        {checklistPool.map((emoji) => {
                          const isActive = formChecklists.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleChecklist(emoji)}
                              className={`h-6 rounded flex items-center justify-center text-xs transition-all ${isActive ? 'bg-orange-500/10 border border-orange-500 text-slate-800 font-bold scale-105' : 'bg-white border border-slate-150 text-slate-400 hover:text-slate-600'}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[8px] font-black text-slate-400 uppercase block pl-1">Starting Checkbox</label>
                        <select 
                          value={formMarker}
                          onChange={(e) => setFormMarker(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-1.5 text-[10px] font-semibold text-slate-800 focus:outline-none"
                        >
                          {formChecklists.map(c => (
                            <option key={c} value={c}>Checklist starts with "{c}"</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 3. Typography Selecting */}
                  <div className="space-y-3 pt-3 border-t border-dashed border-slate-100">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">3. Typography Styling</span>
                    
                    {/* Header Font and Size */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-150 space-y-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase block pl-1">Header (H1 - H4)</span>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-0.5">
                          <label className="text-[7.5px] font-black text-slate-450 uppercase pl-0.5 block">Font</label>
                          <select 
                            value={formHeaderFontFamily}
                            onChange={(e) => setFormHeaderFontFamily(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md py-1 px-1.5 text-[10px] font-semibold text-slate-800 focus:outline-none"
                          >
                            {fontFamilies.map(f => (
                              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-[70px] space-y-0.5">
                          <label className="text-[7.5px] font-black text-slate-455 uppercase pl-0.5 block">Size</label>
                          <select 
                            value={formHeaderFontSize}
                            onChange={(e) => setFormHeaderFontSize(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-md py-1 px-1.5 text-[10px] font-semibold text-slate-800 focus:outline-none text-center"
                          >
                            {[14, 16, 18, 20, 22, 24, 26, 28, 30, 32].map(s => (
                              <option key={s} value={s}>{s}px</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Paragraph Style */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-150 space-y-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase block pl-1">Paragraph (Body Text)</span>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-0.5">
                          <label className="text-[7.5px] font-black text-slate-455 uppercase pl-0.5 block">Font</label>
                          <select 
                            value={formTextFontFamily}
                            onChange={(e) => setFormTextFontFamily(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md py-1 px-1.5 text-[10px] font-semibold text-slate-800 focus:outline-none"
                          >
                            {fontFamilies.map(f => (
                              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-[70px] space-y-0.5">
                          <label className="text-[7.5px] font-black text-slate-455 uppercase pl-0.5 block">Size</label>
                          <select 
                            value={formTextFontSize}
                            onChange={(e) => setFormTextFontSize(Number(e.target.value))}
                            className="w-full bg-white border border-slate-250 rounded-md py-1 px-1.5 text-[10px] font-semibold text-slate-800 focus:outline-none text-center"
                          >
                            {[11, 12, 13, 14, 15, 16, 17, 18, 20, 22].map(s => (
                              <option key={s} value={s}>{s}px</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex gap-2 pt-4 border-t border-slate-100 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-9 border border-slate-250 rounded-xl hover:bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSave}
                  className="flex-1 h-9 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-black text-[10px] uppercase tracking-wider shadow-sm"
                >
                  {editingTemplate ? 'Save' : 'Save New'}
                </button>
              </div>
            </div>

            {/* COLUMN 2: Rich Content List Editor Building Canvas (Center) */}
            <div className="flex-1 bg-slate-50/40 p-5 flex flex-col space-y-3.5 border-b md:border-b-0 md:border-r border-slate-100 min-h-[40vh] md:min-h-0">
              <div className="flex justify-between items-center shrink-0">
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Template Content Builder</h4>
                  <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Outline elements and dynamic blocks inside</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    if(window.confirm('Do you want to reset template canvas content?')) {
                      setFormContent('<h3>New List Custom Template</h3><p>Start outlining your structured lists here...</p>');
                    }
                  }} 
                  className="px-2 py-0.5 text-[8px] bg-white border border-slate-250 font-black text-slate-500 uppercase rounded-md hover:text-red-500 transition-colors"
                  title="Reset Content to Default"
                >
                  Reset
                </button>
              </div>

              {/* Dynamic Status / Floating Toolbar feedback */}
              <div className="bg-orange-50 text-orange-850 p-2.5 rounded-xl font-bold text-[9px] uppercase border border-orange-100/70 flex items-center gap-1.5 select-none leading-relaxed">
                <CheckSquare size={12} className="shrink-0 text-orange-500" />
                <span>Format rules active! Tab key indentation / Enter keys preserve customized markers.</span>
              </div>

              {/* Actual live-editable RichTextDiv area with the dynamic icon configs injected */}
              <div className="flex-1 bg-white border border-slate-200 rounded-[20px] overflow-hidden flex flex-col shadow-inner min-h-0 editor-canvas">
                <style dangerouslySetInnerHTML={{ __html: `
                  .editor-canvas h1, .editor-canvas h2, .editor-canvas h3, .editor-canvas h4 {
                    font-family: "${formHeaderFontFamily}", sans-serif !important;
                    font-size: ${formHeaderFontSize}px !important;
                    line-height: 1.3 !important;
                  }
                  .editor-canvas p, .editor-canvas li, .editor-canvas td, .editor-canvas div {
                    font-family: "${formTextFontFamily}", sans-serif !important;
                    font-size: ${formTextFontSize}px !important;
                  }
                ` }} />
                <RichTextDiv 
                  value={formContent}
                  onChange={setFormContent}
                  className="flex-1 p-4 overflow-y-auto outline-none prose max-w-none custom-scrollbar"
                  placeholder="Select elements or type in text, use bullet configurations..."
                  customBullets={formBullets}
                  customChecklists={formChecklists}
                  style={{
                    fontFamily: formTextFontFamily,
                    fontSize: `${formTextFontSize}px`
                  }}
                />
              </div>
            </div>

            {/* COLUMN 3: Special Card Insert Sidebar Panel (Right - New!) */}
            <div className="md:w-[26%] bg-slate-50/70 p-5 flex flex-col justify-between overflow-y-auto max-h-[35vh] md:max-h-none scrollbar-thin">
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1">
                    <PaletteIcon size={14} className="text-orange-500" /> Instant Layouts
                  </h3>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">Click any circle to insert beautifully custom-styled cards</p>
                </div>

                {/* Custom Icon Gallery */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Star size={13} className="text-yellow-500" /> Layout Primary Icon
                  </span>
                  <div className="grid grid-cols-7 gap-1 pt-1 max-h-[80px] overflow-y-auto">
                    {frameworkIconPool.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedFrameworkIcon(icon)}
                        className={`h-6 rounded flex items-center justify-center text-[12px] transition-all hover:scale-115 ${selectedFrameworkIcon === icon ? 'bg-orange-100 border border-orange-500 scale-105 shadow-sm' : 'bg-slate-50 border border-slate-100'}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Synthesis Card Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Layers size={13} className="text-blue-500" /> Insert Synthesis Card
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('synthesis', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Synthesis block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">💡</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q&A Board Card Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <HelpCircle size={13} className="text-indigo-500" /> Insert Q&A Board
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('qa', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Q&A block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">❓</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* New: Insert Resources */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <BookOpen size={13} className="text-emerald-500" /> Insert Resources
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('resources', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Resources block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">📚</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* New: Use Feedback Metric */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Activity size={13} className="text-amber-500" /> Use Feedback Metric
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('feedback', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Feedback Metric block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">🎯</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* New: Daily Learning */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Zap size={13} className="text-orange-500" /> Daily Learning
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('dailylearning', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Daily Learning block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">📅</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* New: Self-Learning and Note-Taking */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <FileText size={13} className="text-cyan-500" /> Self-learning and note-taking
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('selflearning', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Self-Learning Notes block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">🧠</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brainstorm Card Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Brain size={13} className="text-purple-500" /> Insert Brainstorm Map
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('brainstorm', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Brainstorm block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">🌀</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pros & Cons Card Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Scale size={13} className="text-emerald-500" /> Insert Pros & Cons Grid
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('proscons', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Pros & Cons block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">⚖️</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task Matrix Table Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Activity size={13} className="text-rose-500" /> Insert Task Matrix Table
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('taskmatrix', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Task Matrix Table block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">📊</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resource Library Table Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <BookOpen size={13} className="text-cyan-500" /> Insert Resource Library
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('resourcelibrary', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`Resource Library Table block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">📚</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3-Column Tri-Matrix Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Scale size={13} className="text-blue-500" /> Insert 3-Column Tri-Matrix
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('threecols', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`3-Column Comparison block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">⚖️</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4-Column Quad-Matrix Selector */}
                <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                    <Scale size={13} className="text-orange-500" /> Insert 4-Column Quad-Matrix
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {insertionColors.map((colorObj, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => insertSpecialBlock('fourcols', colorObj)}
                        className={`w-7 h-7 rounded-full border border-slate-100 flex items-center justify-center hover:scale-115 active:scale-90 transition-all ${colorObj.dot} bg-opacity-90 shadow-sm`}
                        title={`4-Column Quad-Matrix block in ${colorObj.name}`}
                      >
                        <span className="text-[14px] leading-none mb-0.5 text-white">⚖️</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smart Components Injection (Small Blocks) */}
                <div className="space-y-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <span className="text-[9px] font-black text-slate-700 uppercase flex items-center gap-1">
                      <Zap size={13} className="text-orange-500" /> Smart Components
                    </span>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Insert interactive elements into tables or text</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => {
                        const html = '<span contenteditable="false" class="task-checkbox" style="cursor: pointer; user-select: none; margin-right: 4px;">⬜</span>';
                        setFormContent(prev => prev + html);
                        showFeedback('Inserted Smart Checkbox!');
                      }}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center gap-1"
                    >
                      <CheckSquare size={10} /> Smart Box
                    </button>
                    <button 
                      onClick={() => {
                        const html = '<span style="background: #fef2f2; color: #ef4444; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px; margin: 0 4px;">🔥 HIGH</span>';
                        setFormContent(prev => prev + html);
                        showFeedback('Inserted High Priority Badge!');
                      }}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-1"
                    >
                      <Star size={10} /> High Badge
                    </button>
                    <button 
                      onClick={() => {
                        const html = '<span style="background: #f0fdf4; color: #166534; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px; margin: 0 4px;">✅ DONE</span>';
                        setFormContent(prev => prev + html);
                        showFeedback('Inserted Done Badge!');
                      }}
                      className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center gap-1"
                    >
                      <Check size={10} /> Done Badge
                    </button>
                  </div>
                </div>

              </div>

              {/* Status footer instructions */}
              <div className="text-[8px] text-slate-400 font-bold leading-relaxed pt-4 border-t border-slate-150 uppercase text-center">
                Injected blocks are fully responsive, color-matched, and directly editable inside the builder canvas.
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
