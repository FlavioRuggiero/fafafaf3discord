"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Wand2, Upload, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useShop, CustomElement, BaseEffectConfig, CustomAnimationDef, CustomKeyframe } from "@/contexts/ShopContext";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface CustomDecorationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const CustomDecorationEditorModal = ({ isOpen, onClose, currentUser }: CustomDecorationEditorModalProps) => {
  const { refreshCustomDecorations } = useShop();
  
  const [newDecName, setNewDecName] = useState('');
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
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emojiPickerTarget, setEmojiPickerTarget] = useState<{type: 'base' | 'element', id: string} | null>(null);

  // Carica la bozza all'apertura
  useEffect(() => {
    if (isOpen && currentUser) {
      const draft = localStorage.getItem(`custom_dec_draft_${currentUser.id}`);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.newDecName !== undefined) setNewDecName(parsed.newDecName);
          if (parsed.newDecBorder !== undefined) setNewDecBorder(parsed.newDecBorder);
          if (parsed.newDecShadow !== undefined) setNewDecShadow(parsed.newDecShadow);
          if (parsed.textColorType !== undefined) setTextColorType(parsed.textColorType);
          if (parsed.newDecTextColor !== undefined) setNewDecTextColor(parsed.newDecTextColor);
          if (parsed.newDecGradStart !== undefined) setNewDecGradStart(parsed.newDecGradStart);
          if (parsed.newDecGradEnd !== undefined) setNewDecGradEnd(parsed.newDecGradEnd);
          if (parsed.newDecAnim !== undefined) setNewDecAnim(parsed.newDecAnim);
          if (parsed.baseEffects !== undefined) setBaseEffects(parsed.baseEffects);
          if (parsed.elements !== undefined) setElements(parsed.elements);
          if (parsed.customAnimations !== undefined) setCustomAnimations(parsed.customAnimations);
        } catch (e) {
          console.error("Errore nel caricamento della bozza", e);
        }
      }
      setIsDraftLoaded(true);
    }
  }, [isOpen, currentUser]);

  // Salva la bozza ad ogni modifica
  useEffect(() => {
    if (isDraftLoaded && currentUser) {
      const draft = {
        newDecName, newDecBorder, newDecShadow, textColorType, newDecTextColor,
        newDecGradStart, newDecGradEnd, newDecAnim, baseEffects, elements, customAnimations
      };
      localStorage.setItem(`custom_dec_draft_${currentUser.id}`, JSON.stringify(draft));
    }
  }, [newDecName, newDecBorder, newDecShadow, textColorType, newDecTextColor, newDecGradStart, newDecGradEnd, newDecAnim, baseEffects, elements, customAnimations, isDraftLoaded, currentUser]);

  const handleClearDraft = () => {
    if (window.confirm("Sei sicuro di voler svuotare la bozza? Perderai tutte le modifiche non salvate.")) {
      localStorage.removeItem(`custom_dec_draft_${currentUser.id}`);
      setNewDecName('');
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
      setNewDecImage(null);
      setNewDecImagePreview(null);
      showSuccess("Bozza svuotata.");
    }
  };

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewDecImage(file);
      setNewDecImagePreview(URL.createObjectURL(file));
    }
  };

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

  const addCustomAnimation = () => {
    setCustomAnimations([...customAnimations, {
      id: `anim-${Date.now()}`,
      name: `Animazione ${customAnimations.length + 1}`,
      duration: 3,
      timingFunction: 'linear',
      keyframes: [
        { id: `kf-${Date.now()}-1`, percent: 0, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20 },
        { id: `kf-${Date.now()}-2`, percent: 100, x: 50, y: 50, scale: 1, rotation: 360, opacity: 1, zIndex: 20 }
      ]
    }]);
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
          keyframes: [...a.keyframes, { id: `kf-${Date.now()}`, percent: 50, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20 }]
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
      baseEffects,
      elements,
      customAnimations
    };

    // Inserisci il contorno nel database globale
    const { error } = await supabase.from('custom_decorations').insert({
      id: customId,
      name: newDecName.trim(),
      price: 750, // Prezzo fisso
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
      showError("Errore durante la creazione.");
    } else {
      // Rimuovi un ticket e aggiungi il nuovo contorno
      const { data: profile } = await supabase.from('profiles').select('purchased_decorations').eq('id', currentUser.id).single();
      const currentPurchased = profile?.purchased_decorations || [];
      
      const ticketIndex = currentPurchased.indexOf('custom-dec-ticket');
      if (ticketIndex !== -1) {
        currentPurchased.splice(ticketIndex, 1);
      }
      currentPurchased.push(customId);

      await supabase.from('profiles').update({ purchased_decorations: currentPurchased }).eq('id', currentUser.id);

      // Pulisci la bozza
      localStorage.removeItem(`custom_dec_draft_${currentUser.id}`);

      showSuccess("Contorno creato e aggiunto al tuo inventario!");
      await refreshCustomDecorations();
      onClose();
    }
    setIsCreatingDec(false);
  };

  // Helper per l'anteprima
  const getAnimation = (anim: string, delay: number, customAnims?: CustomAnimationDef[]) => {
    const delayStr = delay > 0 ? `${delay}s` : '0s';
    if (anim.startsWith('custom_anim_')) {
      const customAnim = customAnims?.find(a => `custom_anim_${a.id}` === anim);
      if (customAnim) return `custom_anim_${customAnim.id} ${customAnim.duration}s ${customAnim.timingFunction} infinite ${delayStr}`;
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
        case 'scanline': return <div key={effect.id} className="custom-scanline" style={getEffectStyle(effect, { color: effect.color1 }, 0)}></div>;
        case 'radar': return <div key={effect.id} className="absolute inset-[-3px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(from 0deg, transparent 70%, ${effect.color1} 100%)`, animation: 'spin-slow 1.5s linear infinite' }, 0)}></div>;
        case 'twin-rings': return (
            <React.Fragment key={effect.id}>
              <div className="absolute inset-[-3px] rounded-full" style={getEffectStyle(effect, { border: `2px dashed ${effect.color1}`, animation: 'spin-slow 4s linear infinite' }, 0)}></div>
              <div className="absolute inset-[-6px] rounded-full" style={getEffectStyle(effect, { border: `2px dashed ${effect.color2}`, animation: 'spin-slow 3s linear infinite reverse' }, 0)}></div>
            </React.Fragment>
          );
        case 'circo': return <div key={effect.id} className="absolute inset-[-3px] rounded-full" style={getEffectStyle(effect, { background: `repeating-conic-gradient(${effect.color1} 0deg 20deg, ${effect.color2} 20deg 40deg)`, animation: 'spin-slow 8s linear infinite' }, 0)}></div>;
        case 'pulse-ring': return <div key={effect.id} className="absolute inset-0 rounded-full" style={getEffectStyle(effect, { border: `2px solid ${effect.color1}`, animation: 'custom-pulse-ring 2s infinite', '--pulse-color': effect.color1 } as any, 0)}></div>;
        case 'supernova': return <div key={effect.id} className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(${effect.color1}, ${effect.color2}, ${effect.color1})`, filter: 'blur(5px)', animation: 'spin-slow 2s linear infinite' }, 0)}></div>;
        case 'oceanic': return <div key={effect.id} className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(transparent, ${effect.color1}, ${effect.color2}, transparent 50%)`, animation: 'spin-slow 2s linear infinite' }, 0)}></div>;
        case 'serpixel-agitato': return (
            <React.Fragment key={effect.id}>
              <div className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { background: `conic-gradient(transparent, ${effect.color1}, transparent, ${effect.color2}, transparent)`, animation: 'spin-slow 2s linear infinite' }, 0)}></div>
              <div className="serpixel-scanline" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 15px ${effect.color1}` }, 0)}></div>
            </React.Fragment>
          );
        case 'ghiacciolo': return <div key={effect.id} className="absolute inset-[-4px] rounded-full" style={getEffectStyle(effect, { borderTop: `3px solid ${effect.color1}`, borderLeft: `3px solid ${effect.color2}`, animation: 'spin-slow 6s linear infinite', opacity: 0.7 }, 0)}></div>;
        default: return null;
      }
    });
  };

  const renderOuterEffects = (effects: BaseEffectConfig[]) => {
    return effects.map(effect => {
      switch(effect.type) {
        case 'supernova': return (
            <React.Fragment key={effect.id}>
              <div className="supernova-star s1" style={getEffectStyle(effect, { background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="supernova-star s2" style={getEffectStyle(effect, { background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="supernova-star s3" style={getEffectStyle(effect, { background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }, 20)}>{getIconContent(effect, null, 12)}</div>
            </React.Fragment>
          );
        case 'esquelito': return (
            <React.Fragment key={effect.id}>
              <div className="esquelito-skull sk1" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/esqueleto1.png') }, 20)}>{getIconContent(effect, null, 50)}</div>
              <div className="esquelito-skull sk2" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/esqueleto2.png') }, 20)}>{getIconContent(effect, null, 50)}</div>
              <div className="esquelito-skull sk3" style={getEffectStyle(effect, { backgroundImage: getBgImage(effect, '/esquelito3.png') }, 20)}>{getIconContent(effect, null, 50)}</div>
            </React.Fragment>
          );
        case 'oceanic': return (
            <React.Fragment key={effect.id}>
              <div className="water-drop-wrapper w1" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="water-drop-inner">{getIconContent(effect, '💧', 30)}</div></div>
              <div className="water-drop-wrapper w2" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="water-drop-inner">{getIconContent(effect, '💧', 30)}</div></div>
              <div className="water-drop-wrapper w3" style={{ ...getEffectStyle(effect), zIndex: undefined }}><div className="water-drop-inner">{getIconContent(effect, '💧', 30)}</div></div>
              <div className="oceanic-bubble b1" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="oceanic-bubble b2" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }, 20)}>{getIconContent(effect, null, 12)}</div>
              <div className="oceanic-bubble b3" style={getEffectStyle(effect, { background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }, 20)}>{getIconContent(effect, null, 12)}</div>
            </React.Fragment>
          );
        case 'saturn-fire': return (
            <React.Fragment key={effect.id}>
              <div className="saturn-wrapper back" style={{ ...getEffectStyle(effect), zIndex: (effect.zIndex ?? 20) - 15 }}><div className="saturn-ring-inner" style={{ borderTopColor: effect.color1, borderBottomColor: effect.color2, borderLeftColor: effect.color1, borderRightColor: effect.color2 }}></div></div>
              <div className="saturn-wrapper front" style={{ ...getEffectStyle(effect), zIndex: (effect.zIndex ?? 20) + 5 }}><div className="saturn-ring-inner" style={{ borderTopColor: effect.color1, borderBottomColor: effect.color2, borderLeftColor: effect.color1, borderRightColor: effect.color2 }}></div></div>
              <div className="fire-particle f1" style={getEffectStyle(effect, { background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }, 20)}>{getIconContent(effect, null, 15)}</div>
              <div className="fire-particle f2" style={getEffectStyle(effect, { background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }, 20)}>{getIconContent(effect, null, 15)}</div>
              <div className="fire-particle f3" style={getEffectStyle(effect, { background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }, 20)}>{getIconContent(effect, null, 15)}</div>
            </React.Fragment>
          );
        case 'gustavo-armando': return (
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
        case 'serpixel-agitato': return (
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
        case 'tempesta': return (
            <React.Fragment key={effect.id}>
              <div className="storm-drop d1" style={getEffectStyle(effect, { background: effect.color1 }, 20)}>{getIconContent(effect, null, 10)}</div>
              <div className="storm-drop d2" style={getEffectStyle(effect, { background: effect.color1 }, 20)}>{getIconContent(effect, null, 10)}</div>
              <div className="storm-drop d3" style={getEffectStyle(effect, { background: effect.color1 }, 20)}>{getIconContent(effect, null, 10)}</div>
            </React.Fragment>
          );
        case 'ghiacciolo': return (
            <React.Fragment key={effect.id}>
              <div className="ice-flake f1" style={getEffectStyle(effect, { color: effect.color1 }, 20)}>{getIconContent(effect, '❄️', 12)}</div>
              <div className="ice-flake f2" style={getEffectStyle(effect, { color: effect.color1 }, 20)}>{getIconContent(effect, '❄️', 12)}</div>
              <div className="ice-flake f3" style={getEffectStyle(effect, { color: effect.color1 }, 20)}>{getIconContent(effect, '❄️', 12)}</div>
            </React.Fragment>
          );
        default: return null;
      }
    });
  };

  const renderCustomAnimationsCSS = (animations?: CustomAnimationDef[]) => {
    if (!animations || animations.length === 0) return null;
    const css = animations.map(anim => {
      const keyframes = anim.keyframes.sort((a, b) => a.percent - b.percent).map(kf => {
        return `${kf.percent}% { transform: translate(calc(-50% + ${kf.x}%), calc(-50% + ${kf.y}%)) rotate(${kf.rotation}deg) scale(${kf.scale}); opacity: ${kf.opacity}; z-index: ${kf.zIndex ?? 20}; }`;
      }).join('\n');
      return `@keyframes custom_anim_${anim.id} { ${keyframes} }`;
    }).join('\n');
    return <style>{css}</style>;
  };

  const avatarUrl = currentUser.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=preview";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#313338] rounded-lg w-[95vw] max-w-[1400px] max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#1e1f22] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wand2 className="text-brand" />
              Crea Contorno Personalizzato
            </h2>
            {isDraftLoaded && (
              <button 
                onClick={handleClearDraft}
                className="text-xs bg-[#f23f43]/20 text-[#f23f43] hover:bg-[#f23f43] hover:text-white px-3 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                <Trash2 size={14} /> Svuota Bozza
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#dbdee1] transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <form id="user-custom-dec-form" onSubmit={handleCreateCustomDecoration} className="space-y-6">
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
                      type="text" 
                      value="750"
                      disabled
                      className="w-full bg-[#2b2d31] text-[#949ba4] rounded p-2 border border-[#3f4147] cursor-not-allowed"
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

              {/* Effetti Base Multipli */}
              <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-white font-bold text-sm uppercase">Effetti Base</h4>
                  <button type="button" onClick={addBaseEffect} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    <Plus size={12} /> Aggiungi Effetto
                  </button>
                </div>

                {baseEffects.length === 0 ? (
                  <p className="text-xs text-[#949ba4] italic">Nessun effetto base aggiunto.</p>
                ) : (
                  <div className="space-y-3">
                    {baseEffects.map((effect) => (
                      <div key={effect.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                        <button type="button" onClick={() => removeBaseEffect(effect.id)} className="absolute top-2 right-2 text-[#f23f43] hover:text-white transition-colors">
                          <X size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-3 mb-3 pr-6">
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Tipo Effetto</label>
                            <select value={effect.type} onChange={e => updateBaseEffect(effect.id, 'type', e.target.value)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]">
                              <option value="scanline">Scanline</option>
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
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Sostituisci Particelle (Emoji/URL)</label>
                            <div className="flex gap-2">
                              <button 
                                type="button" 
                                onClick={() => setEmojiPickerTarget({type: 'base', id: effect.id})} 
                                className="bg-[#1e1f22] hover:bg-[#35373c] transition-colors rounded border border-[#3f4147] text-xl flex items-center justify-center w-9 h-9 flex-shrink-0"
                              >
                                {effect.icon && !effect.icon.startsWith('http') ? effect.icon : '😀'}
                              </button>
                              <input type="text" value={effect.icon} onChange={e => updateBaseEffect(effect.id, 'icon', e.target.value)} placeholder="URL Immagine" className="flex-1 bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Colore 1</label>
                            <div className="flex items-center gap-2 bg-[#1e1f22] p-1 rounded border border-[#3f4147]">
                              <input type="color" value={effect.color1} onChange={e => updateBaseEffect(effect.id, 'color1', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" />
                              <span className="text-white text-xs uppercase">{effect.color1}</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Colore 2</label>
                            <div className="flex items-center gap-2 bg-[#1e1f22] p-1 rounded border border-[#3f4147]">
                              <input type="color" value={effect.color2} onChange={e => updateBaseEffect(effect.id, 'color2', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0" />
                              <span className="text-white text-xs uppercase">{effect.color2}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-[#b5bac1] uppercase">Pos X</label>
                              <input type="number" value={effect.x ?? 50} onChange={e => updateBaseEffect(effect.id, 'x', Number(e.target.value))} className="w-12 bg-[#111214] text-white text-[10px] px-1 py-0.5 rounded border border-[#3f4147] outline-none" />
                            </div>
                            <input type="range" min="0" max="100" value={effect.x ?? 50} onChange={e => updateBaseEffect(effect.id, 'x', Number(e.target.value))} className="w-full accent-brand" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-[#b5bac1] uppercase">Pos Y</label>
                              <input type="number" value={effect.y ?? 50} onChange={e => updateBaseEffect(effect.id, 'y', Number(e.target.value))} className="w-12 bg-[#111214] text-white text-[10px] px-1 py-0.5 rounded border border-[#3f4147] outline-none" />
                            </div>
                            <input type="range" min="0" max="100" value={effect.y ?? 50} onChange={e => updateBaseEffect(effect.id, 'y', Number(e.target.value))} className="w-full accent-brand" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-[#b5bac1] uppercase">Rotazione</label>
                              <input type="number" value={effect.rotation ?? 0} onChange={e => updateBaseEffect(effect.id, 'rotation', Number(e.target.value))} className="w-12 bg-[#111214] text-white text-[10px] px-1 py-0.5 rounded border border-[#3f4147] outline-none" />
                            </div>
                            <input type="range" min="-360" max="360" value={effect.rotation ?? 0} onChange={e => updateBaseEffect(effect.id, 'rotation', Number(e.target.value))} className="w-full accent-brand" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-[#b5bac1] uppercase">Dimensione</label>
                              <input type="number" value={effect.size ?? 100} onChange={e => updateBaseEffect(effect.id, 'size', Number(e.target.value))} className="w-12 bg-[#111214] text-white text-[10px] px-1 py-0.5 rounded border border-[#3f4147] outline-none" />
                            </div>
                            <input type="range" min="10" max="300" value={effect.size ?? 100} onChange={e => updateBaseEffect(effect.id, 'size', Number(e.target.value))} className="w-full accent-brand" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-[#b5bac1] uppercase">Z-Index</label>
                              <input type="number" value={effect.zIndex ?? 20} onChange={e => updateBaseEffect(effect.id, 'zIndex', Number(e.target.value))} className="w-12 bg-[#111214] text-white text-[10px] px-1 py-0.5 rounded border border-[#3f4147] outline-none" />
                            </div>
                            <input type="range" min="0" max="50" value={effect.zIndex ?? 20} onChange={e => updateBaseEffect(effect.id, 'zIndex', Number(e.target.value))} className="w-full accent-brand" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Elementi Fluttuanti */}
              <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-white font-bold text-sm uppercase">Elementi Fluttuanti</h4>
                  <button type="button" onClick={addElement} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    <Plus size={12} /> Aggiungi Elemento
                  </button>
                </div>

                {elements.length === 0 ? (
                  <p className="text-xs text-[#949ba4] italic">Nessun elemento fluttuante aggiunto.</p>
                ) : (
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
                            {el.type === 'emoji' ? (
                              <button 
                                type="button" 
                                onClick={() => setEmojiPickerTarget({type: 'element', id: el.id})} 
                                className="w-full bg-[#1e1f22] hover:bg-[#35373c] transition-colors text-white rounded p-1.5 text-xl border border-[#3f4147] h-8 flex items-center justify-center"
                              >
                                {el.content || '✨'}
                              </button>
                            ) : (
                              <input type="text" value={el.content} onChange={e => updateElement(el.id, 'content', e.target.value)} placeholder="https://..." className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147] h-8" />
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-[#b5bac1] uppercase">Pos X</label>
                              <input type="number" value={el.x} onChange={e => updateElement(el.id, 'x', Number(e.target.value))} className="w-12 bg-[#111214] text-white text-[10px] px-1 py-0.5 rounded border border-[#3f4147] outline-none" />
                            </div>
                            <input type="range" min="0" max="100" value={el.x} onChange={e => updateElement(el.id, 'x', Number(e.target.value))} className="w-full accent-brand" />
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-[#b5bac1] uppercase">Pos Y</label>
                              <input type="number" value={el.y} onChange={e => updateElement(el.id, 'y', Number(e.target.value))} className="w-12 bg-[#111214] text-white text-[10px] px-1 py-0.5 rounded border border-[#3f4147] outline-none" />
                            </div>
                            <input type="range" min="0" max="100" value={el.y} onChange={e => updateElement(el.id, 'y', Number(e.target.value))} className="w-full accent-brand" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
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
                              {customAnimations.map(a => (
                                <option key={a.id} value={`custom_anim_${a.id}`}>{a.name}</option>
                              ))}
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

              {/* Animazioni Personalizzate (Timeline) */}
              <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-white font-bold text-sm uppercase">Animazioni Personalizzate (Timeline)</h4>
                  <button type="button" onClick={addCustomAnimation} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                    <Plus size={12} /> Nuova Animazione
                  </button>
                </div>
                <p className="text-xs text-[#949ba4] mb-4">Crea qui l'animazione, poi assegnala a un Elemento Fluttuante per vederla in azione!</p>

                {customAnimations.length === 0 ? (
                  <p className="text-xs text-[#949ba4] italic">Nessuna animazione personalizzata creata.</p>
                ) : (
                  <div className="space-y-4">
                    {customAnimations.map((anim) => (
                      <div key={anim.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                        <button type="button" onClick={() => removeCustomAnimation(anim.id)} className="absolute top-2 right-2 text-[#f23f43] hover:text-white transition-colors">
                          <X size={16} />
                        </button>
                        
                        <div className="grid grid-cols-3 gap-3 mb-4 pr-6">
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Nome Animazione</label>
                            <input type="text" value={anim.name} onChange={e => updateCustomAnimation(anim.id, 'name', e.target.value)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Durata (s)</label>
                            <input type="number" step="0.1" min="0.1" value={anim.duration} onChange={e => updateCustomAnimation(anim.id, 'duration', parseFloat(e.target.value)||1)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Curva</label>
                            <select value={anim.timingFunction} onChange={e => updateCustomAnimation(anim.id, 'timingFunction', e.target.value)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]">
                              <option value="linear">Lineare</option>
                              <option value="ease">Morbida (Ease)</option>
                              <option value="ease-in-out">Morbida In/Out</option>
                            </select>
                          </div>
                        </div>

                        <div className="border-t border-[#3f4147] pt-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-[#b5bac1] uppercase">Keyframes (Timeline)</span>
                            <button type="button" onClick={() => addKeyframe(anim.id)} className="text-[10px] bg-[#1e1f22] hover:bg-[#35373c] text-white px-2 py-1 rounded border border-[#3f4147] transition-colors">
                              + Keyframe
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {anim.keyframes.sort((a, b) => a.percent - b.percent).map((kf, idx) => (
                              <div key={kf.id} className="bg-[#1e1f22] p-2 rounded border border-[#3f4147] flex flex-wrap gap-2 items-center relative">
                                <button type="button" onClick={() => removeKeyframe(anim.id, kf.id)} className="absolute top-1 right-1 text-[#f23f43] hover:text-white transition-colors">
                                  <X size={12} />
                                </button>
                                
                                <div className="w-full flex items-center gap-2 mb-1 pr-4">
                                  <span className="text-[10px] font-bold text-brand w-8">{kf.percent}%</span>
                                  <input type="range" min="0" max="100" value={kf.percent} onChange={e => updateKeyframe(anim.id, kf.id, 'percent', parseInt(e.target.value))} className="flex-1 accent-brand" />
                                </div>
                                
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
                                  <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                      <label className="text-[9px] text-[#949ba4]">X (%)</label>
                                      <input type="number" value={kf.x} onChange={e => updateKeyframe(anim.id, kf.id, 'x', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                    </div>
                                    <input type="range" min="-300" max="300" value={kf.x} onChange={e => updateKeyframe(anim.id, kf.id, 'x', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                      <label className="text-[9px] text-[#949ba4]">Y (%)</label>
                                      <input type="number" value={kf.y} onChange={e => updateKeyframe(anim.id, kf.id, 'y', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                    </div>
                                    <input type="range" min="-300" max="300" value={kf.y} onChange={e => updateKeyframe(anim.id, kf.id, 'y', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                      <label className="text-[9px] text-[#949ba4]">Scala</label>
                                      <input type="number" step="0.1" value={kf.scale} onChange={e => updateKeyframe(anim.id, kf.id, 'scale', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                    </div>
                                    <input type="range" min="0" max="5" step="0.1" value={kf.scale} onChange={e => updateKeyframe(anim.id, kf.id, 'scale', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                      <label className="text-[9px] text-[#949ba4]">Rot. (°)</label>
                                      <input type="number" value={kf.rotation} onChange={e => updateKeyframe(anim.id, kf.id, 'rotation', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                    </div>
                                    <input type="range" min="-360" max="360" value={kf.rotation} onChange={e => updateKeyframe(anim.id, kf.id, 'rotation', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                      <label className="text-[9px] text-[#949ba4]">Opacità</label>
                                      <input type="number" step="0.1" value={kf.opacity} onChange={e => updateKeyframe(anim.id, kf.id, 'opacity', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                    </div>
                                    <input type="range" min="0" max="1" step="0.1" value={kf.opacity} onChange={e => updateKeyframe(anim.id, kf.id, 'opacity', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-center mb-0.5">
                                      <label className="text-[9px] text-[#949ba4]">Z-Index</label>
                                      <input type="number" value={kf.zIndex ?? 20} onChange={e => updateKeyframe(anim.id, kf.id, 'zIndex', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                    </div>
                                    <input type="range" min="0" max="50" value={kf.zIndex ?? 20} onChange={e => updateKeyframe(anim.id, kf.id, 'zIndex', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mini Preview Animazione */}
                        <div className="mt-4 p-4 bg-[#1e1f22] rounded border border-[#3f4147] flex items-center justify-center h-32 overflow-hidden relative">
                          <span className="text-[#949ba4] absolute top-2 left-2 text-[10px] uppercase font-bold">Anteprima Animazione</span>
                          <div style={{ animation: `custom_anim_${anim.id} ${anim.duration}s ${anim.timingFunction} infinite` }}>
                            <span className="text-4xl">✨</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </form>
          </div>

          {/* Anteprima a Destra */}
          <div className="w-full lg:w-[400px] flex-shrink-0 border-l border-[#1e1f22] bg-[#1e1f22] p-6 flex flex-col items-center overflow-y-auto custom-scrollbar">
            <h3 className="text-[#b5bac1] font-bold mb-8 uppercase text-xs tracking-wider">Anteprima Live</h3>
            
            <div className="dec-wrapper relative w-32 h-32 mb-8">
              {renderCustomAnimationsCSS(customAnimations)}
              
              {/* Inner Effects */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {renderInnerEffects(baseEffects)}
              </div>

              {/* Avatar & Border (z-10) */}
              <div 
                className="relative w-full h-full z-10 rounded-full flex items-center justify-center"
                style={{
                  border: `2px solid ${newDecBorder}`,
                  boxShadow: `0 0 10px ${newDecShadow}, inset 0 0 10px ${newDecShadow}`,
                }}
              >
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
                <img src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`} className="w-full h-full rounded-full object-cover relative z-10" />
              </div>

              {/* Outer Effects */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {renderOuterEffects(baseEffects)}
              </div>

              {/* Elements */}
              {elements.map(el => {
                if (el.animation === 'orbit-3d' || el.animation === 'orbit-3d-reverse') {
                  const wrapperAnim = el.animation === 'orbit-3d' ? 'custom-orbit-3d-wrapper' : 'custom-orbit-3d-wrapper-rev';
                  const innerAnim = el.animation === 'orbit-3d' ? 'custom-orbit-inner' : 'custom-orbit-3d-inner-rev';
                  return (
                    <div
                      key={el.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: `translate(-50%, -50%)`,
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      <div className="custom-orbit-container" style={{ animation: `${wrapperAnim} 4s linear infinite ${el.delay > 0 ? el.delay+'s' : '0s'}` }}>
                        <div className="custom-orbit-element" style={{ animation: `${innerAnim} 4s linear infinite ${el.delay > 0 ? el.delay+'s' : '0s'}`, width: `${el.size}cqw`, height: `${el.size}cqw`, fontSize: `${el.size}cqw` }}>
                          {el.type === 'emoji' ? el.content : <img src={el.content} className="w-full h-full object-contain" />}
                        </div>
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
                      animation: getAnimation(el.animation, el.delay, customAnimations),
                      width: `${el.size}cqw`,
                      height: `${el.size}cqw`,
                      fontSize: `${el.size}cqw`,
                      zIndex: el.animation.startsWith('custom_anim_') ? undefined : 20
                    }}
                  >
                    {el.type === 'emoji' ? el.content : <img src={el.content} className="w-full h-full object-contain" />}
                  </div>
                );
              })}
            </div>

            <div 
              className="mb-8 text-center"
              style={textColorType === 'gradient' ? { filter: `drop-shadow(0 0 8px ${newDecGradStart || '#fff'}80)` } : {}}
            >
              <span 
                className="font-bold text-2xl"
                style={textColorType === 'solid' ? {
                  color: newDecTextColor,
                  textShadow: `0 0 10px ${newDecTextColor}80`
                } : {
                  backgroundImage: `linear-gradient(90deg, ${newDecGradStart || '#fff'}, ${newDecGradEnd || '#fff'})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent'
                }}
              >
                {newDecName || 'Nome Contorno'}
              </span>
            </div>

            <button 
              type="submit"
              form="user-custom-dec-form"
              disabled={isCreatingDec || !newDecName.trim()}
              className="w-full py-3 bg-brand hover:bg-brand/80 text-white font-bold rounded transition-colors shadow-lg disabled:opacity-50"
            >
              {isCreatingDec ? 'Creazione in corso...' : 'Crea Contorno'}
            </button>
          </div>
        </div>
      </div>

      {/* Emoji Picker Modal */}
      {emojiPickerTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50" onClick={() => setEmojiPickerTarget(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#2b2d31] rounded-lg shadow-2xl border border-[#1e1f22] overflow-hidden">
            <EmojiPicker
              theme={Theme.DARK}
              onEmojiClick={(emojiObj) => {
                if (emojiPickerTarget.type === 'base') {
                  updateBaseEffect(emojiPickerTarget.id, 'icon', emojiObj.emoji);
                } else {
                  updateElement(emojiPickerTarget.id, 'content', emojiObj.emoji);
                }
                setEmojiPickerTarget(null);
              }}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};