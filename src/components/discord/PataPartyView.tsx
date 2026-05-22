"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Crown, Users, Play, Minimize2, LogOut, Info, Dices, Plus, Image as ImageIcon } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { Avatar } from "./Avatar";
import { useShop } from "@/contexts/ShopContext";

interface Player {
  id: string;
  name: string;
  avatar: string;
  avatar_decoration: string | null;
  x: number;
  y: number;
  lastRoll?: number | null;
  specialDice?: string[];
}

interface GameState {
  status: 'lobby' | 'playing';
  players: Player[];
  activePlayerId?: string | null;
  boardUrl?: string;
}

interface DiceState {
  playerId: string;
  result: number;
  rolling: boolean;
  diceType?: string;
}

const Dice = ({ value, rolling, diceType, size = 'md' }: { value: number, rolling: boolean, diceType?: string, size?: 'md' | 'sm' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        if (diceType === 'ebete') setDisplayValue([1, 1, 6][Math.floor(Math.random() * 3)]);
        else if (diceType === 'vigilante') setDisplayValue([3, 4, 5][Math.floor(Math.random() * 3)]);
        else if (diceType === 'frazionario') setDisplayValue([1.5, 2.5, 3.5][Math.floor(Math.random() * 3)]);
        else setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [rolling, value, diceType]);

  const dotPositions: Record<number, string[]> = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
  };

  const getDotClass = (pos: string) => {
    switch (pos) {
      case 'center': return 'col-start-2 row-start-2';
      case 'top-left': return 'col-start-1 row-start-1';
      case 'top-right': return 'col-start-3 row-start-1';
      case 'middle-left': return 'col-start-1 row-start-2';
      case 'middle-right': return 'col-start-3 row-start-2';
      case 'bottom-left': return 'col-start-1 row-start-3';
      case 'bottom-right': return 'col-start-3 row-start-3';
      default: return '';
    }
  };

  const isInteger1to6 = Number.isInteger(displayValue) && displayValue >= 1 && displayValue <= 6;
  const isSm = size === 'sm';
  const containerClasses = isSm 
    ? 'w-14 h-14 bg-white rounded-xl border-2 border-gray-200 p-1.5' 
    : 'w-32 h-32 bg-white rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.7)] border-4 border-gray-200 p-4';

  return (
    <div className={`${containerClasses} flex items-center justify-center ${rolling ? 'animate-dice-spin' : 'animate-dice-pop'}`}>
      {isInteger1to6 ? (
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[2px]">
          {dotPositions[displayValue]?.map((pos, i) => (
            <div key={i} className={`${isSm ? 'w-2.5 h-2.5' : 'w-6 h-6'} bg-[#111214] rounded-full place-self-center shadow-inner ${getDotClass(pos)}`} />
          ))}
        </div>
      ) : (
        <span className={`${isSm ? 'text-2xl' : 'text-5xl'} font-black text-[#111214]`}>{displayValue}</span>
      )}
    </div>
  );
};

