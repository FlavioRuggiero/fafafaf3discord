import React from "react";
import { Hash, Volume2, ChevronDown, Mic, Headphones, Settings, LogOut } from "lucide-react";
import { MOCK_CHANNELS } from "@/data/mockData";
import { Channel, User } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";

interface ChannelSidebarProps {
  activeChannelId: string;
  onChannelSelect: (channel: Channel) => void;
  currentUser: User;
}

export const ChannelSidebar = ({ activeChannelId, onChannelSelect, currentUser }: ChannelSidebarProps) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-[240px] bg-[#2b2d31] flex flex-col flex-shrink-0 z-10">
      {/* Server Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm cursor-pointer hover:bg-[#35373c] transition-colors">
        <h1 className="font-semibold text-white truncate">Dyad Community</h1>
        <ChevronDown size={18} className="text-[#dbdee1]" />
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
        {MOCK_CHANNELS.map((category, idx) => (
          <div key={idx}>
            <div className="flex items-center text-[#949ba4] hover:text-[#dbdee1] cursor-pointer mb-1 px-1">
              <ChevronDown size={12} className="mr-1" />
              <span className="text-xs font-semibold uppercase tracking-wider">{category.category}</span>
            </div>
            
            <div className="space-y-[2px]">
              {category.channels.map(channel => {
                const isActive = channel.id === activeChannelId;
                const Icon = channel.type === 'text' ? Hash : Volume2;
                
                return (
                  <div
                    key={channel.id}
                    onClick={() => onChannelSelect(channel)}
                    className={`flex items-center px-2 py-1.5 rounded cursor-pointer group ${
                      isActive 
                        ? 'bg-[#404249] text-white' 
                        : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                    } ${channel.unread && !isActive ? 'text-white font-medium' : ''}`}
                  >
                    <Icon size={18} className="mr-1.5 opacity-70" />
                    <span className="truncate">{channel.name}</span>
                    {channel.unread && !isActive && (
                      <div className="w-2 h-2 rounded-full bg-white ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Area */}
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
  );
};