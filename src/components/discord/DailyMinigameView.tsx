"use client";

import React, { useState, useEffect } from 'react';
import { User } from '@/types/discord';
import { Gamepad2, Menu, Fish, Trophy, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

interface DailyMinigameViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
}

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

interface FishType {
  id: string;
  type: Rarity;
  emoji: string;
  name: string;
  color: string;
  top: number;
  speed: number;
  direction: 'left' | 'right';
}

const FISH_TYPES = [
  { type: 'common', chance: 59.8, emoji: '🐟', name: 'Pesce Comune', color: 'text-gray-400', bg: 'bg-gray-400/20', border: 'border-gray-400' },
  { type: 'uncommon', chance: 25, emoji: '🐠', name: 'Pesce Tropicale', color: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400' },
  { type: 'rare', chance: 10, emoji: '🐡', name: 'Pesce Palla', color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400' },
  { type: 'epic', chance: 4, emoji: '🦈', name: 'Squalo', color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400' },
  { type: 'legendary', chance: 1, emoji: '🐋', name: 'Balena', color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400' },
  { type: 'mythic', chance: 0.2, emoji: '🐉', name: 'Pesce Cardo', color: 'text-[#23a559]', bg: 'bg-[#23a559]/20', border: 'border-[#23a559]' },
];

export const DailyMinigameView = ({ currentUser, onToggleSidebar }: DailyMinigameViewProps) => {
  const [fishes, setFishes] = useState<FishType[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [catchEffects, setCatchEffects] = useState<{id: string, x: number, y: number, text: string, color: string}[]>([]);

  // Generatore di pesci
  useEffect(() => {
    const spawnFish = () => {
      const rand = Math.random() * 100;
      let cumulative = 0;
      let selectedType = FISH_TYPES[0];

      for (const fish of FISH_TYPES) {
        cumulative += fish.chance;
        if (rand <= cumulative) {
          selectedType = fish;
          break;
        }
      }

      const direction = Math.random() > 0.5 ? 'right' : 'left';
      const speed = Math.random() * 4 + 4; // Tra 4 e 8 secondi
      const top = Math.random() * 70 + 10; // Tra 10% e 80% dell'altezza del fiume

      const newFish: FishType = {
        id: Math.random().toString(36).substr(2, 9),
        type: selectedType.type as Rarity,
        emoji: selectedType.emoji,
        name: selectedType.name,
        color: selectedType.color,
        top,
        speed,
        direction
      };

      setFishes(prev => [...prev, newFish]);

      // Rimuovi il pesce dopo che ha attraversato lo schermo
      setTimeout(() => {
        setFishes(prev => prev.filter(f => f.id !== newFish.id));
      }, speed * 1000);
    };

    const interval = setInterval(spawnFish, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleCatch = async (e: React.MouseEvent, fish: FishType) => {
    e.stopPropagation();
    
    // Aggiungi all'inventario
    setInventory(prev => ({
      ...prev,
      [fish.name]: (prev[fish.name] || 0) + 1
    }));

    // Rimuovi dal fiume
    setFishes(prev => prev.filter(f => f.id !== fish.id));

    // Effetto visivo
    const effectId = Math.random().toString();
    setCatchEffects(prev => [...prev, {
      id: effectId,
      x: e.clientX,
      y: e.clientY,
      text: fish.name === 'Pesce Cardo' ? '+1 DC! 🌟' : `+1 ${fish.name}`,
      color: fish.color
    }]);

    setTimeout(() => {
      setCatchEffects(prev => prev.filter(eff => eff.id !== effectId));
    }, 1000);

    // Logica speciale per il Pesce Cardo
    if (fish.name === 'Pesce Cardo') {
      const { data: profile } = await supabase.from('profiles').select('digitalcardus').eq('id', currentUser.id).single();
      if (profile) {
        const newBalance = (profile.digitalcardus || 0) + 1;
        const { error } = await supabase.from('profiles').update({ digitalcardus: newBalance }).eq('id', currentUser.id);
        if (!error) {
          showSuccess("Hai trovato il rarissimo Pesce Cardo! +1 Digitalcardus 🌟");
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative overflow-hidden h-full min-w-0">
      <style>{`
        @keyframes swim-right {
          from { left: -10%; transform: scaleX(-1); }
          to { left: 110%; transform: scaleX(-1); }
        }
        @keyframes swim-left {
          from { left: 110%; transform: scaleX(1); }
          to { left: -10%; transform: scaleX(1); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
        }
        .river-pattern {
          background-image: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 2px, transparent 2px);
          background-size: 30px 30px;
        }
        .grass-pattern {
          background-color: #166534;
          background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20L20 0z' fill='%2314532d' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm bg-[#313338] z-20 flex-shrink-0">
        <div className="flex items-center text-white font-semibold">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
          )}
          <Gamepad2 className="mr-2 text-[#0ea5e9]" size={20} />
          Minigioco Giornaliero
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Area di Gioco */}
        <div className="relative h-[50%] sm:h-[60%] w-full grass-pattern overflow-hidden border-b-4 border-[#14532d] shadow-inner flex-shrink-0">
          
          {/* Fiume Diagonale */}
          <div className="absolute top-1/2 left-[-10%] w-[120%] h-48 sm:h-64 bg-[#0ea5e9]/80 -rotate-6 -translate-y-1/2 border-y-8 border-[#0284c7] shadow-[0_0_30px_rgba(14,165,233,0.5)] river-pattern flex items-center">
            
            {/* Pesci */}
            {fishes.map(fish => (
              <div
                key={fish.id}
                className="absolute cursor-pointer hover:scale-125 transition-transform z-10 drop-shadow-lg"
                style={{
                  top: `${fish.top}%`,
                  animation: `${fish.direction === 'right' ? 'swim-right' : 'swim-left'} ${fish.speed}s linear forwards`
                }}
                onClick={(e) => handleCatch(e, fish)}
              >
                <span className="text-4xl sm:text-5xl select-none">{fish.emoji}</span>
              </div>
            ))}

          </div>

          {/* Effetti di cattura */}
          {catchEffects.map(effect => (
            <div
              key={effect.id}
              className={`fixed font-black text-xl sm:text-2xl z-50 pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${effect.color}`}
              style={{
                left: effect.x,
                top: effect.y,
                animation: 'float-up 1s ease-out forwards'
              }}
            >
              {effect.text}
            </div>
          ))}

          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-white/10 shadow-lg pointer-events-none">
            <h3 className="font-bold flex items-center gap-2"><Fish size={18} className="text-[#0ea5e9]"/> Pesca nel fiume!</h3>
            <p className="text-xs text-[#b5bac1]">Clicca sui pesci per catturarli.</p>
          </div>
        </div>

        {/* Inventario Pesci */}
        <div className="flex-1 bg-[#2b2d31] p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6 border-b border-[#1e1f22] pb-4">
              <Trophy className="text-yellow-500" size={28} />
              <h2 className="text-2xl font-bold text-white">Il tuo Pescato</h2>
            </div>

            {Object.keys(inventory).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#949ba4]">
                <Fish size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-white mb-1">Nessun pesce catturato</p>
                <p className="text-sm">Inizia a cliccare sui pesci nel fiume per riempire il tuo inventario!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {FISH_TYPES.map(fishType => {
                  const count = inventory[fishType.name] || 0;
                  if (count === 0) return null;

                  return (
                    <div key={fishType.name} className={`flex flex-col items-center p-4 rounded-xl border-2 ${fishType.bg} ${fishType.border} relative overflow-hidden group`}>
                      <div className="absolute top-0 right-0 bg-black/40 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
                        x{count}
                      </div>
                      <span className="text-5xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform">{fishType.emoji}</span>
                      <span className={`text-sm font-bold text-center ${fishType.color}`}>{fishType.name}</span>
                      {(fishType.type === 'legendary' || fishType.type === 'mythic') && (
                        <Sparkles className={`absolute top-2 left-2 animate-pulse ${fishType.type === 'mythic' ? 'text-[#23a559]' : 'text-yellow-400'}`} size={16} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};