"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Hash, Volume2, ChevronDown, Settings, LogOut, Plus, Trash2, Gamepad2, Edit2, FolderPlus, PhoneOff, MicOff, Headphones, Users, Search, X, Home, Shield, Lock, Clock, MessageSquare, Archive, Bell, Image as ImageIcon, Award } from "lucide-react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { Channel, Server, User, Profile, ServerMember, ServerPermissions } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useVoiceChannel } from "@/contexts/VoiceChannelProvider";
import { useAuth } from "@/contexts/AuthContext";
import { UserPanel } from "./UserPanel";
import { playSound } from "@/utils/sounds";
import { ProfilePopover } from "./ProfilePopover";
import { AdminPanel } from "./AdminPanel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar } from "./Avatar";
import { ServerNotificationsModal } from "./ServerNotificationsModal";
import { JumpscareOverlay } from "./JumpscareOverlay";

type ServerMemberWithProfile = ServerMember & { profiles: Profile | null };

interface ChannelSidebarProps {
  activeServer: Server | null;
  channels: Channel[];
  dmChannels?: Channel[];
  activeChannelId: string;
  onChannelSelect: (channel: Channel) => void;
  currentUser: User;
  onOpenSettings?: () => void;
  onLeaveServer?: () => void;
  onOpenUserSettings?: () => void;
  serverPermissions?: ServerPermissions;
  notificationCount?: number;
}

