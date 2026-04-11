import React, { useState, useEffect, useRef } from "react";
import { X, User as UserIcon, Upload } from "lucide-react";
import { User } from "@/types/discord";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (nickname: string, bio: string, avatarFile: File | null, bannerColor: string, bannerFile: File | null | undefined) => Promise<void>;
}

export const UserSettingsModal = ({ isOpen, onClose, user, onUpdate }: UserSettingsModalProps) => {
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

  useEffect(() => {
    if (user && isOpen) {
      setNickname(user.name || "");
      setBio(user.bio || "");
      setBannerColor(user.banner_color || "#5865F2");
      setAvatarPreview(user.avatar);
      setAvatarFile(null);
      setBannerPreview(user.banner_url || null);
      setBannerFile(undefined);
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
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 relative border-b border-[#1f2023] flex-shrink-0 z-10 bg-[#313338]">
          <button onClick={onClose} disabled={isUpdating} className="absolute top-6 right-6 text-[#b5bac1] hover:text-white p-1 disabled:opacity-50"><X size={20} /></button>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon size={24} />
            Impostazioni Profilo
          </h2>
          <p className="text-[#b5bac1] text-sm mt-1">Personalizza come gli altri ti vedono.</p>
        </div>
        
        <div className="overflow-y-auto custom-scrollbar relative">
          
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
                <img src={avatarPreview || user.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-[6px] border-[#313338] bg-[#1e1f22] object-cover" />
                <div className="absolute inset-0 border-[6px] border-transparent rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <Upload size={20} className="text-white" />
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-[#313338] bg-[#23a559]" />
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
        
        <div className="p-4 bg-[#2b2d31] rounded-b-lg flex justify-between items-center flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isUpdating} className="text-sm font-medium text-white hover:underline px-4 disabled:opacity-50">
            Annulla
          </button>
          <button type="submit" form="user-settings-form" disabled={isUpdating} className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium px-6 py-2 rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isUpdating ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  );
};