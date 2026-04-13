"use client";

import React, { useState, useEffect } from 'react';
import { User } from '@/types/discord';
import { Bell, Menu, Gift, AtSign, ArrowRightLeft, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface NotificationsViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
  onNavigateToShop: () => void;
  onNavigateToMessage: (serverId: string, channelId: string, messageId: string) => void;
}

export const NotificationsView = ({ currentUser, onToggleSidebar, onNavigateToShop, onNavigateToMessage }: NotificationsViewProps) => {
  const [mentions, setMentions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const canClaimReward = currentUser?.last_reward_date !== today;

  useEffect(() => {
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

      // Fetch Pending Trades
      const { data: tradeData } = await supabase
        .from('trades')
        .select('id, sender_id, created_at, profiles!trades_sender_id_fkey(first_name, avatar_url)')
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (tradeData) setTrades(tradeData);

      setIsLoading(false);
    };

    fetchNotifications();

    // Realtime per i trade
    const tradeSub = supabase.channel('pending_trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `receiver_id=eq.${currentUser.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tradeSub);
    };
  }, [currentUser.id]);

  const handleAcceptTrade = async (tradeId: string) => {
    const { error } = await supabase.from('trades').update({ status: 'active' }).eq('id', tradeId);
    if (error) showError("Errore durante l'accettazione dello scambio.");
    else showSuccess("Scambio accettato! Si aprirà la finestra di scambio.");
  };

  const handleDeclineTrade = async (tradeId: string) => {
    const { error } = await supabase.from('trades').delete().eq('id', tradeId);
    if (error) showError("Errore durante il rifiuto dello scambio.");
    else showSuccess("Scambio rifiutato.");
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
                      onClick={() => handleAcceptTrade(trade.id)}
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

              {!canClaimReward && trades.length === 0 && mentions.length === 0 && (
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