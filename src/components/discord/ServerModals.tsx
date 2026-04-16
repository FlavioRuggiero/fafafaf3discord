import React, { useState, useEffect, useRef } from "react";
import { Server, ServerRole, ServerPermissions } from "@/types/discord";
import { X, Trash2, Upload, Mic, Square, Volume2, Shield, Plus, Users, Key, Lock, Ban } from "lucide-react";
import { CustomAudioPlayer } from "./CustomAudioPlayer";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: Server[];
  joinedServerIds: string[];
  onJoin: (server: Server) => void;
  onRequestJoin: (server: Server) => void;
}

export const DiscoverServersModal = ({ isOpen, onClose, servers, joinedServerIds, onJoin, onRequestJoin }: DiscoverModalProps) => {
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
                sei già entrato in tutti i server disponibili, strunz
              </div>
            ) : (
              availableServers.map(server => (
                <div key={server.id} className="bg-[#1e1f22] rounded-lg overflow-hidden hover:shadow-lg transition-shadow border border-[#1e1f22] hover:border-[#35373c] group flex flex-col">
                  <div className="h-24 bg-gradient-to-r from-brand/20 to-[#313338] flex-shrink-0 relative">
                    {server.is_private && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white flex items-center gap-1">
                        <Lock size={12} /> Privato
                      </div>
                    )}
                  </div>
                  <div className="p-4 relative flex flex-col flex-1">
                    <div className="absolute -top-8 left-4 w-12 h-12 rounded-xl bg-[#313338] p-1 shadow-lg flex-shrink-0">
                      <img src={server.icon_url} alt="icon" className="w-full h-full rounded-lg object-cover bg-[#1e1f22]" />
                    </div>
                    <div className="mt-4 flex flex-col flex-1">
                      <h3 className="font-bold text-white text-lg mb-1">{server.name}</h3>
                      <p className="text-[#b5bac1] text-sm line-clamp-2 mb-3">{server.description || "Nessuna descrizione."}</p>
                      
                      {server.audio_url && (
                        <div className="mt-auto mb-4 bg-[#1e1f22] p-3 rounded-lg border border-[#2b2d31]">
                          <div className="flex items-center text-brand mb-2">
                            <Volume2 size={16} className="mr-1.5" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Perchè dovresti entrare</span>
                          </div>
                          <CustomAudioPlayer src={server.audio_url} />
                        </div>
                      )}
                      
                      {server.is_private ? (
                        <button 
                          onClick={() => { onRequestJoin(server); onClose(); }}
                          className="w-full mt-auto bg-[#35373c] hover:bg-[#5865F2] hover:text-white text-[#dbdee1] font-medium py-2 rounded transition-colors text-sm"
                        >
                          Richiedi di entrare
                        </button>
                      ) : (
                        <button 
                          onClick={() => { onJoin(server); onClose(); }}
                          className="w-full mt-auto bg-[#35373c] hover:bg-[#23a559] hover:text-white text-[#dbdee1] font-medium py-2 rounded transition-colors text-sm"
                        >
                          Unisciti al Server
                        </button>
                      )}
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
  onCreate: (name: string, description: string, imageFile: File | null, audioFile: File | Blob | null, isPrivate: boolean) => void;
  isCreating: boolean;
}

export const CreateServerModal = ({ isOpen, onClose, onCreate, isCreating }: CreateModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setImageFile(null);
      setPreviewUrl(null);
      setAudioFile(null);
      setAudioPreview(null);
      setIsRecording(false);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isCreating) {
      onCreate(name.trim(), description.trim(), imageFile, audioFile, isPrivate);
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
      const tempUrl = URL.createObjectURL(file);
      
      const audio = new Audio(tempUrl);
      audio.onloadedmetadata = () => {
        if (audio.duration > 3.5) { // 3.5s limite per dare un leggero margine
          showError("Il motto vocale può durare massimo 3 secondi.");
          if (audioInputRef.current) audioInputRef.current.value = '';
        } else {
          setAudioFile(file);
          setAudioPreview(tempUrl);
        }
      };
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

      // Limita la registrazione a 3 secondi
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 3000);

    } catch (err) {
      console.error("Accesso al microfono negato", err);
      showError("Impossibile accedere al microfono.");
    }
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
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
                      <div className="font-bold text-[10px] uppercase text-center leading-tight">Upload<br/>(IMG/GIF)</div>
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

              <div className="flex items-center justify-between bg-[#2b2d31] p-3 rounded border border-[#1e1f22]">
                <div>
                  <div className="flex items-center text-white font-medium mb-1">
                    <Lock size={16} className="mr-2 text-[#949ba4]" />
                    Server Privato
                  </div>
                  <div className="text-xs text-[#b5bac1]">Gli utenti dovranno richiedere l'accesso per entrare.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    disabled={isCreating}
                  />
                  <div className="w-10 h-6 bg-[#80848e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23a559]"></div>
                </label>
              </div>

              <div>
                <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                  Motto Vocale (Max 3s)
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
                    {isRecording ? 'Ferma (Auto tra 3s)' : 'Registra Audio'}
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
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 min-w-0">
                      <CustomAudioPlayer src={audioPreview} />
                    </div>
                    <button 
                      type="button" 
                      disabled={isCreating}
                      onClick={() => { setAudioFile(null); setAudioPreview(null); }} 
                      className="p-2 text-[#f23f43] hover:bg-[#f23f43]/10 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      <X size={20} />
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
  onUpdate: (id: string, name: string, description: string, imageFile: File | null, audioFile: File | Blob | null | undefined, isPrivate: boolean) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  serverPermissions?: ServerPermissions;
}

