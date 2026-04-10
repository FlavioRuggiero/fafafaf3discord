import React, { useState, useEffect } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { MOCK_CHANNELS, INITIAL_MESSAGES, MOCK_USERS } from "@/data/mockData";
import { Message, User } from "@/types/discord";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeChannel, setActiveChannel] = useState(MOCK_CHANNELS[0].channels[0]);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({
    [MOCK_CHANNELS[0].channels[0].id]: INITIAL_MESSAGES
  });
  
  const [showMembers, setShowMembers] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  // Fetch real user profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (!error && data) {
        setCurrentUser({
          id: user.id,
          name: data.first_name || user.email?.split('@')[0] || "Utente",
          avatar: data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          status: "online"
        });
      } else {
        // Fallback in case profile doesn't exist yet
        setCurrentUser({
          id: user.id,
          name: user.email?.split('@')[0] || "Utente",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          status: "online"
        });
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleSendMessage = (content: string) => {
    if (!currentUser) return;
    
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

  if (!currentUser) {
    return <div className="h-screen w-full bg-[#313338] flex items-center justify-center text-[#dbdee1]">Caricamento profilo...</div>;
  }

  const currentMessages = messagesByChannel[activeChannel.id] || [];
  
  // Aggiungiamo l'utente corrente alla lista dei mock members se non è presente
  const currentUsersList = [...MOCK_USERS.filter(u => u.id !== 'u1'), currentUser];

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
          currentUser={currentUser}
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
        <MemberList users={currentUsersList} isOpen={showMembers} />
      </div>
    </div>
  );
};

export default Index;