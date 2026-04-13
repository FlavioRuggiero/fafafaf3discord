import React from 'react';

interface AvatarProps {
  src: string;
  alt?: string;
  className?: string;
  decoration?: string | null;
  isSpeaking?: boolean;
}

export const Avatar = ({ src, alt, className = "", decoration, isSpeaking }: AvatarProps) => {
  // Se isSpeaking è un booleano, significa che siamo in un contesto vocale.
  // Mostriamo la decorazione SOLO se non siamo in vocale, OPPURE se siamo in vocale e stiamo parlando.
  const isVoiceContext = typeof isSpeaking === 'boolean';
  const shouldShowDecoration = decoration && (!isVoiceContext || isSpeaking);
  const activeDecoration = shouldShowDecoration ? decoration : null;

  // Il cerchio giallo si mostra se stiamo parlando E NON abbiamo una decorazione attiva
  const showYellowRing = isSpeaking && !activeDecoration;
  const speakingClass = showYellowRing ? "ring-2 ring-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] z-20" : (isSpeaking ? "z-20" : "");

  if (!activeDecoration) {
    return <img src={src} alt={alt} className={`rounded-full object-cover ${speakingClass} ${className}`} />;
  }

  return (
    <div className={`relative rounded-full flex items-center justify-center dec-wrapper dec-${activeDecoration} ${speakingClass} ${className}`}>
      <img src={src} alt={alt} className="w-full h-full rounded-full object-cover relative z-10" />
      
      {/* 
        Questo contenitore invisibile è il trucco per evitare che le animazioni 
        delle particelle allarghino l'area di scorrimento (scroll) della pagina.
        Diamo spazio sufficiente (-60px) per farle uscire, ma nascondiamo l'overflow
        in modo che non interagiscano MAI con il layout dell'interfaccia.
      */}
      <div className="absolute pointer-events-none z-20 overflow-hidden" style={{ top: '-60px', left: '-60px', right: '-60px', bottom: '-60px' }}>
        <div className="absolute" style={{ top: '60px', left: '60px', right: '60px', bottom: '60px' }}>
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
              <div className="explode-emoji e4">🧨</div>
              <div className="explode-emoji e5">💥</div>
              <div className="explode-emoji e6">🔥</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};