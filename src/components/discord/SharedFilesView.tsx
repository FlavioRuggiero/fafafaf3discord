"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/types/discord';
import { FileUp, Search, Menu, Download, X, File as FileIcon, Trash2, UploadCloud, HardDrive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFileShare } from '@/contexts/FileShareContext';
import { Avatar } from './Avatar';
import { useShop } from '@/contexts/ShopContext';

interface SharedFilesViewProps {
  currentUser: User;
  onlineUserIds: Set<string>;
  onToggleSidebar?: () => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const SharedFilesView = ({ currentUser, onlineUserIds, onToggleSidebar }: SharedFilesViewProps) => {
  const { getThemeClass, getThemeStyle } = useShop();
  const { shareFile, removeFile, downloadFile, downloads } = useFileShare();
  
  const [files, setFiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('p2p_shared_files')
      .select('*, profiles(first_name, avatar_url, avatar_decoration)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFiles(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFiles();

    const sub = supabase.channel('p2p_files_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_shared_files' }, fetchFiles)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !newTitle.trim()) return;
    
    setIsSharing(true);
    await shareFile(newTitle.trim(), newDesc.trim(), selectedFile);
    setIsSharing(false);
    setShowShareModal(false);
    setNewTitle("");
    setNewDesc("");
    setSelectedFile(null);
  };

  // Filtra i file: mostra solo quelli degli utenti online (o i propri) e applica la ricerca
  const availableFiles = files.filter(f => {
    const isOnline = onlineUserIds.has(f.user_id) || f.user_id === currentUser.id;
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    return isOnline && matchesSearch;
  });

  const activeDownloads = Object.values(downloads);

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative overflow-hidden h-full min-w-0">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2023] shadow-sm bg-[#313338] z-10 flex-shrink-0">
        <div className="flex items-center text-white font-semibold">
          {onToggleSidebar && (
            <button onClick={onToggleSidebar} className="md:hidden mr-3 text-[#b5bac1] hover:text-[#dbdee1] transition-colors">
              <Menu size={24} />
            </button>
          )}
          <FileUp className="mr-2 text-[#949ba4]" size={20} />
          File Condivisi (P2P)
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Condivisione File P2P</h1>
              <p className="text-[#b5bac1] max-w-2xl">
                Condividi file direttamente con gli utenti online. Il trasferimento avviene da computer a computer, 
                <strong className="text-white"> nessun file viene salvato sui nostri server!</strong> I file spariranno quando chiuderai l'app.
              </p>
            </div>
            <button 
              onClick={() => setShowShareModal(true)}
              className="bg-brand hover:bg-brand/80 text-white font-medium px-6 py-2.5 rounded transition-colors shadow-lg flex items-center justify-center gap-2 flex-shrink-0"
            >
              <UploadCloud size={18} />
              Condividi un File
            </button>
          </div>

