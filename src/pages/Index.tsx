"use client";

import React, { useState, useEffect } from 'react';
import { ChannelSidebar } from '@/components/discord/ChannelSidebar';
import { ChatArea } from '@/components/discord/ChatArea';
import { ServerSidebar } from '@/components/discord/ServerSidebar';
import { FriendsArea } from '@/components/discord/FriendsArea';
import { WelcomeScreen } from '@/components/discord/WelcomeScreen';
import { DirectMessageArea } from '@/components/discord/DirectMessageArea';
import { NotificationsArea } from '@/components/discord/NotificationsArea';
import { CardiShop } from '@/components/discord/CardiShop';
import { Inventory } from '@/components/discord/Inventory';
import { ProgressionArea } from '@/components/discord/ProgressionArea';
import { DailyMinigame } from '@/components/discord/DailyMinigame';
import { SharedFilesArea } from '@/components/discord/SharedFilesArea';
import { PataParty } from '@/components/discord/PataParty'; // IMPORT AGGIUNTO
import { Server, Channel, User, ServerPermissions } from '@/types/discord';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ServerSettingsModal } from '@/components/discord/ServerSettingsModal';
import { UserSettingsModal } from '@/components/discord/UserSettingsModal';
import { InviteModal } from '@/components/discord/InviteModal';

