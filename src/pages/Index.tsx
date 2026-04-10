import React, { useState } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { MOCK_CHANNELS, INITIAL_MESSAGES, MOCK_USERS } from "@/data/mockData";
import { Message, User as DiscordUser } from "@/types/discord";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user, profile } = useAuth();
  
  const [activeChannel, setActiveChannel] = useState(MOCK_CHANNELS[0].channels[0]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [showMembers, setShowMembers] = useState(true);

  // Creiamo l'oggetto utente Discord-like basato sull'utente loggato
  const currentUserObj: DiscordUser = {
    id: user?.id || 'u_temp',
    name: profile?.first_name || user?.email?.split('@')[0] || "Utente",
    avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
    status: "online"
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      user: currentUserObj,
      content,
      timestamp: `Oggi alle ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="flex h-screen w-full bg-[#313338] text-[#dbdee1] font-sans overflow-hidden">
      <ServerSidebar />
      <ChannelSidebar 
        activeChannelId={activeChannel.id} 
        onChannelSelect={setActiveChannel} 
      />
      <ChatArea 
        channel={activeChannel} 
        messages={messages} 
        onSendMessage={handleSendMessage}
        onToggleMembers={() => setShowMembers(!showMembers)}
      />
      <div className={`hidden lg:block h-full transition-all ${showMembers ? 'w-[240px]' : 'w-0 overflow-hidden'}`}>
        <MemberList users={[currentUserObj, ...MOCK_USERS.filter(u => u.id !== 'u1')]} isOpen={showMembers} />
      </div>
    </div>
  );
};

export default Index;