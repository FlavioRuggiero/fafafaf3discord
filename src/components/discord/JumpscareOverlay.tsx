"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const JumpscareOverlay = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Rimani in ascolto sul canale broadcast di Supabase
    const channel = supabase.channel('system_jumpscares')
      .on('broadcast', { event: 'trigger' }, (payload) => {
        const target = payload.payload?.target;
        // Attiva se il target è 'all' oppure corrisponde all'ID dell'utente corrente
        if (target === 'all' || target === user.id) {
          triggerJumpscare();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const triggerJumpscare = () => {
    // Riproduci il suono
    const audio = new Audio('/jumpscare.mp3');
    audio.volume = 1.0;
    audio.play().catch(e => console.error("Audio play failed:", e));
    
    // Mostra l'immagine
    setIsActive(true);
    
    // Nascondi dopo 1.5 secondi (durata dell'animazione)
    setTimeout(() => {
      setIsActive(false);
    }, 1500);
  };

  if (!isActive) return null;

  return (
    <>
      <style>{`
        @keyframes jumpscare-zoom {
          0% { transform: scale(0.1); opacity: 0; }
          10% { transform: scale(1.2); opacity: 1; }
          80% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        .animate-jumpscare-zoom {
          animation: jumpscare-zoom 1.5s cubic-bezier(0.1, 0.7, 0.1, 1) forwards;
        }
      `}</style>
      <div className="fixed inset-0 z-[999999] pointer-events-none flex items-center justify-center overflow-hidden">
        <img 
          src="/jumpscare.png" 
          alt="Jumpscare" 
          className="w-full h-full object-cover animate-jumpscare-zoom"
        />
      </div>
    </>
  );
};