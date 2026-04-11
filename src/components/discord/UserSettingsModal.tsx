import React, { useState, useEffect } from "react";
import { X, User as UserIcon } from "lucide-react";
import { User } from "@/types/discord";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (nickname: string, bio: string) => Promise<void>;
}

export const UserSettingsModal = ({ isOpen, onClose, user, onUpdate }: UserSettingsModalProps) => {
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setNickname(user.name || "");
      setBio(user.bio || "");
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    
    setIsUpdating(true);
    await onUpdate(nickname.trim(), bio.trim());
    setIsUpdating(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={(e) => !isUpdating && e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 relative border-b border-[#1f2023] flex-shrink-0">
          <button onClick={onClose} disabled={isUpdating} className="absolute top-6 right-6 text-[#b5bac1] hover:text-white p-1 disabled:opacity-50"><X size={20} /></button>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon size={24} />
            Impostazioni Profilo
          </h2>
          <p className="text-[#b5bac1] text-sm mt-1">Personalizza come gli altri ti vedono.</p>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img src={user.avatar} alt="Avatar" className="w-24 h-24 rounded-full bg-[#1e1f22]" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-[#313338] bg-[#23a559]" />
            </div>
          </div>

          <form id="user-settings-form" onSubmit={handleSubmit} className="space-y-6">
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