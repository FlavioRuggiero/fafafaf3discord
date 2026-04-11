"use client";

import React, { useState, useRef, useEffect } from "react";
import { Hash, Users, Menu, Volume2, SmilePlus, Reply as ReplyIcon, Pencil, X, Trash2 } from "lucide-react";
import * as HoverCard from "@radix-ui/react-hover-card";
import * as Popover from "@radix-ui/react-popover";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Message, Channel, User } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

type LocalMessage = Message & { rawCreatedAt?: string; updatedAt?: string };

const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👀", "🚀", "🤔", "👎", "💯", "✨", "💀"];

const ProfileHoverCard = ({ user, children }: { user: User, children: React.ReactNode }) => {
  const isAdmin = user.global_role === 'ADMIN' || user.global_role === 'CREATOR';
  const xpNeeded = (user.level || 1) * 5;
  const currentXp = user.xp || 0;
  const xpPercent = Math.min(100, (currentXp / xpNeeded) * 100);
  
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

            {/* Statistiche Livello e Digitalcardus */}
            <div className="flex flex-col mt-3 bg-[#1e1f22] py-3 px-3 rounded-lg border border-[#2b2d31]">
              <div className="flex items-center justify-around mb-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-0.5">Livello</span>
                  <span className="font-bold text-white">{user.level || 1}</span>
                </div>
                <div className="w-[1px] h-8 bg-[#2b2d31]"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-0.5">Digitalcardus</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{user.digitalcardus ?? 25}</span>
                    <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 object-contain" />
                  </div>
                </div>
              </div>
              
              {/* Barra XP */}
              <div className="px-1 border-t border-[#2b2d31] pt-3">
                <div className="flex justify-between items-center text-[10px] text-[#b5bac1] uppercase tracking-wider mb-1.5 font-bold">
                  <span>Progresso XP</span>
                  <span className="text-white">{currentXp} / {xpNeeded}</span>
                </div>
                <div className="h-1.5 bg-[#111214] rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all duration-500 ease-out" style={{ width: `${xpPercent}%` }} />
                </div>
              </div>
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
  serverCreatorId?: string;
}

