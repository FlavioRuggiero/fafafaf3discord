import React, { useState } from "react";
import { Server } from "@/types/discord";
import { X, Hash, Search } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
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
                <div key={server.id} className="bg-[#1e1f22] rounded-lg overflow-hidden hover:shadow-lg transition-shadow border border-[#1e1f22] hover:border-[#35373c] group">
                  <div className="h-24 bg-gradient-to-r from-brand/20 to-[#313338]" />
                  <div className="p-4 relative">
                    <div className="absolute -top-8 left-4 w-12 h-12 rounded-xl bg-[#313338] p-1 shadow-lg">
                      <img src={server.icon_url} alt="icon" className="w-full h-full rounded-lg object-cover bg-[#1e1f22]" />
                    </div>
                    <div className="mt-4">
                      <h3 className="font-bold text-white text-lg mb-1">{server.name}</h3>
                      <p className="text-[#b5bac1] text-sm line-clamp-2 mb-4">{server.description}</p>
                      <button 
                        onClick={() => { onJoin(server); onClose(); }}
                        className="w-full bg-[#35373c] hover:bg-[#23a559] hover:text-white text-[#dbdee1] font-medium py-2 rounded transition-colors text-sm"
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
  onCreate: (name: string) => void;
}

export const CreateServerModal = ({ isOpen, onClose, onCreate }: CreateModalProps) => {
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      setName("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-2xl flex flex-col">
        <div className="p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#b5bac1] hover:text-white p-1"><X size={20} /></button>
          <h2 className="text-2xl font-bold text-white mb-2">Personalizza il tuo server</h2>
          <p className="text-[#b5bac1] text-sm">Dai al tuo nuovo server una personalità con un nome unico. Potrai sempre cambiarlo più tardi.</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-6">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 border-2 border-dashed border-[#b5bac1] rounded-full flex flex-col items-center justify-center text-[#b5bac1] cursor-pointer hover:border-white hover:text-white transition-colors">
                <div className="font-bold text-xs uppercase mt-1">Upload</div>
              </div>
            </div>
            
            <label className="block text-[#b5bac1] uppercase text-xs font-bold mb-2">
              Nome del server <span className="text-[#f23f43]">*</span>
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Il server di DyadUser"
              required
              className="w-full text-white bg-[#1e1f22] border-none rounded-[3px] h-10 px-3 outline-none focus:ring-1 focus:ring-brand"
            />
            <p className="text-[#b5bac1] text-[11px] mt-2">Creando un server accetti le Linee guida della community.</p>
          </div>
          
          <div className="p-4 bg-[#2b2d31] rounded-b-lg flex justify-between items-center">
            <button type="button" onClick={onClose} className="text-sm font-medium text-white hover:underline px-4">
              Indietro
            </button>
            <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium px-6 py-2 rounded-[3px] transition-colors">
              Crea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};