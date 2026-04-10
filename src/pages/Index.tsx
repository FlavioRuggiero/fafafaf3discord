import React, { useState } from "react";
import { ServerSidebar } from "@/components/discord/ServerSidebar";
import { ChannelSidebar } from "@/components/discord/ChannelSidebar";
import { ChatArea } from "@/components/discord/ChatArea";
import { MemberList } from "@/components/discord/MemberList";
import { MOCK_CHANNELS, INITIAL_MESSAGES, MOCK_USERS, CURRENT_USER } from "@/data/mockData";
import { Message } from "@/types/discord";

const Index = () => {
  const [activeChannel, setActiveChannel] = useState(MOCK_CHANNELS[0].channels[0]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [showMembers, setShowMembers] = useState(true);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      user: CURRENT_USER,
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
      {/* Hidden on small screens, togglable on medium, always visible on large if not explicitly hidden */}
      <div className={`hidden lg:block h-full transition-all ${showMembers ? 'w-[240px]' : 'w-0 overflow-hidden'}`}>
        <MemberList users={MOCK_USERS} isOpen={showMembers} />
      </div>
    </div>
  );
};

export default Index;