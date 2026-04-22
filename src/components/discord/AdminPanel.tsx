"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Search, Shield, Coins, Plus, Minus, Palette, Settings2, TrendingUp, PackageOpen, Ghost, Wand2, Upload, Trash2, Type, Image as ImageIcon, SmilePlus, Play, Copy, ClipboardPaste, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, User } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProfilePopover } from "./ProfilePopover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShop, CustomElement, BaseEffectConfig, CustomAnimationDef, CustomKeyframe, CustomDecoration } from "@/contexts/ShopContext";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const { user: currentUser, adminId } = useAuth();
  const { allItems, customDecorations, refreshCustomDecorations, clipboard, setClipboard } = useShop();
  
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
  const [editDecorationId, setEditDecorationId] = useState<string | null>(null);
  const [newDecName, setNewDecName] = useState('');
  const [newDecPrice, setNewDecPrice] = useState(100);
  const [newDecBorder, setNewDecBorder] = useState('#5865F2');
  const [newDecShadow, setNewDecShadow] = useState('#5865F2');
  
  const [textColorType, setTextColorType] = useState<'solid' | 'gradient'>('gradient');
  const [newDecTextColor, setNewDecTextColor] = useState('#ffffff');
  const [newDecGradStart, setNewDecGradStart] = useState('#5865F2');
  const [newDecGradEnd, setNewDecGradEnd] = useState('#00ffff');
  
  const [newDecAnim, setNewDecAnim] = useState('none');
  
  const [baseEffects, setBaseEffects] = useState<BaseEffectConfig[]>([]);
  const [elements, setElements] = useState<CustomElement[]>([]);
  const [customAnimations, setCustomAnimations] = useState<CustomAnimationDef[]>([]);
  
  const [newDecImage, setNewDecImage] = useState<File | null>(null);
  const [newDecImagePreview, setNewDecImagePreview] = useState<string | null>(null);
  
  const [isCreatingDec, setIsCreatingDec] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stato per il selettore Emoji
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<{type: 'base' | 'element', id: string} | null>(null);

  // Stati per comprimere gli elementi
  const [collapsedElements, setCollapsedElements] = useState<Set<string>>(new Set());
  const [collapsedAnims, setCollapsedAnims] = useState<Set<string>>(new Set());

  const toggleElement = (id: string) => {
    setCollapsedElements(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAnim = (id: string) => {
    setCollapsedAnims(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // --- COPY / PASTE LOGIC (SYSTEM CLIPBOARD) ---

  const copyBaseEffect = async (id: string) => {
    const effect = baseEffects.find(e => e.id === id);
    if (effect) {
      await navigator.clipboard.writeText(JSON.stringify({ dyad_export_type: 'baseEffect', data: effect }));
      showSuccess("Effetto copiato negli appunti!");
    }
  };

  const pasteBaseEffect = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed.dyad_export_type === 'baseEffect' && parsed.data) {
        const newEffect = { ...parsed.data, id: `be-${Date.now()}-${Math.random().toString(36).substring(7)}` };
        setBaseEffects([...baseEffects, newEffect]);
        showSuccess("Effetto incollato!");
      } else {
        showError("Il testo negli appunti non è un Effetto Base valido.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
    }
  };

  const copyElement = async (id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      await navigator.clipboard.writeText(JSON.stringify({ dyad_export_type: 'element', data: el }));
      showSuccess("Elemento copiato negli appunti!");
    }
  };

  const pasteElement = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed.dyad_export_type === 'element' && parsed.data) {
        const newId = `el-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        setElements([...elements, { ...parsed.data, id: newId, parentId: undefined }]);
        showSuccess("Elemento incollato!");
      } else {
        showError("Il testo negli appunti non è un Elemento valido.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
    }
  };

  const copyCustomAnimation = async (id: string) => {
    const anim = customAnimations.find(a => a.id === id);
    if (anim) {
      await navigator.clipboard.writeText(JSON.stringify({ dyad_export_type: 'animation', data: anim }));
      showSuccess("Animazione copiata negli appunti!");
    }
  };

  const pasteCustomAnimation = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed.dyad_export_type === 'animation' && parsed.data) {
        const newAnimId = `anim-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newKeyframes = parsed.data.keyframes.map((kf: any) => ({ ...kf, id: `kf-${Date.now()}-${Math.random().toString(36).substring(7)}`, targetId: undefined }));
        setCustomAnimations([...customAnimations, { ...parsed.data, id: newAnimId, name: `${parsed.data.name} (Copia)`, keyframes: newKeyframes }]);
        showSuccess("Animazione incollata!");
      } else {
        showError("Il testo negli appunti non è un'Animazione valida.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
    }
  };

  const copyKeyframe = async (animId: string, kfId: string) => {
    const anim = customAnimations.find(a => a.id === animId);
    if (anim) {
      const kf = anim.keyframes.find(k => k.id === kfId);
      if (kf) {
        await navigator.clipboard.writeText(JSON.stringify({ dyad_export_type: 'keyframe', data: kf }));
        showSuccess("Keyframe copiato negli appunti!");
      }
    }
  };

  const pasteKeyframe = async (animId: string) => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed.dyad_export_type === 'keyframe' && parsed.data) {
        setCustomAnimations(customAnimations.map(a => {
          if (a.id === animId) {
            return { ...a, keyframes: [...a.keyframes, { ...parsed.data, id: `kf-${Date.now()}-${Math.random().toString(36).substring(7)}`, targetId: undefined }] };
          }
          return a;
        }));
        showSuccess("Keyframe incollato!");
      } else {
        showError("Il testo negli appunti non è un Keyframe valido.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
    }
  };

  // --- END COPY / PASTE LOGIC ---

  const addBaseEffect = () => {
    setBaseEffects([...baseEffects, {
      id: `be-${Date.now()}`,
      type: 'scanline',
      color1: '#5865F2',
      color2: '#f23f43',
      icon: '',
      x: 50,
      y: 50,
      rotation: 0,
      size: 100,
      zIndex: 20
    }]);
  };

  const updateBaseEffect = (id: string, field: keyof BaseEffectConfig, value: any) => {
    setBaseEffects(baseEffects.map(el => el.id === id ? { ...el, [field]: value } : el));
  };

  const removeBaseEffect = (id: string) => {
    setBaseEffects(baseEffects.filter(el => el.id !== id));
  };

  const addElement = () => {
    const newId = `el-${Date.now()}`;
    setElements([...elements, {
      id: newId,
      type: 'emoji',
      content: '✨',
      animation: 'float',
      x: 50,
      y: 50,
      rotation: 0,
      size: 15,
      delay: 0
    }]);
    setCollapsedElements(prev => {
      const next = new Set(prev);
      next.delete(newId);
      return next;
    });
  };

  const updateElement = (id: string, field: keyof CustomElement, value: any) => {
    setElements(elements.map(el => el.id === id ? { ...el, [field]: value } : el));
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
  };

  // Animazioni Custom
  const addCustomAnimation = () => {
    const newId = `anim-${Date.now()}`;
    setCustomAnimations([...customAnimations, {
      id: newId,
      name: `Animazione ${customAnimations.length + 1}`,
      duration: 3,
      timingFunction: 'linear',
      keyframes: [
        { id: `kf-${Date.now()}-1`, percent: 0, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20, positionMode: 'relative' },
        { id: `kf-${Date.now()}-2`, percent: 100, x: 50, y: 50, scale: 1, rotation: 360, opacity: 1, zIndex: 20, positionMode: 'relative' }
      ]
    }]);
    setCollapsedAnims(prev => {
      const next = new Set(prev);
      next.delete(newId);
      return next;
    });
  };

  const updateCustomAnimation = (id: string, field: keyof CustomAnimationDef, value: any) => {
    setCustomAnimations(customAnimations.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeCustomAnimation = (id: string) => {
    setCustomAnimations(customAnimations.filter(a => a.id !== id));
    setElements(elements.map(el => el.animation === `custom_anim_${id}` ? { ...el, animation: 'none' } : el));
  };

  const addKeyframe = (animId: string) => {
    setCustomAnimations(customAnimations.map(a => {
      if (a.id === animId) {
        return {
          ...a,
          keyframes: [...a.keyframes, { id: `kf-${Date.now()}`, percent: 50, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20, positionMode: 'relative' }]
        };
      }
      return a;
    }));
  };

  const updateKeyframe = (animId: string, kfId: string, field: keyof CustomKeyframe, value: any) => {
    setCustomAnimations(customAnimations.map(a => {
      if (a.id === animId) {
        return {
          ...a,
          keyframes: a.keyframes.map(kf => kf.id === kfId ? { ...kf, [field]: value } : kf)
        };
      }
      return a;
    }));
  };

  const removeKeyframe = (animId: string, kfId: string) => {
    setCustomAnimations(customAnimations.map(a => {
      if (a.id === animId) {
        return { ...a, keyframes: a.keyframes.filter(kf => kf.id !== kfId) };
      }
      return a;
    }));
  };

  const isDescendant = (potentialDescendantId: string, ancestorId: string, allElements: CustomElement[]) => {
    let current = allElements.find(e => e.id === potentialDescendantId);
    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = allElements.find(e => e.id === current!.parentId);
    }
    return false;
  };

  const handleEditCustomDecoration = (dec: CustomDecoration) => {
    setEditDecorationId(dec.id);
    setNewDecName(dec.name);
    setNewDecPrice(dec.price);
    setNewDecBorder(dec.border_color);
    setNewDecShadow(dec.shadow_color);
    setTextColorType(dec.text_color_type);
    setNewDecTextColor(dec.text_color);
    setNewDecGradStart(dec.text_gradient_start);
    setNewDecGradEnd(dec.text_gradient_end);
    setNewDecAnim(dec.animation_type);
    setBaseEffects(dec.config?.baseEffects || []);
    setElements(dec.config?.elements || []);
    setCustomAnimations(dec.config?.customAnimations || []);
    setNewDecImagePreview(dec.image_url);
    setNewDecImage(null);
    
    // Scroll to top
    const container = document.getElementById('custom-editor-container');
    if (container) container.scrollTop = 0;
  };

  const handleCancelEdit = () => {
    setEditDecorationId(null);
    setNewDecName('');
    setNewDecPrice(100);
    setNewDecBorder('#5865F2');
    setNewDecShadow('#5865F2');
    setTextColorType('gradient');
    setNewDecTextColor('#ffffff');
    setNewDecGradStart('#5865F2');
    setNewDecGradEnd('#00ffff');
    setNewDecAnim('none');
    setBaseEffects([]);
    setElements([]);
    setCustomAnimations([]);
    setNewDecImagePreview(null);
    setNewDecImage(null);
  };

  const handleCreateCustomDecoration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecName.trim() || !currentUser) return;
    
    setIsCreatingDec(true);
    const customId = editDecorationId || `custom-${Date.now()}`;
    let imageUrl = newDecImagePreview;

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
      baseEffects,
      elements,
      customAnimations
    };

    const payload = {
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
    };

    if (editDecorationId) {
      const { error } = await supabase.from('custom_decorations').update(payload).eq('id', editDecorationId);
      if (error) {
        showError("Errore durante l'aggiornamento. Hai eseguito lo script SQL?");
      } else {
        showSuccess("Contorno aggiornato con successo!");
        handleCancelEdit();
        await refreshCustomDecorations();
      }
    } else {
      const { error } = await supabase.from('custom_decorations').insert({
        id: customId,
        ...payload,
        creator_id: currentUser.id
      });

      if (error) {
        showError("Errore durante la creazione. Hai eseguito lo script SQL?");
      } else {
        // Aggiungi automaticamente all'inventario del creatore
        const { data: profile } = await supabase.from('profiles').select('purchased_decorations').eq('id', currentUser.id).single();
        const currentPurchased = profile?.purchased_decorations || [];
        await supabase.from('profiles').update({ purchased_decorations: [...currentPurchased, customId] }).eq('id', currentUser.id);

        showSuccess("Contorno creato e aggiunto al tuo inventario!");
        handleCancelEdit();
        await refreshCustomDecorations();
      }
    }
    setIsCreatingDec(false);
  };

  const handleDeleteCustomDecoration = async (id: string) => {
    const { error } = await supabase.from('custom_decorations').delete().eq('id', id);
    if (error) {
      showError("Errore durante l'eliminazione.");
    } else {
      showSuccess("Contorno eliminato.");
      if (editDecorationId === id) handleCancelEdit();
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
  const getAnimation = (anim: string, delay: number, customAnims?: CustomAnimationDef[]) => {
    const delayStr = delay > 0 ? `${delay}s` : '0s';
    
    if (anim.startsWith('custom_anim_')) {
      const customAnim = customAnims?.find(a => `custom_anim_${a.id}` === anim);
      if (customAnim) {
        return `custom_anim_${customAnim.id} ${customAnim.duration}s ${customAnim.timingFunction} infinite ${delayStr}`;
      }
    }

    switch(anim) {
      case 'float': return `custom-float 3s ease-in-out infinite ${delayStr}`;
      case 'pulse': return `custom-pulse 2s infinite ${delayStr}`;
      case 'spin': return `spin-slow 4s linear infinite ${delayStr}`;
      case 'shake': return `custom-shake 0.5s infinite ${delayStr}`;
      case 'orbit-2d': return `custom-orbit-2d 4s linear infinite ${delayStr}`;
      default: return 'none';
    }
  };

  const getBgImage = (effect: BaseEffectConfig, defaultUrl: string) => {
    if (!effect.icon) return `url('${defaultUrl}')`;
    if (effect.icon.startsWith('http') || effect.icon.startsWith('/')) return `url('${effect.icon}')`;
    return 'none';
  };

  const getIconContent = (effect: BaseEffectConfig, defaultIcon: string | null = null, sizeCqw?: number) => {
    const icon = effect.icon || defaultIcon;
    if (!icon) return null;
    if (icon.startsWith('http') || icon.startsWith('/')) return null;
    return <span className="w-full h-full flex items-center justify-center" style={{ fontSize: sizeCqw ? `${sizeCqw}cqw` : 'inherit' }}>{icon}</span>;
  };

  const getEffectStyle = (effect: BaseEffectConfig, baseStyle: React.CSSProperties = {}, defaultZIndex: number = 20): React.CSSProperties => {
    const x = effect.x ?? 50;
    const y = effect.y ?? 50;
    const rot = effect.rotation ?? 0;
    const scale = effect.size !== undefined ? effect.size / 100 : 1;
    const z = effect.zIndex ?? defaultZIndex;

    const transformStyle: React.CSSProperties = {};
    if (x !== 50 || y !== 50) transformStyle.translate = `${x - 50}% ${y - 50}%`;
    if (rot !== 0) transformStyle.rotate = `${rot}deg`;
    if (scale !== 1) transformStyle.scale = `${scale}`;

    let finalStyle = { ...baseStyle, ...transformStyle, zIndex: z };
    
    if (effect.icon && !effect.icon.startsWith('http') && !effect.icon.startsWith('/')) {
      finalStyle = { ...finalStyle, background: 'transparent', boxShadow: 'none', borderColor: 'transparent' };
    }
    
    return finalStyle;
  };

  const renderInnerEffects = (effects: BaseEffectConfig[]) => {
    return effects.map(effect => {
      switch(effect.type) {
        case 'scanline':
          return <div key={effect.id} className="custom-scanline" style={getEffectStyle(effect, { color: effect.color1 }, 0)}></div>;
        case 'radar':
          return <div key={effect.id} className="absolute inset-[-3px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(from 0deg, transparent 70%, ${effect.color1} 100%)`, animation: 'spin-slow 1.5s linear infinite' }, 0)}></div>;
        case 'twin-rings':
          return (
            <React.Fragment key={effect.id}>
              <div className="absolute inset-[-3px] rounded-full" style={getEffectStyle(effect, { border: `2px dashed ${effect.color1}`, animation: 'spin-slow 4s linear infinite' }, 0)}></div>
              <div className="absolute inset-[-6px] rounded-full" style={getEffectStyle(effect, { border: `2px dashed ${effect.color2}`, animation: 'spin-slow 3s linear infinite reverse' }, 0)}></div>
            </React.Fragment>
          );
        case 'circo':
          return <div key={effect.id} className="absolute inset-[-3px] rounded-full" style={getEffectStyle(effect, { background: `repeating-conic-gradient(${effect.color1} 0deg 20deg, ${effect.color2} 20deg 40deg)`, animation: 'spin-slow 8s linear infinite' }, 0)}></div>;
        case 'pulse-ring':
          return <div key={effect.id} className="absolute inset-0 rounded-full" style={getEffectStyle(effect, { border: `2px solid ${effect.color1}`, animation: 'custom-pulse-ring 2s infinite', '--pulse-color': effect.color1 } as any, 0)}></div>;
        case 'supernova':
          return <div key={effect.id} className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(${effect.color1}, ${effect.color2}, ${effect.color1})`, filter: 'blur(5px)', animation: 'spin-slow 2s linear infinite' }, 0)}></div>;
        case 'oceanic':
          return <div key={effect.id} className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(transparent, ${effect.color1}, ${effect.color2}, transparent 50%)`, animation: 'spin-slow 2s linear infinite' }, 0)}></div>;
        case 'serpixel-agitato':
          return (
            <React.Fragment key={effect.id}>
              <div className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(transparent, ${effect.color1}, transparent, ${effect.color2}, transparent)`, animation: 'spin-slow 2s linear infinite' }, 0)}></div>
              <div className="serpixel-scanline" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 15px ${effect.color1}` }, 0)}></div>
            </React.Fragment>
          );
        case 'ghiacciolo':
          return <div key={effect.id} className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { borderTop: `3px solid ${effect.color1}`, borderLeft: `3px solid ${effect.color2}`, animation: 'spin-slow 6s linear infinite', opacity: 0.7 }, 0)}></div>;
        default:
          return null;
      }
    });
  };

  const renderOuterEffects = (effects: BaseEffectConfig[]) => {
    return effects.map(effect => {
      switch(effect.type) {
        case 'supernova':
          return (
            <React.Fragment key={effect.id}>
              <div className="supernova-star s1" style={getEffectStyle(effect, { background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="supernova-star s2" style={getEffectStyle(effect, { background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="supernova-star s3" style={getEffectStyle(effect, { background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }, 20)}>{getIconContent(effect, null, 12)}</div>
            </React.Fragment>
          );
        case 'esquelito':
          return (
            <React.Fragment key={effect.id}>
              <div className="esquelito-skull sk1" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/esqueleto1.png') }, 20)}>{getIconContent(effect, null, 50)}</div>
              <div className="esquelito-skull sk2" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/esqueleto2.png') }, 20)}>{getIconContent(effect, null, 50)}</div>
              <div className="esquelito-skull sk3" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/esquelito3.png') }, 20)}>{getIconContent(effect, null, 50)}</div>
            </React.Fragment>
          );
        case 'oceanic':
          return (
            <React.Fragment key={effect.id}>
              <div className="water-drop-wrapper w1" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="water-drop-inner">{getIconContent(effect, '💧', 30)}</div></div>
              <div className="water-drop-wrapper w2" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="water-drop-inner">{getIconContent(effect, '💧', 30)}</div></div>
              <div className="water-drop-wrapper w3" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="water-drop-inner">{getIconContent(effect, '💧', 30)}</div></div>
              <div className="oceanic-bubble b1" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="oceanic-bubble b2" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="oceanic-bubble b3" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }, 20)}>{getIconContent(effect, null, 12)}</div>
            </React.Fragment>
          );
        case 'saturn-fire':
          return (
            <React.Fragment key={effect.id}>
              <div className="saturn-wrapper back" style={{ ...getEffectStyle(effect), zIndex: (effect.zIndex ?? 20) - 15 }}><div className="saturn-ring-inner" style={{ borderTopColor: effect.color1, borderBottomColor: effect.color2, borderLeftColor: effect.color1, borderRightColor: effect.color2 }}></div></div>
              <div className="saturn-wrapper front" style={{ ...getEffectStyle(effect), zIndex: (effect.zIndex ?? 20) + 5 }}><div className="saturn-ring-inner" style={{ borderTopColor: effect.color1, borderBottomColor: effect.color2, borderLeftColor: effect.color1, borderRightColor: effect.color2 }}></div></div>
              <div className="fire-particle f1" style={getEffectStyle(effect, { background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }, 20)}>{getIconContent(effect, null, 15)}</div>
              <div className="fire-particle f2" style={getEffectStyle(effect, { background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }, 20)}>{getIconContent(effect, null, 15)}</div>
              <div className="fire-particle f3" style={getEffectStyle(effect, { background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }, 20)}>{getIconContent(effect, null, 15)}</div>
            </React.Fragment>
          );
        case 'gustavo-armando':
          return (
            <React.Fragment key={effect.id}>
              <div className="gustavo-sprite gustavo-trail t2" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/adrotto.png') }, 20)}>{getIconContent(effect, null, 60)}</div>
              <div className="gustavo-sprite gustavo-trail t1" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/adrotto.png') }, 20)}>{getIconContent(effect, null, 60)}</div>
              <div className="gustavo-sprite gustavo-main" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/adrotto.png') }, 20)}>{getIconContent(effect, null, 60)}</div>
              <div className="gustavo-orbit-wrapper o1" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
              <div className="gustavo-orbit-wrapper o2" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
              <div className="gustavo-orbit-wrapper o3" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
              <div className="gustavo-orbit-wrapper o4" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
              <div className="gustavo-orbit-wrapper o5" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
              <div className="gustavo-orbit-wrapper o6" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
              <div className="gustavo-orbit-wrapper o7" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
              <div className="gustavo-orbit-wrapper o8" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect, null, 35)}</div></div>
            </React.Fragment>
          );
        case 'serpixel-agitato':
          return (
            <React.Fragment key={effect.id}>
              <div className="serpixel-diamond-wrapper dw1" style={getEffectStyle(effect, {}, 20)}><div className="serpixel-diamond" style={{ background: effect.color2 }}>{getIconContent(effect, null, 10)}</div></div>
              <div className="serpixel-diamond-wrapper dw2" style={getEffectStyle(effect, {}, 20)}><div className="serpixel-diamond" style={{ background: effect.color2 }}>{getIconContent(effect, null, 10)}</div></div>
              <div className="serpixel-diamond-wrapper dw3" style={getEffectStyle(effect, {}, 20)}><div className="serpixel-diamond" style={{ background: effect.color2 }}>{getIconContent(effect, null, 10)}</div></div>
              <div className="serpixel-diamond-wrapper dw4" style={getEffectStyle(effect, {}, 20)}><div className="serpixel-diamond" style={{ background: effect.color2 }}>{getIconContent(effect, null, 10)}</div></div>
              <div className="serpixel-venom v1" style={getEffectStyle(effect, { background: effect.color1 }, 20)}></div>
              <div className="serpixel-venom v2" style={getEffectStyle(effect, { background: effect.color1 }, 20)}></div>
              <div className="serpixel-venom v3" style={getEffectStyle(effect, { background: effect.color1 }, 20)}></div>
              <div className="serpixel-venom v4" style={getEffectStyle(effect, { background: effect.color1 }, 20)}></div>
              <div className="serpixel-venom v5" style={getEffectStyle(effect, { background: effect.color1 }, 20)}></div>
              <div className="serpixel-snake s1" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
              <div className="serpixel-snake s2" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
              <div className="serpixel-snake s3" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
              <div className="serpixel-snake s4" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
              <div className="serpixel-snake s5" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
              <div className="serpixel-snake s6" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
              <div className="serpixel-snake s7" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
              <div className="serpixel-snake s8" style={{ ...getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/serpe1.png') }), zIndex: undefined }}>{getIconContent(effect, null, 30)}</div>
            </React.Fragment>
          );
        case 'tempesta':
          return (
            <React.Fragment key={effect.id}>
              <div className="storm-drop d1" style={getEffectStyle(effect, { background: effect.color1 }, 20)}>{getIconContent(effect, null, 10)}</div>
              <div className="storm-drop d2" style={getEffectStyle(effect, { background: effect.color1 }, 20)}>{getIconContent(effect, null, 10)}</div>
              <div className="storm-drop d3" style={getEffectStyle(effect, { background: effect.color1 }, 20)}>{getIconContent(effect, null, 10)}</div>
            </React.Fragment>
          );
        case 'ghiacciolo':
          return (
            <React.Fragment key={effect.id}>
              <div className="ice-flake f1" style={getEffectStyle(effect, { color: effect.color1 }, 20)}>{getIconContent(effect, '❄️', 12)}</div>
              <div className="ice-flake f2" style={getEffectStyle(effect, { color: effect.color1 }, 20)}>{getIconContent(effect, '❄️', 12)}</div>
              <div className="ice-flake f3" style={getEffectStyle(effect, { color: effect.color1 }, 20)}>{getIconContent(effect, '❄️', 12)}</div>
            </React.Fragment>
          );
        default:
          return null;
      }
    });
  };

  const renderCustomAnimationsCSS = (animations?: CustomAnimationDef[], elements?: CustomElement[]) => {
    if (!animations || animations.length === 0) return null;
    const css = animations.map(anim => {
      const keyframes = anim.keyframes.sort((a, b) => a.percent - b.percent).map(kf => {
        let leftTop = '';
        let transform = '';
        const mode = kf.positionMode || 'relative';

        if (mode === 'absolute') {
          leftTop = `left: ${kf.x}%; top: ${kf.y}%;`;
          transform = `transform: translate(-50%, -50%);`;
        } else if (mode === 'target' && kf.targetId && elements) {
          const targetEl = elements.find(e => e.id === kf.targetId);
          const tx = targetEl ? targetEl.x : 50;
          const ty = targetEl ? targetEl.y : 50;
          leftTop = `left: ${tx}%; top: ${ty}%;`;
          transform = `transform: translate(-50%, -50%);`;
        } else {
          // relative
          transform = `transform: translate(calc(-50% + ${kf.x}%), calc(-50% + ${kf.y}%));`;
        }

        return `${kf.percent}% { ${leftTop} ${transform} rotate: ${kf.rotation}deg; scale: ${kf.scale}; opacity: ${kf.opacity}; z-index: ${kf.zIndex ?? 20}; }`;
      }).join('\n');
      return `@keyframes custom_anim_${anim.id} { ${keyframes} }`;
    }).join('\n');
    return <style>{css}</style>;
  };

  const renderStandaloneElement = (el: CustomElement, allElements: CustomElement[], customAnimations?: CustomAnimationDef[]) => {
    const chain: CustomElement[] = [el];
    let curr = el;
    const visited = new Set<string>([el.id]);
    while (curr.parentId) {
      const parent = allElements.find(e => e.id === curr.parentId);
      if (parent && !visited.has(parent.id)) {
        chain.unshift(parent);
        visited.add(parent.id);
        curr = parent;
      } else {
        break;
      }
    }

    let resultNode: React.ReactNode = null;

    for (let i = chain.length - 1; i >= 0; i--) {
      const nodeEl = chain[i];
      const isOutermost = i === 0;
      const isTarget = i === chain.length - 1;

      const contentNode = isTarget ? (
        nodeEl.type === 'emoji' ? nodeEl.content : <img src={nodeEl.content} className="w-full h-full object-contain" />
      ) : null;

      const innerContent = (
        <div style={{ rotate: `${nodeEl.rotation || 0}deg`, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {contentNode}
          {resultNode}
        </div>
      );

      const zIndex = isOutermost ? (el.zIndex ?? 20) : undefined;

      if (nodeEl.animation === 'orbit-3d' || nodeEl.animation === 'orbit-3d-reverse') {
        const wrapperAnim = nodeEl.animation === 'orbit-3d' ? 'custom-orbit-3d-wrapper' : 'custom-orbit-3d-wrapper-rev';
        const innerAnim = nodeEl.animation === 'orbit-3d' ? 'custom-orbit-inner' : 'custom-orbit-3d-inner-rev';
        resultNode = (
          <div
            key={isTarget ? nodeEl.id : `ghost-${nodeEl.id}-${el.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${nodeEl.x}%`,
              top: `${nodeEl.y}%`,
              transform: `translate(-50%, -50%)`,
              width: '100%',
              height: '100%',
              zIndex: zIndex
            }}
          >
            <div className="custom-orbit-container" style={{ animation: `${wrapperAnim} 4s linear infinite ${nodeEl.delay > 0 ? nodeEl.delay+'s' : '0s'}` }}>
              <div className="custom-orbit-element" style={{ animation: `${innerAnim} 4s linear infinite ${nodeEl.delay > 0 ? nodeEl.delay+'s' : '0s'}`, width: `${nodeEl.size}cqw`, height: `${nodeEl.size}cqw`, fontSize: `${nodeEl.size}cqw` }}>
                {innerContent}
              </div>
            </div>
          </div>
        );
      } else {
        resultNode = (
          <div 
            key={isTarget ? nodeEl.id : `ghost-${nodeEl.id}-${el.id}`}
            className={`absolute flex items-center justify-center pointer-events-none`}
            style={{ 
              left: `${nodeEl.x}%`,
              top: `${nodeEl.y}%`,
              transform: 'translate(-50%, -50%)',
              animation: getAnimation(nodeEl.animation, nodeEl.delay, customAnimations),
              width: `${nodeEl.size}cqw`,
              height: `${nodeEl.size}cqw`,
              fontSize: `${nodeEl.size}cqw`,
              zIndex: zIndex
            }}
          >
            {innerContent}
          </div>
        );
      }
    }

    return resultNode;
  };

  const customDec = customDecorations.find(d => d.id === activeDecoration);
  if (customDec) {
    const effectsToRender = customDec.config?.baseEffects || [];
    if (customDec.config?.baseEffect && customDec.config.baseEffect !== 'none' && effectsToRender.length === 0) {
      effectsToRender.push({
        id: 'legacy',
        type: customDec.config.baseEffect,
        color1: customDec.config.effectColor1 || '#5865F2',
        color2: customDec.config.effectColor2 || '#f23f43',
        icon: '',
        x: 50, y: 50, rotation: 0, size: 100, zIndex: 20
      });
    }

    return (
      <div className={`relative rounded-full flex items-center justify-center dec-wrapper ${speakingClass} ${className} ${clipEffects ? 'overflow-hidden' : ''}`}>
        {renderCustomAnimationsCSS(customDec.config?.customAnimations, customDec.config?.elements)}
        
        {/* Bounding Box for Inner Effects (Limits extreme custom decorations) */}
        <div 
          className="absolute pointer-events-none overflow-hidden rounded-full"
          style={{ top: '-65%', left: '-65%', width: '230%', height: '230%' }}
        >
          <div className="absolute" style={{ top: '28.26%', left: '28.26%', width: '43.48%', height: '43.48%' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              {renderInnerEffects(effectsToRender)}
            </div>
          </div>
        </div>

        {/* Avatar & Border (z-10) */}
        <div 
          className="relative w-full h-full z-10 rounded-full flex items-center justify-center"
          style={{
            border: `2px solid ${customDec.border_color}`,
            boxShadow: `0 0 10px ${customDec.shadow_color}, inset 0 0 10px ${customDec.shadow_color}`,
          }}
        >
          {customDec.image_url && (
            <img 
              src={customDec.image_url} 
              className="absolute inset-0 w-full h-full object-cover rounded-full opacity-60 pointer-events-none mix-blend-screen" 
              style={{ 
                animation: customDec.animation_type === 'spin' ? 'spin-slow 4s linear infinite' : 
                           customDec.animation_type === 'pulse' ? 'custom-pulse 2s infinite' : 
                           customDec.animation_type === 'bounce' ? 'custom-bounce 2s infinite' : 'none' 
              }} 
            />
          )}
          <img src={src} alt={alt} className="w-full h-full rounded-full object-cover relative z-10" />
        </div>

        {/* Bounding Box for Outer Effects & Elements (Limits extreme custom decorations) */}
        <div 
          className="absolute pointer-events-none overflow-hidden rounded-full"
          style={{ top: '-65%', left: '-65%', width: '230%', height: '230%' }}
        >
          <div className="absolute" style={{ top: '28.26%', left: '28.26%', width: '43.48%', height: '43.48%' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              {renderOuterEffects(effectsToRender)}
            </div>
            {customDec.config?.elements?.map(el => renderStandaloneElement(el, customDec.config!.elements!, customDec.config?.customAnimations))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-full flex items-center justify-center dec-wrapper dec-${activeDecoration} ${speakingClass} ${className} ${clipEffects ? 'overflow-hidden' : ''}`}>
      
      {/* Particelle globali */}
      {activeDecoration === 'oceanic' && (
        <>
          <div className="water-drop-wrapper w1"><div className="water-drop-inner">💧</div></div>
          <div className="water-drop-wrapper w2"><div className="water-drop-inner">💧</div></div>
          <div className="water-drop-wrapper w3"><div className="water-drop-inner">💧</div></div>
          <div className="oceanic-bubble b1"></div>
          <div className="oceanic-bubble b2"></div>
          <div className="oceanic-bubble b3"></div>
        </>
      )}

      {activeDecoration === 'saturn-fire' && (
        <>
          <div className="saturn-wrapper back"><div className="saturn-ring-inner"></div></div>
          <div className="saturn-wrapper front"><div className="saturn-ring-inner"></div></div>
          <div className="fire-particle f1"></div>
          <div className="fire-particle f2"></div>
          <div className="fire-particle f3"></div>
        </>
      )}

      {activeDecoration === 'gustavo-armando' && (
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

      {activeDecoration === 'serpixel-agitato' && (
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

      {activeDecoration === 'dc-emit' && (
        <>
          <div className="dc-particle p1"></div>
          <div className="dc-particle p2"></div>
          <div className="dc-particle p3"></div>
        </>
      )}
      
      {activeDecoration === 'matrix' && (
        <>
          <div className="matrix-char m1">1</div>
          <div className="matrix-char m2">0</div>
          <div className="matrix-char m3">1</div>
          <div className="matrix-char m4">0</div>
        </>
      )}
      
      {activeDecoration === 'explosive' && (
        <>
          <div className="explode-emoji e1">💥</div>
          <div className="explode-emoji e2">🔥</div>
          <div className="explode-emoji e3">💥</div>
        </>
      )}

      {activeDecoration === 'hands' && (
        <>
          <div className="hand-emoji h1">👋</div>
          <div className="hand-emoji h2">👋</div>
          <div className="hand-emoji h3">👋</div>
        </>
      )}

      {activeDecoration === 'supernova' && (
        <>
          <div className="supernova-star s1"></div>
          <div className="supernova-star s2"></div>
          <div className="supernova-star s3"></div>
        </>
      )}

      {activeDecoration === 'esquelito' && (
        <>
          <div className="esquelito-skull sk1"></div>
          <div className="esquelito-skull sk2"></div>
          <div className="esquelito-skull sk3"></div>
        </>
      )}

      {activeDecoration === 'tempesta' && (
        <>
          <div className="storm-drop d1"></div>
          <div className="storm-drop d2"></div>
          <div className="storm-drop d3"></div>
        </>
      )}

      {activeDecoration === 'ghiacciolo' && (
        <>
          <div className="ice-flake f1">❄️</div>
          <div className="ice-flake f2">❄️</div>
          <div className="ice-flake f3">❄️</div>
        </>
      )}

      <img src={src} alt={alt} className="w-full h-full rounded-full object-cover relative z-10" />
    </div>
  );
};