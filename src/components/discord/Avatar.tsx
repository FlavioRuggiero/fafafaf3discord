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
    </div>
  );
};