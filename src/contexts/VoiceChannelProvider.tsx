"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Peer from 'simple-peer';
import { User } from '@/types/discord';

interface PeerData {
  peer: Peer.Instance;
  userId: string;
}

interface VoiceChannelContextType {
  joinVoiceChannel: (channelId: string, serverId: string) => void;
  leaveVoiceChannel: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  activeVoiceChannelId: string | null;
}

const VoiceChannelContext = createContext<VoiceChannelContextType | null>(null);

export const useVoiceChannel = () => {
  const context = useContext(VoiceChannelContext);
  if (!context) {
    throw new Error('useVoiceChannel must be used within a VoiceChannelProvider');
  }
  return context;
};

const playTone = (frequency: number, duration: number) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration / 1000);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    console.error("Web Audio API is not supported or failed.", e);
  }
};

interface VoiceChannelProviderProps {
  children: React.ReactNode;
  currentUser: User | null;
}

export const VoiceChannelProvider: React.FC<VoiceChannelProviderProps> = ({ children, currentUser }) => {
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  
  const peersRef = useRef<PeerData[]>([]);
  const signalingChannelRef = useRef<any>(null);
  const activeVoiceChannelIdRef = useRef(activeVoiceChannelId);
  const activeServerIdRef = useRef(activeServerId);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    activeVoiceChannelIdRef.current = activeVoiceChannelId;
    activeServerIdRef.current = activeServerId;
  }, [activeVoiceChannelId, activeServerId]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      .then(stream => setLocalStream(stream))
      .catch(err => console.error('Failed to get user media', err));

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const removePeer = (userId: string) => {
    const audioEl = document.querySelector(`audio[data-user-id="${userId}"]`);
    if (audioEl) document.body.removeChild(audioEl);
    setPeers(prev => prev.filter(p => p.userId !== userId));
  };

  const createPeer = useCallback((userId: string, initiator: boolean, channel: any, receivedSignal?: any) => {
    if (!localStream || !currentUser) return;

    const peer = new Peer({ initiator, trickle: true, stream: localStream });

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
    });

    peer.on('close', () => removePeer(userId));
    peer.on('error', (err) => {
      console.error(`Peer error with ${userId}:`, err);
      removePeer(userId);
    });

    if (receivedSignal) peer.signal(receivedSignal);

    setPeers(prev => [...prev.filter(p => p.userId !== userId), { peer, userId }]);
  }, [localStream, currentUser]);

  const leaveVoiceChannel = useCallback(async () => {
    const channelToLeave = activeVoiceChannelIdRef.current;
    const serverToLeave = activeServerIdRef.current;

    if (!currentUser || !channelToLeave || !serverToLeave) return;
    
    playTone(440, 200);

    if (signalingChannelRef.current) {
      await signalingChannelRef.current.untrack();
      await supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }

    peersRef.current.forEach(({ peer }) => peer.destroy());
    setPeers([]);

    document.querySelectorAll('audio[data-user-id]').forEach(el => el.remove());

    setActiveVoiceChannelId(null);
    setActiveServerId(null);

    // Aggiorniamo il database per notificare a tutti gli altri membri che l'utente è uscito
    await supabase
      .from('server_members')
      .update({ voice_channel_id: null })
      .eq('server_id', serverToLeave)
      .eq('user_id', currentUser.id);

  }, [currentUser]);

  const joinVoiceChannel = useCallback(async (channelId: string, serverId: string) => {
    if (!currentUser || !localStream) return;
    
    if (activeVoiceChannelIdRef.current) {
      await leaveVoiceChannel();
    }
    
    playTone(880, 150);

    setActiveVoiceChannelId(channelId);
    setActiveServerId(serverId);

    // Aggiorniamo il database per notificare a tutti gli altri membri che l'utente è entrato
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
    });
    
    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key !== currentUser.id) {
        playTone(880, 150);
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key !== currentUser.id) {
        playTone(440, 200);
      }
      const peerData = peersRef.current.find(p => p.userId === key);
      if (peerData) {
        peerData.peer.destroy();
        removePeer(key);
      }
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

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({});
    });

    signalingChannelRef.current = channel;
  }, [currentUser, localStream, createPeer, leaveVoiceChannel]);

  const toggleMute = () => {
    if (localStream) {
      const isCurrentlyMuted = !localStream.getAudioTracks()[0].enabled;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isCurrentlyMuted;
      });
      setIsMuted(!isCurrentlyMuted);
    }
  };
  
  useEffect(() => {
    const handleBeforeUnload = () => {
      const channelToLeave = activeVoiceChannelIdRef.current;
      const serverToLeave = activeServerIdRef.current;
      if (currentUser && channelToLeave && serverToLeave) {
        supabase
          .from('server_members')
          .update({ voice_channel_id: null })
          .eq('server_id', serverToLeave)
          .eq('user_id', currentUser.id)
          .then(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (activeVoiceChannelIdRef.current) {
        leaveVoiceChannel();
      }
    };
  }, [leaveVoiceChannel, currentUser]);

  const value = {
    joinVoiceChannel,
    leaveVoiceChannel,
    isMuted,
    toggleMute,
    activeVoiceChannelId,
  };

  return (
    <VoiceChannelContext.Provider value={value}>
      {children}
    </VoiceChannelContext.Provider>
  );
};