"use client";

import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor = ({ activeCursor }: { activeCursor: string | null }) => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState(false);
  const [trail, setTrail] = useState<{x: number, y: number}[]>([]);
  const [time, setTime] = useState(0);
  const [angle, setAngle] = useState(0);
  
  const requestRef = useRef<number>();
  const mouseRef = useRef({ x: -100, y: -100 });
  const trailRef = useRef<{x: number, y: number}[]>(Array(30).fill({x: -100, y: -100}));

  useEffect(() => {
    if (!activeCursor) return;

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    const update = () => {
      setPos({ x: mouseRef.current.x, y: mouseRef.current.y });
      setTime(Date.now() * 0.001); // Tempo in secondi per le animazioni fluide

      // Velocità di interpolazione dinamica in base al cursore
      const isDragon = activeCursor === 'cursor-dragon';
      const headSpeed = isDragon ? 0.3 : 0.5;
      const tailSpeed = isDragon ? 0.15 : 0.4; // Coda più lenta per il dragone

      const newTrail = [...trailRef.current];
      
      // Calcolo angolo per la spada
      if (activeCursor === 'cursor-sword') {
        const dx = mouseRef.current.x - newTrail[2].x;
        const dy = mouseRef.current.y - newTrail[2].y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          setAngle(Math.atan2(dy, dx) * (180 / Math.PI) + 45);
        }
      }

      newTrail[0] = {
        x: newTrail[0].x + (mouseRef.current.x - newTrail[0].x) * headSpeed,
        y: newTrail[0].y + (mouseRef.current.y - newTrail[0].y) * headSpeed
      };
      
      for (let i = 1; i < newTrail.length; i++) {
        newTrail[i] = {
          x: newTrail[i].x + (newTrail[i-1].x - newTrail[i].x) * tailSpeed,
          y: newTrail[i].y + (newTrail[i-1].y - newTrail[i].y) * tailSpeed
        };
      }
      
      trailRef.current = newTrail;
      setTrail(newTrail);

      requestRef.current = requestAnimationFrame(update);
    };
    
    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [activeCursor]);

  if (!activeCursor) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden">
      
      {/* 1. CURSORE NEON */}
      {activeCursor === 'cursor-neon' && (
        <>
          {/* Scia fantasma */}
          {trail.filter((_, i) => i % 3 === 0).slice(0, 4).map((pt, i) => (
            <div 
              key={i}
              className="absolute"
              style={{ 
                left: pt.x, top: pt.y, 
                transform: `translate(-2px, -2px) scale(${1 - i*0.2})`,
                opacity: 0.4 - i*0.1,
                zIndex: 999990 - i
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
              </svg>
            </div>
          ))}
          <div 
            className="absolute"
            style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.8)' : 'scale(1)'}` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#111214" stroke="#39ff14" strokeWidth="2" className="drop-shadow-[0_0_8px_#39ff14] animate-pulse">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>
          </div>
        </>
      )}

      {/* 2. CURSORE FIAMMA */}
      {activeCursor === 'cursor-flame' && (
        <>
          {/* Fumo che sale e si espande */}
          {trail.filter((_, i) => i % 2 === 0).slice(0, 8).map((pt, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-orange-500 mix-blend-screen"
              style={{
                left: pt.x + Math.sin(time * 5 + i) * 5,
                top: pt.y - (i * 6), // Il fumo sale
                width: `${8 + i * 2}px`, // Si espande
                height: `${8 + i * 2}px`,
                transform: 'translate(-50%, -50%)',
                opacity: 0.6 - (i / 8),
                filter: `blur(${i}px)`,
                zIndex: 999990 - i
              }}
            />
          ))}
          <div 
            className="absolute"
            style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.8)' : 'scale(1)'}` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff4500" stroke="#ff8c00" strokeWidth="2" className="drop-shadow-[0_0_8px_#ff4500]">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>
          </div>
        </>
      )}

      {/* 3. CURSORE MAGICO */}
      {activeCursor === 'cursor-magic' && (
        <>
          {/* Scintille rotanti */}
          {trail.filter((_, i) => i % 2 === 0).slice(0, 10).map((pt, i) => (
            <div
              key={i}
              className="absolute text-purple-400"
              style={{
                left: pt.x + Math.sin(time * 3 + i) * 20,
                top: pt.y + Math.cos(time * 3 + i) * 20,
                transform: `translate(-50%, -50%) rotate(${time * 100 + i * 45}deg) scale(${1 - i/10})`,
                opacity: 1 - (i / 10),
                fontSize: '18px',
                zIndex: 999990 - i
              }}
            >✨</div>
          ))}
          <div 
            className="absolute"
            style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.8)' : 'scale(1)'}` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#a855f7" stroke="#d8b4fe" strokeWidth="2" className="drop-shadow-[0_0_8px_#a855f7]">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>
          </div>
        </>
      )}

      {/* 4. CURSORE SPADA */}
      {activeCursor === 'cursor-sword' && (
        <>
          {/* Scia del fendente */}
          {trail.slice(0, 8).map((pt, i) => (
            <div
              key={i}
              className="absolute bg-blue-400/40 rounded-full blur-[2px]"
              style={{
                left: pt.x,
                top: pt.y,
                width: `${12 - i}px`,
                height: `${12 - i}px`,
                transform: 'translate(-50%, -50%)',
                opacity: 1 - (i / 8),
                zIndex: 999990 - i
              }}
            />
          ))}
          <div 
            className="absolute transition-transform duration-100 ease-out"
            style={{ 
              left: pos.x, 
              top: pos.y, 
              transform: `translate(-2px, -2px) rotate(${angle}deg) ${isClicking ? 'scale(0.8)' : 'scale(1)'}`,
              transformOrigin: 'top left'
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" className="drop-shadow-[0_0_5px_#cbd5e1]">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>
          </div>
        </>
      )}

      {/* 5. DRAGONE CINESE */}
      {activeCursor === 'cursor-dragon' && (
        <>
          {/* Coda del drago (25 segmenti) */}
          {trail.slice(0, 25).map((pt, i) => {
            // Movimento serpeggiante continuo anche da fermo
            const wiggleX = Math.sin(time * 4 - i * 0.4) * (i * 1.5);
            const wiggleY = Math.cos(time * 3 - i * 0.4) * (i * 1.5);
            
            // Dimensione decrescente
            const size = Math.max(4, 28 - i * 0.8);
            const isTip = i === 24;
            
            return (
              <div
                key={i}
                className={`absolute rounded-full shadow-[0_0_8px_#eab308] flex items-center justify-center ${isTip ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}
                style={{
                  left: pt.x + wiggleX,
                  top: pt.y + wiggleY,
                  width: `${size}px`,
                  height: `${size}px`,
                  transform: 'translate(-50%, -50%)',
                  border: isTip ? 'none' : '2px solid #facc15',
                  opacity: 1 - (i / 35),
                  zIndex: 999990 - i
                }}
              >
                {/* Scaglie sul dorso */}
                {!isTip && i % 3 === 0 && (
                  <div className="absolute -top-1 w-2 h-2 bg-red-500 rotate-45 rounded-sm"></div>
                )}
              </div>
            );
          })}
          
          {/* Testa del drago */}
          <div
            className="absolute text-5xl drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]"
            style={{
              left: pos.x,
              top: pos.y,
              transform: `translate(-30%, -30%) ${isClicking ? 'scale(0.85)' : 'scale(1)'}`,
              zIndex: 999999
            }}
          >
            🐲
          </div>
        </>
      )}

    </div>
  );
};