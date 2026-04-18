"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/types/discord';
import { Music, Play, Square, Menu, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface MySingingCanaryProps {
  currentUser: User;
  onToggleSidebar?: () => void;
}

const MONSTERS = [
  { id: 0, name: "Roccia", emoji: "🪨", price: 10, role: "Cassa" },
  { id: 1, name: "Cactus", emoji: "🌵", price: 15, role: "Rullante" },
  { id: 2, name: "Fungo", emoji: "🍄", price: 20, role: "Hi-Hat" },
  { id: 3, name: "Bruco", emoji: "🐛", price: 30, role: "Basso" },
  { id: 4, name: "Fantasmino", emoji: "👻", price: 40, role: "Accordi" },
  { id: 5, name: "Alieno", emoji: "👽", price: 50, role: "Arpeggio" },
  { id: 6, name: "Robot", emoji: "🤖", price: 60, role: "Melodia" },
  { id: 7, name: "Zucca", emoji: "🎃", price: 70, role: "Tappeto" },
];

// Sequenze a 16 step
const SEQS = [
  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // 0: Kick
  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // 1: Snare
  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // 2: Hat
  [65.41, 0, 65.41, 0, 77.78, 0, 87.31, 0, 65.41, 0, 65.41, 0, 98.00, 0, 77.78, 0], // 3: Bass
  [[261.63, 311.13, 392.00], 0, 0, 0, 0, 0, 0, 0, [261.63, 311.13, 392.00], 0, 0, 0, 0, 0, 0, 0], // 4: Chords
  [261.63, 311.13, 392.00, 523.25, 392.00, 311.13, 261.63, 311.13, 261.63, 311.13, 392.00, 523.25, 622.25, 523.25, 392.00, 311.13], // 5: Arp
  [523.25, 0, 0, 622.25, 0, 0, 523.25, 0, 698.46, 0, 0, 622.25, 0, 0, 523.25, 0], // 6: Lead
  [130.81, 0, 0, 0, 0, 0, 0, 0, 155.56, 0, 0, 0, 0, 0, 0, 0] // 7: Pad
];

export const MySingingCanary = ({ currentUser, onToggleSidebar }: MySingingCanaryProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [placedMonsters, setPlacedMonsters] = useState<{uid: string, typeId: number, x: number, y: number}[]>(currentUser.singing_island || []);
  const [mutedTracks, setMutedTracks] = useState<boolean[]>(Array(8).fill(true));
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const placedMonstersRef = useRef(placedMonsters);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIDRef = useRef<NodeJS.Timeout | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentNoteRef = useRef(0);

  useEffect(() => {
    placedMonstersRef.current = placedMonsters;
    
    // Aggiorna le tracce mute in base ai mostri presenti sull'isola
    const newMuted = Array(8).fill(true);
    placedMonsters.forEach(m => {
      newMuted[m.typeId] = false;
    });
    setMutedTracks(newMuted);
  }, [placedMonsters]);

  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const saveIslandToDb = async (newIsland: any[]) => {
    const { error } = await supabase.from('profiles').update({ singing_island: newIsland }).eq('id', currentUser.id);
    if (error) showError("Errore nel salvataggio dell'isola.");
  };

  const buyMonster = async (monsterDef: any) => {
    if ((currentUser.digitalcardus || 0) < monsterDef.price) {
      showError("Non hai abbastanza DigitalCardus!");
      return;
    }
    
    const newMonster = {
      uid: Date.now().toString() + Math.random().toString(36).substring(7),
      typeId: monsterDef.id,
      x: 40 + Math.random() * 20, // Centro casuale
      y: 40 + Math.random() * 20
    };
    
    const newIsland = [...placedMonsters, newMonster];
    setPlacedMonsters(newIsland);
    
    const newDc = (currentUser.digitalcardus || 0) - monsterDef.price;
    
    const { error } = await supabase.from('profiles').update({ 
      singing_island: newIsland,
      digitalcardus: newDc
    }).eq('id', currentUser.id);
    
    if (error) {
      showError("Errore durante l'acquisto.");
      setPlacedMonsters(placedMonsters); // revert
    } else {
      showSuccess(`${monsterDef.name} acquistato!`);
    }
  };

  const handleDoubleClick = async (uid: string, typeId: number) => {
    const monsterDef = MONSTERS.find(m => m.id === typeId);
    if (!monsterDef) return;
    
    const refund = Math.floor(monsterDef.price / 2);
    const newIsland = placedMonsters.filter(m => m.uid !== uid);
    setPlacedMonsters(newIsland);
    
    const newDc = (currentUser.digitalcardus || 0) + refund;
    
    const { error } = await supabase.from('profiles').update({ 
      singing_island: newIsland,
      digitalcardus: newDc
    }).eq('id', currentUser.id);
    
    if (error) {
      showError("Errore durante la vendita.");
      setPlacedMonsters(placedMonsters); // revert
    } else {
      showSuccess(`Venduto per ${refund} DC!`);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, uid: string) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(uid);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !islandRef.current) return;
    const rect = islandRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));
    
    setPlacedMonsters(prev => prev.map(m => m.uid === draggingId ? { ...m, x, y } : m));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDraggingId(null);
      saveIslandToDb(placedMonstersRef.current);
    }
  };

  const triggerAnimation = (typeId: number) => {
    const els = document.querySelectorAll(`.monster-type-${typeId}`);
    els.forEach(el => {
      el.classList.remove('animate-monster-bounce');
      void (el as HTMLElement).offsetWidth; // trigger reflow
      el.classList.add('animate-monster-bounce');
    });
  };

  // --- SYNTH FUNCTIONS ---
  const playKick = (ctx: AudioContext, time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.start(time);
    osc.stop(time + 0.5);
  };

  const playSnare = (ctx: AudioContext, time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(250, time);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.start(time);
    osc.stop(time + 0.2);
    
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(time);
  };

  const playHat = (ctx: AudioContext, time: number) => {
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(time);
  };

  const playSynth = (ctx: AudioContext, time: number, freq: number, type: OscillatorType, duration: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.02);
    gain.gain.setValueAtTime(vol, time + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    osc.start(time);
    osc.stop(time + duration);
  };

  const playChord = (ctx: AudioContext, time: number, freqs: number[], type: OscillatorType, duration: number, vol: number) => {
    freqs.forEach(freq => playSynth(ctx, time, freq, type, duration, vol / freqs.length));
  };

  // --- SCHEDULER ---
  const scheduleNote = (beatNumber: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const delay = Math.max(0, (time - ctx.currentTime) * 1000);

    if (!mutedTracks[0] && SEQS[0][beatNumber]) {
      playKick(ctx, time);
      setTimeout(() => triggerAnimation(0), delay);
    }
    if (!mutedTracks[1] && SEQS[1][beatNumber]) {
      playSnare(ctx, time);
      setTimeout(() => triggerAnimation(1), delay);
    }
    if (!mutedTracks[2] && SEQS[2][beatNumber]) {
      playHat(ctx, time);
      setTimeout(() => triggerAnimation(2), delay);
    }
    if (!mutedTracks[3] && SEQS[3][beatNumber]) {
      playSynth(ctx, time, SEQS[3][beatNumber] as number, 'sawtooth', 0.15, 0.4);
      setTimeout(() => triggerAnimation(3), delay);
    }
    if (!mutedTracks[4] && SEQS[4][beatNumber]) {
      playChord(ctx, time, SEQS[4][beatNumber] as number[], 'sine', 0.5, 0.3);
      setTimeout(() => triggerAnimation(4), delay);
    }
    if (!mutedTracks[5] && SEQS[5][beatNumber]) {
      playSynth(ctx, time, SEQS[5][beatNumber] as number, 'square', 0.1, 0.1);
      setTimeout(() => triggerAnimation(5), delay);
    }
    if (!mutedTracks[6] && SEQS[6][beatNumber]) {
      playSynth(ctx, time, SEQS[6][beatNumber] as number, 'triangle', 0.3, 0.3);
      setTimeout(() => triggerAnimation(6), delay);
    }
    if (!mutedTracks[7] && SEQS[7][beatNumber]) {
      playSynth(ctx, time, SEQS[7][beatNumber] as number, 'sine', 1.0, 0.2);
      setTimeout(() => triggerAnimation(7), delay);
    }
  };

  const nextNote = () => {
    const secondsPerBeat = 60.0 / 110; // 110 BPM
    nextNoteTimeRef.current += 0.25 * secondsPerBeat; // 16th note
    currentNoteRef.current++;
    if (currentNoteRef.current === 16) {
      currentNoteRef.current = 0;
    }
  };

  const scheduler = () => {
    if (!audioCtxRef.current) return;
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(currentNoteRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = setTimeout(scheduler, 25.0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    } else {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsPlaying(true);
      nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
      currentNoteRef.current = 0;
      scheduler();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#313338] relative h-full">
      <style>{`
        @keyframes monster-bounce {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.2) translateY(-15px); }
        }
        .animate-monster-bounce {
          animation: monster-bounce 0.2s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-between px-4 flex-shrink-0 bg-[#313338] z-10">
        <div className="flex items-center min-w-0 flex-1">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors flex-shrink-0">
              <Menu size={24} />
            </button>
          )}
          <Music size={24} className="text-[#a855f7] mr-2 flex-shrink-0" />
          <h2 className="font-semibold text-white truncate min-w-0">MySingingCanary</h2>
        </div>
        <div className="flex items-center bg-[#2b2d31] px-3 py-1 rounded-full">
          <img src="/digitalcardus.png" alt="Digitalcardus" className="w-4 h-4 mr-2 object-contain" />
          <span className="text-white font-bold">{currentUser.digitalcardus}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative overflow-hidden bg-[#0ea5e9] flex flex-col">
        {/* Water effect */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, white 0%, transparent 60%)', backgroundSize: '100px 100px' }}></div>
        
        {/* Island */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
          <div 
            ref={islandRef}
            className="relative w-full max-w-3xl aspect-[4/3] sm:aspect-[2/1] rounded-[50%] bg-gradient-to-b from-[#4ade80] to-[#166534] border-[12px] border-[#14532d] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_-20px_50px_rgba(0,0,0,0.5)]"
          >
            {placedMonsters.map(m => (
              <div
                key={m.uid}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing monster-type-${m.typeId} select-none hover:scale-110 transition-transform`}
                style={{ left: `${m.x}%`, top: `${m.y}%`, zIndex: Math.round(m.y) }}
                onPointerDown={(e) => handlePointerDown(e, m.uid)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={() => handleDoubleClick(m.uid, m.typeId)}
                title="Trascina per spostare, Doppio clic per vendere"
              >
                <div className="text-4xl sm:text-6xl filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] pointer-events-none">
                  {MONSTERS.find(def => def.id === m.typeId)?.emoji}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Play Button Floating */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-lg transition-all shadow-xl ${
              isPlaying 
                ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' 
                : 'bg-[#23a559] hover:bg-[#1a7c43] text-white hover:scale-105'
            }`}
          >
            {isPlaying ? <Square fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
            {isPlaying ? 'Ferma' : 'Suona!'}
          </button>
          <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Info size={14} /> Trascina per spostare, Doppio clic per vendere
          </div>
        </div>

        {/* Shop Panel */}
        <div className="bg-[#1e1f22]/90 backdrop-blur-md border-t border-[#1f2023] p-4 z-20 flex-shrink-0">
          <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Negozio Mostri</h3>
          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
            {MONSTERS.map(m => (
              <button
                key={m.id}
                onClick={() => buyMonster(m)}
                className="flex flex-col items-center bg-[#2b2d31] hover:bg-[#35373c] border border-[#3f4147] rounded-xl p-3 min-w-[100px] transition-colors group"
              >
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{m.emoji}</span>
                <span className="text-white font-bold text-sm">{m.name}</span>
                <div className="flex items-center mt-1 bg-[#1e1f22] px-2 py-0.5 rounded-full">
                  <span className="text-xs font-bold text-yellow-500">{m.price}</span>
                  <img src="/digitalcardus.png" alt="DC" className="w-3 h-3 ml-1 object-contain" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};