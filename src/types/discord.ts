export type User = {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "idle" | "dnd" | "offline";
  customStatus?: string;
  global_role?: "USER" | "MODERATOR" | "CREATOR" | "ADMIN";
  bio?: string;
  banner_color?: string;
  banner_url?: string;
  level?: number;
  digitalcardus?: number;
  xp?: number;
};

export type Server = {
  id: string;
  name: string;
  icon_url?: string;
  created_by: string;
  description?: string;
  audio_url?: string;
};

export type Channel = {
  id: string;
  server_id: string | null;
  name: string;
  type: "text" | "voice" | "minigame" | "dm";
  category: string;
  unread?: boolean;
  position?: number;
  category_position?: number;
  created_at?: string;
  recipient?: User;
};

export type Message = {
  id: string;
  user: User;
  content: string;
  timestamp: string;
};

export type Profile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
  bio?: string | null;
  digitalcardus?: number | null;
  banner_color?: string | null;
  banner_url?: string | null;
  level?: number | null;
  xp?: number | null;
  last_reward_date?: string | null;
};

export type ServerMember = {
  server_id: string;
  user_id: string;
  joined_at?: string;
  position?: number;
  voice_channel_id?: string | null;
  is_muted?: boolean;
  is_deafened?: boolean;
};

export type Friendship = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export type DMChannel = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
};