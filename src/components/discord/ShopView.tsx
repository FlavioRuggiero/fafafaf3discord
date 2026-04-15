"use client";

import React, { useState, useEffect } from 'react';
import { User } from '@/types/discord';
import { ShoppingCart, Menu, Gift, Clock, Package, Sparkles, Unlock, X, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';
import { SHOP_ITEMS, ShopItem } from '@/data/shopItems';
import { playSound } from '@/utils/sounds';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    case 'gustavo-armando': return 'theme-text-gustavo';
    case 'serpixel-agitato': return 'theme-text-serpixel-agitato';
    case 'tempesta': return 'theme-text-tempesta';
    case 'ghiacciolo': return 'theme-text-ghiacciolo';
    default: return 'text-white';
  }
};

export const ShopView = ({ currentUser, onToggleSidebar }: ShopViewProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
  // Stati per la rotazione dello shop
  const [activeItems, setActiveItems] = useState<ShopItem[]>([]);
  const [discountedIndex, setDiscountedIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>("");

  // Stati per i Bauli
  const [chestReward, setChestReward] = useState<ShopItem | null>(null);
  const [chestRefund, setChestRefund] = useState<number | null>(null);
  const [openingChestType, setOpeningChestType] = useState<'standard' | 'premium' | null>(null);
  const [chestSettings, setChestSettings] = useState({ premium_multiplier: 2.0, rare_threshold: 100 });

  const today = new Date().toISOString().split('T')[0];
  const canClaimReward = currentUser?.last_reward_date !== today;

  const standardChests = currentUser.standard_chests || 0;
  const premiumChests = currentUser.premium_chests || 0;
  
  // Calcolo dei DC giornalieri in base al livello
  const dailyDcAmount = 3 + ((currentUser.level || 1) - 1);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('chest_settings').select('*').eq('id', 1).single();
      if (data) {
        setChestSettings({
          premium_multiplier: Number(data.premium_multiplier),
          rare_threshold: Number(data.rare_threshold)
        });
      }
    };
    fetchSettings();
  }, []);

  // Logica deterministica per la rotazione oraria sincronizzata
  useEffect(() => {
    let currentHourSeed = 0;

    const updateShop = () => {
      const now = Date.now();
      const msPerHour = 1000 * 60 * 60;
      const hourSeed = Math.floor(now / msPerHour);
      
      if (hourSeed !== currentHourSeed) {
        currentHourSeed = hourSeed;
        let seed = hourSeed;
        const random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };

        const items = [...SHOP_ITEMS];
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        
        setActiveItems(items.slice(0, 4));
        // Scegliamo un indice da 0 a 3 per lo sconto basato sul seed dell'ora
        setDiscountedIndex(hourSeed % 4);
      }

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
        const earnedDc = data.earned_dc || 3;
        const earnedXp = data.earned_xp || 5;
        const bonusText = data.bonus_applied ? " (incluso bonus VIP del 20%!)" : "";
        
        showSuccess(`Hai ricevuto ${earnedDc} Digitalcardus e ${earnedXp} XP!${bonusText}`);
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

  const handlePurchase = async (item: ShopItem, actualPrice: number) => {
    if (currentUser.digitalcardus < actualPrice) {
      showError("Non hai abbastanza digitalcardus!");
      return;
    }

    if (currentUser.purchased_decorations?.includes(item.id)) {
      showError("Hai già acquistato questo oggetto!");
      return;
    }

    setIsPurchasing(true);
    try {
      const newBalance = currentUser.digitalcardus - actualPrice;
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

  const openChest = async (type: 'standard' | 'premium') => {
    const isPremium = type === 'premium';
    const hasFreeChest = isPremium ? premiumChests > 0 : standardChests > 0;
    const cost = isPremium ? 50 : 20;

    if (!hasFreeChest && currentUser.digitalcardus < cost) {
      showError("Non hai abbastanza digitalcardus o bauli gratuiti!");
      return;
    }

    setOpeningChestType(type);
    playSound('/openingsound.mp3');

    let totalWeight = 0;
    const weightedItems = SHOP_ITEMS.map(item => {
      let weight = 50000 / (item.price * item.price); 
      
      // Usa i valori dinamici dal database
      if (isPremium && item.price >= chestSettings.rare_threshold) {
        weight *= chestSettings.premium_multiplier;
      }
      
      totalWeight += weight;
      return { item, weight };
    });

    let random = Math.random() * totalWeight;
    let selectedItem = SHOP_ITEMS[0];
    for (const { item, weight } of weightedItems) {
      random -= weight;
      if (random <= 0) {
        selectedItem = item;
        break;
      }
    }

    const isOwned = currentUser.purchased_decorations?.includes(selectedItem.id);
    let refund = 0;
    let newBalance = currentUser.digitalcardus;
    let newStandard = standardChests;
    let newPremium = premiumChests;
    let newPurchased = currentUser.purchased_decorations || [];

    if (hasFreeChest) {
      if (isPremium) newPremium -= 1;
      else newStandard -= 1;
    } else {
      newBalance -= cost;
    }

    if (isOwned) {
      refund = Math.ceil(selectedItem.price / 3);
      newBalance += refund;
    } else {
      newPurchased = [...newPurchased, selectedItem.id];
    }

    const { error } = await supabase.from('profiles').update({
      digitalcardus: newBalance,
      purchased_decorations: newPurchased,
      standard_chests: newStandard,
      premium_chests: newPremium
    }).eq('id', currentUser.id);

    if (error) {
      showError("Errore durante l'apertura del baule.");
      setOpeningChestType(null);
      return;
    }

    setTimeout(() => {
      if (isOwned) {
        playSound('/pullclone.mp3');
      } else if (selectedItem.price >= 200) {
        playSound('/pullrare.mp3');
      } else {
        playSound('/pullcommon.mp3');
      }
      
      setChestReward(selectedItem);
      setChestRefund(isOwned ? refund : null);
      setOpeningChestType(null);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative overflow-hidden h-full min-w-0">
      <style>{`
        @keyframes pop-in-emoji {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes chest-shake {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg) scale(1.05); }
          50% { transform: rotate(5deg) scale(1.05); }
          75% { transform: rotate(-5deg) scale(1.05); }
          100% { rotate(0deg) scale(1); }
        }
        .animate-chest-shake {
          animation: chest-shake 0.5s ease-in-out infinite;
        }
        @keyframes reward-pop {
          0% { transform: scale(0.5) translateY(50px); opacity: 0; }
          60% { transform: scale(1.1) translateY(-10px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-reward-pop {
          animation: reward-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

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
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23166534' fill-opacity='0.08'%3E%3Cpath d='M40,20 C60,20 70,40 70,60 C50,60 40,40 40,20 Z' transform='rotate(15 55 40)'/%3E%3Cpath d='M140,30 Q160,10 170,40 Q150,60 140,30 Z' transform='rotate(-25 155 35)'/%3E%3Cpath d='M30,130 C40,110 60,120 70,140 C80,160 50,170 30,130 Z' transform='rotate(45 50 140)'/%3E%3Cpath d='M150,140 C170,140 180,160 180,180 C160,180 150,140 Z' transform='rotate(-60 165 160)'/%3E%3Cpath d='M90,90 Q100,80 110,95 Q95,105 90,90 Z' transform='rotate(10 100 92)'/%3E%3C/g%3E%3C/svg%3E\")",
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
                <p className="text-[#b5bac1] text-sm">Riscatta ogni giorno per ottenere <span className="text-[#23a559] font-bold">{dailyDcAmount} DC</span> e <span className="text-brand font-bold">5 XP</span>!</p>
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
              {activeItems.map((item, index) => {
                const isOwned = currentUser.purchased_decorations?.includes(item.id);
                const isDiscounted = index === discountedIndex;
                const actualPrice = isDiscounted ? Math.ceil(item.price * 0.8) : item.price;

                return (
                  <div key={item.id} className={`relative bg-[#2b2d31]/90 backdrop-blur-sm border ${isDiscounted ? 'border-[#f23f43]' : 'border-[#1e1f22]'} rounded-xl p-6 flex flex-col items-center text-center transition-colors shadow-md hover:border-[#3f4147] group hover:z-50`}>
                    
                    {/* Badge Categoria */}
                    <div className="absolute top-3 left-3 bg-[#1e1f22] text-[#949ba4] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[#3f4147]/50 shadow-sm">
                      {item.category}
                    </div>

                    {/* Badge Sconto */}
                    {isDiscounted && (
                      <div className="absolute top-3 right-3 bg-[#f23f43] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm z-10 animate-pulse">
                        -20%
                      </div>
                    )}

                    {item.type === 'privilege' ? (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="mb-6 mt-4 h-24 w-24 flex items-center justify-center bg-[#1e1f22] rounded-full border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] mx-auto cursor-help">
                            <Crown size={40} className="text-yellow-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-medium text-sm max-w-xs text-center z-[99999]">
                          {item.description}
                        </TooltipContent>
                      </Tooltip>
                    ) : item.type === 'emoji_pack' ? (
                      <div className="mb-6 mt-2 relative w-24 h-24 group/pack mx-auto">
                        {/* Vista normale (4 emoji) */}
                        <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2 bg-[#1e1f22] rounded-xl border border-[#3f4147] shadow-inner transition-all duration-300 group-hover/pack:opacity-0 group-hover/pack:scale-90">
                          {item.emojis?.slice(0, 4).map(e => (
                            <img key={e} src={e} className="w-full h-full object-contain drop-shadow-md" />
                          ))}
                        </div>
                        
                        {/* Vista Hover (Tutte le emoji animate) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#2b2d31] rounded-xl border-2 border-brand shadow-[0_0_30px_rgba(88,101,242,0.4)] grid grid-cols-4 gap-1.5 p-3 opacity-0 pointer-events-none group-hover/pack:opacity-100 group-hover/pack:pointer-events-auto transition-all duration-300 z-50 scale-50 group-hover/pack:scale-100">
                          {item.emojis?.map((e, i) => (
                            <div key={e} className="flex items-center justify-center opacity-0" style={{ animation: `pop-in-emoji 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards ${i * 30}ms` }}>
                              <img src={e} className="w-full h-full object-contain drop-shadow-md hover:scale-125 transition-transform cursor-pointer" />
                            </div>
                          ))}
                        </div>
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
                          onClick={() => handlePurchase(item, actualPrice)} 
                          disabled={isPurchasing || currentUser.digitalcardus < actualPrice}
                          className={`w-full py-2 rounded font-medium transition-colors text-sm flex items-center justify-center ${
                            currentUser.digitalcardus < actualPrice 
                              ? 'bg-[#4f545c] text-[#b5bac1] cursor-not-allowed' 
                              : 'bg-[#23a559] text-white hover:bg-[#1a7c43]'
                          }`}
                        >
                          Acquista - {isDiscounted ? (
                            <span className="flex items-center gap-1.5 ml-1">
                              <span className="line-through text-white/50 text-xs">{item.price}</span>
                              <span>{actualPrice}</span>
                            </span>
                          ) : (
                            <span className="ml-1">{item.price}</span>
                          )}
                          <img src="/digitalcardus.png" alt="Digitalcardus" className="w-3.5 h-3.5 ml-1.5 object-contain" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bauli Misteriosi */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-[#3f4147]/50 pb-3 flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={20} />
              Bauli Misteriosi
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Baule Standard */}
              <div className="relative bg-[#2b2d31]/90 backdrop-blur-sm border border-[#1e1f22] rounded-xl p-6 flex flex-col items-center text-center transition-all shadow-md hover:border-blue-500/50 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
                
                <div className={`relative w-32 h-32 mx-auto mb-4 transition-transform duration-300 ${openingChestType === 'standard' ? 'animate-chest-shake' : 'group-hover:scale-110'}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transform rotate-3 group-hover:rotate-6 transition-transform"></div>
                  <div className="absolute inset-0 bg-[#2b2d31] rounded-xl border-2 border-blue-400 flex items-center justify-center">
                    <Package size={48} className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  </div>
                  {standardChests > 0 && (
                    <div className="absolute -top-2 -right-2 bg-[#f23f43] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10">
                      {standardChests}
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-blue-400 mb-2">Baule Standard</h3>
                <p className="text-sm text-[#b5bac1] mb-6">Contiene un oggetto casuale del negozio. Tenta la fortuna!</p>
                
                <button 
                  onClick={() => openChest('standard')}
                  disabled={openingChestType !== null || (standardChests === 0 && currentUser.digitalcardus < 20)}
                  className={`mt-auto w-full py-3 rounded font-bold transition-all flex items-center justify-center gap-2 ${
                    (standardChests === 0 && currentUser.digitalcardus < 20) || openingChestType !== null
                      ? 'bg-[#4f545c] text-[#b5bac1] cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                  }`}
                >
                  <Unlock size={18} />
                  {standardChests > 0 ? (
                    'Apri Gratis'
                  ) : (
                    <>
                      Apri - 20
                      <img src="/digitalcardus.png" alt="Digitalcardus" className="w-4 h-4 object-contain" />
                    </>
                  )}
                </button>
              </div>

              {/* Baule Premium */}
              <div className="relative bg-[#2b2d31]/90 backdrop-blur-sm border border-[#1e1f22] rounded-xl p-6 flex flex-col items-center text-center transition-all shadow-md hover:border-yellow-500/50 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>
                
                <div className={`relative w-32 h-32 mx-auto mb-4 transition-transform duration-300 ${openingChestType === 'premium' ? 'animate-chest-shake' : 'group-hover:scale-110'}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-purple-600 rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transform -rotate-3 group-hover:-rotate-6 transition-transform"></div>
                  <div className="absolute inset-0 bg-[#2b2d31] rounded-xl border-2 border-yellow-400 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent opacity-50 animate-pulse"></div>
                    <Package size={56} className="text-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.8)]" />
                    <Sparkles size={24} className="absolute top-2 right-2 text-yellow-200 animate-bounce" />
                  </div>
                  {premiumChests > 0 && (
                    <div className="absolute -top-2 -right-2 bg-[#f23f43] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10">
                      {premiumChests}
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">Baule Premium</h3>
                <p className="text-sm text-[#b5bac1] mb-6">Contiene un oggetto casuale. <strong className="text-yellow-400">{chestSettings.premium_multiplier}x probabilità</strong> di trovare oggetti rari!</p>
                
                <button 
                  onClick={() => openChest('premium')}
                  disabled={openingChestType !== null || (premiumChests === 0 && currentUser.digitalcardus < 50)}
                  className={`mt-auto w-full py-3 rounded font-bold transition-all flex items-center justify-center gap-2 ${
                    (premiumChests === 0 && currentUser.digitalcardus < 50) || openingChestType !== null
                      ? 'bg-[#4f545c] text-[#b5bac1] cursor-not-allowed' 
                      : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-400 hover:to-orange-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]'
                  }`}
                >
                  <Unlock size={18} />
                  {premiumChests > 0 ? (
                    'Apri Gratis'
                  ) : (
                    <>
                      Apri - 50
                      <img src="/digitalcardus.png" alt="Digitalcardus" className="w-4 h-4 object-contain" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Modal Ricompensa Baule */}
      {chestReward && (
        <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#2b2d31] rounded-2xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[#1e1f22] flex flex-col items-center text-center animate-reward-pop relative overflow-hidden">
            
            {/* Effetto luce dietro l'oggetto */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <Sparkles className="text-yellow-400 mb-4 animate-pulse" size={48} />
            <h2 className="text-3xl font-black text-white mb-2">Hai trovato!</h2>
            
            <div className="my-8 relative z-10">
              {chestReward.type === 'privilege' ? (
                <div className="w-32 h-32 flex items-center justify-center bg-[#1e1f22] rounded-full border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  <Crown size={64} className="text-yellow-500" />
                </div>
              ) : chestReward.type === 'emoji_pack' ? (
                <div className="w-32 h-32 grid grid-cols-2 gap-2 p-3 bg-[#1e1f22] rounded-xl border-2 border-brand shadow-[0_0_20px_rgba(88,101,242,0.3)]">
                  {chestReward.emojis?.slice(0, 4).map(e => (
                    <img key={e} src={e} className="w-full h-full object-contain drop-shadow-md" />
                  ))}
                </div>
              ) : (
                <div className="w-32 h-32 flex items-center justify-center">
                  <Avatar src={currentUser.avatar} decoration={chestReward.id} className="w-24 h-24" />
                </div>
              )}
            </div>

            <h3 className={`text-xl font-bold mb-2 ${getThemeTextClass(chestReward.id)}`}>{chestReward.name}</h3>
            <p className="text-[#b5bac1] text-sm mb-6 uppercase tracking-wider font-bold">{chestReward.category}</p>

            {chestRefund !== null && (
              <div className="bg-[#f0b232]/10 border border-[#f0b232]/30 rounded-lg p-3 mb-6 w-full">
                <p className="text-[#f0b232] text-sm font-medium">
                  Possedevi già questo oggetto!
                  <br/>
                  È stato convertito in <strong className="text-white">{chestRefund}</strong> <img src="/digitalcardus.png" alt="dc" className="w-3.5 h-3.5 inline-block align-text-bottom" />.
                </p>
              </div>
            )}

            <button 
              onClick={() => {
                setChestReward(null);
                setChestRefund(null);
              }}
              className="w-full py-3 rounded-lg bg-[#5865F2] text-white font-bold hover:bg-[#4752C4] transition-colors shadow-lg"
            >
              Fantastico!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};