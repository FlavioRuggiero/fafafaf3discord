"use client";

import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor = ({ activeCursor }: { activeCursor: string | null }) => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState(false);
  const [trail, setTrail] = useState<{x: number, y: number}[]>([]);
  
  const requestRef = useRef<number>();
  const mouseRef = useRef({ x: -100, y: -100 });
  const trailRef = useRef<{x: number, y: number}[]>(Array(15).fill({x: -100, y: -100}));

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

      // Aggiorna la scia in modo fluido
      const newTrail = [...trailRef.current];
      newTrail[0] = {
        x: newTrail[0].x + (mouseRef.current.x - newTrail[0].x) * 0.5,
        y: newTrail[0].y + (mouseRef.current.y - newTrail[0].y) * 0.5
      };
      for (let i = 1; i < newTrail.length; i++) {
        newTrail[i] = {
          x: newTrail[i].x + (newTrail[i-1].x - newTrail[i].x) * 0.4,
          y: newTrail[i].y + (newTrail[i-1].y - newTrail[i].y) * 0.4
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
      
      {activeCursor === 'cursor-neon' && (
        <div 
          className="absolute"
          style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.9)' : 'scale(1)'}` }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#111214" stroke="#39ff14" strokeWidth="2" className="drop-shadow-[0_0_8px_#39ff14] animate-pulse">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </div>
      )}

      {activeCursor === 'cursor-flame' && (
        <>
          {trail.filter((_, i) => i % 3 === 0).map((pt, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-orange-500 blur-[1px]"
              style={{
                left: pt.x,
                top: pt.y + (i * 3), // Effetto fumo che sale
                transform: 'translate(-50%, -50%)',
                opacity: 1 - (i / (trail.length / 3)),
              }}
            />
          ))}
          <div 
            className="absolute"
            style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.9)' : 'scale(1)'}` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#ff4500" stroke="#ff8c00" strokeWidth="2" className="drop-shadow-[0_0_8px_#ff4500]">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>
          </div>
        </>
      )}

      {activeCursor === 'cursor-magic' && (
        <>
          {trail.filter((_, i) => i % 2 === 0).map((pt, i) => (
            <div
              key={i}
              className="absolute text-purple-400 text-xs"
              style={{
                left: pt.x + (Math.random() * 15 - 7.5),
                top: pt.y + (Math.random() * 15 - 7.5),
                transform: 'translate(-50%, -50%)',
                opacity: 1 - (i / (trail.length / 2)),
              }}
            >✨</div>
          ))}
          <div 
            className="absolute"
            style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px) ${isClicking ? 'scale(0.9)' : 'scale(1)'}` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#a855f7" stroke="#d8b4fe" strokeWidth="2" className="drop-shadow-[0_0_8px_#a855f7]">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>
          </div>
        </>
      )}

      {activeCursor === 'cursor-sword' && (
        <div 
          className="absolute transition-transform duration-75"
          style={{ left: pos.x, top: pos.y, transform: `translate(-2px, -2px) ${isClicking ? 'rotate(-15deg) scale(0.9)' : 'rotate(0deg) scale(1)'}` }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#cbd5e1" stroke="#475569" strokeWidth="2" className="drop-shadow-[0_0_5px_#cbd5e1]">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </div>
      )}

      {activeCursor === 'cursor-dragon' && (
        <>
          {/* Coda del drago */}
          {trail.map((pt, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-green-500 to-emerald-400 border border-yellow-400 shadow-[0_0_5px_#eab308]"
              style={{
                left: pt.x,
                top: pt.y,
                width: `${24 - i}px`,
                height: `${24 - i}px`,
                transform: 'translate(-50%, -50%)',
                opacity: 1 - (i / trail.length),
                zIndex: 999990 - i
              }}
            />
          ))}
          {/* Testa del drago */}
          <div
            className="absolute text-4xl drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]"
            style={{
              left: pos.x,
              top: pos.y,
              transform: `translate(-20%, -20%) ${isClicking ? 'scale(0.9)' : 'scale(1)'}`,
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