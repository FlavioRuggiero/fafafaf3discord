import React, { useState, useEffect, useRef } from "react";
import { X, User as UserIcon, Upload, Headphones, Mic } from "lucide-react";
import { User } from "@/types/discord";
import { useVoiceChannel } from "@/contexts/VoiceChannelProvider";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (nickname: string, bio: string, avatarFile: File | null, bannerColor: string, bannerFile: File | null | undefined) => Promise<void>;
}

export const UserSettingsModal = ({ isOpen, onClose, user, onUpdate }: UserSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'audio'>('profile');
  
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [bannerColor, setBannerColor] = useState("#5865F2");
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [bannerFile, setBannerFile] = useState<File | null | undefined>(undefined);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  
  const [isUpdating, setIsUpdating] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { 
    audioInputDevices, 
    audioOutputDevices, 
    selectedAudioInput, 
    selectedAudioOutput, 
    setSelectedAudioInput, 
    setSelectedAudioOutput 
  } = useVoiceChannel();

  useEffect(() => {
    if (user && isOpen) {
      setNickname(user.name || "");
      setBio(user.bio || "");
      setBannerColor(user.banner_color || "#5865F2");
      setAvatarPreview(user.avatar);
      setAvatarFile(null);
      setBannerPreview(user.banner_url || null);
      setBannerFile(undefined);
      setActiveTab('profile');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isAdmin = user.global_role === 'ADMIN' || user.global_role === 'CREATOR';

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    
    setIsUpdating(true);
    await onUpdate(nickname.trim(), bio.trim(), avatarFile, bannerColor, bannerFile);
    setIsUpdating(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={(e) => !isUpdating && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-5xl h-[85vh] rounded-lg shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-[250px] bg-[#2b2d31] flex flex-col flex-shrink-0">
          <div className="p-4 pt-10 flex flex-col gap-1">
            <h3 className="text-xs font-bold text-[#949ba4] uppercase px-2 mb-2">Impostazioni Utente</h3>
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
            >
              Profilo
            </button>
            <button 
              onClick={() => setActiveTab('audio')} 
              className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'audio' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]'}`}
            >
              Voce e Video
            </button>
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
            
            {activeTab === 'profile' && (
              <div className="animate-in fade-in duration-200">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <UserIcon size={24} />
                  Impostazioni Profilo
                </h2>
                
                <div className="bg-[#2b2d31] rounded-lg overflow-hidden border border-[#1e1f22] mb-6">
                  <div className="relative mb-12">
                    {/* Banner Section */}
                    <div 
                      className={`h-[120px] w-full relative bg-cover bg-center ${isAdmin ? 'cursor-pointer group' : ''}`}
                      style={{ backgroundColor: bannerColor, backgroundImage: bannerPreview ? `url(${bannerPreview})` : undefined }}
                      onClick={() => isAdmin && !isUpdating && bannerInputRef.current?.click()}
                    >
                      {isAdmin && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload size={24} className="text-white" />
                          <span className="ml-2 text-white font-medium text-sm">Cambia Banner</span>
                        </div>
                      )}
                      {isAdmin && bannerPreview && (
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setBannerFile(null); setBannerPreview(null); }}
                          className="absolute top-2 right-2 bg-black/60 p-1.5 rounded text-white hover:bg-[#f23f43] transition-colors z-20"
                          title="Rimuovi Banner"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    
                    {/* Avatar Section */}
                    <div className="absolute -bottom-10 left-6">
                      <div 
                        className="relative group cursor-pointer"
                        onClick={() => !isUpdating && avatarInputRef.current?.click()}
                      >
                        <img src={avatarPreview || user.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-[6px] border-[#2b2d31] bg-[#1e1f22] object-cover" />
                        <div className="absolute inset-0 border-[6px] border-transparent rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                          <Upload size={20} className="text-white" />
                        </div>
                        <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-[#2b2d31] bg-[#23a559]" />
                      </div>
                    </div>
                  </div>

                  <form id="user-settings-form" onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleAvatarChange} />
                    {isAdmin && (
                      <input type="file" ref={bannerInputRef} className="hidden" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleBannerChange} />
                    )}

                    <div>
                      <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                        Nickname <span className="text-[#f23f43]">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                        disabled={isUpdating}
                        className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">Colore Banner</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={bannerColor}
                          onChange={(e) => setBannerColor(e.target.value)}
                          disabled={isUpdating}
                          className="w-10 h-10 p-0 border-none bg-transparent rounded cursor-pointer"
                        />
                        <span className="text-[#dbdee1] text-sm uppercase">{bannerColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                        Biografia
                      </label>
                      <textarea 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Racconta qualcosa di te..."
                        disabled={isUpdating}
                        rows={4}
                        className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] p-3 outline-none focus:ring-1 focus:ring-brand disabled:opacity-50 resize-none custom-scrollbar"
                      />
                      <p className="text-[#949ba4] text-[11px] mt-1 text-right">{bio.length}/190</p>
                    </div>
                  </form>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    form="user-settings-form" 
                    disabled={isUpdating} 
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium px-6 py-2 rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="animate-in fade-in duration-200">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Mic size={24} />
                  Impostazioni Voce
                </h2>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                      Dispositivo di Ingresso (Microfono)
                    </label>
                    <select
                      value={selectedAudioInput || ''}
                      onChange={(e) => setSelectedAudioInput(e.target.value)}
                      className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                    >
                      <option value="">Predefinito</option>
                      {audioInputDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microfono ${device.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-[#949ba4] text-xs mt-2">
                      Seleziona il microfono che desideri utilizzare per parlare nei canali vocali.
                    </p>
                  </div>

                  <div className="h-[1px] bg-[#3f4147] w-full"></div>

                  <div>
                    <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
                      Dispositivo di Uscita (Altoparlanti)
                    </label>
                    <select
                      value={selectedAudioOutput || ''}
                      onChange={(e) => setSelectedAudioOutput(e.target.value)}
                      className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                    >
                      <option value="">Predefinito</option>
                      {audioOutputDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Altoparlante ${device.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-[#949ba4] text-xs mt-2">
                      Seleziona il dispositivo da cui desideri ascoltare l'audio degli altri utenti.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};