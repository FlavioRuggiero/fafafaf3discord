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
import { DailyMinigameView } from "@/components/discord/DailyMinigameView";
import { Progression } from "@/components/discord/Progression";
import { FriendsArea } from "@/components/discord/FriendsArea";
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
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    adminIdRef.current = adminId;
  }, [adminId]);

  useEffect(() => {
    moderatorIdsRef.current = moderatorIds;
  }, [moderatorIds]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // States per Server e Canali dal DB
  const [servers, setServers] = useState<Server[]>([]);
  const [publicServers, setPublicServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('home');
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  
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
  
  // Calcolo dinamico delle notifiche
  const [tradeCount, setTradeCount] = useState(0);
  const [mentionCount, setMentionCount] = useState(0);
  
  const today = new Date().toISOString().split('T')[0];
  const dailyRewardCount = currentUser && currentUser.last_reward_date !== today ? 1 : 0;
  
  const notificationCount = tradeCount + mentionCount + dailyRewardCount;
  
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const prevNotifCountRef = useRef(0);

  // Gestione intelligente della scomparsa del badge notifiche
  useEffect(() => {
    if (notificationCount === 0) {
      setHasUnreadNotifications(false);
    } else if (notificationCount > prevNotifCountRef.current) {
      if (activeChannel?.id !== 'notifications') {
        setHasUnreadNotifications(true);
      }
    }
    prevNotifCountRef.current = notificationCount;
  }, [notificationCount, activeChannel?.id]);

  useEffect(() => {
    if (activeChannel?.id === 'notifications') {
      setHasUnreadNotifications(false);
      setMentionCount(0); // Resetta le menzioni di sessione quando visualizzate
    }
  }, [activeChannel?.id]);

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

  // Listener globale per le notifiche (Messaggi e Menzioni)
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleNewMessage = (payload: any) => {
      const newMsg = payload.new;
      if (newMsg.user_id === currentUser.id) return; // Non notificare i propri messaggi

      const channel = allChannelsRef.current.find(c => c.id === newMsg.channel_id);
      if (!channel || !channel.server_id) return;

      const serverId = channel.server_id;
      const setting = notificationSettingsRef.current[serverId] || 'mentions'; // Default: solo menzioni

      // Controllo menzione tramite ID univoco o @everyone
      const isMentioned = newMsg.content.includes(`<@${currentUser.id}>`) || newMsg.content.includes('<@everyone>');

      if (isMentioned) {
        setMentionCount(prev => prev + 1);
      }

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
  }, [currentUser?.id]);

  // Listener per conteggio scambi attivi
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const userId = currentUser.id;

    const fetchTradeCount = async () => {
      const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { count } = await supabase.from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .gt('created_at', twoMinsAgo); // Solo quelle non scadute
      setTradeCount(count || 0);
    };

    fetchTradeCount();
    
    // Controlla ogni 10 secondi se ci sono richieste scadute da rimuovere dal contatore
    const expireInterval = setInterval(fetchTradeCount, 10000);

    const fetchActiveTrade = async () => {
      const { data } = await supabase.from('trades')
        .select('id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'active')
        .limit(1);
      if (data && data.length > 0) setActiveTradeId(data[0].id);
    };
    fetchActiveTrade();

    const tradeSub = supabase.channel(`active_trades_global_${userId}`)
      .on('broadcast', { event: 'trade_request' }, () => {
        fetchTradeCount();
        playSound('/notifica.mp3');
        showSuccess("Hai ricevuto una nuova richiesta di scambio!");
      })
      .on('broadcast', { event: 'trade_accepted' }, (payload) => {
        fetchTradeCount();
        if (payload.payload?.trade_id) {
          setActiveTradeId(payload.payload.trade_id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trades' }, async (payload) => {
        fetchTradeCount();
        const { data } = await supabase.from('trades').select('status, sender_id, receiver_id').eq('id', payload.new.id).single();
        if (data && data.status === 'active' && (data.sender_id === userId || data.receiver_id === userId)) {
          setActiveTradeId(payload.new.id);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, () => {
        fetchTradeCount();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trades' }, () => {
        fetchTradeCount();
      })
      .subscribe();

    return () => {
      clearInterval(expireInterval);
      supabase.removeChannel(tradeSub);
    };
  }, [currentUser?.id]);

  // Event Listener locale per forzare l'apertura istantanea dello scambio
  useEffect(() => {
    const handleOpenTrade = (e: CustomEvent) => {
      setActiveTradeId(e.detail);
    };
    window.addEventListener('open_trade', handleOpenTrade as EventListener);
    return () => window.removeEventListener('open_trade', handleOpenTrade as EventListener);
  }, []);

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
      purchased_decorations: p.purchased_decorations || [],
      entrance_audio_url: p.entrance_audio_url || null,
      claimed_levels: p.claimed_levels || [],
      standard_chests: p.standard_chests || 0,
      premium_chests: p.premium_chests || 0
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
    if (!user?.id) return;

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
  }, [user?.id]);

  // Listener Realtime per la tabella Profiles e Channels
  useEffect(() => {
    if (!user?.id) return;
    
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
            purchased_decorations: updatedProfile.purchased_decorations || [],
            entrance_audio_url: updatedProfile.entrance_audio_url || null,
            claimed_levels: updatedProfile.claimed_levels || [],
            standard_chests: updatedProfile.standard_chests || 0,
            premium_chests: updatedProfile.premium_chests || 0
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
        purchased_decorations: profile?.purchased_decorations || [],
        entrance_audio_url: profile?.entrance_audio_url || null,
        claimed_levels: profile?.claimed_levels || [],
        standard_chests: profile?.standard_chests || 0,
        premium_chests: profile?.premium_chests || 0
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

      // Fetch DMs
      const { data: dmsData } = await supabase
        .from('dm_channels')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
        
      if (dmsData && dmsData.length > 0) {
        const otherUserIds = dmsData.map(dm => dm.user1_id === user.id ? dm.user2_id : dm.user1_id);
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', otherUserIds);
        
        const formattedDms: Channel[] = dmsData.map(dm => {
          const otherId = dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
          const p = profiles?.find(p => p.id === otherId);
          return {
            id: dm.id,
            name: p?.first_name || 'Utente',
            type: 'dm',
            category: 'DM',
            server_id: null,
            recipient: {
              id: otherId,
              name: p?.first_name || 'Utente',
              avatar: p?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`,
              status: 'offline', // Verrà aggiornato dinamicamente
              avatar_decoration: p?.avatar_decoration
            } as User
          };
        });
        setDmChannels(formattedDms);
      }
    };
    
    loadInitialData();
  }, [user, adminId, moderatorIds]);

  // Listener per nuovi DM
  useEffect(() => {
    if (!user?.id) return;
    
    const dmSub = supabase.channel('dm_channels_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_channels' }, async (payload) => {
        const dm = payload.new;
        if (dm.user1_id === user.id || dm.user2_id === user.id) {
          const otherId = dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
          const { data: p } = await supabase.from('profiles').select('*').eq('id', otherId).single();
          const newDm: Channel = {
            id: dm.id,
            name: p?.first_name || 'Utente',
            type: 'dm',
            category: 'DM',
            server_id: null,
            recipient: {
              id: otherId,
              name: p?.first_name || 'Utente',
              avatar: p?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`,
              status: 'offline',
              avatar_decoration: p?.avatar_decoration
            } as User
          };
          setDmChannels(prev => {
            if (prev.some(d => d.id === newDm.id)) return prev;
            return [...prev, newDm];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dmSub);
    };
  }, [user?.id]);

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
      // Se siamo in home, non resettare activeChannel se è un DM o un tab speciale
      if (activeChannel && activeChannel.server_id !== null) {
        setActiveChannel(null);
      }
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

  const handleCreateServer = async (name: string, description: string, imageFile: File | null, audioFile: File | Blob | null, isPrivate: boolean) => {
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
        audio_url,
        is_private: isPrivate
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

  const handleRequestJoinServer = async (server: Server) => {
    if (!currentUser) return;

    const { data: existing } = await supabase
      .from('server_join_requests')
      .select('id')
      .eq('server_id', server.id)
      .eq('user_id', currentUser.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      showError("Hai già inviato una richiesta per questo server.");
      return;
    }

    const { error } = await supabase.from('server_join_requests').insert({
      server_id: server.id,
      user_id: currentUser.id,
      status: 'pending'
    });

    if (error) {
      showError("Errore durante l'invio della richiesta.");
    } else {
      showSuccess("Richiesta inviata con successo! Attendi l'approvazione.");
    }
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

  const handleUpdateServer = async (id: string, name: string, description: string, imageFile: File | null, audioFile: File | Blob | null | undefined, isPrivate: boolean) => {
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

    const { error } = await supabase.from('servers').update({ name, description, icon_url, audio_url, is_private: isPrivate }).eq('id', id);
    if (error) {
      showError("Impossibile aggiornare il server");
      setIsUpdatingServer(false);
      return;
    }
    
    setServers(servers.map(s => s.id === id ? { ...s, name, description, icon_url: icon_url || s.icon_url, audio_url, is_private: isPrivate } : s));
    setShowSettingsModal(false);
    showSuccess("Impostazioni salvate con successo!");
    setIsUpdatingServer(false);
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!currentUser) return;
    
    setIsUpdatingServer(true);
    
    const { error } = await supabase.from('servers').delete().eq('id', serverId);
    
    if (error) {
      showError("Impossibile eliminare il server. Assicurati di avere i permessi.");
      setIsUpdatingServer(false);
      return;
    }
    
    setServers(servers.filter(s => s.id !== serverId));
    setAllChannels(allChannels.filter(c => c.server_id !== serverId));
    setActiveServerId('home');
    setShowSettingsModal(false);
    showSuccess("Server eliminato con successo!");
    setIsUpdatingServer(false);
  };

  const handleUpdateProfile = async (nickname: string, bio: string, avatarFile: File | null, bannerColor: string, bannerFile: File | null | undefined, entranceAudioFile: File | Blob | null | undefined) => {
    if (!currentUser) return;

    let avatar_url = currentUser.avatar;
    let banner_url = currentUser.banner_url;
    let entrance_audio_url = currentUser.entrance_audio_url;

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

    if (entranceAudioFile !== undefined) {
      if (entranceAudioFile === null) {
        entrance_audio_url = null;
      } else {
        const fileExt = entranceAudioFile instanceof File ? entranceAudioFile.name.split('.').pop() : 'webm';
        const filePath = `entrance_audios/${currentUser.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('icons').upload(filePath, entranceAudioFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
          entrance_audio_url = data.publicUrl;
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
        banner_url: banner_url || null,
        entrance_audio_url: entrance_audio_url || null
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
      banner_url: banner_url,
      entrance_audio_url: entrance_audio_url
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

  const handleStartDM = async (userId: string) => {
    if (!currentUser) return;

    // Controlla se esiste già un DM
    const existing = dmChannels.find(dm => dm.recipient?.id === userId);
    if (existing) {
      setActiveChannel(existing);
      return;
    }

    // Controlla nel DB
    let { data: existingDb } = await supabase
      .from('dm_channels')
      .select('*')
      .eq('user1_id', currentUser.id)
      .eq('user2_id', userId)
      .maybeSingle();

    if (!existingDb) {
      const { data: existingDb2 } = await supabase
        .from('dm_channels')
        .select('*')
        .eq('user1_id', userId)
        .eq('user2_id', currentUser.id)
        .maybeSingle();
      existingDb = existingDb2;
    }

    if (existingDb) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const newDm: Channel = {
        id: existingDb.id,
        name: p?.first_name || 'Utente',
        type: 'dm',
        category: 'DM',
        server_id: null,
        recipient: {
          id: userId,
          name: p?.first_name || 'Utente',
          avatar: p?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          status: onlineUserIds.has(userId) ? 'online' : 'offline',
          avatar_decoration: p?.avatar_decoration
        } as User
      };
      setDmChannels(prev => [...prev, newDm]);
      setActiveChannel(newDm);
    } else {
      // Crea nuovo DM
      const { data, error } = await supabase
        .from('dm_channels')
        .insert({ user1_id: currentUser.id, user2_id: userId })
        .select()
        .single();

      if (data) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const newDm: Channel = {
          id: data.id,
          name: p?.first_name || 'Utente',
          type: 'dm',
          category: 'DM',
          server_id: null,
          recipient: {
            id: userId,
            name: p?.first_name || 'Utente',
            avatar: p?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            status: onlineUserIds.has(userId) ? 'online' : 'offline',
            avatar_decoration: p?.avatar_decoration
          } as User
        };
        setDmChannels(prev => [...prev, newDm]);
        setActiveChannel(newDm);
      } else {
        showError("Errore durante la creazione della chat privata.");
      }
    }
  };

  if (!currentUser) {
    return <div className="h-screen w-full bg-[#313338] flex items-center justify-center text-[#dbdee1]">Caricamento profilo...</div>;
  }

  const currentMessages = activeChannel ? (messagesByChannel[activeChannel.id] || INITIAL_MESSAGES) : [];
  const canCreate = currentUser.global_role === 'ADMIN' || currentUser.global_role === 'CREATOR' || currentUser.global_role === 'MODERATOR';

  // Aggiorna lo stato online dei destinatari dei DM
  const dmChannelsWithStatus = dmChannels.map(dm => ({
    ...dm,
    recipient: dm.recipient ? {
      ...dm.recipient,
      status: onlineUserIds.has(dm.recipient.id) ? 'online' : 'offline'
    } : undefined
  }));

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
            dmChannels={dmChannelsWithStatus}
            activeChannelId={activeChannel?.id || ''} 
            onChannelSelect={(channel) => { setActiveChannel(channel); setShowSidebar(false); }} 
            currentUser={currentUser}
            onOpenSettings={() => setShowSettingsModal(true)}
            onLeaveServer={() => handleLeaveServer(activeServer!.id)}
            onOpenUserSettings={() => setShowUserSettingsModal(true)}
            serverPermissions={serverPermissions}
            notificationCount={hasUnreadNotifications ? notificationCount : 0}
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
          ) : activeChannel?.id === 'progression' ? (
            <Progression currentUser={currentUser} />
          ) : activeChannel?.id === 'daily-minigame' ? (
            <DailyMinigameView currentUser={currentUser} onToggleSidebar={() => setShowSidebar(true)} />
          ) : activeChannel?.id === 'friends' ? (
            <FriendsArea currentUser={currentUser} onStartDM={handleStartDM} onlineUserIds={onlineUserIds} />
          ) : activeChannel?.id === 'notifications' ? (
            <NotificationsView 
              currentUser={currentUser} 
              onToggleSidebar={() => setShowSidebar(true)} 
              onNavigateToShop={() => setActiveChannel({ id: 'shop', name: 'Cardi E-Shop', type: 'text', category: '', server_id: null })}
              onNavigateToMessage={handleNavigateToMessage}
              onNavigateToTrade={(id) => setActiveTradeId(id)}
            />
          ) : activeChannel?.type === 'dm' ? (
            <ChatArea 
              channel={activeChannel} 
              messages={currentMessages} 
              onSendMessage={handleSendMessage}
              onToggleMembers={() => {}}
              onToggleSidebar={() => setShowSidebar(true)}
              showMembers={false}
              serverMembers={[]}
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
          onRequestJoin={handleRequestJoinServer}
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