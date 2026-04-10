import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { MOCK_CHANNELS, INITIAL_MESSAGES, MOCK_USERS } from "@/data/mockData";
import { Message, User } from "@/types/discord";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { session, user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeChannel, setActiveChannel] = useState(MOCK_CHANNELS[0].channels[0]);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({
    [MOCK_CHANNELS[0].channels[0].id]: INITIAL_MESSAGES
  });
  const [showMembers, setShowMembers] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  // Redirect se non c'è sessione
  useEffect(() => {
    if (!loading && !session) {
      navigate('/login');
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#313338] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#b5bac1] font-medium">Connessione in corso...</p>
      </div>
    );
  }

  if (!session) return null;

  // Costruisci l'oggetto User reale in base ai dati di Supabase
  const realUser: User = {
    id: user?.id || 'u1',
    name: profile?.first_name 
      ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
      : user?.email?.split('@')[0] || 'Utente',
    avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
    status: 'online',
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      user: realUser,
      content,
      timestamp: `Oggi alle ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
    
    setMessagesByChannel(prev => ({
      ...prev,
      [activeChannel.id]: [...(prev[activeChannel.id] || []), newMessage]
    }));
  };

  const currentMessages = messagesByChannel[activeChannel.id] || [];

  return (
    <div className="flex h-screen w-full bg-[#313338] text-[#dbdee1] font-sans overflow-hidden">
      
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setShowSidebar(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <ServerSidebar />
        <ChannelSidebar 
          activeChannelId={activeChannel.id} 
          onChannelSelect={(channel) => {
            setActiveChannel(channel);
            setShowSidebar(false);
          }} 
          currentUser={realUser}
          onSignOut={signOut}
        />
      </div>

      <ChatArea 
        channel={activeChannel} 
        messages={currentMessages} 
        onSendMessage={handleSendMessage}
        onToggleMembers={() => setShowMembers(!showMembers)}
        onToggleSidebar={() => setShowSidebar(true)}
      />
      
      <div className={`hidden lg:block h-full transition-all ${showMembers ? 'w-[240px]' : 'w-0 overflow-hidden'}`}>
        <MemberList users={[realUser, ...MOCK_USERS.filter(u => u.id !== 'u1')]} isOpen={showMembers} />
      </div>
    </div>
  );
};

export default Index;