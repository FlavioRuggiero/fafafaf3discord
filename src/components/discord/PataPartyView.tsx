"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Crown, Users, Play, ArrowRight, ArrowLeft } from "lucide-react";
import { Avatar } from "./Avatar";

interface Player {
  id: string;
  name: string;
  avatar: string;
  position: number;
}

interface GameState {
  status: 'lobby' | 'playing';
  players: Player[];
}

export const PataPartyView = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'menu' | 'lobby' | 'playing'>('menu');
  const [isHost, setIsHost] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'lobby' | 'playing'>('lobby');
  
  const channelRef = useRef<any>(null);
  const stateRef = useRef<GameState>({ status: 'lobby', players: [] });

  const cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const createGame = () => {
    cleanup();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGameCode(code);
    setIsHost(true);
    setView('lobby');
    
    if (!user) return;

    const hostPlayer: Player = {
      id: user.id,
      name: user.name || 'Game Master',
      avatar: user.avatar || '',
      position: 0
    };
    
    setPlayers([hostPlayer]);
    stateRef.current = { status: 'lobby', players: [hostPlayer] };

    const channel = supabase.channel(`pataparty_${code}`);
    
    channel.on('broadcast', { event: 'join_request' }, (payload) => {
      const newPlayer = payload.payload;
      if (!stateRef.current.players.find(p => p.id === newPlayer.id)) {
        stateRef.current.players.push({ ...newPlayer, position: 0 });
        setPlayers([...stateRef.current.players]);
        channel.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
        showSuccess(`${newPlayer.name} si è unito!`);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Ready
      }
    });
    channelRef.current = channel;
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

    const channel = supabase.channel(`pataparty_${joinCode}`);
    
    channel.on('broadcast', { event: 'state_update' }, (payload) => {
      const state = payload.payload as GameState;
      setPlayers(state.players);
      setGameStatus(state.status);
      if (state.status === 'playing') setView('playing');
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'join_request',
          payload: { id: user.id, name: user.name || 'Giocatore', avatar: user.avatar || '' }
        });
      } else if (status === 'CLOSED') {
        showError("Disconnesso dalla partita");
      }
    });
    channelRef.current = channel;
  };

  const startGame = () => {
    if (!isHost) return;
    stateRef.current.status = 'playing';
    setGameStatus('playing');
    setView('playing');
    channelRef.current?.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
  };

  const movePlayer = (playerId: string, steps: number) => {
    if (!isHost) return;
    const pIndex = stateRef.current.players.findIndex(p => p.id === playerId);
    if (pIndex !== -1) {
      const newPos = Math.max(0, Math.min(63, stateRef.current.players[pIndex].position + steps));
      stateRef.current.players[pIndex].position = newPos;
      setPlayers([...stateRef.current.players]);
      channelRef.current?.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
    }
  };

  const leaveGame = () => {
    cleanup();
    setView('menu');
    setGameCode('');
    setJoinCode('');
    setPlayers([]);
  };

  const BOARD_SIZE = 64; // 0 to 63

  return (
    <div className="flex-1 bg-[#313338] h-full flex flex-col items-center justify-center p-8 overflow-y-auto custom-scrollbar">
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

      {view === 'menu' && (
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
            <div className="bg-[#1e1f22] p-4 rounded-lg">
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3f4147]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#2b2d31] px-2 text-[#949ba4] font-bold">Oppure</span>
              </div>
            </div>

            <div className="bg-[#1e1f22] p-4 rounded-lg">
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
              {isHost && <span className="text-xs font-normal text-[#949ba4]">Tu sei il Game Master</span>}
            </h3>
            <div className="bg-[#1e1f22] rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-[#2b2d31] p-2 rounded">
                  <Avatar src={p.avatar} className="w-8 h-8" />
                  <span className="text-white font-medium">{p.name}</span>
                  {p.id === stateRef.current.players[0]?.id && (
                    <Crown size={14} className="text-yellow-500 ml-auto" />
                  )}
                </div>
              ))}
              {players.length === 1 && !isHost && (
                <div className="text-[#949ba4] text-sm text-center py-4">In attesa degli altri giocatori...</div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={leaveGame}
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

      {view === 'playing' && (
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center justify-between bg-[#2b2d31] p-4 rounded-lg shadow-sm mb-4 shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-[#ec4899]">PataParty!</span>
                <span className="bg-[#1e1f22] px-2 py-0.5 rounded text-sm text-[#949ba4] tracking-widest">{gameCode}</span>
              </h2>
            </div>
            <button 
              onClick={leaveGame}
              className="bg-[#da373c] hover:bg-[#a12828] text-white font-medium py-1.5 px-4 rounded transition-colors text-sm"
            >
              Esci
            </button>
          </div>

          <div className="flex gap-4 flex-1 overflow-hidden">
            {/* Tabellone */}
            <div className="flex-1 bg-[#2b2d31] rounded-lg p-6 overflow-y-auto custom-scrollbar relative shadow-inner">
              <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto">
                {Array.from({length: BOARD_SIZE}).map((_, i) => {
                  const isStart = i === 0;
                  const isEnd = i === BOARD_SIZE - 1;
                  const playersHere = players.filter(p => p.position === i);
                  
                  return (
                    <div 
                      key={i} 
                      className={`w-20 h-20 rounded-xl relative flex flex-col items-center justify-center transition-all ${
                        isStart ? 'bg-[#23a559]/20 border-2 border-[#23a559]' : 
                        isEnd ? 'bg-yellow-500/20 border-2 border-yellow-500' : 
                        'bg-[#1e1f22] border border-[#3f4147]'
                      }`}
                    >
                      <span className={`absolute top-1 left-1.5 text-[10px] font-bold ${isStart ? 'text-[#23a559]' : isEnd ? 'text-yellow-500' : 'text-[#949ba4]'}`}>
                        {isStart ? 'START' : isEnd ? 'FINISH' : i}
                      </span>
                      
                      <div className="flex flex-wrap gap-1 items-center justify-center mt-3 p-1">
                        {playersHere.map(p => (
                          <div key={p.id} className="relative group">
                            <img src={p.avatar} className="w-6 h-6 rounded-full border border-white shadow-md bg-[#313338]" alt={p.name} />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                              {p.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Controlli Game Master */}
            {isHost && (
              <div className="w-72 bg-[#2b2d31] rounded-lg p-4 flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-inner">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Crown size={18} className="text-yellow-500" /> Controlli GM
                </h3>
                
                <div className="space-y-4">
                  {players.map(p => (
                    <div key={p.id} className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                      <div className="flex items-center gap-2 mb-3">
                        <img src={p.avatar} className="w-6 h-6 rounded-full bg-[#313338]" />
                        <span className="text-sm font-medium text-white truncate">{p.name}</span>
                        <span className="ml-auto text-xs bg-[#2b2d31] px-2 py-0.5 rounded text-[#949ba4] font-bold">
                          Casella {p.position}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => movePlayer(p.id, -1)}
                          className="bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                        >
                          <ArrowLeft size={12} /> Indietro
                        </button>
                        <button 
                          onClick={() => movePlayer(p.id, 1)}
                          className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                        >
                          Avanti <ArrowRight size={12} />
                        </button>
                        <button 
                          onClick={() => movePlayer(p.id, 3)}
                          className="col-span-2 bg-[#23a559] hover:bg-[#1a7f44] text-white text-xs py-1.5 rounded transition-colors"
                        >
                          +3 Caselle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Visualizzazione classifica per i Giocatori Normali */}
            {!isHost && (
               <div className="w-64 bg-[#2b2d31] rounded-lg p-4 flex flex-col shrink-0 shadow-inner">
                 <h3 className="text-white font-bold mb-4">Classifica</h3>
                 <div className="space-y-2">
                   {[...players].sort((a, b) => b.position - a.position).map((p, i) => (
                     <div key={p.id} className="flex items-center gap-2 bg-[#1e1f22] p-2 rounded">
                       <span className="text-[#949ba4] font-bold w-4 text-center">{i + 1}</span>
                       <img src={p.avatar} className="w-6 h-6 rounded-full bg-[#313338]" />
                       <span className="text-sm text-white truncate flex-1">{p.name}</span>
                       <span className="text-xs text-[#23a559] font-bold">{p.position}</span>
                     </div>
                   ))}
                 </div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};