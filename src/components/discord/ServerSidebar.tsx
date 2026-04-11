import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Compass, LogOut } from "lucide-react";
import { Server, User } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";

// Componente Tooltip che fluttua al di fuori della barra per non essere tagliato dall'overflow
const HoverTooltip = ({ children, text, subtext, disabled }: { children: React.ReactElement, text?: string, subtext?: React.ReactNode, disabled?: boolean }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 14 // Spaziatura dall'icona
      });
      setVisible(true);
    }
  };

  useEffect(() => {
    if (disabled) setVisible(false);
  }, [disabled]);

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
      
      {visible && !disabled && typeof window !== 'undefined' && createPortal(
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

interface ServerIconProps {
  image?: string;
  name?: string;
  active?: boolean;
  notify?: boolean;
  onClick?: () => void;
  serverId?: string;
  audioUrl?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isAnyDragging?: boolean;
}

const ServerIcon = ({ 
  image, name, active, notify, onClick, serverId, audioUrl,
  draggable, onDragStart, onDragEnter, onDragOver, onDragEnd, onDrop, isDragging, isAnyDragging
}: ServerIconProps) => {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [staticImage, setStaticImage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isGif = image?.toLowerCase().includes('.gif');

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

  // Se è una GIF, crea un frame statico usando il canvas
  useEffect(() => {
    if (isGif && image) {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Necessario per non incappare in errori CORS con il canvas
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height);
            setStaticImage(canvas.toDataURL("image/png"));
          }
        } catch (e) {
          console.warn("Impossibile generare il frame statico della GIF:", e);
        }
      };
      img.src = image;
    }
  }, [image, isGif]);

  // Interrompi l'audio e resetta l'hover se sta avvenendo un trascinamento
  useEffect(() => {
    if (isAnyDragging) {
      setIsHovered(false);
      if (audioUrl && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isAnyDragging, audioUrl]);

  const subtext = serverId && serverId !== 'home' && memberCount !== null 
    ? `${memberCount} ${memberCount === 1 ? 'membro' : 'membri'}` 
    : undefined;

  const handleMouseEnter = () => {
    if (isAnyDragging) return;
    setIsHovered(true);
    if (audioUrl && audioRef.current) {
      audioRef.current.volume = 0.5; // Dimezza il volume
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Autoplay audio bloccato', e));
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (audioUrl && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Determina quale immagine mostrare:
  // Se è una GIF e NON siamo in hover e abbiamo generato l'immagine statica, mostra l'immagine statica.
  // Altrimenti mostra l'immagine originale (che sarà animata nel caso delle GIF)
  const displayImage = (isGif && !isHovered && staticImage) ? staticImage : image;

  return (
    <HoverTooltip text={name} subtext={subtext} disabled={isAnyDragging}>
      <div 
        className={`relative group flex items-center justify-center cursor-pointer mb-2 transition-transform duration-200 ${isDragging ? 'scale-105 z-50' : 'scale-100 z-10'}`} 
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDrop={onDrop}
      >
        {audioUrl && <audio ref={audioRef} src={audioUrl} preload="none" className="hidden" />}
        <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 ${active ? 'h-10' : 'h-0 group-hover:h-5'} ${notify && !active ? 'h-2' : ''}`} />
        
        <div className={`w-12 h-12 flex items-center justify-center overflow-hidden transition-all duration-300 ${active ? 'rounded-2xl bg-brand' : 'rounded-[24px] group-hover:rounded-2xl bg-[#313338] group-hover:bg-brand text-[#dbdee1] group-hover:text-white'}`}>
          {image ? (
            <img src={displayImage} alt={name || "Server"} className="w-full h-full object-cover pointer-events-none" draggable={false} />
          ) : (
            <span className="font-medium text-lg pointer-events-none select-none">{name?.substring(0, 2).toUpperCase()}</span>
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

  const [localServers, setLocalServers] = useState<Server[]>(servers);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Sincronizza lo stato locale coi props solo se non stiamo trascinando
    if (draggedIndex === null) {
      setLocalServers(prev => {
        if (prev.length === 0) return servers;
        
        const prevIds = prev.map(s => s.id);
        const nextIds = servers.map(s => s.id);
        
        // 1. Tieni gli elementi che c'erano già, nell'ordine locale (aggiornando i dati)
        const reordered = prev
          .filter(s => nextIds.includes(s.id))
          .map(s => servers.find(server => server.id === s.id)!);
          
        // 2. Aggiungi i nuovi server che non erano presenti in precedenza (es. appena uniti)
        const added = servers.filter(s => !prevIds.includes(s.id));
        
        return [...reordered, ...added];
      });
    }
  }, [servers, draggedIndex]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Nascondi l'immagine fantasma nativa del browser creandone una trasparente
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    setLocalServers(prev => {
      const newServers = [...prev];
      const draggedItem = newServers[draggedIndex];
      newServers.splice(draggedIndex, 1);
      newServers.splice(index, 0, draggedItem);
      return newServers;
    });
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null); // LocalServers mantiene il nuovo ordine grazie all'useEffect aggiornato
    
    // Salva l'ordine aggiornando la posizione dei server nel database per questo utente
    if (localServers.length > 0) {
      try {
        for (let i = 0; i < localServers.length; i++) {
          await supabase
            .from('server_members')
            .update({ position: i })
            .eq('server_id', localServers[i].id)
            .eq('user_id', currentUser.id);
        }
      } catch (err) {
        console.error("Errore nel salvataggio dell'ordine dei server:", err);
      }
    }
  };

  const isAnyDragging = draggedIndex !== null;

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 flex-shrink-0 z-20 overflow-y-auto custom-scrollbar relative">
      <ServerIcon 
        name="Discord Canary 2" 
        serverId="home"
        image="/discord-canary-2.png" 
        active={activeServerId === 'home'} 
        onClick={() => onServerSelect('home')} 
        isAnyDragging={isAnyDragging}
      />
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2 flex-shrink-0" />
      
      {localServers.map((server, index) => (
        <ServerIcon 
          key={server.id} 
          serverId={server.id}
          image={server.icon_url} 
          name={server.name} 
          active={activeServerId === server.id} 
          onClick={() => onServerSelect(server.id)} 
          audioUrl={server.audio_url}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnter={(e) => handleDragEnter(e, index)}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          isDragging={draggedIndex === index}
          isAnyDragging={isAnyDragging}
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