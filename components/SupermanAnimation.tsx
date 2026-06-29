import React, { useEffect, useState, useRef } from 'react';
import { Student } from '../types';
import { isToday } from 'date-fns';

interface Props {
  students: Student[];
}

export const SupermanAnimation: React.FC<Props> = ({ students }) => {
  const [activeAlert, setActiveAlert] = useState<{
    student: string;
    assistant: string;
    direction: 'ltr' | 'rtl';
  } | null>(null);

  const studentIndexRef = useRef(0);
  const directionRef = useRef<'ltr' | 'rtl'>('ltr');

  useEffect(() => {
    const checkDeadlines = () => {
      // Find all students with a deadline today
      const dueStudents = students.filter(s => {
        if (!s.deadline || s.isHidden) return false;
        const d = new Date(s.deadline);
        return isToday(d);
      });

      if (dueStudents.length === 0) return;

      // Cycle through students
      const currentIndex = studentIndexRef.current % dueStudents.length;
      const targetStudent = dueStudents[currentIndex];

      // Set Alert
      setActiveAlert({
        student: targetStudent.name,
        assistant: targetStudent.assistant || 'No Assistant',
        direction: directionRef.current
      });

      // Prepare next state
      studentIndexRef.current += 1;
      directionRef.current = directionRef.current === 'ltr' ? 'rtl' : 'ltr';

      // Clear alert after animation duration (10s matches CSS)
      const timer = setTimeout(() => setActiveAlert(null), 10000); 
      return timer;
    };

    // Initial Check
    checkDeadlines();

    // Loop every 30 seconds
    const interval = setInterval(checkDeadlines, 30000);

    return () => clearInterval(interval);
  }, [students]);

  if (!activeAlert) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        <div className={`absolute top-1/4 ${activeAlert.direction === 'ltr' ? 'flying-hero-ltr left-0' : 'flying-hero-rtl right-0'}`}>
            <div className="relative flex flex-col items-center">
                {/* Comic Bubble */}
                <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] mb-4 min-w-[200px] text-center transform -rotate-2 relative">
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-black"></div>
                    <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-white"></div>
                    
                    <h3 className="text-xl font-black uppercase text-red-600 italic leading-none mb-1">Deadline Alert!</h3>
                    <p className="font-bold text-slate-800 text-lg">{activeAlert.student}</p>
                    <p className="text-sm font-semibold text-slate-500">Asst: {activeAlert.assistant}</p>
                </div>

                {/* Funny Supergirl Image */}
                <img 
                    src="https://cdn-icons-png.flaticon.com/512/4006/4006596.png" 
                    alt="Supergirl" 
                    className="w-48 h-48 drop-shadow-2xl hover:scale-110 transition-transform"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.insertAdjacentHTML('beforeend', '<div class="text-9xl filter drop-shadow-lg">🦸‍♀️</div>');
                    }}
                />
            </div>
        </div>
    </div>
  );
};