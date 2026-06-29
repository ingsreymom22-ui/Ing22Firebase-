import React, { useMemo, useState } from 'react';
import { AppData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { format, subDays, addDays, eachDayOfInterval, isSameDay, parseISO, isValid, startOfWeek, isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Wallet, Target, Sparkles, Brain, ArrowUpRight, Download, Calendar, CheckCircle2, RefreshCw } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  data: AppData;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const calculateStreak = (habit: any, completions: any) => {
  let currentStreak = 0;
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');

  const isCompleted = (dateKey: string) => {
    const comp = completions[dateKey]?.[habit.id];
    if (comp === undefined || comp === null) return false;
    if (habit.isNumeric) {
      return typeof comp === 'number' ? comp >= (habit.targetValue || 0) : !!comp;
    }
    return !!comp;
  };

  let dateToCheck = today;
  if (!isCompleted(todayKey)) {
    if (!isCompleted(yesterdayKey)) return 0;
    dateToCheck = subDays(today, 1);
  }

  let safetyLimit = 1000;
  while (safetyLimit > 0) {
    safetyLimit--;
    const dateKey = format(dateToCheck, 'yyyy-MM-dd');
    if (isCompleted(dateKey)) {
      currentStreak++;
      dateToCheck = subDays(dateToCheck, 1);
    } else {
      break;
    }
  }
  return currentStreak;
};

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [financeRange, setFinanceRange] = useState<'7d' | '30d' | '90d' | 'Month' | 'Year' | 'Custom'>('Month');
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const [reportText, setReportText] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  const generateGeminiSummary = async () => {
    setLoadingReport(true);
    setReportError('');
    setReportText('');
    setLoadingStatus('Initializing Peak Performance Engine...');
    
    try {
      const last7DaysInterval = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
      const formattedLogs = last7DaysInterval.map(day => {
        const dKey = format(day, 'yyyy-MM-dd');
        const journalObj = data.journalEntries?.[dKey];
        const dayCompletions = data.dailyPerformanceCompletions?.[dKey] || {};
        const activeTasks = data.dailyPerformanceTasks || [];
        
        const completedTasks = activeTasks.filter(t => dayCompletions[t.id]).map(t => t.name);
        const pendingTasks = activeTasks.filter(t => !dayCompletions[t.id]).map(t => t.name);
        
        return `
Date: ${dKey}
Journal Details:
- Affirmation: ${journalObj?.affirmation || 'None'}
- Key Gratitude: ${journalObj?.gratitude || 'None'}
- Achievements: ${journalObj?.achievements?.join(', ') || 'None'}
- Learnings: ${journalObj?.learning || 'None'}
- Discipline/Routine: ${journalObj?.discipline || 'None'}
- Focus Level: ${journalObj?.focusRating !== undefined ? `${journalObj.focusRating}/10` : 'Not Rated'}
- Energy Level: ${journalObj?.energyRating !== undefined ? `${journalObj.energyRating}/10` : 'Not Rated'}
- Productivity: ${journalObj?.productivityRating !== undefined ? `${journalObj.productivityRating}/10` : 'Not Rated'}

Daily Performance Checklist:
- Completed Tasks: ${completedTasks.join(', ') || 'None'}
- Outstanding Tasks: ${pendingTasks.join(', ') || 'None'}
`;
      }).join('\n---\n');

      setLoadingStatus('Gathering structural notes and learning patterns...');
      const totalNotesCount = (data.dpssTopics || []).length;
      const selfLearningTopics = (data.selfLearningTopics || []).map(t => t.title).join(', ') || 'None';

      const finalPrompt = `
You are the Growth Portal peak performance intelligence system. Critically analyze the user's weekly performance metrics, notes, and progress logs, and output an executive summarized performance report with coaching directives.

USER PROGRESS ENVIRONMENT IN THE PAST 7 DAYS:
${formattedLogs}

Total Note-taking topics created: ${totalNotesCount}
Self-Learning research areas: ${selfLearningTopics}

Please construct your response with the following sections formatted in beautiful Markdown:
1. **Executive Performance Recap**: Summarize accomplishments and highlight clear weekly strengths based on the ratings and journals.
2. **Task Completion Audit**: Critically review their checklist performance (completed vs outstanding tasks).
3. **Discipline & Knowledge Synthesis**: Evaluate their cognitive focus (based on learnings and notes created).
4. **Coaching Recommendations**: Deliver 3 highly tactical action items for next week's focus of energy.

Keep the tone encouraging, premium, and professional. Deeply reference specific learnings or ratings that the user has inputted.
`;

      setLoadingStatus('Consulting Gemini AI Coach...');
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: 'gemini-3.5-flash',
          systemInstruction: 'You are an executive high-performance coach specializing in cognitive optimization and routine discipline.'
        })
      });

      if (!response.ok) {
        throw new Error('Could not get response from AI summary endpoint.');
      }

      setLoadingStatus('Formulating peak coaching protocols...');
      const resData = await response.json();
      if (resData.error) {
        throw new Error(resData.error);
      }
      setReportText(resData.text || '');
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || 'Error occurred while constructing the report. Please try again.');
    } finally {
      setLoadingReport(false);
      setLoadingStatus('');
    }
  };

  const financeFilterInterval = useMemo(() => {
    const now = new Date();
    switch (financeRange) {
      case '7d': return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case '30d': return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case '90d': return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      case 'Month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'Year': return { start: startOfYear(now), end: endOfDay(now) };
      case 'Custom': return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
    }
  }, [financeRange, customStart, customEnd]);

  const exportToCSV = () => {
    const habits = data.habits || [];
    const completions = data.habitCompletions || {};
    const journalEntries = data.journalEntries || {};
    
    // Collect all unique dates from completions and journal entries
    const allDates = new Set<string>();
    Object.keys(completions).forEach(d => allDates.add(d));
    Object.keys(journalEntries).forEach(d => allDates.add(d));
    
    // If no dates, add today
    if (allDates.size === 0) {
      allDates.add(format(new Date(), 'yyyy-MM-dd'));
    }
    
    const sortedDates = Array.from(allDates).sort();
    
    // Headers
    const headers = [
      'Date',
      'Weekday',
      ...habits.map(h => `Habit: ${h.name.replace(/"/g, '""')}`),
      'Total Habits Completed',
      'Completion Rate %',
      'Energy Rating (0-10)',
      'Focus Rating (0-10)',
      'Productivity Rating (0-10)',
      'Stress Rating (0-10)',
      'Gratitude Rating (0-10)',
      'Vitality Rating (0-10)',
      'Journal Entry Saved'
    ];
    
    let csvContent = '\uFEFF'; // Add BOM for Excel UTF-8 support
    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
    
    sortedDates.forEach(dateStr => {
      let dateObj;
      try {
        dateObj = parseISO(dateStr);
      } catch(e) {
        dateObj = new Date(dateStr);
      }
      
      let weekday = 'Unknown';
      if (isValid(dateObj)) {
        weekday = format(dateObj, 'EEEE');
      }
      
      const habitCompletedStatuses = habits.map(h => {
        const comp = completions[dateStr]?.[h.id];
        if (comp === undefined || comp === null) return 'No Track';
        if (h.isNumeric) {
          const threshold = h.targetValue || 1;
          const valText = typeof comp === 'number' ? comp : (comp ? threshold : 0);
          const done = valText >= threshold;
          return done ? `Completed (${valText}/${threshold} ${h.unit || ''})` : `Incomplete (${valText}/${threshold} ${h.unit || ''})`;
        } else {
          return comp ? 'Completed' : 'Incomplete';
        }
      });
      
      const totalCompleted = habits.filter(h => {
        const comp = completions[dateStr]?.[h.id];
        if (comp === undefined || comp === null) return false;
        if (h.isNumeric) {
          return typeof comp === 'number' ? comp >= (h.targetValue || 1) : !!comp;
        }
        return !!comp;
      }).length;
      
      const completionRate = habits.length > 0 ? ((totalCompleted / habits.length) * 100).toFixed(1) : '0';
      
      const journal = journalEntries[dateStr];
      const energy = journal?.energyRating !== undefined ? journal.energyRating : '';
      const focus = journal?.focusRating !== undefined ? journal.focusRating : '';
      const productivity = journal?.productivityRating !== undefined ? journal.productivityRating : '';
      const stress = journal?.stressRating !== undefined ? journal.stressRating : '';
      const gratitude = journal?.gratitudeRating !== undefined ? journal.gratitudeRating : ''; 
      const vitality = journal?.vitalityRating !== undefined ? journal.vitalityRating : '';
      const isCompleted = journal ? 'Yes' : 'No';
      
      const row = [
        dateStr,
        weekday,
        ...habitCompletedStatuses,
        totalCompleted,
        completionRate,
        energy,
        focus,
        productivity,
        stress,
        gratitude,
        vitality,
        isCompleted
      ];
      
      csvContent += row.map(val => {
        const cleaned = String(val).replace(/"/g, '""');
        return `"${cleaned}"`;
      }).join(',') + '\n';
    });
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Habit_Progress_Statistics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const quickGlanceStats = useMemo(() => {
    if (!data.habits || data.habits.length === 0) return null;
    
    const currentWeekStart = subDays(new Date(), 6);
    const prevWeekStart = subDays(new Date(), 13);

    const habitStats = (data.habits || []).map(habit => {
      let currentWeekCompleted = 0;
      let prevWeekCompleted = 0;

      for (let i = 0; i < 7; i++) {
        const cDay = format(addDays(currentWeekStart, i), 'yyyy-MM-dd');
        const pDay = format(addDays(prevWeekStart, i), 'yyyy-MM-dd');
        
        if (data.habitCompletions?.[cDay]?.[habit.id]) currentWeekCompleted++;
        if (data.habitCompletions?.[pDay]?.[habit.id]) prevWeekCompleted++;
      }

      const currentRate = currentWeekCompleted / 7;
      const prevRate = prevWeekCompleted / 7;
      const improvement = currentRate - prevRate;

      return { habit, improvement, currentRate, currentWeekCompleted };
    });

    const mostImproved = [...habitStats].sort((a, b) => b.improvement - a.improvement)[0];
    const highestRisk = [...habitStats].sort((a, b) => a.currentRate - b.currentRate)[0];

    return { mostImproved, highestRisk };
  }, [data.habits, data.habitCompletions]);

  // 1. Habit Completion Data (Last 7 days)
  const habitData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const completions = data.habitCompletions?.[dateKey] || {};
      const completedCount = Object.values(completions).filter(Boolean).length;
      const totalHabits = data.habits?.length || 0;
      
      return {
        date: format(day, 'MMM dd'),
        completed: completedCount,
        percentage: totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0
      };
    });
  }, [data.habitCompletions, data.habits]);

  const dailyPerformanceTaskData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    const tasks = data.dailyPerformanceTasks || [];
    const completions = data.dailyPerformanceCompletions || {};

    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayCompletions = completions[dateKey] || {};
      
      const totalActiveTasks = tasks.length;
      const completedTasksCount = tasks.filter(t => dayCompletions[t.id] === true).length;
      const completionRate = totalActiveTasks > 0 ? Math.round((completedTasksCount / totalActiveTasks) * 100) : 0;

      return {
        date: format(day, 'MMM dd'),
        completed: completedTasksCount,
        total: totalActiveTasks,
        rate: completionRate,
      };
    });
  }, [data.dailyPerformanceTasks, data.dailyPerformanceCompletions]);

  const radarHabitData = useMemo(() => {
    const habits = data.habits || [];
    const completions = data.habitCompletions || {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      return format(subDays(new Date(), i), 'yyyy-MM-dd');
    });

    const list = habits.map(habit => {
      let completedCount = 0;
      last7Days.forEach(dateKey => {
        const comp = completions[dateKey]?.[habit.id];
        if (comp !== undefined && comp !== null) {
          const isCompleted = habit.isNumeric
            ? (typeof comp === 'number' ? comp >= (habit.targetValue || 1) : !!comp)
            : !!comp;
          if (isCompleted) completedCount++;
        }
      });
      const percent = Math.round((completedCount / 7) * 100);
      return {
        subject: habit.name.length > 12 ? habit.name.substring(0, 12) + '...' : habit.name,
        Percentage: percent,
        fullMark: 100
      };
    });

    // If there are no habits, output a warm placeholder set of classic high-performance metrics
    if (list.length === 0) {
      return [
        { subject: 'Focus block', Percentage: 75, fullMark: 100 },
        { subject: 'Hydration', Percentage: 90, fullMark: 100 },
        { subject: 'Slow Reading', Percentage: 60, fullMark: 100 },
        { subject: 'Walk/Nature', Percentage: 80, fullMark: 100 },
        { subject: 'Gratitude', Percentage: 85, fullMark: 100 },
      ];
    }
    return list;
  }, [data.habits, data.habitCompletions]);

  // 2. Expense Category Breakdown
  const expenseData = useMemo(() => {
    const monthlyExpenses = (data.expenses || []).filter(e => {
      if (e.type !== 'Expense') return false;
      const d = parseISO(e.date);
      return isWithinInterval(d, financeFilterInterval);
    });

    const categories: Record<string, number> = {};
    monthlyExpenses.forEach(e => {
      // Basic normalization to USD for the chart
      const amount = e.currency === 'KHR' ? (e.amount / (data.settings?.exchangeRate || 4000)) : e.amount;
      categories[e.category] = (categories[e.category] || 0) + amount;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.expenses, data.settings?.exchangeRate, financeFilterInterval]);

  // 3. Productivity Ratings (from Journal)
  const productivityData = useMemo(() => {
    const days = eachDayOfInterval(financeFilterInterval);

    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const entry = data.journalEntries?.[dateKey];
      
      return {
        date: format(day, 'MMM dd'),
        energy: entry?.energyRating || 0,
        focus: entry?.focusRating || 0,
        productivity: entry?.productivityRating || 0
      };
    }).filter(d => d.energy > 0 || d.focus > 0 || d.productivity > 0);
  }, [data.journalEntries, financeFilterInterval]);

  // 4. Financial Status Overview
  const financeOverview = useMemo(() => {
    const expenses = (data.expenses || []).filter(e => {
      const d = parseISO(e.date);
      return isWithinInterval(d, financeFilterInterval);
    });

    const totalIncome = expenses.filter(e => e.type === 'Income').reduce((acc, curr) => {
      const amt = curr.currency === 'KHR' ? curr.amount / (data.settings?.exchangeRate || 4000) : curr.amount;
      return acc + amt;
    }, 0);
    const totalExpense = expenses.filter(e => e.type === 'Expense').reduce((acc, curr) => {
      const amt = curr.currency === 'KHR' ? curr.amount / (data.settings?.exchangeRate || 4000) : curr.amount;
      return acc + amt;
    }, 0);

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [data.expenses, data.settings?.exchangeRate, financeFilterInterval]);

  // 5. Habit Streaks Data
  const streakData = useMemo(() => {
    return (data.habits || []).map(habit => ({
      name: habit.name.length > 25 ? habit.name.substring(0, 25) + '...' : habit.name,
      streak: calculateStreak(habit, data.habitCompletions || {})
    })).sort((a, b) => b.streak - a.streak).slice(0, 5); // Show top 5
  }, [data.habits, data.habitCompletions]);

  const exportExecutiveSummary = async () => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-999999';
    container.style.pointerEvents = 'none';
    container.style.width = '800px';
    container.style.boxSizing = 'border-box';
    container.style.padding = '40px';
    container.style.backgroundColor = 'white';
    container.style.color = '#0f172a';
    container.style.fontFamily = "'Inter', sans-serif";
    container.style.lineHeight = '1.5';
    container.style.textAlign = 'left';

    const inc = financeOverview.income;
    const exp = financeOverview.expense;
    const bal = financeOverview.balance;

    const avgCompletion = habitData.length > 0 
      ? Math.round(habitData.reduce((acc, curr) => acc + curr.percentage, 0) / habitData.length)
      : 0;

    const topCategories = expenseData.slice(0, 8);
    const catColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

    const html = `
      <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase;">Executive Performance Summary</h1>
        <p style="font-size: 12px; font-weight: 600; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">
          Report Window: ${format(financeFilterInterval.start, 'MMM dd')} - ${format(financeFilterInterval.end, 'MMM dd, yyyy')} • Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}
        </p>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <!-- Habit Insights -->
        <div style="flex: 1; padding: 25px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 14px; font-weight: 900; color: #0284c7; text-transform: uppercase; margin-top: 0;">Habit Execution Rate</h2>
          <div style="font-size: 36px; font-weight: 900; margin-top: 15px;">${avgCompletion}%</div>
          <p style="font-size: 11px; font-weight: bold; color: #64748b; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Average Task Completion</p>
        </div>

        <!-- Financial Overview -->
        <div style="flex: 1; padding: 25px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 14px; font-weight: 900; color: ${bal >= 0 ? '#10b981' : '#ef4444'}; text-transform: uppercase; margin-top: 0;">Operating Cashflow</h2>
          <div style="font-size: 36px; font-weight: 900; margin-top: 15px; color: ${bal >= 0 ? '#059669' : '#dc2626'};">$${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div style="display: flex; gap: 10px; margin-top: 5px;">
            <p style="font-size: 10px; font-weight: bold; color: #10b981; margin: 0; display: flex; align-items: center; gap: 4px;">+$${inc.toLocaleString(undefined, { minimumFractionDigits: 0 })} IN</p>
            <p style="font-size: 10px; font-weight: bold; color: #ef4444; margin: 0; display: flex; align-items: center; gap: 4px;">-$${exp.toLocaleString(undefined, { minimumFractionDigits: 0 })} OUT</p>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        
        <div style="flex: 1;">
          <h2 style="font-size: 13px; font-weight: 900; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Top Streaks (High Priority)</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="text-align: left;">
                <th style="padding: 10px 0; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Discipline</th>
                <th style="padding: 10px 0; font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; text-align: right; border-bottom: 1px solid #e2e8f0;">Streak</th>
              </tr>
            </thead>
            <tbody>
              ${streakData.length > 0 ? streakData.map(s => `
                <tr style="border-bottom: 1px solid #f8fafc;">
                  <td style="padding: 12px 0; font-size: 13px; font-weight: bold; color: #334155;">${s.name}</td>
                  <td style="padding: 12px 0; font-size: 13px; font-weight: 900; color: #f59e0b; text-align: right;">${s.streak} Days 🔥</td>
                </tr>
              `).join('') : `<tr><td colspan="2" style="padding: 15px 0; text-align: center; color: #94a3b8; font-size: 11px;">No active streaks found.</td></tr>`}
            </tbody>
          </table>
        </div>

        <div style="flex: 1;">
          <h2 style="font-size: 13px; font-weight: 900; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; color: #1e293b; text-transform: uppercase; letter-spacing: 1px;">Expense Distribution</h2>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
            ${topCategories.length > 0 ? topCategories.map((c, idx) => `
              <li style="font-size: 12px; font-weight: bold; border-bottom: 1px solid #f8fafc; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span style="display: flex; align-items: center; gap: 8px; color: #475569;">
                  <div style="width: 12px; height: 12px; border-radius: 4px; background-color: ${catColors[idx % catColors.length]}"></div>
                  ${c.name}
                </span>
                <span style="font-weight: 900; color: #0f172a;">$${c.value.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              </li>
            `).join('') : `<li style="text-align: center; color: #94a3b8; font-size: 11px; padding: 15px 0;">No active expenses found in this range.</li>`}
          </ul>
        </div>
      </div>
    `;

    container.innerHTML = html;
    document.body.appendChild(container);

    // Give browser brief window to layout and paint the added container
    await new Promise(resolve => setTimeout(resolve, 100));

    // To prevent html2canvas from crash-looping or hanging on modern CSS stylesheet rules (e.g. Tailwind v4 variables, container queries),
    // we temporarily disable all external stylesheets during PDF rendering.
    const disabledSheets: (HTMLStyleElement | HTMLLinkElement)[] = [];
    try {
      Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((sheet) => {
        if (sheet instanceof HTMLStyleElement || sheet instanceof HTMLLinkElement) {
          if (!container.contains(sheet) && (sheet as any).disabled !== true) {
            (sheet as any).disabled = true;
            disabledSheets.push(sheet);
          }
        }
      });
    } catch (err) {
      console.warn("Could not disable style sheets during PDF render:", err);
    }

    try {
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Executive_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          width: 800,
          windowWidth: 800,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      await html2pdf().set(opt).from(container).save();
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
      document.body.removeChild(container);
    }
  };

  // Weekly comparisons of Income vs. Expense
  const weeklyFinanceData = useMemo(() => {
    const expenses = (data.expenses || []).filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, financeFilterInterval);
    });
    const exchangeRate = data.settings?.exchangeRate || 4000;
    
    // Group entries by week start (Monday)
    const weekMap: Record<string, { income: number; expense: number }> = {};
    
    expenses.forEach(e => {
      if (!e.date) return;
      let d: Date;
      try {
        d = new Date(e.date);
        if (isNaN(d.getTime())) return;
      } catch (err) {
        return;
      }
      
      const wkStart = startOfWeek(d, { weekStartsOn: 1 }); // Monday start
      const key = format(wkStart, 'yyyy-MM-dd');
      
      if (!weekMap[key]) {
        weekMap[key] = { income: 0, expense: 0 };
      }
      
      const val = e.currency === 'KHR' ? e.amount / exchangeRate : e.amount;
      if (e.type === 'Income') {
        weekMap[key].income += val;
      } else {
        weekMap[key].expense += val;
      }
    });
    
    // Turn map into sorted list of weeks in the range
    const allWeeks = Object.keys(weekMap).sort();
    
    // If we have no weeks at all, add a default fallback empty week so the chart doesn't look bad
    if (allWeeks.length === 0) {
      const todayWk = startOfWeek(new Date(), { weekStartsOn: 1 });
      allWeeks.push(format(todayWk, 'yyyy-MM-dd'));
      weekMap[format(todayWk, 'yyyy-MM-dd')] = { income: 0, expense: 0 };
    }
    
    return allWeeks.map(key => {
      const d = new Date(key);
      const values = weekMap[key];
      return {
        _rawDate: key,
        week: `Wk of ${format(d, 'MMM dd')}`,
        Income: Math.round(values.income * 100) / 100,
        Expense: Math.round(values.expense * 100) / 100,
      };
    });
  }, [data.expenses, data.settings?.exchangeRate, financeFilterInterval]);

  return (
    <div className="w-full flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar-amber p-4 md:p-8 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
      <div className="w-full space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Growth Analytics</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Measuring progress, reflecting on performance</p>
            
            {/* Range Filter UI */}
            <div className="flex flex-wrap items-center gap-2 mt-6">
               <div className="flex bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200">
                  {(['7d', '30d', '90d', 'Month', 'Year', 'Custom'] as const).map(range => (
                     <button
                        key={range}
                        onClick={() => setFinanceRange(range)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${financeRange === range ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        {range}
                     </button>
                  ))}
               </div>

               {financeRange === 'Custom' && (
                  <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 ml-2 animate-in fade-in slide-in-from-left-2 duration-300">
                     <div className="flex flex-col px-2">
                        <span className="text-[7px] font-black uppercase text-slate-400">Start</span>
                        <input 
                           type="date" 
                           value={customStart}
                           onChange={e => setCustomStart(e.target.value)}
                           className="bg-transparent text-[10px] font-black text-slate-900 outline-none"
                        />
                     </div>
                     <div className="w-[1px] h-6 bg-slate-200" />
                     <div className="flex flex-col px-2">
                        <span className="text-[7px] font-black uppercase text-slate-400">End</span>
                        <input 
                           type="date" 
                           value={customEnd}
                           onChange={e => setCustomEnd(e.target.value)}
                           className="bg-transparent text-[10px] font-black text-slate-900 outline-none"
                        />
                     </div>
                  </div>
               )}

               <div className="flex items-center gap-2 ml-2 px-4 py-2 bg-slate-900/5 rounded-2xl text-slate-500 font-black text-[9px] uppercase tracking-widest border border-slate-200">
                  <Calendar size={12} />
                  <span>{format(financeFilterInterval.start, 'MMM dd')} - {format(financeFilterInterval.end, 'MMM dd, yyyy')}</span>
               </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
             <button
                id="export-executive-summary-btn"
                onClick={exportExecutiveSummary}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-3xl shadow-lg border border-emerald-500 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-emerald-500/25"
             >
                <Download size={14} strokeWidth={3} />
                <span>Executive Summary PDF</span>
             </button>
             <button
                id="export-progress-stats-btn"
                onClick={exportToCSV}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-3xl shadow-lg border border-amber-500 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-amber-500/25"
             >
                <Download size={14} strokeWidth={3} />
                <span>Export CSV Stats</span>
             </button>
             <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                   <TrendingUp size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Balance</p>
                   <p className="text-xl font-black text-slate-900 italic tracking-tighter">${financeOverview.balance.toFixed(2)}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard 
              label="Active Habits" 
              value={data.habits?.length || 0} 
              icon={Activity} 
              color="orange"
              trend="+2 this week"
           />
           <StatCard 
              label="Total Income" 
              value={`$${financeOverview.income.toFixed(0)}`} 
              icon={TrendingUp} 
              color="emerald"
              trend="All time"
           />
           <StatCard 
              label="Total Expenses" 
              value={`$${financeOverview.expense.toFixed(0)}`} 
              icon={TrendingDown} 
              color="rose"
              trend="All time"
           />
           <StatCard 
              label="Notes Count" 
              value={(data.dpssTopics?.length || 0) + (data.selfLearningTopics?.length || 0)} 
              icon={Brain} 
              color="indigo"
              trend="Knowledge base"
           />
        </div>

        {/* Quick Glance Section */}
        {quickGlanceStats && (
          <div className="flex flex-col md:flex-row gap-6">
            {quickGlanceStats.mostImproved && (
              <div className="flex-1 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 backdrop-blur-3xl border border-emerald-500/20 p-6 rounded-3xl shadow-sm flex items-center gap-6 group hover:scale-[1.01] transition-all">
                <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 group-hover:rotate-6 transition-transform">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-emerald-600 uppercase mb-1">Most Improved Habit</p>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight truncate max-w-[200px]" title={quickGlanceStats.mostImproved.habit.name}>{quickGlanceStats.mostImproved.habit.name}</h3>
                  <p className="text-sm font-semibold text-emerald-600 mt-1">+{Math.round(quickGlanceStats.mostImproved.improvement * 100)}% vs last week</p>
                </div>
              </div>
            )}
            {quickGlanceStats.highestRisk && (
              <div className="flex-1 bg-gradient-to-br from-rose-500/10 to-orange-500/5 backdrop-blur-3xl border border-rose-500/20 p-6 rounded-3xl shadow-sm flex items-center gap-6 group hover:scale-[1.01] transition-all">
                <div className="p-4 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20 group-hover:-rotate-6 transition-transform">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-rose-600 uppercase mb-1">Highest Risk Habit</p>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight truncate max-w-[200px]" title={quickGlanceStats.highestRisk.habit.name}>{quickGlanceStats.highestRisk.habit.name}</h3>
                  <p className="text-sm font-semibold text-rose-600 mt-1">Only {Math.round(quickGlanceStats.highestRisk.currentRate * 100)}% completion rate</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gemini Intelligence Custom Report */}
        <div className="bg-slate-900 text-white p-8 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden group">
          {/* Decorative glowing backdrops */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1.5 font-sans">
                <Sparkles size={14} className="animate-pulse" />
                <span>AI Performance Advisory</span>
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight font-sans">Gemini Growth Synopsis</h2>
              <p className="text-slate-400 text-sm mt-1">Generate a customized, high-performance coaching report summarizing your weekly journals, checklist accuracy, and note progress.</p>
            </div>
            
            <button
              onClick={generateGeminiSummary}
              disabled={loadingReport}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 px-6 py-3.5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 flex-shrink-0 cursor-pointer"
            >
              {loadingReport ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Brain size={14} />
                  <span>Generate Weekly Coach Summary</span>
                </>
              )}
            </button>
          </div>

          <div className="relative mt-6 min-h-[100px] flex flex-col justify-center">
            {loadingReport && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
                  <Sparkles size={16} className="absolute text-indigo-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-indigo-400 tracking-widest animate-pulse font-sans">{loadingStatus}</p>
                  <p className="text-[10px] text-slate-500">Retrieving weekly focus metrics, task completions, and custom notes...</p>
                </div>
              </div>
            )}

            {reportError && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl text-center text-rose-300 antialiased font-semibold text-sm font-sans">
                ⚠️ {reportError}
              </div>
            )}

            {!loadingReport && !reportError && reportText && (
              <div className="text-slate-300 font-sans prose prose-invert max-w-none text-sm leading-relaxed space-y-4 bg-indigo-950/15 p-6 rounded-3xl border border-indigo-500/10 animate-in fade-in duration-500">
                <ReactMarkdown>{reportText}</ReactMarkdown>
              </div>
            )}

            {!loadingReport && !reportError && !reportText && (
              <div className="text-center py-6">
                <p className="text-xs font-black uppercase text-slate-500 tracking-wider font-sans">No active summary synthesized yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">Click the button above to compile your weekly journals, daily notes, and learning track performance via Gemini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Habit Trends */}
          <ChartContainer title="Habit Adherence (Last 7 Days)" icon={Target} color="orange">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={habitData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="completed" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Daily Performance Tasks Trends */}
          <ChartContainer title="Task Completion Rate (Last 7 Days)" icon={CheckCircle2} color="emerald">
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider pl-1 font-sans">
                Track completion rate and total completed items from your daily performance checklist.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyPerformanceTaskData}>
                  <defs>
                    <linearGradient id="colorTaskRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} unit="%" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Area type="monotone" name="Completion Rate (%)" dataKey="rate" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTaskRate)" />
                  <Line type="monotone" name="Completed Tasks" dataKey="completed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          {/* Weekly Habit Trends (Balanced Growth Radar) */}
          <ChartContainer title="Weekly Habit Trends (Balanced Growth)" icon={Activity} color="indigo">
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider pl-1">A high-density radar visualization mapping structured task symmetry and growth fields.</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarHabitData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
                  <Radar name="Completion %" dataKey="Percentage" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          {/* Expense Breakdown */}
          <ChartContainer title="Expense Breakdown (This Month)" icon={Wallet} color="rose">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full md:w-48 space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Categories</p>
                 {expenseData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-600">{item.name}</span>
                       <span className="text-xs font-black text-slate-900 italic">${item.value.toFixed(0)}</span>
                    </div>
                 ))}
              </div>
            </div>
          </ChartContainer>

          {/* Weekly Income vs. Expense Comparison */}
          <ChartContainer title="Weekly Cashflow Comparison" icon={Activity} color="indigo" className="lg:col-span-2">
            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider pl-1">Identify your best earning and worst spending periods week-by-week (normalized to USD $)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyFinanceData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    formatter={(value: any) => [`$${value}`, '']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          {/* Long-Term Habit Streaks */}
          <ChartContainer title="Long-Term Habit Streaks" icon={Target} color="emerald" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={streakData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="streak" name="Current Streak (Days)" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Performance Tracking */}
          <ChartContainer title="Peak Performance (Last 14 Days)" icon={Sparkles} color="indigo" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={productivityData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} domain={[0, 10]} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Legend />
                <Area type="monotone" dataKey="productivity" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                <Area type="monotone" dataKey="focus" stroke="#8b5cf6" strokeWidth={3} fill="none" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={3} fill="none" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

        </div>
      </div>
      <style>{`
        .custom-scrollbar-amber::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb {
          background: rgba(245, 158, 11, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.45);
        }
      `}</style>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: any; color: string; trend?: string }> = ({ label, value, icon: Icon, color, trend }) => {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-4 rounded-2xl ${colorMap[color] || 'bg-slate-50'} transition-transform group-hover:scale-110`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase tracking-tighter">
           <TrendingUp size={12} />
           {trend}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{value}</p>
      </div>
    </div>
  );
};

const ChartContainer: React.FC<{ title: string; icon: any; color: string; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, color, children, className }) => (
  <div className={`bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm ${className}`}>
    <div className="flex items-center gap-4 mb-8">
      <div className={`p-2 rounded-xl text-white ${color === 'orange' ? 'bg-orange-500' : color === 'rose' ? 'bg-rose-500' : 'bg-indigo-500'} shadow-lg shadow-current/20`}>
        <Icon size={18} strokeWidth={3} />
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">{title}</h2>
    </div>
    {children}
  </div>
);

export default Dashboard;
