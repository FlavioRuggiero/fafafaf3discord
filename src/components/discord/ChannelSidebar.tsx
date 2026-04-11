"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Hash, Volume2, ChevronDown, Settings, LogOut, Plus, Trash2, Gamepad2, Edit2, FolderPlus, PhoneOff, MicOff, Headphones } from "lucide-react";
import { Channel, Server, User, Profile, ServerMember } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useVoiceChannel } from "@/contexts/VoiceChannelProvider";
import { UserPanel } from "./UserPanel";
import { playSound } from "@/utils/sounds";

type ServerMemberWithProfile = ServerMember & { profiles: Profile | null };

interface ChannelSidebarProps {
  activeServer: Server | null;
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice' | 'minigame'>('text');
  const [selectedCategory, setSelectedCategory] = useState<string>("Generale");

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState("");

  const [dragItem, setDragItem] = useState<{ id: string, type: 'category' | 'channel', category?: string } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ id: string, type: 'category' | 'channel', position: 'top' | 'bottom' } | null>(null);

  const [members, setMembers] = useState<ServerMemberWithProfile[]>([]);
  
  const { 
    joinVoiceChannel, 
    leaveVoiceChannel, 
    activeVoiceChannelId,
    speakingStates
  } = useVoiceChannel();

  const previousVoiceMembersRef = useRef<ServerMemberWithProfile[]>([]);

  useEffect(() => {
    if (!activeVoiceChannelId) {
      previousVoiceMembersRef.current = [];
      return;
    }

    const currentVoiceMembers = members.filter(m => m.voice_channel_id === activeVoiceChannelId);
    const previousVoiceMemberIds = new Set(previousVoiceMembersRef.current.map(m => m.user_id));
    const currentVoiceMemberIds = new Set(currentVoiceMembers.map(m => m.user_id));

    // Find who joined
    currentVoiceMemberIds.forEach(id => {
      if (!previousVoiceMemberIds.has(id) && id !== currentUser.id) {
        playSound('/enter.mp3');
      }
    });

    // Find who left
    previousVoiceMemberIds.forEach(id => {
      if (!currentVoiceMemberIds.has(id) && id !== currentUser.id) {
        playSound('/exit.mp3');
      }
    });

    previousVoiceMembersRef.current = currentVoiceMembers;

  }, [members, activeVoiceChannelId, currentUser.id]);

  useEffect(() => {
    if (!activeServer?.id) return;
    const saved = localStorage.getItem(`collapsed-categories-${activeServer.id}`);
    if (saved) {
      try {
        setCollapsedCategories(new Set(JSON.parse(saved)));
      } catch (e) {
        setCollapsedCategories(new Set());
      }
    } else {
      setCollapsedCategories(new Set());
    }
  }, [activeServer?.id]);

  useEffect(() => {
    if (!activeServer?.id) return;

    let isMounted = true;

    const loadChannels = async () => {
      const { data, error } = await supabase.from('channels').select('*').eq('server_id', activeServer.id);
      if (data && isMounted) {
        setLocalChannels(data as Channel[]);
        setDeletedIds(new Set());
      }
    };
    loadChannels();

    const channelSub = supabase.channel(`public:channels:server=${activeServer.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'channels',
        filter: `server_id=eq.${activeServer.id}`
      }, (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT') {
          setLocalChannels(prev => {
            if (prev.some(c => c.id === payload.new.id)) return prev;
            return [...prev, payload.new as Channel];
          });
        } 
        else if (payload.eventType === 'DELETE') {
          setDeletedIds(prev => new Set(prev).add(payload.old.id));
          setLocalChannels(prev => prev.filter(c => c.id !== payload.old.id));
        } 
        else if (payload.eventType === 'UPDATE') {
          setLocalChannels(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channelSub);
    };
  }, [activeServer?.id]);

  // Gestione Membri Server per Chat Vocali: ottimizzato per aggiornamenti istantanei DB
  useEffect(() => {
    if (!activeServer?.id) return;

    let isMounted = true;

    const fetchInitialMembers = async () => {
      const { data: membersData, error: membersError } = await supabase
        .from('server_members')
        .select('*')
        .eq('server_id', activeServer.id);
      
      if (membersError || !membersData) {
        console.error("Error fetching server members:", membersError);
        if (isMounted) setMembers([]);
        return;
      }
      
      if (membersData.length === 0) {
        if (isMounted) setMembers([]);
        return;
      }

      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const combinedData = membersData.map(m => ({
        ...m,
        profiles: profilesData?.find(p => p.id === m.user_id) || null
      }));

      if (isMounted) {
        setMembers(combinedData as ServerMemberWithProfile[]);
      }
    };

    fetchInitialMembers();

    const memberSub = supabase.channel(`realtime:server_members:${activeServer.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'server_members',
        filter: `server_id=eq.${activeServer.id}`
      }, async (payload) => {
        if (!isMounted) return;

        if (payload.eventType === 'UPDATE') {
          const updatedMember = payload.new as ServerMember;
          // Usa lo spread state sicuro: {...m, ...updatedMember}
          // In questo modo preserviamo i "profiles" ed evitiamo che la lista sparisca!
          setMembers(prev => prev.map(m => m.user_id === updatedMember.user_id ? { ...m, ...updatedMember } : m));
        } else if (payload.eventType === 'INSERT') {
          const newMember = payload.new as ServerMember;
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMember.user_id)
            .single();
          if (isMounted) {
            setMembers(prev => {
              if (prev.some(m => m.user_id === newMember.user_id)) return prev;
              return [...prev, { ...newMember, profiles: profileData || null }];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedMember = payload.old as { user_id: string };
          setMembers(prev => prev.filter(m => m.user_id !== deletedMember.user_id));
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(memberSub);
    };
  }, [activeServer?.id]);

  const displayChannels = useMemo(() => {
    const merged = [...localChannels];
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
    }).filter(c => !deletedIds.has(c.id)).sort((a, b) => {
      const catA = a.category_position || 0;
      const catB = b.category_position || 0;
      if (catA !== catB) return catA - catB;
      return (a.position || 0) - (b.position || 0);
    });
  }, [localChannels, channels, activeServer?.id, deletedIds]);

  const handleAddChannelClick = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setNewChannelName("");
    setNewChannelType('text');
    setIsAddingChannel(true);
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    setSelectedCategory(newCategoryName.trim());
    setNewChannelName("");
    setNewChannelType('text');
    setIsAddingCategory(false);
    setIsAddingChannel(true);
  };

  const handleRenameCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryName.trim() || !categoryToRename || !activeServer) return;

    const newName = editCategoryName.trim();
    if (newName === categoryToRename) {
      setCategoryToRename(null);
      return;
    }

    setLocalChannels(prev => prev.map(c => c.category === categoryToRename ? { ...c, category: newName } : c));
    
    if (collapsedCategories.has(categoryToRename)) {
      setCollapsedCategories(prev => {
        const next = new Set(prev);
        next.delete(categoryToRename);
        next.add(newName);
        localStorage.setItem(`collapsed-categories-${activeServer.id}`, JSON.stringify(Array.from(next)));
        return next;
      });
    }

    const oldName = categoryToRename;
    setCategoryToRename(null);

    try {
      const { error } = await supabase.from('channels')
        .update({ category: newName })
        .eq('server_id', activeServer.id)
        .eq('category', oldName);
      
      if (error) {
        showError("Errore durante la rinomina della categoria.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeServer) return;

    const maxPos = localChannels
      .filter(c => c.category === selectedCategory)
      .reduce((max, c) => Math.max(max, c.position || 0), -1);
      
    const catPos = localChannels
      .find(c => c.category === selectedCategory)?.category_position || 0;

    const tempId = `temp-${Date.now()}`;
    const newChannel: Channel = {
      id: tempId,
      server_id: activeServer.id,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
      type: newChannelType,
      category: selectedCategory,
      position: maxPos + 1,
      category_position: catPos,
      created_at: new Date().toISOString()
    };
    
    setLocalChannels(prev => [...prev, newChannel]);
    setIsAddingChannel(false);
    setNewChannelName("");
    
    if (collapsedCategories.has(selectedCategory)) {
      toggleCategory(selectedCategory);
    }

    try {
      const { data, error } = await supabase.from('channels').insert({
        server_id: activeServer.id,
        name: newChannel.name,
        type: newChannel.type,
        category: newChannel.category,
        position: newChannel.position,
        category_position: newChannel.category_position
      }).select().single();

      if (error) {
        showError("Errore durante la creazione del canale. Hai eseguito il file SQL?");
        setLocalChannels(prev => prev.filter(c => c.id !== tempId));
        return;
      }
      
      if (data) {
        setLocalChannels(prev => prev.map(c => c.id === tempId ? data as Channel : c));
        showSuccess(`Canale ${data.name} creato con successo!`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const confirmDeleteChannel = async () => {
    if (!channelToDelete || !activeServer) return;
    const id = channelToDelete.id;
    setIsDeleting(id);
    setChannelToDelete(null);

    if (activeChannelId === id) {
      const fallback = displayChannels.find(c => c.id !== id && c.type === 'text') || displayChannels.find(c => c.id !== id);
      if (fallback) onChannelSelect(fallback);
    }

    setDeletedIds(prev => new Set(prev).add(id));
    setLocalChannels(prev => prev.filter(c => c.id !== id));

    try {
      const { error } = await supabase.from('channels').delete().eq('id', id);
      if (error) {
        showError("Impossibile eliminare.");
        setDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChannelName.trim() || !channelToEdit) return;

    const newName = editChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (newName === channelToEdit.name) {
      setChannelToEdit(null);
      return;
    }

    setLocalChannels(prev => prev.map(c => c.id === channelToEdit.id ? { ...c, name: newName } : c));
    const channelId = channelToEdit.id;
    setChannelToEdit(null);

    try {
      const { error } = await supabase.from('channels').update({ name: newName }).eq('id', channelId);
      if (error) showError("Errore durante la modifica del nome.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleVoiceChannelSelect = (channel: Channel) => {
    if (!currentUser || !activeServer) return;

    if (activeVoiceChannelId !== channel.id) {
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.user_id === currentUser.id 
            ? { ...member, voice_channel_id: channel.id } 
            : member
        )
      );
      joinVoiceChannel(channel.id, activeServer.id);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'category' | 'channel', category?: string) => {
    e.stopPropagation();
    if (!activeServer || activeServer.created_by !== currentUser?.id) {
      e.preventDefault();
      return;
    }
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDragItem({ id, type, category });
  };

  const handleDragOver = (e: React.DragEvent, id: string, type: 'category' | 'channel') => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!dragItem) return;
    if (dragItem.type === 'category' && type === 'channel') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    if (dragOverInfo?.id !== id || dragOverInfo?.position !== position) {
      setDragOverInfo({ id, type, position });
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, targetType: 'category' | 'channel', targetCategoryStr?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const source = dragItem;
    const target = dragOverInfo;
    setDragItem(null);
    setDragOverInfo(null);
    if (!source || !target || !activeServer) return;
    if (source.id === target.id && source.type === target.type) return; 
    const channelsCopy = localChannels.map(c => ({...c}));
    if (source.type === 'category' && target.type === 'category') {
      const cats = Array.from(new Set(displayChannels.map(c => c.category)));
      const sIdx = cats.indexOf(source.id);
      const tIdx = cats.indexOf(target.id);
      if (sIdx === -1 || tIdx === -1) return;
      cats.splice(sIdx, 1);
      const insertIdx = target.position === 'top' ? tIdx : tIdx + 1;
      cats.splice(insertIdx > sIdx ? insertIdx - 1 : insertIdx, 0, source.id);
      const updates: {id: string, category_position: number}[] = [];
      cats.forEach((cat, idx) => {
        channelsCopy.forEach(c => {
          if (c.category === cat) {
            c.category_position = idx;
            updates.push({ id: c.id, category_position: idx });
          }
        });
      });
      setLocalChannels(channelsCopy);
      try {
        await Promise.all(updates.map(u => supabase.from('channels').update({ category_position: u.category_position }).eq('id', u.id)));
      } catch(err) {
        showError("Errore durante il salvataggio della posizione.");
      }
    } 
    else if (source.type === 'channel') {
      const tCat = targetType === 'category' ? target.id : targetCategoryStr!;
      const sourceChannel = channelsCopy.find(c => c.id === source.id);
      if (!sourceChannel) return;
      const catChannels = channelsCopy
        .filter(c => c.category === tCat && c.id !== source.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      let iIdx = catChannels.length;
      if (targetType === 'channel') {
        const cIdx = catChannels.findIndex(c => c.id === target.id);
        if (cIdx !== -1) {
           iIdx = target.position === 'top' ? cIdx : cIdx + 1;
        }
      }
      catChannels.splice(iIdx, 0, sourceChannel);
      const targetCatPos = channelsCopy.find(c => c.category === tCat)?.category_position || 0;
      const updates: {id: string, position: number, category: string, category_position: number}[] = [];
      catChannels.forEach((c, idx) => {
        c.position = idx;
        c.category = tCat;
        c.category_position = targetCatPos;
        updates.push({ id: c.id, position: idx, category: tCat, category_position: targetCatPos });
      });
      setLocalChannels(channelsCopy);
      try {
        await Promise.all(updates.map(u => 
          supabase.from('channels').update({ 
            position: u.position, 
            category: u.category, 
            category_position: u.category_position 
          }).eq('id', u.id)
        ));
      } catch(err) {
        showError("Errore durante il salvataggio della posizione.");
      }
    }
  };

  const getDropIndicator = (id: string, type: 'category' | 'channel') => {
    if (dragOverInfo?.id === id && dragOverInfo?.type === type) {
      return dragOverInfo.position === 'top' 
        ? 'shadow-[0_-2px_0_#5865F2] z-20' 
        : 'shadow-[0_2px_0_#5865F2] z-20';
    }
    return '';
  };

  if (!activeServer) {
    return (
      <div className="w-[240px] bg-[#2b2d31] flex flex-col flex-shrink-0 z-10 relative h-full">
        <div className="flex-1" />
        <UserPanel currentUser={currentUser} onOpenUserSettings={onOpenUserSettings} />
      </div>
    );
  }

  const serverChannels = displayChannels.filter(c => c.server_id === activeServer.id);
  const categories = Array.from(new Set(serverChannels.map(c => c.category)));
  if (categories.length === 0) categories.push("Generale");
  const isOwner = activeServer.created_by === currentUser?.id;

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      localStorage.setItem(`collapsed-categories-${activeServer.id}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <div className="w-[240px] bg-[#2b2d31] flex flex-col flex-shrink-0 z-10 relative h-full">
      <div 
        className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm cursor-pointer hover:bg-[#35373c] transition-colors group"
      >
        <h1 className="font-semibold text-white truncate pr-2">{activeServer.name}</h1>
        <div className="flex items-center flex-shrink-0">
          {isOwner ? (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsAddingCategory(true); setNewCategoryName(""); }}
                className="p-1 text-[#dbdee1] hover:text-white transition-opacity"
                title="Crea Categoria"
              >
                <FolderPlus size={16} />
              </button>
              {onOpenSettings && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
                  className="p-1 text-[#dbdee1] hover:text-white transition-opacity ml-1"
                  title="Impostazioni Server"
                >
                  <Settings size={16} />
                </button>
              )}
            </>
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
          categories.map((category) => {
            const categoryChannels = serverChannels.filter(c => c.category === category);
            const isCollapsed = collapsedCategories.has(category);
            
            return (
              <div 
                key={category}
                draggable={isOwner}
                onDragStart={(e) => handleDragStart(e, category, 'category')}
                onDragOver={(e) => handleDragOver(e, category, 'category')}
                onDrop={(e) => handleDrop(e, category, 'category')}
                onDragEnd={(e) => { e.stopPropagation(); setDragItem(null); setDragOverInfo(null); }}
                className={`relative ${getDropIndicator(category, 'category')} ${dragItem?.id === category ? 'opacity-40' : ''}`}
              >
                <div 
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between text-[#949ba4] hover:text-[#dbdee1] cursor-pointer mb-1 px-1 group/category"
                >
                  <div className="flex items-center min-w-0">
                    <ChevronDown size={12} className={`mr-1 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider truncate">{category}</span>
                  </div>
                  {isOwner && (
                    <div className="opacity-0 group-hover/category:opacity-100 flex items-center flex-shrink-0 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCategoryToRename(category); setEditCategoryName(category); }}
                        className="p-1 text-[#dbdee1] hover:text-white"
                        title="Rinomina Categoria"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleAddChannelClick(category, e)}
                        className="p-1 text-[#dbdee1] hover:text-white"
                        title="Crea Canale"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
                
                {!isCollapsed && (
                  <div className="space-y-[2px] pb-2">
                    {categoryChannels.map(channel => {
                      const isActive = (channel.type === 'voice' ? channel.id === activeVoiceChannelId : channel.id === activeChannelId);
                      const Icon = channel.type === 'text' ? Hash : channel.type === 'voice' ? Volume2 : Gamepad2;
                      const isLastTextChannel = channel.type === 'text' && serverChannels.filter(c => c.type === 'text').length <= 1;
                      
                      const isVoiceChannel = channel.type === 'voice';
                      const connectedMembers = isVoiceChannel 
                        ? members.filter(m => m.voice_channel_id === channel.id)
                        : [];

                      return (
                        <div
                          key={channel.id}
                          draggable={isOwner}
                          onDragStart={(e) => handleDragStart(e, channel.id, 'channel', category)}
                          onDragOver={(e) => handleDragOver(e, channel.id, 'channel')}
                          onDrop={(e) => handleDrop(e, channel.id, 'channel', category)}
                          onDragEnd={(e) => { e.stopPropagation(); setDragItem(null); setDragOverInfo(null); }}
                          className={`relative ${getDropIndicator(channel.id, 'channel')} ${dragItem?.id === channel.id ? 'opacity-40' : ''}`}
                        >
                          <div
                            onClick={() => {
                              if (channel.type === 'text' || channel.type === 'minigame') {
                                onChannelSelect(channel);
                              } else if (channel.type === 'voice') {
                                handleVoiceChannelSelect(channel);
                              }
                            }}
                            className={`relative flex items-center px-2 py-1.5 rounded cursor-pointer group ${
                              isActive 
                                ? 'bg-[#404249] text-white' 
                                : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                            } ${channel.unread && !isActive && channel.type !== 'voice' ? 'text-white font-medium' : ''} ${isDeleting === channel.id ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <Icon size={18} className={`mr-1.5 flex-shrink-0 ${isVoiceChannel && connectedMembers.length > 0 ? 'text-[#23a559]' : 'opacity-70'}`} />
                            <span className="truncate flex-1">{channel.name}</span>
                            
                            <div className="flex items-center flex-shrink-0">
                              {channel.unread && !isActive && channel.type !== 'voice' && (
                                <div className="w-2 h-2 rounded-full bg-white mr-1" />
                              )}
                              {isOwner && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setChannelToEdit(channel);
                                      setEditChannelName(channel.name);
                                    }}
                                    className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:text-white transition-all"
                                    title="Rinomina Canale"
                                  >
                                    <Edit2 size={14} />
                                  </button>
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
                                </>
                              )}
                            </div>
                          </div>
                          
                          {isVoiceChannel && connectedMembers.length > 0 && (
                            <div className="pl-7 pr-2 pt-1 pb-0.5 space-y-1.5">
                              {connectedMembers.map(member => {
                                const memberIsMuted = member.is_muted ?? false;
                                const memberIsDeafened = member.is_deafened ?? false;
                                const isSpeaking = speakingStates[member.user_id] ?? false;

                                return (
                                  <div key={member.user_id} className="flex items-center group/member animate-in fade-in-0 zoom-in-95 duration-300">
                                    <div className={`relative rounded-full transition-all duration-100 ${isSpeaking ? 'ring-2 ring-yellow-500' : 'ring-2 ring-transparent'}`}>
                                      <img src={member.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} alt="Avatar" className="w-6 h-6 rounded-full bg-[#1e1f22] object-cover" />
                                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#2b2d31] bg-[#23a559]" />
                                    </div>
                                    <span className="ml-2 text-sm text-[#949ba4] group-hover/member:text-[#dbdee1] truncate flex-1">{member.profiles?.first_name || 'Utente'}</span>
                                    <div className="ml-auto flex items-center space-x-1 text-[#b5bac1]">
                                      {memberIsDeafened && <Headphones size={14} className="text-[#f23f43]"/>}
                                      {memberIsMuted && !memberIsDeafened && <MicOff size={14} className="text-[#f23f43]"/>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {activeVoiceChannelId && (
        <div className="px-2 py-2.5 bg-[#232428] border-t border-[#35363c] flex-shrink-0">
          <div className="text-xs font-bold text-[#23a559] mb-2 flex items-center">
            <Volume2 size={16} className="mr-1.5" />
            Connesso
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white truncate pr-2">
              {localChannels.find(c => c.id === activeVoiceChannelId)?.name}
            </span>
            <button 
              onClick={() => {
                setMembers(prevMembers => 
                  prevMembers.map(member => 
                    member.user_id === currentUser.id 
                      ? { ...member, voice_channel_id: null } 
                      : member
                  )
                );
                leaveVoiceChannel();
              }}
              className="p-1.5 text-[#dbdee1] hover:text-[#f23f43] hover:bg-[#f23f43]/20 rounded transition-colors"
              title="Disconnetti"
            >
              <PhoneOff size={18} />
            </button>
          </div>
        </div>
      )}

      <UserPanel currentUser={currentUser} onOpenUserSettings={onOpenUserSettings} />

      {isAddingCategory && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setIsAddingCategory(false)}>
          <div className="bg-[#313338] rounded-md w-[440px] shadow-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1e1f22]">
              <h2 className="text-xl font-bold text-white">Crea Categoria</h2>
              <p className="text-sm text-[#b5bac1] mt-1">Le categorie ti aiutano a organizzare i canali.</p>
            </div>
            
            <form onSubmit={handleCreateCategorySubmit} className="flex flex-col">
              <div className="p-4">
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Nome Categoria</label>
                <div className="relative flex items-center bg-[#1e1f22] rounded overflow-hidden p-1">
                  <input 
                    type="text" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="NUOVA CATEGORIA"
                    className="w-full bg-transparent text-white p-2 focus:outline-none placeholder-[#878a91] uppercase"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end items-center bg-[#2b2d31] p-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddingCategory(false)} 
                  className="text-white hover:underline text-sm px-6 py-2 mr-2"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={!newCategoryName.trim()} 
                  className="bg-[#5865f2] text-white rounded text-sm px-6 py-2 hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Avanti
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {categoryToRename && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setCategoryToRename(null)}>
          <div className="bg-[#313338] rounded-md w-[440px] shadow-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1e1f22]">
              <h2 className="text-xl font-bold text-white">Rinomina Categoria</h2>
              <p className="text-sm text-[#b5bac1] mt-1">Stai modificando il nome della categoria.</p>
            </div>
            
            <form onSubmit={handleRenameCategorySubmit} className="flex flex-col">
              <div className="p-4">
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Nuovo Nome Categoria</label>
                <div className="relative flex items-center bg-[#1e1f22] rounded overflow-hidden p-1">
                  <input 
                    type="text" 
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    className="w-full bg-transparent text-white p-2 focus:outline-none placeholder-[#878a91] uppercase"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end items-center bg-[#2b2d31] p-4">
                <button 
                  type="button" 
                  onClick={() => setCategoryToRename(null)} 
                  className="text-white hover:underline text-sm px-6 py-2 mr-2"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={!editCategoryName.trim() || editCategoryName === categoryToRename} 
                  className="bg-[#5865f2] text-white rounded text-sm px-6 py-2 hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
                    <label className={`flex items-center p-3 rounded cursor-pointer transition-colors ${newChannelType === 'minigame' ? 'bg-[#404249]' : 'bg-[#2b2d31] hover:bg-[#3f4147]'}`}>
                      <Gamepad2 className="text-[#949ba4] mr-3" size={24} />
                      <div className="flex-1">
                        <div className="text-white font-medium text-base">Minigiochi</div>
                        <div className="text-xs text-[#b5bac1]">Area dedicata per avviare minigiochi e tornei nel server.</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${newChannelType === 'minigame' ? 'border-[#5865f2]' : 'border-[#b5bac1]'}`}>
                        {newChannelType === 'minigame' && <div className="w-2.5 h-2.5 rounded-full bg-[#5865f2]"></div>}
                      </div>
                      <input type="radio" className="hidden" checked={newChannelType === 'minigame'} onChange={() => setNewChannelType('minigame')} />
                    </label>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Nome Canale</label>
                  <div className="relative flex items-center bg-[#1e1f22] rounded overflow-hidden p-1">
                    <div className="pl-2 pr-1 text-[#949ba4]">
                      {newChannelType === 'text' ? <Hash size={18} /> : newChannelType === 'voice' ? <Volume2 size={18} /> : <Gamepad2 size={18} />}
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

      {channelToEdit && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setChannelToEdit(null)}>
          <div className="bg-[#313338] rounded-md w-[440px] shadow-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1e1f22]">
              <h2 className="text-xl font-bold text-white">Rinomina Canale</h2>
              <p className="text-sm text-[#b5bac1] mt-1">Stai modificando il nome del canale.</p>
            </div>
            
            <form onSubmit={handleEditChannelSubmit} className="flex flex-col">
              <div className="p-4">
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Nuovo Nome Canale</label>
                <div className="relative flex items-center bg-[#1e1f22] rounded overflow-hidden p-1">
                  <div className="pl-2 pr-1 text-[#949ba4]">
                    {channelToEdit.type === 'text' ? <Hash size={18} /> : channelToEdit.type === 'voice' ? <Volume2 size={18} /> : <Gamepad2 size={18} />}
                  </div>
                  <input 
                    type="text" 
                    value={editChannelName}
                    onChange={(e) => setEditChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="w-full bg-transparent text-white p-2 pl-1 focus:outline-none placeholder-[#878a91]"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end items-center bg-[#2b2d31] p-4">
                <button 
                  type="button" 
                  onClick={() => setChannelToEdit(null)} 
                  className="text-white hover:underline text-sm px-6 py-2 mr-2"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={!editChannelName.trim() || editChannelName === channelToEdit.name} 
                  className="bg-[#5865f2] text-white rounded text-sm px-6 py-2 hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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