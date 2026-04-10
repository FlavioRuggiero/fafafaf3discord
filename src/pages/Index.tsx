import React, { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { DiscoverServersModal, CreateServerModal, ServerSettingsModal } from "@/components/discord/ServerModals";
import { INITIAL_MESSAGES } from "@/data/mockData";
import { Message, User, Server, Channel } from "@/types/discord";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Menu, Home, MessageSquare, Compass, Plus, Mic, Headphones, LogOut } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  // States per UI
  const [showMembers, setShowMembers] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [isUpdatingServer, setIsUpdatingServer] = useState(false);

  // Calcola dinamicamente la lista dei membri con lo stato in tempo reale
  const serverMembersList: User[] = serverProfiles.map(p => {
    const isOnline = onlineUserIds.has(p.id) || p.id === currentUser?.id;
    const name = p.first_name || "Utente";
    const isVerifiedUser = name.toLowerCase() === 'faf3tto';

    return {
      id: p.id,
      name: name,
      avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
      status: isOnline ? "online" : "offline",
      global_role: isVerifiedUser ? "CREATOR" : "USER",
      bio: p.bio || "",
      digitalcardus: p.digitalcardus || 0
    };
  });

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Caricamento dati iniziali
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id);
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      const userName = profile?.first_name || user.email?.split('@')[0] || "Utente";
      const isVerifiedUser = userName.toLowerCase() === 'faf3tto';

      const loadedUser: User = {
        id: user.id,
        name: userName,
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        status: "online",
        global_role: isVerifiedUser ? "CREATOR" : "USER",
        bio: profile?.bio || "",
        digitalcardus: profile?.digitalcardus || 0
      };
      
      setCurrentUser(loadedUser);

      const { data: memberData } = await supabase.from('server_members').select('server_id').eq('user_id', user.id);
      const joinedServerIds = memberData?.map(m => m.server_id) || [];

      if (joinedServerIds.length > 0) {
        const { data: serversData } = await supabase.from('servers').select('*').in('id', joinedServerIds);
        if (serversData) setServers(serversData);

        const { data: channelsData } = await supabase.from('channels').select('*').in('server_id', joinedServerIds);
        if (channelsData) setAllChannels(channelsData);
      }
    };
    
    loadInitialData();
  }, [user]);

  // Caricamento profili membri del server corrente
  useEffect(() => {
    const fetchServerMembers = async () => {
      if (!activeServerId || activeServerId === 'home') {
        setServerProfiles([]);
        return;
      }
      
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
          
        if (profilesData) {
          setServerProfiles(profilesData);
        }
      }
    };

    fetchServerMembers();
  }, [activeServerId]);

  useEffect(() => {
    if (activeServerId !== 'home') {
      const newServerChannels = allChannels.filter(c => c.server_id === activeServerId);
      if (newServerChannels.length > 0) {
        setActiveChannel(newServerChannels[0]);
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
    
    const canCreate = currentUser.global_role === 'ADMIN' || currentUser.global_role === 'CREATOR';
    if (!canCreate) {
      showError("Non hai i permessi per creare un server. Serve un account verificato.");
      return;
    }

    setIsCreatingServer(true);
    
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

    await supabase.from('server_members').insert({ server_id: newServer.id, user_id: currentUser.id });

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

    const { error } = await supabase.from('server_members').insert({ server_id: server.id, user_id: currentUser.id });
    if (error) {
      showError("Errore durante l'unione al server");
      return;
    }

    const { data: newChannels } = await supabase.from('channels').select('*').eq('server_id', server.id);
    
    setServers([...servers, server]);
    if (newChannels) setAllChannels([...allChannels, ...newChannels]);
    setActiveServerId(server.id);
    showSuccess(`Ti sei unito a ${server.name}!`);
  };

  const handleLeaveServer = async (serverId: string) => {
    if (!currentUser) return;

    const { error } = await supabase
      .from('server_members')
      .delete()
      .eq('server_id', serverId)
      .eq('user_id', currentUser.id);

    if (error) {
      showError("Impossibile uscire dal server. Controlla i permessi.");
      return;
    }

    setServers(servers.filter(s => s.id !== serverId));
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
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (error) {
      showError("Impossibile eliminare il server");
      return;
    }
    setServers(servers.filter(s => s.id !== id));
    setActiveServerId('home');
    setShowSettingsModal(false);
    showSuccess("Server eliminato!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!currentUser) {
    return <div className="h-screen w-full bg-[#313338] flex items-center justify-center text-[#dbdee1]">Caricamento profilo...</div>;
  }

  const currentMessages = activeChannel ? (messagesByChannel[activeChannel.id] || INITIAL_MESSAGES) : [];
  const canCreate = currentUser.global_role === 'ADMIN' || currentUser.global_role === 'CREATOR';

  return (
    <div className="flex h-screen w-full bg-[#313338] text-[#dbdee1] font-sans overflow-hidden relative">
      
      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <ServerSidebar 
          servers={servers}
          activeServerId={activeServerId}
          onServerSelect={(id) => { setActiveServerId(id); setShowSidebar(false); }}
          onOpenCreate={() => setShowCreateModal(true)}
          onOpenDiscover={handleOpenDiscover}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        
        {activeServerId !== 'home' && activeServer ? (
          <ChannelSidebar 
            activeServer={activeServer}
            channels={allChannels}
            activeChannelId={activeChannel?.id || ''} 
            onChannelSelect={(channel) => { setActiveChannel(channel); setShowSidebar(false); }} 
            currentUser={currentUser}
            onOpenSettings={() => setShowSettingsModal(true)}
            onLeaveServer={() => handleLeaveServer(activeServer.id)}
          />
        ) : (
          <div className="w-[240px] bg-[#2b2d31] flex flex-col flex-shrink-0 z-10 border-r border-[#1e1f22]">
            <div className="h-12 flex items-center px-4 border-b border-[#1f2023] shadow-sm">
              <h1 className="font-semibold text-white">Dashboard</h1>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <h2 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Le tue attività</h2>
              <div className="text-[#949ba4] text-sm bg-[#1e1f22] p-3 rounded-lg border border-[#1f2023]">
                {canCreate 
                  ? "Per iniziare, esplora i server pubblici o creane uno tuo usando i pulsanti nella schermata principale!"
                  : "Per iniziare, esplora i server pubblici usando i pulsanti nella schermata principale!"}
              </div>
            </div>
            
            <div className="h-[52px] bg-[#232428] flex items-center px-2 flex-shrink-0">
              <div className="flex items-center hover:bg-[#3f4147] p-1 -ml-1 rounded cursor-pointer flex-1 min-w-0 mr-1">
                <div className="relative group/status cursor-default">
                  <img src={currentUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full bg-[#1e1f22]" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-[14px] h-[14px] rounded-full border-[3px] border-[#232428] bg-[#23a559]" />
                </div>
                <div className="ml-2 flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate leading-tight">{currentUser.name}</span>
                  <span className="text-[11px] text-[#dbdee1] truncate leading-tight">Online</span>
                </div>
              </div>
              
              <div className="flex items-center text-[#dbdee1]">
                <button className="p-1.5 hover:bg-[#3f4147] rounded transition-colors"><Mic size={18} /></button>
                <button className="p-1.5 hover:bg-[#3f4147] rounded transition-colors"><Headphones size={18} /></button>
              </div>
            </div>
          </div>
        )}
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
              <div className="w-20 h-20 bg-brand rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-3">
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
      />
    </div>
  );
};

export default Index;