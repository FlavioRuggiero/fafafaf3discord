"use client";

import React, { useState } from 'react';
import { User } from '@/types/discord';
import { ShoppingCart, Menu, Gift, Flower2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';
import { SHOP_ITEMS } from '@/data/shopItems';

interface ShopViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
}

const getThemeTextClass = (id: string) => {
  switch(id) {
    case 'supernova': return 'theme-text-supernova';
    case 'esquelito': return 'theme-text-esquelito';
    case 'oceanic': return 'theme-text-oceanic';
    case 'saturn-fire': return 'theme-text-saturn-fire';
    default: return 'text-white';
  }
};

export const ShopView = ({ currentUser, onToggleSidebar }: ShopViewProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const canClaimReward = currentUser?.last_reward_date !== today;

  const handleClaimReward = async () => {
    if (!canClaimReward) return;
    setIsClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_reward', { user_id_param: currentUser.id });
      if (error) throw error;
      
      if (data && data.rewarded) {
        showSuccess(`Hai ricevuto 3 Digitalcardus e 5 XP!`);
        if (data.leveled_up) {
          showSuccess(`🎉 Level Up! Sei salito al livello ${data.new_level}!`);
        }
      } else {
        showError("Hai già riscattato il premio oggi.");
      }
    } catch (error) {
      showError("Errore durante il riscatto del premio.");
    } finally {
      setIsClaiming(false);
    }
  };

  const handlePurchase = async (item: any) => {
    if (currentUser.digitalcardus < item.price) {
      showError("Non hai abbastanza digitalcardus!");
      return;
    }

    if (currentUser.purchased_decorations?.includes(item.id)) {
      showError("Hai già acquistato questo oggetto!");
      return;
    }

    setIsPurchasing(true);
    try {
      const newBalance = currentUser.digitalcardus - item.price;
      const newPurchased = [...(currentUser.purchased_decorations || []), item.id];

      const { error } = await supabase.from('profiles').update({
        digitalcardus: newBalance,
        purchased_decorations: newPurchased
      }).eq('id', currentUser.id);

      if (error) throw error;
      showSuccess(`Hai acquistato ${item.name}!`);
    } catch (error) {
      showError("Errore durante l'acquisto.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const categories = Array.from(new Set(SHOP_ITEMS.map(item => item.category)));

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative overflow-hidden h-full min-w-0">
      {/* Sfondo decorativo floreale sfumato */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#ff758c]/10 to-transparent pointer-events-none z-0"></div>
      
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm bg-[#313338]/90 backdrop-blur-sm z-20 flex-shrink-0 relative">
        <div className="flex items-center text-white font-semibold">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
          )}
          <ShoppingCart className="mr-2 text-[#ff758c]" size={20} />
          Cardi E-Shop
        </div>
        <div className="flex items-center bg-[#2b2d31] px-3 py-1 rounded-full border border-[#ff758c]/20">
          <img src="/digitalcardus.png" alt="Digitalcardus" className="w-4 h-4 mr-2 object-contain" />
          <span className="text-white font-bold">{currentUser.digitalcardus}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
        <div className="max-w-5xl mx-auto">
          
          {/* Banner Floreale */}
          <div className="relative w-full rounded-2xl mb-8 overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-[#ffb6c1]/20 py-12">
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff758c] to-[#ff7eb3] opacity-90"></div>
            {/* Pattern floreale in overlay */}
            <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zM27.314 60l.83-.83-1.66-1.66-.83.83.83.83zm0-60l.83.83-1.66 1.66-.83-.83.83-.83zM0 27.314l.83.83-1.66 1.66-.83-.83.83-.83zm60 0l.83.83-1.66 1.66-.83-.83.83-.83zM13.657 0l.83.83-1.66 1.66-.83-.83.83-.83zm0 60l.83-.83-1.66-1.66-.83.83.83.83zM0 13.657l.83.83-1.66 1.66-.83-.83.83-.83zm60 0l.83.83-1.66 1.66-.83-.83.83-.83zM40.97 0l.83.83-1.66 1.66-.83-.83.83-.83zm0 60l.83-.83-1.66-1.66-.83.83.83.83zM0 40.97l.83.83-1.66 1.66-.83-.83.83-.83zm60 0l.83.83-1.66 1.66-.83-.83.83-.83z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>
            
            <Flower2 className="absolute top-4 left-10 text-white/40 w-16 h-16 animate-[spin_10s_linear_infinite]" />
            <Flower2 className="absolute bottom-4 right-12 text-white/30 w-24 h-24 animate-[spin_15s_linear_infinite_reverse]" />
            <Sparkles className="absolute top-8 right-24 text-white/60 w-8 h-8 animate-pulse" />
            <Sparkles className="absolute bottom-8 left-24 text-white/50 w-6 h-6 animate-bounce" />
            
            <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg relative z-10 tracking-tight mb-3 text-center px-4">
              Cardi E-Shop <span className="text-[#ffe4e1]">Floreale</span>
            </h1>
            <p className="text-white/90 text-base md:text-lg font-medium drop-shadow relative z-10 text-center px-4">
              Scopri le nuove personalizzazioni e fai fiorire il tuo profilo! 🌸
            </p>
          </div>

          {/* Daily Reward Banner */}
          <div className="mb-10 bg-gradient-to-r from-[#2b2d31] to-[#1e1f22] border border-[#3f4147] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            <div className="flex items-center mb-4 sm:mb-0 relative z-10">
              <div className="w-16 h-16 bg-[#23a559]/20 rounded-full flex items-center justify-center mr-4 border border-[#23a559]/30">
                <Gift className="text-[#23a559]" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Premio Giornaliero</h2>
                <p className="text-[#b5bac1] text-sm">Riscatta ogni giorno per ottenere <span className="text-[#23a559] font-bold">3 DC</span> e <span className="text-brand font-bold">5 XP</span>!</p>
              </div>
            </div>
            <button 
              onClick={handleClaimReward}
              disabled={!canClaimReward || isClaiming}
              className={`relative z-10 px-6 py-3 rounded-lg font-bold transition-all shadow-lg ${
                canClaimReward 
                  ? 'bg-[#23a559] hover:bg-[#1a7c43] text-white hover:shadow-[0_0_15px_rgba(35,165,89,0.4)] hover:-translate-y-0.5' 
                  : 'bg-[#3f4147] text-[#949ba4] cursor-not-allowed'
              }`}
            >
              {isClaiming ? 'Riscatto...' : canClaimReward ? 'Riscatta Ora' : 'Già Riscattato Oggi'}
            </button>
          </div>

          {categories.map(category => (
            <div key={category} className="mb-10">
              <h2 className="text-xl font-bold text-white mb-4 border-b border-[#3f4147] pb-2">{category}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {SHOP_ITEMS.filter(item => item.category === category).map(item => {
                  const isOwned = currentUser.purchased_decorations?.includes(item.id);

                  return (
                    <div key={item.id} className="bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-6 flex flex-col items-center text-center transition-colors shadow-md hover:border-[#ff758c]/50 hover:shadow-[0_0_15px_rgba(255,117,140,0.1)]">
                      <div className="mb-6 mt-2 h-24 flex items-center justify-center">
                        <Avatar src={currentUser.avatar} decoration={item.id} className="w-20 h-20" />
                      </div>
                      <h3 className={`font-bold mb-4 text-sm ${getThemeTextClass(item.id)}`}>{item.name}</h3>

                      <div className="mt-auto w-full">
                        {isOwned ? (
                          <button disabled className="w-full py-2 rounded bg-[#4f545c] text-white font-medium opacity-50 cursor-not-allowed text-sm">
                            Posseduto
                          </button>
                        ) : (
                          <button 
                            onClick={() => handlePurchase(item)} 
                            disabled={isPurchasing || currentUser.digitalcardus < item.price}
                            className={`w-full py-2 rounded font-medium transition-colors text-sm flex items-center justify-center ${
                              currentUser.digitalcardus < item.price 
                                ? 'bg-[#4f545c] text-[#b5bac1] cursor-not-allowed' 
                                : 'bg-[#23a559] text-white hover:bg-[#1a7c43]'
                            }`}
                          >
                            Acquista - {item.price}
                            <img src="/digitalcardus.png" alt="Digitalcardus" className="w-3.5 h-3.5 ml-1.5 object-contain" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};