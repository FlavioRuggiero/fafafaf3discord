"use client";

import React, { useState, useRef, useEffect } from "react";
import { Hash, Users, Menu, Volume2 } from "lucide-react";
import * as HoverCard from "@radix-ui/react-hover-card";
import { Message, Channel, User } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";

// Componente helper per mostrare la card del profilo al passaggio del mouse
const ProfileHoverCard = ({ user, children }: { user: User, children: React.ReactNode }) => {
  const isAdmin = user.global_role === 'ADMIN' || user.global_role === 'CREATOR';
  
  return (
    <HoverCard.Root openDelay={250} closeDelay={150}>
      <HoverCard.Trigger asChild>
        {children}
      </HoverCard.Trigger>
      
      <HoverCard.Portal>
        <HoverCard.Content 
          side="right" 
          align="start" 
          sideOffset={16} 
          collisionPadding={20}
          className="w-[300px] p-0 bg-[#111214] border border-[#1e1f22] text-[#dbdee1] shadow-2xl overflow-hidden rounded-lg z-[99999] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div 
            className="h-[60px] relative flex-shrink-0 bg-cover bg-center"
            style={{ 
              backgroundColor: user.banner_color || '#5865F2',
              backgroundImage: user.banner_url ? `url(${user.banner_url})` : undefined
            }}
          >
            <div className="absolute -bottom-10 left-4 rounded-full border-[6px] border-[#111214] bg-[#111214]">
              <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
            </div>
          </div>
          
          <div className="p-4 pt-12 pb-5">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-lg font-bold text-white leading-tight">{user.name}</h3>
              {isAdmin && (
                <span className="text-[10px] font-bold text-white border border-[#f23f43] rounded px-1.5 py-[2px] leading-none tracking-wide">
                  ADMIN
                </span>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#2b2d31]">
              <h4 className="text-[11px] font-bold uppercase text-[#b5bac1] mb-2 tracking-wider">Su di me</h4>
              {user.bio ? (
                <p className="text-[13px] text-[#dbdee1] whitespace-pre-wrap leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-[13px] text-[#949ba4] italic">Nessuna biografia impostata.</p>
              )}
            </div>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};


interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onToggleMembers: () => void;
  onToggleSidebar: () => void;
  showMembers?: boolean;
}

export const ChatArea = ({ channel, messages: propMessages, onSendMessage, onToggleMembers, onToggleSidebar, showMembers }: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState("");
  const [realMessages, setRealMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const typingChannelRef = useRef<any>(null);
  const lastTypingStatus = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isLoading) scrollToBottom();
  }, [realMessages, propMessages, typingUsers, isLoading]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Recupero dell'utente corrente e del suo profilo esteso
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, bio, banner_color, banner_url')
          .eq('id', session.user.id)
          .single();
        setCurrentUserProfile(profile);
      }
    };
    fetchUser();
  }, []);

  // Recupero storico messaggi e iscrizione Realtime con profili estesi
  useEffect(() => {
    if (!channel?.id) return;
    
    setIsLoading(true);
    setRealMessages([]);

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles(id, first_name, last_name, avatar_url, bio, banner_color, banner_url)
        `)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn("Tabella messages non trovata. Utilizzo messaggi di fallback.");
        setTableExists(false);
        setIsLoading(false);
        return;
      }

      setTableExists(true);
      if (data) {
        const formatted = data.map((m: any) => {
          const name = m.profiles ? `${m.profiles.first_name || ''} ${m.profiles.last_name || ''}`.trim() || 'Utente' : 'Utente';
          const isVerified = name.toLowerCase() === 'faf3tto';
          
          return {
            id: m.id,
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user: {
              id: m.profiles?.id || m.user_id,
              name: name,
              avatar: m.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`,
              bio: m.profiles?.bio || "",
              banner_color: m.profiles?.banner_color || "#5865F2",
              banner_url: m.profiles?.banner_url || undefined,
              global_role: isVerified ? "CREATOR" : "USER",
              status: "online" as const
            }
          };
        });
        setRealMessages(formatted);
      }
      setIsLoading(false);
    };

    fetchMessages();

    if (!tableExists) return;

    // Sottoscrizione realtime ai messaggi
    const channelSubscription = supabase
      .channel(`messages:${channel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channel.id}`
      }, async (payload) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, bio, banner_color, banner_url')
          .eq('id', payload.new.user_id)
          .single();
          
        const name = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Utente' : 'Utente';
        const isVerified = name.toLowerCase() === 'faf3tto';

        const newMsg: Message = {
          id: payload.new.id,
          content: payload.new.content,
          timestamp: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user: {
            id: payload.new.user_id,
            name: name,
            avatar: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.user_id}`,
            bio: profileData?.bio || "",
            banner_color: profileData?.banner_color || "#5865F2",
            banner_url: profileData?.banner_url || undefined,
            global_role: isVerified ? "CREATOR" : "USER",
            status: "online"
          }
        };
        
        setRealMessages(prev => {
          const isTemp = prev.some(m => m.id.startsWith('temp-') && m.content === newMsg.content && m.user.id === newMsg.user.id);
          if (isTemp) {
            return prev.map(m => (m.id.startsWith('temp-') && m.content === newMsg.content && m.user.id === newMsg.user.id) ? newMsg : m);
          }
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [channel?.id, tableExists]);

  // Ascolto Presence (chi sta scrivendo)
  useEffect(() => {
    if (!channel?.id || !currentUser?.id) return;

    const room = supabase.channel(`typing:${channel.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    room
      .on('presence', { event: 'sync' }, () => {
        const state = room.presenceState();
        const typing: Record<string, string> = {};
        
        for (const [key, presences] of Object.entries(state)) {
          const presence = presences[0] as any;
          if (presence?.isTyping && key !== currentUser.id) {
            typing[key] = presence.userName;
          }
        }
        setTypingUsers(typing);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          typingChannelRef.current = room;
        }
      });

    return () => {
      supabase.removeChannel(room);
      typingChannelRef.current = null;
      lastTypingStatus.current = false;
      setTypingUsers({});
    };
  }, [channel?.id, currentUser?.id]);

  const setTypingStatus = async (isTyping: boolean) => {
    if (!typingChannelRef.current || !currentUser) return;
    
    if (lastTypingStatus.current === isTyping) return;
    
    lastTypingStatus.current = isTyping;

    try {
      if (isTyping) {
        const userName = currentUserProfile ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() || 'Utente' : 'Utente';
        await typingChannelRef.current.track({ isTyping: true, userName });
      } else {
        await typingChannelRef.current.untrack();
      }
    } catch (err) {
      console.error("Errore aggiornamento typing presence:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.length > 0) {
      setTypingStatus(true);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(false);
      }, 3000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTypingStatus(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      const content = inputValue.trim();
      setInputValue("");
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTypingStatus(false); 

      if (currentUser && channel && tableExists) {
        const tempId = `temp-${Date.now()}`;
        const userName = currentUserProfile ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() || 'Utente' : 'Utente';
        const isVerified = userName.toLowerCase() === 'faf3tto';
        
        const optimisticMsg: Message = {
          id: tempId,
          content: content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user: { 
            id: currentUser.id, 
            name: userName, 
            avatar: currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
            bio: currentUserProfile?.bio || "",
            banner_color: currentUserProfile?.banner_color || "#5865F2",
            banner_url: currentUserProfile?.banner_url || undefined,
            global_role: isVerified ? "CREATOR" : "USER",
            status: "online"
          }
        };
        
        setRealMessages(prev => [...prev, optimisticMsg]);

        const { data, error } = await supabase.from('messages').insert({
          channel_id: channel.id,
          user_id: currentUser.id,
          content: content
        }).select().single();
        
        if (error) {
          console.error("Errore durante l'invio:", error);
          setRealMessages(prev => prev.filter(m => m.id !== tempId));
        } else if (data) {
          setRealMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m));
        }
      } else {
        onSendMessage(content);
      }
    }
  };

  const displayMessages = isLoading ? [] : (tableExists ? realMessages : propMessages);

  const typingNames = Object.values(typingUsers);
  let typingText = "";
  if (typingNames.length === 1) {
    typingText = `${typingNames[0]} sta scrivendo...`;
  } else if (typingNames.length === 2) {
    typingText = `${typingNames[0]} e ${typingNames[1]} stanno scrivendo...`;
  } else if (typingNames.length > 2) {
    typingText = "Più utenti stanno scrivendo...";
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
      {/* Header */}
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors flex-shrink-0">
            <Menu size={24} />
          </button>
          
          {channel.type === 'text' ? (
            <Hash size={24} className="text-[#80848e] mr-2 flex-shrink-0" />
          ) : (
            <Volume2 size={24} className="text-[#80848e] mr-2 flex-shrink-0" />
          )}
          <h2 className="font-semibold text-white truncate min-w-0">{channel.name}</h2>
        </div>
        <div className="flex items-center text-[#b5bac1] flex-shrink-0 ml-4">
          <button 
            onClick={onToggleMembers} 
            className={`p-1 transition-colors ${showMembers ? 'text-white' : 'hover:text-[#dbdee1]'}`}
            title="Alterna Elenco Membri"
          >
            <Users size={24} />
          </button>
        </div>
      </div>

      {channel.type === 'voice' && (
        <div className="bg-[#23a559]/10 border-b border-[#23a559]/20 p-2 px-4 flex items-center text-[#23a559]">
          <Volume2 size={16} className="mr-2" />
          <span className="font-medium text-sm">Connesso alla chat vocale. Questa è anche la chat testuale del canale.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-w-0 flex flex-col relative">
        <div className="mb-8 mt-4">
          <div className="w-16 h-16 bg-[#41434a] rounded-full flex items-center justify-center mb-4 text-white">
            {channel.type === 'text' ? <Hash size={32} /> : <Volume2 size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Benvenuto in {channel.type === 'text' ? '#' : ''}{channel.name}!</h1>
          <p className="text-[#b5bac1]">Questo è l'inizio del canale <span className="font-medium text-[#dbdee1]">{channel.type === 'text' ? '#' : ''}{channel.name}</span>.</p>
        </div>

        {isLoading && (
          <div className="flex justify-center my-4">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin opacity-70"></div>
          </div>
        )}

        {!isLoading && displayMessages.map((msg, idx) => {
          const isSameUserAsPrevious = idx > 0 && displayMessages[idx - 1].user.id === msg.user.id;
          
          return (
            <div key={msg.id} className={`group flex items-start hover:bg-[#2e3035] -mx-4 px-4 py-0.5 rounded ${isSameUserAsPrevious ? 'mt-0' : 'mt-4'}`}>
              {!isSameUserAsPrevious ? (
                <ProfileHoverCard user={msg.user}>
                  <img src={msg.user.avatar} alt={msg.user.name} className="w-10 h-10 rounded-full mr-4 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 object-cover" />
                </ProfileHoverCard>
              ) : (
                <div className="w-10 mr-4 text-[10px] text-[#949ba4] opacity-0 group-hover:opacity-100 text-right pt-1 select-none flex-shrink-0">
                  {msg.timestamp?.split(' ')[2] || msg.timestamp}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {!isSameUserAsPrevious && (
                  <div className="flex items-baseline min-w-0 mb-0.5">
                    <ProfileHoverCard user={msg.user}>
                      <span className="font-medium text-[#dbdee1] mr-2 cursor-pointer hover:underline truncate">{msg.user.name}</span>
                    </ProfileHoverCard>
                    <span className="text-xs text-[#949ba4] flex-shrink-0">{msg.timestamp}</span>
                  </div>
                )}
                <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed break-words">{msg.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-4 flex-shrink-0" />
      </div>

      {/* Input Area */}
      <div className="p-4 pt-0 flex-shrink-0 flex flex-col">
        <div className="h-6 flex items-center mb-1 text-xs font-medium text-[#b5bac1] overflow-hidden truncate px-1">
          {typingText && (
            <span className="flex items-center">
              <span className="flex space-x-1 mr-2 mt-0.5">
                <span className="w-1.5 h-1.5 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
              {typingText}
            </span>
          )}
        </div>
        <div className="bg-[#383a40] rounded-lg flex items-center px-4 py-2.5 min-w-0">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Invia un messaggio in ${channel.type === 'text' ? '#' : ''}${channel.name}`}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#dbdee1] placeholder-[#80848e]"
          />
        </div>
      </div>
    </div>
  );
};