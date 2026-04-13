"use client";

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Check } from 'lucide-react';
import { User } from '@/types/discord';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { SHOP_ITEMS } from '@/data/shopItems';
import { Avatar } from './Avatar';

interface TradeModalProps {
  tradeId: string;
  currentUser: User;
  onClose: () => void;
}

export const TradeModal = ({ tradeId, currentUser, onClose }: TradeModalProps) => {
  const [trade, setTrade] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [theirProfile, setTheirProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTradeData = async () => {
      const { data: tradeData } = await supabase.from('trades').select('*').eq('id', tradeId).single();
      if (!tradeData) {
        onClose();
        return;
      }
      setTrade(tradeData);

      const isSender = tradeData.sender_id === currentUser.id;
      const theirId = isSender ? tradeData.receiver_id : tradeData.sender_id;

      const { data: profiles } = await supabase.from('profiles').select('*').in('id', [currentUser.id, theirId]);
      if (profiles) {
        setMyProfile(profiles.find(p => p.id === currentUser.id));
        setTheirProfile(profiles.find(p => p.id === theirId));
      }
      setIsLoading(false);
    };

    fetchTradeData();

    const sub = supabase.channel(`trade_${tradeId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trades', filter: `id=eq.${tradeId}` }, (payload) => {
        setTrade(payload.new);
        if (payload.new.status === 'completed') {
          showSuccess("Scambio completato con successo!");
          setTimeout(onClose, 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [tradeId, currentUser.id, onClose]);

  if (isLoading || !trade || !myProfile || !theirProfile) return null;

  const isSender = trade.sender_id === currentUser.id;
  
  const myItems = isSender ? (trade.sender_items || []) : (trade.receiver_items || []);
  const theirItems = isSender ? (trade.receiver_items || []) : (trade.sender_items || []);
  
  const myAccepted = isSender ? trade.sender_accepted : trade.receiver_accepted;
  const theirAccepted = isSender ? trade.receiver_accepted : trade.sender_accepted;

  const myInventory = (myProfile.purchased_decorations || []).filter((id: string) => !myItems.includes(id));

  const handleToggleItem = async (itemId: string, isAdding: boolean) => {
    if (myAccepted) return; // Non puoi modificare se hai già accettato

    const newItems = isAdding 
      ? [...myItems, itemId] 
      : myItems.filter((id: string) => id !== itemId);

    const updateField = isSender ? { sender_items: newItems, sender_accepted: false, receiver_accepted: false } 
                                 : { receiver_items: newItems, receiver_accepted: false, sender_accepted: false };

    await supabase.from('trades').update(updateField).eq('id', tradeId);
  };

  const handleToggleAccept = async () => {
    const newAccepted = !myAccepted;
    const updateField = isSender ? { sender_accepted: newAccepted } : { receiver_accepted: newAccepted };
    
    await supabase.from('trades').update(updateField).eq('id', tradeId);

    // Se io sto accettando e l'altro ha già accettato, eseguiamo lo scambio
    if (newAccepted && theirAccepted) {
      const itemPrices = SHOP_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: item.price }), {});
      const { data, error } = await supabase.rpc('execute_trade', { 
        p_trade_id: tradeId, 
        p_item_prices: itemPrices 
      });
      
      if (error) {
        showError("Errore durante l'esecuzione dello scambio.");
      }
    }
  };

  const renderItem = (itemId: string, onClick?: () => void) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return null;

    return (
      <div 
        key={itemId} 
        onClick={onClick}
        className={`bg-[#1e1f22] border border-[#3f4147] rounded p-2 flex items-center gap-3 ${onClick ? 'cursor-pointer hover:border-brand' : ''}`}
      >
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          {item.type === 'emoji_pack' ? (
            <span className="text-xl">📦</span>
          ) : item.type === 'privilege' ? (
            <span className="text-xl">👑</span>
          ) : (
            <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=preview`} decoration={item.id} className="w-8 h-8" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-bold truncate">{item.name}</div>
          <div className="text-[#949ba4] text-[10px]">{item.price} DC</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#313338] rounded-xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-[#1e1f22] flex justify-between items-center bg-[#2b2d31]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="text-brand" />
            Scambio Sicuro
          </h2>
          <button onClick={onClose} className="text-[#949ba4] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 min-h-[400px]">
          {/* La mia parte */}
          <div className="flex-1 flex flex-col border-r border-[#1e1f22]">
            <div className="p-4 bg-[#2b2d31]/50 border-b border-[#1e1f22] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={myProfile.avatar_url} className="w-8 h-8 rounded-full" />
                <span className="text-white font-bold">La tua offerta</span>
              </div>
              {myAccepted && <span className="text-[#23a559] text-xs font-bold uppercase flex items-center gap-1"><Check size={14}/> Pronto</span>}
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-[#313338]">
              <div className="grid grid-cols-2 gap-2 mb-6">
                {myItems.length === 0 ? (
                  <div className="col-span-2 text-center text-[#949ba4] text-sm py-4 italic">Nessun oggetto offerto</div>
                ) : (
                  myItems.map((id: string) => renderItem(id, () => handleToggleItem(id, false)))
                )}
              </div>
              
              <div className="border-t border-[#1f2023] pt-4">
                <h3 className="text-xs font-bold text-[#b5bac1] uppercase mb-3">Il tuo inventario (Clicca per aggiungere)</h3>
                <div className="grid grid-cols-2 gap-2">
                  {myInventory.map((id: string) => renderItem(id, () => handleToggleItem(id, true)))}
                </div>
              </div>
            </div>
          </div>

          {/* La loro parte */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-[#2b2d31]/50 border-b border-[#1e1f22] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={theirProfile.avatar_url} className="w-8 h-8 rounded-full" />
                <span className="text-white font-bold">Offerta di {theirProfile.first_name}</span>
              </div>
              {theirAccepted && <span className="text-[#23a559] text-xs font-bold uppercase flex items-center gap-1"><Check size={14}/> Pronto</span>}
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-[#313338]">
              <div className="grid grid-cols-2 gap-2">
                {theirItems.length === 0 ? (
                  <div className="col-span-2 text-center text-[#949ba4] text-sm py-4 italic">Nessun oggetto offerto</div>
                ) : (
                  theirItems.map((id: string) => renderItem(id))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#2b2d31] border-t border-[#1e1f22] flex justify-between items-center">
          <p className="text-xs text-[#949ba4]">
            {trade.status === 'completed' ? 'Scambio completato!' : 'Controlla bene gli oggetti prima di accettare.'}
          </p>
          <button 
            onClick={handleToggleAccept}
            disabled={trade.status === 'completed'}
            className={`px-8 py-2.5 rounded font-bold transition-colors ${
              trade.status === 'completed' ? 'bg-[#23a559] text-white opacity-50 cursor-not-allowed' :
              myAccepted ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
            }`}
          >
            {trade.status === 'completed' ? 'Completato' : myAccepted ? 'Annulla Conferma' : 'Conferma Scambio'}
          </button>
        </div>

      </div>
    </div>
  );
};