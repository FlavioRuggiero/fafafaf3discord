"use client";

import React, { useState } from 'react';
import { User } from '@/types/discord';
import { ShoppingCart, Menu, Gift } from 'lucide-react';
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
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm bg-[#313338] z-10 flex-shrink-0">
        <div className="flex items-center text-white font-semibold">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
          )}
          <ShoppingCart className="mr-2 text-[#949ba4]" size={20} />
          Cardi E-Shop
        </div>
        <div className="flex items-center bg-[#2b2d31] px-3 py-1 rounded-full">
          <img src="/digitalcardus.png" alt="Digitalcardus" className="w-4 h-4 mr-2 object-contain" />
          <span className="text-white font-bold">{currentUser.digitalcardus}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          
          {/* Floral Banner */}
          <div className="relative w-full rounded-2xl mb-8 overflow-hidden shadow-2xl flex items-center p-8 bg-gradient-to-br from-[#134e4a] via-[#166534] to-[#064e3b] border border-[#14532d]">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none select-none">
              <div className="absolute -bottom-8 -left-8 text-[100px] opacity-80 transform -rotate-12 drop-shadow-2xl">🌿</div>
              <div className="absolute -top-6 right-10 text-[80px] opacity-60 transform rotate-45 drop-shadow-2xl">🍃</div>
              <div className="absolute -bottom-6 right-0 text-[90px] opacity-90 transform -rotate-12 drop-shadow-2xl">🌱</div>
              <div className="absolute top-10 left-[30%] text-[50px] opacity-70 transform rotate-12 drop-shadow-xl">🌸</div>
              <div className="absolute bottom-4 left-[60%] text-[60px] opacity-80 transform -rotate-12 drop-shadow-xl">🌺</div>
              <div className="absolute top-6 right-[35%] text-[40px] opacity-60 transform rotate-45 drop-shadow-xl">✨</div>
              <div className="absolute top-1/2 left-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.15)_0%,transparent_70%)] -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-lg tracking-tight">Cardi E-Shop</h1>
              <p className="text-green-100 font-medium drop-shadow-md text-lg max-w-xl">
                La primavera è arrivata! Acquista personalizzazioni uniche e fai fiorire il tuo profilo.
              </p>
            </div>
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
                    <div key={item.id} className="bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-6 flex flex-col items-center text-center transition-colors shadow-md">
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