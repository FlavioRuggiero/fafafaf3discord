import React from 'react';

interface AvatarProps {
  src: string;
  alt?: string;
  className?: string;
  decoration?: string | null;
}

export const Avatar = ({ src, alt, className = "", decoration }: AvatarProps) => {
  if (!decoration) {
    return <img src={src} alt={alt} className={`rounded-full object-cover ${className}`} />;
  }

  return (
    <div className={`relative rounded-full flex items-center justify-center dec-wrapper dec-${decoration} ${className}`}>
      <img src={src} alt={alt} className="w-full h-full rounded-full object-cover relative z-10" />
      
      {decoration === 'dc-emit' && (
        <>
          <div className="dc-particle p1"></div>
          <div className="dc-particle p2"></div>
          <div className="dc-particle p3"></div>
        </>
      )}
      
      {decoration === 'matrix' && (
        <>
          <div className="matrix-char m1">1</div>
          <div className="matrix-char m2">0</div>
          <div className="matrix-char m3">1</div>
          <div className="matrix-char m4">0</div>
        </>
      )}
      
      {decoration === 'explosive' && (
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
  );
};