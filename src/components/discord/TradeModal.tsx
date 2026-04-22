"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRightLeft, Check, AlertCircle, Plus, Minus, PackageOpen, Crown, MousePointer2 } from 'lucide-react';
import { User } from '@/types/discord';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';
import { useShop } from '@/contexts/ShopContext';
import { CursorPreview } from './CursorPreview';

interface TradeModalProps {
  tradeId: string;
  currentUser: User;
  onClose: () => void;
}

export const TradeModal = ({ tradeId, currentUser, onClose }: TradeModalProps) => {
  const { allItems, getThemeClass, getThemeStyle } = useShop();
  const [trade, setTrade] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [theirProfile, setTheirProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Stato per la schermata di riepilogo
  const [tradeResult, setTradeResult] = useState<{ received: string[], duplicates: string[], refund: number } | null>(null);
  
  const syncChannelRef = useRef<any>(null);
  const myProfileRef = useRef<any>(null);

  useEffect(() => {
    myProfileRef.current = myProfile;
  }, [myProfile]);

  const fetchAndUpdateTrade = async () => {
    const { data } = await supabase.from('trades').select('*').eq('id', tradeId).single();
    if (data) {
      setTrade(data);
      if (data.status === 'completed') {
        setTradeResult(prev => {
          if (prev) return prev; // Evita di ricalcolare se già fatto
          
          const profile = myProfileRef.current;
          const isSender = data.sender_id === currentUser.id;
          const myItems = isSender ? data.sender_items : data.receiver_items;
          const theirItems = isSender ? data.receiver_items : data.sender_items;
          
          // Calcola l'inventario che avrò dopo aver dato via i miei oggetti
          const inventoryAfterGiving = (profile?.purchased_decorations || []).filter((id: string) => !myItems.includes(id));

          // Trova i doppioni e gli oggetti nuovi
          const duplicates = theirItems.filter((id: string) => inventoryAfterGiving.includes(id));
          const received = theirItems.filter((id: string) => !inventoryAfterGiving.includes(id));
          
          // Calcola il rimborso (metà del valore)
          const refund = duplicates.reduce((acc: number, id: string) => {
            const item = allItems.find(i => i.id === id);
            return acc + Math.floor((item?.price || 0) / 2);
          }, 0);

          showSuccess("Scambio completato con successo!");
          return { received, duplicates, refund };
        });
      } else if (data.status === 'cancelled') {
        showError("Lo scambio è stato annullato.");
        onClose();
      }
    }
  };

  const notifyUpdate = async () => {
    await fetchAndUpdateTrade();
    if (syncChannelRef.current) {
      syncChannelRef.current.send({ type: 'broadcast', event: 'trade_updated', payload: {} });
    }
  };

  const fetchInitialData = async () => {
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

  useEffect(() => {
    fetchInitialData();

    const channel = supabase.channel(`trade_sync_${tradeId}`);
    channel.on('broadcast', { event: 'trade_updated' }, () => {
      fetchAndUpdateTrade();
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        syncChannelRef.current = channel;
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tradeId, currentUser.id, onClose]);

  if (isLoading || !trade || !myProfile || !theirProfile) return null;

  const isSender = trade.sender_id === currentUser.id;
  
  const myItems = isSender ? (trade.sender_items || []) : (trade.receiver_items || []);
  const theirItems = isSender ? (trade.receiver_items || []) : (trade.sender_items || []);
  
  const myAccepted = isSender ? trade.sender_accepted : trade.receiver_accepted;
  const theirAccepted = isSender ? trade.receiver_accepted : trade.sender_accepted;

  const myInventory = (myProfile.purchased_decorations || []).filter((id: string) => !myItems.includes(id));

  const calculateTotalValue = (itemIds: string[]) => {
    return itemIds.reduce((total, id) => {
      const item = allItems.find(i => i.id === id);
      return total + (item ? item.price : 0);
    }, 0);
  };

  const handleToggleItem = async (itemId: string, isAdding: boolean) => {
    if (myAccepted) return;

    const newItems = isAdding 
      ? [...myItems, itemId] 
      : myItems.filter((id: string) => id !== itemId);

    setTrade((prev: any) => ({
      ...prev,
      [isSender ? 'sender_items' : 'receiver_items']: newItems,
      sender_accepted: false,
      receiver_accepted: false
    }));

    const updateField = isSender 
      ? { sender_items: newItems, sender_accepted: false, receiver_accepted: false } 
      : { receiver_items: newItems, receiver_accepted: false, sender_accepted: false };

    await supabase.from('trades').update(updateField).eq('id', tradeId);
    notifyUpdate();
  };

  const handleToggleAccept = async () => {
    const newAccepted = !myAccepted;
    
    setTrade((prev: any) => ({
      ...prev,
      [isSender ? 'sender_accepted' : 'receiver_accepted']: newAccepted
    }));

    const updateField = isSender ? { sender_accepted: newAccepted } : { receiver_accepted: newAccepted };
    await supabase.from('trades').update(updateField).eq('id', tradeId);

    // Fetch dello stato più recente per evitare race conditions se entrambi cliccano insieme
    const { data: latestTrade } = await supabase.from('trades').select('sender_accepted, receiver_accepted').eq('id', tradeId).single();

    if (latestTrade && latestTrade.sender_accepted && latestTrade.receiver_accepted) {
      // Workaround: L'RPC richiede che lo status sia 'pending'. Lo rimettiamo temporaneamente a pending.
      await supabase.from('trades').update({ status: 'pending' }).eq('id', tradeId);

      const itemPrices = allItems.reduce((acc, item) => ({ ...acc, [item.id]: item.price }), {});
      const { data, error } = await supabase.rpc('execute_trade', { 
        p_trade_id: tradeId, 
        p_item_prices: itemPrices 
      });
      
      if (error) {
        showError("Errore di connessione durante lo scambio.");
        await supabase.from('trades').update({ status: 'active', sender_accepted: false, receiver_accepted: false }).eq('id', tradeId);
      } else if (data && data.success === false) {
        // Se l'errore è che non è più in corso, significa che l'altro utente ha già completato la transazione con successo
        if (data.error !== 'Lo scambio non è più in corso.') {
          showError(data.error);
          await supabase.from('trades').update({ status: 'active', sender_accepted: false, receiver_accepted: false }).eq('id', tradeId);
        }
      }
    }
    
    notifyUpdate();
  };

  const handleCancelTrade = async () => {
    await supabase.from('trades').update({ status: 'cancelled' }).eq('id', tradeId);
    notifyUpdate();
    onClose();
  };

  const renderItemCard = (itemId: string, action: 'add' | 'remove' | 'none', ownerProfile: any) => {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return null;

    const avatarSrc = ownerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerProfile?.id}`;

    return (
      <div 
        key={itemId} 
        onClick={() => {
          if (action === 'add') handleToggleItem(itemId, true);
          if (action === 'remove') handleToggleItem(itemId, false);
        }}
        className={`flex flex-col items-center bg-[#2b2d31] border border-[#1e1f22] rounded p-2 text-center relative overflow-hidden group transition-all ${
          action !== 'none' && !myAccepted ? 'cursor-pointer hover:border-brand hover:shadow-md' : ''
        } ${myAccepted && action !== 'none' ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {item.type === 'privilege' ? (
          <div className="w-10 h-10 flex items-center justify-center bg-[#1e1f22] rounded-full border border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)] mb-1.5">
            <Crown size={20} className="text-yellow-500" />
          </div>
        ) : item.type === 'cursor' ? (
          <div className="w-10 h-10 flex items-center justify-center mb-1.5">
            <CursorPreview id={item.id} />
          </div>
        ) : item.type === 'emoji_pack' ? (
          <div className="w-10 h-10 grid grid-cols-2 gap-0.5 bg-[#1e1f22] p-1 rounded mb-1.5">
            {item.emojis?.slice(0, 4).map(e => (
              <img key={e} src={e} className="w-full h-full object-contain" />
            ))}
          </div>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center mb-1.5">
            <Avatar src={avatarSrc} decoration={item.id} className="w-8 h-8" />
          </div>
        )}
        
        <span className={`text-[10px] font-medium truncate w-full ${getThemeClass(item.id)}`} style={getThemeStyle(item.id)}>
          {item.name}
        </span>
        
        <div className="flex items-center gap-1 mt-1 bg-[#1e1f22] px-1.5 py-0.5 rounded-full border border-[#3f4147]">
          <span className="text-[9px] font-bold text-white">{item.price}</span>
          <img src="/digitalcardus.png" alt="dc" className="w-2.5 h-2.5 object-contain" />
        </div>

        {action !== 'none' && !myAccepted && (
          <div className={`absolute inset-0 flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity ${
            action === 'add' ? 'bg-gradient-to-l from-[#23a559]/90 to-transparent' : 'bg-gradient-to-l from-[#f23f43]/90 to-transparent'
          }`}>
            {action === 'add' ? <Plus className="text-white" size={20} /> : <Minus className="text-white" size={20} />}
          </div>
        )}
      </div>
    );
  };

  // Se lo scambio è completato, mostra la schermata di riepilogo
  if (tradeResult) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#313338] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-[#1e1f22] bg-[#2b2d31] text-center">
            <div className="w-16 h-16 bg-[#23a559]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-[#23a559]" />
            </div>
            <h2 className="text-2xl font-black text-white">Scambio Completato!</h2>
            <p className="text-[#b5bac1] mt-2">La transazione è andata a buon fine.</p>
          </div>

          <div className="p-6 flex flex-col gap-6 bg-[#1e1f22] max-h-[60vh] overflow-y-auto custom-scrollbar">
            {tradeResult.received.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Oggetti Ricevuti</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {tradeResult.received.map(id => renderItemCard(id, 'none', theirProfile))}
                </div>
              </div>
            )}

            {tradeResult.duplicates.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#f0b232] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Doppioni Venduti (+{tradeResult.refund} DC)
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 opacity-80">
                  {tradeResult.duplicates.map(id => renderItemCard(id, 'none', theirProfile))}
                </div>
              </div>
            )}

            {tradeResult.received.length === 0 && tradeResult.duplicates.length === 0 && (
              <div className="text-center text-[#949ba4] py-4">
                Non hai ricevuto nessun oggetto in questo scambio.
              </div>
            )}
          </div>

          <div className="p-5 bg-[#2b2d31] border-t border-[#1e1f22] flex justify-center">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-lg font-bold bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all shadow-lg"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Altrimenti mostra il tavolo di scambio
  return (
    <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#313338] rounded-xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1e1f22] flex justify-between items-center bg-[#2b2d31] flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <ArrowRightLeft className="text-brand" size={28} />
              Scambio Sicuro
            </h2>
            <p className="text-[#b5bac1] text-sm mt-1">Scambia oggetti con {theirProfile.first_name}</p>
          </div>
          <button onClick={handleCancelTrade} className="text-[#949ba4] hover:text-[#f23f43] transition-colors p-2 bg-[#1e1f22] rounded-full" title="Annulla Scambio">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Area delle Offerte (Tavolo di scambio) */}
          <div className="flex flex-col md:flex-row p-6 gap-6 bg-[#1e1f22] flex-shrink-0">
            
            {/* La mia offerta */}
            <div className={`flex-1 flex flex-col rounded-xl border-2 transition-colors duration-300 ${myAccepted ? 'border-[#23a559] bg-[#23a559]/5' : 'border-[#3f4147] bg-[#2b2d31]'}`}>
              <div className="p-3 border-b border-[#3f4147]/50 flex items-center justify-between bg-black/20 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <img src={myProfile.avatar_url} className="w-8 h-8 rounded-full border border-[#1e1f22]" />
                  <span className="text-white font-bold">La tua offerta</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#b5bac1] text-xs font-medium flex items-center gap-1">
                    Valore: <span className="text-white">{calculateTotalValue(myItems)}</span> <img src="/digitalcardus.png" alt="dc" className="w-3 h-3" />
                  </span>
                  {myAccepted && <span className="bg-[#23a559] text-white text-[10px] font-bold uppercase px-2 py-1 rounded flex items-center gap-1"><Check size={12}/> Pronto</span>}
                </div>
              </div>
              <div className="p-4 h-[220px] overflow-y-auto custom-scrollbar">
                {myItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#949ba4] opacity-50">
                    <PackageOpen size={40} className="mb-2" />
                    <span className="text-sm font-medium">Nessun oggetto offerto</span>
                    <span className="text-xs mt-1">Clicca gli oggetti in basso per aggiungerli</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {myItems.map((id: string) => renderItemCard(id, 'remove', myProfile))}
                  </div>
                )}
              </div>
            </div>

            {/* Icona Scambio Centrale */}
            <div className="hidden md:flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#2b2d31] border-4 border-[#1e1f22] flex items-center justify-center shadow-lg z-10">
                <ArrowRightLeft className="text-[#b5bac1]" size={20} />
              </div>
            </div>

            {/* La loro offerta */}
            <div className={`flex-1 flex flex-col rounded-xl border-2 transition-colors duration-300 ${theirAccepted ? 'border-[#23a559] bg-[#23a559]/5' : 'border-[#3f4147] bg-[#2b2d31]'}`}>
              <div className="p-3 border-b border-[#3f4147]/50 flex items-center justify-between bg-black/20 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <img src={theirProfile.avatar_url} className="w-8 h-8 rounded-full border<think>Continuing the `TradeModal.tsx` file from where it was cut off.
The last line was:
```tsx
                  <img src={theirProfile.avatar_url} className="w-8 h-8 rounded-full border
```
</think> border-[#1e1f22]" />
                  <span className="text-white font-bold">Offerta di {theirProfile.first_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#b5bac1] text-xs font-medium flex items-center gap-1">
                    Valore: <span className="text-white">{calculateTotalValue(theirItems)}</span> <img src="/digitalcardus.png" alt="dc" className="w-3 h-3" />
                  </span>
                  {theirAccepted && <span className="bg-[#23a559] text-white text-[10px] font-bold uppercase px-2 py-1 rounded flex items-center gap-1"><Check size={12}/> Pronto</span>}
                </div>
              </div>
              <div className="p-4 h-[220px] overflow-y-auto custom-scrollbar">
                {theirItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#949ba4] opacity-50">
                    <PackageOpen size={40} className="mb-2" />
                    <span className="text-sm font-medium">In attesa di un'offerta...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {theirItems.map((id: string) => renderItemCard(id, 'none', theirProfile))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Il mio Inventario */}
          <div className="flex-1 flex flex-col bg-[#313338] border-t border-[#1e1f22] min-h-0">
            <div className="p-4 pb-2 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Il tuo Inventario</h3>
              <span className="text-xs text-[#949ba4]">Clicca un oggetto per aggiungerlo all'offerta</span>
            </div>
            <div className="p-4 pt-0 flex-1 overflow-y-auto custom-scrollbar">
              {myInventory.length === 0 ? (
                <div className="text-center text-[#949ba4] py-8 italic">Non hai altri oggetti da scambiare.</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {myInventory.map((id: string) => renderItemCard(id, 'add', myProfile))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Azioni */}
        <div className="p-5 bg-[#2b2d31] border-t border-[#1e1f22] flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 text-[#949ba4] text-sm">
            <AlertCircle size={16} />
            <span>Controlla bene gli oggetti prima di confermare.</span>
          </div>
          <button 
            onClick={handleToggleAccept}
            className={`px-8 py-3 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2 ${
              myAccepted ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white hover:-translate-y-0.5'
            }`}
          >
            {myAccepted ? (
              <>Annulla Conferma <X size={18}/></>
            ) : (
              <>Conferma Scambio <Check size={18}/></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};