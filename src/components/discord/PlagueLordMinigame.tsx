"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '@/contexts/ShopContext';
import { Avatar } from './Avatar';
import { CursorPreview } from './CursorPreview';

interface PlagueLordMinigameProps {
  attackerName: string;
  targetItemId: string;
  onComplete: (success: boolean) => void;
}

export const PlagueLordMinigame = ({ attackerName, targetItemId, onComplete }: PlagueLordMinigameProps) => {
  const { allItems, getThemeClass, getThemeStyle } = useShop();
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [timeLeft, setTimeLeft] = useState(30);
  const [isDefended, setIsDefended] = useState(false);
  
  const item = allItems.find(i => i.id === targetItemId);

  useEffect(() => {
    // Movimento casuale ogni 400ms
    const moveInterval = setInterval(() => {
      if (isDefended) return;
      setPosition({
        x: 10 + Math.random() * 80, // Tra 10% e 90%
        y: 10 + Math.random() * 80
      });
    }, 400);

    // Timer
    const timerInterval = setInterval(() => {
      if (isDefended) return;
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(moveInterval);
          clearInterval(timerInterval);
          onComplete(false); // Tempo scaduto, l'attaccante vince
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(moveInterval);
      clearInterval(timerInterval);
    };
  }, [isDefended, onComplete]);

  const handleCatch = () => {
    if (isDefended) return;
    setIsDefended(true);
    setTimeout(() => {
      onComplete(true); // Difeso con successo
    }, 1500);
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm overflow-hidden pointer-events-auto">
      
      {/* UI Centrale */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-center pointer-events-none">
        <h1 className="text-4xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] mb-2 uppercase tracking-widest animate-pulse">
          ATTACCO IN CORSO!
        </h1>
        <p className="text-xl text-white font-medium bg-black/50 px-6 py-2 rounded-full border border-red-500/50">
          <strong className="text-red-400">{attackerName}</strong> sta cercando di rubare il tuo oggetto:
        </p>
        <div className="mt-4 flex items-center gap-3 bg-[#1e1f22] p-3 rounded-xl border border-[#3f4147] shadow-2xl">
          {item.type === 'cursor' ? (
            <div className="w-12 h-12 flex items-center justify-center"><CursorPreview id={item.id} /></div>
          ) : item.type === 'emoji_pack' ? (
            <div className="w-12 h-12 grid grid-cols-2 gap-1 bg-[#111214] p-1 rounded"><img src={item.emojis?.[0]} className="w-full h-full object-contain" /></div>
          ) : (
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=target" decoration={item.id} className="w-12 h-12" />
          )}
          <span className={`font-bold text-lg ${getThemeClass(item.id)}`} style={getThemeStyle(item.id)}>{item.name}</span>
        </div>
        
        <div className={`text-7xl font-black mt-8 ${timeLeft <= 10 ? 'text-red-500 animate-bounce' : 'text-white'}`}>
          {timeLeft}s
        </div>
        <p className="text-[#b5bac1] mt-4 text-lg">Clicca sul Signore della Peste prima che scada il tempo!</p>
      </div>

      {/* Il Signore della Peste */}
      <div 
        onClick={handleCatch}
        className={`absolute w-48 h-48 transition-all duration-300 ease-out cursor-crosshair ${isDefended ? 'scale-0 opacity-0 rotate-180' : 'scale-100 opacity-100'}`}
        style={{ 
          left: `${position.x}%`, 
          top: `${position.y}%`, 
          transform: 'translate(-50%, -50%)',
          filter: 'drop-shadow(0 0 20px rgba(147,51,234,0.6))'
        }}
      >
        <img src="/signore-della-peste.png" alt="Signore della Peste" className="w-full h-full object-contain animate-pulse" />
        
        {/* L'oggetto rubato che tiene in mano */}
        <div className="absolute bottom-4 right-4 w-16 h-16 bg-black/50 rounded-full border-2 border-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-bounce">
          {item.type === 'cursor' ? (
            <div className="scale-75"><CursorPreview id={item.id} /></div>
          ) : item.type === 'emoji_pack' ? (
            <img src={item.emojis?.[0]} className="w-8 h-8 object-contain" />
          ) : (
            <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=target" decoration={item.id} className="w-10 h-10" />
          )}
        </div>
      </div>

      {/* Schermata di Vittoria (Difesa) */}
      {isDefended && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm z-50">
          <div className="bg-[#2b2d31] p-8 rounded-2xl border-2 border-green-500 text-center shadow-[0_0_50px_rgba(34,197,94,0.4)] animate-in zoom-in duration-300">
            <div className="text-6xl mb-4">🛡️</div>
            <h2 className="text-3xl font-black text-white mb-2">Difesa Riuscita!</h2>
            <p className="text-[#b5bac1] text-lg">Hai scacciato il Signore della Peste e salvato il tuo oggetto.</p>
          </div>
        </div>
      )}
    </div>
  );
};