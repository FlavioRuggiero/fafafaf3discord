"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { playSound } from "@/utils/sounds";
import { Crown, Users, Play, Minimize2, LogOut, Info, Dices, Plus, Minus, Image as ImageIcon, BookOpen, X, Globe, Megaphone, Trophy, MessageSquare, BarChart2, Dice5, Trash2, HelpCircle, Upload, CheckCircle2, Save, Edit2 } from "lucide-react";
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
  lastRoll?: number | string | number[] | string[] | null;
  specialDice?: string[];
  defaultDiceId?: string | null;
  money?: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  isOpen: boolean;
}

interface CustomDiceDef {
  id: string;
  name: string;
  description: string;
  faces: string[];
}

interface IndovinaCharacter {
  id: string;
  name: string;
  imageUrl: string;
  creatorId: string;
}

interface IndovinaPreset {
  id: string;
  name: string;
  creator_id: string;
  characters: IndovinaCharacter[];
  created_at: string;
}

interface GameState {
  status: 'lobby' | 'playing';
  gameMode: 'board' | 'indovina';
  players: Player[];
  activePlayerId?: string | null;
  boardUrl?: string;
  rules?: string;
  iframeUrl?: string | null;
  isIframeActive?: boolean;
  announcement?: string | null;
  leaderboard?: {
    title: string;
    description: string;
    winners: Player[];
  } | null;
  chatMessages?: ChatMessage[];
  isCommercial?: boolean;
  poll?: Poll | null;
  customDice?: CustomDiceDef[];

  // IndovinaQualchì State
  indovinaPhase?: 'setup' | 'draft' | 'ready' | 'playing' | 'gameover';
  indovinaSettings?: { charsPerPlayer: number };
  indovinaCharacters?: IndovinaCharacter[];
  indovinaSecretChars?: Record<string, string>;
  indovinaTurn?: string | null;
}

interface DiceState {
  playerId: string;
  result: number | string | number[] | string[];
  rolling: boolean;
  diceType?: string;
}

const BUILTIN_DICE = [
  { id: 'ebete', label: 'Ebete (1,1,6)', color: 'text-[#f23f43]', bgClass: 'bg-[#f23f43] border-[#da373c]' },
  { id: 'vigilante', label: 'Vigilante (3,4,5)', color: 'text-[#3b82f6]', bgClass: 'bg-[#3b82f6] border-[#2563eb]' },
  { id: 'frazionario', label: 'Frazionario', color: 'text-[#a855f7]', bgClass: 'bg-[#a855f7] border-[#9333ea]' },
  { id: 'doppio', label: 'Doppio', color: 'text-[#eab308]', bgClass: 'bg-[#eab308] border-[#ca8a04]' },
  { id: 'triplo', label: 'Triplo', color: 'text-[#14b8a6]', bgClass: 'bg-[#14b8a6] border-[#0d9488]' },
  { id: 'scintilla', label: 'Scintilla (6-10)', color: 'text-[#ec4899]', bgClass: 'bg-[#ec4899] border-[#db2777]' },
  { id: 'carismatico', label: 'Carismatico', color: 'text-[#f59e0b]', bgClass: 'bg-[#f59e0b] border-[#d97706]' },
  { id: 'negativo', label: 'Negativo (-1 a -6)', color: 'text-[#9ca3af]', bgClass: 'bg-[#6b7280] border-[#4b5563]' },
  { id: 'alfabetico', label: 'Alfabetico', color: 'text-[#8b5cf6]', bgClass: 'bg-[#8b5cf6] border-[#7c3aed]' },
  { id: 'scambio', label: 'Scambio', color: 'text-[#10b981]', bgClass: 'bg-[#10b981] border-[#059669]' },
];

