"use client";

import React, { useState } from 'react';
import { User } from '@/types/discord';
import { ShoppingCart, Menu } from 'lucide-react';
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Cardi E-Shop</h1>
            <p className="text-[#b5bac1]">Acquista personalizzazioni uniche per il tuo profilo.</p>
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