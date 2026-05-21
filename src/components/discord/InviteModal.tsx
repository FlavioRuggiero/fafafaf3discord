"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Server } from '@/types/discord';

interface InviteModalProps {
  server: Server;
  onClose: () => void;
}

export const InviteModal = ({ server, onClose }: InviteModalProps) => {
  const [copied, setCopied] = useState(false);
  
  // Creiamo un link di invito simulato basato sull'ID del server
  const inviteLink = `${window.location.origin}/invite/${server.id.substring(0, 8)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-[#1e1f22] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Invita amici in {server.name}</h2>
          <button onClick={onClose} className="text-[#949ba4] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
              Invia questo link ai tuoi amici
            </label>
            <div className="flex bg-[#1e1f22] rounded overflow-hidden border border-[#1e1f22] focus-within:border-brand p-1 transition-colors">
              <input 
                type="text" 
                readOnly 
                value={inviteLink}
                className="w-full bg-transparent text-white p-2 outline-none text-sm"
              />
              <button 
                onClick={handleCopy}
                className={`px-6 py-2 rounded text-sm font-medium text-white transition-colors ${
                  copied ? 'bg-[#23a559]' : 'bg-[#5865F2] hover:bg-[#4752C4]'
                }`}
              >
                {copied ? 'Copiato' : 'Copia'}
              </button>
            </div>
            <p className="text-xs text-[#949ba4] mt-2">Il tuo link di invito scadrà tra 7 giorni.</p>
          </div>
        </div>
      </div>
    </div>
  );
};