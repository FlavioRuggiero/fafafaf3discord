"use client";

import React, { useState } from 'react';
import { User } from '@/types/discord';
import { Award, Gift, Lock, Check } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface ProgressionProps {
  currentUser: User;
}

export const Progression = ({ currentUser }: ProgressionProps) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const claimedLevels = currentUser.claimed_levels || [];

  const handleClaim = async (level: number, rewardType: string, count: number) => {
    if (level > (currentUser.level || 1)) {
      showError("Non hai ancora raggiunto questo livello!");
      return;
    }
    if (claimedLevels.includes(level)) {
      showError("Hai già riscattato questa ricompensa!");
      return;
    }

    setIsClaiming(true);
    const newClaimed = [...claimedLevels, level];
    let newStandard = currentUser.standard_chests || 0;
    let newPremium = currentUser.premium_chests || 0;

    if (rewardType === 'Baule Standard') newStandard += count;
    if (rewardType === 'Baule Premium') newPremium += count;

    const { error } = await supabase.from('profiles').update({
      claimed_levels: newClaimed,
      standard_chests: newStandard,
      premium_chests: newPremium
    }).eq('id', currentUser.id);

    setIsClaiming(false);

    if (error) {
      showError("Errore durante il riscatto della ricompensa.");
    } else {
      showSuccess(`Hai riscattato ${count}x ${rewardType}! Li trovi nel Cardi E-Shop.`);
    }
  };

  const getRewardForLevel = (level: number) => {
    if (level % 5 === 0) return { type: 'Baule Premium', count: 2, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' };
    if (level % 2 === 0) return { type: 'Baule Premium', count: 1, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };
    return { type: 'Baule Standard', count: 1, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' };
  };

  const maxLevel = Math.max(50, (currentUser.level || 1) + 10);
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full bg-[#313338] text-white overflow-hidden w-full">
      <div className="p-6 border-b border-[#1f2023] shadow-sm flex-shrink-0">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Award className="text-[#5865f2]" size={28} />
          Progressione Livelli
        </h1>
        <p className="text-[#b5bac1] mt-2">
          Sali di livello guadagnando XP e sblocca ricompense esclusive. Il tuo livello attuale è <strong className="text-white">{currentUser.level || 1}</strong>.
        </p>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-8 flex items-center">
        <div className="flex gap-8 items-center min-w-max pb-4 px-4">
          {levels.map((level) => {
            const isUnlocked = level <= (currentUser.level || 1);
            const isClaimed = claimedLevels.includes(level);
            const reward = getRewardForLevel(level);
            const isCurrent = level === (currentUser.level || 1);

            return (
              <div 
                key={level} 
                className={`relative flex flex-col items-center w-56 rounded-xl border-2 p-5 transition-all duration-300 ${
                  isCurrent ? 'border-[#5865f2] bg-[#5865f2]/10 scale-105 shadow-[0_0_20px_rgba(88,101,242,0.2)] z-10' :
                  isUnlocked ? 'border-[#404249] bg-[#2b2d31]' : 
                  'border-[#1e1f22] bg-[#1e1f22] opacity-60'
                }`}
              >
                {/* Linea di connessione */}
                {level > 1 && (
                  <div className={`absolute top-[52px] -left-8 w-8 h-1.5 ${isUnlocked ? 'bg-[#5865f2]' : 'bg-[#1e1f22]'}`} />
                )}

                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-4 z-10 relative ${
                  isUnlocked ? 'border-[#5865f2] bg-[#1e1f22]' : 'border-[#404249] bg-[#111214]'
                }`}>
                  <span className={`text-xl font-bold ${isUnlocked ? 'text-white' : 'text-[#949ba4]'}`}>
                    {level}
                  </span>
                </div>

                <div className={`w-full rounded-lg p-3 mb-4 border flex flex-col items-center text-center ${reward.bg} ${reward.border}`}>
                  <Gift className={`mb-2 ${reward.color}`} size={28} />
                  <span className={`text-sm font-bold ${reward.color}`}>
                    {reward.count}x {reward.type}
                  </span>
                </div>

                <button
                  onClick={() => handleClaim(level, reward.type, reward.count)}
                  disabled={!isUnlocked || isClaimed || isClaiming}
                  className={`w-full py-2.5 rounded font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                    isClaimed ? 'bg-[#23a559] text-white cursor-default' :
                    isUnlocked ? 'bg-[#5865f2] hover:bg-[#4752c4] text-white shadow-lg' :
                    'bg-[#404249] text-[#949ba4] cursor-not-allowed'
                  }`}
                >
                  {isClaimed ? (
                    <><Check size={18} /> Riscattato</>
                  ) : !isUnlocked ? (
                    <><Lock size={18} /> Bloccato</>
                  ) : (
                    'Riscatta'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};