const Dice = ({ value, rolling, diceType, size = 'md', players, customDiceDef }: { value: number | string | number[] | string[], rolling: boolean, diceType?: string, size?: 'md' | 'sm', players?: Player[], customDiceDef?: CustomDiceDef[] }) => {
  const [displayValue, setDisplayValue] = useState<number | string | number[] | string[]>(value);
  
  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        if (diceType === 'ebete') setDisplayValue([1, 1, 6][Math.floor(Math.random() * 3)]);
        else if (diceType === 'vigilante') setDisplayValue([3, 4, 5][Math.floor(Math.random() * 3)]);
        else if (diceType === 'frazionario') setDisplayValue([1.5, 2.5, 3.5][Math.floor(Math.random() * 3)]);
        else if (diceType === 'carismatico') setDisplayValue(['😂', '😅', '😎', '😑', '🤑', '🥵', '😱'][Math.floor(Math.random() * 7)]);
        else if (diceType === 'negativo') setDisplayValue(-(Math.floor(Math.random() * 6) + 1));
        else if (diceType === 'scambio' && players && players.length > 0) setDisplayValue(players[Math.floor(Math.random() * players.length)].id);
        else if (diceType === 'doppio') setDisplayValue([Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 4) + 1]);
        else if (diceType === 'scintilla') setDisplayValue(Math.floor(Math.random() * 5) + 6);
        else if (diceType === 'triplo') setDisplayValue([Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 3) + 1]);
        else if (diceType === 'alfabetico') {
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          setDisplayValue([
            letters[Math.floor(Math.random() * 26)],
            letters[Math.floor(Math.random() * 26)],
            letters[Math.floor(Math.random() * 26)]
          ]);
        }
        else if (diceType?.startsWith('custom_') && customDiceDef) {
          const custom = customDiceDef.find(d => d.id === diceType);
          if (custom && custom.faces.length > 0) {
            setDisplayValue(custom.faces[Math.floor(Math.random() * custom.faces.length)]);
          } else {
            setDisplayValue(Math.floor(Math.random() * 6) + 1);
          }
        }
        else setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [rolling, value, diceType, players, customDiceDef]);

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

  const isScambio = diceType === 'scambio';
  const isSm = size === 'sm';
  const containerClasses = isSm 
    ? 'w-10 h-10 bg-white rounded-xl border-2 border-gray-200 p-1 flex items-center justify-center overflow-hidden shadow-sm' 
    : 'w-24 h-24 bg-white rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.7)] border-4 border-gray-200 p-3 flex items-center justify-center overflow-hidden';

  const vals = Array.isArray(displayValue) ? displayValue : [displayValue];

  return (
    <div className={`flex gap-1.5 flex-wrap justify-center ${rolling ? 'animate-dice-spin' : 'animate-dice-pop'}`}>
      {vals.map((v, idx) => {
        const isInteger1to6 = typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 6;
        const targetPlayer = isScambio ? players?.find(p => p.id === v) : null;
        
        return (
          <div key={idx} className={containerClasses}>
            {isInteger1to6 ? (
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[2px]">
                {dotPositions[v as number]?.map((pos, i) => (
                  <div key={i} className={`${isSm ? 'w-1.5 h-1.5' : 'w-4 h-4'} bg-[#111214] rounded-full place-self-center shadow-inner ${getDotClass(pos)}`} />
                ))}
              </div>
            ) : isScambio && targetPlayer ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-0.5">
                <Avatar src={targetPlayer.avatar} decoration={targetPlayer.avatar_decoration} className={`${isSm ? 'w-7 h-7' : 'w-16 h-16'} object-cover`} />
              </div>
            ) : (
              <span className={`${isSm ? 'text-xl' : 'text-3xl'} font-black text-[#111214] text-center overflow-hidden text-ellipsis whitespace-nowrap px-1`}>{v}</span>
            )}
          </div>
        );
      })}
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
  const [isCommercialMode, setIsCommercialMode] = useState(false);
  const [isCommercial, setIsCommercial] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<'board' | 'indovina'>('board');
  const [activeGameMode, setActiveGameMode] = useState<'board' | 'indovina'>('board');
  const [gmTab, setGmTab] = useState<'players' | 'tools'>('players');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [boardUrl, setBoardUrl] = useState<string>('/pataparty-board.png');
  const [boardUrlInput, setBoardUrlInput] = useState<string>('');
  
  // Iframe Globale
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isIframeActive, setIsIframeActive] = useState<boolean>(false);
  const [iframeInput, setIframeInput] = useState<string>('');

  // Annunci, Classifica, Sondaggi, Dadi Custom
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [announcementInput, setAnnouncementInput] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<GameState['leaderboard']>(null);
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [customDice, setCustomDice] = useState<CustomDiceDef[]>([]);

  // Stati Chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // IndovinaQualchì State
  const [indovinaPhase, setIndovinaPhase] = useState<'setup' | 'draft' | 'ready' | 'playing' | 'gameover'>('setup');
  const [indovinaSettings, setIndovinaSettings] = useState({ charsPerPlayer: 12 });
  const [indovinaCharacters, setIndovinaCharacters] = useState<IndovinaCharacter[]>([]);
  const [indovinaSecretChars, setIndovinaSecretChars] = useState<Record<string, string>>({});
  const [indovinaTurn, setIndovinaTurn] = useState<string | null>(null);
  const [eliminatedChars, setEliminatedChars] = useState<string[]>([]);

  // IndovinaQualchì Setup & Presets
  const [setupTab, setSetupTab] = useState<'create' | 'presets'>('create');
  const [indovinaPresets, setIndovinaPresets] = useState<IndovinaPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);

  // IndovinaQualchì Form Upload
  const [indovinaCharName, setIndovinaCharName] = useState('');
  const [indovinaCharUrl, setIndovinaCharUrl] = useState('');
  const [indovinaCharFile, setIndovinaCharFile] = useState<File | null>(null);
  const [isUploadingChar, setIsUploadingChar] = useState(false);
  const indovinaFileInputRef = useRef<HTMLInputElement>(null);

  // Stati Builder Classifica e Soldi
  const [lbTitle, setLbTitle] = useState('Risultati Finali');
  const [lbDesc, setLbDesc] = useState('Ecco i vincitori di questo minigioco!');
  const [lbWinners, setLbWinners] = useState<string[]>([]);
  const [lbPlayerSelect, setLbPlayerSelect] = useState('');
  const [moneyAmounts, setMoneyAmounts] = useState<Record<string, string>>({});

  // Stati Builder Sondaggio
  const [pollQuestionInput, setPollQuestionInput] = useState('');
  const [pollOptionsInput, setPollOptionsInput] = useState<string[]>(['', '']);

  // Stati Builder Dado Custom
  const [customDiceName, setCustomDiceName] = useState('');
  const [customDiceDesc, setCustomDiceDesc] = useState('');
  const [customDiceFaces, setCustomDiceFaces] = useState('');

  const [diceState, setDiceState] = useState<DiceState | null>(null);
  const [savedGame, setSavedGame] = useState<{code: string, isHost: boolean} | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // Regole State
  const [showRules, setShowRules] = useState(false);
  const [rulesText, setRulesText] = useState("");

  const boardRef = useRef<HTMLDivElement>(null);
  const lastSyncRef = useRef<number>(0);
  const channelRef = useRef<any>(null);

  // Refs per evitare stale closures
  const isHostRef = useRef(isHost);
  const savedGameRef = useRef(savedGame);
  const gameCodeRef = useRef(gameCode);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { savedGameRef.current = savedGame; }, [savedGame]);
  useEffect(() => { gameCodeRef.current = gameCode; }, [gameCode]);

  const stateRef = useRef<GameState>({ status: 'lobby', gameMode: 'board', players: [], activePlayerId: null, boardUrl: '/pataparty-board.png', rules: '', iframeUrl: null, isIframeActive: false, announcement: null, leaderboard: null, chatMessages: [], isCommercial: false, poll: null, customDice: [], indovinaPhase: 'setup', indovinaSettings: { charsPerPlayer: 12 }, indovinaCharacters: [], indovinaSecretChars: {}, indovinaTurn: null });

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

  useEffect(() => {
    if (showChat && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, showChat]);

  useEffect(() => {
    if (showChat) setUnreadChat(false);
  }, [showChat]);

  // Fetch presets when in setup phase
  useEffect(() => {
    const fetchPresets = async () => {
      const { data, error } = await supabase.from('indovina_presets').select('*').order('created_at', { ascending: false });
      if (data) setIndovinaPresets(data);
    };

    if (isHost && activeGameMode === 'indovina' && indovinaPhase === 'setup') {
      fetchPresets();
    }
  }, [indovinaPhase, isHost, activeGameMode]);

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
    setActiveGameMode(stateRef.current.gameMode || 'board');
    setActivePlayerId(stateRef.current.activePlayerId || null);
    setBoardUrl(stateRef.current.boardUrl || '/pataparty-board.png');
    setIframeUrl(stateRef.current.iframeUrl || null);
    setIsIframeActive(stateRef.current.isIframeActive || false);
    setAnnouncement(stateRef.current.announcement || null);
    setLeaderboard(stateRef.current.leaderboard || null);
    setChatMessages(stateRef.current.chatMessages || []);
    setIsCommercial(stateRef.current.isCommercial || false);
    setPollData(stateRef.current.poll || null);
    setCustomDice(stateRef.current.customDice || []);
    
    // Indovina State
    setIndovinaPhase(stateRef.current.indovinaPhase || 'setup');
    setIndovinaSettings(stateRef.current.indovinaSettings || { charsPerPlayer: 12 });
    setIndovinaCharacters(stateRef.current.indovinaCharacters || []);
    setIndovinaSecretChars(stateRef.current.indovinaSecretChars || {});
    setIndovinaTurn(stateRef.current.indovinaTurn || null);

    if (isHostRef.current || (savedGameRef.current && savedGameRef.current.isHost)) {
      const codeToSave = gameCodeRef.current || savedGameRef.current?.code;
      if (codeToSave) {
        localStorage.setItem(`pataparty_state_${codeToSave}`, JSON.stringify(stateRef.current));
      }
    }
    channelRef.current?.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
  };

  // IndovinaQualchì Centralized Logic (Per far funzionare bene l'Host)
  const handleAddCharacterLogic = (char: IndovinaCharacter) => {
    if (!isHostRef.current) return;
    
    // Se stiamo modificando un personaggio, rimpiazzalo invece di aggiungerlo
    if (editingCharId) {
      stateRef.current.indovinaCharacters = stateRef.current.indovinaCharacters?.map(c => 
        c.id === editingCharId ? char : c
      ) || [];
      setEditingCharId(null);
    } else {
      stateRef.current.indovinaCharacters = [...(stateRef.current.indovinaCharacters || []), char];
    }
    
    // Se stiamo modificando un preset intero, non forzare il passaggio automatico alla fase 'ready'
    if (!editingPresetId) {
      const playerCount = stateRef.current.players.length;
      const maxChars = (stateRef.current.indovinaSettings?.charsPerPlayer || 12) * playerCount;
      
      if (stateRef.current.indovinaCharacters.length >= maxChars) {
        stateRef.current.indovinaPhase = 'ready';
        stateRef.current.indovinaTurn = null;
      } else {
        // Alterna il turno di creazione tra i giocatori se non in edit mode
        const currTurn = stateRef.current.indovinaTurn;
        const currIndex = stateRef.current.players.findIndex(p => p.id === currTurn);
        const nextIndex = (currIndex + 1) % playerCount;
        stateRef.current.indovinaTurn = stateRef.current.players[nextIndex].id;
      }
    }
    
    syncState();
  };

  const startIndovinaMatch = async (presetName?: string) => {
    if (!isHost) return;
    
    if (presetName && presetName.trim()) {
      if (editingPresetId) {
        // Aggiorna preset esistente
        const { error } = await supabase.from('indovina_presets').update({
           name: presetName.trim(),
           characters: stateRef.current.indovinaCharacters
        }).eq('id', editingPresetId);
        
        if (error) {
          console.error("Errore aggiornamento preset:", error);
          showError("Errore nell'aggiornamento del preset.");
        } else {
          showSuccess("Preset aggiornato con successo!");
        }
      } else {
        // Crea nuovo preset
        const { error } = await supabase.from('indovina_presets').insert({
           name: presetName.trim(),
           creator_id: user?.id,
           characters: stateRef.current.indovinaCharacters
        });
        
        if (error) {
          console.error("Errore salvataggio preset:", error);
          showError("Errore nel salvataggio del preset.");
        } else {
          showSuccess("Preset salvato con successo!");
        }
      }
    }
    
    const allChars = stateRef.current.indovinaCharacters || [];
    
    if (stateRef.current.players.length >= 2 && allChars.length > 0) {
      stateRef.current.indovinaPhase = 'playing';
      
      const secrets: Record<string, string> = {};
      stateRef.current.players.forEach(p => {
        secrets[p.id] = allChars[Math.floor(Math.random() * allChars.length)].id;
      });
      
      stateRef.current.indovinaSecretChars = secrets;
      stateRef.current.indovinaTurn = stateRef.current.players[0].id;
      syncState();
    }
  };

  const handlePassTurnLogic = () => {
    if (!isHostRef.current) return;
    const currTurn = stateRef.current.indovinaTurn;
    const currIndex = stateRef.current.players.findIndex(p => p.id === currTurn);
    const nextIndex = (currIndex + 1) % stateRef.current.players.length;
    stateRef.current.indovinaTurn = stateRef.current.players[nextIndex].id;
    syncState();
  };

  const startGameWithPreset = () => {
    if (!isHost) return;
    const preset = indovinaPresets.find(p => p.id === selectedPresetId);
    if (!preset) {
       showError("Seleziona un preset valido.");
       return;
    }
    if (stateRef.current.players.length < 2 || stateRef.current.players.length > 4) {
       showError("Servono da 2 a 4 giocatori.");
       return;
    }

    stateRef.current.indovinaCharacters = preset.characters;
    
    stateRef.current.indovinaPhase = 'playing';
    
    const secrets: Record<string, string> = {};
    stateRef.current.players.forEach(p => {
      secrets[p.id] = preset.characters[Math.floor(Math.random() * preset.characters.length)].id;
    });
    
    stateRef.current.indovinaSecretChars = secrets;
    stateRef.current.indovinaTurn = stateRef.current.players[0].id;
    
    syncState();
    showSuccess("Partita avviata con il preset!");
  };

  const editSelectedPreset = () => {
    if (!isHost) return;
    const preset = indovinaPresets.find(p => p.id === selectedPresetId);
    if (!preset) {
       showError("Seleziona un preset valido.");
       return;
    }
    setEditingPresetId(preset.id);
    setPresetNameInput(preset.name);
    stateRef.current.indovinaCharacters = [...preset.characters];
    stateRef.current.indovinaPhase = 'draft';
    syncState();
  };

  const deleteIndovinaChar = (charId: string) => {
    if (!isHost) return;
    stateRef.current.indovinaCharacters = stateRef.current.indovinaCharacters?.filter(c => c.id !== charId) || [];
    syncState();
  };

  const startEditIndovinaChar = (char: IndovinaCharacter) => {
    if (!isHost) return;
    setEditingCharId(char.id);
    setIndovinaCharName(char.name);
    setIndovinaCharUrl(char.imageUrl);
  };

  const cancelEditIndovinaChar = () => {
    setEditingCharId(null);
    setIndovinaCharName('');
    setIndovinaCharUrl('');
    setIndovinaCharFile(null);
  };

  const handleDiceRoll = (playerId: string, result: number | string | number[] | string[], diceType?: string) => {
    playSound('/openingsound.mp3');
    setDiceState({ playerId, result, rolling: true, diceType });
    setTimeout(() => {
      setDiceState(prev => prev ? { ...prev, rolling: false } : null);
    }, 1500); 
    setTimeout(() => {
      setDiceState(null);
    }, 5000); 
  };

  const handleUpdateMoney = (playerId: string, amount: number) => {
    if (!isHost) return;
    const pIndex = stateRef.current.players.findIndex(p => p.id === playerId);
    if (pIndex !== -1) {
      const current = stateRef.current.players[pIndex].money || 0;
      stateRef.current.players[pIndex].money = current + amount;
      syncState();
    }
  };

  const setDefaultDice = (playerId: string, diceId: string | null) => {
    if (!isHost) return;
    const pIndex = stateRef.current.players.findIndex(p => p.id === playerId);
    if (pIndex !== -1) {
      stateRef.current.players[pIndex].defaultDiceId = diceId;
      syncState();
      showSuccess("Dado predefinito aggiornato.");
    }
  };

  const getDiceInfo = (type: string | null | undefined) => {
    if (!type || type === 'standard') return { label: 'Dado Normale', desc: 'Può uscire da 1 a 6', shortLabel: '', bgClass: 'bg-white border-gray-300 text-[#111214]' };
    
    const builtin = BUILTIN_DICE.find(d => d.id === type);
    if (builtin) {
      const desc = type === 'ebete' ? 'Può uscire 1, 1 o 6' : type === 'vigilante' ? 'Può uscire 3, 4 o 5' : type === 'frazionario' ? 'Può uscire 1.5, 2.5 o 3.5' : type === 'carismatico' ? 'Può uscire 😂😅😎😑🤑🥵😱' : type === 'doppio' ? 'Tira due dadi da 1 a 4' : type === 'negativo' ? 'Può uscire da -1 a -6' : type === 'scintilla' ? 'Può uscire da 6 a 10' : type === 'triplo' ? 'Tira tre dadi da 1 a 3' : type === 'alfabetico' ? 'Escono 3 lettere a caso' : 'Può uscire un giocatore a caso';
      let shortLabel = type.substring(0,2).toUpperCase();
      if (type === 'scambio') shortLabel = 'SC';
      if (type === 'scintilla') shortLabel = 'ST';
      if (type === 'triplo') shortLabel = 'TR';
      if (type === 'alfabetico') shortLabel = 'AL';
      if (type === 'doppio') shortLabel = 'DP';
      return { label: builtin.label, desc, shortLabel, bgClass: builtin.bgClass + ' text-white' };
    }

    if (type.startsWith('custom_')) {
      const custom = stateRef.current.customDice?.find(d => d.id === type);
      if (custom) return { label: custom.name, desc: custom.description, shortLabel: custom.name.substring(0,2).toUpperCase(), bgClass: 'bg-[#0ea5e9] border-[#0284c7] text-white' };
    }

    return { label: 'Dado Sconosciuto', desc: '?', shortLabel: '?', bgClass: 'bg-gray-500 border-gray-600 text-white' };
  };

  const getDiceResult = (type: string) => {
    if (type === 'ebete') return [1, 1, 6][Math.floor(Math.random() * 3)];
    if (type === 'vigilante') return [3, 4, 5][Math.floor(Math.random() * 3)];
    if (type === 'frazionario') return [1.5, 2.5, 3.5][Math.floor(Math.random() * 3)];
    if (type === 'carismatico') return ['😂', '😅', '😎', '😑', '🤑', '🥵', '😱'][Math.floor(Math.random() * 7)];
    if (type === 'negativo') return -(Math.floor(Math.random() * 6) + 1);
    if (type === 'scambio') return stateRef.current.players[Math.floor(Math.random() * stateRef.current.players.length)].id;
    if (type === 'doppio') return [Math.floor(Math.random() * 4) + 1, Math.floor(Math.random() * 4) + 1];
    if (type === 'scintilla') return Math.floor(Math.random() * 5) + 6;
    if (type === 'triplo') return [Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 3) + 1, Math.floor(Math.random() * 3) + 1];
    if (type === 'alfabetico') {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return [
        letters[Math.floor(Math.random() * 26)],
        letters[Math.floor(Math.random() * 26)],
        letters[Math.floor(Math.random() * 26)]
      ];
    }
    if (type.startsWith('custom_')) {
      const custom = stateRef.current.customDice?.find(d => d.id === type);
      if (custom && custom.faces.length > 0) return custom.faces[Math.floor(Math.random() * custom.faces.length)];
    }
    return Math.floor(Math.random() * 6) + 1;
  };

  const rollDice = (diceType?: string, isConsumable: boolean = false) => {
    const me = players.find(p => p.id === user?.id);
    const actualType = diceType || me?.defaultDiceId || 'standard';
    
    if (activePlayerId !== user?.id || diceState?.rolling) return;
    
    const result = getDiceResult(actualType);

    handleDiceRoll(user.id, result, actualType);
    channelRef.current?.send({ 
      type: 'broadcast', 
      event: 'dice_roll', 
      payload: { playerId: user.id, result, diceType: actualType, isConsumable } 
    });
    setActivePlayerId(null);
  };

  // Setup Host
  const setupHostChannel = (code: string) => {
    const channel = supabase.channel(`pataparty_${code}`);
    
    channel.on('broadcast', { event: 'join_request' }, (payload) => {
      const newPlayer = payload.payload;
      if (!stateRef.current.players.find(p => p.id === newPlayer.id)) {
        
        // Controllo Limite Giocatori per IndovinaQualchì
        if (stateRef.current.gameMode === 'indovina' && stateRef.current.players.length >= 4) {
          channel.send({ type: 'broadcast', event: 'error_msg', payload: { targetId: newPlayer.id, msg: 'Partita IndovinaQualchì piena! (Massimo 4 giocatori)' } });
          return;
        }

        stateRef.current.players.push({ 
          ...newPlayer, 
          x: 50, 
          y: 50, 
          lastRoll: null, 
          specialDice: [],
          defaultDiceId: null,
          money: stateRef.current.isCommercial ? 0 : undefined 
        });
        syncState();
        showSuccess(`${newPlayer.name} si è unito!`);
      } else {
        channel.send({ type: 'broadcast', event: 'state_update', payload: stateRef.current });
      }
    });

    channel.on('broadcast', { event: 'dice_roll' }, (payload) => {
      const { playerId, result, diceType, isConsumable } = payload.payload;
      handleDiceRoll(playerId, result, diceType);
      
      const pIndex = stateRef.current.players.findIndex(p => p.id === playerId);
      if (pIndex !== -1) {
        stateRef.current.players[pIndex].lastRoll = result;
        if (isConsumable && diceType) {
          const diceArr = stateRef.current.players[pIndex].specialDice || [];
          const dIndex = diceArr.indexOf(diceType);
          if (dIndex !== -1) diceArr.splice(dIndex, 1);
          stateRef.current.players[pIndex].specialDice = diceArr;
        }
        stateRef.current.activePlayerId = null;
        syncState();
      }
    });

    channel.on('broadcast', { event: 'chat_message' }, (payload) => {
      const msg = payload.payload;
      stateRef.current.chatMessages = [...(stateRef.current.chatMessages || []), msg];
      setChatMessages(stateRef.current.chatMessages);
      if (!showChat) setUnreadChat(true);
    });

    channel.on('broadcast', { event: 'vote_poll' }, (payload) => {
      const { playerId, optionIndex } = payload.payload;
      if (stateRef.current.poll && stateRef.current.poll.isOpen) {
        stateRef.current.poll.votes[playerId] = optionIndex;
        syncState();
      }
    });

    // Indovina Events (Host gestisce il broadcast di un giocatore)
    channel.on('broadcast', { event: 'indovina_add_char' }, (payload) => {
      handleAddCharacterLogic(payload.payload.char);
    });

    channel.on('broadcast', { event: 'indovina_pass_turn' }, () => {
      handlePassTurnLogic();
    });

    channel.subscribe();
    channelRef.current = channel;
  };

  // Setup Player
  const setupPlayerChannel = (code: string) => {
    const channel = supabase.channel(`pataparty_${code}`);
    
    channel.on('broadcast', { event: 'state_update' }, (payload) => {
      const state = payload.payload as GameState;
      stateRef.current = state;
      setPlayers(state.players);
      setActiveGameMode(state.gameMode || 'board');
      setActivePlayerId(state.activePlayerId || null);
      setBoardUrl(state.boardUrl || '/pataparty-board.png');
      setRulesText(state.rules || '');
      setIframeUrl(state.iframeUrl || null);
      setIsIframeActive(state.isIframeActive || false);
      setAnnouncement(state.announcement || null);
      setLeaderboard(state.leaderboard || null);
      setChatMessages(state.chatMessages || []);
      setIsCommercial(state.isCommercial || false);
      setPollData(state.poll || null);
      setCustomDice(state.customDice || []);
      
      setIndovinaPhase(state.indovinaPhase || 'setup');
      setIndovinaSettings(state.indovinaSettings || { charsPerPlayer: 12 });
      setIndovinaCharacters(state.indovinaCharacters || []);
      setIndovinaSecretChars(state.indovinaSecretChars || {});
      setIndovinaTurn(state.indovinaTurn || null);

      if (state.status === 'playing' && view !== 'playing') setView('playing');
    });

    channel.on('broadcast', { event: 'dice_roll' }, (payload) => {
      const { playerId, result, diceType } = payload.payload;
      handleDiceRoll(playerId, result, diceType);
    });

    channel.on('broadcast', { event: 'chat_message' }, (payload) => {
      const msg = payload.payload;
      stateRef.current.chatMessages = [...(stateRef.current.chatMessages || []), msg];
      setChatMessages(stateRef.current.chatMessages);
      if (!showChat) setUnreadChat(true);
    });

    channel.on('broadcast', { event: 'error_msg' }, (payload) => {
      if (payload.payload.targetId === user?.id) {
        showError(payload.payload.msg);
        abandonSavedGame();
      }
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
    setActiveGameMode(selectedGameMode);
    setBoardUrl('/pataparty-board.png');
    setRulesText('');
    setIframeUrl(null);
    setIsIframeActive(false);
    setAnnouncement(null);
    setLeaderboard(null);
    setPollData(null);
    setChatMessages([]);
    setUnreadChat(false);
    setShowChat(false);
    setIsCommercial(isCommercialMode);
    setCustomDice([]);
    setGmTab('players');
    setEliminatedChars([]);
    setEditingPresetId(null);
    setEditingCharId(null);
    
    const activeObj = { code, isHost: true };
    setSavedGame(activeObj);
    localStorage.setItem(`pataparty_active_game_${user!.id}`, JSON.stringify(activeObj));

    const hostPlayer: Player = {
      id: user!.id,
      name: profile?.first_name || 'Tu',
      avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user!.id}`,
      avatar_decoration: profile?.avatar_decoration || null,
      x: 50,
      y: 50,
      lastRoll: null,
      specialDice: [],
      defaultDiceId: null,
      money: isCommercialMode ? 0 : undefined
    };

    stateRef.current = { 
      status: 'lobby', 
      gameMode: selectedGameMode,
      players: [hostPlayer], 
      activePlayerId: null, 
      boardUrl: '/pataparty-board.png', 
      rules: '', 
      iframeUrl: null, 
      isIframeActive: false, 
      announcement: null, 
      leaderboard: null, 
      chatMessages: [],
      isCommercial: isCommercialMode,
      poll: null,
      customDice: [],
      indovinaPhase: 'setup',
      indovinaSettings: { charsPerPlayer: 12 },
      indovinaCharacters: [],
      indovinaSecretChars: {},
      indovinaTurn: null
    };
    localStorage.setItem(`pataparty_state_${code}`, JSON.stringify(stateRef.current));
    setPlayers([hostPlayer]);
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
    setChatMessages([]);
    setUnreadChat(false);
    setShowChat(false);
    setEliminatedChars([]);
    setEditingPresetId(null);
    setEditingCharId(null);

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
    setUnreadChat(false);
    setShowChat(false);
    
    if (savedGame.isHost) {
      const storedState = localStorage.getItem(`pataparty_state_${savedGame.code}`);
      if (storedState) {
        try {
          stateRef.current = JSON.parse(storedState);
        } catch(e) {
          stateRef.current = { status: 'lobby', gameMode: 'board', players: [], activePlayerId: null, boardUrl: '/pataparty-board.png', rules: '', iframeUrl: null, isIframeActive: false, announcement: null, leaderboard: null, chatMessages: [], isCommercial: false, poll: null, customDice: [], indovinaPhase: 'setup', indovinaSettings: {charsPerPlayer: 12}, indovinaCharacters: [], indovinaSecretChars: {}, indovinaTurn: null };
        }
      } else {
        stateRef.current = { status: 'lobby', gameMode: 'board', players: [], activePlayerId: null, boardUrl: '/pataparty-board.png', rules: '', iframeUrl: null, isIframeActive: false, announcement: null, leaderboard: null, chatMessages: [], isCommercial: false, poll: null, customDice: [], indovinaPhase: 'setup', indovinaSettings: {charsPerPlayer: 12}, indovinaCharacters: [], indovinaSecretChars: {}, indovinaTurn: null };
      }
      
      // Assicurati che l'host sia nei players se c'è stato un problema di salvataggio
      if (!stateRef.current.players.some(p => p.id === user.id)) {
        stateRef.current.players.push({
          id: user.id,
          name: profile?.first_name || 'Tu',
          avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          avatar_decoration: profile?.avatar_decoration || null,
          x: 50, y: 50, specialDice: [], defaultDiceId: null, money: stateRef.current.isCommercial ? 0 : undefined
        });
      }

      setPlayers(stateRef.current.players);
      setActiveGameMode(stateRef.current.gameMode || 'board');
      setActivePlayerId(stateRef.current.activePlayerId || null);
      setBoardUrl(stateRef.current.boardUrl || '/pataparty-board.png');
      setRulesText(stateRef.current.rules || '');
      setIframeUrl(stateRef.current.iframeUrl || null);
      setIsIframeActive(stateRef.current.isIframeActive || false);
      setAnnouncement(stateRef.current.announcement || null);
      setLeaderboard(stateRef.current.leaderboard || null);
      setChatMessages(stateRef.current.chatMessages || []);
      setIsCommercial(stateRef.current.isCommercial || false);
      setPollData(stateRef.current.poll || null);
      setCustomDice(stateRef.current.customDice || []);
      
      setIndovinaPhase(stateRef.current.indovinaPhase || 'setup');
      setIndovinaSettings(stateRef.current.indovinaSettings || { charsPerPlayer: 12 });
      setIndovinaCharacters(stateRef.current.indovinaCharacters || []);
      setIndovinaSecretChars(stateRef.current.indovinaSecretChars || {});
      setIndovinaTurn(stateRef.current.indovinaTurn || null);

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
    setShowRules(false);
    setIsIframeActive(false);
    setAnnouncement(null);
    setLeaderboard(null);
    setPollData(null);
    setChatMessages([]);
    setShowChat(false);
    setIsCommercialMode(false);
    setIsCommercial(false);
    setCustomDice([]);
    setEliminatedChars([]);
    setEditingPresetId(null);
    setEditingCharId(null);
  };

  const startGame = () => {
    if (!isHost) return;
    stateRef.current.status = 'playing';
    syncState();
    setView('playing');
  };

  // Indovina Game Handlers
  const startIndovinaDraft = () => {
    if (!isHost) return;
    if (stateRef.current.players.length < 2 || stateRef.current.players.length > 4) {
      showError("Servono da 2 a 4 giocatori per avviare IndovinaQualchì.");
      return;
    }
    stateRef.current.indovinaPhase = 'draft';
    // Il turno inizia con l'Host
    stateRef.current.indovinaTurn = stateRef.current.players[0].id;
    stateRef.current.indovinaCharacters = [];
    syncState();
  };

  const handleIndovinaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIndovinaCharFile(e.target.files[0]);
    }
  };

  const submitIndovinaChar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !indovinaCharName.trim()) return;
    if (!indovinaCharFile && !indovinaCharUrl.trim()) {
      showError("Seleziona un'immagine o inserisci un URL.");
      return;
    }

    setIsUploadingChar(true);
    let finalUrl = indovinaCharUrl.trim();

    if (indovinaCharFile) {
      const fileExt = indovinaCharFile.name.split('.').pop();
      const fileName = `indovina_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `minigame_icons/${fileName}`; // Usiamo lo stesso bucket
      
      const { error } = await supabase.storage.from('icons').upload(filePath, indovinaCharFile);
      if (!error) {
        const { data } = supabase.storage.from('icons').getPublicUrl(filePath);
        finalUrl = data.publicUrl;
      } else {
        showError("Errore nel caricamento dell'immagine.");
        setIsUploadingChar(false);
        return;
      }
    }

    const newChar: IndovinaCharacter = {
      id: editingCharId || `char_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: indovinaCharName.trim(),
      imageUrl: finalUrl,
      creatorId: user.id
    };

    if (isHostRef.current) {
      handleAddCharacterLogic(newChar);
    } else {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'indovina_add_char',
        payload: { char: newChar }
      });
    }

    setIndovinaCharName('');
    setIndovinaCharUrl('');
    setIndovinaCharFile(null);
    if (indovinaFileInputRef.current) indovinaFileInputRef.current.value = '';
    setIsUploadingChar(false);
  };

  const passIndovinaTurn = () => {
    if (isHostRef.current) {
      handlePassTurnLogic();
    } else {
      channelRef.current?.send({ type: 'broadcast', event: 'indovina_pass_turn', payload: {} });
    }
  };

  const toggleIndovinaChar = (charId: string) => {
    setEliminatedChars(prev => 
      prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
    );
  };

  const endIndovinaGame = () => {
    if (!isHost) return;
    stateRef.current.indovinaPhase = 'gameover';
    syncState();
  };

  const resetIndovina = () => {
    if (!isHost) return;
    stateRef.current.indovinaPhase = 'setup';
    stateRef.current.indovinaCharacters = [];
    stateRef.current.indovinaSecretChars = {};
    syncState();
  };


  const startIframe = () => {
    if (!isHost) return;
    if (!iframeInput.trim()) {
      showError("Inserisci un URL valido.");
      return;
    }
    stateRef.current.iframeUrl = iframeInput.trim();
    stateRef.current.isIframeActive = true;
    setIframeUrl(iframeInput.trim());
    setIsIframeActive(true);
    syncState();
    showSuccess("Iframe avviato per tutti i giocatori!");
  };

  const stopIframe = () => {
    if (!isHost) return;
    stateRef.current.isIframeActive = false;
    setIsIframeActive(false);
    syncState();
    showSuccess("Iframe interrotto.");
  };

  const sendAnnouncement = () => {
    if (!isHost || !announcementInput.trim()) return;
    stateRef.current.announcement = announcementInput.trim();
    syncState();
    setAnnouncementInput('');

    setTimeout(() => {
      if (stateRef.current.announcement) {
        stateRef.current.announcement = null;
        syncState();
      }
    }, 6000);
  };

  const showLeaderboardGlobal = () => {
    if (!isHost) return;
    if (lbWinners.length === 0) {
      showError("Aggiungi almeno un vincitore.");
      return;
    }
    const winnersData = lbWinners.map(id => stateRef.current.players.find(p => p.id === id)).filter(Boolean) as Player[];
    stateRef.current.leaderboard = {
      title: lbTitle.trim() || 'Classifica',
      description: lbDesc.trim(),
      winners: winnersData
    };
    syncState();
    showSuccess("Classifica mostrata a tutti!");
    playSound('/openingsound.mp3'); 
  };

  const hideLeaderboardGlobal = () => {
    if (!isHost) return;
    stateRef.current.leaderboard = null;
    syncState();
    showSuccess("Classifica nascosta.");
  };

  // Funzioni Sondaggi
  const addPollOption = () => {
    if (pollOptionsInput.length < 4) {
      setPollOptionsInput([...pollOptionsInput, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptionsInput.length > 2) {
      setPollOptionsInput(pollOptionsInput.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, val: string) => {
    const newOptions = [...pollOptionsInput];
    newOptions[index] = val;
    setPollOptionsInput(newOptions);
  };

  const startPoll = () => {
    if (!isHost) return;
    if (!pollQuestionInput.trim()) return showError("Inserisci una domanda per il sondaggio.");
    if (pollOptionsInput.some(o => !o.trim())) return showError("Tutte le opzioni devono avere un testo.");
    
    stateRef.current.poll = {
      id: `poll-${Date.now()}`,
      question: pollQuestionInput.trim(),
      options: pollOptionsInput.map(o => o.trim()),
      votes: {},
      isOpen: true
    };
    syncState();
    showSuccess("Sondaggio avviato!");
  };

  const closePoll = () => {
    if (!isHost || !stateRef.current.poll) return;
    stateRef.current.poll.isOpen = false;
    syncState();
    showSuccess("Sondaggio terminato!");
  };

  const hidePoll = () => {
    if (!isHost) return;
    stateRef.current.poll = null;
    syncState();
  };

  const handleVotePoll = (optionIndex: number) => {
    if (!user || !pollData || !pollData.isOpen) return;
    channelRef.current?.send({ type: 'broadcast', event: 'vote_poll', payload: { playerId: user.id, optionIndex } });
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
      showSuccess(`Dado assegnato!`);
    }
  };

  const createCustomDice = () => {
    if (!isHost) return;
    if (!customDiceName.trim()) return showError("Inserisci un nome.");
    if (!customDiceFaces.trim()) return showError("Inserisci almeno una faccia.");

    const faces = customDiceFaces.split(',').map(f => f.trim()).filter(Boolean);
    if (faces.length === 0) return showError("Facce non valide.");

    const newDice: CustomDiceDef = {
      id: `custom_${Date.now()}`,
      name: customDiceName.trim(),
      description: customDiceDesc.trim() || 'Dado personalizzato',
      faces
    };

    stateRef.current.customDice = [...(stateRef.current.customDice || []), newDice];
    syncState();
    setCustomDiceName('');
    setCustomDiceDesc('');
    setCustomDiceFaces('');
    showSuccess("Dado personalizzato creato!");
  };

  const deleteCustomDice = (id: string) => {
    if (!isHost) return;
    stateRef.current.customDice = (stateRef.current.customDice || []).filter(d => d.id !== id);
    
    // Rimuovi questo dado dai default/speciali dei giocatori
    stateRef.current.players = stateRef.current.players.map(p => ({
      ...p,
      defaultDiceId: p.defaultDiceId === id ? null : p.defaultDiceId,
      specialDice: (p.specialDice || []).filter(sd => sd !== id)
    }));
    
    syncState();
    showSuccess("Dado eliminato.");
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

  const handleSaveRules = () => {
    stateRef.current.rules = rulesText;
    syncState();
    showSuccess("Regole aggiornate e condivise!");
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    
    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.id,
      senderName: profile?.first_name || 'Utente',
      text: chatInput.trim(),
      timestamp: Date.now()
    };

    stateRef.current.chatMessages = [...(stateRef.current.chatMessages || []), newMsg];
    setChatMessages(stateRef.current.chatMessages);
    setChatInput('');

    channelRef.current?.send({ type: 'broadcast', event: 'chat_message', payload: newMsg });
  };

  const PlayerListItem = ({ p, isTurn }: { p: Player, isTurn: boolean }) => {
    let rollContent: React.ReactNode = p.lastRoll;
    
    if (Array.isArray(p.lastRoll)) {
      if (typeof p.lastRoll[0] === 'string') {
        rollContent = p.lastRoll.join('');
      } else {
        rollContent = p.lastRoll.join(' + ');
      }
    } else if (typeof p.lastRoll === 'string') {
      const rolledPlayer = players.find(pl => pl.id === p.lastRoll);
      if (rolledPlayer) {
        rollContent = <Avatar src={rolledPlayer.avatar} decoration={rolledPlayer.avatar_decoration} className="w-5 h-5 object-cover" />;
      }
    }

    const isCurrentlyRolling = diceState?.playerId === p.id && diceState?.rolling;

    return (
      <>
        {isTurn && <div className="absolute -left-[1px] top-2 bottom-2 w-1.5 bg-[#23a559] rounded-r-md"></div>}
        <Avatar src={p.avatar} decoration={p.avatar_decoration} className="w-8 h-8 flex-shrink-0" />
        <span className={`text-sm font-medium truncate flex-1 ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>
          {p.name} {p.id === stateRef.current.players[0]?.id && <span className="text-xs text-yellow-500 ml-1 uppercase">(Game Master)</span>}
        </span>
        {p.id === stateRef.current.players[0]?.id && <Crown size={14} className="text-yellow-500 ml-auto" />}
        {isCommercial && (
          <span className="text-[#23a559] font-bold text-xs bg-[#23a559]/10 border border-[#23a559]/20 px-1.5 py-0.5 rounded whitespace-nowrap ml-2">
            {p.money || 0}€
          </span>
        )}
        {p.lastRoll !== null && p.lastRoll !== undefined && !isCurrentlyRolling && !isIframeActive && activeGameMode === 'board' && (
          <div className="ml-auto flex items-center justify-center w-max px-1.5 min-w-[28px] h-7 bg-white rounded shadow-sm border border-gray-300 transform rotate-3 overflow-hidden ml-2">
            <span className="text-[#111214] font-black text-xs md:text-sm flex items-center justify-center w-full h-full whitespace-nowrap">{rollContent}</span>
          </div>
        )}
      </>
    );
  };

  const canStartGame = activeGameMode === 'indovina' ? (players.length >= 2 && players.length <= 4) : players.length >= 1;

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
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
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
                <p className="text-xs text-[#949ba4] mb-3">Diventa il Game Master e scegli la modalità di gioco.</p>
                
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setSelectedGameMode('board')} 
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors border ${selectedGameMode === 'board' ? 'bg-brand/20 border-brand text-white' : 'bg-[#2b2d31] border-[#3f4147] text-[#949ba4] hover:text-[#dbdee1]'}`}
                  >
                    Gioco dell'Oca
                  </button>
                  <button 
                    onClick={() => setSelectedGameMode('indovina')} 
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors border ${selectedGameMode === 'indovina' ? 'bg-brand/20 border-brand text-white' : 'bg-[#2b2d31] border-[#3f4147] text-[#949ba4] hover:text-[#dbdee1]'}`}
                  >
                    IndovinaQualchì
                  </button>
                </div>

                {selectedGameMode === 'board' && (
                  <label className="flex items-center gap-2 mb-4 cursor-pointer text-sm text-[#dbdee1] justify-center bg-[#2b2d31] py-2 rounded-lg border border-[#3f4147]">
                    <input type="checkbox" checked={isCommercialMode} onChange={e => setIsCommercialMode(e.target.checked)} className="accent-brand w-4 h-4" />
                    Modalità Commerciale (Soldi)
                  </label>
                )}

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
          <p className="text-[#a855f7] font-bold mb-4 uppercase">{activeGameMode === 'indovina' ? 'IndovinaQualchì' : "Gioco dell'Oca"}</p>
          <div className="bg-[#1e1f22] py-4 px-6 rounded-lg inline-block mb-6 border border-[#3f4147]">
            <p className="text-xs text-[#949ba4] font-bold uppercase mb-1">Codice Partita</p>
            <p className="text-4xl font-black text-white tracking-[0.2em]">{gameCode}</p>
          </div>

          <div className="text-left mb-6">
            <h3 className="text-[#dbdee1] font-bold mb-3 flex items-center justify-between">
              Giocatori ({players.length}{activeGameMode === 'indovina' ? ' / 4' : ''})
            </h3>
            <div className="bg-[#1e1f22] rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar space-y-2">
              {players.map(p => {
                const isHostPlayer = p.id === stateRef.current.players[0]?.id;
                return (
                  <div key={p.id} className={`flex items-center gap-3 bg-[#2b2d31] p-2 rounded border ${isHostPlayer ? 'border-yellow-500/50 shadow-sm' : 'border-[#3f4147]'}`}>
                    <Avatar src={p.avatar} decoration={p.avatar_decoration} className="w-8 h-8" />
                    <span className={`font-medium ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>
                      {p.name} {isHostPlayer && <span className="text-xs text-yellow-500 ml-1 uppercase">(Game Master)</span>}
                    </span>
                    {isHostPlayer && <Crown size={14} className="text-yellow-500 ml-auto" />}
                  </div>
                );
              })}
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
                disabled={!canStartGame}
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
          <div className={`flex items-center justify-between bg-[#2b2d31] border-b border-[#1e1f22] shrink-0 shadow-md relative z-[10] transition-all duration-300 ${isIframeActive ? 'p-2' : 'p-4'}`}>
            <div className="flex items-center gap-4">
              <h2 className={`font-bold text-white flex items-center gap-2 transition-all ${isIframeActive ? 'text-base' : 'text-xl'}`}>
                <span className="text-[#ec4899] drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">PataParty!</span>
                <span className="bg-[#1e1f22] px-2 py-0.5 rounded text-xs text-[#949ba4] tracking-widest">{gameCode}</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('menu')} 
                className={`flex items-center gap-2 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-medium rounded transition-all ${isIframeActive ? 'py-1 px-3 text-xs' : 'py-1.5 px-4 text-sm'}`}
              >
                <Minimize2 size={isIframeActive ? 14 : 16} /> <span className={isIframeActive ? 'hidden sm:inline' : ''}>Riduci a Icona</span>
              </button>
              <button 
                onClick={abandonSavedGame}
                className={`flex items-center gap-2 bg-transparent border border-[#f23f43] text-[#f23f43] hover:bg-[#f23f43] hover:text-white font-medium rounded transition-all ${isIframeActive ? 'py-1 px-3 text-xs' : 'py-1.5 px-4 text-sm'}`}
              >
                <LogOut size={isIframeActive ? 14 : 16} /> <span className={isIframeActive ? 'hidden sm:inline' : ''}>Abbandona</span>
              </button>
            </div>
          </div>

          <div className={`flex flex-col md:flex-row gap-4 flex-1 overflow-hidden bg-[#313338] relative transition-all duration-300 ${isIframeActive ? 'p-2' : 'p-4 md:p-6'}`}>
            
            {/* Tabellone Centrale / Iframe Globale / IndovinaQualchì */}
            <div className="flex-1 bg-[#2b2d31] rounded-lg p-2 md:p-6 overflow-hidden relative shadow-inner flex items-center justify-center">
              
              {/* Overlay Classifica Finale */}
              {leaderboard && (
                <div className="absolute inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300 overflow-y-auto">
                  <div className="bg-[#2b2d31] border-2 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)] rounded-3xl max-w-xl w-full p-8 flex flex-col items-center my-auto">
                    <Trophy size={80} className="text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                    <h1 className="text-4xl font-black text-white text-center mb-3 drop-shadow-md">{leaderboard.title}</h1>
                    {leaderboard.description && <p className="text-[#b5bac1] text-center mb-8 text-lg">{leaderboard.description}</p>}
                    
                    <div className="w-full space-y-4">
                      {leaderboard.winners.map((p, idx) => {
                        let badge = null;
                        let bgClass = "bg-[#1e1f22] border-[#3f4147]";
                        if (idx === 0) { badge = "🥇"; bgClass = "bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] transform scale-105 my-2"; }
                        else if (idx === 1) { badge = "🥈"; bgClass = "bg-gray-300/20 border-gray-300"; }
                        else if (idx === 2) { badge = "🥉"; bgClass = "bg-orange-700/20 border-orange-700"; }
                        else { badge = <span className="text-[#b5bac1] text-lg font-bold">{idx + 1}°</span>; }
                        
                        return (
                          <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-transform ${bgClass}`}>
                            <div className="w-10 flex items-center justify-center text-4xl">{badge}</div>
                            <Avatar src={p.avatar} decoration={p.avatar_decoration} className="w-12 h-12 object-cover shadow-lg" />
                            <div className="flex-1 flex justify-between items-center overflow-hidden gap-4">
                              <span className={`text-xl font-bold truncate ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>{p.name}</span>
                              {isCommercial && <span className="text-[#23a559] font-bold text-lg">{p.money || 0}€</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Annuncio Globale a Schermo */}
              {announcement && !leaderboard && (
                <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300 p-8">
                  <h1
                    className="text-5xl md:text-7xl lg:text-8xl font-black text-white text-center leading-tight drop-shadow-2xl"
                    style={{
                      WebkitTextStroke: '3px black',
                      textShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)'
                    }}
                  >
                    {announcement}
                  </h1>
                </div>
              )}

              {isIframeActive && iframeUrl ? (
                <div className="w-full h-full relative animate-in fade-in zoom-in-95 duration-300">
                  <iframe 
                    src={iframeUrl} 
                    className="w-full h-full border-none rounded-xl bg-black shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : activeGameMode === 'indovina' ? (
                <div className="w-full h-full flex flex-col animate-in fade-in zoom-in-95 duration-300 bg-[#1e1f22] rounded-xl overflow-hidden shadow-inner relative">
                  {/* INDOVINA QUALCHÌ LOGIC */}
                  {indovinaPhase === 'setup' && (
                    <div className="m-auto text-center max-w-md p-8 bg-[#2b2d31] rounded-2xl border border-[#3f4147] shadow-xl">
                      <HelpCircle size={64} className="text-[#a855f7] mx-auto mb-4" />
                      <h2 className="text-3xl font-black text-white mb-2">IndovinaQualchì</h2>
                      <p className="text-[#b5bac1] mb-6">Scegli se creare un nuovo tabellone o usarne uno salvato nei preset.</p>
                      
                      {isHost ? (
                        <div className="space-y-4">
                          <div className="flex bg-[#1e1f22] p-1 rounded-lg">
                             <button onClick={() => setSetupTab('create')} className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors ${setupTab === 'create' ? 'bg-[#35373c] text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'}`}>Crea Tabellone</button>
                             <button onClick={() => setSetupTab('presets')} className={`flex-1 py-1.5 text-sm font-bold rounded transition-colors ${setupTab === 'presets' ? 'bg-[#35373c] text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'}`}>Usa Preset</button>
                          </div>

                          {setupTab === 'create' ? (
                            <div className="space-y-4 animate-in fade-in">
                              <div>
                                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Personaggi da creare a testa</label>
                                <input 
                                  type="number" 
                                  min="4" 
                                  max="32" 
                                  value={indovinaSettings.charsPerPlayer}
                                  onChange={e => {
                                    const val = Math.max(4, Math.min(32, parseInt(e.target.value) || 4));
                                    setIndovinaSettings({ charsPerPlayer: val });
                                    if (isHost) {
                                      stateRef.current.indovinaSettings = { charsPerPlayer: val };
                                      syncState();
                                    }
                                  }}
                                  className="w-full bg-[#1e1f22] text-white text-center rounded p-3 text-xl font-bold border border-[#3f4147] outline-none focus:border-[#a855f7]"
                                />
                                <p className="text-[10px] text-[#949ba4] mt-2">Totale personaggi sul tabellone: {indovinaSettings.charsPerPlayer * players.length}</p>
                              </div>
                              <button 
                                onClick={startIndovinaDraft}
                                className="w-full bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg"
                              >
                                Inizia Creazione
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4 animate-in fade-in">
                              <div>
                                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Seleziona un Preset</label>
                                <div className="flex gap-2 mb-2">
                                  <select 
                                    value={selectedPresetId} 
                                    onChange={e => setSelectedPresetId(e.target.value)}
                                    className="flex-1 bg-[#1e1f22] text-white rounded p-3 font-bold border border-[#3f4147] outline-none focus:border-[#a855f7]"
                                  >
                                    <option value="">Seleziona...</option>
                                    {indovinaPresets.map(p => (
                                       <option key={p.id} value={p.id}>{p.name} ({p.characters.length} personaggi)</option>
                                    ))}
                                  </select>
                                  {canCreate && (
                                    <button 
                                      onClick={editSelectedPreset} 
                                      disabled={!selectedPresetId} 
                                      className="bg-[#4e5058] hover:bg-[#6d6f78] text-white p-3 rounded transition-colors disabled:opacity-50"
                                      title="Modifica Preset"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={startGameWithPreset}
                                disabled={!selectedPresetId}
                                className="w-full bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg disabled:opacity-50"
                              >
                                Avvia Partita con Preset
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[#1e1f22] p-4 rounded-lg border border-[#3f4147]">
                          <p className="text-[#949ba4] italic text-sm">In attesa che il Game Master avvii la fase di creazione...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {indovinaPhase === 'draft' && (
                    <div className="flex flex-col h-full w-full p-4 md:p-6">
                      <div className="flex justify-between items-center mb-6 bg-[#2b2d31] p-4 rounded-xl border border-[#3f4147]">
                        <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users size={20} className="text-[#a855f7]" /> {editingPresetId ? 'Modifica Preset' : 'Creazione Personaggi'}
                          </h2>
                          <p className="text-sm text-[#b5bac1]">
                            {editingPresetId ? `Personaggi nel preset: ` : `Aggiunti: `}
                            <span className="text-white font-bold">{indovinaCharacters.length}</span>
                            {!editingPresetId && ` su ${indovinaSettings.charsPerPlayer * players.length}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {editingPresetId ? (
                            <button
                              onClick={() => {
                                stateRef.current.indovinaPhase = 'ready';
                                syncState();
                              }}
                              className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                            >
                              Salva Modifiche e Vai Avanti
                            </button>
                          ) : (
                            <>
                              <div className="bg-[#1e1f22] px-4 py-2 rounded-lg border border-[#a855f7]/30 shadow-sm flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse"></div>
                                <span className="text-sm font-medium text-white">
                                  Turno di: <strong className="text-[#a855f7]">{players.find(p => p.id === indovinaTurn)?.name || '...'}</strong>
                                </span>
                              </div>
                              {isHost && (
                                <button
                                  onClick={() => {
                                    stateRef.current.indovinaPhase = 'ready';
                                    syncState();
                                  }}
                                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                                >
                                  Forza Chiusura
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                        {/* Form Creazione/Modifica */}
                        <div className={`w-full md:w-80 flex-shrink-0 flex flex-col gap-4 transition-opacity ${(indovinaTurn === user?.id || editingPresetId) ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                          <div className="bg-[#2b2d31] p-5 rounded-xl border border-[#3f4147] flex-1 flex flex-col">
                            <h3 className="text-white font-bold mb-4 uppercase text-sm">{editingCharId ? 'Modifica Personaggio' : 'Aggiungi Personaggio'}</h3>
                            
                            <form onSubmit={submitIndovinaChar} className="flex flex-col h-full gap-4">
                              <div>
                                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-1">Nome Personaggio</label>
                                <input 
                                  type="text" 
                                  required
                                  value={indovinaCharName}
                                  onChange={e => setIndovinaCharName(e.target.value)}
                                  placeholder="Es. Mario Rossi"
                                  className="w-full bg-[#1e1f22] text-white rounded p-2.5 outline-none border border-[#3f4147] focus:border-[#a855f7]"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-1">Immagine Personaggio</label>
                                <div className="space-y-3">
                                  <button 
                                    type="button"
                                    onClick={() => indovinaFileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-[#3f4147] hover:border-[#a855f7] rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#1e1f22]/50 h-32"
                                  >
                                    {indovinaCharFile ? (
                                      <>
                                        <CheckCircle2 size={24} className="text-[#23a559] mb-2" />
                                        <span className="text-white text-xs font-medium truncate max-w-full px-2">{indovinaCharFile.name}</span>
                                      </>
                                    ) : indovinaCharUrl && editingCharId ? (
                                      <img src={indovinaCharUrl} className="w-full h-full object-contain opacity-50" />
                                    ) : (
                                      <>
                                        <Upload size={24} className="text-[#949ba4] mb-2" />
                                        <span className="text-[#dbdee1] text-xs font-medium">Carica un'immagine</span>
                                      </>
                                    )}
                                  </button>
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    ref={indovinaFileInputRef}
                                    className="hidden"
                                    onChange={handleIndovinaFileChange}
                                  />
                                  <div className="flex items-center gap-2">
                                    <div className="h-[1px] bg-[#3f4147] flex-1"></div>
                                    <span className="text-[10px] text-[#949ba4] uppercase font-bold">Oppure</span>
                                    <div className="h-[1px] bg-[#3f4147] flex-1"></div>
                                  </div>
                                  <input 
                                    type="url" 
                                    value={indovinaCharUrl}
                                    onChange={e => setIndovinaCharUrl(e.target.value)}
                                    placeholder="Incolla URL immagine..."
                                    className="w-full bg-[#1e1f22] text-white text-xs rounded p-2.5 outline-none border border-[#3f4147] focus:border-[#a855f7]"
                                  />
                                </div>
                              </div>

                              <div className="mt-auto flex gap-2">
                                {editingCharId && (
                                  <button 
                                    type="button"
                                    onClick={cancelEditIndovinaChar}
                                    className="w-1/3 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-bold py-3 rounded-lg transition-colors"
                                  >
                                    Annulla
                                  </button>
                                )}
                                <button 
                                  type="submit"
                                  disabled={!indovinaCharName.trim() || (!indovinaCharFile && !indovinaCharUrl.trim()) || isUploadingChar}
                                  className={`${editingCharId ? 'w-2/3' : 'w-full'} bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md disabled:opacity-50`}
                                >
                                  {isUploadingChar ? 'Caricamento...' : (editingCharId ? 'Salva Modifiche' : 'Aggiungi al Tabellone')}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>

                        {/* Griglia Preview */}
                        <div className="flex-1 bg-[#2b2d31] p-5 rounded-xl border border-[#3f4147] overflow-y-auto custom-scrollbar">
                          <h3 className="text-[#b5bac1] font-bold mb-4 uppercase text-sm">Tabellone in costruzione</h3>
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                            {indovinaCharacters.map((char, i) => (
                              <div key={char.id} className="aspect-[3/4] bg-[#1e1f22] rounded-lg border border-[#3f4147] overflow-hidden flex flex-col relative group animate-in zoom-in duration-300">
                                <img src={char.imageUrl} className="flex-1 object-cover w-full bg-black/20" alt={char.name} />
                                <div className="p-1.5 bg-[#1e1f22] border-t border-[#3f4147] text-center">
                                  <span className="text-[10px] sm:text-xs font-bold text-white truncate block w-full">{char.name}</span>
                                </div>
                                {isHost && (
                                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); startEditIndovinaChar(char); }} className="bg-[#1e1f22]/80 backdrop-blur-sm p-1.5 rounded hover:bg-brand text-white transition-colors"><Edit2 size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteIndovinaChar(char.id); }} className="bg-[#1e1f22]/80 backdrop-blur-sm p-1.5 rounded hover:bg-[#f23f43] text-white transition-colors"><Trash2 size={14}/></button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {!editingPresetId && Array.from({ length: Math.max(0, (indovinaSettings.charsPerPlayer * players.length) - indovinaCharacters.length) }).map((_, i) => (
                              <div key={`empty-${i}`} className="aspect-[3/4] bg-[#1e1f22]/50 border-2 border-dashed border-[#3f4147] rounded-lg flex items-center justify-center">
                                <HelpCircle size={24} className="text-[#3f4147]" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {indovinaPhase === 'ready' && (
                    <div className="m-auto text-center max-w-md p-8 bg-[#2b2d31] rounded-2xl border border-[#3f4147] shadow-xl">
                      <CheckCircle2 size={64} className="text-[#23a559] mx-auto mb-4" />
                      <h2 className="text-3xl font-black text-white mb-2">Tabellone Completato!</h2>
                      <p className="text-[#b5bac1] mb-6">I personaggi sono pronti. {isHost ? (editingPresetId ? "Salva le modifiche al preset prima di iniziare la partita." : "Vuoi salvare questo tabellone come preset per le prossime partite?") : "In attesa che il Game Master avvii la partita..."}</p>
                      
                      {isHost ? (
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            value={presetNameInput}
                            onChange={e => setPresetNameInput(e.target.value)}
                            placeholder="Nome Preset (es. YouTuber, Marvel...)"
                            className="w-full bg-[#1e1f22] text-white rounded p-3 font-bold border border-[#3f4147] outline-none focus:border-[#a855f7]"
                          />
                          <div className="flex gap-3">
                            <button 
                              onClick={() => startIndovinaMatch()}
                              className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white font-bold py-3 px-4 rounded-xl transition-colors"
                            >
                              Salta e Inizia
                            </button>
                            <button 
                              onClick={() => startIndovinaMatch(presetNameInput)}
                              disabled={!presetNameInput.trim()}
                              className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg disabled:opacity-50"
                            >
                              Salva e Inizia
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center py-4">
                          <div className="w-8 h-8 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  )}

                  {indovinaPhase === 'playing' && (
                    <div className="flex flex-col h-full w-full">
                      {/* Top Bar - Secret Char */}
                      <div className="bg-[#2b2d31] p-3 flex justify-between items-center border-b border-[#3f4147] shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="bg-[#1e1f22] border-2 border-[#23a559] rounded-lg p-1.5 flex items-center gap-3 shadow-md">
                            <span className="text-xs font-bold text-[#949ba4] uppercase pl-2">Il tuo Personaggio:</span>
                            {indovinaSecretChars[user?.id || ''] ? (() => {
                              const myChar = indovinaCharacters.find(c => c.id === indovinaSecretChars[user?.id || '']);
                              return myChar ? (
                                <div className="flex items-center gap-2 bg-[#2b2d31] pr-3 rounded">
                                  <img src={myChar.imageUrl} className="w-8 h-8 rounded-l object-cover border-r border-[#1e1f22]" />
                                  <span className="text-white font-bold text-sm">{myChar.name}</span>
                                </div>
                              ) : null;
                            })() : <span className="text-white font-bold">Nessuno (Spettatore)</span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${indovinaTurn === user?.id ? 'bg-[#23a559]/20 border-[#23a559] text-[#23a559]' : 'bg-[#1e1f22] border-[#3f4147] text-[#949ba4]'}`}>
                            {indovinaTurn === user?.id ? 'Tocca a TE fare domande!' : `Turno di: ${players.find(p => p.id === indovinaTurn)?.name || '...'}`}
                          </div>
                          {indovinaTurn === user?.id && (
                            <button 
                              onClick={passIndovinaTurn}
                              className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-md"
                            >
                              Passa Turno
                            </button>
                          )}
                          {isHost && (
                            <button onClick={endIndovinaGame} className="bg-[#f23f43] hover:bg-[#da373c] text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-md ml-2">
                              Termina
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Main Grid */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 max-w-6xl mx-auto">
                          {indovinaCharacters.map((char) => {
                            const isEliminated = eliminatedChars.includes(char.id);
                            return (
                              <div 
                                key={char.id} 
                                onClick={() => toggleIndovinaChar(char.id)}
                                className={`aspect-[3/4] rounded-lg border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                                  isEliminated 
                                    ? 'border-[#f23f43] opacity-60 scale-95' 
                                    : 'border-[#3f4147] hover:border-brand hover:-translate-y-1 hover:shadow-lg'
                                }`}
                              >
                                <img 
                                  src={char.imageUrl} 
                                  className={`w-full h-full object-cover transition-all duration-300 ${isEliminated ? 'grayscale sepia-[0.3] blur-[1px]' : ''}`} 
                                  alt={char.name} 
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-[#1e1f22]/90 backdrop-blur-sm border-t border-[#3f4147] text-center">
                                  <span className={`text-[10px] sm:text-xs font-bold truncate block w-full ${isEliminated ? 'text-[#949ba4] line-through' : 'text-white'}`}>
                                    {char.name}
                                  </span>
                                </div>
                                {isEliminated && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                    <X size={48} className="text-[#f23f43] drop-shadow-[0_0_10px_rgba(242,63,67,0.8)]" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {indovinaPhase === 'gameover' && (
                    <div className="m-auto text-center max-w-lg p-8 bg-[#2b2d31] rounded-2xl border border-[#3f4147] shadow-xl">
                      <Trophy size={64} className="text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                      <h2 className="text-4xl font-black text-white mb-6">Partita Terminata!</h2>
                      
                      <div className={`grid gap-4 mb-8 ${players.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
                        {players.map(p => {
                          const charId = indovinaSecretChars[p.id];
                          const char = indovinaCharacters.find(c => c.id === charId);
                          return (
                            <div key={p.id} className="bg-[#1e1f22] p-4 rounded-xl border border-[#3f4147] flex flex-col items-center">
                              <Avatar src={p.avatar} decoration={p.avatar_decoration} className="w-12 h-12 mb-2" />
                              <span className="text-white font-bold text-sm mb-3">{p.name} aveva:</span>
                              {char ? (
                                <div className="aspect-[3/4] w-24 rounded border-2 border-brand overflow-hidden relative">
                                  <img src={char.imageUrl} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[10px] font-bold py-1 text-center truncate px-1">
                                    {char.name}
                                  </div>
                                </div>
                              ) : <span className="text-[#949ba4] italic text-sm">Nessuno</span>}
                            </div>
                          )
                        })}
                      </div>

                      {isHost && (
                        <div className="flex gap-3">
                          <button 
                            onClick={resetIndovina}
                            className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                          >
                            Gioca Ancora
                          </button>
                          <button 
                            onClick={abandonSavedGame}
                            className="flex-1 bg-transparent border-2 border-[#f23f43] text-[#f23f43] hover:bg-[#f23f43] hover:text-white font-bold py-3 px-4 rounded-lg transition-colors"
                          >
                            Chiudi Minigioco
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                <div 
                  ref={boardRef}
                  className="relative inline-flex items-center justify-center max-w-full max-h-[85vh] animate-in fade-in zoom-in-95 duration-300"
                >
                  <img 
                    src={boardUrl} 
                    alt="Board" 
                    className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border-2 border-[#3f4147] bg-[#fcf6ce]" 
                    draggable={false} 
                    onError={(e) => {
                      e.currentTarget.src = '/pataparty-board.png'; 
                    }}
                  />
                  
                  {/* Overlay per le pedine */}
                  <div className="absolute inset-0 pointer-events-none rounded-xl">
                    {players.map(p => {
                      const isTurn = activePlayerId === p.id;
                      const isRolling = diceState?.playerId === p.id;
                      
                      return (
                        <div 
                          key={p.id} 
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out group pointer-events-auto ${
                            isHost ? 'cursor-grab active:cursor-grabbing hover:scale-110' : ''
                          } ${isTurn ? 'z-[60] scale-110' : 'z-10 hover:z-50'}`}
                          style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          onPointerDown={(e) => handlePointerDown(e, p.id)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        >
                          {/* BALLOON DEL DADO */}
                          {isRolling && diceState && (
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-[100] drop-shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                              <div className="bg-[#111214]/90 backdrop-blur-sm border border-[#1e1f22] text-white text-[10px] font-bold px-3 py-1 rounded-full mb-1 shadow-md whitespace-nowrap">
                                {diceState.rolling ? 'Sta tirando...' : 
                                 diceState.diceType === 'scambio' ? `${p.name} scambia con ${players.find(pl => pl.id === diceState.result)?.name || 'Qualcuno'}!` :
                                 diceState.diceType === 'doppio' && Array.isArray(diceState.result) ? `${p.name} ha tirato ${diceState.result[0]} e ${diceState.result[1]}!` :
                                 diceState.diceType === 'triplo' && Array.isArray(diceState.result) ? `${p.name} ha tirato ${diceState.result[0]}, ${diceState.result[1]} e ${diceState.result[2]}!` :
                                 diceState.diceType === 'alfabetico' && Array.isArray(diceState.result) ? `${p.name} ha tirato ${diceState.result.join(', ')}!` :
                                 diceState.diceType?.startsWith('custom_') ? `${p.name} ha fatto ${diceState.result}!` :
                                 `${p.name} ha fatto ${diceState.result}!`}
                              </div>
                              <div className="relative">
                                <Dice value={diceState.result} rolling={diceState.rolling} diceType={diceState.diceType} size="sm" players={players} customDiceDef={customDice} />
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-gray-200 rotate-45 z-[-1]"></div>
                              </div>
                            </div>
                          )}

                          {isTurn && <div className="absolute inset-[-6px] bg-[#23a559] rounded-full animate-ping opacity-60 z-0 pointer-events-none"></div>}
                          
                          <Avatar 
                            src={p.avatar} 
                            decoration={p.avatar_decoration} 
                            className={`w-10 h-10 md:w-12 md:h-12 object-cover shadow-xl border-2 ${isTurn ? 'border-[#23a559]' : 'border-white'} bg-[#313338] pointer-events-none select-none relative z-10`} 
                          />
                          <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none font-bold shadow-lg flex flex-col items-center ${getThemeClass(p.avatar_decoration)}`} style={getThemeStyle(p.avatar_decoration)}>
                            <span>{p.name}</span>
                            {isCommercial && <span className="text-[#23a559] mt-0.5">{p.money || 0}€</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pulsanti Bottom: Regole (Sinistra), Chat (Destra) */}
              <div className={`absolute left-4 right-4 flex justify-between items-end pointer-events-none z-[300] ${isIframeActive ? 'bottom-2' : 'bottom-4'}`}>
                
                {/* Contenitore Relativo per REGOLE (Sinistra) */}
                <div className="relative pointer-events-auto">
                  <button
                    onClick={() => setShowRules(!showRules)}
                    className={`bg-[#2b2d31]/90 backdrop-blur-md rounded-lg border border-[#1e1f22] text-white font-bold flex items-center shadow-lg hover:bg-[#35373c] transition-transform hover:scale-105 ${
                      isIframeActive ? 'px-2.5 py-1.5 text-xs gap-1.5' : 'px-4 py-2 text-sm gap-2'
                    }`}
                  >
                    <BookOpen size={isIframeActive ? 16 : 20} className="text-[#a855f7]" />
                    Regole
                  </button>

                  {/* Pannello Regole (Popup) */}
                  {showRules && (
                    <>
                      <div className="fixed inset-0 z-[390]" onClick={() => setShowRules(false)} />
                      <div className="absolute bottom-full mb-3 left-0 w-80 md:w-96 bg-[#2b2d31] border border-[#1e1f22] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-[400] flex flex-col max-h-[60vh] animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div className="p-4 border-b border-[#1f2023] flex justify-between items-center bg-[#1e1f22] rounded-t-xl shrink-0">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BookOpen size={20} className="text-[#a855f7]" />
                            Regole della Partita
                          </h3>
                          <button onClick={() => setShowRules(false)} className="text-[#949ba4] hover:text-white transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                          {isHost ? (
                            <div className="flex flex-col h-full">
                              <p className="text-xs text-[#949ba4] mb-3 uppercase font-bold">Modifica Regole (Solo GM)</p>
                              <textarea
                                value={rulesText}
                                onChange={(e) => setRulesText(e.target.value)}
                                placeholder="Scrivi qui le regole della partita..."
                                className="w-full min-h-[150px] bg-[#1e1f22] text-[#dbdee1] p-3 rounded-lg border border-[#3f4147] focus:border-[#a855f7] outline-none resize-none custom-scrollbar mb-4"
                              />
                              <button
                                onClick={handleSaveRules}
                                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-2 px-4 rounded transition-colors w-full"
                              >
                                Salva e Condividi
                              </button>
                            </div>
                          ) : (
                            <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed text-sm">
                              {stateRef.current.rules || <span className="text-[#949ba4] italic">Il Game Master non ha ancora impostato le regole.</span>}
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 left-6 w-4 h-4 bg-[#2b2d31] border-b border-r border-[#1e1f22] rotate-45" />
                      </div>
                    </>
                  )}
                </div>

                {isHost && !isIframeActive && activeGameMode === 'board' && (
                  <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg pointer-events-none z-10 mx-auto hidden md:flex">
                    <Info size={16} className="text-yellow-500" />
                    Trascina le pedine dei giocatori per spostarle sul tabellone.
                  </div>
                )}
                
                {/* Contenitore Relativo per CHAT (Destra) */}
                <div className="relative pointer-events-auto">
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className={`relative bg-[#2b2d31]/90 backdrop-blur-md rounded-lg border border-[#1e1f22] text-white font-bold flex items-center shadow-lg hover:bg-[#35373c] transition-transform hover:scale-105 ${
                      isIframeActive ? 'px-2.5 py-1.5 text-xs gap-1.5' : 'px-4 py-2 text-sm gap-2'
                    }`}
                  >
                    <MessageSquare size={isIframeActive ? 16 : 20} className="text-[#0ea5e9]" />
                    Chat
                    {unreadChat && !showChat && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#f23f43] rounded-full animate-pulse border border-[#2b2d31]"></span>
                    )}
                  </button>

                  {/* Pannello Chat (Popup) */}
                  {showChat && (
                    <>
                      <div className="fixed inset-0 z-[390]" onClick={() => setShowChat(false)} />
                      <div className="absolute bottom-full mb-3 right-0 w-80 md:w-96 bg-[#2b2d31] border border-[#1e1f22] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-[400] flex flex-col h-[50vh] max-h-[400px] animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <div className="p-4 border-b border-[#1f2023] flex justify-between items-center bg-[#1e1f22] rounded-t-xl shrink-0">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MessageSquare size={20} className="text-[#0ea5e9]" />
                            Chat Partita
                          </h3>
                          <button onClick={() => setShowChat(false)} className="text-[#949ba4] hover:text-white transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3" ref={chatScrollRef}>
                          {chatMessages.length === 0 ? (
                            <div className="text-center text-[#949ba4] m-auto text-sm italic">Nessun messaggio. Scrivi qualcosa!</div>
                          ) : (
                            chatMessages.map(msg => (
                              <div key={msg.id} className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-[#949ba4] mb-0.5 px-1">{msg.senderName}</span>
                                <div className={`px-3 py-2 rounded-xl max-w-[85%] text-sm break-words ${msg.senderId === user?.id ? 'bg-[#5865F2] text-white rounded-br-sm' : 'bg-[#1e1f22] text-[#dbdee1] border border-[#3f4147] rounded-bl-sm'}`}>
                                  {msg.text}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <form onSubmit={sendChatMessage} className="p-3 border-t border-[#1f2023] bg-[#1e1f22] rounded-b-xl flex gap-2 shrink-0">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Scrivi un messaggio..."
                            className="flex-1 min-w-0 bg-[#2b2d31] text-white text-sm px-3 py-2 rounded-lg border border-[#3f4147] focus:border-[#5865F2] outline-none"
                          />
                          <button type="submit" disabled={!chatInput.trim()} className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                            Invia
                          </button>
                        </form>
                        <div className="absolute -bottom-2 right-6 w-4 h-4 bg-[#1e1f22] border-b border-r border-[#1e1f22] rotate-45" />
                      </div>
                    </>
                  )}
                </div>

              </div>

            </div>

            {/* Sidebar Giocatori e Impostazioni GM (Destra) */}
            <div className={`w-full ${isIframeActive ? 'md:w-44' : 'md:w-72'} transition-all duration-300 bg-[#2b2d31] rounded-lg flex flex-col shrink-0 shadow-inner relative z-10 overflow-hidden`}>
              
              {isHost && (
                <div className="flex bg-[#1e1f22] p-1 rounded-t-lg shrink-0 border-b border-[#1f2023]">
                  <button 
                    onClick={() => setGmTab('players')} 
                    className={`flex-1 text-xs py-2 rounded-md font-bold transition-colors ${gmTab === 'players' ? 'bg-[#35373c] text-white shadow-sm' : 'text-[#949ba4] hover:text-[#dbdee1]'}`}
                  >
                    Giocatori
                  </button>
                  <button 
                    onClick={() => setGmTab('tools')} 
                    className={`flex-1 text-xs py-2 rounded-md font-bold transition-colors ${gmTab === 'tools' ? 'bg-[#35373c] text-white shadow-sm' : 'text-[#949ba4] hover:text-[#dbdee1]'}`}
                  >
                    Strumenti
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
                
                {/* ACTIVE POLL DISPLAY (Visibile a tutti in cima alla lista giocatori) */}
                {pollData && (
                  <div className="mb-4 bg-[#1e1f22] p-3 rounded-lg border border-brand/50 shadow-md">
                    <h4 className="text-white font-bold text-sm mb-3 break-words text-center flex items-center justify-center gap-2">
                      <BarChart2 size={16} className="text-brand" /> {pollData.question}
                    </h4>
                    <div className="space-y-2">
                      {pollData.options.map((opt, i) => {
                        const votes = Object.values(pollData.votes).filter(v => v === i).length;
                        const totalVotes = Object.keys(pollData.votes).length || 1;
                        const pct = Math.round((votes / totalVotes) * 100);
                        const hasVotedThis = pollData.votes[user?.id || ''] === i;
                        
                        return (
                          <div key={i} className="relative overflow-hidden rounded bg-[#2b2d31] border border-[#3f4147]">
                            <button
                              onClick={() => handleVotePoll(i)}
                              disabled={!pollData.isOpen}
                              className={`w-full text-left relative z-10 px-3 py-2 text-xs font-medium transition-colors ${hasVotedThis ? 'text-white' : 'text-[#dbdee1] hover:text-white'} ${!pollData.isOpen ? 'cursor-default' : 'hover:bg-white/5'}`}
                            >
                              <div 
                                className={`absolute left-0 top-0 bottom-0 z-[-1] transition-all duration-500 ${hasVotedThis ? 'bg-brand/40' : 'bg-brand/20'}`} 
                                style={{ width: `${pollData.votes[user?.id || ''] !== undefined || !pollData.isOpen ? pct : 0}%` }}
                              />
                              <div className="flex justify-between items-center relative z-10">
                                <span className="truncate pr-2">{opt}</span>
                                {(pollData.votes[user?.id || ''] !== undefined || !pollData.isOpen) && (
                                  <span className="font-bold">{votes} ({pct}%)</span>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {isHost && (
                      <div className="mt-3 flex gap-2">
                        {pollData.isOpen ? (
                          <button onClick={closePoll} className="flex-1 bg-[#f23f43] hover:bg-[#da373c] text-white text-[10px] font-bold py-1.5 rounded transition-colors">Termina Sondaggio</button>
                        ) : (
                          <button onClick={hidePoll} className="flex-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[10px] font-bold py-1.5 rounded transition-colors">Nascondi</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB GIOCATORI */}
                {(!isHost || gmTab === 'players') && (
                  <>
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2 truncate text-sm">
                      <Users size={16} className="text-[#dbdee1] flex-shrink-0" /> <span className="truncate">Giocatori ({players.length})</span>
                    </h3>
                    
                    <div className="space-y-2">
                      {players.map(p => {
                        const isTurn = activePlayerId === p.id;
                        
                        return (
                          <React.Fragment key={p.id}>
                            {isHost && !isIframeActive ? (
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
                                    <div className="px-2 py-1 text-[10px] font-bold text-[#949ba4] uppercase mb-1">Dado Predefinito</div>
                                    <select 
                                      value={p.defaultDiceId || 'standard'}
                                      onChange={(e) => setDefaultDice(p.id, e.target.value)}
                                      className="w-full bg-[#1e1f22] text-white text-xs px-2 py-1.5 rounded border border-[#3f4147] outline-none mb-2"
                                    >
                                      <option value="standard">Dado Normale (1-6)</option>
                                      {BUILTIN_DICE.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                      {customDice.map(cd => <option key={cd.id} value={cd.id}>{cd.name} (Custom)</option>)}
                                    </select>

                                    <div className="h-[1px] bg-[#3f4147] my-2 mx-1"></div>
                                    <div className="px-2 py-1 text-[10px] font-bold text-[#949ba4] uppercase mb-1">Aggiungi Dado Monouso</div>
                                    
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1 space-y-0.5">
                                      {BUILTIN_DICE.map(d => (
                                        <button key={d.id} onClick={() => addSpecialDice(p.id, d.id)} className={`flex items-center gap-2 px-3 py-1.5 text-xs ${d.color} hover:bg-[${d.color.replace('text-[', '').replace(']', '')}] hover:text-white rounded w-full text-left transition-colors font-medium`}>
                                          <Plus size={12} /> {d.label}
                                        </button>
                                      ))}
                                      {customDice.map(cd => (
                                        <button key={cd.id} onClick={() => addSpecialDice(p.id, cd.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white rounded w-full text-left transition-colors font-medium">
                                          <Plus size={12} /> {cd.name} (Custom)
                                        </button>
                                      ))}
                                    </div>

                                    {isCommercial && (
                                      <>
                                        <div className="h-[1px] bg-[#3f4147] my-2 mx-1"></div>
                                        <div className="px-2 py-1 text-[10px] font-bold text-[#949ba4] uppercase mb-1">Gestione Soldi</div>
                                        <div className="flex items-center gap-1.5 px-2 py-1">
                                          <input
                                            type="number"
                                            value={moneyAmounts[p.id] || ''}
                                            onChange={(e) => setMoneyAmounts({...moneyAmounts, [p.id]: e.target.value})}
                                            placeholder="Importo..."
                                            className="w-16 bg-[#1e1f22] text-white text-xs px-2 py-1.5 rounded border border-[#3f4147] focus:border-[#23a559] outline-none"
                                          />
                                          <button onClick={() => { handleUpdateMoney(p.id, parseInt(moneyAmounts[p.id] || '0')); setMoneyAmounts({...moneyAmounts, [p.id]: ''}); }} className="flex-1 p-1.5 bg-[#23a559] hover:bg-[#1a7c43] text-white rounded flex items-center justify-center transition-colors"><Plus size={14}/></button>
                                          <button onClick={() => { handleUpdateMoney(p.id, -parseInt(moneyAmounts[p.id] || '0')); setMoneyAmounts({...moneyAmounts, [p.id]: ''}); }} className="flex-1 p-1.5 bg-[#f23f43] hover:bg-[#da373c] text-white rounded flex items-center justify-center transition-colors"><Minus size={14}/></button>
                                        </div>
                                      </>
                                    )}

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
                  </>
                )}

                {/* TAB STRUMENTI (Solo GM) */}
                {isHost && gmTab === 'tools' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    
                    {activeGameMode === 'indovina' && indovinaPhase === 'playing' && (
                      <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                        <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1">
                          <BookOpen size={14} className="text-[#a855f7]" /> Salva Tabellone come Preset
                        </h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nome Preset (es. Marvel)"
                            value={presetNameInput}
                            onChange={e => setPresetNameInput(e.target.value)}
                            className="flex-1 min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded border border-[#3f4147] outline-none focus:border-[#a855f7]"
                          />
                          <button
                            onClick={saveBoardAsPreset}
                            className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors shadow-sm"
                          >
                            <Save size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {!isIframeActive && activeGameMode === 'board' && (
                      <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                        <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1 truncate">
                          <ImageIcon size={14} className="flex-shrink-0" /> Sfondo (URL)
                        </h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://..."
                            value={boardUrlInput}
                            onChange={e => setBoardUrlInput(e.target.value)}
                            className="flex-1 min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-brand border border-[#3f4147]"
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
                            className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors flex-shrink-0"
                          >
                            Applica
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Dadi Personalizzati */}
                    {activeGameMode === 'board' && (
                      <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                        <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1 truncate">
                          <Dice5 size={14} className="flex-shrink-0 text-[#0ea5e9]" /> Dadi Personalizzati
                        </h4>
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Nome dado..."
                            value={customDiceName}
                            onChange={e => setCustomDiceName(e.target.value)}
                            className="w-full bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] border border-[#3f4147]"
                          />
                          <input
                            type="text"
                            placeholder="Facce (separate da virgola)"
                            value={customDiceFaces}
                            onChange={e => setCustomDiceFaces(e.target.value)}
                            className="w-full bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] border border-[#3f4147]"
                            title="Es: 1, 2, 3, Riprova, 💥"
                          />
                          <button
                            onClick={createCustomDice}
                            className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors shadow-sm"
                          >
                            Crea Dado
                          </button>

                          {customDice.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {customDice.map(d => (
                                <div key={d.id} className="flex justify-between items-center bg-[#2b2d31] px-2 py-1 rounded text-[10px] text-[#dbdee1] border border-[#3f4147]">
                                  <span className="truncate flex-1 font-bold">{d.name} ({d.faces.length} facce)</span>
                                  <button onClick={() => deleteCustomDice(d.id)} className="text-[#f23f43] hover:text-white ml-2"><Trash2 size={12}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                      <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1 truncate">
                        <Megaphone size={14} className="flex-shrink-0 text-yellow-500" /> Annuncio
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Messaggio a schermo..."
                          value={announcementInput}
                          onChange={e => setAnnouncementInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendAnnouncement()}
                          className="flex-1 min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 border border-[#3f4147]"
                        />
                        <button
                          onClick={sendAnnouncement}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors flex-shrink-0 shadow-sm"
                        >
                          Invia
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                      <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1 truncate">
                        <BarChart2 size={14} className="flex-shrink-0 text-[#0ea5e9]" /> Sondaggio
                      </h4>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Domanda sondaggio..."
                          value={pollQuestionInput}
                          onChange={e => setPollQuestionInput(e.target.value)}
                          className="w-full min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] border border-[#3f4147]"
                        />
                        <div className="space-y-1.5 mt-1">
                          {pollOptionsInput.map((opt, i) => (
                            <div key={i} className="flex gap-1.5 items-center">
                              <span className="text-[#949ba4] text-[10px] w-3">{i+1}.</span>
                              <input
                                type="text"
                                placeholder={`Opzione ${i+1}`}
                                value={opt}
                                onChange={e => updatePollOption(i, e.target.value)}
                                className="flex-1 min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] border border-[#3f4147]"
                              />
                              {pollOptionsInput.length > 2 && (
                                <button onClick={() => removePollOption(i)} className="text-[#f23f43] hover:text-white p-1 transition-colors">
                                  <Minus size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {pollOptionsInput.length < 4 && (
                          <button onClick={addPollOption} className="text-[#0ea5e9] hover:text-white text-[10px] font-bold uppercase flex items-center gap-1 mt-1 transition-colors w-max">
                            <Plus size={12} /> Aggiungi Opzione
                          </button>
                        )}
                        <button
                          onClick={startPoll}
                          className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold px-3 py-2 mt-2 rounded transition-colors shadow-sm"
                        >
                          Avvia Sondaggio
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                      <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1 truncate">
                        <Trophy size={14} className="flex-shrink-0 text-yellow-500" /> Classifica Finale
                      </h4>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Titolo (es. Risultati Finali)"
                          value={lbTitle}
                          onChange={e => setLbTitle(e.target.value)}
                          className="w-full min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 border border-[#3f4147]"
                        />
                        <input
                          type="text"
                          placeholder="Descrizione (opzionale)"
                          value={lbDesc}
                          onChange={e => setLbDesc(e.target.value)}
                          className="w-full min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500 border border-[#3f4147]"
                        />
                        
                        <div className="flex gap-2 mt-1">
                          <select 
                            value={lbPlayerSelect} 
                            onChange={e => setLbPlayerSelect(e.target.value)}
                            className="flex-1 min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none border border-[#3f4147]"
                          >
                            <option value="">Aggiungi giocatore...</option>
                            {players.filter(p => !lbWinners.includes(p.id)).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (lbPlayerSelect) {
                                setLbWinners([...lbWinners, lbPlayerSelect]);
                                setLbPlayerSelect('');
                              }
                            }}
                            className="bg-[#2b2d31] hover:bg-[#35373c] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors flex-shrink-0 border border-[#3f4147]"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {lbWinners.length > 0 && (
                          <div className="mt-1 space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                            {lbWinners.map((id, idx) => {
                              const p = players.find(x => x.id === id);
                              return (
                                <div key={id} className="flex justify-between items-center bg-[#2b2d31] px-2 py-1 rounded text-xs text-[#dbdee1] border border-[#3f4147]">
                                  <span className="truncate flex-1 font-bold"><span className="text-[#949ba4] mr-1">{idx + 1}°</span> {p?.name}</span>
                                  <button onClick={() => setLbWinners(lbWinners.filter(x => x !== id))} className="text-[#f23f43] hover:text-white ml-2"><X size={12}/></button>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex gap-2 mt-2 pt-2 border-t border-[#3f4147]">
                          {leaderboard ? (
                            <button
                              onClick={hideLeaderboardGlobal}
                              className="flex-1 bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-bold px-3 py-2 rounded transition-colors shadow-sm"
                            >
                              Nascondi
                            </button>
                          ) : (
                            <button
                              onClick={showLeaderboardGlobal}
                              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold px-3 py-2 rounded transition-colors shadow-sm"
                            >
                              Mostra
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1e1f22] p-3 rounded-lg border border-[#3f4147]">
                      <h4 className="text-xs font-bold text-[#b5bac1] uppercase mb-2 flex items-center gap-1 truncate">
                        <Globe size={14} className="flex-shrink-0" /> Minigioco Iframe
                      </h4>
                      <div className="flex flex-col gap-2">
                        <input
                          type="url"
                          placeholder="https://..."
                          value={iframeInput}
                          onChange={e => setIframeInput(e.target.value)}
                          className="w-full min-w-0 bg-[#2b2d31] text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-brand border border-[#3f4147]"
                        />
                        {isIframeActive ? (
                          <button
                            onClick={stopIframe}
                            className="w-full bg-[#f23f43] hover:bg-[#da373c] text-white text-xs font-bold px-3 py-2 rounded transition-colors shadow-sm"
                          >
                            Interrompi
                          </button>
                        ) : (
                          <button
                            onClick={startIframe}
                            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold px-3 py-2 rounded transition-colors shadow-sm"
                          >
                            Avvia Minigioco
                          </button>
                        )}
                      </div>
                    </div>
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