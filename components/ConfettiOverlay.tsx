import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target } from 'lucide-react';

export const ConfettiOverlay: React.FC<{
  streak: number;
  habitName: string;
  onComplete: () => void;
}> = ({ streak, habitName, onComplete }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; rotation: number; scale: number; vx: number; vy: number }>>([]);

  useEffect(() => {
    // Generate particles
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const newParticles = Array.from({ length: 80 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 200 + Math.random() * 400;
      return {
        id: i,
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity - 200, // Shoot somewhat upwards/outwards
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: Math.random() * 0.8 + 0.5,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity
      };
    });
    setParticles(newParticles);

    const timer = setTimeout(() => {
      onComplete();
    }, 4500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500" 
      />
      
      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{ 
            opacity: [1, 1, 0], 
            x: p.x, 
            y: p.y + 600, // Gravity effect
            scale: p.scale, 
            rotate: p.rotation + 360 
          }}
          transition={{ duration: 2.5 + Math.random() * 1.5, ease: "easeOut" }}
          className="absolute w-3 h-3 rounded-sm shadow-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
        className="relative bg-white p-8 rounded-3xl shadow-2xl border-4 border-orange-400 flex flex-col items-center gap-4 max-w-sm text-center"
      >
        <div className="p-4 bg-orange-100 text-orange-500 rounded-full animate-bounce">
            <Target size={48} strokeWidth={2.5} />
        </div>
        <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Unstoppable!</h2>
            <p className="text-lg font-bold text-slate-600 mb-1">
                You hit a <span className="text-orange-500 text-2xl font-black">{streak} Day</span> streak!
            </p>
            <p className="text-sm font-semibold text-slate-400">for "{habitName}"</p>
        </div>
      </motion.div>
    </div>
  );
};
