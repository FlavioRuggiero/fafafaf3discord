"use client";

import React from 'react';
import { User } from '@/types/discord';
import { Archive, Menu, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';
import { SHOP_ITEMS } from '@/data/shopItems';

interface InventoryViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
}

export const InventoryView = ({ currentUser, onToggleSidebar }: InventoryViewProps) => {
  
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

  // Filtra solo gli oggetti acquistati
  const ownedItems = SHOP_ITEMS.filter(item => currentUser.purchased_decorations?.includes(item.id));
  
  // Raggruppa per categoria
  const categories = Array.from(new Set(ownedItems.map(item => item.category)));

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
                      <div key={item.id} className={`bg-[#2b2d31] border ${isEquipped ? 'border-brand' : 'border-[#1e1f22]'} rounded-xl p-6 flex flex-col items-center text-center transition-colors shadow-md relative`}>
                        {isEquipped && (
                          <div className="absolute top-3 right-3 bg-brand text-white p-1 rounded-full shadow-md">
                            <Check size={14} />
                          </div>
                        )}
                        <div className="mb-6 mt-2 h-24 flex items-center justify-center">
                          <Avatar src={currentUser.avatar} decoration={item.id} className="w-20 h-20" />
                        </div>
                        <h3 className="text-white font-bold mb-4 text-sm">{item.name}</h3>

                        <div className="mt-auto w-full">
                          {isEquipped ? (
                            <button onClick={handleUnequip} className="w-full py-2 rounded bg-[#f23f43] text-white font-medium hover:bg-[#da373c] transition-colors text-sm">
                              Rimuovi
                            </button>
                          ) : (
                            <button onClick={() => handleEquip(item.id)} className="w-full py-2 rounded bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors text-sm">
                              Equipaggia
                            </button>
                          )}
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
    </div>
  );
};