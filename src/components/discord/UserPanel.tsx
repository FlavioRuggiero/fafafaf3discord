"use client";

import React, { useState, useEffect } from "react";
import { Mic, MicOff, Headphones, Settings } from "lucide-react";
import { User } from "@/types/discord";
import { useVoiceChannel } from "@/contexts/VoiceChannelProvider";
import { Avatar } from "./Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/contexts/ShopContext";

interface UserPanelProps {
  currentUser: User;
  onOpenUserSettings?: () => void;
}

export const UserPanel = ({ currentUser: initialUser, onOpenUserSettings }: UserPanelProps) => {
  const { isMuted, toggleMute, isDeafened, toggleDeafen } = useVoiceChannel();
  const { getThemeClass, getThemeStyle } = useShop();
  const [liveUser, setLiveUser] = useState(initialUser);

  // Sincronizza con le props iniziali
  useEffect(() => {
    setLiveUser(initialUser);
  }, [initialUser]);

  // Listener in tempo reale per aggiornare istantaneamente il contorno nel pannello
  useEffect(() => {
    if (!initialUser?.id) return;
    
    const sub = supabase.channel(`userpanel_${initialUser.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${initialUser.id}`
      }, (payload) => {
        setLiveUser(prev => ({ 
          ...prev, 
          ...payload.new,
          avatar_decoration: payload.new.avatar_decoration
        }));
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(sub);
    };
  }, [initialUser?.id]);

  const userLevel = (liveUser as any)?.level || 1;
  const userXp = (liveUser as any)?.xp || 0;
  const userXpNeeded = userLevel * 5;
  const userDigitalcardus = (liveUser as any)?.digitalcardus ?? 25;
  const xpPercentage = Math.min(100, (userXp / userXpNeeded) * 100);

  return (
    <div className="h-[52px] bg-[#232428] flex items-center px-2 flex-shrink-0 relative">
      <div className="relative flex items-center hover:bg-[#3f4147] p-1 -ml-1 rounded cursor-pointer flex-1 min-w-0 mr-1 group/profile">
        
        <div className="absolute bottom-[110%] left-0 w-56 bg-[#111214] border border-[#1e1f22] rounded-lg shadow-xl p-3 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-200 z-[100] translate-y-1 group-hover/profile:translate-y-0 pointer-events-none">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-bold text-sm">Livello {userLevel}</span>
            <span className="text-[#b5bac1] text-xs font-medium">
              {userXp} / {userXpNeeded} XP
            </span>
          </div>
          <div className="w-full bg-[#2b2d31] h-2.5 rounded-full overflow-hidden mb-3">
            <div 
              className="bg-gradient-to-r from-[#5865f2] to-[#eb459e] h-full rounded-full transition-all duration-500" 
              style={{ width: `${xpPercentage}%` }} 
            />
          </div>
          <div className="flex items-center text-[#23a559] text-sm font-bold bg-[#1e1f22] p-2 rounded-md">
            <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 mr-2 object-contain" />
            {userDigitalcardus} Digitalcardus
          </div>
          <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-[#111214] border-b border-r border-[#1e1f22] rotate-45"></div>
        </div>

        <div className="relative">
          {/* clipEffects={true} impedisce alle emoji di uscire dal pannello e sballare il layout */}
          <Avatar 
            src={liveUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${liveUser?.id}`} 
            decoration={liveUser?.avatar_decoration} 
            className="w-8 h-8" 
            clipEffects={true} 
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full border-[3px] border-[#232428] bg-[#23a559] z-30" />
        </div>
        <div className="ml-2 flex flex-col min-w-0">
          <span 
            className={`text-sm font-semibold truncate leading-tight ${getThemeClass(liveUser?.avatar_decoration)}`}
            style={getThemeStyle(liveUser?.avatar_decoration)}
          >
            {liveUser?.name}
          </span>
          <span className="text-[11px] text-[#dbdee1] truncate leading-tight">Online</span>
        </div>
      </div>
      
      <div className="flex items-center text-[#dbdee1] flex-shrink-0">
        <button 
          onClick={toggleMute} 
          disabled={isDeafened} 
          className="p-1.5 hover:bg-[#3f4147] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={isDeafened ? "Devi togliere la modalità 'non sentire' per usare il microfono" : (isMuted ? "Riattiva microfono" : "Disattiva microfono")}
        >
          {(isMuted || isDeafened) ? <MicOff size={18} className="text-[#f23f43]" /> : <Mic size={18} />}
        </button>
        <button 
          onClick={toggleDeafen} 
          className="p-1.5 hover:bg-[#3f4147] rounded transition-colors"
          title={isDeafened ? "Attiva audio" : "Sordomutati"}
        >
          {isDeafened ? <Headphones size={18} className="text-[#f23f43]" /> : <Headphones size={18} />}
        </button>
        {onOpenUserSettings && (
          <button onClick={onOpenUserSettings} className="p-1.5 hover:bg-[#3f4147] rounded transition-colors" title="Impostazioni Utente">
            <Settings size={18} />
          </button>
        )}
      </div>
    </div>
  );
};