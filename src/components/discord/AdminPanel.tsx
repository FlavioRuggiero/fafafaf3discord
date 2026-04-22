"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, Shield, Plus, Minus, Settings2, TrendingUp, PackageOpen, Ghost, Trash2, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useShop } from "@/contexts/ShopContext";

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { adminId } = useAuth();
  const { allItems, customDecorations, refreshCustomDecorations } = useShop();
  
  const [activeTab, setActiveTab] = useState<'dc' | 'mods' | 'cosmetics' | 'chests' | 'jumpscare' | 'custom-decs'>('dc');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [selectedCosmeticId, setSelectedCosmeticId] = useState<string>(allItems[0]?.id || '');

  // Stati per la gestione dei bauli
  const [chestSettings, setChestSettings] = useState({ premium_multiplier: 2.0, rare_threshold: 100 });
  const [isSavingChests, setIsSavingChests] = useState(false);

  // Stato per Jumpscare
  const [selectedJumpscareTarget, setSelectedJumpscareTarget] = useState<string>('all');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      let query = supabase.from('profiles').select('*').limit(50);
      
      if (searchQuery.trim()) {
        query = query.or(`first_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        setUsers(data as Profile[]);
      }
      setLoading(false);
    };

    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const fetchChestSettings = async () => {
      const { data } = await supabase.from('chest_settings').select('*').eq('id', 1).single();
      if (data) {
        setChestSettings({
          premium_multiplier: Number(data.premium_multiplier),
          rare_threshold: Number(data.rare_threshold)
        });
      }
    };
    fetchChestSettings();
  }, []);

  const handleUpdateDC = async (userId: string, currentDC: number, isAdding: boolean) => {
    const numAmount = parseInt(amounts[userId] || '0');
    if (isNaN(numAmount) || numAmount <= 0) {
      return showError("Inserisci un importo valido");
    }

    const newDC = isAdding ? (currentDC + numAmount) : Math.max(0, currentDC - numAmount);
    
    const { error } = await supabase.from('profiles').update({ digitalcardus: newDC }).eq('id', userId);
    
    if (error) {
      showError("Errore di permessi. Assicurati di aver eseguito il codice SQL per i permessi Admin.");
    } else {
      showSuccess(`DigitalCardus ${isAdding ? 'aggiunti' : 'rimossi'} con successo!`);
      setUsers(users.map(u => u.id === userId ? { ...u, digitalcardus: newDC } : u));
      setAmounts(prev => ({ ...prev, [userId]: '' }));
    }
  };

  const handleToggleMod = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'moderator' ? 'user' : 'moderator';
    
    const { error } = await supabase.from('profiles').update({ role: newRole } as any).eq('id', userId);
    
    if (error) {
      showError("Errore di permessi. Assicurati di aver eseguito il codice SQL per i permessi Admin.");
    } else {
      showSuccess(`Ruolo aggiornato a ${newRole}!`);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } as any : u));
    }
  };

  const handleToggleCosmetic = async (user: Profile, cosmeticId: string, hasIt: boolean) => {
    const currentPurchased = user.purchased_decorations || [];
    let newPurchased;
    let newEquipped = user.avatar_decoration;

    if (hasIt) {
      newPurchased = currentPurchased.filter(id => id !== cosmeticId);
      if (newEquipped === cosmeticId) {
        newEquipped = null;
      }
    } else {
      newPurchased = [...currentPurchased, cosmeticId];
    }

    const { error } = await supabase.from('profiles').update({ 
      purchased_decorations: newPurchased,
      avatar_decoration: newEquipped
    }).eq('id', user.id);

    if (error) {
      showError("Errore di permessi. Assicurati di aver eseguito il codice SQL per i permessi Admin.");
    } else {
      showSuccess(`Cosmetico ${hasIt ? 'rimosso' : 'assegnato'} con successo!`);
      setUsers(users.map(u => u.id === user.id ? { ...u, purchased_decorations: newPurchased, avatar_decoration: newEquipped } : u));
    }
  };

  const handleSaveChestSettings = async () => {
    setIsSavingChests(true);
    const { error } = await supabase.from('chest_settings').upsert({
      id: 1,
      premium_multiplier: chestSettings.premium_multiplier,
      rare_threshold: chestSettings.rare_threshold,
      updated_at: new Date().toISOString()
    });
    
    if (error) {
      showError("Errore durante il salvataggio. Hai eseguito lo script SQL?");
    } else {
      showSuccess("Impostazioni bauli aggiornate con successo!");
    }
    setIsSavingChests(false);
  };

  const handleSendJumpscare = async () => {
    const channel = supabase.channel('global_jumpscare');
    
    const sendPayload = () => {
      channel.send({
        type: 'broadcast',
        event: 'trigger',
        payload: { targetId: selectedJumpscareTarget }
      }).then((resp) => {
        if (resp === 'ok') {
          showSuccess("Jumpscare inviato con successo!");
        } else {
          showError("Errore nell'invio del Jumpscare.");
        }
      });
    };

    if (channel.state === 'joined') {
      sendPayload();
    } else {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          sendPayload();
        }
      });
    }
  };

  const handleDeleteCustomDecoration = async (id: string) => {
    const { error } = await supabase.from('custom_decorations').delete().eq('id', id);
    if (error) {
      showError("Errore durante l'eliminazione.");
    } else {
      showSuccess("Contorno eliminato.");
      await refreshCustomDecorations();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#313338] rounded-lg w-[1100px] max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#1e1f22] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-yellow-500" />
            Pannello Amministratore
          </h2>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#dbdee1] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex border-b border-[#1f2023] bg-[#2b2d31] overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab('dc')}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'dc' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
            >
              Gestione Utenti
            </button>
            <button 
              onClick={() => setActiveTab('mods')}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'mods' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
            >
              Moderatori
            </button>
            <button 
              onClick={() => setActiveTab('cosmetics')}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'cosmetics' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
            >
              Cosmetici
            </button>
            <button 
              onClick={() => setActiveTab('chests')}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'chests' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
            >
              Impostazioni Bauli
            </button>
            <button 
              onClick={() => setActiveTab('jumpscare')}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'jumpscare' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
            >
              Jumpscare
            </button>
            <button 
              onClick={() => setActiveTab('custom-decs')}
              className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'custom-decs' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
            >
              Contorni Custom
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {activeTab === 'dc' && (
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cerca utente per nome o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <Search className="absolute left-3 top-2.5 text-[#949ba4]" size={18} />
                </div>

                {loading ? (
                  <div className="text-center text-[#949ba4] py-8">Caricamento...</div>
                ) : (
                  <div className="space-y-2">
                    {users.map(user => (
                      <div key={user.id} className="bg-[#2b2d31] p-4 rounded-lg border border-[#1e1f22] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-10 h-10 rounded-full" />
                          <div>
                            <div className="text-white font-bold">{user.first_name || 'Utente'}</div>
                            <div className="text-xs text-[#949ba4]">{user.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center bg-[#1e1f22] px-3 py-1.5 rounded-md">
                            <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 mr-2" />
                            <span className="text-white font-bold">{user.digitalcardus ?? 25}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Importo"
                              value={amounts[user.id] || ''}
                              onChange={(e) => setAmounts({ ...amounts, [user.id]: e.target.value })}
                              className="w-24 bg-[#1e1f22] text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                            <button
                              onClick={() => handleUpdateDC(user.id, user.digitalcardus ?? 25, true)}
                              className="p-1.5 bg-[#23a559] hover:bg-[#1a7c43] text-white rounded transition-colors"
                              title="Aggiungi"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdateDC(user.id, user.digitalcardus ?? 25, false)}
                              className="p-1.5 bg-[#f23f43] hover:bg-[#da373c] text-white rounded transition-colors"
                              title="Rimuovi"
                            >
                              <Minus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mods' && (
              <div className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cerca utente per nome o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <Search className="absolute left-3 top-2.5 text-[#949ba4]" size={18} />
                </div>

                {loading ? (
                  <div className="text-center text-[#949ba4] py-8">Caricamento...</div>
                ) : (
                  <div className="space-y-2">
                    {users.map(user => {
                      const isMod = user.role === 'moderator';
                      const isCreator = user.id === adminId;
                      
                      return (
                        <div key={user.id} className="bg-[#2b2d31] p-4 rounded-lg border border-[#1e1f22] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-10 h-10 rounded-full" />
                            <div>
                              <div className="text-white font-bold flex items-center gap-2">
                                {user.first_name || 'Utente'}
                                {isCreator && <Shield size={14} className="text-red-500" />}
                                {!isCreator && isMod && <Shield size={14} className="text-blue-400" />}
                              </div>
                              <div className="text-xs text-[#949ba4]">{user.email}</div>
                            </div>
                          </div>
                          
                          <div>
                            {isCreator ? (
                              <span className="text-xs font-bold text-red-500 uppercase px-3 py-1.5 bg-red-500/10 rounded-md">
                                Creatore
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleMod(user.id, user.role || 'user')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                                  isMod 
                                    ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' 
                                    : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                                }`}
                              >
                                {isMod ? 'Rimuovi Moderatore' : 'Rendi Moderatore'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cosmetics' && (
              <div className="space-y-6">
                <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1e1f22] mb-6">
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Seleziona Cosmetico da gestire</label>
                  <select 
                    value={selectedCosmeticId}
                    onChange={(e) => setSelectedCosmeticId(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {allItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cerca utente per nome o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <Search className="absolute left-3 top-2.5 text-[#949ba4]" size={18} />
                </div>

                {loading ? (
                  <div className="text-center text-[#949ba4] py-8">Caricamento...</div>
                ) : (
                  <div className="space-y-2">
                    {users.map(user => {
                      const hasCosmetic = user.purchased_decorations?.includes(selectedCosmeticId);
                      
                      return (
                        <div key={user.id} className="bg-[#2b2d31] p-4 rounded-lg border border-[#1e1f22] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-10 h-10 rounded-full" />
                            <div>
                              <div className="text-white font-bold">{user.first_name || 'Utente'}</div>
                              <div className="text-xs text-[#949ba4]">{user.email}</div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleToggleCosmetic(user, selectedCosmeticId, !!hasCosmetic)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                              hasCosmetic 
                                ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' 
                                : 'bg-[#23a559] hover:bg-[#1a7c43] text-white'
                            }`}
                          >
                            {hasCosmetic ? 'Rimuovi' : 'Assegna'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chests' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22]">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Settings2 className="text-brand" />
                    Impostazioni Bauli Misteriosi
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                        Moltiplicatore Baule Premium
                      </label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          step="0.1"
                          min="1"
                          value={chestSettings.premium_multiplier}
                          onChange={(e) => setChestSettings({...chestSettings, premium_multiplier: parseFloat(e.target.value)})}
                          className="w-32 bg-[#1e1f22] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <span className="text-sm text-[#949ba4]">
                          Aumenta le probabilità di trovare oggetti rari nel baule premium. (Es. 2.0 = probabilità raddoppiate)
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                        Soglia Oggetti Rari (Prezzo in DC)
                      </label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          min="0"
                          value={chestSettings.rare_threshold}
                          onChange={(e) => setChestSettings({...chestSettings, rare_threshold: parseInt(e.target.value)})}
                          className="w-32 bg-[#1e1f22] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                        <span className="text-sm text-[#949ba4]">
                          Gli oggetti che costano più di questa cifra verranno considerati "Rari" e beneficeranno del moltiplicatore.
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1f2023]">
                      <button 
                        onClick={handleSaveChestSettings}
                        disabled={isSavingChests}
                        className="bg-brand hover:bg-brand/80 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50"
                      >
                        {isSavingChests ? 'Salvataggio...' : 'Salva Impostazioni'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22]">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="text-yellow-500" />
                    Simulazione Probabilità
                  </h3>
                  <p className="text-sm text-[#b5bac1] mb-4">
                    Ecco come appariranno le probabilità con le impostazioni attuali (non salvate).
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                        <PackageOpen size={16} /> Baule Standard
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {allItems.sort((a, b) => b.price - a.price).map(item => {
                          let totalWeight = 0;
                          allItems.forEach(i => {
                            totalWeight += 50000 / (i.price * i.price);
                          });
                          const weight = 50000 / (item.price * item.price);
                          const chance = ((weight / totalWeight) * 100).toFixed(2);
                          
                          return (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-[#1e1f22] p-2 rounded">
                              <span className="text-[#dbdee1] truncate pr-2">{item.name}</span>
                              <span className="text-[#949ba4] font-mono">{chance}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-yellow-500 mb-3 flex items-center gap-2">
                        <PackageOpen size={16} /> Baule Premium
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {allItems.sort((a, b) => b.price - a.price).map(item => {
                          let totalWeight = 0;
                          allItems.forEach(i => {
                            let w = 50000 / (i.price * i.price);
                            if (i.price >= chestSettings.rare_threshold) w *= chestSettings.premium_multiplier;
                            totalWeight += w;
                          });
                          
                          let weight = 50000 / (item.price * item.price);
                          if (item.price >= chestSettings.rare_threshold) weight *= chestSettings.premium_multiplier;
                          
                          const chance = ((weight / totalWeight) * 100).toFixed(2);
                          const isRare = item.price >= chestSettings.rare_threshold;
                          
                          return (
                            <div key={item.id} className={`flex justify-between items-center text-sm bg-[#1e1f22] p-2 rounded border ${isRare ? 'border-yellow-500/30' : 'border-transparent'}`}>
                              <span className={`${isRare ? 'text-yellow-500 font-medium' : 'text-[#dbdee1]'} truncate pr-2`}>
                                {item.name}
                              </span>
                              <span className={`${isRare ? 'text-yellow-500' : 'text-[#949ba4]'} font-mono`}>
                                {chance}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'jumpscare' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22]">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Ghost className="text-red-500" />
                    Invia Jumpscare
                  </h3>
                  <p className="text-sm text-[#b5bac1] mb-6">
                    Invia un jumpscare a tutto schermo con audio al massimo volume. Usare con cautela.
                  </p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                        Bersaglio
                      </label>
                      <select 
                        value={selectedJumpscareTarget}
                        onChange={(e) => setSelectedJumpscareTarget(e.target.value)}
                        className="w-full bg-[#1e1f22] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="all">Tutti gli utenti online</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.first_name || 'Utente'} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-4 border-t border-[#1f2023]">
                      <button 
                        onClick={handleSendJumpscare}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                        <Ghost size={20} />
                        INVIA JUMPSCARE ORA
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'custom-decs' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22]">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Palette className="text-brand" />
                    Gestione Contorni Custom
                  </h3>
                  <p className="text-sm text-[#b5bac1] mb-6">
                    Visualizza ed elimina i contorni personalizzati creati dagli utenti.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {customDecorations.map(dec => (
                      <div key={dec.id} className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147] flex flex-col justify-between items-center text-center gap-3">
                        <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center" style={{ borderColor: dec.border_color, boxShadow: `0 0 10px ${dec.shadow_color}` }}>
                          {dec.image_url ? (
                            <img src={dec.image_url} className="w-full h-full rounded-full object-cover opacity-60" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-[#2b2d31]"></div>
                          )}
                        </div>
                        <div className="w-full">
                          <span className="text-white font-bold truncate block w-full">{dec.name}</span>
                          <span className="text-xs text-[#949ba4]">{dec.price} DC</span>
                        </div>
                        <button onClick={() => handleDeleteCustomDecoration(dec.id)} className="w-full py-2 bg-[#f23f43]/10 hover:bg-[#f23f43] text-[#f23f43] hover:text-white rounded transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                          <Trash2 size={16} /> Elimina
                        </button>
                      </div>
                    ))}
                    {customDecorations.length === 0 && (
                      <div className="col-span-full text-center text-[#949ba4] text-sm py-8">Nessun contorno custom creato.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};