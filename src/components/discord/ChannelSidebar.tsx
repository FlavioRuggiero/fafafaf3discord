"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Hash, Volume2, ChevronDown, Mic, Headphones, Settings, LogOut, Plus, Trash2 } from "lucide-react";
import { Channel, Server, User } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface ChannelSidebarProps {
  activeServer: Server;
  channels: Channel[];
  activeChannelId: string;
  onChannelSelect: (channel: Channel) => void;
  currentUser: User;
  onOpenSettings?: () => void;
  onLeaveServer?: () => void;
  onOpenUserSettings?: () => void;
}

export const ChannelSidebar = ({ activeServer, channels, activeChannelId, onChannelSelect, currentUser, onOpenSettings, onLeaveServer, onOpenUserSettings }: ChannelSidebarProps) => {
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  const [selectedCategory, setSelectedCategory] = useState<string>("Generale");
  
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Sottoscrizione realtime robusta
  useEffect(() => {
    if (!activeServer?.id) return;

    // Caricamento iniziale sicuro dal DB
    const loadChannels = async () => {
      const { data } = await supabase.from('channels').select('*').eq('server_id', activeServer.id);
      if (data) {
        setLocalChannels(data as Channel[]);
      }
    };
    loadChannels();

    const channelSub = supabase.channel(`sidebar-channels-${activeServer.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'channels',
        filter: `server_id=eq.${activeServer.id}`
      }, (payload) => {
        setLocalChannels(prev => {
          if (prev.some(c => c.id === payload.new.id)) return prev;
          return [...prev, payload.new as Channel];
        });
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'channels'
        // NESSUN FILTRO QUI: Supabase restituisce solo l'ID nelle delete
      }, (payload) => {
        setDeletedIds(prev => new Set(prev).add(payload.old.id));
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'channels',
        filter: `server_id=eq.${activeServer.id}`
      }, (payload) => {
        setLocalChannels(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [activeServer?.id]);

  // Unisce i canali locali in tempo reale con lo stato "unread" delle props
  const displayChannels = useMemo(() => {
    const merged = [...localChannels];
    
    // Aggiunge eventuali canali dalle props che non abbiamo in locale
    channels.forEach(pc => {
      if (pc.server_id === activeServer?.id && !merged.some(lc => lc.id === pc.id)) {
        merged.push(pc);
      }
    });

    return merged.map(lc => {
      const parentChan = channels.find(pc => pc.id === lc.id);
      if (parentChan && parentChan.unread !== undefined) {
        return { ...lc, unread: parentChan.unread };
      }
      return lc;
    }).filter(c => !deletedIds.has(c.id));
  }, [localChannels, channels, activeServer?.id, deletedIds]);

  const serverChannels = displayChannels.filter(c => c.server_id === activeServer?.id);
  const categories = Array.from(new Set(serverChannels.map(c => c.category)));
  if (categories.length === 0 && activeServer) categories.push("Generale");
  
  const isOwner = activeServer?.created_by === currentUser?.id;

  const handleAddChannelClick = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setNewChannelName("");
    setNewChannelType('text');
    setIsAddingChannel(true);
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeServer) return;

    // Aggiornamento ottimistico
    const tempId = `temp-${Date.now()}`;
    const newChannel: Channel = {
      id: tempId,
      server_id: activeServer.id,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
      type: newChannelType,
      category: selectedCategory,
      created_at: new Date().toISOString()
    };
    
    setLocalChannels(prev => [...prev, newChannel]);
    setIsAddingChannel(false);
    setNewChannelName("");

    try {
      const { data, error } = await supabase.from('channels').insert({
        server_id: activeServer.id,
        name: newChannel.name,
        type: newChannel.type,
        category: newChannel.category
      }).select().single();

      if (error) {
        console.error("Errore creazione canale:", error);
        showError("Errore durante la creazione del canale.");
        setLocalChannels(prev => prev.filter(c => c.id !== tempId));
        return;
      }
      
      if (data) {
        setLocalChannels(prev => prev.map(c => c.id === tempId ? data as Channel : c));
        showSuccess(`Canale ${data.name} creato con successo!`);
      }
    } catch (error) {
      console.error("Errore aggiunta canale:", error);
    }
  };

  const confirmDeleteChannel = async () => {
    if (!channelToDelete) return;
    const id = channelToDelete.id;
    setIsDeleting(id);
    setChannelToDelete(null);

    // Se stiamo eliminando il canale che stiamo guardando, spostiamoci su un altro
    if (activeChannelId === id) {
      const fallback = displayChannels.find(c => c.id !== id && c.type === 'text') || displayChannels.find(c => c.id !== id);
      if (fallback) onChannelSelect(fallback);
    }

    // Aggiornamento ottimistico
    setDeletedIds(prev => new Set(prev).add(id));

    try {
      const { error } = await supabase.from('channels').delete().eq('id', id);
      if (error) {
        console.error("Errore eliminazione canale:", error);
        showError("Impossibile eliminare. Assicurati di aver eseguito lo script SQL 'fix_channels_rls.sql' su Supabase.");
        // Annulla aggiornamento ottimistico in caso di errore
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        showSuccess("Canale eliminato.");
      }
    } catch (error) {
      console.error("Errore eliminazione canale:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (!activeServer) return null;

  return (
    <div className="w-[240px] bg-[#2b2d31] flex flex-col flex-shrink-0 z-10 relative h-full">
      <div 
        className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm cursor-pointer hover:bg-[#35373c] transition-colors group"
      >
        <h1 className="font-semibold text-white truncate pr-2">{activeServer.name}</h1>
        <div className="flex items-center flex-shrink-0">
          {isOwner ? (
            onOpenSettings && (
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
                className="p-1 text-[#dbdee1] hover:text-white transition-opacity"
                title="Impostazioni Server"
              >
                <Settings size={16} />
              </button>
            )
          ) : (
            onLeaveServer && (
              <button 
                onClick={(e) => { e.stopPropagation(); onLeaveServer(); }}
                className="p-1 text-[#dbdee1] hover:text-[#f23f43] transition-colors"
                title="Esci dal Server"
              >
                <LogOut size={16} />
              </button>
            )
          )}
          <ChevronDown size={18} className="text-[#dbdee1] ml-1" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
        {categories.length === 0 ? (
          <div className="text-center text-[#949ba4] text-xs py-4 px-2">Nessun canale in questo server</div>
        ) : (
          categories.map((category, idx) => {
            const categoryChannels = serverChannels.filter(c => c.category === category);
            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-[#949ba4] hover:text-[#dbdee1] cursor-pointer mb-1 px-1 group/category">
                  <div className="flex items-center">
                    <ChevronDown size={12} className="mr-1" />
                    <span className="text-xs font-semibold uppercase tracking-wider">{category}</span>
                  </div>
                  {isOwner && (
                    <button 
                      onClick={(e) => handleAddChannelClick(category, e)}
                      className="p-1 opacity-0 group-hover/category:opacity-100 transition-opacity text-[#dbdee1] hover:text-white"
                      title="Crea Canale"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                
                <div className="space-y-[2px]">
                  {categoryChannels.map(channel => {
                    const isActive = channel.id === activeChannelId;
                    const Icon = channel.type === 'text' ? Hash : Volume2;
                    const isLastTextChannel = channel.type === 'text' && serverChannels.filter(c => c.type === 'text').length <= 1;
                    
                    return (
                      <div
                        key={channel.id}
                        onClick={() => onChannelSelect(channel)}
                        className={`flex items-center px-2 py-1.5 rounded cursor-pointer group ${
                          isActive 
                            ? 'bg-[#404249] text-white' 
                            : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                        } ${channel.unread && !isActive ? 'text-white font-medium' : ''} ${isDeleting === channel.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <Icon size={18} className="mr-1.5 opacity-70 flex-shrink-0" />
                        <span className="truncate flex-1">{channel.name}</span>
                        
                        <div className="flex items-center flex-shrink-0">
                          {channel.unread && !isActive && (
                            <div className="w-2 h-2 rounded-full bg-white mr-1" />
                          )}
                          {isOwner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isLastTextChannel) {
                                  showError("Il server deve avere almeno un canale testuale.");
                                } else {
                                  setChannelToDelete(channel);
                                }
                              }}
                              className={`ml-1 p-0.5 transition-all ${
                                isLastTextChannel 
                                  ? 'opacity-0 group-hover:opacity-30 cursor-not-allowed' 
                                  : 'opacity-0 group-hover:opacity-100 hover:text-[#f23f43]'
                              }`}
                              title={isLastTextChannel ? "Impossibile eliminare l'ultimo canale testuale" : "Elimina Canale"}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="h-[52px] bg-[#232428] flex items-center px-2 flex-shrink-0">
        <div className="flex items-center hover:bg-[#3f4147] p-1 -ml-1 rounded cursor-pointer flex-1 min-w-0 mr-1">
          <div className="relative">
            <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}`} alt="Avatar" className="w-8 h-8 rounded-full bg-[#1e1f22]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full border-[3px] border-[#232428] bg-[#23a559]" />
          </div>
          <div className="ml-2 flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate leading-tight">{currentUser?.name}</span>
            <span className="text-[11px] text-[#dbdee1] truncate leading-tight">Online</span>
          </div>
        </div>
        
        <div className="flex items-center text-[#dbdee1] flex-shrink-0">
          <button className="p-1.5 hover:bg-[#3f4147] rounded transition-colors"><Mic size={18} /></button>
          <button className="p-1.5 hover:bg-[#3f4147] rounded transition-colors"><Headphones size={18} /></button>
          {onOpenUserSettings && (
            <button onClick={onOpenUserSettings} className="p-1.5 hover:bg-[#3f4147] rounded transition-colors" title="Impostazioni Utente">
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Modale Creazione Canale Renderizzato tramite Portal */}
      {isAddingChannel && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setIsAddingChannel(false)}>
          <div className="bg-[#313338] rounded-md w-[440px] shadow-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1e1f22]">
              <h2 className="text-xl font-semibold text-white">Crea Canale</h2>
              <p className="text-sm text-[#b5bac1] mt-1">in {selectedCategory}</p>
            </div>
            
            <form onSubmit={handleAddChannel} className="flex flex-col flex-1">
              <div className="p-4 flex-1">
                <div className="mb-6">
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Tipo Canale</label>
                  <div className="space-y-2">
                    <label className={`flex items-center p-3 rounded cursor-pointer transition-colors ${newChannelType === 'text' ? 'bg-[#404249]' : 'bg-[#2b2d31] hover:bg-[#3f4147]'}`}>
                      <Hash className="text-[#949ba4] mr-3" size={24} />
                      <div className="flex-1">
                        <div className="text-white font-medium text-base">Testuale</div>
                        <div className="text-xs text-[#b5bac1]">Invia messaggi, immagini, GIF, emoji, opinioni e battute.</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newChannelType === 'text' ? 'border-[#5865f2]' : 'border-[#b5bac1]'}`}>
                        {newChannelType === 'text' && <div className="w-2.5 h-2.5 rounded-full bg-[#5865f2]"></div>}
                      </div>
                      <input type="radio" className="hidden" checked={newChannelType === 'text'} onChange={() => setNewChannelType('text')} />
                    </label>
                    <label className={`flex items-center p-3 rounded cursor-pointer transition-colors ${newChannelType === 'voice' ? 'bg-[#404249]' : 'bg-[#2b2d31] hover:bg-[#3f4147]'}`}>
                      <Volume2 className="text-[#949ba4] mr-3" size={24} />
                      <div className="flex-1">
                        <div className="text-white font-medium text-base">Vocale</div>
                        <div className="text-xs text-[#b5bac1]">Ritrovatevi qui con voce, video e condivisione schermo.</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newChannelType === 'voice' ? 'border-[#5865f2]' : 'border-[#b5bac1]'}`}>
                        {newChannelType === 'voice' && <div className="w-2.5 h-2.5 rounded-full bg-[#5865f2]"></div>}
                      </div>
                      <input type="radio" className="hidden" checked={newChannelType === 'voice'} onChange={() => setNewChannelType('voice')} />
                    </label>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Nome Canale</label>
                  <div className="relative flex items-center bg-[#1e1f22] rounded overflow-hidden p-1">
                    <div className="pl-2 pr-1 text-[#949ba4]">
                      {newChannelType === 'text' ? <Hash size={18} /> : <Volume2 size={18} />}
                    </div>
                    <input 
                      type="text" 
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="nuovo-canale"
                      className="w-full bg-transparent text-white p-2 pl-1 focus:outline-none placeholder-[#878a91]"
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center bg-[#2b2d31] p-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddingChannel(false)} 
                  className="text-white hover:underline text-sm px-6 py-2 mr-2"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={!newChannelName.trim()} 
                  className="bg-[#5865f2] text-white rounded text-sm px-6 py-2 hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Crea Canale
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modale Eliminazione Canale Renderizzato tramite Portal */}
      {channelToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setChannelToDelete(null)}>
          <div className="bg-[#313338] rounded-md w-[440px] shadow-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1e1f22]">
              <h2 className="text-xl font-bold text-white">Elimina Canale</h2>
            </div>
            
            <div className="p-4">
              <p className="text-[#dbdee1] text-[15px]">
                Sei sicuro di voler eliminare <strong>{channelToDelete.type === 'text' ? '#' : ''}{channelToDelete.name}</strong>? Questa azione non può essere annullata.
              </p>
            </div>

            <div className="flex justify-end items-center bg-[#2b2d31] p-4">
              <button 
                type="button" 
                onClick={() => setChannelToDelete(null)} 
                className="text-white hover:underline text-sm px-6 py-2 mr-2"
              >
                Annulla
              </button>
              <button 
                onClick={confirmDeleteChannel} 
                className="bg-[#da373c] text-white rounded text-sm px-6 py-2 hover:bg-[#a12828] transition-colors"
              >
                Elimina Canale
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};