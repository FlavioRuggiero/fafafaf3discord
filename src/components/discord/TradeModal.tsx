"use client";

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Check, AlertTriangle } from 'lucide-react';
import { User, Trade } from '@/types/discord';
import { supabase } from '@/integrations/supabase/client';
import { SHOP_ITEMS } from '@/data/shopItems';
import { Avatar } from './Avatar';
import { getThemeTextClass } from './InventoryView';
import { showError, showSuccess } from '@/utils/toast';

interface TradeModalProps {
  trade: Trade;
  currentUser: User;
  otherUser: User;
  onClose: () => void;
}

export const TradeModal = ({ trade, currentUser, otherUser, onClose }: TradeModalProps) => {
  const isSender = trade.sender_id === currentUser.id;
  
  const myItems = isSender ? trade.sender_items : trade.receiver_items;
  const theirItems = isSender ? trade.receiver_items : trade.sender_items;
  
  const myAccepted = isSender ? trade.sender_accepted : trade.receiver_accepted;
  const theirAccepted = isSender ? trade.receiver_accepted : trade.sender_accepted;

  const [isProcessing, setIsProcessing] = useState(false);

  // Annulla lo scambio se si chiude il modal
  const handleCancel = async () => {
    await supabase.from('trades').update({ status: 'cancelled' }).eq('id', trade.id);
    onClose();
  };

  const handleToggleAccept = async () => {
    const updateField = isSender ? 'sender_accepted' : 'receiver_accepted';
    await supabase.from('trades').update({ [updateField]: !myAccepted }).eq('id', trade.id);
  };

  const handleAddItem = async (itemId: string) => {
    if (myAccepted) return; // Non puoi modificare se hai già accettato
    if (myItems.length >= 4) {
      showError("Puoi scambiare massimo 4 oggetti alla volta.");
      return;
    }
    if (myItems.includes(itemId)) {
      showError("Hai già inserito questo oggetto nello scambio.");
      return;
    }

    const newItems = [...myItems, itemId];
    const updateField = isSender ? 'sender_items' : 'receiver_items';
    
    // Se modifichi gli oggetti, l'accettazione di entrambi viene resettata per sicurezza
    await supabase.from('trades').update({ 
      [updateField]: newItems,
      sender_accepted: false,
      receiver_accepted: false
    }).eq('id', trade.id);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (myAccepted) return;
    const newItems = myItems.filter(id => id !== itemId);
    const updateField = isSender ? 'sender_items' : 'receiver_items';
    
    await supabase.from('trades').update({ 
      [updateField]: newItems,
      sender_accepted: false,
      receiver_accepted: false
    }).eq('id', trade.id);
  };

  // Esegui lo scambio se entrambi hanno accettato
  useEffect(() => {
    const executeTrade = async () => {
      if (trade.sender_accepted && trade.receiver_accepted && trade.status === 'pending' && !isProcessing) {
        setIsProcessing(true);
        
        // Solo il sender chiama l'RPC per evitare doppie chiamate
        if (isSender) {
          // Creiamo una mappa dei prezzi per calcolare i rimborsi
          const priceMap: Record<string, number> = {};
          SHOP_ITEMS.forEach(item => { priceMap[item.id] = item.price; });

          const { data, error } = await supabase.rpc('execute_trade', { 
            p_trade_id: trade.id,
            p_item_prices: priceMap
          });

          if (error || (data && !data.success)) {
            showError(error?.message || data?.error || "Errore durante lo scambio.");
            await supabase.from('trades').update({ status: 'cancelled' }).eq('id', trade.id);
          } else {
            showSuccess("Scambio completato con successo!");
            if (data.sender_refund > 0) {
              showSuccess(`Hai ricevuto ${data.sender_refund} DC per i doppioni!`);
            }
          }
        }
      }
    };

    executeTrade();
  }, [trade.sender_accepted, trade.receiver_accepted, trade.status, isSender, trade.id, isProcessing]);

  // Chiudi il modal se lo scambio è completato o annullato
  useEffect(() => {
    if (trade.status !== 'pending') {
      if (trade.status === 'cancelled' && !isProcessing) {
        showError("Lo scambio è stato annullato.");
      }
      onClose();
    }
  }, [trade.status, onClose, isProcessing]);

  // Filtra l'inventario per mostrare solo gli oggetti che non sono già nello scambio
  const availableInventory = (currentUser.purchased_decorations || [])
    .filter(id => !myItems.includes(id))
    .map(id => SHOP_ITEMS.find(i => i.id === id))
    .filter(Boolean) as typeof SHOP_ITEMS;

  const renderSlot = (itemId: string | undefined, isMine: boolean) => {
    const item = itemId ? SHOP_ITEMS.find(i => i.id === itemId) : null;
    
    // Controlla se è un doppione per chi lo riceve
    const isDuplicate = item && (
      isMine 
        ? otherUser.purchased_decorations?.includes(item.id) 
        : currentUser.purchased_decorations?.includes(item.id)
    );

    return (
      <div 
        className={`relative w-full aspect-square bg-[#1e1f22] rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all ${
          item ? 'border-[#3f4147]' : 'border-dashed border-[#3f4147] opacity-50'
        } ${isMine && item && !myAccepted ? 'cursor-pointer hover:border-[#f23f43] group' : ''}`}
        onClick={() => isMine && item && !myAccepted && handleRemoveItem(item.id)}
      >
        {item ? (
          <>
            {item.type === 'emoji_pack' ? (
              <div className="w-12 h-12 grid grid-cols-2 gap-1 mb-2">
                {item.emojis?.slice(0, 4).map(e => <img key={e} src={e} className="w-full h-full object-contain" />)}
              </div>
            ) : (
              <div className="w-12 h-12 mb-2 flex items-center justify-center">
                <Avatar src={isMine ? currentUser.avatar : otherUser.avatar} decoration={item.id} className="w-10 h-10" />
              </div>
            )}
            <span className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${getThemeTextClass(item.id)}`}>{item.name}</span>
            <div className="flex items-center gap-1 mt-1 bg-[#111214] px-1.5 py-0.5 rounded-full">
              <span className="text-[9px] font-bold text-white">{item.price}</span>
              <img src="/digitalcardus.png" alt="dc" className="w-2.5 h-2.5 object-contain" />
            </div>

            {isDuplicate && (
              <div className="absolute -top-2 -right-2 bg-[#f0b232] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md flex items-center gap-0.5 z-10" title="Verrà convertito in DC">
                <AlertTriangle size={10} /> Doppione
              </div>
            )}

            {isMine && !myAccepted && (
              <div className="absolute inset-0 bg-[#f23f43]/80 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity z-20">
                <X size={24} className="text-white" />
              </div>
            )}
          </>
        ) : (
          <span className="text-[#949ba4] text-xs font-medium">Vuoto</span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#313338] rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-[#1e1f22] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[#1e1f22] flex justify-between items-center bg-[#2b2d31] flex-shrink-0">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="text-brand" size={24} />
            <h2 className="text-xl font-bold text-white">Scambio in corso</h2>
          </div>
          <button onClick={handleCancel} className="text-[#949ba4] hover:text-[#f23f43] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          
          {/* Left Side: My Offer */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[#1e1f22] relative min-h-[450px] md:min-h-0">
            <div className="p-4 flex items-center gap-3 border-b border-[#1e1f22] bg-[#2b2d31]/50 flex-shrink-0">
              <Avatar src={currentUser.avatar} decoration={currentUser.avatar_decoration} className="w-10 h-10" />
              <div>
                <div className="text-white font-bold">{currentUser.name}</div>
                <div className="text-xs text-[#b5bac1]">La tua offerta</div>
              </div>
              {myAccepted && <div className="ml-auto bg-[#23a559] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><Check size={14}/> Pronto</div>}
            </div>
            
            <div className="p-4 md:p-6 grid grid-cols-2 gap-3 md:gap-4 flex-shrink-0">
              {[0, 1, 2, 3].map(i => renderSlot(myItems[i], true))}
            </div>

            {/* My Inventory Selection */}
            <div className="flex-1 border-t border-[#1e1f22] bg-[#2b2d31] flex flex-col min-h-[200px] md:min-h-0">
              <div className="px-4 py-2 text-xs font-bold text-[#949ba4] uppercase tracking-wider border-b border-[#1e1f22] flex-shrink-0">
                Il tuo inventario
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 grid grid-cols-3 gap-2">
                {availableInventory.length === 0 ? (
                  <div className="col-span-3 text-center text-[#949ba4] text-xs py-4">Nessun oggetto disponibile.</div>
                ) : (
                  availableInventory.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => handleAddItem(item.id)}
                      className={`bg-[#1e1f22] border border-[#3f4147] rounded p-2 flex flex-col items-center cursor-pointer transition-colors ${myAccepted ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand hover:bg-[#35373c]'}`}
                    >
                      {item.type === 'emoji_pack' ? (
                        <div className="w-8 h-8 grid grid-cols-2 gap-0.5 mb-1">
                          {item.emojis?.slice(0, 4).map(e => <img key={e} src={e} className="w-full h-full object-contain" />)}
                        </div>
                      ) : (
                        <div className="w-8 h-8 mb-1 flex items-center justify-center">
                          <Avatar src={currentUser.avatar} decoration={item.id} className="w-6 h-6" />
                        </div>
                      )}
                      <span className="text-[9px] text-white text-center truncate w-full">{item.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Their Offer */}
          <div className="flex-1 flex flex-col relative bg-[#2b2d31]/30 min-h-[350px] md:min-h-0">
            <div className="p-4 flex items-center gap-3 border-b border-[#1e1f22] bg-[#2b2d31]/50 flex-shrink-0">
              <Avatar src={otherUser.avatar} decoration={otherUser.avatar_decoration} className="w-10 h-10" />
              <div>
                <div className="text-white font-bold">{otherUser.name}</div>
                <div className="text-xs text-[#b5bac1]">La sua offerta</div>
              </div>
              {theirAccepted && <div className="ml-auto bg-[#23a559] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><Check size={14}/> Pronto</div>}
            </div>
            
            <div className="p-4 md:p-6 grid grid-cols-2 gap-3 md:gap-4 flex-shrink-0">
              {[0, 1, 2, 3].map(i => renderSlot(theirItems[i], false))}
            </div>

            <div className="mt-auto p-6 text-center flex-shrink-0">
              <p className="text-sm text-[#949ba4] mb-4">
                I doppioni ricevuti verranno automaticamente venduti per metà del loro valore in Digitalcardus.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#2b2d31] border-t border-[#1e1f22] flex justify-between items-center flex-shrink-0">
          <button 
            onClick={handleCancel}
            className="px-6 py-2 text-white hover:underline font-medium transition-colors"
          >
            Annulla Scambio
          </button>
          
          <button 
            onClick={handleToggleAccept}
            disabled={isProcessing}
            className={`px-8 py-2.5 rounded font-bold transition-all flex items-center gap-2 ${
              myAccepted 
                ? 'bg-[#f0b232] hover:bg-[#d19a29] text-black' 
                : 'bg-[#23a559] hover:bg-[#1a7c43] text-white'
            }`}
          >
            {myAccepted ? 'Annulla Conferma' : 'Accetta Scambio'}
          </button>
        </div>

      </div>
    </div>
  );
};