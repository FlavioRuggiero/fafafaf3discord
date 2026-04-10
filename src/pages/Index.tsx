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
  
  // States per UI
  const [showMembers, setShowMembers] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Caricamento dati iniziali
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const loadedUser: User = {
        id: user.id,
        name: profile?.first_name || user.email?.split('@')[0] || "Utente",
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        status: "online",
        global_role: profile?.global_role || "CREATOR"
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

  // Seleziona automaticamente il primo canale
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

  const handleCreateServer = async (name: string) => {
    if (!currentUser) return;
    
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

  const handleOpenDiscover = async () => {
    const { data } = await supabase.from('servers').select('*');
    if (data) setPublicServers(data);
    setShowDiscoverModal(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
          <div className="w-[240px] bg-[#2b2d31] flex flex-col flex-shrink-0 z-10 border-r border-[#1e1f22]">
            <div className="h-12 flex items-center px-4 border-b border-[#1f2023] shadow-sm">
              <h1 className="font-semibold text-white">Dashboard</h1>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <h2 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Le tue attività</h2>
              <div className="text-[#949ba4] text-sm bg-[#1e1f22] p-3 rounded-lg border border-[#1f2023]">
                Per iniziare, esplora i server pubblici o creane uno tuo usando i pulsanti nella schermata principale!
              </div>
            </div>
            
            {/* User Profile Block per la Home */}
            <div className="h-[52px] bg-[#232428] flex items-center px-2 flex-shrink-0">
              <div className="flex items-center hover:bg-[#3f4147] p-1 -ml-1 rounded cursor-pointer flex-1 min-w-0 mr-1">
                <div className="relative">
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
                <button onClick={handleLogout} title="Disconnetti" className="p-1.5 hover:bg-[#3f4147] rounded transition-colors text-[#f23f43] hover:text-white hover:bg-[#f23f43]"><LogOut size={18} /></button>
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
          />
          <div className={`hidden lg:block h-full transition-all ${showMembers ? 'w-[240px]' : 'w-0 overflow-hidden'}`}>
            <MemberList users={currentUsersList} isOpen={showMembers} />
          </div>
        </>
      ) : activeServerId === 'home' ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
          {/* Header per la Home (Essenziale per Mobile) */}
          <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center px-4 flex-shrink-0">
            <button onClick={() => setShowSidebar(true)} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
            <Home size={20} className="text-[#80848e] mr-2" />
            <h2 className="font-semibold text-white">Home</h2>
          </div>
          
          {/* Contenuto di Benvenuto */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
            <div className="max-w-xl w-full text-center">
              <div className="w-20 h-20 bg-brand rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-3">
                <MessageSquare size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Benvenuto, {currentUser.name}!</h1>
              <p className="text-[#b5bac1] mb-8 text-lg">Inizia subito a chattare unendoti a una community o creando il tuo server personale.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={handleOpenDiscover} className="flex flex-col items-center p-6 bg-[#2b2d31] hover:bg-[#35373c] rounded-xl border border-[#1e1f22] transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-[#23a559]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Compass size={24} className="text-[#23a559]" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Esplora Server</h3>
                  <p className="text-sm text-[#949ba4]">Trova community pubbliche</p>
                </button>
                
                <button onClick={() => setShowCreateModal(true)} className="flex flex-col items-center p-6 bg-[#2b2d31] hover:bg-[#35373c] rounded-xl border border-[#1e1f22] transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={24} className="text-brand" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Crea un Server</h3>
                  <p className="text-sm text-[#949ba4]">Avvia il tuo spazio privato</p>
                </button>
              </div>
            </div>
          </div>
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