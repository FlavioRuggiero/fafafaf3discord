import React from 'react';

interface AvatarProps {
  src: string;
  alt?: string;
  className?: string;
  decoration?: string | null;
  isSpeaking?: boolean;
  clipEffects?: boolean;
}

export const Avatar = ({ src, alt, className = "", decoration, isSpeaking, clipEffects }: AvatarProps) => {
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
      </div>
    </div>
  );
};