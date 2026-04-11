"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/discord";
import { Heart, Play, X, Flame, Bomb } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

const SYLLABLES = [
  "TRA", "PRO", "SCA", "MENT", "ATO", "ITO", "GIA", "CHE", "GLI", "SCI", 
  "STR", "PRE", "CON", "DIS", "TER", "MIN", "CAR", "PAR", "TAR", "MOR", 
  "SOL", "LUN", "MAR", "BEL", "DON", "GAT", "CAN", "PAN", "SPO", "ZIO", 
  "TTA", "NTO"
];
const getRandomSyllable = () => SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];

interface Player {
  id: string;
  name: string;
  avatar: string;
  lives: number;
}

interface GameState {
  status: 'lobby' | 'playing' | 'gameover';
  players: Player[];
  currentPlayerIndex: number;
  currentSyllable: string;
  usedWords: string[];
  turnDeadline: number;
  winner: string | null;
}

interface BombPartyProps {
  channelId: string;
  currentUser: User;
  voiceMembers: any[];
  onClose: () => void;
}

export const BombParty = ({ channelId, currentUser, voiceMembers, onClose }: BombPartyProps) => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'lobby',
    players: [],
    currentPlayerIndex: 0,
    currentSyllable: '',
    usedWords: [],
    turnDeadline: 0,
    winner: null,
  });
  
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const channelRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync lobby players
  useEffect(() => {
    if (gameState.status === 'lobby') {
      const activePlayers = voiceMembers.map(m => ({
        id: m.user_id,
        name: m.profiles?.first_name || 'Utente',
        avatar: m.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`,
        lives: 3
      }));
      
      // Ensure current user is in the list (in case voiceMembers hasn't updated yet)
      if (!activePlayers.some(p => p.id === currentUser.id)) {
        activePlayers.push({
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          lives: 3
        });
      }
      
      setGameState(prev => ({ ...prev, players: activePlayers }));
    }
  }, [voiceMembers, gameState.status, currentUser]);

  // Setup Supabase Realtime channel for the game
  useEffect(() => {
    const channel = supabase.channel(`minigame:bombparty:${channelId}`);
    
    channel.on('broadcast', { event: 'game_action' }, ({ payload }) => {
      handleGameAction(payload);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const broadcast = (payload: any) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_action',
      payload
    });
    handleGameAction(payload); // Applica localmente
  };

  const getNextAlivePlayerIndex = (players: Player[], currentIndex: number) => {
    let next = (currentIndex + 1) % players.length;
    while (players[next].lives <= 0 && next !== currentIndex) {
      next = (next + 1) % players.length;
    }
    return next;
  };

  const handleGameAction = (action: any) => {
    switch (action.type) {
      case 'START':
        setGameState({
          status: 'playing',
          players: action.players,
          currentPlayerIndex: 0,
          currentSyllable: action.syllable,
          usedWords: [],
          turnDeadline: action.turnDeadline,
          winner: null
        });
        break;
      case 'SUBMIT_WORD':
        setGameState(prev => ({
          ...prev,
          usedWords: [...prev.usedWords, action.word],
          currentSyllable: action.nextSyllable,
          currentPlayerIndex: action.nextPlayerIndex,
          turnDeadline: action.turnDeadline
        }));
        break;
      case 'EXPLODE':
        setGameState(prev => {
          const newPlayers = [...prev.players];
          newPlayers[action.playerIndex] = {
            ...newPlayers[action.playerIndex],
            lives: newPlayers[action.playerIndex].lives - 1
          };
          
          const alivePlayers = newPlayers.filter(p => p.lives > 0);
          if (alivePlayers.length <= 1) {
            return {
              ...prev,
              status: 'gameover',
              players: newPlayers,
              winner: alivePlayers.length === 1 ? alivePlayers[0].name : 'Nessuno'
            };
          }

          return {
            ...prev,
            players: newPlayers,
            currentSyllable: action.nextSyllable,
            currentPlayerIndex: action.nextPlayerIndex,
            turnDeadline: action.turnDeadline
          };
        });
        break;
      case 'BACK_TO_LOBBY':
        setGameState(prev => ({ ...prev, status: 'lobby' }));
        break;
    }
  };

  // Timer & Explosion Logic
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameState.turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const alivePlayers = gameState.players.filter(p => p.lives > 0);
        
        // Il giocatore corrente comunica la propria esplosione
        if (currentPlayer.id === currentUser.id) {
          const nextPlayerIndex = getNextAlivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
          broadcast({
            type: 'EXPLODE',
            playerIndex: gameState.currentPlayerIndex,
            nextSyllable: getRandomSyllable(),
            nextPlayerIndex,
            turnDeadline: Date.now() + 10000
          });
        } 
        // Fallback se il giocatore si è disconnesso
        else if (Date.now() > gameState.turnDeadline + 2000 && alivePlayers.length > 0 && alivePlayers[0].id === currentUser.id) {
          const nextPlayerIndex = getNextAlivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
          broadcast({
            type: 'EXPLODE',
            playerIndex: gameState.currentPlayerIndex,
            nextSyllable: getRandomSyllable(),
            nextPlayerIndex,
            turnDeadline: Date.now() + 10000
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.turnDeadline, gameState.currentPlayerIndex, gameState.players, currentUser.id]);

  // Focus automatico dell'input al proprio turno
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.players[gameState.currentPlayerIndex]?.id === currentUser.id) {
      inputRef.current?.focus();
    }
  }, [gameState.status, gameState.currentPlayerIndex]);

  const startGame = () => {
    if (gameState.players.length < 2) {
      showError("Servono almeno 2 giocatori per giocare!");
      return;
    }
    
    const initialPlayers = gameState.players.map(p => ({ ...p, lives: 3 }));
    
    broadcast({
      type: 'START',
      players: initialPlayers,
      syllable: getRandomSyllable(),
      turnDeadline: Date.now() + 10000
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameState.status !== 'playing') return;

    const word = inputValue.trim().toUpperCase();
    if (!word) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== currentUser.id) return;

    if (!word.includes(gameState.currentSyllable)) {
      showError(`La parola deve contenere "${gameState.currentSyllable}"`);
      return;
    }
    if (gameState.usedWords.includes(word)) {
      showError("Questa parola è già stata usata!");
      return;
    }

    setInputValue("");
    const nextPlayerIndex = getNextAlivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
    
    broadcast({
      type: 'SUBMIT_WORD',
      word,
      nextSyllable: getRandomSyllable(),
      nextPlayerIndex,
      turnDeadline: Date.now() + 10000
    });
  };

  if (gameState.status === 'lobby') {
    return (
      <div className="flex-1 flex flex-col bg-[#111214] relative z-30 animate-in fade-in duration-200">
        <div className="h-12 border-b border-[#1f2023] flex items-center justify-between px-4">
          <div className="flex items-center text-white font-bold">
            <Bomb className="mr-2 text-[#f23f43]" />
            BombParty
          </div>
          <button onClick={onClose} className="text-[#b5bac1] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-32 h-32 bg-[#2b2d31] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(242,63,67,0.2)]">
            <Bomb size={64} className="text-[#f23f43]" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">BombParty</h1>
          <p className="text-[#b5bac1] text-center max-w-md mb-8">
            Trova una parola che contenga la sillaba mostrata prima che la bomba esploda! Più aspetti, più il timer sarà veloce.
          </p>

          <div className="bg-[#1e1f22] p-4 rounded-xl w-full max-w-md mb-8 border border-[#2b2d31]">
            <h3 className="text-[#949ba4] text-xs font-bold uppercase mb-3 px-1">Giocatori pronti ({gameState.players.length})</h3>
            <div className="space-y-2">
              {gameState.players.map(p => (
                <div key={p.id} className="flex items-center p-2 bg-[#2b2d31] rounded-lg">
                  <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover mr-3 bg-[#111214]" />
                  <span className="text-white font-medium flex-1">{p.name}</span>
                </div>
              ))}
              {gameState.players.length < 2 && (
                <div className="text-sm text-[#f0b232] italic text-center mt-4">
                  In attesa di altri giocatori...
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={startGame}
            disabled={gameState.players.length < 2}
            className="flex items-center px-8 py-3 bg-[#f23f43] hover:bg-[#da373c] text-white rounded-full font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(242,63,67,0.4)]"
          >
            <Play fill="currentColor" className="mr-2" />
            Inizia Partita
          </button>
        </div>
      </div>
    );
  }

  if (gameState.status === 'gameover') {
    return (
      <div className="flex-1 flex flex-col bg-[#111214] relative z-30 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-6xl mb-6 animate-bounce">🏆</div>
          <h2 className="text-3xl font-black text-white mb-2">Partita Terminata!</h2>
          <p className="text-xl text-[#b5bac1] mb-8">
            Vincitore: <span className="text-white font-bold">{gameState.winner}</span>
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => broadcast({ type: 'BACK_TO_LOBBY' })}
              className="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-bold transition-all"
            >
              Torna alla Lobby
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded-lg font-bold transition-all"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUser.id;
  const isDanger = timeLeft <= 3;

  return (
    <div className="flex-1 flex flex-col bg-[#111214] relative z-30 overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(242,63,67,0.5) 0%, rgba(17,18,20,1) 70%)' }}></div>
      
      <div className="h-12 flex items-center justify-between px-4 z-10">
        <div className="text-[#b5bac1] font-bold text-sm">Parole usate: {gameState.usedWords.length}</div>
        <button onClick={onClose} className="text-[#b5bac1] hover:text-white transition-colors p-2 bg-black/40 rounded-full">
          <X size={20} />
        </button>
      </div>

      {/* Players Strip */}
      <div className="flex justify-center gap-4 px-4 py-2 z-10 overflow-x-auto custom-scrollbar">
        {gameState.players.map((p, idx) => {
          const isCurrent = idx === gameState.currentPlayerIndex;
          const isDead = p.lives <= 0;
          return (
            <div key={p.id} className={`flex flex-col items-center transition-all duration-300 ${isDead ? 'opacity-30 grayscale' : 'opacity-100'} ${isCurrent ? 'scale-110 -translate-y-2' : 'scale-100'}`}>
              <div className={`relative rounded-full p-1 transition-colors ${isCurrent ? 'bg-brand' : 'bg-transparent'}`}>
                <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover bg-[#2b2d31] border-2 border-[#111214]" />
              </div>
              <span className={`text-[11px] font-bold mt-1 ${isCurrent ? 'text-white' : 'text-[#949ba4]'}`}>{p.name}</span>
              <div className="flex gap-0.5 mt-1">
                {[...Array(3)].map((_, i) => (
                  <Heart key={i} size={10} fill={i < p.lives ? "#f23f43" : "transparent"} className={i < p.lives ? "text-[#f23f43]" : "text-[#4e5058]"} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bomb Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className={`relative flex items-center justify-center transition-all duration-100 ${isDanger ? 'animate-bounce' : ''}`} style={{ transform: `scale(${1 + (10 - timeLeft) * 0.03})` }}>
          <div className={`absolute inset-0 rounded-full blur-3xl transition-opacity ${isDanger ? 'opacity-50 bg-[#f23f43]' : 'opacity-20 bg-brand'}`}></div>
          <Bomb size={180} className={`${isDanger ? 'text-[#f23f43]' : 'text-white'} drop-shadow-2xl z-10`} />
          <div className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-6 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
            <span className="text-4xl font-black text-white tracking-widest">{gameState.currentSyllable}</span>
          </div>
        </div>
        <div className={`mt-8 text-5xl font-black tabular-nums transition-colors ${isDanger ? 'text-[#f23f43]' : 'text-white'}`}>
          {timeLeft}s
        </div>
        <div className="mt-4 text-[#dbdee1] text-lg">
          Turno di: <span className="font-bold text-white">{currentPlayer?.name}</span>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-gradient-to-t from-[#111214] to-transparent z-10">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!isMyTurn}
            placeholder={isMyTurn ? `Scrivi una parola con ${gameState.currentSyllable}...` : `Attendi il tuo turno...`}
            className={`w-full bg-[#1e1f22] border-2 rounded-xl px-6 py-4 text-white text-xl text-center uppercase tracking-wider outline-none transition-all placeholder:normal-case placeholder:tracking-normal ${
              isMyTurn ? 'border-brand shadow-[0_0_20px_rgba(88,101,242,0.3)]' : 'border-[#1e1f22] opacity-50 cursor-not-allowed'
            }`}
          />
        </form>
        <p className="text-center text-[#949ba4] text-[11px] mt-3">Demo: qualsiasi parola contenente la sillaba verrà accettata.</p>
      </div>
    </div>
  );
};