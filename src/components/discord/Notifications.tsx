"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/discord';
import { Bell, ArrowRight, Check, X as XIcon, ArrowLeftRight, MessageSquare, Zap } from 'lucide-react';
import { Avatar } from './Avatar';
import { showSuccess, showError } from '@/utils/toast';

interface NotificationsProps {
  currentUser: User;
  onChannelSelect: (channel: any) => void;
}

export const Notifications = ({ currentUser, onChannelSelect }: NotificationsProps) => {
  const [pendingTrades, setPendingTrades] = useState<any[]>([]);
  const [mentions, setMentions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const sub = supabase.channel('notifications_view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `receiver_id=eq.${currentUser.id}` }, fetchData)
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch pending trades
    const { data: tradesData } = await supabase
      .from('trades')
      .select('*, sender:profiles!trades_sender_id_fkey(*)')
      .eq('receiver_id', currentUser.id)
      .eq('status', 'pending');
      
    setPendingTrades(tradesData || []);

    // Fetch mentions (simple text search for user ID)
    const { data: mentionsData } = await supabase
      .from('messages')
      .select('*, author:profiles!messages_user_id_fkey(*), channel:channels(*)')
      .ilike('content', `%${currentUser.id}%`)
      .order('created_at', { ascending: false })
      .limit(20);
      
    setMentions(mentionsData || []);
    setLoading(false);
  };

  const acceptTrade = async (tradeId: string) => {
    const { error } = await supabase
      .from('trades')
      .update({ receiver_accepted: true })
      .eq('id', tradeId);
      
    if (error) {
      showError("Errore nell'accettare lo scambio");
    } else {
      showSuccess("Scambio accettato!");
      // Il listener nella sidebar reindirizzerà automaticamente alla vista dello scambio
    }
  };

  const declineTrade = async (tradeId: string) => {
    const { error } = await supabase
      .from('trades')
      .update({ status: 'cancelled' })
      .eq('id', tradeId);
      
    if (error) {
      showError("Errore nel rifiutare lo scambio");
    } else {
      showSuccess("Scambio rifiutato");
      fetchData();
    }
  };

  return (
    <div className="flex-1 bg-[#313338] flex flex-col h-full overflow-hidden">
      <div className="h-12 border-b border-[#1f2023] flex items-center px-4 shadow-sm flex-shrink-0 bg-[#313338]">
        <Bell className="text-[#949ba4] mr-2" size={24} />
        <h3 className="font-semibold text-white">Notifiche</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Level Up Section */}
          <section>
            <h4 className="text-white font-bold uppercase text-xs mb-4 flex items-center">
              <Zap size={16} className="mr-2 text-yellow-400" />
              Livello Attuale
            </h4>
            <div className="bg-[#2b2d31] rounded-lg p-4 flex items-center justify-between border border-[#1e1f22]">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-[#1e1f22] flex items-center justify-center border-2 border-yellow-400">
                  <span className="text-yellow-400 font-bold text-lg">{currentUser.level || 1}</span>
                </div>
                <div className="ml-4">
                  <div className="text-white font-medium">Livello {currentUser.level || 1}</div>
                  <div className="text-[#949ba4] text-sm">Continua a chattare per salire di livello!</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#b5bac1] mb-1">XP: {currentUser.xp || 0} / {(currentUser.level || 1) * 5}</div>
                <div className="w-32 h-2 bg-[#1e1f22] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full" 
                    style={{ width: `${Math.min(100, ((currentUser.xp || 0) / ((currentUser.level || 1) * 5)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Trades Section */}
          <section>
            <h4 className="text-white font-bold uppercase text-xs mb-4 flex items-center">
              <ArrowLeftRight size={16} className="mr-2" />
              Richieste di Scambio ({pendingTrades.length})
            </h4>
            
            {pendingTrades.length === 0 ? (
              <div className="bg-[#2b2d31] rounded-lg p-4 text-center text-[#949ba4] text-sm border border-[#1e1f22]">
                Nessuna richiesta di scambio in sospeso.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTrades.map(trade => (
                  <div key={trade.id} className="bg-[#2b2d31] rounded-lg p-4 flex items-center justify-between border border-[#1e1f22]">
                    <div className="flex items-center">
                      <Avatar src={trade.sender?.avatar_url} className="w-10 h-10" />
                      <div className="ml-3">
                        <div className="text-white font-medium">{trade.sender?.first_name || 'Utente'}</div>
                        <div className="text-[#949ba4] text-sm">Ti ha inviato una richiesta di scambio</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => declineTrade(trade.id)}
                        className="p-2 rounded-full bg-[#35373c] text-[#dbdee1] hover:bg-[#da373c] hover:text-white transition-colors"
                        title="Rifiuta"
                      >
                        <XIcon size={18} />
                      </button>
                      <button 
                        onClick={() => acceptTrade(trade.id)}
                        className="p-2 rounded-full bg-[#23a559] text-white hover:bg-[#1a7c43] transition-colors"
                        title="Accetta"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Mentions Section */}
          <section>
            <h4 className="text-white font-bold uppercase text-xs mb-4 flex items-center">
              <MessageSquare size={16} className="mr-2" />
              Menzioni Recenti
            </h4>
            
            {mentions.length === 0 ? (
              <div className="bg-[#2b2d31] rounded-lg p-4 text-center text-[#949ba4] text-sm border border-[#1e1f22]">
                Nessuna menzione recente.
              </div>
            ) : (
              <div className="space-y-2">
                {mentions.map(mention => (
                  <div key={mention.id} className="bg-[#2b2d31] rounded-lg p-4 border border-[#1e1f22]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Avatar src={mention.author?.avatar_url} className="w-6 h-6" />
                        <span className="ml-2 text-white font-medium text-sm">{mention.author?.first_name || 'Utente'}</span>
                        <span className="ml-2 text-[#949ba4] text-xs">in #{mention.channel?.name || 'canale-sconosciuto'}</span>
                      </div>
                      <button 
                        onClick={() => onChannelSelect({ id: mention.channel_id, name: mention.channel?.name, type: 'text', server_id: mention.channel?.server_id })}
                        className="text-xs bg-[#404249] hover:bg-[#5865f2] text-white px-3 py-1 rounded transition-colors flex items-center"
                      >
                        Vai al messaggio <ArrowRight size={12} className="ml-1" />
                      </button>
                    </div>
                    <div className="text-[#dbdee1] text-sm bg-[#1e1f22] p-3 rounded border-l-4 border-[#5865f2]">
                      {mention.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};