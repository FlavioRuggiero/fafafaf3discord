export type User = {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "idle" | "dnd" | "offline";
  customStatus?: string;
  global_role?: "USER" | "CREATOR" | "ADMIN";
  bio?: string;
  banner_color?: string;
  banner_url?: string;
  level?: number;
  digitalcardus?: number;
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
  server_id: string;
  name: string;
  type: "text" | "voice";
  category: string;
  unread?: boolean;
};

export type Message = {
  id: string;
  user: User;
  content: string;
  timestamp: string;
};