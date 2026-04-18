export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  global_role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'CREATOR';
  bio?: string;
  banner_color?: string;
  banner_url?: string;
  level?: number;
  digitalcardus?: number;
  xp?: number;
  last_reward_date?: string;
  server_roles?: ServerRole[];
  avatar_decoration?: string | null;
  purchased_decorations?: string[];
  entrance_audio_url?: string | null;
  claimed_levels?: number[];
  standard_chests?: number;
  premium_chests?: number;
  singing_island?: any[];
}

export interface ServerRole {
  id: string;
  server_id: string;
  name: string;
  color: string;
  can_manage_channels?: boolean;
  can_delete_messages?: boolean;
  can_use_commands?: boolean;
  can_manage_server?: boolean;
  can_manage_roles?: boolean;
  can_assign_roles?: boolean;
  can_bypass_restrictions?: boolean;
  can_kick_members?: boolean;
  can_ban_members?: boolean;
}

export interface ServerPermissions {
  isOwner: boolean;
  can_manage_channels: boolean;
  can_delete_messages: boolean;
  can_use_commands: boolean;
  can_manage_server: boolean;
  can_manage_roles: boolean;
  can_assign_roles: boolean;
  can_bypass_restrictions: boolean;
  can_kick_members: boolean;
  can_ban_members: boolean;
}

export interface Server {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  created_by: string;
  created_at: string;
  audio_url?: string;
  is_private?: boolean;
  server_type?: 'public' | 'private' | 'paid';
  entry_fee?: number;
}

export interface Channel {
  id: string;
  server_id: string | null;
  name: string;
  type: 'text' | 'voice' | 'dm' | 'minigame';
  category: string;
  unread?: boolean;
  recipient?: User;
  is_locked?: boolean;
  cooldown?: number;
  is_welcome_channel?: boolean;
  minigame_url?: string;
  minigame_icon_url?: string;
}

export interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: string;
}