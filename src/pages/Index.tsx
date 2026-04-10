import React, { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { DiscoverServersModal, CreateServerModal } from "@/components/discord/ServerModals";
import { INITIAL_MESSAGES, MOCK_USERS } from "@/data/mockData";
import { Message, User, Server, Channel } from "@/types/discord";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

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
  
  // States per UI
  const [showMembers, setShowMembers] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Caricamento dati iniziali (Profilo, Server uniti, Canali)
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      // 1. Carica Profilo
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const loadedUser: User = {
        id: user.id,
        name: profile?.first_name || user.email?.split('@')[0] || "Utente",
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        status: "online",
        global_role: profile?.global_role || "CREATOR"
      };
      setCurrentUser(loadedUser);

      // 2. Carica Server di cui l'utente fa parte
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

  // Seleziona automaticamente il primo canale quando si cambia server
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

  // Invio messaggio (per ora solo in memoria, step successivo sarà scriverlo su DB)
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

  // Creazione di un Server sul Database Reale
  const handleCreateServer = async (name: string) => {
    if (!currentUser) return;
    
    // 1. Inserisci il server
    const { data: newServer, error: serverError } = await supabase
      .from('servers')
      .insert({
        name,
        created_by: currentUser.id,
        description: "Il tuo nuovo server privato.",
        icon_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`
      })
      .select()
      .single();

    if (serverError || !newServer) {
      showError("Errore durante la creazione del server");
      return;
    }

    // 2. Aggiungi l'utente ai membri del server
    await supabase.from('server_members').insert({ server_id: newServer.id, user_id: currentUser.id });

    // 3. Crea il canale testuale di default
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

    // Aggiorna la UI
    setServers([...servers, newServer]);
    if (newChannel) setAllChannels([...allChannels, newChannel]);
    setActiveServerId(newServer.id);
    showSuccess("Server creato con successo!");
  };

  // Unisciti a un server esistente
  const handleJoinServer = async (server: Server) => {
    if (!currentUser) return;

    const { error } = await supabase.from('server_members').insert({ server_id: server.id, user_id: currentUser.id });
    if (error) {
      showError("Errore durante l'unione al server");
      return;
    }

    // Carica i canali del server a cui ci siamo appena uniti
    const { data: newChannels } = await supabase.from('channels').select('*').eq('server_id', server.id);
    
    setServers([...servers, server]);
    if (newChannels) setAllChannels([...allChannels, ...newChannels]);
    setActiveServerId(server.id);
    showSuccess(`Ti sei unito a ${server.name}!`);
  };

  // Esplora Server (Carica tutti i server pubblici dal DB)
  const handleOpenDiscover = async () => {
    const { data } = await supabase.from('servers').select('*');
    if (data) setPublicServers(data);
    setShowDiscoverModal(true);
  };

  if (!currentUser) {
    return <div className="h-screen w-full bg-[#313338] flex items-center justify-center text-[#dbdee1]">Caricamento profilo...</div>;
  }

  const currentMessages = activeChannel ? (messagesByChannel[activeChannel.id] || INITIAL_MESSAGES) : [];
  const currentUsersList = [...MOCK_USERS.filter(u => u.id !== 'u1'), currentUser];

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
        />
        
        {activeServerId !== 'home' && activeServer ? (
          <ChannelSidebar 
            activeServer={activeServer}
            channels={allChannels}
            activeChannelId={activeChannel?.id || ''} 
            onChannelSelect={(channel) => { setActiveChannel(channel); setShowSidebar(false); }} 
            currentUser={currentUser}
          />
        ) : (
          <div className="w-[240px] bg-[#2b2d31] flex flex-col p-4 z-10 border-r border-[#1e1f22]">
            <h2 className="text-white font-bold text-lg mb-4">Amici</h2>
            <div className="text-[#949ba4] text-sm">Presto potrai gestire i tuoi amici qui! Per ora, unisciti a un Server dalla lista a sinistra o esplora la bussola.</div>
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
          />
          <div className={`hidden lg:block h-full transition-all ${showMembers ? 'w-[240px]' : 'w-0 overflow-hidden'}`}>
            <MemberList users={currentUsersList} isOpen={showMembers} />
          </div>
        </>
      ) : activeServerId === 'home' ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-8 text-center">
          <img src="https://api.dicebear.com/7.x/shapes/svg?seed=wumpus" className="w-64 h-64 opacity-50 mb-8" alt="Wumpus" />
          <h2 className="text-[#949ba4] text-xl font-medium">Nessuno in linea per ora...</h2>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">Nessun canale disponibile</div>
      )}

      {/* Modals */}
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
      />
    </div>
  );
};

export default Index;