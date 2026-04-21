import React from 'react';
import { useShop, BaseEffectConfig } from '@/contexts/ShopContext';

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

  const getBgImage = (effect: BaseEffectConfig, defaultUrl: string) => {
    if (!effect.icon) return `url('${defaultUrl}')`;
    if (effect.icon.startsWith('http') || effect.icon.startsWith('/')) return `url('${effect.icon}')`;
    return 'none'; // Se è un'emoji, rimuoviamo l'immagine di sfondo
  };

  const getIconContent = (effect: BaseEffectConfig, defaultIcon: string | null = null) => {
    if (!effect.icon) return defaultIcon;
    if (effect.icon.startsWith('http') || effect.icon.startsWith('/')) return null;
    return <span className="w-full h-full flex items-center justify-center object-contain">{effect.icon}</span>;
  };

  const wrapInnerEffect = (effect: BaseEffectConfig, children: React.ReactNode) => {
    const x = effect.x ?? 50;
    const y = effect.y ?? 50;
    const rot = effect.rotation ?? 0;
    
    if (x === 50 && y === 50 && rot === 0) {
      return <React.Fragment key={`wrap-inner-${effect.id}`}>{children}</React.Fragment>;
    }

    return (
      <div 
        key={`wrap-inner-${effect.id}`}
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translate(${x - 50}%, ${y - 50}%) rotate(${rot}deg)` }}
      >
        {children}
      </div>
    );
  };

  const wrapOuterEffect = (effect: BaseEffectConfig, children: React.ReactNode) => {
    const x = effect.x ?? 50;
    const y = effect.y ?? 50;
    const rot = effect.rotation ?? 0;
    
    if (x === 50 && y === 50 && rot === 0) {
      return <React.Fragment key={`wrap-outer-${effect.id}`}>{children}</React.Fragment>;
    }

    return (
      <div 
        key={`wrap-outer-${effect.id}`}
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translate(${x - 50}%, ${y - 50}%) rotate(${rot}deg)` }}
      >
        {children}
      </div>
    );
  };

  const renderInnerEffects = (effects: BaseEffectConfig[]) => {
    return effects.map(effect => {
      switch(effect.type) {
        case 'scanline':
          return wrapInnerEffect(effect, <div className="custom-scanline" style={{ color: effect.color1 }}></div>);
        case 'radar':
          return wrapInnerEffect(effect, <div className="absolute inset-[-3px] rounded-full" style={{ background: `conic-gradient(from 0deg, transparent 70%, ${effect.color1} 100%)`, animation: 'spin-slow 1.5s linear infinite' }}></div>);
        case 'twin-rings':
          return wrapInnerEffect(effect, (
            <>
              <div className="absolute inset-[-3px] rounded-full" style={{ border: `2px dashed ${effect.color1}`, animation: 'spin-slow 4s linear infinite' }}></div>
              <div className="absolute inset-[-6px] rounded-full" style={{ border: `2px dashed ${effect.color2}`, animation: 'spin-slow 3s linear infinite reverse' }}></div>
            </>
          ));
        case 'circo':
          return wrapInnerEffect(effect, <div className="absolute inset-[-3px] rounded-full" style={{ background: `repeating-conic-gradient(${effect.color1} 0deg 20deg, ${effect.color2} 20deg 40deg)`, animation: 'spin-slow 8s linear infinite' }}></div>);
        case 'pulse-ring':
          return wrapInnerEffect(effect, <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${effect.color1}`, animation: 'custom-pulse-ring 2s infinite', '--pulse-color': effect.color1 } as any}></div>);
        case 'supernova':
          return wrapInnerEffect(effect, <div className="absolute inset-[-4px] rounded-full" style={{ background: `conic-gradient(${effect.color1}, ${effect.color2}, ${effect.color1})`, filter: 'blur(5px)', animation: 'spin-slow 2s linear infinite', zIndex: 0 }}></div>);
        case 'oceanic':
          return wrapInnerEffect(effect, <div className="absolute inset-[-4px] rounded-full" style={{ background: `conic-gradient(transparent, ${effect.color1}, ${effect.color2}, transparent 50%)`, animation: 'spin-slow 2s linear infinite', zIndex: 0 }}></div>);
        case 'serpixel-agitato':
          return wrapInnerEffect(effect, (
            <>
              <div className="absolute inset-[-4px] rounded-full" style={{ background: `conic-gradient(transparent, ${effect.color1}, transparent, ${effect.color2}, transparent)`, animation: 'spin-slow 2s linear infinite', zIndex: 0 }}></div>
              <div className="serpixel-scanline" style={{ background: effect.color1, boxShadow: `0 0 15px ${effect.color1}` }}></div>
            </>
          ));
        case 'ghiacciolo':
          return wrapInnerEffect(effect, <div className="absolute inset-[-4px] rounded-full" style={{ borderTop: `3px solid ${effect.color1}`, borderLeft: `3px solid ${effect.color2}`, animation: 'spin-slow 6s linear infinite', opacity: 0.7 }}></div>);
        default:
          return null;
      }
    });
  };

  const renderOuterEffects = (effects: BaseEffectConfig[]) => {
    return effects.map(effect => {
      switch(effect.type) {
        case 'supernova':
          return wrapOuterEffect(effect, (
            <>
              <div className="supernova-star s1" style={{ background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }}>{getIconContent(effect)}</div>
              <div className="supernova-star s2" style={{ background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }}>{getIconContent(effect)}</div>
              <div className="supernova-star s3" style={{ background: effect.color2, backgroundImage: getBgImage(effect, ''), backgroundSize: 'contain' }}>{getIconContent(effect)}</div>
            </>
          ));
        case 'esquelito':
          return wrapOuterEffect(effect, (
            <>
              <div className="esquelito-skull sk1" style={{ backgroundImage: getBgImage(effect, '/esqueleto1.png') }}>{getIconContent(effect)}</div>
              <div className="esquelito-skull sk2" style={{ backgroundImage: getBgImage(effect, '/esqueleto2.png') }}>{getIconContent(effect)}</div>
              <div className="esquelito-skull sk3" style={{ backgroundImage: getBgImage(effect, '/esquelito3.png') }}>{getIconContent(effect)}</div>
            </>
          ));
        case 'oceanic':
          return wrapOuterEffect(effect, (
            <>
              <div className="water-drop-wrapper w1"><div className="water-drop-inner">{getIconContent(effect, '💧')}</div></div>
              <div className="water-drop-wrapper w2"><div className="water-drop-inner">{getIconContent(effect, '💧')}</div></div>
              <div className="water-drop-wrapper w3"><div className="water-drop-inner">{getIconContent(effect, '💧')}</div></div>
              <div className="oceanic-bubble b1" style={{ background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }}></div>
              <div className="oceanic-bubble b2" style={{ background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }}></div>
              <div className="oceanic-bubble b3" style={{ background: effect.color1, boxShadow: `0 0 4px ${effect.color2}` }}></div>
            </>
          ));
        case 'saturn-fire':
          return wrapOuterEffect(effect, (
            <>
              <div className="saturn-wrapper back"><div className="saturn-ring-inner" style={{ borderTopColor: effect.color1, borderBottomColor: effect.color2, borderLeftColor: effect.color1, borderRightColor: effect.color2 }}></div></div>
              <div className="saturn-wrapper front"><div className="saturn-ring-inner" style={{ borderTopColor: effect.color1, borderBottomColor: effect.color2, borderLeftColor: effect.color1, borderRightColor: effect.color2 }}></div></div>
              <div className="fire-particle f1" style={{ background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }}>{getIconContent(effect)}</div>
              <div className="fire-particle f2" style={{ background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }}>{getIconContent(effect)}</div>
              <div className="fire-particle f3" style={{ background: `radial-gradient(circle, ${effect.color1} 0%, ${effect.color2} 60%, transparent 100%)` }}>{getIconContent(effect)}</div>
            </>
          ));
        case 'gustavo-armando':
          return wrapOuterEffect(effect, (
            <>
              <div className="gustavo-sprite gustavo-trail t2" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div>
              <div className="gustavo-sprite gustavo-trail t1" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div>
              <div className="gustavo-sprite gustavo-main" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div>
              <div className="gustavo-orbit-wrapper o1"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
              <div className="gustavo-orbit-wrapper o2"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
              <div className="gustavo-orbit-wrapper o3"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
              <div className="gustavo-orbit-wrapper o4"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
              <div className="gustavo-orbit-wrapper o5"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
              <div className="gustavo-orbit-wrapper o6"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
              <div className="gustavo-orbit-wrapper o7"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
              <div className="gustavo-orbit-wrapper o8"><div className="gustavo-orbit-inner" style={{ backgroundImage: getBgImage(effect, '/adrotto.png') }}>{getIconContent(effect)}</div></div>
            </>
          ));
        case 'serpixel-agitato':
          return wrapOuterEffect(effect, (
            <>
              <div className="serpixel-diamond-wrapper dw1"><div className="serpixel-diamond" style={{ background: effect.color2 }}></div></div>
              <div className="serpixel-diamond-wrapper dw2"><div className="serpixel-diamond" style={{ background: effect.color2 }}></div></div>
              <div className="serpixel-diamond-wrapper dw3"><div className="serpixel-diamond" style={{ background: effect.color2 }}></div></div>
              <div className="serpixel-diamond-wrapper dw4"><div className="serpixel-diamond" style={{ background: effect.color2 }}></div></div>
              <div className="serpixel-venom v1" style={{ background: effect.color1 }}></div>
              <div className="serpixel-venom v2" style={{ background: effect.color1 }}></div>
              <div className="serpixel-venom v3" style={{ background: effect.color1 }}></div>
              <div className="serpixel-venom v4" style={{ background: effect.color1 }}></div>
              <div className="serpixel-venom v5" style={{ background: effect.color1 }}></div>
              <div className="serpixel-snake s1" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
              <div className="serpixel-snake s2" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
              <div className="serpixel-snake s3" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
              <div className="serpixel-snake s4" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
              <div className="serpixel-snake s5" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
              <div className="serpixel-snake s6" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
              <div className="serpixel-snake s7" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
              <div className="serpixel-snake s8" style={{ backgroundImage: getBgImage(effect, '/serpe1.png') }}>{getIconContent(effect)}</div>
            </>
          ));
        case 'tempesta':
          return wrapOuterEffect(effect, (
            <>
              <div className="storm-drop d1" style={{ background: effect.color1 }}>{getIconContent(effect)}</div>
              <div className="storm-drop d2" style={{ background: effect.color1 }}>{getIconContent(effect)}</div>
              <div className="storm-drop d3" style={{ background: effect.color1 }}>{getIconContent(effect)}</div>
            </>
          ));
        case 'ghiacciolo':
          return wrapOuterEffect(effect, (
            <>
              <div className="ice-flake f1" style={{ color: effect.color1 }}>{getIconContent(effect, '❄️')}</div>
              <div className="ice-flake f2" style={{ color: effect.color1 }}>{getIconContent(effect, '❄️')}</div>
              <div className="ice-flake f3" style={{ color: effect.color1 }}>{getIconContent(effect, '❄️')}</div>
            </>
          ));
        default:
          return null;
      }
    });
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
        x: 50, y: 50, rotation: 0
      });
    }

    return (
      <div className={`relative rounded-full flex items-center justify-center dec-wrapper ${speakingClass} ${className} ${clipEffects ? 'overflow-hidden' : ''}`}>
        
        {/* Inner Effects (z-0) */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
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

        {/* Outer Effects (z-20) - Rimosso il wrapper z-20 per permettere il vero 3D */}
        {renderOuterEffects(effectsToRender)}

        {/* Elements (z-index animated 5 or 25) */}
        {customDec.config?.elements?.map(el => {
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
              className={`absolute flex items-center justify-center z-20`}
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