import React from "react";
import { User } from "@/types/discord";
import { Crown } from "lucide-react";

interface MemberListProps {
  users: User[];
  isOpen?: boolean;
  creatorId?: string;
}

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

export const MemberList = ({ users, creatorId }: MemberListProps) => {
  // Separa il creatore dagli altri utenti
  const creator = users.find(u => u.id === creatorId);
  
  // Ordina in ordine alfabetico gli altri utenti
  const otherUsers = users.filter(u => u.id !== creatorId).sort((a, b) => a.name.localeCompare(b.name));

  const onlineUsers = otherUsers.filter(u => u.status !== 'offline');
  const offlineUsers = otherUsers.filter(u => u.status === 'offline');

  const UserItem = ({ user, isCreator }: { user: User, isCreator?: boolean }) => {
    // Utilizza la proprietà global_role definita nei type di Discord (se ADMIN o CREATOR, mostrerà l'etichetta)
    const isAdmin = user.global_role === 'ADMIN' || user.global_role === 'CREATOR';

    return (
      <div className="flex items-center px-2 py-1.5 hover:bg-[#35373c] rounded cursor-pointer group mb-[2px]">
        <div className="relative mr-3 mt-1.5">
          {isCreator && (
            <div className="absolute -top-3.5 -right-1 z-10 text-yellow-400 rotate-[15deg] drop-shadow-md">
              <Crown size={16} className="fill-yellow-400" />
            </div>
          )}
          <img src={user.avatar} alt={user.name} className={`w-8 h-8 rounded-full ${user.status === 'offline' ? 'opacity-50 grayscale-[50%]' : ''}`} />
          
          {/* Pallino di stato con Tooltip */}
          <div className="absolute -bottom-0.5 -right-0.5 group/status">
            <div className={`w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31] group-hover:border-[#35373c] ${statusColors[user.status]}`} />
            
            {/* Tooltip */}
            <div className="absolute hidden group-hover/status:block z-50 left-full ml-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#111214] text-[#dbdee1] text-xs font-semibold rounded-md shadow-lg whitespace-nowrap">
              {statusText[user.status]}
              {/* Freccina del tooltip */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#111214]"></div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[15px] font-medium truncate ${user.status === 'offline' ? 'text-[#80848e]' : 'text-[#80848e] group-hover:text-[#dbdee1]'}`}>
              {user.name}
            </span>
            {isAdmin && (
              <span className="text-[9px] font-bold text-white border border-[#f23f43] rounded px-1 py-[2px] leading-none tracking-wide">
                ADMIN
              </span>
            )}
          </div>
          {user.customStatus && (
            <span className="text-xs text-[#dbdee1] truncate -mt-0.5">{user.customStatus}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[240px] h-full bg-[#2b2d31] flex flex-col flex-shrink-0 border-l border-[#1f2023]">
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center justify-end px-4 flex-shrink-0">
        {/* Placeholder per allineamento con l'header della chat */}
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pr-2">
        {creator && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
              Proprietario — 1
            </h3>
            <UserItem user={creator} isCreator={true} />
          </div>
        )}

        {onlineUsers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
              Disponibili — {onlineUsers.length}
            </h3>
            {onlineUsers.map(user => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        )}

        {offlineUsers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[#949ba4] uppercase tracking-wider mb-1 px-2">
              Offline — {offlineUsers.length}
            </h3>
            {offlineUsers.map(user => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};