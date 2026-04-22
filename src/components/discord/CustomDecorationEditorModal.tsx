"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Wand2, Upload, Plus, Copy, ClipboardPaste, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/discord";
import { showSuccess, showError } from "@/utils/toast";
import { useShop, CustomElement, BaseEffectConfig, CustomAnimationDef, CustomKeyframe, DraftDecoration, DEFAULT_DRAFT_DECORATION } from "@/contexts/ShopContext";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface CustomDecorationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  editDecorationId?: string;
}

export const CustomDecorationEditorModal = ({ isOpen, onClose, currentUser, editDecorationId }: CustomDecorationEditorModalProps) => {
  const { customDecorations, refreshCustomDecorations, draftDecoration, setDraftDecoration, clipboard, setClipboard } = useShop();
  
  const [isCreatingDec, setIsCreatingDec] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<{type: 'base' | 'element', id: string} | null>(null);

  // Stati per comprimere gli elementi
  const [collapsedElements, setCollapsedElements] = useState<Set<string>>(new Set());
  const [collapsedAnims, setCollapsedAnims] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      if (editDecorationId) {
        // Se stiamo modificando un contorno diverso da quello attualmente nel draft, lo carichiamo
        if (draftDecoration.id !== editDecorationId) {
          const dec = customDecorations.find(d => d.id === editDecorationId);
          if (dec) {
            setDraftDecoration({
              id: dec.id,
              name: dec.name,
              price: dec.price,
              borderColor: dec.border_color,
              shadowColor: dec.shadow_color,
              textColorType: dec.text_color_type,
              textColor: dec.text_color,
              gradStart: dec.text_gradient_start,
              gradEnd: dec.text_gradient_end,
              anim: dec.animation_type,
              baseEffects: dec.config?.baseEffects || [],
              elements: dec.config?.elements || [],
              customAnimations: dec.config?.customAnimations || [],
              imageFile: null,
              imagePreview: dec.image_url
            });
          }
        }
      } else {
        // Se stiamo creando un nuovo contorno, ma il draft attuale è associato a un ID (stavamo modificando), lo resettiamo.
        // Se il draft attuale NON ha ID, significa che stavamo già creando un nuovo contorno, quindi preserviamo lo stato!
        if (draftDecoration.id) {
          setDraftDecoration({ ...DEFAULT_DRAFT_DECORATION });
        }
      }
    }
  }, [isOpen, editDecorationId, customDecorations, draftDecoration.id, setDraftDecoration]);

  if (!isOpen) return null;

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

  const copyBaseEffect = async (id: string) => {
    const effect = draftDecoration.baseEffects.find(e => e.id === id);
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
        updateDraft({ baseEffects: [...draftDecoration.baseEffects, newEffect] });
        showSuccess("Effetto incollato!");
      } else {
        showError("Il testo negli appunti non è un Effetto Base valido.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
    }
  };

  const addElement = () => {
    const newId = `el-${Date.now()}`;
    updateDraft({
      elements: [...draftDecoration.elements, {
        id: newId,
        type: 'emoji',
        content: '✨',
        animation: 'float',
        x: 50, y: 50, rotation: 0, size: 15, delay: 0, parentId: undefined, zIndex: 20
      }]
    });
    setCollapsedElements(prev => {
      const next = new Set(prev);
      next.delete(newId);
      return next;
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

  const copyElement = async (id: string) => {
    const el = draftDecoration.elements.find(e => e.id === id);
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
        updateDraft({ elements: [...draftDecoration.elements, { ...parsed.data, id: newId, parentId: undefined }] });
        showSuccess("Elemento incollato!");
      } else {
        showError("Il testo negli appunti non è un Elemento valido.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
    }
  };

  const addCustomAnimation = () => {
    const newId = `anim-${Date.now()}`;
    updateDraft({
      customAnimations: [...draftDecoration.customAnimations, {
        id: newId,
        name: `Animazione ${draftDecoration.customAnimations.length + 1}`,
        duration: 3,
        timingFunction: 'linear',
        keyframes: [
          { id: `kf-${Date.now()}-1`, percent: 0, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20, positionMode: 'relative' },
          { id: `kf-${Date.now()}-2`, percent: 100, x: 50, y: 50, scale: 1, rotation: 360, opacity: 1, zIndex: 20, positionMode: 'relative' }
        ]
      }]
    });
    setCollapsedAnims(prev => {
      const next = new Set(prev);
      next.delete(newId);
      return next;
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

  const copyCustomAnimation = async (id: string) => {
    const anim = draftDecoration.customAnimations.find(a => a.id === id);
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
        updateDraft({ customAnimations: [...draftDecoration.customAnimations, { ...parsed.data, id: newAnimId, name: `${parsed.data.name} (Copia)`, keyframes: newKeyframes }] });
        showSuccess("Animazione incollata!");
      } else {
        showError("Il testo negli appunti non è un'Animazione valida.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
    }
  };

  const addKeyframe = (animId: string) => {
    updateDraft({
      customAnimations: draftDecoration.customAnimations.map(a => {
        if (a.id === animId) {
          return {
            ...a,
            keyframes: [...a.keyframes, { id: `kf-${Date.now()}`, percent: 50, x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, zIndex: 20, positionMode: 'relative' }]
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

  const copyKeyframe = async (animId: string, kfId: string) => {
    const anim = draftDecoration.customAnimations.find(a => a.id === animId);
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
        updateDraft({
          customAnimations: draftDecoration.customAnimations.map(a => {
            if (a.id === animId) {
              return { ...a, keyframes: [...a.keyframes, { ...parsed.data, id: `kf-${Date.now()}-${Math.random().toString(36).substring(7)}`, targetId: undefined }] };
            }
            return a;
          })
        });
        showSuccess("Keyframe incollato!");
      } else {
        showError("Il testo negli appunti non è un Keyframe valido.");
      }
    } catch (e) {
      showError("Impossibile incollare. Assicurati di aver copiato un elemento valido.");
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
    const customId = draftDecoration.id || `custom-${Date.now()}`;
    let imageUrl = draftDecoration.imagePreview;

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

    const payload = {
      name: draftDecoration.name.trim(),
      price: 750,
      category: 'Contorni Custom',
      image_url: imageUrl,
      border_color: draftDecoration.borderColor,
      shadow_color: draftDecoration.shadowColor,
      text_color_type: draftDecoration.textColorType,
      text_color: draftDecoration.textColor,
      text_gradient_start: draftDecoration.gradStart,
      text_gradient_end: draftDecoration.gradEnd,
      animation_type: draftDecoration.anim,
      config: config,
      creator_id: currentUser.id
    };

    if (draftDecoration.id) {
      const { error } = await supabase.from('custom_decorations').update(payload).eq('id', draftDecoration.id);
      if (error) {
        showError("Errore durante l'aggiornamento. Assicurati di aver eseguito lo script SQL per i permessi.");
      } else {
        showSuccess("Contorno aggiornato con successo!");
        setDraftDecoration({ ...DEFAULT_DRAFT_DECORATION });
        await refreshCustomDecorations();
        onClose();
      }
    } else {
      const { error } = await supabase.from('custom_decorations').insert({ id: customId, ...payload });
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
        setDraftDecoration({ ...DEFAULT_DRAFT_DECORATION });
        await refreshCustomDecorations();
        onClose();
      }
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

  const avatarUrl = (currentUser as any)?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=preview";

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
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {activeTab === 'custom-editor' && (
            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
              <div id="custom-editor-container" className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <Wand2 className="text-brand" /> {editDecorationId ? 'Modifica Contorno Custom' : 'Crea Contorno Custom'}
                  </h3>
                  {editDecorationId && (
                    <button 
                      onClick={handleCancelEdit}
                      className="text-sm text-[#b5bac1] hover:text-white hover:underline transition-colors"
                    >
                      Annulla Modifica
                    </button>
                  )}
                </div>
                
                <form id="custom-dec-form" onSubmit={handleCreateCustomDecoration} className="space-y-6">
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
                  </div>

                  {/* Effetti Base Multipli */}
                  <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white font-bold text-sm uppercase">Effetti Base</h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={pasteBaseEffect} className="text-xs bg-[#2b2d31] hover:bg-[#35373c] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-[#3f4147]">
                          <ClipboardPaste size={12} /> Incolla
                        </button>
                        <button type="button" onClick={addBaseEffect} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                          <Plus size={12} /> Aggiungi Effetto
                        </button>
                      </div>
                    </div>

                    {baseEffects.length === 0 ? (
                      <p className="text-xs text-[#949ba4] italic">Nessun effetto base aggiunto.</p>
                    ) : (
                      <div className="space-y-3">
                        {baseEffects.map((effect) => (
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
                        <button type="button" onClick={pasteElement} className="text-xs bg-[#2b2d31] hover:bg-[#35373c] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-[#3f4147]">
                          <ClipboardPaste size={12} /> Incolla
                        </button>
                        <button type="button" onClick={addElement} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                          <Plus size={12} /> Aggiungi Elemento
                        </button>
                      </div>
                    </div>

                    {elements.length === 0 ? (
                      <p className="text-xs text-[#949ba4] italic">Nessun elemento fluttuante aggiunto.</p>
                    ) : (
                      <div className="space-y-3">
                        {elements.map((el, idx) => {
                          const isCollapsed = collapsedElements.has(el.id);
                          return (
                            <div key={el.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                              <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => toggleElement(el.id)}>
                                <div className="flex items-center gap-2 text-white font-bold text-sm">
                                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                  Elemento: {el.name || (el.type === 'emoji' ? el.content : 'Immagine')}
                                </div>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                  <button type="button" onClick={() => copyElement(el.id)} className="text-[#b5bac1] hover:text-white transition-colors p-1" title="Copia">
                                    <Copy size={16} />
                                  </button>
                                  <button type="button" onClick={() => removeElement(el.id)} className="text-[#f23f43] hover:text-white transition-colors p-1" title="Elimina">
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              
                              {!isCollapsed && (
                                <div className="pt-2 border-t border-[#3f4147]">
                                  <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Nome Elemento</label>
                                      <input type="text" value={el.name || ''} onChange={e => updateElement(el.id, 'name', e.target.value)} placeholder="Es. Scintilla" className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                    </div>
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

                                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
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
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Rotazione</label>
                                      <input type="number" value={el.rotation || 0} onChange={e => updateElement(el.id, 'rotation', Number(e.target.value))} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Attacca a</label>
                                      <select 
                                        value={el.parentId || ''} 
                                        onChange={e => updateElement(el.id, 'parentId', e.target.value || undefined)} 
                                        className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]"
                                      >
                                        <option value="">Nessuno (Base)</option>
                                        {elements
                                          .filter(other => other.id !== el.id && !isDescendant(other.id, el.id, elements))
                                          .map(other => (
                                            <option key={other.id} value={other.id}>
                                              {other.name || (other.type === 'emoji' ? other.content : 'IMG')} ({other.id.slice(-4)})
                                            </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#b5bac1] uppercase mb-1">Z-Index</label>
                                      <input type="number" value={el.zIndex ?? 20} onChange={e => updateElement(el.id, 'zIndex', parseInt(e.target.value)||0)} className="w-full bg-[#1e1f22] text-white rounded p-1.5 text-xs border border-[#3f4147]" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Animazioni Personalizzate (Timeline) */}
                  <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white font-bold text-sm uppercase">Animazioni Personalizzate (Timeline)</h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={pasteCustomAnimation} className="text-xs bg-[#2b2d31] hover:bg-[#35373c] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-[#3f4147]">
                          <ClipboardPaste size={12} /> Incolla
                        </button>
                        <button type="button" onClick={addCustomAnimation} className="text-xs bg-brand hover:bg-brand/80 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                          <Plus size={12} /> Nuova Animazione
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#949ba4] mb-4">Crea qui l'animazione, poi assegnala a un Elemento Fluttuante per vederla in azione!</p>

                    {customAnimations.length === 0 ? (
                      <p className="text-xs text-[#949ba4] italic">Nessuna animazione personalizzata creata.</p>
                    ) : (
                      <div className="space-y-4">
                        {customAnimations.map((anim) => {
                          const isCollapsed = collapsedAnims.has(anim.id);
                          return (
                            <div key={anim.id} className="bg-[#2b2d31] p-3 rounded border border-[#3f4147] relative">
                              <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => toggleAnim(anim.id)}>
                                <div className="flex items-center gap-2 text-white font-bold text-sm">
                                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                  {anim.name}
                                </div>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                  <button type="button" onClick={() => copyCustomAnimation(anim.id)} className="text-[#b5bac1] hover:text-white transition-colors p-1" title="Copia">
                                    <Copy size={16} />
                                  </button>
                                  <button type="button" onClick={() => removeCustomAnimation(anim.id)} className="text-[#f23f43] hover:text-white transition-colors p-1" title="Elimina">
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                              
                              {!isCollapsed && (
                                <div className="pt-2 border-t border-[#3f4147]">
                                  <div className="grid grid-cols-3 gap-3 mb-4">
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
                                        <button type="button" onClick={() => pasteKeyframe(anim.id)} className="text-[10px] bg-[#1e1f22] hover:bg-[#35373c] text-white px-2 py-1 rounded border border-[#3f4147] transition-colors flex items-center gap-1">
                                          <ClipboardPaste size={10} /> Incolla
                                        </button>
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
                                          
                                          <div className="w-full flex items-center gap-2 mb-2 pr-10">
                                            <span className="text-[10px] font-bold text-brand w-8">{kf.percent}%</span>
                                            <input type="range" min="0" max="100" value={kf.percent} onChange={e => updateKeyframe(anim.id, kf.id, 'percent', parseInt(e.target.value))} className="flex-1 accent-brand" />
                                          </div>

                                          <div className="col-span-full flex gap-3 mb-3 p-2 bg-[#111214] rounded border border-[#3f4147] w-full">
                                            <div className="flex-1">
                                              <label className="text-[9px] text-[#949ba4] uppercase mb-1 block">Modalità Posizione</label>
                                              <select 
                                                value={kf.positionMode || 'relative'} 
                                                onChange={e => updateKeyframe(anim.id, kf.id, 'positionMode', e.target.value)}
                                                className="w-full bg-[#1e1f22] text-white text-[10px] p-1 rounded border border-[#3f4147] outline-none"
                                              >
                                                <option value="relative">Relativa (Offset)</option>
                                                <option value="absolute">Assoluta (Globale)</option>
                                                <option value="target">Segui Elemento</option>
                                              </select>
                                            </div>
                                            {kf.positionMode === 'target' && (
                                              <div className="flex-1">
                                                <label className="text-[9px] text-[#949ba4] uppercase mb-1 block">Elemento Bersaglio</label>
                                                <select 
                                                  value={kf.targetId || ''} 
                                                  onChange={e => updateKeyframe(anim.id, kf.id, 'targetId', e.target.value)}
                                                  className="w-full bg-[#1e1f22] text-white text-[10px] p-1 rounded border border-[#3f4147] outline-none"
                                                >
                                                  <option value="">Seleziona...</option>
                                                  {elements.map(e => (
                                                    <option key={e.id} value={e.id}>{e.name || (e.type === 'emoji' ? e.content : 'IMG')} ({e.id.slice(-4)})</option>
                                                  ))}
                                                </select>
                                              </div>
                                            )}
                                          </div>
                                          
                                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 w-full">
                                            {kf.positionMode !== 'target' && (
                                              <>
                                                <div>
                                                  <div className="flex justify-between items-center mb-0.5">
                                                    <label className="text-[9px] text-[#949ba4]">X {kf.positionMode === 'absolute' ? '(%)' : '(Offset)'}</label>
                                                    <input type="number" value={kf.x} onChange={e => updateKeyframe(anim.id, kf.id, 'x', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                                  </div>
                                                  <input type="range" min={kf.positionMode === 'absolute' ? "0" : "-300"} max={kf.positionMode === 'absolute' ? "100" : "300"} value={kf.x} onChange={e => updateKeyframe(anim.id, kf.id, 'x', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                                </div>
                                                <div>
                                                  <div className="flex justify-between items-center mb-0.5">
                                                    <label className="text-[9px] text-[#949ba4]">Y {kf.positionMode === 'absolute' ? '(%)' : '(Offset)'}</label>
                                                    <input type="number" value={kf.y} onChange={e => updateKeyframe(anim.id, kf.id, 'y', Number(e.target.value))} className="w-10 bg-[#111214] text-white text-[9px] px-1 rounded border border-[#3f4147] outline-none" />
                                                  </div>
                                                  <input type="range" min={kf.positionMode === 'absolute' ? "0" : "-300"} max={kf.positionMode === 'absolute' ? "100" : "300"} value={kf.y} onChange={e => updateKeyframe(anim.id, kf.id, 'y', Number(e.target.value))} className="w-full accent-[#dbdee1]" />
                                                </div>
                                              </>
                                            )}
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
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </form>
              </div>

              {/* Anteprima a Destra */}
              <div className="w-full lg:w-[350px] flex-shrink-0 border-l border-[#1e1f22] bg-[#1e1f22] p-6 flex flex-col items-center overflow-y-auto custom-scrollbar">
                <h3 className="text-[#b5bac1] font-bold mb-8 uppercase text-xs tracking-wider">Anteprima Live</h3>
                
                <div className="dec-wrapper relative w-32 h-32 mb-8">
                  {renderCustomAnimationsCSS(customAnimations, elements)}
                  
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
                    <img src={avatarUrl} className="w-full h-full rounded-full object-cover relative z-10" />
                  </div>

                  {/* Outer Effects */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {renderOuterEffects(baseEffects)}
                  </div>

                  {/* Elements */}
                  {elements.filter(el => !el.parentId).map(el => renderStandaloneElement(el, elements, customAnimations))}
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
                  form="custom-dec-form"
                  disabled={isCreatingDec || !newDecName.trim()}
                  className="w-full py-3 bg-brand hover:bg-brand/80 text-white font-bold rounded transition-colors shadow-lg disabled:opacity-50"
                >
                  {isCreatingDec ? 'Salvataggio in corso...' : (editDecorationId ? 'Salva Modifiche' : 'Crea Contorno')}
                </button>
              </div>
            </div>
          )}

          {/* Lista Contorni Custom */}
          {activeTab === 'custom-editor' && customDecorations.length > 0 && (
            <div className="bg-[#2b2d31] p-4 border-t border-[#1e1f22] flex-shrink-0">
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contorni Custom Esistenti</h3>
              <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                {customDecorations.map(dec => (
                  <div key={dec.id} className="flex items-center justify-between bg-[#1e1f22] p-3 rounded border border-[#3f4147] min-w-[250px]">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full relative flex items-center justify-center"
                        style={{ border: `2px solid ${dec.border_color}`, boxShadow: `0 0 5px ${dec.shadow_color}` }}
                      >
                      </div>
                      <div className="flex flex-col" style={dec.text_color_type === 'gradient' ? { filter: `drop-shadow(0 0 4px ${dec.text_gradient_start}80)` } : {}}>
                        <span className="text-sm font-bold" style={
                          dec.text_color_type === 'solid' ? {
                            color: dec.text_color,
                            textShadow: `0 0 5px ${dec.text_color}80`
                          } : {
                            backgroundImage: `linear-gradient(90deg, ${dec.text_gradient_start}, ${dec.text_gradient_end})`, 
                            WebkitBackgroundClip: 'text', 
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            color: 'transparent'
                          }
                        }>
                          {dec.name}
                        </span>
                        <span className="text-[10px] text-[#949ba4]">{dec.price} DC</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={() => handleEditCustomDecoration(dec)}
                        className="p-1.5 text-brand hover:bg-brand/20 rounded transition-colors"
                        title="Modifica"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteCustomDecoration(dec.id)}
                        className="p-1.5 text-[#f23f43] hover:bg-[#f23f43]/20 rounded transition-colors"
                        title="Elimina"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'jumpscare' && (
            <div className="flex flex-col flex-1 min-h-0 p-4">
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
            <div className="flex flex-col flex-1 min-h-0 p-4">
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
            <div className="p-4 flex-1 flex flex-col min-h-0">
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
            </div>
          )}
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