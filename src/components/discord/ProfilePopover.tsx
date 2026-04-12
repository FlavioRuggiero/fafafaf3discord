import React from "react";
import * as Popover from "@radix-ui/react-popover";
import { User } from "@/types/discord";
import { Shield } from "lucide-react";

const statusColors = {
  online: "bg-[#23a559]",
  idle: "bg-[#f0b232]",
  dnd: "bg-[#f23f43]",
  offline: "bg-[#80848e]",
};

const statusText = {
  online: "Online",
  idle: "Assente",
  dnd: "Non disturbare",
  offline: "Offline",
};

export const ProfilePopover = ({ user, children, side = "right", align = "start" }: { user: User | null, children: React.ReactNode, side?: "top" | "right" | "bottom" | "left", align?: "start" | "center" | "end" }) => {
  if (!user) return <>{children}</>;

  const isAdmin = user.global_role === 'ADMIN' || user.global_role === 'CREATOR';
  const isModerator = user.global_role === 'MODERATOR';
  const xpNeeded = (user.level || 1) * 5;
  const currentXp = user.xp || 0;
  const xpPercent = Math.min(100, (currentXp / xpNeeded) * 100);
  
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          side={side} 
          align={align} 
          sideOffset={16} 
          collisionPadding={20}
          className="w-[300px] p-0 bg-[#111214] border border-[#1e1f22] text-[#dbdee1] shadow-2xl overflow-hidden rounded-lg z-[99999] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div 
            className="h-[60px] relative flex-shrink-0 bg-cover bg-center"
            style={{ 
              backgroundColor: user.banner_color || '#5865F2',
              backgroundImage: user.banner_url ? `url(${user.banner_url})` : undefined
            }}
          >
            <div className="absolute -bottom-10 left-4 rounded-full border-[6px] border-[#111214] bg-[#111214]">
              <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-[3px] border-[#111214] ${statusColors[user.status]}`} title={statusText[user.status]} />
            </div>
          </div>
          
          <div className="p-4 pt-12 pb-5">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-lg font-bold text-white leading-tight">{user.name}</h3>
              {isAdmin && (
                <Shield size={16} className="text-red-500 flex-shrink-0" title="Admin" />
              )}
              {isModerator && (
                <Shield size={16} className="text-blue-400 flex-shrink-0" title="Moderatore Ufficiale" />
              )}
            </div>

            <div className="flex flex-col mt-3 bg-[#1e1f22] py-3 px-3 rounded-lg border border-[#2b2d31]">
              <div className="flex items-center justify-around mb-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-0.5">Livello</span>
                  <span className="font-bold text-white">{user.level || 1}</span>
                </div>
                <div className="w-[1px] h-8 bg-[#2b2d31]"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider mb-0.5">Digitalcardus</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">{user.digitalcardus ?? 25}</span>
                    <img src="/digitalcardus.png" alt="dc" className="w-4 h-4 object-contain" />
                  </div>
                </div>
              </div>
              
              <div className="px-1 border-t border-[#2b2d31] pt-3">
                <div className="flex justify-between items-center text-[10px] text-[#b5bac1] uppercase tracking-wider mb-1.5 font-bold">
                  <span>Progresso XP</span>
                  <span className="text-white">{currentXp} / {xpNeeded}</span>
                </div>
                <div className="h-1.5 bg-[#111214] rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all duration-500 ease-out" style={{ width: `${xpPercent}%` }} />
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#2b2d31]">
              <h4 className="text-[11px] font-bold uppercase text-[#b5bac1] mb-2 tracking-wider">Su di me</h4>
              {user.bio ? (
                <p className="text-[13px] text-[#dbdee1] whitespace-pre-wrap leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-[13px] text-[#949ba4] italic">Nessuna biografia impostata.</p>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};