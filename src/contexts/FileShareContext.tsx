"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import Peer from 'simple-peer';
import { showSuccess, showError } from '@/utils/toast';

export type DownloadStatus = {
  progress: number;
  status: 'connecting' | 'downloading' | 'done' | 'error';
  fileName: string;
};

interface FileShareContextType {
  sharedFiles: Map<string, File>;
  downloads: Record<string, DownloadStatus>;
  shareFile: (title: string, description: string, file: File) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  downloadFile: (fileId: string, ownerId: string, fileName: string) => void;
}

const FileShareContext = createContext<FileShareContextType | null>(null);

export const useFileShare = () => {
  const ctx = useContext(FileShareContext);
  if (!ctx) throw new Error("Missing FileShareProvider");
  return ctx;
};

export const FileShareProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [sharedFiles, setSharedFiles] = useState<Map<string, File>>(new Map());
  const [downloads, setDownloads] = useState<Record<string, DownloadStatus>>({});
  
  const sharedFilesRef = useRef(sharedFiles);
  useEffect(() => { sharedFilesRef.current = sharedFiles; }, [sharedFiles]);

  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    
    // Pulisce i vecchi file dal DB all'avvio
    supabase.from('p2p_shared_files').delete().eq('user_id', user.id).then();

    const channel = supabase.channel(`p2p_signaling`);
    
    channel.on('broadcast', { event: 'p2p_signal' }, ({ payload }) => {
      if (payload.targetId !== user.id) return;

      const { transferId, senderId, fileId, signal } = payload;

      if (signal.type === 'offer') {
        // Siamo il mittente (User A) che riceve una richiesta dal destinatario (User B)
        if (!fileId) return;
        const file = sharedFilesRef.current.get(fileId);
        if (!file) return; // File non più disponibile

        const peer = new Peer({ initiator: false, trickle: true });
        peersRef.current[transferId] = peer;

        peer.on('signal', answerSignal => {
          channel.send({
            type: 'broadcast',
            event: 'p2p_signal',
            payload: { transferId, targetId: senderId, senderId: user.id, signal: answerSignal }
          });
        });

        peer.on('connect', () => {
          // Invia i metadati
          peer.send(JSON.stringify({ type: 'meta', name: file.name, size: file.size }));
          
          let offset = 0;
          const chunkSize = 64 * 1024; // 64KB per chunk
          
          const sendNextChunk = () => {
            if (offset >= file.size) {
              peer.send('__EOF__');
              setTimeout(() => { peer.destroy(); delete peersRef.current[transferId]; }, 1000);
              return;
            }
            const slice = file.slice(offset, offset + chunkSize);
            slice.arrayBuffer().then(buffer => {
              try {
                peer.send(new Uint8Array(buffer));
                offset += chunkSize;
                
                // Gestione della backpressure per evitare crash con file grandi
                const checkBufferAndSend = () => {
                  if ((peer as any)._channel && (peer as any)._channel.bufferedAmount > 1024 * 1024 * 2) {
                    setTimeout(checkBufferAndSend, 50);
                  } else {
                    sendNextChunk();
                  }
                };
                checkBufferAndSend();
              } catch (e) {
                console.error("Errore invio chunk", e);
                peer.destroy();
              }
            });
          };
          
          setTimeout(sendNextChunk, 100);
        });

        peer.on('error', err => {
          console.error("Errore Peer (mittente):", err);
          peer.destroy();
          delete peersRef.current[transferId];
        });

        peer.signal(signal);
      } 
      else if (signal.type === 'answer' || signal.candidate) {
        // Siamo il destinatario (User B) che riceve la risposta
        const peer = peersRef.current[transferId];
        if (peer && !peer.destroyed) {
          peer.signal(signal);
        }
      }
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
      }
    });

    return () => {
      supabase.removeChannel(channel);
      supabase.from('p2p_shared_files').delete().eq('user_id', user.id).then();
    };
  }, [user]);

  const shareFile = async (title: string, description: string, file: File) => {
    if (!user) return;
    const { data, error } = await supabase.from('p2p_shared_files').insert({
      user_id: user.id,
      title,
      description,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type
    }).select('id').single();

    if (error || !data) {
      showError("Errore durante la condivisione del file.");
      return;
    }

    setSharedFiles(prev => {
      const next = new Map(prev);
      next.set(data.id, file);
      return next;
    });
    showSuccess("File condiviso con successo! Rimarrà disponibile finché sarai online.");
  };

  const removeFile = async (id: string) => {
    await supabase.from('p2p_shared_files').delete().eq('id', id);
    setSharedFiles(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const downloadFile = (fileId: string, ownerId: string, fileName: string) => {
    if (!user || !channelRef.current) return;
    
    const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    setDownloads(prev => ({ ...prev, [transferId]: { progress: 0, status: 'connecting', fileName } }));

    const peer = new Peer({ initiator: true, trickle: true });
    peersRef.current[transferId] = peer;

    peer.on('signal', signal => {
      channelRef.current.send({
        type: 'broadcast',
        event: 'p2p_signal',
        payload: { transferId, targetId: ownerId, senderId: user.id, fileId, signal }
      });
    });

    const chunks: Uint8Array[] = [];
    let receivedSize = 0;
    let expectedSize = 0;
    let actualFileName = fileName;

    peer.on('data', data => {
      if (typeof data === 'string' || (data instanceof Uint8Array && new TextDecoder().decode(data.slice(0, 10)).includes('__EOF__'))) {
        const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
        if (str === '__EOF__') {
          const blob = new Blob(chunks);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = actualFileName;
          a.click();
          URL.revokeObjectURL(url);
          
          setDownloads(prev => ({ ...prev, [transferId]: { progress: 100, status: 'done', fileName: actualFileName } }));
          peer.destroy();
          delete peersRef.current[transferId];
          showSuccess(`Download di ${actualFileName} completato!`);
          
          // Rimuovi la notifica di download dopo 3 secondi
          setTimeout(() => {
            setDownloads(prev => {
              const next = { ...prev };
              delete next[transferId];
              return next;
            });
          }, 3000);
          return;
        }
        try {
          const meta = JSON.parse(str);
          if (meta.type === 'meta') {
            actualFileName = meta.name;
            expectedSize = meta.size;
            setDownloads(prev => ({ ...prev, [transferId]: { progress: 0, status: 'downloading', fileName: actualFileName } }));
          }
        } catch(e) {}
      } else {
        chunks.push(data);
        receivedSize += data.byteLength;
        if (expectedSize > 0) {
          const progress = Math.min(99, Math.round((receivedSize / expectedSize) * 100));
          setDownloads(prev => ({ ...prev, [transferId]: { progress, status: 'downloading', fileName: actualFileName } }));
        }
      }
    });

    peer.on('error', err => {
      console.error("Errore Peer (destinatario):", err);
      setDownloads(prev => ({ ...prev, [transferId]: { progress: 0, status: 'error', fileName: actualFileName } }));
      showError(`Errore durante il download di ${fileName}. L'utente potrebbe essersi disconnesso.`);
      peer.destroy();
      delete peersRef.current[transferId];
      
      setTimeout(() => {
        setDownloads(prev => {
          const next = { ...prev };
          delete next[transferId];
          return next;
        });
      }, 3000);
    });
  };

  return (
    <FileShareContext.Provider value={{ sharedFiles, downloads, shareFile, removeFile, downloadFile }}>
      {children}
    </FileShareContext.Provider>
  );
};