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
import { showSuccess, showError } from "@/utils/toast";

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
  const [isRequestingTrade, setIsRequestingTrade] = useState(false);

  if (!user) return <>{children}</>;

  const isAdmin = user.id === adminId;
  const isModerator = moderatorIds.includes(user.id);
  const xpNeeded = (user.level || 1) * 5;
  const currentXp = user.xp || 0;
  const xpPercent = Math.min(100, (currentXp / xpNeeded) * 100);
  
  // Filtra gli oggetti posseduti e li ordina per prezzo decrescente
  const ownedItems = (user.purchased_decorations
    ?.map(id => SHOP_ITEMS.find(i => i.id === id))
    .filter(Boolean) as typeof SHOP_ITEMS)
    ?.sort((a, b) => b.price - a.price) || [];

  const handleRequestTrade = async () => {
    if (!authUser) return;
    setIsRequestingTrade(true);
    
    const { error } = await supabase.from('trades').insert({
      sender_id: authUser.id,
      receiver_id: user.id,
      status: 'pending'
    });
    
    if (error) {
      showError("Errore nell'invio della richiesta di scambio.");
    } else {
      showSuccess("Richiesta di scambio inviata!");
    }
    setIsRequestingTrade(false);
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

            {/* Sezione Inventario */}
            <div className="mt-4 pt-4 border-t border-[#2b2d31]">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setShowInventory(!showInventory)}
                  className="flex items-center text-[11px] font-bold uppercase text-[#b5bac1] hover:text-[#dbdee1] transition-colors tracking-wider focus:outline-none"
                >
                  <Archive size={14} className="mr-1.5" />
                  Inventario ({ownedItems.length})
                  {showInventory ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                </button>
                
                {authUser && authUser.id !== user.id && (
                  <button 
                    onClick={handleRequestTrade}
                    disabled={isRequestingTrade}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] px-2 py-1 rounded border border-[#1e1f22] transition-colors disabled:opacity-50"
                  >
                    <ArrowRightLeft size={12} />
                    Scambia
                  </button>
                )}
              </div>

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