export const ServerSettingsModal = ({ isOpen, onClose, server, onUpdate, onDelete, isUpdating = false, serverPermissions }: ServerSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<'main' | 'roles' | 'bans'>('main');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioFile, setAudioFile] = useState<File | Blob | null | undefined>(undefined);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Roles states
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [memberRoles, setMemberRoles] = useState<{user_id: string, role_id: string}[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleColor, setEditRoleColor] = useState("#99aab5");
  
  // Role Tabs & Permissions
  const [activeRoleTab, setActiveRoleTab] = useState<'members' | 'permissions'>('members');
  const [editRolePermissions, setEditRolePermissions] = useState({
    can_manage_channels: false,
    can_delete_messages: false,
    can_use_commands: false,
    can_manage_server: false,
    can_manage_roles: false,
    can_assign_roles: false,
    can_bypass_restrictions: false,
    can_kick_members: false,
    can_ban_members: false
  });

  // Bans states
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [isLoadingBans, setIsLoadingBans] = useState(false);

  useEffect(() => {
    if (server && isOpen) {
      setActiveTab('main');
      setName(server.name);
      setDescription(server.description || "");
      setIsPrivate(server.is_private || false);
      setPreviewUrl(server.icon_url || null);
      setImageFile(null);
      setConfirmDelete(false);
      setAudioPreview(server.audio_url || null);
      setAudioFile(undefined);
      setIsRecording(false);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    }
  }, [server, isOpen]);

  const loadRolesData = async () => {
    if (!server) return;
    const { data: r } = await supabase.from('server_roles').select('*').eq('server_id', server.id);
    if (r) setRoles(r);
    
    const { data: mr } = await supabase.from('server_member_roles').select('*').eq('server_id', server.id);
    if (mr) setMemberRoles(mr);

    const { data: sm } = await supabase.from('server_members').select('user_id').eq('server_id', server.id);
    if (sm) {
      const userIds = sm.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, avatar_url').in('id', userIds);
      if (profiles) setMembers(profiles);
    }
  };

  const fetchBans = async () => {
    if (!server) return;
    setIsLoadingBans(true);
    const { data, error } = await supabase
      .from('server_bans')
      .select('id, user_id, reason, created_at')
      .eq('server_id', server.id);

    if (data && data.length > 0) {
      const userIds = data.map(b => b.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, avatar_url').in('id', userIds);
      const combined = data.map(b => ({
        ...b,
        profiles: profiles?.find(p => p.id === b.user_id)
      }));
      setBannedUsers(combined);
    } else {
      setBannedUsers([]);
    }
    setIsLoadingBans(false);
  };

  useEffect(() => {
    if (activeTab === 'roles' && server) {
      loadRolesData();
    } else if (activeTab === 'bans' && server) {
      fetchBans();
    }
  }, [activeTab, server]);

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
      const tempUrl = URL.createObjectURL(file);
      
      const audio = new Audio(tempUrl);
      audio.onloadedmetadata = () => {
        if (audio.duration > 3.5) { // 3.5s limite per dare un leggero margine
          showError("Il motto vocale può durare massimo 3 secondi.");
          if (audioInputRef.current) audioInputRef.current.value = '';
        } else {
          setAudioFile(file);
          setAudioPreview(tempUrl);
        }
      };
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

      // Limita la registrazione a 3 secondi
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 3000);
      
    } catch (err) {
      console.error("Accesso al microfono negato", err);
      showError("Impossibile accedere al microfono.");
    }
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isUpdating) {
      onUpdate(server.id, name.trim(), description.trim(), imageFile, audioFile, isPrivate);
    }
  };

  const handleCreateRole = async () => {
    if (!server) return;
    const { data, error } = await supabase.from('server_roles').insert({
      server_id: server.id,
      name: 'Nuovo Ruolo',
      color: '#99aab5',
      can_manage_channels: false,
      can_delete_messages: false,
      can_use_commands: false,
      can_manage_server: false,
      can_manage_roles: false,
      can_assign_roles: false,
      can_bypass_restrictions: false,
      can_kick_members: false,
      can_ban_members: false
    }).select().single();
    
    if (data) {
      setRoles([...roles, data]);
      setSelectedRoleId(data.id);
      setEditRoleName(data.name);
      setEditRoleColor(data.color);
      setEditRolePermissions({
        can_manage_channels: false,
        can_delete_messages: false,
        can_use_commands: false,
        can_manage_server: false,
        can_manage_roles: false,
        can_assign_roles: false,
        can_bypass_restrictions: false,
        can_kick_members: false,
        can_ban_members: false
      });
      setActiveRoleTab('members');
    } else {
      showError("Errore creazione ruolo. Hai eseguito lo script SQL?");
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRoleId) return;
    const { error } = await supabase.from('server_roles').update({
      name: editRoleName,
      color: editRoleColor,
      ...editRolePermissions
    }).eq('id', selectedRoleId);
    
    if (!error) {
      setRoles(roles.map(r => r.id === selectedRoleId ? { ...r, name: editRoleName, color: editRoleColor, ...editRolePermissions } : r));
      showSuccess("Ruolo aggiornato!");
    } else {
      showError("Errore durante l'aggiornamento del ruolo.");
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRoleId) return;
    const { error } = await supabase.from('server_roles').delete().eq('id', selectedRoleId);
    if (!error) {
      setRoles(roles.filter(r => r.id !== selectedRoleId));
      setSelectedRoleId(null);
      showSuccess("Ruolo eliminato!");
    } else {
      showError("Permesso negato: non puoi gestire i ruoli.");
    }
  };

  const handleToggleMemberRole = async (userId: string, hasRole: boolean) => {
    if (!selectedRoleId || !server) return;
    
    if (hasRole) {
      const { error } = await supabase.from('server_member_roles').delete().eq('server_id', server.id).eq('user_id', userId).eq('role_id', selectedRoleId);
      if (error) {
        showError("Permesso negato: non puoi gestire i ruoli.");
        return;
      }
      setMemberRoles(memberRoles.filter(mr => !(mr.user_id === userId && mr.role_id === selectedRoleId)));
    } else {
      const { error } = await supabase.from('server_member_roles').insert({ server_id: server.id, user_id: userId, role_id: selectedRoleId });
      if (error) {
        showError("Permesso negato: non puoi gestire i ruoli.");
        return;
      }
      setMemberRoles([...memberRoles, { server_id: server.id, user_id: userId, role_id: selectedRoleId }]);
    }
  };

  const handleRevokeBan = async (banId: string) => {
    const { error } = await supabase.from('server_bans').delete().eq('id', banId);
    if (error) {
      showError("Errore durante la revoca del ban.");
    } else {
      showSuccess("Ban revocato con successo.");
      setBannedUsers(prev => prev.filter(b => b.id !== banId));
    }
  };

  const PERMISSIONS_LIST = [
    { key: 'can_manage_channels', label: 'Gestione Canali', desc: 'Permette di creare, modificare o eliminare canali.' },
    { key: 'can_delete_messages', label: 'Elimina Messaggi', desc: 'Permette di eliminare i messaggi degli altri utenti.' },
    { key: 'can_use_commands', label: 'Usa Comandi', desc: 'Permette di usare comandi speciali come /statusmessage e /mentionseveryone.' },
    { key: 'can_manage_server', label: 'Gestione Server', desc: 'Permette di modificare le impostazioni generali del server.' },
    { key: 'can_manage_roles', label: 'Gestione Ruoli', desc: 'Permette di creare, modificare o eliminare ruoli.' },
    { key: 'can_assign_roles', label: 'Assegna Ruoli', desc: 'Permette di assegnare o rimuovere ruoli agli altri utenti.' },
    { key: 'can_bypass_restrictions', label: 'Bypass Restrizioni', desc: 'Permette di ignorare il cooldown (slowmode) e di scrivere nei canali bloccati.' },
    { key: 'can_kick_members', label: 'Espelli Membri', desc: 'Permette di rimuovere gli utenti dal server.' },
    { key: 'can_ban_members', label: 'Banna Membri', desc: 'Permette di bannare gli utenti dal server in modo permanente.' },
  ] as const;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={(e) => !isUpdating && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-5xl h-[85vh] rounded-lg shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-[250px] bg-[#2b2d31] flex flex-col flex-shrink-0">
          <div className="p-4 pt-10 flex flex-col gap-1">
            <h3 className="text-xs font-bold text-[#949ba4] uppercase px-2 mb-2 truncate" title={server.name}>{server.name}</h3>
            
            {(serverPermissions?.can_manage_server || serverPermissions?.isOwner) && (
              <button 
                onClick={() => setActiveTab('main')} 
                className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'main' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
              >
                Panoramica
              </button>
            )}
            
            {(serverPermissions?.can_manage_roles || serverPermissions?.isOwner) && (
              <button 
                onClick={() => setActiveTab('roles')} 
                className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'roles' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
              >
                Gestione ruoli
              </button>
            )}

            {(serverPermissions?.can_ban_members || serverPermissions?.isOwner) && (
              <button 
                onClick={() => setActiveTab('bans')} 
                className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'bans' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
              >
                Gestione Ban
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative bg-[#313338]">
          <div className="absolute top-6 right-6 z-10">
            <button 
              onClick={onClose} 
              disabled={isUpdating} 
              className="flex flex-col items-center justify-center text-[#b5bac1] hover:text-white group disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full border-2 border-[#b5bac1] group-hover:border-white flex items-center justify-center mb-1 transition-colors">
                <X size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase">Esci</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 max-w-3xl">
            {activeTab === 'main' && (
              <div className="animate-in fade-in duration-200">
                <h2 className="text-xl font-bold text-white mb-6">Panoramica Server</h2>
                
                <form id="server-settings-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex justify-start mb-2 relative">
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
                          <div className="font-bold text-[10px] uppercase text-center leading-tight">Upload<br/>(IMG/GIF)</div>
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

                  <div className="flex items-center justify-between bg-[#2b2d31] p-3 rounded border border-[#1e1f22]">
                    <div>
                      <div className="flex items-center text-white font-medium mb-1">
                        <Lock size={16} className="mr-2 text-[#949ba4]" />
                        Server Privato
                      </div>
                      <div className="text-xs text-[#b5bac1]">Gli utenti dovranno richiedere l'accesso per entrare.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        disabled={isUpdating}
                      />
                      <div className="w-10 h-6 bg-[#80848e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23a559]"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                      Motto Vocale (Max 3s)
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
                        {isRecording ? 'Ferma (Auto tra 3s)' : 'Registra Audio'}
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
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 min-w-0">
                          <CustomAudioPlayer src={audioPreview} />
                        </div>
                        <button 
                          type="button" 
                          disabled={isUpdating}
                          onClick={() => { setAudioFile(null); setAudioPreview(null); }} 
                          className="p-2 text-[#f23f43] hover:bg-[#f23f43]/10 rounded transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </form>

                {serverPermissions?.isOwner && (
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
                )}

                <div className="mt-8 flex justify-end">
                  <button type="submit" form="server-settings-form" disabled={isUpdating} className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium px-6 py-2 rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isUpdating ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="animate-in fade-in duration-200 h-full flex flex-col">
                <h2 className="text-xl font-bold text-white mb-6">Gestione Ruoli</h2>
                
                <div className="flex h-full gap-6">
                  {/* Left Sidebar for Roles List */}
                  <div className="w-1/3 border-r border-[#1f2023] pr-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[#b5bac1] text-xs font-bold uppercase">Ruoli ({roles.length})</h3>
                      <button onClick={handleCreateRole} className="text-[#dbdee1] hover:text-white p-1" title="Crea Ruolo"><Plus size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                      {roles.map(role => (
                        <button
                          key={role.id}
                          onClick={() => {
                            setSelectedRoleId(role.id);
                            setEditRoleName(role.name);
                            setEditRoleColor(role.color);
                            setEditRolePermissions({
                              can_manage_channels: role.can_manage_channels || false,
                              can_delete_messages: role.can_delete_messages || false,
                              can_use_commands: role.can_use_commands || false,
                              can_manage_server: role.can_manage_server || false,
                              can_manage_roles: role.can_manage_roles || false,
                              can_assign_roles: role.can_assign_roles || false,
                              can_bypass_restrictions: role.can_bypass_restrictions || false,
                              can_kick_members: role.can_kick_members || false,
                              can_ban_members: role.can_ban_members || false,
                            });
                            setActiveRoleTab('members');
                          }}
                          className={`w-full flex items-center px-3 py-2 rounded text-sm transition-colors ${selectedRoleId === role.id ? 'bg-[#404249] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
                        >
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: role.color }} />
                          <span className="truncate">{role.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Area for Role Edit */}
                  <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-2">
                    {selectedRoleId ? (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Nome Ruolo</label>
                          <input 
                            type="text" 
                            value={editRoleName}
                            onChange={(e) => setEditRoleName(e.target.value)}
                            className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand"
                          />
                        </div>
                        <div>
                          <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Colore Ruolo</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              value={editRoleColor}
                              onChange={(e) => setEditRoleColor(e.target.value)}
                              className="w-10 h-10 p-0 border-none bg-transparent rounded cursor-pointer"
                            />
                            <span className="text-[#dbdee1] text-sm uppercase">{editRoleColor}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                          <button onClick={handleSaveRole} className="bg-[#23a559] hover:bg-[#1a7c43] text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                            Salva Modifiche
                          </button>
                          <button onClick={handleDeleteRole} className="bg-transparent border border-[#f23f43] text-[#f23f43] hover:bg-[#f23f43] hover:text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                            Elimina Ruolo
                          </button>
                        </div>

                        <div className="pt-6 border-t border-[#1f2023]">
                          <div className="flex gap-6 mb-6 border-b border-[#1f2023]">
                            <button
                              onClick={() => setActiveRoleTab('members')}
                              className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeRoleTab === 'members' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
                            >
                              <Users size={16} /> Membri
                            </button>
                            <button
                              onClick={() => setActiveRoleTab('permissions')}
                              className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeRoleTab === 'permissions' ? 'text-white border-brand' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1]'}`}
                            >
                              <Key size={16} /> Permessi
                            </button>
                          </div>

                          {activeRoleTab === 'members' ? (
                            <div className="animate-in fade-in duration-200">
                              <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-4">Membri con questo ruolo</h3>
                              <div className="space-y-2">
                                {members.map(member => {
                                  const hasRole = memberRoles.some(mr => mr.user_id === member.id && mr.role_id === selectedRoleId);
                                  return (
                                    <div key={member.id} className="flex items-center justify-between bg-[#2b2d31] p-2 rounded border border-[#1e1f22]">
                                      <div className="flex items-center gap-3">
                                        <img src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} className="w-8 h-8 rounded-full object-cover" />
                                        <span className="text-[#dbdee1] text-sm font-medium">{member.first_name || 'Utente'}</span>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          className="sr-only peer" 
                                          checked={hasRole}
                                          onChange={() => handleToggleMemberRole(member.id, hasRole)}
                                        />
                                        <div className="w-9 h-5 bg-[#80848e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#23a559]"></div>
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="animate-in fade-in duration-200 space-y-6">
                              <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-4">Permessi del ruolo</h3>
                              
                              {PERMISSIONS_LIST.map(perm => (
                                <div key={perm.key} className="flex items-center justify-between bg-[#2b2d31] p-4 rounded border border-[#1e1f22]">
                                  <div className="pr-4">
                                    <div className="text-white font-medium mb-1">{perm.label}</div>
                                    <div className="text-xs text-[#b5bac1]">{perm.desc}</div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer" 
                                      checked={editRolePermissions[perm.key as keyof typeof editRolePermissions]}
                                      onChange={(e) => setEditRolePermissions(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                                    />
                                    <div className="w-10 h-6 bg-[#80848e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23a559]"></div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#949ba4]">
                        <Shield size={48} className="mb-4 opacity-50" />
                        <p>Seleziona un ruolo per modificarlo o creane uno nuovo.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bans' && (
              <div className="animate-in fade-in duration-200 h-full flex flex-col">
                <h2 className="text-xl font-bold text-white mb-6">Utenti Bannati</h2>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {isLoadingBans ? (
                    <div className="text-center text-[#949ba4] py-8">Caricamento...</div>
                  ) : bannedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-[#949ba4] py-12">
                      <Ban size={48} className="mb-4 opacity-50" />
                      <p>Nessun utente è stato bannato da questo server.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bannedUsers.map(ban => (
                        <div key={ban.id} className="flex items-center justify-between bg-[#2b2d31] p-3 rounded border border-[#1e1f22]">
                          <div className="flex items-center gap-3">
                            <img src={ban.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ban.user_id}`} className="w-10 h-10 rounded-full object-cover bg-[#1e1f22]" />
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{ban.profiles?.first_name || 'Utente Sconosciuto'}</span>
                              <span className="text-xs text-[#949ba4]">Bannato il {new Date(ban.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeBan(ban.id)}
                            className="px-3 py-1.5 bg-[#35373c] hover:bg-[#404249] text-white text-sm font-medium rounded transition-colors"
                          >
                            Revoca Ban
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};