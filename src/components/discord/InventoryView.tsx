"use client";

import React, { useState } from 'react';
import { User } from '@/types/discord';
import { Archive, Menu, Check, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';
import { SHOP_ITEMS } from '@/data/shopItems';

interface InventoryViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
}

export const getThemeTextClass = (id: string) => {
  switch(id) {
    case 'supernova': return 'theme-text-supernova';
    case 'esquelito': return 'theme-text-esquelito';
    case 'oceanic': return 'theme-text-oceanic';
    case 'saturn-fire': return 'theme-text-saturn-fire';
    default: return 'text-white';
  }
};

export const InventoryView = ({ currentUser, onToggleSidebar }: InventoryViewProps) => {
  const [itemToSell, setItemToSell] = useState<typeof SHOP_ITEMS[0] | null>(null);
  
  const handleEquip = async (id: string) => {
    const { error } = await supabase.from('profiles').update({
      avatar_decoration: id
    }).eq('id', currentUser.id);
    if (error) showError("Errore durante l'equipaggiamento.");
    else showSuccess("Contorno equipaggiato!");
  };

  const handleUnequip = async () => {
    const { error } = await supabase.from('profiles').update({
      avatar_decoration: null
    }).eq('id', currentUser.id);
    if (error) showError("Errore durante la rimozione.");
    else showSuccess("Contorno rimosso!");
  };

  const handleSell = async () => {
    if (!itemToSell) return;

    const refundAmount = Math.floor(itemToSell.price / 2);
    const newDecorations = (currentUser.purchased_decorations || []).filter(id => id !== itemToSell.id);
    
    const updates: any = {
      purchased_decorations: newDecorations,
      digitalcardus: (currentUser.digitalcardus || 0) + refundAmount
    };

    // Se l'oggetto venduto era equipaggiato, rimuovilo
    if (currentUser.avatar_decoration === itemToSell.id) {
      updates.avatar_decoration = null;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id);

    if (error) {
      showError("Errore durante la vendita dell'oggetto.");
    } else {
      showSuccess(`Oggetto venduto per ${refundAmount} Digitalcardus!`);
    }
    
    setItemToSell(null);
  };

  // Filtra solo gli oggetti acquistati
  const ownedItems = SHOP_ITEMS.filter(item => currentUser.purchased_decorations?.includes(item.id));
  
  // Raggruppa per categoria
  const categories = Array.from(new Set(ownedItems.map(item => item.category)));

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative overflow-hidden h-full min-w-0">
      <style>{`
        @keyframes pop-in-emoji {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
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
          <Archive className="mr-2 text-[#949ba4]" size={20} />
          Inventario
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Il tuo Inventario</h1>
            <p className="text-[#b5bac1]">Gestisci gli oggetti che hai acquistato nel Cardi E-Shop.</p>
          </div>

          {ownedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#949ba4]">
              <Archive size={64} className="mb-4 opacity-50" />
              <h2 className="text-xl font-medium text-white mb-2">Il tuo inventario è vuoto</h2>
              <p>Visita il Cardi E-Shop per acquistare nuove personalizzazioni!</p>
            </div>
          ) : (
            categories.map(category => (
              <div key={category} className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4 border-b border-[#3f4147] pb-2">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ownedItems.filter(item => item.category === category).map(item => {
                    const isEquipped = currentUser.avatar_decoration === item.id;

                    return (
                      <div key={item.id} className={`bg-[#2b2d31] border ${isEquipped ? 'border-brand' : 'border-[#1e1f22]'} rounded-xl p-6 flex flex-col items-center text-center transition-colors shadow-md relative group`}>
                        {isEquipped && (
                          <div className="absolute top-3 right-3 bg-brand text-white p-1 rounded-full shadow-md">
                            <Check size={14} />
                          </div>
                        )}
                        
                        {item.type === 'emoji_pack' ? (
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
                          <div className="mb-6 mt-2 h-24 flex items-center justify-center">
                            <Avatar src={currentUser.avatar} decoration={item.id} className="w-20 h-20" />
                          </div>
                        )}
                        
                        <h3 className={`font-bold mb-4 text-sm ${getThemeTextClass(item.id)}`}>{item.name}</h3>

                        <div className="mt-auto w-full flex gap-2">
                          {item.type === 'emoji_pack' ? (
                            <button disabled className="flex-1 py-2 rounded bg-[#4f545c] text-white font-medium opacity-50 cursor-not-allowed text-sm">
                              In Chat
                            </button>
                          ) : isEquipped ? (
                            <button onClick={handleUnequip} className="flex-1 py-2 rounded bg-[#f23f43] text-white font-medium hover:bg-[#da373c] transition-colors text-sm">
                              Rimuovi
                            </button>
                          ) : (
                            <button onClick={() => handleEquip(item.id)} className="flex-1 py-2 rounded bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors text-sm">
                              Equipaggia
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setItemToSell(item)}
                            className="px-3 py-2 rounded bg-[#2b2d31] border border-[#f23f43] text-[#f23f43] font-medium hover:bg-[#f23f43] hover:text-white transition-colors text-sm flex items-center justify-center"
                            title="Vendi oggetto"
                          >
                            Vendi
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal di Conferma Vendita */}
      {itemToSell && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
          <div className="bg-[#313338] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#1e1f22] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#f23f43]/20 flex items-center justify-center text-[#f23f43]">
                <Coins size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Conferma Vendita</h2>
            </div>
            
            <p className="text-[#dbdee1] mb-6 leading-relaxed">
              Sei sicuro di voler vendere <strong className={getThemeTextClass(itemToSell.id)}>{itemToSell.name}</strong>? 
              <br className="mb-2" />
              Riceverai indietro <strong className="text-white">{Math.floor(itemToSell.price / 2)}</strong> <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 inline-block align-text-bottom" />.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setItemToSell(null)}
                className="px-4 py-2 rounded font-medium text-white hover:underline transition-all"
              >
                Annulla
              </button>
              <button 
                onClick={handleSell}
                className="px-4 py-2 rounded bg-[#f23f43] text-white font-medium hover:bg-[#da373c] transition-colors"
              >
                Conferma Vendita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};