export const ChannelSidebar = ({ activeServer, channels, dmChannels = [], activeChannelId, onChannelSelect, currentUser, onOpenSettings, onLeaveServer, onOpenUserSettings, serverPermissions, notificationCount = 0 }: ChannelSidebarProps) => {
  const { user: authUser, adminId, moderatorIds } = useAuth();
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice' | 'minigame'>('text');
  const [newMinigameUrl, setNewMinigameUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Generale");

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState("");

  const [channelToSettings, setChannelToSettings] = useState<Channel | null>(null);
  const [settingsCooldown, setSettingsCooldown] = useState(0);
  const [settingsIsLocked, setSettingsIsLocked] = useState(false);
  const [settingsIsWelcome, setSettingsIsWelcome] = useState(false);
  const [settingsMinigameUrl, setSettingsMinigameUrl] = useState("");
  const [settingsMinigameIcon, setSettingsMinigameIcon] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const [dragItem, setDragItem] = useState<{ id: string, type: 'category' | 'channel', category?: string } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ id: string, type: 'category' | 'channel', position: 'top' | 'bottom' } | null>(null);

  const [members, setMembers] = useState<ServerMemberWithProfile[]>([]);
  
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const { 
    joinVoiceChannel, 
    leaveVoiceChannel, 
    activeVoiceChannelId,
    speakingStates,
    userVolumes,
    setUserVolume
  } = useVoiceChannel();

  const activeChannelIdRef = useRef(activeChannelId);
  useEffect(() => { activeChannelIdRef.current = activeChannelId; }, [activeChannelId]);

  const activeVoiceChannelIdRef = useRef(activeVoiceChannelId);
  useEffect(() => { activeVoiceChannelIdRef.current = activeVoiceChannelId; }, [activeVoiceChannelId]);

  // --- GLOBAL VOICE CHANNEL STATE ---
  const [activeVoiceChannelName, setActiveVoiceChannelName] = useState<string>("");
  const [vcMembers, setVcMembers] = useState<{id: string, audio: string | null}[]>([]);
  const prevVcMembersRef = useRef<{id: string, audio: string | null}[]>([]);
  const isInitialVcLoad = useRef(true);

  useEffect(() => {
    if (!activeVoiceChannelId) {
      setActiveVoiceChannelName("");
      setVcMembers([]);
      prevVcMembersRef.current = [];
      isInitialVcLoad.current = true;
      return;
    }

    let isMounted = true;

    // Fetch channel name
    supabase.from('channels').select('name').eq('id', activeVoiceChannelId).single().then(({data}) => {
      if (isMounted && data) setActiveVoiceChannelName(data.name);
    });

    // Fetch VC members for sounds
    const fetchVcMembers = async () => {
      const { data } = await supabase
        .from('server_members')
        .select('user_id')
        .eq('voice_channel_id', activeVoiceChannelId);
      
      if (isMounted && data) {
        const userIds = data.map(d => d.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, entrance_audio_url')
            .in('id', userIds);
            
          const membersWithAudio = data.map(d => ({
            id: d.user_id,
            audio: profiles?.find(p => p.id === d.user_id)?.entrance_audio_url || null
          }));
          setVcMembers(membersWithAudio);
        } else {
          setVcMembers([]);
        }
      }
    };

    fetchVcMembers();

    const sub = supabase.channel(`vc_global_${activeVoiceChannelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'server_members'
      }, (payload) => {
        if (!isMounted) return;
        const oldVc = (payload.old as any)?.voice_channel_id;
        const newVc = (payload.new as any)?.voice_channel_id;
        
        if (oldVc === activeVoiceChannelId || newVc === activeVoiceChannelId) {
          fetchVcMembers();
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(sub);
    };
  }, [activeVoiceChannelId]);

  useEffect(() => {
    if (!activeVoiceChannelId || !currentUser) return;

    if (isInitialVcLoad.current) {
      prevVcMembersRef.current = vcMembers;
      if (vcMembers.length > 0) {
        isInitialVcLoad.current = false;
      }
      return;
    }

    const currentIds = new Map(vcMembers.map(m => [m.id, m.audio]));
    const prevIds = new Map(prevVcMembersRef.current.map(m => [m.id, m.audio]));

    currentIds.forEach((audio, id) => {
      if (!prevIds.has(id) && id !== currentUser.id) {
        if (audio) playSound(audio);
        else playSound('/enter.mp3');
      }
    });

    prevIds.forEach((audio, id) => {
      if (!currentIds.has(id) && id !== currentUser.id) {
        playSound('/exit.mp3');
      }
    });

    prevVcMembersRef.current = vcMembers;
  }, [vcMembers, activeVoiceChannelId, currentUser]);
  // ----------------------------------

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
    if (!activeServer?.id) {
      setLocalChannels([]);
      return;
    }

    let isMounted = true;

    const loadChannels = async () => {
      const { data, error } = await supabase.from('channels').select('*').eq('server_id', activeServer.id);
      if (data && isMounted) {
        setLocalChannels(data as Channel[]);
      }
    };
    loadChannels();

    const channelSub = supabase.channel(`public:channels:server=${activeServer.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'channels',
        filter: `server_id=eq.${activeServer.id}`
      }, (payload) => {
        if (!isMounted) return;
        setLocalChannels(prev => {
          if (prev.some(c => c.id === payload.new.id)) return prev;
          return [...prev, payload.new as Channel];
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'channels',
        filter: `server_id=eq.${activeServer.id}`
      }, (payload) => {
        if (!isMounted) return;
        setLocalChannels(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'channels'
      }, (payload) => {
        if (!isMounted) return;
        const deletedChannelId = payload.old.id as string;
        
        if (activeVoiceChannelIdRef.current === deletedChannelId) {
          leaveVoiceChannel();
        }
        
        setLocalChannels(prev => {
          const remaining = prev.filter(c => c.id !== deletedChannelId);
          if (activeChannelIdRef.current === deletedChannelId) {
            const fallback = remaining.find(c => c.type === 'text') || remaining[0];
            if (fallback) {
              setTimeout(() => onChannelSelect(fallback), 0);
            }
          }
          return remaining;
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channelSub);
    };
  }, [activeServer?.id, leaveVoiceChannel, onChannelSelect]);

  useEffect(() => {
    if (!activeServer?.id) return;

    let isMounted = true;

    const fetchInitialMembers = async () => {
      const { data: membersData, error: membersError } = await supabase
        .from('server_members')
        .select('*')
        .eq('server_id', activeServer.id);
      
      if (membersError || !membersData) {
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

  useEffect(() => {
    const canManage = serverPermissions?.can_manage_server || serverPermissions?.can_manage_roles;
    if (!activeServer?.id || !canManage) return;
    
    let isMounted = true;
    const fetchRequests = async () => {
      const { count } = await supabase
        .from('server_join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('server_id', activeServer.id)
        .eq('status', 'pending');
      if (isMounted) setPendingRequestsCount(count || 0);
    };
    
    fetchRequests();

    const sub = supabase.channel(`requests-count-${activeServer.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_join_requests', filter: `server_id=eq.${activeServer.id}` }, fetchRequests)
      .subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(sub); 
    };
  }, [activeServer?.id, serverPermissions]);

  const displayChannels = useMemo(() => {
    return [...localChannels]
      .sort((a, b) => {
        const catA = a.category_position || 0;
        const catB = b.category_position || 0;
        if (catA !== catB) return catA - catB;
        return (a.position || 0) - (b.position || 0);
      });
  }, [localChannels]);

  const handleAddChannelClick = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategory(category);
    setNewChannelName("");
    setNewChannelType('text');
    setNewMinigameUrl("");
    setIsAddingChannel(true);
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    setSelectedCategory(newCategoryName.trim());
    setNewChannelName("");
    setNewChannelType('text');
    setNewMinigameUrl("");
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

    const originalChannels = [...localChannels];
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
        showError("Permesso negato: non puoi gestire i canali.");
        setLocalChannels(originalChannels);
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
      created_at: new Date().toISOString(),
      ...((newChannelType === 'minigame' ? { minigame_url: newMinigameUrl } : {}) as any)
    };
    
    setLocalChannels(prev => [...prev, newChannel]);
    setIsAddingChannel(false);
    setNewChannelName("");
    setNewMinigameUrl("");
    
    if (collapsedCategories.has(selectedCategory)) {
      toggleCategory(selectedCategory);
    }

    try {
      const insertData: any = {
        server_id: activeServer.id,
        name: newChannel.name,
        type: newChannel.type,
        category: newChannel.category,
        position: newChannel.position,
        category_position: newChannel.category_position
      };

      if (newChannel.type === 'minigame') {
        insertData.minigame_url = newMinigameUrl;
      }

      const { data, error } = await supabase.from('channels').insert(insertData).select().single();

      if (error) {
        showError("Permesso negato: non puoi gestire i canali.");
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
    const originalChannel = { ...channelToDelete };

    if (activeVoiceChannelId === id) {
      leaveVoiceChannel();
    }

    setIsDeleting(id);
    setChannelToDelete(null);

    if (activeChannelId === id) {
      const fallback = displayChannels.find(c => c.id !== id && c.type === 'text') || displayChannels.find(c => c.id !== id);
      if (fallback) onChannelSelect(fallback);
    }

    setLocalChannels(prev => prev.filter(c => c.id !== id));

    try {
      const { error } = await supabase.from('channels').delete().eq('id', id);
      if (error) {
        showError("Permesso negato: non puoi gestire i canali.");
        setLocalChannels(prev => [...prev, originalChannel]);
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

    const originalChannels = [...localChannels];
    setLocalChannels(prev => prev.map(c => c.id === channelToEdit.id ? { ...c, name: newName } : c));
    const channelId = channelToEdit.id;
    setChannelToEdit(null);

    try {
      const { error } = await supabase.from('channels').update({ name: newName }).eq('id', channelId);
      if (error) {
        showError("Permesso negato: non puoi gestire i canali.");
        setLocalChannels(originalChannels);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 100 * 1024) {
      showError("L'icona non può superare i 100KB.");
      return;
    }

    setIsUploadingIcon(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `minigame_icon_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `minigame_icons/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('icons').upload(filePath, file);
    
    if (uploadError) {
      showError("Errore durante il caricamento dell'icona.");
      setIsUploadingIcon(false);
      return;
    }

    const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
    setSettingsMinigameIcon(data.publicUrl);
    setIsUploadingIcon(false);
  };

  const handleSaveChannelSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelToSettings || !activeServer) return;

    const channelId = channelToSettings.id;
    const originalChannels = [...localChannels];
    
    // Aggiornamento ottimistico
    setLocalChannels(prev => prev.map(c => {
      if (c.id === channelId) {
        return { 
          ...c, 
          cooldown: settingsCooldown, 
          is_locked: settingsIsLocked, 
          is_welcome_channel: settingsIsWelcome,
          ...((channelToSettings.type === 'minigame' ? { minigame_url: settingsMinigameUrl, minigame_icon_url: settingsMinigameIcon } : {}) as any)
        };
      }
      if (settingsIsWelcome && c.server_id === activeServer.id && c.id !== channelId) {
        return { ...c, is_welcome_channel: false };
      }
      return c;
    }));

    setChannelToSettings(null);

    try {
      if (settingsIsWelcome) {
        await supabase.from('channels').update({ is_welcome_channel: false }).eq('server_id', activeServer.id);
      }
      
      const updateData: any = {
        cooldown: settingsCooldown,
        is_locked: settingsIsLocked,
        is_welcome_channel: settingsIsWelcome
      };

      if (channelToSettings.type === 'minigame') {
        updateData.minigame_url = settingsMinigameUrl;
        updateData.minigame_icon_url = settingsMinigameIcon;
      }

      const { error } = await supabase.from('channels').update(updateData).eq('id', channelId);

      if (error) {
        showError("Permesso negato: non puoi gestire i canali.");
        setLocalChannels(originalChannels);
      } else {
        showSuccess("Impostazioni canale salvate!");
      }
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
    if (!serverPermissions?.can_manage_channels) {
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
    
    const originalChannels = [...localChannels];
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
        const results = await Promise.all(updates.map(u => supabase.from('channels').update({ category_position: u.category_position }).eq('id', u.id)));
        if (results.some(r => r.error)) {
          showError("Permesso negato: non puoi gestire i canali.");
          setLocalChannels(originalChannels);
        }
      } catch(err) {
        showError("Errore durante il salvataggio della posizione.");
        setLocalChannels(originalChannels);
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
        const results = await Promise.all(updates.map(u => 
          supabase.from('channels').update({ 
            position: u.position, 
            category: u.category, 
            category_position: u.category_position 
          }).eq('id', u.id)
        ));
        if (results.some(r => r.error)) {
          showError("Permesso negato: non puoi gestire i canali.");
          setLocalChannels(originalChannels);
        }
      } catch(err) {
        showError("Errore durante il salvataggio della posizione.");
        setLocalChannels(originalChannels);
      }
    }
  };

  const handleDeleteDM = async (dmId: string, recipientId?: string) => {
    if (!currentUser || !recipientId) return;

    // Elimina il canale DM dal DB
    await supabase.from('dm_channels').delete().eq('id', dmId);

    // Elimina anche l'amicizia
    await supabase.from('friendships').delete()
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUser.id})`);
      
    showSuccess("Chat e amicizia rimosse.");
  };

  const getDropIndicator = (id: string, type: 'category' | 'channel') => {
    if (dragOverInfo?.id === id && dragOverInfo?.type === type) {
      return dragOverInfo.position === 'top' 
        ? 'shadow-[0_-2px_0_#5865F2] z-20' 
        : 'shadow-[0_2px_0_#5865F2] z-20';
    }
    return '';
  };

  const today = new Date().toISOString().split('T')[0];
  const canClaimReward = currentUser?.last_reward_date !== today;

  if (!activeServer) {
    return (
      <div className="w-[240px] bg-[#2b2d31] flex flex-col flex-shrink-0 z-10 relative h-full border-r border-[#1f2023]">
        <div className="h-12 flex items-center px-2 border-b border-[#1f2023] shadow-sm">
          <button className="w-full bg-[#1e1f22] text-[#949ba4] text-sm px-2 py-1.5 rounded text-left hover:bg-[#1e1f22]/80 transition-colors">
            Trova o inizia una conversazione
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2 flex flex-col">
          <button
            onClick={() => onChannelSelect({ id: 'home', name: 'Benvenuto', type: 'text', category: '', server_id: null })}
            className={`w-full flex items-center px-3 py-2 rounded cursor-pointer mb-2 transition-colors ${activeChannelId === 'home' ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
          >
            <Home size={20} className="mr-3" />
            <span className="font-medium">Benvenuto</span>
          </button>
          
          <button
            onClick={() => onChannelSelect({ id: 'friends', name: 'Amici', type: 'text', category: '', server_id: null })}
            className={`w-full flex items-center px-3 py-2 rounded cursor-pointer mb-2 transition-colors ${activeChannelId === 'friends' ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
          >
            <Users size={20} className="mr-3" />
            <span className="font-medium">Amici</span>
          </button>

          <button
            onClick={() => onChannelSelect({ id: 'notifications', name: 'Notifiche', type: 'text', category: '', server_id: null })}
            className={`w-full flex items-center px-3 py-2 rounded cursor-pointer mb-2 transition-colors ${activeChannelId === 'notifications' ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
          >
            <Bell size={20} className="mr-3" />
            <span className="font-medium flex-1 text-left">Notifiche</span>
            {notificationCount > 0 && activeChannelId !== 'notifications' && (
              <span className="bg-[#f23f43] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {notificationCount}
              </span>
            )}
          </button>
          
          <div className="h-[1px] bg-[#1e1f22] mx-2 my-2"></div>
          
          <button
            onClick={() => onChannelSelect({ id: 'shop', name: 'Cardi E-Shop', type: 'text', category: '', server_id: null })}
            className={`relative w-full flex items-center justify-between px-3 py-2 rounded cursor-pointer mb-2 transition-colors overflow-hidden group ${activeChannelId === 'shop' ? 'text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            {/* Sfondo base */}
            <div className={`absolute inset-0 transition-colors ${activeChannelId === 'shop' ? 'bg-[#404249]' : 'group-hover:bg-[#35373c]'}`}></div>
            
            {/* Sfumatura verde e foglie */}
            <div 
              className={`absolute inset-0 transition-opacity duration-300 ${activeChannelId === 'shop' ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}
              style={{
                backgroundImage: `linear-gradient(to left, rgba(35, 165, 89, 0.3), transparent), url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23166534' fill-opacity='0.15'%3E%3Cpath d='M40,20 C60,20 70,40 70,60 C50,60 40,40 40,20 Z' transform='rotate(15 55 40)'/%3E%3Cpath d='M140,30 Q160,10 170,40 Q150,60 140,30 Z' transform='rotate(-25 155 35)'/%3E%3Cpath d='M30,130 C40,110 60,120 70,140 C80,160 50,170 30,130 Z' transform='rotate(45 50 140)'/%3E%3Cpath d='M150,140 C170,140 180,160 180,180 C160,180 150,140 Z' transform='rotate(-60 165 160)'/%3E%3Cpath d='M90,90 Q100,80 110,95 Q95,105 90,90 Z' transform='rotate(10 100 92)'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: 'auto, 100px 100px'
              }}
            ></div>

            <div className="relative z-10 flex items-center">
              <img src="/digitalcardus.png" alt="dc" className="w-5 h-5 mr-3 object-contain drop-shadow-md" />
              <span className="font-medium">Cardi E-Shop</span>
            </div>
            {canClaimReward && (
              <div className="relative z-10 w-2 h-2 rounded-full bg-[#f23f43] shadow-[0_0_5px_#f23f43]" title="Premio giornaliero disponibile!" />
            )}
          </button>

          <button
            onClick={() => onChannelSelect({ id: 'inventory', name: 'Inventario', type: 'text', category: '', server_id: null })}
            className={`w-full flex items-center px-3 py-2 rounded cursor-pointer mb-2 transition-colors ${activeChannelId === 'inventory' ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
          >
            <Archive size={20} className="mr-3" />
            <span className="font-medium">Inventario</span>
          </button>

          <button
            onClick={() => onChannelSelect({ id: 'progression', name: 'Progressione', type: 'text', category: '', server_id: null })}
            className={`w-full flex items-center px-3 py-2 rounded cursor-pointer mb-2 transition-colors ${activeChannelId === 'progression' ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
          >
            <Award size={20} className="mr-3" />
            <span className="font-medium">Progressione</span>
          </button>

          <div className="h-[1px] bg-[#1e1f22] mx-2 my-2"></div>

          <button
            onClick={() => onChannelSelect({ id: 'daily-minigame', name: 'Minigioco Giornaliero', type: 'text', category: '', server_id: null })}
            className={`relative w-full flex items-center px-3 py-2 rounded cursor-pointer mb-2 transition-colors overflow-hidden group ${activeChannelId === 'daily-minigame' ? 'text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            {/* Sfondo base */}
            <div className={`absolute inset-0 transition-colors ${activeChannelId === 'daily-minigame' ? 'bg-[#404249]' : 'group-hover:bg-[#35373c]'}`}></div>
            
            {/* Sfumatura celeste da destra */}
            <div className={`absolute inset-0 bg-gradient-to-l from-[#0ea5e9]/20 to-transparent transition-opacity duration-300 ${activeChannelId === 'daily-minigame' ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}></div>
            
            {/* Bastoncini animati */}
            <div className="absolute inset-0 overflow-hidden rounded pointer-events-none">
              <div 
                className={`absolute -inset-[100%] transition-opacity duration-300 animate-[spin_30s_linear_infinite] ${activeChannelId === 'daily-minigame' ? 'opacity-60' : 'opacity-20 group-hover:opacity-50'}`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%230ea5e9' fill-opacity='0.6'%3E%3Crect x='10' y='10' width='3' height='20' rx='1.5' transform='rotate(45 12 20)' /%3E%3Crect x='50' y='40' width='3' height='25' rx='1.5' transform='rotate(-30 52 52)' /%3E%3Crect x='80' y='15' width='3' height='15' rx='1.5' transform='rotate(15 82 22)' /%3E%3Crect x='20' y='70' width='3' height='30' rx='1.5' transform='rotate(60 22 85)' /%3E%3Crect x='70' y='80' width='3' height='20' rx='1.5' transform='rotate(-45 72 90)' /%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '80px 80px'
                }}
              ></div>
            </div>

            <div className="relative z-10 flex items-center">
              <Gamepad2 size={20} className="mr-3 text-[#0ea5e9]" />
              <span className="font-medium">Minigioco Giornaliero</span>
            </div>
          </button>

          {dmChannels && dmChannels.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-xs font-bold text-[#949ba4] hover:text-[#dbdee1] cursor-pointer transition-colors">MESSAGGI DIRETTI</span>
                <Plus size={14} className="text-[#949ba4] hover:text-[#dbdee1] cursor-pointer" />
              </div>
              {dmChannels.map(dm => {
                const isActive = activeChannelId === dm.id;
                const isUnread = dm.unread && !isActive;
                return (
                  <button
                    key={dm.id}
                    onClick={() => onChannelSelect(dm)}
                    className={`w-full flex items-center px-3 py-2 rounded cursor-pointer mb-0.5 transition-colors group ${isActive ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
                  >
                    <div className="relative mr-3 flex-shrink-0">
                      <Avatar src={dm.recipient?.avatar || ''} decoration={dm.recipient?.avatar_decoration} className="w-8 h-8" />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] ${dm.recipient?.status === 'online' ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                    </div>
                    <span className={`font-medium truncate flex-1 text-left ${isUnread ? 'text-white' : ''}`}>{dm.name}</span>
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-white mx-2 flex-shrink-0" />
                    )}
                    <div 
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#f23f43] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDM(dm.id, dm.recipient?.id);
                      }}
                      title="Elimina Chat e Amicizia"
                    >
                      <X size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {currentUser?.id === adminId && (
            <div className="mt-auto pt-4">
              <button
                onClick={() => setShowAdminPanel(true)}
                className="w-full flex items-center px-3 py-2 rounded cursor-pointer text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors"
              >
                <Shield size={20} className="mr-3 text-yellow-500" />
                <span className="font-medium">Pannello Admin</span>
              </button>
            </div>
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
                {activeVoiceChannelName}
              </span>
              <button 
                onClick={() => {
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

        {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
        <JumpscareOverlay />
      </div>
    );
  }

  const serverChannels = displayChannels.filter(c => c.server_id === activeServer.id);
  const categories = Array.from(new Set(serverChannels.map(c => c.category)));
  if (categories.length === 0) categories.push("Generale");
  
  const canManageChannels = serverPermissions?.can_manage_channels ?? false;
  const canManageServer = serverPermissions?.can_manage_server || serverPermissions?.can_manage_roles;

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
          {canManageChannels && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAddingCategory(true); setNewCategoryName(""); }}
              className="p-1 text-[#dbdee1] hover:text-white transition-opacity"
              title="Crea Categoria"
            >
              <FolderPlus size={16} />
            </button>
          )}
          {canManageServer && onOpenSettings && (
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
              className="p-1 text-[#dbdee1] hover:text-white transition-opacity ml-1"
              title="Impostazioni Server"
            >
              <Settings size={16} />
            </button>
          )}
          {!canManageServer && onLeaveServer && (
            <button 
              onClick={(e) => { e.stopPropagation(); onLeaveServer(); }}
              className="p-1 text-[#dbdee1] hover:text-[#f23f43] transition-colors"
              title="Esci dal Server"
            >
              <LogOut size={16} />
            </button>
          )}
          {canManageServer ? (
            <button
              onClick={(e) => { e.stopPropagation(); setShowNotifications(true); }}
              className="p-1 text-[#dbdee1] hover:text-white transition-opacity ml-1 relative"
              title="Notifiche Server"
            >
              <Bell size={16} />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#f23f43] text-white text-[10px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          ) : (
            <ChevronDown size={18} className="text-[#dbdee1] ml-1" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2 space-y-4">
        {categories.length === 0 ? (
          <div className="text-center text-[#949ba4] text-xs py-4 px-2">Nessun canale in questo server</div>
        ) : (
          categories.map((category) => {
            const categoryChannels = serverChannels.filter(c => c.category === category);
            const isCollapsed = collapsedCategories.has(category);
            
            return (
              <div 
                key={category}
                draggable={canManageChannels}
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
                  {canManageChannels && (
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
                          draggable={canManageChannels}
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
                                onChannelSelect(channel);
                              }
                            }}
                            className={`relative flex items-center px-2 py-1.5 rounded cursor-pointer group ${
                              isActive 
                                ? 'bg-[#404249] text-white' 
                                : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                            } ${channel.unread && !isActive && channel.type !== 'voice' ? 'text-white font-medium' : ''} ${isDeleting === channel.id ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <div className="relative mr-1.5 flex-shrink-0">
                              <Icon size={18} className={`${isVoiceChannel && connectedMembers.length > 0 ? 'text-[#23a559]' : (isActive && channel.type === 'minigame' ? 'text-[#23a559]' : 'opacity-70')}`} />
                              {channel.type === 'minigame' && channel.minigame_icon_url && (
                                <img src={channel.minigame_icon_url} className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-[1.5px] border-[#2b2d31] object-cover bg-[#2b2d31]" alt="icon" />
                              )}
                            </div>
                            <span className="truncate flex-1">{channel.name}</span>
                            
                            <div className="flex items-center flex-shrink-0">
                              {channel.unread && !isActive && channel.type !== 'voice' && (
                                <div className="w-2 h-2 rounded-full bg-white mr-1" />
                              )}
                              {canManageChannels && (
                                <>
                                  {(channel.type === 'text' || channel.type === 'minigame') && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setChannelToSettings(channel);
                                        setSettingsCooldown(channel.cooldown || 0);
                                        setSettingsIsLocked(channel.is_locked || false);
                                        setSettingsIsWelcome(channel.is_welcome_channel || false);
                                        setSettingsMinigameUrl((channel as any).minigame_url || "");
                                        setSettingsMinigameIcon((channel as any).minigame_icon_url || null);
                                      }}
                                      className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:text-white transition-all"
                                      title="Impostazioni Canale"
                                    >
                                      <Settings size={14} />
                                    </button>
                                  )}
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
                                const isLocal = member.user_id === currentUser?.id;
                                
                                const userProfile = member.profiles;
                                const isAdmin = member.user_id === adminId;
                                const isMod = moderatorIds.includes(member.user_id);

                                const userForCard: User | null = userProfile ? {
                                  id: userProfile.id,
                                  name: userProfile.first_name || 'Utente',
                                  avatar: userProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.id}`,
                                  status: 'online',
                                  bio: userProfile.bio || undefined,
                                  banner_color: userProfile.banner_color || undefined,
                                  banner_url: userProfile.banner_url || undefined,
                                  level: userProfile.level || 1,
                                  digitalcardus: userProfile.digitalcardus ?? 25,
                                  xp: userProfile.xp || 0,
                                  global_role: isAdmin ? 'CREATOR' : isMod ? 'MODERATOR' : 'USER',
                                } : null;

                                const memberContent = (
                                  <div className="w-full">
                                    <ProfilePopover user={userForCard} side="right" align="center">
                                      <div className="flex items-center group/member animate-in fade-in-0 zoom-in-95 duration-300 cursor-pointer">
                                        <div className="relative rounded-full transition-all duration-100">
                                          <Avatar src={member.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} decoration={member.profiles?.avatar_decoration} isSpeaking={isSpeaking} className="w-6 h-6 object-cover" />
                                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#2b2d31] bg-[#23a559] z-30" />
                                        </div>
                                        <div className="ml-2 flex items-center gap-1 flex-1 min-w-0">
                                          <span className="text-sm text-[#949ba4] group-hover/member:text-[#dbdee1] truncate">{member.profiles?.first_name || 'Utente'}</span>
                                          {isAdmin && (
                                            <Tooltip delayDuration={0}>
                                              <TooltipTrigger asChild>
                                                <div className="cursor-help flex items-center"><Shield size={12} className="text-red-500 flex-shrink-0" /></div>
                                              </TooltipTrigger>
                                              <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                                                admin di discord canary 2
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                          {!isAdmin && isMod && (
                                            <Tooltip delayDuration={0}>
                                              <TooltipTrigger asChild>
                                                <div className="cursor-help flex items-center"><Shield size={12} className="text-blue-400 flex-shrink-0" /></div>
                                              </TooltipTrigger>
                                              <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                                                moderatore ufficiale
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                        <div className="ml-auto flex items-center space-x-1 text-[#b5bac1]">
                                          {memberIsDeafened && <Headphones size={14} className="text-[#f23f43]"/>}
                                          {memberIsMuted && !memberIsDeafened && <MicOff size={14} className="text-[#f23f43]"/>}
                                        </div>
                                      </div>
                                    </ProfilePopover>
                                  </div>
                                );

                                if (isLocal) {
                                  return <React.Fragment key={member.user_id}>{memberContent}</React.Fragment>;
                                }

                                return (
                                  <ContextMenu.Root key={member.user_id}>
                                    <ContextMenu.Trigger asChild>
                                      {memberContent}
                                    </ContextMenu.Trigger>
                                    <ContextMenu.Portal>
                                      <ContextMenu.Content className="bg-[#111214] border border-[#1e1f22] rounded-md shadow-xl p-3 w-48 z-[99999] animate-in fade-in zoom-in-95 duration-100">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-xs font-bold text-[#b5bac1] uppercase">Volume Utente</span>
                                          <span className="text-xs font-medium text-brand">{userVolumes[member.user_id] ?? 100}%</span>
                                        </div>
                                        <input 
                                          type="range" 
                                          min="0" 
                                          max="200" 
                                          value={userVolumes[member.user_id] ?? 100}
                                          onChange={(e) => setUserVolume(member.user_id, parseInt(e.target.value))}
                                          className="w-full h-1.5 bg-[#1e1f22] rounded-lg appearance-none cursor-pointer accent-[#5865F2]"
                                        />
                                      </ContextMenu.Content>
                                    </ContextMenu.Portal>
                                  </ContextMenu.Root>
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
              {activeVoiceChannelName}
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

                {newChannelType === 'minigame' && (
                  <div className="mb-2 mt-4">
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">URL Minigioco (Iframe)</label>
                    <div className="relative flex items-center bg-[#1e1f22] rounded overflow-hidden p-1">
                      <input 
                        type="url" 
                        value={newMinigameUrl}
                        onChange={(e) => setNewMinigameUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-transparent text-white p-2 pl-2 focus:outline-none placeholder-[#878a91]"
                      />
                    </div>
                  </div>
                )}
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

      {channelToSettings && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setChannelToSettings(null)}>
          <div className="bg-[#313338] rounded-md w-[440px] shadow-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#1e1f22]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings size={20} /> Impostazioni Canale
              </h2>
              <p className="text-sm text-[#b5bac1] mt-1">#{channelToSettings.name}</p>
            </div>
            
            <form onSubmit={handleSaveChannelSettings} className="flex flex-col">
              <div className="p-4 space-y-6">
                
                {channelToSettings.type === 'minigame' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center text-white font-medium mb-2">
                        <Gamepad2 size={18} className="mr-2 text-[#949ba4]" />
                        URL Minigioco (Iframe)
                      </label>
                      <input 
                        type="url" 
                        value={settingsMinigameUrl}
                        onChange={(e) => setSettingsMinigameUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#1e1f22] text-white p-2 rounded border-none outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="flex items-center text-white font-medium mb-2">
                        <ImageIcon size={18} className="mr-2 text-[#949ba4]" />
                        Icona Minigioco (Max 100KB)
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1e1f22] rounded-lg flex items-center justify-center overflow-hidden border border-[#3f4147]">
                          {settingsMinigameIcon ? (
                            <img src={settingsMinigameIcon} alt="Icon" className="w-full h-full object-cover" />
                          ) : (
                            <Gamepad2 size={24} className="text-[#4e5058]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleIconUpload}
                            disabled={isUploadingIcon}
                            className="block w-full text-sm text-[#b5bac1] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#5865f2] file:text-white hover:file:bg-[#4752c4] cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center text-white font-medium">
                          <Clock size={18} className="mr-2 text-[#949ba4]" />
                          Slowmode (Cooldown)
                        </label>
                      </div>
                      <p className="text-xs text-[#b5bac1] mb-3">Limita la frequenza con cui gli utenti possono inviare messaggi in questo canale.</p>
                      <select 
                        value={settingsCooldown}
                        onChange={(e) => setSettingsCooldown(Number(e.target.value))}
                        className="w-full bg-[#1e1f22] text-white p-2 rounded border-none outline-none focus:ring-1 focus:ring-brand"
                      >
                        <option value={0}>Disattivata</option>
                        <option value={5}>5 secondi</option>
                        <option value={10}>10 secondi</option>
                        <option value={15}>15 secondi</option>
                        <option value={30}>30 secondi</option>
                        <option value={60}>1 minuto</option>
                        <option value={120}>2 minuti</option>
                        <option value={300}>5 minuti</option>
                      </select>
                    </div>

                    <div className="h-[1px] bg-[#3f4147] w-full"></div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center text-white font-medium mb-1">
                          <Lock size={18} className="mr-2 text-[#949ba4]" />
                          Canale Bloccato
                        </div>
                        <div className="text-xs text-[#b5bac1]">Solo il proprietario del server potrà scrivere in questo canale.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={settingsIsLocked}
                          onChange={(e) => setSettingsIsLocked(e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-[#80848e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23a559]"></div>
                      </label>
                    </div>

                    <div className="h-[1px] bg-[#3f4147] w-full"></div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center text-white font-medium mb-1">
                          <MessageSquare size={18} className="mr-2 text-[#949ba4]" />
                          Canale di Benvenuto
                        </div>
                        <div className="text-xs text-[#b5bac1]">Invia un messaggio automatico quando un nuovo utente entra nel server. (Solo un canale per server)</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={settingsIsWelcome}
                          onChange={(e) => setSettingsIsWelcome(e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-[#80848e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23a559]"></div>
                      </label>
                    </div>
                  </>
                )}

              </div>

              <div className="flex justify-end items-center bg-[#2b2d31] p-4">
                <button 
                  type="button" 
                  onClick={() => setChannelToSettings(null)} 
                  className="text-white hover:underline text-sm px-6 py-2 mr-2"
                >
                  Annulla
                </button>
                <button 
                  type="submit" 
                  disabled={isUploadingIcon}
                  className="bg-[#5865f2] text-white rounded text-sm px-6 py-2 hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
                >
                  {isUploadingIcon ? 'Caricamento...' : 'Salva Modifiche'}
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

      {showNotifications && activeServer && (
        <ServerNotificationsModal 
          serverId={activeServer.id} 
          onClose={() => setShowNotifications(false)} 
        />
      )}
      <JumpscareOverlay />
    </div>
  );
};