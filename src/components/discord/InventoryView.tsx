"use client";

import React, { useState, useEffect } from 'react';
import { User } from '@/types/discord';
import { Archive, Menu, Check, Coins, DollarSign, Crown, Wand2, Edit2, Search, X, Skull } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShop } from '@/contexts/ShopContext';
import { CustomDecorationEditorModal } from './CustomDecorationEditorModal';
import { ShopItem } from '@/data/shopItems';
import { CursorPreview } from './CursorPreview';

interface InventoryViewProps {
  currentUser: User;
  onToggleSidebar?: () => void;
  onlineUserIds: Set<string>;
  serverMembers: User[];
}

export const InventoryView = ({ currentUser, onToggleSidebar, onlineUserIds, serverMembers }: InventoryViewProps) => {
  const { allItems, getThemeClass, getThemeStyle } = useShop();
  const [itemToSell, setItemToSell] = useState<any | null>(null);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [decorationToEdit, setDecorationToEdit] = useState<string | undefined>(undefined);
  
  // Stati per l'attacco
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [attackSearchQuery, setAttackSearchQuery] = useState("");
  const [globalOnlineUsers, setGlobalOnlineUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (showAttackModal) {
      const fetchOnlineUsers = async () => {
        setIsLoadingUsers(true);
        const ids = Array.from(onlineUserIds).filter(id => id !== currentUser.id);
        if (ids.length === 0) {
          setGlobalOnlineUsers([]);
          setIsLoadingUsers(false);
          return;
        }
        
        const { data } = await supabase.from('profiles').select('id, first_name, avatar_url, avatar_decoration').in('id', ids);
        if (data) {
          setGlobalOnlineUsers(data.map(p => ({
            id: p.id,
            name: p.first_name || 'Utente',
            avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
            avatar_decoration: p.avatar_decoration
          })));
        }
        setIsLoadingUsers(false);
      };
      fetchOnlineUsers();
    }
  }, [showAttackModal, onlineUserIds, currentUser.id]);

  const handleEquip = async (item: ShopItem) => {
    const updateField = item.type === 'cursor' ? { active_cursor: item.id } : { avatar_decoration: item.id };
    const { error } = await supabase.from('profiles').update(updateField).eq('id', currentUser.id);
    if (error) showError("Errore durante l'equipaggiamento.");
    else showSuccess(`${item.type === 'cursor' ? 'Cursore' : 'Contorno'} equipaggiato!`);
  };

  const handleUnequip = async (item: ShopItem) => {
    const updateField = item.type === 'cursor' ? { active_cursor: null } : { avatar_decoration: null };
    const { error } = await supabase.from('profiles').update(updateField).eq('id', currentUser.id);
    if (error) showError("Errore durante la rimozione.");
    else showSuccess(`${item.type === 'cursor' ? 'Cursore' : 'Contorno'} rimosso!`);
  };

  const handleSell = async () => {
    if (!itemToSell) return;

    const refundAmount = Math.floor(itemToSell.price / 2);
    
    const currentDecs = [...(currentUser.purchased_decorations || [])];
    const indexToRemove = currentDecs.indexOf(itemToSell.id);
    if (indexToRemove !== -1) {
      currentDecs.splice(indexToRemove, 1);
    }
    
    const updates: any = {
      purchased_decorations: currentDecs,
      digitalcardus: (currentUser.digitalcardus || 0) + refundAmount
    };

    if (currentUser.avatar_decoration === itemToSell.id && !currentDecs.includes(itemToSell.id)) {
      updates.avatar_decoration = null;
    }
    if (currentUser.active_cursor === itemToSell.id && !currentDecs.includes(itemToSell.id)) {
      updates.active_cursor = null;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id);

    if (error) {
      showError("Errore durante la vendita dell'oggetto.");
    } else {
      showSuccess(`Oggetto venduto per ${refundAmount} Digitalcardus!`);
    }
    
    setItemToSell(null);
  };

  const handleLaunchAttack = async (targetUser: any) => {
    // 1. Rimuovi l'oggetto dall'inventario dell'attaccante
    const currentDecs = [...(currentUser.purchased_decorations || [])];
    const indexToRemove = currentDecs.indexOf('consumable-peste');
    if (indexToRemove !== -1) {
      currentDecs.splice(indexToRemove, 1);
    }

    const { error } = await supabase.from('profiles').update({ purchased_decorations: currentDecs }).eq('id', currentUser.id);
    if (error) {
      showError("Errore durante l'utilizzo dell'oggetto.");
      return;
    }

    // 2. Invia il broadcast alla vittima
    const channel = supabase.channel(`plague_events_${targetUser.id}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'plague_attack',
          payload: {
            attackerId: currentUser.id,
            attackerName: currentUser.name
          }
        });
        showSuccess(`Hai scatenato il Signore della Peste contro ${targetUser.name}!`);
        setShowAttackModal(false);
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    });
  };

  const ownedItems = allItems.filter(item => currentUser.purchased_decorations?.includes(item.id));
  const categories = Array.from(new Set(ownedItems.map(item => item.category)));

  // Filtra gli utenti online per l'attacco
  const attackableUsers = globalOnlineUsers.filter(u => u.name.toLowerCase().includes(attackSearchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative overflow-hidden h-full min-w-0">
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm bg-[#313338] z-10 flex-shrink-0">
        <div className="flex items-center text-white font-semibold">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
          )}
          <Archive className="mr-2 text-[#949ba4]" size={20} />
          Inventario
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Il tuo Inventario</h1>
            <p className="text-[#b5bac1]">Gestisci gli oggetti che hai acquistato nel Cardi E-Shop.</p>
          </div>

          {ownedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#949ba4]">
              <Archive size={64} className="mb-4 opacity-50" />
              <h2 className="text-xl font-medium text-white mb-2">Il tuo inventario è vuoto</h2>
              <p>Visita il Cardi E-Shop per acquistare nuove personalizzazioni!</p>
            </div>
          ) : (
            categories.map(category => (
              <div key={category} className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4 border-b border-[#3f4147] pb-2">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ownedItems.filter(item => item.category === category).map((item, idx) => {
                    const isEquipped = item.type === 'cursor' ? currentUser.active_cursor === item.id : currentUser.avatar_decoration === item.id;
                    const count = currentUser.purchased_decorations?.filter(id => id === item.id).length || 0;
                    const isCreator = item.creator_id === currentUser.id;

                    return (
                      <div key={`${item.id}-${idx}`} className={`bg-[#2b2d31] border ${isEquipped ? 'border-brand' : 'border-[#1e1f22]'} rounded-xl p-6 flex flex-col items-center text-center transition-colors shadow-md relative group`}>
                        
                        {isEquipped && (
                          <div className="absolute top-2 left-2 bg-brand text-white p-1 rounded-full shadow-md z-20">
                            <Check size={14} />
                          </div>
                        )}

                        {count > 1 && (
                          <div className="absolute top-2 right-10 bg-brand text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-20">
                            x{count}
                          </div>
                        )}

                        {isCreator && (
                          <button 
                            onClick={() => {
                              setDecorationToEdit(item.id);
                              setShowCustomEditor(true);
                            }}
                            className="absolute top-0 left-0 flex items-center gap-1 bg-[#1e1f22] hover:bg-brand text-brand hover:text-white px-2.5 py-1.5 rounded-tl-xl rounded-br-xl border-b border-r border-[#3f4147] hover:border-brand transition-all shadow-sm z-10 pointer-events-auto"
                            title="Modifica Contorno"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        <button 
                          onClick={() => setItemToSell(item)}
                          className="absolute top-0 right-0 flex items-center gap-1 bg-[#1e1f22] hover:bg-[#f23f43] text-[#f23f43] hover:text-white px-2.5 py-1.5 rounded-tr-xl rounded-bl-xl border-b border-l border-[#3f4147] hover:border-[#f23f43] transition-all shadow-sm z-10 pointer-events-auto"
                          title="Vendi oggetto"
                        >
                          <DollarSign size={14} />
                          <img src="/digitalcardus.png" alt="dc" className="w-3.5 h-3.5 object-contain" />
                        </button>
                        
                        {item.type === 'privilege' ? (
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="mb-6 mt-2 h-24 w-24 flex items-center justify-center bg-[#1e1f22] rounded-full border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] mx-auto cursor-help relative z-20">
                                <Crown size={40} className="text-yellow-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-medium text-sm max-w-xs text-center z-[99999]">
                              {item.description}
                            </TooltipContent>
                          </Tooltip>
                        ) : item.type === 'consumable' ? (
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="mb-6 mt-2 h-24 w-24 flex items-center justify-center bg-[#1e1f22] rounded-full border-2 border-brand shadow-[0_0_15px_rgba(88,101,242,0.3)] mx-auto cursor-help relative z-20 overflow-hidden">
                                {item.id === 'consumable-peste' ? (
                                  <img src="/signore-della-peste.png" className="w-16 h-16 object-contain animate-pulse" />
                                ) : (
                                  <Wand2 size={40} className="text-brand" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-medium text-sm max-w-xs text-center z-[99999]">
                              {item.description}
                            </TooltipContent>
                          </Tooltip>
                        ) : item.type === 'cursor' ? (
                          <div className="mb-6 mt-2 h-24 w-24 flex items-center justify-center mx-auto relative z-20">
                            <CursorPreview id={item.id} />
                          </div>
                        ) : item.type === 'emoji_pack' ? (
                          <div className="mb-6 mt-2 relative w-24 h-24 group/pack mx-auto">
                            <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2 bg-[#1e1f22] rounded-xl border border-[#3f4147] shadow-inner transition-all duration-300 group-hover/pack:opacity-0 group-hover/pack:scale-90">
                              {item.emojis?.slice(0, 4).map(e => (
                                <img key={e} src={e} className="w-full h-full object-contain drop-shadow-md" />
                              ))}
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#2b2d31] rounded-xl border-2 border-brand shadow-[0_0_30px_rgba(88,101,242,0.4)] grid grid-cols-4 gap-1.5 p-3 opacity-0 pointer-events-none group-hover/pack:opacity-100 group-hover/pack:pointer-events-auto transition-all duration-300 z-[60] scale-50 group-hover/pack:scale-100">
                              {item.emojis?.map((e, i) => (
                                <div key={e} className="flex items-center justify-center opacity-0" style={{ animation: `pop-in-emoji 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards ${i * 30}ms` }}>
                                  <img src={e} className="w-full h-full object-contain drop-shadow-md hover:scale-125 transition-transform cursor-pointer" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-6 mt-2 h-24 flex items-center justify-center relative z-20 pointer-events-none">
                            <Avatar src={currentUser.avatar} decoration={item.id} className="w-20 h-20" />
                          </div>
                        )}
                        
                        <h3 className={`font-bold mb-4 text-sm relative z-20 ${getThemeClass(item.id)}`} style={getThemeStyle(item.id)}>{item.name}</h3>

                        <div className="mt-auto w-full relative z-30">
                          {item.type === 'privilege' ? (
                            <button disabled className="w-full py-2 rounded bg-[#23a559] text-white font-medium opacity-80 cursor-default text-sm">
                              Privilegio Attivo
                            </button>
                          ) : item.type === 'consumable' ? (
                            <button 
                              onClick={() => {
                                if (item.id === 'custom-dec-ticket') {
                                  setDecorationToEdit(undefined);
                                  setShowCustomEditor(true);
                                } else if (item.id === 'consumable-peste') {
                                  setShowAttackModal(true);
                                }
                              }} 
                              className={`w-full py-2 rounded text-white font-medium transition-colors text-sm ${item.id === 'consumable-peste' ? 'bg-purple-600 hover:bg-purple-700 shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-brand hover:bg-brand/80'}`}
                            >
                              Usa
                            </button>
                          ) : item.type === 'emoji_pack' ? (
                            <button disabled className="w-full py-2 rounded bg-[#4f545c] text-white font-medium opacity-50 cursor-not-allowed text-sm">
                              In Chat
                            </button>
                          ) : isEquipped ? (
                            <button onClick={() => handleUnequip(item)} className="w-full py-2 rounded bg-[#f23f43] text-white font-medium hover:bg-[#da373c] transition-colors text-sm">
                              Rimuovi
                            </button>
                          ) : (
                            <button onClick={() => handleEquip(item)} className="w-full py-2 rounded bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors text-sm">
                              Equipaggia
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal di Conferma Vendita */}
      {itemToSell && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
          <div className="bg-[#313338] rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#1e1f22] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#f23f43]/20 flex items-center justify-center text-[#f23f43]">
                <Coins size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Conferma Vendita</h2>
            </div>
            
            <p className="text-[#dbdee1] mb-6 leading-relaxed">
              Sei sicuro di voler vendere <strong className={getThemeClass(itemToSell.id)} style={getThemeStyle(itemToSell.id)}>{itemToSell.name}</strong>? 
              <br className="mb-2" />
              Riceverai indietro <strong className="text-white">{Math.floor(itemToSell.price / 2)}</strong> <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 inline-block align-text-bottom" />.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setItemToSell(null)}
                className="px-4 py-2 rounded font-medium text-white hover:underline transition-all"
              >
                Annulla
              </button>
              <button 
                onClick={handleSell}
                className="px-4 py-2 rounded bg-[#f23f43] text-white font-medium hover:bg-[#da373c] transition-colors"
              >
                Conferma Vendita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selezione Bersaglio Peste */}
      {showAttackModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[99999] p-4 backdrop-blur-sm">
          <div className="bg-[#313338] rounded-xl max-w-md w-full shadow-2xl border border-purple-500/50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-[#1e1f22] bg-gradient-to-b from-purple-900/20 to-transparent">
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                  <Skull size={32} className="text-purple-400" />
                </div>
                <button onClick={() => setShowAttackModal(false)} className="text-[#949ba4] hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Scegli la tua vittima</h2>
              <p className="text-[#b5bac1] text-sm">Seleziona un utente online. Se non riesce a difendersi in tempo, gli ruberai un oggetto a caso!</p>
            </div>
            
            <div className="p-4 border-b border-[#1e1f22]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cerca utente online..."
                  value={attackSearchQuery}
                  onChange={(e) => setAttackSearchQuery(e.target.value)}
                  className="w-full bg-[#1e1f22] text-white rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <Search className="absolute left-3 top-2.5 text-[#949ba4]" size={18} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {isLoadingUsers ? (
                <div className="text-center text-[#949ba4] py-8">
                  Ricerca vittime in corso...
                </div>
              ) : attackableUsers.length === 0 ? (
                <div className="text-center text-[#949ba4] py-8">
                  Nessun utente online trovato.
                </div>
              ) : (
                <div className="space-y-2">
                  {attackableUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-[#2b2d31] p-3 rounded-lg border border-[#1e1f22] hover:border-purple-500/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar src={u.avatar} decoration={u.avatar_decoration} className="w-10 h-10" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2b2d31] bg-[#23a559]" />
                        </div>
                        <span className={`font-bold text-white ${getThemeClass(u.avatar_decoration)}`} style={getThemeStyle(u.avatar_decoration)}>
                          {u.name}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleLaunchAttack(u)}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded shadow-[0_0_10px_rgba(147,51,234,0.3)] opacity-0 group-hover:opacity-100 transition-all"
                      >
                        Attacca
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCustomEditor && (
        <CustomDecorationEditorModal 
          isOpen={showCustomEditor} 
          onClose={() => setShowCustomEditor(false)} 
          currentUser={currentUser} 
          editDecorationId={decorationToEdit}
        />
      )}
    </div>
  );
};