"use client";

import React, { useState, useEffect } from "react";
import { Gamepad2, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DailyMinigameProps {
  onToggleSidebar?: () => void;
}

export const DailyMinigame = ({ onToggleSidebar }: DailyMinigameProps) => {
  const [dailyMinigame, setDailyMinigame] = useState<{name: string, url: string, serverName: string} | null>(null);
  const [isLoadingDaily, setIsLoadingDaily] = useState(true);

  useEffect(() => {
    const fetchDaily = async () => {
      setIsLoadingDaily(true);
      const { data, error } = await supabase
        .from('channels')
        .select('name, minigame_url, server_id')
        .eq('type', 'minigame')
        .not('minigame_url', 'is', null)
        .neq('minigame_url', '')
        .order('id');

      if (data && data.length > 0) {
        // Usa il giorno corrente come seed per scegliere un minigioco
        const dayIndex = Math.floor(Date.now() / 86400000);
        const selected = data[dayIndex % data.length];
        
        // Recupera il nome del server
        const { data: serverData } = await supabase
          .from('servers')
          .select('name')
          .eq('id', selected.server_id)
          .single();

        setDailyMinigame({
          name: selected.name,
          url: selected.minigame_url,
          serverName: serverData?.name || 'Server Sconosciuto'
        });
      } else {
        setDailyMinigame(null);
      }
      setIsLoadingDaily(false);
    };
    fetchDaily();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#313338] relative h-full">
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-between px-4 flex-shrink-0 bg-[#313338]">
        <div className="flex items-center min-w-0 flex-1">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors flex-shrink-0">
              <Menu size={24} />
            </button>
          )}
          <Gamepad2 size={24} className="text-[#0ea5e9] mr-2 flex-shrink-0" />
          <h2 className="font-semibold text-white truncate min-w-0">
            Minigioco Giornaliero
            {dailyMinigame && <span className="text-[#b5bac1] text-sm ml-2 font-normal hidden sm:inline-block">• {dailyMinigame.name} (da {dailyMinigame.serverName})</span>}
          </h2>
        </div>
      </div>

      <div className="flex-1 w-full p-4 bg-[#2b2d31] min-h-0">
        {isLoadingDaily ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : dailyMinigame ? (
          <iframe 
            src={dailyMinigame.url} 
            className="w-full h-full rounded-lg border-none bg-black shadow-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#949ba4]">
            <Gamepad2 size={64} className="mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">Nessun minigioco disponibile</h2>
            <p>Nessun server ha ancora configurato un minigioco.</p>
          </div>
        )}
      </div>
    </div>
  );
};