export const ChatArea = ({ channel, messages: propMessages, onSendMessage, onToggleMembers, onToggleSidebar, showMembers, serverCreatorId }: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState("");
  const [realMessages, setRealMessages] = useState<LocalMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  
  // Stati per Reazioni
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, { id: string, message_id: string, emoji: string, user_id: string }[]>>({});
  const [reactionsEnabled, setReactionsEnabled] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<LocalMessage | null>(null);
  
  // Stato per Picker Emoji Chat
  const [showChatEmojiPicker, setShowChatEmojiPicker] = useState(false);

  // Stato per Modale di Eliminazione
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  const typingChannelRef = useRef<any>(null);
  const lastTypingStatus = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-brand/20');
      setTimeout(() => {
        el.classList.remove('bg-brand/20');
      }, 2000);
    }
  };

  useEffect(() => {
    if (!isLoading && !editingMessageId) scrollToBottom();
  }, [realMessages, propMessages, typingUsers, isLoading]);

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, bio, banner_color, banner_url, level, digitalcardus, xp')
          .eq('id', session.user.id)
          .single();
        setCurrentUserProfile(profile);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!channel?.id) return;
    
    setIsLoading(true);
    setRealMessages([]);
    setReplyingTo(null);
    setEditingMessageId(null);

    const fetchMessages = async () => {
      let { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          user_id,
          profiles(id, first_name, last_name, avatar_url, bio, banner_color, banner_url, level, digitalcardus, xp)
        `)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true });

      if (error && error.message.includes('updated_at')) {
        const fallback = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            user_id,
            profiles(id, first_name, last_name, avatar_url, bio, banner_color, banner_url, level, digitalcardus, xp)
          `)
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: true });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn("Tabella messages non trovata o errore imprevisto.");
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
            rawCreatedAt: m.created_at,
            updatedAt: m.updated_at,
            user: {
              id: m.profiles?.id || m.user_id,
              name: name,
              avatar: m.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`,
              bio: m.profiles?.bio || "",
              banner_color: m.profiles?.banner_color || "#5865F2",
              banner_url: m.profiles?.banner_url || undefined,
              level: m.profiles?.level || 1,
              digitalcardus: m.profiles?.digitalcardus ?? 25,
              xp: m.profiles?.xp || 0,
              global_role: isVerified ? "CREATOR" : "USER",
              status: "online" as const
            }
          };
        });
        setRealMessages(formatted);

        // Fetch Reactions
        if (data.length > 0) {
          const msgIds = data.map((m: any) => m.id);
          const { data: reactionsData, error: reactionsError } = await supabase
            .from('message_reactions')
            .select('id, message_id, emoji, user_id')
            .in('message_id', msgIds);
            
          if (!reactionsError && reactionsData) {
            setReactionsEnabled(true);
            const grouped: Record<string, any[]> = {};
            reactionsData.forEach(r => {
              if (!grouped[r.message_id]) grouped[r.message_id] = [];
              grouped[r.message_id].push(r);
            });
            setReactionsByMessage(grouped);
          } else {
            setReactionsEnabled(false);
          }
        } else {
          const { error: checkError } = await supabase.from('message_reactions').select('id').limit(1);
          if (!checkError) setReactionsEnabled(true);
        }
      }
      setIsLoading(false);
    };

    fetchMessages();

    if (!tableExists) return;

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
          .select('id, first_name, last_name, avatar_url, bio, banner_color, banner_url, level, digitalcardus, xp')
          .eq('id', payload.new.user_id)
          .single();
          
        const name = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Utente' : 'Utente';
        const isVerified = name.toLowerCase() === 'faf3tto';

        const newMsg: LocalMessage = {
          id: payload.new.id,
          content: payload.new.content,
          timestamp: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rawCreatedAt: payload.new.created_at,
          updatedAt: payload.new.updated_at,
          user: {
            id: payload.new.user_id,
            name: name,
            avatar: profileData?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.new.user_id}`,
            bio: profileData?.bio || "",
            banner_color: profileData?.banner_color || "#5865F2",
            banner_url: profileData?.banner_url || undefined,
            level: profileData?.level || 1,
            digitalcardus: profileData?.digitalcardus ?? 25,
            xp: profileData?.xp || 0,
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
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channel.id}`
      }, (payload) => {
        setRealMessages(prev => prev.map(m => m.id === payload.new.id ? { 
          ...m, 
          content: payload.new.content,
          updatedAt: payload.new.updated_at 
        } : m));
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        setRealMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload) => {
        setReactionsByMessage(prev => {
          const msgId = payload.new.message_id;
          const existing = prev[msgId] || [];
          if (existing.some(r => r.id === payload.new.id)) return prev;
          return { ...prev, [msgId]: [...existing, payload.new] };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload) => {
        setReactionsByMessage(prev => {
          const newMap = { ...prev };
          for (const msgId in newMap) {
            newMap[msgId] = newMap[msgId].filter(r => r.id !== payload.old.id);
          }
          return newMap;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [channel?.id, tableExists]);

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

  const handleChatEmojiSelect = (emojiObject: any) => {
    setInputValue(prev => prev + emojiObject.emoji);
    chatInputRef.current?.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      const content = inputValue.trim();
      setInputValue("");
      setShowChatEmojiPicker(false);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setTypingStatus(false); 

      if (currentUser && channel && tableExists) {
        const tempId = `temp-${Date.now()}`;
        const userName = currentUserProfile ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() || 'Utente' : 'Utente';
        const isVerified = userName.toLowerCase() === 'faf3tto';
        const rawDate = new Date().toISOString();
        
        let finalContent = content;
        if (replyingTo) {
          finalContent = `<reply:${replyingTo.id}>${content}`;
        }
        
        const optimisticMsg: LocalMessage = {
          id: tempId,
          content: finalContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rawCreatedAt: rawDate,
          user: { 
            id: currentUser.id, 
            name: userName, 
            avatar: currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
            bio: currentUserProfile?.bio || "",
            banner_color: currentUserProfile?.banner_color || "#5865F2",
            banner_url: currentUserProfile?.banner_url || undefined,
            level: currentUserProfile?.level || 1,
            digitalcardus: currentUserProfile?.digitalcardus ?? 25,
            xp: currentUserProfile?.xp || 0,
            global_role: isVerified ? "CREATOR" : "USER",
            status: "online"
          }
        };
        
        setRealMessages(prev => [...prev, optimisticMsg]);
        setReplyingTo(null);

        const { data, error } = await supabase.from('messages').insert({
          channel_id: channel.id,
          user_id: currentUser.id,
          content: finalContent
        }).select().single();
        
        if (error) {
          console.error("Errore durante l'invio:", error);
          setRealMessages(prev => prev.filter(m => m.id !== tempId));
        } else if (data) {
          setRealMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, rawCreatedAt: data.created_at, updatedAt: data.updated_at } : m));
        }
      } else {
        onSendMessage(content);
        setReplyingTo(null);
      }
    }
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    const msgId = messageToDelete;
    setMessageToDelete(null);

    // Aggiornamento UI ottimistico
    const previousMessages = [...realMessages];
    setRealMessages(prev => prev.filter(m => m.id !== msgId));

    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    
    if (error) {
      console.error("Errore eliminazione messaggio:", error);
      showError("Impossibile eliminare il messaggio. Hai eseguito lo script SQL?");
      setRealMessages(previousMessages); // Revert
    }
  };

  const startEditing = (msg: LocalMessage) => {
    setEditingMessageId(msg.id);
    const replyMatch = msg.content.match(/^<reply:([a-zA-Z0-9-]+)>(.*)$/s);
    let contentToEdit = replyMatch ? replyMatch[2] : msg.content;
    
    if (contentToEdit.startsWith('**Risposta a')) {
      contentToEdit = contentToEdit.split('\n').slice(1).join('\n');
    }
    setEditContent(contentToEdit);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const saveEdit = async (msgId: string) => {
    if (!editContent.trim()) {
      cancelEditing();
      return;
    }

    const originalMsg = realMessages.find(m => m.id === msgId);
    let finalContent = editContent.trim();
    
    const replyMatch = originalMsg?.content.match(/^<reply:([a-zA-Z0-9-]+)>/);
    if (replyMatch) {
      finalContent = `${replyMatch[0]}${finalContent}`;
    }

    const now = new Date().toISOString();
    
    setRealMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: finalContent, updatedAt: now } : m));
    setEditingMessageId(null);

    const { error } = await supabase.from('messages').update({ content: finalContent, updated_at: now }).eq('id', msgId);
    if (error) {
      console.error("Errore salvataggio modifica:", error);
      showError("Errore durante il salvataggio della modifica.");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, msgId: string) => {
    if (e.key === 'Escape') cancelEditing();
    else if (e.key === 'Enter') saveEdit(msgId);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    if (!reactionsEnabled) {
      showError("Le reazioni non sono abilitate.");
      return;
    }
    
    const msgReactions = reactionsByMessage[messageId] || [];
    const existingReaction = msgReactions.find(r => r.user_id === currentUser.id && r.emoji === emoji);
    
    if (existingReaction) {
      setReactionsByMessage(prev => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(r => r.id !== existingReaction.id)
      }));
      await supabase.from('message_reactions').delete().eq('id', existingReaction.id);
    } else {
      const tempId = `temp-${Date.now()}`;
      const newReaction = { id: tempId, message_id: messageId, emoji, user_id: currentUser.id };
      setReactionsByMessage(prev => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), newReaction]
      }));
      
      const { data, error } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: currentUser.id,
        emoji
      }).select().single();
      
      if (data) {
        setReactionsByMessage(prev => ({
          ...prev,
          [messageId]: (prev[messageId] || []).map(r => r.id === tempId ? data : r)
        }));
      } else {
        setReactionsByMessage(prev => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter(r => r.id !== tempId)
        }));
      }
    }
  };

  const isWithin5Minutes = (rawDate?: string) => {
    if (!rawDate) return false;
    const msgTime = new Date(rawDate).getTime();
    const now = new Date().getTime();
    return (now - msgTime) <= 5 * 60 * 1000;
  };

  const displayMessages = isLoading ? [] : (tableExists ? realMessages : propMessages as LocalMessage[]);
  const msgToDeleteData = messageToDelete ? displayMessages.find(m => m.id === messageToDelete) : null;

  const typingNames = Object.values(typingUsers);
  let typingText = "";
  if (typingNames.length === 1) typingText = `${typingNames[0]} sta scrivendo...`;
  else if (typingNames.length === 2) typingText = `${typingNames[0]} e ${typingNames[1]} stanno scrivendo...`;
  else if (typingNames.length > 2) typingText = "Più utenti stanno scrivendo...";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#313338] relative">
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors flex-shrink-0">
            <Menu size={24} />
          </button>
          {channel.type === 'text' ? <Hash size={24} className="text-[#80848e] mr-2 flex-shrink-0" /> : <Volume2 size={24} className="text-[#80848e] mr-2 flex-shrink-0" />}
          <h2 className="font-semibold text-white truncate min-w-0">{channel.name}</h2>
        </div>
        <div className="flex items-center text-[#b5bac1] flex-shrink-0 ml-4">
          <button onClick={onToggleMembers} className={`p-1 transition-colors ${showMembers ? 'text-white' : 'hover:text-[#dbdee1]'}`} title="Alterna Elenco Membri">
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

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-w-0 flex flex-col relative pb-8">
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
          const replyMatch = msg.content.match(/^<reply:([a-zA-Z0-9-]+)>(.*)$/s);
          const isReply = !!replyMatch;
          const replyToId = isReply ? replyMatch[1] : null;
          const displayContent = isReply ? replyMatch[2] : msg.content;
          
          let repliedMessage = null;
          let repliedMessageContent = "";
          
          if (isReply) {
            repliedMessage = displayMessages.find(m => m.id === replyToId);
            if (repliedMessage) {
              repliedMessageContent = repliedMessage.content;
              const nestedMatch = repliedMessageContent.match(/^<reply:([a-zA-Z0-9-]+)>(.*)$/s);
              if (nestedMatch) repliedMessageContent = nestedMatch[2];
            } else {
              repliedMessageContent = "Il messaggio originale è stato eliminato o non è stato caricato.";
            }
          }

          const isSameUserAsPrevious = idx > 0 && displayMessages[idx - 1].user.id === msg.user.id && !isReply;
          const isMyMessage = currentUser?.id === msg.user.id;
          const isServerCreator = currentUser?.id === serverCreatorId;
          
          const canEdit = isMyMessage && isWithin5Minutes(msg.rawCreatedAt);
          const canDelete = (isMyMessage && isWithin5Minutes(msg.rawCreatedAt)) || isServerCreator;
          
          const isEditing = editingMessageId === msg.id;
          const isPopoverOpen = openPopoverId === msg.id;
          
          const msgReactions = reactionsByMessage[msg.id] || [];
          const reactionCounts: Record<string, { count: number, hasReacted: boolean }> = {};
          msgReactions.forEach(r => {
            if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, hasReacted: false };
            reactionCounts[r.emoji].count++;
            if (r.user_id === currentUser?.id) reactionCounts[r.emoji].hasReacted = true;
          });

          return (
            <div id={`msg-${msg.id}`} key={msg.id} className={`group relative flex flex-col hover:bg-[#2e3035] -mx-4 px-4 py-0.5 rounded transition-colors duration-500 ${isSameUserAsPrevious && !isEditing ? 'mt-0' : 'mt-4'}`}>
              
              {!isEditing && (
                <div className={`absolute right-4 -top-3 ${isPopoverOpen ? 'flex' : 'hidden group-hover:flex'} items-center bg-[#313338] border border-[#1f2023] rounded shadow-md overflow-hidden z-10 transition-all`}>
                  
                  <Popover.Root 
                    open={isPopoverOpen} 
                    onOpenChange={(isOpen) => setOpenPopoverId(isOpen ? msg.id : null)}
                  >
                    <Popover.Trigger asChild>
                      <button className="p-1.5 hover:bg-[#404249] text-[#b5bac1] hover:text-[#dbdee1] transition-colors focus:outline-none" title="Aggiungi reazione">
                        <SmilePlus size={18} />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content 
                        side="top" 
                        align="end" 
                        sideOffset={5} 
                        className="bg-[#2b2d31] border border-[#1e1f22] p-2 rounded-lg shadow-xl z-[99999] w-[200px]"
                        onInteractOutside={() => setOpenPopoverId(null)}
                      >
                        <div className="grid grid-cols-4 gap-1">
                          {EMOJIS.map(emoji => (
                            <button 
                              key={emoji}
                              onClick={() => {
                                toggleReaction(msg.id, emoji);
                                setOpenPopoverId(null);
                              }}
                              className="w-10 h-10 flex items-center justify-center hover:bg-[#35373c] rounded text-xl transition-colors focus:outline-none"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>

                  <button 
                    className="p-1.5 hover:bg-[#404249] text-[#b5bac1] hover:text-[#dbdee1] transition-colors" 
                    title="Rispondi" 
                    onClick={() => { 
                      setReplyingTo(msg); 
                      setTimeout(() => chatInputRef.current?.focus(), 10); 
                    }}
                  >
                    <ReplyIcon size={18} />
                  </button>
                  {canEdit && (
                    <button className="p-1.5 hover:bg-[#404249] text-[#b5bac1] hover:text-[#dbdee1] transition-colors" title="Modifica" onClick={() => startEditing(msg)}>
                      <Pencil size={18} />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      className="p-1.5 hover:bg-[#f23f43] text-[#b5bac1] hover:text-white transition-colors" 
                      title={isServerCreator && !isMyMessage ? "Elimina come Moderatore" : "Elimina"} 
                      onClick={() => setMessageToDelete(msg.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              )}

              {isReply && (
                <div className="relative flex items-center pl-[72px] mb-1 cursor-pointer group/reply select-none" onClick={() => replyToId && scrollToMessage(replyToId)}>
                  <div className="absolute left-[36px] top-1/2 w-[32px] h-[14px] border-l-2 border-t-2 border-[#4e5058] rounded-tl-md -translate-y-[2px]"></div>
                  {repliedMessage ? (
                    <>
                      <img src={repliedMessage.user.avatar} className="w-4 h-4 rounded-full mr-1.5 object-cover" alt="" />
                      <span className="font-medium text-[#dbdee1] text-xs mr-2 hover:underline opacity-80 group-hover/reply:opacity-100 whitespace-nowrap">{repliedMessage.user.name}</span>
                      <span className="text-[#b5bac1] text-xs truncate max-w-[50%] md:max-w-[70%] opacity-80 group-hover/reply:opacity-100 group-hover/reply:text-white">
                        {repliedMessageContent}
                      </span>
                    </>
                  ) : (
                    <span className="text-[#949ba4] text-xs italic">{repliedMessageContent}</span>
                  )}
                </div>
              )}

              <div className="flex items-start">
                {!isSameUserAsPrevious || isEditing ? (
                  <ProfileHoverCard user={msg.user}>
                    <img src={msg.user.avatar} alt={msg.user.name} className="w-10 h-10 rounded-full mr-4 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 object-cover" />
                  </ProfileHoverCard>
                ) : (
                  <div className="w-10 mr-4 text-[10px] text-[#949ba4] opacity-0 group-hover:opacity-100 text-right pt-1 select-none flex-shrink-0">
                    {msg.timestamp?.split(' ')[2] || msg.timestamp}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  {(!isSameUserAsPrevious || isEditing) && (
                    <div className="flex items-baseline min-w-0 mb-0.5">
                      <ProfileHoverCard user={msg.user}>
                        <span className="font-medium text-[#dbdee1] mr-2 cursor-pointer hover:underline truncate">{msg.user.name}</span>
                      </ProfileHoverCard>
                      <span className="text-xs text-[#949ba4] flex-shrink-0">{msg.timestamp}</span>
                    </div>
                  )}
                  
                  {isEditing ? (
                    <div className="mt-1 mr-4">
                      <div className="bg-[#383a40] p-2.5 rounded-md border border-[#1f2023]">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                          className="w-full bg-transparent border-none outline-none text-[#dbdee1]"
                        />
                      </div>
                      <div className="text-[11px] text-[#b5bac1] mt-1.5">
                        Premi esc per <button className="text-[#00a8fc] hover:underline" onClick={cancelEditing}>annullare</button> • invio per <button className="text-[#00a8fc] hover:underline" onClick={() => saveEdit(msg.id)}>salvare</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed break-words">
                      {displayContent}
                      {msg.updatedAt && (
                        <span 
                          className="text-[10px] text-[#949ba4] ml-1.5 select-none hover:text-[#dbdee1] cursor-default transition-colors" 
                          title={`Modificato il ${new Date(msg.updatedAt).toLocaleString()}`}
                        >
                          (modificato)
                        </span>
                      )}
                    </div>
                  )}

                  {Object.keys(reactionCounts).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
                      {Object.entries(reactionCounts).map(([emoji, { count, hasReacted }]) => (
                        <button 
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${hasReacted ? 'bg-brand/20 border-brand text-brand' : 'bg-[#2b2d31] border-transparent text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'} transition-colors`}
                        >
                          <span className="mr-1.5 text-sm">{emoji}</span>
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-4 flex-shrink-0" />
      </div>

      <div className="p-4 pt-0 flex-shrink-0 flex flex-col relative">
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

        {replyingTo && (
          <div className="bg-[#2b2d31] text-[#b5bac1] px-4 py-2 flex items-center justify-between text-sm rounded-t-lg -mb-2 z-10 relative border-x border-t border-[#1f2023]">
            <div className="flex items-center truncate">
              <ReplyIcon size={16} className="mr-2 flex-shrink-0" />
              Stai rispondendo a <span className="font-semibold text-[#dbdee1] ml-1 truncate">@{replyingTo.user.name}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="hover:text-[#dbdee1] ml-2 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        <div className={`bg-[#383a40] flex items-center px-4 py-2.5 min-w-0 z-20 relative ${replyingTo ? 'rounded-b-lg rounded-t-none border-x border-b border-[#1f2023]' : 'rounded-lg'}`}>
          <input
            ref={chatInputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? `Rispondi a @${replyingTo.user.name}` : `Invia un messaggio in ${channel.type === 'text' ? '#' : ''}${channel.name}`}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#dbdee1] placeholder-[#80848e]"
          />
          <Popover.Root open={showChatEmojiPicker} onOpenChange={setShowChatEmojiPicker}>
            <Popover.Trigger asChild>
              <button className="p-1 hover:text-[#dbdee1] text-[#b5bac1] transition-colors ml-2 flex-shrink-0 focus:outline-none" title="Scegli Emoji">
                <SmilePlus size={24} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                side="top" 
                align="end" 
                sideOffset={10} 
                className="z-[99999] border-none shadow-2xl bg-transparent"
                onInteractOutside={() => setShowChatEmojiPicker(false)}
              >
                <EmojiPicker 
                  theme={Theme.DARK} 
                  onEmojiClick={handleChatEmojiSelect} 
                  searchPlaceHolder="Cerca emoji..." 
                  lazyLoadEmojis={true} 
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>

      {messageToDelete && msgToDeleteData && (
        <div 
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" 
          onClick={(e) => e.target === e.currentTarget && setMessageToDelete(null)}
        >
          <div className="bg-[#313338] w-full max-w-[440px] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 relative">
              <h2 className="text-[20px] font-bold text-white mb-4">Elimina Messaggio</h2>
              <p className="text-[#dbdee1] text-[15px] mb-4">Sei sicuro di voler eliminare questo messaggio?</p>
              
              <div className="bg-[#2b2d31] border border-[#1e1f22] p-3 rounded flex items-start gap-3 shadow-inner">
                <img src={msgToDeleteData.user.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-[#dbdee1]">{msgToDeleteData.user.name}</span>
                    <span className="text-xs text-[#949ba4]">{msgToDeleteData.timestamp}</span>
                  </div>
                  <div className="text-[#dbdee1] text-[15px] mt-1 line-clamp-3 overflow-hidden break-words">
                    {msgToDeleteData.content.replace(/^<reply:([a-zA-Z0-9-]+)>/, '')}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#2b2d31] flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setMessageToDelete(null)} 
                className="px-4 py-2 text-sm font-medium text-white hover:underline transition-colors"
              >
                Annulla
              </button>
              <button 
                onClick={confirmDeleteMessage} 
                className="px-4 py-2 bg-[#da373c] hover:bg-[#a12828] text-white text-sm font-medium rounded transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};