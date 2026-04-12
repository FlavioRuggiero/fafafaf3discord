"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, Shield, Coins, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, User } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProfilePopover } from "./ProfilePopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { adminId } = useAuth();
  const [activeTab, setActiveTab] = useState<'dc' | 'mods'>('dc');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      let query = supabase.from('profiles').select('*').limit(50);
      
      if (searchQuery.trim()) {
        query = query.or(`first_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        setUsers(data as Profile[]);
      }
      setLoading(false);
    };

    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUpdateDC = async (userId: string, currentDC: number, isAdding: boolean) => {
    const numAmount = parseInt(amounts[userId] || '0');
    if (isNaN(numAmount) || numAmount <= 0) {
      return showError("Inserisci un importo valido");
    }

    const newDC = isAdding ? (currentDC + numAmount) : Math.max(0, currentDC - numAmount);
    
    const { error } = await supabase.from('profiles').update({ digitalcardus: newDC }).eq('id', userId);
    
    if (error) {
      showError("Errore di permessi. Assicurati di aver eseguito il codice SQL per i permessi Admin.");
    } else {
      showSuccess(`DigitalCardus ${isAdding ? 'aggiunti' : 'rimossi'} con successo!`);
      setUsers(users.map(u => u.id === userId ? { ...u, digitalcardus: newDC } : u));
      setAmounts(prev => ({ ...prev, [userId]: '' }));
    }
  };

  const handleToggleMod = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'moderator' ? 'user' : 'moderator';
    
    const { error } = await supabase.from('profiles').update({ role: newRole } as any).eq('id', userId);
    
    if (error) {
      showError("Errore di permessi. Assicurati di aver eseguito il codice SQL per i permessi Admin.");
    } else {
      showSuccess(`Ruolo aggiornato a ${newRole}!`);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } as any : u));
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#313338] rounded-lg w-[600px] max-h-[80vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-[#1e1f22] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-yellow-500" />
            Pannello Amministratore
          </h2>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#dbdee1] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-4 gap-4 border-b border-[#1e1f22]">
          <button
            onClick={() => setActiveTab('dc')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'dc' ? 'border-[#5865f2] text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <Coins size={16} />
              Gestione DigitalCardus
            </div>
          </button>
          <button
            onClick={() => setActiveTab('mods')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'mods' ? 'border-[#5865f2] text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              Gestione Moderatori
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-[#949ba4]" />
            </div>
            <input
              type="text"
              placeholder="Cerca utente per nome o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1f22] text-white rounded p-2 pl-10 focus:outline-none placeholder-[#949ba4]"
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 min-h-[300px]">
            {loading ? (
              <div className="text-center text-[#949ba4] py-4">Caricamento...</div>
            ) : users.length === 0 ? (
              <div className="text-center text-[#949ba4] py-4">Nessun utente trovato.</div>
            ) : (
              users.map(user => {
                const userRole = (user as any).role || 'user';
                const isAdmin = user.id === adminId;
                const isMod = userRole === 'moderator';
                
                const userForCard: User = {
                  id: user.id,
                  name: user.first_name || 'Utente',
                  avatar: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                  status: 'online',
                  bio: user.bio || undefined,
                  banner_color: user.banner_color || undefined,
                  banner_url: user.banner_url || undefined,
                  level: user.level || 1,
                  digitalcardus: user.digitalcardus ?? 25,
                  xp: user.xp || 0,
                  global_role: isAdmin ? 'CREATOR' : isMod ? 'MODERATOR' : 'USER',
                };
                
                return (
                  <div key={user.id} className="bg-[#2b2d31] p-3 rounded flex items-center justify-between">
                    <ProfilePopover user={userForCard} side="right" align="center">
                      <div className="flex items-center gap-3 cursor-pointer hover:bg-[#35373c] p-1.5 rounded transition-colors flex-1 min-w-0">
                        <img 
                          src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                          alt="avatar" 
                          className="w-10 h-10 rounded-full bg-[#1e1f22] object-cover flex-shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="text-white font-medium flex items-center gap-1.5 truncate">
                            <span className="truncate">{user.first_name || 'Utente Sconosciuto'}</span>
                            {isAdmin && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help flex items-center"><Shield size={14} className="text-red-500 flex-shrink-0" /></div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                                  admin di discord canary 2
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {!isAdmin && isMod && (
                              <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                  <div className="cursor-help flex items-center"><Shield size={14} className="text-blue-400 flex-shrink-0" /></div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                                  moderatore ufficiale
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="text-[11px] text-[#b5bac1] truncate">
                            {(user as any).email || 'Email non disponibile'}
                          </div>
                          <div className="text-xs text-[#949ba4] mt-0.5">
                            {activeTab === 'dc' ? `${user.digitalcardus ?? 0} DC` : `Ruolo: ${isAdmin ? 'admin' : userRole}`}
                          </div>
                        </div>
                      </div>
                    </ProfilePopover>

                    <div className="flex-shrink-0 ml-4">
                      {activeTab === 'dc' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Importo"
                            value={amounts[user.id] || ''}
                            onChange={(e) => setAmounts(prev => ({ ...prev, [user.id]: e.target.value }))}
                            className="w-20 bg-[#1e1f22] text-white rounded p-1.5 text-sm focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateDC(user.id, user.digitalcardus ?? 0, true)}
                            className="p-1.5 bg-[#23a559] text-white rounded hover:bg-[#1a7c43] transition-colors"
                            title="Aggiungi"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleUpdateDC(user.id, user.digitalcardus ?? 0, false)}
                            className="p-1.5 bg-[#da373c] text-white rounded hover:bg-[#a12828] transition-colors"
                            title="Rimuovi"
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleMod(user.id, userRole)}
                          disabled={isAdmin}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            isAdmin 
                              ? 'bg-[#1e1f22] text-[#949ba4] cursor-not-allowed'
                              : userRole === 'moderator' 
                                ? 'bg-[#da373c] text-white hover:bg-[#a12828]' 
                                : 'bg-[#5865f2] text-white hover:bg-[#4752c4]'
                          }`}
                        >
                          {isAdmin ? 'Admin' : userRole === 'moderator' ? 'Rimuovi Mod' : 'Rendi Mod'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};