"use client";

import React, { useState, useEffect } from 'react';
import { User } from '@/types/discord';
import { Bell, Menu, Gift, AtSign, ArrowRightLeft, Check, X, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';

interface NotificationsViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
  onNavigateToShop: () => void;
  onNavigateToMessage: (serverId: string, channelId: string, messageId: string) => void;
  onNavigateToTrade: (tradeId: string) => void;
}

export const NotificationsView = ({ currentUser, onToggleSidebar, onNavigateToShop, onNavigateToMessage, onNavigateToTrade }: NotificationsViewProps) => {
  const [mentions, setMentions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const canClaimReward = currentUser?.last_reward_date !== today;

  const fetchNotifications = async () => {
    setIsLoading(true);
    
    // Fetch Mentions
    const { data: mentionData } = await supabase
      .from('messages')
      .select('id, content, created_at, channel_id, user_id, profiles(first_name, avatar_url), channels(name, server_id, servers(name))')
      .or(`content.ilike.%<@${currentUser.id}>%,content.ilike.%<@everyone>%`)
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (mentionData) setMentions(mentionData);

    // Fetch Trades
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: tradeData } = await supabase
      .from('trades')
      .select('id, sender_id, created_at, profiles!trades_sender_id_fkey(first_name, avatar_url)')
      .eq('receiver_id', currentUser.id)
      .eq('status', 'pending')
      .gt('created_at', twoMinsAgo) // Prende solo quelle non scadute
      .order('created_at', { ascending: false });
      
    if (tradeData) setTrades(tradeData);

    // Fetch Friend Requests
    const { data: frData } = await supabase
      .from('friendships')
      .select('*')
      .eq('receiver_id', currentUser.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (frData && frData.length > 0) {
      const senderIds = frData.map(fr => fr.sender_id);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, avatar_url, avatar_decoration').in('id', senderIds);
      const combined = frData.map(fr => ({
        ...fr,
        profiles: profiles?.find(p => p.id === fr.sender_id)
      }));
      setFriendRequests(combined);
    } else {
      setFriendRequests([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    const tradeSub = supabase.channel(`active_trades_global_${currentUser.id}_notif`)
      .on('broadcast', { event: 'trade_request' }, () => {
        fetchNotifications();
      })
      .subscribe();

    const frSub = supabase.channel(`friendships_notif_${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `receiver_id=eq.${currentUser.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    // Rimuove localmente le richieste scadute ogni 10 secondi
    const expireInterval = setInterval(() => {
      const twoMinsAgoMs = Date.now() - 2 * 60 * 1000;
      setTrades(prev => prev.filter(t => new Date(t.created_at).getTime() > twoMinsAgoMs));
    }, 10000);

    return () => {
      clearInterval(expireInterval);
      supabase.removeChannel(tradeSub);
      supabase.removeChannel(frSub);
    };
  }, [currentUser.id]);

  const sendBroadcast = (targetId: string, event: string, payload: any) => {
    const channel = supabase.channel(`active_trades_global_${targetId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event, payload });
        setTimeout(() => supabase.removeChannel(channel), 500);
      }
    });
  };

  const handleAcceptTrade = async (tradeId: string, senderId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (trade && new Date(trade.created_at).getTime() < Date.now() - 2 * 60 * 1000) {
      showError("Questa richiesta di scambio è scaduta.");
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      return;
    }

    // Rimuovi subito dalla UI per evitare doppi click
    setTrades(prev => prev.filter(t => t.id !== tradeId));

    const { error } = await supabase.from('trades').update({ status: 'active' }).eq('id', tradeId);
    if (error) {
      showError("Errore durante l'accettazione dello scambio.");
      fetchNotifications(); // Ripristina se fallisce
    } else {
      showSuccess("Scambio accettato!");
      onNavigateToTrade(tradeId);
      sendBroadcast(senderId, 'trade_accepted', { trade_id: tradeId });
    }
  };

  const handleDeclineTrade = async (tradeId: string) => {
    // Rimuovi subito dalla UI
    setTrades(prev => prev.filter(t => t.id !== tradeId));

    // Usa UPDATE status = 'cancelled' invece di DELETE per via dei permessi RLS
    const { error } = await supabase.from('trades').update({ status: 'cancelled' }).eq('id', tradeId);
    if (error) {
      showError("Errore durante il rifiuto dello scambio.");
      fetchNotifications(); // Ripristina se fallisce
    } else {
      showSuccess("Scambio rifiutato.");
    }
  };

  const handleAcceptFriend = async (id: string) => {
    // Aggiornamento ottimistico
    setFriendRequests(prev => prev.filter(r => r.id !== id));
    
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    if (!error) {
      showSuccess("Richiesta di amicizia accettata!");
    } else {
      showError("Errore durante l'accettazione.");
      fetchNotifications(); // Ripristina in caso di errore
    }
  };

  const handleDeclineFriend = async (id: string) => {
    // Aggiornamento ottimistico
    setFriendRequests(prev => prev.filter(r => r.id !== id));
    
    const { error } = await supabase.from('friendships').delete().eq('id', id);
    if (!error) {
      showSuccess("Richiesta rifiutata.");
    } else {
      showError("Errore durante il rifiuto.");
      fetchNotifications(); // Ripristina in caso di errore
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative overflow-hidden h-full min-w-0">
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm bg-[#313338] z-10 flex-shrink-0">
        <div className="flex items-center text-white font-semibold">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
          )}
          <Bell className="mr-2 text-[#949ba4]" size={20} />
          Notifiche
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Le tue Notifiche</h1>
            <p className="text-[#b5bac1]">Rimani aggiornato su ciò che succede nei tuoi server.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Daily Reward */}
              {canClaimReward && (
                <div className="bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-[#3f4147] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#23a559]/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="text-[#23a559]" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Premio Giornaliero Disponibile!</h3>
                      <p className="text-[#b5bac1] text-sm">Riscatta i tuoi Digitalcardus e XP gratuiti.</p>
                    </div>
                  </div>
                  <button 
                    onClick={onNavigateToShop}
                    className="px-4 py-2 bg-[#23a559] hover:bg-[#1a7c43] text-white font-medium rounded transition-colors flex-shrink-0"
                  >
                    Vai allo Shop
                  </button>
                </div>
              )}

              {/* Friend Requests */}
              {friendRequests.map(req => (
                <div key={req.id} className="bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-[#3f4147] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#5865F2]/20 flex items-center justify-center flex-shrink-0">
                      <Users className="text-[#5865F2]" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Richiesta di Amicizia</h3>
                      <p className="text-[#b5bac1] text-sm flex items-center gap-2">
                        <Avatar src={req.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.sender_id}`} decoration={req.profiles?.avatar_decoration} className="w-5 h-5" />
                        <span className="font-medium text-[#dbdee1]">{req.profiles?.first_name || 'Utente'}</span> ti ha inviato una richiesta.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleAcceptFriend(req.id)}
                      className="w-10 h-10 bg-[#23a559] hover:bg-[#1a7c43] text-white rounded-full flex items-center justify-center transition-colors"
                      title="Accetta"
                    >
                      <Check size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeclineFriend(req.id)}
                      className="w-10 h-10 bg-[#f23f43] hover:bg-[#da373c] text-white rounded-full flex items-center justify-center transition-colors"
                      title="Rifiuta"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Trades */}
              {trades.map(trade => (
                <div key={trade.id} className="bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-[#3f4147] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
                      <ArrowRightLeft className="text-brand" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">Richiesta di Scambio</h3>
                      <p className="text-[#b5bac1] text-sm">
                        <span className="font-medium text-[#dbdee1]">{trade.profiles?.first_name || 'Utente'}</span> vuole scambiare oggetti con te.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleAcceptTrade(trade.id, trade.sender_id)}
                      className="w-10 h-10 bg-[#23a559] hover:bg-[#1a7c43] text-white rounded-full flex items-center justify-center transition-colors"
                      title="Accetta"
                    >
                      <Check size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeclineTrade(trade.id)}
                      className="w-10 h-10 bg-[#f23f43] hover:bg-[#da373c] text-white rounded-full flex items-center justify-center transition-colors"
                      title="Rifiuta"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Mentions */}
              {mentions.map(mention => {
                const serverName = mention.channels?.servers?.name || 'Server Sconosciuto';
                const channelName = mention.channels?.name || 'canale';
                const serverId = mention.channels?.server_id;
                const channelId = mention.channel_id;
                
                return (
                  <div key={mention.id} className="bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-[#3f4147] transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                        <AtSign className="text-yellow-500" size={24} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-bold truncate">Sei stato menzionato</h3>
                        <p className="text-[#b5bac1] text-sm truncate">
                          Da <span className="font-medium text-[#dbdee1]">{mention.profiles?.first_name || 'Utente'}</span> in <span className="font-medium text-[#dbdee1]">#{channelName}</span> ({serverName})
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (serverId && channelId) {
                          onNavigateToMessage(serverId, channelId, mention.id);
                        }
                      }}
                      className="px-4 py-2 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-medium rounded transition-colors flex-shrink-0 ml-4"
                    >
                      Vai al messaggio
                    </button>
                  </div>
                );
              })}

              {!canClaimReward && trades.length === 0 && mentions.length === 0 && friendRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-[#949ba4]">
                  <Bell size={64} className="mb-4 opacity-50" />
                  <h2 className="text-xl font-medium text-white mb-2">Tutto tranquillo</h2>
                  <p>Non hai nuove notifiche al momento.</p>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};