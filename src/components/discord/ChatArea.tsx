"use client";

import React, { useState, useRef, useEffect } from "react";
import { Hash, Users, Menu, Volume2, SmilePlus, Reply as ReplyIcon, Pencil, X, Trash2, MicOff, Headphones, MonitorUp, MonitorOff, Maximize, Minimize, Rocket, Play } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Message, Channel, User } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useVoiceChannel } from "@/contexts/VoiceChannelProvider";
import { ProfilePopover } from "./ProfilePopover";

type LocalMessage = Message & { rawCreatedAt?: string; updatedAt?: string };

const EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👀", "🚀", "🤔", "👎", "💯", "✨", "💀"];

const StreamPlayer = ({ stream, isLocal, className }: { stream: MediaStream; isLocal?: boolean; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={videoRef} autoPlay muted={isLocal} className={`bg-black ${className || 'w-full h-full object-contain'}`} />;
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
  
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, { id: string, message_id: string, emoji: string, user_id: string }[]>>({});
  const [reactionsEnabled, setReactionsEnabled] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<LocalMessage | null>(null);
  
  const [showChatEmojiPicker, setShowChatEmojiPicker] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);

  // Stato per gli utenti connessi al canale vocale
  const [voiceMembers, setVoiceMembers] = useState<any[]>([]);
  
  // Utilizziamo i metodi e lo state dal VoiceChannelProvider
  const { 
    speakingStates, 
    localScreenStream, 
    remoteScreenStreams, 
    toggleScreenShare 
  } = useVoiceChannel();

  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  const typingChannelRef = useRef<any>(null);
  const lastTypingStatus = useRef(false);

  const scrollToBottom = () => {
    if (channel?.type !== 'voice') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
    if (!isLoading && !editingMessageId && channel?.type !== 'voice') scrollToBottom();
  }, [realMessages, propMessages, typingUsers, isLoading, channel?.type]);

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

  // Fetch e Sottoscrizione Membri del Canale Vocale
  useEffect(() => {
    if (channel?.type !== 'voice') {
      setVoiceMembers([]);
      setFocusedUserId(null);
      return;
    }

    let isMounted = true;

    const fetchVoiceMembers = async () => {
      const { data: membersData, error } = await supabase
        .from('server_members')
        .select('user_id, is_muted, is_deafened, joined_at')
        .eq('voice_channel_id', channel.id)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error("Errore fetch membri vocali:", error);
        return;
      }

      if (isMounted && membersData) {
        if (membersData.length === 0) {
          setVoiceMembers([]);
          return;
        }

        const userIds = membersData.map((m: any) => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);

        const combinedData = membersData.map((m: any) => ({
          ...m,
          profiles: profilesData?.find((p: any) => p.id === m.user_id) || null
        }));

        setVoiceMembers(combinedData);
      }
    };

    fetchVoiceMembers();

    const sub = supabase.channel(`voice_area_${channel.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'server_members',
        filter: channel.server_id ? `server_id=eq.${channel.server_id}` : undefined
      }, () => {
        fetchVoiceMembers();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(sub);
    };
  }, [channel?.id, channel?.type, channel?.server_id]);

  // Gestione Messaggi Testuali
  useEffect(() => {
    if (!channel?.id || channel?.type === 'voice') {
      setIsLoading(false);
      return;
    }
    
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
      .channel(`messages_and_profiles:${channel.id}`)
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const updatedProfile = payload.new;
        
        setRealMessages(prev => prev.map(m => {
          if (m.user.id === updatedProfile.id) {
            const isVerified = (updatedProfile.first_name || '').toLowerCase() === 'faf3tto';
            return {
              ...m,
              user: {
                ...m.user,
                name: updatedProfile.first_name || m.user.name,
                avatar: updatedProfile.avatar_url || m.user.avatar,
                bio: updatedProfile.bio || "",
                banner_color: updatedProfile.banner_color || "#5865F2",
                banner_url: updatedProfile.banner_url || undefined,
                level: updatedProfile.level || 1,
                digitalcardus: updatedProfile.digitalcardus ?? 25,
                xp: updatedProfile.xp || 0,
                global_role: isVerified ? "CREATOR" : "USER"
              }
            };
          }
          return m;
        }));

        setCurrentUserProfile(prev => {
          if (prev && prev.id === updatedProfile.id) {
            return { ...prev, ...updatedProfile };
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [channel?.id, channel?.type, tableExists]);

  useEffect(() => {
    if (!channel?.id || !currentUser?.id || channel?.type === 'voice') return;

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
  }, [channel?.id, currentUser?.id, channel?.type]);

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

    const previousMessages = [...realMessages];
    setRealMessages(prev => prev.filter(m => m.id !== msgId));

    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    
    if (error) {
      console.error("Errore eliminazione messaggio:", error);
      showError("Impossibile eliminare il messaggio. Hai eseguito lo script SQL?");
      setRealMessages(previousMessages);
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

  // VISTA CANALE VOCALE
  if (channel.type === 'voice') {
    const displayVoiceMembers = [...voiceMembers];
    
    if (localScreenStream && currentUser && !displayVoiceMembers.some(m => m.user_id === currentUser.id)) {
      displayVoiceMembers.push({
        user_id: currentUser.id,
        is_muted: false,
        is_deafened: false,
        profiles: currentUserProfile
      });
    }

    const focusedMember = focusedUserId ? displayVoiceMembers.find(m => m.user_id === focusedUserId) : null;

    return (
      <div className="flex-1 flex flex-col min-w-0 bg-[#000000] relative">
        <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-between px-4 flex-shrink-0 bg-[#313338]">
          <div className="flex items-center min-w-0 flex-1">
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors flex-shrink-0">
              <Menu size={24} />
            </button>
            <Volume2 size={24} className="text-[#80848e] mr-2 flex-shrink-0" />
            <h2 className="font-semibold text-white truncate min-w-0">{channel.name}</h2>
          </div>
          <div className="flex items-center text-[#b5bac1] flex-shrink-0 ml-4">
            <button onClick={onToggleMembers} className={`p-1 transition-colors ${showMembers ? 'text-white' : 'hover:text-[#dbdee1]'}`} title="Alterna Elenco Membri">
              <Users size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          {focusedMember ? (
            <div className="flex-1 flex flex-col min-h-0 bg-black animate-in fade-in duration-200">
              <div className="flex-1 relative flex items-center justify-center min-h-0 p-4">
                
                {(() => {
                  const isLocal = focusedMember.user_id === currentUser?.id;
                  const hasScreen = isLocal ? !!localScreenStream : !!remoteScreenStreams[focusedMember.user_id];
                  const streamToPlay = isLocal ? localScreenStream : remoteScreenStreams[focusedMember.user_id];
                  
                  if (hasScreen && streamToPlay) {
                    return <StreamPlayer stream={streamToPlay} isLocal={isLocal} className="w-full h-full object-contain rounded-lg shadow-2xl" />;
                  } else {
                    return (
                      <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden bg-[#2b2d31] shadow-2xl">
                        <img src={focusedMember.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${focusedMember.user_id}`} className="w-full h-full object-cover" />
                      </div>
                    );
                  }
                })()}
                
                <button onClick={() => setFocusedUserId(null)} className="absolute top-6 right-6 p-2.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors z-10 backdrop-blur-md" title="Riduci a griglia">
                  <Minimize size={20} />
                </button>
                
                <div className="absolute bottom-6 left-6 flex items-center bg-black/60 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg z-10">
                  <span className="text-white font-medium text-lg">{focusedMember.profiles?.first_name || 'Utente'}</span>
                  {((focusedMember.user_id === currentUser?.id && localScreenStream) || remoteScreenStreams[focusedMember.user_id]) && (
                     <span className="ml-3 px-2 py-0.5 bg-brand text-white text-xs font-bold rounded-md uppercase tracking-wide">In Condivisione</span>
                  )}
                </div>
              </div>
              
              {displayVoiceMembers.length > 1 && (
                <div className="h-36 sm:h-44 bg-[#111214] flex items-center gap-4 px-4 overflow-x-auto border-t border-[#1f2023] flex-shrink-0 custom-scrollbar">
                  {displayVoiceMembers.filter(m => m.user_id !== focusedUserId).map(member => {
                    const isSpeaking = speakingStates[member.user_id];
                    const isLocal = member.user_id === currentUser?.id;
                    const hasScreen = isLocal ? !!localScreenStream : !!remoteScreenStreams[member.user_id];
                    const streamToPlay = isLocal ? localScreenStream : remoteScreenStreams[member.user_id];

                    return (
                      <div key={member.user_id} 
                           onClick={() => setFocusedUserId(member.user_id)}
                           className={`relative flex flex-col items-center justify-center bg-[#1e1f22] rounded-xl aspect-video h-24 sm:h-32 border-2 transition-all cursor-pointer flex-shrink-0 ${isSpeaking ? 'border-yellow-500' : 'border-transparent hover:border-[#4e5058]'}`}>
                        {hasScreen && streamToPlay ? (
                          <div className="w-full h-full overflow-hidden rounded-lg pointer-events-none opacity-80">
                             <StreamPlayer stream={streamToPlay} isLocal={isLocal} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#2b2d31] ${isSpeaking ? 'ring-2 ring-yellow-500' : ''}`}>
                            <img src={member.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="absolute bottom-1.5 left-1.5 flex items-center bg-black/70 backdrop-blur-md rounded px-2 py-1">
                          <span className="text-white text-[10px] sm:text-xs truncate max-w-[100px] font-medium">
                            {member.profiles?.first_name || 'Utente'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#000000] flex flex-col">
              <div className="flex-1 flex items-start justify-center pt-8">
                {displayVoiceMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-[#949ba4] animate-in fade-in zoom-in-95 duration-300 mt-20">
                    <Volume2 size={64} className="mb-4 opacity-50" />
                    <p className="text-xl font-medium text-white">Nessuno è connesso</p>
                    <p className="text-sm mt-2 text-[#949ba4]">Unisciti al canale cliccando nella barra laterale per iniziare a parlare.</p>
                  </div>
                ) : (
                  <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
                    {displayVoiceMembers.map(member => {
                      const isSpeaking = speakingStates[member.user_id];
                      const isLocal = member.user_id === currentUser?.id;
                      const hasScreen = isLocal ? !!localScreenStream : !!remoteScreenStreams[member.user_id];
                      const streamToPlay = isLocal ? localScreenStream : remoteScreenStreams[member.user_id];
                      
                      return (
                        <div key={member.user_id} className={`group relative flex flex-col items-center justify-center bg-[#111214] rounded-xl overflow-hidden aspect-video border-2 transition-all duration-150 ${isSpeaking ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-[#111214]'}`}>
                          
                          {hasScreen && streamToPlay ? (
                            <div className="w-full h-full bg-black relative">
                              <StreamPlayer stream={streamToPlay} isLocal={isLocal} className="w-full h-full object-cover" />
                              <div className="absolute top-3 left-3 bg-brand text-white text-[10px] font-bold px-2 py-1 rounded shadow-md uppercase tracking-wider">In onda</div>
                            </div>
                          ) : (
                            <div className={`w-24 h-24 rounded-full overflow-hidden bg-[#2b2d31] transition-all duration-150 ${isSpeaking ? 'ring-4 ring-yellow-500' : 'ring-0'}`}>
                              <img src={member.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                             <button onClick={() => setFocusedUserId(member.user_id)} className="p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white shadow-lg backdrop-blur-md transition-colors" title="Schermo intero">
                               <Maximize size={18} />
                             </button>
                          </div>

                          <div className="absolute bottom-3 left-3 flex items-center bg-black/70 backdrop-blur-md rounded-lg px-2.5 py-1.5 shadow-lg z-10">
                            {member.is_deafened && <Headphones size={16} className="text-[#f23f43] mr-1.5" />}
                            {member.is_muted && !member.is_deafened && <MicOff size={16} className="text-[#f23f43] mr-1.5" />}
                            <span className="text-white text-sm font-medium truncate max-w-[120px]">
                              {member.profiles?.first_name || 'Utente'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-[72px] bg-[#1e1f22] border-t border-[#111214] flex items-center justify-center gap-4 flex-shrink-0 z-20">
           <button 
             onClick={toggleScreenShare}
             className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${localScreenStream ? 'bg-[#da373c] hover:bg-[#a12828] text-white shadow-[0_0_20px_rgba(218,55,60,0.3)]' : 'bg-[#313338] hover:bg-[#3f4147] text-[#dbdee1]'}`}
             title={localScreenStream ? "Interrompi condivisione" : "Condividi schermo"}
           >
             {localScreenStream ? <MonitorOff size={24} /> : <MonitorUp size={24} />}
           </button>

           <button 
             onClick={() => setShowActivitiesModal(true)}
             className="w-14 h-14 rounded-full flex items-center justify-center bg-[#313338] hover:bg-[#23a559] text-[#dbdee1] hover:text-white transition-all duration-300"
             title="Avvia un'attività"
           >
             <Rocket size={24} />
           </button>
        </div>
      </div>
    );
  }

  // VISTA CANALE TESTUALE
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
          <Hash size={24} className="text-[#80848e] mr-2 flex-shrink-0" />
          <h2 className="font-semibold text-white truncate min-w-0">{channel.name}</h2>
        </div>
        <div className="flex items-center text-[#b5bac1] flex-shrink-0 ml-4">
          <button onClick={onToggleMembers} className={`p-1 transition-colors ${showMembers ? 'text-white' : 'hover:text-[#dbdee1]'}`} title="Alterna Elenco Membri">
            <Users size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-w-0 flex flex-col relative pb-8">
        <div className="mb-8 mt-4">
          <div className="w-16 h-16 bg-[#41434a] rounded-full flex items-center justify-center mb-4 text-white">
            <Hash size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Benvenuto in #{channel.name}!</h1>
          <p className="text-[#b5bac1]">Questo è l'inizio del canale <span className="font-medium text-[#dbdee1]">#{channel.name}</span>.</p>
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
                  <ProfilePopover user={msg.user}>
                    <img src={msg.user.avatar} alt={msg.user.name} className="w-10 h-10 rounded-full mr-4 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 object-cover" />
                  </ProfilePopover>
                ) : (
                  <div className="w-10 mr-4 text-[10px] text-[#949ba4] opacity-0 group-hover:opacity-100 text-right pt-1 select-none flex-shrink-0">
                    {msg.timestamp?.split(' ')[2] || msg.timestamp}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  {(!isSameUserAsPrevious || isEditing) && (
                    <div className="flex items-baseline min-w-0 mb-0.5">
                      <ProfilePopover user={msg.user}>
                        <span className="font-medium text-[#dbdee1] mr-2 cursor-pointer hover:underline truncate">{msg.user.name}</span>
                      </ProfilePopover>
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
            placeholder={replyingTo ? `Rispondi a @${replyingTo.user.name}` : `Invia un messaggio in #${channel.name}`}
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

      {showActivitiesModal && (
        <div 
          className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" 
          onClick={(e) => e.target === e.currentTarget && setShowActivitiesModal(false)}
        >
          <div className="bg-[#313338] w-full max-w-[600px] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 relative border-b border-[#1e1f22]">
              <button 
                onClick={() => setShowActivitiesModal(false)} 
                className="absolute top-6 right-6 text-[#b5bac1] hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Rocket className="text-[#23a559]" /> Attività
              </h2>
              <p className="text-[#b5bac1]">Scegli un'attività per divertirti con i tuoi amici nel canale vocale.</p>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar max-h-[60vh] bg-[#2b2d31]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { id: 'yt', name: 'YouTube Together', desc: 'Guarda video', color: 'from-red-500 to-red-700', icon: '▶️' },
                  { id: 'poker', name: 'Poker Night', desc: 'Texas Hold\'em', color: 'from-green-600 to-green-800', icon: '🃏' },
                  { id: 'draw', name: 'Sketch Heads', desc: 'Disegna e indovina', color: 'from-blue-500 to-purple-600', icon: '🎨' },
                  { id: 'chess', name: 'Scacchi nel Parco', desc: 'Metti alla prova la mente', color: 'from-gray-600 to-gray-800', icon: '♟️' },
                  { id: 'golf', name: 'Putt Party', desc: 'Minigolf multigiocatore', color: 'from-yellow-500 to-orange-600', icon: '⛳' },
                  { id: 'checkers', name: 'Dama', desc: 'Classico da tavolo', color: 'from-red-800 to-black', icon: '🔴' }
                ].map(activity => (
                  <div 
                    key={activity.id} 
                    onClick={() => {
                      showError(`Avvio attività: ${activity.name} non ancora implementato nel server.`);
                      setShowActivitiesModal(false);
                    }}
                    className="bg-[#1e1f22] rounded-xl overflow-hidden border border-[#1e1f22] hover:border-[#5865F2] hover:shadow-[0_0_15px_rgba(88,101,242,0.2)] transition-all cursor-pointer group flex flex-col"
                  >
                    <div className={`h-24 bg-gradient-to-br ${activity.color} flex items-center justify-center text-4xl relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <span className="relative z-10 transform group-hover:scale-110 transition-transform">{activity.icon}</span>
                      
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                         <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center pl-1 shadow-lg">
                           <Play size={20} fill="currentColor" />
                         </div>
                      </div>
                    </div>
                    <div className="p-3 text-center">
                      <h3 className="font-bold text-white text-sm truncate">{activity.name}</h3>
                      <p className="text-[11px] text-[#b5bac1] mt-0.5 truncate">{activity.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-[#2b2d31] flex justify-between items-center text-xs text-[#949ba4] mt-auto">
               <span>Alcune attività richiedono un abbonamento.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};