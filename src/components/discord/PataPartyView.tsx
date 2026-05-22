"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Crown, Users, Play, Minimize2, LogOut, Info } from "lucide-react";
import { Avatar } from "./Avatar";
import { useShop } from "@/contexts/ShopContext";

interface Player {
  id: string;
  name: string;
  avatar: string;
  avatar_decoration: string | null;
  x: number;
  y: number;
}

interface GameState {
  status: 'lobby' | 'playing';
  players: Player[];
}

export const PataPartyView = () => {
  const { user, adminId, moderatorIds } = useAuth();
  const { getThemeClass, getThemeStyle } = useShop();
  
  const [profile, setProfile] = useState<any>(null);
  
  const [view, setView] = useState<'menu' | 'lobby' | 'playing'>('menu');
  const [isHost, setIsHost] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'lobby' | 'playing'>('lobby');
  
  // Stato persistente per permettere il rientro
  const [savedGame, setSavedGame] = useState<{code: string, isHost: boolean} | null>(null);

  // Drag & Drop States
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastSyncRef = useRef<number>(0);

  const channelRef = useRef<any>(null);
  const stateRef = useRef<GameState>({ status: 'lobby', players: [] });

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({data}) => setProfile(data));
      
      const stored = localStorage.getItem(`pataparty_active_game_${user.id}`);
      if (stored) {
        try {
          setSavedGame(JSON.parse(stored));
        } catch(e) {}
      }
    }
  }, [user]);

  const canCreate = user?.id === adminId || (user && moderatorIds.includes(user.id)) || profile?.role === 'moderator';

  const cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const syncState = () => {
    setPlayers([...stateRef.current.players]);
    if (isHost || (savedGame && savedGame.isHost)) {
      const codeToSave = gameCode || savedGame?.code;
      if (codeToSave) {
        localStorage.setItem(`pataparty_state_${codeToSave}`, JSON.stringify(stateRef.current));
      }
    }
    channelRef.current?.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
  };

  const setupHostChannel = (code: string) => {
    const channel = supabase.channel(`pataparty_${code}`);
    channel.on('broadcast', { event: 'join_request' }, (payload) => {
      const newPlayer = payload.payload;
      // Il GM non viene aggiunto ai giocatori
      if (!stateRef.current.players.find(p => p.id === newPlayer.id)) {
        // Posiziona i nuovi giocatori all'inizio del tabellone in basso a sinistra (Casella 01)
        stateRef.current.players.push({ ...newPlayer, x: 25, y: 85 });
        syncState();
        showSuccess(`${newPlayer.name} si è unito!`);
      } else {
        // Se un giocatore rientra, forziamo il reinvio dello stato
        channel.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
      }
    });
    channel.subscribe();
    channelRef.current = channel;
  };

  const setupPlayerChannel = (code: string) => {
    const channel = supabase.channel(`pataparty_${code}`);
    channel.on('broadcast', { event: 'state_update' }, (payload) => {
      const state = payload.payload as GameState;
      stateRef.current = state;
      setPlayers(state.players);
      setGameStatus(state.status);
      if (state.status === 'playing') setView('playing');
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && user) {
        channel.send({
          type: 'broadcast',
          event: 'join_request',
          payload: { 
            id: user.id, 
            name: profile?.first_name || 'Giocatore', 
            avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
            avatar_decoration: profile?.avatar_decoration || null
          }
        });
      }
    });
    channelRef.current = channel;
  };

  const createGame = () => {
    if (!canCreate) {
      showError("Solo i Moderatori possono creare una partita.");
      return;
    }
    cleanup();
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGameCode(code);
    setIsHost(true);
    setView('lobby');
    
    const activeObj = { code, isHost: true };
    setSavedGame(activeObj);
    localStorage.setItem(`pataparty_active_game_${user!.id}`, JSON.stringify(activeObj));

    stateRef.current = { status: 'lobby', players: [] };
    localStorage.setItem(`pataparty_state_${code}`, JSON.stringify(stateRef.current));
    setPlayers([]);

    setupHostChannel(code);
  };

  const joinGame = () => {
    if (!joinCode || joinCode.length !== 6) {
      showError("Inserisci un codice valido a 6 cifre");
      return;
    }
    if (!user) return;

    cleanup();
    setGameCode(joinCode);
    setIsHost(false);
    setView('lobby');

    const activeObj = { code: joinCode, isHost: false };
    setSavedGame(activeObj);
    localStorage.setItem(`pataparty_active_game_${user.id}`, JSON.stringify(activeObj));

    setupPlayerChannel(joinCode);
  };

  const rejoinGame = () => {
    if (!savedGame || !user) return;
    cleanup();
    setGameCode(savedGame.code);
    setIsHost(savedGame.isHost);
    
    if (savedGame.isHost) {
      const storedState = localStorage.getItem(`pataparty_state_${savedGame.code}`);
      if (storedState) {
        try {
          stateRef.current = JSON.parse(storedState);
        } catch(e) {
          stateRef.current = { status: 'lobby', players: [] };
        }
      } else {
        stateRef.current = { status: 'lobby', players: [] };
      }
      setPlayers(stateRef.current.players);
      setGameStatus(stateRef.current.status);
      setView(stateRef.current.status === 'playing' ? 'playing' : 'lobby');
      setupHostChannel(savedGame.code);
    } else {
      setView('lobby'); 
      setupPlayerChannel(savedGame.code);
    }
  };

  const abandonSavedGame = () => {
    if (savedGame?.isHost) {
      localStorage.removeItem(`pataparty_state_${savedGame.code}`);
    }
    if (user) {
      localStorage.removeItem(`pataparty_active_game_${user.id}`);
    }
    setSavedGame(null);
    cleanup();
    setView('menu');
    setGameCode('');
    setJoinCode('');
    setPlayers([]);
  };

  const startGame = () => {
    if (!isHost) return;
    stateRef.current.status = 'playing';
    syncState();
    setView('playing');
  };

  // --- DRAG & DROP LOGIC ---
  const handlePointerDown = (e: React.PointerEvent, playerId: string) => {
    if (!isHost) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingId(playerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !isHost || !boardRef.current) return;
    
    const rect = boardRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Limiti del tabellone
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    // Aggiornamento locale rapido
    setPlayers(prev => prev.map(p => p.id === draggingId ? { ...p, x, y } : p));
    stateRef.current.players = stateRef.current.players.map(p => p.id === draggingId ? { ...p, x, y } : p);

    // Sync in tempo reale verso gli altri utenti (limitato a 1 volta ogni 50ms)
    const now = Date.now();
    if (now - lastSyncRef.current > 50) {
      channelRef.current?.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
      lastSyncRef.current = now;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId && isHost) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDraggingId(null);
      syncState(); // Sync finale
    }
  };

  return (
    <div className="flex-1 bg-[#313338] h-full flex flex-col items-center justify-center p-8 overflow-y-auto custom-scrollbar relative">
      <style>{`
        @keyframes wave-text {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-wave-text {
          display: inline-block;
          animation: wave-text 1s infinite ease-in-out;
        }
        @keyframes beat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .animate-beat {
          display: inline-block;
          animation: beat 1s infinite;
        }
      `}</style>

      {/* Menu Principale (Se c'è una partita attiva, mostra RIENTRA) */}
      {view === 'menu' && savedGame ? (
        <div className="bg-[#2b2d31] p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-brand/50">
          <h1 className="text-4xl font-black text-white mb-6 flex items-center justify-center gap-3">
            <span className="text-[#ec4899]">PataParty!</span>
          </h1>
          <h2 className="text-xl font-bold text-white mb-2">Sei già in una partita!</h2>
          <p className="text-[#b5bac1] text-sm mb-6">Vuoi rientrare nella partita con codice <strong className="text-white bg-[#1e1f22] px-2 py-0.5 rounded tracking-widest">{savedGame.code}</strong>?</p>
          
          <div className="space-y-3">
            <button 
              onClick={rejoinGame}
              className="w-full bg-[#23a559] hover:bg-[#1a7f44] text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg hover:-translate-y-0.5"
            >
              RIENTRA IN PARTITA
            </button>
            <button 
              onClick={abandonSavedGame}
              className="w-full bg-transparent border border-[#f23f43] text-[#f23f43] hover:bg-[#f23f43] hover:text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Abbandona Definitivamente
            </button>
          </div>
        </div>
      ) : view === 'menu' && !savedGame && (
        <div className="bg-[#2b2d31] p-8 rounded-xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
            <span className="text-[#ec4899]">PataParty!</span>
          </h1>
          
          <p className="text-[#dbdee1] mb-8 text-[15px] leading-relaxed max-w-[90%] mx-auto">
            Gioca gli eventi <span className="text-red-500 font-black animate-beat mx-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">UFFICIALI</span> e Vinci per ricevere a casa un pacco di <span className="text-yellow-400 font-black inline-flex mx-1 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">
              {"PATATINE".split('').map((char, i) => (
                <span key={i} className="animate-wave-text" style={{ animationDelay: `${i * 0.1}s` }}>{char}</span>
              ))}
            </span> a caso di amazon!
          </p>

          <div className="space-y-6">
            {canCreate ? (
              <div className="bg-[#1e1f22] p-4 rounded-lg border border-transparent hover:border-yellow-500/30 transition-colors">
                <h2 className="text-white font-bold mb-2 flex items-center justify-center gap-2">
                  <Crown size={18} className="text-yellow-500" /> Crea una nuova partita
                </h2>
                <p className="text-xs text-[#949ba4] mb-4">Diventa il Game Master e controlla il tabellone.</p>
                <button 
                  onClick={createGame}
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Crea Partita
                </button>
              </div>
            ) : (
              <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#f23f43]/30">
                <h2 className="text-[#f23f43] font-bold mb-2 flex items-center justify-center gap-2">
                  <Crown size={18} /> Crea una nuova partita
                </h2>
                <p className="text-xs text-[#949ba4] mb-2">Solo i Moderatori possono creare la partita.</p>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3f4147]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#2b2d31] px-2 text-[#949ba4] font-bold">Oppure</span>
              </div>
            </div>

            <div className="bg-[#1e1f22] p-4 rounded-lg border border-transparent hover:border-[#23a559]/30 transition-colors">
              <h2 className="text-white font-bold mb-2 flex items-center justify-center gap-2">
                <Users size={18} className="text-[#23a559]" /> Unisciti a una partita
              </h2>
              <p className="text-xs text-[#949ba4] mb-4">Inserisci il codice fornito dal Game Master.</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Codice a 6 cifre" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
                  className="flex-1 bg-[#2b2d31] text-white px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#5865f2] text-center tracking-widest text-lg font-bold"
                />
                <button 
                  onClick={joinGame}
                  className="bg-[#23a559] hover:bg-[#1a7f44] text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Entra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lobby di Attesa */}
      {view === 'lobby' && (
        <div className="bg-[#2b2d31] p-8 rounded-xl shadow-xl max-w-lg w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Sala d'Attesa</h2>
          <div className="bg-[#1e1f22] py-4 px-6 rounded-lg inline-block mb-6 border border-[#3f4147]">
            <p className="text-xs text-[#949ba4] font-bold uppercase mb-1">Codice Partita</p>
            <p className="text-4xl font-black text-white tracking-[0.2em]">{gameCode}</p>
          </div>

          <div className="text-left mb-6">
            <h3 className="text-[#dbdee1] font-bold mb-3 flex items-center justify-between">
              Giocatori ({players.length})
            </h3>
            <div className="bg-[#1e1f22] rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
              {isHost && (
                <div className="flex items-center gap-3 bg-[#2b2d31] p-2 rounded border border-yellow-500/50 mb-2 shadow-sm">
                  <Avatar src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} decoration={profile?.avatar_decoration} className="w-8 h-8" />
                  <span className={`font-bold ${getThemeClass(profile?.avatar_decoration)}`} style={getThemeStyle(profile?.avatar_decoration)}>
                    {profile?.first_name || 'Tu'} <span className="text-xs text-yellow-500 ml-1 uppercase">(Game Master)</span>
                  </span>
                  <Crown size={14} className="text-yellow-500 ml-auto" />
                </div>
              )}
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-[#2b2d31] p-2 rounded">
                  <Avatar src={p.avatar} decoration={p.avatar_decoration} className="w-8 h-8" />
                  <span className={`font-medium ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>
                    {p.name}
                  </span>
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-[#949ba4] text-sm text-center py-4">In attesa dei giocatori...</div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={abandonSavedGame}
              className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Abbandona
            </button>
            {isHost && (
              <button 
                onClick={startGame}
                disabled={players.length < 1}
                className="flex-1 bg-[#23a559] hover:bg-[#1a7f44] text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={18} /> Inizia Partita
              </button>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN PER LA PARTITA ATTIVA */}
      {view === 'playing' && (
        <div className="fixed inset-0 z-[99999] bg-[#111214] w-full h-full flex flex-col animate-in fade-in duration-300">
          {/* Header Partita */}
          <div className="flex items-center justify-between bg-[#2b2d31] p-4 border-b border-[#1e1f22] shrink-0 shadow-md">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-[#ec4899] drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">PataParty!</span>
                <span className="bg-[#1e1f22] px-2 py-0.5 rounded text-sm text-[#949ba4] tracking-widest">{gameCode}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('menu')} 
                className="flex items-center gap-2 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-medium py-1.5 px-4 rounded transition-colors text-sm"
              >
                <Minimize2 size={16} /> Riduci a Icona
              </button>
              <button 
                onClick={abandonSavedGame}
                className="flex items-center gap-2 bg-transparent border border-[#f23f43] text-[#f23f43] hover:bg-[#f23f43] hover:text-white font-medium py-1.5 px-4 rounded transition-colors text-sm"
              >
                <LogOut size={16} /> Abbandona
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden p-4 md:p-6 bg-[#313338]">
            
            {/* Tabellone Centrale (Immagine Sfondo + Drag&Drop) */}
            <div className="flex-1 bg-[#2b2d31] rounded-lg p-2 md:p-6 overflow-hidden relative shadow-inner flex items-center justify-center">
              
              <div 
                ref={boardRef}
                className="relative w-full max-w-6xl aspect-[4/3] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-[#3f4147] bg-[#fcf6ce] overflow-hidden"
                style={{ 
                  backgroundImage: 'url(/pataparty-board.png)',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Se l'immagine non è presente, mostra un avviso temporaneo */}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm pointer-events-none opacity-50">
                  Assicurati di avere 'pataparty-board.png' in /public
                </div>

                {players.map(p => (
                  <div 
                    key={p.id} 
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out group ${
                      isHost ? 'cursor-grab active:cursor-grabbing hover:scale-110 z-20 hover:z-50' : 'z-10'
                    }`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onPointerDown={(e) => handlePointerDown(e, p.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  >
                    <Avatar 
                      src={p.avatar} 
                      decoration={p.avatar_decoration} 
                      className="w-10 h-10 md:w-12 md:h-12 object-cover shadow-xl border-2 border-white bg-[#313338] pointer-events-none select-none" 
                    />
                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none font-bold shadow-lg ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>

              {/* Informazione per il GM */}
              {isHost && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg pointer-events-none">
                  <Info size={16} className="text-yellow-500" />
                  Trascina le pedine dei giocatori per spostarle sul tabellone.
                </div>
              )}
            </div>

            {/* Sidebar Giocatori (Destra) */}
            <div className="w-full md:w-72 bg-[#2b2d31] rounded-lg p-4 flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-inner">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users size={18} className="text-[#dbdee1]" /> Giocatori in Partita
              </h3>
              
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={p.id} className="bg-[#1e1f22] p-2 rounded-lg border border-[#3f4147] flex items-center gap-3 hover:border-brand transition-colors">
                    <Avatar src={p.avatar} decoration={p.avatar_decoration} className="w-8 h-8 flex-shrink-0" />
                    <span className={`text-sm font-medium truncate ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>{p.name}</span>
                  </div>
                ))}
                {players.length === 0 && (
                  <div className="text-center text-[#949ba4] text-sm py-8 border border-dashed border-[#3f4147] rounded-lg">
                    Tutti i giocatori hanno abbandonato
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};