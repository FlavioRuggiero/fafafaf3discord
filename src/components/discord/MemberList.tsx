import React from "react";
import { User } from "@/types/discord";

interface MemberListProps {
  users: User[];
  isOpen?: boolean;
}

const statusColors = {
  online: "bg-[#23a559]",
  idle: "bg-[#f0b232]",
  dnd: "bg-[#f23f43]",
  offline: "bg-[#80848e]",
};

export const MemberList = ({ users }: MemberListProps) => {
  // Rimuoviamo "if (!isOpen) return null;" per permettere l'animazione fluida
  // Il genitore (Index.tsx) gestirà la larghezza (w-[240px] -> w-0) nascondendo il contenuto

  const onlineUsers = users.filter(u => u.status !== 'offline');
  const offlineUsers = users.filter(u => u.status === 'offline');

  const UserItem = ({ user }: { user: User }) => (
    <div className="flex items-center px-2 py-1.5 hover:bg-[#35373c] rounded cursor-pointer group mb-[2px]">
      <div className="relative mr-3">
        <img src={user.avatar} alt={user.name} className={`w-8 h-8 rounded-full ${user.status === 'offline' ? 'opacity-50' : ''}`} />
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31] group-hover:border-[#35373c] ${statusColors[user.status]}`} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-[15px] font-medium truncate ${user.status === 'offline' ? 'text-[#80848e]' : 'text-[#80848e] group-hover:text-[#dbdee1]'}`}>
          {user.name}
        </span>
        {user.customStatus && (
          <span className="text-xs text-[#dbdee1] truncate -mt-0.5">{user.customStatus}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-[240px] h-full bg-[#2b2d31] flex flex-col flex-shrink-0 border-l border-[#1f2023]">
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-end px-4 flex-shrink-0">
        {/* Placeholder per allineamento con l'header della chat */}
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pr-2">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
            Disponibili — {onlineUsers.length}
          </h3>
          {onlineUsers.map(user => (
            <UserItem key={user.id} user={user} />
          ))}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
            Offline — {offlineUsers.length}
          </h3>
          {offlineUsers.map(user => (
            <UserItem key={user.id} user={user} />
          ))}
        </div>
      </div>
    </div>
  );
};