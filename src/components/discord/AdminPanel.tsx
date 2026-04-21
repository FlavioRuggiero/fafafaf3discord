"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Search, Shield, Coins, Plus, Minus, Palette, Settings2, TrendingUp, PackageOpen, Ghost, Wand2, Upload, Trash2, Type, Image as ImageIcon, SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, User } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProfilePopover } from "./ProfilePopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShop, CustomElement } from "@/contexts/ShopContext";

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { user: currentUser, adminId } = useAuth();
  const { allItems, customDecorations, refreshCustomDecorations } = useShop();
  
  const [activeTab, setActiveTab] = useState<'dc' | 'mods' | 'cosmetics' | 'chests' | 'jumpscare' | 'custom-editor'>('dc');
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

  // Stati per Editor Contorni Custom
  const [newDecName, setNewDecName] = useState('');
  const [newDecPrice, setNewDecPrice] = useState(100);
  const [newDecBorder, setNewDecBorder] = useState('#5865F2');
  const [newDecShadow, setNewDecShadow] = useState('#5865F2');
  
  const [textColorType, setTextColorType] = useState<'solid' | 'gradient'>('gradient');
  const [newDecTextColor, setNewDecTextColor] = useState('#ffffff');
  const [newDecGradStart, setNewDecGradStart] = useState('#5865F2');
  const [newDecGradEnd, setNewDecGradEnd] = useState('#00ffff');
  
  const [newDecAnim, setNewDecAnim] = useState('none');
  const [baseEffect, setBaseEffect] = useState('none');
  const [effectColor1, setEffectColor1] = useState('#5865F2');
  const [effectColor2, setEffectColor2] = useState('#f23f43');
  
  const [newDecImage, setNewDecImage] = useState<File | null>(null);
  const [newDecImagePreview, setNewDecImagePreview] = useState<string | null>(null);
  
  const [elements, setElements] = useState<CustomElement[]>([]);
  
  const [isCreatingDec, setIsCreatingDec] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Editor Contorni Custom
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewDecImage(file);
      setNewDecImagePreview(URL.createObjectURL(file));
    }
  };

  const addElement = () => {
    setElements([...elements, {
      id: `el-${Date.now()}`,
      type: 'emoji',
      content: '✨',
      animation: 'float',
      x: 50,
      y: 50,
      size: 15,
      delay: 0
    }]);
  };

  const updateElement = (id: string, field: keyof CustomElement, value: any) => {
    setElements(elements.map(el => el.id === id ? { ...el, [field]: value } : el));
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
  };

  const handleCreateCustomDecoration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecName.trim() || !currentUser) return;
    
    setIsCreatingDec(true);
    const customId = `custom-${Date.now()}`;
    let imageUrl = null;

    if (newDecImage) {
      const fileExt = newDecImage.name.split('.').pop();
      const filePath = `custom_decorations/${customId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('icons').upload(filePath, newDecImage);
      if (!uploadError) {
        const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }
    }

    const config = {
      baseEffect,
      effectColor1,
      effectColor2,
      elements
    };

    const { error } = await supabase.from('custom_decorations').insert({
      id: customId,
      name: newDecName.trim(),
      price: newDecPrice,
      category: 'Contorni Custom',
      image_url: imageUrl,
      border_color: newDecBorder,
      shadow_color: newDecShadow,
      text_color_type: textColorType,
      text_color: newDecTextColor,
      text_gradient_start: newDecGradStart,
      text_gradient_end: newDecGradEnd,
      animation_type: newDecAnim,
      config: config
    });

    if (error) {
      showError("Errore durante la creazione. Hai eseguito lo script SQL?");
    } else {
      // Aggiungi automaticamente all'inventario del creatore
      const { data: profile } = await supabase.from('profiles').select('purchased_decorations').eq('id', currentUser.id).single();
      const currentPurchased = profile?.purchased_decorations || [];
      await supabase.from('profiles').update({ purchased_decorations: [...currentPurchased, customId] }).eq('id', currentUser.id);

      showSuccess("Contorno creato e aggiunto al tuo inventario!");
      setNewDecName('');
      setNewDecImage(null);
      setNewDecImagePreview(null);
      setElements([]);
      await refreshCustomDecorations();
    }
    setIsCreatingDec(false);
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

  // Calcolo live delle probabilità
  const calculateChances = (isPremium: boolean) => {
    let totalWeight = 0;
    const weights = allItems.map(item => {
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

  // Helper per l'anteprima
  const getAnimation = (anim: string, delay: number) => {
    const delayStr = delay > 0 ? `${delay}s` : '0s';
    switch(anim) {
      case 'float': return `custom-float 3s ease-in-out infinite ${delayStr}`;
      case 'pulse': return `custom-pulse 2s infinite ${delayStr}`;
      case 'spin': return `spin-slow 4s linear infinite ${delayStr}`;
      case 'shake': return `custom-shake 0.5s infinite ${delayStr}`;
      case 'orbit-2d': return `custom-orbit-2d 4s linear infinite ${delayStr}`;
      default: return 'none';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#313338] rounded-lg w-[900px] max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
            onClick={() => setActiveTab('custom-editor')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'custom-editor' ? 'border-brand text-white' : 'border-transparent text-[#949ba4] hover:text-[#dbdee1]'}`}
          >
            <div className="flex items-center gap-2">
              <Wand2 size={16} className={activeTab === 'custom-editor' ? 'text-brand' : ''} />
              Editor Contorni
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
          
          {activeTab === 'custom-editor' && (
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
              <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1e1f22] mb-6">
                <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                  <Wand2 className="text-brand" /> Crea Contorno Custom
                </h3>
                
                <form onSubmit={handleCreateCustomDecoration} className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-6">
                    
                    {/* Info Base */}
                    <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                      <h4 className="text-white font-bold mb-3 text-sm uppercase">Info Base</h4>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Nome</label>
                          <input 
                            type="text" 
                            value={newDecName}
                            onChange={e => setNewDecName(e.target.value)}
                            required
                            className="w-full bg-[#2b2d31] text-white rounded p-2 focus:outline-none border border-[#3f4147]"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Prezzo (DC)</label>
                          <input 
                            type="number" 
                            min="1"
                            value={newDecPrice}
                            onChange={e => setNewDecPrice(parseInt(e.target.value) || 0)}
                            required
                            className="w-full bg-[#2b2d31] text-white rounded p-2 focus:outline-none border border-[#3f4147]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stile Testo */}
                    <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                      <h4 className="text-white font-bold mb-3 text-sm uppercase">Stile Testo</h4>
                      <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 text-white cursor-pointer">
                          <input type="radio" checked={textColorType === 'solid'} onChange={() => setTextColorType('solid')} className="accent-brand" />
                          Tinta Unita
                        </label>
                        <label className="flex items-center gap-2 text-white cursor-pointer">
                          <input type="radio" checked={textColorType === 'gradient'} onChange={() => setTextColorType('gradient')} className="accent-brand" />
                          Gradiente
                        </label>
                      </div>

                      {textColorType === 'solid' ? (
                        <div>
                          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Colore Testo</label>
                          <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                            <input type="color" value={newDecTextColor} onChange={e => setNewDecTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                            <span className="text-white text-sm uppercase">{newDecTextColor}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Inizio Gradiente</label>
                            <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                              <input type="color" value={newDecGradStart} onChange={e => setNewDecGradStart(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                              <span className="text-white text-sm uppercase">{newDecGradStart}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Fine Gradiente</label>
                            <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                              <input type="color" value={newDecGradEnd} onChange={e => setNewDecGradEnd(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                              <span className="text-white text-sm uppercase">{newDecGradEnd}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stile Bordo & Sfondo */}
                    <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                      <h4 className="text-white font-bold mb-3 text-sm uppercase">Stile Bordo & Sfondo</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Colore Bordo</label>
                          <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                            <input type="color" value={newDecBorder} onChange={e => setNewDecBorder(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                            <span className="text-white text-sm uppercase">{newDecBorder}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Colore Ombra</label>
                          <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                            <input type="color" value={newDecShadow} onChange={e => setNewDecShadow(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                            <span className="text-white text-sm uppercase">{newDecShadow}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Animazione Sfondo</label>
                          <select 
                            value={newDecAnim}
                            onChange={e => setNewDecAnim(e.target.value)}
                            className="w-full bg-[#2b2d31] text-white rounded p-2 focus:outline-none border border-[#3f4147] cursor-pointer"
                          >
                            <option value="none">Nessuna</option>
                            <option value="spin">Rotazione</option>
                            <option value="pulse">Pulsazione</option>
                            <option value="bounce">Rimbalzo</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Immagine Sfondo</label>
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-[#2b2d31] hover:bg-[#35373c] text-white rounded p-2 border border-[#3f4147] transition-colors flex items-center justify-center gap-2"
                          >
                            <Upload size={16} /> {newDecImage ? 'Cambia Immagine' : 'Carica Immagine'}
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                        </div>
                      </div>
                    </div>

                    {/* Effetti Speciali */}
                    <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-white font-bold text-sm uppercase">Effetti & Elementi</h4>
                        <button type="button" onClick={addElement} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                          <Plus size={12} /> Aggiungi Elemento
                        </button>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Effetto Base</label>
                        <select 
                          value={baseEffect}
                          onChange={e => setBaseEffect(e.target.value)}
                          className="w-full bg-[#2b2d31] text-white rounded p-2 focus:outline-none border border-[#3f4147] cursor-pointer mb-3"
                        >
                          <option value="none">Nessuno</option>
                          <option value="scanline">Scanline (Stile Serpixel)</option>
                          <option value="radar">Radar</option>
                          <option value="twin-rings">Anelli Gemelli</option>
                          <option value="circo">Circo</option>
                          <option value="pulse-ring">Anello Pulsante</option>
                          <option value="supernova">Supernova Cosmica</option>
                          <option value="esquelito">Esquelito Explosivo</option>
                          <option value="oceanic">Vortice Oceanico</option>
                          <option value="saturn-fire">Saturno a Fuoco</option>
                          <option value="gustavo-armando">Gustavo Armando</option>
                          <option value="serpixel-agitato">Serpixel Agitato</option>
                          <option value="tempesta">Tempesta</option>
                          <option value="ghiacciolo">Ghiacciolo</option>
                        </select>

                        {baseEffect !== 'none' && !['supernova', 'esquelito', 'oceanic', 'gustavo-armando', 'serpixel-agitato', 'tempesta', 'ghiacciolo'].includes(baseEffect) && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Colore Effetto 1</label>
                              <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                                <input type="color" value={effectColor1} onChange={e => setEffectColor1(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" />
                                <span className="text-white text-xs uppercase">{effectColor1}</span>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Colore Effetto 2</label>
                              <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                                <input type="color" value={effectColor2} onChange={e => setEffectColor2(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" />
                                <span className="text-white text-xs uppercase">{effectColor2}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {elements.length > 0 && (
                        <div className="space-y-3">
                          {elements.map((el, idx) => (
                            <div key={el.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                              <button type="button" onClick={() => removeElement(el.id)} className="absolute top-2 right-2 text-[#f23f43] hover:text-white transition-colors">
                                <X size={16} />
                              </button>
                              <div className="grid grid-cols-2 gap-3 mb-3 pr-6">
                                <div>
                                  <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Tipo</label>
                                  <select value={el.type} onChange={e => updateElement(el.id, 'type', e.target.value)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]">
                                    <option value="emoji">Emoji</option>
                                    <option value="image">URL Immagine</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Contenuto</label>
                                  <input type="text" value={el.content} onChange={e => updateElement(el.id, 'content', e.target.value)} placeholder={el.type === 'emoji' ? '✨' : 'https://...'} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Pos X (%)</label>
                                  <input type="number" min="-50" max="150" value={el.x} onChange={e => updateElement(el.id, 'x', parseInt(e.target.value)||0)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Pos Y (%)</label>
                                  <input type="number" min="-50" max="150" value={el.y} onChange={e => updateElement(el.id, 'y', parseInt(e.target.value)||0)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Animazione</label>
                                  <select value={el.animation} onChange={e => updateElement(el.id, 'animation', e.target.value)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]">
                                    <option value="none">Nessuna</option>
                                    <option value="float">Fluttua</option>
                                    <option value="pulse">Pulsazione</option>
                                    <option value="spin">Rotazione</option>
                                    <option value="shake">Tremolio</option>
                                    <option value="orbit-2d">Orbita 2D</option>
                                    <option value="orbit-3d">Orbita 3D</option>
                                    <option value="orbit-3d-reverse">Orbita 3D Inversa</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Dimensione</label>
                                  <input type="number" value={el.size} onChange={e => updateElement(el.id, 'size', parseInt(e.target.value)||15)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Ritardo (s)</label>
                                  <input type="number" step="0.1" value={el.delay} onChange={e => updateElement(el.id, 'delay', parseFloat(e.target.value)||0)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      type="submit"
                      disabled={isCreatingDec || !newDecName.trim()}
                      className="w-full py-3 bg-brand hover:bg-brand/80 text-white font-bold rounded transition-colors shadow-lg mt-4 disabled:opacity-50"
                    >
                      {isCreatingDec ? 'Creazione in corso...' : 'Crea Contorno'}
                    </button>
                  </div>

                  {/* Anteprima */}
                  <div className="w-full lg:w-80 flex flex-col items-center justify-center bg-[#1e1f22] rounded-lg border border-[#3f4147] p-6 sticky top-0">
                    <h3 className="text-[#b5bac1] font-bold mb-8 uppercase text-xs tracking-wider">Anteprima Live</h3>
                    
                    <div className="dec-wrapper relative w-32 h-32 mb-8">
                      <div 
                        className="relative rounded-full flex items-center justify-center w-full h-full z-10"
                        style={{
                          border: `2px solid ${newDecBorder}`,
                          boxShadow: `0 0 10px ${newDecShadow}, inset 0 0 10px ${newDecShadow}`,
                        }}
                      >
                        {/* Sfondo Animato */}
                        {newDecImagePreview && (
                          <img 
                            src={newDecImagePreview} 
                            className="absolute inset-0 w-full h-full object-cover rounded-full opacity-60 pointer-events-none mix-blend-screen" 
                            style={{ 
                              animation: newDecAnim === 'spin' ? 'spin-slow 4s linear infinite' : 
                                         newDecAnim === 'pulse' ? 'custom-pulse 2s infinite' : 
                                         newDecAnim === 'bounce' ? 'custom-bounce 2s infinite' : 'none' 
                            }} 
                          />
                        )}
                        
                        {/* Effetti Base */}
                        {baseEffect === 'scanline' && <div className="custom-scanline" style={{ color: effectColor1 }}></div>}
                        {baseEffect === 'radar' && <div className="absolute inset-[-3px] rounded-full" style={{ background: `conic-gradient(from 0deg, transparent 70%, ${effectColor1} 100%)`, animation: 'spin-slow 1.5s linear infinite' }}></div>}
                        {baseEffect === 'twin-rings' && (
                          <>
                            <div className="absolute inset-[-3px] rounded-full" style={{ border: `2px dashed ${effectColor1}`, animation: 'spin-slow 4s linear infinite' }}></div>
                            <div className="absolute inset-[-6px] rounded-full" style={{ border: `2px dashed ${effectColor2}`, animation: 'spin-slow 3s linear infinite reverse' }}></div>
                          </>
                        )}
                        {baseEffect === 'circo' && <div className="absolute inset-[-3px] rounded-full" style={{ background: `repeating-conic-gradient(${effectColor1} 0deg 20deg, ${effectColor2} 20deg 40deg)`, animation: 'spin-slow 8s linear infinite' }}></div>}
                        {baseEffect === 'pulse-ring' && <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${effectColor1}`, animation: 'custom-pulse-ring 2s infinite', '--pulse-color': effectColor1 } as any}></div>}

                        {/* Avatar Base (Usa l'avatar dell'utente corrente) */}
                        <img src={currentUser?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=preview"} className="w-full h-full rounded-full object-cover relative z-10" />
                      </div>

                      {/* Effetti Base Premium (Dietro o Davanti) */}
                      <div className="absolute inset-0 pointer-events-none z-20">
                        {baseEffect === 'oceanic' && (
                          <>
                            <div className="water-drop-wrapper w1"><div className="water-drop-inner">💧</div></div>
                            <div className="water-drop-wrapper w2"><div className="water-drop-inner">💧</div></div>
                            <div className="water-drop-wrapper w3"><div className="water-drop-inner">💧</div></div>
                            <div className="oceanic-bubble b1"></div>
                            <div className="oceanic-bubble b2"></div>
                            <div className="oceanic-bubble b3"></div>
                          </>
                        )}
                        {baseEffect === 'saturn-fire' && (
                          <>
                            <div className="saturn-wrapper back"><div className="saturn-ring-inner" style={{ borderTopColor: effectColor1, borderBottomColor: effectColor2 }}></div></div>
                            <div className="saturn-wrapper front"><div className="saturn-ring-inner" style={{ borderTopColor: effectColor1, borderBottomColor: effectColor2 }}></div></div>
                            <div className="fire-particle f1"></div>
                            <div className="fire-particle f2"></div>
                            <div className="fire-particle f3"></div>
                          </>
                        )}
                        {baseEffect === 'supernova' && (
                          <>
                            <div className="supernova-star s1"></div>
                            <div className="supernova-star s2"></div>
                            <div className="supernova-star s3"></div>
                          </>
                        )}
                        {baseEffect === 'esquelito' && (
                          <>
                            <div className="esquelito-skull sk1"></div>
                            <div className="esquelito-skull sk2"></div>
                            <div className="esquelito-skull sk3"></div>
                          </>
                        )}
                        {baseEffect === 'gustavo-armando' && (
                          <>
                            <div className="gustavo-sprite gustavo-trail t2"></div>
                            <div className="gustavo-sprite gustavo-trail t1"></div>
                            <div className="gustavo-sprite gustavo-main"></div>
                            <div className="gustavo-orbit-wrapper o1"><div className="gustavo-orbit-inner"></div></div>
                            <div className="gustavo-orbit-wrapper o2"><div className="gustavo-orbit-inner"></div></div>
                            <div className="gustavo-orbit-wrapper o3"><div className="gustavo-orbit-inner"></div></div>
                            <div className="gustavo-orbit-wrapper o4"><div className="gustavo-orbit-inner"></div></div>
                            <div className="gustavo-orbit-wrapper o5"><div className="gustavo-orbit-inner"></div></div>
                            <div className="gustavo-orbit-wrapper o6"><div className="gustavo-orbit-inner"></div></div>
                            <div className="gustavo-orbit-wrapper o7"><div className="gustavo-orbit-inner"></div></div>
                            <div className="gustavo-orbit-wrapper o8"><div className="gustavo-orbit-inner"></div></div>
                          </>
                        )}
                        {baseEffect === 'serpixel-agitato' && (
                          <>
                            <div className="serpixel-scanline"></div>
                            <div className="serpixel-diamond-wrapper dw1"><div className="serpixel-diamond"></div></div>
                            <div className="serpixel-diamond-wrapper dw2"><div className="serpixel-diamond"></div></div>
                            <div className="serpixel-diamond-wrapper dw3"><div className="serpixel-diamond"></div></div>
                            <div className="serpixel-diamond-wrapper dw4"><div className="serpixel-diamond"></div></div>
                            <div className="serpixel-venom v1"></div>
                            <div className="serpixel-venom v2"></div>
                            <div className="serpixel-venom v3"></div>
                            <div className="serpixel-venom v4"></div>
                            <div className="serpixel-venom v5"></div>
                            <div className="serpixel-snake s1"></div>
                            <div className="serpixel-snake s2"></div>
                            <div className="serpixel-snake s3"></div>
                            <div className="serpixel-snake s4"></div>
                            <div className="serpixel-snake s5"></div>
                            <div className="serpixel-snake s6"></div>
                            <div className="serpixel-snake s7"></div>
                            <div className="serpixel-snake s8"></div>
                          </>
                        )}
                        {baseEffect === 'tempesta' && (
                          <>
                            <div className="storm-drop d1"></div>
                            <div className="storm-drop d2"></div>
                            <div className="storm-drop d3"></div>
                          </>
                        )}
                        {baseEffect === 'ghiacciolo' && (
                          <>
                            <div className="ice-flake f1">❄️</div>
                            <div className="ice-flake f2">❄️</div>
                            <div className="ice-flake f3">❄️</div>
                          </>
                        )}

                        {/* Elementi Fluttuanti Custom */}
                        {elements.map(el => {
                          if (el.animation === 'orbit-3d' || el.animation === 'orbit-3d-reverse') {
                            const wrapperAnim = el.animation === 'orbit-3d' ? 'custom-orbit-3d-wrapper' : 'custom-orbit-3d-wrapper-rev';
                            const innerAnim = el.animation === 'orbit-3d' ? 'custom-orbit-3d-inner' : 'custom-orbit-3d-inner-rev';
                            return (
                              <div key={el.id} className="custom-orbit-container" style={{ animation: `${wrapperAnim} 4s linear infinite ${el.delay > 0 ? el.delay+'s' : '0s'}` }}>
                                <div className="custom-orbit-element" style={{ animation: `${innerAnim} 4s linear infinite ${el.delay > 0 ? el.delay+'s' : '0s'}`, width: `${el.size}cqw`, height: `${el.size}cqw` }}>
                                  {el.type === 'emoji' ? <span style={{fontSize: `${el.size}cqw`}}>{el.content}</span> : <img src={el.content} className="w-full h-full object-contain" />}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div 
                              key={el.id} 
                              className={`absolute flex items-center justify-center`}
                              style={{ 
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                transform: 'translate(-50%, -50%)',
                                animation: getAnimation(el.animation, el.delay),
                                width: `${el.size}cqw`,
                                height: `${el.size}cqw`,
                                fontSize: `${el.size}cqw`
                              }}
                            >
                              {el.type === 'emoji' ? el.content : <img src={el.content} className="w-full h-full object-contain" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <span 
                      className="font-bold text-2xl text-center"
                      style={textColorType === 'solid' ? {
                        color: newDecTextColor,
                        textShadow: `0 0 10px ${newDecTextColor}80`
                      } : {
                        background: `linear-gradient(90deg, ${newDecGradStart || '#fff'}, ${newDecGradEnd || '#fff'})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: `0 0 15px ${newDecGradStart || '#fff'}80`
                      }}
                    >
                      {newDecName || 'Nome Contorno'}
                    </span>
                  </div>
                </form>
              </div>

              {/* Lista Contorni Custom */}
              {customDecorations.length > 0 && (
                <div className="bg-[#2b2d31] p-4 rounded-lg border border-[#1e1f22]">
                  <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contorni Custom Esistenti</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customDecorations.map(dec => (
                      <div key={dec.id} className="flex items-center justify-between bg-[#1e1f22] p-3 rounded border border-[#3f4147]">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full relative flex items-center justify-center"
                            style={{ border: `2px solid ${dec.border_color}`, boxShadow: `0 0 5px ${dec.shadow_color}` }}
                          >
                            {dec.image_url && <img src={dec.image_url} className="absolute inset-0 w-full h-full object-cover rounded-full opacity-60 mix-blend-screen" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold" style={
                              dec.text_color_type === 'solid' ? {
                                color: dec.text_color,
                                textShadow: `0 0 5px ${dec.text_color}80`
                              } : {
                                background: `linear-gradient(90deg, ${dec.text_gradient_start}, ${dec.text_gradient_end})`, 
                                WebkitBackgroundClip: 'text', 
                                WebkitTextFillColor: 'transparent' 
                              }
                            }>
                              {dec.name}
                            </span>
                            <span className="text-[10px] text-[#949ba4]">{dec.price} DC</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteCustomDecoration(dec.id)}
                          className="p-1.5 text-[#f23f43] hover:bg-[#f23f43]/20 rounded transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                  {allItems.sort((a,b) => b.price - a.price).map(item => {
                     const stdChance = standardChances.find(c => c.id === item.id)?.chance || 0;
                     const prmChance = premiumChances.find(c => c.id === item.id)?.chance || 0;
                     const isRare = item.price >= chestSettings.rare_threshold;
                     const diff = prmChance - stdChance;
                     
                     // Usa il context per lo stile del testo
                     const { getThemeClass, getThemeStyle } = useShop();
                     
                     return (
                       <div key={item.id} className="flex items-center bg-[#1e1f22] p-2 rounded border border-transparent hover:border-[#3f4147]">
                         <div className="flex-1 min-w-0 flex items-center gap-2">
                           <span className={`text-xs font-medium truncate ${getThemeClass(item.id)}`} style={getThemeStyle(item.id)}>{item.name}</span>
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

          {activeTab !== 'chests' && activeTab !== 'jumpscare' && activeTab !== 'custom-editor' && (
            <>
              {activeTab === 'cosmetics' && (
                <div className="flex-shrink-0 mb-4 bg-[#2b2d31] p-3 rounded-lg border border-[#1e1f22]">
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Seleziona Cosmetico da gestire</label>
                  <select
                    value={selectedCosmeticId}
                    onChange={(e) => setSelectedCosmeticId(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white rounded p-2 focus:outline-none border border-[#3f4147] cursor-pointer"
                  >
                    {allItems.map(item => (
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