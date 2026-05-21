"use client";

import React, { useState, useEffect } from 'react';
import { ChannelSidebar } from '@/components/discord/ChannelSidebar';
import { ChatArea } from '@/components/discord/ChatArea';
import { ServerSidebar } from '@/components/discord/ServerSidebar';
import { FriendsArea } from '@/components/discord/FriendsArea';
import { WelcomeScreen } from '@/components/discord/WelcomeScreen';
import { NotificationsView } from '@/components/discord/NotificationsView';
import { ShopView } from '@/components/discord/ShopView';
import { InventoryView } from '@/components/discord/InventoryView';
import { Progression } from '@/components/discord/Progression';
import { DailyMinigameView } from '@/components/discord/DailyMinigameView';
import { SharedFilesView } from '@/components/discord/SharedFilesView';
import { PataParty } from '@/components/discord/PataParty';
import { Server, Channel, ServerPermissions } from '@/types/discord';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ServerSettingsModal } from '@/components/discord/ServerModals'; // Modificato questo import
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
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [serverPermissions, setServerPermissions] = useState<ServerPermissions | undefined>(undefined);

  const [notificationCount, setNotificationCount] = useState(0);

  // Presence per gli utenti online
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase.channel('global_presence', {
      config: { presence: { key: currentUser.id } }
    });
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineUserIds(new Set(Object.keys(state)));
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ status: 'online' });
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  // Gestione DM e Amicizie
  useEffect(() => {
    if (!currentUser?.id) return;
    let isMounted = true;
    
    const fetchFriendsAndDms = async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (!friendships || friendships.length === 0) {
        if (isMounted) setDmChannels([]);
        return;
      }

      const friendIds = friendships.map(f => f.sender_id === currentUser.id ? f.receiver_id : f.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, avatar_url, avatar_decoration').in('id', friendIds);
      const { data: existingDms } = await supabase.from('dm_channels').select('*').or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

      const dmsWithProfiles: Channel[] = [];

      for (const friendId of friendIds) {
        const friendProfile = profiles?.find(p => p.id === friendId);
        if (!friendProfile) continue;

        let dm = existingDms?.find(d => 
          (d.user1_id === currentUser.id && d.user2_id === friendId) ||
          (d.user1_id === friendId && d.user2_id === currentUser.id)
        );

        const channelId = dm?.id || `dm-${friendId}`; 

        dmsWithProfiles.push({
          id: channelId,
          name: friendProfile.first_name || 'Utente',
          type: 'dm',
          category: 'Messaggi Diretti',
          server_id: null,
          recipient: {
            id: friendProfile.id,
            name: friendProfile.first_name || 'Utente',
            avatar: friendProfile.avatar_url || '',
            status: onlineUserIds.has(friendProfile.id) ? 'online' : 'offline',
            avatar_decoration: friendProfile.avatar_decoration
          }
        });
      }

      if (isMounted) setDmChannels(dmsWithProfiles);
    };

    fetchFriendsAndDms();

    const sub = supabase.channel('public:friendships-dm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, fetchFriendsAndDms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_channels' }, fetchFriendsAndDms)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(sub);
    };
  }, [currentUser?.id, onlineUserIds]);

  // Gestione Notifiche
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

  // Gestione Permessi
  useEffect(() => {
    if (!activeServer || !currentUser) {
      setServerPermissions(undefined);
      return;
    }

    const checkPermissions = async () => {
      const isOwner = activeServer.created_by === currentUser.id;
      
      if (isOwner) {
        setServerPermissions({
          isOwner: true,
          can_manage_channels: true,
          can_delete_messages: true,
          can_use_commands: true,
          can_manage_server: true,
          can_manage_roles: true,
          can_assign_roles: true,
          can_bypass_restrictions: true,
          can_kick_members: true,
          can_ban_members: true
        });
        return;
      }

      const { data: rolesData } = await supabase
        .from('server_member_roles')
        .select(`role_id, server_roles (*)`)
        .eq('server_id', activeServer.id)
        .eq('user_id', currentUser.id);

      if (rolesData && rolesData.length > 0) {
        const mergedPerms: ServerPermissions = {
          isOwner: false,
          can_manage_channels: false,
          can_delete_messages: false,
          can_use_commands: false,
          can_manage_server: false,
          can_manage_roles: false,
          can_assign_roles: false,
          can_bypass_restrictions: false,
          can_kick_members: false,
          can_ban_members: false
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
          isOwner: false,
          can_manage_channels: false,
          can_delete_messages: false,
          can_use_commands: false,
          can_manage_server: false,
          can_manage_roles: false,
          can_assign_roles: false,
          can_bypass_restrictions: false,
          can_kick_members: false,
          can_ban_members: false
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
    if (['home', 'friends', 'shop', 'inventory', 'progression', 'daily-minigame', 'notifications', 'pataparty'].includes(channel.id)) {
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
    const { data } = await supabase
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

  const activeChannel = activeServer ? channels.find(c => c.id === activeChannelId) : undefined;

  const handleStartDM = (userId: string) => {
    const dm = dmChannels.find(d => d.recipient?.id === userId);
    if (dm) {
      handleChannelSelect(dm);
    } else {
      // Fallback
      handleChannelSelect({ id: `dm-${userId}`, name: 'Utente', type: 'dm', category: 'Messaggi Diretti', server_id: null, recipient: { id: userId, name: 'Utente', avatar: '', status: 'online' } });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-[#1e1f22] overflow-hidden text-[#dbdee1] font-sans">
      <ServerSidebar 
        activeServerId={activeServer?.id || 'home'} 
        servers={[]} // Props from context
        onServerSelect={handleServerSelect} 
        onOpenCreate={() => {}} // Handle create server
        onOpenDiscover={() => {}} // Handle discover
        currentUser={currentUser}
        onLogout={() => supabase.auth.signOut()}
        notificationSettings={{}}
        onSetNotificationSetting={() => {}}
        unreadServers={new Set()}
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
          <button onClick={() => setIsSidebarOpen(true)} className="text-[#dbdee1] p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
             activeChannelId === 'pataparty' ? 'PataParty!' :
             activeChannelId === 'notifications' ? 'Notifiche' : 'Home'}
          </span>
        </div>

        {activeServer ? (
          activeChannel ? (
            <ChatArea 
              channel={activeChannel} 
              messages={[]}
              onSendMessage={() => {}}
              onToggleMembers={() => {}}
              onToggleSidebar={() => setIsSidebarOpen(true)}
              serverPermissions={serverPermissions}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#949ba4]">
              Seleziona un canale per iniziare a chattare
            </div>
          )
        ) : activeDM ? (
          <ChatArea 
            channel={activeDM}
            messages={[]}
            onSendMessage={() => {}}
            onToggleMembers={() => {}}
            onToggleSidebar={() => setIsSidebarOpen(true)}
          />
        ) : activeChannelId === 'friends' ? (
          <FriendsArea currentUser={currentUser} onStartDM={handleStartDM} onlineUserIds={onlineUserIds} />
        ) : activeChannelId === 'shop' ? (
          <ShopView currentUser={currentUser} onToggleSidebar={() => setIsSidebarOpen(true)} />
        ) : activeChannelId === 'inventory' ? (
          <InventoryView currentUser={currentUser} onToggleSidebar={() => setIsSidebarOpen(true)} />
        ) : activeChannelId === 'progression' ? (
          <Progression currentUser={currentUser} />
        ) : activeChannelId === 'daily-minigame' ? (
          <DailyMinigameView currentUser={currentUser} onToggleSidebar={() => setIsSidebarOpen(true)} />
        ) : activeChannelId === 'pataparty' ? (
          <PataParty currentUser={currentUser} />
        ) : activeChannelId === 'notifications' ? (
          <NotificationsView 
            currentUser={currentUser} 
            onToggleSidebar={() => setIsSidebarOpen(true)} 
            onNavigateToShop={() => setActiveChannelId('shop')}
            onNavigateToMessage={() => {}}
            onNavigateToTrade={() => {}}
          />
        ) : (
          <WelcomeScreen currentUser={currentUser} />
        )}
      </main>

      {showServerSettings && activeServer && (
        <ServerSettingsModal 
          server={activeServer} 
          onClose={() => setShowServerSettings(false)}
          onUpdate={() => {}} // Add proper handlers
          onDelete={() => {}}
          serverPermissions={serverPermissions}
        />
      )}

      {showUserSettings && (
        <UserSettingsModal
          isOpen={showUserSettings}
          user={currentUser}
          onClose={() => setShowUserSettings(false)}
          onUpdate={async () => {}} // Handle user update
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