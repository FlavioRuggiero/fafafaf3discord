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
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerData[]>([]);
  const signalingChannelRef = useRef<any>(null);
  const audioAnalysisRefs = useRef<Record<string, { cancel: () => void; close: () => void }>>({});
  const activeVoiceChannelIdRef = useRef(activeVoiceChannelId);
  const activeServerIdRef = useRef(activeServerId);
  const wasMutedBeforeDeafen = useRef(false);

  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted]);
  useEffect(() => { isDeafenedRef.current = isDeafened }, [isDeafened]);

  useEffect(() => {
    activeVoiceChannelIdRef.current = activeVoiceChannelId;
    activeServerIdRef.current = activeServerId;
  }, [activeVoiceChannelId, activeServerId]);

  const requestMicrophone = useCallback(async (playSounds = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      localStreamRef.current = stream;
      
      const muted = !stream.getAudioTracks()[0].enabled;
      setIsMuted(muted);
      if (currentUser) {
        setMemberStates(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], isMuted: muted } }));
        // Sincronizzazione globale Database
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
        // Sincronizzazione globale Database
        supabase.from('server_members').update({ is_muted: true }).eq('user_id', currentUser.id).then();
      }
      return null;
    }
  }, [currentUser]);

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
              // Sincronizzazione globale Database
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
    };
  }, [requestMicrophone, currentUser]);

  const toggleMute = useCallback(async () => {
    if (!currentUser) return;
    let stream = localStreamRef.current;

    if (!stream) {
      stream = await requestMicrophone();
      if (!stream) return;
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length > 0) {
      const isCurrentlyEnabled = audioTracks[0].enabled;
      audioTracks[0].enabled = !isCurrentlyEnabled;
      const newMutedState = isCurrentlyEnabled;
      setIsMuted(newMutedState);
      
      if (newMutedState) playSound('/mute.mp3');
      else playSound('/unmute.mp3');

      setMemberStates(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], isMuted: newMutedState } }));
      
      // Sincronizzazione globale Database
      supabase.from('server_members').update({ is_muted: newMutedState }).eq('user_id', currentUser.id).then();

      if (signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'state-update',
          payload: { userId: currentUser.id, state: { isMuted: newMutedState } },
        });
      }
    }
  }, [currentUser, requestMicrophone]);

  const toggleDeafen = useCallback(() => {
    if (!currentUser) return;

    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);
    let finalMuteState = isMuted;

    if (newDeafenState) {
      playSound('/deafen.mp3');
      wasMutedBeforeDeafen.current = isMuted;
      if (!isMuted) {
        const stream = localStreamRef.current;
        if (stream?.getAudioTracks()[0]) {
          stream.getAudioTracks()[0].enabled = false;
          setIsMuted(true);
          finalMuteState = true;
        }
      }
    } else {
      playSound('/undeafen.mp3');
      if (!wasMutedBeforeDeafen.current && isMuted) {
        const stream = localStreamRef.current;
        if (stream?.getAudioTracks()[0]) {
          stream.getAudioTracks()[0].enabled = true;
          setIsMuted(false);
          finalMuteState = false;
        }
      }
    }
    
    setMemberStates(prev => ({ ...prev, [currentUser.id]: { isMuted: finalMuteState, isDeafened: newDeafenState } }));

    // Sincronizzazione globale Database
    supabase.from('server_members').update({ is_muted: finalMuteState, is_deafened: newDeafenState }).eq('user_id', currentUser.id).then();

    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'state-update',
        payload: { userId: currentUser.id, state: { isMuted: finalMuteState, isDeafened: newDeafenState } },
      });
    }
  }, [currentUser, isDeafened, isMuted]);

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
    setSpeakingStates(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const createPeer = useCallback((userId: string, initiator: boolean, channel: any, receivedSignal?: any) => {
    const stream = localStreamRef.current;
    if (!stream || !currentUser) return;

    const peer = new Peer({ initiator, trickle: true, stream });

    peer.on('signal', signal => {
      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: currentUser.id, to: userId, signal },
      });
    });

    peer.on('stream', remoteStream => {
      if (document.querySelector(`audio[data-user-id="${userId}"]`)) return;
      const audio = document.createElement('audio');
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.setAttribute('data-user-id', userId);
      document.body.appendChild(audio);

      // Setup audio analysis for speaking indicator
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(remoteStream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animationFrameId: number;

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = bufferLength > 0 ? sum / bufferLength : 0;
        const isSpeaking = avg > 30; // Threshold for speaking

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
  }, [currentUser]);

  const leaveVoiceChannel = useCallback(async () => {
    const channelToLeave = activeVoiceChannelIdRef.current;
    const serverToLeave = activeServerIdRef.current;

    if (!currentUser || !channelToLeave || !serverToLeave) return;
    
    playSound('/exit.mp3');

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

    document.querySelectorAll('audio[data-user-id]').forEach(el => el.remove());

    setActiveVoiceChannelId(null);
    setActiveServerId(null);
    setMemberStates({});
    setSpeakingStates({});

    await supabase
      .from('server_members')
      .update({ voice_channel_id: null })
      .eq('server_id', serverToLeave)
      .eq('user_id', currentUser.id);

  }, [currentUser]);

  const joinVoiceChannel = useCallback(async (channelId: string, serverId: string) => {
    if (!currentUser) return;
    
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
  }, [currentUser, createPeer, leaveVoiceChannel, requestMicrophone, isMuted, isDeafened]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeVoiceChannelIdRef.current) {
        leaveVoiceChannel();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [leaveVoiceChannel]);

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
  };

  return (
    <VoiceChannelContext.Provider value={value}>
      {children}
    </VoiceChannelContext.Provider>
  );
};