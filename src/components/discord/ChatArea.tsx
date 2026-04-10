import React, { useState, useRef, useEffect } from "react";
import { Hash, Plus, Gift, FileText, Smile, Users } from "lucide-react";
import { Message, Channel } from "@/types/discord";
import { CURRENT_USER } from "@/data/mockData";

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onToggleMembers: () => void;
}

export const ChatArea = ({ channel, messages, onSendMessage, onToggleMembers }: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
      {/* Header */}
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center min-w-0">
          <Hash size={24} className="text-[#80848e] mr-2" />
          <h2 className="font-semibold text-white truncate">{channel.name}</h2>
        </div>
        <div className="flex items-center text-[#b5bac1]">
          <button onClick={onToggleMembers} className="p-1 hover:text-[#dbdee1] transition-colors lg:hidden block">
            <Users size={24} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Welcome Section */}
        <div className="mb-8 mt-4">
          <div className="w-16 h-16 bg-[#41434a] rounded-full flex items-center justify-center mb-4 text-white">
            <Hash size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Benvenuto in #{channel.name}!</h1>
          <p className="text-[#b5bac1]">Questo è l'inizio del canale <span className="font-medium text-[#dbdee1]">#{channel.name}</span>.</p>
        </div>

        {messages.map((msg, idx) => {
          const isSameUserAsPrevious = idx > 0 && messages[idx - 1].user.id === msg.user.id;
          
          return (
            <div key={msg.id} className="group flex items-start hover:bg-[#2e3035] -mx-4 px-4 py-1 rounded">
              {!isSameUserAsPrevious ? (
                <img src={msg.user.avatar} alt={msg.user.name} className="w-10 h-10 rounded-full mr-4 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity" />
              ) : (
                <div className="w-10 mr-4 text-xs text-[#949ba4] opacity-0 group-hover:opacity-100 text-right pt-1 select-none">
                  {msg.timestamp.split(' ')[2]}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {!isSameUserAsPrevious && (
                  <div className="flex items-baseline">
                    <span className="font-medium text-[#dbdee1] mr-2 cursor-pointer hover:underline">{msg.user.name}</span>
                    <span className="text-xs text-[#949ba4]">{msg.timestamp}</span>
                  </div>
                )}
                <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 pt-0 flex-shrink-0">
        <div className="bg-[#383a40] rounded-lg flex items-center px-4 py-2.5">
          <button className="w-6 h-6 rounded-full bg-[#b5bac1] hover:bg-[#dbdee1] text-[#383a40] flex items-center justify-center mr-4 transition-colors">
            <Plus size={16} />
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Invia un messaggio in #${channel.name}`}
            className="flex-1 bg-transparent border-none outline-none text-[#dbdee1] placeholder-[#80848e]"
          />
          
          <div className="flex items-center text-[#b5bac1] space-x-3 ml-2">
            <button className="hover:text-[#dbdee1] transition-colors"><Gift size={22} /></button>
            <button className="hover:text-[#dbdee1] transition-colors"><FileText size={22} /></button>
            <button className="hover:text-[#dbdee1] transition-colors"><Smile size={22} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};