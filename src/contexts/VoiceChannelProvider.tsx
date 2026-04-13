"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Peer from 'simple-peer';
import { User } from '@/types/discord';
import { playSound } from '@/utils/sounds';
import { showError } from '@/utils/toast';

interface PeerData {
  peer: Peer.Instance;
  userId: string;
}

interface VoiceState {
  isMuted: boolean;
  isDeafened: boolean;
}

interface VoiceChannelContextType {
  joinVoiceChannel: (channelId: string, serverId: string) => void;
  leaveVoiceChannel: () => void;
  isMuted: boolean;
  isDeafened: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
  activeVoiceChannelId: string | null;
  memberStates: Record<string, Partial<VoiceState>>;
  speakingStates: Record<string, boolean>;
  localScreenStream: MediaStream | null;
  remoteScreenStreams: Record<string, MediaStream>;
  startScreenShare: (sourceId?: string) => Promise<void>;
  stopScreenShare: () => void;
  userVolumes: Record<string, number>;
  setUserVolume: (userId: string, volume: number) => void;
  
  // Audio Devices & Settings
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedAudioInput: string | null;
  selectedAudioOutput: string | null;
  setSelectedAudioInput: (id: string) => void;
  setSelectedAudioOutput: (id: string) => void;
  
  noiseSuppression: boolean;
  setNoiseSuppression: (val: boolean) => void;
  autoSensitivity: boolean;
  setAutoSensitivity: (val: boolean) => void;
  sensitivityThreshold: number;
  setSensitivityThreshold: (val: number) => void;
}

const VoiceChannelContext = createContext<VoiceChannelContextType | null>(null);

export const useVoiceChannel = () => {
  const context = useContext(VoiceChannelContext);
  if (!context) {
    throw new Error('useVoiceChannel must be used within a VoiceChannelProvider');
  }
  return context;
};

interface VoiceChannelProviderProps {
  children: React.ReactNode;
  currentUser: User | null;
}

