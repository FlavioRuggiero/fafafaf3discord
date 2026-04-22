import React from 'react';
import { useShop, BaseEffectConfig, CustomAnimationDef, CustomElement } from '@/contexts/ShopContext';

interface AvatarProps {
  src: string;
  alt?: string;
  className?: string;
  decoration?: string | null;
  isSpeaking?: boolean;
  clipEffects?: boolean;
}

export const Avatar = ({ src, alt, className = "", decoration, isSpeaking, clipEffects }: AvatarProps) => {
  const { customDecorations } = useShop();
  
  const isVoiceContext = typeof isSpeaking === 'boolean';
  const actualDecoration = decoration === "null" ? null : decoration;
  const shouldShowDecoration = actualDecoration && (!isVoiceContext || isSpeaking);
  const activeDecoration = shouldShowDecoration ? actualDecoration : null;

  const showYellowRing = isSpeaking && !activeDecoration;
  const speakingClass = showYellowRing ? "ring-2 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] z-20" : (isSpeaking ? "z-20" : "");

  if (!activeDecoration) {
    return <img src={src} alt={alt} className={`rounded-full object-cover ${speakingClass} ${className}`} />;
  }

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

        return `${kf.percent}% { ${leftTop} ${transform} rotate: ${kf.rotation}deg; scale: ${kf.scale}; opacity: ${kf.opacity}; }`;
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
        
        {/* Inner Effects */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {renderInnerEffects(effectsToRender)}
        </div>

        {/* Avatar & Border (z-10) */}
        <div 
          className="relative w-full h-full z-10 rounded-full flex items-center justify-center"
          style={{
            border: `2px solid ${customDec.border_color}`,
            boxShadow: `0 0 10px ${customDec.shadow_color}, inset 0 0 10px ${customDec.shadow_color}`,
          }}
        >
          <img src={src} alt={alt} className="w-full h-full rounded-full object-cover relative z-10" />
        </div>

        {/* Outer Effects */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {renderOuterEffects(effectsToRender)}
        </div>

        {/* Elements */}
        {customDec.config?.elements?.map(el => renderStandaloneElement(el, customDec.config!.elements!, customDec.config?.customAnimations))}
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