"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/types/discord';
import { supabase } from '@/integrations/supabase/client';
import { PartyPopper, Users, Play, Copy, ArrowRight, Dices } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Avatar } from './Avatar';

interface PataPartyProps {
  currentUser: User;
}

interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  position: number;
}

interface GameState {
  status: 'waiting' | 'playing';
  players: Record<string, PlayerState>;
}

const TOTAL_TILES = 67;

export const PataParty = ({ currentUser }: PataPartyProps) => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Genera un codice casuale di 6 caratteri
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = () => {
    const code = generateCode();
    setRoomCode(code);
    setIsHost(true);
    setGameState({
      status: 'waiting',
      players: {
        [currentUser.id]: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar || '',
          position: 1
        }
      }
    });
  };

  const joinRoom = () => {
    if (!inputCode.trim()) return;
    setRoomCode(inputCode.trim().toUpperCase());
    setIsHost(false);
  };

  const leaveRoom = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    setRoomCode('');
    setGameState(null);
    setIsHost(false);
  };

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`pataparty-${roomCode}`, {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUserIds = Object.keys(state);

        if (isHost) {
          // Il GameMaster rileva nuovi giocatori e li aggiunge alla casella 1
          setGameState(prev => {
            if (!prev) return prev;
            const newPlayers = { ...prev.players };
            let updated = false;

            activeUserIds.forEach(uid => {
              if (!newPlayers[uid]) {
                const userData = state[uid][0] as any;
                newPlayers[uid] = {
                  id: uid,
                  name: userData.name || 'Giocatore',
                  avatar: userData.avatar || '',
                  position: 1
                };
                updated = true;
              }
            });

            const newState = updated ? { ...prev, players: newPlayers } : prev;
            // Invia lo stato aggiornato a tutti
            channel.send({ type: 'broadcast', event: 'SYNC_STATE', payload: newState });
            return newState;
          });
        } else {
          // Se sono un client, dico all'host chi sono appena mi connetto
          channel.send({
            type: 'broadcast',
            event: 'PLAYER_JOINED',
            payload: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
          });
        }
      })
      .on('broadcast', { event: 'SYNC_STATE' }, ({ payload }) => {
        if (!isHost) {
          setGameState(payload);
        }
      })
      .on('broadcast', { event: 'DICE_ROLL' }, ({ payload }) => {
        setDiceResult(payload.result);
        setIsRolling(true);
        setTimeout(() => setIsRolling(false), 1000);
      })
      .on('broadcast', { event: 'PLAYER_JOINED' }, ({ payload }) => {
        if (isHost) {
          setGameState(prev => {
            if (!prev) return prev;
            if (!prev.players[payload.id]) {
              const newState = {
                ...prev,
                players: {
                  ...prev.players,
                  [payload.id]: { ...payload, position: 1 }
                }
              };
              channel.send({ type: 'broadcast', event: 'SYNC_STATE', payload: newState });
              return newState;
            }
            // Se esiste già (era disconnesso e rientrato), re-invio lo stato per sincronizzarlo
            channel.send({ type: 'broadcast', event: 'SYNC_STATE', payload: prev });
            return prev;
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: currentUser.name, avatar: currentUser.avatar });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, isHost, currentUser]);

  const startGame = () => {
    if (!isHost) return;
    const newState: GameState = { ...gameState!, status: 'playing' };
    setGameState(newState);
    channelRef.current?.send({ type: 'broadcast', event: 'SYNC_STATE', payload: newState });
  };

  const movePlayer = (playerId: string, newPosition: number) => {
    if (!isHost || !gameState) return;
    const newState: GameState = {
      ...gameState,
      players: {
        ...gameState.players,
        [playerId]: { ...gameState.players[playerId], position: newPosition }
      }
    };
    setGameState(newState);
    channelRef.current?.send({ type: 'broadcast', event: 'SYNC_STATE', payload: newState });
  };

  const rollDice = () => {
    if (!isHost) return;
    setIsRolling(true);
    const result = Math.floor(Math.random() * 6) + 1;
    setTimeout(() => {
      setDiceResult(result);
      setIsRolling(false);
      channelRef.current?.send({ type: 'broadcast', event: 'DICE_ROLL', payload: { result } });
    }, 1000); // Simulazione durata lancio
  };

  // --- LOGICA DRAG & DROP PER IL TABELLONE ---
  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    if (!isHost) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('playerId', playerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isHost) return;
    e.preventDefault(); // Necessario per consentire il drop
  };

  const handleDrop = (e: React.DragEvent, tileId: number) => {
    if (!isHost) return;
    e.preventDefault();
    const playerId = e.dataTransfer.getData('playerId');
    if (playerId) {
      movePlayer(playerId, tileId);
    }
  };

  // --- GENERAZIONE TABELLONE A SERPENTINA ---
  const generateBoardRows = () => {
    const rows = [];
    let currentId = 1;
    for (let r = 0; r < 7; r++) {
      const rowTiles = [];
      for (let c = 0; c < 10; c++) {
        if (currentId <= TOTAL_TILES) {
          rowTiles.push(currentId);
          currentId++;
        }
      }
      // Le righe dispari (1, 3, 5) vanno da destra a sinistra visivamente per creare l'effetto serpente
      if (r % 2 === 1) {
        rowTiles.reverse();
      }
      rows.push(rowTiles);
    }
    return rows;
  };

  const getTileStyle = (id: number) => {
    const special: Record<number, { color: string, text: string, type: string }> = {
      4: { color: 'bg-[#22c55e]', text: '+2', type: 'bonus' },
      6: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      7: { color: 'bg-[#a855f7]', text: '-1', type: 'malus' },
      11: { color: 'bg-[#a855f7]', text: '-2', type: 'malus' },
      13: { color: 'bg-[#22c55e]', text: '+1', type: 'bonus' },
      14: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      16: { color: 'bg-[#22c55e]', text: 'x2', type: 'bonus' },
      19: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      20: { color: 'bg-[#a855f7]', text: '-2', type: 'malus' },
      24: { color: 'bg-[#22c55e]', text: '+2', type: 'bonus' },
      25: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      28: { color: 'bg-[#a855f7]', text: '-1', type: 'malus' },
      29: { color: 'bg-[#a855f7]', text: '-2', type: 'malus' },
      30: { color: 'bg-[#a855f7]', text: '-3', type: 'malus' },
      31: { color: 'bg-[#a855f7]', text: '-4', type: 'malus' },
      32: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      33: { color: 'bg-[#22c55e]', text: 'x2', type: 'bonus' },
      40: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      41: { color: 'bg-[#22c55e]', text: '+1', type: 'bonus' },
      44: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      46: { color: 'bg-[#22c55e]', text: '+1', type: 'bonus' },
      49: { color: 'bg-[#a855f7]', text: '-1', type: 'malus' },
      54: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      55: { color: 'bg-[#22c55e]', text: '+1', type: 'bonus' },
      57: { color: 'bg-[#a855f7]', text: '-1', type: 'malus' },
      62: { color: 'bg-[#f59e0b]', text: '📖', type: 'rules' },
      67: { color: 'bg-[#fde047]', text: '🏁', type: 'finish' }
    };

    if (special[id]) return special[id];

    // Colori di default stile "gioco dell'oca"
    const defaultColors = ['bg-[#3b82f6]', 'bg-[#ef4444]', 'bg-[#4b5563]'];
    return { color: defaultColors[id % defaultColors.length], text: '', type: 'normal' };
  };

  if (!roomCode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338] p-6 h-full">
        <div className="bg-[#2b2d31] p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <PartyPopper size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">PataParty!</h1>
          <p className="text-[#b5bac1] mb-8">Unisciti agli amici per un gioco dell'oca all'ultimo respiro.</p>

          <div className="space-y-6">
            <button
              onClick={createRoom}
              className="w-full bg-brand hover:bg-[#4752C4] text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-md"
            >
              <Play size={20} />
              Crea Nuova Partita (GameMaster)
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[#3f4147]"></div>
              <span className="flex-shrink-0 mx-4 text-[#949ba4] text-xs font-bold uppercase tracking-wider">Oppure</span>
              <div className="flex-grow border-t border-[#3f4147]"></div>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Inserisci Codice Stanza"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="w-full bg-[#1e1f22] text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand text-center font-mono text-xl uppercase tracking-widest placeholder:text-[#878a91] placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
                maxLength={6}
              />
              <button
                onClick={joinRoom}
                disabled={inputCode.length < 3}
                className="w-full bg-[#3f4147] hover:bg-[#4b4d54] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight size={20} />
                Unisciti alla Partita
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState?.status === 'waiting') {
    const playersList = Object.values(gameState.players);
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338] p-6 h-full">
        <div className="bg-[#2b2d31] p-8 rounded-2xl shadow-xl w-full max-w-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Sala d'Attesa</h2>
            <button onClick={leaveRoom} className="text-[#f23f43] hover:underline text-sm font-medium">Abbandona</button>
          </div>

          <div className="bg-[#1e1f22] p-4 rounded-xl mb-8 flex flex-col items-center justify-center gap-2 border border-[#3f4147]">
            <span className="text-[#b5bac1] text-sm uppercase font-bold tracking-wider">Codice Partita</span>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-mono font-black text-white tracking-[0.2em]">{roomCode}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(roomCode);
                  showSuccess('Codice copiato!');
                }}
                className="p-2 bg-[#2b2d31] hover:bg-[#35373c] rounded-lg text-[#b5bac1] hover:text-white transition-colors"
                title="Copia codice"
              >
                <Copy size={20} />
              </button>
            </div>
            {isHost && <p className="text-xs text-[#23a559] mt-2 font-medium">Sei il GameMaster di questa partita.</p>}
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Users size={18} className="text-[#949ba4]" />
                Giocatori ({playersList.length})
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {playersList.map(p => (
                <div key={p.id} className="bg-[#1e1f22] p-3 rounded-lg flex items-center gap-3">
                  <Avatar src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} className="w-8 h-8" />
                  <span className="text-white font-medium truncate flex-1">{p.name}</span>
                  {p.id === currentUser.id && <span className="text-[10px] bg-brand text-white px-1.5 py-0.5 rounded font-bold">TU</span>}
                </div>
              ))}
              {!isHost && playersList.length === 1 && (
                <div className="col-span-2 text-center text-[#949ba4] text-sm py-4 italic">
                  In attesa di altri giocatori...
                </div>
              )}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              className="w-full bg-[#23a559] hover:bg-[#1f8b4c] text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 text-lg shadow-md"
            >
              Inizia Partita!
            </button>
          ) : (
            <div className="text-center p-4 bg-[#1e1f22] rounded-xl border border-[#3f4147]">
              <div className="animate-pulse flex items-center justify-center gap-2 text-[#b5bac1]">
                <div className="w-2 h-2 bg-brand rounded-full"></div>
                <span className="font-medium">In attesa del GameMaster...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // GAME BOARD VIEW
  const rows = generateBoardRows();
  const players = gameState?.players ? Object.values(gameState.players) : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fef08a] overflow-hidden relative">
      {/* Header Gioco */}
      <div className="bg-[#111214]/90 backdrop-blur-md px-6 py-3 flex items-center justify-between z-20 shadow-lg border-b border-black/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
            <PartyPopper size={20} className="text-pink-400" />
            <span className="text-white font-black tracking-widest text-lg">PATAPARTY</span>
          </div>
          <div className="text-sm font-bold text-white/70 bg-black/30 px-2 py-1 rounded">
            Codice: <span className="text-white font-mono">{roomCode}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Dadi e Controlli GM */}
          {isHost && (
            <div className="flex items-center gap-3 mr-4 border-r border-white/10 pr-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={rollDice}
                  disabled={isRolling}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg font-bold flex items-center gap-2 transition-transform active:scale-90 disabled:opacity-50 shadow-md"
                >
                  <Dices size={20} className={isRolling ? "animate-spin" : ""} />
                  Tira Dado
                </button>
                {diceResult && (
                  <div className={`w-10 h-10 bg-white rounded-lg border-2 border-blue-600 flex items-center justify-center text-xl font-black text-blue-600 shadow-inner ${isRolling ? "opacity-50 scale-90" : "animate-bounce"}`}>
                    {diceResult}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-[-8px]">
            {players.map(p => (
              <div key={p.id} className="relative group cursor-help">
                <Avatar 
                  src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} 
                  className="w-8 h-8 border-2 border-[#111214] -ml-2 hover:z-10 hover:scale-110 transition-transform bg-[#313338]" 
                />
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
          
          <button onClick={leaveRoom} className="ml-4 text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded transition-colors" title="Esci">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Area Tabellone Scrollabile */}
      <div className="flex-1 overflow-auto custom-scrollbar p-8 flex items-center justify-center relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#fef08a] to-[#fde047]">
        
        {/* Istruzioni in background per i giocatori */}
        {!isHost && (
          <div className="absolute bottom-8 right-8 bg-black/40 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/20 shadow-xl z-50 pointer-events-none max-w-[300px]">
            <p className="text-sm font-medium">🎲 In attesa che il GameMaster muova le pedine...</p>
          </div>
        )}

        {/* Griglia Tabellone */}
        <div className="flex flex-col gap-2 max-w-7xl mx-auto drop-shadow-2xl">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="flex justify-center gap-2">
              {row.map((tileId) => {
                const style = getTileStyle(tileId);
                const playersOnTile = players.filter(p => p.position === tileId);
                
                return (
                  <div
                    key={tileId}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tileId)}
                    className={`
                      relative w-20 h-24 rounded-lg flex flex-col items-center justify-between p-1.5 border-[3px] border-black/80
                      ${style.color} shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_4px_0_rgba(0,0,0,0.2)]
                      transition-transform duration-200
                      ${isHost ? 'hover:scale-105 hover:z-10' : ''}
                    `}
                  >
                    {/* Numero Casella */}
                    <div className="self-end text-white/90 font-black text-sm drop-shadow-md bg-black/20 px-1 rounded-sm leading-none">
                      {tileId.toString().padStart(2, '0')}
                    </div>

                    {/* Testo Speciale (Es. +2, 📖) */}
                    {style.text && (
                      <div className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black drop-shadow-lg pointer-events-none
                        ${style.type === 'rules' ? 'text-3xl' : 'text-2xl text-white'}
                        ${style.type === 'finish' ? 'text-4xl' : ''}
                      `}>
                        {style.text}
                      </div>
                    )}

                    {/* Pedine dei Giocatori */}
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 p-1 pointer-events-none">
                      {playersOnTile.map(p => (
                        <div 
                          key={p.id}
                          draggable={isHost}
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          className={`
                            pointer-events-auto transition-all duration-300
                            ${isHost ? 'cursor-grab active:cursor-grabbing hover:scale-125 hover:z-20 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]' : ''}
                          `}
                          style={{
                            // Un pizzico di randomizzazione per non sovrapporli perfettamente se sono in tanti
                            transform: playersOnTile.length > 1 ? `translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 8}px)` : 'none'
                          }}
                          title={p.name}
                        >
                          <Avatar 
                            src={p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} 
                            className="w-7 h-7 border-[2px] border-white bg-[#313338] shadow-lg" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};