export const VoiceChannelProvider: React.FC<VoiceChannelProviderProps> = ({ children, currentUser }) => {
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [memberStates, setMemberStates] = useState<Record<string, Partial<VoiceState>>>({});
  const [speakingStates, setSpeakingStates] = useState<Record<string, boolean>>({});
  
  // Screen Share States
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
  
  // Audio Devices States
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  
  const [selectedAudioInput, setSelectedAudioInputState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('discord-audio-input');
    return null;
  });
  const [selectedAudioOutput, setSelectedAudioOutputState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('discord-audio-output');
    return null;
  });

  // Advanced Audio Settings
  const [noiseSuppression, setNoiseSuppressionState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('discord-noise-suppression');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [autoSensitivity, setAutoSensitivityState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('discord-auto-sensitivity');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [sensitivityThreshold, setSensitivityThresholdState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('discord-sensitivity-threshold');
      return saved !== null ? parseInt(saved, 10) : 50;
    }
    return 50;
  });
  
  const selectedAudioInputRef = useRef(selectedAudioInput);
  const noiseSuppressionRef = useRef(noiseSuppression);
  const autoSensitivityRef = useRef(autoSensitivity);
  const sensitivityThresholdRef = useRef(sensitivityThreshold);

  useEffect(() => { selectedAudioInputRef.current = selectedAudioInput; }, [selectedAudioInput]);
  useEffect(() => { noiseSuppressionRef.current = noiseSuppression; }, [noiseSuppression]);
  useEffect(() => { autoSensitivityRef.current = autoSensitivity; }, [autoSensitivity]);
  useEffect(() => { sensitivityThresholdRef.current = sensitivityThreshold; }, [sensitivityThreshold]);

  // Volume States
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('discord-user-volumes');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {};
  });
  
  const userVolumesRef = useRef(userVolumes);
  useEffect(() => { userVolumesRef.current = userVolumes; }, [userVolumes]);
  const gainNodesRef = useRef<Record<string, GainNode>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerData[]>([]);
  const signalingChannelRef = useRef<any>(null);
  const audioAnalysisRefs = useRef<Record<string, { cancel: () => void; close: () => void }>>({});
  const activeVoiceChannelIdRef = useRef(activeVoiceChannelId);
  const activeServerIdRef = useRef(activeServerId);
  const wasMutedBeforeDeafen = useRef(false);
  const sessionTokenRef = useRef<string | null>(null);
  const isJoiningRef = useRef(false);

  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted]);
  useEffect(() => { isDeafenedRef.current = isDeafened }, [isDeafened]);

  // Fetch Audio Devices
  useEffect(() => {
    const getDevices = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
      } catch (e) {
        console.error("Error enumerating devices", e);
      }
    };
    
    getDevices();
    
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', getDevices);
      return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }
  }, []);

  useEffect(() => {
    Object.entries(gainNodesRef.current).forEach(([userId, gainNode]) => {
      const baseVolume = (userVolumesRef.current[userId] ?? 100) / 100;
      gainNode.gain.value = isDeafened ? 0 : baseVolume;
    });
  }, [isDeafened]);

  useEffect(() => {
    activeVoiceChannelIdRef.current = activeVoiceChannelId;
    activeServerIdRef.current = activeServerId;
  }, [activeVoiceChannelId, activeServerId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      sessionTokenRef.current = data.session?.access_token || null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      sessionTokenRef.current = session?.access_token || null;
    });
    return () => subscription.unsubscribe();
  }, []);

  const requestMicrophone = useCallback(async (playSounds = true) => {
    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: noiseSuppressionRef.current,
        autoGainControl: true,
      };
      
      if (selectedAudioInputRef.current) {
        audioConstraints.deviceId = { exact: selectedAudioInputRef.current };
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      }
      
      localStreamRef.current = stream;
      
      const muted = !stream.getAudioTracks()[0].enabled;
      setIsMuted(muted);
      if (currentUser) {
        setMemberStates(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], isMuted: muted } }));
        supabase.from('server_members').update({ is_muted: muted }).eq('user_id', currentUser.id).then();
      }

      if (!muted && playSounds) playSound('/unmute.mp3');
      
      return stream;
    } catch (err) {
      console.error('Failed to get user media', err);
      showError("Accesso al microfono negato. Controlla le impostazioni del browser.");
      setIsMuted(true);
      if (currentUser) {
        setMemberStates(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], isMuted: true } }));
        supabase.from('server_members').update({ is_muted: true }).eq('user_id', currentUser.id).then();
      }
      return null;
    }
  }, [currentUser]);

  const replaceAudioTrack = useCallback(async (constraints: MediaTrackConstraints) => {
    if (activeVoiceChannelIdRef.current && localStreamRef.current) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: constraints
        });
        const newTrack = newStream.getAudioTracks()[0];
        const oldTrack = localStreamRef.current.getAudioTracks()[0];

        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newTrack);
        oldTrack.stop();

        peersRef.current.forEach(({ peer }) => {
          try {
            peer.replaceTrack(oldTrack, newTrack, localStreamRef.current!);
          } catch (e) {
            console.error("Error replacing track", e);
          }
        });
      } catch (e) {
        console.error("Failed to replace audio track", e);
      }
    }
  }, []);

  const setSelectedAudioInput = useCallback((id: string) => {
    setSelectedAudioInputState(id);
    if (typeof window !== 'undefined') localStorage.setItem('discord-audio-input', id);
    replaceAudioTrack({
      deviceId: { exact: id },
      noiseSuppression: noiseSuppressionRef.current,
      echoCancellation: true,
      autoGainControl: true,
    });
  }, [replaceAudioTrack]);

  const setNoiseSuppression = useCallback((val: boolean) => {
    setNoiseSuppressionState(val);
    if (typeof window !== 'undefined') localStorage.setItem('discord-noise-suppression', String(val));
    replaceAudioTrack({
      deviceId: selectedAudioInputRef.current ? { exact: selectedAudioInputRef.current } : undefined,
      noiseSuppression: val,
      echoCancellation: true,
      autoGainControl: true,
    });
  }, [replaceAudioTrack]);

  const setAutoSensitivity = useCallback((val: boolean) => {
    setAutoSensitivityState(val);
    if (typeof window !== 'undefined') localStorage.setItem('discord-auto-sensitivity', String(val));
  }, []);

  const setSensitivityThreshold = useCallback((val: number) => {
    setSensitivityThresholdState(val);
    if (typeof window !== 'undefined') localStorage.setItem('discord-sensitivity-threshold', String(val));
  }, []);

  const setSelectedAudioOutput = useCallback((id: string) => {
    setSelectedAudioOutputState(id);
    if (typeof window !== 'undefined') localStorage.setItem('discord-audio-output', id);

    document.querySelectorAll('audio[data-user-id]').forEach((audio: any) => {
      if (typeof audio.setSinkId === 'function') {
        audio.setSinkId(id).catch(console.error);
      }
    });
  }, []);

  useEffect(() => {
    const initializeMedia = async () => {
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (permissionStatus.state === 'granted') {
            await requestMicrophone(false);
          } else {
            setIsMuted(true);
            if (currentUser) {
              setMemberStates(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], isMuted: true } }));
              supabase.from('server_members').update({ is_muted: true }).eq('user_id', currentUser.id).then();
            }
          }
        } catch (e) {
          console.warn("Permission query for microphone not supported.", e);
        }
      }
    };
    initializeMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      localScreenStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [requestMicrophone, currentUser]);

  // VAD (Voice Activity Detection) Loop
  const currentUserId = currentUser?.id;

  useEffect(() => {
    if (!activeVoiceChannelId || !localStreamRef.current || !currentUserId) {
      if (currentUserId) {
        setSpeakingStates(prev => {
          if (prev[currentUserId]) {
            const next = { ...prev };
            delete next[currentUserId];
            return next;
          }
          return prev;
        });
      }
      return;
    }

    const stream = localStreamRef.current;
    
    // Cloniamo la traccia per l'analisi, così possiamo disabilitare la traccia principale (per mutare)
    // senza interrompere il flusso di dati verso l'analizzatore.
    const analysisTrack = stream.getAudioTracks()[0].clone();
    analysisTrack.enabled = true; // FIX: Forza l'abilitazione della traccia clonata per evitare deadlock
    const analysisStream = new MediaStream([analysisTrack]);
    
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(analysisStream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let animationFrameId: number;
    let holdTimeout: NodeJS.Timeout | null = null;
    let currentlySpeaking = false;

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const avg = bufferLength > 0 ? sum / bufferLength : 0;
      
      // Mappiamo la soglia (0-100) al valore dell'analizzatore (0-255)
      const thresholdValue = autoSensitivityRef.current ? 30 : (sensitivityThresholdRef.current / 100) * 255;
      const isOverThreshold = avg > thresholdValue;

      if (isOverThreshold) {
        currentlySpeaking = true;
        if (holdTimeout) clearTimeout(holdTimeout);
        // Mantiene lo stato "parlando" per 500ms dopo che il volume scende sotto la soglia
        holdTimeout = setTimeout(() => {
          currentlySpeaking = false;
        }, 500);
      }

      const isSpeaking = currentlySpeaking;

      // Applica il VAD alla traccia principale (Gating)
      if (localStreamRef.current && localStreamRef.current.getAudioTracks()[0]) {
        const mainTrack = localStreamRef.current.getAudioTracks()[0];
        // La traccia è abilitata solo se l'utente sta parlando E non è mutato manualmente E non è deafened
        mainTrack.enabled = isSpeaking && !isMutedRef.current && !isDeafenedRef.current;
      }

      setSpeakingStates(prev => {
        if (!!prev[currentUserId] === isSpeaking) return prev;
        return { ...prev, [currentUserId]: isSpeaking };
      });

      animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (holdTimeout) clearTimeout(holdTimeout);
      analysisTrack.stop();
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
      if (currentUserId) {
        setSpeakingStates(prev => {
          if (prev[currentUserId]) {
            const next = { ...prev };
            delete next[currentUserId];
            return next;
          }
          return prev;
        });
      }
    };
  }, [activeVoiceChannelId, currentUserId]); // Dipende solo dall'ID, non dall'intero oggetto currentUser

  const toggleMute = useCallback(async () => {
    if (!currentUser) return;
    let stream = localStreamRef.current;

    if (!stream) {
      stream = await requestMicrophone();
      if (!stream) return;
      return;
    }

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState) playSound('/mute.mp3');
    else playSound('/unmute.mp3');

    setMemberStates(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], isMuted: newMutedState } }));
    supabase.from('server_members').update({ is_muted: newMutedState }).eq('user_id', currentUser.id).then();

    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'state-update',
        payload: { userId: currentUser.id, state: { isMuted: newMutedState } },
      });
    }
  }, [currentUser, requestMicrophone, isMuted]);

  const toggleDeafen = useCallback(() => {
    if (!currentUser) return;

    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);
    let finalMuteState = isMuted;

    if (newDeafenState) {
      playSound('/deafen.mp3');
      wasMutedBeforeDeafen.current = isMuted;
      if (!isMuted) {
        setIsMuted(true);
        finalMuteState = true;
      }
    } else {
      playSound('/undeafen.mp3');
      if (!wasMutedBeforeDeafen.current && isMuted) {
        setIsMuted(false);
        finalMuteState = false;
      }
    }
    
    setMemberStates(prev => ({ ...prev, [currentUser.id]: { isMuted: finalMuteState, isDeafened: newDeafenState } }));
    supabase.from('server_members').update({ is_muted: finalMuteState, is_deafened: newDeafenState }).eq('user_id', currentUser.id).then();

    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'state-update',
        payload: { userId: currentUser.id, state: { isMuted: finalMuteState, isDeafened: newDeafenState } },
      });
    }
  }, [currentUser, isDeafened, isMuted]);

  const stopScreenShare = useCallback(() => {
    if (!currentUser || !localScreenStreamRef.current) return;
    localScreenStreamRef.current.getTracks().forEach(t => t.stop());
    peersRef.current.forEach(({ peer }) => {
      try { peer.removeStream(localScreenStreamRef.current!); } catch (e) { console.error(e) }
    });
    localScreenStreamRef.current = null;
    setLocalScreenStream(null);
    
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'screen-stop',
        payload: { userId: currentUser.id }
      });
    }
  }, [currentUser]);

  const startScreenShare = useCallback(async (sourceId?: string) => {
    if (!currentUser) return;
    
    if (localScreenStreamRef.current) {
      stopScreenShare();
    }

    try {
      let stream: MediaStream | null = null;
      let lastError: any = null;
      
      if (sourceId && sourceId !== 'native-browser') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'desktop' } } as any,
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } as any
          });
        } catch (e) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } as any
            });
          } catch (vidErr) {
            lastError = vidErr;
          }
        }
      }
      
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch (e) {
          lastError = e;
        }
      }

      if (!stream) {
        if (lastError?.name !== 'NotAllowedError') {
          showError("Permessi negati o API di sistema non supportata in questo ambiente.");
        }
        return;
      }
      
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      
      localScreenStreamRef.current = stream;
      setLocalScreenStream(stream);
      
      peersRef.current.forEach(({ peer }) => {
        try { peer.addStream(stream!); } catch (e) { console.error(e) }
      });
    } catch (err: any) {
      console.error("Errore imprevisto condivisione schermo:", err);
      showError("Si è verificato un errore durante l'avvio della condivisione.");
    }
  }, [currentUser, stopScreenShare]);

  const setUserVolume = useCallback((userId: string, volume: number) => {
    setUserVolumes(prev => {
      const newVolumes = { ...prev, [userId]: volume };
      if (typeof window !== 'undefined') {
        localStorage.setItem('discord-user-volumes', JSON.stringify(newVolumes));
      }
      return newVolumes;
    });
    
    if (gainNodesRef.current[userId]) {
      gainNodesRef.current[userId].gain.value = isDeafenedRef.current ? 0 : volume / 100;
    }
  }, []);

  const removePeer = (userId: string) => {
    const audioEl = document.querySelector(`audio[data-user-id="${userId}"]`);
    if (audioEl) document.body.removeChild(audioEl);
    peersRef.current = peersRef.current.filter(p => p.userId !== userId);

    const analysis = audioAnalysisRefs.current[userId];
    if (analysis) {
      analysis.cancel();
      analysis.close();
      delete audioAnalysisRefs.current[userId];
    }
    
    delete gainNodesRef.current[userId];

    setSpeakingStates(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setRemoteScreenStreams(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const createPeer = useCallback((userId: string, initiator: boolean, channel: any, receivedSignal?: any) => {
    const stream = localStreamRef.current;
    if (!stream || !currentUser) return;

    const peer = new Peer({ initiator, trickle: true, stream });

    if (localScreenStreamRef.current) {
      peer.addStream(localScreenStreamRef.current);
    }

    peer.on('signal', signal => {
      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: currentUser.id, to: userId, signal },
      });
    });

    peer.on('stream', remoteStream => {
      if (remoteStream.getVideoTracks().length > 0) {
        setRemoteScreenStreams(prev => ({ ...prev, [userId]: remoteStream }));
        
        remoteStream.getVideoTracks()[0].onended = () => {
          setRemoteScreenStreams(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        };
        return;
      }

      if (document.querySelector(`audio[data-user-id="${userId}"]`)) return;
      
      const audioContext = new AudioContext();
      audioContext.resume(); 
      
      const source = audioContext.createMediaStreamSource(remoteStream);
      
      const gainNode = audioContext.createGain();
      const initialVolume = (userVolumesRef.current[userId] ?? 100) / 100;
      gainNode.gain.value = isDeafenedRef.current ? 0 : initialVolume;
      gainNodesRef.current[userId] = gainNode;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const audio = document.createElement('audio');
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.muted = true; 
      audio.setAttribute('data-user-id', userId);
      
      if (selectedAudioOutput && typeof (audio as any).setSinkId === 'function') {
        (audio as any).setSinkId(selectedAudioOutput).catch(console.error);
      }
      
      document.body.appendChild(audio);

      const analyser = audioContext.createAnalyser();
      source.connect(analyser); 
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animationFrameId: number;

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = bufferLength > 0 ? sum / bufferLength : 0;
        const isSpeaking = avg > 30;

        setSpeakingStates(prev => {
          if (!!prev[userId] === isSpeaking) return prev;
          return { ...prev, [userId]: isSpeaking };
        });

        animationFrameId = requestAnimationFrame(checkVolume);
      };
      checkVolume();

      audioAnalysisRefs.current[userId] = {
        cancel: () => cancelAnimationFrame(animationFrameId),
        close: () => audioContext.state !== 'closed' && audioContext.close(),
      };
    });

    peer.on('close', () => removePeer(userId));
    peer.on('error', (err) => {
      console.error(`Peer error with ${userId}:`, err);
      removePeer(userId);
    });

    if (receivedSignal) peer.signal(receivedSignal);

    peersRef.current = [...peersRef.current.filter(p => p.userId !== userId), { peer, userId }];
  }, [currentUser, selectedAudioOutput]);

  const leaveVoiceChannel = useCallback(async () => {
    const channelToLeave = activeVoiceChannelIdRef.current;
    const serverToLeave = activeServerIdRef.current;

    if (!currentUser || !channelToLeave || !serverToLeave) return;
    
    playSound('/exit.mp3');

    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
      setLocalScreenStream(null);
    }

    if (signalingChannelRef.current) {
      await signalingChannelRef.current.untrack();
      await supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }

    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];

    Object.values(audioAnalysisRefs.current).forEach(analysis => {
      analysis.cancel();
      analysis.close();
    });
    audioAnalysisRefs.current = {};
    gainNodesRef.current = {};

    document.querySelectorAll('audio[data-user-id]').forEach(el => el.remove());

    setActiveVoiceChannelId(null);
    setActiveServerId(null);
    setMemberStates({});
    setSpeakingStates({});
    setRemoteScreenStreams({});

    await supabase
      .from('server_members')
      .update({ voice_channel_id: null })
      .eq('server_id', serverToLeave)
      .eq('user_id', currentUser.id);

  }, [currentUser]);

  const joinVoiceChannel = useCallback(async (channelId: string, serverId: string) => {
    if (!currentUser || isJoiningRef.current) return;
    
    isJoiningRef.current = true;
    try {
      if (activeVoiceChannelIdRef.current) {
        await leaveVoiceChannel();
      }
      
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await requestMicrophone();
        if (!stream) {
          showError("Impossibile entrare nel canale vocale senza accesso al microfono.");
          return;
        }
      }
      
      playSound('/enter.mp3');

      setActiveVoiceChannelId(channelId);
      setActiveServerId(serverId);

      await supabase
        .from('server_members')
        .update({ voice_channel_id: channelId })
        .eq('server_id', serverId)
        .eq('user_id', currentUser.id);

      const channel = supabase.channel(`voice-chat:${channelId}`, {
        config: { presence: { key: currentUser.id } },
      });

      channel.on('presence', { event: 'sync' }, () => {
        const userIds = Object.keys(channel.presenceState());
        userIds.forEach(userId => {
          if (userId !== currentUser.id && !peersRef.current.some(p => p.userId === userId)) {
            createPeer(userId, true, channel);
          }
        });
        peersRef.current.forEach(peerData => {
          if (!userIds.includes(peerData.userId)) {
            peerData.peer.destroy();
            removePeer(peerData.userId);
          }
        });
      });

      channel.on('presence', { event: 'join' }, ({ key }) => {
        if (key !== currentUser?.id) {
          if (currentUser) {
            channel.send({
              type: 'broadcast',
              event: 'state-update',
              payload: {
                userId: currentUser.id,
                state: { isMuted: isMutedRef.current, isDeafened: isDeafenedRef.current },
              },
            });
          }
        }
      });
      
      channel.on('presence', { event: 'leave' }, ({ key }) => {
        const peerData = peersRef.current.find(p => p.userId === key);
        if (peerData) {
          peerData.peer.destroy();
          removePeer(key);
        }
        setMemberStates(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setRemoteScreenStreams(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      });

      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        if (payload.to !== currentUser.id) return;
        const peerData = peersRef.current.find(p => p.userId === payload.from);
        if (peerData) {
          if (!peerData.peer.destroyed) {
            peerData.peer.signal(payload.signal);
          }
        } else {
          createPeer(payload.from, false, channel, payload.signal);
        }
      });

      channel.on('broadcast', { event: 'state-update' }, ({ payload }) => {
        setMemberStates(prev => ({
          ...prev,
          [payload.userId]: { ...prev[payload.userId], ...payload.state },
        }));
      });

      channel.on('broadcast', { event: 'screen-stop' }, ({ payload }) => {
        setRemoteScreenStreams(prev => {
          const next = { ...prev };
          delete next[payload.userId];
          return next;
        });
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({});
          if (currentUser) {
            channel.send({
              type: 'broadcast',
              event: 'state-update',
              payload: {
                userId: currentUser.id,
                state: { isMuted, isDeafened },
              },
            });
          }
        }
      });

      signalingChannelRef.current = channel;
    } finally {
      isJoiningRef.current = false;
    }
  }, [currentUser, createPeer, leaveVoiceChannel, requestMicrophone, isMuted, isDeafened]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeVoiceChannelIdRef.current && activeServerIdRef.current && currentUser && sessionTokenRef.current) {
        const SUPABASE_URL = "https://ihweyawbtgehuvvjrqhy.supabase.co";
        const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod2V5YXdidGdlaHV2dmpycWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDM0MDAsImV4cCI6MjA5MTQxOTQwMH0.0H0gVSN8_CCdw76Qcld099bEsw0wfX4M284SHTOsLrg";

        fetch(`${SUPABASE_URL}/rest/v1/server_members?server_id=eq.${activeServerIdRef.current}&user_id=eq.${currentUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${sessionTokenRef.current}`
          },
          body: JSON.stringify({ voice_channel_id: null }),
          keepalive: true
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  const value = {
    joinVoiceChannel,
    leaveVoiceChannel,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    activeVoiceChannelId,
    memberStates,
    speakingStates,
    localScreenStream,
    remoteScreenStreams,
    startScreenShare,
    stopScreenShare,
    userVolumes,
    setUserVolume,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    noiseSuppression,
    setNoiseSuppression,
    autoSensitivity,
    setAutoSensitivity,
    sensitivityThreshold,
    setSensitivityThreshold,
  };

  return (
    <VoiceChannelContext.Provider value={value}>
      {children}
    </VoiceChannelContext.Provider>
  );
};