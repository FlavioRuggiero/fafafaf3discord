import React from 'react';
import { useShop } from '@/contexts/ShopContext';

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
  
  // Se isSpeaking è un booleano, significa che siamo in un contesto vocale.
  const isVoiceContext = typeof isSpeaking === 'boolean';
  
  // Fix: a volte il database o lo state passano la stringa "null" invece del valore null
  const actualDecoration = decoration === "null" ? null : decoration;
  
  // Mostriamo la decorazione SOLO se non siamo in vocale, OPPURE se siamo in vocale e stiamo parlando.
  const shouldShowDecoration = actualDecoration && (!isVoiceContext || isSpeaking);
  const activeDecoration = shouldShowDecoration ? actualDecoration : null;

  // Il cerchio giallo si mostra se stiamo parlando E NON abbiamo una decorazione attiva
  const showYellowRing = isSpeaking && !activeDecoration;
  const speakingClass = showYellowRing ? "ring-2 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] z-20" : (isSpeaking ? "z-20" : "");

  if (!activeDecoration) {
    return <img src={src} alt={alt} className={`rounded-full object-cover ${speakingClass} ${className}`} />;
  }

  // Helper per l'anteprima
  const getPositionClass = (pos: string) => {
    switch(pos) {
      case 'top-left': return 'top-0 left-0 -translate-x-1/4 -translate-y-1/4';
      case 'top-right': return 'top-0 right-0 translate-x-1/4 -translate-y-1/4';
      case 'bottom-left': return 'bottom-0 left-0 -translate-x-1/4 translate-y-1/4';
      case 'bottom-right': return 'bottom-0 right-0 translate-x-1/4 translate-y-1/4';
      case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default: return '';
    }
  };

  const getAnimation = (anim: string, delay: number) => {
    const delayStr = delay > 0 ? `${delay}s` : '0s';
    switch(anim) {
      case 'float': return `custom-float 3s ease-in-out infinite ${delayStr}`;
      case 'pulse': return `custom-pulse 2s infinite ${delayStr}`;
      case 'spin': return `spin-slow 4s linear infinite ${delayStr}`;
      case 'shake': return `custom-shake 0.5s infinite ${delayStr}`;
      default: return 'none';
    }
  };

  // Controllo se è una decorazione custom
  const customDec = customDecorations.find(d => d.id === activeDecoration);
  if (customDec) {
    return (
      <div className={`relative rounded-full flex items-center justify-center dec-wrapper ${speakingClass} ${className}`}>
        <div 
          className="relative rounded-full flex items-center justify-center w-full h-full z-10"
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
          
          {customDec.config?.baseEffect === 'scanline' && <div className="custom-scanline"></div>}
          
          <img src={src} alt={alt} className="w-full h-full rounded-full object-cover relative z-10" />
        </div>

        {/* Elementi Fluttuanti */}
        <div className={`absolute inset-0 pointer-events-none z-20 ${clipEffects ? 'overflow-hidden rounded-full' : ''}`}>
          {customDec.config?.elements?.map(el => {
            if (el.position === 'orbit' && !clipEffects) {
              return (
                <div key={el.id} className="custom-orbit-container" style={{ animation: `custom-orbit-wrapper 4s linear infinite ${el.delay > 0 ? el.delay+'s' : '0s'}` }}>
                  <div className="custom-orbit-element" style={{ animation: `custom-orbit-inner 4s linear infinite ${el.delay > 0 ? el.delay+'s' : '0s'}`, width: `${el.size}cqw`, height: `${el.size}cqw` }}>
                    {el.type === 'emoji' ? <span style={{fontSize: `${el.size}cqw`}}>{el.content}</span> : <img src={el.content} className="w-full h-full object-contain" />}
                  </div>
                </div>
              );
            }
            if (el.position === 'orbit' && clipEffects) return null; // Nascondi orbita se clipEffects è attivo
            
            return (
              <div 
                key={el.id} 
                className={`absolute ${getPositionClass(el.position)} flex items-center justify-center`}
                style={{ 
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
    );
  }

  return (
    <div className={`relative rounded-full flex items-center justify-center dec-wrapper dec-${activeDecoration} ${speakingClass} ${className}`}>
      
      {/* Particelle globali (possono andare dietro o davanti all'immagine z-10) */}
      {activeDecoration === 'oceanic' && !clipEffects && (
        <>
          <div className="water-drop-wrapper w1"><div className="water-drop-inner">💧</div></div>
          <div className="water-drop-wrapper w2"><div className="water-drop-inner">💧</div></div>
          <div className="water-drop-wrapper w3"><div className="water-drop-inner">💧</div></div>
        </>
      )}

      {activeDecoration === 'saturn-fire' && !clipEffects && (
        <>
          <div className="saturn-wrapper back"><div className="saturn-ring-inner"></div></div>
          <div className="saturn-wrapper front"><div className="saturn-ring-inner"></div></div>
        </>
      )}

      {activeDecoration === 'gustavo-armando' && !clipEffects && (
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

      {activeDecoration === 'serpixel-agitato' && !clipEffects && (
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

      <img src={src} alt={alt} className="w-full h-full rounded-full object-cover relative z-10" />
      
      {/* Se clipEffects è true (es. nel UserPanel in basso), intrappoliamo le particelle nel cerchio per non sballare il layout */}
      <div className={`absolute inset-0 pointer-events-none z-20 ${clipEffects ? 'overflow-hidden rounded-full' : ''}`}>
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

        {activeDecoration === 'oceanic' && (
          <>
            <div className="oceanic-bubble b1"></div>
            <div className="oceanic-bubble b2"></div>
            <div className="oceanic-bubble b3"></div>
          </>
        )}

        {activeDecoration === 'oceanic' && clipEffects && (
          <>
            <div className="water-drop-wrapper w1"><div className="water-drop-inner">💧</div></div>
            <div className="water-drop-wrapper w2"><div className="water-drop-inner">💧</div></div>
            <div className="water-drop-wrapper w3"><div className="water-drop-inner">💧</div></div>
          </>
        )}

        {activeDecoration === 'saturn-fire' && (
          <>
            <div className="fire-particle f1"></div>
            <div className="fire-particle f2"></div>
            <div className="fire-particle f3"></div>
          </>
        )}

        {activeDecoration === 'saturn-fire' && clipEffects && (
          <>
            <div className="saturn-wrapper back"><div className="saturn-ring-inner"></div></div>
            <div className="saturn-wrapper front"><div className="saturn-ring-inner"></div></div>
          </>
        )}

        {activeDecoration === 'gustavo-armando' && clipEffects && (
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

        {activeDecoration === 'serpixel-agitato' && clipEffects && (
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
      </div>
    </div>
  );
};