const Index = () => {
  const { user: currentUser } = useAuth();
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string>('home');
  const [activeDM, setActiveDM] = useState<Channel | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [serverPermissions, setServerPermissions] = useState<ServerPermissions | undefined>(undefined);

  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    let isMounted = true;
    
    const fetchFriendsAndDms = async () => {
      // 1. Prendi tutte le amicizie accettate per questo utente
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (!friendships || friendships.length === 0) {
        if (isMounted) setDmChannels([]);
        return;
      }

      // Estrai gli ID degli amici
      const friendIds = friendships.map(f => f.sender_id === currentUser.id ? f.receiver_id : f.sender_id);

      // 2. Prendi i profili degli amici
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, avatar_url, avatar_decoration')
        .in('id', friendIds);

      // 3. Cerca o crea i canali DM per queste amicizie
      const { data: existingDms } = await supabase
        .from('dm_channels')
        .select('*')
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

      const dmsWithProfiles: Channel[] = [];

      for (const friendId of friendIds) {
        const friendProfile = profiles?.find(p => p.id === friendId);
        if (!friendProfile) continue;

        // Cerca se esiste già un canale DM con questo amico
        let dm = existingDms?.find(d => 
          (d.user1_id === currentUser.id && d.user2_id === friendId) ||
          (d.user1_id === friendId && d.user2_id === currentUser.id)
        );

        // Se non esiste, in una vera app lo creeremmo ora, ma per semplicità
        // qui simuliamo solo l'oggetto Channel se non c'è, per mostrarlo nella UI.
        // La creazione effettiva del record in `dm_channels` avverrà quando viene inviato il primo messaggio (vedi DirectMessageArea).
        const channelId = dm?.id || `dm-${friendId}`; 

        dmsWithProfiles.push({
          id: channelId,
          name: friendProfile.first_name || 'Utente',
          type: 'text',
          category: 'Messaggi Diretti',
          server_id: null,
          recipient: {
            id: friendProfile.id,
            name: friendProfile.first_name || 'Utente',
            avatar: friendProfile.avatar_url || '',
            status: 'online',
            avatar_decoration: friendProfile.avatar_decoration
          }
        });
      }

      if (isMounted) setDmChannels(dmsWithProfiles);
    };

    fetchFriendsAndDms();

    // Sottoscrizione ai cambiamenti delle amicizie per aggiornare i DM in tempo reale
    const sub = supabase.channel('public:friendships-dm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, fetchFriendsAndDms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_channels' }, fetchFriendsAndDms)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(sub);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    let isMounted = true;
    
    const fetchNotifications = async () => {
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending');
        
      if (isMounted) setNotificationCount(count || 0);
    };

    fetchNotifications();

    const sub = supabase.channel('friendships-count')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friendships',
        filter: `receiver_id=eq.${currentUser.id}`
      }, fetchNotifications)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(sub);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!activeServer || !currentUser) {
      setServerPermissions(undefined);
      return;
    }

    const checkPermissions = async () => {
      const isOwner = activeServer.created_by === currentUser.id;
      
      if (isOwner) {
        setServerPermissions({
          can_manage_channels: true,
          can_delete_messages: true,
          can_use_commands: true,
          can_manage_server: true,
          can_manage_roles: true,
          can_manage_users: true,
          can_bypass_restrictions: true,
          can_kick_members: true,
          can_ban_members: true,
          can_assign_roles: true
        });
        return;
      }

      const { data: rolesData } = await supabase
        .from('server_member_roles')
        .select(`
          role_id,
          server_roles (*)
        `)
        .eq('server_id', activeServer.id)
        .eq('user_id', currentUser.id);

      if (rolesData && rolesData.length > 0) {
        const mergedPerms: ServerPermissions = {
          can_manage_channels: false,
          can_delete_messages: false,
          can_use_commands: false,
          can_manage_server: false,
          can_manage_roles: false,
          can_manage_users: false,
          can_bypass_restrictions: false,
          can_kick_members: false,
          can_ban_members: false,
          can_assign_roles: false
        };

        rolesData.forEach((r: any) => {
          const role = r.server_roles;
          if (!role) return;
          
          Object.keys(mergedPerms).forEach(key => {
            if (role[key] === true) {
              (mergedPerms as any)[key] = true;
            }
          });
        });

        setServerPermissions(mergedPerms);
      } else {
        setServerPermissions({
          can_manage_channels: false,
          can_delete_messages: false,
          can_use_commands: false,
          can_manage_server: false,
          can_manage_roles: false,
          can_manage_users: false,
          can_bypass_restrictions: false,
          can_kick_members: false,
          can_ban_members: false,
          can_assign_roles: false
        });
      }
    };

    checkPermissions();
  }, [activeServer, currentUser]);

  const handleServerSelect = (server: Server | null) => {
    setActiveServer(server);
    setActiveDM(null);
    if (!server) {
      setActiveChannelId('home');
      setChannels([]);
    } else {
      setActiveChannelId('');
      fetchChannels(server.id);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    if (channel.id === 'home' || channel.id === 'friends' || channel.id === 'shop' || channel.id === 'inventory' || channel.id === 'progression' || channel.id === 'daily-minigame' || channel.id === 'notifications' || channel.id === 'shared-files' || channel.id === 'pataparty') {
      setActiveServer(null);
      setActiveChannelId(channel.id);
      setActiveDM(null);
    } else if (channel.server_id === null && channel.recipient) {
      setActiveServer(null);
      setActiveChannelId(channel.id);
      setActiveDM(channel);
    } else {
      setActiveChannelId(channel.id);
      setActiveDM(null);
    }
    
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const fetchChannels = async (serverId: string) => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('server_id', serverId)
      .order('position', { ascending: true });
      
    if (data && data.length > 0) {
      setChannels(data as Channel[]);
      const firstTextChannel = data.find(c => c.type === 'text' || c.type === 'minigame');
      if (firstTextChannel) {
        setActiveChannelId(firstTextChannel.id);
      }
    } else {
      setChannels([]);
      setActiveChannelId('');
    }
  };

  const activeChannel = activeServer 
    ? channels.find(c => c.id === activeChannelId) 
    : undefined;

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-[#1e1f22] overflow-hidden text-[#dbdee1] font-sans">
      <ServerSidebar 
        activeServerId={activeServer?.id} 
        onServerSelect={handleServerSelect} 
        currentUser={currentUser}
        notificationCount={notificationCount}
      />
      
      <div className={`
        fixed inset-y-0 left-[72px] z-40 transform transition-transform duration-300 ease-in-out
        md:relative md:left-0 md:transform-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <ChannelSidebar 
          activeServer={activeServer} 
          channels={channels}
          dmChannels={dmChannels}
          activeChannelId={activeChannelId}
          onChannelSelect={handleChannelSelect}
          currentUser={currentUser}
          onOpenSettings={() => setShowServerSettings(true)}
          serverPermissions={serverPermissions}
          notificationCount={notificationCount}
          onOpenUserSettings={() => setShowUserSettings(true)}
        />
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 bg-[#313338] relative">
        <div className="md:hidden flex items-center p-3 border-b border-[#1f2023] bg-[#313338] sticky top-0 z-20">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="text-[#dbdee1] p-1"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span className="ml-3 font-semibold truncate">
            {activeServer ? activeServer.name : 
             activeDM ? activeDM.name :
             activeChannelId === 'friends' ? 'Amici' : 
             activeChannelId === 'shop' ? 'Cardi E-Shop' : 
             activeChannelId === 'inventory' ? 'Inventario' :
             activeChannelId === 'progression' ? 'Progressione' :
             activeChannelId === 'daily-minigame' ? 'Minigioco Giornaliero' :
             activeChannelId === 'shared-files' ? 'File Condivisi' :
             activeChannelId === 'pataparty' ? 'PataParty!' :
             activeChannelId === 'notifications' ? 'Notifiche' : 'Home'}
          </span>
        </div>

        {activeServer ? (
          activeChannel ? (
            <ChatArea 
              channel={activeChannel} 
              currentUser={currentUser} 
              onOpenInvite={() => setShowInviteModal(true)}
              serverPermissions={serverPermissions}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#949ba4]">
              Seleziona un canale per iniziare a chattare
            </div>
          )
        ) : activeDM ? (
          <DirectMessageArea 
            channel={activeDM}
            currentUser={currentUser}
          />
        ) : activeChannelId === 'friends' ? (
          <FriendsArea currentUser={currentUser} />
        ) : activeChannelId === 'shop' ? (
          <CardiShop currentUser={currentUser} />
        ) : activeChannelId === 'inventory' ? (
          <Inventory currentUser={currentUser} />
        ) : activeChannelId === 'progression' ? (
          <ProgressionArea currentUser={currentUser} />
        ) : activeChannelId === 'daily-minigame' ? (
          <DailyMinigame currentUser={currentUser} />
        ) : activeChannelId === 'shared-files' ? (
          <SharedFilesArea currentUser={currentUser} />
        ) : activeChannelId === 'pataparty' ? (
          <PataParty currentUser={currentUser} />
        ) : activeChannelId === 'notifications' ? (
          <NotificationsArea currentUser={currentUser} />
        ) : (
          <WelcomeScreen currentUser={currentUser} />
        )}
      </main>

      {showServerSettings && activeServer && (
        <ServerSettingsModal 
          server={activeServer} 
          onClose={() => setShowServerSettings(false)}
          currentUser={currentUser}
        />
      )}

      {showUserSettings && (
        <UserSettingsModal
          currentUser={currentUser}
          onClose={() => setShowUserSettings(false)}
        />
      )}

      {showInviteModal && activeServer && (
        <InviteModal
          server={activeServer}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
};

export default Index;