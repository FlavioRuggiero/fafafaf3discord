"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/types/discord';
import { Music, Play, Square, Volume2, VolumeX, Menu } from 'lucide-react';

interface MySingingCanaryProps {
  currentUser: User;
  onToggleSidebar?: () => void;
}

const MONSTERS = [
  { id: 0, name: "Roccia", emoji: "🪨", color: "bg-gray-600", role: "Cassa" },
  { id: 1, name: "Cactus", emoji: "🌵", color: "bg-green-600", role: "Rullante" },
  { id: 2, name: "Fungo", emoji: "🍄", color: "bg-red-500", role: "Hi-Hat" },
  { id: 3, name: "Bruco", emoji: "🐛", color: "bg-lime-500", role: "Basso" },
  { id: 4, name: "Fantasmino", emoji: "👻", color: "bg-purple-400", role: "Accordi" },
  { id: 5, name: "Alieno", emoji: "👽", color: "bg-emerald-400", role: "Arpeggio" },
  { id: 6, name: "Robot", emoji: "🤖", color: "bg-blue-500", role: "Melodia" },
  { id: 7, name: "Zucca", emoji: "🎃", color: "bg-orange-500", role: "Tappeto" },
];

// Sequenze a 16 step
const SEQS = [
  // 0: Kick
  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  // 1: Snare
  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  // 2: Hat
  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  // 3: Bass (C2=65.41, Eb2=77.78, F2=87.31, G2=98.00)
  [65.41, 0, 65.41, 0, 77.78, 0, 87.31, 0, 65.41, 0, 65.41, 0, 98.00, 0, 77.78, 0],
  // 4: Chords (Cmin = C4, Eb4, G4)
  [[261.63, 311.13, 392.00], 0, 0, 0, 0, 0, 0, 0, [261.63, 311.13, 392.00], 0, 0, 0, 0, 0, 0, 0],
  // 5: Arp
  [261.63, 311.13, 392.00, 523.25, 392.00, 311.13, 261.63, 311.13, 261.63, 311.13, 392.00, 523.25, 622.25, 523.25, 392.00, 311.13],
  // 6: Lead
  [523.25, 0, 0, 622.25, 0, 0, 523.25, 0, 698.46, 0, 0, 622.25, 0, 0, 523.25, 0],
  // 7: Pad
  [130.81, 0, 0, 0, 0, 0, 0, 0, 155.56, 0, 0, 0, 0, 0, 0, 0]
];

export const MySingingCanary = ({ currentUser, onToggleSidebar }: MySingingCanaryProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mutedTracks, setMutedTracks] = useState<boolean[]>(Array(8).fill(true));
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIDRef = useRef<NodeJS.Timeout | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentNoteRef = useRef(0);
  const monsterRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Inizializza la prima traccia come attiva
  useEffect(() => {
    setMutedTracks(prev => {
      const newMuted = [...prev];
      newMuted[0] = false;
      return newMuted;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const triggerAnimation = (index: number) => {
    const el = monsterRefs.current[index];
    if (el) {
      el.classList.remove('animate-monster');
      void el.offsetWidth; // trigger reflow
      el.classList.add('animate-monster');
    }
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

    // 0: Kick
    if (!mutedTracks[0] && SEQS[0][beatNumber]) {
      playKick(ctx, time);
      setTimeout(() => triggerAnimation(0), delay);
    }
    // 1: Snare
    if (!mutedTracks[1] && SEQS[1][beatNumber]) {
      playSnare(ctx, time);
      setTimeout(() => triggerAnimation(1), delay);
    }
    // 2: Hat
    if (!mutedTracks[2] && SEQS[2][beatNumber]) {
      playHat(ctx, time);
      setTimeout(() => triggerAnimation(2), delay);
    }
    // 3: Bass
    if (!mutedTracks[3] && SEQS[3][beatNumber]) {
      playSynth(ctx, time, SEQS[3][beatNumber] as number, 'sawtooth', 0.15, 0.4);
      setTimeout(() => triggerAnimation(3), delay);
    }
    // 4: Chords
    if (!mutedTracks[4] && SEQS[4][beatNumber]) {
      playChord(ctx, time, SEQS[4][beatNumber] as number[], 'sine', 0.5, 0.3);
      setTimeout(() => triggerAnimation(4), delay);
    }
    // 5: Arp
    if (!mutedTracks[5] && SEQS[5][beatNumber]) {
      playSynth(ctx, time, SEQS[5][beatNumber] as number, 'square', 0.1, 0.1);
      setTimeout(() => triggerAnimation(5), delay);
    }
    // 6: Lead
    if (!mutedTracks[6] && SEQS[6][beatNumber]) {
      playSynth(ctx, time, SEQS[6][beatNumber] as number, 'triangle', 0.3, 0.3);
      setTimeout(() => triggerAnimation(6), delay);
    }
    // 7: Pad
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

  const toggleMute = (index: number) => {
    setMutedTracks(prev => {
      const newMuted = [...prev];
      newMuted[index] = !newMuted[index];
      return newMuted;
    });
  };

  const toggleAll = (mute: boolean) => {
    setMutedTracks(Array(8).fill(mute));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#313338] relative h-full">
      <style>{`
        @keyframes monster-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.1); }
        }
        .animate-monster {
          animation: monster-bounce 0.15s ease-out;
        }
      `}</style>

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
      </div>

      <div className="flex-1 w-full flex flex-col bg-[#2b2d31] relative overflow-hidden">
        {/* Sfondo Isola */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 50% 100%, #a855f7 0%, transparent 60%), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a855f7' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 z-10 overflow-y-auto custom-scrollbar">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-[#ec4899] drop-shadow-lg mb-2">
              MySingingCanary
            </h1>
            <p className="text-[#dbdee1] font-medium">
              Clicca sui mostriciattoli per farli cantare e componi la tua canzone!
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-4xl w-full">
            {MONSTERS.map((m, i) => (
              <div key={m.id} className="flex flex-col items-center group">
                <div
                  ref={el => monsterRefs.current[i] = el}
                  className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-5xl sm:text-6xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all cursor-pointer border-4 ${
                    mutedTracks[i] 
                      ? 'opacity-40 grayscale border-[#1e1f22] bg-[#1e1f22] hover:opacity-60' 
                      : `${m.color} border-white hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]`
                  }`}
                  onClick={() => toggleMute(i)}
                >
                  {m.emoji}
                </div>
                <div className="mt-4 text-center">
                  <span className={`block font-bold text-lg ${mutedTracks[i] ? 'text-[#949ba4]' : 'text-white'}`}>{m.name}</span>
                  <span className="block text-xs text-[#b5bac1] uppercase tracking-wider font-semibold">{m.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Control Bar */}
        <div className="bg-[#1e1f22] p-4 border-t border-[#1f2023] flex flex-col sm:flex-row items-center justify-between gap-4 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg ${
                isPlaying 
                  ? 'bg-[#f23f43] hover:bg-[#da373c] text-white' 
                  : 'bg-[#23a559] hover:bg-[#1a7c43] text-white hover:scale-105'
              }`}
            >
              {isPlaying ? <Square fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
              {isPlaying ? 'Ferma Musica' : 'Suona!'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleAll(false)}
              className="flex items-center gap-2 px-4 py-2 bg-[#35373c] hover:bg-[#404249] text-white rounded-lg font-medium transition-colors"
            >
              <Volume2 size={18} /> Tutti
            </button>
            <button
              onClick={() => toggleAll(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#35373c] hover:bg-[#404249] text-white rounded-lg font-medium transition-colors"
            >
              <VolumeX size={18} /> Nessuno
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};