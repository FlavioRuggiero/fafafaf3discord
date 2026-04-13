import React, { useState, useEffect, useRef } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { DiscoverServersModal, CreateServerModal, ServerSettingsModal } from "@/components/discord/ServerModals";
import { UserSettingsModal } from "@/components/discord/UserSettingsModal";
import { ShopView } from "@/components/discord/ShopView";
import { InventoryView } from "@/components/discord/InventoryView";
import { NotificationsView } from "@/components/discord/NotificationsView";
import { TradeModal } from "@/components/discord/TradeModal";
import { INITIAL_MESSAGES } from "@/data/mockData";
import { Message, User, Server, Channel, ServerRole, ServerPermissions } from "@/types/discord";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Menu, Home, MessageSquare, Compass, Plus } from "lucide-react";
import { VoiceChannelProvider } from "@/contexts/VoiceChannelProvider";
import { UserPanel } from "@/components/discord/UserPanel";
import { playSound } from "@/utils/sounds";

type NotificationSetting = 'all' | 'mentions' | 'none';

const Index = () => {
  const { user, adminId, moderatorIds } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Refs per evitare stale closures negli eventi realtime
  const adminIdRef = useRef(adminId);
  const moderatorIdsRef = useRef(moderatorIds);

  useEffect(() => {
    adminIdRef.current = adminId;
  }, [adminId]);

  useEffect(() => {
    moderatorIdsRef.current = moderatorIds;
  }, [moderatorIds]);

  // States per Server e Canali dal DB
  const [servers, setServers] = useState<Server[]>([]);
  const [publicServers, setPublicServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('home');
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  
  const activeServer = servers.find(s => s.id === activeServerId);
  const serverChannels = allChannels.filter(c => c.server_id === activeServerId);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({});
  
  // State per gestire la Presence in tempo reale e i profili
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [serverProfiles, setServerProfiles] = useState<any[]>([]);
  
  // State per i ruoli
  const [serverRoles, setServerRoles] = useState<ServerRole[]>([]);
  const [memberRoles, setMemberRoles] = useState<{user_id: string, role_id: string}[]>([]);

  // States per UI
  const [showMembers, setShowMembers] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);
  
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [isUpdatingServer, setIsUpdatingServer] = useState(false);

  // States per Notifiche e Scambi
  const [notificationSettings, setNotificationSettings] = useState<Record<string, NotificationSetting>>({});
  const [unreadServers, setUnreadServers] = useState<Set<string>>(new Set());
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Carica impostazioni notifiche
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`notification-settings-${user.id}`);
      if (saved) {
        try { setNotificationSettings(JSON.parse(saved)); } catch(e) {}
      }
    }
  }, [user]);

  const handleSetNotificationSetting = (serverId: string, setting: NotificationSetting) => {
    setNotificationSettings(prev => {
      const next = { ...prev, [serverId]: setting };
      if (currentUser) {
        localStorage.setItem(`notification-settings-${currentUser.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Refs per il listener globale
  const allChannelsRef = useRef(allChannels);
  useEffect(() => { allChannelsRef.current = allChannels; }, [allChannels]);

  const activeServerIdRef = useRef(activeServerId);
  useEffect(() => { activeServerIdRef.current = activeServerId; }, [activeServerId]);

  const notificationSettingsRef = useRef(notificationSettings);
  useEffect(() => { notificationSettingsRef.current = notificationSettings; }, [notificationSettings]);

  // Listener globale per le notifiche
  useEffect(() => {
    if (!currentUser) return;

    const handleNewMessage = (payload: any) => {
      const newMsg = payload.new;
      if (newMsg.user_id === currentUser.id) return; // Non notificare i propri messaggi

      const channel = allChannelsRef.current.find(c => c.id === newMsg.channel_id);
      if (!channel || !channel.server_id) return;

      const serverId = channel.server_id;
      const setting = notificationSettingsRef.current[serverId] || 'mentions'; // Default: solo menzioni

      // Controllo menzione tramite ID univoco o @everyone
      const isMentioned = newMsg.content.includes(`<@${currentUser.id}>`) || newMsg.content.includes('<@everyone>');

      if (setting !== 'none') {
        // Se non stiamo guardando questo server, segnalo come non letto
        if (activeServerIdRef.current !== serverId) {
          setUnreadServers(prev => new Set(prev).add(serverId));
        }
      }

      let shouldNotify = false;
      if (setting === 'all') shouldNotify = true;
      if (setting === 'mentions' && isMentioned) shouldNotify = true;

      if (shouldNotify) {
        playSound('/notifica.mp3');
      }
    };

    const sub = supabase.channel('global_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleNewMessage)
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentUser]);

  // Listener per conteggio notifiche e scambi attivi
  useEffect(() => {
    if (!currentUser) return;

    const fetchNotificationCount = async () => {
      const today = new Date().toISOString().split('T')[0];
      let count = currentUser.last_reward_date !== today ? 1 : 0;

      const { count: tradeCount } = await supabase.from('trades').select('*', { count: 'exact', head: true }).eq('receiver_id', currentUser.id).eq('status', 'pending');
      if (tradeCount) count += tradeCount;

      setNotificationCount(count);
    };

    fetchNotificationCount();

    const fetchActiveTrade = async () => {
      const { data } = await supabase.from('trades')
        .select('id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'active')
        .limit(1);
      if (data && data.length > 0) setActiveTradeId(data[0].id);
    };
    fetchActiveTrade();

    const tradeSub = supabase.channel('active_trades_global')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trades' }, async (payload) => {
        fetchNotificationCount();
        if (payload.new.status === 'active') {
          // Fetch the trade to check if it belongs to us (since payload.new might lack columns if not updated)
          const { data } = await supabase.from('trades').select('sender_id, receiver_id').eq('id', payload.new.id).single();
          if (data && (data.sender_id === currentUser.id || data.receiver_id === currentUser.id)) {
            setActiveTradeId(payload.new.id);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tradeSub);
    };
  }, [currentUser]);

  // Calcola dinamicamente la lista dei membri con lo stato in tempo reale
  const serverMembersList: User[] = serverProfiles.map(p => {
    const isOnline = onlineUserIds.has(p.id) || p.id === currentUser?.id;
    const name = p.first_name || "Utente";
    
    let role: User['global_role'] = 'USER';
    if (p.id === adminId) {
        role = 'CREATOR';
    } else if (p.role === 'moderator' || moderatorIds.includes(p.id)) {
        role = 'MODERATOR';
    }

    const userRoles = memberRoles
      .filter(mr => mr.user_id === p.id)
      .map(mr => serverRoles.find(r => r.id === mr.role_id))
      .filter(Boolean) as ServerRole[];

    return {
      id: p.id,
      name: name,
      avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
      status: isOnline ? "online" : "offline",
      global_role: role,
      bio: p.bio || "",
      banner_color: p.banner_color || "#5865F2",
      banner_url: p.banner_url || undefined,
      level: p.level || 1,
      digitalcardus: p.digitalcardus ?? 25,
      xp: p.xp || 0,
      server_roles: userRoles,
      avatar_decoration: p.avatar_decoration || null,
      purchased_decorations: p.purchased_decorations || []
    };
  });

  // Calcolo dei permessi per l'utente corrente nel server attivo
  const currentUserMember = serverMembersList.find(m => m.id === currentUser?.id);
  const isOwner = activeServer?.created_by === currentUser?.id;
  const isGlobalAdmin = currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'CREATOR';

  const serverPermissions: ServerPermissions = {
    isOwner: isOwner || false,
    can_manage_channels: isOwner || isGlobalAdmin || (currentUserMember?.server_roles?.some(r => r.can_manage_channels) ?? false),
    can_delete_messages: isOwner || isGlobalAdmin || (currentUserMember?.server_roles?.some(r => r.can_delete_messages) ?? false),
    can_use_commands: isOwner || isGlobalAdmin || (currentUserMember?.server_roles?.some(r => r.can_use_commands) ?? false),
    can_manage_server: isOwner || isGlobalAdmin || (currentUserMember?.server_roles?.some(r => r.can_manage_server) ?? false),
    can_manage_roles: isOwner || isGlobalAdmin || (currentUserMember?.server_roles?.some(r => r.can_manage_roles) ?? false),
    can_bypass_restrictions: isOwner || isGlobalAdmin || (currentUserMember?.server_roles?.some(r => r.can_bypass_restrictions) ?? false),
  };

  // Gestione Supabase Presence
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('global_presence', {
      config: {
        presence: {
          key: user.id, 
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineIds = new Set<string>();
        Object.keys(presenceState).forEach(id => onlineIds.add(id));
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    const handleBeforeUnload = () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Listener Realtime per la tabella Profiles e Channels
  useEffect(() => {
    const profileSubscription = supabase
      .channel('public:profiles_index')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const updatedProfile = payload.new;

        setServerProfiles(prev => prev.map(p => p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p));

        setCurrentUser(prev => {
          if (!prev || prev.id !== updatedProfile.id) return prev;
          
          let role: User['global_role'] = 'USER';
          if (updatedProfile.id === adminIdRef.current) {
              role = 'CREATOR';
          } else if (updatedProfile.role === 'moderator' || moderatorIdsRef.current.includes(updatedProfile.id)) {
              role = 'MODERATOR';
          }

          return {
            ...prev,
            name: updatedProfile.first_name || prev.name,
            avatar: updatedProfile.avatar_url || prev.avatar,
            bio: updatedProfile.bio || "",
            banner_color: updatedProfile.banner_color || "#5865F2",
            banner_url: updatedProfile.banner_url, // Accetta null
            level: updatedProfile.level || 1,
            digitalcardus: updatedProfile.digitalcardus ?? 25,
            xp: updatedProfile.xp || 0,
            global_role: role,
            last_reward_date: updatedProfile.last_reward_date, // Accetta null
            avatar_decoration: updatedProfile.avatar_decoration, // Accetta null
            purchased_decorations: updatedProfile.purchased_decorations || []
          };
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channels' }, (payload) => {
        setAllChannels(prev => {
          if (prev.some(c => c.id === payload.new.id)) return prev;
          return [...prev, payload.new as Channel];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels' }, (payload) => {
        setAllChannels(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channels' }, (payload) => {
        setAllChannels(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user?.id]);

  // Caricamento dati iniziali e premi giornalieri
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      // Eseguiamo la pulizia solo una volta per sessione
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        
        // 1. Aggiorna data ultimo accesso
        await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id);
        
        // 2. Pulisce eventuali "utenti fantasma" bloccati in chat vocali precedenti
        await supabase.from('server_members').update({ voice_channel_id: null }).eq('user_id', user.id);
      }
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      const userName = profile?.first_name || user.email?.split('@')[0] || "Utente";
      
      let role: User['global_role'] = 'USER';
      if (user.id === adminId) {
        role = 'CREATOR';
      } else if (profile?.role === 'moderator' || moderatorIds.includes(user.id)) {
        role = 'MODERATOR';
      }

      const loadedUser: User = {
        id: user.id,
        name: userName,
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        status: "online",
        global_role: role,
        bio: profile?.bio || "",
        banner_color: profile?.banner_color || "#5865F2",
        banner_url: profile?.banner_url || undefined,
        level: profile?.level || 1,
        digitalcardus: profile?.digitalcardus ?? 25,
        xp: profile?.xp || 0,
        last_reward_date: profile?.last_reward_date || null,
        avatar_decoration: profile?.avatar_decoration || null,
        purchased_decorations: profile?.purchased_decorations || []
      };
      
      setCurrentUser(loadedUser);

      const { data: memberData } = await supabase
        .from('server_members')
        .select('server_id, position')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      const joinedServerIds = memberData?.map(m => m.server_id) || [];

      if (joinedServerIds.length > 0) {
        const { data: serversData } = await supabase.from('servers').select('*').in('id', joinedServerIds);
        if (serversData) {
          const sortedServers = memberData
            .map(m => serversData.find(s => s.id === m.server_id))
            .filter(Boolean) as Server[];
          setServers(sortedServers);
        }

        const { data: channelsData } = await supabase.from('channels').select('*').in('server_id', joinedServerIds);
        if (channelsData) setAllChannels(channelsData);
      }
    };
    
    loadInitialData();
  }, [user, adminId, moderatorIds]);

  // Caricamento Membri e Sottoscrizione Realtime
  useEffect(() => {
    if (!activeServerId || activeServerId === 'home') {
      setServerProfiles([]);
      setServerRoles([]);
      setMemberRoles([]);
      return;
    }

    let isMounted = true;

    const fetchServerData = async () => {
      const { data: membersData } = await supabase
        .from('server_members')
        .select('user_id')
        .eq('server_id', activeServerId);
        
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
          
        if (profilesData && isMounted) {
          setServerProfiles(profilesData);
        }
      } else if (isMounted) {
        setServerProfiles([]);
      }

      const { data: roles } = await supabase.from('server_roles').select('*').eq('server_id', activeServerId);
      if (roles && isMounted) setServerRoles(roles);

      const { data: mRoles } = await supabase.from('server_member_roles').select('user_id, role_id').eq('server_id', activeServerId);
      if (mRoles && isMounted) setMemberRoles(mRoles);
    };

    fetchServerData();

    // Listener per unione/uscita dal server per aggiornare la lista membri in tempo reale
    const memberSub = supabase.channel(`members_realtime_${activeServerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'server_members',
        filter: `server_id=eq.${activeServerId}`
      }, async (payload) => {
        if (!isMounted) return;

        if (payload.eventType === 'INSERT') {
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();
          if (newProfile) {
            setServerProfiles(prev => {
              if (prev.some(p => p.id === newProfile.id)) return prev;
              return [...prev, newProfile];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedUserId = payload.old.user_id;
          setServerProfiles(prev => prev.filter(p => p.id !== deletedUserId));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_roles', filter: `server_id=eq.${activeServerId}` }, () => fetchServerData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_member_roles', filter: `server_id=eq.${activeServerId}` }, () => fetchServerData())
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(memberSub);
    };
  }, [activeServerId]);

  // AGGIORNAMENTO: Sincronizza istantaneamente il canale attivo quando allChannels cambia
  useEffect(() => {
    if (activeServerId !== 'home') {
      const newServerChannels = allChannels.filter(c => c.server_id === activeServerId);
      if (newServerChannels.length > 0) {
        setActiveChannel(current => {
          if (!current || current.server_id !== activeServerId) {
             return newServerChannels.find(c => c.type === 'text') || newServerChannels[0];
          }
          // Trova il canale aggiornato per riflettere le nuove impostazioni (cooldown, is_locked)
          const updatedCurrent = newServerChannels.find(c => c.id === current.id);
          if (!updatedCurrent) {
             return newServerChannels.find(c => c.type === 'text') || newServerChannels[0];
          }
          return updatedCurrent;
        });
      } else {
        setActiveChannel(null);
      }
    } else {
      setActiveChannel(null);
    }
  }, [activeServerId, allChannels]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowMembers(false);
      } else {
        setShowMembers(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendMessage = (content: string) => {
    if (!currentUser || !activeChannel) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      user: currentUser,
      content,
      timestamp: `Oggi alle ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
    
    setMessagesByChannel(prev => ({
      ...prev,
      [activeChannel.id]: [...(prev[activeChannel.id] || []), newMessage]
    }));
  };

  const handleCreateServer = async (name: string, description: string, imageFile: File | null, audioFile: File | Blob | null) => {
    if (!currentUser) return;
    
    setIsCreatingServer(true);

    // Controllo di sicurezza in tempo reale dal database
    const { data: checkProfile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    const isReallyAdmin = currentUser.id === adminIdRef.current;
    const isReallyMod = checkProfile?.role === 'moderator';

    if (!isReallyAdmin && !isReallyMod) {
      showError("Permesso negato: non sei più un moderatore o admin.");
      setIsCreatingServer(false);
      setShowCreateModal(false);
      // Aggiorniamo lo stato locale per far sparire il pulsante
      setCurrentUser(prev => prev ? { ...prev, global_role: 'USER' } : null);
      return;
    }
    
    let icon_url = `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`;
    let audio_url = null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('icons')
        .upload(filePath, imageFile);

      if (!uploadError) {
        const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
        icon_url = data.publicUrl;
      }
    }

    if (audioFile) {
      const fileExt = audioFile instanceof File ? audioFile.name.split('.').pop() : 'webm';
      const fileName = `audio_${Math.random()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('icons')
        .upload(filePath, audioFile);

      if (!uploadError) {
        const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
        audio_url = data.publicUrl;
      }
    }
    
    const { data: newServer, error: serverError } = await supabase
      .from('servers')
      .insert({
        name,
        created_by: currentUser.id,
        description: description || "Il tuo nuovo server privato.",
        icon_url,
        audio_url
      })
      .select()
      .single();

    if (serverError || !newServer) {
      showError("Errore durante la creazione del server");
      setIsCreatingServer(false);
      return;
    }

    const maxPosition = servers.length;
    await supabase.from('server_members').insert({ 
      server_id: newServer.id, 
      user_id: currentUser.id,
      position: maxPosition
    });

    const { data: newChannel } = await supabase
      .from('channels')
      .insert({
        server_id: newServer.id,
        name: "generale",
        type: "text",
        category: "Chat Generale"
      })
      .select()
      .single();

    setServers([...servers, newServer]);
    if (newChannel) setAllChannels([...allChannels, newChannel]);
    setActiveServerId(newServer.id);
    
    showSuccess("Server creato con successo!");
    setShowCreateModal(false);
    setIsCreatingServer(false);
  };

  const handleJoinServer = async (server: Server) => {
    if (!currentUser) return;

    const maxPosition = servers.length;
    const { error } = await supabase.from('server_members').insert({ 
      server_id: server.id, 
      user_id: currentUser.id,
      position: maxPosition
    });

    if (error) {
      showError("Errore durante l'unione al server");
      return;
    }

    const { data: newChannels } = await supabase.from('channels').select('*').eq('server_id', server.id);
    
    setServers([...servers, server]);
    if (newChannels) {
      setAllChannels([...allChannels, ...newChannels]);
      
      const welcomeChannel = newChannels.find(c => c.is_welcome_channel && c.type === 'text') || newChannels.find(c => c.type === 'text');
      if (welcomeChannel) {
        await supabase.from('messages').insert({
          channel_id: welcomeChannel.id,
          user_id: currentUser.id,
          content: `<system:welcome>`
        });
      }
    }
    
    setActiveServerId(server.id);
    showSuccess(`Ti sei unito a ${server.name}!`);
  };

  const handleLeaveServer = async (serverId: string) => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('server_members')
      .delete()
      .eq('server_id', serverId)
      .eq('user_id', currentUser.id)
      .select();

    if (error || !data || data.length === 0) {
      showError("Impossibile uscire dal server. Assicurati di aver eseguito lo script SQL.");
      return;
    }

    setServers(servers.filter(s => s.id !== serverId));
    setAllChannels(allChannels.filter(c => c.server_id !== serverId));
    setActiveServerId('home');
    showSuccess("Sei uscito dal server.");
  };

  const handleOpenDiscover = async () => {
    const { data } = await supabase.from('servers').select('*');
    if (data) setPublicServers(data);
    setShowDiscoverModal(true);
  };

  const handleUpdateServer = async (id: string, name: string, description: string, imageFile: File | null, audioFile: File | Blob | null | undefined) => {
    if (!currentUser) return;
    setIsUpdatingServer(true);
    
    let icon_url = servers.find(s => s.id === id)?.icon_url;
    let audio_url = servers.find(s => s.id === id)?.audio_url;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('icons')
        .upload(filePath, imageFile);

      if (!uploadError) {
        const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
        icon_url = data.publicUrl;
      }
    }

    if (audioFile !== undefined) {
      if (audioFile === null) {
        audio_url = null;
      } else {
        const fileExt = audioFile instanceof File ? audioFile.name.split('.').pop() : 'webm';
        const fileName = `audio_${Math.random()}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('icons')
          .upload(filePath, audioFile);

        if (!uploadError) {
          const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
          audio_url = data.publicUrl;
        }
      }
    }

    const { error } = await supabase.from('servers').update({ name, description, icon_url, audio_url }).eq('id', id);
    if (error) {
      showError("Impossibile aggiornare il server");
      setIsUpdatingServer(false);
      return;
    }
    
    setServers(servers.map(s => s.id === id ? { ...s, name, description, icon_url: icon_url || s.icon_url, audio_url } : s));
    setShowSettingsModal(false);
    showSuccess("Impostazioni salvate con successo!");
    setIsUpdatingServer(false);
  };

  const handleDeleteServer = async (id: string) => {
    const { data, error } = await supabase.from('servers').delete().eq('id', id).select();
    if (error || !data || data.length === 0) {
      showError("Impossibile eliminare il server");
      return;
    }
    setServers(servers.filter(s => s.id !== id));
    setAllChannels(allChannels.filter(c => c.server_id !== id));
    setActiveServerId('home');
    setShowSettingsModal(false);
    showSuccess("Server eliminato!");
  };

  const handleUpdateProfile = async (nickname: string, bio: string, avatarFile: File | null, bannerColor: string, bannerFile: File | null | undefined) => {
    if (!currentUser) return;

    let avatar_url = currentUser.avatar;
    let banner_url = currentUser.banner_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `avatars/${currentUser.id}_${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('icons').upload(filePath, avatarFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
        avatar_url = data.publicUrl;
      }
    }

    if (bannerFile !== undefined) {
      if (bannerFile === null) {
        banner_url = undefined;
      } else {
        const fileExt = bannerFile.name.split('.').pop();
        const filePath = `banners/${currentUser.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('icons').upload(filePath, bannerFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
          banner_url = data.publicUrl;
        }
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        first_name: nickname, 
        bio: bio,
        avatar_url: avatar_url,
        banner_color: bannerColor,
        banner_url: banner_url || null
      })
      .eq('id', currentUser.id);

    if (error) {
      showError("Impossibile aggiornare il profilo.");
      return;
    }

    setCurrentUser({ 
      ...currentUser, 
      name: nickname, 
      bio: bio,
      avatar: avatar_url,
      banner_color: bannerColor,
      banner_url: banner_url
    });
    showSuccess("Profilo aggiornato con successo!");
    setShowUserSettingsModal(false);
  };

  const handleLogout = async () => {
    supabase.channel('global_presence').untrack();
    await supabase.auth.signOut();
  };

  const handleNavigateToMessage = (serverId: string, channelId: string, messageId: string) => {
    setActiveServerId(serverId);
    const channel = allChannels.find(c => c.id === channelId);
    if (channel) {
      setActiveChannel(channel);
    } else {
      // Se il canale non è ancora caricato, lo impostiamo appena possibile
      const checkChannel = setInterval(() => {
        const c = allChannelsRef.current.find(ch => ch.id === channelId);
        if (c) {
          setActiveChannel(c);
          clearInterval(checkChannel);
        }
      }, 100);
      setTimeout(() => clearInterval(checkChannel), 5000);
    }
    setTargetMessageId(messageId);
  };

  if (!currentUser) {
    return <div className="h-screen w-full bg-[#313338] flex items-center justify-center text-[#dbdee1]">Caricamento profilo...</div>;
  }

  const currentMessages = activeChannel ? (messagesByChannel[activeChannel.id] || INITIAL_MESSAGES) : [];
  const canCreate = currentUser.global_role === 'ADMIN' || currentUser.global_role === 'CREATOR' || currentUser.global_role === 'MODERATOR';

  return (
    <VoiceChannelProvider currentUser={currentUser}>
      <div className="flex h-screen w-full bg-[#313338] text-[#dbdee1] font-sans overflow-hidden relative">
        
        {showSidebar && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setShowSidebar(false)} />
        )}

        <div className={`fixed inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
          <ServerSidebar 
            servers={servers}
            activeServerId={activeServerId}
            onServerSelect={(id) => { 
              setActiveServerId(id); 
              setShowSidebar(false); 
              setUnreadServers(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }}
            onOpenCreate={() => setShowCreateModal(true)}
            onOpenDiscover={handleOpenDiscover}
            currentUser={currentUser}
            onLogout={handleLogout}
            onReorderServers={setServers}
            notificationSettings={notificationSettings}
            onSetNotificationSetting={handleSetNotificationSetting}
            unreadServers={unreadServers}
          />
          
          <ChannelSidebar 
            activeServer={activeServer || null}
            channels={allChannels}
            activeChannelId={activeChannel?.id || ''} 
            onChannelSelect={(channel) => { setActiveChannel(channel); setShowSidebar(false); }} 
            currentUser={currentUser}
            onOpenSettings={() => setShowSettingsModal(true)}
            onLeaveServer={() => handleLeaveServer(activeServer!.id)}
            onOpenUserSettings={() => setShowUserSettingsModal(true)}
            serverPermissions={serverPermissions}
            notificationCount={notificationCount}
          />
        </div>

        {activeServerId !== 'home' && activeChannel ? (
          <>
            <ChatArea 
              channel={activeChannel} 
              messages={currentMessages} 
              onSendMessage={handleSendMessage}
              onToggleMembers={() => setShowMembers(!showMembers)}
              onToggleSidebar={() => setShowSidebar(true)}
              showMembers={showMembers}
              serverCreatorId={activeServer?.created_by}
              serverMembers={serverMembersList}
              serverPermissions={serverPermissions}
            />
            {showMembers && (
              <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setShowMembers(false)} />
            )}
            <div className={`
              absolute right-0 top-0 bottom-0 z-30 lg:static lg:block
              h-full transition-all duration-300
              ${showMembers ? 'w-[240px] translate-x-0' : 'w-0 translate-x-full lg:translate-x-0'} 
              overflow-hidden flex-shrink-0 shadow-xl lg:shadow-none bg-[#2b2d31]
            `}>
              <MemberList users={serverMembersList} isOpen={showMembers} creatorId={activeServer?.created_by} />
            </div>
          </>
        ) : activeServerId === 'home' ? (
          activeChannel?.id === 'shop' ? (
            <ShopView currentUser={currentUser} onToggleSidebar={() => setShowSidebar(true)} />
          ) : activeChannel?.id === 'inventory' ? (
            <InventoryView currentUser={currentUser} onToggleSidebar={() => setShowSidebar(true)} />
          ) : activeChannel?.id === 'notifications' ? (
            <NotificationsView 
              currentUser={currentUser} 
              onToggleSidebar={() => setShowSidebar(true)} 
              onNavigateToShop={() => setActiveChannel({ id: 'shop', name: 'Cardi E-Shop', type: 'text', category: '', server_id: null })}
              onNavigateToMessage={handleNavigateToMessage}
              onNavigateToTrade={(id) => setActiveTradeId(id)}
            />
          ) : (
            <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
              <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center px-4 flex-shrink-0">
                <button onClick={() => setShowSidebar(true)} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
                  <Menu size={24} />
                </button>
                <Home size={20} className="text-[#80848e] mr-2" />
                <h2 className="font-semibold text-white">Discord Canary 2</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
                <div className="max-w-xl w-full text-center">
                  <div className="w-20 h-20 bg-yellow-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-3">
                    <MessageSquare size={40} className="text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Benvenuto, {currentUser.name}!</h1>
                  <p className="text-[#b5bac1] mb-8 text-lg">
                    Inizia subito la tua avventura su discord canary 2 official GTX. unisciti a un server esistente o cerca di scalare la vetta diventando admin per crearne uno tuo
                  </p>
                  
                  <div className={`grid grid-cols-1 ${canCreate ? 'sm:grid-cols-2' : 'max-w-xs mx-auto'} gap-4`}>
                    <button onClick={handleOpenDiscover} className="flex flex-col items-center p-6 bg-[#2b2d31] hover:bg-[#35373c] rounded-xl border border-[#1e1f22] transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-full bg-[#23a559]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Compass size={24} className="text-[#23a559]" />
                      </div>
                      <h3 className="font-bold text-white mb-1">Esplora Server</h3>
                      <p className="text-sm text-[#949ba4]">Trova community pubbliche</p>
                    </button>
                    
                    {canCreate && (
                      <button onClick={() => setShowCreateModal(true)} className="flex flex-col items-center p-6 bg-[#2b2d31] hover:bg-[#35373c] rounded-xl border border-[#1e1f22] transition-all cursor-pointer group">
                        <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Plus size={24} className="text-brand" />
                        </div>
                        <h3 className="font-bold text-white mb-1">Crea un Server</h3>
                        <p className="text-sm text-[#949ba4]">Avvia il tuo spazio privato</p>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">Nessun canale disponibile</div>
        )}

        <DiscoverServersModal 
          isOpen={showDiscoverModal} 
          onClose={() => setShowDiscoverModal(false)} 
          servers={publicServers}
          joinedServerIds={servers.map(s => s.id)}
          onJoin={handleJoinServer}
        />
        
        <CreateServerModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
          onCreate={handleCreateServer}
          isCreating={isCreatingServer}
        />

        <ServerSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          server={activeServer || null}
          onUpdate={handleUpdateServer}
          onDelete={handleDeleteServer}
          isUpdating={isUpdatingServer}
          serverPermissions={serverPermissions}
        />

        <UserSettingsModal
          isOpen={showUserSettingsModal}
          onClose={() => setShowUserSettingsModal(false)}
          user={currentUser}
          onUpdate={handleUpdateProfile}
        />

        {activeTradeId && (
          <TradeModal 
            tradeId={activeTradeId} 
            currentUser={currentUser} 
            onClose={() => setActiveTradeId(null)} 
          />
        )}
      </div>
    </VoiceChannelProvider>
  );
};

export default Index;