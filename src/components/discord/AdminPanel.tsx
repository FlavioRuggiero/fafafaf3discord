"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, Shield, Coins, Plus, Minus, Palette, Settings2, TrendingUp, PackageOpen, Ghost } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, User } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProfilePopover } from "./ProfilePopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SHOP_ITEMS } from "@/data/shopItems";

interface AdminPanelProps {
  onClose: () => void;
}

const getThemeTextClass = (id: string) => {
  switch(id) {
    case 'supernova': return 'theme-text-supernova';
    case 'esquelito': return 'theme-text-esquelito';
    case 'oceanic': return 'theme-text-oceanic';
    case 'saturn-fire': return 'theme-text-saturn-fire';
    case 'gustavo-armando': return 'theme-text-gustavo';
    case 'serpixel-agitato': return 'theme-text-serpixel-agitato';
    default: return 'text-white';
  }
};

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { adminId } = useAuth();
  const [activeTab, setActiveTab] = useState<'dc' | 'mods' | 'cosmetics' | 'chests' | 'jumpscare'>('dc');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [selectedCosmeticId, setSelectedCosmeticId] = useState<string>(SHOP_ITEMS[0]?.id || '');

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
    // Ottieni il canale globale già esistente
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

    // Se il canale è già connesso (grazie a Index.tsx), invia direttamente
    if (channel.state === 'joined') {
      sendPayload();
    } else {
      // Altrimenti iscriviti e poi invia
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          sendPayload();
        }
      });
    }
  };

  // Calcolo live delle probabilità
  const calculateChances = (isPremium: boolean) => {
    let totalWeight = 0;
    const weights = SHOP_ITEMS.map(item => {
      let weight = 50000 / (item.price * item.price);
      if (isPremium && item.price >= chestSettings.rare_threshold) {
        weight *= chestSettings.premium_multiplier;
      }
      totalWeight += weight;
      return { id: item.id, weight };
    });
    return weights.map(w => ({ id: w.id, chance: (w.weight / totalWeight) * 100 }));
  };

  const standardChances = calculateChances(false);
  const premiumChances = calculateChances(true);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#313338] rounded-lg w-[700px] max-h-[85vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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

        {/* Tabs */}
        <div className="flex flex-shrink-0 px-4 pt-4 gap-4 border-b border-[#1e1f22] overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('dc')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dc' ? 'border-[#5865f2] text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <Coins size={16} />
              Gestione DigitalCardus
            </div>
          </button>
          <button
            onClick={() => setActiveTab('mods')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'mods' ? 'border-[#5865f2] text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              Gestione Moderatori
            </div>
          </button>
          <button
            onClick={() => setActiveTab('cosmetics')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'cosmetics' ? 'border-[#5865f2] text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <Palette size={16} />
              Gestione Cosmetici
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chests')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'chests' ? 'border-[#5865f2] text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <PackageOpen size={16} />
              Gestione Bauli
            </div>
          </button>
          <button
            onClick={() => setActiveTab('jumpscare')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'jumpscare' ? 'border-[#f23f43] text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <Ghost size={16} className={activeTab === 'jumpscare' ? 'text-[#f23f43]' : ''} />
              Jumpscare
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          
          {activeTab === 'jumpscare' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-shrink-0 bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22] mb-4 text-center">
                <Ghost size={48} className="text-[#f23f43] mx-auto mb-4" />
                <h3 className="text-white font-bold text-xl mb-2">Invia un Jumpscare</h3>
                <p className="text-[#b5bac1] text-sm mb-6">
                  Spaventa un utente specifico o tutti gli utenti attualmente online. L'effetto apparirà istantaneamente sui loro schermi.
                </p>
                
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="text-left">
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Seleziona Bersaglio</label>
                    <select
                      value={selectedJumpscareTarget}
                      onChange={(e) => setSelectedJumpscareTarget(e.target.value)}
                      className="w-full bg-[#1e1f22] text-white rounded p-2.5 focus:outline-none border border-[#3f4147] cursor-pointer"
                    >
                      <option value="all">Tutti gli utenti attivi</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.first_name || 'Utente'} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button 
                    onClick={handleSendJumpscare}
                    className="w-full py-3 bg-[#f23f43] hover:bg-[#da373c] text-white font-bold rounded transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Ghost size={18} />
                    Invia Jumpscare Ora
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chests' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-shrink-0 bg-[#2b2d31] p-4 rounded-lg border border-[#1e1f22] mb-4">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Settings2 size={18} className="text-brand"/> Parametri Bauli</h3>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-bold text-[#b5bac1] uppercase">Moltiplicatore Premium (Oggetti Rari)</label>
                      <span className="text-brand font-bold">{chestSettings.premium_multiplier}x</span>
                    </div>
                    <input 
                      type="range" min="1" max="10" step="0.1" 
                      value={chestSettings.premium_multiplier}
                      onChange={e => setChestSettings({...chestSettings, premium_multiplier: parseFloat(e.target.value)})}
                      className="w-full accent-brand cursor-pointer"
                    />
                    <p className="text-[10px] text-[#949ba4] mt-1">Aumenta la probabilità di trovare oggetti rari nel Baule Premium.</p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-bold text-[#b5bac1] uppercase">Soglia Rarità (Prezzo in DC)</label>
                      <span className="text-yellow-500 font-bold">{chestSettings.rare_threshold} DC</span>
                    </div>
                    <input 
                      type="range" min="10" max="500" step="10" 
                      value={chestSettings.rare_threshold}
                      onChange={e => setChestSettings({...chestSettings, rare_threshold: parseInt(e.target.value)})}
                      className="w-full accent-yellow-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-[#949ba4] mt-1">Gli oggetti che costano almeno questo valore riceveranno il moltiplicatore nel Baule Premium.</p>
                  </div>
                  
                  <button 
                    onClick={handleSaveChestSettings}
                    disabled={isSavingChests}
                    className="w-full py-2.5 bg-[#23a559] hover:bg-[#1a7c43] text-white font-bold rounded transition-colors shadow-lg"
                  >
                    {isSavingChests ? 'Salvataggio...' : 'Salva Impostazioni nel Database'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col bg-[#2b2d31] rounded-lg border border-[#1e1f22]">
                <div className="p-3 border-b border-[#1e1f22] bg-[#1e1f22]">
                  <h3 className="text-white font-bold flex items-center gap-2 text-sm"><TrendingUp size={16} className="text-blue-400"/> Anteprima Probabilità (Live)</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  <div className="flex text-[10px] font-bold text-[#949ba4] uppercase px-2 pb-1">
                    <div className="flex-1">Oggetto</div>
                    <div className="w-20 text-right">Standard</div>
                    <div className="w-20 text-right text-yellow-500">Premium</div>
                  </div>
                  {SHOP_ITEMS.sort((a,b) => b.price - a.price).map(item => {
                     const stdChance = standardChances.find(c => c.id === item.id)?.chance || 0;
                     const prmChance = premiumChances.find(c => c.id === item.id)?.chance || 0;
                     const isRare = item.price >= chestSettings.rare_threshold;
                     const diff = prmChance - stdChance;
                     
                     return (
                       <div key={item.id} className="flex items-center bg-[#1e1f22] p-2 rounded border border-transparent hover:border-[#3f4147]">
                         <div className="flex-1 min-w-0 flex items-center gap-2">
                           <span className={`text-xs font-medium truncate ${getThemeTextClass(item.id)}`}>{item.name}</span>
                           <span className="text-[10px] text-[#949ba4] bg-[#2b2d31] px-1.5 rounded">{item.price} DC</span>
                           {isRare && <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 rounded border border-yellow-500/20">Raro</span>}
                         </div>
                         <div className="w-20 text-right text-xs text-[#dbdee1]">{stdChance.toFixed(2)}%</div>
                         <div className="w-20 text-right text-xs font-bold flex items-center justify-end gap-1">
                           {isRare && diff > 0 && <span className="text-[9px] text-[#23a559]">(+{diff.toFixed(1)}%)</span>}
                           <span className="text-yellow-500">{prmChance.toFixed(2)}%</span>
                         </div>
                       </div>
                     )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'chests' && activeTab !== 'jumpscare' && (
            <>
              {activeTab === 'cosmetics' && (
                <div className="flex-shrink-0 mb-4 bg-[#2b2d31] p-3 rounded-lg border border-[#1e1f22]">
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Seleziona Cosmetico da gestire</label>
                  <select
                    value={selectedCosmeticId}
                    onChange={(e) => setSelectedCosmeticId(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white rounded p-2 focus:outline-none border border-[#3f4147] cursor-pointer"
                  >
                    {SHOP_ITEMS.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category}) - {item.price} DC
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex-shrink-0 relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-[#949ba4]" />
                </div>
                <input
                  type="text"
                  placeholder="Cerca utente per nome o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e1f22] text-white rounded p-2 pl-10 focus:outline-none placeholder-[#949ba4]"
                />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 min-h-[300px]">
                {loading ? (
                  <div className="text-center text-[#949ba4] py-4">Caricamento...</div>
                ) : users.length === 0 ? (
                  <div className="text-center text-[#949ba4] py-4">Nessun utente trovato.</div>
                ) : (
                  users.map(user => {
                    const userRole = (user as any).role || 'user';
                    const isAdmin = user.id === adminId;
                    const isMod = userRole === 'moderator';
                    const hasCosmetic = user.purchased_decorations?.includes(selectedCosmeticId) || false;
                    
                    const userForCard: User = {
                      id: user.id,
                      name: user.first_name || 'Utente',
                      avatar: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
                      status: 'online',
                      bio: user.bio || undefined,
                      banner_color: user.banner_color || undefined,
                      banner_url: user.banner_url || undefined,
                      level: user.level || 1,
                      digitalcardus: user.digitalcardus ?? 25,
                      xp: user.xp || 0,
                      global_role: isAdmin ? 'CREATOR' : isMod ? 'MODERATOR' : 'USER',
                      avatar_decoration: user.avatar_decoration || null,
                      purchased_decorations: user.purchased_decorations || []
                    };
                    
                    return (
                      <div key={user.id} className="bg-[#2b2d31] p-3 rounded flex items-center justify-between border border-transparent hover:border-[#3f4147] transition-colors">
                        <ProfilePopover user={userForCard} side="right" align="center">
                          <div className="flex items-center gap-3 cursor-pointer hover:bg-[#35373c] p-1.5 rounded transition-colors flex-1 min-w-0">
                            <img 
                              src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                              alt="avatar" 
                              className="w-10 h-10 rounded-full bg-[#1e1f22] object-cover flex-shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="text-white font-medium flex items-center gap-1.5 truncate">
                                <span className="truncate">{user.first_name || 'Utente Sconosciuto'}</span>
                                {isAdmin && (
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-help flex items-center"><Shield size={14} className="text-red-500 flex-shrink-0" /></div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                                      admin di discord canary 2
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {!isAdmin && isMod && (
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-help flex items-center"><Shield size={14} className="text-blue-400 flex-shrink-0" /></div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                                      moderatore ufficiale
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="text-[11px] text-[#b5bac1] truncate">
                                {(user as any).email || 'Email non disponibile'}
                              </div>
                              <div className="text-xs text-[#949ba4] mt-0.5">
                                {activeTab === 'dc' && `${user.digitalcardus ?? 0} DC`}
                                {activeTab === 'mods' && `Ruolo: ${isAdmin ? 'admin' : userRole}`}
                                {activeTab === 'cosmetics' && (
                                  <span className={hasCosmetic ? "text-[#23a559]" : "text-[#949ba4]"}>
                                    {hasCosmetic ? "Possiede l'oggetto" : "Non possiede l'oggetto"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </ProfilePopover>

                        <div className="flex-shrink-0 ml-4">
                          {activeTab === 'dc' && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Importo"
                                value={amounts[user.id] || ''}
                                onChange={(e) => setAmounts(prev => ({ ...prev, [user.id]: e.target.value }))}
                                className="w-20 bg-[#1e1f22] text-white rounded p-1.5 text-sm focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateDC(user.id, user.digitalcardus ?? 0, true)}
                                className="p-1.5 bg-[#23a559] text-white rounded hover:bg-[#1a7c43] transition-colors"
                                title="Aggiungi"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => handleUpdateDC(user.id, user.digitalcardus ?? 0, false)}
                                className="p-1.5 bg-[#da373c] text-white rounded hover:bg-[#a12828] transition-colors"
                                title="Rimuovi"
                              >
                                <Minus size={16} />
                              </button>
                            </div>
                          )}
                          
                          {activeTab === 'mods' && (
                            <button
                              onClick={() => handleToggleMod(user.id, userRole)}
                              disabled={isAdmin}
                              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                isAdmin 
                                  ? 'bg-[#1e1f22] text-[#949ba4] cursor-not-allowed'
                                  : userRole === 'moderator' 
                                    ? 'bg-[#da373c] text-white hover:bg-[#a12828]' 
                                    : 'bg-[#5865f2] text-white hover:bg-[#4752c4]'
                              }`}
                            >
                              {isAdmin ? 'Admin' : userRole === 'moderator' ? 'Rimuovi Mod' : 'Rendi Mod'}
                            </button>
                          )}

                          {activeTab === 'cosmetics' && (
                            <button
                              onClick={() => handleToggleCosmetic(user, selectedCosmeticId, hasCosmetic)}
                              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors w-24 ${
                                hasCosmetic 
                                  ? 'bg-[#da373c] text-white hover:bg-[#a12828]' 
                                  : 'bg-[#23a559] text-white hover:bg-[#1a7c43]'
                              }`}
                            >
                              {hasCosmetic ? 'Rimuovi' : 'Assegna'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};