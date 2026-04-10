import React, { useState } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { MOCK_CHANNELS, INITIAL_MESSAGES, MOCK_USERS, CURRENT_USER } from "@/data/mockData";
import { Message } from "@/types/discord";

const Index = () => {
  const [activeChannel, setActiveChannel] = useState(MOCK_CHANNELS[0].channels[0]);
  
  // Mappa per salvare i messaggi indipendentemente per ogni ID canale
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>({
    [MOCK_CHANNELS[0].channels[0].id]: INITIAL_MESSAGES
  });
  
  const [showMembers, setShowMembers] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false); // Per menu mobile

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      user: CURRENT_USER,
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
      
      {/* Overlay Sfondo per Mobile */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Container delle barre laterali (Responsive drawer su mobile) */}
      <div className={`fixed inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}>
        <ServerSidebar />
        <ChannelSidebar 
          activeChannelId={activeChannel.id} 
          onChannelSelect={(channel) => {
            setActiveChannel(channel);
            setShowSidebar(false); // Chiude la sidebar su mobile dopo aver selezionato
          }} 
        />
      </div>

      <ChatArea 
        channel={activeChannel} 
        messages={currentMessages} 
        onSendMessage={handleSendMessage}
        onToggleMembers={() => setShowMembers(!showMembers)}
        onToggleSidebar={() => setShowSidebar(true)}
      />
      
      {/* Nascosto su schermi piccoli, espandibile su schermi medi, sempre visibile su grandi */}
      <div className={`hidden lg:block h-full transition-all ${showMembers ? 'w-[240px]' : 'w-0 overflow-hidden'}`}>
        <MemberList users={MOCK_USERS} isOpen={showMembers} />
      </div>
    </div>
  );
};

export default Index;