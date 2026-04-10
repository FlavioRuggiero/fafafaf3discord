import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Compass, LogOut } from "lucide-react";
import { Server, User } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";

// Componente Tooltip che fluttua al di fuori della barra per non essere tagliato dall'overflow
const HoverTooltip = ({ children, text, subtext }: { children: React.ReactElement, text?: string, subtext?: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 14 // Spaziatura dall'icona
      });
      setVisible(true);
    }
  };

  if (!text) return children;

  return (
    <>
      {React.cloneElement(children as any, {
        ref: triggerRef,
        onMouseEnter: (e: any) => {
          handleMouseEnter(e);
          if (children.props.onMouseEnter) children.props.onMouseEnter(e);
        },
        onMouseLeave: (e: any) => {
          setVisible(false);
          if (children.props.onMouseLeave) children.props.onMouseLeave(e);
        }
      })}
      
      {visible && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] bg-[#111214] text-white px-3 py-2 rounded shadow-xl flex flex-col pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          style={{ top: coords.top, left: coords.left, transform: 'translateY(-50%)' }}
        >
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#111214] rotate-45 rounded-[1px]" />
          <span className="font-semibold text-sm relative z-10 leading-tight">{text}</span>
          {subtext && (
            <span className="text-xs text-[#b5bac1] mt-0.5 font-medium relative z-10">{subtext}</span>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

const ServerIcon = ({ image, name, active, notify, onClick, serverId }: { image?: string, name?: string, active?: boolean, notify?: boolean, onClick?: () => void, serverId?: string }) => {
  const [memberCount, setMemberCount] = useState<number | null>(null);

  // Recupera il numero di membri per il server specificato
  useEffect(() => {
    if (serverId && serverId !== 'home') {
      const fetchMembers = async () => {
        const { count } = await supabase
          .from('server_members')
          .select('*', { count: 'exact', head: true })
          .eq('server_id', serverId);
        if (count !== null) setMemberCount(count);
      };
      fetchMembers();
    }
  }, [serverId]);

  const subtext = serverId && serverId !== 'home' && memberCount !== null 
    ? `${memberCount} ${memberCount === 1 ? 'membro' : 'membri'}` 
    : undefined;

  return (
    <HoverTooltip text={name} subtext={subtext}>
      <div className="relative group flex items-center justify-center cursor-pointer mb-2" onClick={onClick}>
        <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 ${active ? 'h-10' : 'h-0 group-hover:h-5'} ${notify && !active ? 'h-2' : ''}`} />
        
        <div className={`w-12 h-12 flex items-center justify-center overflow-hidden transition-all duration-300 ${active ? 'rounded-2xl bg-brand' : 'rounded-[24px] group-hover:rounded-2xl bg-[#313338] group-hover:bg-brand text-[#dbdee1] group-hover:text-white'}`}>
          {image ? (
            <img src={image} alt={name || "Server"} className="w-full h-full object-cover" />
          ) : (
            <span className="font-medium text-lg">{name?.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
      </div>
    </HoverTooltip>
  );
};

const IconButton = ({ icon: Icon, label, colorClass = "text-[#23a559] group-hover:bg-[#23a559] group-hover:text-white", onClick }: { icon: any, label?: string, colorClass?: string, onClick?: () => void }) => (
  <HoverTooltip text={label}>
    <div className="relative group flex items-center justify-center cursor-pointer mb-2" onClick={onClick}>
      <div className={`w-12 h-12 rounded-[24px] group-hover:rounded-2xl bg-[#313338] flex items-center justify-center transition-all duration-300 ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  </HoverTooltip>
);

interface ServerSidebarProps {
  servers: Server[];
  activeServerId: string;
  onServerSelect: (id: string) => void;
  onOpenCreate: () => void;
  onOpenDiscover: () => void;
  currentUser: User;
  onLogout: () => void;
}

export const ServerSidebar = ({ servers, activeServerId, onServerSelect, onOpenCreate, onOpenDiscover, currentUser, onLogout }: ServerSidebarProps) => {
  const canCreate = currentUser.global_role === 'ADMIN' || currentUser.global_role === 'CREATOR';

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 flex-shrink-0 z-20 overflow-y-auto custom-scrollbar relative">
      <ServerIcon 
        name="Discord Canary 2" 
        serverId="home"
        image="/discord-canary-2.png" 
        active={activeServerId === 'home'} 
        onClick={() => onServerSelect('home')} 
      />
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2 flex-shrink-0" />
      
      {servers.map(server => (
        <ServerIcon 
          key={server.id} 
          serverId={server.id}
          image={server.icon_url} 
          name={server.name} 
          active={activeServerId === server.id} 
          onClick={() => onServerSelect(server.id)} 
        />
      ))}
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2 flex-shrink-0" />
      
      {canCreate && (
        <IconButton icon={Plus} label="Aggiungi un Server" onClick={onOpenCreate} />
      )}
      <IconButton 
        icon={Compass} 
        label="Esplora Server"
        colorClass="text-[#dbdee1] group-hover:bg-[#dbdee1] group-hover:text-[#1e1f22]" 
        onClick={onOpenDiscover} 
      />
      
      <div className="mt-auto pt-2">
        <IconButton 
          icon={LogOut} 
          label="Disconnetti"
          colorClass="text-[#dbdee1] group-hover:bg-[#f23f43] group-hover:text-white" 
          onClick={onLogout} 
        />
      </div>
    </div>
  );
};