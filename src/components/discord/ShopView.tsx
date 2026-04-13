"use client";

import React, { useState, useEffect } from 'react';
import { User } from '@/types/discord';
import { ShoppingCart, Menu, Gift, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';
import { SHOP_ITEMS, ShopItem } from '@/data/shopItems';

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
  
  // Stati per la rotazione dello shop
  const [activeItems, setActiveItems] = useState<ShopItem[]>([]);
  const [countdown, setCountdown] = useState<string>("");

  const today = new Date().toISOString().split('T')[0];
  const canClaimReward = currentUser?.last_reward_date !== today;

  // Logica deterministica per la rotazione oraria sincronizzata
  useEffect(() => {
    let currentHourSeed = 0;

    const updateShop = () => {
      const now = Date.now();
      const msPerHour = 1000 * 60 * 60;
      const hourSeed = Math.floor(now / msPerHour);
      
      // Se l'ora è cambiata (o è il primo caricamento), ricalcoliamo gli oggetti
      if (hourSeed !== currentHourSeed) {
        currentHourSeed = hourSeed;
        
        // Generatore di numeri pseudo-casuali basato sul seed dell'ora
        let seed = hourSeed;
        const random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };

        // Fisher-Yates shuffle deterministico
        const items = [...SHOP_ITEMS];
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        
        // Prendiamo i primi 4
        setActiveItems(items.slice(0, 4));
      }

      // Calcolo del countdown
      const nextHourTimestamp = (hourSeed + 1) * msPerHour;
      const diff = nextHourTimestamp - now;
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateShop();
    const interval = setInterval(updateShop, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handlePurchase = async (item: ShopItem) => {
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

      {/* Content con Trama a Foglie */}
      <div 
        className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative"
        style={{ 
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23166534' fill-opacity='0.08'%3E%3Cpath d='M40,20 C60,20 70,40 70,60 C50,60 40,40 40,20 Z' transform='rotate(15 55 40)'/%3E%3Cpath d='M140,30 Q160,10 170,40 Q150,60 140,30 Z' transform='rotate(-25 155 35)'/%3E%3Cpath d='M30,130 C40,110 60,120 70,140 C80,160 50,170 30,130 Z' transform='rotate(45 50 140)'/%3E%3Cpath d='M150,140 C170,140 180,160 180,180 C160,180 150,160 150,140 Z' transform='rotate(-60 165 160)'/%3E%3Cpath d='M90,90 Q100,80 110,95 Q95,105 90,90 Z' transform='rotate(10 100 92)'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px"
        }}
      >
        {/* Sfumatura verde espansiva e angolata verso sinistra */}
        <div className="absolute -top-20 -right-20 w-[120%] h-[700px] bg-gradient-to-bl from-[#23a559]/25 via-[#23a559]/5 to-transparent pointer-events-none z-0 transform -rotate-3"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="mb-10 mt-4 text-center sm:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-[#23a559] to-[#4ade80] drop-shadow-[0_0_15px_rgba(35,165,89,0.4)]">
              Cardi E-Shop
            </h1>
            <p className="text-[#dbdee1] text-lg font-medium">
              Acquista personalizzazioni uniche ed eleganti per il tuo profilo.
            </p>
          </div>

          {/* Daily Reward Banner */}
          <div className="mb-10 bg-gradient-to-r from-[#2b2d31]/90 to-[#1e1f22]/90 backdrop-blur-sm border border-[#3f4147] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between shadow-lg relative overflow-hidden">
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

          {/* Shop Items Rotation */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-[#3f4147]/50 pb-3 gap-3">
              <h2 className="text-xl font-bold text-white">In Vetrina Ora</h2>
              <div className="flex items-center bg-[#1e1f22]/80 backdrop-blur-sm border border-[#3f4147] px-3 py-1.5 rounded-lg shadow-inner">
                <Clock size={16} className="text-brand mr-2" />
                <span className="text-[#dbdee1] font-mono font-medium text-sm">
                  Aggiornamento tra: <span className="text-white font-bold ml-1">{countdown}</span>
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeItems.map(item => {
                const isOwned = currentUser.purchased_decorations?.includes(item.id);

                return (
                  <div key={item.id} className="relative bg-[#2b2d31]/90 backdrop-blur-sm border border-[#1e1f22] rounded-xl p-6 flex flex-col items-center text-center transition-colors shadow-md hover:border-[#3f4147] group">
                    
                    {/* Badge Categoria */}
                    <div className="absolute top-3 left-3 bg-[#1e1f22] text-[#949ba4] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[#3f4147]/50 shadow-sm">
                      {item.category}
                    </div>

                    {item.type === 'emoji_pack' ? (
                      <div className="mb-6 mt-4 h-24 w-24 grid grid-cols-2 gap-2 p-2 bg-[#1e1f22] rounded-xl border border-[#3f4147] shadow-inner transform group-hover:scale-105 transition-transform">
                        {item.emojis?.slice(0, 4).map(e => (
                          <img key={e} src={e} className="w-full h-full object-contain drop-shadow-md" />
                        ))}
                      </div>
                    ) : (
                      <div className="mb-6 mt-4 h-24 flex items-center justify-center">
                        <Avatar src={currentUser.avatar} decoration={item.id} className="w-20 h-20" />
                      </div>
                    )}
                    
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
          
        </div>
      </div>
    </div>
  );
};