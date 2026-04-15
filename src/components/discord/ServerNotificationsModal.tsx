"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Avatar } from "./Avatar";

interface ServerNotificationsModalProps {
  serverId: string;
  onClose: () => void;
}

export const ServerNotificationsModal = ({ serverId, onClose }: ServerNotificationsModalProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    
    const sub = supabase.channel(`requests-modal-${serverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_join_requests', filter: `server_id=eq.${serverId}` }, fetchRequests)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [serverId]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('server_join_requests')
      .select(`
        id,
        user_id,
        status,
        created_at,
        profiles:user_id (
          id,
          first_name,
          avatar_url
        )
      `)
      .eq('server_id', serverId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const handleApprove = async (request: any) => {
    try {
      // Add to server_members
      const { error: memberError } = await supabase.from('server_members').insert({
        server_id: serverId,
        user_id: request.user_id
      });

      if (memberError) throw memberError;

      // Update request status
      await supabase.from('server_join_requests').update({ status: 'approved' }).eq('id', request.id);
      
      showSuccess("Utente approvato e aggiunto al server!");
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      showError("Errore durante l'approvazione: " + error.message);
    }
  };

  const handleReject = async (request: any) => {
    try {
      await supabase.from('server_join_requests').update({ status: 'rejected' }).eq('id', request.id);
      showSuccess("Richiesta rifiutata.");
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      showError("Errore durante il rifiuto: " + error.message);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#313338] rounded-md w-[500px] max-h-[80vh] shadow-lg flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#1e1f22] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus size={20} /> Richieste di Accesso
            </h2>
            <p className="text-sm text-[#b5bac1] mt-1">Gestisci chi vuole entrare nel tuo server privato.</p>
          </div>
          <button onClick={onClose} className="text-[#b5bac1] hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="text-center text-[#949ba4] py-8">Caricamento...</div>
          ) : requests.length === 0 ? (
            <div className="text-center text-[#949ba4] py-8">Nessuna richiesta in sospeso.</div>
          ) : (
            <div className="space-y-2">
              {requests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-[#2b2d31] p-3 rounded-md border border-[#1e1f22]">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      src={req.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user_id}`} 
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="text-white font-medium">{req.profiles?.first_name || 'Utente Sconosciuto'}</div>
                      <div className="text-xs text-[#949ba4]">Ha richiesto di entrare</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleApprove(req)}
                      className="w-8 h-8 rounded-full bg-[#23a559] hover:bg-[#1a7c43] flex items-center justify-center text-white transition-colors"
                      title="Approva"
                    >
                      <Check size={16} />
                    </button>
                    <button 
                      onClick={() => handleReject(req)}
                      className="w-8 h-8 rounded-full bg-[#da373c] hover:bg-[#a12828] flex items-center justify-center text-white transition-colors"
                      title="Rifiuta"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};