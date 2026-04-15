"use client";

import React from 'react';
import { Gamepad2 } from 'lucide-react';

interface MinigameViewProps {
  url?: string;
  channelName: string;
}

export const MinigameView = ({ url, channelName }: MinigameViewProps) => {
  return (
    <div className="flex-1 flex flex-col bg-[#313338] h-full w-full overflow-hidden">
      <div className="h-12 flex items-center px-4 border-b border-[#1f2023] shadow-sm flex-shrink-0">
        <Gamepad2 className="text-[#949ba4] mr-2" size={24} />
        <h3 className="font-semibold text-white">{channelName}</h3>
      </div>
      
      <div className="flex-1 w-full h-full p-4">
        {url ? (
          <iframe 
            src={url} 
            className="w-full h-full rounded-md border-none bg-black shadow-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#949ba4]">
            <Gamepad2 size={64} className="mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">Nessun minigioco configurato</h2>
            <p>Il creatore del canale deve impostare un URL nelle impostazioni del canale.</p>
          </div>
        )}
      </div>
    </div>
  );
};