          {/* Active Downloads Banner */}
          {activeDownloads.length > 0 && (
            <div className="mb-8 space-y-2">
              {activeDownloads.map((dl, idx) => (
                <div key={idx} className="bg-[#2b2d31] border border-brand/50 rounded-lg p-4 shadow-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium text-sm flex items-center gap-2">
                      <Download size={16} className="text-brand animate-bounce" />
                      Scaricando: {dl.fileName}
                    </span>
                    <span className="text-brand font-bold text-sm">{dl.progress}%</span>
                  </div>
                  <div className="w-full bg-[#1e1f22] h-2 rounded-full overflow-hidden">
                    <div className="bg-brand h-full transition-all duration-300" style={{ width: `${dl.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="relative mb-6">
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cerca file per nome o titolo..."
              className="w-full bg-[#1e1f22] text-[#dbdee1] p-3 pl-10 rounded-lg outline-none focus:ring-1 focus:ring-brand border border-[#3f4147]"
            />
            <Search size={18} className="absolute left-3 top-3.5 text-[#949ba4]" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : availableFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#949ba4]">
              <HardDrive size={64} className="mb-4 opacity-50" />
              <h2 className="text-xl font-medium text-white mb-2">Nessun file disponibile</h2>
              <p>Nessun utente online sta condividendo file al momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableFiles.map(file => {
                const isMine = file.user_id === currentUser.id;
                return (
                  <div key={file.id} className="bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-5 flex flex-col shadow-sm hover:border-[#3f4147] transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1e1f22] flex items-center justify-center flex-shrink-0 border border-[#3f4147]">
                        <FileIcon size={20} className="text-brand" />
                      </div>
                      {isMine ? (
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="p-1.5 text-[#949ba4] hover:text-[#f23f43] hover:bg-[#f23f43]/10 rounded transition-colors"
                          title="Interrompi condivisione"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => downloadFile(file.id, file.user_id, file.file_name)}
                          className="p-1.5 text-[#949ba4] hover:text-[#23a559] hover:bg-[#23a559]/10 rounded transition-colors"
                          title="Scarica File"
                        >
                          <Download size={18} />
                        </button>
                      )}
                    </div>
                    
                    <h3 className="text-white font-bold text-lg truncate mb-1" title={file.title}>{file.title}</h3>
                    <p className="text-[#949ba4] text-xs font-mono mb-3 truncate" title={file.file_name}>{file.file_name} • {formatBytes(file.file_size)}</p>
                    
                    {file.description && (
                      <p className="text-[#dbdee1] text-sm mb-4 line-clamp-2 flex-1">{file.description}</p>
                    )}
                    
                    <div className="mt-auto pt-4 border-t border-[#1f2023] flex items-center gap-2">
                      <Avatar 
                        src={file.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${file.user_id}`} 
                        decoration={file.profiles?.avatar_decoration} 
                        className="w-6 h-6" 
                      />
                      <span 
                        className={`text-xs font-medium truncate ${getThemeClass(file.profiles?.avatar_decoration)}`}
                        style={getThemeStyle(file.profiles?.avatar_decoration)}
                      >
                        {file.profiles?.first_name || 'Utente'}
                      </span>
                      {isMine && <span className="ml-auto text-[10px] font-bold uppercase text-brand bg-brand/10 px-2 py-0.5 rounded">Tuo</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Condivisione */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="bg-[#313338] rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#1e1f22] flex justify-between items-center bg-[#2b2d31]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UploadCloud className="text-brand" /> Condividi File
              </h2>
              <button onClick={() => setShowShareModal(false)} className="text-[#949ba4] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleShareSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Titolo</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  placeholder="Es. Foto vacanze, Documento progetto..."
                  className="w-full bg-[#1e1f22] text-white rounded p-2.5 outline-none focus:ring-1 focus:ring-brand border border-[#3f4147]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Descrizione (Opzionale)</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Aggiungi qualche dettaglio..."
                  rows={2}
                  className="w-full bg-[#1e1f22] text-white rounded p-2.5 outline-none focus:ring-1 focus:ring-brand border border-[#3f4147] resize-none custom-scrollbar"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">Seleziona File</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#3f4147] hover:border-brand rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#1e1f22]/50"
                >
                  {selectedFile ? (
                    <>
                      <FileIcon size={32} className="text-brand mb-2" />
                      <span className="text-white font-medium truncate max-w-full px-4">{selectedFile.name}</span>
                      <span className="text-[#949ba4] text-xs mt-1">{formatBytes(selectedFile.size)}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={32} className="text-[#949ba4] mb-2" />
                      <span className="text-[#dbdee1] font-medium">Clicca per selezionare un file</span>
                      <span className="text-[#949ba4] text-xs mt-1">Qualsiasi formato supportato</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)} 
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={!selectedFile || !newTitle.trim() || isSharing}
                  className="w-full py-3 bg-brand hover:bg-brand/80 text-white font-bold rounded transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharing ? 'Condivisione in corso...' : 'Condividi Ora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};