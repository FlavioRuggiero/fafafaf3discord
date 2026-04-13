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
      <div className="bg-[#313338] rounded-xl w-full max-w-4xl shadow-2xl border border-[#1e1f22] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[#1e1f22] flex justify-between items-center bg-[#2b2d31]">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="text-brand" size={24} />
            <h2 className="text-xl font-bold text-white">Scambio in corso</h2>
          </div>
          <button onClick={handleCancel} className="text-[#949ba4] hover:text-[#f23f43] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          
          {/* Left Side: My Offer */}
          <div className="flex-1 flex flex-col border-r border-[#1e1f22] relative">
            <div className="p-4 flex items-center gap-3 border-b border-[#1e1f22] bg-[#2b2d31]/50">
              <Avatar src={currentUser.avatar} decoration={currentUser.avatar_decoration} className="w-10 h-10" />
              <div>
                <div className="text-white font-bold">{currentUser.name}</div>
                <div className="text-xs text-[#b5bac1]">La tua offerta</div>
              </div>
              {myAccepted && <div className="ml-auto bg-[#23a559] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><Check size={14}/> Pronto</div>}
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4 flex-shrink-0">
              {[0, 1, 2, 3].map(i => renderSlot(myItems[i], true))}
            </div>

            {/* My Inventory Selection */}
            <div className="flex-1 border-t border-[#1e1f22] bg-[#2b2d31] flex flex-col min-h-0">
              <div className="px-4 py-2 text-xs font-bold text-[#949ba4] uppercase tracking-wider border-b border-[#1e1f22]">
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
          <div className="flex-1 flex flex-col relative bg-[#2b2d31]/30">
            <div className="p-4 flex items-center gap-3 border-b border-[#1e1f22] bg-[#2b2d31]/50">
              <Avatar src={otherUser.avatar} decoration={otherUser.avatar_decoration} className="w-10 h-10" />
              <div>
                <div className="text-white font-bold">{otherUser.name}</div>
                <div className="text-xs text-[#b5bac1]">La sua offerta</div>
              </div>
              {theirAccepted && <div className="ml-auto bg-[#23a559] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><Check size={14}/> Pronto</div>}
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map(i => renderSlot(theirItems[i], false))}
            </div>

            <div className="mt-auto p-6 text-center">
              <p className="text-sm text-[#949ba4] mb-4">
                I doppioni ricevuti verranno automaticamente venduti per metà del loro valore in Digitalcardus.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#2b2d31] border-t border-[#1e1f22] flex justify-between items-center">
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
</dyad-file>

### 4. Aggiunta del pulsante nel Profilo

<dyad-write path="src/components/discord/ProfilePopover.tsx" description="Aggiunta del pulsante Richiedi Scambio">
"use client";

import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { User } from "@/types/discord";
import { Shield, Archive, ChevronDown, ChevronUp, Crown, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar } from "./Avatar";
import { SHOP_ITEMS } from "@/data/shopItems";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const statusColors = {
  online: "bg-[#23a559]",
  idle: "bg-[#f0b232]",
  dnd: "bg-[#f23f43]",
  offline: "bg-[#80848e]",
};

const statusText = {
  online: "Online",
  idle: "Assente",
  dnd: "Non disturbare",
  offline: "Offline",
};

const getThemeTextClass = (id: string) => {
  switch(id) {
    case 'supernova': return 'theme-text-supernova';
    case 'esquelito': return 'theme-text-esquelito';
    case 'oceanic': return 'theme-text-oceanic';
    case 'saturn-fire': return 'theme-text-saturn-fire';
    case 'gustavo-armando': return 'theme-text-gustavo';
    default: return 'text-[#dbdee1]';
  }
};

export const ProfilePopover = ({ user, children, side = "right", align = "start" }: { user: User | null, children: React.ReactNode, side?: "top" | "right" | "bottom" | "left", align?: "start" | "center" | "end" }) => {
  const { user: authUser, adminId, moderatorIds } = useAuth();
  const [showInventory, setShowInventory] = useState(false);

  if (!user) return <>{children}</>;

  const isAdmin = user.id === adminId;
  const isModerator = moderatorIds.includes(user.id);
  const xpNeeded = (user.level || 1) * 5;
  const currentXp = user.xp || 0;
  const xpPercent = Math.min(100, (currentXp / xpNeeded) * 100);
  
  const ownedItems = (user.purchased_decorations
    ?.map(id => SHOP_ITEMS.find(i => i.id === id))
    .filter(Boolean) as typeof SHOP_ITEMS)
    ?.sort((a, b) => b.price - a.price) || [];

  const handleRequestTrade = async () => {
    if (!authUser || authUser.id === user.id) return;

    // Controlla se c'è già uno scambio in corso
    const { data: existing } = await supabase
      .from('trades')
      .select('id')
      .eq('status', 'pending')
      .or(`and(sender_id.eq.${authUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${authUser.id})`)
      .single();

    if (existing) {
      showError("C'è già uno scambio in corso con questo utente.");
      return;
    }

    const { error } = await supabase.from('trades').insert({
      sender_id: authUser.id,
      receiver_id: user.id
    });

    if (error) {
      showError("Errore durante la richiesta di scambio.");
    } else {
      showSuccess("Richiesta di scambio inviata!");
    }
  };
  
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          side={side} 
          align={align} 
          sideOffset={16} 
          collisionPadding={20}
          className={`w-[300px] p-0 bg-[#111214] text-[#dbdee1] shadow-2xl rounded-lg z-[99999] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 relative ${
            isAdmin 
              ? 'border-2 border-transparent' 
              : isModerator 
                ? 'border-2 border-[#60a5fa] shadow-[0_0_15px_rgba(96,165,250,0.3)]' 
                : 'border border-[#1e1f22]'
          }`}
        >
          {isAdmin && <div className="admin-popover-glow" />}
          
          <div 
            className="h-[60px] relative flex-shrink-0 bg-cover bg-center rounded-t-lg"
            style={{ 
              backgroundColor: user.banner_color || '#5865F2',
              backgroundImage: user.banner_url ? `url(${user.banner_url})` : undefined
            }}
          >
            <div className="absolute -bottom-10 left-4 rounded-full border-[6px] border-[#111214] bg-[#111214]">
              <Avatar src={user.avatar} decoration={user.avatar_decoration} className="w-16 h-16" />
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-[3px] border-[#111214] ${statusColors[user.status]} z-30`} title={statusText[user.status]} />
            </div>
          </div>
          
          <div className="p-4 pt-12 pb-5">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-lg font-bold text-white leading-tight">{user.name}</h3>
              {isAdmin && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help flex items-center"><Shield size={16} className="text-red-500 flex-shrink-0" /></div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                    admin di discord canary 2
                  </TooltipContent>
                </Tooltip>
              )}
              {!isAdmin && isModerator && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help flex items-center"><Shield size={16} className="text-blue-400 flex-shrink-0" /></div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                    moderatore ufficiale
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Pulsante Scambio */}
            {authUser && authUser.id !== user.id && (
              <button 
                onClick={handleRequestTrade}
                className="w-full mt-2 mb-3 bg-[#2b2d31] hover:bg-[#35373c] border border-[#1e1f22] text-white text-sm font-medium py-1.5 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowRightLeft size={16} className="text-brand" />
                Richiedi Scambio
              </button>
            )}

            <div className="flex flex-col mt-3 bg-[#1e1f22] py-3 px-3 rounded-lg border border-[#2b2d31]">
              <div className="flex items-center justify-around mb-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-0.5">Livello</span>
                  <span className="font-bold text-white">{user.level || 1}</span>
                </div>
                <div className="w-[1px] h-8 bg-[#2b2d31]"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-0.5">Digitalcardus</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{user.digitalcardus ?? 25}</span>
                    <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 object-contain" />
                  </div>
                </div>
              </div>
              
              <div className="px-1 border-t border-[#2b2d31] pt-3">
                <div className="flex justify-between items-center text-[10px] text-[#b5bac1] uppercase tracking-wider mb-1.5 font-bold">
                  <span>Progresso XP</span>
                  <span className="text-white">{currentXp} / {xpNeeded}</span>
                </div>
                <div className="h-1.5 bg-[#111214] rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all duration-500 ease-out" style={{ width: `${xpPercent}%` }} />
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#2b2d31]">
              <h4 className="text-[11px] font-bold uppercase text-[#b5bac1] mb-2 tracking-wider">Su di me</h4>
              {user.bio ? (
                <p className="text-[13px] text-[#dbdee1] whitespace-pre-wrap leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-[13px] text-[#949ba4] italic">Nessuna biografia impostata.</p>
              )}
            </div>

            {user.server_roles && user.server_roles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#2b2d31]">
                <h4 className="text-[11px] font-bold uppercase text-[#b5bac1] mb-2 tracking-wider">Ruoli</h4>
                <div className="flex flex-wrap gap-1.5">
                  {user.server_roles.map(role => (
                    <div key={role.id} className="flex items-center bg-[#2b2d31] border border-[#1e1f22] rounded px-2 py-1">
                      <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: role.color }} />
                      <span className="text-xs font-medium text-[#dbdee1]">{role.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#2b2d31]">
              <button
                onClick={() => setShowInventory(!showInventory)}
                className="flex items-center justify-between w-full text-[11px] font-bold uppercase text-[#b5bac1] hover:text-[#dbdee1] transition-colors tracking-wider focus:outline-none"
              >
                <div className="flex items-center gap-1.5">
                  <Archive size={14} />
                  Inventario ({ownedItems.length})
                </div>
                {showInventory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showInventory && (
                <div className="mt-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {ownedItems.length === 0 ? (
                    <p className="text-xs text-[#949ba4] italic text-center py-2">Nessun oggetto posseduto.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {ownedItems.map(item => (
                        <div key={item.id} className="flex flex-col items-center bg-[#2b2d31] border border-[#1e1f22] rounded p-2 text-center">
                          {item.type === 'privilege' ? (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div className="w-10 h-10 flex items-center justify-center bg-[#1e1f22] rounded-full border border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)] mb-1.5 cursor-help">
                                  <Crown size={20} className="text-yellow-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-medium text-xs max-w-[200px] text-center z-[99999]">
                                {item.description}
                              </TooltipContent>
                            </Tooltip>
                          ) : item.type === 'emoji_pack' ? (
                            <div className="w-10 h-10 grid grid-cols-2 gap-0.5 bg-[#1e1f22] p-1 rounded mb-1.5">
                              {item.emojis?.slice(0, 4).map(e => (
                                <img key={e} src={e} className="w-full h-full object-contain" />
                              ))}
                            </div>
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center mb-1.5">
                              <Avatar src={user.avatar} decoration={item.id} className="w-8 h-8" />
                            </div>
                          )}
                          <span className={`text-[10px] font-medium truncate w-full ${getThemeTextClass(item.id)}`}>
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1 mt-1 bg-[#1e1f22] px-1.5 py-0.5 rounded-full border border-[#3f4147]">
                            <span className="text-[9px] font-bold text-white">{item.price}</span>
                            <img src="/digitalcardus.png" alt="dc" className="w-2.5 h-2.5 object-contain" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};