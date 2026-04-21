"use client";

import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Wand2, Upload, Plus, Copy, ClipboardPaste } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useShop, CustomElement, BaseEffectConfig, CustomAnimationDef, CustomKeyframe, DraftDecoration, DEFAULT_DRAFT_DECORATION } from "@/contexts/ShopContext";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface CustomDecorationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const CustomDecorationEditorModal = ({ isOpen, onClose, currentUser }: CustomDecorationEditorModalProps) => {
  const { refreshCustomDecorations, draftDecoration, setDraftDecoration, clipboard, setClipboard } = useShop();
  
  const [isCreatingDec, setIsCreatingDec] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<{type: 'base' | 'element', id: string} | null>(null);

  if (!isOpen) return null;

  const updateDraft = (updates: Partial<DraftDecoration>) => {
    setDraftDecoration(prev => ({ ...prev, ...updates }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      updateDraft({ imageFile: file, imagePreview: URL.createObjectURL(file) });
    }
  };

  const addBaseEffect = () => {
    updateDraft({
      baseEffects: [...draftDecoration.baseEffects, {
        id: `be-${Date.now()}`,
        type: 'scanline',
        color1: '#5865F2',
        color2: '#f23f43',
        icon: '',
        x: 50, y: 50, rotation: 0, size: 100, zIndex: 20
      }]
    });
  };

  const updateBaseEffect = (id: string, field: keyof BaseEffectConfig, value: any) => {
    updateDraft({
      baseEffects: draftDecoration.baseEffects.map(el => el.id === id ? { ...el, [field]: value } : el)
    });
  };

  const removeBaseEffect = (id: string) => {
    updateDraft({
      baseEffects: draftDecoration.baseEffects.filter(el => el.id !== id)
    });
  };

  const copyBaseEffect = (id: string) => {
    const effect = draftDecoration.baseEffects.find(e => e.id === id);
    if (effect) {
      setClipboard(prev => ({ ...prev, baseEffect: effect }));
      showSuccess("Effetto copiato!");
    }
  };

  const pasteBaseEffect = () => {
    if (clipboard.baseEffect) {
      updateDraft({ baseEffects: [...draftDecoration.baseEffects, { ...clipboard.baseEffect, id: `be-${Date.now()}-${Math.random()}` }] });
      showSuccess("Effetto incollato!");
    }
  };

  const addElement = () => {
    updateDraft({
      elements: [...draftDecoration.elements, {
        id: `el-${Date.now()}`,
        type: 'emoji',
        content: '✨',
        animation: 'float',
        x: 50, y: 50, size: 15, delay: 0, parentId: undefined
      }]
    });
  };

  const updateElement = (id: string, field: keyof CustomElement, value: any) => {
    updateDraft({
      elements: draftDecoration.elements.map(el => el.id === id ? { ...el, [field]: value } : el)
    });
  };

  const removeElement = (id: string) => {
    updateDraft({
      elements: draftDecoration.elements
        .filter(el => el.id !== id)
        .map(el => el.parentId === id ? { ...el, parentId: undefined } : el)
    });
  };

  const copyElement = (id: string) => {
    const el = draftDecoration.elements.find(e => e.id === id);
    if (el) {
      setClipboard(prev => ({ ...prev, element: el }));
      showSuccess("Elemento copiato!");
    }
  };

  const pasteElement = () => {
    if (clipboard.element) {
      updateDraft({ elements: [...draftDecoration.elements, { ...clipboard.element, id: `el-${Date.now()}-${Math.random()}` }] });
      showSuccess("Elemento incollato!");
    }
  };

  const addCustomAnimation = () => {
    updateDraft({
      customAnimations: [...draftDecoration.customAnimations, {
        id: `anim-${Date.now()}`,
        name: `Animazione ${draftDecoration.customAnimations.length + 1}`,
        duration: 3,
        timingFunction: 'linear',
        keyframes: [
          { id: `kf-${Date.now()}-1`, percent: 0, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20 },
          { id: `kf-${Date.now()}-2`, percent: 100, x: 50, y: 50, scale: 1, rotation: 360, opacity: 1, zIndex: 20 }
        ]
      }]
    });
  };

  const updateCustomAnimation = (id: string, field: keyof CustomAnimationDef, value: any) => {
    updateDraft({
      customAnimations: draftDecoration.customAnimations.map(a => a.id === id ? { ...a, [field]: value } : a)
    });
  };

  const removeCustomAnimation = (id: string) => {
    updateDraft({
      customAnimations: draftDecoration.customAnimations.filter(a => a.id !== id),
      elements: draftDecoration.elements.map(el => el.animation === `custom_anim_${id}` ? { ...el, animation: 'none' } : el)
    });
  };

  const copyCustomAnimation = (id: string) => {
    const anim = draftDecoration.customAnimations.find(a => a.id === id);
    if (anim) {
      setClipboard(prev => ({ ...prev, animation: anim }));
      showSuccess("Animazione copiata!");
    }
  };

  const pasteCustomAnimation = () => {
    if (clipboard.animation) {
      const newAnimId = `anim-${Date.now()}-${Math.random()}`;
      const newKeyframes = clipboard.animation.keyframes.map(kf => ({ ...kf, id: `kf-${Date.now()}-${Math.random()}` }));
      updateDraft({ customAnimations: [...draftDecoration.customAnimations, { ...clipboard.animation, id: newAnimId, name: `${clipboard.animation.name} (Copia)`, keyframes: newKeyframes }] });
      showSuccess("Animazione incollata!");
    }
  };

  const addKeyframe = (animId: string) => {
    updateDraft({
      customAnimations: draftDecoration.customAnimations.map(a => {
        if (a.id === animId) {
          return {
            ...a,
            keyframes: [...a.keyframes, { id: `kf-${Date.now()}`, percent: 50, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20 }]
          };
        }
        return a;
      })
    });
  };

  const updateKeyframe = (animId: string, kfId: string, field: keyof CustomKeyframe, value: any) => {
    updateDraft({
      customAnimations: draftDecoration.customAnimations.map(a => {
        if (a.id === animId) {
          return {
            ...a,
            keyframes: a.keyframes.map(kf => kf.id === kfId ? { ...kf, [field]: value } : kf)
          };
        }
        return a;
      })
    });
  };

  const removeKeyframe = (animId: string, kfId: string) => {
    updateDraft({
      customAnimations: draftDecoration.customAnimations.map(a => {
        if (a.id === animId) {
          return { ...a, keyframes: a.keyframes.filter(kf => kf.id !== kfId) };
        }
        return a;
      })
    });
  };

  const copyKeyframe = (animId: string, kfId: string) => {
    const anim = draftDecoration.customAnimations.find(a => a.id === animId);
    if (anim) {
      const kf = anim.keyframes.find(k => k.id === kfId);
      if (kf) {
        setClipboard(prev => ({ ...prev, keyframe: kf }));
        showSuccess("Keyframe copiato!");
      }
    }
  };

  const pasteKeyframe = (animId: string) => {
    if (clipboard.keyframe) {
      updateDraft({
        customAnimations: draftDecoration.customAnimations.map(a => {
          if (a.id === animId) {
            return { ...a, keyframes: [...a.keyframes, { ...clipboard.keyframe!, id: `kf-${Date.now()}-${Math.random()}` }] };
          }
          return a;
        })
      });
      showSuccess("Keyframe incollato!");
    }
  };

  const isDescendant = (potentialDescendantId: string, ancestorId: string, allElements: CustomElement[]) => {
    let current = allElements.find(e => e.id === potentialDescendantId);
    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = allElements.find(e => e.id === current!.parentId);
    }
    return false;
  };

  const handleCreateCustomDecoration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftDecoration.name.trim() || !currentUser) return;
    
    setIsCreatingDec(true);
    const customId = `custom-${Date.now()}`;
    let imageUrl = null;

    if (draftDecoration.imageFile) {
      const fileExt = draftDecoration.imageFile.name.split('.').pop();
      const filePath = `custom_decorations/${customId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('icons').upload(filePath, draftDecoration.imageFile);
      if (!uploadError) {
        const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }
    }

    const config = {
      baseEffects: draftDecoration.baseEffects,
      elements: draftDecoration.elements,
      customAnimations: draftDecoration.customAnimations
    };

    const { error } = await supabase.from('custom_decorations').insert({
      id: customId,
      name: draftDecoration.name.trim(),
      price: 750, // Prezzo fisso per gli utenti
      category: 'Contorni Custom',
      image_url: imageUrl,
      border_color: draftDecoration.borderColor,
      shadow_color: draftDecoration.shadowColor,
      text_color_type: draftDecoration.textColorType,
      text_color: draftDecoration.textColor,
      text_gradient_start: draftDecoration.gradStart,
      text_gradient_end: draftDecoration.gradEnd,
      animation_type: draftDecoration.anim,
      config: config
    });

    if (error) {
      showError("Errore durante la creazione. Assicurati di aver eseguito lo script SQL per i permessi.");
    } else {
      const { data: profile } = await supabase.from('profiles').select('purchased_decorations').eq('id', currentUser.id).single();
      const currentPurchased = profile?.purchased_decorations || [];
      
      const ticketIndex = currentPurchased.indexOf('custom-dec-ticket');
      if (ticketIndex !== -1) {
        currentPurchased.splice(ticketIndex, 1);
      }
      currentPurchased.push(customId);

      await supabase.from('profiles').update({ purchased_decorations: currentPurchased }).eq('id', currentUser.id);

      showSuccess("Contorno creato e aggiunto al tuo inventario!");
      setDraftDecoration(DEFAULT_DRAFT_DECORATION); // Resetta la bozza dopo la creazione
      await refreshCustomDecorations();
      onClose();
    }
    setIsCreatingDec(false);
  };

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

  const renderElementNode = (el: CustomElement, allElements: CustomElement[], customAnimations?: CustomAnimationDef[]) => {
    const children = allElements.filter(child => child.parentId === el.id);
    const childrenNodes = children.map(child => renderElementNode(child, allElements, customAnimations));

    const contentNode = el.type === 'emoji' ? el.content : <img src={el.content} className="w-full h-full object-contain" />;

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
              {contentNode}
              {childrenNodes}
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
        {contentNode}
        {childrenNodes}
      </div>
    );
  };

  const avatarUrl = currentUser.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=preview";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-[#313338] rounded-lg w-[1100px] max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#1e1f22] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="text-brand" />
            Crea Contorno Personalizzato
          </h2>
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
                      value={draftDecoration.name}
                      onChange={e => updateDraft({ name: e.target.value })}
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
                    <input type="radio" checked={draftDecoration.textColorType === 'solid'} onChange={() => updateDraft({ textColorType: 'solid' })} className="accent-brand" />
                    Tinta Unita
                  </label>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input type="radio" checked={draftDecoration.textColorType === 'gradient'} onChange={() => updateDraft({ textColorType: 'gradient' })} className="accent-brand" />
                    Gradiente
                  </label>
                </div>

                {draftDecoration.textColorType === 'solid' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Colore Testo</label>
                    <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                      <input type="color" value={draftDecoration.textColor} onChange={e => updateDraft({ textColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                      <span className="text-white text-sm uppercase">{draftDecoration.textColor}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Inizio Gradiente</label>
                      <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                        <input type="color" value={draftDecoration.gradStart} onChange={e => updateDraft({ gradStart: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                        <span className="text-white text-sm uppercase">{draftDecoration.gradStart}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Fine Gradiente</label>
                      <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                        <input type="color" value={draftDecoration.gradEnd} onChange={e => updateDraft({ gradEnd: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                        <span className="text-white text-sm uppercase">{draftDecoration.gradEnd}</span>
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
                      <input type="color" value={draftDecoration.borderColor} onChange={e => updateDraft({ borderColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                      <span className="text-white text-sm uppercase">{draftDecoration.borderColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Colore Ombra</label>
                    <div className="flex items-center gap-2 bg-[#2b2d31] p-1 rounded border border-[#3f4147]">
                      <input type="color" value={draftDecoration.shadowColor} onChange={e => updateDraft({ shadowColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                      <span className="text-white text-sm uppercase">{draftDecoration.shadowColor}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Animazione Sfondo</label>
                    <select 
                      value={draftDecoration.anim}
                      onChange={e => updateDraft({ anim: e.target.value })}
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
                      <Upload size={16} /> {draftDecoration.imageFile ? 'Cambia Immagine' : 'Carica Immagine'}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
                </div>
              </div>

              {/* Effetti Base Multipli */}
              <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-white font-bold text-sm uppercase">Effetti Base</h4>
                  <div className="flex gap-2">
                    {clipboard.baseEffect && (
                      <button type="button" onClick={pasteBaseEffect} className="text-xs bg-[#2b2d31] hover:bg-[#35373c] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-[#3f4147]">
                        <ClipboardPaste size={12} /> Incolla
                      </button>
                    )}
                    <button type="button" onClick={addBaseEffect} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                      <Plus size={12} /> Aggiungi Effetto
                    </button>
                  </div>
                </div>

                {draftDecoration.baseEffects.length === 0 ? (
                  <p className="text-xs text-[#949ba4] italic">Nessun effetto base aggiunto.</p>
                ) : (
                  <div className="space-y-3">
                    {draftDecoration.baseEffects.map((effect) => (
                      <div key={effect.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button type="button" onClick={() => copyBaseEffect(effect.id)} className="text-[#b5bac1] hover:text-white transition-colors" title="Copia">
                            <Copy size={16} />
                          </button>
                          <button type="button" onClick={() => removeBaseEffect(effect.id)} className="text-[#f23f43] hover:text-white transition-colors" title="Elimina">
                            <X size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3 pr-12">
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
                  <div className="flex gap-2">
                    {clipboard.element && (
                      <button type="button" onClick={pasteElement} className="text-xs bg-[#2b2d31] hover:bg-[#35373c] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-[#3f4147]">
                        <ClipboardPaste size={12} /> Incolla
                      </button>
                    )}
                    <button type="button" onClick={addElement} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                      <Plus size={12} /> Aggiungi Elemento
                    </button>
                  </div>
                </div>

                {draftDecoration.elements.length === 0 ? (
                  <p className="text-xs text-[#949ba4] italic">Nessun elemento fluttuante aggiunto.</p>
                ) : (
                  <div className="space-y-3">
                    {draftDecoration.elements.map((el, idx) => (
                      <div key={el.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button type="button" onClick={() => copyElement(el.id)} className="text-[#b5bac1] hover:text-white transition-colors" title="Copia">
                            <Copy size={16} />
                          </button>
                          <button type="button" onClick={() => removeElement(el.id)} className="text-[#f23f43] hover:text-white transition-colors" title="Elimina">
                            <X size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3 pr-12">
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

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                              {draftDecoration.customAnimations.map(a => (
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
                          <div>
                            <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Attacca a</label>
                            <select 
                              value={el.parentId || ''} 
                              onChange={e => updateElement(el.id, 'parentId', e.target.value || undefined)} 
                              className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]"
                            >
                              <option value="">Nessuno (Base)</option>
                              {draftDecoration.elements
                                .filter(other => other.id !== el.id && !isDescendant(other.id, el.id, draftDecoration.elements))
                                .map(other => (
                                  <option key={other.id} value={other.id}>
                                    {other.type === 'emoji' ? other.content : 'IMG'} ({other.id.slice(-4)})
                                  </option>
                              ))}
                            </select>
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
                  <div className="flex gap-2">
                    {clipboard.animation && (
                      <button type="button" onClick={pasteCustomAnimation} className="text-xs bg-[#2b2d31] hover:bg-[#35373c] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-[#3f4147]">
                        <ClipboardPaste size={12} /> Incolla
                      </button>
                    )}
                    <button type="button" onClick={addCustomAnimation} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                      <Plus size={12} /> Nuova Animazione
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#949ba4] mb-4">Crea qui l'animazione, poi assegnala a un Elemento Fluttuante per vederla in azione!</p>

                {draftDecoration.customAnimations.length === 0 ? (
                  <p className="text-xs text-[#949ba4] italic">Nessuna animazione personalizzata creata.</p>
                ) : (
                  <div className="space-y-4">
                    {draftDecoration.customAnimations.map((anim) => (
                      <div key={anim.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button type="button" onClick={() => copyCustomAnimation(anim.id)} className="text-[#b5bac1] hover:text-white transition-colors" title="Copia">
                            <Copy size={16} />
                          </button>
                          <button type="button" onClick={() => removeCustomAnimation(anim.id)} className="text-[#f23f43] hover:text-white transition-colors" title="Elimina">
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 mb-4 pr-12">
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
                            <div className="flex gap-2">
                              {clipboard.keyframe && (
                                <button type="button" onClick={() => pasteKeyframe(anim.id)} className="text-[10px] bg-[#1e1f22] hover:bg-[#35373c] text-white px-2 py-1 rounded border border-[#3f4147] transition-colors flex items-center gap-1">
                                  <ClipboardPaste size={10} /> Incolla
                                </button>
                              )}
                              <button type="button" onClick={() => addKeyframe(anim.id)} className="text-[10px] bg-[#1e1f22] hover:bg-[#35373c] text-white px-2 py-1 rounded border border-[#3f4147] transition-colors">
                                + Keyframe
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {anim.keyframes.sort((a, b) => a.percent - b.percent).map((kf, idx) => (
                              <div key={kf.id} className="bg-[#1e1f22] p-2 rounded border border-[#3f4147] flex flex-wrap gap-2 items-center relative">
                                <div className="absolute top-1 right-1 flex gap-1">
                                  <button type="button" onClick={() => copyKeyframe(anim.id, kf.id)} className="text-[#b5bac1] hover:text-white transition-colors" title="Copia">
                                    <Copy size={12} />
                                  </button>
                                  <button type="button" onClick={() => removeKeyframe(anim.id, kf.id)} className="text-[#f23f43] hover:text-white transition-colors" title="Elimina">
                                    <X size={12} />
                                  </button>
                                </div>
                                
                                <div className="w-full flex items-center gap-2 mb-1 pr-10">
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
          <div className="w-full lg:w-[350px] flex-shrink-0 border-l border-[#1e1f22] bg-[#1e1f22] p-6 flex flex-col items-center overflow-y-auto custom-scrollbar">
            <h3 className="text-[#b5bac1] font-bold mb-8 uppercase text-xs tracking-wider">Anteprima Live</h3>
            
            <div className="dec-wrapper relative w-32 h-32 mb-8">
              {renderCustomAnimationsCSS(draftDecoration.customAnimations)}
              
              {/* Inner Effects */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {renderInnerEffects(draftDecoration.baseEffects)}
              </div>

              {/* Avatar & Border (z-10) */}
              <div 
                className="relative w-full h-full z-10 rounded-full flex items-center justify-center"
                style={{
                  border: `2px solid ${draftDecoration.borderColor}`,
                  boxShadow: `0 0 10px ${draftDecoration.shadowColor}, inset 0 0 10px ${draftDecoration.shadowColor}`,
                }}
              >
                {draftDecoration.imagePreview && (
                  <img 
                    src={draftDecoration.imagePreview} 
                    className="absolute inset-0 w-full h-full object-cover rounded-full opacity-60 pointer-events-none mix-blend-screen" 
                    style={{ 
                      animation: draftDecoration.anim === 'spin' ? 'spin-slow 4s linear infinite' : 
                                 draftDecoration.anim === 'pulse' ? 'custom-pulse 2s infinite' : 
                                 draftDecoration.anim === 'bounce' ? 'custom-bounce 2s infinite' : 'none' 
                    }} 
                  />
                )}
                <img src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`} className="w-full h-full rounded-full object-cover relative z-10" />
              </div>

              {/* Outer Effects */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {renderOuterEffects(draftDecoration.baseEffects)}
              </div>

              {/* Elements */}
              {draftDecoration.elements.filter(el => !el.parentId).map(el => renderElementNode(el, draftDecoration.elements, draftDecoration.customAnimations))}
            </div>

            <div 
              className="mb-8 text-center"
              style={draftDecoration.textColorType === 'gradient' ? { filter: `drop-shadow(0 0 8px ${draftDecoration.gradStart || '#fff'}80)` } : {}}
            >
              <span 
                className="font-bold text-2xl"
                style={draftDecoration.textColorType === 'solid' ? {
                  color: draftDecoration.textColor,
                  textShadow: `0 0 10px ${draftDecoration.textColor}80`
                } : {
                  backgroundImage: `linear-gradient(90deg, ${draftDecoration.gradStart || '#fff'}, ${draftDecoration.gradEnd || '#fff'})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent'
                }}
              >
                {draftDecoration.name || 'Nome Contorno'}
              </span>
            </div>

            <button 
              type="submit"
              form="user-custom-dec-form"
              disabled={isCreatingDec || !draftDecoration.name.trim()}
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