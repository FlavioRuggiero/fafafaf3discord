import React, { useState, useEffect, useRef } from "react";
import { Server } from "@/types/discord";
import { X, Trash2, Upload, Mic, Square, Volume2 } from "lucide-react";

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: Server[];
  joinedServerIds: string[];
  onJoin: (server: Server) => void;
}

export const DiscoverServersModal = ({ isOpen, onClose, servers, joinedServerIds, onJoin }: DiscoverModalProps) => {
  if (!isOpen) return null;

  const availableServers = servers.filter(s => !joinedServerIds.includes(s.id));

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-[#1f2023] flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Scopri nuovi server</h2>
            <p className="text-[#b5bac1]">Unisciti a nuove community e fai nuove amicizie.</p>
          </div>
          <button onClick={onClose} className="text-[#b5bac1] hover:text-white p-2"><X size={24} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar bg-[#2b2d31]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableServers.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-[#b5bac1]">
                Hai già unito tutti i server disponibili!
              </div>
            ) : (
              availableServers.map(server => (
                <div key={server.id} className="bg-[#1e1f22] rounded-lg overflow-hidden hover:shadow-lg transition-shadow border border-[#1e1f22] hover:border-[#35373c] group flex flex-col">
                  <div className="h-24 bg-gradient-to-r from-brand/20 to-[#313338] flex-shrink-0" />
                  <div className="p-4 relative flex flex-col flex-1">
                    <div className="absolute -top-8 left-4 w-12 h-12 rounded-xl bg-[#313338] p-1 shadow-lg flex-shrink-0">
                      <img src={server.icon_url} alt="icon" className="w-full h-full rounded-lg object-cover bg-[#1e1f22]" />
                    </div>
                    <div className="mt-4 flex flex-col flex-1">
                      <h3 className="font-bold text-white text-lg mb-1">{server.name}</h3>
                      <p className="text-[#b5bac1] text-sm line-clamp-2 mb-3">{server.description || "Nessuna descrizione."}</p>
                      
                      {server.audio_url && (
                        <div className="mt-auto mb-4 bg-[#2b2d31] p-3 rounded-lg border border-[#35373c]">
                          <div className="flex items-center text-brand mb-2">
                            <Volume2 size={16} className="mr-1.5" />
                            <span className="text-xs font-bold uppercase tracking-wider">Perchè dovresti entrare</span>
                          </div>
                          <audio src={server.audio_url} controls className="w-full h-8 outline-none" />
                        </div>
                      )}
                      
                      <button 
                        onClick={() => { onJoin(server); onClose(); }}
                        className="w-full mt-auto bg-[#35373c] hover:bg-[#23a559] hover:text-white text-[#dbdee1] font-medium py-2 rounded transition-colors text-sm"
                      >
                        Unisciti al Server
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, imageFile: File | null, audioFile: File | Blob | null) => void;
  isCreating: boolean;
}

export const CreateServerModal = ({ isOpen, onClose, onCreate, isCreating }: CreateModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setImageFile(null);
      setPreviewUrl(null);
      setAudioFile(null);
      setAudioPreview(null);
      setIsRecording(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isCreating) {
      onCreate(name.trim(), description.trim(), imageFile, audioFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioFile(blob);
        setAudioPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Accesso al microfono negato", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={(e) => !isCreating && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 text-center relative flex-shrink-0">
          <button onClick={onClose} disabled={isCreating} className="absolute top-4 right-4 text-[#b5bac1] hover:text-white p-1 disabled:opacity-50"><X size={20} /></button>
          <h2 className="text-2xl font-bold text-white mb-2">Personalizza il tuo server</h2>
          <p className="text-[#b5bac1] text-sm">Dai al tuo nuovo server una personalità con un nome, un'icona e una descrizione unici.</p>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar">
          <form id="create-server-form" onSubmit={handleSubmit}>
            <div className="px-6 pb-6 space-y-4">
              <div className="flex justify-center mb-6 relative">
                <div 
                  onClick={() => !isCreating && fileInputRef.current?.click()}
                  className={`w-24 h-24 border-2 border-dashed border-[#b5bac1] rounded-full flex flex-col items-center justify-center text-[#b5bac1] cursor-pointer hover:border-white hover:text-white transition-all overflow-hidden relative group ${isCreating ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {previewUrl ? (
                    <>
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload size={24} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="mb-1" />
                      <div className="font-bold text-[10px] uppercase">Upload</div>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/gif, image/webp" 
                  onChange={handleFileChange} 
                />
              </div>
              
              <div>
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                  Nome del server <span className="text-[#f23f43]">*</span>
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Il server di DyadUser"
                  required
                  disabled={isCreating}
                  className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                  Descrizione
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Di cosa tratta questo server?"
                  disabled={isCreating}
                  rows={2}
                  className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] p-3 outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 resize-none custom-scrollbar"
                />
              </div>

              <div>
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                  Motto Vocale (Opzionale)
                </label>
                <p className="text-[#949ba4] text-xs mb-2">Registra un audio per convincere le persone ad entrare nel server!</p>
                
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    type="button" 
                    disabled={isCreating || isRecording}
                    onClick={() => audioInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] transition-colors disabled:opacity-50"
                  >
                    <Upload size={16} /> Carica Audio
                  </button>
                  <button 
                    type="button" 
                    disabled={isCreating}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                      isRecording 
                        ? 'bg-[#f23f43] hover:bg-[#da373c] text-white animate-pulse' 
                        : 'bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1]'
                    }`}
                  >
                    {isRecording ? <Square size={16} /> : <Mic size={16} />}
                    {isRecording ? 'Ferma' : 'Registra Audio'}
                  </button>
                  <input 
                    type="file" 
                    ref={audioInputRef} 
                    className="hidden" 
                    accept="audio/*" 
                    onChange={handleAudioFileChange} 
                  />
                </div>

                {audioPreview && (
                  <div className="flex items-center gap-2 bg-[#1e1f22] p-2 rounded">
                    <audio src={audioPreview} controls className="h-8 flex-1 outline-none" />
                    <button 
                      type="button" 
                      disabled={isCreating}
                      onClick={() => { setAudioFile(null); setAudioPreview(null); }} 
                      className="p-1.5 text-[#f23f43] hover:bg-[#f23f43]/10 rounded transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-4 bg-[#2b2d31] rounded-b-lg flex justify-between items-center flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isCreating} className="text-sm font-medium text-white hover:underline px-4 disabled:opacity-50">
            Indietro
          </button>
          <button type="submit" form="create-server-form" disabled={isCreating} className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium px-6 py-2 rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isCreating ? 'Creazione...' : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server | null;
  onUpdate: (id: string, name: string, description: string, imageFile: File | null, audioFile: File | Blob | null | undefined) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
}

export const ServerSettingsModal = ({ isOpen, onClose, server, onUpdate, onDelete, isUpdating = false }: ServerSettingsModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioFile, setAudioFile] = useState<File | Blob | null | undefined>(undefined);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (server && isOpen) {
      setName(server.name);
      setDescription(server.description || "");
      setPreviewUrl(server.icon_url || null);
      setImageFile(null);
      setConfirmDelete(false);
      setAudioPreview(server.audio_url || null);
      setAudioFile(undefined);
      setIsRecording(false);
    }
  }, [server, isOpen]);

  if (!isOpen || !server) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioFile(blob);
        setAudioPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Accesso al microfono negato", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isUpdating) {
      onUpdate(server.id, name.trim(), description.trim(), imageFile, audioFile);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={(e) => !isUpdating && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 relative border-b border-[#1f2023] flex-shrink-0">
          <button onClick={onClose} disabled={isUpdating} className="absolute top-6 right-6 text-[#b5bac1] hover:text-white p-1 disabled:opacity-50"><X size={20} /></button>
          <h2 className="text-xl font-bold text-white">Impostazioni Server</h2>
          <p className="text-[#b5bac1] text-sm mt-1">Modifica i dettagli di {server.name}</p>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="server-settings-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-2 relative">
              <div 
                onClick={() => !isUpdating && fileInputRef.current?.click()}
                className={`w-24 h-24 border-2 ${!previewUrl ? 'border-dashed border-[#b5bac1]' : 'border-transparent'} rounded-full flex flex-col items-center justify-center text-[#b5bac1] cursor-pointer hover:opacity-80 transition-all overflow-hidden relative group ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Server Icon" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Upload size={24} className="text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="mb-1" />
                    <div className="font-bold text-[10px] uppercase">Upload</div>
                  </>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/gif, image/webp" 
                onChange={handleFileChange} 
              />
            </div>

            <div>
              <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                Nome del server <span className="text-[#f23f43]">*</span>
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isUpdating}
                className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                Descrizione
              </label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Di cosa tratta questo server?"
                disabled={isUpdating}
                rows={2}
                className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] p-3 outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 resize-none custom-scrollbar"
              />
            </div>

            <div>
              <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                Motto Vocale (Opzionale)
              </label>
              <p className="text-[#949ba4] text-xs mb-2">Modifica o elimina l'audio del tuo server.</p>
              
              <div className="flex items-center gap-2 mb-2">
                <button 
                  type="button" 
                  disabled={isUpdating || isRecording}
                  onClick={() => audioInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] transition-colors disabled:opacity-50"
                >
                  <Upload size={16} /> Carica Audio
                </button>
                <button 
                  type="button" 
                  disabled={isUpdating}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                    isRecording 
                      ? 'bg-[#f23f43] hover:bg-[#da373c] text-white animate-pulse' 
                      : 'bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1]'
                  }`}
                >
                  {isRecording ? <Square size={16} /> : <Mic size={16} />}
                  {isRecording ? 'Ferma' : 'Registra Audio'}
                </button>
                <input 
                  type="file" 
                  ref={audioInputRef} 
                  className="hidden" 
                  accept="audio/*" 
                  onChange={handleAudioFileChange} 
                />
              </div>

              {audioPreview && (
                <div className="flex items-center gap-2 bg-[#1e1f22] p-2 rounded">
                  <audio src={audioPreview} controls className="h-8 flex-1 outline-none" />
                  <button 
                    type="button" 
                    disabled={isUpdating}
                    onClick={() => { setAudioFile(null); setAudioPreview(null); }} 
                    className="p-1.5 text-[#f23f43] hover:bg-[#f23f43]/10 rounded transition-colors disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-[#1f2023]">
            <h3 className="text-[#f23f43] font-bold text-sm uppercase mb-2">Zona Pericolosa</h3>
            {!confirmDelete ? (
              <button 
                type="button" 
                onClick={() => setConfirmDelete(true)}
                disabled={isUpdating}
                className="w-full flex items-center justify-center bg-transparent border border-[#f23f43] text-[#f23f43] hover:bg-[#f23f43] hover:text-white font-medium py-2 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} className="mr-2" />
                Elimina Server
              </button>
            ) : (
              <div className="bg-[#f23f43]/10 p-3 rounded border border-[#f23f43]/30">
                <p className="text-white text-sm font-medium mb-3">Sei sicuro? Questa azione non può essere annullata.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setConfirmDelete(false)}
                    disabled={isUpdating}
                    className="flex-1 bg-[#35373c] hover:bg-[#404249] text-white py-1.5 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={() => onDelete(server.id)}
                    disabled={isUpdating}
                    className="flex-1 bg-[#f23f43] hover:bg-[#da373c] text-white py-1.5 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    Sì, elimina
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-[#2b2d31] rounded-b-lg flex justify-between items-center flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isUpdating} className="text-sm font-medium text-white hover:underline px-4 disabled:opacity-50">
            Annulla
          </button>
          <button type="submit" form="server-settings-form" disabled={isUpdating} className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium px-6 py-2 rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isUpdating ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
};