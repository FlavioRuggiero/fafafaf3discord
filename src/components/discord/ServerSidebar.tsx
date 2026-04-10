import React from "react";
import { Plus, Compass, Download } from "lucide-react";
import { Server, User } from "@/types/discord";

const ServerIcon = ({ image, name, active, notify, onClick }: { image?: string, name?: string, active?: boolean, notify?: boolean, onClick?: () => void }) => (
  <div className="relative group flex items-center justify-center cursor-pointer mb-2" onClick={onClick}>
    <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 ${active ? 'h-10' : 'h-0 group-hover:h-5'} ${notify && !active ? 'h-2' : ''}`} />
    
    <div className={`w-12 h-12 flex items-center justify-center overflow-hidden transition-all duration-300 ${active ? 'rounded-2xl bg-brand' : 'rounded-[24px] group-hover:rounded-2xl bg-[#313338] group-hover:bg-brand text-[#dbdee1] group-hover:text-white'}`}>
      {image ? (
        <img src={image} alt="Server" className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium text-lg">{name?.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
  </div>
);

const IconButton = ({ icon: Icon, colorClass = "text-[#23a559] group-hover:bg-[#23a559] group-hover:text-white", onClick }: { icon: any, colorClass?: string, onClick?: () => void }) => (
  <div className="relative group flex items-center justify-center cursor-pointer mb-2" onClick={onClick}>
    <div className={`w-12 h-12 rounded-[24px] group-hover:rounded-2xl bg-[#313338] flex items-center justify-center transition-all duration-300 ${colorClass}`}>
      <Icon size={24} />
    </div>
  </div>
);

interface ServerSidebarProps {
  servers: Server[];
  activeServerId: string;
  onServerSelect: (id: string) => void;
  onOpenCreate: () => void;
  onOpenDiscover: () => void;
  currentUser: User;
}

export const ServerSidebar = ({ servers, activeServerId, onServerSelect, onOpenCreate, onOpenDiscover, currentUser }: ServerSidebarProps) => {
  const canCreate = currentUser.global_role === 'ADMIN' || currentUser.global_role === 'CREATOR';

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 flex-shrink-0 z-20 overflow-y-auto custom-scrollbar">
      <ServerIcon image="https://api.dicebear.com/7.x/shapes/svg?seed=home" active={activeServerId === 'home'} onClick={() => onServerSelect('home')} />
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2 flex-shrink-0" />
      
      {servers.map(server => (
        <ServerIcon 
          key={server.id} 
          image={server.icon_url} 
          name={server.name} 
          active={activeServerId === server.id} 
          onClick={() => onServerSelect(server.id)} 
        />
      ))}
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2 flex-shrink-0" />
      
      {canCreate && (
        <IconButton icon={Plus} onClick={onOpenCreate} />
      )}
      <IconButton icon={Compass} colorClass="text-[#dbdee1] group-hover:bg-[#dbdee1] group-hover:text-[#1e1f22]" onClick={onOpenDiscover} />
      
      <div className="mt-auto pt-2">
        <IconButton icon={Download} colorClass="text-[#dbdee1] group-hover:bg-[#dbdee1] group-hover:text-[#1e1f22]" />
      </div>
    </div>
  );
};