import React, { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { DiscoverServersModal, CreateServerModal } from "@/components/discord/ServerModals";
import { MOCK_CHANNELS, INITIAL_MESSAGES, MOCK_USERS, MOCK_SERVERS } from "@/data/mockData";
import { Message, User, Server, Channel } from "@/types/discord";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // States per Server e Canali
  const [servers, setServers] = useState<Server[]>([MOCK_SERVERS[0]]);
  const [activeServerId, setActiveServerId] = useState<string>(MOCK_SERVERS[0].id);
  const [allChannels, setAllChannels] = useState<Channel[]>(MOCK_CHANNELS);
  
  // Trova il server attivo
  const activeServer = servers.find(s => s.id === activeServerId) || MOCK_SERVERS[0];
  
  // Canali del server attivo
  const serverChannels = allChannels.filter(c => c.server_id === activeServer.id);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(serverChannels[0] || null);

  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({
    [MOCK_CHANNELS[0].id]: INITIAL_MESSAGES
  });
  
  // States per UI
  const [showMembers, setShowMembers] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      const role = data?.global_role || "CREATOR"; // Default CREATOR per testare la creazione
      
      setCurrentUser({
        id: user.id,
        name: data?.first_name || user.email?.split('@')[0] || "Utente",
        avatar: data?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        status: "online",
        global_role: role as any
      });
    };
    
    fetchProfile();
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
    }
  }, [activeServerId, allChannels]);

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

  const handleCreateServer = (name: string) => {
    if (!currentUser) return;
    
    const newServer: Server = {
      id: `s${Date.now()}`,
      name,
      created_by: currentUser.id,
      description: "Il tuo nuovo server privato.",
      icon_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`
    };
    
    const newChannel: Channel = {
      id: `c${Date.now()}`,
      server_id: newServer.id,
      name: "generale",
      type: "text",
      category: "Chat Generale"
    };

    setServers([...servers, newServer]);
    setAllChannels([...allChannels, newChannel]);
    setActiveServerId(newServer.id);
  };

  const handleJoinServer = (server: Server) => {
    setServers([...servers, server]);
    setActiveServerId(server.id);
  };

  if (!currentUser) {
    return <div className="h-screen w-full bg-[#313338] flex items-center justify-center text-[#dbdee1]">Caricamento profilo...</div>;
  }

  const currentMessages = activeChannel ? (messagesByChannel[activeChannel.id] || []) : [];
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
          onOpenDiscover={() => setShowDiscoverModal(true)}
          currentUser={currentUser}
        />
        
        {activeServerId !== 'home' ? (
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
        servers={MOCK_SERVERS}
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