export const PataPartyView = () => {
  const { user, adminId, moderatorIds } = useAuth();
  const { getThemeClass, getThemeStyle } = useShop();
  
  const [profile, setProfile] = useState<any>(null);
  
  const [view, setView] = useState<'menu' | 'lobby' | 'playing'>('menu');
  const [isHost, setIsHost] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [boardUrl, setBoardUrl] = useState<string>('/pataparty-board.png');
  const [boardUrlInput, setBoardUrlInput] = useState<string>('');
  
  const [diceState, setDiceState] = useState<DiceState | null>(null);
  const [savedGame, setSavedGame] = useState<{code: string, isHost: boolean} | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastSyncRef = useRef<number>(0);

  const channelRef = useRef<any>(null);
  const stateRef = useRef<GameState>({ status: 'lobby', players: [], activePlayerId: null, boardUrl: '/pataparty-board.png' });

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
    setActivePlayerId(stateRef.current.activePlayerId || null);
    setBoardUrl(stateRef.current.boardUrl || '/pataparty-board.png');
    
    if (isHost || (savedGame && savedGame.isHost)) {
      const codeToSave = gameCode || savedGame?.code;
      if (codeToSave) {
        localStorage.setItem(`pataparty_state_${codeToSave}`, JSON.stringify(stateRef.current));
      }
    }
    channelRef.current?.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
  };

  const handleDiceRoll = (playerId: string, result: number, diceType?: string) => {
    setDiceState({ playerId, result, rolling: true, diceType });
    setTimeout(() => {
      setDiceState(prev => prev ? { ...prev, rolling: false } : null);
    }, 1500); 
    setTimeout(() => {
      setDiceState(null);
    }, 5000); 
  };

  const setupHostChannel = (code: string) => {
    const channel = supabase.channel(`pataparty_${code}`);
    channel.on('broadcast', { event: 'join_request' }, (payload) => {
      const newPlayer = payload.payload;
      if (!stateRef.current.players.find(p => p.id === newPlayer.id)) {
        stateRef.current.players.push({ ...newPlayer, x: 50, y: 50, lastRoll: null, specialDice: [] });
        syncState();
        showSuccess(`${newPlayer.name} si è unito!`);
      } else {
        channel.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
      }
    });
    channel.on('broadcast', { event: 'dice_roll' }, (payload) => {
      const { playerId, result, diceType } = payload.payload;
      handleDiceRoll(playerId, result, diceType);
      
      const pIndex = stateRef.current.players.findIndex(p => p.id === playerId);
      if (pIndex !== -1) {
        stateRef.current.players[pIndex].lastRoll = result;
        if (diceType) {
          const diceArr = stateRef.current.players[pIndex].specialDice || [];
          const dIndex = diceArr.indexOf(diceType);
          if (dIndex !== -1) diceArr.splice(dIndex, 1);
          stateRef.current.players[pIndex].specialDice = diceArr;
        }
        stateRef.current.activePlayerId = null;
        syncState();
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
      setActivePlayerId(state.activePlayerId || null);
      setBoardUrl(state.boardUrl || '/pataparty-board.png');
      if (state.status === 'playing' && view !== 'playing') setView('playing');
    });
    channel.on('broadcast', { event: 'dice_roll' }, (payload) => {
      const { playerId, result, diceType } = payload.payload;
      handleDiceRoll(playerId, result, diceType);
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
    setBoardUrl('/pataparty-board.png');
    
    const activeObj = { code, isHost: true };
    setSavedGame(activeObj);
    localStorage.setItem(`pataparty_active_game_${user!.id}`, JSON.stringify(activeObj));

    stateRef.current = { status: 'lobby', players: [], activePlayerId: null, boardUrl: '/pataparty-board.png' };
    localStorage.setItem(`pataparty_state_${code}`, JSON.stringify(stateRef.current));
    setPlayers([]);
    setActivePlayerId(null);

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
          stateRef.current = { status: 'lobby', players: [], activePlayerId: null, boardUrl: '/pataparty-board.png' };
        }
      } else {
        stateRef.current = { status: 'lobby', players: [], activePlayerId: null, boardUrl: '/pataparty-board.png' };
      }
      setPlayers(stateRef.current.players);
      setActivePlayerId(stateRef.current.activePlayerId || null);
      setBoardUrl(stateRef.current.boardUrl || '/pataparty-board.png');
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
    setActivePlayerId(null);
  };

  const startGame = () => {
    if (!isHost) return;
    stateRef.current.status = 'playing';
    syncState();
    setView('playing');
  };

  const setTurn = (playerId: string) => {
    if (!isHost) return;
    stateRef.current.activePlayerId = playerId;
    
    const pIndex = stateRef.current.players.findIndex(p => p.id === playerId);
    if (pIndex !== -1) {
      stateRef.current.players[pIndex].lastRoll = null;
    }
    
    syncState();
    showSuccess("Turno impostato!");
  };

  const addSpecialDice = (playerId: string, type: string) => {
    if (!isHost) return;
    const pIndex = stateRef.current.players.findIndex(p => p.id === playerId);
    if (pIndex !== -1) {
      const currentDice = stateRef.current.players[pIndex].specialDice || [];
      stateRef.current.players[pIndex].specialDice = [...currentDice, type];
      syncState();
      showSuccess(`Dado ${type} assegnato!`);
    }
  };

  const rollDice = (diceType?: string) => {
    if (activePlayerId !== user?.id || diceState?.rolling) return;
    
    let result = 0;
    if (diceType === 'ebete') {
      result = [1, 1, 6][Math.floor(Math.random() * 3)];
    } else if (diceType === 'vigilante') {
      result = [3, 4, 5][Math.floor(Math.random() * 3)];
    } else if (diceType === 'frazionario') {
      result = [1.5, 2.5, 3.5][Math.floor(Math.random() * 3)];
    } else {
      result = Math.floor(Math.random() * 6) + 1;
    }

    handleDiceRoll(user.id, result, diceType);
    channelRef.current?.send({ type: 'broadcast', event: 'dice_roll', payload: { playerId: user.id, result, diceType } });
    setActivePlayerId(null);
  };

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
    
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setPlayers(prev => prev.map(p => p.id === draggingId ? { ...p, x, y } : p));
    stateRef.current.players = stateRef.current.players.map(p => p.id === draggingId ? { ...p, x, y } : p);

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
      syncState(); 
    }
  };

  const PlayerListItem = ({ p, isTurn }: { p: Player, isTurn: boolean }) => (
    <>
      {isTurn && <div className="absolute -left-[1px] top-2 bottom-2 w-1.5 bg-[#23a559] rounded-r-md"></div>}
      <Avatar src={p.avatar} decoration={p.avatar_decoration} className="w-8 h-8 flex-shrink-0" />
      <span className={`text-sm font-medium truncate flex-1 ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>
        {p.name}
      </span>
      {p.lastRoll && (
        <div className="ml-auto flex items-center justify-center w-7 h-7 bg-white rounded shadow-sm border border-gray-300 transform rotate-3">
          <span className="text-[#111214] font-black text-sm">{p.lastRoll}</span>
        </div>
      )}
    </>
  );

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
        @keyframes dice-spin {
          0% { transform: rotate3d(1, 1, 1, 0deg) scale(1); }
          50% { transform: rotate3d(1, 2, 1, 180deg) scale(1.2); }
          100% { transform: rotate3d(1, 1, 1, 360deg) scale(1); }
        }
        .animate-dice-spin {
          animation: dice-spin 0.4s linear infinite;
        }
        @keyframes dice-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-dice-pop {
          animation: dice-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* Menu Principale */}
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
                <div key={p.id} className="flex items-center gap-3 bg-[#2b2d31] p-2 rounded border border-[#3f4147]">
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
          <div className="flex items-center justify-between bg-[#2b2d31] p-4 border-b border-[#1e1f22] shrink-0 shadow-md relative z-[10]">
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

          <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden p-4 md:p-6 bg-[#313338] relative">
            
            {/* Tabellone Centrale */}
            <div className="flex-1 bg-[#2b2d31] rounded-lg p-2 md:p-6 overflow-hidden relative shadow-inner flex items-center justify-center">
              
              <div 
                ref={boardRef}
                className="relative inline-flex items-center justify-center max-w-full max-h-[85vh]"
              >
                <img 
                  src={boardUrl} 
                  alt="Board" 
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border-2 border-[#3f4147] bg-[#fcf6ce]" 
                  draggable={false} 
                  onError={(e) => {
                    // Fallback all'immagine di default se l'URL non è valido
                    e.currentTarget.src = '/pataparty-board.png'; 
                  }}
                />
                
                {/* Overlay per le pedine: rimosso overflow-hidden per evitare il taglio del balloon */}
                <div className="absolute inset-0 pointer-events-none rounded-xl">
                  {players.map(p => {
                    const isTurn = activePlayerId === p.id;
                    const isRolling = diceState?.playerId === p.id;
                    
                    return (
                      <div 
                        key={p.id} 
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out group pointer-events-auto ${
                          isHost ? 'cursor-grab active:cursor-grabbing hover:scale-110 z-20 hover:z-50' : 'z-10'
                        }`}
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                        onPointerDown={(e) => handlePointerDown(e, p.id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                      >
                        {/* BALLOON DEL DADO */}
                        {isRolling && diceState && (
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-[100] drop-shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                            <div className="bg-[#111214]/90 backdrop-blur-sm border border-[#1e1f22] text-white text-[10px] font-bold px-3 py-1 rounded-full mb-1 shadow-md whitespace-nowrap">
                              {diceState.rolling ? 'Sta tirando...' : `${p.name} ha fatto ${diceState.result}!`}
                            </div>
                            <div className="relative">
                              <Dice value={diceState.result} rolling={diceState.rolling} diceType={diceState.diceType} size="sm" />
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-gray-200 rotate-45 z-[-1]"></div>
                            </div>
                          </div>
                        )}

                        {isTurn && <div className="absolute inset-[-6px] bg-[#23a559] rounded-full animate-ping opacity-60 z-0"></div>}
                        
                        <Avatar 
                          src={p.avatar} 
                          decoration={p.avatar_decoration} 
                          className={`w-10 h-10 md:w-12 md:h-12 object-cover shadow-xl border-2 ${isTurn ? 'border-[#23a559]' : 'border-white'} bg-[#313338] pointer-events-none select-none relative z-10`} 
                        />
                        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none font-bold shadow-lg ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>
                          {p.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isHost && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg pointer-events-none z-10">
                  <Info size={16} className="text-yellow-500" />
                  Trascina le pedine dei giocatori per spostarle sul tabellone.
                </div>
              )}

              {/* PULSANTI DADI PER IL GIOCATORE ATTIVO (Discreti in basso al centro) */}
              {activePlayerId === user?.id && !isHost && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center gap-2 animate-in slide-in-from-bottom-5">
                  <div className="bg-[#2b2d31]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e1f22] text-xs font-bold text-white shadow-lg mb-1 relative flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#23a559] rounded-full animate-pulse"></div>
                    È il tuo turno!
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#2b2d31] border-b border-r border-[#1e1f22] rotate-45"></div>
                  </div>
                  
                  <div className="flex gap-2 bg-black/20 p-2 rounded-2xl backdrop-blur-sm border border-white/10 shadow-xl">
                    {/* Dado Normale */}
                    <div className="group/dice relative">
                      <button
                        onClick={() => rollDice()}
                        disabled={diceState?.rolling}
                        className="w-14 h-14 bg-white hover:bg-gray-100 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] border-2 border-gray-300 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Dices size={28} className="text-[#111214]" />
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/dice:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg">
                        Dado Normale<br/>
                        <span className="text-[#949ba4] font-normal">Può uscire da 1 a 6</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                      </div>
                    </div>

                    {/* Dadi Speciali */}
                    {players.find(p => p.id === user?.id)?.specialDice?.map((d, i) => (
                      <div key={i} className="group/dice relative">
                        <button
                          onClick={() => rollDice(d)}
                          disabled={diceState?.rolling}
                          className={`w-14 h-14 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.5)] border-2 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${
                            d === 'ebete' ? 'bg-[#f23f43] border-[#da373c]' : 
                            d === 'vigilante' ? 'bg-[#3b82f6] border-[#2563eb]' : 
                            'bg-[#a855f7] border-[#9333ea]'
                          }`}
                        >
                          <Dices size={28} className="text-white" />
                          <span className="absolute -top-2 -right-2 text-[10px] font-black bg-[#111214] text-white px-1.5 py-0.5 rounded-full border border-[#3f4147] uppercase shadow-lg">
                            {d.charAt(0)}
                          </span>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover/dice:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-lg">
                          {d === 'ebete' ? 'Dado Ebete' : d === 'vigilante' ? 'Dado Vigilante' : 'Dado Frazionario'}<br/>
                          <span className="text-[#949ba4] font-normal">
                            {d === 'ebete' ? 'Può uscire 1, 1 o 6' : d === 'vigilante' ? 'Può uscire 3, 4 o 5' : 'Può uscire 1.5, 2.5 o 3.5'}
                          </span>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Giocatori e Impostazioni GM (Destra) */}
            <div className="w-full md:w-72 bg-[#2b2d31] rounded-lg p-4 flex flex-col shrink-0 overflow-y-auto custom-scrollbar shadow-inner relative z-10">
              
              {isHost && (
                <div className="mb-6 bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                  <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1">
                    <ImageIcon size={14} /> Sfondo Tabellone (URL)
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={boardUrlInput}
                      onChange={e => setBoardUrlInput(e.target.value)}
                      className="flex-1 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-brand border border-[#3f4147]"
                    />
                    <button
                      onClick={() => {
                        const finalUrl = boardUrlInput.trim() || '/pataparty-board.png';
                        stateRef.current.boardUrl = finalUrl;
                        setBoardUrl(finalUrl);
                        syncState();
                        showSuccess("Tabellone aggiornato!");
                        setBoardUrlInput('');
                      }}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      Applica
                    </button>
                  </div>
                </div>
              )}

              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users size={18} className="text-[#dbdee1]" /> Giocatori in Partita
              </h3>
              
              <div className="space-y-2">
                {players.map(p => {
                  const isTurn = activePlayerId === p.id;
                  
                  return (
                    <React.Fragment key={p.id}>
                      {isHost ? (
                        <Popover.Root>
                          <Popover.Trigger asChild>
                            <div className={`bg-[#1e1f22] p-2 rounded-lg border ${isTurn ? 'border-[#23a559] shadow-[0_0_10px_rgba(35,165,89,0.3)]' : 'border-[#3f4147] hover:border-brand'} flex items-center gap-3 transition-colors cursor-pointer relative`}>
                              <PlayerListItem p={p} isTurn={isTurn} />
                            </div>
                          </Popover.Trigger>
                          <Popover.Portal>
                            <Popover.Content className="z-[99999] bg-[#111214] border border-[#1e1f22] p-1.5 rounded-md shadow-xl min-w-[200px]" side="left" align="start" sideOffset={10}>
                              <button 
                                onClick={() => setTurn(p.id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#5865F2] rounded w-full text-left transition-colors font-medium mb-1"
                              >
                                <Play size={14} /> Imposta Turno
                              </button>
                              
                              <div className="h-[1px] bg-[#3f4147] my-2 mx-1"></div>
                              <div className="px-2 py-1 text-[10px] font-bold text-[#949ba4] uppercase mb-1">Aggiungi Dado Monouso</div>
                              
                              <button 
                                onClick={() => addSpecialDice(p.id, 'ebete')}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#f23f43] hover:bg-[#f23f43] hover:text-white rounded w-full text-left transition-colors font-medium mb-0.5"
                              >
                                <Plus size={14} /> Dado Ebete (1,1,6)
                              </button>
                              <button 
                                onClick={() => addSpecialDice(p.id, 'vigilante')}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white rounded w-full text-left transition-colors font-medium mb-0.5"
                              >
                                <Plus size={14} /> Dado Vigilante (3,4,5)
                              </button>
                              <button 
                                onClick={() => addSpecialDice(p.id, 'frazionario')}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#a855f7] hover:bg-[#a855f7] hover:text-white rounded w-full text-left transition-colors font-medium"
                              >
                                <Plus size={14} /> Dado Fraz. (1.5, 2.5, 3.5)
                              </button>
                            </Popover.Content>
                          </Popover.Portal>
                        </Popover.Root>
                      ) : (
                        <div className={`bg-[#1e1f22] p-2 rounded-lg border ${isTurn ? 'border-[#23a559] shadow-[0_0_10px_rgba(35,165,89,0.3)]' : 'border-[#3f4147]'} flex items-center gap-3 transition-colors relative`}>
                          <PlayerListItem p={p} isTurn={isTurn} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
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