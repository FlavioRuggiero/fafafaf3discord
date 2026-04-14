"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';

export const WelcomeMessageEditor = () => {
  const { user } = useAuth();
  const [welcomeText, setWelcomeText] = useState('è appena entrato nel server!');
  const [bgColor, setBgColor] = useState('#2b2d31');
  const [borderColor, setBorderColor] = useState('#1e1f22');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('welcome_text, welcome_bg_color, welcome_border_color')
        .eq('id', user.id)
        .single();
      
      if (data) {
        if (data.welcome_text) setWelcomeText(data.welcome_text);
        if (data.welcome_bg_color) setBgColor(data.welcome_bg_color);
        if (data.welcome_border_color) setBorderColor(data.welcome_border_color);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        welcome_text: welcomeText,
        welcome_bg_color: bgColor,
        welcome_border_color: borderColor
      })
      .eq('id', user.id);
    
    setIsSaving(false);
    if (error) {
      showError("Errore durante il salvataggio.");
    }
  };

  return (
    <div className="bg-[#2b2d31] p-5 rounded-lg border border-[#1e1f22] mt-6">
      <h3 className="text-lg font-bold text-white mb-4">Personalizza Messaggio di Benvenuto</h3>
      <p className="text-sm text-[#b5bac1] mb-6">Scegli come apparirà il tuo messaggio quando entri in un server.</p>
      
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Testo di benvenuto</label>
          <input 
            type="text" 
            value={welcomeText}
            onChange={(e) => setWelcomeText(e.target.value)}
            className="w-full bg-[#1e1f22] border border-transparent focus:border-brand rounded p-2.5 text-[#dbdee1] outline-none transition-colors"
            placeholder="es. è atterrato nel server!"
            maxLength={60}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Colore Sfondo</label>
            <div className="flex items-center gap-2 bg-[#1e1f22] rounded p-1.5 border border-transparent focus-within:border-brand transition-colors">
              <input 
                type="color" 
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
              />
              <input 
                type="text" 
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 bg-transparent border-none text-[#dbdee1] outline-none text-sm uppercase"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Colore Bordo</label>
            <div className="flex items-center gap-2 bg-[#1e1f22] rounded p-1.5 border border-transparent focus-within:border-brand transition-colors">
              <input 
                type="color" 
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
              />
              <input 
                type="text" 
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="flex-1 bg-transparent border-none text-[#dbdee1] outline-none text-sm uppercase"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Anteprima</label>
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm" 
            style={{ backgroundColor: bgColor, borderColor: borderColor }}
          >
            <span className="text-xl">👋</span>
            <span className="flex items-center">
              <span className="font-bold text-[#dbdee1] mr-1.5">TuoNome</span>
              <span className="text-[#dbdee1]">{welcomeText || 'è appena entrato nel server!'}</span>
            </span>
            <span className="text-[10px] ml-2 opacity-50 text-[#949ba4]">Oggi alle 12:00</span>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1e1f22] flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand hover:bg-brand/80 text-white px-6 py-2 rounded font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
};