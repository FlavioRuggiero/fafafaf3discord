"use client";

import React, { useState } from "react";
import { User, ServerPermissions, ServerRole } from "@/types/discord";
import { Crown, Shield, Search, Check, ChevronRight } from "lucide-react";
import { ProfilePopover } from "./ProfilePopover";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar } from "./Avatar";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useShop } from "@/contexts/ShopContext";

interface MemberListProps {
  users: User[];
  isOpen?: boolean;
  creatorId?: string;
  serverPermissions?: ServerPermissions;
  onKickMember?: (id: string) => void;
  onBanMember?: (id: string) => void;
  serverRoles?: ServerRole[];
  onToggleMemberRole?: (userId: string, roleId: string, hasRole: boolean) => void;
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

export const MemberList = ({ users, creatorId, serverPermissions, onKickMember, onBanMember, serverRoles, onToggleMemberRole }: MemberListProps) => {
  const { adminId, moderatorIds, user: authUser } = useAuth();
  const { getThemeClass, getThemeStyle } = useShop();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const creator = filteredUsers.find(u => u.id === creatorId);
  const otherUsers = filteredUsers.filter(u => u.id !== creatorId).sort((a, b) => a.name.localeCompare(b.name));

  const onlineUsers = otherUsers.filter(u => u.status !== 'offline');
  const offlineUsers = otherUsers.filter(u => u.status === 'offline');

  const UserItem = ({ user, isCreator }: { user: User, isCreator?: boolean }) => {
    const isAdmin<think>Continuing the `src/components/discord/MemberList.tsx` file exactly where it left off.</think>=== adminId;
    const isModerator = moderatorIds.includes(user.id);

    const canInteract = !isCreator && user.id !== authUser?.id && (serverPermissions?.can_kick_members || serverPermissions?.can_ban_members || serverPermissions?.can_assign_roles);

    const innerContent = (
      <div className="w-full">
        <ProfilePopover user={user} side="left" align="start">
          <div className="flex items-center px-2 py-1.5 hover:bg-[#35373c] rounded cursor-pointer group mb-[2px]">
            <div className="relative mr-3 mt-1.5 flex-shrink-0">
              {isCreator && (
                <div className="absolute -top-3.5 -right-1 z-10 text-yellow-400 rotate-[15deg] drop-shadow-md">
                  <Crown size={16} className="fill-yellow-400" />
                </div>
              )}
              <Avatar src={user.avatar} decoration={user.avatar_decoration} className={`w-8 h-8 ${user.status === 'offline' ? 'opacity-50 grayscale-[50%]' : ''}`} />
              
              <div className="absolute -bottom-0.5 -right-0.5 group/status z-30">
                <div className={`w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31] group-hover:border-[#35373c] ${statusColors[user.status]}`} />
                
                <div className="absolute hidden group-hover/status:block z-50 left-full ml-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#111214] text-[#dbdee1] text-xs font-semibold rounded-md shadow-lg whitespace-nowrap">
                  {statusText[user.status]}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#111214]"></div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span 
                  className={`text-[15px] font-medium truncate ${user.status === 'offline' ? 'text-[#80848e]' : 'text-[#80848e] group-hover:text-[#dbdee1]'} ${getThemeClass(user.avatar_decoration)}`}
                  style={getThemeStyle(user.avatar_decoration)}
                >
                  {user.name}
                </span>
                {isAdmin && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help flex items-center"><Shield size={14} className="text-red-500 flex-shrink-0" /></div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                      admin di discord canary 2
                    </TooltipContent>
                  </Tooltip>
                )}
                {!isAdmin && isModerator && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help flex items-center"><Shield size={14} className="text-blue-400 flex-shrink-0" /></div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#111214] text-[#dbdee1] border-[#1e1f22] font-semibold text-xs z-[99999]">
                      moderatore ufficiale
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {user.customStatus && (
                <span className="text-xs text-[#dbdee1] truncate -mt-0.5">{user.customStatus}</span>
              )}
            </div>
          </div>
        </ProfilePopover>
      </div>
    );

    if (canInteract) {
      return (
        <ContextMenu.Root>
          <ContextMenu.Trigger asChild>
            {innerContent}
          </ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Content className="bg-[#111214] border border-[#1e1f22] rounded-md shadow-xl p-1.5 min-w-[160px] z-[99999] animate-in fade-in zoom-in-95 duration-100">
              
              {serverPermissions?.can_assign_roles && serverRoles && serverRoles.length > 0 && (
                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger className="flex items-center justify-between px-2 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865F2] hover:text-white rounded cursor-pointer outline-none mb-0.5">
                    <span>Ruoli</span>
                    <ChevronRight size={14} />
                  </ContextMenu.SubTrigger>
                  <ContextMenu.Portal>
                    <ContextMenu.SubContent className="bg-[#111214] border border-[#1e1f22] rounded-md shadow-xl p-1.5 min-w-[160px] z-[99999] animate-in fade-in zoom-in-95 duration-100">
                      {serverRoles.map(role => {
                        const hasRole = user.server_roles?.some(r => r.id === role.id);
                        return (
                          <ContextMenu.CheckboxItem
                            key={role.id}
                            checked={hasRole}
                            onCheckedChange={() => onToggleMemberRole?.(user.id, role.id, !!hasRole)}
                            className="flex items-center px-2 py-1.5 text-sm text-[#dbdee1] hover:bg-[#5865F2] hover:text-white rounded cursor-pointer outline-none mb-0.5"
                          >
                            <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: role.color }} />
                            <span className="flex-1 truncate pr-4">{role.name}</span>
                            <ContextMenu.ItemIndicator className="ml-2">
                              <Check size={14} />
                            </ContextMenu.ItemIndicator>
                          </ContextMenu.CheckboxItem>
                        );
                      })}
                    </ContextMenu.SubContent>
                  </ContextMenu.Portal>
                </ContextMenu.Sub>
              )}

              {serverPermissions?.can_kick_members && (
                <ContextMenu.Item 
                  className="flex items-center px-2 py-1.5 text-sm text-[#f23f43] hover:bg-[#f23f43] hover:text-white rounded cursor-pointer outline-none mb-0.5" 
                  onClick={() => onKickMember?.(user.id)}
                >
                  Espelli {user.name}
                </ContextMenu.Item>
              )}
              {serverPermissions?.can_ban_members && (
                <ContextMenu.Item 
                  className="flex items-center px-2 py-1.5 text-sm text-[#f23f43] hover:bg-[#f23f43] hover:text-white rounded cursor-pointer outline-none" 
                  onClick={() => onBanMember?.(user.id)}
                >
                  Banna {user.name}
                </ContextMenu.Item>
              )}
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </ContextMenu.Root>
      );
    }

    return innerContent;
  };

  return (
    <div className="w-[240px] h-full bg-[#2b2d31] flex flex-col flex-shrink-0 border-l border-[#1f2023]">
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center px-3 flex-shrink-0">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Cerca membri"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1f22] text-[#dbdee1] text-sm rounded px-2 py-1 pl-7 outline-none focus:ring-1 focus:ring-brand placeholder:text-[#949ba4]"
          />
          <Search size={14} className="absolute left-2 top-1.5 text-[#949ba4]" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4 pr-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center text-[#949ba4] text-sm mt-4">
            Nessun membro trovato.
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};