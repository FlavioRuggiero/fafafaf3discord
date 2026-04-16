"use client";

import React, { useState, useEffect } from 'react';
import { X, Ghost, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Profile } from '@/types/discord';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState('jumpscare');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*').order('first_name');
      if (data) setUsers(data);
    };
    fetchUsers();
  }, []);

  const handleSendJumpscare = async () => {
    setIsSending(true);
    try {
      const channel = supabase.channel('system_jumpscares');
      await channel.send({
        type: 'broadcast',
        event: 'trigger',
        payload: { target: selectedUser }
      });
      showSuccess(selectedUser === 'all' ? 'Jumpscare inviato a tutti!' : 'Jumpscare inviato all\'utente!');
    } catch (error) {
      showError('Errore nell\'invio del jumpscare');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#313338] w-[800px] h-[600px] rounded-lg shadow-2xl flex overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-[230px] bg-[#2b2d31] flex flex-col py-4">
          <div className="px-4 mb-2 text-xs font-bold text-[#949ba4] uppercase">Pannello Admin</div>
          
          <button 
            onClick={() => setActiveTab('jumpscare')}
            className={`mx-2 px-2 py-1.5 rounded flex items-center text-sm mb-0.5 transition-colors ${activeTab === 'jumpscare' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
          >
            <Ghost size={18} className="mr-2" />
            Jumpscare
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className={`mx-2 px-2 py-1.5 rounded flex items-center text-sm mb-0.5 transition-colors ${activeTab === 'users' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
          >
            <Users size={18} className="mr-2" />
            Gestione Utenti
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#313338] p-8 relative flex flex-col">
          <button onClick={onClose} className="absolute top-6 right-6 text-[#949ba4] hover:text-[#dbdee1] transition-colors">
            <X size={24} />
          </button>

          {activeTab === 'jumpscare' && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Ghost className="mr-2 text-red-500" /> Jumpscare
              </h2>
              
              <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22]">
                <p className="text-[#b5bac1] text-sm mb-6">
                  Invia un jumpscare in tempo reale agli utenti connessi. Apparirà un'immagine spaventosa a tutto schermo accompagnata da un suono forte.
                </p>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Bersaglio</label>
                  <select 
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white p-3 rounded border-none outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="all">Tutti gli utenti attivi</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSendJumpscare}
                  disabled={isSending}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  <Ghost className="mr-2" size={20} />
                  {isSending ? 'Invio in corso...' : 'INVIA JUMPSCARE ORA'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Users className="mr-2" /> Gestione Utenti
              </h2>
              <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22]">
                <p className="text-[#b5bac1] text-sm">
                  Sezione in costruzione. Qui potrai gestire i ban globali, i ruoli e altre impostazioni degli utenti.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};